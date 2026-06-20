# Frontend - AI-Enhanced Admission Management System

## Overview

This is the frontend application for the GGC Township AI-Enhanced Admission Management System. Built with React and modern web technologies, it provides a comprehensive platform for students to apply for admission programs and administrators to manage the entire admission process.

## Tech Stack

- **Framework**: React 18.2.0 with Vite
- **Styling**: Tailwind CSS with PostCSS
- **Routing**: React Router DOM
- **State Management**: React Context API
- **Charts**: Chart.js with React-Chartjs-2
- **Icons**: Lucide React
- **Animations**: Framer Motion
- **Notifications**: React Hot Toast
- **File Uploads**: React Dropzone
- **OCR**: Tesseract.js
- **Backend Integration**: Supabase
- **Build Tool**: Vite

## Project Structure

```
frontend/
├── public/
│   └── logo.png                 # Application logo
├── src/
│   ├── components/
│   │   ├── Admin/               # Admin-specific components
│   │   │   ├── AdminAnalytics.jsx      # Analytics dashboard
│   │   │   ├── AllApplications.jsx     # View all student applications
│   │   │   ├── ManagePrograms.jsx      # CRUD operations for programs
│   │   │   └── StudentManagement.jsx   # Manage student accounts
│   │   ├── Applications/        # Application management
│   │   │   ├── Applications.jsx         # List user's applications
│   │   │   ├── ApplicationTracking.jsx  # Track specific application
│   │   │   └── NewApplication.jsx       # Create new application
│   │   ├── Auth/                # Authentication components
│   │   │   ├── Login.jsx               # User login
│   │   │   └── Register.jsx            # User registration
│   │   ├── Dashboard/           # Dashboard components
│   │   │   ├── AdminDashboard.jsx      # Admin overview
│   │   │   └── StudentDashboard.jsx    # Student overview
│   │   ├── Documents/           # Document management
│   │   │   └── DocumentUpload.jsx      # Upload academic documents
│   │   ├── Landing/             # Public pages
│   │   │   └── LandingPage.jsx         # Homepage
│   │   ├── Layout/              # Layout components
│   │   │   └── Layout.jsx              # Main app layout with sidebar
│   │   ├── Legal/               # Legal pages
│   │   │   ├── ContactPage.jsx         # Contact information
│   │   │   ├── PrivacyPolicy.jsx       # Privacy policy
│   │   │   └── TermsOfService.jsx      # Terms of service
│   │   ├── MeritList/           # Merit list components
│   │   │   └── MeritList.jsx           # View merit rankings
│   │   ├── Recommendations/     # AI recommendations
│   │   │   └── ProgramRecommendations.jsx # AI-powered program suggestions
│   │   └── Settings/            # User settings
│   │       └── Settings.jsx            # Account settings
│   ├── contexts/
│   │   └── AuthContext.jsx      # Authentication context
│   ├── hooks/
│   │   └── useAuth.js           # Authentication hook
│   ├── config/
│   │   └── supabase.js          # Supabase configuration
│   ├── App.jsx                  # Main app component with routing
│   ├── main.jsx                 # App entry point
│   └── index.css                # Global styles
├── index.html                   # HTML template
├── package.json                 # Dependencies and scripts
├── vite.config.js               # Vite configuration
├── tailwind.config.js           # Tailwind configuration
└── postcss.config.js            # PostCSS configuration
```

## Component Workflow

### Authentication Flow

1. **LandingPage** (`/`)
   - Public homepage with system overview
   - Navigation to login/register

2. **Login/Register** (`/login`, `/register`)
   - JWT-based authentication
   - Token stored in localStorage
   - Role-based redirection (admin/student)

3. **AuthContext**
   - Manages user state and authentication
   - Provides login, register, logout functions
   - Role checking (isAdmin, isAuthenticated)

### Student Workflow

1. **StudentDashboard** (`/dashboard`)
   - Welcome message and quick stats
   - Application status overview (total, pending, approved, rejected)
   - Recent applications list
   - AI recommendations preview
   - Quick action buttons

2. **Applications Management**
   - **Applications** (`/dashboard/applications`): List all user applications with filtering
   - **NewApplication** (`/dashboard/applications/new`): Multi-step application form
   - **ApplicationTracking** (`/dashboard/applications/track/:id`): Detailed application view

3. **Document Upload** (`/dashboard/documents`)
   - CNIC and academic record uploads
   - OCR processing for document data extraction
   - File validation and preview

4. **Program Recommendations** (`/dashboard/recommendations`)
   - AI-powered program suggestions based on user profile
   - Match percentage scores
   - Detailed program information

5. **Merit List** (`/dashboard/merit-list`)
   - View personal ranking
   - Program-specific merit lists
   - Admission status tracking

6. **Settings** (`/dashboard/settings`)
   - Profile management
   - Account preferences

### Admin Workflow

1. **AdminDashboard** (`/admin`)
   - System-wide statistics and KPIs
   - Charts: Application trends, admission categories, program distribution
   - Recent applications overview
   - Export functionality

2. **Analytics** (`/admin/analytics`)
   - Detailed analytics and reporting
   - Advanced charts and data visualization

3. **All Applications** (`/admin/applications`)
   - View and manage all student applications
   - Status updates and reviews
   - Bulk operations

4. **Manage Programs** (`/admin/programs`)
   - CRUD operations for admission programs
   - Program configuration and requirements

5. **Student Management** (`/admin/students`)
   - View and manage student accounts
   - User role management
   - Account status controls

6. **Merit Lists** (`/admin/merit-list`)
   - Generate and manage merit lists
   - Ranking algorithms and criteria
   - Admission decision tools

### Shared Components

1. **Layout**
   - Responsive sidebar navigation
   - Role-based menu items
   - User profile dropdown
   - Mobile-friendly design

2. **Legal Pages**
   - Privacy Policy, Terms of Service, Contact
   - Static content pages

## Key Features

### For Students

- **AI-Powered Recommendations**: Get personalized program suggestions
- **Document Management**: Upload and manage academic documents with OCR
- **Application Tracking**: Real-time status updates and detailed views
- **Merit List Access**: Check admission rankings and status
- **Multi-Program Applications**: Apply to multiple programs simultaneously

### For Administrators

- **Comprehensive Analytics**: Real-time dashboards with charts and KPIs
- **Application Management**: Review, approve, and reject applications
- **Program Management**: Create and configure admission programs
- **Student Oversight**: Manage user accounts and permissions
- **Merit List Generation**: Automated ranking and list generation
- **Data Export**: CSV export functionality for reporting

### Technical Features

- **Responsive Design**: Mobile-first approach with dark theme
- **Real-time Updates**: Live data fetching and state management
- **File Processing**: OCR integration for document data extraction
- **Secure Authentication**: JWT-based auth with role-based access
- **API Integration**: RESTful API communication with backend
- **Error Handling**: Comprehensive error states and user feedback
- **Loading States**: Skeleton screens and progress indicators

## Development Setup

### Prerequisites

- Node.js 16+
- npm or yarn

### Installation

```bash
cd frontend
npm install
```

### Development

```bash
npm run dev
```

Runs the app in development mode on `http://localhost:5173`

### Build

```bash
npm run build
```

Builds the app for production to the `dist` folder

### Preview

```bash
npm run preview
```

Previews the production build locally

## API Integration

The frontend communicates with a backend API running on `http://localhost:3001`. Key endpoints include:

- `/api/auth/*` - Authentication endpoints
- `/api/applications/*` - Application management
- `/api/admin/*` - Admin-only operations
- `/api/recommendations/*` - AI recommendations
- `/api/documents/*` - Document processing
- `/api/merit-list/*` - Merit list operations

## Styling Guidelines

- **Dark Theme**: Primary colors are dark grays (#0f0f0f, #1a1a1a)
- **Accent Colors**: Cyan (#06b6d4) for primary actions, green/red/yellow for status
- **Typography**: Inter font family
- **Spacing**: Tailwind's spacing scale
- **Components**: Consistent border radius (rounded-lg, rounded-xl)
- **Animations**: Framer Motion for smooth transitions

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Contributing

1. Follow the existing component structure
2. Use TypeScript for new components when possible
3. Maintain dark theme consistency
4. Add proper error handling and loading states
5. Test on multiple screen sizes
6. Follow React best practices and hooks guidelines
