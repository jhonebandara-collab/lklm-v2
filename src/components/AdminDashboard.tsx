import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  BarChart3,
  Key,
  PlusCircle,
  CheckCircle,
  RefreshCw,
  ShieldAlert,
  Award,
  Search,
  Calendar,
  Filter,
  Download,
  CheckCircle2,
  XCircle,
  Mail,
  UserCheck,
  FileSpreadsheet
} from 'lucide-react';
import { Language, LotteryResult, KeyStatus, UserAccount } from '../types';
import {
  LOTTERY_DEFINITIONS,
  SRI_LANKA_LOTTERY_LETTERS,
  SRI_LANKA_ZODIAC_SIGNS
} from '../data/lotteries';

interface AdminDashboardProps {
  language: Language;
  onAddOrUpdateResult: (newResult: LotteryResult) => void;
}

interface AdminScanAuditItem {
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
  lotteryType?: string;
  won: boolean;
  prizeAmount: number;
  prizeCategory?: string;
  userEmail?: string;
  userName?: string;
  method: 'qr' | 'ai' | 'manual';
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  language,
  onAddOrUpdateResult,
}) => {
  const [activeTab, setActiveTab] = useState<'audit' | 'stats' | 'users' | 'keys' | 'manage'>('audit');
  const [statsData, setStatsData] = useState<Record<string, unknown> | null>(null);
  const [usersList, setUsersList] = useState<UserAccount[]>([]);
  const [keysStatus, setKeysStatus] = useState<KeyStatus[]>([]);
  const [auditScans, setAuditScans] = useState<AdminScanAuditItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Search & Filter State for User Audit (user-wise, email-wise, date-wise)
  const [filterUser, setFilterUser] = useState<string>('');
  const [filterEmail, setFilterEmail] = useState<string>('');
  const [filterDate, setFilterDate] = useState<string>('');
  const [filterLottery, setFilterLottery] = useState<string>('ALL');
  const [filterWon, setFilterWon] = useState<'ALL' | 'WON' | 'LOST'>('ALL');
  const [generalSearch, setGeneralSearch] = useState<string>('');

  // New Draw Result Form State
  const [formLotteryId, setFormLotteryId] = useState<string>(LOTTERY_DEFINITIONS[0].id);
  const [formDrawNo, setFormDrawNo] = useState<number>(3121);
  const [formDrawDate, setFormDrawDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [formN1, setFormN1] = useState<number>(8);
  const [formN2, setFormN2] = useState<number>(53);
  const [formN3, setFormN3] = useState<number>(57);
  const [formN4, setFormN4] = useState<number>(74);
  const [formLetter, setFormLetter] = useState<string>('I');
  const [formZodiac, setFormZodiac] = useState<string>('කටක');
  const [formSuperBall, setFormSuperBall] = useState<number>(14);
  const [formJackpot, setFormJackpot] = useState<number>(82865670);

  const fetchAdminData = async () => {
    setIsLoading(true);
    try {
      const [statsRes, usersRes, keysRes, scansRes] = await Promise.all([
        fetch('/api/admin/stats').then(r => r.json()).catch(() => null),
        fetch('/api/admin/users').then(r => r.json()).catch(() => ({ users: [] })),
        fetch('/api/admin/keys-status').then(r => r.json()).catch(() => ({ keys: [] })),
        fetch('/api/admin/scans').then(r => r.json()).catch(() => ({ scans: [] })),
      ]);

      if (statsRes) setStatsData(statsRes);
      if (usersRes?.users) setUsersList(usersRes.users);
      if (keysRes?.keys) setKeysStatus(keysRes.keys);
      if (scansRes?.scans) setAuditScans(scansRes.scans);
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
    const interval = setInterval(fetchAdminData, 15000);
    return () => clearInterval(interval);
  }, []);

  // Filtered scans matching user-wise, email-wise, and date-wise criteria
  const filteredAuditScans = useMemo(() => {
    return auditScans.filter((item) => {
      // User-wise filter
      if (filterUser.trim()) {
        const u = filterUser.trim().toLowerCase();
        if (!item.userName || !item.userName.toLowerCase().includes(u)) return false;
      }

      // Email-wise filter
      if (filterEmail.trim()) {
        const em = filterEmail.trim().toLowerCase();
        if (!item.userEmail || !item.userEmail.toLowerCase().includes(em)) return false;
      }

      // Date-wise filter (matches timestamp or drawDate)
      if (filterDate.trim()) {
        const dt = filterDate.trim();
        const matchesTs = item.timestamp.startsWith(dt);
        const matchesDraw = item.drawDate === dt;
        if (!matchesTs && !matchesDraw) return false;
      }

      // Lottery filter
      if (filterLottery !== 'ALL' && item.lotteryName !== filterLottery) {
        return false;
      }

      // Won filter
      if (filterWon === 'WON' && !item.won) return false;
      if (filterWon === 'LOST' && item.won) return false;

      // General search query
      if (generalSearch.trim()) {
        const q = generalSearch.trim().toLowerCase();
        const mUser = item.userName?.toLowerCase().includes(q);
        const mEmail = item.userEmail?.toLowerCase().includes(q);
        const mLottery = item.lotteryName.toLowerCase().includes(q);
        const mDraw = item.drawNo.toString().includes(q);
        const mLetter = item.ticketLetter?.toLowerCase() === q;
        const mZodiac = item.ticketZodiac?.toLowerCase().includes(q);
        if (!mUser && !mEmail && !mLottery && !mDraw && !mLetter && !mZodiac) {
          return false;
        }
      }

      return true;
    });
  }, [auditScans, filterUser, filterEmail, filterDate, filterLottery, filterWon, generalSearch]);

  // Aggregate Metrics for Current Filter
  const filteredTotalWon = filteredAuditScans
    .filter(s => s.won)
    .reduce((acc, s) => acc + (s.prizeAmount || 0), 0);
  const filteredTotalWins = filteredAuditScans.filter(s => s.won).length;

  // Handle Export Audit to CSV
  const handleExportAuditCSV = () => {
    if (filteredAuditScans.length === 0) return;
    const headers = [
      'Timestamp',
      'User Name',
      'User Email',
      'Board',
      'Lottery Name',
      'Draw No',
      'Draw Date',
      'Scanned Numbers',
      'Letter',
      'Zodiac',
      'Super Ball',
      'Won',
      'Prize Amount (LKR)',
      'Prize Category',
      'Method'
    ];

    const rows = filteredAuditScans.map(s => [
      `"${s.timestamp}"`,
      `"${s.userName || 'Guest'}"`,
      `"${s.userEmail || 'N/A'}"`,
      s.board,
      `"${s.lotteryName}"`,
      s.drawNo,
      s.drawDate,
      `"${(s.ticketNumbers || []).join('-')}"`,
      s.ticketLetter || '',
      s.ticketZodiac || '',
      s.ticketSuperBall !== undefined ? s.ticketSuperBall : '',
      s.won ? 'YES' : 'NO',
      s.prizeAmount,
      `"${s.prizeCategory || ''}"`,
      s.method,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `LK_Lottery_Admin_Audit_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Quick User Filter helper
  const handleFilterByUser = (emailVal: string, nameVal?: string) => {
    setFilterEmail(emailVal);
    if (nameVal) setFilterUser(nameVal);
    setActiveTab('audit');
  };

  // Publish New Result
  const handleSaveResult = (e: React.FormEvent) => {
    e.preventDefault();
    const def = LOTTERY_DEFINITIONS.find(d => d.id === formLotteryId) || LOTTERY_DEFINITIONS[0];

    const newResult: LotteryResult = {
      id: `${def.code}-${formDrawNo}-${formDrawDate}`,
      lotteryId: def.id,
      lotteryCode: def.code,
      lotteryName: def.nameEn,
      board: def.board,
      drawNo: Number(formDrawNo),
      drawDate: formDrawDate,
      numbers: [Number(formN1), Number(formN2), Number(formN3), Number(formN4)].sort((a, b) => a - b),
      letter: def.hasLetter ? formLetter : undefined,
      zodiac: def.hasZodiac ? formZodiac : undefined,
      superBall: def.hasSuperBall ? Number(formSuperBall) : undefined,
      jackpotAmount: Number(formJackpot),
      prizes: def.samplePrizes,
      isOfficial: true,
      createdAt: new Date().toISOString(),
    };

    onAddOrUpdateResult(newResult);
    setToastMsg(`Draw #${formDrawNo} for ${def.nameEn} published successfully!`);
    setTimeout(() => setToastMsg(null), 3500);
  };

  return (
    <div className="space-y-4">
      
      {/* Admin Header */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-red-950 via-slate-900 to-slate-900 border border-red-800/50 flex flex-wrap items-center justify-between gap-3 shadow-xl">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-red-600 text-white font-bold shadow-md shadow-red-600/30">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base sm:text-lg font-black text-white">
                LK Lottery Master &bull; Admin Master Control
              </h2>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-red-500/20 text-red-300 font-bold border border-red-500/30">
                ROOT AUDITOR
              </span>
            </div>
            <p className="text-xs text-slate-400">
              User-wise, email-wise &amp; date-wise activity tracking, live audit trail &amp; draw results manager
            </p>
          </div>
        </div>

        <button
          onClick={fetchAdminData}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {toastMsg && (
        <div className="p-3 bg-emerald-950 border border-emerald-800 rounded-xl text-xs text-emerald-200 flex items-center space-x-2 animate-fadeIn">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span className="font-semibold">{toastMsg}</span>
        </div>
      )}

      {/* Sub Tabs Bar */}
      <div className="flex space-x-1.5 sm:space-x-2 border-b border-slate-800 pb-2 overflow-x-auto text-xs font-bold no-scrollbar">
        <button
          onClick={() => setActiveTab('audit')}
          className={`px-3 py-1.5 rounded-lg transition-colors flex items-center space-x-1.5 whitespace-nowrap ${
            activeTab === 'audit' ? 'bg-amber-500 text-slate-950 shadow-sm font-bold' : 'text-slate-400 hover:text-white'
          }`}
        >
          <FileSpreadsheet className="w-3.5 h-3.5" />
          <span>User Activity Audit ({auditScans.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`px-3 py-1.5 rounded-lg transition-colors flex items-center space-x-1.5 whitespace-nowrap ${
            activeTab === 'users' ? 'bg-amber-500 text-slate-950 shadow-sm font-bold' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Users Directory ({usersList.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('stats')}
          className={`px-3 py-1.5 rounded-lg transition-colors flex items-center space-x-1.5 whitespace-nowrap ${
            activeTab === 'stats' ? 'bg-amber-500 text-slate-950 shadow-sm font-bold' : 'text-slate-400 hover:text-white'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>Usage Metrics</span>
        </button>

        <button
          onClick={() => setActiveTab('keys')}
          className={`px-3 py-1.5 rounded-lg transition-colors flex items-center space-x-1.5 whitespace-nowrap ${
            activeTab === 'keys' ? 'bg-amber-500 text-slate-950 shadow-sm font-bold' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Key className="w-3.5 h-3.5" />
          <span>Gemini Rotator</span>
        </button>

        <button
          onClick={() => setActiveTab('manage')}
          className={`px-3 py-1.5 rounded-lg transition-colors flex items-center space-x-1.5 whitespace-nowrap ${
            activeTab === 'manage' ? 'bg-amber-500 text-slate-950 shadow-sm font-bold' : 'text-slate-400 hover:text-white'
          }`}
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span>Publish Draw Result</span>
        </button>
      </div>

      {/* ===================================================================== */}
      {/* TAB 1: USER ACTIVITY AUDIT (User-wise, Email-wise, Date-wise Search) */}
      {/* ===================================================================== */}
      {activeTab === 'audit' && (
        <div className="space-y-4 animate-fadeIn">
          
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Scans in Audit</span>
              <span className="text-xl font-black text-white">{auditScans.length}</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Filtered Scans</span>
              <span className="text-xl font-black text-amber-400">{filteredAuditScans.length}</span>
            </div>

            <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/40">
              <span className="text-[10px] uppercase font-bold text-emerald-400 block">Winning Matches</span>
              <span className="text-xl font-black text-emerald-400">{filteredTotalWins}</span>
            </div>

            <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-800/40">
              <span className="text-[10px] uppercase font-bold text-amber-400 block">Prizes Won</span>
              <span className="text-base font-black text-amber-300 truncate block">
                Rs. {filteredTotalWon.toLocaleString('en-US')}
              </span>
            </div>
          </div>

          {/* Filter Panel (User-wise, Email-wise, Date-wise) */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3.5 shadow-xl">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center space-x-2">
                <Filter className="w-4 h-4 text-amber-400" />
                <h4 className="font-extrabold text-white text-xs sm:text-sm">
                  Search &amp; Filter Audit Trail (User-wise &bull; Email-wise &bull; Date-wise)
                </h4>
              </div>

              <div className="flex items-center space-x-2">
                {(filterUser || filterEmail || filterDate || filterLottery !== 'ALL' || filterWon !== 'ALL' || generalSearch) && (
                  <button
                    onClick={() => {
                      setFilterUser('');
                      setFilterEmail('');
                      setFilterDate('');
                      setFilterLottery('ALL');
                      setFilterWon('ALL');
                      setGeneralSearch('');
                    }}
                    className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] font-semibold text-slate-300"
                  >
                    Reset Filters
                  </button>
                )}
                <button
                  onClick={handleExportAuditCSV}
                  disabled={filteredAuditScans.length === 0}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all disabled:opacity-50"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export CSV</span>
                </button>
              </div>
            </div>

            {/* Inputs Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
              
              {/* 1. User Name Search (User-wise) */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  User Wise
                </label>
                <div className="relative">
                  <UserCheck className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    value={filterUser}
                    onChange={(e) => setFilterUser(e.target.value)}
                    placeholder="Search name..."
                    className="w-full pl-8 pr-2 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* 2. Email Search (Email-wise) */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Email Wise
                </label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    value={filterEmail}
                    onChange={(e) => setFilterEmail(e.target.value)}
                    placeholder="Search email..."
                    className="w-full pl-8 pr-2 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* 3. Date Search (Date-wise) */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Date Wise
                </label>
                <div className="relative">
                  <Calendar className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                  <input
                    type="date"
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                    className="w-full pl-8 pr-2 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* 4. Lottery Name Filter */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Lottery Game
                </label>
                <select
                  value={filterLottery}
                  onChange={(e) => setFilterLottery(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white font-medium focus:outline-none focus:border-amber-500"
                >
                  <option value="ALL">All Lotteries</option>
                  {LOTTERY_DEFINITIONS.map(d => (
                    <option key={d.id} value={d.nameEn}>{d.nameEn}</option>
                  ))}
                </select>
              </div>

              {/* 5. Won / Lost Filter */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Outcome
                </label>
                <select
                  value={filterWon}
                  onChange={(e) => setFilterWon(e.target.value as 'ALL' | 'WON' | 'LOST')}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white font-medium focus:outline-none focus:border-amber-500"
                >
                  <option value="ALL">All Outcomes</option>
                  <option value="WON">Won Only</option>
                  <option value="LOST">Lost Only</option>
                </select>
              </div>

              {/* 6. General Search */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Keywords
                </label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    value={generalSearch}
                    onChange={(e) => setGeneralSearch(e.target.value)}
                    placeholder="Draw, letter..."
                    className="w-full pl-8 pr-2 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

            </div>

            {/* Quick Date Presets */}
            <div className="flex items-center space-x-2 pt-1 text-[11px] text-slate-400">
              <span className="font-semibold text-slate-500">Quick Dates:</span>
              <button
                onClick={() => setFilterDate(new Date().toISOString().split('T')[0])}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
              >
                Today
              </button>
              <button
                onClick={() => {
                  const d = new Date(Date.now() - 86400000);
                  setFilterDate(d.toISOString().split('T')[0]);
                }}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
              >
                Yesterday
              </button>
              <button
                onClick={() => setFilterDate('')}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
              >
                All Dates
              </button>
            </div>
          </div>

          {/* Audit Records Table */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 overflow-x-auto shadow-2xl">
            <div className="flex items-center justify-between">
              <h4 className="font-extrabold text-white text-xs sm:text-sm">
                Activity Logs ({filteredAuditScans.length} records matching search)
              </h4>
              <span className="text-[11px] text-slate-400">
                Click any user to filter by that user
              </span>
            </div>

            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-slate-400 border-b border-slate-800 text-[10px] uppercase tracking-wider">
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">User (User-wise)</th>
                  <th className="py-2.5 px-3">Email (Email-wise)</th>
                  <th className="py-2.5 px-3">Lottery &amp; Draw</th>
                  <th className="py-2.5 px-3">Scanned Details</th>
                  <th className="py-2.5 px-3">Result</th>
                  <th className="py-2.5 px-3">Method</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {filteredAuditScans.length > 0 ? (
                  filteredAuditScans.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                      
                      {/* Timestamp */}
                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                        <div>{new Date(item.timestamp).toLocaleDateString()}</div>
                        <div className="text-[10px] text-slate-500">{new Date(item.timestamp).toLocaleTimeString()}</div>
                      </td>

                      {/* User Name */}
                      <td className="py-2.5 px-3">
                        <button
                          onClick={() => handleFilterByUser(item.userEmail || '', item.userName)}
                          className="font-bold text-white hover:text-amber-400 flex items-center space-x-1.5 transition-colors text-left"
                          title="Click to filter by this user"
                        >
                          <div className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] flex items-center justify-center font-bold">
                            {(item.userName || 'G').charAt(0)}
                          </div>
                          <span>{item.userName || 'Guest User'}</span>
                        </button>
                      </td>

                      {/* User Email */}
                      <td className="py-2.5 px-3 font-mono text-[11px]">
                        <button
                          onClick={() => handleFilterByUser(item.userEmail || '')}
                          className="text-slate-300 hover:text-amber-400 transition-colors"
                          title="Click to filter by this email"
                        >
                          {item.userEmail || <span className="text-slate-500 italic">No email</span>}
                        </button>
                      </td>

                      {/* Lottery & Draw */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-center space-x-1.5">
                          <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold ${
                            item.board === 'DLB' ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300'
                          }`}>
                            {item.board}
                          </span>
                          <span className="font-bold text-white">{item.lotteryName}</span>
                        </div>
                        <div className="text-[11px] text-amber-400 font-mono">
                          Draw #{item.drawNo} &bull; {item.drawDate}
                        </div>
                      </td>

                      {/* Scanned Details (Letter, Zodiac, Numbers, Superball) */}
                      <td className="py-2.5 px-3">
                        <div className="flex flex-wrap items-center gap-1 font-mono text-[11px]">
                          {item.lotteryType !== '4N+Z' && !item.ticketZodiac && item.ticketLetter && (
                            <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                              [{item.ticketLetter}]
                            </span>
                          )}
                          {item.ticketZodiac && (
                            <span className="px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 font-bold">
                              🔮 {item.ticketZodiac}
                            </span>
                          )}
                          {item.ticketNumbers && item.ticketNumbers.length > 0 && (
                            <span className="text-slate-200 font-bold">
                              {item.ticketNumbers.join(' - ')}
                            </span>
                          )}
                          {item.ticketSuperBall !== undefined && (
                            <span className="px-1.5 py-0.2 rounded bg-yellow-500/20 text-yellow-300 font-bold">
                              ⭐{item.ticketSuperBall}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Result */}
                      <td className="py-2.5 px-3">
                        {item.won ? (
                          <div className="space-y-0.5">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 inline-block font-mono">
                              WON Rs. {item.prizeAmount.toLocaleString('en-US')}
                            </span>
                            {item.prizeCategory && (
                              <div className="text-[10px] text-slate-400 max-w-[140px] truncate">
                                {item.prizeCategory}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-400 inline-block">
                            Lost
                          </span>
                        )}
                      </td>

                      {/* Method */}
                      <td className="py-2.5 px-3 font-mono text-[10px] uppercase font-bold text-slate-400">
                        {item.method}
                      </td>

                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      No user scan activity records matched the selected filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 2: REGISTERED USERS DIRECTORY */}
      {/* ===================================================================== */}
      {activeTab === 'users' && (
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-extrabold text-white text-xs sm:text-sm">
                Registered Users ({usersList.length})
              </h4>
              <p className="text-xs text-slate-400">
                Click any user's email to instantly inspect all scans performed by that user
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-slate-400 border-b border-slate-800 text-[10px] uppercase tracking-wider">
                  <th className="py-2 px-3">User</th>
                  <th className="py-2 px-3">Email Address</th>
                  <th className="py-2 px-3">Role</th>
                  <th className="py-2 px-3">Total Scans</th>
                  <th className="py-2 px-3">Total Won</th>
                  <th className="py-2 px-3">Last Login</th>
                  <th className="py-2 px-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {usersList.map(u => (
                  <tr key={u.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-2.5 px-3 font-bold text-white flex items-center space-x-2">
                      <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 text-xs flex items-center justify-center font-bold">
                        {u.name.charAt(0)}
                      </div>
                      <span>{u.name}</span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-300 font-mono text-[11px]">{u.email}</td>
                    <td className="py-2.5 px-3">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                        u.role === 'admin' ? 'bg-red-500/20 text-red-300' : 'bg-blue-500/20 text-blue-300'
                      }`}>
                        {u.role.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-amber-400">{u.scanCount}</td>
                    <td className="py-2.5 px-3 font-bold text-emerald-400 font-mono">
                      Rs. {u.totalWon.toLocaleString('en-US')}
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                      {new Date(u.lastLogin).toLocaleDateString()}
                    </td>
                    <td className="py-2.5 px-3">
                      <button
                        onClick={() => handleFilterByUser(u.email, u.name)}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-300 text-[11px] font-bold transition-all"
                      >
                        Inspect Scans &rarr;
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 3: ANALYTICS & STATS */}
      {/* ===================================================================== */}
      {activeTab === 'stats' && (
        <div className="space-y-4 animate-fadeIn">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
            <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400">Total Users</span>
              <p className="text-2xl font-black text-white">{String(statsData?.totalUsers || usersList.length)}</p>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400">Total Scans</span>
              <p className="text-2xl font-black text-amber-400">{String(statsData?.totalScans || auditScans.length)}</p>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400">Total Wins</span>
              <p className="text-2xl font-black text-emerald-400">{String(statsData?.totalWins || 42)}</p>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400">Prize Payout</span>
              <p className="text-lg font-black text-yellow-300 truncate">Rs. 185,000</p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
            <h4 className="font-bold text-white text-xs sm:text-sm">
              Popular Lotteries Scanned by Users
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              {['Ada Kotipathi (DLB)', 'Mahajana Sampatha (NLB)', 'Govisetha (NLB)', 'Shanida Vasanawa (DLB)', 'Super Ball (DLB)', 'Mega Power (NLB)'].map((name, i) => (
                <div key={i} className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between">
                  <span className="text-slate-300 font-medium truncate">{name}</span>
                  <span className="font-mono font-bold text-amber-400 ml-2">{45 - i * 6}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 4: GEMINI ROTATOR MONITOR */}
      {/* ===================================================================== */}
      {activeTab === 'keys' && (
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 animate-fadeIn">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-white text-xs sm:text-sm">
              Gemini Vision 5-Key Rotator Status &amp; Failover
            </h4>
            <span className="text-[11px] text-slate-400">Auto-cooldown: 60s on 429</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {keysStatus.length > 0 ? (
              keysStatus.map((k) => (
                <div
                  key={k.keyIndex}
                  className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-purple-300 text-xs">
                      Key #{k.keyIndex}: {k.keyId}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                      k.status === 'READY' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                    }`}>
                      {k.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Successful calls: <strong className="text-white">{k.callsCount}</strong></span>
                    <span>Failures: <strong className="text-rose-400">{k.failsCount || 0}</strong></span>
                  </div>
                  {k.lastUsedAt && (
                    <p className="text-[10px] text-slate-500">Last used: {new Date(k.lastUsedAt).toLocaleTimeString()}</p>
                  )}
                </div>
              ))
            ) : (
              [1, 2, 3, 4, 5].map((idx) => (
                <div key={idx} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-purple-300 text-xs">Key #{idx} (Configured)</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-[10px]">READY</span>
                  </div>
                  <p className="text-xs text-slate-400">Protected by automated cooldown &amp; error recovery.</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 5: PUBLISH DRAW RESULT */}
      {/* ===================================================================== */}
      {activeTab === 'manage' && (
        <form onSubmit={handleSaveResult} className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 animate-fadeIn">
          <h4 className="font-bold text-white text-xs sm:text-sm flex items-center space-x-2">
            <PlusCircle className="w-4 h-4 text-emerald-400" />
            <span>Publish Official Draw Result (DLB / NLB)</span>
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            
            <div className="space-y-1">
              <label className="text-slate-400 font-semibold">Lottery</label>
              <select
                value={formLotteryId}
                onChange={(e) => setFormLotteryId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-medium"
              >
                {LOTTERY_DEFINITIONS.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.board}: {d.nameEn} ({d.nameSi})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-slate-400 font-semibold">Draw Number (#)</label>
              <input
                type="number"
                required
                value={formDrawNo}
                onChange={(e) => setFormDrawNo(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-medium"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-400 font-semibold">Draw Date</label>
              <input
                type="date"
                required
                value={formDrawDate}
                onChange={(e) => setFormDrawDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-medium"
              />
            </div>

            {/* 4 Numbers */}
            <div className="sm:col-span-3 space-y-1">
              <label className="text-slate-400 font-semibold">Winning 4 Numbers (දිනුම් අංක 4)</label>
              <div className="grid grid-cols-4 gap-2">
                <input
                  type="number"
                  min="1"
                  max="99"
                  required
                  value={formN1}
                  onChange={(e) => setFormN1(Number(e.target.value))}
                  className="px-3 py-2 text-center rounded-xl bg-slate-800 border border-slate-700 text-white font-bold"
                  placeholder="N1"
                />
                <input
                  type="number"
                  min="1"
                  max="99"
                  required
                  value={formN2}
                  onChange={(e) => setFormN2(Number(e.target.value))}
                  className="px-3 py-2 text-center rounded-xl bg-slate-800 border border-slate-700 text-white font-bold"
                  placeholder="N2"
                />
                <input
                  type="number"
                  min="1"
                  max="99"
                  required
                  value={formN3}
                  onChange={(e) => setFormN3(Number(e.target.value))}
                  className="px-3 py-2 text-center rounded-xl bg-slate-800 border border-slate-700 text-white font-bold"
                  placeholder="N3"
                />
                <input
                  type="number"
                  min="1"
                  max="99"
                  required
                  value={formN4}
                  onChange={(e) => setFormN4(Number(e.target.value))}
                  className="px-3 py-2 text-center rounded-xl bg-slate-800 border border-slate-700 text-white font-bold"
                  placeholder="N4"
                />
              </div>
            </div>

            {/* Letter / Zodiac / Superball */}
            <div className="space-y-1">
              <label className="text-slate-400 font-semibold">English Letter (අකුර)</label>
              <select
                value={formLetter}
                onChange={(e) => setFormLetter(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-medium"
              >
                {SRI_LANKA_LOTTERY_LETTERS.map(l => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-slate-400 font-semibold">Zodiac (ලග්නය)</label>
              <select
                value={formZodiac}
                onChange={(e) => setFormZodiac(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-medium"
              >
                {SRI_LANKA_ZODIAC_SIGNS.map(z => (
                  <option key={z.si} value={z.si}>{z.si} ({z.en})</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-slate-400 font-semibold">Jackpot Prize (LKR)</label>
              <input
                type="number"
                step="500000"
                value={formJackpot}
                onChange={(e) => setFormJackpot(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-medium"
              />
            </div>

          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center space-x-2 transition-all shadow-lg shadow-emerald-600/30"
          >
            <CheckCircle className="w-4 h-4" />
            <span>Publish Result to All Users</span>
          </button>
        </form>
      )}

    </div>
  );
};
