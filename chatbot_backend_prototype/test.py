# test.py (Updated for new document structure)
import os
import datetime
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import google.generativeai as genai
import firebase_admin
from firebase_admin import credentials, firestore

# --- Pydantic Models ---
class ChatRequest(BaseModel):
    message: str
    session_id: str

# NEW: Model for the session start request
class SessionRequest(BaseModel):
    session_id: str

# --- App Initialization ---
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"],
)

# --- Firebase & Gemini Initialization (same as before) ---
# (Firebase and Gemini initialization code remains here)
cred = credentials.Certificate("firebase-credentials.json")
firebase_admin.initialize_app(cred)
db = firestore.client()
print("Firebase Firestore initialized successfully.")
load_dotenv()
gemini_api_key = os.getenv("GEMINI_API_KEY")
genai.configure(api_key=gemini_api_key)
model = genai.GenerativeModel("gemini-1.5-flash-latest")


# --- NEW: Endpoint to Create Session Document ---
@app.post("/session/start")
async def start_session(request: SessionRequest):
    """Creates a new, empty document when a session begins."""
    session_ref = db.collection("chat_history").document(request.session_id)
    # Check if the document already exists to avoid overwriting
    if not session_ref.get().exists:
        session_ref.set({
            # New field order for the document
            "created_at": datetime.datetime.utcnow(),
            "session_id": request.session_id,
            "messages": [] # Start with an empty messages array
        })
        return {"status": "session created"}
    return {"status": "session already exists"}


@app.post("/chat")
async def chat(request: ChatRequest):
    def stream_and_save():
        session_ref = db.collection("chat_history").document(request.session_id)
        session_doc = session_ref.get()
        chat_history = []
        if session_doc.exists:
            # ... (Context handling logic is the same)
            previous_messages = session_doc.to_dict().get("messages", [])
            for msg in previous_messages:
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
            
            # --- MODIFIED: Reordered keys in the message object ---
            new_message = {
                "timestamp": datetime.datetime.utcnow(),
                "user_prompt": request.message,
                "bot_response": full_ai_reply
            }
            # The update logic remains the same, it just appends the new message
            session_ref.update({"messages": firestore.ArrayUnion([new_message])})

        except Exception as e:
            print(f"Error during stream or DB operation: {e}")

    return StreamingResponse(stream_and_save(), media_type='text/plain')

@app.get("/")
async def health_check():
    return {"message": "Shiksha Saathi test server is running!"}