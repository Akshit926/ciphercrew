"""
ClaimCraft EDI Parser — Main Entry Point
Accepts raw EDI string, auto-detects type, returns structured JSON
"""

import json
from .core import (
    sanitize,
    detect_delimiters,
    tokenize,
    detect_transaction_type,
    extract_envelope_meta,
)
from .parsers.parser_837 import parse_837
from .parsers.parser_835 import parse_835
from .parsers.parser_834 import parse_834


def parse(raw: str) -> dict:
    """
    Main entry point. Pass raw EDI string, get structured dict back.

    Returns:
    {
        "transaction_info": { type, sender_id, receiver_id, ... },
        "tree": { ... full parsed structure ... },
        "raw_segment_count": int,
        "delimiters": { element_sep, sub_element_sep, segment_terminator },
        "errors": [],
        "warnings": [],
    }
    """
    errors = []
    warnings = []

    # --- STEP 1: SANITIZE ---
    try:
        raw = sanitize(raw)
    except Exception as e:
        return _error_response(f"Sanitization failed: {e}")

    # --- STEP 2: DETECT DELIMITERS ---
    try:
        delimiters = detect_delimiters(raw)
    except ValueError as e:
        return _error_response(str(e))

    # --- STEP 3: TOKENIZE ---
    try:
        segments, tokenize_warnings = tokenize(raw, delimiters)
        warnings.extend(tokenize_warnings)
    except Exception as e:
        return _error_response(f"Tokenization failed: {e}")

    # --- STEP 4: DETECT TRANSACTION TYPE ---
    try:
        transaction_type = detect_transaction_type(segments)
    except ValueError as e:
        return _error_response(str(e))

    # --- STEP 5: EXTRACT ENVELOPE META ---
    meta = extract_envelope_meta(segments)
    transaction_info = {
        "type": transaction_type,
        **meta,
    }

    # --- STEP 6: PARSE BY TYPE ---
    try:
        if transaction_type in ("837P", "837I"):
            tree = parse_837(segments, transaction_type)
        elif transaction_type == "835":
            tree = parse_835(segments)
        elif transaction_type == "834":
            tree = parse_834(segments)
        else:
            return _error_response(f"Unsupported transaction type: {transaction_type}")

        # collect parser-level warnings
        if "warnings" in tree:
            warnings.extend(tree.pop("warnings"))

    except Exception as e:
        return _error_response(f"Parser failed: {e}")

    return {
        "transaction_info": transaction_info,
        "tree": tree,
        "raw_segment_count": len(segments),
        "delimiters": delimiters,
        "errors": errors,
        "warnings": warnings,
        "raw_edi": raw,
    }


def parse_file(filepath: str) -> dict:
    """Convenience: parse from file path."""
    with open(filepath, "r", encoding="utf-8-sig") as f:
        raw = f.read()
    return parse(raw)


def parse_to_json(raw: str, indent: int = 2) -> str:
    """Parse and return as JSON string."""
    result = parse(raw)
    return json.dumps(result, indent=indent)


def _error_response(message: str) -> dict:
    return {
        "transaction_info": {},
        "tree": {},
        "raw_segment_count": 0,
        "delimiters": {},
        "errors": [{"type": "PARSE_FAILURE", "detail": message}],
        "warnings": [],
        "raw_edi": "",
    }
