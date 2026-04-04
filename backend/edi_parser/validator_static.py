

from datetime import datetime
from typing import Optional

VALID_POS_CODES = {
    "11", "12", "13", "14", "15", "16", "17", "18", "19", "20",
    "21", "22", "23", "24", "25", "26", "31", "32", "33", "34",
    "41", "42", "49", "50", "51", "52", "53", "54", "55", "56",
    "57", "58", "60", "61", "62", "65", "71", "72", "81", "99",
}

VALID_CLAIM_FREQ_CODES = {"1", "2", "3", "4", "5", "6", "7", "8", "9"}

VALID_NM108_QUALIFIERS = {
    "XX", "46", "PI", "FI", "MI", "34", "SY", "1G", "SZ", "TJ",
    "EI", "NF", "PXC", "0B", "G2", "LU",
}

VALID_HI_QUALIFIERS = {
    "ABK", "ABF", "BK", "BF",  
    "APR", "APQ",                
    "BBR", "BBQ",               
    "TC", "GH",               
}

VALID_SV1_QUALIFIERS = {"HC", "WK", "ZZ", "NU"}

VALID_CARE_SETTINGS = {"A", "B", "C", "D", "E", "F", "G"}

VALID_CLAIM_FILING_CODES = {
    "AM", "BL", "CH", "CI", "DS", "FI", "HM", "LI", "LM",
    "MA", "MB", "MC", "OF", "TV", "VA", "WC", "ZZ",
    "11", "12", "13", "14", "15", "16", "17",
}

VALID_CAS_GROUP_CODES = {"CO", "CR", "OA", "PI", "PR"}

VALID_INS_MAINTENANCE_TYPES = {"001", "021", "024", "025", "030", "032"}

VALID_INS_RELATIONSHIP_CODES = {
    "01", "18", "19", "20", "21", "22", "23", "24", "25", "26",
    "31", "38", "39", "40", "41", "43", "53", "60", "D2", "G8",
}

VALID_BENEFIT_STATUS_CODES = {"A", "C", "S", "T"}

VALID_HD_INSURANCE_LINE_CODES = {
    "AH", "AK", "AO", "AP", "AU", "BL", "BP", "CO", "DE", "DI",
    "DS", "EP", "EW", "FA", "GS", "HE", "HI", "HM", "HP", "HU",
    "HV", "HW", "LI", "MA", "MB", "MC", "MI", "MH", "MS", "NP",
    "PD", "PE", "PL", "PP", "QM", "RP", "SO", "SP", "TL", "VIS",
}

ZIP_REGEX = r"^\d{5}(-\d{4})?$"
DATE_FORMAT = "%Y%m%d"
MONETARY_REGEX = r"^\d+(\.\d{1,2})?$"
NPI_LENGTH = 10

def _error(
    rule_id: str,
    loop: str,
    segment: str,
    element: str,
    value_found: str,
    message: str,
    suggested_fix: Optional[str] = None,
    severity: str = "ERROR",
    source: str = "RULE",
) -> dict:
    return {
        "severity": severity,
        "rule_id": rule_id,
        "loop": loop,
        "segment": segment,
        "element": element,
        "value_found": str(value_found),
        "message": message,
        "suggested_fix": suggested_fix,
        "fix_type": "DETERMINISTIC" if suggested_fix else "MANUAL",
        "source": source,
    }


def _warn(rule_id, loop, segment, element, value_found, message, suggested_fix=None):
    return _error(rule_id, loop, segment, element, value_found, message,
                  suggested_fix=suggested_fix, severity="WARNING")


def _validate_npi(npi: str, loop: str, segment: str, element: str) -> Optional[dict]:
    if not npi:
        return _error("NPI-001", loop, segment, element, npi,
                      f"{element} is empty. NPI is required and must be a 10-digit number.")
    npi_clean = npi.strip()
    if not npi_clean.isdigit():
        return _error("NPI-002", loop, segment, element, npi,
                      f"NPI '{npi}' contains non-numeric characters. NPI must be exactly 10 digits.")
    if len(npi_clean) != NPI_LENGTH:
        return _error("NPI-003", loop, segment, element, npi,
                      f"NPI '{npi}' is {len(npi_clean)} digits. NPI must be exactly 10 digits.")
    if not _luhn_check(npi_clean):
        return _error("NPI-004", loop, segment, element, npi,
                      f"NPI '{npi}' failed the Luhn algorithm check. The NPI number is invalid.")
    return None


def _luhn_check(number: str) -> bool:
    digits = [int(d) for d in number]
    digits.reverse()
    total = 0
    for i, d in enumerate(digits):
        if i % 2 == 1:
            d *= 2
            if d > 9:
                d -= 9
        total += d
    return total % 10 == 0


def _validate_date(date_str: str, loop: str, segment: str, element: str,
                   label: str = "Date") -> Optional[dict]:
    if not date_str:
        return _error("DATE-001", loop, segment, element, date_str,
                      f"{label} is empty. Date must be in CCYYMMDD format.")
    if len(date_str) != 8 or not date_str.isdigit():
        return _error("DATE-002", loop, segment, element, date_str,
                      f"{label} '{date_str}' is not in required CCYYMMDD format (e.g., 20260310).")
    try:
        datetime.strptime(date_str, DATE_FORMAT)
    except ValueError:
        return _error("DATE-003", loop, segment, element, date_str,
                      f"{label} '{date_str}' is not a valid calendar date.")
    return None


def _validate_monetary(amount: str, loop: str, segment: str, element: str,
                       label: str = "Amount") -> Optional[dict]:
    if not amount:
        return _error("AMT-001", loop, segment, element, amount,
                      f"{label} is empty. A monetary amount is required.")
    import re
    if not re.match(MONETARY_REGEX, amount.strip()):
        return _error("AMT-002", loop, segment, element, amount,
                      f"{label} '{amount}' is not a valid monetary format. Use digits with up to 2 decimal places (e.g., 150.00).")
    return None


def _validate_zip(zip_code: str, loop: str, segment: str, element: str) -> Optional[dict]:
    import re
    if not zip_code:
        return None 
    if not re.match(ZIP_REGEX, zip_code.strip()):
        return _error("ZIP-001", loop, segment, element, zip_code,
                      f"ZIP code '{zip_code}' is not valid. Expected 5-digit (e.g., 41101) or ZIP+4 format.")
    return None


def _validate_icd10_format(code: str, loop: str, segment: str, element: str) -> Optional[dict]:
    import re
    if not code:
        return _error("ICD10-001", loop, segment, element, code,
                      "Diagnosis code is empty. A valid ICD-10-CM code is required.")
    clean = code.replace(".", "").strip().upper()
    pattern = r"^[A-Z]\d{2}[A-Z0-9]{0,4}$"
    if not re.match(pattern, clean):
        return _error("ICD10-002", loop, segment, element, code,
                      f"Diagnosis code '{code}' does not match ICD-10-CM format. "
                      f"Expected format: letter + 2 digits + optional alphanumeric (e.g., J06.9, I10).")
    return None

def validate_837(tree: dict, transaction_type: str) -> tuple[list, list]:
    errors = []
    warnings = []

    def e(err):
        if err:
            errors.append(err)

    def w(warn):
        if warn:
            warnings.append(warn)
    envelope = tree.get("envelope", {})

    if "ISA" not in envelope:
        e(_error("ENV-001", "Envelope", "ISA", "ISA", "",
                 "ISA segment is missing. The ISA interchange control header is mandatory."))

    if "GS" not in envelope:
        e(_error("ENV-002", "Envelope", "GS", "GS", "",
                 "GS segment is missing. The GS functional group header is mandatory."))

    if "ST" not in envelope:
        e(_error("ENV-003", "Envelope", "ST", "ST", "",
                 "ST segment is missing. The ST transaction set header is mandatory."))
    submitter = tree.get("submitter")
    if not submitter:
        e(_error("SUB-001", "Loop 1000A", "NM1", "NM101", "",
                 "Submitter NM1*41 segment is missing. The submitter identification loop is mandatory."))
    else:
        if not submitter.get("last_name_org"):
            e(_error("SUB-002", "Loop 1000A", "NM1", "NM103", "",
                     "Submitter name (NM103) is empty. Submitter organization name is required."))
        nm108 = submitter.get("id_qualifier", "")
        if nm108 not in VALID_NM108_QUALIFIERS:
            e(_error("SUB-003", "Loop 1000A", "NM1", "NM108", nm108,
                     f"Submitter ID qualifier (NM108) '{nm108}' is not valid. "
                     f"Expected qualifier such as '46' (Electronic Transmitter ID)."))
    receiver = tree.get("receiver")
    if not receiver:
        e(_error("RCV-001", "Loop 1000B", "NM1", "NM101", "",
                 "Receiver NM1*40 segment is missing. The receiver identification loop is mandatory."))

    loops = tree.get("loops", [])
    if not loops:
        e(_error("BP-001", "Loop 2000A", "HL", "HL03", "",
                 "No billing provider HL*20 loop found. At least one billing provider loop is required."))
        return errors, warnings

    for loop_idx, bp_loop in enumerate(loops):
        loop_label = f"Loop 2000A (HL {bp_loop.get('hl_id', loop_idx+1)})"

        provider = bp_loop.get("provider")
        if not provider:
            e(_error("BP-002", loop_label, "NM1", "NM101", "",
                     "Billing provider NM1*85 segment is missing. Billing provider identification is mandatory."))
        else:
            if not provider.get("last_name_org"):
                e(_error("BP-003", loop_label, "NM1", "NM103", "",
                         "Billing provider name (NM103) is empty."))
            nm108 = provider.get("id_qualifier", "")
            if nm108 != "XX":
                e(_error("BP-004", loop_label, "NM1", "NM108", nm108,
                         f"Billing provider ID qualifier (NM108) is '{nm108}'. "
                         f"Expected 'XX' (NPI) for billing providers.",
                         suggested_fix="XX"))
            npi = provider.get("id", "")
            err = _validate_npi(npi, loop_label, "NM1", "NM109")
            if err:
                errors.append(err)

        sub_loops = bp_loop.get("subscriber_loops", [])
        if not sub_loops:
            e(_error("SB-001", loop_label, "HL", "HL03", "",
                     "No subscriber HL*22 loop found under billing provider. At least one subscriber loop is required."))
            continue

        for sub_idx, sub_loop in enumerate(sub_loops):
            sub_label = f"Loop 2000B (HL {sub_loop.get('hl_id', sub_idx+1)})"

            subscriber = sub_loop.get("subscriber")
            if not subscriber:
                e(_error("SB-002", sub_label, "NM1", "NM101", "",
                         "Subscriber NM1*IL segment is missing. Subscriber identification is mandatory."))
            else:
                if not subscriber.get("last_name_org"):
                    e(_error("SB-003", sub_label, "NM1", "NM103", "",
                             "Subscriber last name (NM103) is empty."))
                if not subscriber.get("id"):
                    e(_error("SB-004", sub_label, "NM1", "NM109", "",
                             "Subscriber member ID (NM109) is empty. Member ID is required."))
            for claim in sub_loop.get("claims", []):
                _validate_claim(claim, sub_label, transaction_type, errors, warnings)

            for pat_loop in sub_loop.get("patient_loops", []):
                pat_label = f"Loop 2000C (HL {pat_loop.get('hl_id', '?')})"
                for claim in pat_loop.get("claims", []):
                    _validate_claim(claim, pat_label, transaction_type, errors, warnings)

    return errors, warnings


def _validate_claim(claim: dict, loop_label: str, transaction_type: str,
                    errors: list, warnings: list):
    e = lambda err: errors.append(err) if err else None
    w = lambda warn: warnings.append(warn) if warn else None

    claim_id = claim.get("claim_id", "?")
    clm_label = f"{loop_label} → Loop 2300 (Claim {claim_id})"

    if not claim.get("claim_id"):
        e(_error("CLM-001", clm_label, "CLM", "CLM01", "",
                 "Claim ID (CLM01) is empty. A unique claim identifier is required."))

    err = _validate_monetary(claim.get("total_charge", ""), clm_label, "CLM", "CLM02",
                             "Total charge amount")
    if err:
        errors.append(err)
    facility_type = claim.get("facility_type", "")
    if not facility_type:
        e(_error("CLM-002", clm_label, "CLM", "CLM05-1", "",
                 "Place of Service code (CLM05-1) is empty. A valid 2-digit POS code is required."))
    elif facility_type not in VALID_POS_CODES:
        e(_error("CLM-003", clm_label, "CLM", "CLM05-1", facility_type,
                 f"Place of Service code '{facility_type}' is not a valid CMS POS code. "
                 f"Common values: 11 (Office), 21 (Inpatient Hospital), 22 (Outpatient Hospital)."))

    care_setting = claim.get("care_setting", "")
    if not care_setting:
        e(_error("CLM-004", clm_label, "CLM", "CLM05-2", "",
                 "Care setting code (CLM05-2) is empty. Required composite element."))
    elif care_setting not in VALID_CARE_SETTINGS:
        e(_error("CLM-005", clm_label, "CLM", "CLM05-2", care_setting,
                 f"Care setting code '{care_setting}' is not valid. Expected A-G."))

    claim_freq = claim.get("claim_frequency", "")
    if not claim_freq:
        e(_error("CLM-006", clm_label, "CLM", "CLM05-3", "",
                 "Claim frequency code (CLM05-3) is empty. Required composite element."))
    elif claim_freq not in VALID_CLAIM_FREQ_CODES:
        e(_error("CLM-007", clm_label, "CLM", "CLM05-3", claim_freq,
                 f"Claim frequency code '{claim_freq}' is not valid. "
                 f"Expected 1 (Original), 7 (Replacement), 8 (Void)."))
    diag_codes = claim.get("diagnosis_codes", [])
    if not diag_codes:
        e(_error("HI-001", clm_label, "HI", "HI01", "",
                 "No diagnosis codes found. At least one ICD-10-CM diagnosis code (HI segment) is required."))
    else:
        for i, diag in enumerate(diag_codes):
            qualifier = diag.get("qualifier", "")
            code = diag.get("code", "")
            elem = f"HI0{i+1}"
            if qualifier not in VALID_HI_QUALIFIERS:
                e(_error("HI-002", clm_label, "HI", elem, qualifier,
                         f"Diagnosis code qualifier '{qualifier}' is not valid. "
                         f"Expected 'ABK' (ICD-10 principal) or 'ABF' (ICD-10 other)."))
            if i == 0 and qualifier not in ("ABK", "BK"):
                w(_warn("HI-003", clm_label, "HI", elem, qualifier,
                        f"First diagnosis code should use qualifier 'ABK' (ICD-10 principal diagnosis). "
                        f"Found '{qualifier}'.", suggested_fix="ABK"))
            err = _validate_icd10_format(code, clm_label, "HI", elem)
            if err:
                errors.append(err)
    service_lines = claim.get("service_lines", [])
    if not service_lines:
        e(_error("SV-001", clm_label, "SV1", "SV1", "",
                 "No service lines found. At least one LX/SV1 service line is required."))
    else:
        line_charge_sum = 0.0
        for sl in service_lines:
            sl_label = f"{clm_label} → Loop 2400 (Line {sl.get('line_number', '?')})"

            proc = sl.get("procedure", "")
            qual = sl.get("procedure_qualifier", "")
            if not proc:
                e(_error("SV-002", sl_label, "SV1", "SV101", "",
                         "Procedure code (SV101) is empty. A CPT or HCPCS code is required."))
            else:
                if qual not in VALID_SV1_QUALIFIERS and qual:
                    e(_error("SV-003", sl_label, "SV1", "SV101", qual,
                             f"Service line qualifier '{qual}' is not valid. "
                             f"Expected 'HC' (HCPCS/CPT) or 'WK' (Work Comp)."))
                if not _is_valid_cpt_hcpcs_format(proc):
                    e(_error("SV-004", sl_label, "SV1", "SV101", proc,
                             f"Procedure code '{proc}' does not match CPT (5-digit numeric) "
                             f"or HCPCS Level II (letter + 4 alphanumeric) format."))

            charge = sl.get("charge", "")
            err = _validate_monetary(charge, sl_label, "SV1", "SV102", "Line charge amount")
            if err:
                errors.append(err)
            else:
                try:
                    line_charge_sum += float(charge)
                except (ValueError, TypeError):
                    pass
            unit_count = sl.get("unit_count", "")
            if not unit_count:
                e(_error("SV-005", sl_label, "SV1", "SV104", "",
                         "Service unit count (SV104) is empty. Unit count is required."))
            else:
                try:
                    if float(unit_count) <= 0:
                        e(_error("SV-006", sl_label, "SV1", "SV104", unit_count,
                                 f"Service unit count '{unit_count}' must be greater than zero."))
                except (ValueError, TypeError):
                    e(_error("SV-007", sl_label, "SV1", "SV104", unit_count,
                             f"Service unit count '{unit_count}' is not a valid number."))
            dates = sl.get("dates", [])
            if not dates:
                e(_error("DTP-001", sl_label, "DTP", "DTP03", "",
                         "Service date (DTP*472) is missing on service line. Date of service is required."))
            else:
                for dtp in dates:
                    if dtp.get("qualifier") == "472":
                        err = _validate_date(dtp.get("date", ""), sl_label, "DTP", "DTP03",
                                             "Service date")
                        if err:
                            errors.append(err)

        try:
            total = float(claim.get("total_charge", "0"))
            if abs(total - line_charge_sum) > 0.01 and line_charge_sum > 0:
                w(_warn("CLM-008", clm_label, "CLM", "CLM02",
                        claim.get("total_charge", ""),
                        f"CLM02 total charge ${total:.2f} does not match sum of "
                        f"service line charges ${line_charge_sum:.2f}.",
                        suggested_fix=f"{line_charge_sum:.2f}"))
        except (ValueError, TypeError):
            pass

    rendering = claim.get("rendering_provider")
    if rendering:
        rp_label = f"{clm_label} → Loop 2310B"
        nm108 = rendering.get("id_qualifier", "")
        if nm108 != "XX":
            e(_error("RP-001", rp_label, "NM1", "NM108", nm108,
                     f"Rendering provider ID qualifier (NM108) is '{nm108}'. Expected 'XX' (NPI).",
                     suggested_fix="XX"))
        npi = rendering.get("id", "")
        err = _validate_npi(npi, rp_label, "NM1", "NM109")
        if err:
            errors.append(err)

    dates = claim.get("dates", [])
    has_stmt_date = any(d.get("qualifier") == "431" for d in dates)
    if not has_stmt_date:
        w(_warn("DTP-002", clm_label, "DTP", "DTP01", "",
                "Statement date (DTP*431) is missing on claim. "
                "While not always mandatory, it is strongly recommended."))

    _cross_check_dates(claim, clm_label, warnings)


def _cross_check_dates(claim: dict, label: str, warnings: list):
    for dtp in claim.get("dates", []):
        date_str = dtp.get("date", "")
        if len(date_str) == 8 and date_str.isdigit():
            try:
                d = datetime.strptime(date_str, DATE_FORMAT)
                if d > datetime.now():
                    warnings.append(_warn(
                        "DTP-003", label, "DTP", "DTP03", date_str,
                        f"Date '{date_str}' is in the future. Service dates cannot be future dates."
                    ))
                if d.year < 2000:
                    warnings.append(_warn(
                        "DTP-004", label, "DTP", "DTP03", date_str,
                        f"Date '{date_str}' is before year 2000. Verify this date is correct."
                    ))
            except ValueError:
                pass


def _is_valid_cpt_hcpcs_format(code: str):
    if not code:
        return False
    code = code.strip().upper()
    if len(code) != 5:
        return False
    if code.isdigit():
        return True  # CPT
    if code[0].isalpha() and code[1:].isalnum():
        return True  # HCPCS Level II
    return False

def validate_835(tree: dict) -> tuple[list, list]:
    errors = []
    warnings = []

    def e(err):
        if err: errors.append(err)

    def w(warn):
        if warn: warnings.append(warn)

    envelope = tree.get("envelope", {})
    for seg in ("ISA", "GS", "ST", "BPR"):
        if seg not in envelope:
            e(_error(f"ENV-{seg}", "Envelope", seg, seg, "",
                     f"{seg} segment is missing. Required in 835 envelope."))
    bpr = envelope.get("BPR", {})
    if bpr:
        bpr_elems = bpr.get("raw_elements", [])
        payment_amount = bpr_elems[1] if len(bpr_elems) > 1 else ""
        err = _validate_monetary(payment_amount, "Envelope", "BPR", "BPR02",
                                 "Total payment amount")
        if err:
            errors.append(err)

    if not tree.get("payer"):
        e(_error("PAY-001", "Loop 1000A", "N1", "N101", "",
                 "Payer N1*PR segment is missing. Payer identification is required in 835."))

    if not tree.get("payee"):
        e(_error("PYE-001", "Loop 1000B", "N1", "N101", "",
                 "Payee N1*PE segment is missing. Payee identification is required in 835."))

    claim_loops = tree.get("claim_loops", [])
    if not claim_loops:
        w(_warn("CLP-000", "Loop 2100", "CLP", "CLP", "",
                "No CLP claim loops found in this 835. File may be a zero-payment remittance."))

    total_paid_bpr = 0.0
    try:
        bpr_elems = envelope.get("BPR", {}).get("raw_elements", [])
        total_paid_bpr = float(bpr_elems[1]) if len(bpr_elems) > 1 and bpr_elems[1] else 0.0
    except (ValueError, TypeError):
        pass

    total_paid_clp = 0.0

    for i, clp in enumerate(claim_loops):
        clp_label = f"Loop 2100 (Claim {clp.get('claim_id', i+1)})"

        if not clp.get("claim_id"):
            e(_error("CLP-001", clp_label, "CLP", "CLP01", "",
                     "Claim ID (CLP01) is empty. Claim submission trace number is required."))

        status = clp.get("claim_status_code", "")
        valid_statuses = {"1", "2", "3", "4", "5", "19", "20", "21", "22"}
        if status not in valid_statuses:
            e(_error("CLP-002", clp_label, "CLP", "CLP02", status,
                     f"Claim status code '{status}' is not valid. "
                     f"Expected: 1=Paid, 4=Denied, 2=Secondary, 22=Reversal."))

        err = _validate_monetary(clp.get("billed_amount", ""), clp_label,
                                 "CLP", "CLP03", "Billed amount")
        if err: errors.append(err)

        err = _validate_monetary(clp.get("paid_amount", ""), clp_label,
                                 "CLP", "CLP04", "Paid amount")
        if err: errors.append(err)

        try:
            total_paid_clp += float(clp.get("paid_amount", "0"))
        except (ValueError, TypeError):
            pass
        try:
            billed = float(clp.get("billed_amount", "0"))
            paid = float(clp.get("paid_amount", "0"))
            if paid > billed:
                e(_error("CLP-003", clp_label, "CLP", "CLP04",
                         clp.get("paid_amount", ""),
                         f"Paid amount ${paid:.2f} exceeds billed amount ${billed:.2f}. "
                         f"Overpayment detected."))
        except (ValueError, TypeError):
            pass

        for adj in clp.get("adjustments", []):
            group_code = adj.get("group_code", "")
            if group_code not in VALID_CAS_GROUP_CODES:
                e(_error("CAS-001", clp_label, "CAS", "CAS01", group_code,
                         f"CAS adjustment group code '{group_code}' is not valid. "
                         f"Expected: CO, PR, OA, PI, CR."))
            for sub_adj in adj.get("adjustments", []):
                amt = sub_adj.get("amount", "")
                err = _validate_monetary(amt, clp_label, "CAS", "CAS03", "Adjustment amount")
                if err: errors.append(err)

        for j, svc in enumerate(clp.get("service_lines", [])):
            svc_label = f"{clp_label} → SVC line {j+1}"
            proc = svc.get("procedure_code", "")
            if proc and not _is_valid_cpt_hcpcs_format(proc):
                e(_error("SVC-001", svc_label, "SVC", "SVC01", proc,
                         f"SVC procedure code '{proc}' does not match CPT or HCPCS format."))
            err = _validate_monetary(svc.get("billed_amount", ""),
                                     svc_label, "SVC", "SVC02", "SVC billed amount")
            if err: errors.append(err)

    if total_paid_bpr > 0 and abs(total_paid_bpr - total_paid_clp) > 0.01:
        w(_warn("BPR-001", "Envelope", "BPR", "BPR02",
                str(total_paid_bpr),
                f"BPR02 total payment ${total_paid_bpr:.2f} does not match "
                f"sum of CLP paid amounts ${total_paid_clp:.2f}. "
                f"Difference: ${abs(total_paid_bpr - total_paid_clp):.2f}.",
                suggested_fix=f"{total_paid_clp:.2f}"))

    return errors, warnings

def validate_834(tree: dict) -> tuple[list, list]:
    errors = []
    warnings = []

    def e(err):
        if err: errors.append(err)

    def w(warn):
        if warn: warnings.append(warn)

    envelope = tree.get("envelope", {})

    for seg in ("ISA", "GS", "ST", "BGN"):
        if seg not in envelope:
            e(_error(f"ENV-{seg}", "Envelope", seg, seg, "",
                     f"{seg} segment is missing. Required in 834 envelope."))

    bgn = envelope.get("BGN", {})
    if bgn:
        bgn_elems = bgn.get("raw_elements", [])
        purpose = bgn_elems[0] if bgn_elems else ""
        valid_purposes = {"00", "15", "22", "63"}
        if purpose not in valid_purposes:
            e(_error("BGN-001", "Envelope", "BGN", "BGN01", purpose,
                     f"BGN01 transaction purpose code '{purpose}' is not valid. "
                     f"Expected: 00 (Original), 15 (Resubmission), 22 (Information Copy)."))

    if not tree.get("sponsor"):
        e(_error("SP-001", "Loop 1000A", "N1", "N101", "",
                 "Sponsor N1*P5 segment is missing. Plan sponsor identification is required."))

    if not tree.get("payer"):
        e(_error("INS-PAY-001", "Loop 1000B", "N1", "N101", "",
                 "Insurer N1*IN segment is missing. Insurer identification is required."))

    member_loops = tree.get("member_loops", [])
    if not member_loops:
        e(_error("MBR-001", "Loop 2000", "INS", "INS", "",
                 "No member INS loops found. At least one member record is required."))
        return errors, warnings

    seen_ids = {}

    for i, member in enumerate(member_loops):
        mbr_label = f"Loop 2000 (Member {i+1})"
        mtype = member.get("maintenance_type_code", "")
        if not mtype:
            e(_error("INS-001", mbr_label, "INS", "INS03", "",
                     "Maintenance type code (INS03) is empty. "
                     "Required: 001 (Change), 021 (Addition), 024 (Termination)."))
        elif mtype not in VALID_INS_MAINTENANCE_TYPES:
            e(_error("INS-002", mbr_label, "INS", "INS03", mtype,
                     f"Maintenance type code '{mtype}' is not valid. "
                     f"Expected: 001=Change, 021=Addition, 024=Termination, 025=Reinstatement."))

        rel = member.get("relationship_code", "")
        if rel not in VALID_INS_RELATIONSHIP_CODES:
            e(_error("INS-003", mbr_label, "INS", "INS02", rel,
                     f"Individual relationship code (INS02) '{rel}' is not valid. "
                     f"Common values: 18=Self, 01=Spouse, 19=Child."))

        benefit_status = member.get("benefit_status_code", "")
        if benefit_status and benefit_status not in VALID_BENEFIT_STATUS_CODES:
            e(_error("INS-004", mbr_label, "INS", "INS05", benefit_status,
                     f"Benefit status code '{benefit_status}' is not valid. "
                     f"Expected: A=Active, C=COBRA, S=Survivor, T=Terminated."))

        member_name = member.get("member_name")
        if not member_name:
            e(_error("MBR-002", mbr_label, "NM1", "NM101", "",
                     "Member NM1*IL segment is missing. Member name identification is required."))
        else:
            if not member_name.get("last_name_org"):
                e(_error("MBR-003", mbr_label, "NM1", "NM103", "",
                         "Member last name (NM103) is empty."))
            if member.get("is_subscriber") and not member_name.get("first_name"):
                w(_warn("MBR-004", mbr_label, "NM1", "NM104", "",
                        "Member first name (NM104) is empty for a subscriber (INS01=Y). "
                        "First name is strongly recommended."))

        member_id = member.get("member_id", "")
        if member_id:
            if member_id in seen_ids:
                e(_error("MBR-005", mbr_label, "REF", "REF02", member_id,
                         f"Member ID '{member_id}' appears more than once in this 834 file. "
                         f"Duplicate member records will cause enrollment errors."))
            else:
                seen_ids[member_id] = i

        demographic = member.get("demographic")
        if demographic:
            demo_elems = demographic.get("raw_elements", [])
            dob = demo_elems[1] if len(demo_elems) > 1 else ""
            gender = demo_elems[2] if len(demo_elems) > 2 else ""
            err = _validate_date(dob, mbr_label, "DMG", "DMG02", "Date of birth")
            if err: errors.append(err)
            else:
                try:
                    dob_dt = datetime.strptime(dob, DATE_FORMAT)
                    if dob_dt >= datetime.now():
                        e(_error("DMG-001", mbr_label, "DMG", "DMG02", dob,
                                 f"Date of birth '{dob}' is not in the past. "
                                 f"Member cannot have a future date of birth."))
                except ValueError:
                    pass
            if gender and gender not in ("M", "F", "U"):
                e(_error("DMG-002", mbr_label, "DMG", "DMG03", gender,
                         f"Gender code '{gender}' is not valid. Expected M, F, or U (Unknown)."))

        dates = member.get("dates", [])
        date_map = {d["qualifier"]: d["date"] for d in dates}

        if mtype == "024":
            term_date = date_map.get("357") or date_map.get("336")
            if not term_date:
                e(_error("DTP-005", mbr_label, "DTP", "DTP01", "",
                         "Termination record (INS03=024) is missing a coverage end date (DTP*357). "
                         "Termination date is required for terminated members."))

        if mtype == "021":
            eff_date = date_map.get("356") or date_map.get("348")
            if not eff_date:
                e(_error("DTP-006", mbr_label, "DTP", "DTP01", "",
                         "Addition record (INS03=021) is missing a coverage effective date (DTP*356 or DTP*348). "
                         "Effective date is required for new enrollments."))

        eff = date_map.get("356") or date_map.get("348")
        term = date_map.get("357") or date_map.get("336")
        if eff and term and len(eff) == 8 and len(term) == 8:
            try:
                eff_dt = datetime.strptime(eff, DATE_FORMAT)
                term_dt = datetime.strptime(term, DATE_FORMAT)
                if eff_dt >= term_dt:
                    e(_error("DTP-007", mbr_label, "DTP", "DTP03",
                             f"eff={eff}, term={term}",
                             f"Coverage effective date '{eff}' is on or after termination date '{term}'. "
                             f"Effective date must precede termination date."))
            except ValueError:
                pass

        for j, cov in enumerate(member.get("coverages", [])):
            cov_label = f"{mbr_label} → HD coverage {j+1}"
            ins_line = cov.get("insurance_line_code", "")
            if ins_line and ins_line not in VALID_HD_INSURANCE_LINE_CODES:
                w(_warn("HD-001", cov_label, "HD", "HD03", ins_line,
                        f"Insurance line code '{ins_line}' is not a recognised HIPAA code set value. "
                        f"Common values: HLT (Health), DEN (Dental), VIS (Vision)."))
            hd_mtype = cov.get("maintenance_type_code", "")
            if hd_mtype and hd_mtype not in VALID_INS_MAINTENANCE_TYPES:
                e(_error("HD-002", cov_label, "HD", "HD01", hd_mtype,
                         f"HD maintenance type code '{hd_mtype}' is not valid."))

    return errors, warnings


def validate_static(parsed: dict) -> dict:
    transaction_type = parsed.get("transaction_info", {}).get("type", "")
    tree = parsed.get("tree", {})

    if transaction_type in ("837P", "837I"):
        errors, warnings = validate_837(tree, transaction_type)
    elif transaction_type == "835":
        errors, warnings = validate_835(tree)
    elif transaction_type == "834":
        errors, warnings = validate_834(tree)
    else:
        return {
            "validation_result": "UNKNOWN",
            "transaction_type": transaction_type,
            "error_count": 1,
            "warning_count": 0,
            "errors": [_error("TXN-001", "Envelope", "ST", "ST01",
                              transaction_type,
                              f"Unsupported transaction type '{transaction_type}'.")],
            "warnings": [],
            "live_checks": {},
            "summary": {},
        }

    summary = _build_summary(errors, warnings)

    return {
        "validation_result": "VALID" if not errors else "INVALID",
        "transaction_type": transaction_type,
        "error_count": len(errors),
        "warning_count": len(warnings),
        "errors": errors,
        "warnings": warnings,
        "live_checks": {},
        "summary": summary,
    }


def _build_summary(errors: list, warnings: list) -> dict:
    def count_by(lst, field, val):
        return sum(1 for x in lst if val in x.get(field, ""))

    return {
        "mandatory_segment_errors": count_by(errors, "rule_id", "ENV-") +
                                    count_by(errors, "rule_id", "SUB-") +
                                    count_by(errors, "rule_id", "RCV-") +
                                    count_by(errors, "rule_id", "BP-") +
                                    count_by(errors, "rule_id", "SB-") +
                                    count_by(errors, "rule_id", "MBR-"),
        "format_errors": count_by(errors, "rule_id", "NPI-") +
                         count_by(errors, "rule_id", "DATE-") +
                         count_by(errors, "rule_id", "AMT-") +
                         count_by(errors, "rule_id", "ZIP-"),
        "qualifier_errors": count_by(errors, "rule_id", "CLM-") +
                            count_by(errors, "rule_id", "HI-") +
                            count_by(errors, "rule_id", "SV-") +
                            count_by(errors, "rule_id", "CAS-") +
                            count_by(errors, "rule_id", "INS-"),
        "cross_segment_warnings": count_by(warnings, "rule_id", "CLM-008") +
                                  count_by(warnings, "rule_id", "BPR-") +
                                  count_by(warnings, "rule_id", "DTP-"),
        "npi_errors": count_by(errors, "rule_id", "NPI-"),
        "icd10_errors": count_by(errors, "rule_id", "ICD10-"),
        "hcpcs_errors": 0,
        "live_api_errors": 0,
    }
