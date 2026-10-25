import React from 'react';
import { AlertTriangle, ShieldCheck, CheckCircle2, Scale } from 'lucide-react';
import { Language } from '../types';
import { TRANSLATIONS } from '../utils/translations';

interface DisclaimerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: () => void;
  language: Language;
}

export const DisclaimerModal: React.FC<DisclaimerModalProps> = ({
  isOpen,
  onClose,
  onAccept,
  language,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-xl bg-slate-900 border border-amber-500/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header banner */}
        <div className="bg-gradient-to-r from-amber-600 via-yellow-600 to-amber-700 px-5 py-4 flex items-center space-x-3 text-slate-950">
          <div className="p-2 bg-slate-950/20 rounded-xl">
            <Scale className="w-6 h-6 text-slate-950" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black tracking-tight leading-tight">
              {language === 'si'
                ? 'නීතිමය වගකීම් ප්‍රකාශය සහ භාවිත කොන්දේසි'
                : language === 'ta'
                ? 'சட்டப்பூர்வ பொறுப்பு துறப்பு மற்றும் பயன்பாட்டு விதிமுறைகள்'
                : 'Legal Disclaimer & Mandatory Terms of Use'}
            </h2>
            <p className="text-xs font-semibold text-slate-900/80">
              LK Lottery Master &bull; Independent Technological Utility
            </p>
          </div>
        </div>

        {/* Content body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs sm:text-sm text-slate-300 leading-relaxed">
          
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <p className="font-semibold text-amber-200">
              {language === 'si'
                ? 'මෙම යෙදුම පරිගණක හා කෘත්‍රිම බුද්ධි (AI) තාක්ෂණය මත පදනම්ව ස්වාධීනව නිර්මාණය කරන ලද්දකි. කරුණාකර භාවිතයට පෙර පහත කොන්දේසි හොඳින් කියවා පිළිගන්න.'
                : language === 'ta'
                ? 'இந்த செயலி AI மற்றும் கணினி தொழில்நுட்பத்தின் அடிப்படையில் சுயாதீனமாக உருவாக்கப்பட்டது. பயன்பாட்டிற்கு முன் விதிமுறைகளை கவனமாக படிக்கவும்.'
                : 'This application is an independently developed technological aid utilizing computer vision and AI. Please read and accept these terms before proceeding.'}
            </p>
          </div>

          <div className="space-y-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800 text-slate-300 text-xs sm:text-xs">
            
            <div>
              <h4 className="font-bold text-amber-400 uppercase tracking-wider mb-1 flex items-center space-x-1.5">
                <span>1. නිල නොවන ස්වාධීන යෙදුමක් බව (Independent Entity)</span>
              </h4>
              <p>
                {language === 'si'
                  ? 'LK Lottery Master යනු ශ්‍රී ලංකා සංවර්ධන ලොතරැයි මණ්ඩලය (DLB) හෝ ජාතික ලොතරැයි මණ්ඩලය (NLB) සමග සෘජු අනුබද්ධතාවයක් නොමැති ස්වාධීන සහායක තාක්ෂණික මෘදුකාංගයකි.'
                  : 'LK Lottery Master is an independent technological platform and has no direct affiliation or representation of the National Lotteries Board (NLB) or Development Lotteries Board (DLB).'}
              </p>
            </div>

            <div>
              <h4 className="font-bold text-amber-400 uppercase tracking-wider mb-1">
                2. සම්පූර්ණ වගකීම් විමුක්තිය (Zero Liability & User Responsibility)
              </h4>
              <p>
                {language === 'si'
                  ? 'කැමරා කාචයේ පැහැදිලි නොවීම් (Blur), ආලෝක තත්ත්ව, මුද්‍රණ දෝෂ හෝ ජාල දෝෂ හේතුවෙන් ස්කෑන් කිරීමකදී හෝ ප්‍රතිඵල ගැලපීමේදී යම් දෝෂයක් හෝ වැරදි තොරතුරක් සිදුවුවහොත්, එමගින් සිදුවන කිසිදු මූල්‍යමය, නීතිමය හෝ වෙනත් පාඩුවක් සම්බන්ධයෙන් මෙම ඇප් එක හෝ එහි සංවර්ධකයන් කිසිසේත්ම වගකියනු නොලැබේ. එහි සම්පූර්ණ අවදානම සහ වගකීම පරිශීලකයා විසින් දැරිය යුතුය.'
                  : 'Due to camera focus/lighting, physical ticket wear, or network latency, automated QR scanning and AI interpretations may rarely encounter discrepancies. Under no circumstances shall the application, its developers, or hosting providers be legally, financially, or tortiously liable for any missed claims, misidentifications, or damages. Full responsibility rests solely with the user.'}
              </p>
            </div>

            <div>
              <h4 className="font-bold text-amber-400 uppercase tracking-wider mb-1">
                3. නිල තහවුරු කිරීමේ අවශ්‍යතාව (Mandatory Official Verification)
              </h4>
              <p>
                {language === 'si'
                  ? 'ඕනෑම ලොතරැයි පතක් ජයග්‍රහණය කළ බවට ස්ථිර කරගැනීමට සහ මුදල් ලබාගැනීමට පෙර, නිල DLB (dlb.lk) හෝ NLB (nlb.lk) වෙබ් අඩවි මගින් හෝ බලයලත් ලොතරැයි නියෝජිතයෙකු ලවා ටිකට් පත පරීක්ෂා කර තහවුරු කරගැනීම පරිශීලකයාගේ අනිවාර්ය යුතුකමකි.'
                  : 'Before disposing of any ticket or making financial commitments, users are required by law and prudent practice to cross-verify physical tickets at authorized DLB (dlb.lk) or NLB (nlb.lk) dealer terminals.'}
              </p>
            </div>

            <div>
              <h4 className="font-bold text-amber-400 uppercase tracking-wider mb-1">
                4. වලංගු කාලය (180-Day / 6-Month Claim Limit)
              </h4>
              <p>
                {language === 'si'
                  ? 'ශ්‍රී ලංකා නීතියට අනුව ලොතරැයි පතක දිනුම් මුදල් ලබාගත හැක්කේ දිනුම් ඇදීම සිදුකළ දින සිට දින 180 ක් (මාස 6 ක්) ඇතුළත පමණි.'
                  : 'In accordance with Sri Lankan statutory regulations, lottery winning claims must be submitted within 180 days (6 months) from the draw date.'}
              </p>
            </div>

          </div>

        </div>

        {/* Action button */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between space-x-3">
          <div className="flex items-center space-x-2 text-[11px] text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Encrypted &bull; 100% Client Privacy</span>
          </div>

          <button
            onClick={() => {
              onAccept();
              onClose();
            }}
            className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs sm:text-sm shadow-lg shadow-amber-500/20 active:scale-95 transition-all"
          >
            <CheckCircle2 className="w-4 h-4 text-slate-950" />
            <span>{TRANSLATIONS[language].disclaimerAccept}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
