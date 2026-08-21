import { StudentRecord } from '../types';
import { getEffectiveStatus, getStudentTotalMarks, getStudentCreditsSummary, isSubjectPass, getDepartmentFromUsn } from './statusHelper';

export function buildStudentDataSummary(records: StudentRecord[], selectedSemester?: string): string {
  if (!records || records.length === 0) {
    return 'No student marks or results records available in the database currently.';
  }

  const lines: string[] = [];
  lines.push(`Total Students in dataset: ${records.length}`);
  if (selectedSemester && selectedSemester !== 'ALL') {
    lines.push(`Filtered for Semester: ${selectedSemester}`);
  } else {
    lines.push(`Viewing: All Semesters`);
  }

  // Pre-calculate aggregate metrics
  let passCount = 0;
  let failCount = 0;
  const subjectStats: { [key: string]: { code: string; name: string; total: number; pass: number; fail: number; maxMarks: number; topperName: string; topperUsn: string } } = {};

  const rankedStudents = [...records].map((s) => {
    const totMarks = getStudentTotalMarks(s);
    const creds = getStudentCreditsSummary(s);
    const effStatus = getEffectiveStatus(s);
    const sgpaNum = parseFloat(s.sgpa || '0');
    const isPass = effStatus === 'PASS';
    if (isPass) passCount++;
    else failCount++;

    // Track subject stats
    (s.subjects || []).forEach((sub) => {
      if (sub.isNonCredit) return;
      const key = (sub.subjectCode || sub.subjectName || '').trim().toUpperCase();
      if (!key) return;

      if (!subjectStats[key]) {
        subjectStats[key] = {
          code: sub.subjectCode || '',
          name: sub.subjectName || '',
          total: 0,
          pass: 0,
          fail: 0,
          maxMarks: 0,
          topperName: '',
          topperUsn: '',
        };
      }

      subjectStats[key].total += 1;
      const pass = isSubjectPass(sub);
      if (pass) subjectStats[key].pass += 1;
      else subjectStats[key].fail += 1;

      const subTot = parseFloat(String(sub.totalMarks || '0'));
      if (!isNaN(subTot) && subTot > subjectStats[key].maxMarks) {
        subjectStats[key].maxMarks = subTot;
        subjectStats[key].topperName = s.name;
        subjectStats[key].topperUsn = s.usn;
      }
    });

    return {
      usn: s.usn,
      name: s.name,
      semester: s.semester || 'N/A',
      college: s.college || '',
      sgpa: s.sgpa || '-',
      sgpaNum: isNaN(sgpaNum) ? 0 : sgpaNum,
      totalMarks: totMarks.sum,
      totalMarksDisplay: totMarks.display,
      earnedCredits: creds.earnedCredits,
      totalCredits: creds.totalCredits,
      failedCredits: creds.failedCredits,
      status: effStatus,
      subjects: s.subjects || [],
    };
  });

  // Sort by Total Marks descending for ranking
  rankedStudents.sort((a, b) => b.totalMarks - a.totalMarks);

  lines.push(`Overall Pass Count: ${passCount}, Fail Count: ${failCount}, Pass Rate: ${Math.round((passCount / records.length) * 100)}%`);
  lines.push('\n--- STUDENT PERFORMANCE TABLE (Ranked by Total Marks) ---');
  
  rankedStudents.forEach((st, idx) => {
    const subDetails = (st.subjects || []).map((sub) => {
      const p = isSubjectPass(sub) ? 'P' : 'F';
      const c = sub.credits ? `(${sub.credits}Cr)` : '';
      const nc = sub.isNonCredit ? '[NC]' : '';
      return `${sub.subjectCode || sub.subjectName}: Int=${sub.internalMarks || '-'}/Ext=${sub.externalMarks || '-'}/Tot=${sub.totalMarks || '-'}[${p}]${c}${nc}`;
    }).join('; ');

    lines.push(
      `Rank ${idx + 1}: USN=${st.usn} | Name=${st.name} | Sem=${st.semester} | Total Marks=${st.totalMarksDisplay} | SGPA=${st.sgpa} | Earned Credits=${st.earnedCredits}/${st.totalCredits} | Status=${st.status} | Subjects=[${subDetails}]`
    );
  });

  lines.push('\n--- SUBJECT PERFORMANCE SUMMARY ---');
  Object.values(subjectStats).forEach((sub) => {
    const rate = sub.total > 0 ? Math.round((sub.pass / sub.total) * 100) : 0;
    lines.push(
      `Subject: ${sub.code} (${sub.name}) | Total Appeared: ${sub.total} | Passed: ${sub.pass} | Failed: ${sub.fail} | Pass%: ${rate}% | Highest Mark: ${sub.maxMarks} (by ${stShort(sub.topperName, sub.topperUsn)})`
    );
  });

  return lines.join('\n');
}

function stShort(name: string, usn: string): string {
  if (!name && !usn) return 'N/A';
  return `${name || 'Unknown'} (${usn || 'N/A'})`;
}
