import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { StudentRecord } from '../types';
import { getEffectiveStatus, getStudentTotalMarks, isStudentPass, isSubjectPass } from './statusHelper';

// Helper to convert the logo to a base64 string for embedding
function getLogoDataUrl(): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = '/smvcer_crest.jpg';
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
      resolve(null);
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

  // Try to load college logo
  const logoUrl = await getLogoDataUrl();

  // Get first student's college/examination as title if present
  const societyName = "HKE Society's";
  const collegeName = "Sir M. Visvesvaraya College of Engineering, Raichur";
  const examName = records[0]?.examination || 'ACADEMIC EXAMINATION REPORT';

  // --- HEADER SECTION ---
  let headerStartY = 11;
  if (logoUrl) {
    doc.addImage(logoUrl, 'JPEG', 15, headerStartY, 22, 22);
    
    // HKE Society's (top, small)
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139); // Slate 500
    doc.text(societyName, 40, headerStartY + 4);
    
    // Sir M. Visvesvaraya College of Engineering, Raichur (below it, larger)
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59); // Slate 800
    doc.text(collegeName, 40, headerStartY + 10, { maxWidth: 150 });
    
    // Examination name
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(71, 85, 105); // Slate 600
    doc.text(examName, 40, headerStartY + 16, { maxWidth: 150 });

    doc.setFontSize(7.5);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 40, headerStartY + 21);
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
    
    // Examination name
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105); // Slate 600
    doc.text(examName, 15, headerStartY + 16, { maxWidth: 180 });

    doc.setFontSize(8);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 15, headerStartY + 21);
  }

  // Draw thin header divider
  doc.setDrawColor(226, 232, 240); // Slate 200
  doc.setLineWidth(0.5);
  doc.line(15, 38, 195, 38);

  // --- OVERALL PERFORMANCE STATS BLOCKS (Page 1 Top) ---
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42); // Dark Slate
  doc.text('OVERALL COLLEGE PERFORMANCE SUMMARY', 15, 45);

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
    .filter((item) => item.hasValid)
    .sort((a, b) => b.sum - a.sum)
    .slice(0, 3);

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('TOP ACADEMIC PERFORMERS 🏆', 15, 82);

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

  const statsStartY = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 10 : 110;
  
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('SUBJECT-WISE PASS RATE & STATISTICS', 15, statsStartY);

  if (subjectStatsList.length > 0) {
    autoTable(doc, {
      startY: statsStartY + 4,
      margin: { left: 15, right: 15 },
      head: [['Subject Code', 'Subject Name', 'Enrolled', 'Passed', 'Failed', 'Pass Rate %']],
      body: subjectStatsList.map((stat) => [
        stat.subjectCode || '-',
        stat.subjectName,
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
        0: { cellWidth: 30 },
        1: { cellWidth: 75 },
        2: { cellWidth: 18, halign: 'center' },
        3: { cellWidth: 18, halign: 'center' },
        4: { cellWidth: 18, halign: 'center' },
        5: { cellWidth: 21, halign: 'center', fontStyle: 'bold', textColor: [5, 150, 105] },
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
  const filename = `${collegeName.replace(/[^a-zA-Z0-9]/g, '_')}_Results_Report.pdf`;
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
  const examName = records[0]?.examination || 'ACADEMIC EXAMINATION REPORT';

  // --- HEADER SECTION (LANDSCAPE) ---
  let headerStartY = 10;
  if (logoUrl) {
    doc.addImage(logoUrl, 'JPEG', 15, headerStartY, 18, 18);
    
    // HKE Society's (top, small)
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139); // Slate 500
    doc.text(societyName, 37, headerStartY + 3);
    
    // Sir M. Visvesvaraya College of Engineering, Raichur (below it, larger)
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(11.5);
    doc.setTextColor(30, 41, 59); // Slate 800
    doc.text(collegeName, 37, headerStartY + 8, { maxWidth: 220 });
    
    // Examination name
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105); // Slate 600
    doc.text(examName, 37, headerStartY + 13, { maxWidth: 220 });

    doc.setFontSize(7.5);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 37, headerStartY + 17);
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
    
    // Examination name
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(71, 85, 105);
    doc.text(examName, 15, headerStartY + 13, { maxWidth: 260 });

    doc.setFontSize(7.5);
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
  doc.text(`COLLEGE PERFORMANCE SUMMARY   •   Total Enrolled: ${records.length}   |   Passed: ${totalPass}   |   Pass Percentage: ${passPercentage}%`, 18, headerStartY + 27.5);

  // Find all unique subjects
  const uniqueSubjectsMap = new Map<string, { code: string; name: string }>();

  records.forEach((student) => {
    student.subjects?.forEach((sub) => {
      const code = (sub.subjectCode || '').trim();
      const name = (sub.subjectName || '').trim();
      
      const key = code ? code.toUpperCase() : name.toUpperCase();
      if (key && !uniqueSubjectsMap.has(key)) {
        uniqueSubjectsMap.set(key, { code, name });
      }
    });
  });

  const uniqueSubjectsList = Array.from(uniqueSubjectsMap.entries()).map(([key, value]) => ({
    key,
    code: value.code,
    name: value.name,
  }));

  // Sort subjects to keep columns consistent
  uniqueSubjectsList.sort((a, b) => a.key.localeCompare(b.key));

  const subjectHeaders = uniqueSubjectsList.map(sub => sub.code || (sub.name.length > 15 ? sub.name.substring(0, 12) + '..' : sub.name));

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
        }
      }
    },
  });

  // Footer / Page numbers / Legend helper
  const totalPages = (doc as any).internal.getNumberOfPages();
  const pageHeight = doc.internal.pageSize.height; // 210 for landscape
  
  const legends = uniqueSubjectsList
    .filter(sub => sub.code)
    .map(sub => `${sub.code}: ${sub.name}`)
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
      doc.text(`Subject Legend:  ${legends}`, 15, pageHeight - 16, { maxWidth: 267 });
    }

    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184); // Slate 400
    doc.text('Detailed Academic Register (Landscape)', 15, pageHeight - 5);
    doc.text(`Page ${i} of ${totalPages}`, 282, pageHeight - 5, { align: 'right' });
  }

  // Save the PDF
  const filename = `${collegeName.replace(/[^a-zA-Z0-9]/g, '_')}_Results_Landscape_Report.pdf`;
  doc.save(filename);
}
