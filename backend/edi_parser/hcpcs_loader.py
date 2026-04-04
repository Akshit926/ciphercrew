"""
HCPCS Local Code Loader
Parses HCPC2026_APR_ANWEB.txt into a fast lookup dict.
Only Level II codes (A-Z prefix) are in this file.
CPT codes (99xxx, 8xxxx etc) are AMA-copyrighted and resolved via NLM API.
"""

import os
from functools import lru_cache

_HCPCS_DATA: dict = {}
_LOADED = False


def _load(filepath: str = None):
    global _HCPCS_DATA, _LOADED
    if _LOADED:
        return

    if filepath is None:
        here = os.path.dirname(os.path.abspath(__file__))
        filepath = os.path.join(here, "HCPC2026_APR_ANWEB.txt")

    if not os.path.exists(filepath):
        _LOADED = True
        return

    with open(filepath, "r", encoding="latin-1") as f:
        content = f.read()

    lines = content.split("\n")
    for line in lines:
        raw = line.rstrip("\r")
        if len(raw) < 8:
            continue
        hcpcs_code = raw[3:8].strip()
        if not hcpcs_code or len(hcpcs_code) != 5:
            continue
        long_desc = raw[8:88].strip()
        short_desc = raw[88:116].strip() if len(raw) > 116 else ""
        _HCPCS_DATA[hcpcs_code] = {
            "short_desc": short_desc,
            "long_desc": long_desc,
            "source": "HCPCS_LOCAL_2026",
        }

    _LOADED = True


from typing import Optional

def lookup(code: str) -> Optional[dict]:
    """
    Look up a HCPCS Level II code.
    Returns dict with short_desc, long_desc, source — or None if not found.
    """
    _load()
    return _HCPCS_DATA.get(code.upper().strip())


def is_valid_hcpcs(code: str) -> bool:
    """Check if code exists in HCPCS local file."""
    _load()
    return code.upper().strip() in _HCPCS_DATA


def is_level_ii(code: str) -> bool:
    """Level II codes start with A-Z (not purely numeric)."""
    if not code:
        return False
    return code[0].isalpha()


def is_cpt(code: str) -> bool:
    """CPT codes are 5-digit numeric (Level I). Not in local file."""
    return bool(code) and code.isdigit() and len(code) == 5


def total_codes() -> int:
    _load()
    return len(_HCPCS_DATA)
