from types import SimpleNamespace
import numpy as np

from ocr.engine import RapidOcrEngine


def test_normalizes_rapidocr_numpy_arrays_without_boolean_evaluation():
    result = SimpleNamespace(
        txts=np.array(["National Identity Card", "35202-1234567-1"], dtype=object),
        scores=np.array([0.96, 0.93], dtype=np.float32),
        boxes=np.array([
            [[10, 10], [210, 10], [210, 40], [10, 40]],
            [[10, 60], [210, 60], [210, 90], [10, 90]],
        ], dtype=np.float32),
    )

    lines = RapidOcrEngine._normalize_result(result)

    assert [line["text"] for line in lines] == ["National Identity Card", "35202-1234567-1"]
    assert lines[0]["confidence"] == 0.96
    assert lines[0]["box"] == [[10.0, 10.0], [210.0, 10.0], [210.0, 40.0], [10.0, 40.0]]


def test_normalizes_legacy_tuple_with_numpy_rows():
    rows = np.array([
        [np.array([[0, 0], [10, 0], [10, 10], [0, 10]]), "SSC", 0.91],
    ], dtype=object)

    lines = RapidOcrEngine._normalize_result((rows, None))

    assert len(lines) == 1
    assert lines[0]["text"] == "SSC"


def test_lower_confidence_fallback_does_not_replace_valid_primary_name():
    fields, confidence, diagnostics = RapidOcrEngine._merge(
        {"name": "Muhammad Ahmad"}, {"name": 0.96}, {"name": {"reason": "directly_below_label"}},
        {"name": "Muhammad Ahmed"}, {"name": 0.61}, {"name": {"reason": "ordered_text_after_exact_label"}},
    )
    assert fields["name"] == "Muhammad Ahmad"
    assert confidence["name"] == 0.96
    assert diagnostics["name"]["reason"] == "directly_below_label"


def test_academic_fallback_does_not_replace_valid_primary_marks_pair():
    fields, confidence, _ = RapidOcrEngine._merge(
        {"passing_year": 2022, "obtained_marks": 972, "total_marks": 1100},
        {"passing_year": 0.82, "obtained_marks": 0.82, "total_marks": 0.82}, {},
        {"passing_year": 2022, "obtained_marks": None, "total_marks": None},
        {"passing_year": 0.97, "obtained_marks": 0.97, "total_marks": 0.97}, {},
        "matric",
    )
    assert fields["obtained_marks"] == 972
    assert fields["total_marks"] == 1100
    assert confidence["obtained_marks"] == 0.82


def test_academic_fallback_replaces_incomplete_primary_marks_as_a_pair():
    fields, _, _ = RapidOcrEngine._merge(
        {"passing_year": 2022, "obtained_marks": 123, "total_marks": None},
        {"passing_year": 0.9, "obtained_marks": 0.9, "total_marks": None}, {},
        {"passing_year": 2022, "obtained_marks": 972, "total_marks": 1100},
        {"passing_year": 0.8, "obtained_marks": 0.8, "total_marks": 0.8}, {},
        "matric",
    )
    assert fields["obtained_marks"] == 972
    assert fields["total_marks"] == 1100


def test_parser_filtered_fallback_marks_leave_incomplete_aggregate_empty():
    fields, _, _ = RapidOcrEngine._merge(
        {"passing_year": 2022, "obtained_marks": None, "total_marks": None}, {}, {},
        {"passing_year": 2022, "obtained_marks": None, "total_marks": None},
        {"obtained_marks": 0.98, "total_marks": 0.98}, {}, "matric",
    )
    assert fields["obtained_marks"] is None
    assert fields["total_marks"] is None


def test_fallback_incidental_inter_text_does_not_override_primary_matric_detection():
    detected, scores = RapidOcrEngine._fallback_detection(
        "matric", {"matric": 1, "inter": 0},
        "inter", {"matric": 0, "inter": 1},
    )
    assert detected == "matric"
    assert scores == {"matric": 1, "inter": 0}


def test_engine_reports_each_processing_stage(monkeypatch):
    engine = object.__new__(RapidOcrEngine)
    monkeypatch.setattr("ocr.engine.decode_image", lambda _content: np.zeros((800, 1200, 3), dtype=np.uint8))
    monkeypatch.setattr("ocr.engine.normal_preprocess", lambda image, cnic_mode=False: (image, False))
    monkeypatch.setattr(engine, "_run", lambda _image: [
        {"text": "S.S.C ANNUAL EXAMINATION 2022", "confidence": 0.95,
         "box": [[0, 0], [400, 0], [400, 30], [0, 30]]},
        {"text": "Marks Obtained 972", "confidence": 0.94,
         "box": [[0, 100], [300, 100], [300, 130], [0, 130]]},
        {"text": "Total Marks 1100", "confidence": 0.94,
         "box": [[0, 150], [300, 150], [300, 180], [0, 180]]},
    ])

    result = engine.process(b"unchanged-image-bytes", "matric")

    assert result["detected_type"] == "matric"
    assert result["quality"]["fallback_used"] is False
    assert set(("preprocessing", "ocr_pass_1", "fallback_preprocessing", "fallback_ocr",
                "classification", "parsing", "total")).issubset(result["timing"])
