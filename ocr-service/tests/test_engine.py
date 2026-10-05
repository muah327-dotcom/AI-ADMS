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
