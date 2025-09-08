import os
import google.generativeai as genai
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    raise RuntimeError("GEMINI_API_KEY not found in environment variables")

# Configure Gemini API and model
genai.configure(api_key=api_key)
model = genai.GenerativeModel('gemini-2.5-flash-lite')

# Initialize FastAPI app
app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],  
    allow_headers=["*"],  
)

# Store chat sessions 
chat_sessions = {}

# Pydantic model for request body validation
class ChatRequest(BaseModel):
    message: str
    session_id: str

@app.get("/health")
def health_check():
    return {"status": "healthy", "message": "Gemini FastAPI server is running"}

@app.post("/chat")
async def chat(request: ChatRequest):
    try:
        session_id = request.session_id
        user_message = request.message
        
        logger.info(f"Received message for session {session_id}: {user_message}")

        if session_id not in chat_sessions:
            chat_sessions[session_id] = model.start_chat(history=[])
            logger.info(f"Created new chat session: {session_id}")
        
        chat_session = chat_sessions[session_id]

        response = await chat_session.send_message_async(user_message)
        bot_response = response.text
        
        logger.info(f"Sent response for session {session_id}")
        
        return {"response": bot_response, "session_id": session_id}
    except Exception as e:
        logger.error(f"Error in chat endpoint: {e}")
        raise HTTPException(status_code=500, detail=f"An error occurred: {e}")

@app.post("/clear_session")
def clear_session(request: ChatRequest):
    try:
        session_id = request.session_id
        if session_id in chat_sessions:
            del chat_sessions[session_id]
            logger.info(f"Cleared session: {session_id}")
            return {"message": f"Session {session_id} cleared"}
        return {"message": f"Session {session_id} not found"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred: {e}")