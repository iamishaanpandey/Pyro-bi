import os
from groq import Groq
from dotenv import load_dotenv

# Force reload
load_dotenv(override=True)

api_key = os.getenv("GROQ_API_KEY")
model = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")

print(f"--- API Diagnostic ---")
print(f"Key (masked): {api_key[:10]}...{api_key[-5:] if api_key else 'None'}")
print(f"Model: {model}")

client = Groq(api_key=api_key)

try:
    print("Sending test request to Groq...")
    completion = client.chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": "Hello. Just respond with 'OK'."}],
        max_tokens=5
    )
    print(f"SUCCESS! Response: {completion.choices[0].message.content}")
except Exception as e:
    print(f"\n!!! FAILED !!!")
    print(f"Error Type: {type(e).__name__}")
    print(f"Error Message: {str(e)}")
    if hasattr(e, 'status_code'):
        print(f"Status Code: {e.status_code}")
    if hasattr(e, 'response'):
        print(f"Response Body: {e.response.text}")
