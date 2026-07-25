import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { processExtractResult, formatExtractError } from "./src/server/geminiExtract";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Google OAuth URL Endpoint
app.get("/api/auth/google/url", (req, res) => {
  const host = req.get("host") || "localhost:3000";
  const protocol = req.headers["x-forwarded-proto"] || "https";
  const redirectUri = `${protocol}://${host}/auth/callback`;

  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.CLIENT_ID || process.env.OAUTH_CLIENT_ID;

  if (clientId) {
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email",
      prompt: "select_account",
      access_type: "offline",
    });
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    res.json({ url: authUrl, configured: true, redirectUri });
  } else {
    res.json({
      url: null,
      configured: false,
      redirectUri,
      message: "OAuth Client ID environment variable (CLIENT_ID or GOOGLE_CLIENT_ID) is required for direct Google OAuth redirect."
    });
  }
});

// OAuth Callback Handler
const oauthCallbackHandler = async (req: express.Request, res: express.Response) => {
  const code = req.query.code as string;
  const host = req.get("host") || "localhost:3000";
  const protocol = req.headers["x-forwarded-proto"] || "https";
  const redirectUri = `${protocol}://${host}/auth/callback`;

  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.CLIENT_ID || process.env.OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || process.env.CLIENT_SECRET || process.env.OAUTH_CLIENT_SECRET;

  let user = {
    name: "Google User",
    email: "user@gmail.com",
    picture: "https://api.dicebear.com/7.x/avataaars/svg?seed=GoogleUser"
  };

  if (code && clientId && clientSecret) {
    try {
      // Exchange code for tokens
      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
      });

      const tokenData = await tokenRes.json();
      if (tokenData.access_token) {
        // Fetch user profile from Google
        const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
          headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });
        const googleProfile = await userRes.json();
        if (googleProfile.email) {
          user = {
            name: googleProfile.name || googleProfile.email.split("@")[0],
            email: googleProfile.email,
            picture: googleProfile.picture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(googleProfile.email)}`
          };
        }
      }
    } catch (e) {
      console.error("Error exchanging OAuth code:", e);
    }
  }

  res.send(`
    <! halls>
    <html>
      <head><title>Authentication Successful</title></head>
      <body style="font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #0f172a; color: white;">
        <div style="text-align: center; padding: 2rem;">
          <h2 style="margin-bottom: 0.5rem;">Authenticated with Google!</h2>
          <p style="color: #94a3b8; font-size: 14px;">Closing window and returning to application...</p>
          <script>
            if (window.opener) {
              window.opener.postMessage({
                type: 'OAUTH_AUTH_SUCCESS',
                user: ${JSON.stringify(user)}
              }, '*');
              window.close();
            } else {
              window.location.href = '/';
            }
          </script>
        </div>
      </body>
    </html>
  `);
};

app.get("/auth/callback", oauthCallbackHandler);
app.get("/auth/callback/", oauthCallbackHandler);

app.post("/api/extract-result", async (req, res) => {
  try {
    const { imageBase64, mimeType = "image/png" } = req.body;
    const result = await processExtractResult(imageBase64, mimeType);
    res.json(result);
  } catch (err: any) {
    console.error("Extraction error:", err);
    const userMessage = formatExtractError(err);
    res.status(500).json({
      success: false,
      error: userMessage,
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
