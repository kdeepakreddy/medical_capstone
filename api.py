from fastapi import FastAPI, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from transformers import AutoTokenizer, AutoModelForTokenClassification
from transformers import pipeline
import pytesseract
from pdf2image import convert_from_bytes
from PIL import Image
import io
import os
import json
from groq import Groq

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MODEL_PATH = "Kdeepakreddy/medai-ner" 

tokenizer = AutoTokenizer.from_pretrained(MODEL_PATH)
model = AutoModelForTokenClassification.from_pretrained(MODEL_PATH)
ner_pipeline = pipeline("ner", model=model, tokenizer=tokenizer, aggregation_strategy="simple")

GROQ_API_KEY = os.getenv("GROQ_API_KEY") 
client = Groq(api_key=GROQ_API_KEY)

def extract_text_from_file(file_content, filename):
    text = ""
    if filename.endswith(".pdf"):
        images = convert_from_bytes(file_content)
        for img in images:
             text += pytesseract.image_to_string(img) + "\n"
    elif filename.endswith((".png", ".jpg", ".jpeg")):
        image = Image.open(io.BytesIO(file_content))
        text = pytesseract.image_to_string(image)
    else:
        text = file_content.decode("utf-8")
    return text

def analyze_full_report_with_llm(text):
    if not text.strip():
        return {"Error": "No text could be extracted from the document."}
    
    # STRICT PROMPT FOR DASHBOARD METRICS
    prompt = f"""
    You are an expert medical AI. Analyze the following raw text from a patient's medical or lab report.
    
    STRICT INSTRUCTIONS FOR JSON OUTPUT:
    1. "Severity Score": Create an integer key from 0 to 100 representing the severity of the patient's condition based on the report (0 = perfectly normal, 100 = critical/severe disease).
    2. "Severity Level": Create a string key that categorizes the severity as exactly one of these words: "Normal", "Low", "Moderate", or "High".
    3. "Confidence Score": Create an integer key from 0 to 100 representing how confident you are in this analysis based on the clarity of the text.
    4. "Overall Assessment": Create a detailed paragraph summarizing the patient's health status.
    5. Medical Abnormalities/Diseases: Extract ONLY genuine medical conditions, diseases, or out-of-range lab results. Make each one a new key. The value must be a simple, patient-friendly explanation.
    6. EXCLUSIONS: Ignore patient names, age, sex, gender, phone numbers, addresses, dates, and hospital/lab names. Do NOT create keys for these.
    
    Return ONLY a valid JSON object. No markdown, no introductory text.
    
    Report Text:
    {text[:4000]} 
    """
    
    try:
        chat_completion = client.chat.completions.create(
            messages=[
                {
                    "role": "system",
                    "content": "You are a helpful medical assistant. You strictly follow instructions and only output valid JSON."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            model="llama-3.1-8b-instant", 
            temperature=0.3,
            response_format={"type": "json_object"} 
        )
        
        result_text = chat_completion.choices[0].message.content
        parsed_json = json.loads(result_text)
        
        cleaned_json = {}
        for key, value in parsed_json.items():
             if isinstance(value, dict):
                 cleaned_json[key] = str(list(value.values())[0])
             elif isinstance(value, list):
                  cleaned_json[key] = ", ".join([str(item) for item in value])
             else:
                 cleaned_json[key] = value 
                 
        return cleaned_json
        
    except Exception as e:
        print(f"Error calling Groq API: {e}")
        return {"Overall Assessment": "Analysis could not be generated at this time due to an API error."}

@app.post("/analyze")
async def analyze_report(file: UploadFile = File(...)):
    try:
        content = await file.read()
        extracted_text = extract_text_from_file(content, file.filename)
        
        explanations = analyze_full_report_with_llm(extracted_text)
        medical_terms_list = list(explanations.keys())
        
        return {
            "status": "success",
            "extracted_terms": medical_terms_list,
            "explanations": explanations
        }
        
    except Exception as e:
        return {"status": "error", "message": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)