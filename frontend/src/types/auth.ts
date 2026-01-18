export interface User {
  id: string;
  email: string;
  name: string;
  role: 'STUDENT' | 'TEACHER' | 'ADMIN';
  studentId?: string;
  teacherId?: string;
  phone?: string;
  createdAt: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  studentId?: string;
  teacherId?: string;
  role?: 'STUDENT' | 'TEACHER' | 'ADMIN';
  phone?: string;
}
