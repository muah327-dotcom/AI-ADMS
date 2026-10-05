# Vercel Preview deployment preparation

This repository uses two Vercel projects:

1. The existing frontend project remains rooted at `frontend/`.
2. The backend project is changed to a repository-root **Services** project containing the public Express service and the private RapidOCR FastAPI service.

No top-level rewrite targets `rapidocr`, so it has no public route. Express reaches it through the `RAPIDOCR_SERVICE_URL` private service binding. FastAPI additionally requires `OCR_INTERNAL_SERVICE_SECRET` in production.

## Backend Services project

1. Open the existing backend project in Vercel.
2. Open **Settings → Build and Deployment**.
3. Change **Root Directory** from `backend` to the repository root (`./`).
4. Set **Framework Preset** to **Services**.
5. Confirm the project reads the repository-root `vercel.json`.
6. Open **Settings → Functions** and enable **Fluid Compute**.
7. Under **Functions → Advanced Settings → Function CPU**, select **Performance (4 GB / 2 vCPU)** on Pro or Enterprise. Hobby is limited to Standard (2 GB / 1 vCPU).
8. Add `VERCEL_SUPPORT_LARGE_FUNCTIONS=1` to Preview and Production. Add `VERCEL_ANALYZE_BUILD_OUTPUT=1` to Preview for the first bundle inspection.
9. Do not add any rewrite or domain for the `rapidocr` service.

The committed configuration gives Express 210 seconds and RapidOCR 180 seconds. It excludes tests, caches, and local diagnostic material from the OCR function without excluding RapidOCR or PP-OCRv6 model assets.

## Private temporary Blob store

1. In the backend Services project, open **Storage**.
2. Choose **Create Database → Blob**.
3. Set access to **Private**. Public Blob stores are not acceptable for identity documents.
4. Connect the store to Preview and Production environments.
5. Confirm Vercel created `BLOB_STORE_ID` and `BLOB_READ_WRITE_TOKEN`. Never add either variable to the frontend project or any `VITE_` variable.
6. Generate a random `CRON_SECRET` of at least 16 characters and add it to Preview and Production. Vercel sends its value as the Bearer token when invoking the configured cron.
7. Keep the daily `/api/ocr/cleanup-temp` backup cron enabled. It runs at 03:00 UTC and is compatible with the Hobby plan.

Temporary paths contain only an opaque UUID and extension. Successful and failed OCR calls attempt immediate deletion. The daily job is fallback cleanup for abandoned `ocr-temp/` objects; immediate request cleanup remains the primary deletion path.

## Backend environment variables

Configure Preview first, then Production after validation:

```text
MONGODB_URI=<existing value>
JWT_SECRET=<existing value>
FRONTEND_ORIGIN=<frontend preview/production origin>
OCR_TRANSPORT=blob
RAPIDOCR_REQUEST_TIMEOUT_MS=150000
OCR_OBJECT_REFERENCE_SECRET=<new independent random 32+ byte secret>
OCR_INTERNAL_SERVICE_SECRET=<new independent random 32+ byte secret>
ENVIRONMENT=production
RAPIDOCR_DEBUG=false
RAPIDOCR_DEBUG_INCLUDE_TEXT=false
VERCEL_SUPPORT_LARGE_FUNCTIONS=1
VERCEL_ANALYZE_BUILD_OUTPUT=1
```

`RAPIDOCR_SERVICE_URL` is injected by the service binding. Do not set it to localhost on Vercel. The Blob connection supplies `BLOB_STORE_ID` and `BLOB_READ_WRITE_TOKEN`.

## Frontend project

Keep its root directory as `frontend/` and its Vite framework settings unchanged. Configure:

```text
VITE_API_URL=https://<backend-preview-domain>/api
VITE_OCR_PROVIDER=rapidocr
VITE_OCR_TRANSPORT=blob
VITE_OCR_DEBUG=false
```

Redeploy the frontend after changing any `VITE_` variable because Vite embeds these values at build time.

## Preview validation order

1. Create the private Blob store and environment variables.
2. Deploy the backend Services project as a Preview deployment.
3. Confirm `/api/health` works and the deployment lists separate `backend` and `rapidocr` resources.
4. Confirm there is no public route to the FastAPI `/ocr` endpoint.
5. Point a frontend Preview deployment at the backend Preview URL.
6. Test CNIC, Matric, Intermediate, wrong-document rejection, partial extraction, timeout/error messaging, manual editing, and explicit profile submission.
7. Inspect Blob storage after success and failure; processed objects should be deleted and abandoned objects should disappear after retention cleanup.
8. Inspect Function bundle output, cold-start time, peak memory, duration, and HTTP 413/504 rates.
9. Do not promote the Preview until these checks pass.

## Important existing payload limitation

Blob transport keeps OCR image bytes out of both Functions. The existing ADMS final document persistence still sends `file_data` as base64 JSON to Express because changing persistence or database schemas is outside this deployment task. A sufficiently large final document can therefore still exceed Vercel's 4.5 MB Function request limit even though OCR transport succeeds. Resolving that requires a separately approved redesign of final document persistence; it must not be confused with the temporary OCR store.
