import os
import secrets
import time
from contextlib import asynccontextmanager
from urllib.parse import unquote, urlparse

import httpx
from fastapi import FastAPI, HTTPException, Request, UploadFile
from fastapi.responses import JSONResponse
from ocr.classifier import type_matches
from ocr.engine import RapidOcrEngine


MAX_UPLOAD_BYTES = 20 * 1024 * 1024
ALLOWED_TYPES = {"cnic", "matric", "inter"}
ALLOWED_MIME_TYPES = {"image/jpeg", "image/jpg", "image/png", "image/bmp", "image/x-ms-bmp"}
TEMP_OBJECT_PREFIX = "ocr-temp/"


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


def _validate_object_reference(reference):
    if not isinstance(reference, dict):
        raise HTTPException(status_code=400, detail="Invalid temporary OCR object reference")
    store_id = os.getenv("BLOB_STORE_ID", "").strip()
    parsed = urlparse(str(reference.get("url", "")))
    expected_host = f"{store_id}.private.blob.vercel-storage.com" if store_id else ""
    path = unquote(parsed.path).lstrip("/")
    if (parsed.scheme != "https" or parsed.hostname != expected_host or parsed.port is not None
            or parsed.query or parsed.fragment or not path.startswith(TEMP_OBJECT_PREFIX)):
        raise HTTPException(status_code=400, detail="Invalid temporary OCR object reference")
    content_type = str(reference.get("content_type", "")).lower()
    size = reference.get("size")
    if content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(status_code=400, detail="Unsupported image type")
    if not isinstance(size, int) or size <= 0 or size > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413 if isinstance(size, int) and size > MAX_UPLOAD_BYTES else 400,
                            detail="Image exceeds the 20 MB limit" if isinstance(size, int) and size > MAX_UPLOAD_BYTES
                            else "Invalid temporary OCR object size")
    return parsed.geturl(), content_type, size


async def _read_private_object(reference):
    url, expected_type, expected_size = _validate_object_reference(reference)
    token = os.getenv("BLOB_READ_WRITE_TOKEN", "").strip()
    if not token:
        raise HTTPException(status_code=503, detail="Temporary OCR storage is not configured")
    content = bytearray()
    try:
        async with httpx.AsyncClient(follow_redirects=False, timeout=30.0) as client:
            async with client.stream("GET", url, headers={"Authorization": f"Bearer {token}"}) as response:
                if response.status_code != 200:
                    raise HTTPException(status_code=400, detail="Temporary OCR object is unavailable")
                response_type = response.headers.get("content-type", "").split(";", 1)[0].lower()
                if response_type not in ALLOWED_MIME_TYPES or response_type != expected_type:
                    raise HTTPException(status_code=400, detail="Temporary OCR object type mismatch")
                length = response.headers.get("content-length")
                if length and int(length) != expected_size:
                    raise HTTPException(status_code=400, detail="Temporary OCR object size mismatch")
                async for chunk in response.aiter_bytes():
                    content.extend(chunk)
                    if len(content) > MAX_UPLOAD_BYTES:
                        raise HTTPException(status_code=413, detail="Image exceeds the 20 MB limit")
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=503, detail="Temporary OCR object is unavailable") from exc
    if len(content) != expected_size:
        raise HTTPException(status_code=400, detail="Temporary OCR object size mismatch")
    return bytes(content), expected_type


async def _request_input(request):
    content_type = request.headers.get("content-type", "").lower()
    if content_type.startswith("application/json"):
        body = await request.json()
        content, image_type = await _read_private_object(body.get("object_reference"))
        return content, image_type, str(body.get("expected_document_type", ""))
    form = await request.form()
    image = form.get("image")
    if not isinstance(image, UploadFile):
        raise HTTPException(status_code=400, detail="Document image is required")
    content = await image.read(MAX_UPLOAD_BYTES + 1)
    return content, image.content_type, str(form.get("expected_document_type", ""))


@app.post("/ocr")
async def ocr(request: Request):
    started = time.perf_counter()
    if _is_production():
        configured_token = os.getenv("OCR_INTERNAL_SERVICE_SECRET", "")
        supplied_token = request.headers.get("x-ocr-service-token", "")
        if not configured_token or not secrets.compare_digest(configured_token, supplied_token):
            raise HTTPException(status_code=401, detail="Unauthorized")
    content, image_type, expected_document_type = await _request_input(request)
    expected = expected_document_type.strip().lower()
    if expected not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail="expected_document_type must be cnic, matric, or inter")
    if image_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(status_code=400, detail="Unsupported image type")
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
