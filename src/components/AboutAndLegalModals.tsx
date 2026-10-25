import React from 'react';
import { X, Shield, BookOpen, FileText, CheckCircle, Award } from 'lucide-react';
import { Language } from '../types';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
}

export const AboutModal: React.FC<ModalProps> = ({ isOpen, onClose, language }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center space-x-2">
            <BookOpen className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-white text-base">
              {language === 'si' ? 'අප ගැන (About LK Lottery Master)' : language === 'ta' ? 'எங்களைப் பற்றி' : 'About LK Lottery Master'}
            </h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4 text-xs sm:text-sm text-slate-300 leading-relaxed">
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl">
            <h4 className="font-bold text-amber-300 mb-1">
              {language === 'si' ? 'ශ්‍රී ලංකාවේ ප්‍රමුඛතම ලොතරැයි සහායක මෘදුකාංගය' : 'Sri Lanka Premier Lottery Utility'}
            </h4>
            <p className="text-slate-300">
              {language === 'si'
                ? 'LK Lottery Master යනු ශ්‍රී ලාංකික DLB (සංවර්ධන ලොතරැයි මණ්ඩලය) සහ NLB (ජාතික ලොතරැයි මණ්ඩලය) ලොතරැයි මිලදී ගන්නා ජනතාවට තත්පර කිහිපයකින් ප්‍රතිඵල පරීක්ෂා කරගැනීමට නිර්මාණය කළ නවීන වෙබ් යෙදුමකි.'
                : 'LK Lottery Master is a high-performance web utility built specifically for Sri Lankan lottery enthusiasts to verify DLB and NLB results effortlessly.'}
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-white flex items-center space-x-1.5">
              <Award className="w-4 h-4 text-amber-400" />
              <span>{language === 'si' ? 'ප්‍රධාන තාක්ෂණික විශේෂාංග' : 'Core Features'}</span>
            </h4>
            <ul className="list-disc pl-5 space-y-1 text-slate-400">
              <li>{language === 'si' ? 'Ultra HD Macro QR ස්කෑනරය (කුඩා QR කේත සඳහා විශේෂිත සූම් හා ෆෝකස් පහසුකම්)' : 'Macro HD QR Scanner optimized for micro QR codes with continuous autofocus and zoom'}</li>
              <li>{language === 'si' ? 'ස්වයංක්‍රීය ශ්‍රව්‍ය නිවේදන (සිංහල, ඉංග්‍රීසි, දෙමළ භාෂාවලින් දිනුම් මුදල හඬින් ප්‍රකාශ කිරීම)' : 'Multilingual voice prize announcer (Sinhala, English, Tamil) with Web Audio fanfare'}</li>
              <li>{language === 'si' ? 'AI Vision Scan - හානි වූ හෝ පැහැදිලි නැති ටිකට් පත් කියවීමේ හැකියාව' : 'AI Ticket Vision reader powered by rotated Gemini API for worn tickets'}</li>
              <li>{language === 'si' ? 'මාස 6 ක (දින 180) පූර්ණ ලොතරැයි ප්‍රතිඵල දත්ත ගබඩාව' : 'Full 6-month historical database adhering to the 180-day statutory validity window'}</li>
              <li>{language === 'si' ? 'නොබැඳි (Offline) ක්‍රියාකාරීත්වය - Cache තාක්ෂණය' : 'Offline caching support for seamless access on the go'}</li>
            </ul>
          </div>
        </div>

        <div className="p-3 bg-slate-950 border-t border-slate-800 text-center">
          <p className="text-[11px] text-slate-500">
            Official Data Sources: dlb.lk &bull; nlb.lk &bull; Made with pride in Sri Lanka
          </p>
        </div>
      </div>
    </div>
  );
};

export const PrivacyPolicyModal: React.FC<ModalProps> = ({ isOpen, onClose, language }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center space-x-2">
            <Shield className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-white text-base">
              {language === 'si' ? 'පෞද්ගලිකත්ව ප්‍රතිපත්තිය (Privacy Policy)' : 'Privacy Policy'}
            </h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-3 text-xs sm:text-sm text-slate-300 leading-relaxed">
          <div>
            <h4 className="font-bold text-emerald-400 uppercase tracking-wide text-[11px]">1. Camera Stream Privacy</h4>
            <p className="text-slate-400 text-xs mt-1">
              {language === 'si'
                ? 'ඔබගේ කැමරාව භාවිතා කරනු ලබන්නේ QR කේතය කියවීම සඳහා පමණක් වන අතර කිසිදු වීඩියෝවක් හෝ අනවසර ඡායාරූපයක් අපගේ සේවාදායකයන් වෙත යවනු හෝ ගබඩා කරනු නොලැබේ. සැකසුම් ක්‍රියාවලිය ඔබගේ දුරකථනයේම (Client-side) සිදුවේ.'
                : 'Camera video frames are processed locally in real-time within your browser sandbox. No continuous video feeds are recorded or stored on remote servers.'}
            </p>
          </div>

          <div>
            <h4 className="font-bold text-emerald-400 uppercase tracking-wide text-[11px]">2. AI Scan Photos</h4>
            <p className="text-slate-400 text-xs mt-1">
              {language === 'si'
                ? 'AI Scan සඳහා ඔබ විසින් ලබාදෙන ලොතරැයි පතෙහි ඡායාරූපය අංක හඳුනාගැනීමෙන් අනතුරුව වහාම මතකයෙන් ඉවත් කරනු ලැබේ.'
                : 'Ticket images provided specifically for AI optical analysis are transmitted over encrypted TLS tunnels solely to extract draw data and are purged immediately.'}
            </p>
          </div>

          <div>
            <h4 className="font-bold text-emerald-400 uppercase tracking-wide text-[11px]">3. Local Storage</h4>
            <p className="text-slate-400 text-xs mt-1">
              {language === 'si'
                ? 'ඔබගේ ස්කෑන් ඉතිහාසය සහ වාසනා අංක ඔබගේම උපකරණයේ (Local Storage / Cache) සුරක්ෂිතව තබාගැනේ. ඕනෑම අවස්ථාවක "Clear History" මගින් ඒවා මකා දැමිය හැකිය.'
                : 'Scan histories and numerological profiles are cached locally on your device for fast offline recall. You may clear your history at any moment.'}
            </p>
          </div>
        </div>

        <div className="p-3 bg-slate-950 border-t border-slate-800 text-center">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
