import pytest
from fastapi import HTTPException

from app import MAX_UPLOAD_BYTES, _validate_object_reference


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
