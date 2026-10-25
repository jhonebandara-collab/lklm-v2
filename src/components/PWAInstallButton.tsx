import React, { useState } from 'react';
import { Download, Smartphone, X, Share, MoreVertical } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Language } from '../types';

interface PWAInstallButtonProps {
  language?: Language;
  className?: string;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  language = 'si',
  className = '',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  // If already running as an installed standalone PWA, hide button
  if (isInstalled) {
    return null;
  }

  const handleClick = async () => {
    if (isInstallable) {
      const ok = await install();
      if (!ok) {
        setShowGuide(true);
      }
    } else {
      setShowGuide(true);
    }
  };

  return (
    <>
      <button
        onClick={handleClick}
        className={`flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 px-2.5 sm:px-3 py-1.5 text-xs font-bold text-slate-950 shadow-md shadow-amber-500/20 active:scale-95 transition-all ${className}`}
        title="Install LK Lottery Master App on Phone"
      >
        <Download className="w-3.5 h-3.5" />
        <span>
          {language === 'si' 
            ? 'App එක Install කරන්න' 
            : language === 'ta' 
              ? 'செயலியை நிறுவு' 
              : 'Install App'}
        </span>
      </button>

      {/* In-App Installation Guide Modal (Zero window.alert) */}
      {showGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-fadeIn">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-700 p-5 shadow-2xl text-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
                  <Smartphone className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-white">
                  {language === 'si' ? 'දුරකථනයට App එක Install කරගන්න' : 'Install LK Lottery App'}
                </h3>
              </div>
              <button
                onClick={() => setShowGuide(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-3.5 space-y-3 text-xs text-slate-300 leading-relaxed">
              {isIOS ? (
                // iOS Safari Steps
                <>
                  <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
                    <div className="p-1.5 rounded-lg bg-sky-500/20 text-sky-400 shrink-0">
                      <Share className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-white block">1. Share බොත්තම ඔබන්න</span>
                      <span>Safari බ්‍රවුසරයේ පහළ ඇති <strong>Share</strong> (බෙදාගැනීමේ) අයිකනය ඔබන්න.</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
                    <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 shrink-0">
                      <Download className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-white block">2. Add to Home Screen</span>
                      <span>මෙනුවෙන් පහළට ගොස් <strong>"Add to Home Screen"</strong> තෝරා <strong>Add</strong> ඔබන්න.</span>
                    </div>
                  </div>
                </>
              ) : (
                // Android Chrome / Brave / Edge / Samsung Internet Steps
                <>
                  <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
                    <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 shrink-0">
                      <MoreVertical className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-white block">1. බ්‍රවුසරයේ Menu (⋮) ඔබන්න</span>
                      <span>Chrome හෝ ඔබගේ බ්‍රවුසරයේ ඉහළ දකුණු කෙළවරේ ඇති <strong>තිත් 3 (⋮)</strong> ඔබන්න.</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
                    <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 shrink-0">
                      <Download className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-white block">2. "Install app" හෝ "Add to Home screen"</span>
                      <span>මෙනුවේ ඇති <strong>"Install app"</strong> (හෝ <strong>"Add to Home screen"</strong>) ඔබන්න.</span>
                    </div>
                  </div>
                </>
              )}

              <p className="text-[11px] text-amber-300/90 text-center font-medium pt-1">
                {language === 'si'
                  ? 'ස්ථාපනය කළ පසු ඔබගේ Phone එකේ Home Screen එකෙන් සෘජුවම App එක ලෙස විවෘත කළ හැක!'
                  : 'Once installed, open directly from your phone Home screen like a native app!'}
              </p>
            </div>

            <button
              onClick={() => setShowGuide(false)}
              className="mt-4 w-full rounded-xl bg-amber-500 hover:bg-amber-400 py-2.5 text-xs font-bold text-slate-950 transition-colors"
            >
              {language === 'si' ? 'හරි, තේරුණා' : 'Got it'}
            </button>
          </div>
        </div>
      )}
    </>
  );
};
