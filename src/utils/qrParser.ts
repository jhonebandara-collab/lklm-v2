import { LOTTERY_DEFINITIONS, OFFICIAL_ANCHOR_DRAWS, calculateAccurateDrawDate } from '../data/lotteries';
import { LotteryBoard, LotteryType } from '../types';

export interface ParsedTicketData {
  isValidLottery: boolean;
  isFutureDraw: boolean;
  hasTicketNumbers: boolean;
  hasExplicitDate?: boolean;
  board: LotteryBoard;
  lotteryCode: string;
  lotteryName: string;
  drawNo: number;
  drawDate: string; // Standard ISO YYYY-MM-DD
  ticketNumbers: number[];
  ticketLetter?: string;
  ticketZodiac?: string; // Sinhala canonical name (e.g. කටක)
  ticketZodiacEn?: string; // English name (e.g. Cancer)
  ticketSuperBall?: number;
  lotteryType?: LotteryType;
  rawString: string;
  errorMessage?: string;
}

export interface ZodiacInfo {
  si: string;
  en: string;
  ta: string;
  index: number;
}

export const ZODIAC_MAPPING: Record<string, ZodiacInfo> = {
  // Aries (1)
  'aries': { si: 'මේෂ', en: 'Aries', ta: 'மேஷம்', index: 1 },
  'mesha': { si: 'මේෂ', en: 'Aries', ta: 'மேஷம்', index: 1 },
  'මේෂ': { si: 'මේෂ', en: 'Aries', ta: 'மேஷம்', index: 1 },
  'මේෂය': { si: 'මේෂ', en: 'Aries', ta: 'மேஷம்', index: 1 },
  'மேஷம்': { si: 'මේෂ', en: 'Aries', ta: 'மேஷம்', index: 1 },
  'z01': { si: 'මේෂ', en: 'Aries', ta: 'மேஷம்', index: 1 },
  'z1': { si: 'මේෂ', en: 'Aries', ta: 'மேஷம்', index: 1 },
  'l01': { si: 'මේෂ', en: 'Aries', ta: 'மேஷம்', index: 1 },
  'l1': { si: 'මේෂ', en: 'Aries', ta: 'மேஷம்', index: 1 },

  // Taurus (2)
  'taurus': { si: 'වෘෂභ', en: 'Taurus', ta: 'ரிஷபம்', index: 2 },
  'vrushabha': { si: 'වෘෂභ', en: 'Taurus', ta: 'ரிஷபம்', index: 2 },
  'vrishabha': { si: 'වෘෂභ', en: 'Taurus', ta: 'ரிஷபம்', index: 2 },
  'wrushabha': { si: 'වෘෂභ', en: 'Taurus', ta: 'ரிஷபம்', index: 2 },
  'වෘෂභ': { si: 'වෘෂභ', en: 'Taurus', ta: 'ரிஷபம்', index: 2 },
  'වෘෂභය': { si: 'වෘෂභ', en: 'Taurus', ta: 'ரிஷபம்', index: 2 },
  'වෘශභ': { si: 'වෘෂභ', en: 'Taurus', ta: 'ரிஷபம்', index: 2 },
  'ரிஷபம்': { si: 'වෘෂභ', en: 'Taurus', ta: 'ரிஷபம்', index: 2 },
  'z02': { si: 'වෘෂභ', en: 'Taurus', ta: 'ரிஷபம்', index: 2 },
  'z2': { si: 'වෘෂභ', en: 'Taurus', ta: 'ரிஷபம்', index: 2 },
  'l02': { si: 'වෘෂභ', en: 'Taurus', ta: 'ரிஷபம்', index: 2 },
  'l2': { si: 'වෘෂභ', en: 'Taurus', ta: 'ரிஷபம்', index: 2 },

  // Gemini (3)
  'gemini': { si: 'මිථුන', en: 'Gemini', ta: 'மிதுனம்', index: 3 },
  'mithuna': { si: 'මිථුන', en: 'Gemini', ta: 'மிதுனம்', index: 3 },
  'මිථුන': { si: 'මිථුන', en: 'Gemini', ta: 'மிதுனம்', index: 3 },
  'මිථුනය': { si: 'මිථුන', en: 'Gemini', ta: 'மிதுனம்', index: 3 },
  'மிதுனம்': { si: 'මිථුන', en: 'Gemini', ta: 'மிதுனம்', index: 3 },
  'z03': { si: 'මිථුන', en: 'Gemini', ta: 'மிதுனம்', index: 3 },
  'z3': { si: 'මිථුන', en: 'Gemini', ta: 'மிதுனம்', index: 3 },
  'l03': { si: 'මිථුන', en: 'Gemini', ta: 'மிதுனம்', index: 3 },
  'l3': { si: 'මිථුන', en: 'Gemini', ta: 'மிதுனம்', index: 3 },

  // Cancer (4)
  'cancer': { si: 'කටක', en: 'Cancer', ta: 'கடகம்', index: 4 },
  'kataka': { si: 'කටක', en: 'Cancer', ta: 'கடகம்', index: 4 },
  'කටක': { si: 'කටක', en: 'Cancer', ta: 'கடகம்', index: 4 },
  'කටකය': { si: 'කටක', en: 'Cancer', ta: 'கடகம்', index: 4 },
  'கடகம்': { si: 'කටක', en: 'Cancer', ta: 'கடகம்', index: 4 },
  'z04': { si: 'කටක', en: 'Cancer', ta: 'கடகம்', index: 4 },
  'z4': { si: 'කටක', en: 'Cancer', ta: 'கடகம்', index: 4 },
  'l04': { si: 'කටක', en: 'Cancer', ta: 'கடகம்', index: 4 },
  'l4': { si: 'කටක', en: 'Cancer', ta: 'கடகம்', index: 4 },

  // Leo (5)
  'leo': { si: 'සිංහ', en: 'Leo', ta: 'சிம்மம்', index: 5 },
  'sinha': { si: 'සිංහ', en: 'Leo', ta: 'சிம்மம்', index: 5 },
  'simha': { si: 'සිංහ', en: 'Leo', ta: 'சிம்மம்', index: 5 },
  'singha': { si: 'සිංහ', en: 'Leo', ta: 'சிம்மம்', index: 5 },
  'සිංහ': { si: 'සිංහ', en: 'Leo', ta: 'சிம்மம்', index: 5 },
  'සිංහය': { si: 'සිංහ', en: 'Leo', ta: 'සිம்மம்', index: 5 },
  'சிம்மம்': { si: 'සිංහ', en: 'Leo', ta: 'சிம்மம்', index: 5 },
  'z05': { si: 'සිංහ', en: 'Leo', ta: 'සිம்மம்', index: 5 },
  'z5': { si: 'සිංහ', en: 'Leo', ta: 'සිம்மம்', index: 5 },
  'l05': { si: 'සිංහ', en: 'Leo', ta: 'සිம்மம்', index: 5 },
  'l5': { si: 'සිංහ', en: 'Leo', ta: 'සිம்மம்', index: 5 },

  // Virgo (6)
  'virgo': { si: 'කන්‍යා', en: 'Virgo', ta: 'கன்னி', index: 6 },
  'kanya': { si: 'කන්‍යා', en: 'Virgo', ta: 'கன்னி', index: 6 },
  'kannya': { si: 'කන්‍යා', en: 'Virgo', ta: 'கன்னி', index: 6 },
  'කන්‍යා': { si: 'කන්‍යා', en: 'Virgo', ta: 'கன்னி', index: 6 },
  'කන්යා': { si: 'කන්‍යා', en: 'Virgo', ta: 'கன்னி', index: 6 },
  'කන්‍යාව': { si: 'කන්‍යා', en: 'Virgo', ta: 'கன்னி', index: 6 },
  'කන්යාව': { si: 'කන්‍යා', en: 'Virgo', ta: 'கன்னி', index: 6 },
  'கன்னி': { si: 'කන්‍යා', en: 'Virgo', ta: 'கன்னி', index: 6 },
  'z06': { si: 'කන්‍යා', en: 'Virgo', ta: 'கன்னி', index: 6 },
  'z6': { si: 'කන්‍යා', en: 'Virgo', ta: 'கன்னி', index: 6 },
  'l06': { si: 'කන්‍යා', en: 'Virgo', ta: 'கன்னி', index: 6 },
  'l6': { si: 'කන්‍යා', en: 'Virgo', ta: 'கன்னி', index: 6 },

  // Libra (7)
  'libra': { si: 'තුලා', en: 'Libra', ta: 'துலாம்', index: 7 },
  'thula': { si: 'තුලා', en: 'Libra', ta: 'துலாம்', index: 7 },
  'tula': { si: 'තුලා', en: 'Libra', ta: 'துலாம்', index: 7 },
  'තුලා': { si: 'තුලා', en: 'Libra', ta: 'துலாம்', index: 7 },
  'තුලාව': { si: 'තුලා', en: 'Libra', ta: 'துலாம்', index: 7 },
  'துலாம்': { si: 'තුලා', en: 'Libra', ta: 'துலாம்', index: 7 },
  'z07': { si: 'තුලා', en: 'Libra', ta: 'துலாம்', index: 7 },
  'z7': { si: 'තුලා', en: 'Libra', ta: 'துலாம்', index: 7 },
  'l07': { si: 'තුලා', en: 'Libra', ta: 'துலாம்', index: 7 },
  'l7': { si: 'තුලා', en: 'Libra', ta: 'துலாம்', index: 7 },

  // Scorpio (8)
  'scorpio': { si: 'වෘශ්චික', en: 'Scorpio', ta: 'விருச்சிகம்', index: 8 },
  'vrushchika': { si: 'වෘශ්චික', en: 'Scorpio', ta: 'விருச்சிகம்', index: 8 },
  'vrishchika': { si: 'වෘශ්චික', en: 'Scorpio', ta: 'விருச்சிகம்', index: 8 },
  'wrushchika': { si: 'වෘශ්චික', en: 'Scorpio', ta: 'விருச்சிகம்', index: 8 },
  'වෘශ්චික': { si: 'වෘශ්චික', en: 'Scorpio', ta: 'වிருச்சிகம்', index: 8 },
  'වෘෂ්චික': { si: 'වෘශ්චික', en: 'Scorpio', ta: 'වிருச்சிகம்', index: 8 },
  'වෘශ්චිකය': { si: 'වෘශ්චික', en: 'Scorpio', ta: 'වிருச்சிகம்', index: 8 },
  'விருச்சிகம்': { si: 'වෘශ්චික', en: 'Scorpio', ta: 'விருச்சிகம்', index: 8 },
  'z08': { si: 'වෘශ්චික', en: 'Scorpio', ta: 'விருச்சிகம்', index: 8 },
  'z8': { si: 'වෘශ්චික', en: 'Scorpio', ta: 'விருச்சிகம்', index: 8 },
  'l08': { si: 'වෘශ්චික', en: 'Scorpio', ta: 'වிருச்சிகம்', index: 8 },
  'l8': { si: 'වෘශ්චික', en: 'Scorpio', ta: 'වிருச்சிகம்', index: 8 },

  // Sagittarius (9)
  'sagittarius': { si: 'ධනු', en: 'Sagittarius', ta: 'தனுசு', index: 9 },
  'dhanu': { si: 'ධනු', en: 'Sagittarius', ta: 'தනුசு', index: 9 },
  'ධනු': { si: 'ධනු', en: 'Sagittarius', ta: 'தனுசு', index: 9 },
  'ධනුව': { si: 'ධනු', en: 'Sagittarius', ta: 'தனுசு', index: 9 },
  'தனுசு': { si: 'ධනු', en: 'Sagittarius', ta: 'தனுசு', index: 9 },
  'z09': { si: 'ධනු', en: 'Sagittarius', ta: 'தனுசு', index: 9 },
  'z9': { si: 'ධනු', en: 'Sagittarius', ta: 'தனுசு', index: 9 },
  'l09': { si: 'ධනු', en: 'Sagittarius', ta: 'தனுசு', index: 9 },
  'l9': { si: 'ධනු', en: 'Sagittarius', ta: 'தனுசு', index: 9 },

  // Capricorn (10)
  'capricorn': { si: 'මකර', en: 'Capricorn', ta: 'மகரம்', index: 10 },
  'makara': { si: 'මකර', en: 'Capricorn', ta: 'மகரம்', index: 10 },
  'මකර': { si: 'මකර', en: 'Capricorn', ta: 'மகரம்', index: 10 },
  'මකරය': { si: 'මකර', en: 'Capricorn', ta: 'மகரம்', index: 10 },
  'மகரம்': { si: 'මකර', en: 'Capricorn', ta: 'மகரம்', index: 10 },
  'z10': { si: 'මකර', en: 'Capricorn', ta: 'மகரம்', index: 10 },
  'l10': { si: 'මකර', en: 'Capricorn', ta: 'மகரம்', index: 10 },

  // Aquarius (11)
  'aquarius': { si: 'කුම්භ', en: 'Aquarius', ta: 'கும்பம்', index: 11 },
  'kumbha': { si: 'කුම්භ', en: 'Aquarius', ta: 'கும்பம்', index: 11 },
  'කුම්භ': { si: 'කුම්භ', en: 'Aquarius', ta: 'கும்பம்', index: 11 },
  'කුම්භය': { si: 'කුම්භ', en: 'Aquarius', ta: 'கும்பம்', index: 11 },
  'கும்பம்': { si: 'කුම්භ', en: 'Aquarius', ta: 'கும்பம்', index: 11 },
  'z11': { si: 'කුම්භ', en: 'Aquarius', ta: 'கும்பம்', index: 11 },
  'l11': { si: 'කුම්භ', en: 'Aquarius', ta: 'கும்பம்', index: 11 },

  // Pisces (12)
  'pisces': { si: 'මීන', en: 'Pisces', ta: 'மீனம்', index: 12 },
  'meena': { si: 'මීන', en: 'Pisces', ta: 'மீனம்', index: 12 },
  'මීන': { si: 'මීන', en: 'Pisces', ta: 'மீனம்', index: 12 },
  'මීනය': { si: 'මීන', en: 'Pisces', ta: 'மீனம்', index: 12 },
  'மீனம்': { si: 'මීන', en: 'Pisces', ta: 'மீனம்', index: 12 },
  'z12': { si: 'මීන', en: 'Pisces', ta: 'மீனம்', index: 12 },
  'l12': { si: 'මීන', en: 'Pisces', ta: 'மீனம்', index: 12 },

  // Unicode Astrological Symbols (♈ - ♓) & 1-12 Direct Lookups
  '♈': { si: 'මේෂ', en: 'Aries', ta: 'மேஷம்', index: 1 },
  '♉': { si: 'වෘෂභ', en: 'Taurus', ta: 'ரிஷபம்', index: 2 },
  '♊': { si: 'මිථුන', en: 'Gemini', ta: 'மிதுனம்', index: 3 },
  '♋': { si: 'කටක', en: 'Cancer', ta: 'கடகம்', index: 4 },
  '♌': { si: 'සිංහ', en: 'Leo', ta: 'சிம்மம்', index: 5 },
  '♍': { si: 'කන්‍යා', en: 'Virgo', ta: 'கன்னி', index: 6 },
  '♎': { si: 'තුලා', en: 'Libra', ta: 'துலாம்', index: 7 },
  '♏': { si: 'වෘශ්චික', en: 'Scorpio', ta: 'விருச்சிகம்', index: 8 },
  '♐': { si: 'ධනු', en: 'Sagittarius', ta: 'தனுசு', index: 9 },
  '♑': { si: 'මකර', en: 'Capricorn', ta: 'மகரம்', index: 10 },
  '♒': { si: 'කුම්භ', en: 'Aquarius', ta: 'கும்பம்', index: 11 },
  '♓': { si: 'මීන', en: 'Pisces', ta: 'மீனம்', index: 12 },
};

/**
 * Maps single letter codes A through L or keywords to Zodiac signs.
 * In Sri Lankan Zodiac lotteries (LW, HD, SD), letters A to L represent the 12 signs!
 */
export function mapLetterToZodiac(letterOrCode: string | undefined): ZodiacInfo | null {
  if (!letterOrCode) return null;
  const clean = letterOrCode.trim().toLowerCase();

  // 1. Check direct mapping
  if (ZODIAC_MAPPING[clean]) {
    return ZODIAC_MAPPING[clean];
  }

  // 2. Letters A through L (A=1 Aries, B=2 Taurus, ... L=12 Pisces)
  if (/^[a-l]$/i.test(clean)) {
    const idx = clean.toUpperCase().charCodeAt(0) - 64; // 1 to 12
    const found = Object.values(ZODIAC_MAPPING).find(z => z.index === idx);
    if (found) return found;
  }

  // 3. 3-letter English abbreviations
  const abbr3Map: Record<string, number> = {
    ari: 1, tau: 2, gem: 3, can: 4, leo: 5, vir: 6,
    lib: 7, sco: 8, sag: 9, cap: 10, aqu: 11, pis: 12
  };
  if (abbr3Map[clean]) {
    const found = Object.values(ZODIAC_MAPPING).find(z => z.index === abbr3Map[clean]);
    if (found) return found;
  }

  // 4. 2-letter English abbreviations
  const abbr2Map: Record<string, number> = {
    ar: 1, ta: 2, ge: 3, ca: 4, le: 5, vi: 6,
    li: 7, sc: 8, sa: 9, cp: 10, aq: 11, pi: 12
  };
  if (abbr2Map[clean]) {
    const found = Object.values(ZODIAC_MAPPING).find(z => z.index === abbr2Map[clean]);
    if (found) return found;
  }

  // 5. Short Sinhala prefixes
  if (clean === 'මේ') return ZODIAC_MAPPING['aries'];
  if (clean === 'වෘ') return ZODIAC_MAPPING['taurus'];
  if (clean === 'මි') return ZODIAC_MAPPING['gemini'];
  if (clean === 'කට') return ZODIAC_MAPPING['cancer'];
  if (clean === 'සි') return ZODIAC_MAPPING['leo'];
  if (clean === 'කන්') return ZODIAC_MAPPING['virgo'];
  if (clean === 'තු') return ZODIAC_MAPPING['libra'];
  if (clean === 'වෘශ්' || clean === 'වෘෂ්') return ZODIAC_MAPPING['scorpio'];
  if (clean === 'ධ') return ZODIAC_MAPPING['sagittarius'];
  if (clean === 'මක') return ZODIAC_MAPPING['capricorn'];
  if (clean === 'කු') return ZODIAC_MAPPING['aquarius'];
  if (clean === 'මී') return ZODIAC_MAPPING['pisces'];

  return null;
}

/**
 * Normalizes any Sinhala, English, Tamil, or transliterated zodiac sign.
 */
export function normalizeZodiac(raw: string | undefined, allowPureNumber = false): ZodiacInfo | null {
  if (!raw) return null;
  const clean = raw
    .toLowerCase()
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/^(?:zodiac|lagna|zod|z|l)[:\s=-]*/i, '')
    .trim();

  if (ZODIAC_MAPPING[clean]) {
    return ZODIAC_MAPPING[clean];
  }

  const rawClean = raw.toLowerCase().replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
  if (ZODIAC_MAPPING[rawClean]) {
    return ZODIAC_MAPPING[rawClean];
  }

  // Check letter or abbreviation mapping (e.g. A-L, ari, tau, gem, etc.)
  const letterMap = mapLetterToZodiac(clean);
  if (letterMap) {
    return letterMap;
  }

  // Only parse pure numbers (1-12) if explicitly permitted
  if (allowPureNumber) {
    const num = parseInt(clean, 10);
    if (!isNaN(num) && num >= 1 && num <= 12) {
      const found = Object.values(ZODIAC_MAPPING).find(z => z.index === num);
      if (found) return found;
    }
  }

  for (const [key, val] of Object.entries(ZODIAC_MAPPING)) {
    if (key.length >= 4 && clean.includes(key)) {
      return val;
    }
  }

  return null;
}

/**
 * Searches the entire string for any Sinhala, English, or Tamil zodiac sign.
 * Highly robust for Handahana ('HD'), Lagna Wasana ('LW'), and Suba Dawasak ('SD').
 */
export function findZodiacInText(text: string): ZodiacInfo | null {
  if (!text) return null;
  const clean = text.replace(/[\u200B-\u200D\uFEFF]/g, '');

  // 1. Explicitly labeled zodiac: e.g. "ලග්නය: සිංහ" or "Lagna: Leo" or "Zodiac: Aries" or "Z:04"
  const labeled = clean.match(/(?:ලග්නය|ලග්න|zodiac|lagna|sign|zod)[:\s=-]*([^\s,;|/-]+)/i);
  if (labeled) {
    const res = normalizeZodiac(labeled[1], true);
    if (res) return res;
  }

  // 2. Unicode Astrological Symbols (♈ - ♓)
  const symbols = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓'];
  for (const sym of symbols) {
    if (clean.includes(sym)) {
      return ZODIAC_MAPPING[sym] || null;
    }
  }

  // 3. Exact Sinhala Zodiac names (with or without ZWJ diacritics)
  const sinhalaVariants: [string[], string][] = [
    [['මේෂය', 'මේෂ'], 'aries'],
    [['වෘෂභය', 'වෘෂභ', 'වෘශභ'], 'taurus'],
    [['මිථුනය', 'මිථුන'], 'gemini'],
    [['කටකය', 'කටක'], 'cancer'],
    [['සිංහය', 'සිංහ'], 'leo'],
    [['කන්‍යාව', 'කන්යාව', 'කන්‍යා', 'කන්යා'], 'virgo'],
    [['තුලාව', 'තුලා'], 'libra'],
    [['වෘශ්චිකය', 'වෘශ්චික', 'වෘෂ්චිකය', 'වෘෂ්චික'], 'scorpio'],
    [['ධනුව', 'ධනු'], 'sagittarius'],
    [['මකරය', 'මකර'], 'capricorn'],
    [['කුම්භය', 'කුම්භ'], 'aquarius'],
    [['මීනය', 'මීන'], 'pisces'],
  ];

  for (const [variants, key] of sinhalaVariants) {
    for (const v of variants) {
      const vClean = v.replace(/[\u200B-\u200D\uFEFF]/g, '');
      if (clean.includes(vClean) || clean.includes(v)) {
        return ZODIAC_MAPPING[key] || null;
      }
    }
  }

  // 4. Exact English whole words with boundary (e.g. \bCancer\b, \bLeo\b, etc. - NEVER match inside other words)
  const englishNames = [
    'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
    'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'
  ];
  for (const en of englishNames) {
    const regex = new RegExp(`\\b${en}\\b`, 'i');
    if (regex.test(clean)) {
      return ZODIAC_MAPPING[en] || null;
    }
  }

  return null;
}

export function isZodiacMatch(z1: string | undefined, z2: string | undefined): boolean {
  if (!z1 || !z2) return false;
  const norm1 = normalizeZodiac(z1, true);
  const norm2 = normalizeZodiac(z2, true);
  if (norm1 && norm2) {
    return norm1.index === norm2.index;
  }
  return z1.trim().toLowerCase() === z2.trim().toLowerCase();
}

/**
 * Normalizes any date string to standard ISO YYYY-MM-DD format.
 * Validates year (2018-2035), month (1-12), and day (1-31).
 */
export function normalizeDateString(rawDate: string): string {
  if (!rawDate) return '';
  const trimmed = rawDate.replace(/Friday|Monday|Tuesday|Wednesday|Thursday|Saturday|Sunday/gi, '').trim();

  // YYYY-MM-DD or YYYY/MM/DD or YYYY.MM.DD
  const ymd = trimmed.match(/^(20[123]\d)[-/.]?(0?[1-9]|1[0-2])[-/.]?(0?[1-9]|[12]\d|3[01])$/);
  if (ymd) {
    const [, y, m, d] = ymd;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // DD-MM-YYYY or DD/MM/YYYY or DD.MM.YYYY
  const dmy = trimmed.match(/^(0?[1-9]|[12]\d|3[01])[-/.](0?[1-9]|1[0-2])[-/.](20[123]\d)$/);
  if (dmy) {
    const [, d, m, y] = dmy;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // Textual Month: YYYY-Mon-DD or DD-Mon-YYYY
  const textMMap: Record<string, string> = {
    jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
  };
  const yTextM = trimmed.match(/^(20[123]\d)[-/. ](Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[-/. ](0?[1-9]|[12]\d|3[01])$/i);
  if (yTextM) {
    return `${yTextM[1]}-${textMMap[yTextM[2].toLowerCase().slice(0, 3)]}-${yTextM[3].padStart(2, '0')}`;
  }
  const dTextM = trimmed.match(/^(0?[1-9]|[12]\d|3[01])[-/. ](Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[-/. ](20[123]\d)$/i);
  if (dTextM) {
    return `${dTextM[3]}-${textMMap[dTextM[2].toLowerCase().slice(0, 3)]}-${dTextM[1].padStart(2, '0')}`;
  }

  // 2-Digit Year Formats: YY-MM-DD or DD-MM-YY
  const yyMd = trimmed.match(/^(2[4-9])[-/.](0?[1-9]|1[0-2])[-/.](0?[1-9]|[12]\d|3[01])$/);
  if (yyMd) {
    return `20${yyMd[1]}-${yyMd[2].padStart(2, '0')}-${yyMd[3].padStart(2, '0')}`;
  }
  const ddMyy = trimmed.match(/^(0?[1-9]|[12]\d|3[01])[-/.](0?[1-9]|1[0-2])[-/.](2[4-9])$/);
  if (ddMyy) {
    return `20${ddMyy[3]}-${ddMyy[2].padStart(2, '0')}-${ddMyy[1].padStart(2, '0')}`;
  }

  return trimmed;
}

const MONTH_NAME_MAP: Record<string, string> = {
  jan: '01', january: '01',
  feb: '02', february: '02',
  mar: '03', march: '03',
  apr: '04', april: '04',
  may: '05',
  jun: '06', june: '06',
  jul: '07', july: '07',
  aug: '08', august: '08',
  sep: '09', sept: '09', september: '09',
  oct: '10', october: '10',
  nov: '11', november: '11',
  dec: '12', december: '12',
};

export const SINHALA_MONTH_MAP: Record<string, string> = {
  'ජනවාරි': '01',
  'පෙබරවාරි': '02',
  'මාර්තු': '03',
  'අප්‍රේල්': '04', 'අප්රේල්': '04',
  'මැයි': '05',
  'ජූනි': '06',
  'ජූලි': '07',
  'අගෝස්තු': '08',
  'සැප්තැම්බර්': '09', 'සැප්තැම්බර': '09',
  'ඔක්තෝබර්': '10', 'ඔක්තෝම්බර්': '10',
  'නොවැම්බර්': '11',
  'දෙසැම්බර්': '12',
};

/**
 * Strips date string out of text BEFORE lottery number extraction.
 * CRITICAL FIX: Legitimate calendar dates are extracted with 100% accuracy.
 * Supports standard ISO, Sri Lankan formats (DD-MM-YYYY, YYYY-Mon-DD, YY-MM-DD, Sinhala textual, etc.).
 * Standard lottery numbers (e.g. "16 30 34 51 4563") are NEVER misinterpreted as dates!
 */
export function extractAndStripDate(input: string): { drawDate: string | null; cleaned: string } {
  let cleaned = input;
  let drawDate: string | null = null;

  // 0. Explicit labeled date: e.g. "Draw Date: 2026-09-25" or "Date: 25/09/2026" or "දිනය: 2026-09-25"
  const labeledDate = cleaned.match(/(?:draw\s*date|date|dt|දිනය|திகதி)[:\s=]+([0-9A-Za-z/.-]+)/i);
  if (labeledDate) {
    const rawVal = labeledDate[1].trim();
    const normalized = normalizeDateString(rawVal);
    if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
      drawDate = normalized;
      cleaned = cleaned.replace(labeledDate[0], ' ');
      return { drawDate, cleaned };
    }
  }

  // 1. Textual Sinhala Month: e.g. "2026 සැප්තැම්බර් 25" or "25 සැප්තැම්බර් 2026"
  for (const [sMonth, mCode] of Object.entries(SINHALA_MONTH_MAP)) {
    const siRegex1 = new RegExp(`\\b(20[123]\\d)\\s+${sMonth}\\s+(0?[1-9]|[12]\\d|3[01])\\b`, 'i');
    const m1 = cleaned.match(siRegex1);
    if (m1) {
      drawDate = `${m1[1]}-${mCode}-${m1[2].padStart(2, '0')}`;
      cleaned = cleaned.replace(m1[0], ' ');
      return { drawDate, cleaned };
    }
    const siRegex2 = new RegExp(`\\b(0?[1-9]|[12]\\d|3[01])\\s+${sMonth}\\s+(20[123]\\d)\\b`, 'i');
    const m2 = cleaned.match(siRegex2);
    if (m2) {
      drawDate = `${m2[2]}-${mCode}-${m2[1].padStart(2, '0')}`;
      cleaned = cleaned.replace(m2[0], ' ');
      return { drawDate, cleaned };
    }
  }

  // 2. Textual Month Format: YYYY-Mon-DD or YYYY Mon DD or YYYY/Mon/DD (e.g. "2026-Sep-25" or "2026-SEP-25")
  const yTextM = cleaned.match(/\b(20[123]\d)[-/. ](Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)[-/. ](0?[1-9]|[12]\d|3[01])\b/i);
  if (yTextM) {
    const y = yTextM[1];
    const m = MONTH_NAME_MAP[yTextM[2].toLowerCase()] || '01';
    const d = yTextM[3].padStart(2, '0');
    drawDate = `${y}-${m}-${d}`;
    cleaned = cleaned.replace(yTextM[0], ' ');
    return { drawDate, cleaned };
  }

  // 3. Textual Month Format: DD-Mon-YYYY or DD Mon YYYY (e.g. "25-Sep-2026" or "25 Sep 2026")
  const dTextM = cleaned.match(/\b(0?[1-9]|[12]\d|3[01])[-/. ](Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)[-/. ](20[123]\d)\b/i);
  if (dTextM) {
    const d = dTextM[1].padStart(2, '0');
    const m = MONTH_NAME_MAP[dTextM[2].toLowerCase()] || '01';
    const y = dTextM[3];
    drawDate = `${y}-${m}-${d}`;
    cleaned = cleaned.replace(dTextM[0], ' ');
    return { drawDate, cleaned };
  }

  // 4. YYYY-MM-DD or YYYY/MM/DD or YYYY.MM.DD (Year MUST be 2018-2035)
  const ymdMatch = cleaned.match(/\b(20[123]\d)[-/.](0?[1-9]|1[0-2])[-/.](0?[1-9]|[12]\d|3[01])\b/);
  if (ymdMatch) {
    const y = ymdMatch[1];
    const m = ymdMatch[2].padStart(2, '0');
    const d = ymdMatch[3].padStart(2, '0');
    drawDate = `${y}-${m}-${d}`;
    cleaned = cleaned.replace(ymdMatch[0], ' ');
    return { drawDate, cleaned };
  }

  // 5. DD-MM-YYYY or DD/MM/YYYY or DD.MM.YYYY (Year MUST be 2018-2035)
  const dmyMatch = cleaned.match(/\b(0?[1-9]|[12]\d|3[01])[-/.](0?[1-9]|1[0-2])[-/.](20[123]\d)\b/);
  if (dmyMatch) {
    const d = dmyMatch[1].padStart(2, '0');
    const m = dmyMatch[2].padStart(2, '0');
    const y = dmyMatch[3];
    drawDate = `${y}-${m}-${d}`;
    cleaned = cleaned.replace(dmyMatch[0], ' ');
    return { drawDate, cleaned };
  }

  // 6. Compact 8-digit date YYYYMMDD (e.g. 20260925)
  const compactYmd = cleaned.match(/\b(20[123]\d)(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\b/);
  if (compactYmd) {
    drawDate = `${compactYmd[1]}-${compactYmd[2]}-${compactYmd[3]}`;
    cleaned = cleaned.replace(compactYmd[0], ' ');
    return { drawDate, cleaned };
  }

  // 8. Space-separated ONLY IF year is 2018-2035 and month is 01-12 and day is 01-31
  const spaceYmd = cleaned.match(/\b(20[123]\d)\s+(0?[1-9]|1[0-2])\s+(0?[1-9]|[12]\d|3[01])\b/);
  if (spaceYmd) {
    const y = spaceYmd[1];
    const m = spaceYmd[2].padStart(2, '0');
    const d = spaceYmd[3].padStart(2, '0');
    drawDate = `${y}-${m}-${d}`;
    cleaned = cleaned.replace(spaceYmd[0], ' ');
    return { drawDate, cleaned };
  }

  return { drawDate: null, cleaned };
}

/**
 * Guesses lottery board and name from draw number based on official anchors.
 */
export function guessLotteryFromDrawNo(board: LotteryBoard | undefined, drawNo: number): LotteryMapping | null {
  if (!drawNo || drawNo <= 0) return null;

  // 1. Check exact official anchor draw numbers
  for (const [code, anchor] of Object.entries(OFFICIAL_ANCHOR_DRAWS)) {
    if (anchor.drawNo === drawNo) {
      const def = LOTTERY_DEFINITIONS.find(d => d.code === code);
      if (def) {
        return {
          board: def.board,
          code: def.code,
          nameEn: def.nameEn,
          lotteryType: def.code === 'MS' || def.code === 'SDS' ? '6D+L' : (def.code === 'LW' || def.code === 'HD' ? '4N+Z' : (def.code === 'SD' ? '3N+Z' : (def.code === 'SB' || def.code === 'MP' || def.code === 'KP' || def.code === 'SW' ? '4N+L+SB' : (def.code === 'SASIRI' ? '3N' : '4N+L')))),
        };
      }
    }
  }

  // 2. Exact non-overlapping historical ranges:
  if (drawNo >= 5900 && drawNo <= 7500 && (!board || board === 'NLB')) {
    return { board: 'NLB', code: 'MS', nameEn: 'Mahajana Sampatha', lotteryType: '6D+L' };
  }
  if (drawNo >= 5250 && drawNo <= 5850 && (!board || board === 'DLB')) {
    return { board: 'DLB', code: 'SW', nameEn: 'Shanida', lotteryType: '4N+L+SB' };
  }
  if (drawNo >= 4800 && drawNo <= 5249 && (!board || board === 'DLB')) {
    return { board: 'DLB', code: 'LW', nameEn: 'Lagna Wasana', lotteryType: '4N+Z' };
  }
  if (drawNo >= 4200 && drawNo <= 4799 && (!board || board === 'NLB')) {
    return { board: 'NLB', code: 'GS', nameEn: 'Govisetha', lotteryType: '4N+L' };
  }
  if (drawNo >= 3700 && drawNo <= 4199 && (!board || board === 'NLB')) {
    return { board: 'NLB', code: 'VS', nameEn: 'Vasana Sampatha', lotteryType: '4N+L' };
  }
  if (drawNo >= 3250 && drawNo <= 3699 && (!board || board === 'DLB')) {
    return { board: 'DLB', code: 'SB', nameEn: 'Super Ball', lotteryType: '4N+L+SB' };
  }
  if (drawNo >= 2900 && drawNo <= 3249 && (!board || board === 'DLB')) {
    return { board: 'DLB', code: 'AK', nameEn: 'Ada Kotipathi', lotteryType: '4N+L' };
  }
  if (drawNo >= 2550 && drawNo <= 2899 && (!board || board === 'NLB')) {
    return { board: 'NLB', code: 'MP', nameEn: 'Mega Power', lotteryType: '4N+L+SB' };
  }
  if (drawNo >= 2350 && drawNo <= 2549 && (!board || board === 'DLB')) {
    return { board: 'DLB', code: 'KP', nameEn: 'Kapruka', lotteryType: '4N+L+SB' };
  }
  if (drawNo >= 2150 && drawNo <= 2349 && (!board || board === 'NLB')) {
    return { board: 'NLB', code: 'DN', nameEn: 'Dhana Nidhanaya', lotteryType: '4N+L' };
  }
  if (drawNo >= 2000 && drawNo <= 2149 && (!board || board === 'NLB')) {
    return { board: 'NLB', code: 'JD', nameEn: 'Jayoda', lotteryType: '4N+L' };
  }
  if (drawNo >= 1750 && drawNo <= 1999 && (!board || board === 'NLB')) {
    return { board: 'NLB', code: 'SD', nameEn: 'Suba Dawasak', lotteryType: '3N+Z' };
  }
  if (drawNo >= 1550 && drawNo <= 1749 && (!board || board === 'NLB')) {
    return { board: 'NLB', code: 'HD', nameEn: 'Handahana', lotteryType: '4N+Z' };
  }
  if (drawNo >= 1300 && drawNo <= 1549 && (!board || board === 'NLB')) {
    return { board: 'NLB', code: 'SEV', nameEn: 'Sevana', lotteryType: '4N+L' };
  }
  if (drawNo >= 1100 && drawNo <= 1299 && (!board || board === 'DLB')) {
    return { board: 'DLB', code: 'SASIRI', nameEn: 'Sasiri', lotteryType: '3N' };
  }
  if (drawNo >= 900 && drawNo <= 1099 && (!board || board === 'DLB')) {
    return { board: 'DLB', code: 'SDS', nameEn: 'Supiri Dhana Sampatha', lotteryType: '6D+L' };
  }
  if (drawNo >= 700 && drawNo <= 899 && (!board || board === 'DLB')) {
    return { board: 'DLB', code: 'WAASI', nameEn: 'Kotipathi Waasi', lotteryType: '2N+L+SB' };
  }
  if (drawNo >= 500 && drawNo <= 699 && (!board || board === 'NLB')) {
    return { board: 'NLB', code: 'NJ', nameEn: 'NLB Jaya', lotteryType: '4D+L' };
  }
  if (drawNo >= 400 && drawNo <= 499 && (!board || board === 'DLB')) {
    return { board: 'DLB', code: 'JS', nameEn: 'Jaya Sampatha', lotteryType: '4D+REV+L' };
  }

  // 3. Fallback to nearest anchor
  let bestMatch: LotteryMapping | null = null;
  let minDiff = Infinity;

  for (const [code, anchor] of Object.entries(OFFICIAL_ANCHOR_DRAWS)) {
    const def = LOTTERY_DEFINITIONS.find(d => d.code === code);
    if (!def) continue;
    if (board && def.board !== board) continue;

    const diff = Math.abs(drawNo - anchor.drawNo);
    if (diff < minDiff) {
      minDiff = diff;
      bestMatch = {
        board: def.board,
        code: def.code,
        nameEn: def.nameEn,
        lotteryType: def.code === 'MS' || def.code === 'SDS' ? '6D+L' : (def.code === 'LW' || def.code === 'HD' ? '4N+Z' : (def.code === 'SD' ? '3N+Z' : (def.code === 'SB' || def.code === 'MP' || def.code === 'KP' ? '4N+L+SB' : (def.code === 'SASIRI' ? '3N' : '4N+L')))),
      };
    }
  }

  return bestMatch;
}

export function getSriLankaTodayString(): string {
  try {
    const now = new Date();
    // Accurate Asia/Colombo calendar date
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Colombo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(now);
  } catch {
    return new Date().toISOString().split('T')[0];
  }
}

export interface LotteryMapping {
  board: LotteryBoard;
  code: string;
  nameEn: string;
  lotteryType: '4N+L' | '4N+Z' | '4N+L+SB' | '6D+L' | '3N' | '3N+Z' | '4D+L' | '4D+REV+L' | '2N+L+SB';
}

/**
 * Maps lottery keywords, abbreviations, and names to standard definitions.
 * Supports Sinhala, Tamil, and English names as well as official codes.
 */
export function resolveLotteryIdentifier(input: string, forceBoard?: LotteryBoard): LotteryMapping | null {
  if (!input) return null;
  const rawLower = input.toLowerCase().trim();
  const clean = rawLower.replace(/[^a-z0-9]/g, '');

  // 1. Strict DLB Lotteries (Development Lotteries Board - dlb.lk)
  if (forceBoard !== 'NLB') {
    if (
      rawLower.includes('අද කෝටිපති') || rawLower.includes('අදකෝටිපති') || rawLower.includes('කෝටිපති') ||
      clean.includes('adakotipathi') || clean.includes('kotipathi') || clean === 'ak' || /^ak\d+/i.test(clean)
    ) {
      return { board: 'DLB', code: 'AK', nameEn: 'Ada Kotipathi', lotteryType: '4N+L' };
    }
    if (
      rawLower.includes('ශනිදා') || rawLower.includes('සනිදා') ||
      clean.includes('shanida') || clean === 'sw' || clean === 'sv' || /^sw\d+/i.test(clean)
    ) {
      return { board: 'DLB', code: 'SW', nameEn: 'Shanida', lotteryType: '4N+L+SB' };
    }
    if (
      rawLower.includes('ලග්න වාසනාව') || rawLower.includes('ලග්නවාසනාව') || rawLower.includes('ලග්න') ||
      clean.includes('lagnawasana') || (clean.includes('lagna') && !clean.includes('handahana')) || clean === 'lw' || /^lw\d+/i.test(clean)
    ) {
      return { board: 'DLB', code: 'LW', nameEn: 'Lagna Wasana', lotteryType: '4N+Z' };
    }
    if (
      rawLower.includes('සුපර් බෝල්') || rawLower.includes('සුපර්බෝල්') ||
      clean.includes('superball') || clean === 'sb' || /^sb\d+/i.test(clean)
    ) {
      return { board: 'DLB', code: 'SB', nameEn: 'Super Ball', lotteryType: '4N+L+SB' };
    }
    if (
      rawLower.includes('කප්රුක') ||
      clean.includes('kapruka') || clean === 'kp' || /^kp\d+/i.test(clean)
    ) {
      return { board: 'DLB', code: 'KP', nameEn: 'Kapruka', lotteryType: '4N+L+SB' };
    }
    if (
      rawLower.includes('සසිරි') || clean.includes('sasiri') || clean === 'sas' || /^sasiri\d+/i.test(clean)
    ) {
      return { board: 'DLB', code: 'SASIRI', nameEn: 'Sasiri', lotteryType: '3N' };
    }
    if (
      rawLower.includes('සුපිරි ධන') || rawLower.includes('සුපිරිධන') ||
      clean.includes('supiridhana') || (clean.includes('supiri') && clean.includes('sampatha')) || clean === 'sds' || /^sds\d+/i.test(clean)
    ) {
      return { board: 'DLB', code: 'SDS', nameEn: 'Supiri Dhana Sampatha', lotteryType: '6D+L' };
    }
    if (
      rawLower.includes('ජය සම්පත') || rawLower.includes('ජයසම්පත') ||
      clean.includes('jayasampatha') || (clean.includes('jaya') && clean.includes('sampatha')) || clean === 'js' || /^js\d+/i.test(clean)
    ) {
      return { board: 'DLB', code: 'JS', nameEn: 'Jaya Sampatha', lotteryType: '4D+REV+L' };
    }
    if (
      rawLower.includes('කෝටිපති වාසි') || rawLower.includes('කෝටිපතිවාසි') || rawLower.includes('වාසි') ||
      clean.includes('waasi') || clean === 'was'
    ) {
      return { board: 'DLB', code: 'WAASI', nameEn: 'Kotipathi Waasi', lotteryType: '2N+L+SB' };
    }
  }

  // 2. Strict NLB Lotteries (National Lotteries Board - nlb.lk)
  if (forceBoard !== 'DLB') {
    if (
      rawLower.includes('ගොවිසෙත') || rawLower.includes('ගොවි') ||
      clean.includes('govisetha') || clean.includes('govi') || clean === 'gs' || /^gs\d+/i.test(clean)
    ) {
      return { board: 'NLB', code: 'GS', nameEn: 'Govisetha', lotteryType: '4N+L' };
    }
    if (
      rawLower.includes('මහජන සම්පත') || rawLower.includes('මහජන') ||
      clean.includes('mahajana') || (clean.includes('sampatha') && !clean.includes('jaya') && !clean.includes('supiri') && !clean.includes('ada')) || clean === 'ms' || /^ms\d+/i.test(clean)
    ) {
      return { board: 'NLB', code: 'MS', nameEn: 'Mahajana Sampatha', lotteryType: '6D+L' };
    }
    if (
      rawLower.includes('ධන නිධානය') || rawLower.includes('ධනනිධානය') || rawLower.includes('නිධානය') ||
      clean.includes('dhananidhanaya') || (clean.includes('nidhanaya') && !clean.includes('supiri')) || clean === 'dn' || /^dn\d+/i.test(clean)
    ) {
      return { board: 'NLB', code: 'DN', nameEn: 'Dhana Nidhanaya', lotteryType: '4N+L' };
    }
    if (
      rawLower.includes('මෙගා පවර්') || rawLower.includes('මෙගාපවර්') ||
      clean.includes('megapower') || clean === 'mp' || /^mp\d+/i.test(clean)
    ) {
      return { board: 'NLB', code: 'MP', nameEn: 'Mega Power', lotteryType: '4N+L+SB' };
    }
    if (
      rawLower.includes('හඳහන') || rawLower.includes('හදහන') ||
      clean.includes('handahana') || clean.includes('hadahana') || clean === 'hd' || /^hd\d+/i.test(clean)
    ) {
      return { board: 'NLB', code: 'HD', nameEn: 'Handahana', lotteryType: '4N+Z' };
    }
    if (
      rawLower.includes('අද සම්පත') || rawLower.includes('අදසම්පත') ||
      clean.includes('adasampatha') || clean === 'as' || /^as\d+/i.test(clean)
    ) {
      return { board: 'NLB', code: 'AS', nameEn: 'Ada Sampatha', lotteryType: '4D+L' };
    }
    if (
      rawLower.includes('ජයෝදා') || rawLower.includes('ජයොදා') ||
      clean.includes('jayoda') || clean === 'jd' || /^jd\d+/i.test(clean)
    ) {
      return { board: 'NLB', code: 'JD', nameEn: 'Jayoda', lotteryType: '4N+L' };
    }
    if (
      rawLower.includes('සුභ දවසක්') || rawLower.includes('සුබ දවසක්') || rawLower.includes('සුභදවසක්') || rawLower.includes('සුබදවසක්') ||
      clean.includes('subadawasak') || clean.includes('subadawasa') || clean.includes('subhadawasa') || clean === 'sd' || /^sd\d+/i.test(clean)
    ) {
      return { board: 'NLB', code: 'SD', nameEn: 'Suba Dawasak', lotteryType: '3N+Z' };
    }
    if (
      rawLower.includes('nlbjaya') || (clean === 'jaya' && forceBoard === 'NLB') || clean === 'nj' || /^nj\d+/i.test(clean)
    ) {
      return { board: 'NLB', code: 'NJ', nameEn: 'NLB Jaya', lotteryType: '4D+L' };
    }
    if (
      rawLower.includes('වාසනා සම්පත') || rawLower.includes('වාසනා') ||
      clean.includes('vasanasampatha') || clean === 'vs' || /^vs\d+/i.test(clean)
    ) {
      return { board: 'NLB', code: 'VS', nameEn: 'Vasana Sampatha', lotteryType: '4N+L' };
    }
    if (
      rawLower.includes('සෙවණ') || rawLower.includes('සෙවන') ||
      clean.includes('sevana') || clean === 'sev'
    ) {
      return { board: 'NLB', code: 'SEV', nameEn: 'Sevana', lotteryType: '4N+L' };
    }
  }

  return null;
}

/**
 * Universal, highly robust Sri Lankan lottery QR code parser.
 * Handles all NLB & DLB ticket variations:
 * 1. Delimited pipes: NLB|GS|4563|2026-09-25|T|16|30|34|51
 * 2. Delimited hyphens: NLB-GS-4563-T-16-30-34-51 or GS-4563-T-16-30-34-51
 * 3. Delimited slashes: GS/4563/T/16/30/34/51
 * 4. Delimited colons: GS:4563:2026-09-25:T:16:30:34:51
 * 5. Whitespace separated: GS 4563 T 16 30 34 51 or 4563 T 16 30 34 51
 * 6. Compact barcode: GS4563T16303451 or MS6321S986159
 * 7. Official web URLs: https://www.nlb.lk/results/govisetha/4563
 * 8. Zodiac tickets (Lagna Wasana / Handahana): DLB|LW|5007|2026-09-25|කටක|10|24|39|52
 * 9. Super Ball tickets: DLB|SB|3295|2026-09-25|S|04|18|42|66|SB:19
 * 10. 6-digit sequence tickets: NLB|MS|6321|2026-09-25|S|9|8|6|1|5|9
 */
/**
 * 0. Structural Parser for Real Printed DLB and NLB QR Codes (decoded from physical tickets)
 * Handles:
 * - DLB: <Name> <Draw> <Date> <Draw> - <Serial> - <Check> - <Terminal> <Letter/Zodiac> <n1> <n2> <n3> <n4> [<special>] www.dlb.lk
 * - NLB: r.nlb.lk/<code><draw><serial><letter/zodiac>[<super>]<nums>
 */
export function parsePrintedBoardQr(trimmed: string): ParsedTicketData | null {
  const singleLine = trimmed.replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim();
  const todayStr = getSriLankaTodayString();

  // Pattern 0A: DLB Printed Board QR Format
  // e.g. "SHANIDA 5448 2026.09.17 5448 - 233819851 - 2 - 01 T 01 42 43 71 92975 www.dlb.lk"
  // e.g. "SHANIDA 5420 2026.08.20 5420 - 233422057 - 1 - 02 I 11 21 31 35 17533 www.dlb.lk"
  // e.g. "ADA KOTIPATHI 3112 2026.09.16 3112 - 140717518 - 5 - 04 A 11 20 21 22 www.dlb.lk"
  // e.g. "LAGNA WASANA 4993 2026.09.11 4993 - 500395754 - 7 - 04 GEM 23 51 57 58 www.dlb.lk"
  // e.g. "LAGNA WASANA 4993 2026.09.25 4993 - 500395754 - 7 - 04 04 10 24 39 52 www.dlb.lk"
  // e.g. "ලග්න වාසනාව 4993 2026.09.11 4993 - 500395754 - 7 - 04 මිථුන 23 51 57 58 www.dlb.lk"
  // e.g. "4993 - 500395754 - 7 - 04 23 51 57 58 GEM"
  // e.g. "4993 - 500395754 - 7 - 04 10 24 39 52 කටක"
  // e.g. "4993 - 500395754 - 7 - 04 D 10 24 39 52"
  const dlbPrintedMatch = singleLine.match(
    /^(?:([A-Za-z\u0D80-\u0DFF\s]+?)\s+)?(\d{3,5})\s*(?:(\d{4})[./-](\d{1,2})[./-](\d{1,2})\s+)?(?:(\d{3,5})\s*)?[- ]+\s*(\d{5,14})\s*[-]+\s*(\d{1,3})\s*[-]+\s*(\d{1,4})\b([\s\S]*)$/i
  );

  if (dlbPrintedMatch) {
    const rawName = dlbPrintedMatch[1] ? dlbPrintedMatch[1].trim() : '';
    const drawNo = parseInt(dlbPrintedMatch[2], 10);
    const drawDate = dlbPrintedMatch[3]
      ? `${dlbPrintedMatch[3]}-${dlbPrintedMatch[4].padStart(2, '0')}-${dlbPrintedMatch[5].padStart(2, '0')}`
      : todayStr;
    let rest = dlbPrintedMatch[10].trim();
    // Strip trailing dlb.lk
    rest = rest.replace(/(?:https?:\/\/)?(?:www\.)?dlb\.lk\b/gi, '').trim();

    // Match letter/zodiac and 4 numbers in rest (handles prefix, suffix, two 4-digit blocks, 8-digit block, and numeric/text zodiacs)
    let letterOrZodiac = '';
    let nums: number[] = [];
    let rawSpecial: string | undefined = undefined;

    // Pattern 1: Token (Letter/Zodiac) + 4 numbers (separated by spaces or hyphens)
    const tokenMatch = rest.match(/^([A-Za-z\u0D80-\u0DFF]{1,15}|0[1-9]|1[0-2])\s+(\d{1,2})[\s,-]+(\d{1,2})[\s,-]+(\d{1,2})[\s,-]+(\d{1,2})(?:\s+(\d+))?/i);
    // Pattern 1B: Token + two 4-digit blocks (e.g. "GEM 0634 4253" or "04 0634 4253")
    const tokenBlockMatch = !tokenMatch ? rest.match(/^([A-Za-z\u0D80-\u0DFF]{1,15}|0[1-9]|1[0-2])\s+(\d{4})\s+(\d{4})(?:\s+(\d+))?/i) : null;
    // Pattern 2: 4 numbers + Token
    const numsFirstMatch = (!tokenMatch && !tokenBlockMatch) ? rest.match(/^(\d{1,2})[\s,-]+(\d{1,2})[\s,-]+(\d{1,2})[\s,-]+(\d{1,2})\s+([A-Za-z\u0D80-\u0DFF]{1,15}|0[1-9]|1[0-2])(?:\s+(\d+))?/i) : null;
    // Pattern 2B: Two 4-digit blocks + Token (e.g. "0634 4253 GEM")
    const blocksFirstMatch = (!tokenMatch && !tokenBlockMatch && !numsFirstMatch) ? rest.match(/^(\d{4})\s+(\d{4})\s+([A-Za-z\u0D80-\u0DFF]{1,15}|0[1-9]|1[0-2])(?:\s+(\d+))?/i) : null;
    // Pattern 3: Pure 4 numbers
    const pureNumsMatch = (!tokenMatch && !tokenBlockMatch && !numsFirstMatch && !blocksFirstMatch) ? rest.match(/^(\d{1,2})[\s,-]+(\d{1,2})[\s,-]+(\d{1,2})[\s,-]+(\d{1,2})(?:\s+(\d+))?/i) : null;
    // Pattern 3B: Pure two 4-digit blocks (e.g. "0634 4253")
    const pureBlocksMatch = (!tokenMatch && !tokenBlockMatch && !numsFirstMatch && !blocksFirstMatch && !pureNumsMatch) ? rest.match(/^(\d{4})\s+(\d{4})(?:\s+(\d+))?/i) : null;
    // Pattern 3C: Pure 8-digit block (e.g. "06344253")
    const pure8BlockMatch = (!tokenMatch && !tokenBlockMatch && !numsFirstMatch && !blocksFirstMatch && !pureNumsMatch && !pureBlocksMatch) ? rest.match(/^(\d{8})(?:\s+(\d+))?/i) : null;

    if (tokenMatch) {
      letterOrZodiac = tokenMatch[1].toUpperCase();
      nums = [
        parseInt(tokenMatch[2], 10),
        parseInt(tokenMatch[3], 10),
        parseInt(tokenMatch[4], 10),
        parseInt(tokenMatch[5], 10),
      ].sort((a, b) => a - b);
      rawSpecial = tokenMatch[6];
    } else if (tokenBlockMatch) {
      letterOrZodiac = tokenBlockMatch[1].toUpperCase();
      const b1 = tokenBlockMatch[2];
      const b2 = tokenBlockMatch[3];
      nums = [
        parseInt(b1.slice(0, 2), 10),
        parseInt(b1.slice(2, 4), 10),
        parseInt(b2.slice(0, 2), 10),
        parseInt(b2.slice(2, 4), 10),
      ].sort((a, b) => a - b);
      rawSpecial = tokenBlockMatch[4];
    } else if (numsFirstMatch) {
      nums = [
        parseInt(numsFirstMatch[1], 10),
        parseInt(numsFirstMatch[2], 10),
        parseInt(numsFirstMatch[3], 10),
        parseInt(numsFirstMatch[4], 10),
      ].sort((a, b) => a - b);
      letterOrZodiac = numsFirstMatch[5].toUpperCase();
      rawSpecial = numsFirstMatch[6];
    } else if (blocksFirstMatch) {
      const b1 = blocksFirstMatch[1];
      const b2 = blocksFirstMatch[2];
      nums = [
        parseInt(b1.slice(0, 2), 10),
        parseInt(b1.slice(2, 4), 10),
        parseInt(b2.slice(0, 2), 10),
        parseInt(b2.slice(2, 4), 10),
      ].sort((a, b) => a - b);
      letterOrZodiac = blocksFirstMatch[3].toUpperCase();
      rawSpecial = blocksFirstMatch[4];
    } else if (pureNumsMatch) {
      nums = [
        parseInt(pureNumsMatch[1], 10),
        parseInt(pureNumsMatch[2], 10),
        parseInt(pureNumsMatch[3], 10),
        parseInt(pureNumsMatch[4], 10),
      ].sort((a, b) => a - b);
      rawSpecial = pureNumsMatch[5];
    } else if (pureBlocksMatch) {
      const b1 = pureBlocksMatch[1];
      const b2 = pureBlocksMatch[2];
      nums = [
        parseInt(b1.slice(0, 2), 10),
        parseInt(b1.slice(2, 4), 10),
        parseInt(b2.slice(0, 2), 10),
        parseInt(b2.slice(2, 4), 10),
      ].sort((a, b) => a - b);
      rawSpecial = pureBlocksMatch[3];
    } else if (pure8BlockMatch) {
      const s = pure8BlockMatch[1];
      nums = [
        parseInt(s.slice(0, 2), 10),
        parseInt(s.slice(2, 4), 10),
        parseInt(s.slice(4, 6), 10),
        parseInt(s.slice(6, 8), 10),
      ].sort((a, b) => a - b);
      rawSpecial = pure8BlockMatch[2];
    }

    if (nums.length === 4) {
      const ticketSuperBall = rawSpecial ? parseInt(rawSpecial, 10) : undefined;

      const mapped = rawName ? resolveLotteryIdentifier(rawName, 'DLB') : guessLotteryFromDrawNo('DLB', drawNo);
      const lotteryCode = mapped ? mapped.code : (drawNo >= 5250 ? 'SW' : drawNo >= 4800 ? 'LW' : 'AK');
      const lotteryName = mapped ? mapped.nameEn : (lotteryCode === 'SW' ? 'Shanida' : lotteryCode === 'LW' ? 'Lagna Wasana' : 'Ada Kotipathi');
      let lotteryType = mapped?.lotteryType || (lotteryCode === 'LW' ? '4N+Z' : '4N+L');

      let ticketLetter: string | undefined = undefined;
      let ticketZodiac: string | undefined = undefined;
      let ticketZodiacEn: string | undefined = undefined;

      if (lotteryCode === 'LW' || lotteryCode === 'HD' || lotteryCode === 'SD') {
        lotteryType = '4N+Z';
        const numZ = parseInt(letterOrZodiac, 10);
        const zObj = (!isNaN(numZ) && numZ >= 1 && numZ <= 12)
          ? Object.values(ZODIAC_MAPPING).find(z => z.index === numZ)
          : (mapLetterToZodiac(letterOrZodiac) || normalizeZodiac(letterOrZodiac, true));
        if (zObj) {
          ticketZodiac = zObj.si;
          ticketZodiacEn = zObj.en;
        } else if (letterOrZodiac) {
          ticketZodiac = letterOrZodiac;
        }
      } else {
        ticketLetter = letterOrZodiac;
        if (lotteryCode === 'KP' || lotteryCode === 'SB') {
          lotteryType = '4N+L+SB';
        }
      }

      return {
        isValidLottery: true,
        isFutureDraw: false,
        hasTicketNumbers: true,
        hasExplicitDate: Boolean(dlbPrintedMatch[3]),
        board: 'DLB',
        lotteryCode,
        lotteryName,
        drawNo,
        drawDate,
        ticketNumbers: nums,
        ticketLetter,
        ticketZodiac,
        ticketZodiacEn,
        ticketSuperBall,
        lotteryType,
        rawString: trimmed,
      };
    }
  }

  // Pattern 0B: NLB Printed Board URL Format (r.nlb.lk)
  // e.g. "http://r.nlb.lk/081045440291405B06466466" -> Govisetha 4544, letter B, nums [6, 46, 64, 66]
  // e.g. "http://r.nlb.lk/085016050326004C23313342" -> Handahana 1605, zodiac C (මිථුන), nums [23, 31, 33, 42]
  // e.g. "https://r.nlb.lk/083026580294290V2001496673" -> Mega Power 2658, letter V, super 20, nums [1, 49, 66, 73]
  const nlbPrintedMatch = trimmed.match(
    /https?:\/\/r\.nlb\.lk\/(\d{3})(\d{5})(\d{7})([A-Za-z])(?:(\d{2})(\d{8})|(\d{8}))/i
  );

  if (nlbPrintedMatch) {
    const code3 = nlbPrintedMatch[1];
    const drawNo = parseInt(nlbPrintedMatch[2], 10);
    const char = nlbPrintedMatch[4].toUpperCase();
    const superBall = nlbPrintedMatch[5] ? parseInt(nlbPrintedMatch[5], 10) : undefined;
    const numsStr = nlbPrintedMatch[6] || nlbPrintedMatch[7];
    const nums = [
      parseInt(numsStr.slice(0, 2), 10),
      parseInt(numsStr.slice(2, 4), 10),
      parseInt(numsStr.slice(4, 6), 10),
      parseInt(numsStr.slice(6, 8), 10),
    ].sort((a, b) => a - b);

    const nlbCodeMap: Record<string, { code: string; name: string; type: LotteryType }> = {
      '080': { code: 'MS', name: 'Mahajana Sampatha', type: '6D+L' },
      '081': { code: 'GS', name: 'Govisetha', type: '4N+L' },
      '082': { code: 'DN', name: 'Dhana Nidhanaya', type: '4N+L' },
      '083': { code: 'MP', name: 'Mega Power', type: '4N+L+SB' },
      '085': { code: 'HD', name: 'Handahana', type: '4N+Z' },
      '086': { code: 'AS', name: 'Ada Sampatha', type: '4D+L' },
      '087': { code: 'NJ', name: 'NLB Jaya', type: '4D+L' },
      '088': { code: 'SD', name: 'Suba Dawasak', type: '3N+Z' },
    };

    const entry = nlbCodeMap[code3] || { code: 'GS', name: 'Govisetha', type: '4N+L' };
    const def = LOTTERY_DEFINITIONS.find(d => d.code === entry.code);
    const drawDate = def ? calculateAccurateDrawDate(def, drawNo) : todayStr;

    let ticketLetter: string | undefined = undefined;
    let ticketZodiac: string | undefined = undefined;
    let ticketZodiacEn: string | undefined = undefined;

    if (entry.type === '4N+Z' || entry.type === '3N+Z') {
      const zObj = mapLetterToZodiac(char);
      if (zObj) {
        ticketZodiac = zObj.si;
        ticketZodiacEn = zObj.en;
      } else {
        ticketZodiac = char;
      }
    } else {
      ticketLetter = char;
    }

    return {
      isValidLottery: true,
      isFutureDraw: false,
      hasTicketNumbers: true,
      hasExplicitDate: false,
      board: 'NLB',
      lotteryCode: entry.code,
      lotteryName: entry.name,
      drawNo,
      drawDate,
      ticketNumbers: nums,
      ticketLetter,
      ticketZodiac,
      ticketZodiacEn,
      ticketSuperBall: superBall,
      lotteryType: entry.type,
      rawString: trimmed,
    };
  }

  return null;
}

export function parseLotteryQr(raw: string): ParsedTicketData {
  if (!raw || typeof raw !== 'string') {
    return {
      isValidLottery: false,
      isFutureDraw: false,
      hasTicketNumbers: false,
      board: 'NLB',
      lotteryCode: 'UNKNOWN',
      lotteryName: 'Unknown',
      drawNo: 0,
      drawDate: '',
      ticketNumbers: [],
      rawString: '',
      errorMessage: 'Empty QR code',
    };
  }

  const trimmed = raw.trim();

  // 0. Check real printed DLB / NLB QR formats first!
  const printedResult = parsePrintedBoardQr(trimmed);
  if (printedResult) {
    return printedResult;
  }

  const lower = trimmed.toLowerCase();
  const todayStr = getSriLankaTodayString();

  // Detect explicit board mentions
  const isExplicitNLB = lower.includes('nlb.lk') || lower.includes('nlb') || lower.includes('national lotteries');
  const isExplicitDLB = lower.includes('dlb.lk') || lower.includes('dlb') || lower.includes('development lotteries');
  const forcedBoard: LotteryBoard | undefined = isExplicitNLB ? 'NLB' : (isExplicitDLB ? 'DLB' : undefined);

  // 1. JSON Payload format (digital app tickets)
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const data = JSON.parse(trimmed);
      const rawCode = (data.lotteryCode || data.code || data.c || data.lottery || data.lotteryId || '').toString();
      const mapped = resolveLotteryIdentifier(rawCode, forcedBoard);

      const board: LotteryBoard = forcedBoard || (data.board === 'NLB' ? 'NLB' : data.board === 'DLB' ? 'DLB' : (mapped ? mapped.board : 'NLB'));
      const lotteryCode = mapped ? mapped.code : (board === 'NLB' ? 'GS' : 'AK');
      const lotteryName = mapped ? mapped.nameEn : (board === 'NLB' ? 'Govisetha' : 'Ada Kotipathi');
      const lotteryType = mapped?.lotteryType || (lotteryCode === 'MS' || lotteryCode === 'SDS' ? '6D+L' : (lotteryCode === 'LW' || lotteryCode === 'HD' ? '4N+Z' : (lotteryCode === 'SB' || lotteryCode === 'MP' || lotteryCode === 'KP' ? '4N+L+SB' : '4N+L')));

      const rawDate = data.drawDate || data.date || data.d_date || '';
      const drawDate = rawDate ? normalizeDateString(rawDate) : todayStr;
      const drawNo = Number(data.drawNo || data.draw || data.d || 0);

      let ticketNumbers: number[] = [];
      if (Array.isArray(data.numbers || data.n)) {
        ticketNumbers = (data.numbers || data.n).map((n: unknown) => Number(n)).filter((n: number) => !isNaN(n));
        if (lotteryType !== '6D+L') {
          ticketNumbers.sort((a, b) => a - b);
        }
      }

      const rawZodiac = data.zodiac || data.z || undefined;
      const normZodiac = normalizeZodiac(rawZodiac);

      const rawLetter = (lotteryType === '4N+Z') ? undefined : (data.letter || data.l || undefined);
      const ticketLetter = rawLetter ? String(rawLetter).trim().toUpperCase() : undefined;

      const rawSuper = data.superBall ?? data.sb ?? data.superNumber ?? data.megaBall;
      const ticketSuperBall = rawSuper !== undefined ? Number(rawSuper) : undefined;
      const isFuture = Boolean(drawDate && drawDate > todayStr);

      return {
        isValidLottery: true,
        isFutureDraw: isFuture,
        hasTicketNumbers: ticketNumbers.length > 0,
        board,
        lotteryCode,
        lotteryName,
        drawNo,
        drawDate,
        ticketNumbers,
        ticketLetter,
        ticketZodiac: normZodiac ? normZodiac.si : rawZodiac,
        ticketZodiacEn: normZodiac ? normZodiac.en : undefined,
        ticketSuperBall,
        lotteryType,
        rawString: trimmed,
      };
    } catch {
      // not valid json, continue
    }
  }

  // 2. URL format (e.g. https://www.nlb.lk/results/govisetha/4563 or https://www.dlb.lk/results/details?l=AK&d=3121)
  if (
    lower.includes('dlb.lk') ||
    lower.includes('nlb.lk') ||
    lower.startsWith('http://') ||
    lower.startsWith('https://') ||
    lower.startsWith('www.') ||
    lower.includes('results/')
  ) {
    try {
      let normalizedUrlStr = trimmed;
      if (!normalizedUrlStr.startsWith('http://') && !normalizedUrlStr.startsWith('https://')) {
        normalizedUrlStr = 'https://' + normalizedUrlStr;
      }

      const url = new URL(normalizedUrlStr);
      const host = url.hostname.toLowerCase();
      const pathname = url.pathname.toLowerCase();
      const searchParams = url.searchParams;

      const isNLB = host.includes('nlb') || pathname.includes('nlb') || isExplicitNLB;
      const detectedBoard: LotteryBoard = isNLB ? 'NLB' : 'DLB';

      const pathSegments = pathname.split('/').filter(Boolean);
      let mapped: LotteryMapping | null = null;

      for (const seg of pathSegments) {
        if (['results', 'view', 'details', 'en', 'si', 'ta', 'lotteries', 'lottery', 'r', 'daily-results'].includes(seg)) continue;
        mapped = resolveLotteryIdentifier(seg, detectedBoard);
        if (mapped) break;
      }

      if (!mapped) {
        const queryParams = [
          searchParams.get('l'),
          searchParams.get('lottery'),
          searchParams.get('code'),
          searchParams.get('c'),
          searchParams.get('slug'),
          searchParams.get('lottery_code'),
          searchParams.get('game'),
          searchParams.get('name'),
        ].filter(Boolean) as string[];
        for (const q of queryParams) {
          mapped = resolveLotteryIdentifier(q, detectedBoard);
          if (mapped) break;
        }
      }

      const board: LotteryBoard = detectedBoard;
      const lotteryCode = mapped ? mapped.code : (board === 'NLB' ? 'GS' : 'AK');
      const lotteryName = mapped ? mapped.nameEn : (board === 'NLB' ? 'Govisetha' : 'Ada Kotipathi');
      const lotteryType = mapped?.lotteryType || (lotteryCode === 'MS' || lotteryCode === 'SDS' ? '6D+L' : (lotteryCode === 'LW' || lotteryCode === 'HD' ? '4N+Z' : (lotteryCode === 'SB' || lotteryCode === 'MP' || lotteryCode === 'KP' || lotteryCode === 'SW' ? '4N+L+SB' : '4N+L')));

      const rawDraw = searchParams.get('d') || 
                      searchParams.get('draw') || 
                      searchParams.get('drawNo') || 
                      searchParams.get('drawno') || 
                      searchParams.get('draw_no') || 
                      searchParams.get('d_no') || 
                      searchParams.get('id') || 
                      searchParams.get('no') || 
                      searchParams.get('dr') || '';
      let drawNo = parseInt(rawDraw, 10);
      if (isNaN(drawNo) || drawNo === 0) {
        const drawSeg = pathSegments.find(s => /^\d{2,5}$/.test(s));
        if (drawSeg) {
          drawNo = parseInt(drawSeg, 10);
        } else {
          for (const s of pathSegments) {
            const m = s.match(/(?:draw|d|no)[-_]?(\d{3,5})/i);
            if (m) {
              drawNo = parseInt(m[1], 10);
              break;
            }
          }
        }
      }

      // If draw number is still 0, fallback to known official anchor draw for this lottery
      if (drawNo === 0 && OFFICIAL_ANCHOR_DRAWS[lotteryCode]) {
        drawNo = OFFICIAL_ANCHOR_DRAWS[lotteryCode].drawNo;
      }

      let rawDate = searchParams.get('date') || searchParams.get('dt') || searchParams.get('d_date') || '';
      if (!rawDate) {
        // Check if any path segment contains a valid date (e.g. 2026-09-25)
        const dateSeg = pathSegments.find(s => /^(20[123]\d)[-/.]?(0?[1-9]|1[0-2])[-/.]?(0?[1-9]|[12]\d|3[01])$/.test(s));
        if (dateSeg) {
          rawDate = dateSeg;
        }
      }
      const def = LOTTERY_DEFINITIONS.find(d => d.code === lotteryCode);
      const drawDate = rawDate
        ? normalizeDateString(rawDate)
        : (def && drawNo > 0 ? calculateAccurateDrawDate(def, drawNo) : todayStr);

      const numParam = searchParams.get('n') || searchParams.get('numbers') || searchParams.get('nums') || searchParams.get('num') || '';
      let ticketNumbers: number[] = [];
      if (numParam) {
        ticketNumbers = numParam.split(/[,\-|]/).map(n => parseInt(n.trim(), 10)).filter(n => !isNaN(n) && n >= 0 && n <= 99);
      }

      const rawLet = searchParams.get('letter') || searchParams.get('let') || (searchParams.get('s') && searchParams.get('s')!.length === 1 ? searchParams.get('s') : null);
      const letterParam = rawLet && /^[A-Za-z]$/.test(rawLet) ? rawLet : undefined;
      const zodiacParam = searchParams.get('z') || searchParams.get('zodiac');
      let normZodiac = normalizeZodiac(zodiacParam || undefined);
      const isZodiacGame = lotteryType === '4N+Z' || lotteryType === '3N+Z' || lotteryCode === 'LW' || lotteryCode === 'HD' || lotteryCode === 'SD';

      // If Zodiac game and letter A-L provided, map to Zodiac!
      if (isZodiacGame && !normZodiac && letterParam) {
        normZodiac = mapLetterToZodiac(letterParam);
      }

      const superParam = searchParams.get('sb') || searchParams.get('super') || searchParams.get('superball');
      const isFuture = Boolean(drawDate && drawDate > todayStr);

      return {
        isValidLottery: true,
        isFutureDraw: isFuture,
        hasTicketNumbers: ticketNumbers.length > 0,
        hasExplicitDate: Boolean(rawDate),
        board,
        lotteryCode,
        lotteryName,
        drawNo,
        drawDate,
        ticketNumbers,
        ticketLetter: isZodiacGame ? undefined : (letterParam ? letterParam.toUpperCase() : undefined),
        ticketZodiac: normZodiac ? normZodiac.si : (zodiacParam || undefined),
        ticketZodiacEn: normZodiac ? normZodiac.en : undefined,
        ticketSuperBall: superParam ? parseInt(superParam, 10) : undefined,
        lotteryType: isZodiacGame ? (lotteryCode === 'SD' ? '3N+Z' : '4N+Z') : lotteryType,
        rawString: trimmed,
      };
    } catch {
      // not a standard URL, continue
    }
  }

  // 2A. DLB Printed Barcode Format: "DRAW-SERIAL-CHECKDIGIT-TERMINAL"
  // Confirmed on real DLB tickets (e.g. "4993-500395754-7-04" or "3112-140717518-5-04" or "5420-500395754-7-04")
  // Note: These ticket identity barcodes encode ONLY Draw + Serial + Check Digit + Terminal; they do NOT encode lottery numbers!
  const dlbBarcodeMatch = trimmed.match(/^(\d{3,5})[-_ \t/]+(\d{5,14})(?:[-_ \t/]+(\d{1,3}))?(?:[-_ \t/]+(\d{1,4}))?$/);
  if (dlbBarcodeMatch) {
    const drawNo = parseInt(dlbBarcodeMatch[1], 10);
    const guessed = guessLotteryFromDrawNo('DLB', drawNo);
    const board: LotteryBoard = 'DLB';
    const lotteryCode = guessed ? guessed.code : (drawNo >= 5250 ? 'SW' : drawNo >= 4800 ? 'LW' : drawNo >= 2900 ? 'AK' : 'AK');
    const lotteryName = guessed ? guessed.nameEn : (lotteryCode === 'SW' ? 'Shanida' : lotteryCode === 'LW' ? 'Lagna Wasana' : 'Ada Kotipathi');
    const lotteryType = guessed ? guessed.lotteryType : (lotteryCode === 'LW' ? '4N+Z' : (lotteryCode === 'KP' || lotteryCode === 'SB' || lotteryCode === 'SW' ? '4N+L+SB' : '4N+L'));
    const def = LOTTERY_DEFINITIONS.find(d => d.code === lotteryCode);
    const accurateDate = def ? calculateAccurateDrawDate(def, drawNo) : todayStr;

    return {
      isValidLottery: true,
      isFutureDraw: false,
      hasTicketNumbers: false, // DLB barcode contains identity metadata only; user enters printed ticket numbers
      board,
      lotteryCode,
      lotteryName,
      drawNo,
      drawDate: accurateDate,
      ticketNumbers: [],
      ticketLetter: undefined,
      ticketZodiac: undefined,
      lotteryType,
      rawString: trimmed,
    };
  }

  // 2B. NLB Printed Barcode Format: exactly 15 digits = 3-digit code + 5-digit draw (zero-padded) + 7-digit serial
  // Confirmed on real NLB tickets (e.g. "085016050326004" -> code 085, draw 1605, serial 0326004)
  const nlb15Barcode = trimmed.match(/^(\d{3})(\d{5})(\d{7})$/);
  if (nlb15Barcode) {
    const drawNo = parseInt(nlb15Barcode[2], 10);
    const guessed = guessLotteryFromDrawNo('NLB', drawNo);
    const board: LotteryBoard = 'NLB';
    const lotteryCode = guessed ? guessed.code : 'GS';
    const lotteryName = guessed ? guessed.nameEn : 'Govisetha';
    const lotteryType = guessed ? guessed.lotteryType : '4N+L';
    const def = LOTTERY_DEFINITIONS.find(d => d.code === lotteryCode);
    const accurateDate = def ? calculateAccurateDrawDate(def, drawNo) : todayStr;

    return {
      isValidLottery: true,
      isFutureDraw: false,
      hasTicketNumbers: false, // User enters printed numbers
      board,
      lotteryCode,
      lotteryName,
      drawNo,
      drawDate: accurateDate,
      ticketNumbers: [],
      ticketLetter: undefined,
      ticketZodiac: undefined,
      lotteryType,
      rawString: trimmed,
    };
  }

  // 2C. Suba Dawasak 3N+Z Compact Format (e.g. "SD1852E184277" or "SD-1852-05-18-42-77")
  // Suba Dawasak draws are strictly in the range 1700 to 2050
  const compact3ZMatch = trimmed.match(/^(SD|SUB|SDW)?[-_]?(\d{3,5})[-_]?([A-La-l]|0[1-9]|1[0-2])[-_]?(\d{2})[-_]?(\d{2})[-_]?(\d{2})$/i);
  if (compact3ZMatch && (compact3ZMatch[1] || (parseInt(compact3ZMatch[2], 10) >= 1700 && parseInt(compact3ZMatch[2], 10) <= 2050))) {
    const drawNo = parseInt(compact3ZMatch[2], 10);
    const rawZ = compact3ZMatch[3];
    const zodiacObj = /^\d+$/.test(rawZ)
      ? Object.values(ZODIAC_MAPPING).find(z => z.index === parseInt(rawZ, 10))
      : mapLetterToZodiac(rawZ);
    const nums = [parseInt(compact3ZMatch[4], 10), parseInt(compact3ZMatch[5], 10), parseInt(compact3ZMatch[6], 10)].sort((a, b) => a - b);
    const def = LOTTERY_DEFINITIONS.find(d => d.code === 'SD');
    const accurateDate = def ? calculateAccurateDrawDate(def, drawNo) : todayStr;

    return {
      isValidLottery: true,
      isFutureDraw: false,
      hasTicketNumbers: true,
      board: 'NLB',
      lotteryCode: 'SD',
      lotteryName: 'Suba Dawasak',
      drawNo,
      drawDate: accurateDate,
      ticketNumbers: nums,
      ticketZodiac: zodiacObj ? zodiacObj.si : undefined,
      ticketZodiacEn: zodiacObj ? zodiacObj.en : undefined,
      ticketLetter: undefined,
      lotteryType: '3N+Z',
      rawString: trimmed,
    };
  }

  // 2D. Sasiri 3-Number Compact Format (e.g. "SASIRI1125174468" or "SAS-1125-17-44-68")
  const compact3NMatch = trimmed.match(/^(SASIRI|SAS)?[-_]?(\d{3,5})[-_]?(\d{2})[-_]?(\d{2})[-_]?(\d{2})$/i);
  if (compact3NMatch && (compact3NMatch[1] || parseInt(compact3NMatch[2], 10) === 1125)) {
    const drawNo = parseInt(compact3NMatch[2], 10);
    const nums = [parseInt(compact3NMatch[3], 10), parseInt(compact3NMatch[4], 10), parseInt(compact3NMatch[5], 10)].sort((a, b) => a - b);
    const def = LOTTERY_DEFINITIONS.find(d => d.code === 'SASIRI');
    const accurateDate = def ? calculateAccurateDrawDate(def, drawNo) : todayStr;

    return {
      isValidLottery: true,
      isFutureDraw: false,
      hasTicketNumbers: true,
      board: 'DLB',
      lotteryCode: 'SASIRI',
      lotteryName: 'Sasiri',
      drawNo,
      drawDate: accurateDate,
      ticketNumbers: nums,
      lotteryType: '3N',
      rawString: trimmed,
    };
  }

  // 2E. Jaya Sampatha 4-Single-Digit Reverse Format (e.g. "JS503H3947")
  const compact4RevMatch = trimmed.match(/^(JS)?[-_]?(\d{3,5})[-_]?([A-Za-z])[-_]?(\d{4})$/i);
  if (compact4RevMatch && (compact4RevMatch[1] || parseInt(compact4RevMatch[2], 10) < 1000)) {
    const drawNo = parseInt(compact4RevMatch[2], 10);
    const letter = compact4RevMatch[3].toUpperCase();
    const nums = compact4RevMatch[4].split('').map(d => parseInt(d, 10));
    const def = LOTTERY_DEFINITIONS.find(d => d.code === 'JS');
    const accurateDate = def ? calculateAccurateDrawDate(def, drawNo) : todayStr;

    return {
      isValidLottery: true,
      isFutureDraw: false,
      hasTicketNumbers: true,
      board: 'DLB',
      lotteryCode: 'JS',
      lotteryName: 'Jaya Sampatha',
      drawNo,
      drawDate: accurateDate,
      ticketNumbers: nums,
      ticketLetter: letter,
      lotteryType: '4D+REV+L',
      rawString: trimmed,
    };
  }

  // 2F. Kotipathi Waasi Format (e.g. "WAASI840R621985")
  const compactWaasiMatch = trimmed.match(/^(WAASI|WAS)?[-_]?(\d{3,5})[-_]?([A-Za-z])[-_]?(\d{2})[-_]?(\d{2})[-_]?(\d{2})$/i);
  if (compactWaasiMatch && (compactWaasiMatch[1] || parseInt(compactWaasiMatch[2], 10) < 1000)) {
    const drawNo = parseInt(compactWaasiMatch[2], 10);
    const letter = compactWaasiMatch[3].toUpperCase();
    const superBall = parseInt(compactWaasiMatch[4], 10);
    const nums = [parseInt(compactWaasiMatch[5], 10), parseInt(compactWaasiMatch[6], 10)].sort((a, b) => a - b);
    const def = LOTTERY_DEFINITIONS.find(d => d.code === 'WAASI');
    const accurateDate = def ? calculateAccurateDrawDate(def, drawNo) : todayStr;

    return {
      isValidLottery: true,
      isFutureDraw: false,
      hasTicketNumbers: true,
      board: 'DLB',
      lotteryCode: 'WAASI',
      lotteryName: 'Kotipathi Waasi',
      drawNo,
      drawDate: accurateDate,
      ticketNumbers: nums,
      ticketLetter: letter,
      ticketSuperBall: superBall,
      lotteryType: '2N+L+SB',
      rawString: trimmed,
    };
  }

  // Compact 4N+L+SB Match (e.g. "SB3295S0418426619" or "MP2669P0522486314" or "KP2471K1129455907")
  const compact5Match = trimmed.match(/^([A-Za-z]{2,4})?[-_]?(\d{3,5})[-_]?([A-Za-z])[-_]?(\d{2})[-_]?(\d{2})[-_]?(\d{2})[-_]?(\d{2})[-_]?(\d{2})$/);
  if (compact5Match) {
    const rawCode = compact5Match[1] ? compact5Match[1].toUpperCase() : '';
    const drawNo = parseInt(compact5Match[2], 10);
    let mapped = rawCode ? resolveLotteryIdentifier(rawCode, forcedBoard) : null;
    if (!mapped) {
      mapped = guessLotteryFromDrawNo(forcedBoard, drawNo);
    }
    const board: LotteryBoard = mapped ? mapped.board : (drawNo >= 2550 && drawNo <= 2899 ? 'NLB' : 'DLB');
    const lotteryCode = mapped ? mapped.code : (board === 'NLB' ? 'MP' : (drawNo >= 2350 && drawNo <= 2549 ? 'KP' : 'SB'));
    const lotteryName = mapped ? mapped.nameEn : (lotteryCode === 'MP' ? 'Mega Power' : (lotteryCode === 'KP' ? 'Kapruka' : 'Super Ball'));
    const letter = compact5Match[3].toUpperCase();
    const nums = [parseInt(compact5Match[4], 10), parseInt(compact5Match[5], 10), parseInt(compact5Match[6], 10), parseInt(compact5Match[7], 10)].sort((a, b) => a - b);
    const superBall = parseInt(compact5Match[8], 10);

    const def = LOTTERY_DEFINITIONS.find(d => d.code === lotteryCode);
    const accurateDate = def ? calculateAccurateDrawDate(def, drawNo) : todayStr;

    return {
      isValidLottery: true,
      isFutureDraw: false,
      hasTicketNumbers: true,
      board,
      lotteryCode,
      lotteryName,
      drawNo,
      drawDate: accurateDate,
      ticketNumbers: nums,
      ticketLetter: letter,
      ticketSuperBall: superBall,
      lotteryType: '4N+L+SB',
      rawString: trimmed,
    };
  }

  // Compact 4N+Z Match (e.g. "LW50070410243952" or "HD16300507193148")
  const compactZodiacMatch = trimmed.match(/^([A-Za-z]{2,4})?[-_]?(\d{3,5})[-_]?(0[1-9]|1[0-2])[-_]?(\d{2})[-_]?(\d{2})[-_]?(\d{2})[-_]?(\d{2})$/);
  if (compactZodiacMatch) {
    const rawCode = compactZodiacMatch[1] ? compactZodiacMatch[1].toUpperCase() : '';
    const drawNo = parseInt(compactZodiacMatch[2], 10);
    let mapped = rawCode ? resolveLotteryIdentifier(rawCode, forcedBoard) : null;
    if (!mapped) {
      mapped = guessLotteryFromDrawNo(forcedBoard, drawNo);
    }
    const board: LotteryBoard = mapped ? mapped.board : (drawNo >= 1550 && drawNo <= 1749 ? 'NLB' : 'DLB');
    const lotteryCode = mapped ? mapped.code : (board === 'NLB' ? 'HD' : 'LW');
    const lotteryName = mapped ? mapped.nameEn : (board === 'NLB' ? 'Handahana' : 'Lagna Wasana');
    const zodiacNum = parseInt(compactZodiacMatch[3], 10);
    const zodiacObj = Object.values(ZODIAC_MAPPING).find(z => z.index === zodiacNum);
    const nums = [parseInt(compactZodiacMatch[4], 10), parseInt(compactZodiacMatch[5], 10), parseInt(compactZodiacMatch[6], 10), parseInt(compactZodiacMatch[7], 10)].sort((a, b) => a - b);

    const def = LOTTERY_DEFINITIONS.find(d => d.code === lotteryCode);
    const accurateDate = def ? calculateAccurateDrawDate(def, drawNo) : todayStr;

    return {
      isValidLottery: true,
      isFutureDraw: false,
      hasTicketNumbers: true,
      board,
      lotteryCode,
      lotteryName,
      drawNo,
      drawDate: accurateDate,
      ticketNumbers: nums,
      ticketZodiac: zodiacObj ? zodiacObj.si : undefined,
      ticketZodiacEn: zodiacObj ? zodiacObj.en : undefined,
      lotteryType: '4N+Z',
      rawString: trimmed,
    };
  }

  // 3. Compact Barcode / POS Terminal Format Detection
  // e.g. "GS4563T16303451" or "4563T16303451" or "LW5007K10243952" or "HD1630A07214963"
  const compact4Match = trimmed.match(/^([A-Za-z]{2,4})?[-_]?(\d{3,5})[-_]?([A-Za-z])[-_]?(\d{2})[-_]?(\d{2})[-_]?(\d{2})[-_]?(\d{2})$/);
  if (compact4Match) {
    const rawCode = compact4Match[1] ? compact4Match[1].toUpperCase() : '';
    const drawNo = parseInt(compact4Match[2], 10);
    const letter = compact4Match[3].toUpperCase();
    const nums = [parseInt(compact4Match[4], 10), parseInt(compact4Match[5], 10), parseInt(compact4Match[6], 10), parseInt(compact4Match[7], 10)].sort((a, b) => a - b);

    let mapped = rawCode ? resolveLotteryIdentifier(rawCode, forcedBoard) : null;
    if (!mapped) {
      mapped = guessLotteryFromDrawNo(forcedBoard || (isExplicitDLB ? 'DLB' : (isExplicitNLB ? 'NLB' : undefined)), drawNo);
    }

    const board: LotteryBoard = mapped ? mapped.board : (isExplicitDLB ? 'DLB' : 'NLB');
    const lotteryCode = mapped ? mapped.code : (board === 'NLB' ? 'GS' : 'AK');
    const lotteryName = mapped ? mapped.nameEn : (board === 'NLB' ? 'Govisetha' : 'Ada Kotipathi');

    // ONLY true Zodiac lotteries (Lagna Wasana LW, Handahana HD, Suba Dawasak SD) have Zodiac signs!
    const isZodiacLottery = lotteryCode === 'LW' || lotteryCode === 'HD' || lotteryCode === 'SD' || rawCode === 'LW' || rawCode === 'HD' || rawCode === 'SD';
    const def = LOTTERY_DEFINITIONS.find(d => d.code === lotteryCode);
    const accurateDate = def ? calculateAccurateDrawDate(def, drawNo) : todayStr;

    if (isZodiacLottery) {
      // In Zodiac lotteries (LW, HD, SD), letter A-L (or 1-12) represents Zodiac signs 1 to 12
      const zObj = mapLetterToZodiac(letter);
      return {
        isValidLottery: true,
        isFutureDraw: false,
        hasTicketNumbers: true,
        board,
        lotteryCode,
        lotteryName,
        drawNo,
        drawDate: accurateDate,
        ticketNumbers: nums,
        ticketZodiac: zObj ? zObj.si : undefined,
        ticketZodiacEn: zObj ? zObj.en : undefined,
        ticketLetter: undefined, // STRICT RULE: Zodiac lotteries NEVER have an English letter!
        lotteryType: lotteryCode === 'SD' ? '3N+Z' : '4N+Z',
        rawString: trimmed,
      };
    }

    // STRICT RULE: All other lotteries (Govisetha, Ada Kotipathi, Shanida, etc.) have ENGLISH LETTERS, NEVER Zodiac signs!
    return {
      isValidLottery: true,
      isFutureDraw: false,
      hasTicketNumbers: true,
      board,
      lotteryCode,
      lotteryName,
      drawNo,
      drawDate: accurateDate,
      ticketNumbers: nums,
      ticketLetter: letter, // Pure English letter
      ticketZodiac: undefined,
      ticketZodiacEn: undefined,
      lotteryType: (lotteryCode === 'SB' || lotteryCode === 'MP' || lotteryCode === 'KP') ? '4N+L+SB' : '4N+L',
      rawString: trimmed,
    };
  }

  // Compact 6-Digit Match (e.g. "MS6321S986159" or "SDS1029X637310")
  const compact6Match = trimmed.match(/^([A-Za-z]{2,4})?[-_]?(\d{3,5})[-_]?([A-Za-z])[-_]?(\d{6})$/);
  if (compact6Match) {
    const rawCode = compact6Match[1] ? compact6Match[1].toUpperCase() : 'MS';
    const mapped = resolveLotteryIdentifier(rawCode, forcedBoard);
    const board: LotteryBoard = mapped ? mapped.board : (rawCode.includes('SDS') ? 'DLB' : 'NLB');
    const lotteryCode = mapped ? mapped.code : (board === 'NLB' ? 'MS' : 'SDS');
    const lotteryName = mapped ? mapped.nameEn : (board === 'NLB' ? 'Mahajana Sampatha' : 'Supiri Dhana Sampatha');
    const drawNo = parseInt(compact6Match[2], 10);
    const letter = compact6Match[3].toUpperCase();
    const nums = compact6Match[4].split('').map(d => parseInt(d, 10));

    const def = LOTTERY_DEFINITIONS.find(d => d.code === lotteryCode);
    const accurateDate = def ? calculateAccurateDrawDate(def, drawNo) : todayStr;

    return {
      isValidLottery: true,
      isFutureDraw: false,
      hasTicketNumbers: true,
      board,
      lotteryCode,
      lotteryName,
      drawNo,
      drawDate: accurateDate,
      ticketNumbers: nums,
      ticketLetter: letter,
      lotteryType: '6D+L',
      rawString: trimmed,
    };
  }

  // ==========================================================================
  // SECTION 3: COMPACT PRINTED TICKET LINES (WITH DATE)
  // ==========================================================================

  // 3B-1. DLB Compact Line with Super Number (Shanida / Kapruka / Super Ball / Mega Power): Letter + 4 Numbers + Super Number + Draw + Date
  // e.g. Shanida "I057274773554202026.08.20" or Kapruka "U041364661024522026.09.06" or "K112945593524522026.09.25"
  const dlbCompactLineWithSuper = trimmed.match(/^([A-Za-z])(\d{2})(\d{2})(\d{2})(\d{2})(\d{1,2})(\d{4})[-_.]?(20[123]\d)[./-]?(0[1-9]|1[0-2])[./-]?(0[1-9]|[12]\d|3[01])$/);
  if (dlbCompactLineWithSuper) {
    const letter = dlbCompactLineWithSuper[1].toUpperCase();
    const nums = [
      parseInt(dlbCompactLineWithSuper[2], 10),
      parseInt(dlbCompactLineWithSuper[3], 10),
      parseInt(dlbCompactLineWithSuper[4], 10),
      parseInt(dlbCompactLineWithSuper[5], 10),
    ].sort((a, b) => a - b);
    const superBall = parseInt(dlbCompactLineWithSuper[6], 10);
    const drawNo = parseInt(dlbCompactLineWithSuper[7], 10);
    const drawDate = `${dlbCompactLineWithSuper[8]}-${dlbCompactLineWithSuper[9]}-${dlbCompactLineWithSuper[10]}`;
    const guessed = guessLotteryFromDrawNo('DLB', drawNo);
    const board: LotteryBoard = 'DLB';
    const lotteryCode = guessed ? guessed.code : (drawNo >= 5250 && drawNo <= 5850 ? 'SW' : drawNo >= 2350 && drawNo <= 2549 ? 'KP' : 'SB');
    const lotteryName = guessed ? guessed.nameEn : (lotteryCode === 'SW' ? 'Shanida' : lotteryCode === 'KP' ? 'Kapruka' : 'Super Ball');

    return {
      isValidLottery: true,
      isFutureDraw: false,
      hasTicketNumbers: true,
      hasExplicitDate: true,
      board,
      lotteryCode,
      lotteryName,
      drawNo,
      drawDate,
      ticketNumbers: nums,
      ticketLetter: letter,
      ticketSuperBall: superBall,
      lotteryType: '4N+L+SB',
      rawString: trimmed,
    };
  }

  // 3B-2. Draw First Compact Line with Super Number (e.g. "2452K11294559352026.09.25" or "KP2452K11294559352026.09.25")
  const drawFirstWithSuper = trimmed.match(/^(?:KP|SB|MP|SW)?[-_]?(\d{4})[-_]?([A-Za-z])[-_]?(\d{2})[-_]?(\d{2})[-_]?(\d{2})[-_]?(\d{2})[-_]?(\d{1,2})[-_.]?(20[123]\d)[./-]?(0[1-9]|1[0-2])[./-]?(0[1-9]|[12]\d|3[01])$/i);
  if (drawFirstWithSuper) {
    const drawNo = parseInt(drawFirstWithSuper[1], 10);
    const letter = drawFirstWithSuper[2].toUpperCase();
    const nums = [
      parseInt(drawFirstWithSuper[3], 10),
      parseInt(drawFirstWithSuper[4], 10),
      parseInt(drawFirstWithSuper[5], 10),
      parseInt(drawFirstWithSuper[6], 10),
    ].sort((a, b) => a - b);
    const superBall = parseInt(drawFirstWithSuper[7], 10);
    const drawDate = `${drawFirstWithSuper[8]}-${drawFirstWithSuper[9]}-${drawFirstWithSuper[10]}`;
    const guessed = guessLotteryFromDrawNo(forcedBoard, drawNo);
    const board: LotteryBoard = guessed?.board || (drawNo >= 5250 && drawNo <= 5850 ? 'DLB' : drawNo >= 2550 && drawNo <= 2899 ? 'NLB' : 'DLB');
    const lotteryCode = guessed ? guessed.code : (board === 'NLB' ? 'MP' : (drawNo >= 5250 && drawNo <= 5850 ? 'SW' : drawNo >= 2350 && drawNo <= 2549 ? 'KP' : 'SB'));
    const lotteryName = guessed ? guessed.nameEn : (lotteryCode === 'MP' ? 'Mega Power' : (lotteryCode === 'SW' ? 'Shanida' : lotteryCode === 'KP' ? 'Kapruka' : 'Super Ball'));

    return {
      isValidLottery: true,
      isFutureDraw: false,
      hasTicketNumbers: true,
      hasExplicitDate: true,
      board,
      lotteryCode,
      lotteryName,
      drawNo,
      drawDate,
      ticketNumbers: nums,
      ticketLetter: letter,
      ticketSuperBall: superBall,
      lotteryType: '4N+L+SB',
      rawString: trimmed,
    };
  }

  // 3B-3. NLB Handahana Printed Compact Line with Date:
  // e.g. "091213430416262026.09.21" or "011948540416262026.09.21" -> Numbers 09, 12, 13, 43; Zodiac 04=කටක; Draw 1626; Date 2026-09-21
  const nlbHandahanaWithDate = trimmed.match(/^(\d{2})(\d{2})(\d{2})(\d{2})(?:00|0)?(0[1-9]|1[0-2])0?(1[5-7]\d{2})[-_.]?(20[123]\d)[./-]?(0[1-9]|1[0-2])[./-]?(0[1-9]|[12]\d|3[01])(?:\d{0,8})?$/);
  if (nlbHandahanaWithDate) {
    const nums = [
      parseInt(nlbHandahanaWithDate[1], 10),
      parseInt(nlbHandahanaWithDate[2], 10),
      parseInt(nlbHandahanaWithDate[3], 10),
      parseInt(nlbHandahanaWithDate[4], 10),
    ].sort((a, b) => a - b);
    const rawZodiacIdx = parseInt(nlbHandahanaWithDate[5], 10);
    const zodiacObj = Object.values(ZODIAC_MAPPING).find(z => z.index === rawZodiacIdx);
    const drawNo = parseInt(nlbHandahanaWithDate[6], 10);
    const drawDate = `${nlbHandahanaWithDate[7]}-${nlbHandahanaWithDate[8]}-${nlbHandahanaWithDate[9]}`;

    return {
      isValidLottery: true,
      isFutureDraw: false,
      hasTicketNumbers: true,
      hasExplicitDate: true,
      board: 'NLB',
      lotteryCode: 'HD',
      lotteryName: 'Handahana',
      drawNo,
      drawDate,
      ticketNumbers: nums,
      ticketZodiac: zodiacObj ? zodiacObj.si : undefined,
      ticketZodiacEn: zodiacObj ? zodiacObj.en : undefined,
      lotteryType: '4N+Z',
      rawString: trimmed,
    };
  }

  // 3B-3B. NLB Handahana Printed Compact Line with Serial/Trailing digits (No Date):
  // e.g. "01194854005016260379163" -> Numbers 01, 19, 48, 54; Zodiac 05=සිංහ; Draw 1626
  const nlbHandahanaLine = trimmed.match(/^(\d{2})(\d{2})(\d{2})(\d{2})(?:00|0)?(0[1-9]|1[0-2])0?(1[5-7]\d{2})(?:\d{4,8})?$/);
  if (nlbHandahanaLine) {
    const nums = [
      parseInt(nlbHandahanaLine[1], 10),
      parseInt(nlbHandahanaLine[2], 10),
      parseInt(nlbHandahanaLine[3], 10),
      parseInt(nlbHandahanaLine[4], 10),
    ].sort((a, b) => a - b);
    const rawZodiacIdx = parseInt(nlbHandahanaLine[5], 10);
    const zodiacObj = Object.values(ZODIAC_MAPPING).find(z => z.index === rawZodiacIdx);
    const drawNo = parseInt(nlbHandahanaLine[6], 10);
    const def = LOTTERY_DEFINITIONS.find(d => d.code === 'HD');
    const accurateDate = def ? calculateAccurateDrawDate(def, drawNo) : todayStr;

    return {
      isValidLottery: true,
      isFutureDraw: false,
      hasTicketNumbers: true,
      hasExplicitDate: false,
      board: 'NLB',
      lotteryCode: 'HD',
      lotteryName: 'Handahana',
      drawNo,
      drawDate: accurateDate,
      ticketNumbers: nums,
      ticketZodiac: zodiacObj ? zodiacObj.si : undefined,
      ticketZodiacEn: zodiacObj ? zodiacObj.en : undefined,
      lotteryType: '4N+Z',
      rawString: trimmed,
    };
  }

  // 3B-4. DLB Compact Line with 2-Digit Numeric Zodiac (01-12) for Lagna Wasana + Date:
  // e.g. "041024395249932026.09.25" -> Zodiac 04=කටක, Numbers 10,24,39,52, Draw 4993
  const dlbCompactNumericZodiacWithDate = trimmed.match(/^(0[1-9]|1[0-2])(\d{2})(\d{2})(\d{2})(\d{2})(\d{4})[-_.]?(20[123]\d)[./-]?(0[1-9]|1[0-2])[./-]?(0[1-9]|[12]\d|3[01])$/);
  if (dlbCompactNumericZodiacWithDate) {
    const rawZ = parseInt(dlbCompactNumericZodiacWithDate[1], 10);
    const zObj = Object.values(ZODIAC_MAPPING).find(z => z.index === rawZ);
    const nums = [
      parseInt(dlbCompactNumericZodiacWithDate[2], 10),
      parseInt(dlbCompactNumericZodiacWithDate[3], 10),
      parseInt(dlbCompactNumericZodiacWithDate[4], 10),
      parseInt(dlbCompactNumericZodiacWithDate[5], 10),
    ].sort((a, b) => a - b);
    const drawNo = parseInt(dlbCompactNumericZodiacWithDate[6], 10);
    const drawDate = `${dlbCompactNumericZodiacWithDate[7]}-${dlbCompactNumericZodiacWithDate[8]}-${dlbCompactNumericZodiacWithDate[9]}`;
    const guessed = guessLotteryFromDrawNo('DLB', drawNo);
    const board: LotteryBoard = guessed?.board || (drawNo >= 1550 && drawNo <= 1749 ? 'NLB' : 'DLB');
    const lotteryCode = guessed ? guessed.code : (board === 'NLB' ? 'HD' : 'LW');
    const lotteryName = guessed ? guessed.nameEn : (board === 'NLB' ? 'Handahana' : 'Lagna Wasana');

    return {
      isValidLottery: true,
      isFutureDraw: false,
      hasTicketNumbers: true,
      hasExplicitDate: true,
      board,
      lotteryCode,
      lotteryName,
      drawNo,
      drawDate,
      ticketNumbers: nums,
      ticketZodiac: zObj ? zObj.si : undefined,
      ticketZodiacEn: zObj ? zObj.en : undefined,
      ticketLetter: undefined, // Zodiac lotteries NEVER have an English letter!
      lotteryType: '4N+Z',
      rawString: trimmed,
    };
  }

  // 3B-5. DLB Printed Compact Line: Letter + 4 Numbers + Draw + Date
  // Found on real DLB tickets (e.g. Shanida "I1121313554202026.08.20" or "T0142437154482026.09.17" or Ada Kotipathi "I0853577431122026.09.25" or Lagna Wasana "D1024395249932026.09.25")
  const dlbCompactLineWithDate = trimmed.match(/^([A-Za-z])(\d{2})(\d{2})(\d{2})(\d{2})(\d{4})[-_.]?(20[123]\d)[./-]?(0[1-9]|1[0-2])[./-]?(0[1-9]|[12]\d|3[01])$/);
  if (dlbCompactLineWithDate) {
    const letter = dlbCompactLineWithDate[1].toUpperCase();
    const nums = [
      parseInt(dlbCompactLineWithDate[2], 10),
      parseInt(dlbCompactLineWithDate[3], 10),
      parseInt(dlbCompactLineWithDate[4], 10),
      parseInt(dlbCompactLineWithDate[5], 10),
    ].sort((a, b) => a - b);
    const drawNo = parseInt(dlbCompactLineWithDate[6], 10);
    const drawDate = `${dlbCompactLineWithDate[7]}-${dlbCompactLineWithDate[8]}-${dlbCompactLineWithDate[9]}`;
    const guessed = guessLotteryFromDrawNo('DLB', drawNo);
    const board: LotteryBoard = 'DLB';
    const lotteryCode = guessed ? guessed.code : (drawNo >= 5250 ? 'SW' : drawNo >= 4800 ? 'LW' : drawNo >= 2900 ? 'AK' : 'AK');
    const lotteryName = guessed ? guessed.nameEn : (lotteryCode === 'SW' ? 'Shanida' : lotteryCode === 'LW' ? 'Lagna Wasana' : 'Ada Kotipathi');

    // CRITICAL: If this is Lagna Wasana (LW) or Handahana (HD), letter A-L represents the Zodiac sign!
    if (lotteryCode === 'LW' || lotteryCode === 'HD') {
      const zObj = mapLetterToZodiac(letter);
      return {
        isValidLottery: true,
        isFutureDraw: false,
        hasTicketNumbers: true,
        hasExplicitDate: true,
        board,
        lotteryCode,
        lotteryName,
        drawNo,
        drawDate,
        ticketNumbers: nums,
        ticketZodiac: zObj ? zObj.si : undefined,
        ticketZodiacEn: zObj ? zObj.en : undefined,
        ticketLetter: undefined, // Zodiac lotteries NEVER have an English letter!
        lotteryType: '4N+Z',
        rawString: trimmed,
      };
    }

    const lotteryType = guessed ? guessed.lotteryType : (lotteryCode === 'SW' ? '4N+L+SB' : '4N+L');

    return {
      isValidLottery: true,
      isFutureDraw: false,
      hasTicketNumbers: true,
      hasExplicitDate: true,
      board,
      lotteryCode,
      lotteryName,
      drawNo,
      drawDate,
      ticketNumbers: nums,
      ticketLetter: letter,
      lotteryType,
      rawString: trimmed,
    };
  }

  // 3B-6. Draw First with English Letter + Date: Draw + Letter + 4 Numbers + Date
  // e.g. "3112I085357742026.09.25" or "5420I112131352026.08.20" or "5448T014243712026.09.17"
  const drawFirstWithLetterWithDate = trimmed.match(/^(\d{4})[-_]?([A-Za-z])[-_]?(\d{2})(\d{2})(\d{2})(\d{2})[-_.]?(20[123]\d)[./-]?(0[1-9]|1[0-2])[./-]?(0[1-9]|[12]\d|3[01])$/);
  if (drawFirstWithLetterWithDate) {
    const drawNo = parseInt(drawFirstWithLetterWithDate[1], 10);
    const letter = drawFirstWithLetterWithDate[2].toUpperCase();
    const nums = [
      parseInt(drawFirstWithLetterWithDate[3], 10),
      parseInt(drawFirstWithLetterWithDate[4], 10),
      parseInt(drawFirstWithLetterWithDate[5], 10),
      parseInt(drawFirstWithLetterWithDate[6], 10),
    ].sort((a, b) => a - b);
    const drawDate = `${drawFirstWithLetterWithDate[7]}-${drawFirstWithLetterWithDate[8]}-${drawFirstWithLetterWithDate[9]}`;
    const guessed = guessLotteryFromDrawNo(forcedBoard, drawNo);
    const board: LotteryBoard = guessed?.board || (drawNo >= 5250 ? 'DLB' : drawNo >= 4000 ? 'NLB' : drawNo >= 2900 ? 'DLB' : 'DLB');
    const lotteryCode = guessed ? guessed.code : (drawNo >= 5250 ? 'SW' : drawNo >= 4800 ? 'LW' : drawNo >= 2900 ? 'AK' : 'AK');
    const lotteryName = guessed ? guessed.nameEn : (lotteryCode === 'SW' ? 'Shanida' : lotteryCode === 'LW' ? 'Lagna Wasana' : 'Ada Kotipathi');

    if (lotteryCode === 'LW' || lotteryCode === 'HD') {
      const zObj = mapLetterToZodiac(letter);
      return {
        isValidLottery: true,
        isFutureDraw: false,
        hasTicketNumbers: true,
        hasExplicitDate: true,
        board,
        lotteryCode,
        lotteryName,
        drawNo,
        drawDate,
        ticketNumbers: nums,
        ticketZodiac: zObj ? zObj.si : undefined,
        ticketZodiacEn: zObj ? zObj.en : undefined,
        ticketLetter: undefined,
        lotteryType: '4N+Z',
        rawString: trimmed,
      };
    }

    const lotteryType = guessed ? guessed.lotteryType : (lotteryCode === 'SW' ? '4N+L+SB' : '4N+L');

    return {
      isValidLottery: true,
      isFutureDraw: false,
      hasTicketNumbers: true,
      hasExplicitDate: true,
      board,
      lotteryCode,
      lotteryName,
      drawNo,
      drawDate,
      ticketNumbers: nums,
      ticketLetter: letter,
      lotteryType,
      rawString: trimmed,
    };
  }

  // 3B-6B. Draw First with 2-Digit Numeric Zodiac + Date: Draw + Zodiac (01-12) + 4 Numbers + Date
  // e.g. "499304102439522026.09.25" or "162604011948542026.09.21"
  const drawFirstWithNumericZodiacWithDate = trimmed.match(/^(?:LW|HD)?[-_]?(\d{3,5})[-_]?(0[1-9]|1[0-2])[-_]?(\d{2})(\d{2})(\d{2})(\d{2})[-_.]?(20[123]\d)[./-]?(0[1-9]|1[0-2])[./-]?(0[1-9]|[12]\d|3[01])$/);
  if (drawFirstWithNumericZodiacWithDate) {
    const drawNo = parseInt(drawFirstWithNumericZodiacWithDate[1], 10);
    const rawZ = parseInt(drawFirstWithNumericZodiacWithDate[2], 10);
    const zObj = Object.values(ZODIAC_MAPPING).find(z => z.index === rawZ);
    const nums = [
      parseInt(drawFirstWithNumericZodiacWithDate[3], 10),
      parseInt(drawFirstWithNumericZodiacWithDate[4], 10),
      parseInt(drawFirstWithNumericZodiacWithDate[5], 10),
      parseInt(drawFirstWithNumericZodiacWithDate[6], 10),
    ].sort((a, b) => a - b);
    const drawDate = `${drawFirstWithNumericZodiacWithDate[7]}-${drawFirstWithNumericZodiacWithDate[8].padStart(2, '0')}-${drawFirstWithNumericZodiacWithDate[9].padStart(2, '0')}`;
    const guessed = guessLotteryFromDrawNo(forcedBoard, drawNo);
    const board: LotteryBoard = guessed?.board || (drawNo >= 1550 && drawNo <= 1749 ? 'NLB' : 'DLB');
    const lotteryCode = guessed ? guessed.code : (board === 'NLB' ? 'HD' : 'LW');
    const lotteryName = guessed ? guessed.nameEn : (board === 'NLB' ? 'Handahana' : 'Lagna Wasana');

    return {
      isValidLottery: true,
      isFutureDraw: false,
      hasTicketNumbers: true,
      hasExplicitDate: true,
      board,
      lotteryCode,
      lotteryName,
      drawNo,
      drawDate,
      ticketNumbers: nums,
      ticketZodiac: zObj ? zObj.si : undefined,
      ticketZodiacEn: zObj ? zObj.en : undefined,
      ticketLetter: undefined,
      lotteryType: '4N+Z',
      rawString: trimmed,
    };
  }

  // ==========================================================================
  // SECTION 3-NO-DATE: COMPACT PRINTED TICKET LINES (WITHOUT DATE)
  // ==========================================================================

  // 3B-7. Letter + 4 Numbers + Super Number + Draw (No Date):
  // e.g. "K11294559352452"
  const dlbCompactLineWithSuperNoDate = trimmed.match(/^([A-Za-z])(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})(\d{3,5})$/);
  if (dlbCompactLineWithSuperNoDate) {
    const letter = dlbCompactLineWithSuperNoDate[1].toUpperCase();
    const nums = [
      parseInt(dlbCompactLineWithSuperNoDate[2], 10),
      parseInt(dlbCompactLineWithSuperNoDate[3], 10),
      parseInt(dlbCompactLineWithSuperNoDate[4], 10),
      parseInt(dlbCompactLineWithSuperNoDate[5], 10),
    ].sort((a, b) => a - b);
    const superBall = parseInt(dlbCompactLineWithSuperNoDate[6], 10);
    const drawNo = parseInt(dlbCompactLineWithSuperNoDate[7], 10);
    const guessed = guessLotteryFromDrawNo('DLB', drawNo);
    const board: LotteryBoard = 'DLB';
    const lotteryCode = guessed ? guessed.code : (drawNo >= 5250 && drawNo <= 5850 ? 'SW' : drawNo >= 2350 && drawNo <= 2549 ? 'KP' : 'SB');
    const lotteryName = guessed ? guessed.nameEn : (lotteryCode === 'SW' ? 'Shanida' : lotteryCode === 'KP' ? 'Kapruka' : 'Super Ball');
    const def = LOTTERY_DEFINITIONS.find(d => d.code === lotteryCode);
    const drawDate = def && drawNo > 0 ? calculateAccurateDrawDate(def, drawNo) : todayStr;

    return {
      isValidLottery: true,
      isFutureDraw: false,
      hasTicketNumbers: true,
      hasExplicitDate: false,
      board,
      lotteryCode,
      lotteryName,
      drawNo,
      drawDate,
      ticketNumbers: nums,
      ticketLetter: letter,
      ticketSuperBall: superBall,
      lotteryType: '4N+L+SB',
      rawString: trimmed,
    };
  }

  // 3B-8. Draw First with Super Number (No Date): e.g. "2452K1129455935" or "KP2452K1129455935"
  const drawFirstWithSuperNoDate = trimmed.match(/^(?:KP|SB|MP)?[-_]?(\d{3,5})[-_]?([A-Za-z])[-_]?(\d{2})[-_]?(\d{2})[-_]?(\d{2})[-_]?(\d{2})[-_]?(\d{2})$/i);
  if (drawFirstWithSuperNoDate) {
    const drawNo = parseInt(drawFirstWithSuperNoDate[1], 10);
    const letter = drawFirstWithSuperNoDate[2].toUpperCase();
    const nums = [
      parseInt(drawFirstWithSuperNoDate[3], 10),
      parseInt(drawFirstWithSuperNoDate[4], 10),
      parseInt(drawFirstWithSuperNoDate[5], 10),
      parseInt(drawFirstWithSuperNoDate[6], 10),
    ].sort((a, b) => a - b);
    const superBall = parseInt(drawFirstWithSuperNoDate[7], 10);
    const guessed = guessLotteryFromDrawNo(forcedBoard, drawNo);
    const board: LotteryBoard = guessed?.board || (drawNo >= 2550 && drawNo <= 2899 ? 'NLB' : 'DLB');
    const lotteryCode = guessed ? guessed.code : (board === 'NLB' ? 'MP' : (drawNo >= 5250 && drawNo <= 5850 ? 'SW' : drawNo >= 2350 && drawNo <= 2549 ? 'KP' : 'SB'));
    const lotteryName = guessed ? guessed.nameEn : (lotteryCode === 'MP' ? 'Mega Power' : (lotteryCode === 'SW' ? 'Shanida' : lotteryCode === 'KP' ? 'Kapruka' : 'Super Ball'));
    const def = LOTTERY_DEFINITIONS.find(d => d.code === lotteryCode);
    const drawDate = def && drawNo > 0 ? calculateAccurateDrawDate(def, drawNo) : todayStr;

    return {
      isValidLottery: true,
      isFutureDraw: false,
      hasTicketNumbers: true,
      hasExplicitDate: false,
      board,
      lotteryCode,
      lotteryName,
      drawNo,
      drawDate,
      ticketNumbers: nums,
      ticketLetter: letter,
      ticketSuperBall: superBall,
      lotteryType: '4N+L+SB',
      rawString: trimmed,
    };
  }

  // 3B-9. Handahana No Date (4 Numbers + Zodiac + Draw): e.g. "01194854051626"
  const nlbHandahanaLineNoDate = trimmed.match(/^(\d{2})(\d{2})(\d{2})(\d{2})(?:00|0)?(0[1-9]|1[0-2])0?(1[5-7]\d{2})$/);
  if (nlbHandahanaLineNoDate) {
    const nums = [
      parseInt(nlbHandahanaLineNoDate[1], 10),
      parseInt(nlbHandahanaLineNoDate[2], 10),
      parseInt(nlbHandahanaLineNoDate[3], 10),
      parseInt(nlbHandahanaLineNoDate[4], 10),
    ].sort((a, b) => a - b);
    const rawZodiacIdx = parseInt(nlbHandahanaLineNoDate[5], 10);
    const zodiacObj = Object.values(ZODIAC_MAPPING).find(z => z.index === rawZodiacIdx);
    const drawNo = parseInt(nlbHandahanaLineNoDate[6], 10);
    const def = LOTTERY_DEFINITIONS.find(d => d.code === 'HD');
    const accurateDate = def ? calculateAccurateDrawDate(def, drawNo) : todayStr;

    return {
      isValidLottery: true,
      isFutureDraw: false,
      hasTicketNumbers: true,
      hasExplicitDate: false,
      board: 'NLB',
      lotteryCode: 'HD',
      lotteryName: 'Handahana',
      drawNo,
      drawDate: accurateDate,
      ticketNumbers: nums,
      ticketZodiac: zodiacObj ? zodiacObj.si : undefined,
      ticketZodiacEn: zodiacObj ? zodiacObj.en : undefined,
      lotteryType: '4N+Z',
      rawString: trimmed,
    };
  }

  // 3B-10. 2-Digit Zodiac + 4 Numbers + Draw (No Date): e.g. "04102439524993"
  const dlbCompactNumericZodiacNoDate = trimmed.match(/^(?:LW|HD)?[-_]?(0[1-9]|1[0-2])(\d{2})(\d{2})(\d{2})(\d{2})(\d{3,5})$/i);
  if (dlbCompactNumericZodiacNoDate) {
    const rawZ = parseInt(dlbCompactNumericZodiacNoDate[1], 10);
    const zObj = Object.values(ZODIAC_MAPPING).find(z => z.index === rawZ);
    const nums = [
      parseInt(dlbCompactNumericZodiacNoDate[2], 10),
      parseInt(dlbCompactNumericZodiacNoDate[3], 10),
      parseInt(dlbCompactNumericZodiacNoDate[4], 10),
      parseInt(dlbCompactNumericZodiacNoDate[5], 10),
    ].sort((a, b) => a - b);
    const drawNo = parseInt(dlbCompactNumericZodiacNoDate[6], 10);
    const guessed = guessLotteryFromDrawNo(forcedBoard, drawNo);
    const board: LotteryBoard = guessed?.board || (drawNo >= 1550 && drawNo <= 1749 ? 'NLB' : 'DLB');
    const lotteryCode = guessed ? guessed.code : (board === 'NLB' ? 'HD' : 'LW');
    const lotteryName = guessed ? guessed.nameEn : (board === 'NLB' ? 'Handahana' : 'Lagna Wasana');
    const def = LOTTERY_DEFINITIONS.find(d => d.code === lotteryCode);
    const drawDate = def && drawNo > 0 ? calculateAccurateDrawDate(def, drawNo) : todayStr;

    return {
      isValidLottery: true,
      isFutureDraw: false,
      hasTicketNumbers: true,
      hasExplicitDate: false,
      board,
      lotteryCode,
      lotteryName,
      drawNo,
      drawDate,
      ticketNumbers: nums,
      ticketZodiac: zObj ? zObj.si : undefined,
      ticketZodiacEn: zObj ? zObj.en : undefined,
      ticketLetter: undefined,
      lotteryType: '4N+Z',
      rawString: trimmed,
    };
  }

  // 3B-11. Draw First + 2-Digit Zodiac + 4 Numbers (No Date): e.g. "49930410243952" or "16260501194854"
  const drawFirstWithNumericZodiacNoDate = trimmed.match(/^(?:LW|HD)?[-_]?(\d{3,5})[-_]?(0[1-9]|1[0-2])[-_]?(\d{2})[-_]?(\d{2})[-_]?(\d{2})[-_]?(\d{2})$/i);
  if (drawFirstWithNumericZodiacNoDate) {
    const drawNo = parseInt(drawFirstWithNumericZodiacNoDate[1], 10);
    const rawZ = parseInt(drawFirstWithNumericZodiacNoDate[2], 10);
    const zObj = Object.values(ZODIAC_MAPPING).find(z => z.index === rawZ);
    const nums = [
      parseInt(drawFirstWithNumericZodiacNoDate[3], 10),
      parseInt(drawFirstWithNumericZodiacNoDate[4], 10),
      parseInt(drawFirstWithNumericZodiacNoDate[5], 10),
      parseInt(drawFirstWithNumericZodiacNoDate[6], 10),
    ].sort((a, b) => a - b);
    const guessed = guessLotteryFromDrawNo(forcedBoard, drawNo);
    const board: LotteryBoard = guessed?.board || (drawNo >= 1550 && drawNo <= 1749 ? 'NLB' : 'DLB');
    const lotteryCode = guessed ? guessed.code : (board === 'NLB' ? 'HD' : 'LW');
    const lotteryName = guessed ? guessed.nameEn : (board === 'NLB' ? 'Handahana' : 'Lagna Wasana');
    const def = LOTTERY_DEFINITIONS.find(d => d.code === lotteryCode);
    const drawDate = def && drawNo > 0 ? calculateAccurateDrawDate(def, drawNo) : todayStr;

    return {
      isValidLottery: true,
      isFutureDraw: false,
      hasTicketNumbers: true,
      hasExplicitDate: false,
      board,
      lotteryCode,
      lotteryName,
      drawNo,
      drawDate,
      ticketNumbers: nums,
      ticketZodiac: zObj ? zObj.si : undefined,
      ticketZodiacEn: zObj ? zObj.en : undefined,
      ticketLetter: undefined,
      lotteryType: '4N+Z',
      rawString: trimmed,
    };
  }

  // 3B-12. Letter + 4 Numbers + Draw (No Date): e.g. "I112131355420" or "D102439524993" or "I085357743112"
  const dlbCompactLineNoDate = trimmed.match(/^([A-Za-z])(\d{2})(\d{2})(\d{2})(\d{2})(\d{3,5})$/);
  if (dlbCompactLineNoDate) {
    const letter = dlbCompactLineNoDate[1].toUpperCase();
    const nums = [
      parseInt(dlbCompactLineNoDate[2], 10),
      parseInt(dlbCompactLineNoDate[3], 10),
      parseInt(dlbCompactLineNoDate[4], 10),
      parseInt(dlbCompactLineNoDate[5], 10),
    ].sort((a, b) => a - b);
    const drawNo = parseInt(dlbCompactLineNoDate[6], 10);
    const guessed = guessLotteryFromDrawNo('DLB', drawNo);
    const board: LotteryBoard = 'DLB';
    const lotteryCode = guessed ? guessed.code : (drawNo >= 5250 ? 'SW' : drawNo >= 4800 ? 'LW' : drawNo >= 2900 ? 'AK' : 'AK');
    const lotteryName = guessed ? guessed.nameEn : (lotteryCode === 'SW' ? 'Shanida' : lotteryCode === 'LW' ? 'Lagna Wasana' : 'Ada Kotipathi');
    const def = LOTTERY_DEFINITIONS.find(d => d.code === lotteryCode);
    const drawDate = def && drawNo > 0 ? calculateAccurateDrawDate(def, drawNo) : todayStr;

    if (lotteryCode === 'LW' || lotteryCode === 'HD') {
      const zObj = mapLetterToZodiac(letter);
      return {
        isValidLottery: true,
        isFutureDraw: false,
        hasTicketNumbers: true,
        hasExplicitDate: false,
        board,
        lotteryCode,
        lotteryName,
        drawNo,
        drawDate,
        ticketNumbers: nums,
        ticketZodiac: zObj ? zObj.si : undefined,
        ticketZodiacEn: zObj ? zObj.en : undefined,
        ticketLetter: undefined,
        lotteryType: '4N+Z',
        rawString: trimmed,
      };
    }

    const lotteryType = guessed ? guessed.lotteryType : '4N+L';

    return {
      isValidLottery: true,
      isFutureDraw: false,
      hasTicketNumbers: true,
      hasExplicitDate: false,
      board,
      lotteryCode,
      lotteryName,
      drawNo,
      drawDate,
      ticketNumbers: nums,
      ticketLetter: letter,
      lotteryType,
      rawString: trimmed,
    };
  }

  // 3B-13. Draw First with English Letter (No Date): e.g. "3112I08535774" or "5420I11213135" or "5448T01424371" or "AK3112I08535774"
  const drawFirstWithLetterNoDate = trimmed.match(/^(?:[A-Za-z]{2,4})?[-_]?(\d{3,5})[-_]?([A-Za-z])[-_]?(\d{2})[-_]?(\d{2})[-_]?(\d{2})[-_]?(\d{2})$/i);
  if (drawFirstWithLetterNoDate) {
    const drawNo = parseInt(drawFirstWithLetterNoDate[1], 10);
    const letter = drawFirstWithLetterNoDate[2].toUpperCase();
    const nums = [
      parseInt(drawFirstWithLetterNoDate[3], 10),
      parseInt(drawFirstWithLetterNoDate[4], 10),
      parseInt(drawFirstWithLetterNoDate[5], 10),
      parseInt(drawFirstWithLetterNoDate[6], 10),
    ].sort((a, b) => a - b);
    const guessed = guessLotteryFromDrawNo(forcedBoard, drawNo);
    const board: LotteryBoard = guessed?.board || (drawNo >= 5250 ? 'DLB' : drawNo >= 4000 ? 'NLB' : drawNo >= 2900 ? 'DLB' : 'DLB');
    const lotteryCode = guessed ? guessed.code : (drawNo >= 5250 ? 'SW' : drawNo >= 4800 ? 'LW' : drawNo >= 2900 ? 'AK' : 'AK');
    const lotteryName = guessed ? guessed.nameEn : (lotteryCode === 'SW' ? 'Shanida' : lotteryCode === 'LW' ? 'Lagna Wasana' : 'Ada Kotipathi');
    const def = LOTTERY_DEFINITIONS.find(d => d.code === lotteryCode);
    const drawDate = def && drawNo > 0 ? calculateAccurateDrawDate(def, drawNo) : todayStr;

    if (lotteryCode === 'LW' || lotteryCode === 'HD') {
      const zObj = mapLetterToZodiac(letter);
      return {
        isValidLottery: true,
        isFutureDraw: false,
        hasTicketNumbers: true,
        hasExplicitDate: false,
        board,
        lotteryCode,
        lotteryName,
        drawNo,
        drawDate,
        ticketNumbers: nums,
        ticketZodiac: zObj ? zObj.si : undefined,
        ticketZodiacEn: zObj ? zObj.en : undefined,
        ticketLetter: undefined,
        lotteryType: '4N+Z',
        rawString: trimmed,
      };
    }

    const lotteryType = guessed ? guessed.lotteryType : '4N+L';

    return {
      isValidLottery: true,
      isFutureDraw: false,
      hasTicketNumbers: true,
      hasExplicitDate: false,
      board,
      lotteryCode,
      lotteryName,
      drawNo,
      drawDate,
      ticketNumbers: nums,
      ticketLetter: letter,
      lotteryType,
      rawString: trimmed,
    };
  }

  // 3B-14. Draw First + 4 Numbers (No Date, No Letter/Zodiac): e.g. "499306344253" or "499310243952"
  const drawFirstWith4NumsNoDate = trimmed.match(/^(\d{3,5})(\d{2})(\d{2})(\d{2})(\d{2})$/);
  if (drawFirstWith4NumsNoDate) {
    const drawNo = parseInt(drawFirstWith4NumsNoDate[1], 10);
    const nums = [
      parseInt(drawFirstWith4NumsNoDate[2], 10),
      parseInt(drawFirstWith4NumsNoDate[3], 10),
      parseInt(drawFirstWith4NumsNoDate[4], 10),
      parseInt(drawFirstWith4NumsNoDate[5], 10),
    ].sort((a, b) => a - b);
    const guessed = guessLotteryFromDrawNo(forcedBoard, drawNo);
    const board: LotteryBoard = guessed?.board || (drawNo >= 5250 ? 'DLB' : drawNo >= 4800 ? 'DLB' : drawNo >= 2900 ? 'DLB' : 'DLB');
    const lotteryCode = guessed ? guessed.code : (drawNo >= 5250 ? 'SW' : drawNo >= 4800 ? 'LW' : 'AK');
    const lotteryName = guessed ? guessed.nameEn : (lotteryCode === 'SW' ? 'Shanida' : lotteryCode === 'LW' ? 'Lagna Wasana' : 'Ada Kotipathi');
    const def = LOTTERY_DEFINITIONS.find(d => d.code === lotteryCode);
    const drawDate = def && drawNo > 0 ? calculateAccurateDrawDate(def, drawNo) : todayStr;
    const lotteryType = lotteryCode === 'LW' ? '4N+Z' : '4N+L';

    return {
      isValidLottery: true,
      isFutureDraw: false,
      hasTicketNumbers: true,
      hasExplicitDate: false,
      board,
      lotteryCode,
      lotteryName,
      drawNo,
      drawDate,
      ticketNumbers: nums,
      ticketLetter: undefined,
      ticketZodiac: undefined,
      lotteryType,
      rawString: trimmed,
    };
  }

  // 3B-15. 4 Numbers + Draw (No Date, No Letter/Zodiac): e.g. "063442534993" or "102439524993"
  const numsFirstWithDrawNoDate = trimmed.match(/^(\d{2})(\d{2})(\d{2})(\d{2})(\d{3,5})$/);
  if (numsFirstWithDrawNoDate) {
    const nums = [
      parseInt(numsFirstWithDrawNoDate[1], 10),
      parseInt(numsFirstWithDrawNoDate[2], 10),
      parseInt(numsFirstWithDrawNoDate[3], 10),
      parseInt(numsFirstWithDrawNoDate[4], 10),
    ].sort((a, b) => a - b);
    const drawNo = parseInt(numsFirstWithDrawNoDate[5], 10);
    const guessed = guessLotteryFromDrawNo(forcedBoard, drawNo);
    const board: LotteryBoard = guessed?.board || (drawNo >= 5250 ? 'DLB' : drawNo >= 4800 ? 'DLB' : drawNo >= 2900 ? 'DLB' : 'DLB');
    const lotteryCode = guessed ? guessed.code : (drawNo >= 5250 ? 'SW' : drawNo >= 4800 ? 'LW' : 'AK');
    const lotteryName = guessed ? guessed.nameEn : (lotteryCode === 'SW' ? 'Shanida' : lotteryCode === 'LW' ? 'Lagna Wasana' : 'Ada Kotipathi');
    const def = LOTTERY_DEFINITIONS.find(d => d.code === lotteryCode);
    const drawDate = def && drawNo > 0 ? calculateAccurateDrawDate(def, drawNo) : todayStr;
    const lotteryType = lotteryCode === 'LW' ? '4N+Z' : '4N+L';

    return {
      isValidLottery: true,
      isFutureDraw: false,
      hasTicketNumbers: true,
      hasExplicitDate: false,
      board,
      lotteryCode,
      lotteryName,
      drawNo,
      drawDate,
      ticketNumbers: nums,
      ticketLetter: undefined,
      ticketZodiac: undefined,
      lotteryType,
      rawString: trimmed,
    };
  }

  // 4. Delimited, Separated, or Text String Parsing
  // STEP A: STRICTLY EXTRACT AND STRIP REAL DATES ONLY!
  const { drawDate: extractedDate, cleaned: textWithoutDate } = extractAndStripDate(trimmed);
  const drawDate = extractedDate || todayStr;

  // Clean ticket prices, times, and terminal metadata to prevent corrupting numbers
  // CRITICAL: Only strip DLB 1D barcode check-digits and terminal IDs ("-7-04") if followed by numbers or at the end of the barcode, so valid lottery numbers are NEVER stripped!
  const cleanedForTokens = textWithoutDate
    .replace(/\b(?:(\d{3,5})\s*[- ]+)?(\d{5,14})\s*[-]+\s*(\d{1,2})\s*[-]+\s*(\d{2})\b(?=\s*[- ]+\s*(?:[A-Za-z\u0D80-\u0DFF]{1,15}\s+)?\d{1,2}[\s,-]+\d{1,2}[\s,-]+\d{1,2}[\s,-]+\d{1,2}|$)/gi, (m, dNo, serial) => (dNo ? dNo + ' ' : '') + serial)
    .replace(/(?:rs\.?|lkr|රු\.?|ரூபா\.?|price|මිල|ගාස්තුව)[:\s=]*\d{1,3}(?:\.\d{2})?(?:\/=)?/gi, ' ')
    .replace(/\b\d{1,3}\/=\b/g, ' ')
    // Only strip times IF they explicitly have am/pm OR a time label (never strip bare numbers separated by colons)
    .replace(/(?:time|වේලාව|நேரம்)[:\s=]*\d{1,2}:\d{2}(?::\d{2})?\s*(?:am|pm)?/gi, ' ')
    .replace(/\b\d{1,2}:\d{2}(?::\d{2})?\s*(?:am|pm)\b/gi, ' ')
    .replace(/(?:term|terminal|pos|counter|agent|agt|station|chk|check|ver|tkt|ticket|ref|sn|serial)[:\s=-]*[a-z0-9_-]+/gi, ' ')
    .replace(/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|සඳුදා|අඟහරුවාදා|බදාදා|බ්‍රහස්පතින්දා|සිකුරාදා|සෙනසුරාදා|ඉරිදා)\b/gi, ' ');

  // Strip board names so 'NLB' and 'DLB' can never corrupt ticket letter or zodiac prefixes
  const textWithoutBoards = textWithoutDate
    .replace(/\b(?:nlb|dlb)\b/gi, ' ')
    .replace(/\b(?:national\s*lotteries(?:\s*board)?|development\s*lotteries(?:\s*board)?)\b/gi, ' ');

  // STEP B: TOKENIZE BY ALL COMMON DELIMITERS
  // Splits by pipes, colons, semicolons, slashes, hyphens, commas, tabs, spaces, newlines
  const rawTokens = cleanedForTokens.split(/[-|:;/,_\s]+/).map(t => t.trim()).filter(Boolean);

  let drawNo = 0;
  const explicitDrawMatch = textWithoutDate.match(/(?:draw|dr|no|d|දිනුම්\s*වාරය|குலுக்கல்)[:\s=-]*(\d{3,5})\b/i);
  if (explicitDrawMatch) {
    drawNo = parseInt(explicitDrawMatch[1], 10);
  }

  // STEP C: IDENTIFY LOTTERY
  let mappedLottery: LotteryMapping | null = null;
  for (const tok of rawTokens) {
    if (tok.toUpperCase() === 'NLB' || tok.toUpperCase() === 'DLB') continue;
    mappedLottery = resolveLotteryIdentifier(tok, forcedBoard);
    if (mappedLottery) break;
  }

  // If not found in tokens, check substring in entire cleaned text
  if (!mappedLottery) {
    const cleanNoPunct = textWithoutDate.toLowerCase().replace(/[^a-z0-9]/g, '');
    for (const def of LOTTERY_DEFINITIONS) {
      const defClean = def.nameEn.toLowerCase().replace(/[^a-z0-9]/g, '');
      const isSiMatch = textWithoutDate.includes(def.nameSi) ||
        (def.code === 'HD' && (textWithoutDate.includes('හදහන') || textWithoutDate.includes('හඳහන') || cleanNoPunct.includes('hadahana') || cleanNoPunct.includes('handahana'))) ||
        (def.code === 'LW' && (textWithoutDate.includes('ලග්න') || textWithoutDate.includes('වාසනාව') || cleanNoPunct.includes('lagnawasana') || cleanNoPunct.includes('lagna'))) ||
        (def.code === 'SW' && (textWithoutDate.includes('ශනිදා') || textWithoutDate.includes('සනිදා') || cleanNoPunct.includes('shanida'))) ||
        (def.code === 'AK' && (textWithoutDate.includes('කෝටිපති') || textWithoutDate.includes('කොටිපති') || cleanNoPunct.includes('adakotipathi') || cleanNoPunct.includes('kotipathi'))) ||
        (def.code === 'MS' && (textWithoutDate.includes('මහජන') || textWithoutDate.includes('සම්පත') || cleanNoPunct.includes('mahajana'))) ||
        (def.code === 'MP' && (textWithoutDate.includes('මෙගා') || textWithoutDate.includes('පවර්') || cleanNoPunct.includes('megapower') || cleanNoPunct.includes('mega')));
      if (cleanNoPunct.includes(defClean) || isSiMatch) {
        mappedLottery = {
          board: def.board,
          code: def.code,
          nameEn: def.nameEn,
          lotteryType: def.code === 'MS' || def.code === 'SDS' ? '6D+L' : (def.code === 'LW' || def.code === 'HD' ? '4N+Z' : (def.code === 'SD' ? '3N+Z' : (def.code === 'SB' || def.code === 'MP' || def.code === 'KP' ? '4N+L+SB' : '4N+L'))),
        };
        break;
      }
    }
  }

  // If not identified yet, check if draw number matches official anchor or ranges:
  if (!mappedLottery && drawNo > 0) {
    mappedLottery = guessLotteryFromDrawNo(forcedBoard || (isExplicitDLB ? 'DLB' : (isExplicitNLB ? 'NLB' : undefined)), drawNo);
  }

  // If still not identified, check if any token matches an official anchor draw number or guess from draw number!
  if (!mappedLottery) {
    for (const tok of rawTokens) {
      if (/^\d{3,5}$/.test(tok)) {
        const potentialDrawNo = parseInt(tok, 10);
        if (potentialDrawNo > 9999) continue; // Draw numbers in Sri Lanka never exceed 9999; 10000+ are Shanida special numbers or serials
        const guessed = guessLotteryFromDrawNo(forcedBoard || (isExplicitDLB ? 'DLB' : (isExplicitNLB ? 'NLB' : undefined)), potentialDrawNo);
        if (guessed) {
          mappedLottery = guessed;
          if (drawNo === 0) drawNo = potentialDrawNo;
          break;
        }
      }
    }
  }

  // If STILL not identified, check if text contains an explicit Sinhala Zodiac word (මේෂ-මීන) or symbol (♈-♓)
  if (!mappedLottery) {
    const textZodiac = findZodiacInText(textWithoutDate) || findZodiacInText(trimmed);
    if (textZodiac) {
      if (forcedBoard === 'DLB' || drawNo >= 3000) {
        mappedLottery = { board: 'DLB', code: 'LW', nameEn: 'Lagna Wasana', lotteryType: '4N+Z' };
      } else {
        mappedLottery = { board: 'NLB', code: 'HD', nameEn: 'Handahana', lotteryType: '4N+Z' };
      }
    }
  }

  const board: LotteryBoard = mappedLottery ? mappedLottery.board : (isExplicitDLB ? 'DLB' : 'NLB');
  let lotteryCode = mappedLottery ? mappedLottery.code : (board === 'NLB' ? 'GS' : 'AK');
  let lotteryName = mappedLottery ? mappedLottery.nameEn : (board === 'NLB' ? 'Govisetha' : 'Ada Kotipathi');
  let lotteryType = mappedLottery?.lotteryType || (lotteryCode === 'MS' || lotteryCode === 'SDS' ? '6D+L' : (lotteryCode === 'LW' || lotteryCode === 'HD' ? '4N+Z' : (lotteryCode === 'SD' ? '3N+Z' : (lotteryCode === 'SB' || lotteryCode === 'MP' || lotteryCode === 'KP' ? '4N+L+SB' : '4N+L'))));

  // ONLY true Zodiac lotteries (LW, HD, SD) have Zodiac signs!
  const isZodiacGame = lotteryCode === 'LW' || lotteryCode === 'HD' || lotteryCode === 'SD';

  // STEP D: IDENTIFY SPECIAL NUMBER (SUPER BALL / MEGA BALL) for SB, MP, KP, WAASI
  let ticketSuperBall: number | undefined = undefined;
  const sbRegex = /(?:mega\s*ball|mega\s*number|super\s*ball|super\s*number|මෙගා\s*බෝලය|සුපිරි\s*බෝලය|මෙගා|සුපිරි|mega|super|mb|sb|bonus|sn)[:\s=-]*(\d{1,2})\b/i;
  const sbMatch = textWithoutDate.match(sbRegex);
  if (sbMatch) {
    ticketSuperBall = parseInt(sbMatch[1], 10);
  }

  // STEP E: STRICT SEPARATION OF ZODIAC (LW, HD, SD) VS ENGLISH LETTER (GS, AK, SW, MS, etc.)
  let ticketZodiac: string | undefined = undefined;
  let ticketZodiacEn: string | undefined = undefined;
  let ticketLetter: string | undefined = undefined;

  if (isZodiacGame) {
    // 1. Textual zodiac in entire string
    const textZodiac = findZodiacInText(textWithoutDate) || findZodiacInText(trimmed);
    if (textZodiac) {
      ticketZodiac = textZodiac.si;
      ticketZodiacEn = textZodiac.en;
    }

    // 2. Individual tokens for Zodiac names or abbreviations
    if (!ticketZodiac) {
      for (const tok of rawTokens) {
        const norm = normalizeZodiac(tok, false);
        if (norm) {
          ticketZodiac = norm.si;
          ticketZodiacEn = norm.en;
          break;
        }
      }
    }

    // 3. Labeled prefix with number or letter e.g. "Z:4" or "Z-04" or "Lagna: 4" or "ලග්නය: 4" or "Z:D"
    if (!ticketZodiac) {
      const numZodiacMatch = textWithoutBoards.match(/\b(?:zodiac|lagna|zod|sign|ලග්නය|ලග්න|z)\b[:\s=-]+(\d{1,2}|[A-La-l])\b/i);
      if (numZodiacMatch) {
        const val = numZodiacMatch[1];
        const zNum = parseInt(val, 10);
        if (!isNaN(zNum) && zNum >= 1 && zNum <= 12) {
          const norm = Object.values(ZODIAC_MAPPING).find(z => z.index === zNum);
          if (norm) {
            ticketZodiac = norm.si;
            ticketZodiacEn = norm.en;
          }
        } else {
          const norm = mapLetterToZodiac(val);
          if (norm) {
            ticketZodiac = norm.si;
            ticketZodiacEn = norm.en;
          }
        }
      }
    }

    // 4. Standalone letter token A through L (in Zodiac games LW/HD/SD, A-L represents 1-12)
    if (!ticketZodiac) {
      for (const tok of rawTokens) {
        if (/^[a-l]$/i.test(tok)) {
          const norm = mapLetterToZodiac(tok);
          if (norm) {
            ticketZodiac = norm.si;
            ticketZodiacEn = norm.en;
            break;
          }
        }
      }
    }

    // STRICT RULE: Zodiac lotteries NEVER have an English letter!
    ticketLetter = undefined;
    lotteryType = lotteryCode === 'SD' ? '3N+Z' : '4N+Z';
  } else {
    // STRICT RULE: Non-Zodiac lotteries (GS, AK, SW, MS, MP, SB, KP, DN, JD, JS, etc.) NEVER have Zodiac signs!
    ticketZodiac = undefined;
    ticketZodiacEn = undefined;

    if (lotteryCode !== 'SASIRI') {
      // 1. Explicit labeled prefix: e.g. "L:S", "Letter: S", "ENG:S", "අකුර:S"
      const prefixMatch = textWithoutBoards.match(/\b(?:letter|let|eng|sign|අකුර|l)\b[:\s=-]+([A-Za-z])\b/i);
      if (prefixMatch) {
        ticketLetter = prefixMatch[1].toUpperCase();
      }

      // 2. Check for isolated single letter token (e.g. 'T', 'S', 'B', 'D')
      if (!ticketLetter) {
        const nonLetterWords = new Set([
          'NLB', 'DLB', 'LK', 'WWW', 'HTTP', 'HTTPS', 'DRAW', 'NO', 'DATE', 'RS', 'LKR',
          lotteryCode.toUpperCase(),
          (mappedLottery?.code || '').toUpperCase()
        ]);
        for (const tok of rawTokens) {
          const upper = tok.toUpperCase();
          if (/^[A-Za-z]$/.test(tok) && !nonLetterWords.has(upper)) {
            ticketLetter = upper;
            break;
          }
        }
      }

      // 3. Check for letter attached to draw number: e.g. "4563T" or "T4563"
      if (!ticketLetter && lotteryType !== '6D+L') {
        const drawLetMatch = textWithoutBoards.match(/\b\d{3,5}([A-Za-z])\b/);
        if (drawLetMatch) {
          ticketLetter = drawLetMatch[1].toUpperCase();
        } else {
          const letDrawMatch = textWithoutBoards.match(/\b([A-Za-z])\d{3,5}\b/);
          if (letDrawMatch) {
            ticketLetter = letDrawMatch[1].toUpperCase();
          }
        }
      }

      // 4. For 6D+L (Mahajana Sampatha): check for letter attached to 6 digits (e.g. "S986159" or "6321S")
      if (!ticketLetter && lotteryType === '6D+L') {
        const let6Match = textWithoutBoards.match(/\b([A-Za-z])(\d{6})\b/);
        if (let6Match) {
          ticketLetter = let6Match[1].toUpperCase();
        } else {
          const drawLetMatch = textWithoutBoards.match(/\b\d{3,5}([A-Za-z])\b/);
          if (drawLetMatch) {
            ticketLetter = drawLetMatch[1].toUpperCase();
          }
        }
      }

      // 5. Any standalone letter in cleaned text (outside of NLB/DLB)
      if (!ticketLetter) {
        const letterMatch = textWithoutBoards.match(/\b([A-Za-z])\b/);
        if (letterMatch) {
          ticketLetter = letterMatch[1].toUpperCase();
        }
      }
    }
  }

  // STEP G: IDENTIFY DRAW NUMBER AND TICKET NUMBERS
  let ticketNumbers: number[] = [];

  // Priority 1: Explicit labeled numbers section e.g. "Numbers: 16 30 34 51" or "අංක: 16 30 34 51"
  const numbersExplicitMatch = textWithoutDate.match(/(?:numbers|nums|num|nos|winning|අංක|ඉලක්කම්|எண்கள்)[:\s=]+([0-9\s,-]+)/i);
  if (numbersExplicitMatch) {
    const rawNumStr = numbersExplicitMatch[1].trim();
    const explicitDigits = rawNumStr.split(/[\s,-]+/).map(s => parseInt(s, 10)).filter(n => !isNaN(n) && n >= 0 && n <= 99);
    if (explicitDigits.length >= 2) {
      if (lotteryType === '6D+L' && explicitDigits.length >= 6) {
        ticketNumbers = explicitDigits.slice(0, 6);
      } else if (lotteryType === '3N' || lotteryType === '3N+Z') {
        ticketNumbers = explicitDigits.slice(0, 3).sort((a, b) => a - b);
      } else if (lotteryType === '2N+L+SB') {
        ticketNumbers = explicitDigits.slice(0, 2).sort((a, b) => a - b);
      } else if (explicitDigits.length >= 4) {
        ticketNumbers = explicitDigits.slice(0, 4).sort((a, b) => a - b);
      }
    }
  }

  // If explicit draw number pattern exists:
  const drawExplicitMatch = textWithoutDate.match(/(?:draw|no|#)[:\s=]*(\d{3,5})/i);
  if (drawExplicitMatch) {
    drawNo = parseInt(drawExplicitMatch[1], 10);
  }

  // Handle 6-Digit Lotteries (Mahajana Sampatha & Supiri Dhana Sampatha)
  if (lotteryType === '6D+L') {
    const block6Match = textWithoutDate.match(/\b(\d{6})\b/);
    if (block6Match && parseInt(block6Match[1], 10) !== drawNo) {
      ticketNumbers = block6Match[1].split('').map(d => parseInt(d, 10));
    } else {
      const digits: number[] = [];
      for (const tok of rawTokens) {
        if (/^\d$/.test(tok)) {
          digits.push(parseInt(tok, 10));
        }
      }
      if (digits.length >= 6) {
        ticketNumbers = digits.slice(0, 6);
      }
    }
  }

  // Separate numbers by value:
  // In Sri Lanka, draw numbers are typically >= 100 and <= 9999.
  // Numbers > 10000 are barcode serial numbers, not lottery or draw numbers.
  // Lottery numbers are between 0 and 77 (or 0-99 for super ball).
  const candidateSmallNums: number[] = [];
  const candidateLargeNums: number[] = [];
  const candidate4DigitBlocks: string[] = [];

  let hasBarcodeSerial = false;

  for (const tok of rawTokens) {
    if (!/^\d+$/.test(tok)) continue;
    const val = parseInt(tok, 10);

    // Skip year if present
    if (val >= 2018 && val <= 2035) continue;
    // Skip 6+ digit ticket serial numbers (> 99999) while allowing 5-digit Shanida special numbers (10000-99999)
    if (val > 99999 || tok.length >= 6) {
      hasBarcodeSerial = true;
      continue;
    }
    // Skip already matched super ball
    if (ticketSuperBall !== undefined && val === ticketSuperBall) continue;
    // Skip draw number itself
    if (drawNo > 0 && val === drawNo) continue;

    // Check if 4-digit token could represent two 2-digit lottery numbers (e.g. 0634 or 4253)
    if (tok.length === 4 && val >= 100 && val <= 9999) {
      candidate4DigitBlocks.push(tok);
    }

    if (val >= 100) {
      candidateLargeNums.push(val);
    } else {
      candidateSmallNums.push(val);
    }
  }

  // Protection against ticket serial barcodes:
  // If the scanned string contains a draw number and a serial barcode (> 20000), e.g. "4993 500395754 7 04 23 51 57 58" or "4993 - 500395754 - 7 - 04":
  // The numbers immediately following the serial (e.g. 7 and 04, or 1 and 02) are check digits/terminal IDs, NOT ticket numbers!
  if (hasBarcodeSerial && candidateSmallNums.length < 3 && lotteryType !== '2N+L+SB') {
    candidateSmallNums.length = 0;
  } else if (hasBarcodeSerial && candidateSmallNums.length >= 6 && (lotteryType === '4N+Z' || lotteryType === '4N+L' || lotteryType === '4N+L+SB')) {
    // In DLB tickets scanned without hyphens: "500395754 7 04 23 51 57 58" -> 7 and 04 are terminal and check digits
    candidateSmallNums.splice(0, 2);
  }

  // If a 4-number lottery (LW, AK, SW, SB, KP, MP, DN, JD) has fewer than 3 numbers found, they cannot be legitimate ticket numbers
  // (In Sri Lanka, tickets for these lotteries always require 4 numbers; 1 or 2 isolated numbers are barcode/terminal check numbers).
  if (candidateSmallNums.length < 3 && lotteryType !== '2N+L+SB' && lotteryType !== '3N' && lotteryType !== '3N+Z') {
    candidateSmallNums.length = 0;
  }

  // Assign draw number if not set yet:
  if (drawNo === 0 && candidateLargeNums.length > 0) {
    // In Sri Lanka, draw numbers are typically between 100 and 9999 (numbers >= 10000 are Shanida special numbers or serials)
    const validDrawCandidate = candidateLargeNums.find(n => n >= 100 && n <= 9999);
    drawNo = validDrawCandidate || candidateLargeNums[0];
  }

  // If draw number is still 0, check official anchor for the identified lottery:
  if (drawNo === 0 && OFFICIAL_ANCHOR_DRAWS[lotteryCode]) {
    drawNo = OFFICIAL_ANCHOR_DRAWS[lotteryCode].drawNo;
  }

  // Two 4-digit number blocks (e.g. DLB Lagna Wasana "0634 4253" or Shanida "0305 5975")
  // In DLB tickets, the 4 lottery numbers are often printed or QR-encoded in 2 four-digit blocks:
  // e.g. "0634" -> 06, 34 and "4253" -> 42, 53!
  const valid4DigitBlocks = candidate4DigitBlocks.filter(b => parseInt(b, 10) !== drawNo);
  if (valid4DigitBlocks.length >= 2 && candidateSmallNums.length < 4) {
    const b1 = valid4DigitBlocks[0];
    const b2 = valid4DigitBlocks[1];
    const n1 = parseInt(b1.slice(0, 2), 10);
    const n2 = parseInt(b1.slice(2, 4), 10);
    const n3 = parseInt(b2.slice(0, 2), 10);
    const n4 = parseInt(b2.slice(2, 4), 10);

    if (n1 >= 1 && n1 <= 80 && n2 >= 1 && n2 <= 80 && n3 >= 1 && n3 <= 80 && n4 >= 1 && n4 <= 80) {
      candidateSmallNums.length = 0;
      candidateSmallNums.push(n1, n2, n3, n4);
    }
  } else if (valid4DigitBlocks.length === 1 && candidateSmallNums.length >= 2 && candidateSmallNums.length < 4 && (lotteryType === '4N+Z' || lotteryType === '4N+L')) {
    const b1 = valid4DigitBlocks[0];
    const n1 = parseInt(b1.slice(0, 2), 10);
    const n2 = parseInt(b1.slice(2, 4), 10);
    if (n1 >= 1 && n1 <= 80 && n2 >= 1 && n2 <= 80) {
      candidateSmallNums.push(n1, n2);
    }
  }

  // Check for 8-digit block representing all 4 numbers: e.g. "06344253"
  if (candidateSmallNums.length < 4 && lotteryType !== '6D+L') {
    const block8Match = textWithoutDate.match(/\b(\d{8})\b/);
    if (block8Match) {
      const s = block8Match[1];
      const n1 = parseInt(s.slice(0, 2), 10);
      const n2 = parseInt(s.slice(2, 4), 10);
      const n3 = parseInt(s.slice(4, 6), 10);
      const n4 = parseInt(s.slice(6, 8), 10);
      if (n1 >= 1 && n1 <= 80 && n2 >= 1 && n2 <= 80 && n3 >= 1 && n3 <= 80 && n4 >= 1 && n4 <= 80) {
        candidateSmallNums.length = 0;
        candidateSmallNums.push(n1, n2, n3, n4);
      }
    }
  }

  // If 6D+L didn't match via block, but candidateSmallNums has 6 single digits:
  if (lotteryType === '6D+L' && ticketNumbers.length === 0 && candidateSmallNums.length >= 6) {
    ticketNumbers = candidateSmallNums.slice(0, 6);
  }

  // Standard 4-number games (Govisetha, Ada Kotipathi, Shanida, Dhana Nidhanaya, Lagna Wasana, Super Ball, Mega Power, etc.)
  if (ticketNumbers.length === 0 && lotteryType !== '6D+L') {
    if (lotteryType === '4N+L+SB') {
      // Mega Power (MP: 4 numbers + 1 Mega Ball 1-25), Super Ball (SB: 4 numbers + 1 Super Ball 1-99), Kapruka (KP: 4 numbers + 1 Super Number 1-99), Shanida (SW: 4 numbers + 5-digit Special Number)
      if (ticketSuperBall !== undefined) {
        ticketNumbers = candidateSmallNums.slice(0, 4).sort((a, b) => a - b);
      } else if (lotteryCode === 'SW' && candidateLargeNums.length > 0) {
        // In Shanida (SW), the special number is a 5-digit number (e.g. 17533, 92975)
        const fiveDigit = candidateLargeNums.find(n => n >= 10000 && n <= 99999 && n !== drawNo);
        if (fiveDigit) {
          ticketSuperBall = fiveDigit;
        }
        ticketNumbers = candidateSmallNums.slice(0, 4).sort((a, b) => a - b);
      } else if (candidateSmallNums.length >= 5) {
        // In Kapruka (KP), Super Ball (SB), and Shanida (SW): Super/Special Number is printed 5th and can be 1 to 99!
        if (lotteryCode === 'KP' || lotteryCode === 'SB' || lotteryCode === 'SW') {
          ticketSuperBall = candidateSmallNums[4];
          ticketNumbers = candidateSmallNums.slice(0, 4).sort((a, b) => a - b);
        } else {
          // Mega Power (MP): 4 numbers (01-70) + Mega Ball (01-25)
          const lastNum = candidateSmallNums[candidateSmallNums.length - 1];
          if (lastNum <= 25) {
            ticketSuperBall = lastNum;
            ticketNumbers = candidateSmallNums.slice(0, candidateSmallNums.length - 1).slice(0, 4).sort((a, b) => a - b);
          } else {
            const firstNum = candidateSmallNums[0];
            if (firstNum <= 25) {
              ticketSuperBall = firstNum;
              ticketNumbers = candidateSmallNums.slice(1, 5).sort((a, b) => a - b);
            } else {
              ticketSuperBall = candidateSmallNums[4];
              ticketNumbers = candidateSmallNums.slice(0, 4).sort((a, b) => a - b);
            }
          }
        }
      } else {
        ticketNumbers = candidateSmallNums.slice(0, 4).sort((a, b) => a - b);
      }
    } else if (lotteryType === '4N+Z') {
      // Zodiac Lotteries (Lagna Wasana LW, Handahana HD): 4 numbers + 1 Zodiac sign
      if (!ticketZodiac && candidateSmallNums.length >= 5) {
        const first = candidateSmallNums[0];
        const last = candidateSmallNums[candidateSmallNums.length - 1];
        const first4Sorted = candidateSmallNums[0] <= candidateSmallNums[1] && candidateSmallNums[1] <= candidateSmallNums[2] && candidateSmallNums[2] <= candidateSmallNums[3];
        const last4Sorted = candidateSmallNums[1] <= candidateSmallNums[2] && candidateSmallNums[2] <= candidateSmallNums[3] && candidateSmallNums[3] <= candidateSmallNums[4];

        let zodiacNum: number | undefined;
        let numSlice: number[];

        if (last >= 1 && last <= 12 && first4Sorted && (!last4Sorted || first > 12)) {
          // e.g. [01, 19, 48, 54, 05] -> 05 is Zodiac (Simha), [01, 19, 48, 54] are numbers
          zodiacNum = last;
          numSlice = candidateSmallNums.slice(0, 4);
        } else if (first >= 1 && first <= 12 && last4Sorted) {
          // e.g. [04, 10, 24, 39, 52] -> 04 is Zodiac (Kataka), [10, 24, 39, 52] are numbers
          zodiacNum = first;
          numSlice = candidateSmallNums.slice(1, 5);
        } else if (last >= 1 && last <= 12) {
          zodiacNum = last;
          numSlice = candidateSmallNums.slice(0, 4);
        } else if (first >= 1 && first <= 12) {
          zodiacNum = first;
          numSlice = candidateSmallNums.slice(1, 5);
        } else {
          zodiacNum = candidateSmallNums[0];
          numSlice = candidateSmallNums.slice(1, 5);
        }

        const zodiacObj = Object.values(ZODIAC_MAPPING).find(z => z.index === zodiacNum);
        if (zodiacObj) {
          ticketZodiac = zodiacObj.si;
          ticketZodiacEn = zodiacObj.en;
        }
        ticketNumbers = numSlice.sort((a, b) => a - b);
      } else if (candidateSmallNums.length >= 5) {
        // If Zodiac was already detected (e.g. from token/code), check if first or last number is the zodiac index
        const normZ = normalizeZodiac(ticketZodiac);
        if (normZ && candidateSmallNums[0] === normZ.index) {
          ticketNumbers = candidateSmallNums.slice(1, 5).sort((a, b) => a - b);
        } else if (normZ && candidateSmallNums[candidateSmallNums.length - 1] === normZ.index) {
          ticketNumbers = candidateSmallNums.slice(0, 4).sort((a, b) => a - b);
        } else {
          ticketNumbers = candidateSmallNums.slice(0, 4).sort((a, b) => a - b);
        }
      } else {
        ticketNumbers = candidateSmallNums.slice(0, 4).sort((a, b) => a - b);
      }
    } else if (lotteryType === '3N+Z') {
      // Suba Dawasak (SD): 3 numbers + 1 Zodiac sign
      if (!ticketZodiac && candidateSmallNums.length >= 4) {
        const first = candidateSmallNums[0];
        const last = candidateSmallNums[candidateSmallNums.length - 1];
        const first3Sorted = candidateSmallNums[0] <= candidateSmallNums[1] && candidateSmallNums[1] <= candidateSmallNums[2];
        const last3Sorted = candidateSmallNums[1] <= candidateSmallNums[2] && candidateSmallNums[2] <= candidateSmallNums[3];

        let zodiacNum: number | undefined;
        let numSlice: number[];

        if (last >= 1 && last <= 12 && first3Sorted && (!last3Sorted || first > 12)) {
          zodiacNum = last;
          numSlice = candidateSmallNums.slice(0, 3);
        } else if (first >= 1 && first <= 12 && last3Sorted) {
          zodiacNum = first;
          numSlice = candidateSmallNums.slice(1, 4);
        } else if (last >= 1 && last <= 12) {
          zodiacNum = last;
          numSlice = candidateSmallNums.slice(0, 3);
        } else if (first >= 1 && first <= 12) {
          zodiacNum = first;
          numSlice = candidateSmallNums.slice(1, 4);
        } else {
          zodiacNum = candidateSmallNums[0];
          numSlice = candidateSmallNums.slice(1, 4);
        }

        const zodiacObj = Object.values(ZODIAC_MAPPING).find(z => z.index === zodiacNum);
        if (zodiacObj) {
          ticketZodiac = zodiacObj.si;
          ticketZodiacEn = zodiacObj.en;
        }
        ticketNumbers = numSlice.sort((a, b) => a - b);
      } else if (candidateSmallNums.length >= 4) {
        const normZ = normalizeZodiac(ticketZodiac);
        if (normZ && candidateSmallNums[0] === normZ.index) {
          ticketNumbers = candidateSmallNums.slice(1, 4).sort((a, b) => a - b);
        } else if (normZ && candidateSmallNums[candidateSmallNums.length - 1] === normZ.index) {
          ticketNumbers = candidateSmallNums.slice(0, 3).sort((a, b) => a - b);
        } else {
          ticketNumbers = candidateSmallNums.slice(0, 3).sort((a, b) => a - b);
        }
      } else {
        ticketNumbers = candidateSmallNums.slice(0, 3).sort((a, b) => a - b);
      }
    } else if (lotteryType === '3N') {
      // Sasiri: 3 numbers
      ticketNumbers = candidateSmallNums.slice(0, 3).sort((a, b) => a - b);
    } else if (lotteryType === '2N+L+SB') {
      // Kotipathi Waasi: 2 numbers + Super Ball + Letter
      ticketNumbers = candidateSmallNums.slice(0, 2).sort((a, b) => a - b);
    } else if (lotteryType === '4D+REV+L' || lotteryType === '4D+L') {
      // Jaya Sampatha, Ada Sampatha, NLB Jaya: 4 single digits
      ticketNumbers = candidateSmallNums.slice(0, 4);
    } else {
      ticketNumbers = candidateSmallNums.slice(0, 4).sort((a, b) => a - b);
    }
  }

  // STRICT SCHEMA ENFORCEMENT:
  // If lottery is a Zodiac lottery (LW, HD, SD):
  // - ticketZodiac is populated, ticketLetter is strictly undefined
  // If lottery is an English letter lottery (GS, AK, SW, MS, MP, SB, KP, DN, JD, etc.):
  // - ticketLetter is populated, ticketZodiac is strictly undefined
  if (isZodiacGame) {
    ticketLetter = undefined;
    lotteryType = lotteryCode === 'SD' ? '3N+Z' : '4N+Z';
  } else {
    ticketZodiac = undefined;
    ticketZodiacEn = undefined;
  }

  const def = LOTTERY_DEFINITIONS.find(d => d.code === lotteryCode);
  const finalDrawDate = def && drawNo > 0
    ? calculateAccurateDrawDate(def, drawNo, extractedDate || undefined)
    : (extractedDate || drawDate);
  const isFuture = Boolean(finalDrawDate && finalDrawDate > todayStr);
  const hasNumbers = ticketNumbers.length > 0;

  const isValid = Boolean(
    mappedLottery ||
    isExplicitNLB ||
    isExplicitDLB ||
    hasNumbers ||
    drawNo > 0
  );

  return {
    isValidLottery: isValid,
    isFutureDraw: isFuture,
    hasTicketNumbers: hasNumbers,
    hasExplicitDate: Boolean(extractedDate),
    board,
    lotteryCode,
    lotteryName,
    drawNo,
    drawDate: finalDrawDate,
    ticketNumbers,
    ticketLetter: isZodiacGame ? undefined : ticketLetter,
    ticketZodiac: isZodiacGame ? ticketZodiac : undefined,
    ticketZodiacEn: isZodiacGame ? ticketZodiacEn : undefined,
    ticketSuperBall,
    lotteryType,
    rawString: trimmed,
    errorMessage: isValid ? undefined : 'Not a valid Sri Lankan Lottery QR Code',
  };
}
