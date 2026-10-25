import React, { useState, useMemo } from 'react';
import {
  User,
  Mail,
  Lock,
  LogIn,
  UserPlus,
  Trophy,
  History,
  Download,
  Calendar,
  Filter,
  Search,
  CheckCircle2,
  XCircle,
  LogOut,
  Sparkles,
  QrCode,
  Shield,
  Clock,
  ArrowRight
} from 'lucide-react';
import { Language, ScanRecord, UserAccount } from '../types';
import { LOTTERY_DEFINITIONS } from '../data/lotteries';
import { TRANSLATIONS } from '../utils/translations';

interface MyAccountViewProps {
  language: Language;
  currentUser: UserAccount | null;
  history: ScanRecord[];
  onLoginSuccess: (user: UserAccount) => void;
  onLogout: () => void;
  onClearHistory: () => void;
  onOpenScanner: () => void;
}

export const MyAccountView: React.FC<MyAccountViewProps> = ({
  language,
  currentUser,
  history,
  onLoginSuccess,
  onLogout,
  onClearHistory,
  onOpenScanner,
}) => {
  const t = TRANSLATIONS[language];

  // Auth Form State (when logged out)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // History Filter State (when logged in)
  const [lotteryFilter, setLotteryFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'WON' | 'LOST'>('ALL');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Filter history relevant to this user
  const userScans = useMemo(() => {
    if (!currentUser) return [];
    const currentEmail = currentUser.email.toLowerCase();
    // Return records matching this user's email, userId, or all records in session if single user
    return history.filter(
      item =>
        !item.userEmail ||
        item.userEmail.toLowerCase() === currentEmail ||
        (item.userId && item.userId === currentUser.id)
    );
  }, [history, currentUser]);

  // User Winnings Metrics
  const totalScans = userScans.length;
  const wins = userScans.filter(h => h.won);
  const totalWins = wins.length;
  const totalWonAmount = wins.reduce((acc, h) => acc + h.prizeAmount, 0);
  const winRate = totalScans > 0 ? Math.round((totalWins / totalScans) * 100) : 0;

  // Filtered User Scans
  const filteredUserScans = useMemo(() => {
    return userScans.filter(item => {
      if (lotteryFilter !== 'ALL' && item.lotteryName !== lotteryFilter) return false;
      if (statusFilter === 'WON' && !item.won) return false;
      if (statusFilter === 'LOST' && item.won) return false;
      if (dateFilter && !item.timestamp.startsWith(dateFilter) && item.drawDate !== dateFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = item.lotteryName.toLowerCase().includes(q);
        const matchesDraw = item.drawNo.toString().includes(q);
        const matchesLetter = item.ticketLetter?.toLowerCase() === q;
        const matchesZodiac = item.ticketZodiac?.toLowerCase().includes(q);
        if (!matchesName && !matchesDraw && !matchesLetter && !matchesZodiac) return false;
      }
      return true;
    });
  }, [userScans, lotteryFilter, statusFilter, dateFilter, searchQuery]);

  // Handle Login / Registration
  const handleSubmitAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);

    const endpoint = authMode === 'register' ? '/api/auth/register' : '/api/auth/login';
    const payload = authMode === 'register' ? { email, password, name } : { email, password };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      onLoginSuccess(data.user);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const response = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'jhonebandara@gmail.com',
          name: 'Jhone Bandara',
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Google login failed');

      onLoginSuccess(data.user);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickDemo = (role: 'user' | 'admin') => {
    if (role === 'admin') {
      setEmail('admin@lklottery.lk');
      setPassword('admin123@password');
    } else {
      setEmail('jhonebandara@gmail.com');
      setPassword('password123');
    }
  };

  // Export User CSV
  const handleExportCSV = () => {
    if (userScans.length === 0) return;
    const headers = [
      'Timestamp',
      'Board',
      'Lottery',
      'Draw No',
      'Draw Date',
      'Numbers',
      'Letter',
      'Zodiac',
      'Super Ball',
      'Won',
      'Prize Amount (LKR)',
      'Prize Category',
      'Method'
    ];
    const rows = userScans.map(h => [
      h.timestamp,
      h.board,
      `"${h.lotteryName}"`,
      h.drawNo,
      h.drawDate,
      `"${h.ticketNumbers.join('-')}"`,
      h.ticketLetter || '',
      h.ticketZodiac || '',
      h.ticketSuperBall !== undefined ? h.ticketSuperBall : '',
      h.won ? 'YES' : 'NO',
      h.prizeAmount,
      `"${h.prizeCategory || ''}"`,
      h.scanMethod,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `My_LK_Lottery_History_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --------------------------------------------------------------------------
  // VIEW A: LOGGED IN USER ACCOUNT & COMPLETE PERSONAL HISTORY
  // --------------------------------------------------------------------------
  if (currentUser) {
    return (
      <div className="space-y-4 animate-fadeIn">
        
        {/* User Profile Card Header */}
        <div className="p-4 sm:p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/40 border border-slate-800 shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-4">
            
            <div className="flex items-center space-x-3.5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-400 text-slate-950 flex items-center justify-center font-black text-xl shadow-lg shadow-amber-500/20">
                {currentUser.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-lg sm:text-xl font-black text-white">
                    {currentUser.name}
                  </h2>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider ${
                    currentUser.role === 'admin'
                      ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  }`}>
                    {currentUser.role === 'admin' ? 'ADMIN' : 'VERIFIED USER'}
                  </span>
                </div>
                <div className="flex items-center space-x-3 text-xs text-slate-400 mt-0.5 font-mono">
                  <span>{currentUser.email}</span>
                  <span>&bull;</span>
                  <span className="text-slate-500">
                    {language === 'si' ? 'සාමාජිකත්වය:' : 'Joined:'} {new Date(currentUser.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={onOpenScanner}
                className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 transition-all active:scale-95"
              >
                <QrCode className="w-4 h-4" />
                <span>{language === 'si' ? 'අලුත් ටිකට් ස්කෑන් කරන්න' : 'Scan New Ticket'}</span>
              </button>
              <button
                onClick={onLogout}
                className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-red-950/40 hover:text-red-300 border border-slate-700 hover:border-red-800 text-slate-300 text-xs font-semibold transition-colors"
                title="Logout"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>{language === 'si' ? 'ඉවත් වන්න' : 'Logout'}</span>
              </button>
            </div>

          </div>
        </div>

        {/* User Winnings Statistics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-1 shadow-md">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              {language === 'si' ? 'මගේ මුළු ස්කෑන්' : 'My Total Scans'}
            </span>
            <span className="text-xl sm:text-2xl font-black text-white">{totalScans}</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-800/50 text-center space-y-1 shadow-md">
            <span className="text-[10px] uppercase font-bold text-emerald-400 block">
              {language === 'si' ? 'දිනූ ටිකට් පත්' : 'Winning Tickets'}
            </span>
            <span className="text-xl sm:text-2xl font-black text-emerald-400">{totalWins}</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-amber-950/40 border border-amber-800/50 text-center space-y-1 shadow-md">
            <span className="text-[10px] uppercase font-bold text-amber-400 block">
              {language === 'si' ? 'මුළු දිනූ මුදල' : 'Total Won Amount'}
            </span>
            <span className="text-lg sm:text-xl font-black text-amber-300 truncate block">
              Rs. {totalWonAmount.toLocaleString('en-US')}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-purple-950/40 border border-purple-800/50 text-center space-y-1 shadow-md">
            <span className="text-[10px] uppercase font-bold text-purple-400 block">
              {language === 'si' ? 'දිනුම් ප්‍රතිශතය' : 'Winning Rate'}
            </span>
            <span className="text-xl sm:text-2xl font-black text-purple-300">{winRate}%</span>
          </div>
        </div>

        {/* Complete Personal History Section */}
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
          
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <History className="w-5 h-5 text-amber-400" />
              <div>
                <h3 className="font-extrabold text-white text-base">
                  {language === 'si' ? 'ඔබගේ පුද්ගලික ස්කෑන් ඉතිහාසය' : 'My Personal Scan & Ticket History'}
                </h3>
                <p className="text-xs text-slate-400">
                  {language === 'si'
                    ? `${currentUser.email} ගිණුමට අදාළව ස්කෑන් කරන ලද සියලුම ටිකට් පත් මෙහි දැක්වේ`
                    : `All tickets scanned under ${currentUser.email}`}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={handleExportCSV}
                disabled={userScans.length === 0}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 transition-colors disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5 text-amber-400" />
                <span>{language === 'si' ? 'CSV බාගන්න' : 'Export CSV'}</span>
              </button>
            </div>
          </div>

          {/* Search & Filter Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={language === 'si' ? 'ලොතරැයි නම, අංකය, අකුර...' : 'Search by lottery, draw, letter...'}
                className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Lottery Filter */}
            <select
              value={lotteryFilter}
              onChange={(e) => setLotteryFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white font-medium focus:outline-none focus:border-amber-500"
            >
              <option value="ALL">{language === 'si' ? 'සියලුම ලොතරැයි' : 'All Lotteries'}</option>
              {LOTTERY_DEFINITIONS.map(d => (
                <option key={d.id} value={d.nameEn}>
                  {d.nameEn} ({d.board})
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <div className="flex rounded-lg bg-slate-800 p-0.5 border border-slate-700 font-medium">
              <button
                onClick={() => setStatusFilter('ALL')}
                className={`flex-1 py-1 rounded text-center transition-colors ${
                  statusFilter === 'ALL' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                {language === 'si' ? 'සියල්ල' : 'All'}
              </button>
              <button
                onClick={() => setStatusFilter('WON')}
                className={`flex-1 py-1 rounded text-center transition-colors ${
                  statusFilter === 'WON' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-emerald-400'
                }`}
              >
                {language === 'si' ? 'දිනූ' : 'Won'}
              </button>
              <button
                onClick={() => setStatusFilter('LOST')}
                className={`flex-1 py-1 rounded text-center transition-colors ${
                  statusFilter === 'LOST' ? 'bg-slate-700 text-white font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                {language === 'si' ? 'නොදිනූ' : 'Lost'}
              </button>
            </div>

            {/* Date Filter */}
            <div className="relative">
              <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full pl-8 pr-2 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* User History Records Cards */}
          {filteredUserScans.length > 0 ? (
            <div className="space-y-3">
              {filteredUserScans.map((record) => (
                <div
                  key={record.id}
                  className={`p-3.5 sm:p-4 rounded-xl border transition-all ${
                    record.won
                      ? 'bg-gradient-to-r from-emerald-950/30 via-slate-950 to-slate-950 border-emerald-800/60 shadow-lg shadow-emerald-950/20'
                      : 'bg-slate-950 border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                        record.board === 'DLB' ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300'
                      }`}>
                        {record.board}
                      </span>
                      <h4 className="font-extrabold text-sm sm:text-base text-white">
                        {record.lotteryName}
                      </h4>
                      <span className="text-xs font-mono text-amber-400 font-bold">
                        #{record.drawNo}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className="text-[11px] text-slate-400 font-mono">
                        {record.drawDate || new Date(record.timestamp).toLocaleDateString()}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                        record.scanMethod === 'ai' ? 'bg-purple-500/20 text-purple-300' : 'bg-blue-500/20 text-blue-300'
                      }`}>
                        {record.scanMethod.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  {/* Scanned Numbers Display */}
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 my-2">
                    {/* English Letter (Only for non-Zodiac games) */}
                    {!record.ticketZodiac && record.lotteryType !== '4N+Z' && record.lotteryType !== '3N+Z' && record.ticketLetter && (
                      <span className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 flex items-center justify-center font-black text-xs">
                        {record.ticketLetter}
                      </span>
                    )}

                    {/* Zodiac */}
                    {record.ticketZodiac && (
                      <span className="px-2.5 py-1 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-300 text-xs font-bold">
                        🔮 {record.ticketZodiac}
                      </span>
                    )}

                    {/* Ticket Numbers */}
                    {record.ticketNumbers.map((num, i) => (
                      <span
                        key={i}
                        className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 text-white flex items-center justify-center font-bold text-xs font-mono"
                      >
                        {record.lotteryType === '6D+L' ? num : num.toString().padStart(2, '0')}
                      </span>
                    ))}

                    {/* Super Ball */}
                    {record.ticketSuperBall !== undefined && (
                      <span className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-500 to-amber-500 text-slate-950 flex items-center justify-center font-black text-xs font-mono shadow-sm">
                        ⭐{record.ticketSuperBall}
                      </span>
                    )}
                  </div>

                  {/* Win / Loss Status Bar */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 text-xs">
                    {record.won ? (
                      <div className="flex items-center space-x-1.5 text-emerald-400 font-bold">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>{record.prizeCategory || (language === 'si' ? 'දිනුමක් හිමිවිය' : 'Won')}</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-1.5 text-slate-500">
                        <XCircle className="w-4 h-4" />
                        <span>{language === 'si' ? 'දිනුමක් නොමැත' : 'No Winning Matches'}</span>
                      </div>
                    )}

                    {record.won && (
                      <span className="font-extrabold text-sm text-emerald-400 font-mono">
                        Rs. {record.prizeAmount.toLocaleString('en-US')}
                      </span>
                    )}
                  </div>

                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center bg-slate-950/60 rounded-xl border border-slate-800/80 space-y-3">
              <History className="w-10 h-10 text-slate-600 mx-auto" />
              <div>
                <p className="text-sm font-bold text-slate-300">
                  {language === 'si' ? 'තවමත් ගැලපෙන ටිකට් පත් කිසිවක් හමු නොවීය' : 'No matching tickets found'}
                </p>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                  {language === 'si'
                    ? 'නව ටිකට් පතක් ස්කෑන් කර ඔබගේ ඉතිහාසයට ස්වයංක්‍රීයව එක්කර ගන්න'
                    : 'Scan a physical ticket to automatically add it to your personal history'}
                </p>
              </div>
              <button
                onClick={onOpenScanner}
                className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition-all"
              >
                <QrCode className="w-4 h-4" />
                <span>{language === 'si' ? 'දැන් ස්කෑන් කරන්න' : 'Scan a Ticket Now'}</span>
              </button>
            </div>
          )}

        </div>

      </div>
    );
  }

  // --------------------------------------------------------------------------
  // VIEW B: NOT LOGGED IN - EMAIL LOGIN & REGISTRATION
  // --------------------------------------------------------------------------
  return (
    <div className="max-w-xl mx-auto space-y-5 animate-fadeIn">
      
      {/* Banner */}
      <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-amber-950/60 via-slate-900 to-slate-900 border border-amber-800/40 text-center space-y-2 shadow-xl">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-400 text-slate-950 flex items-center justify-center mx-auto shadow-lg shadow-amber-500/20">
          <User className="w-6 h-6" />
        </div>
        <h2 className="text-xl sm:text-2xl font-black text-white">
          {language === 'si' ? 'මගේ ගිණුම (My Account)' : 'My Account & History'}
        </h2>
        <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
          {language === 'si'
            ? 'ඔබගේ ඊමේල් ලිපිනයෙන් පිවිස ඔබ විසින් පරීක්ෂා කරන ලද සියලුම ලොතරැයිපත් වල ඉතිහාසය, දිනුම් මුදල් සහ වාසනා අංක එක් තැනකින් නිරීක්ෂණය කරන්න.'
            : 'Sign in with your email to access your personal scanned ticket history, track prize winnings, and keep a permanent audit record.'}
        </p>
      </div>

      {/* Auth Box */}
      <div className="p-5 sm:p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl space-y-5">
        
        {/* Toggle Mode */}
        <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800 text-xs font-bold">
          <button
            onClick={() => setAuthMode('login')}
            className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center space-x-1.5 ${
              authMode === 'login'
                ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>{language === 'si' ? 'පිවිසෙන්න (Sign In)' : 'Sign In'}</span>
          </button>
          <button
            onClick={() => setAuthMode('register')}
            className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center space-x-1.5 ${
              authMode === 'register'
                ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>{language === 'si' ? 'නව ගිණුමක් අරඹන්න (Register)' : 'Create Account'}</span>
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-950/60 border border-red-800/80 rounded-xl text-xs text-red-200 flex items-center space-x-2 animate-fadeIn">
            <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Quick Google Sign In */}
        <button
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs flex items-center justify-center space-x-2.5 transition-all shadow-md active:scale-98"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
          </svg>
          <span>{language === 'si' ? 'Google (Gmail) මගින් පිවිසෙන්න' : 'Continue with Google (Gmail)'}</span>
        </button>

        <div className="relative flex py-1 items-center">
          <div className="flex-grow border-t border-slate-800"></div>
          <span className="flex-shrink mx-3 text-slate-500 text-[11px] font-mono">
            {language === 'si' ? 'හෝ ඊමේල් ලිපිනයෙන්' : 'or with email & password'}
          </span>
          <div className="flex-grow border-t border-slate-800"></div>
        </div>

        {/* Email & Password Form */}
        <form onSubmit={handleSubmitAuth} className="space-y-3.5">
          {authMode === 'register' && (
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-300 block">
                {language === 'si' ? 'සම්පූර්ණ නම' : 'Full Name'}
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Jhone Bandara"
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs placeholder-slate-600 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-300 block">
              {language === 'si' ? 'ඊමේල් ලිපිනය' : 'Email Address'}
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs placeholder-slate-600 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-300 block">
              {language === 'si' ? 'මුරපදය' : 'Password'}
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs placeholder-slate-600 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center space-x-1.5 active:scale-98 disabled:opacity-50"
          >
            {authMode === 'login' ? <LogIn className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
            <span>
              {isLoading
                ? (language === 'si' ? 'තහවුරු වෙමින් පවතී...' : 'Authenticating...')
                : authMode === 'login'
                ? (language === 'si' ? 'ගිණුමට පිවිසෙන්න' : 'Sign In')
                : (language === 'si' ? 'ගිණුම නිර්මාණය කරන්න' : 'Register Account')}
            </span>
          </button>
        </form>

        {/* Quick Demo Credentials */}
        <div className="pt-2 border-t border-slate-800 space-y-2">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold block">
            {language === 'si' ? 'පරීක්ෂණ පිවිසුම් (Quick Demo Accounts)' : 'Quick Demo Accounts'}
          </span>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              onClick={() => handleQuickDemo('user')}
              className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 hover:text-amber-400 hover:border-slate-700 text-left transition-colors"
            >
              <span className="font-bold block text-[11px] text-white">Jhone Bandara</span>
              <span className="text-[10px] text-slate-500 font-mono">jhonebandara@gmail.com</span>
            </button>
            <button
              onClick={() => handleQuickDemo('admin')}
              className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 hover:text-red-400 hover:border-slate-700 text-left transition-colors"
            >
              <span className="font-bold block text-[11px] text-white">Admin Account</span>
              <span className="text-[10px] text-slate-500 font-mono">admin@lklottery.lk</span>
            </button>
          </div>
        </div>

      </div>

    </div>
  );
};
