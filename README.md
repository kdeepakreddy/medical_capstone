# 🏥 MedAI Analyzer

> **Translating Complex Medical Reports into Simple Language using AI**

MedAI Analyzer is a fully decoupled, AI-powered web application designed to bridge the communication gap in healthcare. It translates complex, jargon-heavy medical reports (PDFs or Images) into simple, accessible language, empowering patients to understand their health data without the anxiety of medical jargon or the risk of AI hallucination.

## ✨ Key Features

* **Multi-Format Document Processing:** Upload scanned PDFs, JPGs, or PNGs. The system utilizes Poppler and PyTesseract OCR to extract raw text with high accuracy.
* **Hallucination-Free Two-Step AI Pipeline:** 1. **NER Filtering:** A custom `Bio_ClinicalBERT` model mathematically filters the raw text to extract only verified clinical entities (diseases, symptoms, medications).
  2. **LLM Explanation:** Verified entities are passed to a strictly prompted Llama-3.1-8b model (via Groq) to generate safe, simple-English explanations.
* **Health Severity Index:** Dynamically calculates a 0-100 severity score based on the extracted entities, visualized via an interactive Chart.js gauge.
* **Multi-Language Accessibility:** Features an integrated, DOM-manipulated Google Translate widget allowing users to instantly translate their simplified reports into regional languages like Hindi and Telugu.

## 🛠️ Technology Stack

**Frontend:**
* React.js
* Vanilla JavaScript (Interactive Logic)
* Chart.js (Data Visualization)
* Hosted on Netlify

**Backend:**
* Python 3.10
* FastAPI & Uvicorn
* Docker
* Hosted on Hugging Face Spaces

**AI / Machine Learning:**
* **OCR:** PyTesseract & Poppler
* **NER:** Hugging Face Transformers, PyTorch, `emilyalsentzer/Bio_ClinicalBERT` (Fine-tuned on NCBI Disease Dataset)
* **LLM:** Llama-3.1-8b (via Groq API)

## 📊 Model Performance

Our custom Named Entity Recognition (NER) model was rigorously evaluated using the `seqeval` metric to ensure it accurately extracts medical terms without over-flagging standard English words.

| Evaluation Metric | Value Achieved |
| :--- | :--- |
| **Token Accuracy** | 98.60% |
| **F1-Score** | 84.96% |
| **Precision** | 81.74% |
| **Recall** | 88.45% |

## 🚀 Local Setup & Installation

### Prerequisites
* Python 3.10+
* Node.js & npm
* Tesseract OCR & Poppler installed on your local machine
* A Groq API Key

### 1. Backend Setup
`bash
# Navigate to the backend directory
cd backend

# Create a virtual environment
python -m venv venv
source venv/bin/activate  # On Windows use `venv\Scripts\activate`

# Install dependencies
pip install -r requirements.txt

# Set your Groq API Key as an environment variable
export GROQ_API_KEY="your_api_key_here"  # On Windows use `set GROQ_API_KEY=your_api_key_here`

# Start the FastAPI server
uvicorn main:app --reload
`

### 2. Frontend Setup
`bash
# Navigate to the frontend directory
cd frontend

# Install dependencies
npm install

# Start the React development server
npm start
`
*Note: Ensure your frontend `.env` file points to the local FastAPI server URL (usually `http://localhost:8000`).*

## ⚙️ System Architecture
The application utilizes a strict decoupled architecture. The React frontend handles user interactions and file uploads, sending data via HTTP POST `fetch()` requests to the FastAPI backend. The backend manages all heavy C++ dependencies (OCR) and high-RAM Machine Learning tasks, returning a structured JSON payload to the frontend for dynamic display.
