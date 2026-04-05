# """
# ClaimCraft Backend — FastAPI
# Endpoints:
#     POST /parse              → upload EDI file, returns parsed JSON tree
#     POST /validate           → static HIPAA 5010 rules only (fast)
#     POST /validate/full      → static + live NPI/ICD-10/CPT checks
#     POST /chat               → Gemini AI chat with file context
#     POST /reconcile          → 835 vs 837 claim matching
#     GET  /health             → uptime check
# """

# import os
# import json
# import asyncio
# from typing import Optional

# from fastapi import FastAPI, UploadFile, File, HTTPException, Body
# from fastapi.middleware.cors import CORSMiddleware
# from fastapi.responses import JSONResponse
# from pydantic import BaseModel

# from edi_parser import parse
# from edi_parser.validator import validate_static, validate_full

# # ── Gemini ────────────────────────────────────────────────────────────────────
# import google.generativeai as genai

# GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
# if GEMINI_API_KEY:
#     genai.configure(api_key=GEMINI_API_KEY)

# # ── App ───────────────────────────────────────────────────────────────────────
# app = FastAPI(
#     title="ClaimCraft API",
#     description="X12 EDI Parser & Validator for US Healthcare",
#     version="1.0.0",
# )

# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["*"],          # tighten in production
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )


# # ─────────────────────────────────────────────────────────────────────────────
# # REQUEST / RESPONSE MODELS
# # ─────────────────────────────────────────────────────────────────────────────

# class ValidateRequest(BaseModel):
#     parsed: dict


# class ChatMessage(BaseModel):
#     role: str           # "user" or "model"
#     content: str


# class ChatRequest(BaseModel):
#     message: str
#     history: list[ChatMessage] = []
#     parsed_context: Optional[dict] = None   # full parse result for context


# class ReconcileRequest(BaseModel):
#     parsed_837: dict
#     parsed_835: dict


# # ─────────────────────────────────────────────────────────────────────────────
# # HEALTH
# # ─────────────────────────────────────────────────────────────────────────────

# @app.get("/health")
# def health():
#     return {"status": "ok", "service": "ClaimCraft API v1.0.0"}


# # ─────────────────────────────────────────────────────────────────────────────
# # POST /parse
# # ─────────────────────────────────────────────────────────────────────────────


# @app.post("/parse")
# async def parse_edi(file: UploadFile = File(...)):
#     """
#     Accept an EDI file upload (.edi, .txt, .x12).
#     Auto-detects transaction type (837P/837I/835/834).
#     Returns full parsed JSON tree.
#     """
#     # read file
#     raw_bytes = await file.read()
#     try:
#         raw = raw_bytes.decode("utf-8-sig")
#     except UnicodeDecodeError:
#         raw = raw_bytes.decode("latin-1")

#     if not raw.strip():
#         raise HTTPException(status_code=400, detail="Uploaded file is empty.")

#     result = parse(raw)

#     if result.get("errors"):
#         # still return the result — frontend shows partial + errors
#         return JSONResponse(content=result, status_code=207)

#     return JSONResponse(content=result)


# # ─────────────────────────────────────────────────────────────────────────────
# # POST /validate  (static only — fast)
# # ─────────────────────────────────────────────────────────────────────────────

# @app.post("/validate")
# def validate_edi_static(body: ValidateRequest):
#     """
#     Run static HIPAA 5010 validation rules on a parsed result.
#     Zero API calls. Returns in milliseconds.
#     Accepts the full parsed dict from /parse.
#     """
#     try:
#         result = validate_static(body.parsed)
#         return JSONResponse(content=result)
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=f"Validation failed: {e}")


# # ─────────────────────────────────────────────────────────────────────────────
# # POST /validate/full  (static + live NPI/ICD-10/CPT)
# # ─────────────────────────────────────────────────────────────────────────────

# @app.post("/validate/full")
# def validate_edi_full(body: ValidateRequest):
#     """
#     Run static rules + live API checks:
#       - CMS NPPES NPI Registry validation
#       - NLM ICD-10-CM code validation
#       - HCPCS/CPT code validation (local 2026 file + NLM API fallback)
#     Slower (~2-5s). Use for full validation before submission.
#     """
#     try:
#         result = validate_full(body.parsed)
#         return JSONResponse(content=result)
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=f"Full validation failed: {e}")


# # ─────────────────────────────────────────────────────────────────────────────
# # POST /chat  (Gemini AI assistant)
# # ─────────────────────────────────────────────────────────────────────────────

# SYSTEM_PROMPT = """You are ClaimCraft, an expert X12 EDI healthcare billing assistant.
# You help healthcare billing specialists, developers, and coders understand EDI files.

# You have access to:
# - The full parsed EDI file structure (JSON tree)
# - The complete validation error list with rule IDs and suggested fixes

# Your behavior:
# - Answer questions about specific segments, elements, loops, and values in the file
# - Explain what each error means in plain English
# - Suggest how to fix validation errors
# - Explain HIPAA 5010 rules, CARC/RARC codes, POS codes, ICD-10, CPT/HCPCS codes
# - Be concise and specific — reference actual values from the file, not generic answers
# - If asked about a specific claim, service line, or NPI — pull the exact value from the context

# Tone: Professional but clear. No jargon without explanation. Think "expert billing consultant".
# """

# def _build_context_block(parsed_context: Optional[dict]) -> str:
#     """Serialize parsed context into a compact string for Gemini."""
#     if not parsed_context:
#         return ""

#     tx_info = parsed_context.get("transaction_info", {})
#     tree = parsed_context.get("tree", {})
#     errors = parsed_context.get("validation_errors", [])
#     warnings = parsed_context.get("validation_warnings", [])

#     # Keep context compact — truncate tree if huge
#     tree_str = json.dumps(tree, indent=None)
#     if len(tree_str) > 12000:
#         tree_str = tree_str[:12000] + "... [truncated]"

#     context = f"""
# === EDI FILE CONTEXT ===
# Transaction Type : {tx_info.get('type', 'Unknown')}
# Sender ID        : {tx_info.get('sender_id', 'N/A')}
# Receiver ID      : {tx_info.get('receiver_id', 'N/A')}
# Segment Count    : {parsed_context.get('raw_segment_count', 'N/A')}

# === PARSED TREE (JSON) ===
# {tree_str}

# === VALIDATION ERRORS ({len(errors)}) ===
# {json.dumps(errors[:30], indent=None)}

# === VALIDATION WARNINGS ({len(warnings)}) ===
# {json.dumps(warnings[:20], indent=None)}
# """
#     return context


# @app.post("/chat")
# def chat(body: ChatRequest):
#     """
#     AI chat assistant powered by Gemini.
#     Send user message + optional conversation history + parsed EDI context.
#     Returns AI response as plain text.
#     """
#     if not GEMINI_API_KEY:
#         raise HTTPException(
#             status_code=503,
#             detail="Gemini API key not configured. Set GEMINI_API_KEY env variable."
#         )

#     try:
#         model = genai.GenerativeModel(
#             model_name="gemini-2.0-flash",
#             system_instruction=SYSTEM_PROMPT,
#         )

#         # Build conversation history for Gemini
#         history = []
#         for msg in body.history:
#             history.append({
#                 "role": msg.role,
#                 "parts": [msg.content]
#             })

#         chat_session = model.start_chat(history=history)

#         # Append context block to first user message if context provided
#         user_message = body.message
#         if body.parsed_context and not body.history:
#             # First message — inject full context
#             context_block = _build_context_block(body.parsed_context)
#             user_message = f"{context_block}\n\n=== USER QUESTION ===\n{body.message}"
#         elif body.parsed_context and body.history:
#             # Ongoing conversation — inject compact context reminder
#             tx_type = body.parsed_context.get("transaction_info", {}).get("type", "")
#             error_count = len(body.parsed_context.get("validation_errors", []))
#             user_message = f"[File: {tx_type}, {error_count} errors]\n{body.message}"

#         response = chat_session.send_message(user_message)
#         reply = response.text

#         return JSONResponse(content={"reply": reply, "role": "model"})

#     except Exception as e:
#         raise HTTPException(status_code=500, detail=f"Chat failed: {e}")


# # ─────────────────────────────────────────────────────────────────────────────
# # POST /reconcile  (835 vs 837 matching)
# # ─────────────────────────────────────────────────────────────────────────────

# @app.post("/reconcile")
# def reconcile_claims(body: ReconcileRequest):
#     """
#     Match an 837 (claims submitted) against an 835 (remittance received).
#     For each claim in 837:
#       - Find matching CLP in 835 by claim ID
#       - Compare billed vs paid
#       - Surface adjustment reason codes (CARC)
#       - Flag unmatched claims (submitted but no payment received)

#     Returns a reconciliation report.
#     """
#     try:
#         result = _reconcile(body.parsed_837, body.parsed_835)
#         return JSONResponse(content=result)
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=f"Reconciliation failed: {e}")


# def _reconcile(parsed_837: dict, parsed_835: dict) -> dict:
#     """
#     Core reconciliation logic.
#     Matches CLM01 (837) against CLP01 (835).
#     """

#     # ── extract all claims from 837 ──
#     claims_837 = []
#     tree_837 = parsed_837.get("tree", {})
#     for hl_loop in tree_837.get("loops", []):
#         _extract_claims_from_loop(hl_loop, claims_837)

#     # ── extract all CLP entries from 835 ──
#     clp_map = {}
#     tree_835 = parsed_835.get("tree", {})
#     for claim in tree_835.get("claim_loops", []):
#         claim_id = claim.get("claim_id", "").strip()
#         if claim_id:
#             clp_map[claim_id] = claim

#     # ── match ──
#     matched = []
#     unmatched_837 = []
#     unmatched_835 = list(clp_map.keys())

#     for clm in claims_837:
#         claim_id = clm.get("claim_id", "").strip()
#         billed = _to_float(clm.get("total_charge"))

#         if claim_id in clp_map:
#             clp = clp_map[claim_id]
#             paid = _to_float(clp.get("paid_amount"))
#             patient_resp = _to_float(clp.get("patient_responsibility"))
#             delta = round(billed - paid, 2) if billed is not None and paid is not None else None

#             # collect adjustments with descriptions
#             # 835 CAS structure: adjustments[{group_code, adjustments:[{reason_code, amount}]}]
#             adjustments = []
#             for cas in clp.get("adjustments", []):
#                 group_code = cas.get("group_code", "")
#                 for adj in cas.get("adjustments", []):
#                     code = adj.get("reason_code", "")
#                     adjustments.append({
#                         "group_code": group_code,
#                         "reason_code": code,
#                         "reason_description": _carc_desc(code),
#                         "amount": adj.get("amount", ""),
#                     })

#             # service line reconciliation
#             services = []
#             for svc in clp.get("service_lines", []):
#                 svc_billed = _to_float(svc.get("billed_amount") or svc.get("billed"))
#                 svc_paid = _to_float(svc.get("paid_amount") or svc.get("paid"))
#                 svc_delta = round(svc_billed - svc_paid, 2) if svc_billed is not None and svc_paid is not None else None
#                 svc_adjs = []
#                 for cas in svc.get("adjustments", []):
#                     grp = cas.get("group_code", "")
#                     for adj in cas.get("adjustments", []):
#                         code = adj.get("reason_code", "")
#                         svc_adjs.append({
#                             "group_code": grp,
#                             "reason_code": code,
#                             "reason_description": _carc_desc(code),
#                             "amount": adj.get("amount", ""),
#                         })
#                 services.append({
#                     "procedure": svc.get("procedure_code") or svc.get("procedure"),
#                     "billed": svc_billed,
#                     "paid": svc_paid,
#                     "delta": svc_delta,
#                     "adjustments": svc_adjs,
#                 })

#             status_code = clp.get("claim_status_code", "")
#             matched.append({
#                 "claim_id": claim_id,
#                 "status": _clp_status(status_code),
#                 "status_code": status_code,
#                 "billed": billed,
#                 "paid": paid,
#                 "patient_responsibility": patient_resp,
#                 "delta": delta,
#                 "fully_paid": delta == 0.0 if delta is not None else None,
#                 "adjustments": adjustments,
#                 "services": services,
#                 "payer_control_number": clp.get("payer_claim_control", "") or clp.get("payer_control_number", ""),
#             })

#             if claim_id in unmatched_835:
#                 unmatched_835.remove(claim_id)
#         else:
#             unmatched_837.append({
#                 "claim_id": claim_id,
#                 "billed": billed,
#                 "status": "NO_REMITTANCE",
#                 "message": "Claim submitted in 837 but no matching CLP found in 835."
#             })

#     # summary
#     total_billed = sum(r["billed"] or 0 for r in matched)
#     total_paid = sum(r["paid"] or 0 for r in matched)
#     total_delta = round(total_billed - total_paid, 2)

#     return {
#         "summary": {
#             "total_claims_837": len(claims_837),
#             "total_claims_835": len(clp_map),
#             "matched": len(matched),
#             "unmatched_in_837": len(unmatched_837),
#             "unmatched_in_835": len(unmatched_835),
#             "total_billed": round(total_billed, 2),
#             "total_paid": round(total_paid, 2),
#             "total_delta": total_delta,
#             "fully_paid_count": sum(1 for r in matched if r["fully_paid"]),
#             "partially_paid_count": sum(1 for r in matched if r["fully_paid"] is False and r["paid"] and r["paid"] > 0),
#             "denied_count": sum(1 for r in matched if r["paid"] == 0),
#         },
#         "matched_claims": matched,
#         "unmatched_in_837": unmatched_837,
#         "unmatched_in_835": [
#             {"claim_id": cid, "message": "CLP in 835 has no matching CLM in 837."}
#             for cid in unmatched_835
#         ],
#     }


# def _extract_claims_from_loop(loop: dict, out: list):
#     """Recursively extract all claims from HL loop tree."""
#     for claim in loop.get("claims", []):
#         out.append(claim)
#     for sub in loop.get("subscriber_loops", []):
#         _extract_claims_from_loop(sub, out)


# def _to_float(val) -> Optional[float]:
#     try:
#         return float(val)
#     except (TypeError, ValueError):
#         return None


# def _clp_status(code: str) -> str:
#     return {
#         "1": "Processed as Primary",
#         "2": "Processed as Secondary",
#         "3": "Processed as Tertiary",
#         "4": "Denied",
#         "19": "Processed as Primary, Forwarded to Additional Payer",
#         "20": "Processed as Secondary, Forwarded to Additional Payer",
#         "21": "Processed as Tertiary, Forwarded to Additional Payer",
#         "22": "Reversal of Previous Payment",
#         "23": "Not Our Claim, Forwarded to Another Payer",
#         "25": "Predetermination Pricing Only — No Payment",
#     }.get(code, f"Unknown ({code})")


# CARC_DESCRIPTIONS = {
#     "1": "Deductible amount",
#     "2": "Coinsurance amount",
#     "3": "Co-payment amount",
#     "4": "Service not covered by plan",
#     "5": "Procedure code inconsistent with place of service",
#     "6": "Service not authorized",
#     "9": "Diagnosis inconsistent with procedure",
#     "16": "Claim lacks required information",
#     "18": "Duplicate claim/service",
#     "22": "May be covered by another payer",
#     "26": "Expenses incurred prior to coverage",
#     "27": "Expenses incurred after coverage terminated",
#     "29": "Time limit for filing expired",
#     "45": "Charge exceeds fee schedule / maximum allowable",
#     "49": "Service not covered by plan",
#     "50": "Send to correct payer",
#     "55": "Patient not eligible for this service",
#     "96": "Non-covered charge",
#     "97": "Included in allowance for another service",
#     "119": "Benefit maximum reached for this period",
#     "197": "Precertification/authorization absent",
# }

# def _carc_desc(code: str) -> str:
#     return CARC_DESCRIPTIONS.get(str(code), f"Adjustment reason code {code}")



import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import parse, validate, chat, reconcile, export, autofix


# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="ClaimCraft API",
    description="X12 EDI Parser & Validator for US Healthcare",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # tighten in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(parse.router, tags=["Parse"])
app.include_router(validate.router, tags=["Validate"])
app.include_router(chat.router, tags=["Chat"])
app.include_router(reconcile.router, tags=["Reconcile"])
app.include_router(export.router, tags=["Export"])
app.include_router(autofix.router, tags=["AutoFix"])

@app.get("/")
@app.head("/")
def read_root():
    return {"status": "ok", "message": "ClaimCraft API is up and running!"}
# ── Health ────────────────────────────────────────────────────────────────────
@app.get("/health", tags=["System"])
def health():
    return {"status": "ok", "service": "ClaimCraft API v1.0.0"}