
from core import build_segment_dict
from codes import (NM1_ENTITY_NAMES, FACILITY_TYPE_NAMES)

# TODO : add code to it.
def parser_837(segments, transaction_type):
    pass


def _parse_billing_provider_loop(segments, index, transaction_type, warnings):
    pass

def _parse_subscriber_loop(segments, index, transaction_type, warnings):
    pass

def _parser_patient_loop(segments, index, transaction_type, warnings):
    pass

def _parse_claims(segments, index, transaction_type, warnings):
    pass

def _parse_sv1_line(segments, index):
    pass

def _parse_sv2_line(segments, index):
    pass

def _parse_nm1_entity(seg):
    pass

def _consume_provider_details(segments, index, entity):
    pass

def _consume_person_details(segments, index, entity):
    pass

def _parse_dtp(seg):
    pass

def _parse_hi(seg):
    pass


def _elem(seg, pos):
    elems = seg.get("raw_elements", [])

    if pos < len(elems):
        val = elems[pos]
        return val[0] if isinstance(val, list) else str(val)
    return ""


if "__main__" == __name__:
    print("error occureed")