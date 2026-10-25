import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const portArgIndex = process.argv.indexOf('--port');
const portArg = portArgIndex !== -1 ? process.argv[portArgIndex + 1] : null;
const envPort = process.env.APP_PORT || process.env.PORT;
const PORT = parseInt(portArg || (envPort && envPort !== '8080' ? envPort : '3000'), 10);
const isProduction = process.env.NODE_ENV === 'production';

// ---- Key Rotator with Gemini API Keys (Loaded securely from Environment Variables) ----
interface KeyState {
  key: string;
  id: string;
  callsCount: number;
  failsCount: number;
  lastUsed?: string;
  cooldownUntil?: number;
  isDailyExhausted?: boolean;
}

const RAW_KEYS = [
  process.env.GEMINI_API_KEY,
  process.env.GEMINI_API_KEY_1,
  process.env.GEMINI_API_KEY_2,
  process.env.GEMINI_API_KEY_3,
  process.env.GEMINI_API_KEY_4,
  process.env.GEMINI_API_KEY_5,
].filter((k): k is string => Boolean(k && k.trim().length > 5 && !k.startsWith('MY_')));

class GeminiKeyRotator {
  private keys: KeyState[] = [];
  private currentIndex: number = 0;
  private cooldownMs: number = parseInt(process.env.GEMINI_KEY_COOLDOWN_MS || '60000', 10);

  constructor() {
    this.keys = RAW_KEYS.map((key, idx) => ({
      key,
      id: `KEY-${idx + 1} (...${key.slice(-6)})`,
      callsCount: 0,
      failsCount: 0,
    }));
    console.log(`[GeminiKeyRotator] Initialized with ${this.keys.length} API keys for failover & rotation.`);
  }

  public getAvailableKey(): KeyState | null {
    if (this.keys.length === 0) return null;
    const now = Date.now();

    for (let i = 0; i < this.keys.length; i++) {
      const idx = (this.currentIndex + i) % this.keys.length;
      const item = this.keys[idx];

      if (!item.isDailyExhausted && (!item.cooldownUntil || item.cooldownUntil <= now)) {
        this.currentIndex = (idx + 1) % this.keys.length;
        item.callsCount++;
        item.lastUsed = new Date().toISOString();
        return item;
      }
    }

    const fallback = this.keys[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % this.keys.length;
    return fallback;
  }

  public markKeyError(keyId: string, isRateLimit: boolean) {
    const item = this.keys.find(k => k.id === keyId);
    if (item) {
      item.failsCount++;
      if (isRateLimit) {
        item.cooldownUntil = Date.now() + this.cooldownMs;
        console.warn(`[GeminiKeyRotator] Rate limit on ${keyId}. Cooldown for ${this.cooldownMs / 1000}s. Switching to next.`);
      }
    }
  }

  public getStatus() {
    const now = Date.now();
    return this.keys.map((k, idx) => {
      let status: 'READY' | 'COOLDOWN' | 'EXHAUSTED' = 'READY';
      if (k.isDailyExhausted) status = 'EXHAUSTED';
      else if (k.cooldownUntil && k.cooldownUntil > now) status = 'COOLDOWN';

      return {
        keyIndex: idx + 1,
        keyId: k.id,
        isActive: status === 'READY',
        callsCount: k.callsCount,
        failsCount: k.failsCount,
        lastUsedAt: k.lastUsed,
        cooldownRemainingSeconds: k.cooldownUntil && k.cooldownUntil > now ? Math.round((k.cooldownUntil - now) / 1000) : 0,
        status,
      };
    });
  }
}

const keyRotator = new GeminiKeyRotator();

// ---- In-Memory / File Database ----
interface StoredUser {
  id: string;
  email: string;
  name: string;
  password?: string;
  role: 'user' | 'admin';
  createdAt: string;
  lastLogin: string;
  scanCount: number;
  totalWon: number;
}

const USERS: StoredUser[] = [
  {
    id: 'usr-admin-1',
    email: 'admin@lklottery.lk',
    name: 'Admin LK Lottery',
    password: 'admin123@password',
    role: 'admin',
    createdAt: '2026-09-01T08:00:00Z',
    lastLogin: new Date().toISOString(),
    scanCount: 142,
    totalWon: 125000,
  },
  {
    id: 'usr-demo-2',
    email: 'jhonebandara@gmail.com',
    name: 'Jhone Bandara',
    password: 'password123',
    role: 'user',
    createdAt: '2026-09-10T12:00:00Z',
    lastLogin: new Date().toISOString(),
    scanCount: 48,
    totalWon: 4200,
  },
];

interface ScanLogItem {
  id: string;
  timestamp: string;
  lotteryName: string;
  board: 'DLB' | 'NLB';
  drawNo: number;
  drawDate: string;
  ticketNumbers?: number[];
  ticketLetter?: string;
  ticketZodiac?: string;
  ticketSuperBall?: number;
  won: boolean;
  prizeAmount: number;
  prizeCategory?: string;
  userEmail?: string;
  userName?: string;
  method: 'qr' | 'ai' | 'manual';
}

const SCAN_LOGS: ScanLogItem[] = [
  {
    id: 'log-1',
    timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
    lotteryName: 'Ada Kotipathi',
    board: 'DLB',
    drawNo: 3121,
    drawDate: '2026-09-25',
    ticketNumbers: [8, 53, 57, 74],
    ticketLetter: 'I',
    won: true,
    prizeAmount: 2000,
    prizeCategory: 'අංක 3 + ඉංග්‍රීසි අකුර',
    userEmail: 'jhonebandara@gmail.com',
    userName: 'Jhone Bandara',
    method: 'qr',
  },
];

async function startServer() {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '25mb' }));

  // --- API Routes ---

  // Auth: Register
  app.post('/api/auth/register', (req: Request, res: Response) => {
    const { email, password, name } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    const existing = USERS.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      res.status(409).json({ error: 'An account with this email already exists' });
      return;
    }

    const newUser: StoredUser = {
      id: `usr-${Date.now()}`,
      email,
      name: name || email.split('@')[0],
      password,
      role: email.toLowerCase().includes('admin') ? 'admin' : 'user',
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
      scanCount: 0,
      totalWon: 0,
    };
    USERS.push(newUser);

    const { password: _, ...safeUser } = newUser;
    res.json({ user: safeUser, token: `mock-jwt-${newUser.id}` });
  });

  // Auth: Login
  app.post('/api/auth/login', (req: Request, res: Response) => {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    const user = USERS.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user || user.password !== password) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    user.lastLogin = new Date().toISOString();
    const { password: _, ...safeUser } = user;
    res.json({ user: safeUser, token: `mock-jwt-${user.id}` });
  });

  // AI Ticket Vision Scan
  app.post('/api/scan/ai', async (req: Request, res: Response) => {
    const { imageBase64, mimeType = 'image/jpeg' } = req.body;
    if (!imageBase64) {
      res.status(400).json({ error: 'Image data is required' });
      return;
    }

    const cleanBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');

    const promptText = `
You are an expert Sri Lankan DLB & NLB Lottery Ticket reader OCR system.
Examine this image of a Sri Lankan physical lottery ticket.
Return ONLY a valid JSON object with keys: board, lotteryName, lotteryCode, drawNo, drawDate, numbers, letter, zodiac, superBall, confidence. No markdown backticks, no explanations.
`;

    let lastError = '';
    const maxAttempts = Math.min(3, RAW_KEYS.length || 1);

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const activeKey = keyRotator.getAvailableKey();
      if (!activeKey) {
        lastError = 'No Gemini API keys available';
        break;
      }

      try {
        const ai = new GoogleGenAI({ apiKey: activeKey.key });
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [
            {
              role: 'user',
              parts: [
                { text: promptText },
                {
                  inlineData: {
                    mimeType: mimeType,
                    data: cleanBase64,
                  },
                },
              ],
            },
          ],
          config: {
            responseMimeType: 'application/json',
          },
        });

        const rawText = response.text || '';
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          res.json({
            success: true,
            extracted: parsed,
            keyUsed: activeKey.id,
          });
          return;
        } else {
          throw new Error('Could not parse JSON from model output');
        }
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.warn(`[API /scan/ai] Attempt ${attempt + 1} with ${activeKey.id} failed: ${errMsg}`);
        const isRateLimit = errMsg.includes('429') || errMsg.includes('quota') || errMsg.includes('RESOURCE_EXHAUSTED');
        keyRotator.markKeyError(activeKey.id, isRateLimit);
        lastError = errMsg;
      }
    }

    res.status(503).json({
      success: false,
      error: 'AI image analysis is currently unavailable. Please scan the QR/Barcode directly or enter your ticket numbers manually.',
      details: lastError,
    });
  });

  // Live Scraped Draws
  interface ScrapedDrawItem {
    id: string;
    lotteryId: string;
    lotteryCode: string;
    lotteryName: string;
    board: 'DLB' | 'NLB';
    drawNo: number;
    drawDate: string;
    numbers: number[];
    letter?: string;
    jackpotAmount: number;
    isOfficial: boolean;
    scrapedAt: string;
  }

  let LIVE_SCRAPED_DRAWS: ScrapedDrawItem[] = [
    {
      id: 'GS-4563-2026-09-25',
      lotteryId: 'nlb-govisetha',
      lotteryCode: 'GS',
      lotteryName: 'Govisetha',
      board: 'NLB',
      drawNo: 4563,
      drawDate: '2026-09-25',
      numbers: [16, 30, 34, 51],
      letter: 'T',
      jackpotAmount: 60000000,
      isOfficial: true,
      scrapedAt: new Date().toISOString(),
    },
  ];

  app.get('/api/draws/live', (req: Request, res: Response) => {
    res.json({
      success: true,
      count: LIVE_SCRAPED_DRAWS.length,
      draws: LIVE_SCRAPED_DRAWS,
    });
  });

  app.get('/api/admin/keys/status', (req: Request, res: Response) => {
    res.json({
      success: true,
      rotatorStatus: keyRotator.getStatus(),
    });
  });

  app.get('/api/logs', (req: Request, res: Response) => {
    res.json({ success: true, logs: SCAN_LOGS });
  });

  app.post('/api/logs', (req: Request, res: Response) => {
    const logItem: ScanLogItem = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      ...req.body,
    };
    SCAN_LOGS.unshift(logItem);
    res.json({ success: true, log: logItem });
  });

  if (isProduction) {
    const distPath = path.join(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (req: Request, res: Response) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] LK Lottery Scanner running on port ${PORT} (Production: ${isProduction})`);
  });
}

startServer().catch(err => {
  console.error('[Server] Fatal startup error:', err);
});