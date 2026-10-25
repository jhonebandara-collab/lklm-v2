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

// ---- Key Rotator with 5 Gemini API Keys (Loaded securely from Environment Variables) ----
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
  {
    id: 'log-2',
    timestamp: new Date(Date.now() - 3600000 * 5).toISOString(),
    lotteryName: 'Mahajana Sampatha',
    board: 'NLB',
    drawNo: 6321,
    drawDate: '2026-09-25',
    ticketNumbers: [9, 8, 6, 1, 5, 9],
    ticketLetter: 'S',
    won: false,
    prizeAmount: 0,
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

  // Auth: Google Sign-In
  app.post('/api/auth/google', (req: Request, res: Response) => {
    const { email, name, picture } = req.body;
    const userEmail = email || 'google.user@gmail.com';
    let user = USERS.find(u => u.email.toLowerCase() === userEmail.toLowerCase());

    if (!user) {
      user = {
        id: `usr-g-${Date.now()}`,
        email: userEmail,
        name: name || userEmail.split('@')[0],
        role: 'user',
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        scanCount: 0,
        totalWon: 0,
      };
      USERS.push(user);
    } else {
      user.lastLogin = new Date().toISOString();
      if (name) user.name = name;
    }

    const { password: _, ...safeUser } = user;
    res.json({ user: safeUser, token: `mock-jwt-${user.id}` });
  });

  // AI Ticket Vision Scan (Gemini API with Key Failover & Rotation)
  app.post('/api/scan/ai', async (req: Request, res: Response) => {
    const { imageBase64, mimeType = 'image/jpeg' } = req.body;
    if (!imageBase64) {
      res.status(400).json({ error: 'Image data is required' });
      return;
    }

    const cleanBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');

    const promptText = `
You are an expert Sri Lankan DLB & NLB Lottery Ticket reader OCR system.
Examine this image of a Sri Lankan physical lottery ticket (Development Lotteries Board - DLB or National Lotteries Board - NLB).

CRITICAL SRI LANKAN LOTTERY RULES:
- Variation 1 (Zodiac Lotteries - Lagna Wasana 'LW', Handahana 'HD'):
  Has a Zodiac sign (e.g. "කටක", "සිංහ", "Cancer", "Leo") and 4 numbers. It has NO English letter!
- Variation 2 (Standard Lotteries - Govisetha 'GS', Ada Kotipathi 'AK', Dhana Nidhanaya 'DN', Jayoda 'JD'):
  Has 1 English letter and 4 two-digit numbers (01-77).
- Variation 3 (Super Ball & Special Number Lotteries - Shanida 'SW', Super Ball 'SB', Mega Power 'MP', Kapruka 'KP'):
  - Shanida ('SW'): Has 1 English letter, 4 two-digit numbers, AND 1 five-digit Special Number (e.g. 92975, 17533, 48316).
  - Super Ball ('SB'), Mega Power ('MP'), Kapruka ('KP'): Has 1 English letter, 4 numbers, AND 1 Super Ball (01-25 or 01-99).
- Variation 4 (6 Single-Digit Order Lotteries - Mahajana Sampatha 'MS', Supiri Dhana Sampatha 'SDS'):
  Has 1 English letter and 6 SINGLE DIGITS (0-9) in exact order (e.g. [9, 8, 6, 1, 5, 9]). DO NOT sort them! Keep duplicate digits intact!
- Variation 5 (Sasiri): 3 numbers (01-50).

STRICT RULE ON DATES:
The draw date (e.g. 2026-09-25 or 25-09-2026) is printed on the ticket. NEVER put the date digits or year or month into the "numbers" array!

Extract the following exact details:
1. "board": "DLB" or "NLB"
2. "lotteryName": The name of the lottery (e.g., "Ada Kotipathi", "Mahajana Sampatha", "Govisetha", "Shanida", "Jayoda", "Lagna Wasana", "Super Ball", "Kapruka", "Dhana Nidhanaya", "Mega Power", "Handahana", "Supiri Dhana Sampatha", "Sasiri").
3. "lotteryCode": The short 2-3 letter code ("AK", "MS", "GS", "SW", "LW", "SB", "KP", "JD", "DN", "MP", "HD", "SDS", "SASIRI").
4. "drawNo": The official integer draw number (e.g., 4850, 4563, 6321, 5007).
5. "drawDate": Draw date in format "YYYY-MM-DD" if printed on the ticket.
6. "numbers": Array of integers:
   - For Mahajana Sampatha and Supiri Dhana Sampatha: exactly 6 single digits in exact ticket order (e.g. [9, 8, 6, 1, 5, 9]).
   - For Sasiri: 3 numbers.
   - For all others: 4 numbers (excluding super ball and date).
7. "letter": The single English letter if present (e.g., "B", "T", "S"). For Lagna Wasana, Handahana, or Sasiri, return null!
8. "zodiac": The Sinhala or English zodiac sign if present (e.g. "කටක", "සිංහ", "Cancer", "Leo"). Return null for lotteries that do not have zodiac.
9. "superBall": The super ball or bonus/special number if present as integer (for Shanida a 5-digit number like 92975, for Super Ball/Mega Power/Kapruka 1-2 digits). Return null if not present.
10. "confidence": A number from 0.0 to 1.0 indicating OCR legibility.

Return ONLY a valid JSON object with these keys. No markdown backticks, no explanations.
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

    console.warn('[API /scan/ai] Gemini AI processing unavailable:', lastError);
    res.status(503).json({
      success: false,
      error: 'AI image analysis is currently unavailable. Please scan the QR/Barcode directly or enter your ticket numbers manually.',
      details: lastError,
    });
  });

  // --- Live Official Results Web Scraper (dlb.lk & nlb.lk) ---
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
    zodiac?: string;
    superBall?: number;
    jackpotAmount: number;
    isOfficial: boolean;
    scrapedAt: string;
  }

  const ZODIAC_MAP: Record<string, string> = {
    mithuna: 'මිථුන',
    gemini: 'මිථුන',
    mesha: 'මේෂ',
    aries: 'මේෂ',
    vrushabha: 'වෘෂභ',
    taurus: 'වෘෂභ',
    kataka: 'කටක',
    cancer: 'කටක',
    sinha: 'සිංහ',
    singha: 'සිංහ',
    leo: 'සිංහ',
    kanya: 'කන්‍යා',
    virgo: 'කන්‍යා',
    thula: 'තුලා',
    libra: 'තුලා',
    vruschika: 'වෘශ්චික',
    scorpio: 'වෘශ්චික',
    dhanu: 'ධනු',
    sagittarius: 'ධනු',
    makara: 'මකර',
    capricorn: 'මකර',
    kumbha: 'කුම්භ',
    aquarius: 'කුම්භ',
    meena: 'මීන',
    pisces: 'මීන',
  };

  let LIVE_SCRAPED_DRAWS: Scraped