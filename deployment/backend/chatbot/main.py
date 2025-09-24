# test.py (Updated for Vercel Deployment)

import os
import datetime
import base64
import json
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import google.generativeai as genai
import firebase_admin
from firebase_admin import credentials, firestore
from dotenv import load_dotenv

# --- Load Environment Variables ---
load_dotenv()

# --- Pydantic Models ---
class ChatRequest(BaseModel):
    message: str
    session_id: str

class SessionRequest(BaseModel):
    session_id: str

# --- App Initialization ---
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"],
)

# --- Firebase & Gemini Initialization (MODIFIED FOR VERCEL) ---

# 1. Handle Firebase Credentials from Environment Variable
try:
    # Get the Base64 encoded credentials string from Vercel's environment variables
    firebase_creds_base64 = os.getenv("FIREBASE_CREDS_BASE64")
    
    # Decode the Base64 string into a standard JSON string
    firebase_creds_json_str = base64.b64decode(firebase_creds_base64).decode('utf-8')
    
    # Parse the JSON string into a Python dictionary
    firebase_creds_dict = json.loads(firebase_creds_json_str)
    
    # Initialize the Firebase app with the dictionary credentials
    cred = credentials.Certificate(firebase_creds_dict)
    firebase_admin.initialize_app(cred)
    db = firestore.client()
    print("Firebase Firestore initialized successfully from environment variable.")

except Exception as e:
    print(f"FATAL: Could not initialize Firebase Admin SDK. Error: {e}")
    # In a real app, you might want to handle this more gracefully
    db = None


# 2. Handle Gemini API Key from Environment Variable
gemini_api_key = os.getenv("GEMINI_API_KEY")
if not gemini_api_key:
    print("FATAL: GEMINI_API_KEY environment variable not set.")
else:
    genai.configure(api_key=gemini_api_key)
    model = genai.GenerativeModel("gemini-1.5-flash-latest")


# --- Endpoint to Create Session Document ---
@app.post("/session/start")
async def start_session(request: SessionRequest):
    """Creates a new, empty document when a session begins."""
    if not db:
        return {"status": "error", "message": "Database not initialized"}, 500
        
    session_ref = db.collection("chat_history").document(request.session_id)
    # Check if the document already exists to avoid overwriting
    if not session_ref.get().exists:
        session_ref.set({
            "created_at": datetime.datetime.utcnow(),
            "session_id": request.session_id,
            "messages": [] # Start with an empty messages array
        })
        return {"status": "session created"}
    return {"status": "session already exists"}


# --- Main Chat Endpoint ---
@app.post("/chat")
async def chat(request: ChatRequest):
    if not db or not model:
        return {"status": "error", "message": "Backend services not initialized"}, 500

    def stream_and_save():
        session_ref = db.collection("chat_history").document(request.session_id)
        session_doc = session_ref.get()
        chat_history = []
        if session_doc.exists:
            previous_messages = session_doc.to_dict().get("messages", [])
            for msg in previous_messages:
                # Ensure both keys exist before appending
                if "user_prompt" in msg and "bot_response" in msg:
                    chat_history.append({"role": "user", "parts": [msg.get("user_prompt")]})
                    chat_history.append({"role": "model", "parts": [msg.get("bot_response")]})

        chat_history.append({"role": "user", "parts": [request.message]})
        
        try:
            response_stream = model.generate_content(chat_history, stream=True)
            full_ai_reply = ""
            for chunk in response_stream:
                if chunk.text:
                    full_ai_reply += chunk.text
                    yield chunk.text
            
            # Save the full conversation turn to Firestore
            new_message = {
                "timestamp": datetime.datetime.utcnow(),
                "user_prompt": request.message,
                "bot_response": full_ai_reply
            }
            session_ref.update({"messages": firestore.ArrayUnion([new_message])})

        except Exception as e:
            print(f"Error during stream or DB operation: {e}")
            yield f"An error occurred: {e}"

    return StreamingResponse(stream_and_save(), media_type='text/plain')

# --- Health Check Endpoint ---
@app.get("/")
async def health_check():
    return {"message": "Shiksha Saathi test server is running!"}