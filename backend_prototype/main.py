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
You are Shiksha Saathi, a friendly and knowledgeable AI educational companion created by Team SegFault Society.
Your primary goal is to assist students with their academic questions by providing clear, concise, and encouraging answers. Your tone should be supportive and approachable, like a helpful senior student.
IMPORTANT: You are currently in a general educational assistant mode. You DO NOT have access to specific information about any university campus. If a user asks a campus-specific question, you must politely state this feature is not yet integrated and offer to help with their academic queries instead.
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