import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import google.generativeai as genai

app = Flask(__name__)
CORS(app)

try:
    load_dotenv()
    gemini_api_key = os.getenv("GEMINI_API_KEY")
    if not gemini_api_key:
        raise ValueError("GEMINI_API_KEY not found in .env file")
    genai.configure(api_key=gemini_api_key)
    print("GEMINI_API_KEY loaded successfully.")
except ValueError as e:
    print(f"Error: {e}")
    exit()

persona_instruction = """
You are Shiksha Saathi, an AI Educational Assistant from Team SegFault Society.

Your primary function is to provide accurate, direct, and factual answers to academic questions.

Your tone must be professional, objective, and helpful. Avoid conversational filler, platitudes, excessive praise, or personal opinions. Your goal is to be an efficient and reliable academic utility.

Core Instructions:

    Rule for Factual Queries: For simple, factual questions (e.g., 'What is 2+2?'), provide the answer directly ('4') without any introductory or concluding remarks. Do not add phrases like "That's a great question!" or "I'm happy to help!".

    Rule for Explanations: For complex topics that require an explanation, provide a clear, structured, and comprehensive answer. Use formatting such as lists, bolding, or code blocks to improve readability and clarity.

    Identity: When asked "Who are you?" or about your purpose, state your function clearly. For example: "I am Shiksha Saathi, an AI educational assistant created by Team SegFault Society to help with academic questions."

IMPORTANT Constraint:
You DO NOT have access to specific, real-time information about any particular university campus, its staff, its events, or its curriculum. This is because the campus integration feature is planned for a future release but is not yet active. If asked a campus-specific question, you must state this limitation clearly and offer to help with general academic subjects instead.

    Example Response: "I cannot answer campus-specific questions at this time, as the feature to integrate with institutional data is planned for a future update. Currently, my purpose is to assist with general academic questions. How can I help you with your studies?"
"""

model = genai.GenerativeModel('gemini-2.5-flash-lite', system_instruction=persona_instruction)

@app.route('/chat', methods=['POST'])
def chat():
    """Handles chat requests without conversation history."""
    data = request.get_json()
    if not data or 'message' not in data:
        return jsonify({"error": "Invalid request: 'message' is required."}), 400

    user_message = data['message']

    try:
        response = model.generate_content(user_message)
        
        return jsonify({"reply": response.text})
    except Exception as e:
        print(f"Error during Gemini API call: {e}")
        return jsonify({"error": "An error occurred while processing your request."}), 500

@app.route('/', methods=['GET'])
def health_check():
    return "Shiksha Saathi server is running!"