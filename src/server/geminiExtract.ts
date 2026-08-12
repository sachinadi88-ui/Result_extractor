import { GoogleGenAI, Type } from "@google/genai";

let genAIInstance: GoogleGenAI | null = null;

function getGenAI(): GoogleGenAI {
  if (!genAIInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required.");
    }
    genAIInstance = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return genAIInstance;
}

function cleanMarkVal(val: any): string {
  if (val === undefined || val === null) return '';
  const str = String(val).trim();
  if (!str) return '';
  // If string is already a pure integer
  if (/^\d+$/.test(str)) return str;
  // If string contains trailing words like "45 presidency examination Marks" or "7 External Marks"
  const match = str.match(/\b\d+\b/);
  if (match) return match[0];
  return str;
}

function cleanResultVal(val: any): string {
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

function cleanSubjectNameVal(name: string): string {
  if (!name) return '';
  let s = String(name).trim();
  s = s.replace(/presidency examination Marks/gi, '');
  s = s.replace(/examination Marks/gi, '');
  s = s.replace(/External Marks \d*/gi, '');
  s = s.replace(/Internal Marks \d*/gi, '');
  s = s.replace(/Result [PF]/gi, '');
  s = s.replace(/Announced Date \d{4}-\d{2}-\d{2}/gi, '');
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}

export async function processExtractResult(imageBase64: string, mimeType: string = "image/png") {
  if (!imageBase64) {
    throw new Error("Image data is required");
  }

  const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");
  const ai = getGenAI();

  const modelsToTry = ["gemini-3.6-flash", "gemini-3.1-flash-lite", "gemini-flash-latest"];
  let lastError: any = null;
  let response: any = null;

  for (const modelName of modelsToTry) {
    try {
      response = await ai.models.generateContent({
        model: modelName,
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: mimeType,
                data: cleanBase64,
              },
            },
            {
              text: `Analyze this student result / marks card / grade sheet screenshot.
CRITICAL INSTRUCTIONS FOR EXTRACTION:

1. STRICT SUBJECT CODE AND SUBJECT NAME ALIGNMENT:
   - The result table always contains a "Subject Code" (or "Sub Code" / "Course Code") column and an adjacent "Subject Name" (or "Subject Title" / "Course Title") column.
   - Read row by row: Extract the EXACT Subject Code from the Subject Code column (e.g., "BCS401", "21CS42", "18MAT31", "BBOC407", "21CSL48", "21MAT31") and pair it with its corresponding Subject Name from the adjacent cell in that exact same row (e.g., "ANALYSIS & DESIGN OF ALGORITHMS").
   - If Subject Code and Subject Name are merged in a single cell (e.g. "BCS401 - ANALYSIS & DESIGN OF ALGORITHMS" or "21CS42 DATA STRUCTURES"), split them cleanly so subjectCode gets the code and subjectName gets the title.
   - EVERY subject row MUST have both subjectCode and subjectName populated. Do NOT skip or leave subjectCode blank!

2. CLEAN NUMERIC MARKS & NO COLUMN HEADER NOISE:
   - Extract ONLY clean digits for internalMarks, externalMarks, and totalMarks (e.g. "45", "7", "52").
   - DO NOT include column labels, header words, or footer text like "presidency examination Marks", "External Marks", "Result P", "Announced Date 2025-08-19" inside subject fields, marks, or subject names!
   - Result MUST be a clean result code like "PASS", "FAIL", "P", or "F".

3. WATERMARKS & EXTERNAL MARKS:
   - University screenshots (such as VTU) have a large semi-transparent circular watermark or emblem in the background passing through middle columns.
   - IGNORE the background emblem and extract actual printed numbers in External Marks.
   - MATH FORMULA MANDATE: Total Marks = Internal Marks + External Marks. Therefore, External Marks = Total Marks - Internal Marks. If External Marks is faint or obscured, calculate it using (Total Marks - Internal Marks)!

4. SEMESTER & MULTI-SEMESTER EXTRACTION:
   - Carefully detect the Semester / Term from headers or table titles (e.g., "1st Sem", "2nd Sem", "Semester : 1", "Semester : 2", "I Sem", "II Sem").
   - Always map the semester to a clean single digit string e.g. "1", "2", "3", "4".
   - If the screenshot shows results for multiple semesters (e.g. 1st Sem table AND 2nd Sem table), extract a SEPARATE student object for EACH semester, setting semester to "1" for the 1st sem entry and "2" for the 2nd sem entry!

Extract all fields carefully:
1. Student USN / Roll Number / Register Number (e.g. 3SL23CS039).
2. Student Full Name (e.g. MOHAMMED GAFFAR AASIM).
3. College / Institution Name (if present).
4. Semester / Term (e.g. "1", "2", "3", "4").
5. Examination Session / Announced Date (if present).
6. Overall SGPA / CGPA / Status.
7. ALL Subjects in the table:
   - subjectCode (e.g. BCS401, BBOC407, 21CS42)
   - subjectName (e.g. ANALYSIS & DESIGN OF ALGORITHMS)
   - internalMarks (ONLY numeric string e.g. "22")
   - externalMarks (ONLY numeric string e.g. "20"). If faint, derive using (Total - Internal)!
   - totalMarks (ONLY numeric string e.g. "42")
   - result (ONLY "P", "F", "PASS", or "FAIL")
   - grade / credits if present.`,
            },
          ],
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              students: {
                type: Type.ARRAY,
                description: "List of students extracted from screenshot",
                items: {
                  type: Type.OBJECT,
                  properties: {
                    usn: { type: Type.STRING, description: "Student USN or Roll No" },
                    name: { type: Type.STRING, description: "Student Full Name" },
                    college: { type: Type.STRING, description: "College or Institution Name" },
                    semester: { type: Type.STRING, description: "Semester or Year" },
                    examination: { type: Type.STRING, description: "Exam session" },
                    sgpa: { type: Type.STRING, description: "SGPA if available" },
                    cgpa: { type: Type.STRING, description: "CGPA if available" },
                    status: { type: Type.STRING, description: "Overall result status" },
                    subjects: {
                      type: Type.ARRAY,
                      description: "List of subjects and corresponding results",
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          subjectCode: { type: Type.STRING, description: "Alphanumeric subject code extracted from the 'Subject Code' column (e.g. BCS401, 21CS42, 18MAT31)" },
                          subjectName: { type: Type.STRING, description: "Subject name extracted from the adjacent 'Subject Name' / 'Subject Title' column (e.g. ANALYSIS & DESIGN OF ALGORITHMS)" },
                          result: { type: Type.STRING, description: "Result or grade from next column" },
                          internalMarks: { 
                            type: Type.STRING, 
                            description: "Internal assessment marks (Continuous Internal Evaluation / CIE / IA / Int / IA Marks / Internal / CIE Marks)" 
                          },
                          externalMarks: { 
                            type: Type.STRING, 
                            description: "External exam marks (Semester End Examination / SEE / EA / Ext / EXT / SEE Marks / External Assessment / Theory / Written / End Sem / EA Marks)" 
                          },
                          totalMarks: { type: Type.STRING, description: "Total marks" },
                          grade: { type: Type.STRING, description: "Grade letter" },
                          credits: { type: Type.STRING, description: "Credits" },
                        },
                        required: ["subjectCode", "subjectName", "result"],
                      },
                    },
                  },
                  required: ["usn", "name", "subjects"],
                },
              },
            },
            required: ["students"],
          },
        },
      });
      if (response) break;
    } catch (err: any) {
      lastError = err;
      const errStr = err?.message || String(err);
      if (
        errStr.includes("not found") ||
        errStr.includes("404") ||
        errStr.includes("INVALID_ARGUMENT") ||
        errStr.includes("PERMISSION_DENIED") ||
        errStr.includes("403") ||
        errStr.includes("model")
      ) {
        continue;
      } else {
        throw err;
      }
    }
  }

  if (!response && lastError) {
    throw lastError;
  }

  const jsonText = response.text || "{}";
  const parsedData = JSON.parse(jsonText);

  // Safe post-processing to align any variations in keys with our TypeScript interface (SubjectResult)
  const students = (parsedData.students || []).map((student: any) => {
    if (student.subjects && Array.isArray(student.subjects)) {
      student.subjects = student.subjects.map((sub: any) => {
        // Unify external marks variations
        const extVal = sub.externalMarks || sub.ext || sub.external || sub.see || sub.ea || sub.external_marks || sub.extMarks;
        // Unify internal marks variations
        const intVal = sub.internalMarks || sub.int || sub.internal || sub.cie || sub.ia || sub.internal_marks || sub.intMarks;
        // Unify total marks variations
        const totVal = sub.totalMarks || sub.total || sub.tot || sub.total_marks || sub.totMarks;
        // Unify subject code variations
        const subCode = sub.subjectCode || sub.code || sub.subCode || sub.subject_code;
        // Unify subject name variations
        const subName = sub.subjectName || sub.name || sub.subName || sub.subject_name;
        // Unify result / grade variations
        const resVal = sub.result || sub.grade || sub.remarks || sub.status;

        let finalCode = subCode !== undefined && subCode !== null ? String(subCode).trim() : '';
        let finalName = subName !== undefined && subName !== null ? String(subName).trim() : '';

        // Auto-detect and split subject code & name if code is missing or prefixed in name
        if (!finalCode && finalName) {
          // Look for subject code pattern at start of subjectName (e.g., BCS401 - ANALYSIS & DESIGN OR 21CS42 DATA STRUCTURES)
          const match = finalName.match(/^([A-Z0-9]{3,12})[\s\-:\/]+(.+)$/i);
          if (match) {
            finalCode = match[1].toUpperCase();
            finalName = match[2].trim();
          }
        } else if (finalCode && !finalName) {
          const match = finalCode.match(/^([A-Z0-9]{3,12})[\s\-:\/]+(.+)$/i);
          if (match) {
            finalCode = match[1].toUpperCase();
            finalName = match[2].trim();
          }
        } else if (finalCode && finalName) {
          // If finalName begins with finalCode (e.g. "BCS401 - ANALYSIS & DESIGN OF ALGORITHMS"), clean finalName
          const escapedCode = finalCode.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
          const repeatRegex = new RegExp(`^${escapedCode}[\\s\\-:\\/]+`, 'i');
          if (repeatRegex.test(finalName)) {
            finalName = finalName.replace(repeatRegex, '').trim();
          }
        }

        finalName = cleanSubjectNameVal(finalName);

        let extMarksStr = cleanMarkVal(extVal);
        let intMarksStr = cleanMarkVal(intVal);
        let totMarksStr = cleanMarkVal(totVal);
        let cleanResStr = cleanResultVal(resVal || sub.result);

        // Mathematical deduction fallback: If externalMarks is missing, "-", "N/A", "null", or empty, derive it from Total Marks - Internal Marks
        if (!extMarksStr || extMarksStr === '-' || extMarksStr === 'N/A' || extMarksStr === 'null') {
          const totNum = parseInt(totMarksStr, 10);
          const intNum = parseInt(intMarksStr, 10);
          if (!isNaN(totNum) && !isNaN(intNum)) {
            extMarksStr = String(Math.max(0, totNum - intNum));
          }
        }

        return {
          ...sub,
          subjectCode: finalCode,
          subjectName: finalName || finalCode,
          externalMarks: extMarksStr,
          internalMarks: intMarksStr,
          totalMarks: totMarksStr,
          result: cleanResStr || sub.result || '',
        };
      });
    }
    return student;
  });

  return {
    success: true,
    students: students,
    rawText: jsonText,
  };
}

export function formatExtractError(err: any): string {
  let userMessage = "Failed to extract student result from screenshot.";
  const errString = err.message || String(err);

  if (errString.includes("GEMINI_API_KEY environment variable is required")) {
    userMessage = "GEMINI_API_KEY is missing. Please add GEMINI_API_KEY in your Vercel Project Settings > Environment Variables.";
  } else if (errString.includes("leaked") || errString.includes("API key was reported as leaked")) {
    userMessage = "Your Gemini API Key has been reported as leaked or compromised. Please update GEMINI_API_KEY in Vercel Project Settings > Environment Variables.";
  } else if (errString.includes("PERMISSION_DENIED") || errString.includes("Permission denied")) {
    userMessage = "Permission Denied: Your Gemini API Key may be invalid, restricted, or expired. Please check GEMINI_API_KEY in Vercel Environment Variables.";
  } else if (errString.includes("API_KEY_INVALID") || errString.includes("API key not valid")) {
    userMessage = "Invalid API Key: Please configure a valid GEMINI_API_KEY in Vercel Project Settings > Environment Variables.";
  } else {
    try {
      const jsonMatch = errString.match(/({.*})/s);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[1]);
        if (parsed.error?.message) {
          userMessage = parsed.error.message;
        }
      } else if (errString && errString.length < 200) {
        userMessage = errString;
      }
    } catch (e) {
      userMessage = errString.substring(0, 200);
    }
  }

  return userMessage;
}
