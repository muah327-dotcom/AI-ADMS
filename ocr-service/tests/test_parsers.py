from ocr.academic_parser import parse_academic
from ocr.cnic_parser import parse_cnic


def line(text, confidence=0.9, y=0, x=0, width=500):
    return {"text": text, "confidence": confidence, "box": [[x, y], [x + width, y], [x + width, y + 30], [x, y + 30]]}


def test_academic_marks_and_qualification():
    fields, _ = parse_academic([
        line("Intermediate HSSC Pre-Engineering"), line("Passing Year 2024"),
        line("Marks Obtained 910"), line("Total Marks 1100"),
    ], "inter")
    assert fields == {"passing_year": 2024, "obtained_marks": 910, "total_marks": 1100, "inter_qualification": "FSc Pre-Engineering"}


def test_matric_split_summary_boxes_and_exam_year_ignore_subject_marks():
    fields, _ = parse_academic([
        line("SECONDARY SCHOOL CERTIFICATE (FIRST ANNUAL) EXAMINATION, 2022", y=40),
        line("MARKS OBTAINED:", y=500, x=300, width=190),
        line("1024", y=500, x=510, width=60),
        line("TOTAL MARKS:", y=500, x=20, width=150),
        line("1100", y=500, x=190, width=60),
        line("MATHEMATICS", y=300, x=20),
        line("141", y=300, x=600, width=45),
    ], "matric")
    assert fields == {"passing_year": 2022, "obtained_marks": 1024, "total_marks": 1100}


def test_matric_overall_result_statement_beats_subject_table_numbers():
    fields, _ = parse_academic([
        line("SECONDARY SCHOOL CERTIFICATE (ANNUAL) EXAMINATION, 2020"),
        line("Urdu 150 61 62 123", y=200),
        line("English 150 69 62 131", y=240),
        line("The candidate secured 972/1100 marks and Grade A+", y=600),
    ], "matric")
    assert fields["obtained_marks"] == 972
    assert fields["total_marks"] == 1100
    assert fields["passing_year"] == 2020


def test_subject_mark_is_not_returned_when_overall_total_is_unavailable():
    fields, _ = parse_academic([
        line("SECONDARY SCHOOL CERTIFICATE ANNUAL EXAMINATION, 2020"),
        line("MARKS OBTAINED", y=200, x=300, width=180),
        line("150", y=230, x=330, width=45),
    ], "matric")
    assert fields["obtained_marks"] is None
    assert fields["total_marks"] is None


def test_inter_group_geometry_and_split_summary_fields():
    fields, _ = parse_academic([
        line("INTERMEDIATE PART I & II (FIRST ANNUAL) EXAMINATION, 2024", y=40),
        line("GROUP", y=90, x=40, width=100),
        line("PRE-ENGINEERING", y=90, x=220, width=220),
        line("MARKS", y=400, x=400, width=100),
        line("OBTAINED", y=430, x=400, width=130),
        line("835", y=465, x=420, width=60),
        line("TOTAL MARKS:", y=540, x=30, width=160),
        line("1100", y=540, x=210, width=70),
        line("PHYSICS 200 153", y=300),
    ], "inter")
    assert fields["inter_qualification"] == "FSc Pre-Engineering"
    assert fields["passing_year"] == 2024
    assert fields["obtained_marks"] == 835
    assert fields["total_marks"] == 1100


def test_inter_general_science_requires_group_context():
    grouped, _ = parse_academic([
        line("INTERMEDIATE PART I & II EXAMINATION, 2022"),
        line("GROUP", y=50, x=10, width=90),
        line("GENERAL SCIENCE", y=50, x=180, width=200),
    ], "inter")
    subject_only, _ = parse_academic([
        line("INTERMEDIATE PART I & II EXAMINATION, 2022"),
        line("GENERAL SCIENCE", y=300),
    ], "inter")
    assert grouped["inter_qualification"] == "General Science"
    assert subject_only["inter_qualification"] is None


def test_cnic_invalid_number_is_not_extracted():
    fields, _, _ = parse_cnic([line("National Identity Card"), line("Identity Number 12345-123-1")])
    assert fields["cnic"] is None


def cnic_line(text, x, y, confidence=0.9, width=180):
    return {"text": text, "confidence": confidence, "box": [[x, y], [x + width, y], [x + width, y + 24], [x, y + 24]]}


def test_cnic_exact_name_and_father_labels_do_not_collide():
    fields, _, _ = parse_cnic([
        cnic_line("Name", 20, 20), cnic_line("Muhammad Ahmad", 20, 55),
        cnic_line("Father Name", 20, 95), cnic_line("Muhammad Zahid", 20, 130),
    ])
    assert fields["name"] == "Muhammad Ahmad"
    assert fields["father_name"] == "Muhammad Zahid"


def test_cnic_apostrophe_label_and_gender_country_layout():
    fields, _, diagnostics = parse_cnic([
        cnic_line("Name", 20, 20), cnic_line("Muhammad Ahmad", 20, 55),
        cnic_line("Father's Name", 20, 95), cnic_line("Muhammad Zahid", 20, 130),
        cnic_line("Gender Country of Stay", 20, 170, width=260), cnic_line("M Pakistan", 20, 205),
    ])
    assert fields["name"] == "Muhammad Ahmad"
    assert fields["father_name"] == "Muhammad Zahid"
    assert fields["gender"] == "male"
    assert diagnostics["gender"]["reason"] == "directly_below_label"


def test_cnic_spatial_columns_associate_values_with_their_own_labels():
    fields, _, _ = parse_cnic([
        cnic_line("Name", 20, 20, width=100), cnic_line("Father Name", 420, 20, width=160),
        cnic_line("Muhammad Ahmad", 20, 60), cnic_line("Muhammad Zahid", 420, 60),
    ])
    assert fields["name"] == "Muhammad Ahmad"
    assert fields["father_name"] == "Muhammad Zahid"


def test_cnic_merged_gender_tokens():
    male, _, _ = parse_cnic([cnic_line("Gender Country of Stay", 20, 20, width=260), cnic_line("MPakistan", 20, 60)])
    female, _, _ = parse_cnic([cnic_line("Gender Country of Stay", 20, 20, width=260), cnic_line("FPakistan", 20, 60)])
    assert male["gender"] == "male"
    assert female["gender"] == "female"


def test_cnic_and_dob_merged_into_one_ocr_item_are_split_without_digit_guessing():
    fields, confidence, diagnostics = parse_cnic([
        cnic_line("Identity Number", 440, 660, width=330),
        cnic_line("Date of Birth", 820, 660, width=225),
        cnic_line("33303-1567470-507.07.2004", 455, 705, confidence=0.9998, width=605),
    ])
    assert fields["cnic"] == "33303-1567470-5"
    assert fields["date_of_birth"] == "2004-07-07"
    assert confidence["cnic"] == 0.9998
    assert diagnostics["cnic"]["reason"] == "combined_cnic_dob_ocr_item"
    assert diagnostics["date_of_birth"]["reason"] == "combined_cnic_dob_ocr_item"
