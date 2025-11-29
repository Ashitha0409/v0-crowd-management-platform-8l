import os
import sys

try:
    import google.generativeai as genai
    print("Library imported successfully.")
except ImportError:
    print("Library google.generativeai NOT installed.")
    sys.exit(1)

key = "AIzaSyBdtYLpUucxwys-2KIHELwKT6OQPb7VWL0"
print(f"Testing key: {key[:5]}...")

try:
    genai.configure(api_key=key)
    model = genai.GenerativeModel('gemini-pro')
    response = model.generate_content("Hello, are you working?")
    print("API Call Successful!")
    print(response.text)
except Exception as e:
    print(f"API Call Failed: {e}")
