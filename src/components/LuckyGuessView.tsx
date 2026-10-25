import React, { useState, useMemo } from 'react';
import { Sparkles, Crown, Compass, Calendar, Clock, User, Copy, Check, TrendingUp, Flame, Filter, Search, Award, RefreshCw } from 'lucide-react';
import { Language, LuckyGuessInput, LuckyGuessResult, LotteryResult } from '../types';
import { LOTTERY_DEFINITIONS, INITIAL_RESULTS, SRI_LANKA_ZODIAC_SIGNS } from '../data/lotteries';
import { TRANSLATIONS } from '../utils/translations';
import { calculateLuckyGuess } from '../utils/numerology';

interface LuckyGuessViewProps {
  language: Language;
  allResults?: LotteryResult[];
}

export const LuckyGuessView: React.FC<LuckyGuessViewProps> = ({ language, allResults = [] }) => {
  const t = TRANSLATIONS[language];

  // Pool of draws to analyze: use live fetched draws from props or fallback to initial historical records
  const drawsPool = useMemo(() => {
    return allResults && allResults.length > 0 ? allResults : INITIAL_RESULTS;
  }, [allResults]);

  const [formData, setFormData] = useState<LuckyGuessInput>({
    firstName: 'Kamal',
    lastName: 'Perera',
    dateOfBirth: '1992-05-18',
    birthTime: '09:30',
    selectedLotteryId: 'dlb-ada-kotipathi',
  });

  const [mainResult, setMainResult] = useState<LuckyGuessResult | null>(() => {
    return calculateLuckyGuess({
      firstName: 'Kamal',
      lastName: 'Perera',
      dateOfBirth: '1992-05-18',
      birthTime: '09:30',
      selectedLotteryId: 'dlb-ada-kotipathi',
    });
  });

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [boardFilter, setBoardFilter] = useState<'ALL' | 'DLB' | 'NLB'>('ALL');
  const [searchLottery, setSearchLottery] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const res = calculateLuckyGuess(formData);
    setMainResult(res);
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSelectLottery = (lotteryId: string) => {
    const updated = { ...formData, selectedLotteryId: lotteryId };
    setFormData(updated);
    const res = calculateLuckyGuess(updated);
    setMainResult(res);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Historical Analysis per lottery
  const lotteryWisePredictions = useMemo(() => {
    return LOTTERY_DEFINITIONS.map(def => {
      // 1. Gather all past draws for this lottery
      const matchingDraws = drawsPool.filter(d => 
        d.lotteryCode === def.code || 
        d.lotteryId === def.id || 
        d.lotteryName?.toLowerCase().includes(def.nameEn.toLowerCase())
      );

      // 2. Frequency counting of winning numbers
      const numFreq: Record<number, number> = {};
      const letterFreq: Record<string, number> = {};
      const zodiacFreq: Record<string, number> = {};
      const superFreq: Record<number, number> = {};

      matchingDraws.forEach(d => {
        (d.numbers || []).forEach(n => {
          numFreq[n] = (numFreq[n] || 0) + 1;
        });
        if (d.letter) {
          letterFreq[d.letter] = (letterFreq[d.letter] || 0) + 1;
        }
        if (d.zodiac) {
          zodiacFreq[d.zodiac] = (zodiacFreq[d.zodiac] || 0) + 1;
        }
        if (d.superBall !== undefined) {
          superFreq[d.superBall] = (superFreq[d.superBall] || 0) + 1;
        }
      });

      // Sort numbers by highest frequency in past draws
      const hotNumbers = Object.entries(numFreq)
        .map(([numStr, count]) => ({ num: parseInt(numStr, 10), count }))
        .sort((a, b) => b.count - a.count);

      const topLetters = Object.entries(letterFreq)
        .map(([letter, count]) => ({ letter, count }))
        .sort((a, b) => b.count - a.count);

      const topZodiacs = Object.entries(zodiacFreq)
        .map(([zodiac, count]) => ({ zodiac, count }))
        .sort((a, b) => b.count - a.count);

      const topSuperBalls = Object.entries(superFreq)
        .map(([sStr, count]) => ({ num: parseInt(sStr, 10), count }))
        .sort((a, b) => b.count - a.count);

      // 3. Generate Personal Lucky Guess for this specific lottery
      const customGuess = calculateLuckyGuess({
        ...formData,
        selectedLotteryId: def.id,
      });

      // 4. Blend personal numbers with top historical hot numbers (Hot + Numerology Affinity)
      const blendedNumbers: number[] = [...customGuess.luckyNumbers];
      
      // If historical data exists, ensure at least 2 top-frequent numbers are harmonized into the set
      if (hotNumbers.length >= 3 && def.code !== 'MS' && def.code !== 'SDS') {
        const topHotPool = hotNumbers.slice(0, 6).map(h => h.num);
        // Replace or blend if suitable
        topHotPool.forEach(hotNum => {
          if (!blendedNumbers.includes(hotNum) && blendedNumbers.length < def.numbersCount) {
            blendedNumbers.push(hotNum);
          }
        });
      }

      // Ensure proper count and sorting
      let finalNumbers = blendedNumbers.slice(0, def.numbersCount);
      if (def.code !== 'MS' && def.code !== 'SDS') {
        finalNumbers = finalNumbers.sort((a, b) => a - b);
      }

      // Auspicious letter & zodiac
      const finalLetter = topLetters.length > 0 && Math.random() > 0.5 
        ? topLetters[0].letter 
        : customGuess.luckyLetter;

      const finalZodiac = topZodiacs.length > 0 && Math.random() > 0.5
        ? topZodiacs[0].zodiac
        : customGuess.luckyZodiac;

      let finalSuper = customGuess.luckySuperBall;
      if (def.hasSuperBall && topSuperBalls.length > 0 && def.code !== 'SW') {
        finalSuper = topSuperBalls[0].num;
      }

      const top3Hot = hotNumbers.slice(0, 3).map(h => h.num);

      return {
        lotteryDef: def,
        drawsAnalyzed: matchingDraws.length,
        topHotNumbers: top3Hot,
        luckyNumbers: finalNumbers,
        luckyLetter: def.hasLetter ? finalLetter : undefined,
        luckyZodiac: def.hasZodiac ? finalZodiac : undefined,
        luckySuperBall: def.hasSuperBall ? finalSuper : undefined,
        resonanceScore: customGuess.confidenceScore,
        insight: customGuess.numerologyInsight,
      };
    });
  }, [drawsPool, formData]);

  // Filtered lottery-wise list
  const filteredLotteryPredictions = useMemo(() => {
    return lotteryWisePredictions.filter(item => {
      if (boardFilter !== 'ALL' && item.lotteryDef.board !== boardFilter) return false;
      if (searchLottery.trim()) {
        const q = searchLottery.toLowerCase();
        const matchesName = item.lotteryDef.nameEn.toLowerCase().includes(q) || item.lotteryDef.nameSi.includes(q);
        const matchesCode = item.lotteryDef.code.toLowerCase().includes(q);
        if (!matchesName && !matchesCode) return false;
      }
      return true;
    });
  }, [lotteryWisePredictions, boardFilter, searchLottery]);

  const targetLottery = LOTTERY_DEFINITIONS.find(d => d.id === formData.selectedLotteryId) || LOTTERY_DEFINITIONS[0];

  return (
    <div className="space-y-6">
      
      {/* Premium Hero Banner */}
      <div className="relative rounded-2xl bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 border border-purple-500/40 p-5 shadow-2xl overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex items-start justify-between">
          <div className="space-y-1">
            <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-purple-500/30 border border-purple-400/40 text-purple-200 text-[10px] font-black uppercase tracking-wider">
              <Crown className="w-3.5 h-3.5 text-amber-300" />
              <span>{language === 'si' ? 'ඓතිහාසික ප්‍රතිඵල හා ජන්ම අංක විශ්ලේෂණය' : 'Historical Draws & Numerology Analytics'}</span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-white">
              {t.luckyGuessTitle}
            </h2>
            <p className="text-xs text-purple-200/80 max-w-xl leading-relaxed">
              {language === 'si' 
                ? 'පසුගිය නිල දිනුම් ඇදීම් වල වැඩිපුරම ඇදුණු අංක (Hot Numbers) සහ ඔබගේ උපන් දිනය, වේලාව හා නම අනුව ගණනය කරන ලද වාසනාවන්ත අංක අනාවැකිය.' 
                : 'Intelligent prediction synthesized from past official winning draw frequencies (Hot Numbers) and your personalized numerology profile.'}
            </p>
          </div>
        </div>
      </div>

      {/* Input Form & Parameters */}
      <form onSubmit={handleSubmit} className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-lg">
        <h3 className="font-bold text-white text-sm flex items-center space-x-2">
          <Compass className="w-4 h-4 text-amber-400" />
          <span>{language === 'si' ? 'ඔබගේ ජන්ම විස්තර සහ මූලික ලොතරැයිය තෝරන්න:' : 'Enter Your Birth Details & Primary Target Lottery:'}</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          
          {/* First Name */}
          <div className="space-y-1">
            <label className="text-slate-400 font-semibold">{t.firstName}</label>
            <div className="relative">
              <input
                type="text"
                required
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-semibold focus:outline-none focus:border-purple-500"
                placeholder="e.g. Kamal"
              />
              <User className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
            </div>
          </div>

          {/* Last Name */}
          <div className="space-y-1">
            <label className="text-slate-400 font-semibold">{t.lastName}</label>
            <div className="relative">
              <input
                type="text"
                required
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-semibold focus:outline-none focus:border-purple-500"
                placeholder="e.g. Perera"
              />
              <User className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
            </div>
          </div>

          {/* Date of Birth */}
          <div className="space-y-1">
            <label className="text-slate-400 font-semibold">{t.dob}</label>
            <div className="relative">
              <input
                type="date"
                required
                value={formData.dateOfBirth}
                onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-semibold focus:outline-none focus:border-purple-500"
              />
              <Calendar className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
            </div>
          </div>

          {/* Birth Time */}
          <div className="space-y-1">
            <label className="text-slate-400 font-semibold">{t.birthTime}</label>
            <div className="relative">
              <input
                type="time"
                value={formData.birthTime}
                onChange={(e) => setFormData({ ...formData, birthTime: e.target.value })}
                className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-semibold focus:outline-none focus:border-purple-500"
              />
              <Clock className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
            </div>
          </div>

          {/* Target Lottery */}
          <div className="sm:col-span-2 space-y-1">
            <label className="text-slate-400 font-semibold">{t.selectTargetLottery}</label>
            <select
              value={formData.selectedLotteryId}
              onChange={(e) => setFormData({ ...formData, selectedLotteryId: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-semibold focus:outline-none focus:border-purple-500 text-xs"
            >
              {LOTTERY_DEFINITIONS.map(def => (
                <option key={def.id} value={def.id}>
                  {def.board}: {def.nameEn} ({def.nameSi}) &bull; Draws: {def.drawDays.join(', ')}
                </option>
              ))}
            </select>
          </div>

        </div>

        {/* Submit Generate Button */}
        <button
          type="submit"
          className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-amber-500 hover:from-purple-500 hover:to-amber-400 text-white font-black text-xs sm:text-sm flex items-center justify-center space-x-2 transition-all shadow-lg shadow-purple-600/30 active:scale-98"
        >
          <Sparkles className="w-4 h-4 text-amber-300" />
          <span>{t.calcLuckyBtn}</span>
        </button>
      </form>

      {/* Target Lottery Main Prediction Card */}
      {mainResult && (
        <div className="p-5 rounded-2xl bg-slate-900 border border-purple-500/40 space-y-4 shadow-xl animate-fadeIn">
          
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div>
              <span className="text-[10px] uppercase font-bold text-purple-300 px-2 py-0.5 rounded bg-purple-500/20 border border-purple-500/30">
                {targetLottery.board} &bull; {targetLottery.nameEn} ({targetLottery.nameSi})
              </span>
              <h3 className="text-base sm:text-lg font-black text-white mt-1">
                {language === 'si' ? 'ඔබගේ පෞද්ගලික ජයග්‍රාහී අනාවැකිය' : 'Your Primary Winning Prediction'}
              </h3>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-[11px] text-amber-400 font-bold bg-amber-400/10 border border-amber-400/30 px-2 py-1 rounded-lg">
                Resonance: {mainResult.confidenceScore}%
              </span>
              <button
                onClick={() => handleCopy('main', `LK Lottery Master - ${targetLottery.nameEn}: ${mainResult.luckyNumbers.join(', ')} ${mainResult.luckyLetter ? `[${mainResult.luckyLetter}]` : ''} ${mainResult.luckyZodiac ? `(${mainResult.luckyZodiac})` : ''}`)}
                className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                {copiedId === 'main' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedId === 'main' ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          {/* Big Golden Numbers Display */}
          <div className="p-4 rounded-xl bg-gradient-to-b from-purple-950/40 to-slate-950 border border-purple-500/30 text-center space-y-3">
            <span className="text-xs uppercase font-extrabold text-amber-400 tracking-wider">
              {t.recommendedNumbers}
            </span>

            <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3">
              {mainResult.luckyNumbers.map((num, i) => (
                <div
                  key={i}
                  className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-tr from-amber-500 via-amber-400 to-yellow-300 text-slate-950 font-black text-lg sm:text-xl flex items-center justify-center shadow-lg shadow-amber-500/30 hover:scale-105 transition-transform"
                >
                  {num}
                </div>
              ))}

              {/* Lucky Letter */}
              {targetLottery.hasLetter && (
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-tr from-blue-600 to-cyan-400 text-white font-black text-lg sm:text-xl flex items-center justify-center shadow-lg shadow-blue-500/30 hover:scale-105 transition-transform" title="Lucky Letter">
                  {mainResult.luckyLetter}
                </div>
              )}

              {/* Lucky Zodiac */}
              {targetLottery.hasZodiac && (
                <div className="px-4 h-12 sm:h-14 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-500 text-white font-black text-xs sm:text-sm flex items-center justify-center shadow-lg shadow-purple-500/30" title="Lucky Zodiac (Lagna)">
                  {mainResult.lagnaNameSi}
                </div>
              )}

              {/* Lucky Super Ball */}
              {mainResult.luckySuperBall && (
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 font-black text-lg sm:text-xl flex items-center justify-center shadow-lg shadow-emerald-500/30" title="Lucky Super Ball">
                  {mainResult.luckySuperBall}
                </div>
              )}
            </div>
          </div>

          {/* Numerological & Astrological Data Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
            
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-0.5">
              <span className="text-[10px] text-slate-400 font-semibold">{t.lifePath}</span>
              <p className="text-base font-black text-amber-400">{mainResult.lifePathNumber}</p>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-0.5">
              <span className="text-[10px] text-slate-400 font-semibold">{t.destinyNum}</span>
              <p className="text-base font-black text-purple-400">{mainResult.destinyNumber}</p>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-0.5">
              <span className="text-[10px] text-slate-400 font-semibold">{t.vedicLagna}</span>
              <p className="text-sm font-bold text-white truncate">{mainResult.lagnaNameSi} ({mainResult.lagnaNameEn})</p>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-0.5">
              <span className="text-[10px] text-slate-400 font-semibold">{t.rulingPlanet}</span>
              <p className="text-sm font-bold text-emerald-400 truncate">{mainResult.rulingPlanetSi}</p>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-0.5">
              <span className="text-[10px] text-slate-400 font-semibold">{t.auspiciousLetter}</span>
              <p className="text-base font-black text-blue-400">{mainResult.luckyLetter}</p>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-0.5">
              <span className="text-[10px] text-slate-400 font-semibold">{t.auspiciousColor}</span>
              <p className="text-sm font-bold text-yellow-300 truncate">{mainResult.auspiciousColor}</p>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-0.5 col-span-2">
              <span className="text-[10px] text-slate-400 font-semibold">{t.auspiciousDays}</span>
              <p className="text-sm font-bold text-indigo-300">{mainResult.auspiciousDays.join(', ')}</p>
            </div>

          </div>

          {/* AI Synthesis & Historical Explanation */}
          <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-800/30 text-xs text-purple-200 leading-relaxed space-y-2">
            <p className="font-semibold text-purple-300">{mainResult.numerologyInsight}</p>
            <p className="text-slate-400">{mainResult.patternAnalysis}</p>
          </div>

        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* SECTION: LOTTERY-WISE HISTORICAL LUCKY GUESS LIST (Requested by User) */}
      {/* --------------------------------------------------------------------- */}
      <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
        
        {/* Header & Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-amber-400" />
              <h3 className="font-black text-white text-base sm:text-lg">
                {language === 'si' ? 'ලොතරැයි අනුව ඓතිහාසික වාසනාවන්ත අංක' : 'Lottery-Wise Historical Lucky Predictions'}
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {language === 'si'
                ? `පසුගිය නිල දිනුම් ඇදීම් (${drawsPool.length}) වල වැඩිපුරම ඇදුණු අංක (Hot Numbers) සහ ඔබේ ජන්ම අංක පදනම්ව ගණනය කරන ලදී`
                : `Synthesized from ${drawsPool.length} past official draws checking hot frequencies & your numerology profile`}
            </p>
          </div>

          {/* Board Filter & Search */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Board Buttons */}
            <div className="flex bg-slate-800 p-0.5 rounded-lg border border-slate-700">
              <button
                type="button"
                onClick={() => setBoardFilter('ALL')}
                className={`px-2.5 py-1 rounded-md font-bold transition-colors ${
                  boardFilter === 'ALL' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setBoardFilter('DLB')}
                className={`px-2.5 py-1 rounded-md font-bold transition-colors ${
                  boardFilter === 'DLB' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                DLB
              </button>
              <button
                type="button"
                onClick={() => setBoardFilter('NLB')}
                className={`px-2.5 py-1 rounded-md font-bold transition-colors ${
                  boardFilter === 'NLB' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                NLB
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                placeholder={language === 'si' ? 'ලොතරැයිය සොයන්න...' : 'Search lottery...'}
                value={searchLottery}
                onChange={(e) => setSearchLottery(e.target.value)}
                className="pl-7 pr-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white font-medium text-xs focus:outline-none focus:border-amber-400 w-36 sm:w-44"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2" />
            </div>
          </div>
        </div>

        {/* Lottery Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filteredLotteryPredictions.map(item => {
            const def = item.lotteryDef;
            const isTarget = def.id === formData.selectedLotteryId;

            return (
              <div
                key={def.id}
                className={`p-4 rounded-xl transition-all border ${
                  isTarget 
                    ? 'bg-gradient-to-b from-purple-950/40 to-slate-900 border-purple-500/60 shadow-lg shadow-purple-900/20' 
                    : 'bg-slate-950/80 hover:bg-slate-850/80 border-slate-800 hover:border-slate-700 shadow-sm'
                }`}
              >
                {/* Card Header */}
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                      def.board === 'DLB' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}>
                      {def.board}
                    </span>
                    <span className="font-black text-white text-sm">
                      {def.nameEn} <span className="text-slate-400 font-semibold text-xs">({def.nameSi})</span>
                    </span>
                  </div>

                  <div className="flex items-center space-x-1.5">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-700/50 text-emerald-300 font-bold">
                      {item.resonanceScore}% Match
                    </span>
                  </div>
                </div>

                {/* Historical Stats Pill */}
                <div className="mb-3 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px] flex flex-wrap items-center justify-between gap-1">
                  <span className="text-slate-400 flex items-center gap-1">
                    <Flame className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>{language === 'si' ? 'වැඩිපුරම ඇදුණු (Hot):' : 'Hot Numbers:'}</span>
                    <strong className="text-amber-300 font-mono">
                      {item.topHotNumbers.length > 0 ? item.topHotNumbers.join(', ') : '14, 28, 52'}
                    </strong>
                  </span>
                  <span className="text-slate-500 text-[10px]">
                    {item.drawsAnalyzed > 0 
                      ? (language === 'si' ? `පසුගිය දිනුම් ${item.drawsAnalyzed} කින්` : `${item.drawsAnalyzed} draws analyzed`) 
                      : (language === 'si' ? 'ඓතිහාසික සංඛ්‍යානය' : 'Historical Data')}
                  </span>
                </div>

                {/* Predicted Lottery Balls Row */}
                <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                    {/* Numbers Balls */}
                    {item.luckyNumbers.map((num, idx) => (
                      <span
                        key={idx}
                        className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center shadow-md shadow-amber-500/20"
                        title="Lucky Number"
                      >
                        {num < 10 && def.code !== 'MS' && def.code !== 'SDS' ? `0${num}` : num}
                      </span>
                    ))}

                    {/* Letter Ball */}
                    {item.luckyLetter && (
                      <span
                        className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-tr from-blue-600 to-cyan-400 text-white font-black text-xs sm:text-sm flex items-center justify-center shadow-md shadow-blue-500/20"
                        title="Lucky Letter"
                      >
                        {item.luckyLetter}
                      </span>
                    )}

                    {/* Zodiac Badge */}
                    {item.luckyZodiac && (
                      <span
                        className="px-2.5 h-8 sm:h-9 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-500 text-white font-black text-xs flex items-center justify-center shadow-md shadow-purple-500/20"
                        title="Lucky Zodiac"
                      >
                        {item.luckyZodiac}
                      </span>
                    )}

                    {/* Super Ball */}
                    {item.luckySuperBall !== undefined && (
                      <span
                        className={`h-8 sm:h-9 rounded-full font-black text-xs flex items-center justify-center shadow-md ${
                          def.code === 'SW'
                            ? 'px-2.5 bg-gradient-to-tr from-indigo-500 to-blue-400 text-white'
                            : 'w-8 sm:w-9 bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950'
                        }`}
                        title="Lucky Special / Super Ball"
                      >
                        {item.luckySuperBall}
                      </span>
                    )}
                  </div>

                  {/* Actions: Copy & Select */}
                  <div className="flex items-center space-x-1.5 ml-auto">
                    <button
                      type="button"
                      onClick={() => handleCopy(def.id, `${def.nameEn}: ${item.luckyNumbers.join(', ')} ${item.luckyLetter ? `[${item.luckyLetter}]` : ''} ${item.luckyZodiac ? `(${item.luckyZodiac})` : ''}`)}
                      className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all text-xs"
                      title={language === 'si' ? 'අංක පිටපත් කරන්න' : 'Copy Numbers'}
                    >
                      {copiedId === def.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSelectLottery(def.id)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        isTarget
                          ? 'bg-purple-600 text-white shadow-sm'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white'
                      }`}
                      title={language === 'si' ? 'ප්‍රධාන ලොතරැයිය ලෙස තෝරන්න' : 'Select as target'}
                    >
                      {isTarget ? (language === 'si' ? 'තෝරා ඇත ✓' : 'Selected') : (language === 'si' ? 'තෝරන්න' : 'Select')}
                    </button>
                  </div>
                </div>

                {/* Footer notes */}
                <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500">
                  <span>Draws: {def.drawDays.slice(0, 3).join(', ')}{def.drawDays.length > 3 ? '...' : ''}</span>
                  <span className="text-amber-400/80">Max: {def.numberRangeMax || 75} numbers</span>
                </div>

              </div>
            );
          })}
        </div>

      </div>

    </div>
  );
};
