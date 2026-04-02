-- AI-Enhanced Admission Management System Database Schema for Supabase

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'student' CHECK (role IN ('student', 'admin')),
  cnic VARCHAR(15),
  phone VARCHAR(20),
  address TEXT,
  academic_records JSONB,
  preferences JSONB,
  admission_category VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Programs table
CREATE TABLE programs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  department VARCHAR(255) NOT NULL,
  description TEXT,
  total_seats INTEGER NOT NULL DEFAULT 0,
  merit_seats INTEGER DEFAULT 0,
  quota_seats INTEGER DEFAULT 0,
  self_finance_seats INTEGER DEFAULT 0,
  min_percentage DECIMAL(5,2) NOT NULL,
  required_subjects TEXT[],
  duration_years INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Applications table
CREATE TABLE applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES users(id) ON DELETE CASCADE,
  program_id UUID REFERENCES programs(id) ON DELETE CASCADE,
  academic_records JSONB,
  documents JSONB,
  priority INTEGER DEFAULT 1 CHECK (priority BETWEEN 1 AND 5),
  extracurriculars TEXT,
  personal_statement TEXT,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'approved', 'rejected', 'waitlisted')),
  admission_category VARCHAR(50),
  merit_rank INTEGER,
  application_date TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(student_id, program_id)
);

-- Application tracking table
CREATE TABLE application_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL,
  notes TEXT,
  timestamp TIMESTAMP DEFAULT NOW(),
  updated_by UUID REFERENCES users(id)
);

-- Merit list table
CREATE TABLE merit_list (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
  student_id UUID REFERENCES users(id) ON DELETE CASCADE,
  program_id UUID REFERENCES programs(id) ON DELETE CASCADE,
  rank INTEGER NOT NULL,
  score DECIMAL(5,2) NOT NULL,
  category VARCHAR(50) NOT NULL CHECK (category IN ('merit', 'quota', 'self_finance')),
  academic_percentage DECIMAL(5,2),
  status VARCHAR(50) DEFAULT 'selected' CHECK (status IN ('selected', 'waitlisted')),
  generated_at TIMESTAMP DEFAULT NOW()
);

-- Extracted documents table (for OCR)
CREATE TABLE extracted_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  document_type VARCHAR(50) NOT NULL,
  extracted_data JSONB,
  raw_text TEXT,
  file_url TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_cnic ON users(cnic);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_applications_student ON applications(student_id);
CREATE INDEX idx_applications_program ON applications(program_id);
CREATE INDEX idx_applications_status ON applications(status);
CREATE INDEX idx_merit_list_program ON merit_list(program_id);
CREATE INDEX idx_merit_list_rank ON merit_list(program_id, rank);
CREATE INDEX idx_application_tracking_app ON application_tracking(application_id);

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE merit_list ENABLE ROW LEVEL SECURITY;
ALTER TABLE extracted_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users policies
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Programs policies (public read for active programs)
CREATE POLICY "Anyone can view active programs" ON programs
  FOR SELECT USING (is_active = true);

CREATE POLICY "Only admins can modify programs" ON programs
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Applications policies
CREATE POLICY "Students can view own applications" ON applications
  FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "Students can create applications" ON applications
  FOR INSERT WITH CHECK (student_id = auth.uid());

CREATE POLICY "Admins can view all applications" ON applications
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can update applications" ON applications
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Functions

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_programs_updated_at BEFORE UPDATE ON programs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_applications_updated_at BEFORE UPDATE ON applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data (optional)
INSERT INTO programs (name, department, description, total_seats, merit_seats, quota_seats, self_finance_seats, min_percentage, required_subjects, duration_years) VALUES
('BS Computer Science', 'Computer Science', 'Bachelor of Science in Computer Science', 120, 96, 12, 12, 60.00, ARRAY['Mathematics', 'Physics'], 4),
('BS Software Engineering', 'Computer Science', 'Bachelor of Science in Software Engineering', 80, 64, 8, 8, 60.00, ARRAY['Mathematics', 'Physics'], 4),
('BS Information Technology', 'Information Technology', 'Bachelor of Science in Information Technology', 100, 80, 10, 10, 55.00, ARRAY['Mathematics'], 4),
('BE Electrical Engineering', 'Electrical Engineering', 'Bachelor of Electrical Engineering', 60, 48, 6, 6, 65.00, ARRAY['Mathematics', 'Physics'], 4),
('BBA', 'Business Administration', 'Bachelor of Business Administration', 150, 120, 15, 15, 50.00, ARRAY[], 4),
('BS Psychology', 'Social Sciences', 'Bachelor of Science in Psychology', 50, 40, 5, 5, 50.00, ARRAY[], 4);
