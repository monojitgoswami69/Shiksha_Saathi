import json
import base64
import os

with open('firebase-credentials.json', 'r') as f:
    data = json.load(f) 
json_string = json.dumps(data)
json_bytes = json_string.encode('utf-8')
encoded_bytes = base64.b64encode(json_bytes)
base64_string = encoded_bytes.decode('utf-8')

env_file = '.env'
env_content = ""

if os.path.exists(env_file):
    with open(env_file, 'r') as f:
        env_content = f.read()

    lines = env_content.split('\n')
    updated = False
    for i, line in enumerate(lines):
        if line.startswith('FIREBASE_CREDS_BASE64'):
            lines[i] = f'FIREBASE_CREDS_BASE64={base64_string}'
            updated = True
            break
    
    if updated:
        env_content = '\n'.join(lines)
    else:
        if env_content and not env_content.endswith('\n'):
            env_content += '\n'
        env_content += f'FIREBASE_CREDS_BASE64={base64_string}\n'
else:
    env_content = f'FIREBASE_CREDS_BASE64={base64_string}\n'

with open(env_file, 'w') as f:
    f.write(env_content)

print(f"Firebase credentials encoded and written to {env_file}")
print(f"Length: {len(base64_string)} characters")