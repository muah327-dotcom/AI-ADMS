from ocr.validators import validate_fields


def test_obtained_marks_above_total_are_invalid():
    missing = validate_fields("matric", {"passing_year": 2024, "obtained_marks": 1200, "total_marks": 1100})
    assert "obtained_marks" in missing
    assert "total_marks" in missing


def test_invalid_cnic_is_invalid():
    fields = {"name": "Ali Khan", "father_name": "Ahmed Khan", "date_of_birth": "2004-01-01", "gender": "male", "cnic": "123"}
    assert "cnic" in validate_fields("cnic", fields)


def test_missing_required_field_needs_review():
    missing = validate_fields("inter", {"passing_year": 2024, "obtained_marks": 900, "total_marks": 1100})
    assert missing == ["inter_qualification"]
