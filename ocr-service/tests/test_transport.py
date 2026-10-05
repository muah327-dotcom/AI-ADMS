import asyncio
import pytest
from fastapi import HTTPException

from app import MAX_UPLOAD_BYTES, _request_input, _validate_object_reference
from starlette.requests import Request


STORE_ID = "store_abc123"
VALID_URL = f"https://{STORE_ID}.private.blob.vercel-storage.com/ocr-temp/user-a/random-id.jpg"


def reference(**overrides):
    value = {"url": VALID_URL, "content_type": "image/jpeg", "size": 1024}
    value.update(overrides)
    return value


def test_private_object_reference_validation(monkeypatch):
    monkeypatch.setenv("BLOB_STORE_ID", STORE_ID)
    assert _validate_object_reference(reference()) == (VALID_URL, "image/jpeg", 1024)


@pytest.mark.parametrize("url", [
    "https://evil.example/ocr-temp/random-id.jpg",
    f"https://{STORE_ID}.private.blob.vercel-storage.com/not-ocr/random-id.jpg",
    f"http://{STORE_ID}.private.blob.vercel-storage.com/ocr-temp/random-id.jpg",
])
def test_rejects_untrusted_object_urls(monkeypatch, url):
    monkeypatch.setenv("BLOB_STORE_ID", STORE_ID)
    with pytest.raises(HTTPException) as exc:
        _validate_object_reference(reference(url=url))
    assert exc.value.status_code == 400


def test_rejects_oversized_private_object(monkeypatch):
    monkeypatch.setenv("BLOB_STORE_ID", STORE_ID)
    with pytest.raises(HTTPException) as exc:
        _validate_object_reference(reference(size=MAX_UPLOAD_BYTES + 1))
    assert exc.value.status_code == 413


def test_blob_request_passes_downloaded_bytes_to_ocr_unchanged(monkeypatch):
    original = b"\xff\xd8exact-original-image-payload\xff\xd9"

    async def fake_read(reference):
        assert reference == {"url": VALID_URL}
        return original, "image/jpeg"

    monkeypatch.setattr("app._read_private_object", fake_read)
    body = b'{"object_reference":{"url":"' + VALID_URL.encode() + b'"},"expected_document_type":"matric"}'
    sent = False

    async def receive():
        nonlocal sent
        if sent:
            return {"type": "http.request", "body": b"", "more_body": False}
        sent = True
        return {"type": "http.request", "body": body, "more_body": False}

    request = Request({
        "type": "http", "method": "POST", "path": "/ocr", "headers": [(b"content-type", b"application/json")]
    }, receive)

    content, image_type, expected = asyncio.run(_request_input(request))
    assert content is original
    assert image_type == "image/jpeg"
    assert expected == "matric"
