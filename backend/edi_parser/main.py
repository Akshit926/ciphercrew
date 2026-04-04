import json
from .core import (
    sanitize,
    detect_delimiters,
    tokenize,
    detect_transaction_type,
    extract_envelope_meta,
)
from .parsers.parser_837 import parse_837
# from .parsers.parser_835 import parse_835
# from .parsers.parser_834 import parse_834


def parse(raw: str) -> dict:
    errors = []
    warnings = []

    try:
        raw = sanitize(raw)
    except Exception as e:
        return _error_response(f"Sanitization failed: {e}")

    try:
        delimiters = detect_delimiters(raw)
    except ValueError as e:
        return _error_response(str(e))

    try:
        segments, tokenize_warnings = tokenize(raw, delimiters)
        warnings.extend(tokenize_warnings)
    except Exception as e:
        return _error_response(f"Tokenization failed: {e}")

    try:
        transaction_type = detect_transaction_type(segments)
    except ValueError as e:
        return _error_response(str(e))

    meta = extract_envelope_meta(segments)
    transaction_info = {
        "type": transaction_type,
        **meta,
    }

    try:
        if transaction_type in ("837P", "837I"):
            tree = parse_837(segments, transaction_type)
        # elif transaction_type == "835":
        #     tree = parse_835(segments)
        # elif transaction_type == "834":
        #     tree = parse_834(segments)
        else:
            return _error_response(f"Unsupported transaction type: {transaction_type}")
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
    }


def parse_file(filepath: str) -> dict:
    with open(filepath, "r", encoding="utf-8-sig") as f:
        raw = f.read()
    return parse(raw)





def parse_to_json(raw, indent= 2):
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
    }
