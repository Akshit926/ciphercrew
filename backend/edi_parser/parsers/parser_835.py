"""
835 Electronic Remittance Advice Parser
Parses CLP claim loops, CAS adjustments, SVC service lines, PLB adjustments
Per HIPAA 5010 X221A1 spec
"""

from ..core import (
    build_segment_dict,
    NM1_ENTITY_NAMES,
    CARC_CODES,
    CAS_GROUP_CODES,
    CLAIM_STATUS_CODES,
)


def parse_835(segments: list) -> dict:
    """
    Parse 835 remittance segments into full structure.
    Returns envelope, payer, payee, claim_loops, provider_adjustments.
    """
    idx = 0
    n = len(segments)

    envelope = {}
    payer = None
    payee = None
    claim_loops = []
    provider_adjustments = []
    trailer = {}
    warnings = []

    # summary totals
    total_billed = 0.0
    total_paid = 0.0
    total_claims = 0
    denied_claims = 0
    adjusted_claims = 0

    while idx < n:
        seg = segments[idx]
        sid = seg["id"]

        # ENVELOPE
        if sid in ("ISA", "GS", "ST"):
            envelope[sid] = build_segment_dict(seg)
            idx += 1

        elif sid == "BPR":
            envelope["BPR"] = build_segment_dict(seg)
            idx += 1

        elif sid == "TRN":
            envelope["TRN"] = build_segment_dict(seg)
            idx += 1

        elif sid == "DTM":
            if "production_date" not in envelope:
                envelope["production_date"] = _elem(seg, 1)
            envelope.setdefault("DTM", []).append(build_segment_dict(seg))
            idx += 1

        elif sid == "REF":
            envelope.setdefault("REF", []).append(build_segment_dict(seg))
            idx += 1

        # PAYER N1*PR
        elif sid == "N1" and _elem(seg, 0) == "PR":
            payer = _parse_n1_entity(seg)
            idx += 1
            idx = _consume_address(segments, idx, payer)

        # PAYEE N1*PE
        elif sid == "N1" and _elem(seg, 0) == "PE":
            payee = _parse_n1_entity(seg)
            idx += 1
            idx = _consume_address(segments, idx, payee)

        # also handle NM1 for payer/payee
        elif sid == "NM1" and _elem(seg, 0) in ("PR", "PE"):
            entity_code = _elem(seg, 0)
            entity = _parse_nm1_entity(seg)
            idx += 1
            if entity_code == "PR":
                payer = entity
            else:
                payee = entity

        # CLAIM LOOP
        elif sid == "LX":
            # LX is optional line counter in 835
            idx += 1

        elif sid == "CLP":
            clp_loop, idx = _parse_clp_loop(segments, idx, warnings)
            claim_loops.append(clp_loop)

            # accumulate totals
            total_claims += 1
            try:
                total_billed += float(clp_loop["billed_amount"])
                total_paid += float(clp_loop["paid_amount"])
            except (ValueError, TypeError):
                pass
            status = clp_loop["claim_status_code"]
            if status == "4":
                denied_claims += 1
            elif status in ("2", "3", "22"):
                adjusted_claims += 1

        # PROVIDER ADJUSTMENT
        elif sid == "PLB":
            plb = _parse_plb(seg)
            provider_adjustments.append(plb)
            idx += 1

        elif sid in ("SE", "GE", "IEA"):
            trailer[sid] = build_segment_dict(seg)
            idx += 1

        else:
            idx += 1

    return {
        "transaction_type": "835",
        "envelope": envelope,
        "payer": payer,
        "payee": payee,
        "claim_loops": claim_loops,
        "provider_adjustments": provider_adjustments,
        "trailer": trailer,
        "warnings": warnings,
        "summary": {
            "total_claims": total_claims,
            "total_billed": round(total_billed, 2),
            "total_paid": round(total_paid, 2),
            "total_difference": round(total_billed - total_paid, 2),
            "denied_claims": denied_claims,
            "adjusted_claims": adjusted_claims,
            "paid_in_full": total_claims - denied_claims - adjusted_claims,
        },
    }


def _parse_clp_loop(segments, idx, warnings) -> tuple:
    """Parse CLP loop with all CAS, NM1, SVC sub-segments."""
    seg = segments[idx]
    elems = seg["raw_elements"]

    claim_status_code = elems[1] if len(elems) > 1 else ""

    clp = {
        "claim_id": elems[0] if elems else "",
        "claim_status_code": claim_status_code,
        "claim_status": CLAIM_STATUS_CODES.get(claim_status_code, claim_status_code),
        "billed_amount": elems[2] if len(elems) > 2 else "0",
        "paid_amount": elems[3] if len(elems) > 3 else "0",
        "patient_responsibility": elems[4] if len(elems) > 4 else "0",
        "claim_filing_code": elems[5] if len(elems) > 5 else "",
        "payer_claim_control": elems[6] if len(elems) > 6 else "",
        "facility_type": elems[7] if len(elems) > 7 else "",
        "segment": build_segment_dict(seg),
        "adjustments": [],
        "patient": None,
        "insured": None,
        "service_lines": [],
        "dates": [],
        "amounts": [],
        "rendering_provider": None,
    }
    idx += 1
    n = len(segments)

    # validate: billed >= paid
    try:
        billed = float(clp["billed_amount"])
        paid = float(clp["paid_amount"])
        if paid > billed:
            warnings.append({
                "type": "OVERPAYMENT",
                "claim_id": clp["claim_id"],
                "detail": f"CLP paid amount {paid} exceeds billed amount {billed}",
                "segment": "CLP",
            })
    except (ValueError, TypeError):
        pass

    while idx < n:
        seg = segments[idx]
        sid = seg["id"]

        if sid in ("CLP", "PLB", "SE", "GE", "IEA"):
            break

        elif sid == "CAS":
            adj = _parse_cas(seg)
            clp["adjustments"].append(adj)
            idx += 1

        elif sid == "NM1":
            entity_code = _elem(seg, 0)
            entity = _parse_nm1_entity(seg)
            if entity_code == "QC":
                clp["patient"] = entity
            elif entity_code == "IL":
                clp["insured"] = entity
            elif entity_code in ("82", "1P"):
                clp["rendering_provider"] = entity
            idx += 1

        elif sid == "DTM":
            clp["dates"].append({
                "qualifier": _elem(seg, 0),
                "date": _elem(seg, 1),
                "segment": build_segment_dict(seg),
            })
            idx += 1

        elif sid == "AMT":
            clp["amounts"].append({
                "qualifier": _elem(seg, 0),
                "amount": _elem(seg, 1),
                "segment": build_segment_dict(seg),
            })
            idx += 1

        elif sid == "SVC":
            svc_line, idx = _parse_svc_loop(segments, idx)
            clp["service_lines"].append(svc_line)

        elif sid == "LX":
            idx += 1

        else:
            idx += 1

    return clp, idx


def _parse_svc_loop(segments, idx) -> tuple:
    """Parse SVC service line with CAS, AMT, DTM."""
    seg = segments[idx]
    elems = seg["raw_elements"]

    svc01 = elems[0] if elems else []
    if isinstance(svc01, list):
        proc_qualifier = svc01[0] if svc01 else ""
        proc_code = svc01[1] if len(svc01) > 1 else ""
    else:
        proc_qualifier = ""
        proc_code = svc01

    svc = {
        "procedure_qualifier": proc_qualifier,
        "procedure_code": proc_code,
        "billed_amount": elems[1] if len(elems) > 1 else "0",
        "paid_amount": elems[2] if len(elems) > 2 else "0",
        "revenue_code": elems[3] if len(elems) > 3 else "",
        "units": elems[4] if len(elems) > 4 else "",
        "segment": build_segment_dict(seg),
        "adjustments": [],
        "amounts": [],
        "dates": [],
    }
    idx += 1
    n = len(segments)

    while idx < n:
        seg = segments[idx]
        sid = seg["id"]

        if sid in ("SVC", "CLP", "PLB", "SE", "GE", "IEA"):
            break
        elif sid == "CAS":
            svc["adjustments"].append(_parse_cas(seg))
            idx += 1
        elif sid == "AMT":
            svc["amounts"].append({
                "qualifier": _elem(seg, 0),
                "amount": _elem(seg, 1),
            })
            idx += 1
        elif sid == "DTM":
            svc["dates"].append({
                "qualifier": _elem(seg, 0),
                "date": _elem(seg, 1),
            })
            idx += 1
        else:
            idx += 1

    return svc, idx


def _parse_cas(seg) -> dict:
    """Parse CAS adjustment segment — up to 6 reason code/amount pairs."""
    elems = seg["raw_elements"]
    group_code = elems[0] if elems else ""
    adjustments = []

    # CAS can have up to 6 reason/amount pairs starting at positions 1,2
    i = 1
    while i < len(elems) - 1:
        reason_code = elems[i] if i < len(elems) else ""
        amount = elems[i + 1] if (i + 1) < len(elems) else ""
        quantity = elems[i + 2] if (i + 2) < len(elems) else ""
        if reason_code:
            adjustments.append({
                "reason_code": reason_code,
                "reason_description": CARC_CODES.get(reason_code, f"Adjustment reason {reason_code}"),
                "amount": amount,
                "quantity": quantity,
            })
        i += 3

    return {
        "group_code": group_code,
        "group_description": CAS_GROUP_CODES.get(group_code, group_code),
        "adjustments": adjustments,
        "segment": build_segment_dict(seg),
    }


def _parse_plb(seg) -> dict:
    """Parse PLB provider level adjustment."""
    elems = seg["raw_elements"]
    plb02 = elems[1] if len(elems) > 1 else []
    if isinstance(plb02, list):
        reason = plb02[0] if plb02 else ""
        ref_id = plb02[1] if len(plb02) > 1 else ""
    else:
        reason = plb02
        ref_id = ""

    return {
        "provider_id": elems[0] if elems else "",
        "fiscal_period": elems[1] if len(elems) > 1 else "",
        "reason_code": reason,
        "reference_id": ref_id,
        "amount": elems[3] if len(elems) > 3 else "",
        "segment": build_segment_dict(seg),
    }


def _parse_n1_entity(seg) -> dict:
    """Parse N1 entity."""
    elems = seg["raw_elements"]
    entity_code = elems[0] if elems else ""
    return {
        "entity_code": entity_code,
        "entity_name": NM1_ENTITY_NAMES.get(entity_code, entity_code),
        "name": elems[1] if len(elems) > 1 else "",
        "id_qualifier": elems[2] if len(elems) > 2 else "",
        "id": elems[3] if len(elems) > 3 else "",
        "segment": build_segment_dict(seg),
        "address": None,
        "refs": [],
    }


def _parse_nm1_entity(seg) -> dict:
    """Parse NM1 entity for 835."""
    elems = seg["raw_elements"]
    entity_code = elems[0] if elems else ""
    return {
        "entity_code": entity_code,
        "entity_name": NM1_ENTITY_NAMES.get(entity_code, entity_code),
        "last_name_org": elems[2] if len(elems) > 2 else "",
        "first_name": elems[3] if len(elems) > 3 else "",
        "id_qualifier": elems[7] if len(elems) > 7 else "",
        "id": elems[8] if len(elems) > 8 else "",
        "segment": build_segment_dict(seg),
    }


def _consume_address(segments, idx, entity) -> int:
    """Consume N3, N4, REF after N1."""
    n = len(segments)
    while idx < n:
        seg = segments[idx]
        sid = seg["id"]
        if sid == "N3":
            entity["address"] = build_segment_dict(seg)
            idx += 1
        elif sid == "N4":
            entity["city_state_zip"] = build_segment_dict(seg)
            idx += 1
        elif sid == "REF":
            entity["refs"].append(build_segment_dict(seg))
            idx += 1
        elif sid == "PER":
            entity["contact"] = build_segment_dict(seg)
            idx += 1
        else:
            break
    return idx


def _elem(seg, pos) -> str:
    """Safe element extractor."""
    elems = seg.get("raw_elements", [])
    if pos < len(elems):
        val = elems[pos]
        return val[0] if isinstance(val, list) else str(val)
    return ""
