# ADMS RapidOCR service

The admission upload flow has three services:

```text
React -> Node/Express -> Python FastAPI -> RapidOCR / PP-OCRv6
```

FastAPI processes image bytes in memory and does not write uploaded documents or OCR output to disk. The RapidOCR engine is created once at startup and reused. Start with one Uvicorn worker because each additional worker loads another model instance.

## Windows PowerShell setup

From `ocr-service`:

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
Copy-Item .env.example .env
python -m uvicorn app:app --host 127.0.0.1 --port 8001
```

In separate PowerShell windows, start Node and React from the repository root:

```powershell
npm run dev:backend
npm run dev:frontend
```

The Node backend requires `RAPIDOCR_SERVICE_URL=http://127.0.0.1:8001` and `RAPIDOCR_REQUEST_TIMEOUT_MS=120000`. The React frontend requires `VITE_OCR_PROVIDER=rapidocr`; its sensitive legacy OCR console diagnostics require both a development build and the explicit `VITE_OCR_DEBUG=true` opt-in. Copy each service's `.env.example` to its local `.env`; never commit real `.env` files.

## OCR service configuration

- `ENVIRONMENT=development` enables local development behavior. Set it to `production` when deployed.
- `HOST=127.0.0.1` and `PORT=8001` are safe local binding defaults.
- `RAPIDOCR_DEBUG=false` disables response diagnostics by default.
- `RAPIDOCR_DEBUG_INCLUDE_TEXT=false` prevents raw OCR text and parser candidates from appearing in diagnostics.

Production mode forcibly disables all debug responses, even if either debug flag is set. Normal API responses never include raw OCR lines or bounding-box text. Application and access logs must contain operational metadata only and must not include uploaded images, names, CNIC numbers, dates of birth, or OCR text.

For an explicit local diagnostic, a developer may run:

```powershell
python compare_poc.py C:\path\to\test-image.jpg --expected cnic
```

This command prints sensitive OCR material to the current terminal and never writes it to disk. Use only with authorized test data in a private development environment.
