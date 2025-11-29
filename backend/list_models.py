import google.generativeai as genai
import os

key = "AIzaSyBdtYLpUucxwys-2KIHELwKT6OQPb7VWL0"
genai.configure(api_key=key)

try:
    print("Listing models...")
    for m in genai.list_models():
        if 'generateContent' in m.supported_generation_methods:
            print(m.name)
except Exception as e:
    print(f"Error: {e}")
