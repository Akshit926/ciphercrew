from typing import Optional
from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel

router = APIRouter()

# ── Models ────────────────────────────────────────────────────────────────────
class ReconcileRequest(BaseModel):
    parsed_837: dict
    parsed_835: dict

# ── Constants & Helpers ───────────────────────────────────────────────────────
CARC_DESCRIPTIONS = {
    "1": "Deductible amount",
    "2": "Coinsurance amount",
    "3": "Co-payment amount",
    "4": "Service not covered by plan",
    "5": "Procedure code inconsistent with place of service",
    "6": "Service not authorized",
    "9": "Diagnosis inconsistent with procedure",
    "16": "Claim lacks required information",
    "18": "Duplicate claim/service",
    "22": "May be covered by another payer",
    "26": "Expenses incurred prior to coverage",
    "27": "Expenses incurred after coverage terminated",
    "29": "Time limit for filing expired",
    "45": "Charge exceeds fee schedule / maximum allowable",
    "49": "Service not covered by plan",
    "50": "Send to correct payer",
    "55": "Patient not eligible for this service",
    "96": "Non-covered charge",
    "97": "Included in allowance for another service",
    "119": "Benefit maximum reached for this period",
    "197": "Precertification/authorization absent",
}

def _carc_desc(code: str) -> str:
    return CARC_DESCRIPTIONS.get(str(code), f"Adjustment reason code {code}")

def _extract_claims_from_loop(loop: dict, out: list):
    """Recursively extract all claims from HL loop tree."""
    # 1. Extract claims directly at this loop level
    for claim in loop.get("claims", []):
        out.append(claim)
        
    # 2. Traverse into subscriber loops
    for sub in loop.get("subscriber_loops", []):
        _extract_claims_from_loop(sub, out)
        
    # 3. Traverse into patient loops
    for pat in loop.get("patient_loops", []):
        _extract_claims_from_loop(pat, out)

def _to_float(val) -> Optional[float]:
    try:
        return float(val)
    except (TypeError, ValueError):
        return None

def _clp_status(code: str) -> str:
    return {
        "1": "Processed as Primary",
        "2": "Processed as Secondary",
        "3": "Processed as Tertiary",
        "4": "Denied",
        "19": "Processed as Primary, Forwarded to Additional Payer",
        "20": "Processed as Secondary, Forwarded to Additional Payer",
        "21": "Processed as Tertiary, Forwarded to Additional Payer",
        "22": "Reversal of Previous Payment",
        "23": "Not Our Claim, Forwarded to Another Payer",
        "25": "Predetermination Pricing Only — No Payment",
    }.get(code, f"Unknown ({code})")


def _reconcile(payload_837: dict, payload_835: dict) -> dict:
    """Core reconciliation logic. Matches CLM01 (837) against CLP01 (835)."""
    
    # 1. Drill down into the 'parsed' key because frontend sends the full /parse response
    parsed_837 = payload_837.get("parsed", payload_837)
    parsed_835 = payload_835.get("parsed", payload_835)

    # 2. Safely get the tree (and un-nest it if it's double-nested from earlier backend updates)
    tree_837 = parsed_837.get("tree", {})
    if isinstance(tree_837, dict) and "tree" in tree_837:
        tree_837 = tree_837["tree"]

    tree_835 = parsed_835.get("tree", {})
    if isinstance(tree_835, dict) and "tree" in tree_835:
        tree_835 = tree_835["tree"]

    # ── extract all claims from 837 ──
    claims_837 = []
    for hl_loop in tree_837.get("loops", []):
        _extract_claims_from_loop(hl_loop, claims_837)

    # ── extract all CLP entries from 835 ──
    clp_map = {}
    # Support both 'claim_loops' and 'loops' depending on your backend configuration
    loops_835 = tree_835.get("claim_loops", []) or tree_835.get("loops", [])
    for claim in loops_835:
        claim_id = claim.get("claim_id", "").strip()
        if claim_id:
            clp_map[claim_id] = claim

    # ── match ──
    matched = []
    unmatched_837 = []
    unmatched_835 = list(clp_map.keys())

    for clm in claims_837:
        claim_id = clm.get("claim_id", "").strip()
        billed = _to_float(clm.get("total_charge"))

        if claim_id in clp_map:
            clp = clp_map[claim_id]
            paid = _to_float(clp.get("paid_amount"))
            patient_resp = _to_float(clp.get("patient_responsibility"))
            delta = round(billed - paid, 2) if billed is not None and paid is not None else None

            # collect adjustments with descriptions
            adjustments = []
            for cas in clp.get("adjustments", []):
                group_code = cas.get("group_code", "")
                for adj in cas.get("adjustments", []):
                    code = adj.get("reason_code", "")
                    adjustments.append({
                        "group_code": group_code,
                        "reason_code": code,
                        "reason_description": _carc_desc(code),
                        "amount": adj.get("amount", ""),
                    })

            # service line reconciliation
            services = []
            for svc in clp.get("service_lines", []):
                svc_billed = _to_float(svc.get("billed_amount") or svc.get("billed"))
                svc_paid = _to_float(svc.get("paid_amount") or svc.get("paid"))
                svc_delta = round(svc_billed - svc_paid, 2) if svc_billed is not None and svc_paid is not None else None
                svc_adjs = []
                for cas in svc.get("adjustments", []):
                    grp = cas.get("group_code", "")
                    for adj in cas.get("adjustments", []):
                        code = adj.get("reason_code", "")
                        svc_adjs.append({
                            "group_code": grp,
                            "reason_code": code,
                            "reason_description": _carc_desc(code),
                            "amount": adj.get("amount", ""),
                        })
                services.append({
                    "procedure": svc.get("procedure_code") or svc.get("procedure"),
                    "billed": svc_billed,
                    "paid": svc_paid,
                    "delta": svc_delta,
                    "adjustments": svc_adjs,
                })

            status_code = clp.get("claim_status_code", "")
            matched.append({
                "claim_id": claim_id,
                "status": _clp_status(status_code),
                "status_code": status_code,
                "billed": billed,
                "paid": paid,
                "patient_responsibility": patient_resp,
                "delta": delta,
                "fully_paid": delta == 0.0 if delta is not None else None,
                "adjustments": adjustments,
                "services": services,
                "payer_control_number": clp.get("payer_claim_control", "") or clp.get("payer_control_number", ""),
            })

            if claim_id in unmatched_835:
                unmatched_835.remove(claim_id)
        else:
            unmatched_837.append({
                "claim_id": claim_id,
                "billed": billed,
                "status": "NO_REMITTANCE",
                "message": "Claim submitted in 837 but no matching CLP found in 835."
            })

    # summary
    total_billed = sum(r["billed"] or 0 for r in matched)
    total_paid = sum(r["paid"] or 0 for r in matched)
    total_delta = round(total_billed - total_paid, 2)

    return {
        "summary": {
            "total_claims_837": len(claims_837),
            "total_claims_835": len(clp_map),
            "matched": len(matched),
            "unmatched_in_837": len(unmatched_837),
            "unmatched_in_835": len(unmatched_835),
            "total_billed": round(total_billed, 2),
            "total_paid": round(total_paid, 2),
            "total_delta": total_delta,
            "fully_paid_count": sum(1 for r in matched if r["fully_paid"]),
            "partially_paid_count": sum(1 for r in matched if r["fully_paid"] is False and r["paid"] and r["paid"] > 0),
            "denied_count": sum(1 for r in matched if r["paid"] == 0),
        },
        "matched_claims": matched,
        "unmatched_in_837": unmatched_837,
        "unmatched_in_835": [
            {"claim_id": cid, "message": "CLP in 835 has no matching CLM in 837."}
            for cid in unmatched_835
        ],
    }

# ── Routes ────────────────────────────────────────────────────────────────────
@router.post("/reconcile")
def reconcile_claims(body: ReconcileRequest):
    """
    Match an 837 (claims submitted) against an 835 (remittance received).
    Returns a reconciliation report.
    """
    try:
        result = _reconcile(body.parsed_837, body.parsed_835)
        return JSONResponse(content=result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Reconciliation failed: {e}")