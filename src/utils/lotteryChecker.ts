import { LOTTERY_DEFINITIONS } from '../data/lotteries';
import { LotteryResult, TicketMatchResult, LotteryType } from '../types';
import { ParsedTicketData, getSriLankaTodayString, isZodiacMatch, normalizeZodiac, mapLetterToZodiac } from './qrParser';

export function evaluateTicketMatch(
  ticket: ParsedTicketData,
  allResults: LotteryResult[]
): TicketMatchResult {
  const todayStr = getSriLankaTodayString();

  // 1. Not a valid lottery QR code
  if (!ticket.isValidLottery) {
    return {
      isValidLottery: false,
      isFutureDraw: false,
      hasDrawResult: false,
      hasTicketNumbers: false,
      lotteryName: 'Unknown',
      board: ticket.board || 'NLB',
      drawNo: 0,
      drawDate: '',
      ticketNumbers: [],
      matchedNumbers: [],
      matchedLetter: false,
      matchedZodiac: false,
      matchedSuperBall: false,
      isWon: false,
      totalPrize: 0,
      messageSi: 'මෙය වලංගු ශ්‍රී ලාංකික ලොතරැයි QR කේතයක් නොවේ. කරුණාකර නිල DLB හෝ NLB ලොතරැයි ටිකට් පතක් ස්කෑන් කරන්න.',
      messageEn: 'This is not a valid Sri Lankan Lottery QR code. Please scan an authentic DLB or NLB ticket.',
      messageTa: 'இது செல்லுபடியாகும் இலங்கை லாட்டரி QR குறியீடு அல்ல. சரியான DLB அல்லது NLB டிக்கெட்டை ஸ்கேன் செய்யவும்.',
      rawString: ticket.rawString,
    };
  }

  // 2. Find exact matching official draw result
  // STRICT RULE: Never substitute a different draw number!
  let drawResult: LotteryResult | undefined = undefined;

  // Priority 1: Match by exact board, exact lotteryCode, and exact drawNo
  if (ticket.drawNo > 0) {
    drawResult = allResults.find(r =>
      r.board === ticket.board &&
      r.lotteryCode === ticket.lotteryCode &&
      r.drawNo === ticket.drawNo
    );
  }

  // Priority 2: Match by exact board and lottery name with exact drawNo
  if (!drawResult && ticket.drawNo > 0) {
    drawResult = allResults.find(r =>
      r.board === ticket.board &&
      r.lotteryName.toLowerCase() === ticket.lotteryName.toLowerCase() &&
      r.drawNo === ticket.drawNo
    );
  }

  // Priority 3: Only match by drawDate if the ticket explicitly had a date and no drawNo
  if (!drawResult && ticket.hasExplicitDate && ticket.drawDate && (!ticket.drawNo || ticket.drawNo === 0)) {
    drawResult = allResults.find(r =>
      r.board === ticket.board &&
      r.lotteryCode === ticket.lotteryCode &&
      r.drawDate === ticket.drawDate
    );
  }

  // Check if this is strictly a future draw (draw date is tomorrow or later, and no draw has taken place)
  const isTrulyFuture = Boolean(
    !drawResult &&
    ticket.drawDate &&
    ticket.drawDate > todayStr
  );

  if (isTrulyFuture) {
    return {
      isValidLottery: true,
      isFutureDraw: true,
      hasDrawResult: false,
      hasTicketNumbers: ticket.ticketNumbers.length > 0,
      lotteryName: ticket.lotteryName || 'Lottery Ticket',
      board: ticket.board,
      drawNo: ticket.drawNo || 0,
      drawDate: ticket.drawDate || '',
      ticketNumbers: ticket.ticketNumbers,
      ticketLetter: ticket.ticketLetter,
      ticketZodiac: ticket.ticketZodiac,
      ticketZodiacEn: ticket.ticketZodiacEn,
      ticketSuperBall: ticket.ticketSuperBall,
      lotteryType: ticket.lotteryType,
      matchedNumbers: [],
      matchedLetter: false,
      matchedZodiac: false,
      matchedSuperBall: false,
      isWon: false,
      totalPrize: 0,
      messageSi: `මෙම ටිකට් පතට අදාළ දිනුම් ඇදීම තවමත් සිදුකර නොමැත! (${ticket.drawDate}, අංක: #${ticket.drawNo}). දිනුම් ඇදීමෙන් පසු නිල ප්‍රතිඵල පරීක්ෂා කරන්න.`,
      messageEn: `The official draw for this ticket has not taken place yet! (Date: ${ticket.drawDate}, Draw #${ticket.drawNo}). Please check after the draw.`,
      messageTa: `இந்த டிக்கெட்டுக்கான குலுக்கல் இன்னும் நடைபெறவில்லை! (திகதி: ${ticket.drawDate}, குலுக்கல் #${ticket.drawNo}). குலுக்கலுக்குப் பிறகு சரிபார்க்கவும்.`,
      officialSource: ticket.board === 'DLB' ? 'dlb.lk (Development Lotteries Board)' : 'nlb.lk (National Lotteries Board)',
      rawString: ticket.rawString,
    };
  }

  // If the official result for this exact draw is not available, we must NOT
  // invent one. It is far better to say plainly that the result could not be verified.
  if (!drawResult) {
    return {
      isValidLottery: true,
      isFutureDraw: false,
      hasDrawResult: false,
      hasTicketNumbers: Boolean(ticket.ticketNumbers && ticket.ticketNumbers.length > 0),
      lotteryCode: ticket.lotteryCode,
      lotteryName: ticket.lotteryName,
      board: ticket.board,
      drawNo: ticket.drawNo,
      drawDate: ticket.drawDate || '',
      ticketNumbers: ticket.ticketNumbers || [],
      ticketLetter: ticket.ticketLetter,
      ticketZodiac: ticket.ticketZodiac,
      ticketZodiacEn: ticket.ticketZodiacEn,
      ticketSuperBall: ticket.ticketSuperBall,
      matchedNumbers: [],
      matchedLetter: false,
      matchedZodiac: false,
      matchedSuperBall: false,
      isWon: false,
      totalPrize: 0,
      prizeCategory: 'තහවුරු කර නැත (Unverified)',
      messageSi: `මෙම ටිකට් පතේ #${ticket.drawNo || ''} නිල ප්‍රතිඵලය තවම ලබාගෙන නොමැත. කරුණාකර "ප්‍රතිඵල Sync" කර නැවත උත්සාහ කරන්න.`,
      messageEn: `Official results for #${ticket.drawNo || ''} are not available yet, so this ticket cannot be verified.`,
      messageTa: `இந்த டிக்கெட்டுக்கான அதிகாரப்பூர்ව முடிவுகள் இன்னும் கிடைக்கவில்லை.`,
      officialSource: ticket.board === 'DLB' ? 'dlb.lk (Development Lotteries Board)' : 'nlb.lk (National Lotteries Board)',
      lotteryType: ticket.lotteryType,
      rawString: ticket.rawString,
    };
  }

  // 3. Official winning data
  const officialNumbers = drawResult.numbers || [];
  const officialLetter = drawResult.letter;
  const officialZodiac = drawResult.zodiac;
  const officialSuperBall = drawResult.superBall;
  const officialSource = drawResult.board === 'DLB' ? 'dlb.lk (සංවර්ධන ලොතරැයි මණ්ඩලය)' : 'nlb.lk (ජාතික ලොතරැයි මණ්ඩලය)';

  const hasTicketNumbers = ticket.ticketNumbers && ticket.ticketNumbers.length > 0;
  const ticketNumbers = ticket.ticketNumbers || [];
  const def = LOTTERY_DEFINITIONS.find(d => d.code === drawResult!.lotteryCode);
  const prizes = drawResult.prizes || def?.samplePrizes || [];

  // Determine lottery type - codeType from verified draw result takes absolute precedence
  const codeType: LotteryType | undefined = 
    drawResult.lotteryCode === 'MS' || drawResult.lotteryCode === 'SDS' ? '6D+L' :
    drawResult.lotteryCode === 'LW' || drawResult.lotteryCode === 'HD' ? '4N+Z' :
    drawResult.lotteryCode === 'SD' ? '3N+Z' :
    drawResult.lotteryCode === 'JS' ? '4D+REV+L' :
    drawResult.lotteryCode === 'WAASI' ? '2N+L+SB' :
    drawResult.lotteryCode === 'AS' || drawResult.lotteryCode === 'NJ' ? '4D+L' :
    drawResult.lotteryCode === 'SB' || drawResult.lotteryCode === 'MP' || drawResult.lotteryCode === 'KP' ? '4N+L+SB' :
    drawResult.lotteryCode === 'SW' ? '4N+L' :
    drawResult.lotteryCode === 'SASIRI' ? '3N' : undefined;

  const lotteryType = codeType || ticket.lotteryType || '4N+L';

  // Determine if this is strictly a Zodiac lottery (Lagna Wasana LW, Handahana HD, Suba Dawasak SD)
  const isZodiacGame = Boolean(def?.hasZodiac) || drawResult.lotteryCode === 'LW' || drawResult.lotteryCode === 'HD' || drawResult.lotteryCode === 'SD';

  // Normalize or resolve Zodiac sign for Zodiac lotteries (Lagna Wasana LW, Handahana HD, Suba Dawasak SD)
  let resolvedTicketZodiac = isZodiacGame ? ticket.ticketZodiac : undefined;
  let resolvedTicketZodiacEn = isZodiacGame ? ticket.ticketZodiacEn : undefined;

  if (isZodiacGame) {
    if (!resolvedTicketZodiac && ticket.ticketLetter) {
      const zMap = mapLetterToZodiac(ticket.ticketLetter);
      if (zMap) {
        resolvedTicketZodiac = zMap.si;
        resolvedTicketZodiacEn = zMap.en;
      }
    }
  }

  const normOfficialZodiac = isZodiacGame ? normalizeZodiac(officialZodiac) : null;

  // If ticket QR code only provided the official draw URL (no numbers encoded on ticket QR)
  if (!hasTicketNumbers) {
    return {
      isValidLottery: true,
      isFutureDraw: false,
      hasDrawResult: true,
      hasTicketNumbers: false,
      lotteryCode: drawResult.lotteryCode,
      lotteryName: drawResult.lotteryName,
      board: drawResult.board,
      drawNo: drawResult.drawNo,
      drawDate: drawResult.drawDate,
      ticketNumbers: [],
      matchedNumbers: [],
      matchedLetter: false,
      matchedZodiac: false,
      matchedSuperBall: false,
      isWon: false,
      totalPrize: 0,
      prizeCategory: 'නිල දිනුම් ඇදීමේ ප්‍රතිඵල (Official Draw Results)',
      messageSi: `${drawResult.lotteryName} #${drawResult.drawNo} (${drawResult.drawDate}) නිල ප්‍රතිඵල සාර්ථකව කියවන ලදී. නිල ජයග්‍රාහී අංක සහ අකුර පහතින් බලන්න.`,
      messageEn: `Official results loaded for ${drawResult.lotteryName} #${drawResult.drawNo} (${drawResult.drawDate}). Official winning numbers & letter are shown below.`,
      messageTa: `${drawResult.lotteryName} #${drawResult.drawNo} (${drawResult.drawDate}) அதிகாரப்பூர்வ முடிவுகள் கீழே காட்டப்பட்டுள்ளன.`,
      drawResult,
      officialNumbers,
      officialLetter: isZodiacGame ? undefined : officialLetter,
      officialZodiac: isZodiacGame ? officialZodiac : undefined,
      officialZodiacEn: (isZodiacGame && normOfficialZodiac) ? normOfficialZodiac.en : undefined,
      officialSuperBall,
      officialDrawNo: drawResult.drawNo,
      officialDrawDate: drawResult.drawDate,
      officialSource,
      lotteryType,
      rawString: ticket.rawString,
    };
  }

  // 4. Calculate matches based on lottery type
  let matchedNumbers: number[] = [];
  let matchedIndices: number[] = [];
  let trailingMatches = 0;
  let isWon = false;
  let totalPrize = 0;
  let prizeCategoryNameSi = '';
  let prizeCategoryNameEn = '';

  const matchedLetter = !isZodiacGame && Boolean(
    ticket.ticketLetter &&
    officialLetter &&
    ticket.ticketLetter.trim().toUpperCase() === officialLetter.trim().toUpperCase()
  );

  const matchedZodiac = isZodiacGame && Boolean(
    resolvedTicketZodiac &&
    officialZodiac &&
    isZodiacMatch(resolvedTicketZodiac, officialZodiac)
  );

  const matchedSuperBall = Boolean(
    ticket.ticketSuperBall !== undefined &&
    officialSuperBall !== undefined &&
    Number(ticket.ticketSuperBall) === Number(officialSuperBall) &&
    Number(ticket.ticketSuperBall) > 0
  );

  // --------------------------------------------------------------------------
  // VARIATION 4: 6 Single-Digit Order Games (Mahajana Sampatha MS, Supiri Dhana Sampatha SDS)
  // --------------------------------------------------------------------------
  if (lotteryType === '6D+L') {
    // Check trailing matches from right (index 5 backwards to 0)
    for (let i = 5; i >= 0; i--) {
      if (ticketNumbers[i] !== undefined && officialNumbers[i] !== undefined && ticketNumbers[i] === officialNumbers[i]) {
        trailingMatches++;
        matchedIndices.unshift(i);
        matchedNumbers.unshift(ticketNumbers[i]);
      } else {
        break; // Trailing match must be consecutive from right!
      }
    }

    // Also check leading matches from left (first digits in order)
    let leadingMatches = 0;
    const leadingIndices: number[] = [];
    const leadingNums: number[] = [];
    for (let i = 0; i < 6; i++) {
      if (ticketNumbers[i] !== undefined && officialNumbers[i] !== undefined && ticketNumbers[i] === officialNumbers[i]) {
        leadingMatches++;
        leadingIndices.push(i);
        leadingNums.push(ticketNumbers[i]);
      } else {
        break;
      }
    }

    // Evaluate 6D prize tiers
    if (trailingMatches === 6 && matchedLetter) {
      isWon = true;
      totalPrize = drawResult.jackpotAmount || 100000000;
      prizeCategoryNameSi = 'සුපිරි ජයමල්ල (අකුර + ඉලක්කම් 6 පිළිවෙළින්)';
      prizeCategoryNameEn = 'Super Prize (Letter + All 6 Digits in Order)';
    } else if (trailingMatches === 6) {
      isWon = true;
      const p = prizes.find(pr => pr.matchRule === '6D');
      totalPrize = p ? p.prizeAmount : 2000000;
      prizeCategoryNameSi = '1 වන ත්‍යාගය (ඉලක්කම් 6 ගැලපීම)';
      prizeCategoryNameEn = '1st Prize (All 6 Digits in Order)';
    } else if (trailingMatches >= 5 && matchedLetter) {
      isWon = true;
      const p = prizes.find(pr => pr.matchRule === '5D+L');
      totalPrize = p ? p.prizeAmount : 100000;
      prizeCategoryNameSi = 'අකුර + අවසන් ඉලක්කම් 5';
      prizeCategoryNameEn = 'Letter + Last 5 Digits';
    } else if (trailingMatches >= 5) {
      isWon = true;
      const p = prizes.find(pr => pr.matchRule === '5D');
      totalPrize = p ? p.prizeAmount : 25000;
      prizeCategoryNameSi = 'අවසන් ඉලක්කම් 5 ගැලපීම';
      prizeCategoryNameEn = 'Last 5 Digits Match';
    } else if (leadingMatches >= 5 && matchedLetter) {
      isWon = true;
      totalPrize = 100000;
      prizeCategoryNameSi = 'අකුර + මුල් ඉලක්කම් 5';
      prizeCategoryNameEn = 'Letter + First 5 Digits';
      matchedIndices = leadingIndices;
      matchedNumbers = leadingNums;
    } else if (leadingMatches >= 5) {
      isWon = true;
      totalPrize = 25000;
      prizeCategoryNameSi = 'මුල් ඉලක්කම් 5 ගැලපීම';
      prizeCategoryNameEn = 'First 5 Digits Match';
      matchedIndices = leadingIndices;
      matchedNumbers = leadingNums;
    } else if (trailingMatches >= 4 && matchedLetter) {
      isWon = true;
      const p = prizes.find(pr => pr.matchRule === '4D+L');
      totalPrize = p ? p.prizeAmount : 10000;
      prizeCategoryNameSi = 'අකුර + අවසන් ඉලක්කම් 4';
      prizeCategoryNameEn = 'Letter + Last 4 Digits';
    } else if (trailingMatches >= 4) {
      isWon = true;
      const p = prizes.find(pr => pr.matchRule === '4D');
      totalPrize = p ? p.prizeAmount : 2000;
      prizeCategoryNameSi = 'අවසන් ඉලක්කම් 4 ගැලපීම';
      prizeCategoryNameEn = 'Last 4 Digits Match';
    } else if (leadingMatches >= 4 && matchedLetter) {
      isWon = true;
      totalPrize = 10000;
      prizeCategoryNameSi = 'අකුර + මුල් ඉලක්කම් 4';
      prizeCategoryNameEn = 'Letter + First 4 Digits';
      matchedIndices = leadingIndices;
      matchedNumbers = leadingNums;
    } else if (leadingMatches >= 4) {
      isWon = true;
      totalPrize = 2000;
      prizeCategoryNameSi = 'මුල් ඉලක්කම් 4 ගැලපීම';
      prizeCategoryNameEn = 'First 4 Digits Match';
      matchedIndices = leadingIndices;
      matchedNumbers = leadingNums;
    } else if (trailingMatches >= 3 && matchedLetter) {
      isWon = true;
      const p = prizes.find(pr => pr.matchRule === '3D+L');
      totalPrize = p ? p.prizeAmount : 1000;
      prizeCategoryNameSi = 'අකුර + අවසන් ඉලක්කම් 3';
      prizeCategoryNameEn = 'Letter + Last 3 Digits';
    } else if (trailingMatches >= 3) {
      isWon = true;
      const p = prizes.find(pr => pr.matchRule === '3D');
      totalPrize = p ? p.prizeAmount : 100;
      prizeCategoryNameSi = 'අවසන් ඉලක්කම් 3 ගැලපීම';
      prizeCategoryNameEn = 'Last 3 Digits Match';
    } else if (trailingMatches >= 2 && matchedLetter) {
      isWon = true;
      const p = prizes.find(pr => pr.matchRule === '2D+L');
      totalPrize = p ? p.prizeAmount : 100;
      prizeCategoryNameSi = 'අකුර + අවසන් ඉලක්කම් 2';
      prizeCategoryNameEn = 'Letter + Last 2 Digits';
    } else if (trailingMatches >= 2) {
      isWon = true;
      const p = prizes.find(pr => pr.matchRule === '2D');
      totalPrize = p ? p.prizeAmount : 40;
      prizeCategoryNameSi = 'අවසන් ඉලක්කම් 2 ගැලපීම';
      prizeCategoryNameEn = 'Last 2 Digits Match';
    } else if (matchedLetter) {
      isWon = true;
      const p = prizes.find(pr => pr.matchRule === 'L');
      totalPrize = p ? p.prizeAmount : 40;
      prizeCategoryNameSi = 'ඉංග්‍රීසි අකුර පමණක්';
      prizeCategoryNameEn = 'English Letter Only';
    } else if (trailingMatches >= 1) {
      isWon = true;
      const p = prizes.find(pr => pr.matchRule === '1D');
      totalPrize = p ? p.prizeAmount : 40;
      prizeCategoryNameSi = 'අවසන් ඉලක්කම පමණක්';
      prizeCategoryNameEn = 'Last 1 Digit Match';
    }

    // 6-digit in any order (for Supiri Dhana Sampatha - Rs. 500)
    if (!isWon && ticketNumbers.length === 6 && officialNumbers.length === 6) {
      const sortedT = [...ticketNumbers].sort().join(',');
      const sortedO = [...officialNumbers].sort().join(',');
      if (sortedT === sortedO) {
        isWon = true;
        totalPrize = 500;
        prizeCategoryNameSi = 'තනි ඉලක්කම් 6ම ඕනෑම පිළිවෙළකට';
        prizeCategoryNameEn = 'All 6 Digits in Any Order';
      }
    }
  }

  // --------------------------------------------------------------------------
  // VARIATION 3: Super Ball & Special Number Games (Super Ball SB, Mega Power MP, Kapruka KP, Shanida SW)
  // --------------------------------------------------------------------------
  else if (lotteryType === '4N+L+SB') {
    const isShanida = drawResult.lotteryCode === 'SW';
    const uniqueNums = Array.from(new Set(ticketNumbers));
    matchedNumbers = uniqueNums.filter(n => officialNumbers.includes(n));
    const numMatches = matchedNumbers.length;

    // ========== SHANIDA-SPECIFIC LOGIC (Must come FIRST) ==========
    if (isShanida) {
      if (numMatches >= 4 && matchedLetter && matchedSuperBall) {
        isWon = true;
        totalPrize = drawResult.jackpotAmount || 53553580;
        prizeCategoryNameSi = 'සුපිරි ජයමල්ල (අංක 4 + ඉංග්‍රීසි අකුර + විශේෂ අංකය)';
        prizeCategoryNameEn = 'Super Jackpot (4 Numbers + Letter + Special Number)';
      } else if (numMatches >= 4 && matchedLetter) {
        isWon = true;
        const p = prizes.find(pr => pr.matchRule === '4N+L');
        totalPrize = drawResult.jackpotAmount || (p ? p.prizeAmount : 56131518);
        prizeCategoryNameSi = 'සුපිරි ජයමල්ල (අංක 4 + ඉංග්‍රීසි අකුර)';
        prizeCategoryNameEn = 'Super Jackpot (4 Numbers + Letter)';
      } else if (numMatches >= 4 && matchedSuperBall) {
        isWon = true;
        const p = prizes.find(pr => pr.matchRule === '4N+SB');
        totalPrize = p ? p.prizeAmount : 2000000;
        prizeCategoryNameSi = 'අංක 4 + විශේෂ අංකය';
        prizeCategoryNameEn = '4 Numbers + Special Number';
      } else if (numMatches >= 4) {
        isWon = true;
        const p = prizes.find(pr => pr.matchRule === '4N');
        totalPrize = p ? p.prizeAmount : 2000000;
        prizeCategoryNameSi = 'අංක 4 ගැලපීම';
        prizeCategoryNameEn = '4 Numbers Match';
      } else if (numMatches === 3 && matchedLetter && matchedSuperBall) {
        isWon = true;
        const p = prizes.find(pr => pr.matchRule === '3N+L+SB');
        totalPrize = p ? p.prizeAmount : 500000;
        prizeCategoryNameSi = 'අංක 3 + ඉංග්‍රීසි අකුර + විශේෂ අංකය';
        prizeCategoryNameEn = '3 Numbers + Letter + Special Number';
      } else if (numMatches === 3 && matchedLetter) {
        isWon = true;
        const p = prizes.find(pr => pr.matchRule === '3N+L');
        totalPrize = p ? p.prizeAmount : 200000;
        prizeCategoryNameSi = 'අංක 3 + ඉංග්‍රීසි අකුර';
        prizeCategoryNameEn = '3 Numbers + Letter';
      } else if (numMatches === 3 && matchedSuperBall) {
        isWon = true;
        const p = prizes.find(pr => pr.matchRule === '3N+SB');
        totalPrize = p ? p.prizeAmount : 5000;
        prizeCategoryNameSi = 'අංක 3 + විශේෂ අංකය';
        prizeCategoryNameEn = '3 Numbers + Special Number';
      } else if (numMatches === 3) {
        isWon = true;
        const p = prizes.find(pr => pr.matchRule === '3N');
        totalPrize = p ? p.prizeAmount : 4000;
        prizeCategoryNameSi = 'අංක 3 ගැලපීම';
        prizeCategoryNameEn = '3 Numbers Match';
      } else if (numMatches === 2 && matchedLetter && matchedSuperBall) {
        isWon = true;
        const p = prizes.find(pr => pr.matchRule === '2N+L+SB');
        totalPrize = p ? p.prizeAmount : 5000;
        prizeCategoryNameSi = 'අංක 2 + ඉංග්‍රීසි අකුර + විශේෂ අංකය';
        prizeCategoryNameEn = '2 Numbers + Letter + Special Number';
      } else if (numMatches === 2 && matchedLetter) {
        isWon = true;
        const p = prizes.find(pr => pr.matchRule === '2N+L');
        totalPrize = p ? p.prizeAmount : 2000;
        prizeCategoryNameSi = 'අංක 2 + ඉංග්‍රීසි අකුර';
        prizeCategoryNameEn = '2 Numbers + Letter';
      } else if (numMatches === 2 && matchedSuperBall) {
        isWon = true;
        const p = prizes.find(pr => pr.matchRule === '2N+SB');
        totalPrize = p ? p.prizeAmount : 500;
        prizeCategoryNameSi = 'අංක 2 + විශේෂ අංකය';
        prizeCategoryNameEn = '2 Numbers + Special Number';
      } else if (numMatches === 2) {
        isWon = true;
        const p = prizes.find(pr => pr.matchRule === '2N');
        totalPrize = p ? p.prizeAmount : 200;
        prizeCategoryNameSi = 'අංක 2 ගැලපීම';
        prizeCategoryNameEn = '2 Numbers Match';
      } else if (numMatches === 1 && matchedLetter && matchedSuperBall) {
        isWon = true;
        const p = prizes.find(pr => pr.matchRule === '1N+L+SB');
        totalPrize = p ? p.prizeAmount : 500;
        prizeCategoryNameSi = 'අංක 1 + ඉංග්‍රීසි අකුර + විශේෂ අංකය';
        prizeCategoryNameEn = '1 Number + Letter + Special Number';
      } else if (numMatches === 1 && matchedLetter) {
        isWon = true;
        const p = prizes.find(pr => pr.matchRule === '1N+L');
        totalPrize = p ? p.prizeAmount : 200;
        prizeCategoryNameSi = 'අංක 1 + ඉංග්‍රීසි අකුර';
        prizeCategoryNameEn = '1 Number + Letter';
      } else if (numMatches === 1 && matchedSuperBall) {
        isWon = true;
        const p = prizes.find(pr => pr.matchRule === '1N+SB');
        totalPrize = p ? p.prizeAmount : 100;
        prizeCategoryNameSi = 'අංක 1 + විශේෂ අංකය';
        prizeCategoryNameEn = '1 Number + Special Number';
      } else if (numMatches === 1) {
        isWon = true;
        const p = prizes.find(pr => pr.matchRule === '1N');
        totalPrize = p ? p.prizeAmount : 40;
        prizeCategoryNameSi = 'ඕනෑම තනි අංකයක්';
        prizeCategoryNameEn = '1 Single Number';
      } else if (matchedSuperBall) {
        isWon = true;
        const p = prizes.find(pr => pr.matchRule === 'SB');
        totalPrize = p ? p.prizeAmount : 40;
        prizeCategoryNameSi = 'විශේෂ අංකය පමණක්';
        prizeCategoryNameEn = 'Special Number Only';
      } else if (matchedLetter) {
        isWon = true;
        const p = prizes.find(pr => pr.matchRule === 'L');
        totalPrize = p ? p.prizeAmount : 40;
        prizeCategoryNameSi = 'ඉංග්‍රීසි අකුර පමණක්';
        prizeCategoryNameEn = 'English Letter Only';
      }
    } 
    // ========== NON-SHANIDA LOGIC (SB, MP, KP) ==========
    else {
      if (numMatches >= 4 && matchedLetter && matchedSuperBall) {
        isWon = true;
        totalPrize = drawResult.jackpotAmount || 60000000;
        prizeCategoryNameSi = 'සුපිරි ජයමල්ල (අංක 4 + අකුර + සුපිරි බෝලය)';
        prizeCategoryNameEn = 'Super Jackpot (4 Numbers + Letter + Super Ball)';
      } else if (numMatches >= 4 && matchedLetter) {
        isWon = true;
        const p = prizes.find(pr => pr.matchRule === '4N+L');
        totalPrize = p ? p.prizeAmount : 2000000;
        prizeCategoryNameSi = 'අංක 4 + ඉංග්‍රීසි අකුර (ජයමල්ල)';
        prizeCategoryNameEn = '4 Numbers + Letter (Jackpot)';
      } else if (numMatches >= 4) {
        isWon = true;
        const p = prizes.find(pr => pr.matchRule === '4N');
        totalPrize = p ? p.prizeAmount : 1000000;
        prizeCategoryNameSi = 'අංක 4 ගැලපීම';
        prizeCategoryNameEn = '4 Numbers Match';
      } else if (numMatches === 3 && matchedLetter) {
        isWon = true;
        const p = prizes.find(pr => pr.matchRule === '3N+L');
        totalPrize = p ? p.prizeAmount : 100000;
        prizeCategoryNameSi = 'අංක 3 + ඉංග්‍රීසි අකුර';
        prizeCategoryNameEn = '3 Numbers + Letter';
      } else if (numMatches === 3) {
        isWon = true;
        const p = prizes.find(pr => pr.matchRule === '3N');
        totalPrize = p ? p.prizeAmount : 2500;
        prizeCategoryNameSi = 'අංක 3 ගැලපීම';
        prizeCategoryNameEn = '3 Numbers Match';
      } else if (numMatches === 2 && matchedLetter) {
        isWon = true;
        const p = prizes.find(pr => pr.matchRule === '2N+L');
        totalPrize = p ? p.prizeAmount : 1000;
        prizeCategoryNameSi = 'අංක 2 + ඉංග්‍රීසි අකුර';
        prizeCategoryNameEn = '2 Numbers + Letter';
      } else if (numMatches === 2) {
        isWon = true;
        const p = prizes.find(pr => pr.matchRule === '2N');
        totalPrize = p ? p.prizeAmount : 100;
        prizeCategoryNameSi = 'අංක 2 ගැලපීම';
        prizeCategoryNameEn = '2 Numbers Match';
      } else if (numMatches === 1 && matchedLetter) {
        isWon = true;
        const p = prizes.find(pr => pr.matchRule === '1N+L');
        totalPrize = p ? p.prizeAmount : 100;
        prizeCategoryNameSi = 'අංක 1 + ඉංග්‍රීසි අකුර';
        prizeCategoryNameEn = '1 Number + Letter';
      } else if (matchedSuperBall) {
        isWon = true;
        const p = prizes.find(pr => pr.matchRule === 'SB');
        totalPrize = p ? p.prizeAmount : 40;
        prizeCategoryNameSi = 'සුපිරි බෝලය පමණක්';
        prizeCategoryNameEn = 'Super Ball Only';
      } else if (matchedLetter) {
        isWon = true;
        const p = prizes.find(pr => pr.matchRule === 'L');
        totalPrize = p ? p.prizeAmount : 40;
        prizeCategoryNameSi = 'ඉංග්‍රීසි අකුර පමණක්';
        prizeCategoryNameEn = 'English Letter Only';
      } else if (numMatches === 1) {
        const p = prizes.find(pr => pr.matchRule === '1N');
        if (p) {
          isWon = true;
          totalPrize = p.prizeAmount || 40;
          prizeCategoryNameSi = 'ඕනෑම තනි අංකයක්';
          prizeCategoryNameEn = '1 Single Number';
        }
      }
    }
  }

  // --------------------------------------------------------------------------
  // VARIATION 1: Zodiac Games (Lagna Wasana LW, Handahana HD) - NO English letter
  // --------------------------------------------------------------------------
  else if (lotteryType === '4N+Z') {
    matchedNumbers = ticketNumbers.filter(n => officialNumbers.includes(n));
    const numMatches = matchedNumbers.length;

    if (numMatches >= 4 && matchedZodiac) {
      isWon = true;
      totalPrize = drawResult.jackpotAmount || 20000000;
      prizeCategoryNameSi = 'ප්‍රධාන ජැක්පොට් (අංක 4 + ලග්නය)';
      prizeCategoryNameEn = 'Super Jackpot (4 Numbers + Zodiac)';
    } else if (numMatches >= 4) {
      isWon = true;
      const p = prizes.find(pr => pr.matchRule === '4N');
      totalPrize = p ? p.prizeAmount : 1000000;
      prizeCategoryNameSi = 'අංක 4 ගැලපීම';
      prizeCategoryNameEn = '4 Numbers Match';
    } else if (numMatches === 3 && matchedZodiac) {
      isWon = true;
      const p = prizes.find(pr => pr.matchRule === '3N+Z');
      totalPrize = p ? p.prizeAmount : 20000;
      prizeCategoryNameSi = 'අංක 3 + ලග්නය';
      prizeCategoryNameEn = '3 Numbers + Zodiac';
    } else if (numMatches === 3) {
      isWon = true;
      const p = prizes.find(pr => pr.matchRule === '3N');
      totalPrize = p ? p.prizeAmount : 2000;
      prizeCategoryNameSi = 'අංක 3 ගැලපීම';
      prizeCategoryNameEn = '3 Numbers Match';
    } else if (numMatches === 2 && matchedZodiac) {
      isWon = true;
      const p = prizes.find(pr => pr.matchRule === '2N+Z');
      totalPrize = p ? p.prizeAmount : 400;
      prizeCategoryNameSi = 'අංක 2 + ලග්නය';
      prizeCategoryNameEn = '2 Numbers + Zodiac';
    } else if (numMatches === 2) {
      isWon = true;
      const p = prizes.find(pr => pr.matchRule === '2N');
      totalPrize = p ? p.prizeAmount : 100;
      prizeCategoryNameSi = 'අංක 2 ගැලපීම';
      prizeCategoryNameEn = '2 Numbers Match';
    } else if (numMatches === 1 && matchedZodiac) {
      isWon = true;
      const p = prizes.find(pr => pr.matchRule === '1N+Z');
      totalPrize = p ? p.prizeAmount : 100;
      prizeCategoryNameSi = 'අංක 1 + ලග්නය';
      prizeCategoryNameEn = '1 Number + Zodiac';
    } else if (matchedZodiac) {
      isWon = true;
      const p = prizes.find(pr => pr.matchRule === 'Z');
      totalPrize = p ? p.prizeAmount : 40;
      prizeCategoryNameSi = 'ලග්නය පමණක්';
      prizeCategoryNameEn = 'Zodiac Only';
    } else if (numMatches === 1) {
      isWon = true;
      const p = prizes.find(pr => pr.matchRule === '1N');
      totalPrize = p ? p.prizeAmount : 40;
      prizeCategoryNameSi = 'තනි අංකයක් පමණක්';
      prizeCategoryNameEn = '1 Single Number';
    }
  }

  // --------------------------------------------------------------------------
  // VARIATION 1B: Suba Dawasak (3N+Z) - 3 Numbers + 1 Zodiac Sign
  // --------------------------------------------------------------------------
  else if (lotteryType === '3N+Z') {
    matchedNumbers = ticketNumbers.filter(n => officialNumbers.includes(n));
    const numMatches = matchedNumbers.length;

    if (numMatches >= 3 && matchedZodiac) {
      isWon = true;
      totalPrize = drawResult.jackpotAmount || 500000;
      prizeCategoryNameSi = '1 වන ත්‍යාගය (ලග්නය + අංක 3ම)';
      prizeCategoryNameEn = '1st Prize (Zodiac + All 3 Numbers)';
    } else if (numMatches >= 3) {
      isWon = true;
      totalPrize = 50000;
      prizeCategoryNameSi = '2 වන ත්‍යාගය (අංක 3 පමණක්)';
      prizeCategoryNameEn = '2nd Prize (3 Numbers)';
    } else if (numMatches === 2 && matchedZodiac) {
      isWon = true;
      totalPrize = 2500;
      prizeCategoryNameSi = '3 වන ත්‍යාගය (ලග්නය + අංක 2ක්)';
      prizeCategoryNameEn = '3rd Prize (Zodiac + 2 Numbers)';
    } else if (numMatches === 2) {
      isWon = true;
      totalPrize = 1000;
      prizeCategoryNameSi = '4 වන ත්‍යාගය (අංක 2ක් පමණක්)';
      prizeCategoryNameEn = '4th Prize (2 Numbers)';
    } else if (numMatches === 1 && matchedZodiac) {
      isWon = true;
      totalPrize = 200;
      prizeCategoryNameSi = '5 වන ත්‍යාගය (ලග්නය + අංක 1ක්)';
      prizeCategoryNameEn = '5th Prize (Zodiac + 1 Number)';
    } else if (numMatches === 1) {
      isWon = true;
      totalPrize = 40;
      prizeCategoryNameSi = '6 වන ත්‍යාගය (අංක 1ක් පමණක්)';
      prizeCategoryNameEn = '6th Prize (1 Number)';
    } else if (matchedZodiac) {
      isWon = true;
      totalPrize = 40;
      prizeCategoryNameSi = '7 වන ත්‍යාගය (ලග්නය පමණක්)';
      prizeCategoryNameEn = '7th Prize (Zodiac Only)';
    }
  }

  // --------------------------------------------------------------------------
  // VARIATION 5: 3-Number Games (Sasiri SASIRI)
  // --------------------------------------------------------------------------
  else if (lotteryType === '3N') {
    matchedNumbers = ticketNumbers.filter(n => officialNumbers.includes(n));
    const numMatches = matchedNumbers.length;

    if (numMatches >= 3) {
      isWon = true;
      totalPrize = drawResult.jackpotAmount || 200000;
      prizeCategoryNameSi = 'අංක 3 ගැලපීම (ජයමල්ල)';
      prizeCategoryNameEn = 'All 3 Numbers Match';
    } else if (numMatches === 2) {
      isWon = true;
      const p = prizes.find(pr => pr.matchRule === '2N');
      totalPrize = p ? p.prizeAmount : 400;
      prizeCategoryNameSi = 'අංක 2 ගැලපීම';
      prizeCategoryNameEn = '2 Numbers Match';
    } else if (numMatches === 1) {
      isWon = true;
      const p = prizes.find(pr => pr.matchRule === '1N');
      totalPrize = p ? p.prizeAmount : 40;
      prizeCategoryNameSi = 'තනි අංකයක් පමණක්';
      prizeCategoryNameEn = '1 Single Number';
    }
  }

  // --------------------------------------------------------------------------
  // VARIATION 6: Jaya Sampatha (4D+REV+L) - Single Digits Matched in Reverse Order
  // --------------------------------------------------------------------------
  else if (lotteryType === '4D+REV+L') {
    const t = [...ticketNumbers].reverse();
    const d = [...officialNumbers].reverse();
    let matchLen = 0;
    for (let i = 0; i < Math.min(t.length, d.length, 4); i++) {
      if (t[i] === d[i]) {
        matchLen++;
        matchedNumbers.push(t[i]);
      } else {
        break;
      }
    }
    if (matchLen === 4 && matchedLetter) {
      isWon = true;
      totalPrize = 250000;
      prizeCategoryNameSi = 'අක්ෂරය + පසුපස සිට තනි ඉලක්කම් 4ම';
      prizeCategoryNameEn = 'Letter + All 4 Reverse Digits';
    } else if (matchLen === 4) {
      isWon = true;
      totalPrize = 50000;
      prizeCategoryNameSi = 'පසුපස සිට තනි ඉලක්කම් 4ම';
      prizeCategoryNameEn = 'All 4 Reverse Digits';
    } else if (matchLen === 3) {
      isWon = true;
      totalPrize = 4000;
      prizeCategoryNameSi = 'පසුපස සිට තනි ඉලක්කම් 3ක්';
      prizeCategoryNameEn = '3 Reverse Digits';
    } else if (matchLen === 2) {
      isWon = true;
      totalPrize = 1000;
      prizeCategoryNameSi = 'පසුපස සිට තනි ඉලක්කම් 2ක්';
      prizeCategoryNameEn = '2 Reverse Digits';
    } else if (matchedLetter) {
      isWon = true;
      totalPrize = 80;
      prizeCategoryNameSi = 'අක්ෂරය පමණක්';
      prizeCategoryNameEn = 'Letter Only';
    }
  }

  // --------------------------------------------------------------------------
  // VARIATION 7: Kotipathi Waasi (2N+L+SB) - Letter + Super Ball + 2 Numbers
  // --------------------------------------------------------------------------
  else if (lotteryType === '2N+L+SB') {
    matchedNumbers = ticketNumbers.filter(n => officialNumbers.includes(n));
    const numMatches = matchedNumbers.length;

    if (numMatches >= 2 && matchedLetter && matchedSuperBall) {
      isWon = true;
      totalPrize = 1000000;
      prizeCategoryNameSi = 'අක්ෂරය + සුපිරි අංකය + අංක 2ම';
      prizeCategoryNameEn = 'Letter + Super Number + 2 Numbers';
    } else if (numMatches >= 2 && matchedLetter) {
      isWon = true;
      totalPrize = 500000;
      prizeCategoryNameSi = 'අක්ෂරය + අංක 2';
      prizeCategoryNameEn = 'Letter + 2 Numbers';
    } else if (numMatches >= 2 && matchedSuperBall) {
      isWon = true;
      totalPrize = 50000;
      prizeCategoryNameSi = 'සුපිරි අංකය + අංක 2';
      prizeCategoryNameEn = 'Super Number + 2 Numbers';
    } else if (numMatches >= 2) {
      isWon = true;
      totalPrize = 25000;
      prizeCategoryNameSi = 'අංක 2 පමණක්';
      prizeCategoryNameEn = '2 Numbers Only';
    } else if (numMatches === 1 && matchedLetter && matchedSuperBall) {
      isWon = true;
      totalPrize = 1000;
      prizeCategoryNameSi = 'අක්ෂරය + සුපිරි අංකය + අංක 1ක්';
      prizeCategoryNameEn = 'Letter + Super + 1 Number';
    } else if (numMatches === 1 && matchedLetter) {
      isWon = true;
      totalPrize = 500;
      prizeCategoryNameSi = 'අක්ෂරය + අංක 1ක්';
      prizeCategoryNameEn = 'Letter + 1 Number';
    } else if (numMatches === 1 && matchedSuperBall) {
      isWon = true;
      totalPrize = 500;
      prizeCategoryNameSi = 'සුපිරි අංකය + අංක 1ක්';
      prizeCategoryNameEn = 'Super Number + 1 Number';
    } else if (matchedLetter && matchedSuperBall) {
      isWon = true;
      totalPrize = 120;
      prizeCategoryNameSi = 'සුපිරි අංකය + අක්ෂරය';
      prizeCategoryNameEn = 'Super Number + Letter';
    } else if (numMatches === 1) {
      isWon = true;
      totalPrize = 40;
      prizeCategoryNameSi = 'අංක 1ක් පමණක්';
      prizeCategoryNameEn = '1 Number Only';
    } else if (matchedLetter) {
      isWon = true;
      totalPrize = 40;
      prizeCategoryNameSi = 'අක්ෂරය පමණක්';
      prizeCategoryNameEn = 'Letter Only';
    } else if (matchedSuperBall) {
      isWon = true;
      totalPrize = 40;
      prizeCategoryNameSi = 'සුපිරි අංකය පමණක්';
      prizeCategoryNameEn = 'Super Number Only';
    }
  }

  // --------------------------------------------------------------------------
  // VARIATION 8: Ada Sampatha & NLB Jaya (4D+L) - Single Digits in Forward Order
  // --------------------------------------------------------------------------
  else if (lotteryType === '4D+L') {
    let leadingMatches = 0;
    for (let i = 0; i < Math.min(ticketNumbers.length, officialNumbers.length, 4); i++) {
      if (ticketNumbers[i] === officialNumbers[i]) {
        leadingMatches++;
        matchedNumbers.push(ticketNumbers[i]);
      } else {
        break;
      }
    }
    if (leadingMatches === 4 && matchedLetter) {
      isWon = true;
      totalPrize = drawResult.jackpotAmount || 250000;
      prizeCategoryNameSi = '1 වන ත්‍යාගය (අක්ෂරය + තනි ඉලක්කම් 4ම)';
      prizeCategoryNameEn = '1st Prize (Letter + All 4 Digits)';
    } else if (leadingMatches === 4) {
      isWon = true;
      totalPrize = 50000;
      prizeCategoryNameSi = '2 වන ත්‍යාගය (තනි ඉලක්කම් 4 පමණක්)';
      prizeCategoryNameEn = '2nd Prize (All 4 Digits)';
    } else if (leadingMatches === 3) {
      isWon = true;
      totalPrize = 4000;
      prizeCategoryNameSi = '3 වන ත්‍යාගය (තනි ඉලක්කම් 3ක්)';
      prizeCategoryNameEn = '3rd Prize (3 Digits)';
    } else if (leadingMatches === 2) {
      isWon = true;
      totalPrize = 1000;
      prizeCategoryNameSi = '4 වන ත්‍යාගය (තනි ඉලක්කම් 2ක්)';
      prizeCategoryNameEn = '4th Prize (2 Digits)';
    } else if (matchedLetter) {
      isWon = true;
      totalPrize = 80;
      prizeCategoryNameSi = '5 වන ත්‍යාගය (අක්ෂරය පමණක්)';
      prizeCategoryNameEn = '5th Prize (Letter Only)';
    }
  }

  // --------------------------------------------------------------------------
  // VARIATION 2: Standard 4-Number + Letter Games (Shanida SW, Govisetha GS, Ada Kotipathi AK, Dhana Nidhanaya DN, Jayoda JD, etc.)
  // --------------------------------------------------------------------------
  else {
    const isShanida = drawResult.lotteryCode === 'SW';
    matchedNumbers = ticketNumbers.filter(n => officialNumbers.includes(n));
    const numMatches = matchedNumbers.length;

    if (numMatches >= 4 && matchedLetter) {
      isWon = true;
      totalPrize = drawResult.jackpotAmount || (isShanida ? 56131518 : 50000000);
      prizeCategoryNameSi = 'සුපිරි ජයමල්ල (අංක 4 + ඉංග්‍රීසි අකුර)';
      prizeCategoryNameEn = 'Super Jackpot (4 Numbers + Letter)';
    } else if (numMatches >= 4) {
      isWon = true;
      const p = prizes.find(pr => pr.matchRule === '4N');
      totalPrize = p ? p.prizeAmount : 2000000;
      prizeCategoryNameSi = 'අංක 4 ගැලපීම';
      prizeCategoryNameEn = '4 Numbers Match';
    } else if (numMatches === 3 && matchedLetter) {
      isWon = true;
      const p = prizes.find(pr => pr.matchRule === '3N+L');
      totalPrize = p ? p.prizeAmount : (isShanida ? 200000 : 100000);
      prizeCategoryNameSi = 'අංක 3 + ඉංග්‍රීසි අකුර';
      prizeCategoryNameEn = '3 Numbers + Letter';
    } else if (numMatches === 3) {
      isWon = true;
      const p = prizes.find(pr => pr.matchRule === '3N');
      totalPrize = p ? p.prizeAmount : (isShanida ? 4000 : 2500);
      prizeCategoryNameSi = 'අංක 3 ගැලපීම';
      prizeCategoryNameEn = '3 Numbers Match';
    } else if (numMatches === 2 && matchedLetter) {
      isWon = true;
      const p = prizes.find(pr => pr.matchRule === '2N+L');
      totalPrize = p ? p.prizeAmount : (isShanida ? 2000 : 1000);
      prizeCategoryNameSi = 'අංක 2 + ඉංග්‍රීසි අකුර';
      prizeCategoryNameEn = '2 Numbers + Letter';
    } else if (numMatches === 2) {
      isWon = true;
      const p = prizes.find(pr => pr.matchRule === '2N');
      totalPrize = p ? p.prizeAmount : (isShanida ? 200 : 100);
      prizeCategoryNameSi = 'අංක 2 ගැලපීම';
      prizeCategoryNameEn = '2 Numbers Match';
    } else if (numMatches === 1 && matchedLetter) {
      isWon = true;
      const p = prizes.find(pr => pr.matchRule === '1N+L');
      totalPrize = p ? p.prizeAmount : (isShanida ? 200 : 100);
      prizeCategoryNameSi = 'අංක 1 + ඉංග්‍රීසි අකුර';
      prizeCategoryNameEn = '1 Number + Letter';
    } else if (matchedLetter) {
      isWon = true;
      const p = prizes.find(pr => pr.matchRule === 'L');
      totalPrize = p ? p.prizeAmount : 40;
      prizeCategoryNameSi = 'ඉංග්‍රීසි අකුර පමණක්';
      prizeCategoryNameEn = 'English Letter Only';
    } else if (numMatches === 1) {
      isWon = true;
      const p = prizes.find(pr => pr.matchRule === '1N');
      totalPrize = p ? p.prizeAmount : 40;
      prizeCategoryNameSi = 'ඕනෑම තනි අංකයක් පමණක්';
      prizeCategoryNameEn = '1 Single Number';
    }
  }

  const formattedPrize = totalPrize.toLocaleString('en-US');

  return {
    isValidLottery: true,
    isFutureDraw: false,
    hasDrawResult: true,
    hasTicketNumbers: true,
    lotteryCode: drawResult.lotteryCode,
    lotteryName: drawResult.lotteryName,
    board: drawResult.board,
    drawNo: drawResult.drawNo,
    drawDate: (ticket.hasExplicitDate && ticket.drawDate) ? ticket.drawDate : drawResult.drawDate,
    ticketNumbers,
    ticketLetter: isZodiacGame ? undefined : ticket.ticketLetter,
    ticketZodiac: isZodiacGame ? resolvedTicketZodiac : undefined,
    ticketZodiacEn: isZodiacGame ? resolvedTicketZodiacEn : undefined,
    ticketSuperBall: ticket.ticketSuperBall,
    matchedNumbers,
    matchedIndices: matchedIndices.length > 0 ? matchedIndices : undefined,
    trailingMatches: trailingMatches > 0 ? trailingMatches : undefined,
    matchedLetter,
    matchedZodiac,
    matchedSuperBall,
    isWon,
    totalPrize,
    prizeCategory: prizeCategoryNameSi || prizeCategoryNameEn,
    messageSi: isWon
      ? `සුභ පැතුම්! ඔබ රු. ${formattedPrize}/= ක මුදලක් දිනා ඇත! (${prizeCategoryNameSi})`
      : 'මෙවර ඔබට ජයග්‍රහණයක් හිමිවී නොමැත. මීළඟ වර ඔබ දිනනු ඇත!',
    messageEn: isWon
      ? `You won Rupees ${formattedPrize}! (${prizeCategoryNameEn})`
      : 'You have lost this time, next time you may win!',
    messageTa: isWon
      ? `வாழ்த்துகள்! நீங்கள் ரூ. ${formattedPrize}/= வென்றுள்ளீர்கள்!`
      : 'இந்த முறை வெற்றி இல்லை, அடுத்த முறை நீங்கள் வெல்லலாம்!',
    drawResult,
    officialNumbers,
    officialLetter: isZodiacGame ? undefined : officialLetter,
    officialZodiac: isZodiacGame ? officialZodiac : undefined,
    officialZodiacEn: (isZodiacGame && normOfficialZodiac) ? normOfficialZodiac.en : undefined,
    officialSuperBall,
    officialDrawNo: drawResult.drawNo,
    officialDrawDate: drawResult.drawDate,
    officialSource,
    lotteryType,
    rawString: ticket.rawString,
  };
}
