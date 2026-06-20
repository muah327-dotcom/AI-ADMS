// Simple in-memory data store
export const store = {
  users: [],
  applications: [],
  programs: [
    { id: '1', name: 'BBA', description: 'Business Administration', department: 'Business', duration_years: 4, total_seats: 150, min_percentage: 50, required_subjects: ['Mathematics'], is_active: true },
    { id: '2', name: 'BE Electrical Engineering', description: 'Electrical Engineering', department: 'Engineering', duration_years: 4, total_seats: 60, min_percentage: 65, required_subjects: ['Mathematics', 'Physics'], is_active: true },
    { id: '3', name: 'BS Computer Science', description: 'Computer Science', department: 'Computer Science', duration_years: 4, total_seats: 120, min_percentage: 60, required_subjects: ['Mathematics', 'Physics'], is_active: true }
  ],
  documents: [],
  meritLists: []
};

// Helper to generate IDs
let idCounter = 1;
export const generateId = () => String(idCounter++);
