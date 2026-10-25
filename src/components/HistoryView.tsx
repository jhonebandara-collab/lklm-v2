import React, { useState, useMemo } from 'react';
import { Download, FileText, Trash2, Calendar, Filter, CheckCircle2, XCircle, Search, Trophy, History as HistoryIcon } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { Language, ScanRecord } from '../types';
import { LOTTERY_DEFINITIONS } from '../data/lotteries';
import { TRANSLATIONS } from '../utils/translations';

interface HistoryViewProps {
  language: Language;
  history: ScanRecord[];
  onClearHistory: () => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  language,
  history,
  onClearHistory,
}) => {
  const t = TRANSLATIONS[language];

  const [lotteryFilter, setLotteryFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'WON' | 'LOST'>('ALL');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Metrics
  const totalScans = history.length;
  const wins = history.filter(h => h.won);
  const totalWins = wins.length;
  const totalWonAmount = wins.reduce((acc, h) => acc + h.prizeAmount, 0);

  // Filtered history
  const filteredHistory = useMemo(() => {
    return history.filter(item => {
      if (lotteryFilter !== 'ALL' && item.lotteryName !== lotteryFilter) return false;
      if (statusFilter === 'WON' && !item.won) return false;
      if (statusFilter === 'LOST' && item.won) return false;
      if (dateFilter && !item.timestamp.startsWith(dateFilter)) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = item.lotteryName.toLowerCase().includes(q);
        const matchesDraw = item.drawNo.toString().includes(q);
        if (!matchesName && !matchesDraw) return false;
      }
      return true;
    });
  }, [history, lotteryFilter, statusFilter, dateFilter, searchQuery]);

  // Export to CSV
  const handleExportCSV = () => {
    if (history.length === 0) return;
    const itemsToExport = filteredHistory.length > 0 ? filteredHistory : history;
    const headers = ['Timestamp', 'Board', 'Lottery', 'Draw No', 'Draw Date', 'Numbers', 'Letter', 'Zodiac', 'Super Ball', 'Won', 'Prize (LKR)', 'Method'];
    const rows = itemsToExport.map(h => [
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
      h.scanMethod,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `LK_Lottery_Master_Scans_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export to PDF Document
  const handleExportPDF = () => {
    if (history.length === 0) return;

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const todayStr = new Date().toISOString().slice(0, 10);

    // Header Background
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, 210, 32, 'F');

    // Title
    doc.setTextColor(245, 158, 11); // amber-500
    doc.setFontSize(15);
    doc.setFont('helvetica', 'bold');
    doc.text('LK LOTTERY MASTER - TICKET SCAN HISTORY', 14, 13);

    // Subtitle & Statistics Summary
    doc.setTextColor(148, 163, 184); // slate-400
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.text(`Official Personal Records Report • Generated: ${new Date().toLocaleString()}`, 14, 20);
    doc.text(`Total Scans: ${totalScans}  |  Winning Tickets: ${totalWins}  |  Total Winnings: LKR ${totalWonAmount.toLocaleString('en-US')}`, 14, 26);

    let y = 40;

    // Table Headers
    doc.setFillColor(241, 245, 249); // slate-100
    doc.rect(14, y - 5, 182, 8, 'F');
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('#', 16, y);
    doc.text('Date', 23, y);
    doc.text('Lottery & Board', 45, y);
    doc.text('Draw #', 88, y);
    doc.text('Numbers / Letters', 106, y);
    doc.text('Result', 152, y);
    doc.text('Prize (LKR)', 174, y);

    y += 6;
    doc.setFont('helvetica', 'normal');

    const itemsToPrint = filteredHistory.length > 0 ? filteredHistory : history;

    itemsToPrint.forEach((item, index) => {
      // Check for page break
      if (y > 275) {
        doc.addPage();
        y = 20;
        doc.setFillColor(241, 245, 249);
        doc.rect(14, y - 5, 182, 8, 'F');
        doc.setTextColor(15, 23, 42);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text('#', 16, y);
        doc.text('Date', 23, y);
        doc.text('Lottery & Board', 45, y);
        doc.text('Draw #', 88, y);
        doc.text('Numbers / Letters', 106, y);
        doc.text('Result', 152, y);
        doc.text('Prize (LKR)', 174, y);
        y += 6;
        doc.setFont('helvetica', 'normal');
      }

      // Alternate row zebra tint
      if (index % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(14, y - 4, 182, 6.5, 'F');
      }

      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      doc.text(String(index + 1), 16, y);
      doc.text(item.drawDate || item.timestamp.slice(0, 10), 23, y);
      doc.text(`${item.lotteryName} (${item.board})`, 45, y);
      doc.text(String(item.drawNo), 88, y);

      const numStr = item.ticketNumbers.join(' ') + 
        (item.ticketLetter ? ` [${item.ticketLetter}]` : '') + 
        (item.ticketZodiac ? ` (${item.ticketZodiac})` : '') +
        (item.ticketSuperBall !== undefined ? ` {${item.ticketSuperBall}}` : '');
      doc.text(numStr, 106, y);

      if (item.won) {
        doc.setTextColor(22, 163, 74); // green-600
        doc.setFont('helvetica', 'bold');
        doc.text('WON', 152, y);
        doc.text(item.prizeAmount.toLocaleString('en-US'), 174, y);
      } else {
        doc.setTextColor(148, 163, 184); // slate-400
        doc.setFont('helvetica', 'normal');
        doc.text('No Win', 152, y);
        doc.text('0.00', 174, y);
      }

      doc.setFont('helvetica', 'normal');
      y += 6.5;
    });

    // Footer note
    y += 5;
    if (y > 280) {
      doc.addPage();
      y = 20;
    }
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text('Generated by LK Lottery Master • Personal Records • Official results must always be verified with physical tickets at authorized DLB/NLB agencies.', 14, y);

    doc.save(`LK_Lottery_Master_Scans_${todayStr}.pdf`);
  };

  return (
    <div className="space-y-4">
      
      {/* Metric Cards Banner */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-1 shadow-md">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">{t.totalScans}</span>
          <span className="text-xl sm:text-2xl font-black text-white">{totalScans}</span>
        </div>
        <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-800/50 text-center space-y-1 shadow-md">
          <span className="text-[10px] uppercase font-bold text-emerald-400 block">{t.totalWins}</span>
          <span className="text-xl sm:text-2xl font-black text-emerald-400">{totalWins}</span>
        </div>
        <div className="p-3.5 rounded-2xl bg-amber-950/40 border border-amber-800/50 text-center space-y-1 shadow-md">
          <span className="text-[10px] uppercase font-bold text-amber-400 block">{t.totalWonAmount}</span>
          <span className="text-lg sm:text-xl font-black text-amber-400 truncate block">
            Rs. {totalWonAmount.toLocaleString('en-US')}
          </span>
        </div>
      </div>

      {/* Filter and Action Header */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 shadow-lg">
        
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <HistoryIcon className="w-4 h-4 text-amber-400" />
            <h3 className="font-bold text-white text-sm">
              {t.historyTitle}
            </h3>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleExportPDF}
              disabled={history.length === 0}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-red-950/50 hover:bg-red-900/60 border border-red-700/60 text-xs font-bold text-red-200 transition-colors disabled:opacity-50 shadow-sm"
              title="Export as PDF Document"
            >
              <FileText className="w-3.5 h-3.5 text-red-400" />
              <span>{language === 'si' ? 'PDF බාගන්න' : 'PDF Export'}</span>
            </button>
            <button
              onClick={handleExportCSV}
              disabled={history.length === 0}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 transition-colors disabled:opacity-50 shadow-sm"
              title="Export as CSV Spreadsheet"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span>{t.exportCsv}</span>
            </button>
            <button
              onClick={onClearHistory}
              disabled={history.length === 0}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-850 hover:bg-slate-800 border border-slate-700/80 text-xs font-semibold text-slate-400 hover:text-red-400 transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{t.clearHistory}</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
          
          {/* Lottery Name Filter */}
          <select
            value={lotteryFilter}
            onChange={(e) => setLotteryFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white font-medium"
          >
            <option value="ALL">All Lotteries (සියල්ල)</option>
            {LOTTERY_DEFINITIONS.map(d => (
              <option key={d.id} value={d.nameEn}>
                {d.nameEn} ({d.board})
              </option>
            ))}
          </select>

          {/* Win / Loss Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'ALL' | 'WON' | 'LOST')}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white font-medium"
          >
            <option value="ALL">All Outcomes (දිනුම් / පැරදුම්)</option>
            <option value="WON">Only Wins (දිනූ ටිකට් පත්)</option>
            <option value="LOST">Only Non-Wins (දිනුම් නොලද)</option>
          </select>

          {/* Date Filter */}
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white font-medium"
          />

          {/* Search Query */}
          <input
            type="text"
            placeholder="Search draw # or name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white font-medium"
          />

        </div>

      </div>

      {/* History Items List */}
      <div className="space-y-2.5">
        {filteredHistory.length === 0 ? (
          <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center text-slate-400 space-y-2">
            <HistoryIcon className="w-8 h-8 mx-auto text-slate-600" />
            <p className="font-semibold text-sm">{t.noHistory}</p>
            <p className="text-xs text-slate-500">
              Start scanning your lottery tickets with QR or AI scanner to build your record.
            </p>
          </div>
        ) : (
          filteredHistory.map((rec) => (
            <div
              key={rec.id}
              className={`p-3.5 rounded-2xl border transition-all flex flex-wrap items-center justify-between gap-3 ${
                rec.won
                  ? 'bg-amber-500/5 border-amber-500/40 shadow-sm'
                  : 'bg-slate-900 border-slate-800'
              }`}
            >
              <div className="flex items-start space-x-3">
                <div className={`p-2.5 rounded-xl mt-0.5 ${
                  rec.won ? 'bg-amber-500 text-slate-950 font-black' : 'bg-slate-800 text-slate-400'
                }`}>
                  {rec.won ? <Trophy className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                      {rec.board}
                    </span>
                    <h4 className="font-black text-white text-sm">
                      {rec.lotteryName}
                    </h4>
                    <span className="text-xs text-slate-400">
                      #{rec.drawNo}
                    </span>
                  </div>

                  {/* Scanned Numbers */}
                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                    <span className="text-slate-500 text-[11px]">Numbers:</span>
                    <div className="flex flex-wrap items-center gap-1">
                      {!rec.ticketZodiac && rec.lotteryType !== '4N+Z' && rec.lotteryType !== '3N+Z' && rec.ticketLetter && (
                        <span className="px-1.5 h-5 rounded bg-blue-600/30 text-blue-300 border border-blue-500/40 font-mono text-[11px] flex items-center justify-center font-bold" title="Letter">
                          {rec.ticketLetter}
                        </span>
                      )}
                      {rec.ticketZodiac && (
                        <span className="px-1.5 h-5 rounded bg-purple-600/30 text-purple-300 border border-purple-500/40 font-mono text-[11px] flex items-center justify-center font-bold" title="Zodiac">
                          {rec.ticketZodiac}
                        </span>
                      )}
                      {rec.ticketNumbers.map((n, idx) => (
                        <span key={idx} className="w-5 h-5 rounded-full bg-slate-800 text-slate-300 font-mono text-[11px] flex items-center justify-center font-bold">
                          {rec.lotteryType === '6D+L' ? n : (n < 10 ? `0${n}` : n)}
                        </span>
                      ))}
                      {rec.ticketSuperBall !== undefined && (
                        <span
                          className={`px-2 min-w-8 h-5 rounded-full font-mono text-[11px] flex items-center justify-center font-bold tracking-tight ${
                            rec.lotteryCode === 'SW' || rec.lotteryName?.toLowerCase().includes('shanida')
                              ? 'bg-sky-500/30 text-sky-300 border border-sky-400/50'
                              : 'bg-amber-500/30 text-amber-300 border border-amber-500/40'
                          }`}
                          title={rec.lotteryCode === 'SW' ? 'Special Number (විශේෂ අංකය)' : 'Super Ball (සුපිරි අංකය)'}
                        >
                          {rec.lotteryCode === 'SW' ? `SP:${rec.ticketSuperBall}` : `SB:${rec.ticketSuperBall}`}
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-500">
                    {new Date(rec.timestamp).toLocaleString()} &bull; Via {rec.scanMethod.toUpperCase()}
                  </p>
                </div>
              </div>

              {/* Won Amount Badge */}
              <div className="text-right">
                {rec.won ? (
                  <div>
                    <span className="text-xs font-bold text-emerald-400 block">
                      + Rs. {rec.prizeAmount.toLocaleString('en-US')}/=
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {rec.prizeCategory || 'Won'}
                    </span>
                  </div>
                ) : (
                  <span className="text-xs font-semibold text-slate-500">
                    No Win
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

    </div>
  );
};
