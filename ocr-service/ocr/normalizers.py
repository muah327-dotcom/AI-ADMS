import re
from datetime import datetime


CNIC_RE = re.compile(r"(?<!\d)(\d{5})[-\s]?(\d{7})[-\s]?(\d)(?!\d)")


def clean_text(value):
    return re.sub(r"\s+", " ", str(value or "")).strip()


def normalize_cnic(value):
    match = CNIC_RE.search(str(value or ""))
    return f"{match.group(1)}-{match.group(2)}-{match.group(3)}" if match else None


def normalize_gender(value):
    compact = re.sub(r"[^a-z]", "", str(value or "").lower())
    if re.search(r"\bfemale\b", str(value or "").lower()) or compact.startswith("fpakistan") or compact == "f":
        return "female"
    if re.search(r"\bmale\b", str(value or "").lower()) or compact.startswith("mpakistan") or compact == "m":
        return "male"
    return None


def normalize_date(value):
    text = clean_text(value)
    match = re.search(r"\b(\d{1,2})[./-](\d{1,2})[./-](\d{4})\b", text)
    if not match:
        return None
    try:
        parsed = datetime(int(match.group(3)), int(match.group(2)), int(match.group(1)))
    except ValueError:
        return None
    if parsed.year < 1900 or parsed.date() > datetime.now().date():
        return None
    return parsed.strftime("%Y-%m-%d")


def normalize_year(value):
    match = re.search(r"\b(19\d{2}|20\d{2})\b", str(value or ""))
    if not match:
        return None
    year = int(match.group(1))
    return year if 1950 <= year <= datetime.now().year + 1 else None


def normalize_integer(value):
    match = re.search(r"(?<!\d)(\d{1,4})(?!\d)", str(value or "").replace(",", ""))
    return int(match.group(1)) if match else None


def normalize_qualification(value):
    text = clean_text(value).lower().replace("–", "-")
    patterns = (
        (r"pre\s*[- ]?engineering", "FSc Pre-Engineering"),
        (r"pre\s*[- ]?medical", "FSc Pre-Medical"),
        (r"\bi\s*[.]?\s*com\b|\bicom\b", "I.Com"),
        (r"\bi\s*[.]?\s*c\s*[.]?\s*s\b|\bics\b", "ICS"),
        (r"\bgeneral\s+science\b", "General Science"),
    )
    for pattern, label in patterns:
        if re.search(pattern, text, re.I):
            return label
    return None
