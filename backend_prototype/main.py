import os
import google.generativeai as genai
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Dict, Any
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables from Vercel's dashboard
api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    # This will fail during Vercel build if the key is not set, which is good.
    raise RuntimeError("GEMINI_API_KEY not found in environment variables. Please set it in your Vercel project settings.")

# Configure Gemini API and model
genai.configure(api_key=api_key)
model = genai.GenerativeModel('gemini-1.5-flash') # Using a standard model name

# Initialize FastAPI app
app = FastAPI(
    title="Shiksha Saathi Backend",
    description="API for the Shiksha Saathi chatbot, powered by Google Gemini.",
    version="1.0.0"
)

# Add CORS middleware to allow requests from your frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, you should restrict this to your frontend's domain
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

# Pydantic models for request and response body validation
class ChatRequest(BaseModel):
    message: str
    # The history is now sent with each request from the client
    history: List[Dict[str, Any]] = Field(default_factory=list)

class ChatResponse(BaseModel):
    response: str
    # The updated history is sent back to the client
    history: List[Dict[str, Any]]

@app.get("/", tags=["Health"])
def health_check():
    """Health check endpoint to confirm the server is running."""
    return {"status": "healthy", "message": "Shiksha Saathi Gemini API is running"}

@app.post("/chat", response_model=ChatResponse, tags=["Chat"])
async def chat(request: ChatRequest):
    """
    Handles a chat message, maintains conversation history, and returns a bot response.
    The client is responsible for sending the history with each request and storing the updated history.
    """
    try:
        user_message = request.message
        history = request.history
        
        logger.info(f"Received message: '{user_message}' with history length: {len(history)}")

        # Start a new chat session with the provided history
        chat_session = model.start_chat(history=history)

        # Send the user's message to Gemini
        response = await chat_session.send_message_async(user_message)
        bot_response = response.text
        
        logger.info(f"Generated Gemini response.")
        
        # The new history is the old history plus the user message and the bot response
        new_history = chat_session.history
        
        return ChatResponse(response=bot_response, history=new_history)
    
    except Exception as e:
        logger.error(f"An error occurred in the chat endpoint: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"An internal server error occurred: {e}")
