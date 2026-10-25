export type Language = 'si' | 'en' | 'ta';

export type LotteryBoard = 'DLB' | 'NLB';

export type LotteryType = '4N+L' | '4N+Z' | '4N+L+SB' | '6D+L' | '3N' | '3N+Z' | '4D+L' | '4D+REV+L' | '2N+L+SB';

export interface PrizeCategory {
  id: string;
  categoryNameEn: string;
  categoryNameSi: string;
  categoryNameTa: string;
  matchRule: string; // e.g. "4 Numbers + Letter", "4 Numbers", "3 Numbers + Letter", "Letter Only"
  prizeAmount: number; // e.g. 50000000 or 100
  isJackpot?: boolean;
}

export interface LotteryDefinition {
  id: string;
  code: string;
  board: LotteryBoard;
  nameEn: string;
  nameSi: string;
  nameTa: string;
  ticketPrice: number;
  drawDays: string[];
  numbersCount: number; // e.g. 4
  numberRangeMax: number; // e.g. 70 or 80 or 99
  hasLetter: boolean;
  hasZodiac: boolean;
  hasSuperBall: boolean;
  colorScheme: {
    primary: string;
    secondary: string;
    accent: string;
  };
  samplePrizes: PrizeCategory[];
}

export interface LotteryResult {
  id: string;
  lotteryId: string;
  lotteryCode: string;
  lotteryName: string;
  board: LotteryBoard;
  drawNo: number;
  drawDate: string; // YYYY-MM-DD
  numbers: number[];
  letter?: string;
  zodiac?: string;
  superBall?: number;
  jackpotAmount: number;
  prizes: PrizeCategory[];
  isOfficial: boolean;
  createdAt: string;
}

export interface TicketMatchResult {
  isValidLottery: boolean;
  isFutureDraw: boolean;
  hasDrawResult: boolean;
  hasTicketNumbers?: boolean;
  lotteryCode?: string;
  lotteryName: string;
  board: LotteryBoard;
  drawNo: number;
  drawDate: string;
  ticketNumbers: number[];
  ticketLetter?: string;
  ticketZodiac?: string;
  ticketZodiacEn?: string;
  ticketSuperBall?: number;
  matchedNumbers: number[];
  matchedIndices?: number[];
  trailingMatches?: number;
  matchedLetter: boolean;
  matchedZodiac: boolean;
  matchedSuperBall: boolean;
  isWon: boolean;
  totalPrize: number;
  prizeCategory?: string;
  messageSi: string;
  messageEn: string;
  messageTa: string;
  drawResult?: LotteryResult;
  officialNumbers?: number[];
  officialLetter?: string;
  officialZodiac?: string;
  officialZodiacEn?: string;
  officialSuperBall?: number;
  officialDrawNo?: number;
  officialDrawDate?: string;
  officialSource?: string;
  rawString?: string;
  lotteryType?: LotteryType;
  isSequential?: boolean;
}

export interface ScanRecord {
  id: string;
  userId?: string;
  userEmail?: string;
  userName?: string;
  timestamp: string;
  lotteryName: string;
  board: LotteryBoard;
  lotteryCode?: string;
  drawNo: number;
  drawDate: string;
  ticketNumbers: number[];
  ticketLetter?: string;
  ticketZodiac?: string;
  ticketSuperBall?: number;
  lotteryType?: LotteryType;
  won: boolean;
  prizeAmount: number;
  prizeCategory?: string;
  scanMethod: 'qr' | 'ai' | 'manual';
  rawCode?: string;
}

export interface UserAccount {
  id: string;
  email: string;
  name: string;
  picture?: string;
  role: 'user' | 'admin';
  createdAt: string;
  lastLogin: string;
  scanCount: number;
  totalWon: number;
}

export interface LuckyGuessInput {
  firstName: string;
  lastName: string;
  dateOfBirth: string; // YYYY-MM-DD
  birthTime?: string; // HH:MM
  selectedLotteryId: string;
}

export interface LuckyGuessResult {
  lifePathNumber: number;
  destinyNumber: number;
  soulUrgeNumber: number;
  birthdayNumber: number;
  lagnaNameEn: string;
  lagnaNameSi: string;
  lagnaNameTa: string;
  rulingPlanet: string;
  rulingPlanetSi: string;
  luckyNumbers: number[];
  luckyLetter: string;
  luckyZodiac: string;
  luckySuperBall?: number;
  auspiciousDays: string[];
  auspiciousColor: string;
  numerologyInsight: string;
  patternAnalysis: string;
  confidenceScore: number;
}

export interface KeyStatus {
  keyIndex: number;
  keyId: string;
  isActive: boolean;
  callsCount: number;
  failsCount?: number;
  lastUsedAt?: string;
  cooldownUntil?: string;
  status: 'READY' | 'COOLDOWN' | 'EXHAUSTED' | 'UNCONFIGURED';
}
