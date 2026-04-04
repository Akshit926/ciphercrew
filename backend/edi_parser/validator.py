

from .validator_static import validate_static as _static
from .validator_live import validate_live


def validate_static(parsed: dict) -> dict:
    return _static(parsed)


def validate_full(parsed: dict) -> dict:
    result = _static(parsed)
    live = validate_live(parsed)
    live_errors = live.get("live_errors", [])
    live_warnings = live.get("live_warnings", [])

    result["errors"].extend(live_errors)
    result["warnings"].extend(live_warnings)
    result["error_count"] = len(result["errors"])
    result["warning_count"] = len(result["warnings"])
    result["validation_result"] = "VALID" if not result["errors"] else "INVALID"
    result["live_checks"] = live.get("live_checks", {})
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
