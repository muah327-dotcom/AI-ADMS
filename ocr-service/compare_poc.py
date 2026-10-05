"""Explicit local diagnostic for comparing a file with ADMS upload debug output.

Usage: python compare_poc.py <image-path> [--expected cnic]
This utility intentionally prints OCR text because it is an explicit local developer
command. It never writes images, OCR output, or student data to disk.
"""
import argparse
import hashlib
import importlib.metadata
import json
import platform
from pathlib import Path

import cv2
import numpy as np
import onnxruntime as ort

from ocr.engine import RapidOcrEngine


def version(name):
    try:
        return importlib.metadata.version(name)
    except importlib.metadata.PackageNotFoundError:
        return None


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("image_path", type=Path)
    parser.add_argument("--expected", choices=("cnic", "matric", "inter"), default="cnic")
    args = parser.parse_args()
    content = args.image_path.read_bytes()
    decoded = cv2.imdecode(np.frombuffer(content, np.uint8), cv2.IMREAD_COLOR)
    if decoded is None:
        raise SystemExit("Image could not be decoded")

    result = RapidOcrEngine().process(content, args.expected)
    report = {
        "source": {
            "path": str(args.image_path.resolve()),
            "byte_length": len(content),
            "sha256": hashlib.sha256(content).hexdigest(),
            "decoded_shape": list(decoded.shape),
        },
        "environment": {
            "python": platform.python_version(),
            "rapidocr": version("rapidocr"),
            "onnxruntime": version("onnxruntime"),
            "opencv-python": version("opencv-python"),
            "opencv-python-headless": version("opencv-python-headless"),
            "numpy": version("numpy"),
            "Pillow": version("Pillow"),
            "onnx_providers": ort.get_available_providers(),
            "rapidocr_constructor": "RapidOCR()",
        },
        "pipeline_debug": result["debug"],
        "raw_ocr_items": result["ocr_lines"],
        "parsed_fields": result["fields"],
        "parser_candidates": result["parser_diagnostics"],
        "missing_fields": result["missing_fields"],
    }
    print(json.dumps(report, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
