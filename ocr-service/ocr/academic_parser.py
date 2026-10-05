import re
from .normalizers import clean_text, normalize_integer, normalize_qualification, normalize_year


def _label_value(lines, patterns, normalizer):
    for line in lines:
        text = clean_text(line.get("text"))
        for pattern in patterns:
            match = re.search(pattern, text, re.I)
            if match:
                value = normalizer(text[match.end():].lstrip(" :-"))
                if value is not None:
                    return value, line.get("confidence")
    return None, None


def _bounds(line):
    box = line.get("box") or []
    if len(box) < 2:
        return 0.0, 0.0, 0.0, 0.0
    xs = [float(point[0]) for point in box]
    ys = [float(point[1]) for point in box]
    return min(xs), min(ys), max(xs), max(ys)


def _center(line):
    left, top, right, bottom = _bounds(line)
    return (left + right) / 2, (top + bottom) / 2


def _standalone_integer(line):
    text = clean_text(line.get("text")).replace(",", "")
    match = re.fullmatch(r"[^0-9]*(\d{3,4})[^0-9]*", text)
    return int(match.group(1)) if match else None


def _spatial_value(lines, label_patterns):
    """Associate a summary label with a nearby numeric OCR box.

    Same-row values are preferred. A value directly below is accepted only when
    horizontally aligned and close enough to represent a split/stacked label,
    rather than an arbitrary subject-table number.
    """
    candidates = []
    for index, label in enumerate(lines):
        label_text = clean_text(label.get("text"))
        if not any(re.search(pattern, label_text, re.I) for pattern in label_patterns):
            continue
        lx1, ly1, lx2, ly2 = _bounds(label)
        label_height = max(ly2 - ly1, 1.0)
        lcx, lcy = _center(label)
        for value_line in lines:
            if value_line is label:
                continue
            value = _standalone_integer(value_line)
            if value is None:
                continue
            vx1, vy1, vx2, vy2 = _bounds(value_line)
            vcx, vcy = _center(value_line)
            same_row = abs(vcy - lcy) <= max(label_height, vy2 - vy1) * 0.9
            right_of_label = vx1 >= lx1 and vx1 - lx2 <= max(650.0, (lx2 - lx1) * 5)
            below = vy1 >= ly2 and vy1 - ly2 <= label_height * 3.2
            horizontally_aligned = (vx1 <= lx2 and vx2 >= lx1) or abs(vcx - lcx) <= max(lx2 - lx1, 120.0)
            if same_row and right_of_label:
                score = 1000.0 - abs(vcy - lcy) - max(vx1 - lx2, 0) * 0.05 + ly1 * 0.01
            elif below and horizontally_aligned:
                score = 500.0 - (vy1 - ly2) + ly1 * 0.01
            else:
                continue
            confidence = min(float(label.get("confidence") or 0), float(value_line.get("confidence") or 0))
            candidates.append((score, value, confidence, index))
    if not candidates:
        return None, None
    _, value, confidence, _ = max(candidates, key=lambda item: item[0])
    return value, confidence


def _with_split_mark_labels(lines):
    augmented = list(lines)
    for first in lines:
        first_text = clean_text(first.get("text"))
        if not re.fullmatch(r"marks|total|obtained", first_text, re.I):
            continue
        fx1, fy1, fx2, fy2 = _bounds(first)
        fcx, fcy = _center(first)
        height = max(fy2 - fy1, 1.0)
        for second in lines:
            if second is first:
                continue
            second_text = clean_text(second.get("text"))
            pair = f"{first_text} {second_text}".lower()
            if pair not in {"marks obtained", "obtained marks", "total marks"}:
                continue
            sx1, sy1, sx2, sy2 = _bounds(second)
            scx, scy = _center(second)
            same_row = abs(scy - fcy) <= max(height, sy2 - sy1) * 1.1
            stacked = sy1 >= fy2 and sy1 - fy2 <= height * 1.8 and abs(scx - fcx) <= max(fx2 - fx1, sx2 - sx1)
            if not (same_row or stacked):
                continue
            augmented.append({
                "text": pair,
                "confidence": min(float(first.get("confidence") or 0), float(second.get("confidence") or 0)),
                "box": [[min(fx1, sx1), min(fy1, sy1)], [max(fx2, sx2), min(fy1, sy1)],
                        [max(fx2, sx2), max(fy2, sy2)], [min(fx1, sx1), max(fy2, sy2)]],
            })
    return augmented


def _summary_marks(lines):
    # The most reliable form is an overall result sentence such as 972/1100.
    for line in lines:
        text = clean_text(line.get("text"))
        match = re.search(r"(?:candidate\s+)?(?:secured|obtained)[^\d]{0,20}(\d{2,4})\s*/\s*(\d{2,4})", text, re.I)
        if match:
            return int(match.group(1)), int(match.group(2)), line.get("confidence"), line.get("confidence")

    summary_lines = _with_split_mark_labels(lines)
    obtained, obtained_conf = _label_value(
        summary_lines, (r"marks\s+obtained", r"obtained\s+marks", r"marks\s+secured"), normalize_integer
    )
    total, total_conf = _label_value(summary_lines, (r"total\s+marks", r"marks\s+total"), normalize_integer)
    if obtained is None:
        obtained, obtained_conf = _spatial_value(summary_lines, (r"marks\s+obtained", r"obtained\s+marks"))
    if total is None:
        total, total_conf = _spatial_value(summary_lines, (r"total\s+marks", r"marks\s+total"))
    # A lone number near a marks header is commonly a subject-table cell. Do not
    # expose it as an overall result unless a valid overall total was also found.
    if obtained is not None and total is None:
        obtained, obtained_conf = None, None
    return obtained, total, obtained_conf, total_conf


def _examination_year(lines, document_type):
    level = r"(?:secondary\s+school\s+certificate|matric(?:ulation)?|ssc)" if document_type == "matric" else r"(?:intermediate|hssc)"
    patterns = (
        rf"{level}.*?examination[^\d]*(19\d{{2}}|20\d{{2}})",
        rf"{level}.*?(19\d{{2}}|20\d{{2}}).*?examination",
        r"(?:first|second|supplementary)?\s*annual[^\n]{0,30}examination[^\d]*(19\d{2}|20\d{2})",
    )
    for line in lines:
        text = clean_text(line.get("text"))
        for pattern in patterns:
            match = re.search(pattern, text, re.I)
            if match:
                year = normalize_year(match.group(1))
                if year is not None:
                    return year, line.get("confidence")
    return None, None


def _inter_qualification(lines):
    # Prefer an explicit normalized qualification anywhere in the OCR output.
    for line in lines:
        qualification = normalize_qualification(line.get("text"))
        if qualification and qualification != "General Science":
            return qualification, line.get("confidence")

    # General Science is accepted only as a value on the GROUP row or directly
    # beside/below it; subject names elsewhere must not define qualification.
    for label in lines:
        if not re.fullmatch(r"group\s*:??", clean_text(label.get("text")), re.I):
            continue
        lx1, ly1, lx2, ly2 = _bounds(label)
        lcx, lcy = _center(label)
        height = max(ly2 - ly1, 1.0)
        nearby = []
        for value_line in lines:
            qualification = normalize_qualification(value_line.get("text"))
            if qualification != "General Science":
                continue
            vx1, vy1, vx2, vy2 = _bounds(value_line)
            vcx, vcy = _center(value_line)
            same_row = abs(vcy - lcy) <= max(height, vy2 - vy1) * 1.1 and vx1 >= lx1
            below = vy1 >= ly2 and vy1 - ly2 <= height * 2.5 and abs(vcx - lcx) <= 350
            if same_row or below:
                nearby.append((abs(vcy - lcy), qualification, value_line.get("confidence")))
        if nearby:
            _, qualification, confidence = min(nearby, key=lambda item: item[0])
            return qualification, confidence
    return None, None


def parse_academic(lines, document_type):
    text = "\n".join(clean_text(line.get("text")) for line in lines)
    obtained, total, obtained_conf, total_conf = _summary_marks(lines)
    year, year_conf = _examination_year(lines, document_type)
    if year is None:
        year, year_conf = _label_value(lines, (r"passing\s+year", r"year\s+of\s+passing", r"session"), normalize_year)
    fields = {"passing_year": year, "obtained_marks": obtained, "total_marks": total}
    confidences = {"passing_year": year_conf, "obtained_marks": obtained_conf, "total_marks": total_conf}
    if document_type == "inter":
        qualification, qualification_conf = _inter_qualification(lines)
        fields["inter_qualification"] = qualification
        confidences["inter_qualification"] = qualification_conf
    return fields, confidences
