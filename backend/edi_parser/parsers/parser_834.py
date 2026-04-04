"""
834 Benefit Enrollment and Maintenance Parser
Parses member loops, coverage, COB, dependents
Per HIPAA 5010 X220A1 spec
"""

from ..core import (
    build_segment_dict,
    NM1_ENTITY_NAMES,
    INS_MAINTENANCE_TYPES,
    INS_RELATIONSHIP_CODES,
)


def parse_834(segments: list) -> dict:
    """
    Parse 834 enrollment segments.
    Returns envelope, sponsor, payer, member_loops, summary.
    """
    idx = 0
    n = len(segments)

    envelope = {}
    sponsor = None
    payer = None
    tpa = None
    member_loops = []
    trailer = {}
    warnings = []

    seen_member_ids = set()

    while idx < n:
        seg = segments[idx]
        sid = seg["id"]

        if sid in ("ISA", "GS", "ST"):
            envelope[sid] = build_segment_dict(seg)
            idx += 1

        elif sid == "BGN":
            envelope["BGN"] = build_segment_dict(seg)
            idx += 1

        elif sid == "REF":
            envelope.setdefault("REF", []).append(build_segment_dict(seg))
            idx += 1

        elif sid == "DTP":
            envelope.setdefault("DTP", []).append(build_segment_dict(seg))
            idx += 1

        elif sid == "QTY":
            envelope.setdefault("QTY", []).append(build_segment_dict(seg))
            idx += 1

        # SPONSOR N1*P5
        elif sid == "N1" and _elem(seg, 0) == "P5":
            sponsor = _parse_n1_entity(seg)
            idx += 1
            idx = _consume_address(segments, idx, sponsor)

        # PAYER N1*IN
        elif sid == "N1" and _elem(seg, 0) == "IN":
            payer = _parse_n1_entity(seg)
            idx += 1
            idx = _consume_address(segments, idx, payer)

        # TPA N1*BO
        elif sid == "N1" and _elem(seg, 0) == "BO":
            tpa = _parse_n1_entity(seg)
            idx += 1

        # MEMBER LOOP starts with INS
        elif sid == "INS":
            member_loop, idx = _parse_member_loop(segments, idx, seen_member_ids, warnings)
            member_loops.append(member_loop)

        elif sid in ("SE", "GE", "IEA"):
            trailer[sid] = build_segment_dict(seg)
            idx += 1

        else:
            idx += 1

    # summary
    additions = sum(1 for m in member_loops if m["maintenance_type_code"] == "021")
    changes = sum(1 for m in member_loops if m["maintenance_type_code"] == "001")
    terminations = sum(1 for m in member_loops if m["maintenance_type_code"] == "024")
    reinstatements = sum(1 for m in member_loops if m["maintenance_type_code"] == "025")

    return {
        "transaction_type": "834",
        "envelope": envelope,
        "sponsor": sponsor,
        "payer": payer,
        "tpa": tpa,
        "member_loops": member_loops,
        "trailer": trailer,
        "warnings": warnings,
        "summary": {
            "total_members": len(member_loops),
            "additions": additions,
            "changes": changes,
            "terminations": terminations,
            "reinstatements": reinstatements,
            "other": len(member_loops) - additions - changes - terminations - reinstatements,
            "duplicate_ids_found": len(warnings),
        },
    }


def _parse_member_loop(segments, idx, seen_member_ids, warnings) -> tuple:
    """Parse INS loop for a single member."""
    seg = segments[idx]
    elems = seg["raw_elements"]

    subscriber_indicator = elems[0] if elems else ""
    relationship_code = elems[1] if len(elems) > 1 else ""
    maintenance_type_code = elems[2] if len(elems) > 2 else ""
    maintenance_reason_code = elems[3] if len(elems) > 3 else ""
    benefit_status_code = elems[4] if len(elems) > 4 else ""
    employment_status_code = elems[7] if len(elems) > 7 else ""
    student_status_code = elems[8] if len(elems) > 8 else ""

    member = {
        "subscriber_indicator": subscriber_indicator,
        "is_subscriber": subscriber_indicator == "Y",
        "relationship_code": relationship_code,
        "relationship": INS_RELATIONSHIP_CODES.get(relationship_code, relationship_code),
        "maintenance_type_code": maintenance_type_code,
        "maintenance_type": INS_MAINTENANCE_TYPES.get(maintenance_type_code, maintenance_type_code),
        "maintenance_reason_code": maintenance_reason_code,
        "benefit_status_code": benefit_status_code,
        "employment_status_code": employment_status_code,
        "student_status_code": student_status_code,
        "segment": build_segment_dict(seg),
        "member_id": None,
        "member_name": None,
        "address": None,
        "city_state_zip": None,
        "demographic": None,
        "employer": None,
        "language": None,
        "disability": None,
        "coverages": [],
        "cob": [],
        "refs": [],
        "dates": [],
        "extra_segments": [],
    }
    idx += 1
    n = len(segments)

    while idx < n:
        seg = segments[idx]
        sid = seg["id"]

        # next member starts new INS
        if sid == "INS":
            break

        elif sid in ("SE", "GE", "IEA"):
            break

        elif sid == "REF":
            ref_qualifier = _elem(seg, 0)
            ref_value = _elem(seg, 1)
            member["refs"].append({
                "qualifier": ref_qualifier,
                "value": ref_value,
                "segment": build_segment_dict(seg),
            })
            # subscriber group number
            if ref_qualifier in ("1L", "ZZ", "17"):
                member["member_id"] = ref_value

            # duplicate member check
            if ref_qualifier in ("0F", "1L") and ref_value:
                if ref_value in seen_member_ids:
                    warnings.append({
                        "type": "DUPLICATE_MEMBER_ID",
                        "member_id": ref_value,
                        "detail": f"Member ID {ref_value} appears more than once in this 834 file",
                        "segment": "REF",
                    })
                else:
                    seen_member_ids.add(ref_value)
            idx += 1

        elif sid == "DTP":
            member["dates"].append({
                "qualifier": _elem(seg, 0),
                "format": _elem(seg, 1),
                "date": _elem(seg, 2),
                "segment": build_segment_dict(seg),
            })
            idx += 1

        elif sid == "NM1":
            entity_code = _elem(seg, 0)
            entity = _parse_nm1_entity(seg)
            if entity_code == "IL":
                member["member_name"] = entity
                idx += 1
                # consume address and demographic
                while idx < n:
                    s = segments[idx]
                    ssid = s["id"]
                    if ssid == "N3":
                        member["address"] = build_segment_dict(s)
                        idx += 1
                    elif ssid == "N4":
                        member["city_state_zip"] = build_segment_dict(s)
                        idx += 1
                    elif ssid == "DMG":
                        member["demographic"] = build_segment_dict(s)
                        idx += 1
                    elif ssid == "PER":
                        member["contact"] = build_segment_dict(s)
                        idx += 1
                    else:
                        break
            elif entity_code == "36":
                member["employer"] = entity
                idx += 1
            elif entity_code in ("IN", "P5"):
                member["extra_segments"].append(build_segment_dict(seg))
                idx += 1
            else:
                member["extra_segments"].append(build_segment_dict(seg))
                idx += 1

        elif sid == "HD":
            coverage, idx = _parse_hd_loop(segments, idx)
            member["coverages"].append(coverage)

        elif sid == "COB":
            cob, idx = _parse_cob_loop(segments, idx)
            member["cob"].append(cob)

        elif sid == "DSB":
            member["disability"] = build_segment_dict(seg)
            idx += 1

        elif sid == "LUI":
            member["language"] = build_segment_dict(seg)
            idx += 1

        elif sid == "EC":
            member["extra_segments"].append(build_segment_dict(seg))
            idx += 1

        elif sid == "ICM":
            member["extra_segments"].append(build_segment_dict(seg))
            idx += 1

        else:
            idx += 1

    # validate: termination should have a termination date
    if maintenance_type_code == "024":
        has_term_date = any(d["qualifier"] in ("357", "336") for d in member["dates"])
        if not has_term_date:
            warnings.append({
                "type": "MISSING_TERMINATION_DATE",
                "member_id": member.get("member_id", "unknown"),
                "detail": "INS maintenance type 024 (termination) has no DTP*357 termination date",
                "segment": "INS",
                "element": "INS03",
            })

    # validate: addition should have effective date
    if maintenance_type_code == "021":
        has_eff_date = any(d["qualifier"] in ("356", "348") for d in member["dates"])
        if not has_eff_date:
            warnings.append({
                "type": "MISSING_EFFECTIVE_DATE",
                "member_id": member.get("member_id", "unknown"),
                "detail": "INS maintenance type 021 (addition) has no DTP*356 effective date",
                "segment": "INS",
                "element": "INS03",
            })

    return member, idx


def _parse_hd_loop(segments, idx) -> tuple:
    """Parse HD health coverage segment and sub-segments."""
    seg = segments[idx]
    elems = seg["raw_elements"]

    coverage = {
        "maintenance_type_code": elems[0] if elems else "",
        "maintenance_type": INS_MAINTENANCE_TYPES.get(elems[0] if elems else "", ""),
        "insurance_line_code": elems[2] if len(elems) > 2 else "",
        "plan_coverage_description": elems[3] if len(elems) > 3 else "",
        "coverage_level_code": elems[4] if len(elems) > 4 else "",
        "segment": build_segment_dict(seg),
        "dates": [],
        "refs": [],
        "amounts": [],
        "provider": None,
    }
    idx += 1
    n = len(segments)

    while idx < n:
        seg = segments[idx]
        sid = seg["id"]

        if sid in ("HD", "INS", "COB", "SE", "GE", "IEA"):
            break
        elif sid == "DTP":
            coverage["dates"].append({
                "qualifier": _elem(seg, 0),
                "format": _elem(seg, 1),
                "date": _elem(seg, 2),
                "segment": build_segment_dict(seg),
            })
            idx += 1
        elif sid == "REF":
            coverage["refs"].append(build_segment_dict(seg))
            idx += 1
        elif sid == "AMT":
            coverage["amounts"].append(build_segment_dict(seg))
            idx += 1
        elif sid == "NM1":
            coverage["provider"] = _parse_nm1_entity(seg)
            idx += 1
        else:
            idx += 1

    return coverage, idx


def _parse_cob_loop(segments, idx) -> tuple:
    """Parse COB coordination of benefits."""
    seg = segments[idx]
    elems = seg["raw_elements"]

    cob = {
        "payer_responsibility_code": elems[0] if elems else "",
        "reference_id": elems[1] if len(elems) > 1 else "",
        "cob_code": elems[2] if len(elems) > 2 else "",
        "segment": build_segment_dict(seg),
        "payer": None,
        "dates": [],
    }
    idx += 1
    n = len(segments)

    while idx < n:
        seg = segments[idx]
        sid = seg["id"]

        if sid in ("COB", "HD", "INS", "SE", "GE", "IEA"):
            break
        elif sid == "NM1" and _elem(seg, 0) == "IN":
            cob["payer"] = _parse_nm1_entity(seg)
            idx += 1
        elif sid == "DTP":
            cob["dates"].append({
                "qualifier": _elem(seg, 0),
                "date": _elem(seg, 2),
            })
            idx += 1
        else:
            idx += 1

    return cob, idx


def _parse_n1_entity(seg) -> dict:
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
        "city_state_zip": None,
        "refs": [],
    }


def _parse_nm1_entity(seg) -> dict:
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
    elems = seg.get("raw_elements", [])
    if pos < len(elems):
        val = elems[pos]
        return val[0] if isinstance(val, list) else str(val)
    return ""
