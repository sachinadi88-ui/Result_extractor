import type { VercelRequest, VercelResponse } from '@vercel/node';
import { processExtractResult, formatExtractError } from '../src/server/geminiExtract';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '4.5mb',
    },
  },
  maxDuration: 60,
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        // proceed with body as is
      }
    }

    const { imageBase64, mimeType = "image/png" } = body || {};
    
    if (!imageBase64) {
      return res.status(400).json({ success: false, error: 'Image payload is missing or invalid.' });
    }

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

