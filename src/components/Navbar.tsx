import React from 'react';
import { Volume2, VolumeX, ShieldCheck, User as UserIcon, Globe, Sparkles } from 'lucide-react';
import { Language, UserAccount } from '../types';
import { TRANSLATIONS } from '../utils/translations';
import { soundCtrl } from '../utils/audio';
import { PWAInstallButton } from './PWAInstallButton';

interface NavbarProps {
  currentLang: Language;
  onLanguageChange: (lang: Language) => void;
  currentUser: UserAccount | null;
  onOpenAuth: () => void;
  onLogout: () => void;
  activeTab: string;
  onSelectTab: (tab: string) => void;
  onOpenDisclaimer: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentLang,
  onLanguageChange,
  currentUser,
  onOpenAuth,
  onLogout,
  activeTab,
  onSelectTab,
  onOpenDisclaimer,
  isMuted,
  onToggleMute,
}) => {
  const t = TRANSLATIONS[currentLang];

  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 shadow-lg">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Brand */}
          <div 
            onClick={() => onSelectTab('scanner')}
            className="flex items-center space-x-3 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-amber-400 to-yellow-300 p-0.5 shadow-md shadow-amber-500/20 group-hover:scale-105 transition-transform">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <span className="text-xl font-black bg-gradient-to-r from-amber-400 to-yellow-200 bg-clip-text text-transparent">
                  LK
                </span>
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-extrabold text-base sm:text-lg tracking-tight text-white group-hover:text-amber-400 transition-colors">
                  LK Lottery Master
                </span>
                <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  DLB &bull; NLB
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block truncate max-w-xs">
                {currentLang === 'si' ? 'ශ්‍රී ලංකා ලොතරැයි ස්කෑනරය' : currentLang === 'ta' ? 'இலங்கை லாட்டரி ஸ்கேனர்' : 'Sri Lanka Lottery Scanner'}
              </p>
            </div>
          </div>

          {/* Right Action Controls */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            
            {/* Audio Mute/Unmute */}
            <button
              onClick={() => {
                soundCtrl.setMuted(!isMuted);
                onToggleMute();
              }}
              title={isMuted ? 'Unmute Audio & Voice' : 'Mute Audio & Voice'}
              className={`p-2 rounded-lg border transition-colors ${
                isMuted 
                  ? 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white' 
                  : 'bg-amber-500/15 text-amber-400 border-amber-500/30 hover:bg-amber-500/25'
              }`}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 animate-pulse" />}
            </button>

            {/* PWA In-App Install Button */}
            <PWAInstallButton language={currentLang} />

            {/* Language Selector */}
            <div className="flex items-center bg-slate-800/80 rounded-lg p-0.5 border border-slate-700 text-xs font-semibold">
              <button
                onClick={() => onLanguageChange('si')}
                className={`px-2 py-1 rounded transition-colors ${
                  currentLang === 'si' ? 'bg-amber-500 text-slate-950 font-bold shadow-sm' : 'text-slate-300 hover:text-white'
                }`}
              >
                සිංහල
              </button>
              <button
                onClick={() => onLanguageChange('en')}
                className={`px-2 py-1 rounded transition-colors ${
                  currentLang === 'en' ? 'bg-amber-500 text-slate-950 font-bold shadow-sm' : 'text-slate-300 hover:text-white'
                }`}
              >
                EN
              </button>
              <button
                onClick={() => onLanguageChange('ta')}
                className={`px-2 py-1 rounded transition-colors ${
                  currentLang === 'ta' ? 'bg-amber-500 text-slate-950 font-bold shadow-sm' : 'text-slate-300 hover:text-white'
                }`}
              >
                தமிழ்
              </button>
            </div>

            {/* User Profile / Auth */}
            {currentUser ? (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => onSelectTab('account')}
                  className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 hover:border-amber-500 text-xs font-medium text-slate-200 transition-colors"
                  title="View My Account & History"
                >
                  <div className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-[10px]">
                    {currentUser.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="max-w-[70px] sm:max-w-[100px] truncate">{currentUser.name}</span>
                  {currentUser.role === 'admin' && (
                    <span className="text-[9px] bg-red-500/20 text-red-300 px-1 py-0.5 rounded font-mono">ADMIN</span>
                  )}
                </button>
                <button
                  onClick={onLogout}
                  className="text-xs text-slate-400 hover:text-red-400 px-1 py-1"
                  title="Logout"
                >
                  ✕
                </button>
              </div>
            ) : (
              <button
                onClick={() => onSelectTab('account')}
                className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-bold shadow-sm transition-all active:scale-95"
              >
                <UserIcon className="w-3.5 h-3.5" />
                <span>{currentLang === 'si' ? 'මගේ ගිණුම' : currentLang === 'ta' ? 'என் கணக்கு' : 'My Account'}</span>
              </button>
            )}

            {/* Legal Disclaimer button */}
            <button
              onClick={onOpenDisclaimer}
              title="View Legal Disclaimer & Terms"
              className="flex items-center space-x-1 px-2 sm:px-2.5 py-1 text-[11px] rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20 hover:text-amber-200 transition-colors"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="font-semibold">{currentLang === 'si' ? 'වගකීම' : currentLang === 'ta' ? 'விதிமுறை' : 'Legal'}</span>
            </button>

          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="flex space-x-1 sm:space-x-2 py-2 overflow-x-auto no-scrollbar border-t border-slate-800/60">
          <button
            onClick={() => onSelectTab('scanner')}
            className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold whitespace-nowrap transition-all flex items-center space-x-1.5 ${
              activeTab === 'scanner'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-bold'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <span>📸</span>
            <span>{t.tabScanner}</span>
          </button>

          <button
            onClick={() => onSelectTab('results')}
            className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold whitespace-nowrap transition-all flex items-center space-x-1.5 ${
              activeTab === 'results'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-bold'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <span>📊</span>
            <span>{t.tabResults}</span>
          </button>

          <button
            onClick={() => onSelectTab('history')}
            className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold whitespace-nowrap transition-all flex items-center space-x-1.5 ${
              activeTab === 'history'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-bold'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <span>📜</span>
            <span>{t.tabHistory}</span>
          </button>

          <button
            onClick={() => onSelectTab('account')}
            className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold whitespace-nowrap transition-all flex items-center space-x-1.5 ${
              activeTab === 'account'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-bold'
                : 'text-amber-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <span>👤</span>
            <span>{currentLang === 'si' ? 'මගේ ගිණුම' : currentLang === 'ta' ? 'என் கணக்கு' : 'My Account'}</span>
          </button>

          <button
            onClick={() => onSelectTab('lucky')}
            className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold whitespace-nowrap transition-all flex items-center space-x-1.5 ${
              activeTab === 'lucky'
                ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-md shadow-purple-500/20 font-bold'
                : 'text-purple-300 hover:text-white hover:bg-purple-950/40'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-yellow-300 animate-spin" />
            <span>{t.tabLucky}</span>
            <span className="text-[9px] bg-purple-300/20 text-purple-200 px-1 py-0.2 rounded uppercase">PRO</span>
          </button>

          {currentUser?.role === 'admin' && (
            <button
              onClick={() => onSelectTab('admin')}
              className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold whitespace-nowrap transition-all flex items-center space-x-1.5 ${
                activeTab === 'admin'
                  ? 'bg-red-500 text-white shadow-md shadow-red-500/20 font-bold'
                  : 'text-red-300 hover:text-white hover:bg-red-950/40'
              }`}
            >
              <span>🛠️</span>
              <span>{t.tabAdmin}</span>
            </button>
          )}
        </div>

      </div>
    </header>
  );
};
