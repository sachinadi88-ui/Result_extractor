import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));

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

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.post("/api/extract-result", async (req, res) => {
  try {
    const { imageBase64, mimeType = "image/png" } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ success: false, error: "Image data is required" });
    }

    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");
    const ai = getGenAI();

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
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
   - Internal Marks (Internal / IA / CIE / Continuous Evaluation marks)
   - External Marks (External / SEE / EA / Semester Exam marks)
   - Total Marks (Total / Combined Marks / Max Marks)
   - Result / Grade (e.g. PASS, FAIL, S, A+, 85, P, F)
   - Grade letter and credits if visible.

Ensure high accuracy in capturing Internal, External, and Total marks columns. If multiple students are shown, extract each student separately.`,
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
                        internalMarks: { type: Type.STRING, description: "Internal marks" },
                        externalMarks: { type: Type.STRING, description: "External marks" },
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

    const jsonText = response.text || "{}";
    const parsedData = JSON.parse(jsonText);

    res.json({
      success: true,
      students: parsedData.students || [],
      rawText: jsonText,
    });
  } catch (err: any) {
    console.error("Extraction error:", err);
    res.status(500).json({
      success: false,
      error: err.message || "Failed to extract student result from screenshot.",
    });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
