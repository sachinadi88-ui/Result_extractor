import ExcelJS from 'exceljs';
import { StudentRecord } from '../types';
import { getEffectiveStatus, getStudentTotalMarks, isSubjectPass, isStudentPass } from './statusHelper';

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

  // Base columns: S.No, USN, Name, Semester, Status
  const baseHeaders = ['S.No.', 'USN', 'Student Name', 'Semester', 'Status'];
  
  // Row 1 & Row 2 structure
  // Row 1 elements
  const row1Values: string[] = [...baseHeaders];
  // Row 2 elements
  const row2Values: string[] = ['', '', '', '', ''];

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
      rec.semester || '',
      statusVal,
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

      // Status Styling (Column 5 is Status)
      if (colIdx === 5) {
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

  // Calculate subject statistics
  const statsMap = new Map<string, {
    subjectCode: string;
    subjectName: string;
    totalStudents: number;
    totalPass: number;
    totalFail: number;
  }>();

  records.forEach((student) => {
    if (student.subjects && Array.isArray(student.subjects)) {
      student.subjects.forEach((sub) => {
        if (!sub || !sub.subjectName) return;
        const code = (sub.subjectCode || '').trim();
        const name = (sub.subjectName || '').trim();
        // Group by unique code and/or name
        const key = code ? `${code.toUpperCase()}::${name.toUpperCase()}` : name.toUpperCase();

        const isPass = isSubjectPass(sub);

        if (!statsMap.has(key)) {
          statsMap.set(key, {
            subjectCode: code,
            subjectName: name,
            totalStudents: 0,
            totalPass: 0,
            totalFail: 0,
          });
        }

        const current = statsMap.get(key)!;
        current.totalStudents += 1;
        if (isPass) {
          current.totalPass += 1;
        } else {
          current.totalFail += 1;
        }
      });
    }
  });

  const subjectStatsList = Array.from(statsMap.values()).map((stat) => {
    const passPct = stat.totalStudents > 0 ? (stat.totalPass / stat.totalStudents) * 100 : 0;
    return {
      ...stat,
      passPercentage: Math.round(passPct * 10) / 10,
    };
  });

  if (topExcelStudents.length > 0 || subjectStatsList.length > 0) {
    const startRowIdx = worksheet.lastRow ? worksheet.lastRow.number + 1 : 1;

    // Calculate total, pass and pass percentage metrics
    const totalPass = records.filter(r => isStudentPass(r)).length;
    const passPercentage = records.length > 0 ? Math.round((totalPass / records.length) * 1000) / 10 : 0;

    // Helper for styling merged cells in a range correctly to avoid ExcelJS background/border cutoffs
    const mergeAndStyleRange = (
      sheet: ExcelJS.Worksheet,
      rowNum: number,
      colStart: number,
      colEnd: number,
      val: any,
      font: any,
      fill: any,
      border: any,
      alignment: any
    ) => {
      sheet.mergeCells(rowNum, colStart, rowNum, colEnd);
      for (let c = colStart; c <= colEnd; c++) {
        const cell = sheet.getCell(rowNum, c);
        if (c === colStart) {
          cell.value = val;
        }
        if (font) cell.font = font;
        if (fill) cell.fill = fill;
        if (border) cell.border = border;
        if (alignment) cell.alignment = alignment;
      }
    };

    // Left table has: 2 rows (Title + Header) + topExcelStudents.length rows (Data) + 2 empty rows + 4 rows (Summary Card: Title + 3 stats rows)
    const leftTableHeight = 2 + topExcelStudents.length;
    const summaryCardStartRow = startRowIdx + leftTableHeight + 2;
    const summaryCardHeight = 4;

    // Determine how many rows we need to pre-allocate
    const maxDataRows = Math.max(topExcelStudents.length, subjectStatsList.length);
    const maxLeftRows = leftTableHeight + 2 + summaryCardHeight;
    const maxRightRows = 2 + subjectStatsList.length;
    const totalSectionRows = Math.max(maxLeftRows, maxRightRows);

    for (let i = 0; i < totalSectionRows; i++) {
      worksheet.addRow([]);
    }

    // 1. Title Rows (Row: startRowIdx)
    const titleRow = worksheet.getRow(startRowIdx);
    titleRow.height = 24;

    // Left Table Title
    if (topExcelStudents.length > 0) {
      worksheet.mergeCells(startRowIdx, 1, startRowIdx, 4);
      const titleCellLeft = titleRow.getCell(1);
      titleCellLeft.value = 'TOP PERFORMING STUDENTS 🏆';
      titleCellLeft.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FF1E293B' } };
      titleCellLeft.alignment = { vertical: 'middle', horizontal: 'left' };
    }

    // Right Table Title
    if (subjectStatsList.length > 0) {
      worksheet.mergeCells(startRowIdx, 6, startRowIdx, 8);
      const titleCellRight = titleRow.getCell(6);
      titleCellRight.value = 'SUBJECT PASS ANALYSIS 📈';
      titleCellRight.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FF1E293B' } };
      titleCellRight.alignment = { vertical: 'middle', horizontal: 'left' };
    }

    // 2. Headers Row (Row: startRowIdx + 1)
    const headersRow = worksheet.getRow(startRowIdx + 1);
    headersRow.height = 20;

    const subHeaderBorder: any = {
      top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      bottom: { style: 'medium', color: { argb: 'FF475569' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
    };

    // Left Table Headers
    if (topExcelStudents.length > 0) {
      const leftHeaders = ['Rank', 'USN', 'Student Name', 'Total Marks'];
      for (let c = 1; c <= 4; c++) {
        const cell = headersRow.getCell(c);
        cell.value = leftHeaders[c - 1];
        cell.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: 'FF475569' } };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF1F5F9' }
        };
        cell.border = subHeaderBorder;
        cell.alignment = { vertical: 'middle', horizontal: c === 3 ? 'left' : 'center' };
      }
    }

    // Right Table Headers
    if (subjectStatsList.length > 0) {
      const rightHeaders = ['Subject Code', 'Subject Name', 'Pass %'];
      for (let c = 6; c <= 8; c++) {
        const cell = headersRow.getCell(c);
        cell.value = rightHeaders[c - 6];
        cell.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: 'FF475569' } };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF1F5F9' }
        };
        cell.border = subHeaderBorder;
        cell.alignment = { vertical: 'middle', horizontal: c === 7 ? 'left' : 'center' };
      }
    }

    // 3. Populate Data Rows (Row: startRowIdx + 2 onwards)
    const rowBorder: any = {
      top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
    };

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

    for (let rOffset = 0; rOffset < maxDataRows; rOffset++) {
      const currRowNumber = startRowIdx + 2 + rOffset;
      const dataRow = worksheet.getRow(currRowNumber);
      dataRow.height = 22;

      // Populate Left Table: Top 3 Students
      if (rOffset < topExcelStudents.length) {
        const item = topExcelStudents[rOffset];
        const style = rankStyles[rOffset] || rankStyles[2];
        const vals = [
          style.label,
          item.student.usn || '',
          item.student.name || '',
          item.display
        ];

        for (let c = 1; c <= 4; c++) {
          const cell = dataRow.getCell(c);
          cell.value = vals[c - 1];
          cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: style.text } };
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: style.bg }
          };
          cell.border = rowBorder;
          cell.alignment = { vertical: 'middle', horizontal: c === 3 ? 'left' : 'center' };
        }
      }

      // Populate Right Table: Subject Pass Percentages with color-coding
      if (rOffset < subjectStatsList.length) {
        const stat = subjectStatsList[rOffset];
        const pPct = stat.passPercentage;

        // Visual indicator color mapping based on pass rate thresholds
        let bg = 'FFD1FAE5';   // Emerald/Green for high performance (>= 85%)
        let text = 'FF065F46';
        if (pPct < 50) {
          bg = 'FFFEE2E2';     // Soft Red for lower pass rate (< 50%)
          text = 'FF991B1B';
        } else if (pPct < 85) {
          bg = 'FFFEF3C7';     // Soft Yellow/Amber for mid-range (50% to 84.9%)
          text = 'FF92400E';
        }

        const vals = [
          stat.subjectCode || '-',
          stat.subjectName || '',
          `${pPct}%`
        ];

        for (let c = 6; c <= 8; c++) {
          const cell = dataRow.getCell(c);
          cell.value = vals[c - 6];
          cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: text } };
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: bg }
          };
          cell.border = rowBorder;
          cell.alignment = { vertical: 'middle', horizontal: c === 7 ? 'left' : 'center' };
        }
      }
    }

    // --- OVERALL COLLEGE PERFORMANCE STATISTICS CARD ---
    // Beautiful, professional-grade key-value panel positioned exactly 2 rows below the Top Performers table
    const cardBorder: any = {
      top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
    };

    // 1. Title Row of the Summary Card
    const cardTitleRow = worksheet.getRow(summaryCardStartRow);
    cardTitleRow.height = 22;
    mergeAndStyleRange(
      worksheet,
      summaryCardStartRow,
      1,
      4,
      'OVERALL PERFORMANCE SUMMARY 📊',
      { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF1E293B' } },
      { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } },
      cardBorder,
      { vertical: 'middle', horizontal: 'center' }
    );

    // Helper for merged value cells in the card
    const writeCardRow = (rowNum: number, label: string, value: any, labelColor: string, valColor: string, bgColor: string) => {
      const row = worksheet.getRow(rowNum);
      row.height = 20;
      
      // Label in Col 1-2
      mergeAndStyleRange(
        worksheet,
        rowNum,
        1,
        2,
        label,
        { name: 'Segoe UI', size: 9, bold: true, color: { argb: labelColor } },
        { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } },
        cardBorder,
        { vertical: 'middle', horizontal: 'left' }
      );

      // Value in Col 3-4
      mergeAndStyleRange(
        worksheet,
        rowNum,
        3,
        4,
        value,
        { name: 'Segoe UI', size: 10, bold: true, color: { argb: valColor } },
        { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } },
        cardBorder,
        { vertical: 'middle', horizontal: 'center' }
      );
    };

    // 2. Total Enrolled Students
    writeCardRow(
      summaryCardStartRow + 1,
      '  Total Enrolled Students',
      records.length,
      'FF475569', // Slate grey label
      'FF0F172A', // Dark slate value
      'FFF8FAFC'  // Very soft slate bg
    );

    // 3. Total Passed Students
    writeCardRow(
      summaryCardStartRow + 2,
      '  Total Passed Students',
      totalPass,
      'FF047857', // Emerald green label
      'FF065F46', // Dark emerald value
      'FFECFDF5'  // Soft green bg
    );

    // 4. Overall Pass Percentage with nice color-coded background
    let percentText = 'FFB45309'; // Default Amber
    let percentBg = 'FFFEF3C7';   // Default light amber background
    if (passPercentage >= 85) {
      percentText = 'FF065F46';   // Emerald Green text
      percentBg = 'FFD1FAE5';     // Soft Emerald Green background
    } else if (passPercentage < 50) {
      percentText = 'FF991B1B';   // Red text
      percentBg = 'FFFEE2E2';     // Soft red background
    }

    writeCardRow(
      summaryCardStartRow + 3,
      '  Overall Pass Percentage',
      `${passPercentage}%`,
      percentText,
      percentText, // Keep value matching the text theme color
      percentBg
    );
  }

  // Set column widths automatically
  const lastUsedColIdx = Math.max(totalCols, 8);
  for (let colIdx = 1; colIdx <= lastUsedColIdx; colIdx++) {
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

    if (colIdx === 1) { // S.No / Rank
      column.width = 10;
    } else if (colIdx === 2) { // USN
      column.width = 16;
    } else if (colIdx === 3) { // Student Name
      column.width = Math.min(Math.max(maxLen + 3, 22), 40);
    } else if (colIdx === 4) { // Semester / Total Marks
      column.width = Math.min(Math.max(maxLen + 3, 14), 25);
    } else if (colIdx === 5) { // Status
      column.width = Math.max(12, maxLen + 2);
    } else if (colIdx === 6) { // Subject Code
      column.width = Math.max(14, maxLen + 2);
    } else if (colIdx === 7) { // Subject Name
      column.width = Math.min(Math.max(maxLen + 3, 25), 45);
    } else if (colIdx === 8) { // Pass %
      column.width = 12;
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
