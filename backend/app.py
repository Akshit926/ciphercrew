import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes import parse
from routes import validate, chat, reconcile, export


app = FastAPI(
    title="ClaimCraft",
    description="EDI X12 Parser & Validator for US Healthcare",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(parse.router, tags=["Parse"])
app.include_router(validate.router, tags=["Validate"])
app.include_router(chat.router, tags=["Chat"])
app.include_router(reconcile.router, tags=["Reconcile"])
app.include_router(export.router, tags=["Export"])


@app.get("/health", tags=["System"])
def health():
    return {"status": "ok", "service": "running"}