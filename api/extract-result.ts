import type { VercelRequest, VercelResponse } from '@vercel/node';
import { processExtractResult, formatExtractError } from '../src/server/geminiExtract';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { imageBase64, mimeType = "image/png" } = req.body || {};
    const result = await processExtractResult(imageBase64, mimeType);
    return res.status(200).json(result);
  } catch (err: any) {
    console.error("Vercel extraction error:", err);
    const userMessage = formatExtractError(err);
    return res.status(500).json({
      success: false,
      error: userMessage,
    });
  }
}
