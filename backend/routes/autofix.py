import os
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from groq import Groq

router = APIRouter()
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

class AutoFixRequest(BaseModel):
    raw_edi: str
    errors: list

@router.post("/autofix")
async def autofix_edi(request: AutoFixRequest):
    # Format the errors into a readable string for the prompt
    error_summary = "\n".join([f"- Loop {e.get('loop', 'Unknown')}, Segment {e.get('segment', '')}: {e.get('message', '')}" for e in request.errors])
    
    prompt = f"""You are an expert EDI X12 healthcare billing consultant. 
I have an EDI file with the following validation errors:
{error_summary}

Here is the raw EDI file:
{request.raw_edi}

CRITICAL RULES:
1. Fix ONLY the structural/formatting elements causing these specific errors.
2. DO NOT change or guess NPIs (National Provider Identifiers), Tax IDs, Patient Member IDs, or Claim Control Numbers. If an error is about an invalid NPI/ID, leave the value exactly as it is.
3. Return ONLY the exact, corrected raw EDI string. Do not use markdown formatting blocks (like ```) and do not include any conversational text."""
    try:
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1 # Keep it very deterministic
        )
        
        fixed_edi = completion.choices[0].message.content.strip()
        # Clean up any stray markdown if the LLM ignores instructions
        fixed_edi = fixed_edi.replace("```edi", "").replace("```", "").strip()
        
        return {"fixed_edi": fixed_edi}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI Auto-fix failed: {str(e)}")