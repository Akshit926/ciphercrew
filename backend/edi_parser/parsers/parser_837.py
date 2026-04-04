
from ..core import build_segment_dict
    
from ..codes import (
    NM1_ENTITY_NAMES,
    FACILITY_TYPE_NAMES,
)


def parse_837(segments: list, transaction_type: str):
    idx = 0
    n = len(segments)

    envelope = {}
    submitter = None
    receiver = None
    loops = []
    trailer = {}
    warnings = []

    seg_index = {seg["id"]: [] for seg in segments}
    for i, seg in enumerate(segments):
        seg_index[seg["id"]].append(i)

    while idx < n:
        seg = segments[idx]
        sid = seg["id"]

        if sid in ("ISA", "GS", "ST", "BPR"):
            if sid == "BPR" and transaction_type in ("837P", "837I"):
                warnings.append({
                    "type": "UNEXPECTED_SEGMENT",
                    "segment": "BPR",
                    "detail": "BPR segment found in 837 file. BPR belongs to 835 (remittance). Skipping."
                })
            else:
                envelope[sid] = build_segment_dict(seg)
            idx += 1

        elif sid == "NM1" and _elem(seg, 0) == "41" and submitter is None:
            submitter = _parse_nm1_entity(seg)
            idx += 1
            while idx < n and segments[idx]["id"] == "PER":
                submitter["contact"] = build_segment_dict(segments[idx])
                idx += 1
        elif sid == "NM1" and _elem(seg, 0) == "40" and receiver is None:
            receiver = _parse_nm1_entity(seg)
            idx += 1
        elif sid == "HL" and _elem(seg, 2) == "20":
            loop, idx = _parse_billing_provider_loop(segments, idx, transaction_type, warnings)
            loops.append(loop)

        elif sid in ("SE", "GE", "IEA"):
            trailer[sid] = build_segment_dict(seg)
            idx += 1

        else:
            idx += 1

    return {
        "transaction_type": transaction_type,
        "envelope": envelope,
        "submitter": submitter,
        "receiver": receiver,
        "loops": loops,
        "trailer": trailer,
        "warnings": warnings,
    }


def _parse_billing_provider_loop(segments, idx, transaction_type, warnings):
    seg = segments[idx]
    loop = {
        "hl_id": _elem(seg, 0),
        "hl_parent": _elem(seg, 1),
        "hl_level": "20",
        "hl_level_name": "Billing Provider",
        "has_child": _elem(seg, 3) == "1",
        "segment": build_segment_dict(seg),
        "provider": None,
        "pay_to_provider": None,
        "subscriber_loops": [],
    }
    idx += 1
    n = len(segments)

    while idx < n:
        seg = segments[idx]
        sid = seg["id"]

        if sid == "HL":
            lvl = _elem(seg, 2)
            if lvl == "22":
                sub_loop, idx = _parse_subscriber_loop(segments, idx, transaction_type, warnings)
                loop["subscriber_loops"].append(sub_loop)
            elif lvl == "20":
                break
            else:
                idx += 1

        elif sid == "NM1" and _elem(seg, 0) == "85":
            loop["provider"] = _parse_nm1_entity(seg)
            idx += 1
            idx = _consume_provider_detail(segments, idx, loop["provider"])

        elif sid == "NM1" and _elem(seg, 0) == "87":
            loop["pay_to_provider"] = _parse_nm1_entity(seg)
            idx += 1
            idx = _consume_provider_detail(segments, idx, loop["pay_to_provider"])

        elif sid in ("SE", "GE", "IEA"):
            break

        else:
            idx += 1

    return loop, idx


def _parse_subscriber_loop(segments, idx, transaction_type, warnings):
    seg = segments[idx]
    has_child = _elem(seg, 3) == "1"
    loop = {
        "hl_id": _elem(seg, 0),
        "hl_parent": _elem(seg, 1),
        "hl_level": "22",
        "hl_level_name": "Subscriber",
        "has_child": has_child,
        "segment": build_segment_dict(seg),
        "sbr": None,
        "subscriber": None,
        "payer": None,
        "claims": [],
        "patient_loops": [],
    }
    idx += 1
    n = len(segments)

    while idx < n:
        seg = segments[idx]
        sid = seg["id"]

        if sid == "HL":
            lvl = _elem(seg, 2)
            if lvl in ("23", "PT"):
                pat_loop, idx = _parse_patient_loop(segments, idx, transaction_type, warnings)
                loop["patient_loops"].append(pat_loop)
            elif lvl in ("20", "22"):
                break
            else:
                idx += 1

        elif sid == "SBR":
            loop["sbr"] = build_segment_dict(seg)
            idx += 1

        elif sid == "NM1" and _elem(seg, 0) == "IL":
            loop["subscriber"] = _parse_nm1_entity(seg)
            idx += 1
            idx = _consume_person_detail(segments, idx, loop["subscriber"])

        elif sid == "NM1" and _elem(seg, 0) == "PR":
            loop["payer"] = _parse_nm1_entity(seg)
            idx += 1

        elif sid == "CLM":
            claim, idx = _parse_claim(segments, idx, transaction_type, warnings)
            loop["claims"].append(claim)

        elif sid in ("SE", "GE", "IEA"):
            break

        else:
            idx += 1

    return loop, idx


def _parse_patient_loop(segments, idx, transaction_type, warnings):
    seg = segments[idx]
    loop = {
        "hl_id": _elem(seg, 0),
        "hl_parent": _elem(seg, 1),
        "hl_level": "23",
        "hl_level_name": "Patient",
        "segment": build_segment_dict(seg),
        "pat": None,
        "patient": None,
        "claims": [],
    }
    idx += 1
    n = len(segments)

    while idx < n:
        seg = segments[idx]
        sid = seg["id"]

        if sid == "HL":
            break

        elif sid == "PAT":
            loop["pat"] = build_segment_dict(seg)
            idx += 1

        elif sid == "NM1" and _elem(seg, 0) == "QC":
            loop["patient"] = _parse_nm1_entity(seg)
            idx += 1
            idx = _consume_person_detail(segments, idx, loop["patient"])

        elif sid == "CLM":
            claim, idx = _parse_claim(segments, idx, transaction_type, warnings)
            loop["claims"].append(claim)

        elif sid in ("SE", "GE", "IEA"):
            break

        else:
            idx += 1

    return loop, idx


def _parse_claim(segments, idx, transaction_type, warnings):
    seg = segments[idx]
    elems = seg["raw_elements"]

    clm05 = elems[4] if len(elems) > 4 else []
    if isinstance(clm05, list):
        facility_type = clm05[0] if len(clm05) > 0 else ""
        care_setting = clm05[1] if len(clm05) > 1 else ""
        claim_frequency = clm05[2] if len(clm05) > 2 else ""
    else:
        facility_type = clm05
        care_setting = ""
        claim_frequency = ""

    claim = {
        "claim_id": elems[0] if elems else "",
        "total_charge": elems[1] if len(elems) > 1 else "",
        "facility_type": facility_type,
        "facility_type_name": FACILITY_TYPE_NAMES.get(facility_type, facility_type),
        "care_setting": care_setting,
        "claim_frequency": claim_frequency,
        "assignment": elems[6] if len(elems) > 6 else "",
        "segment": build_segment_dict(seg),
        "diagnosis_codes": [],
        "service_lines": [],
        "dates": [],
        "rendering_provider": None,
        "referring_provider": None,
        "supervising_provider": None,
        "service_facility": None,
        "extra_segments": [],
    }
    idx += 1
    n = len(segments)

    while idx < n:
        seg = segments[idx]
        sid = seg["id"]

        if sid in ("CLM", "HL", "SE", "GE", "IEA"):
            break

        elif sid == "DTP":
            claim["dates"].append(_parse_dtp(seg))
            idx += 1

        elif sid == "HI":
            claim["diagnosis_codes"].extend(_parse_hi(seg))
            idx += 1

        elif sid == "NM1":
            entity_code = _elem(seg, 0)
            entity = _parse_nm1_entity(seg)
            idx += 1
            if entity_code == "82":
                claim["rendering_provider"] = entity
                idx = _consume_provider_detail(segments, idx, entity)
            elif entity_code == "77":
                claim["service_facility"] = entity
                idx = _consume_provider_detail(segments, idx, entity)
            elif entity_code in ("DN", "P3", "TT"):
                claim["referring_provider"] = entity
            elif entity_code == "DQ":
                claim["supervising_provider"] = entity

        elif sid == "LX":
            if transaction_type == "837I":
                svc_line, idx = _parse_sv2_line(segments, idx)
            else:
                svc_line, idx = _parse_sv1_line(segments, idx)
            claim["service_lines"].append(svc_line)

        elif sid == "PRV":
            claim["extra_segments"].append(build_segment_dict(seg))
            idx += 1

        elif sid == "REF":
            claim["extra_segments"].append(build_segment_dict(seg))
            idx += 1

        elif sid == "AMT":
            claim["extra_segments"].append(build_segment_dict(seg))
            idx += 1

        elif sid == "CR1":
            claim["extra_segments"].append(build_segment_dict(seg))
            idx += 1

        else:
            idx += 1

    try:
        total = float(claim["total_charge"])
        line_sum = sum(float(sl["charge"]) * float(sl.get("unit_count", 1)) for sl in claim["service_lines"])

        line_charge_sum = sum(float(sl["charge"]) for sl in claim["service_lines"])
        if abs(total - line_charge_sum) > 0.01 and line_charge_sum > 0:
            warnings.append({
                "type": "CHARGE_MISMATCH",
                "claim_id": claim["claim_id"],
                "detail": f"CLM02 total charge {total} does not match sum of SV1/SV2 line charges {line_charge_sum:.2f}",
                "segment": "CLM",
                "element": "CLM02",
                "suggested_fix": str(line_charge_sum),
            })
    except (ValueError, TypeError):
        pass

    return claim, idx


def _parse_sv1_line(segments, idx):
    lx_seg = segments[idx]
    line_number = _elem(lx_seg, 0)
    idx += 1
    n = len(segments)

    line = {
        "line_number": line_number,
        "procedure": "",
        "procedure_qualifier": "",
        "charge": "",
        "units": "",
        "unit_count": "",
        "dates": [],
        "segment": build_segment_dict(lx_seg),
        "sv_segment": None,
    }

    while idx < n:
        seg = segments[idx]
        sid = seg["id"]

        if sid == "LX" or sid in ("CLM", "HL", "SE", "GE", "IEA"):
            break

        elif sid == "SV1":
            sv1 = build_segment_dict(seg)
            line["sv_segment"] = sv1
            elems = seg["raw_elements"]
            sv101 = elems[0] if elems else []
            if isinstance(sv101, list):
                line["procedure_qualifier"] = sv101[0] if sv101 else ""
                line["procedure"] = sv101[1] if len(sv101) > 1 else ""
            else:
                line["procedure"] = sv101
            line["charge"] = elems[1] if len(elems) > 1 else ""
            line["units"] = elems[2] if len(elems) > 2 else ""
            line["unit_count"] = elems[3] if len(elems) > 3 else ""
            idx += 1

        elif sid == "DTP":
            line["dates"].append(_parse_dtp(seg))
            idx += 1

        else:
            idx += 1

    return line, idx


def _parse_sv2_line(segments, idx):
    lx_seg = segments[idx]
    line_number = _elem(lx_seg, 0)
    idx += 1
    n = len(segments)

    line = {
        "line_number": line_number,
        "revenue_code": "",
        "procedure": "",
        "procedure_qualifier": "",
        "charge": "",
        "units": "",
        "unit_count": "",
        "dates": [],
        "segment": build_segment_dict(lx_seg),
        "sv_segment": None,
    }

    while idx < n:
        seg = segments[idx]
        sid = seg["id"]

        if sid == "LX" or sid in ("CLM", "HL", "SE", "GE", "IEA"):
            break

        elif sid == "SV2":
            sv2 = build_segment_dict(seg)
            line["sv_segment"] = sv2
            elems = seg["raw_elements"]
            line["revenue_code"] = elems[0] if elems else ""
            sv202 = elems[1] if len(elems) > 1 else []
            if isinstance(sv202, list):
                line["procedure_qualifier"] = sv202[0] if sv202 else ""
                line["procedure"] = sv202[1] if len(sv202) > 1 else ""
            else:
                line["procedure"] = sv202
            line["charge"] = elems[2] if len(elems) > 2 else ""
            line["units"] = elems[3] if len(elems) > 3 else ""
            line["unit_count"] = elems[4] if len(elems) > 4 else ""
            idx += 1

        elif sid == "DTP":
            line["dates"].append(_parse_dtp(seg))
            idx += 1

        else:
            idx += 1

    return line, idx


def _parse_nm1_entity(seg):
    elems = seg["raw_elements"]
    entity_code = elems[0] if elems else ""
    return {
        "entity_code": entity_code,
        "entity_name": NM1_ENTITY_NAMES.get(entity_code, entity_code),
        "type": elems[1] if len(elems) > 1 else "",
        "last_name_org": elems[2] if len(elems) > 2 else "",
        "first_name": elems[3] if len(elems) > 3 else "",
        "id_qualifier": elems[7] if len(elems) > 7 else "",
        "id": elems[8] if len(elems) > 8 else "",
        "segment": build_segment_dict(seg),
        "address": None,
        "city_state_zip": None,
        "refs": [],
        "demographic": None,
    }


def _consume_provider_detail(segments, idx, entity):
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


def _consume_person_detail(segments, idx, entity):
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
        elif sid == "DMG":
            entity["demographic"] = build_segment_dict(seg)
            idx += 1
        elif sid == "REF":
            entity["refs"].append(build_segment_dict(seg))
            idx += 1
        else:
            break
    return idx


def _parse_dtp(seg):
    elems = seg["raw_elements"]
    return {
        "qualifier": elems[0] if elems else "",
        "format": elems[1] if len(elems) > 1 else "",
        "date": elems[2] if len(elems) > 2 else "",
        "segment": build_segment_dict(seg),
    }


def _parse_hi(seg):
    codes = []
    for val in seg["raw_elements"]:
        if isinstance(val, list) and len(val) >= 2:
            codes.append({"qualifier": val[0], "code": val[1]})
        elif isinstance(val, str) and val:
            codes.append({"qualifier": "", "code": val})
    return codes


def _elem(seg, pos):
    elems = seg.get("raw_elements", [])
    if pos < len(elems):
        val = elems[pos]
        return val[0] if isinstance(val, list) else str(val)
    return ""