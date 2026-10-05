import cv2
import numpy as np


MAX_DIMENSION = 2400
MIN_LONG_EDGE = 1400


def decode_image(content):
    array = np.frombuffer(content, dtype=np.uint8)
    image = cv2.imdecode(array, cv2.IMREAD_COLOR)
    if image is None or image.size == 0:
        raise ValueError("The uploaded file is not a decodable image.")
    return image


def _order_points(points):
    rect = np.zeros((4, 2), dtype="float32")
    sums, diffs = points.sum(axis=1), np.diff(points, axis=1).reshape(-1)
    rect[0], rect[2] = points[np.argmin(sums)], points[np.argmax(sums)]
    rect[1], rect[3] = points[np.argmin(diffs)], points[np.argmax(diffs)]
    return rect


def correct_perspective(image, cnic_mode=False):
    """Correct only a large, convincing four-corner document contour."""
    source = image
    scale = min(1.0, 1200 / max(image.shape[:2])) if cnic_mode else 1.0
    if scale < 1.0:
        source = cv2.resize(image, None, fx=scale, fy=scale, interpolation=cv2.INTER_AREA)
    gray = cv2.cvtColor(source, cv2.COLOR_BGR2GRAY)
    edges = cv2.Canny(cv2.GaussianBlur(gray, (5, 5), 0), 50, 150)
    if cnic_mode:
        edges = cv2.dilate(edges, np.ones((3, 3), np.uint8), iterations=1)
    contours, _ = cv2.findContours(edges, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
    image_area = source.shape[0] * source.shape[1]
    minimum_area = 0.35 if cnic_mode else 0.45
    contour_limit = 10 if cnic_mode else 8
    for contour in sorted(contours, key=cv2.contourArea, reverse=True)[:contour_limit]:
        perimeter = cv2.arcLength(contour, True)
        polygon = cv2.approxPolyDP(contour, 0.02 * perimeter, True)
        if len(polygon) != 4 or cv2.contourArea(polygon) < image_area * minimum_area:
            continue
        points = polygon.reshape(4, 2).astype("float32") / scale
        rect = _order_points(points)
        tl, tr, br, bl = rect
        width = int(max(np.linalg.norm(br - bl), np.linalg.norm(tr - tl)))
        height = int(max(np.linalg.norm(tr - br), np.linalg.norm(tl - bl)))
        if width < 300 or height < 200:
            break
        destination = np.array([[0, 0], [width - 1, 0], [width - 1, height - 1], [0, height - 1]], dtype="float32")
        return cv2.warpPerspective(image, cv2.getPerspectiveTransform(rect, destination), (width, height)), True
    return image, False


def normalize_size(image, cnic_mode=False):
    height, width = image.shape[:2]
    long_edge = max(height, width)
    if cnic_mode:
        if long_edge <= 1800:
            return image
        scale = 1800 / long_edge
        return cv2.resize(image, (int(width * scale), int(height * scale)), interpolation=cv2.INTER_AREA)
    target = min(MAX_DIMENSION, max(MIN_LONG_EDGE, long_edge))
    if target == long_edge:
        return image
    scale = target / long_edge
    interpolation = cv2.INTER_CUBIC if scale > 1 else cv2.INTER_AREA
    return cv2.resize(image, (round(width * scale), round(height * scale)), interpolation=interpolation)


def normal_preprocess(image, cnic_mode=False):
    corrected, perspective_corrected = correct_perspective(image, cnic_mode=cnic_mode)
    resized = normalize_size(corrected, cnic_mode=cnic_mode)
    lab = cv2.cvtColor(resized, cv2.COLOR_BGR2LAB)
    lightness, a, b = cv2.split(lab)
    lightness = cv2.createCLAHE(clipLimit=1.8 if cnic_mode else 2.0, tileGridSize=(8, 8)).apply(lightness)
    normalized = cv2.cvtColor(cv2.merge((lightness, a, b)), cv2.COLOR_LAB2BGR)
    return normalized, perspective_corrected


def fallback_preprocess(image, cnic_mode=False):
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY) if image.ndim == 3 else image
    if cnic_mode:
        denoised = cv2.bilateralFilter(gray, 5, 35, 35)
        blurred = cv2.GaussianBlur(denoised, (0, 0), 1.0)
        sharpened = cv2.addWeighted(denoised, 1.45, blurred, -0.45, 0)
        return cv2.cvtColor(sharpened, cv2.COLOR_GRAY2BGR)
    denoised = cv2.fastNlMeansDenoising(gray, None, h=5, templateWindowSize=7, searchWindowSize=21)
    blurred = cv2.GaussianBlur(denoised, (0, 0), 1.0)
    return cv2.addWeighted(denoised, 1.35, blurred, -0.35, 0)


def cnic_ocr_input(image, include_encoded=False):
    """Match the tested POC's quality-95 JPEG input without writing a temp file."""
    encoded_ok, encoded = cv2.imencode(".jpg", image, [cv2.IMWRITE_JPEG_QUALITY, 95])
    if not encoded_ok:
        return (image, None) if include_encoded else image
    decoded = cv2.imdecode(encoded, cv2.IMREAD_COLOR)
    prepared = decoded if decoded is not None else image
    return (prepared, encoded.tobytes()) if include_encoded else prepared
