"""
ClaimCraft Validator — Main Entry Point
Combines static HIPAA 5010 rules + live API checks.

Usage:
    from edi_parser.validator import validate_static, validate_full
    from edi_parser.main import parse

    parsed = parse(raw_edi)

    # Fast — no API calls
    result = validate_static(parsed)

    # Full — static + NPI/ICD10/CPT live checks
    result = validate_full(parsed)
"""

from .validator_static import validate_static as _static
from .validator_live import validate_live


def validate_static(parsed: dict) -> dict:
    """
    Run only rule-based HIPAA 5010 checks.
    Zero API calls. Returns in milliseconds.
    """
    return _static(parsed)


def validate_full(parsed: dict) -> dict:
    """
    Run static checks + live API checks (NPI, ICD-10, CPT/HCPCS).
    Makes async HTTP calls to CMS NPPES, NLM ICD-10, NLM HCPCS APIs.
    Requires internet connection.
    """
    # Step 1: static
    result = _static(parsed)

    # Step 2: live
    live = validate_live(parsed)

    # Merge live errors/warnings into result
    live_errors = live.get("live_errors", [])
    live_warnings = live.get("live_warnings", [])

    result["errors"].extend(live_errors)
    result["warnings"].extend(live_warnings)
    result["error_count"] = len(result["errors"])
    result["warning_count"] = len(result["warnings"])
    result["validation_result"] = "VALID" if not result["errors"] else "INVALID"
    result["live_checks"] = live.get("live_checks", {})

    # Update summary live counts
    result["summary"]["live_api_errors"] = len(live_errors)
    result["summary"]["hcpcs_errors"] = sum(
        1 for e in live_errors if "CPT-LIVE" in e.get("rule_id", "")
    )
    result["summary"]["icd10_errors"] = sum(
        1 for e in live_errors if "ICD10-LIVE" in e.get("rule_id", "")
    ) + result["summary"].get("icd10_errors", 0)
    result["summary"]["npi_errors"] = sum(
        1 for e in result["errors"] if "NPI" in e.get("rule_id", "")
    )

    return result
