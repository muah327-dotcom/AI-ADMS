import pytest
from ocr.classifier import classify_document, type_matches


def lines(*texts):
    return [{"text": text, "confidence": 0.95, "box": [[0, 0], [1, 0], [1, 1], [0, 1]]} for text in texts]


@pytest.mark.parametrize("actual,expected", [("matric", "matric"), ("inter", "inter"), ("cnic", "cnic")])
def test_matching_document_is_accepted(actual, expected):
    samples = {
        "matric": lines("Secondary School Certificate", "Marks Obtained 900", "Total Marks 1100"),
        "inter": lines("Higher Secondary HSSC Intermediate", "Pre-Engineering"),
        "cnic": lines("Islamic Republic of Pakistan", "National Identity Card", "35202-1234567-1"),
    }
    detected, _ = classify_document(samples[actual])
    assert detected == actual
    assert type_matches(expected, detected)


@pytest.mark.parametrize("actual,wrong_expected", [
    ("matric", "cnic"), ("matric", "inter"),
    ("inter", "matric"), ("inter", "cnic"),
    ("cnic", "matric"), ("cnic", "inter"),
])
def test_wrong_document_is_rejected(actual, wrong_expected):
    samples = {
        "matric": lines("Matriculation SSC Secondary School Certificate"),
        "inter": lines("Intermediate HSSC Pre-Medical"),
        "cnic": lines("National Identity Card", "Identity Number 35202-1234567-1"),
    }
    detected, _ = classify_document(samples[actual])
    assert detected == actual
    assert not type_matches(wrong_expected, detected)


def test_generic_academic_terms_are_unknown():
    detected, scores = classify_document(lines(
        "BISE Board of Intermediate & Secondary Education", "Marks Obtained", "Total Marks", "Roll No"
    ))
    assert detected == "unknown"
    assert scores["matric"] == 0
    assert scores["inter"] == 0


def test_matric_heading_outweighs_student_cnic_and_footer_hssc_reference():
    detected, _ = classify_document(lines(
        "BOARD OF INTERMEDIATE & SECONDARY EDUCATION, LAHORE",
        "SECONDARY SCHOOL CERTIFICATE (FIRST ANNUAL) EXAMINATION, 2022",
        "35202-6965443-8",
        "passed the SSC or HSSC Examination",
    ))
    assert detected == "matric"


def test_inter_heading_outweighs_student_cnic_and_footer_ssc_reference():
    detected, _ = classify_document(lines(
        "BOARD OF INTERMEDIATE & SECONDARY EDUCATION, LAHORE",
        "INTERMEDIATE PART I & II (FIRST ANNUAL) EXAMINATION, 2024",
        "35202-6965443-8",
        "passed the SSC or HSSC Examination",
    ))
    assert detected == "inter"


@pytest.mark.parametrize("actual,wrong_expected", [("matric", "inter"), ("inter", "matric")])
def test_realistic_academic_headings_reject_wrong_level(actual, wrong_expected):
    sample = {
        "matric": lines("SECONDARY SCHOOL CERTIFICATE (ANNUAL) EXAMINATION, 2020"),
        "inter": lines("INTERMEDIATE PART I & II (ANNUAL) EXAMINATION, 2022"),
    }[actual]
    detected, _ = classify_document(sample)
    assert detected == actual
    assert not type_matches(wrong_expected, detected)
