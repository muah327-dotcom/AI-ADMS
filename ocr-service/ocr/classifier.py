import re
from .normalizers import CNIC_RE


CNIC_PATTERNS = (
    r"national\s+identity\s+card", r"islamic\s+republic\s+of\s+pakistan",
    r"identity\s+number", r"date\s+of\s+issue", r"date\s+of\s+expiry",
)
MATRIC_PATTERNS = (
    r"\bmatric(?:ulation)?\b", r"\bs\s*[.\-]?\s*s\s*[.\-]?\s*c\b",
    r"secondary\s+school\s+certificate",
)
INTER_PATTERNS = (
    r"\bintermediate\b", r"\bhssc\b", r"intermediate\s+part\s*(?:i{1,2}|1|2)\b",
    r"pre\s*[- ]?engineering", r"pre\s*[- ]?medical", r"\bics\b", r"\bi\s*\.\s*com\b|\bicom\b",
)


def _score(text, patterns):
    return sum(1 for pattern in patterns if re.search(pattern, text, re.I))


def classify_document(lines):
    """Classify only from strong indicators; generic board/marks text has no weight."""
    text = "\n".join(str(line.get("text", "")) for line in lines)
    # The legal name of many Pakistani boards contains "Intermediate & Secondary"
    # regardless of the certificate level. Remove that generic title before scoring.
    discriminating_text = re.sub(
        r"board\s+of\s+intermediate\s*(?:&|and)\s*secondary\s+education",
        " ", text, flags=re.I
    )
    scores = {
        "cnic": _score(text, CNIC_PATTERNS) + (2 if CNIC_RE.search(text) else 0),
        "matric": _score(discriminating_text, MATRIC_PATTERNS),
        "inter": _score(discriminating_text, INTER_PATTERNS),
    }

    # Academic result cards often print a student's CNIC/B-Form number and may
    # mention both SSC and HSSC in footer rules. An explicit examination heading
    # is stronger evidence than those incidental identifiers/footer references.
    matric_heading = re.search(
        r"secondary\s+school\s+certificate(?:\s*\([^)]*\))?\s*(?:annual\s+)?examination|"
        r"\b(?:matric|matriculation|s\s*[.\-]?\s*s\s*[.\-]?\s*c)\s+(?:annual\s+)?examination\b",
        discriminating_text, re.I,
    )
    inter_heading = re.search(
        r"\bintermediate\s+(?:part\s*(?:i{1,2}|1|2)(?:\s*&\s*(?:i{1,2}|1|2))?|"
        r"(?:annual\s+)?examination|certificate)\b|(?:^|\n)\s*hssc\s+(?:annual\s+)?examination\b",
        discriminating_text, re.I,
    )
    if matric_heading and not inter_heading:
        return "matric", scores
    if inter_heading and not matric_heading:
        return "inter", scores
    best_type = max(scores, key=scores.get)
    best_score = scores[best_type]
    tied = sum(1 for score in scores.values() if score == best_score) > 1
    if best_score == 0 or tied:
        return "unknown", scores
    return best_type, scores


def type_matches(expected_type, detected_type):
    return expected_type in {"cnic", "matric", "inter"} and expected_type == detected_type
