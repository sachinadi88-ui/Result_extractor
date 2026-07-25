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
CRITICAL INSTRUCTION FOR WATERMARKS & EXTERNAL MARKS:
1. University screenshots (such as VTU) have a large semi-transparent circular watermark or emblem in the background passing through the middle columns (Internal Marks and External Marks).
2. IGNORE the background watermark seal/graphics and extract the actual printed numbers in the External Marks column.
3. MATH FORMULA MANDATE: Total Marks = Internal Marks + External Marks. Therefore, External Marks = Total Marks - Internal Marks. If the External Marks column is faint or obscured by the circular emblem watermark, calculate External Marks by subtracting Internal Marks from Total Marks (e.g., if Total is 42 and Internal is 22, External MUST be 20). DO NOT leave External Marks empty or as "-".

Extract all fields carefully:
1. Student USN / Roll Number / Register Number (e.g. 3SL23CS039).
2. Student Full Name (e.g. MOHAMMED GAFFAR AASIM).
3. College / Institution Name (if present).
4. Semester / Term (e.g. Semester : 4).
5. Examination Session / Announced Date (if present).
6. Overall SGPA / CGPA / Status.
7. ALL Subjects in the table:
   - subjectCode (e.g. BCS401, BBOC407)
   - subjectName (e.g. ANALYSIS & DESIGN OF ALGORITHMS)
   - internalMarks (as string, e.g. "22")
   - externalMarks (as string, e.g. "20", "18", "23", "0", "27", "25"). If faint/obscured by background emblem, derive using (Total - Internal)!
   - totalMarks (as string, e.g. "42")
   - result (e.g. "P", "F", "A")
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
                          subjectCode: { type: Type.STRING, description: "Subject code" },
                          subjectName: { type: Type.STRING, description: "Subject full name" },
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
                        required: ["subjectName", "result"],
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

        let extMarksStr = extVal !== undefined && extVal !== null ? String(extVal).trim() : '';
        let intMarksStr = intVal !== undefined && intVal !== null ? String(intVal).trim() : '';
        let totMarksStr = totVal !== undefined && totVal !== null ? String(totVal).trim() : '';

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
          subjectCode: subCode ? String(subCode).trim() : sub.subjectCode,
          subjectName: subName ? String(subName).trim() : sub.subjectName,
          externalMarks: extMarksStr,
          internalMarks: intMarksStr,
          totalMarks: totMarksStr,
          result: resVal !== undefined && resVal !== null ? String(resVal).trim() : sub.result,
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
