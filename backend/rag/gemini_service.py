
import os
import google.generativeai as genai
from dotenv import load_dotenv

# -----------------------------
# Load Environment Variables
# -----------------------------

load_dotenv()

API_KEY = os.getenv(
    "GEMINI_API_KEY"
)

if not API_KEY:
    raise ValueError(
        "GEMINI_API_KEY not found in .env file"
    )

# -----------------------------
# Configure Gemini
# -----------------------------

genai.configure(
    api_key=API_KEY
)

model = genai.GenerativeModel(
    "gemini-2.5-flash"
)

# -----------------------------
# Main Generation Function
# -----------------------------

def generate_answer(
    context: str,
    question: str
) -> str:

    prompt = f"""
You are PlantMind AI,
an Industrial Engineering Copilot.

Your responsibilities:

- Analyze maintenance manuals
- Analyze SOP documents
- Analyze incident reports
- Analyze compliance documents
- Analyze industrial knowledge bases

RULES:

1. Use ONLY information found in the supplied context.

2. Do NOT invent facts.

3. If the answer is not present in the context,
   clearly state:

   "Information not found in uploaded documents."

4. Be concise but technically accurate.

5. When possible, cite evidence from the context.

------------------------------------------------

CONTEXT

{context}

------------------------------------------------

QUESTION

{question}

------------------------------------------------

ANSWER
"""

    try:

        response = model.generate_content(
            prompt
        )

        if (
            response
            and hasattr(
                response,
                "text"
            )
            and response.text
        ):
            return response.text

        return (
            "No response generated."
        )

    except Exception as e:

        print(
            "Gemini Error:",
            str(e)
        )

        return (
            f"Generation failed: {str(e)}"
        )

