/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { QRScannerView } from './components/QRScannerView';
import { AIScanModal } from './components/AIScanModal';
import { ResultsView } from './components/ResultsView';
import { HistoryView } from './components/HistoryView';
import { LuckyGuessView } from './components/LuckyGuessView';
import { AdminDashboard } from './components/AdminDashboard';
import { MyAccountView } from './components/MyAccountView';
import { DisclaimerModal } from './components/DisclaimerModal';
import { AboutModal, PrivacyPolicyModal } from './components/AboutAndLegalModals';
import { AuthModal } from './components/AuthModal';
import { INITIAL_RESULTS } from './data/lotteries';
import { Language, LotteryResult, ScanRecord, TicketMatchResult, UserAccount } from './types';
import { TRANSLATIONS } from './utils/translations';
import { soundCtrl } from './utils/audio';

const STORAGE_KEY_RESULTS = 'lk_lottery_master_results_v3';
const STORAGE_KEY_HISTORY = 'lk_lottery_master_history';
const STORAGE_KEY_USER = 'lk_lottery_master_user';
const STORAGE_KEY_LANG = 'lk_lottery_master_lang';
const STORAGE_KEY_DISCLAIMER = 'lk_lottery_master_disclaimer_accepted';

export default function App() {
  // Language
  const [currentLang, setCurrentLang] = useState<Language>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_LANG);
    return (saved as Language) || 'si';
  });

  // Navigation tab
  const [activeTab, setActiveTab] = useState<string>('scanner');

  // Mute state
  const [isMuted, setIsMuted] = useState<boolean>(() => soundCtrl.getMuted());

  // Cached Results Database (6 months)
  const [results, setResults] = useState<LotteryResult[]>(() => {
    try {
      const cached = localStorage.getItem(STORAGE_KEY_RESULTS);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // fallback
    }
    return INITIAL_RESULTS;
  });

  // Scan History
  const [history, setHistory] = useState<ScanRecord[]>(() => {
    try {
      const cached = localStorage.getItem(STORAGE_KEY_HISTORY);
      if (cached) return JSON.parse(cached);
    } catch {
      // fallback
    }
    return [
      {
        id: 'rec-init-1',
        timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
        lotteryName: 'Ada Kotipathi',
        board: 'DLB',
        drawNo: 4850,
        drawDate: '2026-09-25',
        ticketNumbers: [14, 28, 49, 72],
        ticketLetter: 'B',
        won: true,
        prizeAmount: 2000,
        prizeCategory: 'අංක 3 ගැලපීම (3 Numbers Match)',
        scanMethod: 'qr',
      },
      {
        id: 'rec-init-2',
        timestamp: new Date(Date.now() - 3600000 * 6).toISOString(),
        lotteryName: 'Mahajana Sampatha',
        board: 'NLB',
        drawNo: 4912,
        drawDate: '2026-09-24',
        ticketNumbers: [10, 20, 30, 40],
        ticketLetter: 'G',
        won: false,
        prizeAmount: 0,
        scanMethod: 'qr',
      },
    ];
  });

  // Current User Account
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    try {
      const cached = localStorage.getItem(STORAGE_KEY_USER);
      if (cached) return JSON.parse(cached);
    } catch {
      // fallback
    }
    return null;
  });

  // Modals - Disclaimer opens every time the app is opened as requested
  const [isDisclaimerOpen, setIsDisclaimerOpen] = useState<boolean>(true);
  const [isAboutOpen, setIsAboutOpen] = useState<boolean>(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState<boolean>(false);
  const [isAuthOpen, setIsAuthOpen] = useState<boolean>(() => {
    // Open Gmail login modal immediately if user has not logged in
    const cached = localStorage.getItem(STORAGE_KEY_USER);
    return !cached;
  });
  const [isAIScanOpen, setIsAIScanOpen] = useState<boolean>(false);

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_LANG, currentLang);
  }, [currentLang]);

  // Fetch live official results scraped from dlb.lk and nlb.lk on mount
  useEffect(() => {
    fetch('/api/results')
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.draws) && data.draws.length > 0) {
          setResults(prev => {
            const merged = [...data.draws];
            prev.forEach(p => {
              if (!merged.some(m => m.board === p.board && m.lotteryCode === p.lotteryCode && m.drawNo === p.drawNo)) {
                merged.push(p);
              }
            });
            return merged.sort((a, b) => new Date(b.drawDate).getTime() - new Date(a.drawDate).getTime());
          });
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (currentUser?.email) {
      fetch(`/api/user/scans?email=${encodeURIComponent(currentUser.email)}`)
        .then(res => res.json())
        .then(data => {
          if (data.success && Array.isArray(data.scans)) {
            setHistory(prev => {
              const merged = [...prev];
              data.scans.forEach((serverScan: any) => {
                if (!merged.some(m => m.id === serverScan.id)) {
                  merged.push({
                    id: serverScan.id,
                    userId: currentUser.id,
                    userEmail: currentUser.email,
                    userName: currentUser.name,
                    timestamp: serverScan.timestamp,
                    lotteryName: serverScan.lotteryName,
                    board: serverScan.board,
                    drawNo: serverScan.drawNo,
                    drawDate: serverScan.drawDate,
                    ticketNumbers: serverScan.ticketNumbers || [],
                    ticketLetter: serverScan.ticketLetter,
                    ticketZodiac: serverScan.ticketZodiac,
                    ticketSuperBall: serverScan.ticketSuperBall,
                    lotteryType: '4N+L',
                    won: serverScan.won,
                    prizeAmount: serverScan.prizeAmount,
                    prizeCategory: serverScan.prizeCategory,
                    scanMethod: serverScan.method || 'qr',
                  });
                }
              });
              return merged.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            });
          }
        })
        .catch(() => {});
    }
  }, [currentUser?.email]);

  const handleSyncLiveResults = async () => {
    try {
      const res = await fetch('/api/results/sync', { method: 'POST' });
      const data = await res.json();
      if (data.success && Array.isArray(data.draws)) {
        setResults(prev => {
          const merged = [...data.draws];
          prev.forEach(p => {
            if (!merged.some(m => m.board === p.board && m.lotteryCode === p.lotteryCode && m.drawNo === p.drawNo)) {
              merged.push(p);
            }
          });
          return merged.sort((a, b) => new Date(b.drawDate).getTime() - new Date(a.drawDate).getTime());
        });
        return data.count;
      }
    } catch {
      // ignore
    }
    return 0;
  };

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_RESULTS, JSON.stringify(results));
    } catch {
      // ignore
    }
  }, [results]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(history));
    } catch {
      // ignore
    }
  }, [history]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(currentUser));
    } else {
      localStorage.removeItem(STORAGE_KEY_USER);
    }
  }, [currentUser]);

  // Handle scanned ticket
  const handleTicketScanned = (match: TicketMatchResult, rawString: string) => {
    if (!match.isValidLottery || match.isFutureDraw) return;

    const newRecord: ScanRecord = {
      id: `scan-${Date.now()}`,
      userId: currentUser?.id,
      userEmail: currentUser?.email,
      userName: currentUser?.name,
      timestamp: new Date().toISOString(),
      lotteryName: match.lotteryName,
      board: match.board,
      lotteryCode: match.lotteryCode,
      drawNo: match.drawNo,
      drawDate: match.drawDate,
      ticketNumbers: match.ticketNumbers,
      ticketLetter: match.ticketLetter,
      ticketZodiac: match.ticketZodiac,
      ticketSuperBall: match.ticketSuperBall,
      lotteryType: match.lotteryType,
      won: match.isWon,
      prizeAmount: match.totalPrize,
      prizeCategory: match.prizeCategory,
      scanMethod: rawString.startsWith('AI-SCAN') ? 'ai' : 'qr',
      rawCode: rawString,
    };

    setHistory(prev => [newRecord, ...prev]);

    // Send log to backend for user tracking & admin audit
    fetch('/api/scan/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lotteryName: match.lotteryName,
        board: match.board,
        drawNo: match.drawNo,
        drawDate: match.drawDate,
        ticketNumbers: match.ticketNumbers,
        ticketLetter: match.ticketLetter,
        ticketZodiac: match.ticketZodiac,
        ticketSuperBall: match.ticketSuperBall,
        won: match.isWon,
        prizeAmount: match.totalPrize,
        prizeCategory: match.prizeCategory,
        userEmail: currentUser?.email,
        userName: currentUser?.name,
        method: newRecord.scanMethod,
        rawCode: rawString,
      }),
    }).catch(() => {});
  };

  // Admin added or edited a result
  const handleAddOrUpdateResult = (newResult: LotteryResult) => {
    setResults(prev => {
      const idx = prev.findIndex(r => r.drawNo === newResult.drawNo && r.lotteryId === newResult.lotteryId);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = newResult;
        return copy;
      }
      return [newResult, ...prev];
    });
  };

  const handleClearHistory = () => {
    if (window.confirm('Are you sure you want to clear all scanned ticket history?')) {
      setHistory([]);
    }
  };

  const t = TRANSLATIONS[currentLang];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      
      {/* Top Sticky Navigation */}
      <Navbar
        currentLang={currentLang}
        onLanguageChange={setCurrentLang}
        currentUser={currentUser}
        onOpenAuth={() => setIsAuthOpen(true)}
        onLogout={() => setCurrentUser(null)}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenDisclaimer={() => setIsDisclaimerOpen(true)}
        isMuted={isMuted}
        onToggleMute={() => setIsMuted(!isMuted)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-3 sm:p-5 lg:p-6 pb-20">
        
        {/* TAB 1: QR & AI Scanner */}
        {activeTab === 'scanner' && (
          <div className="animate-fadeIn">
            <QRScannerView
              language={currentLang}
              allResults={results}
              onTicketScanned={handleTicketScanned}
              onOpenAIScan={() => setIsAIScanOpen(true)}
            />
          </div>
        )}

        {/* TAB 2: Results Database (6 Months) */}
        {activeTab === 'results' && (
          <div className="animate-fadeIn">
            <ResultsView
              language={currentLang}
              results={results}
              onSyncLive={handleSyncLiveResults}
            />
          </div>
        )}

        {/* TAB 3: History */}
        {activeTab === 'history' && (
          <div className="animate-fadeIn">
            <HistoryView
              language={currentLang}
              history={history}
              onClearHistory={handleClearHistory}
            />
          </div>
        )}

        {/* TAB: My Account & User Scan History */}
        {activeTab === 'account' && (
          <div className="animate-fadeIn">
            <MyAccountView
              language={currentLang}
              currentUser={currentUser}
              history={currentUser ? history.filter(h => !h.userEmail || h.userEmail.toLowerCase() === currentUser.email.toLowerCase()) : history}
              onLoginSuccess={(user) => {
                setCurrentUser(user);
              }}
              onLogout={() => {
                setCurrentUser(null);
              }}
              onClearHistory={() => {
                if (currentUser) {
                  setHistory(prev => prev.filter(h => h.userEmail && h.userEmail.toLowerCase() !== currentUser.email.toLowerCase()));
                } else {
                  setHistory([]);
                }
              }}
              onOpenScanner={() => setActiveTab('scanner')}
            />
          </div>
        )}

        {/* TAB 4: My Lucky Guess */}
        {activeTab === 'lucky' && (
          <div className="animate-fadeIn">
            <LuckyGuessView
              language={currentLang}
              allResults={results}
            />
          </div>
        )}

        {/* TAB 5: Admin Panel */}
        {activeTab === 'admin' && currentUser?.role === 'admin' && (
          <div className="animate-fadeIn">
            <AdminDashboard
              language={currentLang}
              onAddOrUpdateResult={handleAddOrUpdateResult}
            />
          </div>
        )}

      </main>

      {/* Footer & Legal Protections */}
      <footer className="mt-auto border-t border-slate-900 bg-slate-950/90 py-6 px-4 text-center space-y-3">
        <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-center gap-4 text-xs font-semibold text-slate-400">
          <button
            onClick={() => setIsDisclaimerOpen(true)}
            className="hover:text-amber-400 underline decoration-slate-700 hover:decoration-amber-400 transition-colors"
          >
            {t.disclaimerBtn}
          </button>
          <span>&bull;</span>
          <button
            onClick={() => setIsDisclaimerOpen(true)}
            className="text-amber-400 font-bold hover:text-amber-300 underline decoration-amber-500/50 hover:decoration-amber-300 transition-colors"
          >
            ⚖️ {currentLang === 'si' ? 'නීතිමය වගකීම් ප්‍රකාශය' : currentLang === 'ta' ? 'சட்டப்பூர்வ பொறுப்பு' : 'Legal Disclaimer'}
          </button>
          <span>&bull;</span>
          <button
            onClick={() => setIsAboutOpen(true)}
            className="hover:text-amber-400 underline decoration-slate-700 hover:decoration-amber-400 transition-colors"
          >
            {t.aboutUsBtn}
          </button>
          <span>&bull;</span>
          <button
            onClick={() => setIsPrivacyOpen(true)}
            className="hover:text-amber-400 underline decoration-slate-700 hover:decoration-amber-400 transition-colors"
          >
            {t.privacyBtn}
          </button>
        </div>

        <p className="max-w-2xl mx-auto text-[11px] text-slate-500 leading-relaxed">
          {t.officialNotice}
        </p>

        <p className="text-[10px] text-slate-600">
          &copy; {new Date().getFullYear()} LK Lottery Master. High Precision Optical &amp; AI Engine &bull; DLB &amp; NLB Sri Lanka.
        </p>
      </footer>

      {/* MODALS */}
      <DisclaimerModal
        isOpen={isDisclaimerOpen}
        onClose={() => setIsDisclaimerOpen(false)}
        onAccept={() => {
          setIsDisclaimerOpen(false);
        }}
        language={currentLang}
      />

      <AIScanModal
        isOpen={isAIScanOpen}
        onClose={() => setIsAIScanOpen(false)}
        language={currentLang}
        allResults={results}
        onTicketScanned={handleTicketScanned}
      />

      <AboutModal
        isOpen={isAboutOpen}
        onClose={() => setIsAboutOpen(false)}
        language={currentLang}
      />

      <PrivacyPolicyModal
        isOpen={isPrivacyOpen}
        onClose={() => setIsPrivacyOpen(false)}
        language={currentLang}
      />

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        language={currentLang}
        onLoginSuccess={(user) => setCurrentUser(user)}
      />

    </div>
  );
}
