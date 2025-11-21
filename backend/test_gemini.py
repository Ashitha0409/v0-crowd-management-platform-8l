import os
import google.generativeai as genai

try:
    # Load API Key
    if os.path.exists("gemini_key.txt"):
        with open("gemini_key.txt", "r") as f:
            api_key = f.read().strip()
        print(f"Loaded key: {api_key[:5]}...{api_key[-5:]}")
    else:
        print("gemini_key.txt not found")
        exit(1)

    genai.configure(api_key=api_key)
    
    # List models to verify connection
    print("Listing models...")
    for m in genai.list_models():
        if 'generateContent' in m.supported_generation_methods:
            print(m.name)
            
    # Try a simple generation
    print("\nTesting generation with models/gemini-1.5-flash-latest...")
    model = genai.GenerativeModel('models/gemini-1.5-flash-latest')
    response = model.generate_content("Hello, are you working?")
    print(f"Response: {response.text}")
    print("SUCCESS: Gemini API is working.")

except Exception as e:
    print(f"\nERROR: {e}")
