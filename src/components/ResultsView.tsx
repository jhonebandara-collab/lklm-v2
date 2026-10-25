import React, { useState, useMemo } from 'react';
import { Search, Calendar, ChevronDown, ChevronUp, Database, CheckCircle, Clock, AlertCircle, RefreshCw } from 'lucide-react';
import { Language, LotteryResult, LotteryBoard } from '../types';
import { LOTTERY_DEFINITIONS } from '../data/lotteries';
import { TRANSLATIONS } from '../utils/translations';

interface ResultsViewProps {
  language: Language;
  results: LotteryResult[];
  lastSyncTime?: string;
  isOffline?: boolean;
  onSyncLive?: () => Promise<number>;
}

export const ResultsView: React.FC<ResultsViewProps> = ({
  language,
  results,
  lastSyncTime = new Date().toLocaleTimeString(),
  isOffline = false,
  onSyncLive,
}) => {
  const t = TRANSLATIONS[language];

  const [selectedBoard, setSelectedBoard] = useState<'ALL' | LotteryBoard>('ALL');
  const [selectedLotteryId, setSelectedLotteryId] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<string | null>(null);

  const handleTriggerSync = async () => {
    if (!onSyncLive || isSyncing) return;
    setIsSyncing(true);
    setSyncStatusMsg(null);
    try {
      const count = await onSyncLive();
      setSyncStatusMsg(language === 'si' ? `dlb.lk සහ nlb.lk මගින් ප්‍රතිඵල ${count} ක් සාර්ථකව යාවත්කාලීන විය!` : `Successfully synced ${count} live draws from dlb.lk & nlb.lk!`);
      setTimeout(() => setSyncStatusMsg(null), 4000);
    } catch {
      setSyncStatusMsg('Sync error. Please try again.');
    } finally {
      setIsSyncing(false);
    }
  };

  // Helper to calculate days remaining from 180-day (6-month) validity window
  const getValidityDetails = (drawDateStr: string) => {
    try {
      const drawDate = new Date(drawDateStr);
      const today = new Date();
      const diffMs = today.getTime() - drawDate.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const remainingDays = 180 - diffDays;

      if (remainingDays < 0) {
        return { isExpired: true, daysLeft: 0, text: t.ticketExpired };
      }
      return { 
        isExpired: false, 
        daysLeft: remainingDays, 
        text: language === 'si' ? `වලංගුයි (තව දින ${remainingDays})` : `${remainingDays} days valid` 
      };
    } catch {
      return { isExpired: false, daysLeft: 180, text: t.validity6Months };
    }
  };

  // Filter results
  const filteredResults = useMemo(() => {
    return results.filter(item => {
      // Board filter
      if (selectedBoard !== 'ALL' && item.board !== selectedBoard) {
        return false;
      }
      // Specific lottery filter
      if (selectedLotteryId !== 'ALL' && item.lotteryId !== selectedLotteryId) {
        return false;
      }
      // Date filter
      if (selectedDate && item.drawDate !== selectedDate) {
        return false;
      }
      // Search query (Draw number or lottery name)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = item.lotteryName.toLowerCase().includes(q);
        const matchesDraw = item.drawNo.toString().includes(q);
        if (!matchesName && !matchesDraw) return false;
      }
      return true;
    });
  }, [results, selectedBoard, selectedLotteryId, selectedDate, searchQuery]);

  return (
    <div className="space-y-4">
      
      {/* Top Banner & Sync Status */}
      <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center space-x-2">
          <Database className="w-4 h-4 text-emerald-400" />
          <span className="font-semibold text-slate-200">
            {language === 'si' ? 'නිල ලොතරැයි ප්‍රතිඵල දත්ත පද්ධතිය' : 'Official Lottery Results Database'}
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono">
            {results.length} Draws
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {onSyncLive && (
            <button
              onClick={handleTriggerSync}
              disabled={isSyncing}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center space-x-1.5 shadow-md shadow-emerald-600/20 active:scale-95 transition-all disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? (language === 'si' ? 'සම්බන්ධ වෙමින්...' : 'Syncing...') : (language === 'si' ? 'dlb.lk & nlb.lk සජීවීව Sync කරන්න' : 'Sync Live Official Sites')}</span>
            </button>
          )}
          <span className="text-slate-400 text-[11px] hidden sm:inline">
            Updated: {lastSyncTime}
          </span>
        </div>
      </div>

      {syncStatusMsg && (
        <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center space-x-2 animate-fade-in">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{syncStatusMsg}</span>
        </div>
      )}

      {/* Filters Bar */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 shadow-lg">
        
        {/* Board Buttons (All, DLB, NLB) */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setSelectedBoard('ALL')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
              selectedBoard === 'ALL'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {t.filterAll}
          </button>
          <button
            onClick={() => setSelectedBoard('DLB')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
              selectedBoard === 'DLB'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {t.filterDLB}
          </button>
          <button
            onClick={() => setSelectedBoard('NLB')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
              selectedBoard === 'NLB'
                ? 'bg-yellow-600 text-slate-950 shadow-md shadow-yellow-600/20'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {t.filterNLB}
          </button>
        </div>

        {/* Dropdown & Date & Search Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          
          {/* Lottery Dropdown */}
          <select
            value={selectedLotteryId}
            onChange={(e) => setSelectedLotteryId(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs font-semibold text-white focus:outline-none focus:border-amber-500"
          >
            <option value="ALL">
              {language === 'si' ? '-- සියලුම ලොතරැයි වර්ග --' : '-- All Lottery Types --'}
            </option>
            {LOTTERY_DEFINITIONS.filter(d => selectedBoard === 'ALL' || d.board === selectedBoard).map(def => (
              <option key={def.id} value={def.id}>
                {language === 'si' ? `${def.nameSi} (${def.board})` : `${def.nameEn} (${def.board})`}
              </option>
            ))}
          </select>

          {/* Date Picker */}
          <div className="relative">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs font-semibold text-white focus:outline-none focus:border-amber-500"
            />
            <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3 pointer-events-none" />
          </div>

          {/* Search Input */}
          <div className="relative">
            <input
              type="text"
              placeholder={t.searchLottery}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs font-semibold text-white focus:outline-none focus:border-amber-500"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3 pointer-events-none" />
          </div>

        </div>

        {/* Active Filters Clear Button if active */}
        {(selectedBoard !== 'ALL' || selectedLotteryId !== 'ALL' || selectedDate || searchQuery) && (
          <div className="flex items-center justify-between pt-1 text-xs">
            <span className="text-slate-400">
              Found <strong className="text-amber-400">{filteredResults.length}</strong> matching draw results
            </span>
            <button
              onClick={() => {
                setSelectedBoard('ALL');
                setSelectedLotteryId('ALL');
                setSelectedDate('');
                setSearchQuery('');
              }}
              className="text-amber-400 hover:underline font-semibold"
            >
              Reset Filters
            </button>
          </div>
        )}

      </div>

      {/* Results List */}
      <div className="space-y-3">
        {filteredResults.length === 0 ? (
          <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-2">
            <AlertCircle className="w-8 h-8 text-slate-500 mx-auto" />
            <p className="font-bold text-slate-300 text-sm">
              {language === 'si' ? 'ගැලපෙන ප්‍රතිඵල හමු නොවීය' : 'No matching lottery draw results found'}
            </p>
            <p className="text-xs text-slate-500">
              Try adjusting the date range or lottery name filter.
            </p>
          </div>
        ) : (
          filteredResults.slice(0, 30).map((item) => {
            const isExpanded = expandedCardId === item.id;
            const validity = getValidityDetails(item.drawDate);

            return (
              <div
                key={item.id}
                className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all shadow-md space-y-3"
              >
                {/* Header info */}
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                        item.board === 'DLB' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}>
                        {item.board}
                      </span>
                      <h4 className="font-black text-white text-base sm:text-lg">
                        {item.lotteryName}
                      </h4>
                    </div>

                    <div className="flex items-center space-x-3 text-xs text-slate-400 mt-1">
                      <span className="font-semibold text-amber-400/90">
                        {t.drawNo}: <strong className="text-white font-mono font-black text-sm">#{item.drawNo}</strong>
                      </span>
                      <span>&bull;</span>
                      <span className="flex items-center space-x-1">
                        <Calendar className="w-3 h-3 text-slate-500" />
                        <span>{item.drawDate}</span>
                      </span>
                    </div>
                  </div>

                  {/* 180-Day Validity Badge */}
                  <div className="text-right">
                    <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      validity.isExpired
                        ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                        : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    }`}>
                      <Clock className="w-2.5 h-2.5" />
                      <span>{validity.text}</span>
                    </span>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      {language === 'si' ? 'දින 180 නීත්‍යානුකූල වලංගුයි' : '180-Day Rule'}
                    </p>
                  </div>
                </div>

                {/* Winning Numbers Row */}
                <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
                      {t.winningNumbers}:
                    </span>
                    <div className="flex items-center space-x-2">
                      {item.numbers.map((num, i) => (
                        <div
                          key={i}
                          className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-tr from-amber-500 via-amber-400 to-yellow-300 text-slate-950 font-black text-sm sm:text-base flex items-center justify-center shadow-lg shadow-amber-500/20"
                        >
                          {num}
                        </div>
                      ))}

                      {/* Letter Ball */}
                      {item.letter && (
                        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-tr from-blue-600 to-cyan-400 text-white font-black text-sm sm:text-base flex items-center justify-center shadow-lg shadow-blue-500/20" title="Winning Letter">
                          {item.letter}
                        </div>
                      )}

                      {/* Zodiac Ball */}
                      {item.zodiac && (
                        <div className="px-3 h-9 sm:h-10 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-500 text-white font-black text-xs sm:text-sm flex items-center justify-center shadow-lg shadow-purple-500/20" title="Winning Zodiac (Lagna)">
                          {item.zodiac}
                        </div>
                      )}

                      {/* Super Ball / Special Number */}
                      {item.superBall !== undefined && (
                        <div className="flex flex-col items-center">
                          <div
                            className={`h-9 sm:h-10 rounded-full font-black font-mono text-xs sm:text-sm flex items-center justify-center shadow-lg transition-all ${
                              item.lotteryCode === 'SW'
                                ? 'min-w-[4.75rem] px-2.5 bg-gradient-to-tr from-sky-400 via-indigo-500 to-blue-600 text-white shadow-sky-500/30 ring-2 ring-sky-300 tracking-tight'
                                : 'w-9 sm:w-10 bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 shadow-emerald-500/20'
                            }`}
                            title={item.lotteryCode === 'SW' ? 'Special Number (විශේෂ අංකය)' : 'Super Ball (සුපිරි අංකය)'}
                          >
                            {item.lotteryCode === 'SW' ? String(item.superBall).padStart(5, '0') : (item.superBall < 10 ? `0${item.superBall}` : item.superBall)}
                          </div>
                          <span className="text-[9px] text-amber-300/90 font-bold mt-0.5">
                            {item.lotteryCode === 'SW'
                              ? (language === 'si' ? 'විශේෂ අංකය' : 'Special No')
                              : (language === 'si' ? 'සුපිරි' : 'Super')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Jackpot Prize Pool */}
                  <div className="text-right">
                    <span className="text-[10px] uppercase tracking-wider text-amber-400/90 font-bold block">
                      {language === 'si' ? 'ඇස්තමේන්තුගත ජයමල්ල' : language === 'ta' ? 'மதிப்பிடப்பட்ட ஜாக்பாட்' : 'Estimated Jackpot'}
                    </span>
                    <span className="text-lg sm:text-xl font-black text-amber-400">
                      Rs. {(item.jackpotAmount || 50000000).toLocaleString('en-US')}/=
                    </span>
                    <span className="text-[9px] text-slate-400 block -mt-0.5">
                      {language === 'si' ? '(දිනුම් ඇදීමේ ත්‍යාග සංචිතය)' : '(Official Draw Prize Pool)'}
                    </span>
                  </div>
                </div>

                {/* Toggle Prize Structure Button */}
                <button
                  onClick={() => setExpandedCardId(isExpanded ? null : item.id)}
                  className="w-full py-1.5 px-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-[11px] font-semibold text-slate-400 hover:text-white flex items-center justify-center space-x-1 transition-colors"
                >
                  <span>{t.prizeStructure}</span>
                  {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>

                {/* Collapsible Prize Breakdown Table */}
                {isExpanded && item.prizes && (
                  <div className="pt-2 border-t border-slate-800 text-xs overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="text-slate-400 border-b border-slate-800 text-[11px]">
                          <th className="py-1.5 px-2">Category</th>
                          <th className="py-1.5 px-2">Match Rule</th>
                          <th className="py-1.5 px-2 text-right">Prize (LKR)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/50">
                        {item.prizes.map((p, idx) => (
                          <tr key={idx} className="hover:bg-slate-800/40">
                            <td className="py-1.5 px-2 text-slate-200 font-medium">
                              {language === 'si' ? p.categoryNameSi : p.categoryNameEn}
                            </td>
                            <td className="py-1.5 px-2 text-slate-400 font-mono text-[11px]">
                              {p.matchRule}
                            </td>
                            <td className="py-1.5 px-2 text-right font-bold text-amber-400">
                              Rs. {p.prizeAmount.toLocaleString('en-US')}/=
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

              </div>
            );
          })
        )}
      </div>

    </div>
  );
};
