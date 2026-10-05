from app import _debug_response, _is_production


RESULT = {
    "debug": {"original_size": "1000x600", "processed_size": "1000x600"},
    "ocr_lines": [{"text": "sensitive", "confidence": 0.9, "box": []}],
    "parser_diagnostics": {"name": {"candidate": "sensitive", "reason": "directly_below_label"}},
}


def test_debug_is_disabled_by_default(monkeypatch):
    monkeypatch.delenv("RAPIDOCR_DEBUG", raising=False)
    monkeypatch.setenv("ENVIRONMENT", "development")
    assert _debug_response(RESULT) is None


def test_debug_metadata_excludes_text_unless_explicitly_enabled(monkeypatch):
    monkeypatch.setenv("ENVIRONMENT", "development")
    monkeypatch.setenv("RAPIDOCR_DEBUG", "true")
    monkeypatch.delenv("RAPIDOCR_DEBUG_INCLUDE_TEXT", raising=False)
    debug = _debug_response(RESULT)
    assert "ordered_ocr_lines" not in debug
    assert "parser_candidates" not in debug


def test_sensitive_debug_requires_both_flags_and_is_disabled_in_production(monkeypatch):
    monkeypatch.setenv("RAPIDOCR_DEBUG", "true")
    monkeypatch.setenv("RAPIDOCR_DEBUG_INCLUDE_TEXT", "true")
    monkeypatch.setenv("ENVIRONMENT", "development")
    assert _debug_response(RESULT)["ordered_ocr_lines"][0]["text"] == "sensitive"
    monkeypatch.setenv("ENVIRONMENT", "production")
    assert _debug_response(RESULT) is None


def test_production_detection_is_case_and_whitespace_insensitive(monkeypatch):
    monkeypatch.setenv("ENVIRONMENT", " Production ")
    assert _is_production() is True
    assert _debug_response(RESULT) is None
