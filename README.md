# AI-Enhanced Admission Management System

A full-stack university admission management system with AI-powered OCR document processing, eligibility enforcement, and automated merit list generation.

## Features

### Student
- **OCR Document Upload**: Extract data from CNIC, Matric and Intermediate certificates using Tesseract.js (client-side, two-pass, results merged field by field). Values are corroborated before they are accepted: a field that cannot be verified is left blank rather than filled with a guess, and the percentage is always computed from the marks rather than read off the page
- **Manual Correction**: Matric and Intermediate fields extracted by OCR can be edited by hand before submission, so a misread value doesn't have to be fixed by re-uploading the document
- **Eligibility Checking**: Real-time verification of minimum percentage and intermediate qualification requirements
- **Online Application**: Submit applications with program priority selection (max 4)
- **Application Tracking**: Real-time status updates
- **Merit List Access**: View merit rankings and fee challans
- **Fee Payment**: Upload paid fee challan receipts for verification
- **Profile Lock**: Once a student's profile is verified, the Document Upload page permanently locks — no further uploads or edits are possible, and the submit button reads "Verified"

### Admin
- **Dashboard**: Analytics with Chart.js (application trends, program distribution, performance insights)
- **Application Management**: Review, approve, or reject applications
- **Merit List Generation**: Generate 1st/2nd/3rd merit lists with minimum percentage threshold, max 3 lists per program
- **Student Management**: View total, merit-listed, and registered students with export to CSV
- **Program Management**: Create/edit programs with required qualifications and seat counts
- **Fee Configuration**: Set admission/tuition fees, bank details, and payment deadlines per program
- **Department Management**: Create and manage departments
- **Department Admin Management**: Create and manage department admin accounts

### Department Admin
- Department-scoped access to programs, applications, and merit lists within their assigned department

### Roles
- **Student**: Upload documents, apply to programs, view merit lists
- **Department Admin**: Manage programs and merit lists within their department
- **Admin**: Full system access

## Tech Stack

### Frontend
- React 18 + Vite 5
- React Router DOM 6
- Tailwind CSS 3
- Chart.js 4 + react-chartjs-2
- Tesseract.js 5 (client-side OCR)
- Lucide React (icons)
- React Hot Toast (notifications)
- React Dropzone (file uploads)
- Framer Motion (animations)

### Backend
- Node.js + Express 4
- MongoDB + Mongoose 8
- JWT authentication (bcryptjs)
- Express Validator
- Response compression

### Database
- MongoDB Atlas (cloud hosted)

## Getting Started

### Prerequisites
- Node.js 18+
- MongoDB Atlas account (free tier works)

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd AI-ADMS
```

2. **Install dependencies**
```bash
npm install
```
This installs the root, frontend and backend workspaces together.

3. **Set up environment variables**

Copy the template and fill it in:
```bash
cp backend/.env.example backend/.env
```

The application has no fallback credentials. It will refuse to start until
`MONGODB_URI` and `JWT_SECRET` are set, which is deliberate — a missing variable
should fail loudly rather than silently connect somewhere unintended.

| Variable | Required | Purpose |
|---|---|---|
| `MONGODB_URI` | yes | Connection string, ending in `/admission_system` |
| `JWT_SECRET` | yes | Long random string used to sign auth tokens |
| `PORT` | no | Defaults to 3001 |
| `FRONTEND_ORIGIN` | deployment | Deployed frontend URL, for CORS. Localhost is always allowed |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | deployment | Seeded admin account. Set before deploying anywhere reachable |
| `DNS_SERVERS` | rarely | Only if the local resolver cannot reach Atlas. Leave unset on Vercel |

The frontend reads `VITE_API_URL` (for example `https://your-backend.vercel.app/api`).
Vite inlines it at build time, so changing it needs a rebuild, not a restart.

`backend/.env` is gitignored and must never be committed.

4. **Start the development servers**

```bash
npm run dev
```

Or start individually:
```bash
# Backend
cd backend && npm run dev

# Frontend (in another terminal)
cd frontend && npm run dev
```

5. **Access the application**
- Frontend: http://localhost:5173
- Backend API: http://localhost:3001

## Project Structure

```
AI-ADMS/
├── backend/
│   ├── api/
│   │   └── index.js       # Vercel serverless entry point (wraps server.js)
│   ├── config/
│   │   └── db.js
│   ├── middleware/
│   │   └── auth.js
│   ├── models/
│   │   ├── User.js
│   │   ├── Program.js
│   │   ├── Application.js
│   │   ├── Document.js
│   │   ├── Department.js
│   │   └── Newsletter.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── applications.js
│   │   ├── admin.js
│   │   ├── merit.js
│   │   ├── analytics.js
│   │   └── ocr.js
│   ├── utils/
│   │   └── gridfs.js
│   ├── server.js
│   ├── vercel.json
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── public/
│   │   └── logo.png
│   ├── src/
│   │   ├── components/
│   │   │   ├── Admin/
│   │   │   │   ├── AdminAnalytics.jsx
│   │   │   │   ├── AdminManagement.jsx
│   │   │   │   ├── AllApplications.jsx
│   │   │   │   ├── ManagePrograms.jsx
│   │   │   │   └── StudentManagement.jsx
│   │   │   ├── Applications/
│   │   │   │   ├── Applications.jsx
│   │   │   │   ├── ApplicationTracking.jsx
│   │   │   │   └── NewApplication.jsx
│   │   │   ├── Auth/
│   │   │   │   ├── Login.jsx
│   │   │   │   └── Register.jsx
│   │   │   ├── Common/
│   │   │   │   └── SkeletonLoader.jsx
│   │   │   ├── Dashboard/
│   │   │   │   ├── AdminDashboard.jsx
│   │   │   │   └── StudentDashboard.jsx
│   │   │   ├── Documents/
│   │   │   │   └── DocumentUpload.jsx
│   │   │   ├── Fee/
│   │   │   │   └── FeeChallan.jsx
│   │   │   ├── Landing/
│   │   │   │   └── LandingPage.jsx
│   │   │   ├── Layout/
│   │   │   │   └── Layout.jsx
│   │   │   ├── Legal/
│   │   │   │   ├── ContactPage.jsx
│   │   │   │   ├── PrivacyPolicy.jsx
│   │   │   │   └── TermsOfService.jsx
│   │   │   ├── MeritList/
│   │   │   │   └── MeritList.jsx
│   │   │   └── Settings/
│   │   │       └── Settings.jsx
│   │   ├── contexts/
│   │   │   ├── AuthContext.jsx
│   │   │   └── ThemeContext.jsx
│   │   ├── config/
│   │   │   └── api.js
│   │   ├── hooks/
│   │   │   └── useAuth.js
│   │   ├── tests/
│   │   │   └── DocumentUpload.test.jsx   # see Testing section — not yet runnable
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── index.html
│   ├── package.json
│   ├── vercel.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── postcss.config.js
├── package.json
└── README.md
```

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login user |
| GET | `/api/auth/me` | Get current user profile |
| PUT | `/api/auth/profile` | Update user profile |
| PUT | `/api/auth/change-password` | Change password |
| POST | `/api/auth/upload-avatar` | Upload profile avatar |
| DELETE | `/api/auth/remove-avatar` | Remove profile avatar |
| GET | `/api/auth/avatar/:fileId` | Get avatar by file ID |
| DELETE | `/api/auth/delete-account` | Delete user account |

### Applications (Student)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/applications/programs` | List available programs |
| GET | `/api/applications/programs/:id/eligibility` | Check eligibility (percentage + qualification) |
| POST | `/api/applications` | Submit new application |
| GET | `/api/applications/my-applications` | Get my applications |
| GET | `/api/applications/tracking/:applicationId` | Get application tracking |
| DELETE | `/api/applications/:id` | Delete application |

### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/dashboard-stats` | Dashboard statistics |
| GET | `/api/admin/all-applications` | List all applications |
| GET | `/api/admin/applications/:id` | Get single application details |
| GET | `/api/admin/student/:userId/documents` | Get student's uploaded documents |
| PATCH | `/api/admin/applications/:id/status` | Update application status |
| GET | `/api/admin/all-users` | List all users |
| GET | `/api/admin/students` | List students (total/merit/registered) |
| GET | `/api/admin/students/export` | Export students to CSV |
| GET | `/api/admin/departments` | List all departments |
| POST | `/api/admin/departments` | Create department |
| PATCH | `/api/admin/departments/:id` | Update department |
| DELETE | `/api/admin/departments/:id` | Delete department |
| GET | `/api/admin/department-admins` | List department admins |
| POST | `/api/admin/department-admins` | Create department admin |
| PATCH | `/api/admin/department-admins/:id` | Update department admin |
| DELETE | `/api/admin/department-admins/:id` | Delete department admin |
| GET | `/api/admin/programs` | List programs (department-scoped for dept admins) |
| POST | `/api/admin/programs` | Create program |
| PATCH | `/api/admin/programs/:id` | Update program |
| DELETE | `/api/admin/programs/:id` | Delete program |

### Merit List
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/merit/generate/:programId` | Generate 1st merit list |
| POST | `/api/merit/generate-next/:programId` | Generate 2nd/3rd merit list |
| POST | `/api/merit/reset-merit/:programId` | Reset all merit lists for a program |
| POST | `/api/merit/program-fee/:programId` | Configure fee and deadline |
| GET | `/api/merit/program/:programId` | Get merit list for program |
| GET | `/api/merit/my-fee-challan` | Get student's fee challans |
| POST | `/api/merit/upload-paid-challan/:applicationId` | Upload paid fee receipt |
| PATCH | `/api/merit/verify-fee/:applicationId` | Verify/reject fee payment |
| GET | `/api/merit/student/my-position` | Get student's merit position |
| GET | `/api/merit/all` | Get all merit lists (admin) |

### Analytics
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/analytics/admissions-by-category` | Category distribution |
| GET | `/api/analytics/applications-by-program` | Program distribution |
| GET | `/api/analytics/performance-insights` | Performance data |
| GET | `/api/analytics/monthly-trends` | Monthly trends |
| GET | `/api/analytics/seat-occupancy` | Seat occupancy data |

### OCR
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/ocr/upload-document` | Upload and OCR a document |
| GET | `/api/ocr/my-documents` | Get user's uploaded documents |
| GET | `/api/ocr/my-documents/type/:type` | Get documents by type |
| GET | `/api/ocr/document/:id` | Get single document by ID |
| DELETE | `/api/ocr/my-documents/type/:type` | Delete documents by type |
| DELETE | `/api/ocr/my-documents/:id` | Delete document by ID |

### Public
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/stats/public` | Total applications and applicants count |
| POST | `/api/newsletter/subscribe` | Subscribe to newsletter |
| GET | `/api/health` | Health check |

## OCR Document Processing

Client-side OCR using Tesseract.js with 2-pass processing and canvas preprocessing (upscaling, grayscale, contrast stretching, adaptive thresholding, sharpening).

**Supported document types (Document Upload page):**
- CNIC / B-Form — identity verification, auto-fills name, father name, DOB, gender, address
- Recent Photograph — passport-size photo
- Matric Certificate — extracts marks, board, passing year
- Intermediate Certificate — extracts qualification, marks, board, passing year

All four are compulsory; a student cannot submit their profile until every one is uploaded.
Transcript and Domicile Certificate are defined as optional document types in the data model
and are still recognized by the OCR backend, but are not currently offered as upload options
in the Document Upload UI.

**Name matching:** OCR-extracted names on Matric and Intermediate certificates are not compared against the CNIC/profile for rejection. Mismatches generate informational warnings only. CNIC remains the primary identity document.

## Merit System

- **Merit = Intermediate percentage only** (no matric, no entry test, no weighting)
- **Eligibility = minimum percentage AND intermediate qualification match**
- Up to 3 merit lists per program (1st, 2nd, 3rd)
- Each subsequent list excludes all previously selected students
- Configurable minimum merit threshold per generation
- Fee challan generated automatically for selected students
- Students confirmed after fee payment verification

### Intermediate Qualification Options
FA, FSc Pre-Medical, FSc Pre-Engineering, ICS, I.Com, DAE, Other

## Application Eligibility

Two conditions must both be satisfied:
1. Student's intermediate percentage >= program's minimum percentage
2. Student's intermediate qualification is in the program's required qualifications list

## Responsive Design

- Mobile: < 640px
- Tablet: 640px - 1024px
- Desktop: > 1024px
- Large screens: > 1280px

## Testing

`frontend/src/tests/DocumentUpload.test.jsx` documents a set of OCR-extraction regression
scenarios, but is not runnable yet: it imports `@testing-library/react` and uses
Jest/Vitest-style `describe`/`it`/`expect`, neither of which is currently installed as a
dependency, and there is no `test` script in `frontend/package.json`. Its own comments
describe it as documentation and structure for future integration testing rather than an
active test suite. To make it runnable, add a test runner (e.g. Vitest, which pairs
naturally with Vite) and `@testing-library/react` as dev dependencies, add a `test` script,
and replace the placeholder assertions with real ones against mocked OCR output.

## Deployment

Both `backend/vercel.json` and `frontend/vercel.json` are set up for deployment to
[Vercel](https://vercel.com), and `backend/server.js` detects the Vercel environment
(`process.env.VERCEL`) to run as a serverless function via `backend/api/index.js` instead
of a long-running server.

1. Deploy `backend/` and `frontend/` as two separate Vercel projects (or configure them as
   a monorepo with two apps).
2. On the backend project, set the environment variables from the table above —
   `MONGODB_URI` and `JWT_SECRET` are required, and `ADMIN_EMAIL`/`ADMIN_PASSWORD` and
   `FRONTEND_ORIGIN` should be set before the deployment is reachable by anyone else.
3. On the frontend project, set `VITE_API_URL` to the deployed backend's `/api` URL, then
   trigger a build — this value is inlined at build time, so it can't be changed by
   restarting alone.
4. Confirm `GET /api/health` on the deployed backend reports a connected database before
   relying on the deployment.

## Security

- JWT-based authentication with bcrypt password hashing
- Role-based access control (student, department_admin, admin)
- Department-scoped authorization for department admins
- Input validation with express-validator
- Rate limiting on `/api/auth/login` and `/api/auth/register` to slow brute-force and account-enumeration attempts
- File upload size limits
- CORS protection
- Response compression

## License

This project is developed for educational purposes as a Final Year Project.

## Contributors

- Rida Nadeem — Frontend Development, UI/UX, AI Integration
- Hafiz Awais — Backend Development, Database Design, Deployment
- Muhammad Ahmad — System Architecture, AI Logic, Testing

Punjab University College of Information Technology
