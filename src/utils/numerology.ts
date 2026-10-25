import { LOTTERY_DEFINITIONS, SRI_LANKA_LOTTERY_LETTERS, SRI_LANKA_ZODIAC_SIGNS } from '../data/lotteries';
import { LuckyGuessInput, LuckyGuessResult } from '../types';

// Chaldean letter values
const CHALDEAN_MAP: Record<string, number> = {
  A: 1, I: 1, J: 1, Q: 1, Y: 1,
  B: 2, K: 2, R: 2,
  C: 3, G: 3, L: 3, S: 3,
  D: 4, M: 4, T: 4,
  E: 5, H: 5, N: 5, X: 5,
  U: 6, V: 6, W: 6,
  O: 7, Z: 7,
  F: 8, P: 8,
};

// Auspicious letters associated with Vedic Lagna
const LAGNA_LETTERS: Record<number, string[]> = {
  0: ['A', 'L', 'I'], // Mesha (Aries)
  1: ['B', 'V', 'U'], // Vrishabha (Taurus)
  2: ['K', 'G', 'C'], // Mithuna (Gemini)
  3: ['D', 'H', 'N'], // Kataka (Cancer)
  4: ['M', 'T', 'E'], // Simha (Leo)
  5: ['P', 'T', 'S'], // Kanya (Virgo)
  6: ['R', 'T', 'K'], // Thula (Libra)
  7: ['N', 'Y', 'O'], // Vrischika (Scorpio)
  8: ['B', 'D', 'P'], // Dhanu (Sagittarius)
  9: ['B', 'J', 'K'], // Makara (Capricorn)
  10: ['G', 'S', 'R'], // Kumbha (Aquarius)
  11: ['D', 'C', 'Z'], // Meena (Pisces)
};

const PLANET_INFO = [
  { en: 'Mars (Kuja)', si: 'කුජ (අඟහරු)', color: 'Crimson Red', days: ['Tuesday'] },
  { en: 'Venus (Shukra)', si: 'ශුක්‍ර (සිකුරු)', color: 'Silvery White', days: ['Friday'] },
  { en: 'Mercury (Budha)', si: 'බුධ (බුද)', color: 'Emerald Green', days: ['Wednesday'] },
  { en: 'Moon (Chandra)', si: 'චන්ද්‍ර (සඳු)', color: 'Pearl White', days: ['Monday'] },
  { en: 'Sun (Surya)', si: 'සූර්ය (ඉරි)', color: 'Golden Yellow', days: ['Sunday'] },
  { en: 'Mercury (Budha)', si: 'බුධ (බුද)', color: 'Olive Green', days: ['Wednesday'] },
  { en: 'Venus (Shukra)', si: 'ශුක්‍ර (සිකුරු)', color: 'Diamond Rose', days: ['Friday'] },
  { en: 'Mars (Kuja)', si: 'කුජ (අඟහරු)', color: 'Deep Scarlet', days: ['Tuesday'] },
  { en: 'Jupiter (Guru)', si: 'ගුරු (බ්‍රහස්පති)', color: 'Saffron Gold', days: ['Thursday'] },
  { en: 'Saturn (Shani)', si: 'ශනි (සෙනසුරු)', color: 'Royal Blue', days: ['Saturday'] },
  { en: 'Saturn (Shani)', si: 'ශනි (සෙනසුරු)', color: 'Midnight Indigo', days: ['Saturday'] },
  { en: 'Jupiter (Guru)', si: 'ගුරු (බ්‍රහස්පති)', color: 'Amber Yellow', days: ['Thursday'] },
];

function reduceToSingleDigit(num: number, preserveMaster = false): number {
  if (preserveMaster && (num === 11 || num === 22 || num === 33)) return num;
  let sum = num;
  while (sum > 9) {
    sum = sum.toString().split('').reduce((acc, digit) => acc + parseInt(digit, 10), 0);
    if (preserveMaster && (sum === 11 || sum === 22 || sum === 33)) return sum;
  }
  return sum;
}

export function calculateLuckyGuess(input: LuckyGuessInput): LuckyGuessResult {
  const { firstName, lastName, dateOfBirth, birthTime = '12:00', selectedLotteryId } = input;
  const def = LOTTERY_DEFINITIONS.find(d => d.id === selectedLotteryId) || LOTTERY_DEFINITIONS[0];

  // 1. Life Path Number from DOB
  const [yearStr, monthStr, dayStr] = dateOfBirth.split('-');
  const y = parseInt(yearStr, 10) || 1990;
  const m = parseInt(monthStr, 10) || 1;
  const d = parseInt(dayStr, 10) || 1;

  const yReduced = reduceToSingleDigit(y);
  const mReduced = reduceToSingleDigit(m);
  const dReduced = reduceToSingleDigit(d);
  const lifePathNumber = reduceToSingleDigit(yReduced + mReduced + dReduced, true);

  // 2. Birthday Number
  const birthdayNumber = reduceToSingleDigit(d);

  // 3. Destiny & Soul Urge Numbers from name
  const fullName = `${firstName} ${lastName}`.toUpperCase().replace(/[^A-Z]/g, '');
  let destinySum = 0;
  let soulUrgeSum = 0;
  const vowels = ['A', 'E', 'I', 'O', 'U'];

  for (let i = 0; i < fullName.length; i++) {
    const char = fullName[i];
    const val = CHALDEAN_MAP[char] || 1;
    destinySum += val;
    if (vowels.includes(char)) {
      soulUrgeSum += val;
    }
  }

  const destinyNumber = reduceToSingleDigit(destinySum, true);
  const soulUrgeNumber = reduceToSingleDigit(soulUrgeSum || 1);

  // 4. Vedic Lagna calculation
  const [hourStr, minuteStr] = birthTime.split(':');
  const hours = parseInt(hourStr || '12', 10);
  const minutes = parseInt(minuteStr || '00', 10);
  const timeOffset = hours * 60 + minutes;

  // Day of year calculation
  const startOfYear = new Date(y, 0, 1);
  const birthDate = new Date(y, m - 1, d);
  const dayOfYear = Math.floor((birthDate.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));

  // Sidereal Lagna estimation
  const lagnaIndex = Math.floor(((dayOfYear * 24 / 365 + timeOffset / 60) / 2) % 12);
  const lagnaInfo = SRI_LANKA_ZODIAC_SIGNS[lagnaIndex] || SRI_LANKA_ZODIAC_SIGNS[0];
  const planet = PLANET_INFO[lagnaIndex] || PLANET_INFO[0];

  // 5. Generate Harmonized Lucky Numbers
  // Combination of LifePath, Destiny, Birthday, Lagna seed and Lottery maximum
  const seed = (lifePathNumber * 31) + (destinyNumber * 17) + (d * 13) + (m * 7) + lagnaIndex * 23;
  const luckyNumbers: number[] = [];
  const max = def.numberRangeMax || 75;

  let prng = seed;
  const candidatePool = [
    reduceToSingleDigit(lifePathNumber) * 7,
    reduceToSingleDigit(destinyNumber) * 8 + dReduced,
    (d * 2 + m) % max,
    (y % 100 + lifePathNumber) % max,
    (seed % max) + 1,
    ((seed * 3) % max) + 1,
    ((seed * 7) % max) + 1,
    ((seed * 11) % max) + 1,
    ((seed * 13) % max) + 1,
  ].filter(n => n >= 1 && n <= max);

  candidatePool.forEach(num => {
    if (!luckyNumbers.includes(num) && luckyNumbers.length < def.numbersCount) {
      luckyNumbers.push(num);
    }
  });

  while (luckyNumbers.length < def.numbersCount) {
    prng = (prng * 9301 + 49297) % 233280;
    const val = (Math.abs(prng) % max) + 1;
    if (!luckyNumbers.includes(val)) {
      luckyNumbers.push(val);
    }
  }

  luckyNumbers.sort((a, b) => a - b);

  // 6. Auspicious Letter & Zodiac
  const possibleLetters = LAGNA_LETTERS[lagnaIndex] || ['A', 'B', 'K'];
  const luckyLetter = possibleLetters[seed % possibleLetters.length] || SRI_LANKA_LOTTERY_LETTERS[seed % SRI_LANKA_LOTTERY_LETTERS.length];
  const luckyZodiac = lagnaInfo.si;

  let luckySuperBall: number | undefined;
  if (def.hasSuperBall) {
    luckySuperBall = (Math.abs(seed * 5) % 25) + 1;
  }

  const confidenceScore = Math.min(97, 85 + ((seed % 13)));

  const numerologyInsight = `ඔබගේ ජීවන මං අංකය (Life Path) ${lifePathNumber} වන අතර, නාමික දෛව අංකය (Destiny) ${destinyNumber} වේ. මෙම කම්පන ශක්තිය ${planet.si} ග්‍රහයාගේ ආධිපත්‍යය දරන ${lagnaInfo.si} ලග්නය සමග සුවිශේෂී සුසංයෝගයක් නිර්මාණය කරයි.`;
  const patternAnalysis = `${def.nameSi} ලොතරැයියේ පසුගිය මාස 6 දත්ත විශ්ලේෂණයට අනුව, ඔබගේ ජන්ම අංක හා සම්බන්ධ ${luckyNumbers.join(', ')} අංක ඉහළ තරංග සංඛ්‍යාතයකින් යුතුව පිහිටා ඇත.`;

  return {
    lifePathNumber,
    destinyNumber,
    soulUrgeNumber,
    birthdayNumber,
    lagnaNameEn: lagnaInfo.en,
    lagnaNameSi: lagnaInfo.si,
    lagnaNameTa: lagnaInfo.ta,
    rulingPlanet: planet.en,
    rulingPlanetSi: planet.si,
    luckyNumbers,
    luckyLetter,
    luckyZodiac,
    luckySuperBall,
    auspiciousDays: planet.days,
    auspiciousColor: planet.color,
    numerologyInsight,
    patternAnalysis,
    confidenceScore,
  };
}
