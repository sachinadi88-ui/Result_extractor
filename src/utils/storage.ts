import { StudentRecord } from '../types';
import { getEffectiveStatus } from './statusHelper';

const BASE_STORAGE_KEY = 'student_results_extracted_v1';

export function getStoredStudentRecords(userId: string = 'guest'): StudentRecord[] {
  try {
    const key = `${BASE_STORAGE_KEY}_${userId}`;
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error loading stored records:', e);
    return [];
  }
}

export function saveStudentRecords(records: StudentRecord[], userId: string = 'guest'): void {
  try {
    const key = `${BASE_STORAGE_KEY}_${userId}`;
    localStorage.setItem(key, JSON.stringify(records));
  } catch (e) {
    console.error('Error saving records:', e);
  }
}

function escapeCsvCell(val: string | number | undefined | null): string {
  if (val === undefined || val === null) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

export function exportToCsv(records: StudentRecord[]): void {
  if (!records || records.length === 0) return;

  // Collect all unique subjects across all records for dynamic column headers
  const subjectMap = new Map<string, { code: string; name: string; header: string }>();

  records.forEach((rec) => {
    rec.subjects?.forEach((s) => {
      const code = s.subjectCode?.trim() || '';
      const name = s.subjectName?.trim() || '';
      if (!code && !name) return;

      const key = code ? code.toUpperCase() : name.toLowerCase();

      if (!subjectMap.has(key)) {
        let header = '';
        if (code && name) {
          header = `${code} - ${name}`;
        } else if (code) {
          header = code;
        } else {
          header = name;
        }
        subjectMap.set(key, { code, name, header });
      }
    });
  });

  const subjectList = Array.from(subjectMap.entries());

  // First Row: Base metadata headers + subject names (repeated 4 times per subject for sub-columns)
  const headerRow1: string[] = ['USN', 'Student Name', 'College', 'Semester', 'Status', 'SGPA'];

  // Second Row: Empty for base metadata + Internal, External, Total, Result sub-headers for each subject
  const headerRow2: string[] = ['', '', '', '', '', ''];

  if (subjectList.length > 0) {
    subjectList.forEach(([_, sub]) => {
      // Add subject header once in top row followed by empty cells for sub-columns alignment
      headerRow1.push(sub.header, '', '', '');
      headerRow2.push('Internal', 'External', 'Total', 'Result');
    });
  } else {
    headerRow1.push('Subjects & Results');
    headerRow2.push('');
  }

  const csvRows: string[][] = [
    headerRow1.map(escapeCsvCell),
    headerRow2.map(escapeCsvCell),
  ];

  records.forEach((rec) => {
    const statusVal = getEffectiveStatus(rec);

    const row: string[] = [
      escapeCsvCell(rec.usn || ''),
      escapeCsvCell(rec.name || ''),
      escapeCsvCell(rec.college || ''),
      escapeCsvCell(rec.semester || ''),
      escapeCsvCell(statusVal),
      escapeCsvCell(rec.sgpa || ''),
    ];

    if (subjectList.length > 0) {
      subjectList.forEach(([_, subInfo]) => {
        // Find matching subject in student's subject list
        const match = rec.subjects?.find((s) => {
          const sCode = s.subjectCode?.trim().toUpperCase();
          const sName = s.subjectName?.trim().toLowerCase();
          if (subInfo.code) {
            return sCode === subInfo.code.toUpperCase();
          }
          return sName === subInfo.name.toLowerCase();
        });

        if (match) {
          row.push(escapeCsvCell(match.internalMarks || ''));
          row.push(escapeCsvCell(match.externalMarks || ''));
          row.push(escapeCsvCell(match.totalMarks || ''));
          row.push(escapeCsvCell(match.result || ''));
        } else {
          row.push(escapeCsvCell(''));
          row.push(escapeCsvCell(''));
          row.push(escapeCsvCell(''));
          row.push(escapeCsvCell(''));
        }
      });
    } else {
      const summary = rec.subjects
        ?.map((s) => `${s.subjectCode ? s.subjectCode + ': ' : ''}${s.subjectName} -> ${s.result}`)
        .join(' ; ') || '';
      row.push(escapeCsvCell(summary));
    }

    csvRows.push(row);
  });

  const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + csvRows.map((e) => e.join(',')).join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `student_results_export_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
