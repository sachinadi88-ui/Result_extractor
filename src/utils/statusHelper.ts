import { StudentRecord, SubjectResult } from '../types';

export function isSubjectPass(s: SubjectResult | any): boolean {
  if (!s) return true;
  const res = String(s.result || '').toUpperCase().trim();
  const grade = String(s.grade || '').toUpperCase().trim();

  if (
    res === 'F' ||
    res === 'FAIL' ||
    res.includes('FAIL') ||
    res === 'AB' ||
    res === 'ABSENT' ||
    res === 'FAIL (F)' ||
    res === 'F1' ||
    res === 'F2' ||
    res === 'F3'
  ) {
    return false;
  }

  if (grade === 'F' || grade === 'FAIL' || grade.includes('FAIL') || grade === 'AB' || grade === 'ABSENT') {
    return false;
  }

  return true;
}

export function isStudentPass(student: Partial<StudentRecord> | any): boolean {
  if (!student) return true;

  // Critical rule: If ANY subject has a fail grade or result, overall status MUST be FAIL!
  if (student.subjects && Array.isArray(student.subjects) && student.subjects.length > 0) {
    const hasFailedSubject = student.subjects.some((s) => !isSubjectPass(s));
    if (hasFailedSubject) {
      return false;
    }
  }

  // Check if student.status explicitly indicates FAIL
  if (student.status && String(student.status).toUpperCase().includes('FAIL')) {
    return false;
  }

  return true;
}

export function getEffectiveStatus(student: Partial<StudentRecord> | any): string {
  return isStudentPass(student) ? 'PASS' : 'FAIL';
}
