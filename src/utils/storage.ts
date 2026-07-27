import ExcelJS from 'exceljs';
import { StudentRecord } from '../types';
import { getEffectiveStatus, getStudentTotalMarks } from './statusHelper';

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
  const headerRow1: string[] = ['S.No.', 'USN', 'Student Name', 'College', 'Semester', 'Status', 'SGPA'];

  // Second Row: Empty for base metadata + Internal, External, Total, Result sub-headers for each subject
  const headerRow2: string[] = ['', '', '', '', '', '', ''];

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

  records.forEach((rec, index) => {
    const statusVal = getEffectiveStatus(rec);

    const row: string[] = [
      escapeCsvCell(index + 1),
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

export async function exportToExcel(records: StudentRecord[]): Promise<void> {
  if (!records || records.length === 0) return;

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Student Results');

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

  // Base columns: S.No, USN, Name, College, Semester, Status, SGPA
  const baseHeaders = ['S.No.', 'USN', 'Student Name', 'College', 'Semester', 'Status', 'SGPA'];
  
  // Row 1 & Row 2 structure
  // Row 1 elements
  const row1Values: string[] = [...baseHeaders];
  // Row 2 elements
  const row2Values: string[] = ['', '', '', '', '', '', ''];

  if (subjectList.length > 0) {
    subjectList.forEach(([_, sub]) => {
      row1Values.push(sub.header, '', '', '');
      row2Values.push('Internal', 'External', 'Total', 'Result');
    });
  } else {
    row1Values.push('Subjects & Results');
    row2Values.push('');
  }

  // Add the last column "Total" representing total of all subjects
  row1Values.push('Total');
  row2Values.push('');

  // Add Row 1 and Row 2
  worksheet.addRow(row1Values);
  worksheet.addRow(row2Values);

  // Merge the base headers vertically (Rows 1 and 2)
  for (let colIdx = 1; colIdx <= baseHeaders.length; colIdx++) {
    worksheet.mergeCells(1, colIdx, 2, colIdx);
  }

  // Merge the final "Total" column vertically
  worksheet.mergeCells(1, row1Values.length, 2, row1Values.length);

  // Merge subjects horizontally (Row 1 across 4 columns)
  if (subjectList.length > 0) {
    subjectList.forEach((_, index) => {
      const startCol = baseHeaders.length + 1 + index * 4;
      const endCol = startCol + 3;
      worksheet.mergeCells(1, startCol, 1, endCol);
    });
  }

  // Style headers
  const headerFill: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E293B' }, // Dark slate
  };
  const headerFont: Partial<ExcelJS.Font> = {
    name: 'Segoe UI',
    color: { argb: 'FFFFFFFF' },
    bold: true,
    size: 11,
  };
  const headerAlignment: Partial<ExcelJS.Alignment> = {
    vertical: 'middle',
    horizontal: 'center',
    wrapText: true,
  };

  // Border style for headers
  const headerBorder: Partial<ExcelJS.Borders> = {
    top: { style: 'thin', color: { argb: 'FF475569' } },
    left: { style: 'thin', color: { argb: 'FF475569' } },
    bottom: { style: 'thin', color: { argb: 'FF475569' } },
    right: { style: 'thin', color: { argb: 'FF475569' } },
  };

  worksheet.getRow(1).height = 28;
  worksheet.getRow(2).height = 24;

  const totalCols = row1Values.length;
  for (let r = 1; r <= 2; r++) {
    const row = worksheet.getRow(r);
    for (let c = 1; c <= totalCols; c++) {
      const cell = row.getCell(c);
      cell.fill = headerFill;
      cell.font = headerFont;
      cell.alignment = headerAlignment;
      cell.border = headerBorder;
    }
  }

  // Add data rows
  const borderLight: Partial<ExcelJS.Borders> = {
    top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
  };

  const sortedRecords = [...records].sort((a, b) => {
    const usnA = (a.usn || '').trim().toUpperCase();
    const usnB = (b.usn || '').trim().toUpperCase();
    return usnA.localeCompare(usnB, undefined, { numeric: true, sensitivity: 'base' });
  });

  sortedRecords.forEach((rec, index) => {
    const statusVal = getEffectiveStatus(rec);
    const rowData: (string | number)[] = [
      index + 1,
      rec.usn || '',
      rec.name || '',
      rec.college || '',
      rec.semester || '',
      statusVal,
      rec.sgpa || '',
    ];

    if (subjectList.length > 0) {
      subjectList.forEach(([_, subInfo]) => {
        const match = rec.subjects?.find((s) => {
          const sCode = s.subjectCode?.trim().toUpperCase();
          const sName = s.subjectName?.trim().toLowerCase();
          if (subInfo.code) {
            return sCode === subInfo.code.toUpperCase();
          }
          return sName === subInfo.name.toLowerCase();
        });

        if (match) {
          rowData.push(match.internalMarks || '');
          rowData.push(match.externalMarks || '');
          rowData.push(match.totalMarks || '');
          rowData.push(match.result || '');
        } else {
          rowData.push('');
          rowData.push('');
          rowData.push('');
          rowData.push('');
        }
      });
    } else {
      const summary = rec.subjects
        ?.map((s) => `${s.subjectCode ? s.subjectCode + ': ' : ''}${s.subjectName} -> ${s.result}`)
        .join(' ; ') || '';
      rowData.push(summary);
    }

    // Calculate sum of total marks of all subjects for this student
    let sum = 0;
    let maxSum = 0;
    let hasValid = false;
    let hasDenominator = false;

    rec.subjects?.forEach((s) => {
      if (s.totalMarks) {
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

    let totalDisplay = '-';
    if (hasValid) {
      if (hasDenominator && maxSum > 0) {
        totalDisplay = `${sum}/${maxSum}`;
      } else {
        totalDisplay = `${sum}`;
      }
    }

    rowData.push(totalDisplay);

    const addedRow = worksheet.addRow(rowData);
    addedRow.height = 22;

    // Apply styles to cells
    for (let colIdx = 1; colIdx <= totalCols; colIdx++) {
      const cell = addedRow.getCell(colIdx);
      cell.font = { name: 'Segoe UI', size: 10 };
      cell.border = borderLight;

      // Alignments
      if (colIdx === 3) {
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
      } else {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      }

      // Status Styling (Column 6 is Status)
      if (colIdx === 6) {
        const val = String(cell.value || '').toUpperCase();
        if (val === 'PASS') {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFD1FAE5' }, // Soft green background
          };
          cell.font = {
            name: 'Segoe UI',
            size: 10,
            bold: true,
            color: { argb: 'FF065F46' }, // Dark green text
          };
        } else if (val === 'FAIL') {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFEE2E2' }, // Soft red background
          };
          cell.font = {
            name: 'Segoe UI',
            size: 10,
            bold: true,
            color: { argb: 'FF991B1B' }, // Dark red text
          };
        }
      }

      // Individual Subject Result Column styling (every 4th column starting at col 11: 11, 15, 19, etc.)
      if (subjectList.length > 0 && colIdx > baseHeaders.length && colIdx < totalCols) {
        const relativeColIdx = colIdx - baseHeaders.length;
        if (relativeColIdx % 4 === 0) { // This is the 'Result' column of a subject
          const resVal = String(cell.value || '').toUpperCase().trim();
          if (resVal) {
            // Check if it's fail or pass
            const isPass = !['F', 'FAIL', 'A', 'AB', 'ABSENT', 'W', 'WITHHELD', 'NE', 'NOT ELIGIBLE', 'REJECTED'].includes(resVal) && !resVal.includes('FAIL') && !resVal.includes('ABSENT') && !resVal.includes('WITHHELD');
            if (isPass) {
              cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFECFDF5' }, // Very soft green
              };
              cell.font = {
                name: 'Segoe UI',
                size: 9,
                bold: true,
                color: { argb: 'FF047857' },
              };
            } else {
              cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFFEF2F2' }, // Very soft red
              };
              cell.font = {
                name: 'Segoe UI',
                size: 9,
                bold: true,
                color: { argb: 'FFB91C1C' },
              };
            }
          }
        }
      }

      // Format/Style the Total column (last column)
      if (colIdx === totalCols) {
        cell.font = { name: 'Segoe UI', size: 10, bold: true };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF8FAFC' }, // Clean soft slate slate/gray background for Total
        };
      }
    }
  });

  // Add 3 empty rows as a separator
  worksheet.addRow([]);
  worksheet.addRow([]);

  // Calculate top 3 students who scored highest
  const topExcelStudents = [...records]
    .map((student) => {
      const totalInfo = getStudentTotalMarks(student);
      return {
        student,
        sum: totalInfo.sum,
        display: totalInfo.display,
        hasValid: totalInfo.hasValid,
      };
    })
    .filter((item) => item.hasValid)
    .sort((a, b) => b.sum - a.sum)
    .slice(0, 3);

  if (topExcelStudents.length > 0) {
    // Top 3 header
    const sectionHeaderRow = worksheet.addRow(['TOP PERFORMING STUDENTS']);
    sectionHeaderRow.height = 24;
    // Merge cells across 4 columns
    worksheet.mergeCells(sectionHeaderRow.number, 1, sectionHeaderRow.number, 4);
    const headingCell = sectionHeaderRow.getCell(1);
    headingCell.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FF1E293B' } };
    headingCell.alignment = { vertical: 'middle', horizontal: 'left' };

    // Sub-headers for the top 3 table
    const topSubHeaderRow = worksheet.addRow(['Rank', 'USN', 'Student Name', 'Total Marks']);
    topSubHeaderRow.height = 20;
    const subHeaderBorder: any = {
      top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      bottom: { style: 'medium', color: { argb: 'FF475569' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
    };

    for (let c = 1; c <= 4; c++) {
      const cell = topSubHeaderRow.getCell(c);
      cell.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: 'FF475569' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF1F5F9' }
      };
      cell.border = subHeaderBorder;
      cell.alignment = { vertical: 'middle', horizontal: c === 3 ? 'left' : 'center' };
    }

    // Rank colors
    const rankStyles = [
      { // 1st Place: Gold/Amber
        bg: 'FFFEF3C7',
        text: 'FF92400E',
        label: '1st 🏆'
      },
      { // 2nd Place: Indigo
        bg: 'FFE0E7FF',
        text: 'FF3730A3',
        label: '2nd 🥈'
      },
      { // 3rd Place: Emerald/Mint
        bg: 'FFD1FAE5',
        text: 'FF065F46',
        label: '3rd 🥉'
      }
    ];

    topExcelStudents.forEach((item, idx) => {
      const style = rankStyles[idx] || rankStyles[2];
      const dataRow = worksheet.addRow([
        style.label, 
        item.student.usn || '', 
        item.student.name || '', 
        item.display
      ]);
      dataRow.height = 22;

      const rowBorder: any = {
        top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
      };

      for (let c = 1; c <= 4; c++) {
        const cell = dataRow.getCell(c);
        cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: style.text } };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: style.bg }
        };
        cell.border = rowBorder;
        cell.alignment = { vertical: 'middle', horizontal: c === 3 ? 'left' : 'center' };
      }
    });
  }

  // Set column widths automatically
  for (let colIdx = 1; colIdx <= totalCols; colIdx++) {
    const column = worksheet.getColumn(colIdx);
    let maxLen = 0;
    
    // Check lengths in this column
    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      const cell = row.getCell(colIdx);
      const valStr = cell.value ? String(cell.value) : '';
      if (valStr.length > maxLen) {
        maxLen = valStr.length;
      }
    });

    if (colIdx === 1) { // S.No
      column.width = 8;
    } else if (colIdx === 2) { // USN
      column.width = 16;
    } else if (colIdx === 3) { // Name
      column.width = Math.min(Math.max(maxLen + 3, 22), 40);
    } else if (colIdx === 4) { // College
      column.width = Math.min(Math.max(maxLen + 3, 16), 35);
    } else if (colIdx === 5) { // Semester
      column.width = 11;
    } else if (colIdx === 6) { // Status
      column.width = 12;
    } else if (colIdx === 7) { // SGPA
      column.width = 10;
    } else if (colIdx === totalCols) { // Total column width
      column.width = 14;
    } else {
      column.width = 12;
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `student_results_export_${new Date().toISOString().slice(0, 10)}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
