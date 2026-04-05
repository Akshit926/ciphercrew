# ClaimCraft — X12 EDI Parser & Validator

**INSPIRON 5.0 · Problem Statement 01 · Team Cipher Crew · PCCOE Pune**

> A full-stack open-source tool for parsing, validating, and auditing US Healthcare X12 EDI files — supporting 837P, 837I, 835, and 834 transaction types with AI-assisted error explanation and live code lookups.

---

## The Problem

The US healthcare system processes over 5 billion EDI transactions annually. A single wrong character — an invalid Place of Service code in CLM05-1, a mismatched subscriber ID in an 834, or an NPI that fails the Luhn check — causes the entire claim to be rejected. Billing teams get back an opaque error code with no explanation. The resubmission cycle takes 14–30 days. No free, open-source tool exists that parses all three major transaction types, validates them against HIPAA 5010 rules, and explains every error in plain English.

ClaimCraft solves this.

---

## Features

- **Auto-detection** — Identifies 837P, 837I, 835, and 834 from ISA/GS/ST envelope segments
- **Full structural parser** — Builds complete loop hierarchy per HIPAA 5010 spec (2000A → 2000B → 2000C → 2300 → 2400)
- **400+ validation rules** — Mandatory segment checks, NPI Luhn algorithm, date format, POS codes, qualifiers, cross-segment consistency
- **Live API checks** — CMS NPPES NPI registry, NLM ICD-10-CM, HCPCS/CPT 2026 local file
- **Plain-English errors** — Every error carries loop location, segment, element position, and a suggested fix
- **835 vs 837 Reconciliation** — Match claims by ID, surface billed vs paid delta with CARC adjustment reasons
- **Groq AI assistant** — Llama 3.3 70B powered chat with full file context
- **Export** — JSON, CSV (835 remittance / 834 roster / error report), corrected EDI file
- **Batch processing** — Upload multiple EDI files, validate in parallel
- **Auto-fix** - One click auto fix your Grammer errors

---

## Tech Stack

| Layer | Technology |
|---|---|
| Parser | Pure Python — written from scratch, no third-party EDI libraries |
| Parser Model | Pushdown Automaton — O(n) single linear pass |
| Validation | HIPAA 5010 rules encoded as a Python rule engine |
| AI Assistant | Groq API — Llama 3.3 70B Versatile |
| Backend | FastAPI + uvicorn |
| Frontend | React + TailwindCSS |
| Reference Data | CMS NPPES, NLM ICD-10-CM, HCPCS 2026 (APR) |
| Deployment | Railway (backend) + Vercel (frontend) |

---

## Project Structure

```
ciphercrew-claimcraft/
├── backend/
│   ├── app.py                      FastAPI entry point
│   ├── requirements.txt
│   ├── Dockerfile
│   ├── .env.example
│   ├── routes/
│   │   ├── parse.py                POST /parse, POST /parse/validate
│   │   ├── validate.py             POST /validate, POST /validate/full
│   │   ├── chat.py                 POST /chat
│   │   ├── reconcile.py            POST /reconcile
│   │   └── export.py               POST /export
│   └── edi_parser/
│       ├── core.py                 Tokenizer, delimiter detection, PDA
│       ├── main.py                 parse() entry point
│       ├── validator.py            validate_static / validate_full
│       ├── validator_static.py     400+ HIPAA 5010 rule engine
│       ├── validator_live.py       Async NPI / ICD-10 / CPT API checks
│       ├── HCPC2026_APR_ANWEB.txt  HCPCS Level II reference data
│       └── parsers/
│           ├── parser_837.py       837P and 837I (PDA-based)
│           ├── parser_835.py       835 remittance
│           └── parser_834.py       834 enrollment
└── frontend/
    └── src/
        ├── pages/
        │   ├── Home.js             Upload + three-panel tool
        │   ├── Reconcile.js        835 vs 837 reconciliation
        │   └── Batch.js            Multi-file batch processing
        ├── components/
        │   ├── RawEDIPanel.js      Syntax-highlighted raw segment view
        │   ├── ParsedTreePanel.js  Collapsible loop hierarchy tree
        │   ├── ValidationPanel.js  Error report + Groq AI chat
        │   ├── ReconcilePanel.js   Claim matching table
        │   └── BatchPanel.js       Batch results table
        └── utils/
            └── api.js              All backend API calls
```

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | Health check |
| POST | `/parse` | Parse EDI file upload (single or ZIP batch) |
| POST | `/validate` | Static HIPAA 5010 rules only |
| POST | `/validate/full` | Static + live NPI/ICD-10/CPT checks |
| POST | `/chat` | Groq AI assistant with file context |
| POST | `/reconcile` | 835 vs 837 claim matching |
| POST | `/export` | Download JSON / CSV / corrected EDI |

Full interactive docs available at `/docs` when the backend is running.

---

## Parser Architecture

The 837, 835, and 834 parsers are each modeled as a **Pushdown Automaton (PDA)** — a state machine with a segment stack. Each parser makes a single linear pass through the flat segment list, O(n) in the number of segments. The stack tracks the current hierarchical context so the parser always knows which loop it is inside at any point.

**837P/837I stack (top → bottom):**
```
SVC → CLM → HL(22) → HL(20) → ENV
```

**835 stack:**
```
SVC → CLP → HDR → ENV
```

**834 stack:**
```
HD → INS → BGN → ENV
```

See `edi_parser/core.py` and `edi_parser/parsers/` for the full implementation.

---

## Validation Output

Every error is a structured object:

```json
{
  "severity": "ERROR",
  "rule_id": "CLM-003",
  "loop": "Loop 2300 (Claim CLAIM001)",
  "segment": "CLM",
  "element": "CLM05-1",
  "value_found": "3",
  "message": "Place of Service code '3' is not a valid CMS POS code. Common values: 11 (Office), 21 (Inpatient Hospital).",
  "suggested_fix": "11",
  "fix_type": "DETERMINISTIC",
  "source": "RULE"
}
```

`fix_type` is `DETERMINISTIC` when the correct value is known with certainty (e.g. charge mismatch, wrong qualifier). It is `MANUAL` when human judgment is required (e.g. invalid NPI, unrecognised ICD-10).

---

## Quick Start

### Backend

```bash
cd backend
cp .env.example .env
# Add GROQ_API_KEY to .env

pip install -r requirements.txt
uvicorn app:app --reload --port 8000
```

API docs: `http://localhost:8000/docs`

### Frontend

```bash
cd frontend
cp .env.example .env.local
# Set REACT_APP_API_URL=http://localhost:8000

npm install
npm start
```

### Docker

```bash
cp .env.example .env
# Add GROQ_API_KEY

docker-compose up --build
```

---

## Environment Variables

```env
# backend/.env
GROQ_API_KEY=your_groq_api_key_here
```

```env
# frontend/.env.local
REACT_APP_API_URL=http://localhost:8000
```

---

## Team

**Cipher Crew — PCCOE, Pune**

Built at **INSPIRON 5.0**, a national-level hackathon organized by the Computer Society of India, COEP Tech Student Chapter, sponsored by Simplify Healthcare.

---

## License

MIT License. See `LICENSE` for details.