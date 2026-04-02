# AI-Enhanced Admission Management System

A comprehensive, full-stack admission management system powered by AI for automating university admissions, including OCR-based document processing, AI program recommendations, and automated merit list generation.

## Features

### Student Features
- **Document Upload with OCR**: Automatically extract data from CNIC and academic certificates using Tesseract OCR
- **AI Program Recommendations**: Get personalized program recommendations based on academic profile
- **Eligibility Checking**: Real-time verification of program eligibility requirements
- **Online Application**: Submit applications with priority selection
- **Application Tracking**: Real-time status updates and timeline tracking
- **Merit List Access**: View merit rankings and admission status

### Admin Features
- **Comprehensive Dashboard**: Visual analytics with Chart.js charts
- **Application Management**: Review, approve, or reject applications
- **Automated Merit List Generation**: Generate merit lists with configurable quotas
- **Student Categorization**: Automatic grouping into merit, quota, and self-finance categories
- **Program Management**: Create and manage academic programs
- **Advanced Analytics**: 
  - Monthly application trends
  - Program-wise distribution
  - Performance insights by percentage ranges
  - Seat occupancy tracking
- **Export Capabilities**: Download reports in CSV format

## Tech Stack

### Frontend
- React 18 with Vite
- React Router for navigation
- Tailwind CSS for styling
- Chart.js + react-chartjs-2 for analytics
- Lucide React for icons
- React Hot Toast for notifications
- Tesseract.js for client-side OCR

### Backend
- Node.js with Express
- JWT authentication
- Multer for file uploads
- Tesseract.js for OCR processing
- Express Validator for input validation

### Database
- Supabase (PostgreSQL)
- Row Level Security (RLS) policies
- UUID primary keys
- JSONB for flexible data storage

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Supabase account (free tier works)

### Installation

1. **Clone the repository**
```bash
cd ai-admission-system
```

2. **Install dependencies**
```bash
npm install
cd frontend && npm install
cd ../backend && npm install
```

3. **Set up environment variables**

Create `backend/.env`:
```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
JWT_SECRET=your_jwt_secret_key_here
PORT=3001
```

Create `frontend/.env`:
```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. **Set up the database**
- Go to your Supabase dashboard
- Open the SQL Editor
- Run the contents of `database/schema.sql`

5. **Start the development servers**

From the root directory:
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

6. **Access the application**
- Frontend: http://localhost:5173
- Backend API: http://localhost:3001

## Project Structure

```
ai-admission-system/
├── backend/
│   ├── config/
│   │   └── supabase.js
│   ├── middleware/
│   │   └── auth.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── applications.js
│   │   ├── admin.js
│   │   ├── merit.js
│   │   ├── analytics.js
│   │   ├── ocr.js
│   │   └── recommendations.js
│   ├── server.js
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Auth/
│   │   │   │   ├── Login.jsx
│   │   │   │   └── Register.jsx
│   │   │   ├── Dashboard/
│   │   │   │   ├── StudentDashboard.jsx
│   │   │   │   └── AdminDashboard.jsx
│   │   │   ├── Applications/
│   │   │   │   ├── Applications.jsx
│   │   │   │   ├── NewApplication.jsx
│   │   │   │   └── ApplicationTracking.jsx
│   │   │   ├── Documents/
│   │   │   │   └── DocumentUpload.jsx
│   │   │   ├── Recommendations/
│   │   │   │   └── ProgramRecommendations.jsx
│   │   │   ├── MeritList/
│   │   │   │   └── MeritList.jsx
│   │   │   ├── Admin/
│   │   │   │   ├── AdminAnalytics.jsx
│   │   │   │   ├── ManagePrograms.jsx
│   │   │   │   ├── AllApplications.jsx
│   │   │   │   └── StudentManagement.jsx
│   │   │   └── Layout/
│   │   │       └── Layout.jsx
│   │   ├── contexts/
│   │   │   └── AuthContext.jsx
│   │   ├── hooks/
│   │   │   └── useAuth.js
│   │   ├── config/
│   │   │   └── supabase.js
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── postcss.config.js
├── database/
│   └── schema.sql
├── package.json
└── README.md
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

### Applications (Student)
- `GET /api/applications/programs` - List available programs
- `GET /api/applications/programs/:id/eligibility` - Check eligibility
- `POST /api/applications` - Submit new application
- `GET /api/applications/my-applications` - Get my applications
- `GET /api/applications/tracking/:id` - Get application tracking

### Admin
- `GET /api/admin/dashboard-stats` - Dashboard statistics
- `GET /api/admin/all-applications` - List all applications
- `PATCH /api/admin/applications/:id/status` - Update application status
- `GET /api/admin/students` - List all students
- `POST /api/admin/programs` - Create program
- `PATCH /api/admin/programs/:id` - Update program

### Merit List
- `POST /api/merit/generate/:programId` - Generate merit list
- `GET /api/merit/program/:programId` - Get merit list for program
- `GET /api/merit/student/my-position` - Get student's merit position

### Analytics
- `GET /api/analytics/admissions-by-category` - Category distribution
- `GET /api/analytics/applications-by-program` - Program distribution
- `GET /api/analytics/performance-insights` - Performance data
- `GET /api/analytics/monthly-trends` - Monthly trends
- `GET /api/analytics/seat-occupancy` - Seat occupancy data

### OCR
- `POST /api/ocr/extract` - Extract data from document
- `POST /api/ocr/verify-cnic` - Verify CNIC
- `GET /api/ocr/my-documents` - Get extracted documents

### Recommendations
- `GET /api/recommendations/programs` - Get program recommendations
- `GET /api/recommendations/best-fit` - Get best matching programs
- `POST /api/recommendations/explain-match` - Explain match reasoning

## AI Features

### OCR Document Processing
The system uses Tesseract.js to extract information from:
- CNIC (Computerized National Identity Card)
- Academic certificates
- Other supporting documents

### AI Program Recommendations
The recommendation engine considers:
- Academic percentage
- Subject combinations
- Program requirements
- Historical admission data

Calculates a match score (0-100%) based on:
- 40% - Percentage requirement match
- 40% - Subject requirement match
- 20% - Subject score average

### Automated Merit List Generation
Configurable quota system:
- Merit seats (default 80%)
- Quota seats (default 10%)
- Self-finance seats (default 10%)

Scoring formula:
- 70% - Academic percentage
- 30% - Subject scores average
- Bonus points for extracurriculars

## Responsive Design

The application is fully responsive with breakpoints for:
- Mobile: < 640px
- Tablet: 640px - 1024px
- Desktop: > 1024px
- Large screens: > 1280px

## Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Row Level Security (RLS) in Supabase
- Input validation with express-validator
- File upload size limits
- CORS protection

## License

This project is developed for educational purposes as a Final Year Project.

## Contributors

- Rida Nadeem - Frontend Development, UI/UX, AI Integration
- Hafiz Awais - Backend Development, Database Design, Deployment
- Muhammad Ahmad - System Architecture, AI Logic, Testing

Punjab University College of Information Technology
