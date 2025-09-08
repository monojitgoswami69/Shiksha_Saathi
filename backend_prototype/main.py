import os
import google.generativeai as genai
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Dict, Any
import logging

# Try to load environment variables from .env file for local development
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    # dotenv not installed, skip loading .env file
    pass

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables from Vercel's dashboard
api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    # This will fail during Vercel build if the key is not set, which is good.
    raise RuntimeError("GEMINI_API_KEY not found in environment variables. Please set it in your Vercel project settings or create a .env file with GEMINI_API_KEY=your_key_here")

# Configure Gemini API and model
genai.configure(api_key=api_key)
model = genai.GenerativeModel('gemini-2.5-flash-lite') # Using a standard model name

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

class ChatResponse(BaseModel):
    response: str

@app.get("/", tags=["Health"])
def root():
    """Root endpoint that serves as a health check."""
    return {"status": "healthy", "message": "Shiksha Saathi Gemini API is running"}

@app.get("/health", tags=["Health"])  
def health_check():
    """Health check endpoint to confirm the server is running."""
    return {"status": "healthy", "message": "Shiksha Saathi Gemini API is running"}

@app.post("/chat", response_model=ChatResponse, tags=["Chat"])
async def chat(request: ChatRequest):
    """
    Handles a chat message and returns a bot response.
    This is now a stateless API - each request is independent.
    """
    try:
        user_message = request.message
        
        logger.info(f"Received message: '{user_message}'")

        # Start a fresh chat session for each request (stateless)
        chat_session = model.start_chat()

        # Send the user's message to Gemini
        response = await chat_session.send_message_async(user_message)
        bot_response = response.text
        
        logger.info(f"Generated Gemini response.")
        
        return ChatResponse(response=bot_response)
    
    except Exception as e:
        logger.error(f"An error occurred in the chat endpoint: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"An internal server error occurred: {e}")
