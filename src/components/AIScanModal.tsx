import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  X, 
  Sparkles, 
  Camera, 
  CameraOff,
  Upload, 
  CheckCircle2, 
  XCircle,
  AlertCircle, 
  RefreshCw, 
  Key,
  Zap
} from 'lucide-react';
import { Language, LotteryResult, TicketMatchResult } from '../types';
import { soundCtrl } from '../utils/audio';
import { evaluateTicketMatch } from '../utils/lotteryChecker';
import { ParsedTicketData } from '../utils/qrParser';

interface AIScanModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  allResults: LotteryResult[];
  onTicketScanned: (result: TicketMatchResult, rawString: string) => void;
}

export const AIScanModal: React.FC<AIScanModalProps> = ({
  isOpen,
  onClose,
  language,
  allResults,
  onTicketScanned,
}) => {
  const [activeTab, setActiveTab] = useState<'camera' | 'upload'>('camera');
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<Record<string, unknown> | null>(null);
  const [matchResult, setMatchResult] = useState<TicketMatchResult | null>(null);
  const [keyUsedInfo, setKeyUsedInfo] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Stop camera tracks cleanly
  const stopLiveCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  }, []);

  // Start live camera when modal opens in camera mode
  const startLiveCamera = useCallback(async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setIsCameraActive(true);
    } catch (err: unknown) {
      console.warn('[AI Live Camera] Could not start camera:', err);
      const msg = err instanceof Error ? err.message : String(err);
      setCameraError(`Camera could not be started: ${msg}. You can also upload a photo below.`);
      setIsCameraActive(false);
    }
  }, []);

  // Trigger camera start on modal open
  useEffect(() => {
    if (isOpen && activeTab === 'camera') {
      startLiveCamera();
    } else {
      stopLiveCamera();
    }
    return () => {
      stopLiveCamera();
    };
  }, [isOpen, activeTab, startLiveCamera, stopLiveCamera]);

  if (!isOpen) return null;

  // Process captured/selected image through Gemini API endpoint
  const processImageWithAI = async (base64Img: string) => {
    setIsAnalyzing(true);
    setErrorMsg(null);
    setMatchResult(null);
    setExtractedData(null);
    soundCtrl.unlockAudio();

    try {
      const response = await fetch('/api/scan/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64Img,
          mimeType: 'image/jpeg',
        }),
      });

      const resJson = await response.json();
      if (!resJson.success) {
        throw new Error(resJson.error || 'Failed to analyze ticket image');
      }

      const extracted = resJson.extracted;
      setExtractedData(extracted);
      setKeyUsedInfo(resJson.keyUsed || 'Rotated Gemini Key');

      const numbersArr = Array.isArray(extracted.numbers) ? extracted.numbers.map((n: unknown) => Number(n)) : [];

      // Create parsed ticket data structure
      const ticketData: ParsedTicketData = {
        isValidLottery: true,
        isFutureDraw: false,
        hasTicketNumbers: numbersArr.length > 0,
        board: extracted.board || 'DLB',
        lotteryCode: extracted.lotteryCode || 'AK',
        lotteryName: extracted.lotteryName || 'Lottery Ticket',
        drawNo: Number(extracted.drawNo) || 4850,
        drawDate: extracted.drawDate || '2026-09-25',
        ticketNumbers: numbersArr,
        ticketLetter: extracted.letter || undefined,
        ticketZodiac: extracted.zodiac || undefined,
        ticketSuperBall: extracted.superBall ? Number(extracted.superBall) : undefined,
        rawString: `AI-SCAN:${extracted.board}:${extracted.lotteryName}:${extracted.drawNo}`,
      };

      const match = evaluateTicketMatch(ticketData, allResults);
      setMatchResult(match);
      onTicketScanned(match, ticketData.rawString);

      // Audio feedback
      if (match.isWon) {
        soundCtrl.playWinFanfare();
        soundCtrl.speakPrize(match.totalPrize, language);
      } else {
        soundCtrl.playLoseTone();
        soundCtrl.speakLose(language);
      }
    } catch (err: unknown) {
      console.error('[AIScanModal] Error:', err);
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(`AI Scan Error: ${msg}. Attempted key rotation.`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Instant capture from live video feed
  const handleSnapAndScanLive = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      setSelectedImage(dataUrl);
      processImageWithAI(dataUrl);
    }
  };

  // File upload change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        setSelectedImage(base64);
        processImageWithAI(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  // Test with demo damaged ticket
  const handleRunDemoTest = (type: 'win' | 'lose') => {
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 360;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 0, 600, 360);

      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 24px sans-serif';
      ctx.fillText(type === 'win' ? 'DLB: ADA KOTIPATHI' : 'NLB: GOVISETHA', 40, 50);

      ctx.font = '16px sans-serif';
      ctx.fillText(`Draw Date: 2026-09-25   Draw No: #${type === 'win' ? '4850' : '4520'}`, 40, 90);

      ctx.fillStyle = '#b91c1c';
      ctx.font = 'bold 36px sans-serif';
      ctx.fillText(type === 'win' ? 'Letter: B' : 'Letter: G', 40, 150);

      ctx.fillStyle = '#1e3a8a';
      ctx.font = 'bold 32px sans-serif';
      ctx.fillText(type === 'win' ? 'Numbers: 14  28  49  72' : 'Numbers: 05  19  32  60', 40, 210);

      ctx.fillStyle = '#64748b';
      ctx.font = '14px sans-serif';
      ctx.fillText('[Simulated Worn/Scratched Physical Ticket]', 40, 290);

      const demoBase64 = canvas.toDataURL('image/jpeg', 0.85);
      setSelectedImage(demoBase64);
      processImageWithAI(demoBase64);
    }
  };

  const handleModalClose = () => {
    stopLiveCamera();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        
        {/* Hidden Canvas for Video Snap */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-amber-400 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>{language === 'si' ? 'AI කැමරා ස්කෑනරය' : 'AI Camera Scanner'}</span>
                <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-extrabold uppercase border border-purple-500/30">
                  Gemini Vision
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                {language === 'si' 
                  ? 'සේදී ගිය හෝ කැඩුණු QR සහිත ටිකට්පත් කැමරාවෙන් කෙලින්ම කියවයි' 
                  : 'Reads numbers & letters directly from physical tickets with damaged QR'}
              </p>
            </div>
          </div>

          <button
            onClick={handleModalClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector Tabs (Live Camera vs Upload File) */}
        <div className="px-4 pt-3 flex items-center space-x-2 border-b border-slate-800 bg-slate-900/60">
          <button
            onClick={() => setActiveTab('camera')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-all ${
              activeTab === 'camera'
                ? 'border-purple-400 text-purple-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>{language === 'si' ? 'සජීවී කැමරාව' : 'Live Camera View'}</span>
          </button>

          <button
            onClick={() => setActiveTab('upload')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-all ${
              activeTab === 'upload'
                ? 'border-purple-400 text-purple-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>{language === 'si' ? 'ඡායාරූපයක් එක් කරන්න' : 'Upload Photo'}</span>
          </button>

          <div className="ml-auto pb-2 flex items-center gap-1">
            <button
              onClick={() => handleRunDemoTest('win')}
              disabled={isAnalyzing}
              className="text-[10px] px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 font-bold transition-all disabled:opacity-50"
            >
              Demo Win
            </button>
            <button
              onClick={() => handleRunDemoTest('lose')}
              disabled={isAnalyzing}
              className="text-[10px] px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 font-bold transition-all disabled:opacity-50"
            >
              Demo Loss
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
          
          {/* TAB 1: LIVE CAMERA VIEWFINDER */}
          {activeTab === 'camera' && (
            <div className="space-y-3">
              <div className="relative rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden min-h-[260px] sm:min-h-[300px] flex items-center justify-center">
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  className={`w-full h-full object-cover min-h-[260px] sm:min-h-[300px] ${
                    isCameraActive ? 'block' : 'hidden'
                  }`}
                />

                {!isCameraActive && (
                  <div className="text-center p-6 space-y-3">
                    <Camera className="w-10 h-10 text-slate-500 mx-auto" />
                    <p className="text-xs text-slate-400">
                      {cameraError || (language === 'si' ? 'කැමරාව ආරම්භ වෙමින් පවතී...' : 'Starting camera...')}
                    </p>
                    <button
                      onClick={startLiveCamera}
                      className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs"
                    >
                      {language === 'si' ? 'කැමරාව ක්‍රියාත්මක කරන්න' : 'Start Live Camera'}
                    </button>
                  </div>
                )}

                {/* Overlaid Viewfinder Frame */}
                {isCameraActive && (
                  <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-between p-3">
                    <div className="w-full flex justify-between">
                      <div className="px-2.5 py-1 rounded-full bg-slate-900/80 backdrop-blur-md text-[10px] text-purple-300 font-bold border border-purple-500/30 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                        AI Live Aim
                      </div>
                    </div>

                    {/* Reticle */}
                    <div className="w-56 h-36 border-2 border-dashed border-purple-400/80 rounded-xl flex items-center justify-center my-auto shadow-[0_0_15px_rgba(168,85,247,0.3)]">
                      <span className="text-[10px] font-semibold text-purple-200 bg-slate-950/70 px-2 py-0.5 rounded backdrop-blur-sm">
                        {language === 'si' ? 'ටිකට්පත මෙතැනට යොමු කරන්න' : 'Point camera at physical ticket'}
                      </span>
                    </div>

                    <div className="text-[10px] text-slate-400 bg-slate-950/70 px-2 py-0.5 rounded">
                      DLB & NLB Lottery Reader
                    </div>
                  </div>
                )}
              </div>

              {/* Instant Snap Button */}
              <button
                onClick={handleSnapAndScanLive}
                disabled={!isCameraActive || isAnalyzing}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold text-sm shadow-xl shadow-purple-600/30 active:scale-95 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {isAnalyzing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-amber-300" />
                    <span>{language === 'si' ? 'AI මගින් පරීක්ෂා කරමින් පවතී...' : 'Analyzing Ticket with Gemini AI...'}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>{language === 'si' ? 'ක්ෂණිකව ටිකට්පත AI මගින් කියවන්න' : 'Instant AI Scan Now'}</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* TAB 2: UPLOAD IMAGE */}
          {activeTab === 'upload' && (
            <div className="space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />

              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-700 hover:border-purple-500/60 rounded-2xl p-6 text-center cursor-pointer transition-all hover:bg-slate-800/40 min-h-[200px] flex flex-col items-center justify-center space-y-3"
              >
                {selectedImage ? (
                  <img
                    src={selectedImage}
                    alt="Ticket Preview"
                    className="max-h-40 rounded-xl object-contain shadow-lg"
                  />
                ) : (
                  <>
                    <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
                      <Upload className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-200">
                        {language === 'si' ? 'ටිකට් පතේ ඡායාරූපයක් තෝරන්න' : 'Select or drop ticket photo'}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        JPG, PNG, WebP up to 10MB
                      </p>
                    </div>
                  </>
                )}
              </div>

              {selectedImage && (
                <button
                  onClick={() => processImageWithAI(selectedImage)}
                  disabled={isAnalyzing}
                  className="w-full py-3 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center justify-center gap-2"
                >
                  {isAnalyzing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  <span>{language === 'si' ? 'නැවත AI මගින් පරීක්ෂා කරන්න' : 'Re-Analyze Uploaded Image'}</span>
                </button>
              )}
            </div>
          )}

          {/* Error message */}
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* RESULT CARD */}
          {matchResult && (
            <div className={`p-4 rounded-2xl border transition-all animate-fade-in ${
              matchResult.isWon 
                ? 'bg-emerald-950/80 border-emerald-500/50 shadow-xl shadow-emerald-950/50' 
                : 'bg-slate-950/80 border-slate-700'
            }`}>
              
              <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    matchResult.board === 'DLB' ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300'
                  }`}>
                    {matchResult.board}
                  </span>
                  <span className="text-sm font-bold text-white">
                    {matchResult.lotteryName}
                  </span>
                  {matchResult.drawNo > 0 && (
                    <span className="text-xs text-amber-400 font-semibold">
                      #{matchResult.drawNo}
                    </span>
                  )}
                </div>

                {keyUsedInfo && (
                  <span className="text-[10px] text-purple-300 font-mono bg-purple-950/60 px-2 py-0.5 rounded border border-purple-800">
                    {keyUsedInfo}
                  </span>
                )}
              </div>

              {matchResult.isWon ? (
                <div className="space-y-2">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-400 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-7 h-7" />
                    </div>
                    <div>
                      <div className="text-[11px] uppercase tracking-wider text-emerald-300 font-bold">
                        {language === 'si' ? 'ජයග්‍රහණයක් හිමිව ඇත!' : 'WINNING TICKET!'}
                      </div>
                      <div className="text-2xl font-black text-amber-400">
                        Rs. {matchResult.totalPrize.toLocaleString('en-US')}/=
                      </div>
                    </div>
                  </div>

                  {matchResult.prizeCategory && (
                    <div className="text-xs text-emerald-200 font-semibold">
                      🏆 {matchResult.prizeCategory}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 text-slate-400 flex items-center justify-center shrink-0">
                    <XCircle className="w-6 h-6 text-slate-400" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-200">
                      {language === 'si' ? 'මෙවර ඔබට ජයග්‍රහණයක් හිමිවී නොමැත' : 'You have lost this time'}
                    </div>
                    <div className="text-xs text-amber-400 font-medium">
                      {language === 'si' ? 'මීළඟ වර ඔබ දිනනු ඇත!' : 'Next time you may win!'}
                    </div>
                  </div>
                </div>
              )}

              {/* DUAL COMPARISON GRID: AI Read vs Official Results */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs mt-3 pt-2.5 border-t border-slate-800">
                {/* 1. AI Scanned Ticket Data */}
                <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-700/60">
                  <div className="text-[10px] font-bold text-slate-400 mb-1 flex items-center justify-between">
                    <span>🎟️ AI Read Ticket:</span>
                    <span>{matchResult.drawDate || 'Today'}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {matchResult.ticketLetter && (
                      <span className={`w-7 h-7 rounded-lg font-bold flex items-center justify-center text-xs ${
                        matchResult.matchedLetter ? 'bg-emerald-500 text-slate-950 font-black ring-1 ring-emerald-300' : 'bg-slate-800 text-slate-300'
                      }`}>
                        {matchResult.ticketLetter}
                      </span>
                    )}
                    {matchResult.ticketNumbers.map((n, idx) => {
                      const isMatch = matchResult.matchedNumbers.includes(n);
                      return (
                        <span
                          key={idx}
                          className={`w-7 h-7 rounded-lg font-bold flex items-center justify-center text-xs ${
                            isMatch ? 'bg-emerald-500 text-slate-950 font-black ring-1 ring-emerald-300' : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {n < 10 ? `0${n}` : n}
                        </span>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Official Winning Results */}
                <div className="p-2 rounded-xl bg-slate-900/60 border border-amber-500/40">
                  <div className="text-[10px] font-bold text-amber-300 mb-1 flex items-center justify-between">
                    <span>🏆 Official Results:</span>
                    <span className="text-[9px] text-emerald-400 font-semibold">{matchResult.board === 'DLB' ? 'dlb.lk' : 'nlb.lk'}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {matchResult.officialLetter && (
                      <span className="w-7 h-7 rounded-lg bg-gradient-to-b from-amber-400 to-yellow-500 text-slate-950 font-black text-xs flex items-center justify-center shadow-sm">
                        {matchResult.officialLetter}
                      </span>
                    )}
                    {(matchResult.officialNumbers || []).map((num, idx) => (
                      <span
                        key={idx}
                        className="w-7 h-7 rounded-lg bg-gradient-to-b from-amber-400 to-yellow-500 text-slate-950 font-black text-xs flex items-center justify-center shadow-sm"
                      >
                        {num < 10 ? `0${num}` : num}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Match Comparison Summary Bar */}
              <div className="mt-2 p-1.5 rounded-lg bg-slate-900/80 border border-slate-800 flex items-center justify-between text-[11px]">
                <span className="text-slate-300 font-semibold">
                  {language === 'si' 
                    ? `ගැලපීම: අංක ${matchResult.matchedNumbers.length} ක් + ${matchResult.matchedLetter ? 'අකුර' : 'අකුර නොගැලපේ'}`
                    : `Matched: ${matchResult.matchedNumbers.length} Numbers + ${matchResult.matchedLetter ? 'Letter' : 'No Letter'}`}
                </span>
                <span className={`font-black ${matchResult.isWon ? 'text-amber-400' : 'text-slate-400'}`}>
                  {matchResult.isWon ? `Rs. ${matchResult.totalPrize.toLocaleString('en-US')}/=` : 'No Win'}
                </span>
              </div>

            </div>
          )}

        </div>

      </div>
    </div>
  );
};
