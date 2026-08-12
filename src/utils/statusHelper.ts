import { StudentRecord, SubjectResult } from '../types';

export function cleanMarkVal(val: any): string {
  if (val === undefined || val === null) return '';
  const str = String(val).trim();
  if (!str) return '';
  if (/^\d+$/.test(str)) return str;
  const upper = str.toUpperCase();
  if (upper === 'AB' || upper === 'ABS' || upper === 'ABSENT' || upper === 'A') return 'AB';
  const match = str.match(/\d+/);
  if (match) return match[0];
  return str.replace(/flashCard/gi, '').replace(/presidency/gi, '').replace(/examination Marks/gi, '').replace(/(Marks){1,}/gi, '').trim();
}

export function cleanResultVal(val: any): string {
  if (val === undefined || val === null) return '';
  const str = String(val).trim();
  if (!str) return '';
  const upper = str.toUpperCase();
  if (upper === 'PASS' || upper === 'P') return 'PASS';
  if (upper === 'FAIL' || upper === 'F') return 'FAIL';
  if (upper === 'ABSENT' || upper === 'A') return 'ABSENT';
  const match = str.match(/\b(PASS|FAIL|P|F|ABSENT|A)\b/i);
  if (match) {
    const m = match[1].toUpperCase();
    if (m === 'P' || m === 'PASS') return 'PASS';
    if (m === 'F' || m === 'FAIL') return 'FAIL';
    if (m === 'A' || m === 'ABSENT') return 'ABSENT';
  }
  return str;
}

export function cleanSubjectNameVal(name: string): string {
  if (!name) return '';
  let s = String(name).trim();
  s = s.replace(/flashCard/gi, '');
  s = s.replace(/presidency/gi, '');
  s = s.replace(/examination Marks/gi, '');
  s = s.replace(/External Marks \d*/gi, '');
  s = s.replace(/Internal Marks \d*/gi, '');
  s = s.replace(/Result [PF]/gi, '');
  s = s.replace(/Announced Date \d{4}-\d{2}-\d{2}/gi, '');
  s = s.replace(/(Marks){1,}/gi, '');
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}

export function sanitizeSubject(s: SubjectResult): SubjectResult {
  if (!s) return s;
  return {
    ...s,
    subjectName: cleanSubjectNameVal(s.subjectName || ''),
    internalMarks: cleanMarkVal(s.internalMarks),
    externalMarks: cleanMarkVal(s.externalMarks),
    totalMarks: cleanMarkVal(s.totalMarks),
    result: cleanResultVal(s.result) || s.result,
  };
}

export function sanitizeRecord(record: StudentRecord): StudentRecord {
  if (!record) return record;
  return {
    ...record,
    subjects: Array.isArray(record.subjects)
      ? record.subjects.map(sanitizeSubject)
      : [],
  };
}

export function filterRecordsBySemester(records: StudentRecord[], semesterFilter?: any): StudentRecord[] {
  if (!semesterFilter || typeof semesterFilter !== 'string' || semesterFilter === 'ALL') {
    return records;
  }
  const targetSem = semesterFilter.trim().toLowerCase();
  return records.filter((rec) => {
    const recSem = (rec.semester || '').trim().toLowerCase();
    if (!recSem) return false;
    return (
      recSem === targetSem ||
      recSem.includes(`sem ${targetSem}`) ||
      recSem.includes(`${targetSem}th`) ||
      recSem.includes(`${targetSem}st`) ||
      recSem.includes(`${targetSem}nd`) ||
      recSem.includes(`${targetSem}rd`)
    );
  });
}

export function getAvailableSemesters(records: StudentRecord[]): string[] {
  const sems = new Set<string>();
  records.forEach((r) => {
    if (r.semester && r.semester.trim()) {
      sems.add(r.semester.trim());
    }
  });
  return Array.from(sems).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

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

// Helper to calculate total marks across all subjects for a student (skips non-credit subjects)
export const getStudentTotalMarks = (student: StudentRecord): { display: string; sum: number; hasValid: boolean } => {
  let sum = 0;
  let maxSum = 0;
  let hasValid = false;
  let hasDenominator = false;

  student.subjects?.forEach((s) => {
    // Skip subjects flagged as non-credit
    if (s.isNonCredit) return;

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

export interface DepartmentInfo {
  code: string;
  short: string;
  long: string;
}

export function getDepartmentFromUsn(usn?: string): DepartmentInfo | null {
  if (!usn || usn.length < 7) return null;
  const code = usn.substring(5, 7).toUpperCase();
  switch (code) {
    case 'CS':
      return { code: 'CS', short: 'CSE', long: 'Computer Science and Engg' };
    case 'EC':
      return { code: 'EC', short: 'ECE', long: 'Electronics and Communication Engg' };
    case 'CV':
      return { code: 'CV', short: 'CIVIL', long: 'Civil Engg' };
    case 'ME':
      return { code: 'ME', short: 'MECH', long: 'Mechanical Engg' };
    default:
      return null;
  }
}


