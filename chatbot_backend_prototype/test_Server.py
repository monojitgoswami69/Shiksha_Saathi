# test_server.py (Updated to initialize session)
import requests
import uuid

BASE_URL = "http://127.0.0.1:8000"

def main():
    session_id = str(uuid.uuid4())
    print(f"Started new session: {session_id}")

    # --- NEW: Call the /session/start endpoint ---
    try:
        print("Initializing session on the backend...")
        init_response = requests.post(
            f"{BASE_URL}/session/start",
            json={"session_id": session_id},
            timeout=10
        )
        if init_response.status_code == 200:
            print(f"Session initialized: {init_response.json().get('status')}")
        else:
            print("Warning: Could not initialize session on backend.")
    except Exception as e:
        print(f"Warning: Failed to initialize session. {e}")
    # ---------------------------------------------

    print("\nConnecting to Shiksha Saathi backend...")
    # (The rest of the health check and main chat loop code is exactly the same as before)
    try:
        r = requests.get(BASE_URL)
        if r.status_code == 200:
            print(f"Server OK: {r.json().get('message')}")
        else:
            print("Server not responding properly.")
            return
    except Exception as e:
        print(f"Error: could not connect to server at {BASE_URL}\n{e}")
        return

    print("\nWelcome to Shiksha Saathi (Terminal Client).")
    print("Type 'exit' or 'quit' to end.\n")

    while True:
        # (The main chat loop remains unchanged)
        user_input = input("You: ").strip()
        if not user_input:
            continue
        if user_input.lower() in ["exit", "quit"]:
            print("Goodbye!")
            break

        try:
            payload = {"message": user_input, "session_id": session_id}
            response = requests.post(f"{BASE_URL}/chat", json=payload, stream=True, timeout=60)

            if response.status_code == 200:
                print("Shiksha Saathi: ", end="", flush=True)
                for chunk in response.iter_content(chunk_size=None, decode_unicode=True):
                    if chunk:
                        print(chunk, end="", flush=True)
                print()
            else:
                print(f"Error {response.status_code}: {response.text}")
        except Exception as e:
            print(f"Request failed: {e}")

if __name__ == "__main__":
    main()