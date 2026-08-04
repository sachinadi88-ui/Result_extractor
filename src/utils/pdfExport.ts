import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { StudentRecord } from '../types';
import { getEffectiveStatus, getStudentTotalMarks, isStudentPass, isSubjectPass, getDepartmentFromUsn } from './statusHelper';

// Helper to convert the college logo crest to a base64 string for embedding
function getLogoDataUrl(): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = '/PDFlogo.jpg';
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/jpeg'));
          return;
        }
      } catch (e) {
        console.error('Failed to convert logo to data url:', e);
      }
      resolve(null);
    };
    img.onerror = () => {
      // Fallback to /smvcer_crest.jpg if /PDFlogo.jpg fails
      const fallback = new Image();
      fallback.src = '/smvcer_crest.jpg';
      fallback.crossOrigin = 'anonymous';
      fallback.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = fallback.width;
          canvas.height = fallback.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(fallback, 0, 0);
            resolve(canvas.toDataURL('image/jpeg'));
            return;
          }
        } catch (e) {}
        resolve(null);
      };
      fallback.onerror = () => resolve(null);
    };
  });
}

export async function exportToPDF(records: StudentRecord[]): Promise<void> {
  if (!records || records.length === 0) return;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const totalPass = records.filter((r) => isStudentPass(r)).length;
  const passPercentage = records.length > 0 ? Math.round((totalPass / records.length) * 1000) / 10 : 0;

  // Find semester number from records
  let semesterNumber = '';
  for (const rec of records) {
    if (rec.semester) {
      semesterNumber = String(rec.semester).trim();
      break;
    }
  }

  // Try to load college logo
  const logoUrl = await getLogoDataUrl();

  // Get first student's college/examination as title if present
  const societyName = "HKE Society's";
  const collegeName = "Sir M. Visvesvaraya College of Engineering, Raichur";
  
  // Find the department long name based on records
  let departmentLongName = '';
  for (const rec of records) {
    const dept = getDepartmentFromUsn(rec.usn);
    if (dept) {
      departmentLongName = dept.long;
      break;
    }
  }
  const examName = departmentLongName || records[0]?.examination || 'ACADEMIC EXAMINATION REPORT';

  // --- HEADER SECTION ---
  let headerStartY = 11;
  if (logoUrl) {
    // Decreased logo width slightly for cleaner proportions
    doc.addImage(logoUrl, 'JPEG', 15, headerStartY, 16, 18);
    
    // HKE Society's (top, small)
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139); // Slate 500
    doc.text(societyName, 34, headerStartY + 4);
    
    // Sir M. Visvesvaraya College of Engineering, Raichur (below it, larger)
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59); // Slate 800
    doc.text(collegeName, 34, headerStartY + 10, { maxWidth: 155 });
    
    // Examination name (Department Long Name) - Bold and Increased Font Size
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59); // Slate 800
    doc.text(examName, 34, headerStartY + 15, { maxWidth: 155 });

    doc.setFontSize(7.5);
    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 34, headerStartY + 19);
  } else {
    // HKE Society's (top, small)
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139); // Slate 500
    doc.text(societyName, 15, headerStartY + 4);

    // Sir M. Visvesvaraya College of Engineering, Raichur (below it, larger)
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(30, 41, 59); // Slate 800
    doc.text(collegeName, 15, headerStartY + 10, { maxWidth: 180 });
    
    // Examination name (Department Long Name) - Bold and Increased Font Size
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(11.5);
    doc.setTextColor(30, 41, 59); // Slate 800
    doc.text(examName, 15, headerStartY + 15, { maxWidth: 180 });

    doc.setFontSize(8);
    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 15, headerStartY + 19);
  }

  // Draw thin header divider
  doc.setDrawColor(226, 232, 240); // Slate 200
  doc.setLineWidth(0.5);
  doc.line(15, 38, 195, 38);

  // --- OVERALL PERFORMANCE STATS BLOCKS (Page 1 Top) ---
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42); // Dark Slate
  const semSuffix = semesterNumber ? `   •   SEM : ${semesterNumber}` : '';
  doc.text(`RESULT ANALYSIS SUMMARY${semSuffix}`, 15, 45);

  // Box 1: Enrolled
  doc.setFillColor(248, 250, 252); // Slate 50
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(15, 49, 55, 22, 2, 2, 'FD');
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139); // Slate 500
  doc.text('TOTAL ENROLLED', 20, 55);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(30, 41, 59); // Slate 800
  doc.text(String(records.length), 20, 65);

  // Box 2: Passed
  doc.setFillColor(236, 253, 245); // Emerald 50
  doc.setDrawColor(167, 243, 208); // Emerald 200
  doc.roundedRect(75, 49, 55, 22, 2, 2, 'FD');
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(5, 150, 105); // Emerald 600
  doc.text('TOTAL PASSED', 80, 55);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(6, 95, 70); // Emerald 800
  doc.text(String(totalPass), 80, 65);

  // Box 3: Pass %
  let passPercentColor = [180, 83, 9]; // Amber 700 default
  let passPercentBg = [254, 243, 199]; // Amber 50 bg
  let passPercentBorder = [253, 230, 138]; // Amber 200
  if (passPercentage >= 85) {
    passPercentColor = [6, 95, 70]; // Emerald 800
    passPercentBg = [209, 250, 229]; // Emerald 100 bg
    passPercentBorder = [167, 243, 208]; // Emerald 200
  } else if (passPercentage < 50) {
    passPercentColor = [153, 27, 27]; // Red 800
    passPercentBg = [254, 226, 226]; // Red 100 bg
    passPercentBorder = [254, 202, 202]; // Red 200
  }

  doc.setFillColor(passPercentBg[0], passPercentBg[1], passPercentBg[2]);
  doc.setDrawColor(passPercentBorder[0], passPercentBorder[1], passPercentBorder[2]);
  doc.roundedRect(135, 49, 60, 22, 2, 2, 'FD');
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(passPercentColor[0], passPercentColor[1], passPercentColor[2]);
  doc.text('PASS PERCENTAGE', 140, 55);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(passPercentColor[0], passPercentColor[1], passPercentColor[2]);
  doc.text(`${passPercentage}%`, 140, 65);

  // --- SECTION: TOP PERFORMERS ---
  const topStudents = [...records]
    .map((student) => {
      const totalInfo = getStudentTotalMarks(student);
      return {
        student,
        sum: totalInfo.sum,
        display: totalInfo.display,
        hasValid: totalInfo.hasValid,
      };
    })
    .filter((item) => item.hasValid && isStudentPass(item.student))
    .sort((a, b) => b.sum - a.sum)
    .slice(0, 3);

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('TOP ACADEMIC PERFORMERS', 15, 82);

  if (topStudents.length > 0) {
    autoTable(doc, {
      startY: 86,
      margin: { left: 15, right: 15 },
      head: [['Rank', 'USN', 'Student Name', 'Total Score']],
      body: topStudents.map((item, idx) => [
        `Rank ${idx + 1}`,
        item.student.usn || '-',
        item.student.name || '-',
        item.display,
      ]),
      theme: 'striped',
      headStyles: {
        fillColor: [30, 41, 59], // Slate 800
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8.5,
      },
      styles: {
        fontSize: 8.5,
        cellPadding: 2.5,
        valign: 'middle',
      },
      columnStyles: {
        0: { cellWidth: 20, fontStyle: 'bold', textColor: [217, 119, 6] }, // Golden/amber text for Rank
        1: { cellWidth: 35 },
        2: { cellWidth: 85 },
        3: { cellWidth: 40, halign: 'center', fontStyle: 'bold' },
      },
    });
  } else {
    doc.setFont('Helvetica', 'italic');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text('No score data available for top performers.', 15, 91);
  }

  // --- SECTION: SUBJECT WISE STATISTICS ---
  const statsMap = new Map<string, {
    subjectCode: string;
    subjectName: string;
    facultyName: string;
    totalStudents: number;
    totalPass: number;
    totalFail: number;
    isNonCredit: boolean;
  }>();

  records.forEach((student) => {
    if (student.subjects && Array.isArray(student.subjects)) {
      student.subjects.forEach((sub) => {
        if (!sub || !sub.subjectName) return;
        const code = (sub.subjectCode || '').trim();
        const name = (sub.subjectName || '').trim();
        const faculty = (sub.facultyName || '').trim();
        const key = code ? `${code.toUpperCase()}::${name.toUpperCase()}` : name.toUpperCase();

        const isPass = isSubjectPass(sub);

        if (!statsMap.has(key)) {
          statsMap.set(key, {
            subjectCode: code,
            subjectName: name,
            facultyName: faculty,
            totalStudents: 0,
            totalPass: 0,
            totalFail: 0,
            isNonCredit: !!sub.isNonCredit,
          });
        } else {
          const current = statsMap.get(key)!;
          if (faculty && !current.facultyName) {
            current.facultyName = faculty;
          }
          if (sub.isNonCredit) {
            current.isNonCredit = true;
          }
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

  const statsStartY = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 10 : 110;
  
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('SUBJECT-WISE PASS RATE & STATISTICS', 15, statsStartY);

  if (subjectStatsList.length > 0) {
    autoTable(doc, {
      startY: statsStartY + 4,
      margin: { left: 15, right: 15 },
      head: [['Subject Code', 'Subject Name', 'Faculty Name', 'Enrolled', 'Passed', 'Failed', 'Pass Rate %']],
      body: subjectStatsList.map((stat) => [
        stat.subjectCode || '-',
        stat.isNonCredit ? `${stat.subjectName} * (Non-Credit)` : stat.subjectName,
        stat.facultyName || '-',
        stat.totalStudents,
        stat.totalPass,
        stat.totalFail,
        `${stat.passPercentage}%`,
      ]),
      theme: 'striped',
      headStyles: {
        fillColor: [30, 41, 59], // Slate 800
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8.5,
      },
      styles: {
        fontSize: 8.5,
        cellPadding: 2.5,
        valign: 'middle',
      },
      columnStyles: {
        0: { cellWidth: 26 },
        1: { cellWidth: 62 },
        2: { cellWidth: 32, fontStyle: 'bold', textColor: [30, 41, 59] },
        3: { cellWidth: 14, halign: 'center' },
        4: { cellWidth: 14, halign: 'center' },
        5: { cellWidth: 14, halign: 'center' },
        6: { cellWidth: 18, halign: 'center', fontStyle: 'bold', textColor: [5, 150, 105] },
      },
      didParseCell: (data) => {
        if (data.section === 'body') {
          const stat = subjectStatsList[data.row.index];
          if (stat?.isNonCredit) {
            data.cell.styles.fillColor = [241, 245, 249]; // Soft light grey tint for non-credit subject row
          }
        }
      },
    });
  } else {
    doc.setFont('Helvetica', 'italic');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text('No subject-wise statistics data available.', 15, statsStartY + 9);
  }

  // --- PAGE 2: DETAILED STUDENT REGISTER ---
  doc.addPage();
  
  // Header on Page 2
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139); // Slate 500
  doc.text(societyName, 15, 13);

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59); // Slate 800
  doc.text(collegeName, 15, 18);
  
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105); // Slate 600
  doc.text('STUDENT-WISE COMPREHENSIVE RESULT REGISTER', 15, 23);

  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(15, 26, 195, 26);

  // Prepare student list
  const sortedRecords = [...records].sort((a, b) => {
    const usnA = (a.usn || '').trim().toUpperCase();
    const usnB = (b.usn || '').trim().toUpperCase();
    return usnA.localeCompare(usnB, undefined, { numeric: true, sensitivity: 'base' });
  });

  const studentTableBody = sortedRecords.map((rec, index) => {
    const totalInfo = getStudentTotalMarks(rec);
    const statusVal = getEffectiveStatus(rec);
    return [
      index + 1,
      rec.usn || '-',
      rec.name || '-',
      rec.semester || '-',
      statusVal,
      totalInfo.display,
    ];
  });

  autoTable(doc, {
    startY: 32,
    margin: { left: 15, right: 15 },
    head: [['S.No.', 'USN', 'Student Name', 'Semester', 'Overall Status', 'Total Score']],
    body: studentTableBody,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42], // Deep Slate 900
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
    },
    styles: {
      fontSize: 8,
      cellPadding: 2,
      valign: 'middle',
    },
    columnStyles: {
      0: { cellWidth: 12, halign: 'center' },
      1: { cellWidth: 30 },
      2: { cellWidth: 70 },
      3: { cellWidth: 18, halign: 'center' },
      4: { cellWidth: 25, halign: 'center', fontStyle: 'bold' },
      5: { cellWidth: 25, halign: 'center', fontStyle: 'bold' },
    },
    didParseCell: (data) => {
      // Color-code the Overall Status column
      if (data.section === 'body' && data.column.index === 4) {
        const val = String(data.cell.raw || '').toUpperCase().trim();
        if (val === 'PASS') {
          data.cell.styles.textColor = [5, 122, 85]; // Emerald Green
          data.cell.styles.fillColor = [236, 253, 245]; // Light Emerald Green background
        } else if (val === 'FAIL') {
          data.cell.styles.textColor = [185, 28, 28]; // Red
          data.cell.styles.fillColor = [254, 242, 242]; // Light Red background
        }
      }
    },
  });

  // --- SIGNATURE SECTION ---
  let finalY = (doc as any).lastAutoTable?.finalY || 200;
  let sigY = finalY + 18; // ~4 rows gap
  if (sigY > 272) {
    if (finalY <= 254) {
      sigY = 272;
    } else {
      doc.addPage();
      sigY = 40;
    }
  }

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text('HOD', 15, sigY);
  doc.text('PRINCIPAL', 195, sigY, { align: 'right' });

  // Footer / Page numbers helper
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184); // Slate 400
    doc.text(`Page ${i} of ${totalPages}`, 195, 287, { align: 'right' });
    doc.text(`${societyName} ${collegeName} • Confidential Academic Report`, 15, 287);
  }

  // Save the PDF
  let departmentShortName = '';
  for (const rec of records) {
    const dept = getDepartmentFromUsn(rec.usn);
    if (dept) {
      departmentShortName = dept.short;
      break;
    }
  }
  const deptPart = departmentShortName || 'DEPT';
  const semPart = semesterNumber || '0';
  const filename = `SMVCER__${deptPart}_${semPart}_RESULT_Analysis_Summary.pdf`;
  doc.save(filename);
}

export async function exportToPDFLandscape(records: StudentRecord[]): Promise<void> {
  if (!records || records.length === 0) return;

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const totalPass = records.filter((r) => isStudentPass(r)).length;
  const passPercentage = records.length > 0 ? Math.round((totalPass / records.length) * 1000) / 10 : 0;

  // Try to load college logo
  const logoUrl = await getLogoDataUrl();

  const societyName = "HKE Society's";
  const collegeName = "Sir M. Visvesvaraya College of Engineering, Raichur";
  
  // Find the department long name based on records
  let departmentLongName = '';
  for (const rec of records) {
    const dept = getDepartmentFromUsn(rec.usn);
    if (dept) {
      departmentLongName = dept.long;
      break;
    }
  }
  const examName = departmentLongName || records[0]?.examination || 'ACADEMIC EXAMINATION REPORT';

  // --- HEADER SECTION (LANDSCAPE) ---
  let headerStartY = 10;
  if (logoUrl) {
    // Decreased logo width slightly for cleaner proportions in landscape
    doc.addImage(logoUrl, 'JPEG', 15, headerStartY, 14, 16);
    
    // HKE Society's (top, small)
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139); // Slate 500
    doc.text(societyName, 32, headerStartY + 3);
    
    // Sir M. Visvesvaraya College of Engineering, Raichur (below it, larger)
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(11.5);
    doc.setTextColor(30, 41, 59); // Slate 800
    doc.text(collegeName, 32, headerStartY + 8, { maxWidth: 225 });
    
    // Examination name (Department Long Name) - Bold and Increased Font Size
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59); // Slate 800
    doc.text(examName, 32, headerStartY + 13, { maxWidth: 225 });

    doc.setFontSize(7.5);
    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 32, headerStartY + 17);
  } else {
    // HKE Society's
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(societyName, 15, headerStartY + 3);

    // College name
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59);
    doc.text(collegeName, 15, headerStartY + 8, { maxWidth: 260 });
    
    // Examination name (Department Long Name) - Bold and Increased Font Size
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(11.5);
    doc.setTextColor(30, 41, 59);
    doc.text(examName, 15, headerStartY + 13, { maxWidth: 260 });

    doc.setFontSize(7.5);
    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 15, headerStartY + 17);
  }

  // Draw thin header divider line
  doc.setDrawColor(226, 232, 240); // Slate 200
  doc.setLineWidth(0.4);
  doc.line(15, headerStartY + 20, 282, headerStartY + 20);

  // --- COMPACT COLLEGE PERFORMANCE SUMMARY ---
  doc.setFillColor(248, 250, 252); // Slate 50 background
  doc.setDrawColor(226, 232, 240); // Slate 200 border
  doc.roundedRect(15, headerStartY + 23, 267, 7, 1, 1, 'FD');
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105); // Slate 600

  // Find semester number from records
  let semesterNumber = '';
  for (const rec of records) {
    if (rec.semester) {
      semesterNumber = String(rec.semester).trim();
      break;
    }
  }

  const semSuffix = semesterNumber ? `   •   Sem : ${semesterNumber}` : '';
  doc.text(`Result Analysis${semSuffix}   •   Total Enrolled: ${records.length}   |   Passed: ${totalPass}   |   Pass Percentage: ${passPercentage}%`, 18, headerStartY + 27.5);

  // Find all unique subjects in insertion order (same as Excel sheet)
  const uniqueSubjectsMap = new Map<string, { code: string; name: string; isNonCredit: boolean }>();

  records.forEach((student) => {
    student.subjects?.forEach((sub) => {
      const code = (sub.subjectCode || '').trim();
      const name = (sub.subjectName || '').trim();
      if (!code && !name) return;

      const key = code ? code.toUpperCase() : name.toLowerCase();
      if (!uniqueSubjectsMap.has(key)) {
        uniqueSubjectsMap.set(key, { code, name, isNonCredit: !!sub.isNonCredit });
      } else if (sub.isNonCredit) {
        const existing = uniqueSubjectsMap.get(key)!;
        existing.isNonCredit = true;
      }
    });
  });

  const uniqueSubjectsList = Array.from(uniqueSubjectsMap.entries()).map(([key, value]) => ({
    key,
    code: value.code,
    name: value.name,
    isNonCredit: value.isNonCredit,
  }));

  const subjectHeaders = uniqueSubjectsList.map(sub => {
    const raw = sub.code || (sub.name.length > 15 ? sub.name.substring(0, 12) + '..' : sub.name);
    return sub.isNonCredit ? `${raw}*` : raw;
  });

  const headers = [
    'S.No.',
    'USN',
    'Student Name',
    ...subjectHeaders,
    'Total Marks',
    'Status'
  ];

  // Prepare student list
  const sortedRecords = [...records].sort((a, b) => {
    const usnA = (a.usn || '').trim().toUpperCase();
    const usnB = (b.usn || '').trim().toUpperCase();
    return usnA.localeCompare(usnB, undefined, { numeric: true, sensitivity: 'base' });
  });

  const rowData = sortedRecords.map((rec, idx) => {
    const totalInfo = getStudentTotalMarks(rec);
    const statusVal = getEffectiveStatus(rec);
    
    const studentRow = [
      idx + 1,
      rec.usn || '-',
      rec.name || '-',
    ];
    
    // Now add subject marks for each unique subject column
    uniqueSubjectsList.forEach((uniqueSub) => {
      const studentSub = rec.subjects?.find((s) => {
        const sCode = (s.subjectCode || '').trim().toUpperCase();
        const sName = (s.subjectName || '').trim().toUpperCase();
        return (uniqueSub.code && sCode === uniqueSub.code.toUpperCase()) || sName === uniqueSub.name.toUpperCase();
      });
      
      // Show only total marks
      studentRow.push(studentSub ? (studentSub.totalMarks || '-') : '-');
    });
    
    studentRow.push(totalInfo.display);
    studentRow.push(statusVal);
    
    return studentRow;
  });

  autoTable(doc, {
    startY: headerStartY + 33,
    margin: { left: 15, right: 15, bottom: 25 },
    head: [headers],
    body: rowData,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42], // Deep Slate 900
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 1.5,
      valign: 'middle',
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' }, // S.No.
      1: { cellWidth: 26 }, // USN
      2: { cellWidth: 46 }, // Student Name
    },
    didParseCell: (data) => {
      if (data.section === 'body') {
        // Last column (Status)
        if (data.column.index === headers.length - 1) {
          const val = String(data.cell.raw || '').toUpperCase().trim();
          if (val === 'PASS') {
            data.cell.styles.textColor = [5, 122, 85];
            data.cell.styles.fillColor = [236, 253, 245];
          } else if (val === 'FAIL') {
            data.cell.styles.textColor = [185, 28, 28];
            data.cell.styles.fillColor = [254, 242, 242];
          }
        }
        // Second to last column (Total Marks)
        if (data.column.index === headers.length - 2) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.halign = 'center';
        }
        // Subject columns (indices 3 to headers.length - 3)
        if (data.column.index >= 3 && data.column.index <= headers.length - 3) {
          data.cell.styles.halign = 'center';
          const subIndex = data.column.index - 3;
          if (uniqueSubjectsList[subIndex]?.isNonCredit) {
            data.cell.styles.fillColor = [241, 245, 249]; // Soft light grey tint for non-credit column
            data.cell.styles.textColor = [51, 65, 85]; // Slate 700
          }
        }
      }
      if (data.section === 'head') {
        if (data.column.index >= 3 && data.column.index <= headers.length - 3) {
          const subIndex = data.column.index - 3;
          if (uniqueSubjectsList[subIndex]?.isNonCredit) {
            data.cell.styles.fillColor = [51, 65, 85]; // Distinct grey header for non-credit column
          }
        }
      }
    },
  });

  // --- SECTION: TOP PERFORMERS ---
  const topStudents = [...records]
    .map((student) => {
      const totalInfo = getStudentTotalMarks(student);
      const statusVal = getEffectiveStatus(student);
      return {
        student,
        sum: totalInfo.sum,
        display: totalInfo.display,
        hasValid: totalInfo.hasValid,
        statusVal,
      };
    })
    .filter((item) => item.hasValid && isStudentPass(item.student))
    .sort((a, b) => b.sum - a.sum)
    .slice(0, 3);

  if (topStudents.length > 0) {
    let finalY = (doc as any).lastAutoTable?.finalY || (headerStartY + 33);
    
    // Check if we need a page break for Top Performers section
    if (finalY > 155) {
      doc.addPage();
      finalY = 20;
    } else {
      finalY += 8;
    }

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59); // Slate 800
    doc.text('TOP ACADEMIC PERFORMERS', 15, finalY);

    const topPerformersRows = topStudents.map((item, index) => [
      `Rank #${index + 1}`,
      item.student.usn || '-',
      item.student.name || '-',
      item.student.semester || '-',
      item.statusVal,
      item.display
    ]);

    autoTable(doc, {
      startY: finalY + 3,
      margin: { left: 15, right: 15, bottom: 25 },
      head: [['Rank', 'USN', 'Student Name', 'Semester', 'Status', 'Total Marks']],
      body: topPerformersRows,
      theme: 'grid',
      headStyles: {
        fillColor: [30, 41, 59], // Slate 800
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 7.5,
      },
      styles: {
        fontSize: 7.5,
        cellPadding: 1.5,
        valign: 'middle',
      },
      columnStyles: {
        0: { cellWidth: 25, fontStyle: 'bold', halign: 'center' },
        1: { cellWidth: 35 },
        2: { cellWidth: 80 },
        3: { cellWidth: 30, halign: 'center' },
        4: { cellWidth: 30, halign: 'center' },
        5: { cellWidth: 35, fontStyle: 'bold', halign: 'center' },
      },
      didParseCell: (data) => {
        if (data.section === 'body') {
          // Rank badge colors
          if (data.column.index === 0) {
            if (data.row.index === 0) data.cell.styles.textColor = [180, 83, 9];
            else if (data.row.index === 1) data.cell.styles.textColor = [71, 85, 105];
            else if (data.row.index === 2) data.cell.styles.textColor = [146, 64, 14];
          }
          // Status column
          if (data.column.index === 4) {
            const val = String(data.cell.raw || '').toUpperCase().trim();
            if (val === 'PASS') {
              data.cell.styles.textColor = [5, 122, 85];
              data.cell.styles.fillColor = [236, 253, 245];
            } else if (val === 'FAIL') {
              data.cell.styles.textColor = [185, 28, 28];
              data.cell.styles.fillColor = [254, 242, 242];
            }
          }
        }
      }
    });
  }

  // --- SECTION: SUBJECT WISE STATISTICS ---
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

  let statsY = (doc as any).lastAutoTable?.finalY || (headerStartY + 33);
  
  if (statsY > 145) {
    doc.addPage();
    statsY = 20;
  } else {
    statsY += 8;
  }

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59); // Slate 800
  doc.text('SUBJECT-WISE PASS RATE & STATISTICS', 15, statsY);

  if (subjectStatsList.length > 0) {
    const subjectStatsRows = subjectStatsList.map((stat, idx) => [
      idx + 1,
      stat.subjectCode || '-',
      stat.subjectName || '-',
      stat.totalStudents,
      stat.totalPass,
      stat.totalFail,
      `${stat.passPercentage}%`,
    ]);

    autoTable(doc, {
      startY: statsY + 3,
      margin: { left: 15, right: 15, bottom: 25 },
      head: [['S.No.', 'Subject Code', 'Subject Name', 'Appeared', 'Passed', 'Failed', 'Pass Rate']],
      body: subjectStatsRows,
      theme: 'grid',
      headStyles: {
        fillColor: [15, 23, 42], // Slate 900
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 7.5,
      },
      styles: {
        fontSize: 7.5,
        cellPadding: 1.5,
        valign: 'middle',
      },
      columnStyles: {
        0: { cellWidth: 15, halign: 'center' },
        1: { cellWidth: 35, fontStyle: 'bold' },
        2: { cellWidth: 105 },
        3: { cellWidth: 25, halign: 'center' },
        4: { cellWidth: 25, halign: 'center', textColor: [5, 122, 85] },
        5: { cellWidth: 25, halign: 'center', textColor: [185, 28, 28] },
        6: { cellWidth: 25, halign: 'center', fontStyle: 'bold' },
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 6) {
          const pct = parseFloat(String(data.cell.raw).replace('%', ''));
          if (pct >= 75) {
            data.cell.styles.textColor = [5, 122, 85];
          } else if (pct < 50) {
            data.cell.styles.textColor = [185, 28, 28];
          }
        }
      },
    });
  }

  // --- SIGNATURE SECTION ---
  let finalY = (doc as any).lastAutoTable?.finalY || 140;
  let sigY = finalY + 18; // ~4 rows gap
  if (sigY > 185) {
    if (finalY <= 167) {
      sigY = 185;
    } else {
      doc.addPage();
      sigY = 35;
    }
  }

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text('HOD', 15, sigY);
  doc.text('PRINCIPAL', 282, sigY, { align: 'right' });

  // Footer / Page numbers / Legend helper
  const totalPages = (doc as any).internal.getNumberOfPages();
  const pageHeight = doc.internal.pageSize.height; // 210 for landscape
  
  const hasNC = uniqueSubjectsList.some(sub => sub.isNonCredit);
  const legends = uniqueSubjectsList
    .filter(sub => sub.code)
    .map(sub => sub.isNonCredit ? `${sub.code}* (Non-Credit): ${sub.name}` : `${sub.code}: ${sub.name}`)
    .join('  |  ');

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    
    // Draw thin separator line above footer area
    doc.setDrawColor(226, 232, 240); // Slate 200
    doc.setLineWidth(0.3);
    doc.line(15, pageHeight - 20, 282, pageHeight - 20);

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139); // Slate 500
    
    if (legends) {
      const ncNote = hasNC ? '  [* Non-Credit Subject - Excluded from Total Marks]' : '';
      doc.text(`Subject Legend:  ${legends}${ncNote}`, 15, pageHeight - 16, { maxWidth: 267 });
    }

    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184); // Slate 400
    doc.text('Detailed Academic Register (Landscape)', 15, pageHeight - 5);
    doc.text(`Page ${i} of ${totalPages}`, 282, pageHeight - 5, { align: 'right' });
  }

  // Save the PDF
  let departmentShortName = '';
  for (const rec of records) {
    const dept = getDepartmentFromUsn(rec.usn);
    if (dept) {
      departmentShortName = dept.short;
      break;
    }
  }
  const deptPart = departmentShortName || 'DEPT';
  const semPart = semesterNumber || '0';
  const filename = `SMVCER_${deptPart}_${semPart}_detailed_result_analysis.pdf`;
  doc.save(filename);
}
