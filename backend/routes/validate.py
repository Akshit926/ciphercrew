from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from edi_parser.validator import validate_static, validate_full

router = APIRouter()

class ValidateRequest(BaseModel):
    parsed: dict


@router.post("/validate")
def validate_edi_static(body: ValidateRequest):
    """
    Run static HIPAA 5010 validation rules on a parsed result.
    Zero API calls. Returns in milliseconds.
    Accepts the full parsed dict from /parse.
    """
    try:
        result = validate_static(body.parsed)
        return JSONResponse(content=result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Validation failed: {e}")


@router.post("/validate/full")
def validate_edi_full(body: ValidateRequest):
    """
    Run static rules + live API checks:
      - CMS NPPES NPI Registry validation
      - NLM ICD-10-CM code validation
      - HCPCS/CPT code validation (local file + NLM API fallback)
    Slower (~2-5s). Use for full validation before submission.
    """
    try:
        result = validate_full(body.parsed)
        return JSONResponse(content=result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Full validation failed: {e}")