import os
import json
from typing import Optional
from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from groq import Groq
from dotenv import load_dotenv
router = APIRouter()

# ── Groq Setup ────────────────────────────────────────────────────────────────
load_dotenv()
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
client = Groq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None

SYSTEM_PROMPT = """You are ClaimCraft, an expert X12 EDI healthcare billing assistant.
You help healthcare billing specialists, developers, and coders understand EDI files.

You have access to:
- The full parsed EDI file structure (JSON tree)
- The complete validation error list with rule IDs and suggested fixes

Your behavior:
- Answer questions about specific segments, elements, loops, and values in the file
- Explain what each error means in plain English
- Suggest how to fix validation errors
- Explain HIPAA 5010 rules, CARC/RARC codes, POS codes, ICD-10, CPT/HCPCS codes
- Be concise and specific — reference actual values from the file, not generic answers
- If asked about a specific claim, service line, or NPI — pull the exact value from the context

Tone: Professional but clear and short. No jargon without explanation. Think "expert billing consultant".
"""

# ── Models ────────────────────────────────────────────────────────────────────
class ChatMessage(BaseModel):
    role: str           # "user" or "model" (frontend uses "model", Groq uses "assistant")
    content: str

class ChatRequest(BaseModel):
    message: str
    history: list[ChatMessage] = []
    parsed_context: Optional[dict] = None   # full parse result for context


# ── Helpers ───────────────────────────────────────────────────────────────────
def _build_context_block(parsed_context: Optional[dict]) -> str:
    """Serialize parsed context into a compact string for the LLM."""
    if not parsed_context:
        return ""

    tx_info = parsed_context.get("transaction_info", {})
    tree = parsed_context.get("tree", {})
    errors = parsed_context.get("validation_errors", [])
    warnings = parsed_context.get("validation_warnings", [])

    # Keep context compact — truncate tree if huge
    tree_str = json.dumps(tree, indent=None)
    if len(tree_str) > 12000:
        tree_str = tree_str[:12000] + "... [truncated]"

    context = f"""
=== EDI FILE CONTEXT ===
Transaction Type : {tx_info.get('type', 'Unknown')}
Sender ID        : {tx_info.get('sender_id', 'N/A')}
Receiver ID      : {tx_info.get('receiver_id', 'N/A')}
Segment Count    : {parsed_context.get('raw_segment_count', 'N/A')}

=== PARSED TREE (JSON) ===
{tree_str}

=== VALIDATION ERRORS ({len(errors)}) ===
{json.dumps(errors[:30], indent=None)}

=== VALIDATION WARNINGS ({len(warnings)}) ===
{json.dumps(warnings[:20], indent=None)}
"""
    return context


# ── Routes ────────────────────────────────────────────────────────────────────
@router.post("/chat")
def chat(body: ChatRequest):
    """
    AI chat assistant powered by Groq.
    Send user message + optional conversation history + parsed EDI context.
    Returns AI response as plain text.
    """
    if not client:
        raise HTTPException(
            status_code=503,
            detail="Groq API key not configured. Set GROQ_API_KEY env variable."
        )

    try:
        # 1. Initialize messages with the System Prompt
        messages = [
            {"role": "system", "content": SYSTEM_PROMPT}
        ]

        # 2. Append conversation history
        for msg in body.history:
            # Map frontend "model" role to Groq's expected "assistant" role
            role = "assistant" if msg.role == "model" else msg.role
            messages.append({
                "role": role,
                "content": msg.content
            })

        # 3. Format the current user message with context
        user_message = body.message
        if body.parsed_context and not body.history:
            # First message — inject full context
            context_block = _build_context_block(body.parsed_context)
            user_message = f"{context_block}\n\n=== USER QUESTION ===\n{body.message}"
        elif body.parsed_context and body.history:
            # Ongoing conversation — inject compact context reminder
            tx_type = body.parsed_context.get("transaction_info", {}).get("type", "")
            error_count = len(body.parsed_context.get("validation_errors", []))
            user_message = f"[File: {tx_type}, {error_count} errors]\n{body.message}"

        # 4. Add the final user message to the array
        messages.append({"role": "user", "content": user_message})

        # 5. Call Groq API
        chat_completion = client.chat.completions.create(
            messages=messages,
            model="llama-3.3-70b-versatile", # You can change this to 'mixtral-8x7b-32768' or 'gemma-7b-it'
            temperature=0.2,         # Low temperature for analytical/factual responses
        )

        reply = chat_completion.choices[0].message.content

        # Return the response mapped back to the frontend's expected "model" role
        return JSONResponse(content={"reply": reply, "role": "model"})

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat failed: {e}")