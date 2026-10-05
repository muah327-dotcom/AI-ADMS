import hashlib
import cv2
import numpy as np

from ocr.engine import RapidOcrEngine


def test_process_debug_hashes_exact_original_bytes(monkeypatch):
    image = np.full((240, 400, 3), 255, dtype=np.uint8)
    ok, encoded = cv2.imencode(".png", image)
    assert ok
    content = encoded.tobytes()
    engine = RapidOcrEngine.__new__(RapidOcrEngine)
    monkeypatch.setattr(engine, "_run", lambda _image: [])

    result = engine.process(content, "cnic")

    assert result["debug"]["original_byte_length"] == len(content)
    assert result["debug"]["original_sha256"] == hashlib.sha256(content).hexdigest()
    assert result["debug"]["decoded_shape"] == [240, 400, 3]
    assert result["debug"]["primary_ocr_input_byte_length"] > 0
    assert len(result["debug"]["primary_ocr_input_sha256"]) == 64
