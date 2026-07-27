import { StudentRecord, SubjectResult } from '../types';

export function isSubjectPass(s: SubjectResult | any): boolean {
  if (!s) return true;

  const res = String(s.result || '').toUpperCase().trim();
  const grade = String(s.grade || '').toUpperCase().trim();
  const remarks = String(s.remarks || '').toUpperCase().trim();
  const status = String(s.status || '').toUpperCase().trim();

  // Explicit Fail / Absent / Withheld checks
  const failKeywords = [
    'F',
    'FAIL',
    'A',
    'AB',
    'ABSENT',
    'W',
    'WITHHELD',
    'NE',
    'NOT ELIGIBLE',
    'X',
    'F1',
    'F2',
    'F3',
    'REJECTED',
  ];

  if (
    failKeywords.includes(res) ||
    res.includes('FAIL') ||
    res.includes('ABSENT') ||
    res.includes('WITHHELD') ||
    res.includes('NOT ELIGIBLE')
  ) {
    return false;
  }

  if (
    failKeywords.includes(grade) ||
    grade.includes('FAIL') ||
    grade.includes('ABSENT')
  ) {
    return false;
  }

  if (
    failKeywords.includes(remarks) ||
    remarks.includes('FAIL') ||
    remarks.includes('ABSENT')
  ) {
    return false;
  }

  if (
    failKeywords.includes(status) ||
    status.includes('FAIL') ||
    status.includes('ABSENT')
  ) {
    return false;
  }

  // Numerical evaluation check: total marks < 40 is a fail in standard university grading
  const totalStr = String(s.totalMarks || s.total || '').trim();
  const totalNum = parseFloat(totalStr);
  if (!isNaN(totalNum) && totalNum >= 0 && totalNum < 40) {
    return false;
  }

  // External marks indicator: 'A', 'AB', 'ABSENT', 'FAIL'
  const extStr = String(s.externalMarks || '').toUpperCase().trim();
  if (extStr === 'A' || extStr === 'AB' || extStr === 'ABSENT' || extStr === 'FAIL') {
    return false;
  }

  return true;
}

export function isStudentPass(student: Partial<StudentRecord> | any): boolean {
  if (!student) return false;

  // Check overall student status
  const overallStatus = String(student.status || '').toUpperCase().trim();
  if (
    overallStatus.includes('FAIL') ||
    overallStatus === 'F' ||
    overallStatus.includes('REJECT') ||
    overallStatus.includes('WITHHELD') ||
    overallStatus.includes('ABSENT')
  ) {
    return false;
  }

  // Check subject-wise status
  if (student.subjects && Array.isArray(student.subjects) && student.subjects.length > 0) {
    const hasFailedSubject = student.subjects.some((s: any) => !isSubjectPass(s));
    if (hasFailedSubject) {
      return false;
    }
  } else {
    if (!overallStatus.includes('PASS') && overallStatus !== 'P') {
      return false;
    }
  }

  return true;
}

export function getEffectiveStatus(student: Partial<StudentRecord> | any): string {
  return isStudentPass(student) ? 'PASS' : 'FAIL';
}

// Helper to calculate total marks across all subjects for a student
export const getStudentTotalMarks = (student: StudentRecord): { display: string; sum: number; hasValid: boolean } => {
  let sum = 0;
  let maxSum = 0;
  let hasValid = false;
  let hasDenominator = false;

  student.subjects?.forEach((s) => {
    if (s.totalMarks) {
      // Handles formats like "85/100" or just "85"
      const parts = s.totalMarks.split('/');
      const obtainedStr = parts[0].trim();
      const val = parseInt(obtainedStr, 10);
      if (!isNaN(val)) {
        sum += val;
        hasValid = true;

        if (parts.length > 1) {
          const maxStr = parts[1].trim();
          const maxVal = parseInt(maxStr, 10);
          if (!isNaN(maxVal)) {
            maxSum += maxVal;
            hasDenominator = true;
          }
        }
      }
    }
  });

  if (!hasValid) {
    return { display: '-', sum: 0, hasValid: false };
  }

  if (hasDenominator && maxSum > 0) {
    return { display: `${sum}/${maxSum}`, sum, hasValid: true };
  }

  return { display: `${sum}`, sum, hasValid: true };
};


