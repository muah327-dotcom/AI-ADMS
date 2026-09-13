# AI-Enhanced Admission Management System

A full-stack university admission management system with AI-powered OCR document processing, eligibility enforcement, and automated merit list generation.

## Features

### Student
- **OCR Document Upload**: Extract data from CNIC, Matric, and Intermediate certificates using Tesseract.js (client-side, 2-pass with canvas preprocessing)
- **Eligibility Checking**: Real-time verification of minimum percentage and intermediate qualification requirements
- **Online Application**: Submit applications with program priority selection (max 4)
- **Application Tracking**: Real-time status updates
- **Merit List Access**: View merit rankings and fee challans
- **Fee Payment**: Upload paid fee challan receipts for verification

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
cd projectabc
```

2. **Install dependencies**
```bash
npm install
cd frontend && npm install && cd ..
cd backend && npm install && cd ..
```

3. **Set up environment variables**

Create `backend/.env`:
```env
MONGODB_URI=your_mongodb_atlas_connection_string
JWT_SECRET=your_jwt_secret_key_here
PORT=3001
```

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
projectabc/
├── backend/
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
│   └── package.json
├── frontend/
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
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── index.html
│   ├── package.json
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

**Supported document types:**
- CNIC / B-Form — identity verification, auto-fills name, father name, DOB, gender, address
- Recent Photograph — passport-size photo
- Matric Certificate — extracts marks, board, passing year
- Intermediate Certificate — extracts qualification, marks, board, passing year
- Transcript — optional detailed marks
- Domicile Certificate — optional

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

## Security

- JWT-based authentication with bcrypt password hashing
- Role-based access control (student, department_admin, admin)
- Department-scoped authorization for department admins
- Input validation with express-validator
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
