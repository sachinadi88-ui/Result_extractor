import { StudentRecord, SubjectResult } from '../types';

export interface MergeResult {
  recordsToSave: StudentRecord[];
  updatedAllRecords: StudentRecord[];
  extractedSemesters: string[];
  summary: {
    createdCount: number;
    updatedCount: number;
    skippedCount: number;
    updatedDetails: string[];
  };
}

/**
 * Normalizes semester text (e.g. "Semester : 4", "Sem 3", "3rd", "3") into a simple digit string "3", "4", etc.
 */
export function normalizeSemester(sem?: string): string {
  if (!sem) return '';
  const match = String(sem).match(/\d+/);
  return match ? match[0] : String(sem).trim();
}

function normalizeStr(s?: string): string {
  if (!s) return '';
  return String(s).trim().toUpperCase();
}

function normalizeMarkVal(val?: string | number): string {
  if (val === undefined || val === null) return '';
  return String(val).trim();
}

/**
 * Calculates effective overall pass/fail status for a record based on subject results
 */
export function calculateRecordStatus(subjects: SubjectResult[]): 'PASS' | 'FAIL' {
  if (!subjects || subjects.length === 0) return 'PASS';
  const hasFail = subjects.some((sub) => {
    if (sub.isNonCredit) return false;
    const res = (sub.result || '').trim().toUpperCase();
    return res === 'F' || res === 'FAIL' || res === 'A' || res === 'ABSENT';
  });
  return hasFail ? 'FAIL' : 'PASS';
}

/**
 * Merges newly extracted student records with existing stored student records.
 * 
 * Rules enforced:
 * 1. Checks USN and Semester for existing records.
 * 2. Compares individual subject marks (internalMarks, externalMarks, totalMarks, result, grade).
 * 3. If marks/result are identical for an existing semester record -> skips duplicate row.
 * 4. If lower semester backlog / re-evaluation results are present on the sheet -> updates the previously stored lower semester record in place!
 * 5. Strictly prevents creating new rows with empty subjects or duplicate entries.
 */
export function mergeExtractedStudentsWithExisting(
  allExistingRecords: StudentRecord[],
  newStudents: Omit<StudentRecord, 'id' | 'uploadedAt'>[],
  imageBase64: string
): MergeResult {
  // Map of all records indexed by record ID (deep clone for safe mutation)
  const recordsMap = new Map<string, StudentRecord>();
  allExistingRecords.forEach((r) => {
    recordsMap.set(r.id, JSON.parse(JSON.stringify(r)));
  });

  const recordsToSaveMap = new Map<string, StudentRecord>();
  const updatedDetails: string[] = [];
  const extractedSemSet = new Set<string>();

  let createdCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;

  for (let i = 0; i < newStudents.length; i++) {
    const newStudent = newStudents[i];
    const newUsn = normalizeStr(newStudent.usn);
    const newSem = normalizeSemester(newStudent.semester);
    const inputSubjects = newStudent.subjects || [];

    // Filter out completely empty or invalid subject objects
    const validSubjects = inputSubjects.filter(
      (s) => normalizeStr(s.subjectCode) || normalizeStr(s.subjectName)
    );

    // If completely empty record (no USN and no valid subjects), ignore completely
    if (!newUsn && validSubjects.length === 0) {
      skippedCount++;
      continue;
    }

    if (newSem) {
      extractedSemSet.add(newSem);
    }

    if (!newUsn) {
      // If no USN but has valid subjects, create a record only if valid subjects exist
      const newRec: StudentRecord = {
        ...newStudent,
        subjects: validSubjects,
        status: calculateRecordStatus(validSubjects),
        id: `rec-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 4)}`,
        uploadedAt: new Date().toISOString(),
        imageUrl: imageBase64,
      };
      recordsMap.set(newRec.id, newRec);
      recordsToSaveMap.set(newRec.id, newRec);
      createdCount++;
      continue;
    }

    // Find all existing records for this USN
    const studentExistingRecords: StudentRecord[] = [];
    for (const rec of recordsMap.values()) {
      if (normalizeStr(rec.usn) === newUsn) {
        studentExistingRecords.push(rec);
      }
    }

    // Try to find exact semester record match
    let exactSemRecord: StudentRecord | null = null;
    const studentOtherSemRecords: StudentRecord[] = [];

    for (const rec of studentExistingRecords) {
      const existingSem = normalizeSemester(rec.semester);
      if (newSem && existingSem === newSem) {
        exactSemRecord = rec;
      } else {
        studentOtherSemRecords.push(rec);
      }
    }

    // If newSem is empty or omitted, but student has existing records:
    // If subjects overlap with an existing record, match that existing record!
    if (!exactSemRecord && !newSem && studentExistingRecords.length > 0) {
      for (const rec of studentExistingRecords) {
        const existingCodes = new Set((rec.subjects || []).map((s) => normalizeStr(s.subjectCode)).filter(Boolean));
        const existingNames = new Set((rec.subjects || []).map((s) => normalizeStr(s.subjectName)).filter(Boolean));

        const hasOverlap = validSubjects.some((s) => {
          const code = normalizeStr(s.subjectCode);
          const name = normalizeStr(s.subjectName);
          return (code && existingCodes.has(code)) || (name && existingNames.has(name));
        });

        if (hasOverlap) {
          exactSemRecord = rec;
          break;
        }
      }

      if (!exactSemRecord && studentExistingRecords.length === 1) {
        exactSemRecord = studentExistingRecords[0];
      }
    }

    if (exactSemRecord) {
      // Record for this USN + Semester ALREADY EXISTS
      let recordUpdated = false;
      const existingSubjects = [...(exactSemRecord.subjects || [])];

      for (const newSub of validSubjects) {
        const newSubCode = normalizeStr(newSub.subjectCode);
        const newSubName = normalizeStr(newSub.subjectName);

        const existingSubIdx = existingSubjects.findIndex((s) => {
          const sCode = normalizeStr(s.subjectCode);
          const sName = normalizeStr(s.subjectName);
          return (newSubCode && sCode && newSubCode === sCode) || (newSubName && sName && newSubName === sName);
        });

        if (existingSubIdx >= 0) {
          const existingSub = existingSubjects[existingSubIdx];
          const iaSame = normalizeMarkVal(existingSub.internalMarks) === normalizeMarkVal(newSub.internalMarks);
          const eaSame = normalizeMarkVal(existingSub.externalMarks) === normalizeMarkVal(newSub.externalMarks);
          const totSame = normalizeMarkVal(existingSub.totalMarks) === normalizeMarkVal(newSub.totalMarks);
          const resSame = normalizeStr(existingSub.result) === normalizeStr(newSub.result);
          const gradeSame = normalizeStr(existingSub.grade) === normalizeStr(newSub.grade);

          if (!iaSame || !eaSame || !totSame || !resSame || !gradeSame) {
            const oldRes = existingSub.result || '-';
            const newRes = newSub.result || '-';

            existingSubjects[existingSubIdx] = {
              ...existingSub,
              subjectCode: newSub.subjectCode || existingSub.subjectCode,
              subjectName: newSub.subjectName || existingSub.subjectName,
              internalMarks: newSub.internalMarks !== undefined && newSub.internalMarks !== '' ? newSub.internalMarks : existingSub.internalMarks,
              externalMarks: newSub.externalMarks !== undefined && newSub.externalMarks !== '' ? newSub.externalMarks : existingSub.externalMarks,
              totalMarks: newSub.totalMarks !== undefined && newSub.totalMarks !== '' ? newSub.totalMarks : existingSub.totalMarks,
              result: newSub.result || existingSub.result,
              grade: newSub.grade || existingSub.grade,
              credits: newSub.credits || existingSub.credits,
            };
            recordUpdated = true;
            updatedDetails.push(`${exactSemRecord.usn} (Sem ${exactSemRecord.semester || 'Current'}): ${newSub.subjectCode} [${oldRes} -> ${newRes}]`);
          }
        } else {
          // Check if subject belongs to another semester record (e.g. backlog result)
          let updatedLowerSem = false;
          for (const otherRec of studentOtherSemRecords) {
            const otherSubIdx = (otherRec.subjects || []).findIndex((s) => {
              const sCode = normalizeStr(s.subjectCode);
              const sName = normalizeStr(s.subjectName);
              return (newSubCode && sCode && newSubCode === sCode) || (newSubName && sName && newSubName === sName);
            });

            if (otherSubIdx >= 0) {
              const existingSub = otherRec.subjects[otherSubIdx];
              const iaSame = normalizeMarkVal(existingSub.internalMarks) === normalizeMarkVal(newSub.internalMarks);
              const eaSame = normalizeMarkVal(existingSub.externalMarks) === normalizeMarkVal(newSub.externalMarks);
              const totSame = normalizeMarkVal(existingSub.totalMarks) === normalizeMarkVal(newSub.totalMarks);
              const resSame = normalizeStr(existingSub.result) === normalizeStr(newSub.result);

              if (!iaSame || !eaSame || !totSame || !resSame) {
                const oldRes = existingSub.result || '-';
                const newRes = newSub.result || '-';

                otherRec.subjects[otherSubIdx] = {
                  ...existingSub,
                  internalMarks: newSub.internalMarks !== undefined && newSub.internalMarks !== '' ? newSub.internalMarks : existingSub.internalMarks,
                  externalMarks: newSub.externalMarks !== undefined && newSub.externalMarks !== '' ? newSub.externalMarks : existingSub.externalMarks,
                  totalMarks: newSub.totalMarks !== undefined && newSub.totalMarks !== '' ? newSub.totalMarks : existingSub.totalMarks,
                  result: newSub.result || existingSub.result,
                  grade: newSub.grade || existingSub.grade,
                  credits: newSub.credits || existingSub.credits,
                };
                otherRec.status = calculateRecordStatus(otherRec.subjects);
                recordsMap.set(otherRec.id, otherRec);
                recordsToSaveMap.set(otherRec.id, otherRec);
                updatedCount++;
                updatedDetails.push(`${otherRec.usn} (Lower Sem ${otherRec.semester}): Backlog ${newSub.subjectCode} updated [${oldRes} -> ${newRes}]`);
              }
              updatedLowerSem = true;
              break;
            }
          }

          if (!updatedLowerSem) {
            // New subject for this semester record
            existingSubjects.push({ ...newSub });
            recordUpdated = true;
          }
        }
      }

      if (recordUpdated) {
        exactSemRecord.subjects = existingSubjects;
        exactSemRecord.status = calculateRecordStatus(existingSubjects);
        if (newStudent.sgpa !== undefined) exactSemRecord.sgpa = newStudent.sgpa;
        if (newStudent.cgpa !== undefined) exactSemRecord.cgpa = newStudent.cgpa;

        recordsMap.set(exactSemRecord.id, exactSemRecord);
        recordsToSaveMap.set(exactSemRecord.id, exactSemRecord);
        updatedCount++;
      } else {
        skippedCount++;
      }

    } else {
      // Record for this USN + Semester DOES NOT EXIST YET.
      // Check if all validSubjects already belong to existing semester records of this student!
      const mainSemesterSubjects: SubjectResult[] = [];

      for (const newSub of validSubjects) {
        const newSubCode = normalizeStr(newSub.subjectCode);
        const newSubName = normalizeStr(newSub.subjectName);

        let belongsToOtherSem = false;

        for (const otherRec of studentOtherSemRecords) {
          const otherSubIdx = (otherRec.subjects || []).findIndex((s) => {
            const sCode = normalizeStr(s.subjectCode);
            const sName = normalizeStr(s.subjectName);
            return (newSubCode && sCode && newSubCode === sCode) || (newSubName && sName && newSubName === sName);
          });

          if (otherSubIdx >= 0) {
            const existingSub = otherRec.subjects[otherSubIdx];
            const iaSame = normalizeMarkVal(existingSub.internalMarks) === normalizeMarkVal(newSub.internalMarks);
            const eaSame = normalizeMarkVal(existingSub.externalMarks) === normalizeMarkVal(newSub.externalMarks);
            const totSame = normalizeMarkVal(existingSub.totalMarks) === normalizeMarkVal(newSub.totalMarks);
            const resSame = normalizeStr(existingSub.result) === normalizeStr(newSub.result);

            if (!iaSame || !eaSame || !totSame || !resSame) {
              const oldRes = existingSub.result || '-';
              const newRes = newSub.result || '-';

              otherRec.subjects[otherSubIdx] = {
                ...existingSub,
                internalMarks: newSub.internalMarks !== undefined && newSub.internalMarks !== '' ? newSub.internalMarks : existingSub.internalMarks,
                externalMarks: newSub.externalMarks !== undefined && newSub.externalMarks !== '' ? newSub.externalMarks : existingSub.externalMarks,
                totalMarks: newSub.totalMarks !== undefined && newSub.totalMarks !== '' ? newSub.totalMarks : existingSub.totalMarks,
                result: newSub.result || existingSub.result,
                grade: newSub.grade || existingSub.grade,
                credits: newSub.credits || existingSub.credits,
              };
              otherRec.status = calculateRecordStatus(otherRec.subjects);
              recordsMap.set(otherRec.id, otherRec);
              recordsToSaveMap.set(otherRec.id, otherRec);
              updatedCount++;
              updatedDetails.push(`${otherRec.usn} (Lower Sem ${otherRec.semester}): Backlog ${newSub.subjectCode} updated [${oldRes} -> ${newRes}]`);
            }
            belongsToOtherSem = true;
            break;
          }
        }

        if (!belongsToOtherSem) {
          mainSemesterSubjects.push({ ...newSub });
        }
      }

      // DO NOT CREATE A NEW ROW WITH EMPTY SUBJECTS if all subjects were already matched to existing records
      if (mainSemesterSubjects.length === 0) {
        skippedCount++;
      } else {
        const newRec: StudentRecord = {
          ...newStudent,
          subjects: mainSemesterSubjects,
          status: calculateRecordStatus(mainSemesterSubjects),
          id: `rec-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 4)}`,
          uploadedAt: new Date().toISOString(),
          imageUrl: imageBase64,
        };

        recordsMap.set(newRec.id, newRec);
        recordsToSaveMap.set(newRec.id, newRec);
        createdCount++;
      }
    }
  }

  return {
    recordsToSave: Array.from(recordsToSaveMap.values()),
    updatedAllRecords: Array.from(recordsMap.values()),
    extractedSemesters: Array.from(extractedSemSet),
    summary: {
      createdCount,
      updatedCount,
      skippedCount,
      updatedDetails,
    },
  };
}
