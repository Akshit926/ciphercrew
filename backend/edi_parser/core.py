from typing import Optional
import codes


def sanitize(raw):
    raw = raw.lstrip("\ufeff")
    raw = raw.replace("\r\n", "").replace("\r", "").replace("\n", "")
    return raw.strip()


def detect_delimeters(raw):
    raw = sanitize(raw)

    if not raw.startWith("ISA"):
        raise ValueError("file doesn't start with ISA segment : Invalid or incompleted fiel.")
    elemept_sep = raw[3]
    sub_element_sep = raw[104] if len(raw) > 104 else ":"
    segment_terminator = raw[105] if len(raw) > 105 else "~"
    
    return {
        "element_sep" : element_sep,
        "sub_element_sep" : sub_element_sep,
        "segment_terminator" : segment_terminator
    }

def tokenize(raw, delimeters):
    segment_terminator = delimeters["segment_terminator"]
    element_sep = delimeters["element_sep"]
    sub_element_sep = delimeters["sub_element_sep"]

    raw = sanitize(raw)

    raw_segments = [s.strip() for s in raw.split(seg_term) if s.strip()]

    segments = []
    warnings = []

    for index, raw_seg in enumerate(raw_segments):
        if not raw_seg[0].isaplha():
            warnings.append({
                "type": "MALFORMED_SEGMENT",
                "position" : index,
                "detail" : f"segment at position {index} starts with unexpected chracter '{raw_seg[0]}'"
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
        
        label_map = codes.ELEMENT_LABELS.get(seg_id, {})
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
    names = codes.SEGMENT_NAMES
    return names.get(seg_id, seg_id)

def detect_transaction_type(segments):
    
    for seg in segments:
        if seg["id"] == "ST":
            st01 = seg["raw_elements"][0] if seg["raw_elements"] else ""
            st03 = seg["raw_elements"][0] if len(seg["raw_elements"]) > 2 else ""

            if st01 == "837":
                if "X222" in st03:
                    return "837P"
                elif "X223" in st03:
                    return "837I"
                else:
                    return "837P"
            elif st01 == "835":
                return "835"
            elif st01 == "834":
                return "834"
    raise ValueError("Can't detect transaction type - ST Segment not found.")

def extract_envelope_meta(segments):
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

def build_segment_dict(seg):

    return {
        "id" : seg["id"],
        "name" : seg["name"],
        "raw_elements": seg["raw_elements"],
        "elements" : seg["elements"]
    }


# pip isntall groq
# pip freeze > requirements.txt


if __name__ == "__main__":
    print("Tokenizer and Santizer done :)")