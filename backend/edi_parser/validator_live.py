"""
ClaimCraft Live API Validator
Async checks against:
  - CMS NPPES NPI Registry
  - NLM ICD-10-CM API
  - NLM HCPCS/CPT API (for CPT codes not in local HCPCS file)
  - Local HCPCS 2026 file (Level II codes)
"""

import asyncio
import aiohttp
from typing import Optional
from .hcpcs_loader import lookup as hcpcs_lookup, is_level_ii, is_cpt


# ─────────────────────────────────────────────
# API ENDPOINTS
# ─────────────────────────────────────────────

NPPES_URL = "https://npiregistry.cms.hhs.gov/api/"
ICD10_URL = "https://clinicaltables.nlm.nih.gov/api/icd10cm/v3/search"
CPT_URL   = "https://clinicaltables.nlm.nih.gov/api/hcpcs/v3/search"

TIMEOUT = aiohttp.ClientTimeout(total=8)


# ─────────────────────────────────────────────
# NPI CHECK
# ─────────────────────────────────────────────

async def check_npi(session: aiohttp.ClientSession, npi: str,
                    expected_name: str = "") -> dict:
    """
    Verify NPI against CMS NPPES registry.
    Returns status, provider name, name_match, and source.
    """
    result = {
        "npi": npi,
        "expected_name": expected_name,
        "status": "UNKNOWN",
        "provider_name": None,
        "name_match": None,
        "source": "CMS_NPPES_API",
        "error": None,
    }
    try:
        params = {"version": "2.1", "number": npi}
        async with session.get(NPPES_URL, params=params, timeout=TIMEOUT) as resp:
            if resp.status != 200:
                result["status"] = "API_ERROR"
                result["error"] = f"HTTP {resp.status}"
                return result
            data = await resp.json()
            results = data.get("results", [])
            if not results:
                result["status"] = "NOT_FOUND"
                return result
            provider = results[0]
            basic = provider.get("basic", {})
            status = basic.get("status", "").upper()
            result["status"] = status if status else "ACTIVE"

            # Build provider name
            org_name = basic.get("organization_name", "")
            first = basic.get("first_name", "")
            last = basic.get("last_name", "")
            if org_name:
                full_name = org_name.strip()
            else:
                full_name = f"{last} {first}".strip()
            result["provider_name"] = full_name

            # Name match check
            if expected_name and full_name:
                expected_clean = expected_name.upper().strip()
                found_clean = full_name.upper().strip()
                # check if any significant word matches
                exp_words = set(expected_clean.split())
                found_words = set(found_clean.split())
                overlap = exp_words & found_words
                result["name_match"] = len(overlap) >= 1
            else:
                result["name_match"] = None

    except asyncio.TimeoutError:
        result["status"] = "TIMEOUT"
        result["error"] = "CMS NPPES API timed out after 8 seconds"
    except Exception as ex:
        result["status"] = "API_ERROR"
        result["error"] = str(ex)

    return result


# ─────────────────────────────────────────────
# ICD-10-CM CHECK
# ─────────────────────────────────────────────

async def check_icd10(session: aiohttp.ClientSession, code: str) -> dict:
    """
    Verify ICD-10-CM code against NLM API.
    """
    result = {
        "code": code,
        "description": None,
        "valid": False,
        "source": "NLM_ICD10_API",
        "error": None,
    }
    try:
        # Normalize: add dot if needed (J069 -> J06.9)
        clean = code.strip().upper()
        params = {
            "sf": "code",
            "terms": clean,
            "maxList": 5,
        }
        async with session.get(ICD10_URL, params=params, timeout=TIMEOUT) as resp:
            if resp.status != 200:
                result["error"] = f"HTTP {resp.status}"
                return result
            data = await resp.json()
            # Response: [total, codes_list, null, descriptions_list]
            if not data or len(data) < 4:
                return result
            codes_found = data[1] or []
            descs_found = data[3] or []

            # Exact match check (with and without dot)
            code_no_dot = clean.replace(".", "")
            for i, found_code in enumerate(codes_found):
                found_clean = found_code.strip().upper().replace(".", "")
                if found_clean == code_no_dot:
                    result["valid"] = True
                    if descs_found and i < len(descs_found):
                        desc = descs_found[i]
                        if isinstance(desc, list):
                            result["description"] = desc[1] if len(desc) > 1 else desc[0]
                        else:
                            result["description"] = desc
                    break

    except asyncio.TimeoutError:
        result["error"] = "NLM ICD-10 API timed out"
    except Exception as ex:
        result["error"] = str(ex)

    return result


# ─────────────────────────────────────────────
# CPT / HCPCS CHECK
# ─────────────────────────────────────────────

async def check_cpt_hcpcs(session: aiohttp.ClientSession, code: str) -> dict:
    """
    Check CPT/HCPCS code:
    - Level II codes: check local HCPCS 2026 file first
    - CPT (5-digit numeric): check NLM HCPCS API
    """
    result = {
        "code": code,
        "description": None,
        "valid": False,
        "source": None,
        "error": None,
    }
    clean = code.strip().upper()

    # Level II — check local file first
    if is_level_ii(clean):
        local = hcpcs_lookup(clean)
        if local:
            result["valid"] = True
            result["description"] = local.get("short_desc") or local.get("long_desc", "")
            result["source"] = "HCPCS_LOCAL_2026"
            return result
        else:
            # Not in local file — try NLM API
            result["source"] = "NLM_HCPCS_API"
            return await _check_via_nlm(session, clean, result)

    # CPT — always use NLM API (AMA copyright, not in local file)
    if is_cpt(clean):
        result["source"] = "NLM_HCPCS_API"
        return await _check_via_nlm(session, clean, result)

    # Unknown format
    result["error"] = f"Code '{code}' is not a recognised CPT or HCPCS format"
    result["source"] = "FORMAT_CHECK"
    return result


async def _check_via_nlm(session: aiohttp.ClientSession, code: str, result: dict) -> dict:
    """Query NLM HCPCS/CPT search API."""
    try:
        params = {
            "sf": "code",
            "terms": code,
            "maxList": 5,
        }
        async with session.get(CPT_URL, params=params, timeout=TIMEOUT) as resp:
            if resp.status != 200:
                result["error"] = f"HTTP {resp.status}"
                return result
            data = await resp.json()
            if not data or len(data) < 4:
                return result
            codes_found = data[1] or []
            descs_found = data[3] or []

            for i, found_code in enumerate(codes_found):
                if found_code.strip().upper() == code:
                    result["valid"] = True
                    if descs_found and i < len(descs_found):
                        desc = descs_found[i]
                        if isinstance(desc, list):
                            result["description"] = desc[1] if len(desc) > 1 else desc[0]
                        else:
                            result["description"] = str(desc)
                    break

    except asyncio.TimeoutError:
        result["error"] = "NLM HCPCS/CPT API timed out"
    except Exception as ex:
        result["error"] = str(ex)

    return result


# ─────────────────────────────────────────────
# EXTRACT ITEMS TO CHECK FROM PARSED TREE
# ─────────────────────────────────────────────

def _extract_npis(tree: dict, transaction_type: str) -> list[dict]:
    """Walk tree and collect all NPI values with context."""
    npis = []

    def add(npi, name, loop, segment, element):
        if npi and len(npi) == 10 and npi.isdigit():
            npis.append({"npi": npi, "name": name,
                         "loop": loop, "segment": segment, "element": element})

    if transaction_type in ("837P", "837I"):
        for bp in tree.get("loops", []):
            prov = bp.get("provider", {}) or {}
            add(prov.get("id", ""), prov.get("last_name_org", ""),
                "Loop 2000A", "NM1", "NM109")
            for sub in bp.get("subscriber_loops", []):
                for claim in sub.get("claims", []):
                    rp = claim.get("rendering_provider", {}) or {}
                    add(rp.get("id", ""), rp.get("last_name_org", ""),
                        "Loop 2310B", "NM1", "NM109")

    elif transaction_type == "835":
        for clp in tree.get("claim_loops", []):
            rp = clp.get("rendering_provider", {}) or {}
            add(rp.get("id", ""), rp.get("last_name_org", ""),
                "Loop 2100", "NM1", "NM109")

    return npis


def _extract_icd10_codes(tree: dict, transaction_type: str) -> list[dict]:
    """Collect all diagnosis codes from 837 claims."""
    codes = []
    if transaction_type not in ("837P", "837I"):
        return codes

    def add_from_claim(claim, loop):
        for diag in claim.get("diagnosis_codes", []):
            code = diag.get("code", "")
            if code:
                codes.append({"code": code, "loop": loop, "segment": "HI"})

    for bp in tree.get("loops", []):
        for sub in bp.get("subscriber_loops", []):
            for claim in sub.get("claims", []):
                add_from_claim(claim, f"Loop 2300 (Claim {claim.get('claim_id', '?')})")
            for pat in sub.get("patient_loops", []):
                for claim in pat.get("claims", []):
                    add_from_claim(claim, f"Loop 2300 (Claim {claim.get('claim_id', '?')})")
    return codes


def _extract_cpt_hcpcs_codes(tree: dict, transaction_type: str) -> list[dict]:
    """Collect all procedure codes from service lines."""
    codes = []

    def add(code, loop, segment):
        if code:
            codes.append({"code": code, "loop": loop, "segment": segment})

    if transaction_type in ("837P", "837I"):
        sv_seg = "SV1" if transaction_type == "837P" else "SV2"
        for bp in tree.get("loops", []):
            for sub in bp.get("subscriber_loops", []):
                for claim in sub.get("claims", []):
                    for sl in claim.get("service_lines", []):
                        add(sl.get("procedure", ""),
                            f"Loop 2400 (Line {sl.get('line_number', '?')})", sv_seg)
                for pat in sub.get("patient_loops", []):
                    for claim in pat.get("claims", []):
                        for sl in claim.get("service_lines", []):
                            add(sl.get("procedure", ""),
                                f"Loop 2400 (Line {sl.get('line_number', '?')})", sv_seg)

    elif transaction_type == "835":
        for clp in tree.get("claim_loops", []):
            for svc in clp.get("service_lines", []):
                add(svc.get("procedure_code", ""),
                    f"Loop 2110 (Claim {clp.get('claim_id', '?')})", "SVC")

    # Deduplicate by code
    seen = set()
    unique = []
    for item in codes:
        if item["code"] not in seen:
            seen.add(item["code"])
            unique.append(item)
    return unique


# ─────────────────────────────────────────────
# MAIN LIVE VALIDATE
# ─────────────────────────────────────────────

async def validate_live_async(parsed: dict) -> dict:
    """
    Run all live API checks asynchronously.
    Returns live_checks dict and any additional errors/warnings.
    """
    transaction_type = parsed.get("transaction_info", {}).get("type", "")
    tree = parsed.get("tree", {})

    live_errors = []
    live_warnings = []

    npi_items = _extract_npis(tree, transaction_type)
    icd10_items = _extract_icd10_codes(tree, transaction_type)
    cpt_items = _extract_cpt_hcpcs_codes(tree, transaction_type)

    npi_results = []
    icd10_results = []
    cpt_results = []

    async with aiohttp.ClientSession() as session:
        # NPI checks
        npi_tasks = [check_npi(session, item["npi"], item.get("name", ""))
                     for item in npi_items]
        if npi_tasks:
            npi_results = await asyncio.gather(*npi_tasks, return_exceptions=False)

        # ICD-10 checks
        icd10_tasks = [check_icd10(session, item["code"]) for item in icd10_items]
        if icd10_tasks:
            icd10_results = await asyncio.gather(*icd10_tasks, return_exceptions=False)

        # CPT/HCPCS checks
        cpt_tasks = [check_cpt_hcpcs(session, item["code"]) for item in cpt_items]
        if cpt_tasks:
            cpt_results = await asyncio.gather(*cpt_tasks, return_exceptions=False)

    # Build errors from live results
    for i, res in enumerate(npi_results):
        ctx = npi_items[i]
        if res["status"] == "NOT_FOUND":
            live_errors.append({
                "severity": "ERROR",
                "rule_id": "NPI-LIVE-001",
                "loop": ctx["loop"],
                "segment": ctx["segment"],
                "element": ctx["element"],
                "value_found": res["npi"],
                "message": f"NPI '{res['npi']}' was not found in the CMS NPPES registry. "
                           f"The provider may be inactive or the NPI may be incorrect.",
                "suggested_fix": None,
                "fix_type": "MANUAL",
                "source": "CMS_NPPES_API",
            })
        elif res["status"] not in ("ACTIVE", "UNKNOWN", "TIMEOUT", "API_ERROR"):
            live_errors.append({
                "severity": "ERROR",
                "rule_id": "NPI-LIVE-002",
                "loop": ctx["loop"],
                "segment": ctx["segment"],
                "element": ctx["element"],
                "value_found": res["npi"],
                "message": f"NPI '{res['npi']}' has status '{res['status']}' in CMS NPPES. "
                           f"Only ACTIVE providers can submit claims.",
                "suggested_fix": None,
                "fix_type": "MANUAL",
                "source": "CMS_NPPES_API",
            })
        elif res.get("name_match") is False:
            live_warnings.append({
                "severity": "WARNING",
                "rule_id": "NPI-LIVE-003",
                "loop": ctx["loop"],
                "segment": ctx["segment"],
                "element": ctx["element"],
                "value_found": res["npi"],
                "message": f"NPI '{res['npi']}' is valid but provider name mismatch. "
                           f"File has '{ctx.get('name', '')}', "
                           f"NPPES has '{res.get('provider_name', '')}'.",
                "suggested_fix": None,
                "fix_type": "MANUAL",
                "source": "CMS_NPPES_API",
            })

    for i, res in enumerate(icd10_results):
        ctx = icd10_items[i]
        if not res["valid"] and not res.get("error"):
            live_errors.append({
                "severity": "ERROR",
                "rule_id": "ICD10-LIVE-001",
                "loop": ctx["loop"],
                "segment": ctx["segment"],
                "element": "HI01",
                "value_found": res["code"],
                "message": f"ICD-10-CM code '{res['code']}' was not found in the NLM ICD-10-CM database. "
                           f"Verify the diagnosis code is valid for the date of service.",
                "suggested_fix": None,
                "fix_type": "MANUAL",
                "source": "NLM_ICD10_API",
            })

    for i, res in enumerate(cpt_results):
        ctx = cpt_items[i]
        if not res["valid"] and not res.get("error"):
            live_errors.append({
                "severity": "ERROR",
                "rule_id": "CPT-LIVE-001",
                "loop": ctx["loop"],
                "segment": ctx["segment"],
                "element": "SV101",
                "value_found": res["code"],
                "message": f"Procedure code '{res['code']}' was not found in the "
                           f"{'HCPCS 2026 local file' if res.get('source') == 'HCPCS_LOCAL_2026' else 'NLM HCPCS/CPT database'}. "
                           f"Verify this is a valid and active procedure code.",
                "suggested_fix": None,
                "fix_type": "MANUAL",
                "source": res.get("source", "UNKNOWN"),
            })

    return {
        "live_errors": live_errors,
        "live_warnings": live_warnings,
        "live_checks": {
            "npi_checks": npi_results,
            "icd10_checks": icd10_results,
            "cpt_hcpcs_checks": cpt_results,
        },
    }


def validate_live(parsed: dict) -> dict:
    """Sync wrapper for validate_live_async."""
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor() as pool:
                future = pool.submit(asyncio.run, validate_live_async(parsed))
                return future.result()
        else:
            return loop.run_until_complete(validate_live_async(parsed))
    except Exception as ex:
        return {
            "live_errors": [],
            "live_warnings": [],
            "live_checks": {"error": str(ex)},
        }
