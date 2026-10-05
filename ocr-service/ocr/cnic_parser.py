import re
import numpy as np
from .normalizers import clean_text, normalize_cnic, normalize_date, normalize_gender


LABEL_PATTERNS = {
    "name": re.compile(r"^name\s*[:.-]?$", re.I),
    "father_name": re.compile(r"^father(?:['’]s)?\s*name\s*[:.-]?$|^father\s*/\s*guardian(?:\s+name)?\s*[:.-]?$", re.I),
    "gender": re.compile(r"^gender(?:\s+country\s+of\s+stay)?\s*[:.-]?$|^sex\s*[:.-]?$", re.I),
    "date_of_birth": re.compile(r"^(?:date\s+of\s+birth|dob)\s*[:.-]?$", re.I),
    "cnic": re.compile(r"^(?:identity|cnic)\s*(?:number|no\.?)?\s*[:.-]?$", re.I),
}
ANY_LABEL = re.compile(
    r"^(?:name|father(?:['’]s)?\s*name|father\s*/\s*guardian(?:\s+name)?|gender(?:\s+country\s+of\s+stay)?|sex|country\s+of\s+stay|identity\s*(?:number|no\.?)?|cnic\s*(?:number|no\.?)?|date\s+of\s+(?:birth|issue|expiry)|dob|signature)\s*[:.-]?$",
    re.I,
)
NAME_BLOCKLIST = re.compile(r"^(?:name|father|gender|country|identity|cnic|date|pakistan|signature)\b", re.I)


def _center(box):
    try:
        points = np.asarray(box, dtype=float)
        if points.ndim != 2 or points.shape[0] == 0 or points.shape[1] < 2:
            return None
        return float(points[:, 0].mean()), float(points[:, 1].mean())
    except (TypeError, ValueError):
        return None


def _ordered(lines):
    return sorted(lines, key=lambda line: ((_center(line.get("box")) or (0, 0))[1], (_center(line.get("box")) or (0, 0))[0]))


def _valid_value(text, field):
    value = clean_text(text)
    if not value or ANY_LABEL.fullmatch(value):
        return False
    if field in {"name", "father_name"}:
        return bool(re.fullmatch(r"[A-Za-z][A-Za-z .'-]{2,80}", value) and not NAME_BLOCKLIST.match(value))
    if field == "gender":
        return normalize_gender(value) is not None
    if field == "date_of_birth":
        return normalize_date(value) is not None
    if field == "cnic":
        return normalize_cnic(value) is not None
    return False


def _select_spatial(lines, field):
    pattern = LABEL_PATTERNS[field]
    ordered = _ordered(lines)
    labels = [line for line in ordered if pattern.fullmatch(clean_text(line.get("text")))]
    candidates = []
    for label in labels:
        label_center = _center(label.get("box"))
        if label_center is None:
            continue
        lx, ly = label_center
        for candidate in ordered:
            if candidate is label:
                continue
            text = clean_text(candidate.get("text"))
            if not _valid_value(text, field):
                continue
            candidate_center = _center(candidate.get("box"))
            if candidate_center is None:
                continue
            cx, cy = candidate_center
            dx, dy = cx - lx, cy - ly
            # A value directly below its own label is the dominant CNIC layout.
            if 0 < dy < 180 and abs(dx) < 260:
                distance = abs(dx) + 1.5 * dy
                candidates.append((0, distance, candidate, "directly_below_label", 1.0))
            # Some OCR layouts keep the label and value on the same row.
            elif dx > 0 and abs(dy) < 55:
                distance = dx + 2 * abs(dy)
                candidates.append((1, distance, candidate, "same_row_right_of_label", 0.98))
    if candidates:
        _, _, candidate, reason, layout_weight = min(candidates, key=lambda item: (item[0], item[1]))
        confidence = float(candidate.get("confidence") or 0) * layout_weight
        return clean_text(candidate.get("text")), confidence, reason

    # Ordered fallback is deliberately anchored to the exact field label. In
    # particular, the Name lookup can never match the Father Name label.
    for index, line in enumerate(ordered):
        if not pattern.fullmatch(clean_text(line.get("text"))):
            continue
        for candidate in ordered[index + 1:index + 3]:
            text = clean_text(candidate.get("text"))
            if _valid_value(text, field):
                return text, float(candidate.get("confidence") or 0) * 0.8, "ordered_text_after_exact_label"
    return None, None, "not_detected"


def parse_cnic(lines):
    ordered = _ordered(lines)
    full_text = "\n".join(clean_text(line.get("text")) for line in ordered)
    name, name_conf, name_reason = _select_spatial(ordered, "name")
    father, father_conf, father_reason = _select_spatial(ordered, "father_name")
    dob_raw, dob_conf, dob_reason = _select_spatial(ordered, "date_of_birth")
    gender_raw, gender_conf, gender_reason = _select_spatial(ordered, "gender")
    cnic_raw, cnic_conf, cnic_reason = _select_spatial(ordered, "cnic")

    # RapidOCR may merge the adjacent Identity Number and Date of Birth columns
    # into one item with no separator between the final CNIC digit and the date.
    # Both values remain exact in that output, so split only this validated shape.
    combined = re.search(
        r"(?<!\d)(\d{5}[- ]?\d{7}[- ]?\d)(\d{1,2}[./-]\d{1,2}[./-]\d{4})(?!\d)",
        full_text,
    )
    if combined:
        combined_cnic, combined_dob = combined.group(1), combined.group(2)
        combined_line_confidence = max(
            (float(line.get("confidence") or 0) for line in ordered if combined.group(0) in clean_text(line.get("text"))),
            default=0,
        )
        if normalize_cnic(cnic_raw) is None:
            cnic_raw, cnic_conf, cnic_reason = combined_cnic, combined_line_confidence, "combined_cnic_dob_ocr_item"
        if normalize_date(dob_raw) is None:
            dob_raw, dob_conf, dob_reason = combined_dob, combined_line_confidence, "combined_cnic_dob_ocr_item"

    cnic = normalize_cnic(cnic_raw)
    if cnic is None:
        cnic = normalize_cnic(full_text)
        if cnic:
            cnic_reason = "validated_cnic_pattern_in_ordered_text"
            cnic_conf = max((float(line.get("confidence") or 0) for line in ordered if normalize_cnic(line.get("text"))), default=0)

    fields = {
        "name": name,
        "father_name": father,
        "date_of_birth": normalize_date(dob_raw),
        "gender": normalize_gender(gender_raw),
        "cnic": cnic,
    }
    confidences = {
        "name": name_conf if fields["name"] else None,
        "father_name": father_conf if fields["father_name"] else None,
        "date_of_birth": dob_conf if fields["date_of_birth"] else None,
        "gender": gender_conf if fields["gender"] else None,
        "cnic": cnic_conf if fields["cnic"] else None,
    }
    diagnostics = {
        "name": {"candidate": name, "reason": name_reason},
        "father_name": {"candidate": father, "reason": father_reason},
        "date_of_birth": {"candidate": dob_raw, "reason": dob_reason},
        "gender": {"candidate": gender_raw, "reason": gender_reason},
        "cnic": {"candidate": cnic_raw or cnic, "reason": cnic_reason},
    }
    return fields, confidences, diagnostics
