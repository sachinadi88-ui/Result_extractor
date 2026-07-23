import { StudentRecord } from '../types';

// Helper SVG canvas mock screenshot generator for realistic result cards
export function generateMockResultCardSvg(name: string, usn: string, semester: string, subjects: { code: string; name: string; result: string; marks: string }[]): string {
  const subjectRowsHtml = subjects.map((s, idx) => `
    <tr style="background-color: ${idx % 2 === 0 ? '#f8fafc' : '#ffffff'};">
      <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #334155;">${s.code}</td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; color: #1e293b;">${s.name}</td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; text-align: center; font-weight: bold; color: ${s.result === 'PASS' || s.result === 'P' ? '#16a34a' : '#dc2626'};">${s.result}</td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; text-align: right; color: #475569;">${s.marks}</td>
    </tr>
  `).join('');

  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="700" height="500" viewBox="0 0 700 500">
    <rect width="700" height="500" fill="#f1f5f9" rx="12"/>
    <rect x="20" y="20" width="660" height="460" fill="#ffffff" stroke="#cbd5e1" stroke-width="2" rx="8"/>
    
    <!-- Header -->
    <rect x="20" y="20" width="660" height="70" fill="#1e3a8a" rx="8"/>
    <text x="350" y="50" font-family="Arial, sans-serif" font-size="20" font-weight="bold" fill="#ffffff" text-anchor="middle">VISVESVARAYA TECHNOLOGICAL UNIVERSITY</text>
    <text x="350" y="72" font-family="Arial, sans-serif" font-size="13" fill="#93c5fd" text-anchor="middle">Provisional Examination Results - ${semester}</text>
    
    <!-- Student Details Box -->
    <rect x="40" y="105" width="620" height="65" fill="#f8fafc" stroke="#e2e8f0" rx="6"/>
    <text x="60" y="130" font-family="Arial, sans-serif" font-size="12" fill="#64748b" font-weight="bold">STUDENT NAME:</text>
    <text x="170" y="130" font-family="Arial, sans-serif" font-size="14" fill="#0f172a" font-weight="bold">${name}</text>
    
    <text x="60" y="155" font-family="Arial, sans-serif" font-size="12" fill="#64748b" font-weight="bold">USN / REG NO:</text>
    <text x="170" y="155" font-family="Arial, sans-serif" font-size="14" fill="#1e40af" font-weight="bold">${usn}</text>
    
    <text x="450" y="130" font-family="Arial, sans-serif" font-size="12" fill="#64748b" font-weight="bold">SEMESTER:</text>
    <text x="540" y="130" font-family="Arial, sans-serif" font-size="13" fill="#0f172a">${semester}</text>

    <!-- Table Header -->
    <foreignObject x="40" y="185" width="620" height="280">
      <div xmlns="http://www.w3.org/1999/xhtml" style="font-family: Arial, sans-serif; font-size: 13px;">
        <table style="width: 100%; border-collapse: collapse; border: 1px solid #cbd5e1;">
          <thead>
            <tr style="background-color: #2563eb; color: #ffffff;">
              <th style="padding: 10px 12px; text-align: left; width: 110px;">Subject Code</th>
              <th style="padding: 10px 12px; text-align: left;">Subject Name</th>
              <th style="padding: 10px 12px; text-align: center; width: 90px;">Result</th>
              <th style="padding: 10px 12px; text-align: right; width: 90px;">Marks</th>
            </tr>
          </thead>
          <tbody>
            ${subjectRowsHtml}
          </tbody>
        </table>
      </div>
    </foreignObject>
  </svg>`;

  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

export const sampleStudentRecords: StudentRecord[] = [
  {
    id: 'sample-1',
    usn: '1MS21CS042',
    name: 'ADITYA R. SHARMA',
    college: 'M.S. Ramaiah Institute of Technology',
    semester: '5th Semester B.E.',
    examination: 'Dec 2023 / Jan 2024',
    sgpa: '8.75',
    status: 'PASS',
    uploadedAt: new Date().toISOString(),
    imageUrl: generateMockResultCardSvg('ADITYA R. SHARMA', '1MS21CS042', '5th Semester B.E.', [
      { code: '21CS51', name: 'Software Engineering & Agile', result: 'PASS', marks: '88/100' },
      { code: '21CS52', name: 'Computer Networks', result: 'PASS', marks: '84/100' },
      { code: '21CS53', name: 'Database Management Systems', result: 'PASS', marks: '91/100' },
      { code: '21CS54', name: 'Theory of Computation', result: 'PASS', marks: '79/100' },
      { code: '21CSL55', name: 'DBMS & Networks Lab', result: 'PASS', marks: '95/100' }
    ]),
    subjects: [
      { subjectCode: '21CS51', subjectName: 'Software Engineering & Agile', result: 'PASS', internalMarks: '45', externalMarks: '43', totalMarks: '88', grade: 'A+' },
      { subjectCode: '21CS52', subjectName: 'Computer Networks', result: 'PASS', internalMarks: '42', externalMarks: '42', totalMarks: '84', grade: 'A' },
      { subjectCode: '21CS53', subjectName: 'Database Management Systems', result: 'PASS', internalMarks: '48', externalMarks: '43', totalMarks: '91', grade: 'S' },
      { subjectCode: '21CS54', subjectName: 'Theory of Computation', result: 'PASS', internalMarks: '38', externalMarks: '41', totalMarks: '79', grade: 'B+' },
      { subjectCode: '21CSL55', subjectName: 'DBMS & Networks Lab', result: 'PASS', internalMarks: '49', externalMarks: '46', totalMarks: '95', grade: 'S' }
    ]
  },
  {
    id: 'sample-2',
    usn: '1MS21EC088',
    name: 'MEGHA KULKARNI',
    college: 'M.S. Ramaiah Institute of Technology',
    semester: '5th Semester B.E.',
    examination: 'Dec 2023 / Jan 2024',
    sgpa: '9.20',
    status: 'PASS',
    uploadedAt: new Date(Date.now() - 3600000).toISOString(),
    imageUrl: generateMockResultCardSvg('MEGHA KULKARNI', '1MS21EC088', '5th Semester B.E.', [
      { code: '21EC51', name: 'Digital Signal Processing', result: 'PASS', marks: '92/100' },
      { code: '21EC52', name: 'VLSI Design Technology', result: 'PASS', marks: '89/100' },
      { code: '21EC53', name: 'Information Theory & Coding', result: 'PASS', marks: '94/100' },
      { code: '21EC54', name: 'Microcontrollers & Embedded', result: 'PASS', marks: '86/100' }
    ]),
    subjects: [
      { subjectCode: '21EC51', subjectName: 'Digital Signal Processing', result: 'PASS', internalMarks: '47', externalMarks: '45', totalMarks: '92', grade: 'S' },
      { subjectCode: '21EC52', subjectName: 'VLSI Design Technology', result: 'PASS', internalMarks: '46', externalMarks: '43', totalMarks: '89', grade: 'A+' },
      { subjectCode: '21EC53', subjectName: 'Information Theory & Coding', result: 'PASS', internalMarks: '49', externalMarks: '45', totalMarks: '94', grade: 'S' },
      { subjectCode: '21EC54', subjectName: 'Microcontrollers & Embedded', result: 'PASS', internalMarks: '44', externalMarks: '42', totalMarks: '86', grade: 'A' }
    ]
  },
  {
    id: 'sample-3',
    usn: '1MS21ME014',
    name: 'ROHAN DESHMUKH',
    college: 'M.S. Ramaiah Institute of Technology',
    semester: '5th Semester B.E.',
    examination: 'Dec 2023 / Jan 2024',
    sgpa: '6.40',
    status: 'FAIL',
    uploadedAt: new Date(Date.now() - 7200000).toISOString(),
    imageUrl: generateMockResultCardSvg('ROHAN DESHMUKH', '1MS21ME014', '5th Semester B.E.', [
      { code: '21ME51', name: 'Design of Machine Elements', result: 'FAIL', marks: '32/100' },
      { code: '21ME52', name: 'Applied Thermodynamics', result: 'PASS', marks: '68/100' },
      { code: '21ME53', name: 'Fluid Mechanics & Turbines', result: 'PASS', marks: '74/100' },
      { code: '21ME54', name: 'Manufacturing Process II', result: 'PASS', marks: '61/100' }
    ]),
    subjects: [
      { subjectCode: '21ME51', subjectName: 'Design of Machine Elements', result: 'FAIL', internalMarks: '18', externalMarks: '14', totalMarks: '32', grade: 'F' },
      { subjectCode: '21ME52', subjectName: 'Applied Thermodynamics', result: 'PASS', internalMarks: '32', externalMarks: '36', totalMarks: '68', grade: 'B' },
      { subjectCode: '21ME53', subjectName: 'Fluid Mechanics & Turbines', result: 'PASS', internalMarks: '36', externalMarks: '38', totalMarks: '74', grade: 'B+' },
      { subjectCode: '21ME54', subjectName: 'Manufacturing Process II', result: 'PASS', internalMarks: '30', externalMarks: '31', totalMarks: '61', grade: 'C' }
    ]
  }
];
