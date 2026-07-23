export interface SubjectResult {
  subjectCode?: string;
  subjectName: string;
  result: string; // e.g. "PASS", "FAIL", "85/100", "A+", "S", "P", "F"
  internalMarks?: string;
  externalMarks?: string;
  totalMarks?: string;
  grade?: string;
  credits?: string;
}

export interface StudentRecord {
  id: string;
  usn: string;
  name: string;
  college?: string;
  semester?: string;
  examination?: string;
  sgpa?: string;
  cgpa?: string;
  status?: string; // Overall status e.g. "PASS", "FAIL", "FIRST CLASS WITH DISTINCTION"
  subjects: SubjectResult[];
  uploadedAt: string;
  imageUrl?: string; // Data URL or reference
  notes?: string;
}

export interface ExtractionResponse {
  success: boolean;
  students?: Omit<StudentRecord, 'id' | 'uploadedAt'>[];
  error?: string;
  rawText?: string;
}
