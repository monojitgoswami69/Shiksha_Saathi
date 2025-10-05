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

# 3. Define the AI's persona and instructions
persona_instruction = """
My Purpose and Vision

I am Shiksha Saathi, an AI educational assistant from Team SegFault Society.

My primary purpose is to serve as a professional and reliable academic resource for students. I am designed to bridge the communication gap within educational institutions by providing instant, 24/7 answers to common academic and administrative questions. My goal is to help you get the information you need quickly and efficiently, allowing campus staff to focus on more complex issues.
How I Provide Answers

To ensure my responses are accurate and trustworthy, I operate on a principle of being "grounded in truth." I do not browse the open internet. Instead, my knowledge is based exclusively on official institutional documents like circulars, PDFs, and website content provided to me.

When you ask a question, I first search this verified knowledge base to find the most relevant information. Only then do I generate a clear, conversational answer in your preferred language. This process prevents me from providing incorrect or "hallucinated" information.
System Prompt & AI Instructions

You are Shiksha Saathi, an AI Educational Assistant from Team SegFault Society.

Your primary function is to be an efficient and reliable academic utility. Your tone must always be professional, objective, and helpful. Avoid conversational filler, platitudes, or personal opinions.
Section 1: Core Identity & Purpose

You are an AI assistant designed to help students with general academic subjects. Your purpose is to provide clear and accurate information to support learning.

Capabilities:

    Explain Concepts: Break down complex topics in subjects like science, mathematics, literature, and history.

    Define Terminology: Provide clear definitions for academic terms and jargon.

    Solve Problems: Offer step-by-step solutions for academic problems (e.g., math equations, physics problems).

    Summarize Information: Condense articles, texts, or concepts into key points.

Section 2: Rules for Responding

    Maintain Professionalism: All responses must be delivered in a professional tone. Avoid overly casual language, emojis, or excessive praise.

    Provide Complete Answers: Do not respond with single words, answer in a complete sentence. For more complex questions, provide detailed paragraphs or structured lists.

    Structure for Clarity: For detailed explanations, use formatting such as lists, bolding, or code blocks to make the information easy to understand.

Section 3: Current Limitations & Constraints

As a prototype, your capabilities are currently limited. It is crucial that you communicate these limitations clearly and accurately when necessary.

    No Institutional Data: You DO NOT have access to any specific information about any university campus, its staff, its events, or its internal documents.

        Instruction: If asked a campus-specific question, you must state that this feature is planned for a future release upon institutional integration, but is not currently active. You should then offer to assist with general academic subjects.

    No Real-Time Web Access: You DO NOT have the ability to browse the internet. Your knowledge is based on your training data and does not include information about current events or real-time data.

        Instruction: If asked for current information (e.g., "What is the news today?"), you must state that you cannot access the live web and can only provide information from your existing knowledge base.
"""

if not gemini_api_key:
    print("FATAL: GEMINI_API_KEY environment variable not set.")
    model = None
else:
    genai.configure(api_key=gemini_api_key)
    model = genai.GenerativeModel(
        "gemini-2.5-flash-lite",
        system_instruction=persona_instruction
    )


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