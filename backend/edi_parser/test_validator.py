"""
ClaimCraft Validator Test Suite
Tests static and live validation against:
  - Valid 837P (should pass clean)
  - Malformed 837P (5+ deliberate errors)
  - Valid 835
  - Valid 834
  - Malformed 834 (deliberate errors)
Run: python3 -m edi_parser.test_validator
"""

import sys
import os
import json

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from edi_parser.main import parse
from edi_parser.validator import validate_static, validate_full


# ─────────────────────────────────────────────
# TEST FILES
# ─────────────────────────────────────────────

# VALID 837P — should produce 0 errors
VALID_837P = (
    "ISA*00*          *00*          *ZZ*SENDER         *ZZ*RECEIVER       "
    "*260317*1200*^*00501*000000001*0*P*:~"
    "GS*HC*SENDERID*RECEIVERID*20260317*1200*1*X*005010X222A1~"
    "ST*837*0001*005010X222A1~"
    "NM1*41*2*ACME BILLING*****46*123456789~"
    "PER*IC*JANE DOE*TE*5551234567~"
    "NM1*40*2*BLUE CROSS*****46*987654321~"
    "HL*1**20*1~"
    "NM1*85*2*CITY MEDICAL CLINIC*****XX*1234567897~"  # valid Luhn NPI
    "N3*100 MAIN STREET~"
    "N4*CHICAGO*IL*60601~"
    "REF*EI*111223333~"
    "HL*2*1*22*0~"
    "SBR*P*18*******MC~"
    "NM1*IL*1*PATIENT*JOHN****MI*ABC123456~"
    "N3*200 SAMPLE ROAD~"
    "N4*CHICAGO*IL*60602~"
    "DMG*D8*19900101*M~"
    "NM1*PR*2*BLUE CROSS BLUE SHIELD*****PI*987654321~"
    "CLM*CLAIM001*100.00***11:B:1*Y*A*Y*I~"
    "DTP*431*D8*20260310~"
    "HI*ABK:J069~"
    "NM1*82*1*SMITH*ROBERT****XX*1234567897~"
    "PRV*PE*PXC*207Q00000X~"
    "LX*1~"
    "SV1*HC:99213*75.00*UN*1***1~"
    "DTP*472*D8*20260310~"
    "LX*2~"
    "SV1*HC:85025*25.00*UN*1***1~"
    "DTP*472*D8*20260310~"
    "SE*28*0001~"
    "GE*1*1~"
    "IEA*1*000000001~"
)

# MALFORMED 837P — 8 deliberate errors:
# 1. NM108 = 'ZZ' (invalid qualifier for billing provider — should be XX)
# 2. NPI = '1234567890' (fails Luhn check)
# 3. CLM05-1 = '3' (invalid Place of Service code)
# 4. CLM05-2 = 'Z' (invalid care setting)
# 5. HI qualifier = 'XX' (invalid diagnosis qualifier)
# 6. ICD-10 code = 'ZZZ99' (invalid format)
# 7. CLM02 = 200.00 but lines sum to 100.00 (charge mismatch)
# 8. SV1 procedure = 'XXXXX' (invalid format)
# 9. Service date in the past year 1995 (suspicious date)
MALFORMED_837P = (
    "ISA*00*          *00*          *ZZ*SENDER         *ZZ*RECEIVER       "
    "*260317*1200*^*00501*000000001*0*P*:~"
    "GS*HC*SENDERID*RECEIVERID*20260317*1200*1*X*005010X222A1~"
    "ST*837*0001*005010X222A1~"
    "NM1*41*2*ACME BILLING*****46*123456789~"
    "NM1*40*2*BLUE CROSS*****46*987654321~"
    "HL*1**20*1~"
    "NM1*85*2*CITY MEDICAL CLINIC*****ZZ*1234567890~"  # ERROR 1: NM108=ZZ, ERROR 2: NPI fails Luhn
    "N3*100 MAIN STREET~"
    "N4*CHICAGO*IL*60601~"
    "HL*2*1*22*0~"
    "SBR*P*18*******MC~"
    "NM1*IL*1*PATIENT*JOHN****MI*ABC123456~"
    "DMG*D8*19900101*M~"
    "NM1*PR*2*BLUE CROSS BLUE SHIELD*****PI*987654321~"
    "CLM*CLAIM001*200.00***3:Z:1*Y*A*Y*I~"  # ERROR 3: CLM05-1=3, ERROR 4: CLM05-2=Z, ERROR 7: charge=200
    "DTP*431*D8*20260310~"
    "HI*XX:ZZZ99~"                           # ERROR 5: qualifier=XX, ERROR 6: code=ZZZ99
    "NM1*82*1*SMITH*ROBERT****XX*1234567890~"  # ERROR 2b: NPI fails Luhn (rendering)
    "LX*1~"
    "SV1*HC:XXXXX*75.00*UN*1***1~"           # ERROR 8: invalid procedure code
    "DTP*472*D8*19950310~"                   # ERROR 9: suspicious date 1995
    "LX*2~"
    "SV1*HC:85025*25.00*UN*1***1~"
    "DTP*472*D8*20260310~"
    "SE*23*0001~"
    "GE*1*1~"
    "IEA*1*000000001~"
)

# VALID 835
VALID_835 = (
    "ISA*00*          *00*          *ZZ*PAYER          *ZZ*PROVIDER       "
    "*260317*1300*^*00501*000000003*0*P*:~"
    "GS*HP*PAYERID*PROVIDERID*20260317*1300*1*X*005010X221A1~"
    "ST*835*0001*005010X221A1~"
    "BPR*I*75.00*C*ACH*CCP*01*111222333*DA*987654321*9876543210**01*444555666*DA*123123123*20260317~"
    "TRN*1*REMIT20260317001*9876543210~"
    "DTM*405*20260317~"
    "N1*PR*BLUE CROSS BLUE SHIELD*XV*987654321~"
    "N3*100 INSURANCE WAY~"
    "N4*CHICAGO*IL*60601~"
    "N1*PE*CITY MEDICAL CLINIC*XX*1234567890~"
    "CLP*CLAIM001*1*100.00*75.00*25.00*MC*CLAIMREF001*11~"
    "NM1*QC*1*PATIENT*JOHN****MI*ABC123456~"
    "CAS*CO*45*25.00~"
    "AMT*B6*75.00~"
    "SVC*HC:99213*75.00*75.00**1~"
    "DTM*472*20260310~"
    "SE*16*0001~"
    "GE*1*1~"
    "IEA*1*000000003~"
)

# VALID 834
VALID_834 = (
    "ISA*00*          *00*          *ZZ*EMPLOYER       *ZZ*INSURER        "
    "*260317*0900*^*00501*000000004*0*P*:~"
    "GS*BE*EMPID*INSURERID*20260317*0900*1*X*005010X220A1~"
    "ST*834*0001*005010X220A1~"
    "BGN*00*ENROLL20260317*20260317*0900****2~"
    "REF*38*GROUPNUM001~"
    "DTP*356*D8*20260101~"
    "N1*P5*ACME CORPORATION*FI*999887777~"
    "N1*IN*BLUE CROSS BLUE SHIELD*XV*987654321~"
    "INS*Y*18*021*XN*A*E**FT~"
    "REF*0F*EMP001~"
    "REF*1L*GROUPNUM001~"
    "DTP*356*D8*20260101~"
    "DTP*357*D8*20261231~"
    "NM1*IL*1*SHARMA*AMIT****34*987654321~"
    "N3*400 TECH PARK~"
    "N4*CHICAGO*IL*60601~"
    "DMG*D8*19880220*M~"
    "HD*021**HLT*BLUEMED001*EMP~"
    "DTP*348*D8*20260101~"
    "SE*20*0001~"
    "GE*1*1~"
    "IEA*1*000000004~"
)

# MALFORMED 834 — deliberate errors:
# 1. BGN01 = '99' (invalid purpose code)
# 2. INS03 = '099' (invalid maintenance type)
# 3. INS02 = '99' (invalid relationship code)
# 4. Duplicate member ID EMP001
# 5. Termination record with no DTP*357
# 6. Effective date after termination date
MALFORMED_834 = (
    "ISA*00*          *00*          *ZZ*EMPLOYER       *ZZ*INSURER        "
    "*260317*0900*^*00501*000000004*0*P*:~"
    "GS*BE*EMPID*INSURERID*20260317*0900*1*X*005010X220A1~"
    "ST*834*0001*005010X220A1~"
    "BGN*99*ENROLL20260317*20260317*0900****2~"  # ERROR 1: invalid BGN01
    "N1*P5*ACME CORPORATION*FI*999887777~"
    "N1*IN*BLUE CROSS BLUE SHIELD*XV*987654321~"
    # Member 1 — invalid maintenance type and relationship
    "INS*Y*99*099*XN*A*E**FT~"                 # ERROR 2: INS03=099, ERROR 3: INS02=99
    "REF*0F*EMP001~"
    "DTP*356*D8*20260101~"
    "DTP*357*D8*20261231~"
    "NM1*IL*1*SHARMA*AMIT****34*987654321~"
    "DMG*D8*19880220*M~"
    "HD*021**HLT*BLUEMED001*EMP~"
    # Member 2 — duplicate member ID
    "INS*Y*18*021*XN*A*E**FT~"
    "REF*0F*EMP001~"                           # ERROR 4: duplicate member ID
    "DTP*356*D8*20260201~"
    "NM1*IL*1*PATEL*RAJ****34*111222333~"
    "DMG*D8*19920505*M~"
    # Member 3 — termination with no end date
    "INS*N*19*024*XN*T*E**FT~"               # ERROR 5: termination with no DTP*357
    "REF*0F*EMP002~"
    "NM1*IL*1*JONES*MARY****34*444555666~"
    "DMG*D8*19850310*F~"
    # Member 4 — effective date after termination date
    "INS*Y*18*001*XN*A*E**FT~"
    "REF*0F*EMP003~"
    "DTP*356*D8*20261231~"                     # ERROR 6: effective AFTER termination
    "DTP*357*D8*20260101~"
    "NM1*IL*1*BROWN*TOM****34*777888999~"
    "DMG*D8*19780101*M~"
    "SE*35*0001~"
    "GE*1*1~"
    "IEA*1*000000004~"
)


# ─────────────────────────────────────────────
# TEST RUNNER
# ─────────────────────────────────────────────

def print_result(label: str, result: dict, show_errors: bool = True):
    print(f"\n{'='*60}")
    print(f"  {label}")
    print(f"{'='*60}")
    print(f"  Transaction type : {result['transaction_type']}")
    print(f"  Result           : {result['validation_result']}")
    print(f"  Errors           : {result['error_count']}")
    print(f"  Warnings         : {result['warning_count']}")
    print(f"  Summary          : {result['summary']}")

    if show_errors and result["errors"]:
        print(f"\n  ERRORS:")
        for e in result["errors"]:
            print(f"    [{e['severity']}] {e['rule_id']} | {e['loop']} | "
                  f"{e['segment']}.{e['element']} = '{e['value_found']}'")
            print(f"           {e['message']}")
            if e.get("suggested_fix"):
                print(f"           Fix: {e['suggested_fix']}")

    if show_errors and result["warnings"]:
        print(f"\n  WARNINGS:")
        for w in result["warnings"]:
            print(f"    [{w['severity']}] {w['rule_id']} | {w['loop']} | "
                  f"{w['segment']}.{w['element']} = '{w['value_found']}'")
            print(f"           {w['message']}")
            if w.get("suggested_fix"):
                print(f"           Fix: {w['suggested_fix']}")


def run_static_tests():
    print("\n" + "█"*60)
    print("  STATIC VALIDATION TESTS (no API calls)")
    print("█"*60)

    # Test 1: Valid 837P
    parsed = parse(VALID_837P)
    result = validate_static(parsed)
    print_result("VALID 837P", result)
    assert result["validation_result"] == "VALID", \
        f"Expected VALID, got {result['validation_result']} — errors: {result['errors']}"
    print("  ✓ PASS")

    # Test 2: Malformed 837P
    parsed = parse(MALFORMED_837P)
    result = validate_static(parsed)
    print_result("MALFORMED 837P (8 deliberate errors)", result)
    assert result["validation_result"] == "INVALID", "Expected INVALID"
    assert result["error_count"] >= 5, \
        f"Expected at least 5 errors, got {result['error_count']}"
    print(f"  ✓ PASS — caught {result['error_count']} errors, {result['warning_count']} warnings")

    # Test 3: Valid 835
    parsed = parse(VALID_835)
    result = validate_static(parsed)
    print_result("VALID 835", result)
    assert result["validation_result"] == "VALID", \
        f"Expected VALID, got {result['validation_result']} — errors: {result['errors']}"
    print("  ✓ PASS")

    # Test 4: Valid 834
    parsed = parse(VALID_834)
    result = validate_static(parsed)
    print_result("VALID 834", result)
    assert result["validation_result"] == "VALID", \
        f"Expected VALID, got {result['validation_result']} — errors: {result['errors']}"
    print("  ✓ PASS")

    # Test 5: Malformed 834
    parsed = parse(MALFORMED_834)
    result = validate_static(parsed)
    print_result("MALFORMED 834 (6 deliberate errors)", result)
    assert result["validation_result"] == "INVALID", "Expected INVALID"
    assert result["error_count"] >= 4, \
        f"Expected at least 4 errors, got {result['error_count']}"
    print(f"  ✓ PASS — caught {result['error_count']} errors, {result['warning_count']} warnings")

    print("\n" + "═"*60)
    print("  ALL STATIC TESTS PASSED")
    print("═"*60)


def run_live_tests():
    print("\n" + "█"*60)
    print("  LIVE API VALIDATION TEST (requires internet)")
    print("█"*60)

    parsed = parse(VALID_837P)
    print("\n  Running full validation with live API checks...")
    print("  (NPI registry, ICD-10, CPT/HCPCS lookups)")
    result = validate_full(parsed)
    print_result("VALID 837P — FULL (static + live)", result)

    live = result.get("live_checks", {})
    print(f"\n  NPI checks    : {len(live.get('npi_checks', []))}")
    print(f"  ICD-10 checks : {len(live.get('icd10_checks', []))}")
    print(f"  CPT checks    : {len(live.get('cpt_hcpcs_checks', []))}")

    for npi_r in live.get("npi_checks", []):
        print(f"\n  NPI {npi_r['npi']}: status={npi_r['status']} "
              f"name='{npi_r.get('provider_name', 'N/A')}' "
              f"name_match={npi_r.get('name_match')}")

    for icd_r in live.get("icd10_checks", []):
        print(f"\n  ICD-10 {icd_r['code']}: valid={icd_r['valid']} "
              f"desc='{icd_r.get('description', 'N/A')}'")

    for cpt_r in live.get("cpt_hcpcs_checks", []):
        print(f"\n  CPT/HCPCS {cpt_r['code']}: valid={cpt_r['valid']} "
              f"source={cpt_r.get('source')} "
              f"desc='{cpt_r.get('description', 'N/A')}'")

    print("\n  ✓ LIVE TEST COMPLETE")


def export_sample_output():
    """Export full JSON output for a malformed 837P — useful for UI development."""
    parsed = parse(MALFORMED_837P)
    result = validate_static(parsed)
    output = {
        "parsed": parsed,
        "validation": result,
    }
    path = os.path.join(os.path.dirname(__file__), "sample_output.json")
    with open(path, "w") as f:
        json.dump(output, f, indent=2)
    print(f"\n  Sample output written to: {path}")


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="ClaimCraft Validator Tests")
    parser.add_argument("--live", action="store_true",
                        help="Also run live API tests (requires internet)")
    parser.add_argument("--export", action="store_true",
                        help="Export sample JSON output")
    args = parser.parse_args()

    run_static_tests()

    if args.live:
        run_live_tests()
    else:
        print("\n  (Skipping live API tests. Run with --live to include them.)")

    if args.export:
        export_sample_output()
