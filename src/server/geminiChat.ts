import { GoogleGenAI } from "@google/genai";

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

export async function processChatQuery(params: {
  question: string;
  semesterContext?: string;
  studentDataSummary: string;
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
}) {
  const { question, semesterContext, studentDataSummary, conversationHistory } = params;

  if (!question || !question.trim()) {
    throw new Error("Question is required.");
  }

  const ai = getGenAI();

  const systemInstruction = `You are the specialized Academic Data Assistant for this Student Results & Marks Portal (SMVCER).

CRITICAL SCOPE & GUARDRAIL RULES:
1. STRICTLY SCOPED DOMAIN: You can ONLY answer questions related to student marks, academic results, subjects, credits, pass/fail status, toppers, SGPA/marks, faculty, and statistics present in the provided portal dataset.
2. STRICT REFUSAL FOR OFF-TOPIC QUERIES: If the user asks ANY question outside this academic results portal dataset (e.g. general coding, science, weather, personal advice, news, trivia, jokes, history, or anything not in the records), you MUST IMMEDIATELY and POLITELY refuse with:
"I can only answer questions related to the student marks, academic results, and performance data within this portal."
3. ACCURACY & POLISHED FORMATTING:
   - Base all answers strictly on the provided student records and summaries.
   - For toppers: clearly state Rank, Student Name, USN, Total Marks, SGPA, and Semester.
   - Use clean numbered lists (1. , 2. ) or neat markdown tables for multiple students/subjects.
   - Bold key details like **Student Names**, **USNs**, **Marks**, **Pass/Fail status**, and **Credits**.
   - Keep answers clear, readable, well-spaced, and concise.`;

  const promptContext = `CURRENT PORTAL CONTEXT:
Selected Semester Filter: ${semesterContext || 'All / Current Active Semesters'}

STUDENT ACADEMIC RECORDS & SUMMARY:
${studentDataSummary || 'No student records currently uploaded or loaded.'}

CONVERSATION HISTORY:
${Array.isArray(conversationHistory) && conversationHistory.length > 0
  ? conversationHistory.map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n')
  : 'None'}

USER QUESTION:
${question.trim()}
`;

  const modelsToTry = ["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-3.6-flash", "gemini-flash-latest"];
  let response: any = null;
  let lastError: any = null;

  for (const modelName of modelsToTry) {
    try {
      response = await ai.models.generateContent({
        model: modelName,
        contents: promptContext,
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.2,
        },
      });
      if (response && response.text) break;
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

  return {
    success: true,
    answer: response?.text?.trim() || "No answer generated.",
  };
}
