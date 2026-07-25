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

  const modelsToTry = ["gemini-3.6-flash", "gemini-2.5-flash", "gemini-3.1-flash-lite"];
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
Carefully extract:
1. Student USN / Roll Number / Register Number / Enrollment Number.
2. Student Full Name.
3. College / Institution Name (if present).
4. Semester / Term / Year (if present).
5. Examination Session (e.g., Dec 2023 / Jan 2024, if present).
6. Overall SGPA / CGPA / Total Marks or Percentage (if present).
7. Overall Result Status (e.g. PASS, FAIL, PROMOTED, FIRST CLASS, etc.).
8. All Subjects listed in the table or columns:
   - Subject code (e.g. 21CS51)
   - Subject name (e.g. Software Engineering)
   - Internal Marks (often labeled as INT, CIE, IA, Internal, CIE Marks, IA Marks).
   - External Marks (often labeled as EXT, SEE, EA, External, SEE Marks, Semester End Exam, Ext, Theory, S.E., E.E., EA Marks). Make sure to extract these values and populate the externalMarks field properly.
   - Total Marks (often labeled as TOT, TOTAL, Total Marks, Combined, Max, or obt).
   - Result / Grade (e.g. PASS, FAIL, S, A+, 85, P, F)
   - Grade letter and credits if visible.

Ensure high accuracy in capturing Internal, External, and Total marks columns. Look closely at columns labeled EXT or SEE for the External marks. If multiple students are shown, extract each student separately.`,
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

        return {
          ...sub,
          subjectCode: subCode ? String(subCode).trim() : sub.subjectCode,
          subjectName: subName ? String(subName).trim() : sub.subjectName,
          externalMarks: extVal !== undefined && extVal !== null ? String(extVal).trim() : sub.externalMarks,
          internalMarks: intVal !== undefined && intVal !== null ? String(intVal).trim() : sub.internalMarks,
          totalMarks: totVal !== undefined && totVal !== null ? String(totVal).trim() : sub.totalMarks,
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
