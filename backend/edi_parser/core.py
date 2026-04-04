"""
EDI X12 Core Tokenizer and Base Parser
Handles ISA envelope detection, delimiter extraction, segment splitting
"""

from typing import Optional


ELEMENT_LABELS = {
    "ISA": {
        "01": "Authorization Info Qualifier",
        "02": "Authorization Information",
        "03": "Security Info Qualifier",
        "04": "Security Information",
        "05": "Interchange Sender ID Qualifier",
        "06": "Interchange Sender ID",
        "07": "Interchange Receiver ID Qualifier",
        "08": "Interchange Receiver ID",
        "09": "Interchange Date",
        "10": "Interchange Time",
        "11": "Repetition Separator",
        "12": "Interchange Control Version",
        "13": "Interchange Control Number",
        "14": "Acknowledgment Requested",
        "15": "Interchange Usage Indicator",
        "16": "Component Element Separator",
    },
    "GS": {
        "01": "Functional Identifier Code",
        "02": "Application Sender Code",
        "03": "Application Receiver Code",
        "04": "Date",
        "05": "Time",
        "06": "Group Control Number",
        "07": "Responsible Agency Code",
        "08": "Version/Release/Industry Identifier",
    },
    "ST": {
        "01": "Transaction Set ID",
        "02": "Transaction Set Control Number",
        "03": "Implementation Convention Reference",
    },
    "SE": {
        "01": "Segment Count",
        "02": "Transaction Set Control Number",
    },
    "GE": {
        "01": "Number of Transaction Sets",
        "02": "Group Control Number",
    },
    "IEA": {
        "01": "Number of Functional Groups",
        "02": "Interchange Control Number",
    },
    "NM1": {
        "01": "Entity Identifier Code",
        "02": "Entity Type Qualifier",
        "03": "Last Name / Organization",
        "04": "First Name",
        "05": "Middle Name",
        "06": "Prefix",
        "07": "Suffix",
        "08": "ID Code Qualifier",
        "09": "ID Code (NPI / Tax ID)",
    },
    "N3": {
        "01": "Address Line 1",
        "02": "Address Line 2",
    },
    "N4": {
        "01": "City",
        "02": "State",
        "03": "ZIP Code",
        "04": "Country Code",
    },
    "PER": {
        "01": "Contact Function Code",
        "02": "Contact Name",
        "03": "Communication Number Qualifier",
        "04": "Communication Number",
        "05": "Communication Number Qualifier 2",
        "06": "Communication Number 2",
    },
    "REF": {
        "01": "Reference Identification Qualifier",
        "02": "Reference Identification",
        "03": "Description",
    },
    "DTP": {
        "01": "Date Time Qualifier",
        "02": "Date Time Period Format",
        "03": "Date",
    },
    "HL": {
        "01": "Hierarchical ID Number",
        "02": "Parent Hierarchical ID",
        "03": "Hierarchical Level Code",
        "04": "Hierarchical Child Code",
    },
    "PRV": {
        "01": "Provider Code",
        "02": "Reference ID Qualifier",
        "03": "Provider Taxonomy Code",
    },
    "SBR": {
        "01": "Payer Responsibility Sequence Number Code",
        "02": "Individual Relationship Code",
        "03": "Reference Identification",
        "04": "Name",
        "05": "Insurance Type Code",
        "06": "Coordination of Benefits Code",
        "07": "Yes/No Condition Response Code",
        "08": "Employment Status Code",
        "09": "Claim Filing Indicator Code",
    },
    "PAT": {
        "01": "Individual Relationship Code",
        "02": "Patient Location Code",
        "03": "Employment Status Code",
        "04": "Student Status Code",
        "05": "Date Time Period Format",
        "06": "Date Time Period",
        "07": "Unit Basis Measurement Code",
        "08": "Weight",
        "09": "Pregnancy Indicator",
    },
    "DMG": {
        "01": "Date Time Period Format",
        "02": "Date of Birth",
        "03": "Gender Code",
    },
    "CLM": {
        "01": "Claim ID",
        "02": "Total Charge Amount",
        "03": "unused",
        "04": "unused",
        "05": "Facility/Care/Frequency (composite)",
        "06": "Provider Accepts Assignment",
        "07": "Assignment of Benefits",
        "08": "Release of Information",
        "09": "Patient Signature Source",
        "10": "Related Causes Information",
        "11": "Special Program Indicator",
        "12": "Yes/No Condition Response Code",
        "13": "Level of Service Code",
        "14": "Yes/No Condition Response Code 2",
        "15": "Provider Agreement Code",
        "16": "Claim Status Code",
        "17": "Yes/No Condition Response Code 3",
        "18": "Claim Submission Reason Code",
        "19": "Delay Reason Code",
        "20": "Investigation Indicator",
    },
    "HI": {
        "01": "Health Care Code Information (composite)",
        "02": "Health Care Code Information 2",
        "03": "Health Care Code Information 3",
        "04": "Health Care Code Information 4",
        "05": "Health Care Code Information 5",
        "06": "Health Care Code Information 6",
        "07": "Health Care Code Information 7",
        "08": "Health Care Code Information 8",
        "09": "Health Care Code Information 9",
        "10": "Health Care Code Information 10",
        "11": "Health Care Code Information 11",
        "12": "Health Care Code Information 12",
    },
    "LX": {
        "01": "Line Counter",
    },
    "SV1": {
        "01": "Procedure Code (composite)",
        "02": "Line Charge Amount",
        "03": "Unit of Measurement",
        "04": "Service Unit Count",
        "05": "Place of Service Code",
        "06": "unused",
        "07": "Diagnosis Code Pointers",
    },
    "SV2": {
        "01": "Revenue Code",
        "02": "Procedure Code (composite)",
        "03": "Line Charge Amount",
        "04": "Unit of Measurement",
        "05": "Service Unit Count",
    },
    "BPR": {
        "01": "Transaction Handling Code",
        "02": "Total Actual Provider Payment Amount",
        "03": "Credit/Debit Flag",
        "04": "Payment Method Code",
        "05": "DFI ID Number Qualifier",
        "06": "DFI Identification Number",
        "07": "Account Number Qualifier",
        "08": "Account Number",
        "09": "Originating DFI ID",
        "10": "Originating Account Number",
        "11": "Originating Account Type",
        "12": "Receiving DFI ID Qualifier",
        "13": "Receiving DFI ID",
        "14": "Receiving Account Type",
        "15": "Receiving Account Number",
        "16": "Effective Date",
    },
    "TRN": {
        "01": "Trace Type Code",
        "02": "Reference Identification",
        "03": "Originating Company ID",
        "04": "Reference Identification 2",
    },
    "DTM": {
        "01": "Date Time Qualifier",
        "02": "Date",
    },
    "CLP": {
        "01": "Claim Submission Trace Number",
        "02": "Claim Status Code",
        "03": "Total Claim Charge Amount",
        "04": "Claim Payment Amount",
        "05": "Patient Responsibility Amount",
        "06": "Claim Filing Indicator Code",
        "07": "Payer Claim Control Number",
        "08": "Facility Type Code",
        "09": "Claim Frequency Type Code",
    },
    "CAS": {
        "01": "Claim Adjustment Group Code",
        "02": "Claim Adjustment Reason Code",
        "03": "Monetary Amount",
        "04": "Quantity",
        "05": "Claim Adjustment Reason Code 2",
        "06": "Monetary Amount 2",
        "07": "Quantity 2",
    },
    "AMT": {
        "01": "Amount Qualifier Code",
        "02": "Monetary Amount",
        "03": "Credit/Debit Flag",
    },
    "QTY": {
        "01": "Quantity Qualifier",
        "02": "Quantity",
    },
    "SVC": {
        "01": "Procedure Code (composite)",
        "02": "Line Item Charge Amount",
        "03": "Line Item Provider Payment Amount",
        "04": "Revenue Code",
        "05": "Quantity",
        "06": "Procedure Code (composite) 2",
        "07": "Original Units of Service Count",
    },
    "PLB": {
        "01": "Provider Identifier",
        "02": "Fiscal Period Date",
        "03": "Adjustment Reason Code (composite)",
        "04": "Provider Adjustment Amount",
    },
    "BGN": {
        "01": "Transaction Set Purpose Code",
        "02": "Reference Identification",
        "03": "Date",
        "04": "Time",
        "05": "Time Zone Code",
        "06": "Reference Identification 2",
        "07": "Transaction Type Code",
        "08": "Action Code",
    },
    "INS": {
        "01": "Yes/No Condition or Response Code",
        "02": "Individual Relationship Code",
        "03": "Maintenance Type Code",
        "04": "Maintenance Reason Code",
        "05": "Benefit Status Code",
        "06": "Medicare Status Code",
        "07": "COBRA Qualifying Event Code",
        "08": "Employment Status Code",
        "09": "Student Status Code",
        "10": "Handicap Indicator",
        "11": "Date Time Period Format",
        "12": "Date Time Period",
        "13": "Confidentiality Code",
        "14": "City",
        "15": "State",
        "16": "Country Code",
        "17": "Birth Sequence Number",
    },
    "HD": {
        "01": "Maintenance Type Code",
        "02": "unused",
        "03": "Insurance Line Code",
        "04": "Plan Coverage Description",
        "05": "Coverage Level Code",
    },
    "COB": {
        "01": "Payer Responsibility Sequence Number Code",
        "02": "Reference Identification",
        "03": "Coordination of Benefits Code",
    },
    "DSB": {
        "01": "Disability Type Code",
        "02": "Quantity",
        "03": "Occupation Code",
        "04": "Work Intensity Code",
        "05": "Product/Option Code",
        "06": "Monetary Amount",
        "07": "Product/Option Code 2",
        "08": "Description",
    },
    "EC": {
        "01": "Employment Class Code",
    },
    "ICM": {
        "01": "Frequency Code",
        "02": "Wage Amount",
        "03": "Quantity",
        "04": "Location Identifier",
        "05": "Salary Grade Code",
        "06": "Frequency Code 2",
    },
    "AMR": {
        "01": "Action Code",
        "02": "Date",
    },
    "LUI": {
        "01": "Language Use Indicator",
        "02": "Language Code",
        "03": "Description",
        "04": "Use Indicator",
    },
}

HL_LEVEL_NAMES = {
    "20": "Billing Provider",
    "21": "Information Source",
    "22": "Subscriber",
    "23": "Patient",
    "PT": "Patient",
}

NM1_ENTITY_NAMES = {
    "40": "Receiver",
    "41": "Submitter",
    "85": "Billing Provider",
    "87": "Pay-to Provider",
    "82": "Rendering Provider",
    "77": "Service Facility",
    "IL": "Insured/Subscriber",
    "QC": "Patient",
    "PR": "Payer",
    "PE": "Payee",
    "1P": "Provider",
    "FA": "Facility",
    "TT": "Referring Provider",
    "DN": "Referring Provider",
    "P3": "Primary Care Provider",
    "IN": "Insurer",
    "P5": "Plan Sponsor",
    "36": "Employer",
    "31": "Affiliated Provider",
    "QB": "Purchased Service Provider",
    "DQ": "Supervising Physician",
    "GB": "Other Insured",
    "GW": "Ambulance Drop-off",
    "45": "Drop-off Location",
}

FACILITY_TYPE_NAMES = {
    "11": "Office",
    "12": "Home",
    "21": "Inpatient Hospital",
    "22": "Outpatient Hospital",
    "23": "Emergency Room",
    "24": "Ambulatory Surgical Center",
    "31": "Skilled Nursing Facility",
    "32": "Nursing Facility",
    "33": "Custodial Care Facility",
    "34": "Hospice",
    "41": "Ambulance Land",
    "42": "Ambulance Air/Water",
    "49": "Independent Clinic",
    "50": "Federally Qualified Health Center",
    "51": "Inpatient Psychiatric Facility",
    "52": "Psychiatric Facility Partial Hospitalization",
    "53": "Community Mental Health Center",
    "54": "Intermediate Care Facility",
    "55": "Residential Substance Abuse Treatment Facility",
    "56": "Psychiatric Residential Treatment Center",
    "57": "Non-residential Substance Abuse Treatment Facility",
    "61": "Comprehensive Inpatient Rehabilitation Facility",
    "62": "Comprehensive Outpatient Rehabilitation Facility",
    "65": "End Stage Renal Disease Treatment Facility",
    "71": "Public Health Clinic",
    "72": "Rural Health Clinic",
    "81": "Independent Laboratory",
    "99": "Other Place of Service",
}

CLAIM_STATUS_CODES = {
    "1": "Processed as Primary",
    "2": "Processed as Secondary",
    "3": "Processed as Tertiary",
    "4": "Denied",
    "5": "Pended",
    "19": "Processed as Primary, Forwarded to Secondary",
    "20": "Processed as Secondary, Forwarded to Tertiary",
    "21": "Reversal of Previous Payment",
    "22": "Payment Corrected",
}

CARC_CODES = {
    "1": "Deductible Amount",
    "2": "Coinsurance Amount",
    "3": "Co-payment Amount",
    "4": "Service not covered",
    "5": "Not eligible for coverage",
    "6": "Not a covered benefit",
    "7": "Maximum benefit reached",
    "8": "Coordination of Benefits",
    "9": "Duplicate claim",
    "10": "Charges are greater than our fee schedule / maximum allowable or contracted/legislated fee arrangement",
    "11": "The diagnosis is inconsistent with the procedure",
    "16": "Claim/service lacks information needed for adjudication",
    "18": "Duplicate claim submitted",
    "22": "This care may be covered by another payer",
    "23": "Charges do not cover expected length of stay",
    "24": "Charges are covered under a capitation agreement/prepaid plan",
    "26": "Expenses incurred prior to coverage",
    "27": "Expenses incurred after coverage terminated",
    "29": "The time limit for filing has expired",
    "31": "Patient cannot be identified as our insured",
    "45": "Charge exceeds fee schedule / maximum allowable",
    "50": "These are non-covered services because this is not deemed a 'medical necessity' by the payer",
    "51": "These are non-covered services because this is a pre-existing condition",
    "55": "Claim lacks itemized bill/statement",
    "56": "Reminder of EOB",
    "57": "This authorization/pre-certification was not approved",
    "58": "Treatment was deemed by the payer to have been rendered in an inappropriate or invalid place of service",
    "59": "Processed based on multiple or concurrent procedure rules",
    "96": "Non-covered charge(s)",
    "97": "Payment is included in the allowance for another service/procedure",
    "100": "Payment made to patient/insured/responsible party/employer",
    "109": "Claim not covered by this payer/contractor. You must send the claim to the correct payer/contractor",
    "119": "Benefit maximum for this time period or occurrence has been reached",
    "204": "This service/equipment/drug is not covered under the patient's current benefit plan",
    "226": "Information requested from the Billing/Rendering Provider was not provided or was insufficient/incomplete",
    "236": "This procedure or procedure/modifier combination is not compatible with another procedure or procedure/modifier combination provided on the same day",
}

CAS_GROUP_CODES = {
    "CO": "Contractual Obligation — amount provider agreed to reduce",
    "CR": "Correction/Reversal",
    "OA": "Other Adjustment",
    "PI": "Payer Initiated Reduction",
    "PR": "Patient Responsibility — patient owes this amount",
}

INS_MAINTENANCE_TYPES = {
    "001": "Change",
    "021": "Addition",
    "024": "Cancellation or Termination",
    "025": "Reinstatement",
    "030": "Audit or Compare",
    "032": "Employee Information Not Applicable",
}

INS_RELATIONSHIP_CODES = {
    "01": "Spouse",
    "18": "Self",
    "19": "Child",
    "20": "Employee",
    "21": "Unknown",
    "22": "Handicapped Dependent",
    "23": "Sponsored Dependent",
    "24": "Dependent of a Minor Dependent",
    "25": "Ex-Spouse",
    "26": "Associate",
    "31": "Adoptive Child",
    "38": "Foster Child",
    "39": "Ward",
    "40": "Stepson or Stepdaughter",
    "41": "Other Relationship",
    "43": "Grandfather or Grandmother",
    "53": "Life Partner",
    "60": "Unknown",
    "D2": "Dependent",
    "G8": "Other Relationship",
}


def sanitize(raw: str) -> str:
    """Strip BOM, normalize line endings, strip trailing whitespace."""
    raw = raw.lstrip("\ufeff")
    raw = raw.replace("\r\n", "").replace("\r", "").replace("\n", "")
    return raw.strip()


def detect_delimiters(raw: str) -> dict:
    """Extract delimiters from ISA segment."""
    raw = sanitize(raw)
    if not raw.startswith("ISA"):
        raise ValueError("File does not start with ISA segment.")
    element_sep = raw[3]
    sub_element_sep = raw[104] if len(raw) > 104 else ":"
    segment_terminator = raw[105] if len(raw) > 105 else "~"
    return {
        "element_sep": element_sep,
        "sub_element_sep": sub_element_sep,
        "segment_terminator": segment_terminator,
    }


def tokenize(raw: str, delimiters: dict) -> list[dict]:
    """Split raw EDI into segments with metadata."""
    seg_term = delimiters["segment_terminator"]
    elem_sep = delimiters["element_sep"]
    sub_sep = delimiters["sub_element_sep"]

    raw = sanitize(raw)
    raw_segments = [s.strip() for s in raw.split(seg_term) if s.strip()]

    segments = []
    warnings = []

    for idx, raw_seg in enumerate(raw_segments):
        # check for stray characters before segment ID
        if not raw_seg[0].isalpha():
            warnings.append({
                "type": "MALFORMED_SEGMENT",
                "position": idx,
                "detail": f"Segment at position {idx} starts with unexpected character '{raw_seg[0]}': '{raw_seg[:20]}'"
            })
            raw_seg = raw_seg.lstrip("0123456789 ")

        parts = raw_seg.split(elem_sep)
        seg_id = parts[0].strip()
        raw_elements = parts[1:]

        # parse sub-elements (composite)
        parsed_elements = []
        for elem in raw_elements:
            if sub_sep in elem:
                parsed_elements.append(elem.split(sub_sep))
            else:
                parsed_elements.append(elem)

        # map to labeled elements
        label_map = ELEMENT_LABELS.get(seg_id, {})
        elements = {}
        for i, val in enumerate(parsed_elements):
            key = f"{seg_id}{str(i+1).zfill(2)}"
            label = label_map.get(str(i+1).zfill(2), f"Element {str(i+1).zfill(2)}")
            elements[key] = {"label": label, "value": val}

        segments.append({
            "id": seg_id,
            "name": _segment_name(seg_id),
            "raw_elements": parsed_elements,
            "elements": elements,
        })

    return segments, warnings


def _segment_name(seg_id: str) -> str:
    names = {
        "ISA": "Interchange Control Header",
        "IEA": "Interchange Control Trailer",
        "GS": "Functional Group Header",
        "GE": "Functional Group Trailer",
        "ST": "Transaction Set Header",
        "SE": "Transaction Set Trailer",
        "BPR": "Beginning of Payment Order/Remittance Advice",
        "TRN": "Reassociation Trace Number",
        "DTM": "Date or Time Period",
        "N1": "Name",
        "NM1": "Individual or Organizational Name",
        "N3": "Address Information",
        "N4": "Geographic Location",
        "PER": "Administrative Communications Contact",
        "REF": "Reference Identification",
        "HL": "Hierarchical Level",
        "PRV": "Provider Information",
        "SBR": "Subscriber Information",
        "PAT": "Patient Information",
        "DMG": "Demographic Information",
        "CLM": "Claim Information",
        "DTP": "Date or Time Period",
        "HI": "Health Care Diagnosis Code",
        "LX": "Line Counter",
        "SV1": "Professional Service Line",
        "SV2": "Institutional Service Line",
        "CLP": "Claim Level Data",
        "CAS": "Claim Adjustment",
        "AMT": "Monetary Amount",
        "QTY": "Quantity",
        "SVC": "Service Payment Information",
        "PLB": "Provider Level Adjustment",
        "BGN": "Beginning Segment",
        "INS": "Insured Benefit",
        "HD": "Health Coverage",
        "COB": "Coordination of Benefits",
        "DSB": "Disability Information",
        "EC": "Employment Class",
        "ICM": "Individual Income",
        "LUI": "Language Use",
    }

def sanitize(raw):
    raw = raw.lstrip("\ufeff")
    raw = raw.replace("\r\n", "").replace("\r", "").replace("\n", "")
    return raw.strip()


def detect_delimiters(raw):
    raw = sanitize(raw)

    if not raw.startswith("ISA"):
        raise ValueError("file doesn't start with ISA segment : Invalid or incompleted fiel.")
    element_sep = raw[3]
    sub_element_sep = raw[104] if len(raw) > 104 else ":"
    segment_terminator = raw[105] if len(raw) > 105 else "~"
    
    return {
        "element_sep" : element_sep,
        "sub_element_sep" : sub_element_sep,
        "segment_terminator" : segment_terminator
    }

def tokenize(raw, delimiters):
    segment_terminator = delimiters["segment_terminator"]
    element_sep = delimiters["element_sep"]
    sub_element_sep = delimiters["sub_element_sep"]

    raw = sanitize(raw)

    raw_segments = [s.strip() for s in raw.split(segment_terminator) if s.strip()]

    segments = []
    warnings = []

    for index, raw_seg in enumerate(raw_segments):
        if not raw_seg[0].isalpha():
            warnings.append({
                "type": "MALFORMED_SEGMENT",
                "position" : index,
                "detail" : f"segment at position {index} starts with unexpected character '{raw_seg[0]}'"
            })

            raw_seg = raw_seg.lstrip("0123456789 ")
        
        parts = raw_seg.split(element_sep)
        seg_id = parts[0].strip()
        raw_elements = parts[1:]

        parsed_elements = []
        for elem in raw_elements:
            if sub_element_sep in elem:
                parsed_elements.append(elem.split(sub_element_sep))
            else:
                parsed_elements.append(elem)
        
        label_map = ELEMENT_LABELS.get(seg_id, {})
        elements = {}
        for i, val in enumerate(parsed_elements):
            key = f"{seg_id}{str(i+1).zfill(2)}"
            label = label_map.get(str(i+1).zfill(2)), f"Element {str(i+1).zfill(2)}"
            elements[key] = {"label": label, "value": val}

        segments.append({
            "id": seg_id,
            "name" : _segment_name(seg_id),
            "raw_elements":parsed_elements,
            "elements" : elements,
        })
    return segments, warnings


def _segment_name(seg_id):  
    names = SEGMENT_NAMES
    return names.get(seg_id, seg_id)


def detect_transaction_type(segments: list) -> str:
    """Detect transaction type from ST segment."""
    for seg in segments:
        if seg["id"] == "ST":
            st01 = seg["raw_elements"][0] if seg["raw_elements"] else ""
            st03 = seg["raw_elements"][2] if len(seg["raw_elements"]) > 2 else ""
            if st01 == "837":
                if "X222" in st03:
                    return "837P"
                elif "X223" in st03:
                    return "837I"
                else:
                    return "837P"  # default 837 to professional
            elif st01 == "835":
                return "835"
            elif st01 == "834":
                return "834"
    raise ValueError("Cannot detect transaction type — ST segment not found or unrecognised.")


def extract_envelope_meta(segments: list) -> dict:
    """Extract ISA/GS/ST metadata."""
    meta = {}
    for seg in segments:
        if seg["id"] == "ISA":
            elems = seg["raw_elements"]
            meta["sender_id"] = elems[5].strip() if len(elems) > 5 else ""
            meta["receiver_id"] = elems[7].strip() if len(elems) > 7 else ""
            meta["interchange_date"] = elems[8] if len(elems) > 8 else ""
            meta["interchange_time"] = elems[9] if len(elems) > 9 else ""
            meta["interchange_control"] = elems[12] if len(elems) > 12 else ""
            meta["usage_indicator"] = elems[14] if len(elems) > 14 else ""
        elif seg["id"] == "GS":
            elems = seg["raw_elements"]
            meta["gs_code"] = elems[0] if elems else ""
            meta["gs_sender"] = elems[1] if len(elems) > 1 else ""
            meta["gs_receiver"] = elems[2] if len(elems) > 2 else ""
            meta["gs_date"] = elems[3] if len(elems) > 3 else ""
            meta["gs_version"] = elems[7] if len(elems) > 7 else ""
        elif seg["id"] == "ST":
            elems = seg["raw_elements"]
            meta["st_code"] = elems[0] if elems else ""
            meta["version"] = elems[2] if len(elems) > 2 else ""
    return meta


def build_segment_dict(seg: dict) -> dict:
    """Return clean segment dict for output."""
    return {
        "id": seg["id"],
        "name": seg["name"],
        "raw_elements": seg["raw_elements"],
        "elements": seg["elements"],
    }
