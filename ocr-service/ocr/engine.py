import threading
import hashlib
import time
from .academic_parser import parse_academic
from .classifier import classify_document
from .cnic_parser import parse_cnic
from .preprocessing import cnic_ocr_input, decode_image, fallback_preprocess, normal_preprocess
from .validators import image_quality, validate_fields


class RapidOcrEngine:
    def __init__(self):
        from rapidocr import RapidOCR
        self._ocr = RapidOCR()
        self._lock = threading.Lock()

    @staticmethod
    def _normalize_result(result):
        if hasattr(result, "txts"):
            raw_boxes = getattr(result, "boxes", None)
            raw_texts = getattr(result, "txts", None)
            raw_scores = getattr(result, "scores", None)
            boxes = list(raw_boxes) if raw_boxes is not None else []
            texts = list(raw_texts) if raw_texts is not None else []
            scores = list(raw_scores) if raw_scores is not None else []
        elif isinstance(result, tuple):
            raw_rows = result[0] if len(result) > 0 else None
            rows = list(raw_rows) if raw_rows is not None else []
            boxes = [row[0] for row in rows]
            texts = [row[1] for row in rows]
            scores = [row[2] for row in rows]
        else:
            boxes, texts, scores = [], [], []
        return [
            {"text": str(text), "confidence": round(float(score), 4), "box": [[round(float(x), 2), round(float(y), 2)] for x, y in box]}
            for box, text, score in zip(boxes, texts, scores)
        ]

    def _run(self, image):
        with self._lock:
            result = self._ocr(image)
        return self._normalize_result(result)

    @staticmethod
    def _extract(lines, expected_type):
        if expected_type == "cnic":
            return parse_cnic(lines)
        fields, confidence = parse_academic(lines, expected_type)
        return fields, confidence, {}

    @staticmethod
    def _merge(primary_fields, primary_conf, primary_diagnostics, fallback_fields, fallback_conf, fallback_diagnostics):
        fields, confidences, diagnostics = dict(primary_fields), dict(primary_conf), dict(primary_diagnostics)
        for key, value in fallback_fields.items():
            if value in (None, ""):
                continue
            if fields.get(key) in (None, "") or (fallback_conf.get(key) or 0) > (confidences.get(key) or 0):
                fields[key], confidences[key] = value, fallback_conf.get(key)
                if key in fallback_diagnostics:
                    diagnostics[key] = fallback_diagnostics[key]
        return fields, confidences, diagnostics

    def process(self, content, expected_type):
        process_started = time.perf_counter()
        preprocess_started = process_started
        original = decode_image(content)
        cnic_mode = expected_type == "cnic"
        original_height, original_width = original.shape[:2]
        normalized, corrected = normal_preprocess(original, cnic_mode=cnic_mode)
        preprocessing_seconds = time.perf_counter() - preprocess_started
        processed_height, processed_width = normalized.shape[:2]
        primary_jpeg = None
        if cnic_mode:
            primary_input, primary_jpeg = cnic_ocr_input(normalized, include_encoded=True)
        else:
            primary_input = normalized
        primary_started = time.perf_counter()
        primary_lines = self._run(primary_input)
        primary_ocr_seconds = time.perf_counter() - primary_started
        detected_type, type_scores = classify_document(primary_lines)
        fields, field_confidence, parser_diagnostics = self._extract(primary_lines, expected_type)
        missing = validate_fields(expected_type, fields)
        fallback_used = False
        final_lines = primary_lines
        fallback_jpeg = None
        fallback_ocr_seconds = 0.0

        if missing or detected_type == "unknown":
            fallback_used = True
            fallback_image = fallback_preprocess(normalized, cnic_mode=cnic_mode)
            if cnic_mode:
                fallback_input, fallback_jpeg = cnic_ocr_input(fallback_image, include_encoded=True)
            else:
                fallback_input = fallback_image
            fallback_started = time.perf_counter()
            fallback_lines = self._run(fallback_input)
            fallback_ocr_seconds = time.perf_counter() - fallback_started
            fallback_detected, fallback_scores = classify_document(fallback_lines)
            fallback_fields, fallback_confidence, fallback_diagnostics = self._extract(fallback_lines, expected_type)
            fields, field_confidence, parser_diagnostics = self._merge(
                fields, field_confidence, parser_diagnostics,
                fallback_fields, fallback_confidence, fallback_diagnostics
            )
            missing = validate_fields(expected_type, fields)
            if fallback_detected != "unknown":
                detected_type, type_scores = fallback_detected, fallback_scores
            final_lines = primary_lines + [line for line in fallback_lines if line["text"] not in {item["text"] for item in primary_lines}]

        quality = image_quality(normalized, final_lines)
        quality.update({"perspective_corrected": corrected, "fallback_used": fallback_used})
        warnings = list(quality.pop("warnings"))
        if missing:
            warnings.append("Some information could not be read reliably. Please upload a clearer, straight, well-lit image or enter the missing information manually.")
        timing = {
            "preprocessing": round(preprocessing_seconds, 4),
            "ocr_pass_1": round(primary_ocr_seconds, 4),
            "fallback_ocr": round(fallback_ocr_seconds, 4) if fallback_used else None,
            "total": round(time.perf_counter() - process_started, 4),
        }
        return {
            "detected_type": detected_type, "type_scores": type_scores, "fields": fields,
            "field_confidence": field_confidence, "missing_fields": missing,
            "quality": quality, "warnings": warnings, "ocr_lines": final_lines,
            "parser_diagnostics": parser_diagnostics,
            "timing": timing,
            "debug": {
                "original_size": f"{original_width}x{original_height}",
                "processed_size": f"{processed_width}x{processed_height}",
                "perspective_corrected": corrected,
                "fallback_used": fallback_used,
                "ocr_passes": 2 if fallback_used else 1,
                "ocr_item_count": len(final_lines),
                "average_confidence": quality["ocr_confidence"],
                "detected_type": detected_type,
                "classification_scores": type_scores,
                "original_byte_length": len(content),
                "original_sha256": hashlib.sha256(content).hexdigest(),
                "decoded_shape": list(original.shape),
                "primary_ocr_input_byte_length": len(primary_jpeg) if primary_jpeg is not None else None,
                "primary_ocr_input_sha256": hashlib.sha256(primary_jpeg).hexdigest() if primary_jpeg is not None else None,
                "fallback_ocr_input_byte_length": len(fallback_jpeg) if fallback_jpeg is not None else None,
                "fallback_ocr_input_sha256": hashlib.sha256(fallback_jpeg).hexdigest() if fallback_jpeg is not None else None,
                "timing": timing,
            },
        }
