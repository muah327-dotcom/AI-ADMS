from .normalizers import normalize_cnic, normalize_year


REQUIRED_FIELDS = {
    "cnic": ("name", "father_name", "date_of_birth", "gender", "cnic"),
    "matric": ("passing_year", "obtained_marks", "total_marks"),
    "inter": ("inter_qualification", "passing_year", "obtained_marks", "total_marks"),
}


def validate_fields(document_type, fields):
    invalid = []
    if document_type == "cnic" and fields.get("cnic") and not normalize_cnic(fields["cnic"]):
        invalid.append("cnic")
    if document_type in {"matric", "inter"}:
        obtained, total = fields.get("obtained_marks"), fields.get("total_marks")
        if obtained is not None and obtained <= 0:
            invalid.append("obtained_marks")
        if total is not None and total <= 0:
            invalid.append("total_marks")
        if obtained is not None and total is not None and not (0 < obtained <= total and total > 0):
            invalid.extend(("obtained_marks", "total_marks"))
        if fields.get("passing_year") and not normalize_year(fields["passing_year"]):
            invalid.append("passing_year")
    required = REQUIRED_FIELDS.get(document_type, ())
    missing = [field for field in required if fields.get(field) in (None, "")]
    missing.extend(field for field in invalid if field not in missing)
    return missing


def image_quality(image, lines):
    import cv2
    import numpy as np

    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY) if image.ndim == 3 else image
    height, width = gray.shape[:2]
    blur = float(cv2.Laplacian(gray, cv2.CV_64F).var())
    brightness = float(np.mean(gray))
    contrast = float(np.std(gray))
    confidences = [float(line["confidence"]) for line in lines if line.get("confidence") is not None]
    ocr_confidence = float(np.mean(confidences)) if confidences else 0.0
    warnings = []
    if min(width, height) < 600:
        warnings.append("Image resolution is low; review extracted information carefully.")
    if blur < 35:
        warnings.append("The document image appears blurry.")
    if brightness < 45 or brightness > 220:
        warnings.append("The document image appears underexposed or overexposed.")
    if contrast < 20:
        warnings.append("The document image has low contrast.")
    if ocr_confidence < 0.55:
        warnings.append("OCR confidence is low; review extracted information carefully.")
    return {
        "width": width, "height": height, "blur_score": round(blur, 2),
        "brightness": round(brightness, 2), "contrast": round(contrast, 2),
        "ocr_confidence": round(ocr_confidence, 4), "warnings": warnings,
    }
