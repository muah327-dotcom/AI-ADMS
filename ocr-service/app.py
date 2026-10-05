import os
import time
from contextlib import asynccontextmanager
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import JSONResponse
from ocr.classifier import type_matches
from ocr.engine import RapidOcrEngine


MAX_UPLOAD_BYTES = 20 * 1024 * 1024
ALLOWED_TYPES = {"cnic", "matric", "inter"}
ALLOWED_MIME_TYPES = {"image/jpeg", "image/jpg", "image/png", "image/bmp", "image/x-ms-bmp"}


def _env_true(name):
    return os.getenv(name, "").strip().lower() in {"1", "true", "yes", "on"}


def _is_production():
    return os.getenv("ENVIRONMENT", "development").strip().lower() == "production"


def _debug_response(result):
    if _is_production() or not _env_true("RAPIDOCR_DEBUG"):
        return None
    debug = dict(result["debug"])
    if _env_true("RAPIDOCR_DEBUG_INCLUDE_TEXT"):
        debug["ordered_ocr_lines"] = result["ocr_lines"]
        debug["parser_candidates"] = result["parser_diagnostics"]
    return debug


@asynccontextmanager
async def lifespan(app):
    app.state.ocr_engine = RapidOcrEngine()
    yield


app = FastAPI(title="ADMS RapidOCR Service", docs_url=None if _is_production() else "/docs", lifespan=lifespan)


@app.get("/health")
async def health():
    return {"status": "ok", "engine_ready": hasattr(app.state, "ocr_engine")}


@app.post("/ocr")
async def ocr(image: UploadFile = File(...), expected_document_type: str = Form(...)):
    started = time.perf_counter()
    expected = expected_document_type.strip().lower()
    if expected not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail="expected_document_type must be cnic, matric, or inter")
    if image.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(status_code=400, detail="Unsupported image type")
    content = await image.read(MAX_UPLOAD_BYTES + 1)
    if not content:
        raise HTTPException(status_code=400, detail="The uploaded image is empty")
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="Image exceeds the 20 MB limit")
    try:
        result = app.state.ocr_engine.process(content, expected)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception:
        raise HTTPException(status_code=500, detail="OCR processing failed")

    processing_time = round(time.perf_counter() - started, 3)
    detected = result["detected_type"]
    debug = _debug_response(result)
    if detected == "unknown":
        payload = {
            "success": False, "error": "unknown_document_type", "message": "The document type could not be verified.",
            "detected_type": "unknown", "expected_type": expected, "needs_review": True,
            "missing_fields": [], "fields": {}, "confidence": {"overall": result["quality"]["ocr_confidence"]},
            "quality": result["quality"], "warnings": result["warnings"], "processing_time": processing_time,
            "timing": result["timing"],
        }
        if debug is not None:
            payload["debug"] = debug
        return JSONResponse(status_code=422, content=payload)
    if not type_matches(expected, detected):
        payload = {
            "success": False, "error": "document_type_mismatch",
            "message": f"The uploaded document appears to be {detected}, but {expected} was requested.",
            "detected_type": detected, "expected_type": expected, "needs_review": False,
            "missing_fields": [], "fields": {}, "confidence": {"overall": result["quality"]["ocr_confidence"]},
            "quality": result["quality"], "warnings": [], "processing_time": processing_time,
            "timing": result["timing"],
        }
        if debug is not None:
            payload["debug"] = debug
        return JSONResponse(status_code=422, content=payload)
    payload = {
        "success": True, "detected_type": detected, "expected_type": expected,
        "needs_review": bool(result["missing_fields"] or result["warnings"]),
        "missing_fields": result["missing_fields"], "fields": result["fields"],
        "confidence": {"overall": result["quality"]["ocr_confidence"], "fields": result["field_confidence"]},
        "quality": result["quality"], "warnings": result["warnings"],
        "processing_time": processing_time,
        "timing": result["timing"],
    }
    if debug is not None:
        payload["debug"] = debug
    return payload
