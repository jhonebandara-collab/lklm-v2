import React, { useState, useEffect, useRef, useCallback } from 'react';
import jsQR from 'jsqr';
import { QRCodeReader, RGBLuminanceSource, BinaryBitmap, HybridBinarizer } from '@zxing/library';
import confetti from 'canvas-confetti';
import { 
  Camera, 
  CameraOff, 
  Zap, 
  ZapOff, 
  ZoomIn, 
  Sparkles, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  ScanLine, 
  Volume2,
  RefreshCw,
  Focus,
  Maximize2,
  Pause,
  Play,
  ShieldCheck,
  Eye,
  EyeOff,
  Edit3,
  Check,
  RotateCcw,
  Upload,
  Image as ImageIcon,
} from 'lucide-react';
import { Language, LotteryResult, TicketMatchResult } from '../types';
import { TRANSLATIONS } from '../utils/translations';
import { soundCtrl } from '../utils/audio';
import { parseLotteryQr, ParsedTicketData, ZODIAC_MAPPING } from '../utils/qrParser';
import { evaluateTicketMatch } from '../utils/lotteryChecker';
import { decodeTicketImage } from '../utils/ticketQrDecoder';

interface QRScannerViewProps {
  language: Language;
  allResults: LotteryResult[];
  onTicketScanned: (result: TicketMatchResult, rawString: string) => void;
  onOpenAIScan: () => void;
}

export const QRScannerView: React.FC<QRScannerViewProps> = ({
  language,
  allResults,
  onTicketScanned,
  onOpenAIScan,
}) => {
  const t = TRANSLATIONS[language];

  // Camera states
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [torchAvailable, setTorchAvailable] = useState<boolean>(false);
  const [isTorchOn, setIsTorchOn] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(1.5); // Default 1.5x macro
  const [maxZoom, setMaxZoom] = useState<number>(3.0);
  const [hasZoomSupport, setHasZoomSupport] = useState<boolean>(false);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');

  // Scanning & result states
  const [activeResult, setActiveResult] = useState<TicketMatchResult | null>(null);
  const [countdownSeconds, setCountdownSeconds] = useState<number>(5);
  const [isTimerPaused, setIsTimerPaused] = useState<boolean>(false);
  const [showRawData, setShowRawData] = useState<boolean>(false);
  const [focusIndicator, setFocusIndicator] = useState<{ x: number; y: number } | null>(null);
  const [isRefocusing, setIsRefocusing] = useState<boolean>(false);
  const [isEcoSleeping, setIsEcoSleeping] = useState<boolean>(false);
  const [isTestPanelOpen, setIsTestPanelOpen] = useState<boolean>(false);

  // Manual Ticket Input & Editing states (for URL QR tickets or adjusting misread digits)
  const [manualLetter, setManualLetter] = useState<string>('');
  const [manualZodiac, setManualZodiac] = useState<string>('කටක');
  const [manualNums, setManualNums] = useState<string[]>(['', '', '', '']);
  const [manualSuperBall, setManualSuperBall] = useState<string>('');
  const [isEditingNumbers, setIsEditingNumbers] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const scanTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isCooldownRef = useRef<boolean>(false);
  const isCameraActiveRef = useRef<boolean>(false);
  const lastActivityRef = useRef<number>(Date.now());
  const lastScannedStringRef = useRef<string>('');
  const lastScanTimestampRef = useRef<number>(0);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const barcodeDetectorRef = useRef<any>(null);
  const zxingReaderRef = useRef<QRCodeReader | null>(null);
  const [isProcessingImage, setIsProcessingImage] = useState<boolean>(false);

  // Initialize BarcodeDetector & ZXing reader
  useEffect(() => {
    try {
      zxingReaderRef.current = new QRCodeReader();
    } catch {
      // ignore
    }

    if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        barcodeDetectorRef.current = new (window as any).BarcodeDetector({
          formats: ['qr_code', 'code_128', 'ean_13'],
        });
        console.log('[QR Scanner] Native BarcodeDetector initialized for high-speed hardware scanning.');
      } catch (e) {
        console.warn('[QR Scanner] Native BarcodeDetector failed, using jsQR fallback:', e);
      }
    }
  }, []);

  // Auto-attempt starting the camera immediately on mount (silent on initial block)
  useEffect(() => {
    if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
      navigator.mediaDevices.enumerateDevices().then(devices => {
        const videoInputs = devices.filter(d => d.kind === 'videoinput');
        setVideoDevices(videoInputs);
        // Default to environment/back camera
        const backCam = videoInputs.find(d => 
          d.label.toLowerCase().includes('back') || 
          d.label.toLowerCase().includes('rear') || 
          d.label.toLowerCase().includes('environment')
        );
        if (backCam) {
          setSelectedDeviceId(backCam.deviceId);
        } else if (videoInputs.length > 0) {
          setSelectedDeviceId(videoInputs[0].deviceId);
        }
      }).catch(() => {});
    }

    // Camera starts on user interaction or explicit button tap to keep mobile phone cool
    // startCamera is called when user taps Start Camera Scanner
  }, []);

  // Stop camera tracks cleanly
  const stopCamera = useCallback(() => {
    if (scanTimerRef.current) {
      clearTimeout(scanTimerRef.current);
      scanTimerRef.current = null;
    }
    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
      });
      streamRef.current = null;
    }
    setIsCameraActive(false);
    isCameraActiveRef.current = false;
    setIsTorchOn(false);
  }, []);

  // Handle scanned ticket result: beep, speak, 5-second countdown & auto-resume
  const handleScannedData = useCallback((rawString: string) => {
    const now = Date.now();
    // Prevent duplicate scans within 2 seconds for identical string
    if (isCooldownRef.current) return;
    if (lastScannedStringRef.current === rawString && now - lastScanTimestampRef.current < 2500) {
      return;
    }

    isCooldownRef.current = true;
    lastScannedStringRef.current = rawString;
    lastScanTimestampRef.current = now;
    lastActivityRef.current = now;
    if (scanTimerRef.current) {
      clearTimeout(scanTimerRef.current);
      scanTimerRef.current = null;
    }

    // 1. Audio detect feedback immediately
    soundCtrl.playDetectBeep();
    soundCtrl.triggerVibration([100, 50, 100]);

    // 2. Parse & match
    const parsed = parseLotteryQr(rawString);
    const match = evaluateTicketMatch(parsed, allResults);

    setActiveResult(match);
    onTicketScanned(match, rawString);

    // Populate manual input state for editing or checking
    const expectedCount = match.lotteryType === '6D+L' ? 6 : (match.lotteryType === '3N' || match.lotteryType === '3N+Z' ? 3 : (match.lotteryType === '2N+L+SB' ? 2 : 4));

    if (match.hasTicketNumbers) {
      setManualLetter(match.ticketLetter || '');
      setManualZodiac(match.ticketZodiac || 'කටක');
      const formattedNums = match.ticketNumbers.map(n => match.lotteryType === '6D+L' ? n.toString() : (n < 10 ? `0${n}` : n.toString()));
      
      // If fewer numbers than expected were read (e.g. only 2 numbers for a 4-number lottery), pad empty slots and open interactive editor
      if (formattedNums.length < expectedCount) {
        while (formattedNums.length < expectedCount) {
          formattedNums.push('');
        }
        setManualNums(formattedNums);
        setIsEditingNumbers(true);
        setIsTimerPaused(true);
        if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
      } else {
        setManualNums(formattedNums);
        setIsEditingNumbers(false);
      }
      setManualSuperBall(match.ticketSuperBall !== undefined ? match.ticketSuperBall.toString() : '');
    } else {
      // Official Draw URL / Verification QR without ticket numbers
      // Open the interactive number checker so user can verify their ticket
      // Note: Do not pre-fill winning letter to prevent confusion
      setManualLetter('');
      setManualZodiac(match.officialZodiac || 'කටක');
      setManualNums(Array(expectedCount).fill(''));
      setManualSuperBall('');
      setIsEditingNumbers(true);
      setIsTimerPaused(true);
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    }

    // 3. Audio & Voice Speech based on user requirement:
    // If win: "You won Rupees [Amount]" + fanfare
    // If loss: "You have lost this time, next time you may win" + tone
    soundCtrl.unlockAudio();

    if (match.isWon) {
      soundCtrl.playWinFanfare();
      soundCtrl.speakPrize(match.totalPrize, language);
      try {
        confetti({
          particleCount: 90,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#eab308', '#22c55e', '#3b82f6', '#ec4899'],
        });
      } catch {
        // ignore
      }
    } else if (match.isValidLottery && !match.isFutureDraw && match.hasTicketNumbers) {
      soundCtrl.playLoseTone();
      soundCtrl.speakLose(language);
    }

    // 4. If ticket numbers are present, start 5-second auto countdown before auto-clearing & resuming scan
    if (match.hasTicketNumbers) {
      setCountdownSeconds(5);
      setIsTimerPaused(false);
      setShowRawData(false);
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);

      let remaining = 5;
      countdownTimerRef.current = setInterval(() => {
        remaining -= 1;
        setCountdownSeconds(remaining);

        if (remaining <= 0) {
          if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
          setActiveResult(null);
          // Cool down for 0.6s so camera smoothly reads the NEXT ticket
          setTimeout(() => {
            isCooldownRef.current = false;
            lastActivityRef.current = Date.now();
            startScanLoop();
          }, 600);
        }
      }, 1000);
    }
  }, [allResults, language, onTicketScanned]);

  // Evaluates user-entered ticket numbers against the verified official draw
  const handleVerifyManualTicket = () => {
    if (!activeResult) return;
    soundCtrl.unlockAudio();

    const is6D = activeResult.lotteryType === '6D+L';
    const is3N = activeResult.lotteryType === '3N' || activeResult.lotteryType === '3N+Z';
    const is2N = activeResult.lotteryType === '2N+L+SB';
    const isZodiac = activeResult.lotteryCode === 'LW' || activeResult.lotteryCode === 'HD' || activeResult.lotteryCode === 'SD' || activeResult.lotteryType === '4N+Z' || activeResult.lotteryType === '3N+Z';
    const isSuper = activeResult.lotteryType === '4N+L+SB' || activeResult.lotteryType === '2N+L+SB';

    const expectedCount = is6D ? 6 : (is3N ? 3 : (is2N ? 2 : 4));
    const parsedNums = manualNums
      .map(s => parseInt(s.trim(), 10))
      .filter(n => !isNaN(n));

    if (parsedNums.length < expectedCount) {
      return;
    }

    const updatedTicket: ParsedTicketData = {
      isValidLottery: true,
      isFutureDraw: false,
      hasTicketNumbers: true,
      board: activeResult.board,
      lotteryCode: activeResult.lotteryCode || activeResult.drawResult?.lotteryCode || (activeResult.board === 'NLB' ? 'GS' : 'AK'),
      lotteryName: activeResult.lotteryName,
      drawNo: activeResult.drawNo,
      drawDate: activeResult.drawDate,
      ticketNumbers: (is6D || activeResult.lotteryType === '4D+REV+L' || activeResult.lotteryType === '4D+L') ? parsedNums : [...parsedNums].sort((a, b) => a - b),
      ticketLetter: !isZodiac && manualLetter.trim() ? manualLetter.trim().toUpperCase() : undefined,
      ticketZodiac: isZodiac ? manualZodiac : undefined,
      ticketSuperBall: isSuper && manualSuperBall.trim() ? parseInt(manualSuperBall.trim(), 10) : undefined,
      lotteryType: activeResult.lotteryType,
      rawString: activeResult.rawString || `${activeResult.board}|${activeResult.drawNo}`,
    };

    const newMatch = evaluateTicketMatch(updatedTicket, allResults);
    setActiveResult(newMatch);
    setIsEditingNumbers(false);
    onTicketScanned(newMatch, updatedTicket.rawString);

    if (newMatch.isWon) {
      soundCtrl.playWinFanfare();
      soundCtrl.speakPrize(newMatch.totalPrize, language);
      try {
        confetti({
          particleCount: 95,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#eab308', '#22c55e', '#3b82f6', '#ec4899'],
        });
      } catch {
        // ignore
      }
    } else {
      soundCtrl.playLoseTone();
      soundCtrl.speakLose(language);
    }

    setIsTimerPaused(true);
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
  };

  // Toggle pause timer so user can inspect ticket results leisurely
  const togglePauseTimer = () => {
    setIsTimerPaused(prev => {
      const next = !prev;
      if (next) {
        if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
      } else {
        countdownTimerRef.current = setInterval(() => {
          setCountdownSeconds(sec => {
            if (sec <= 1) {
              if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
              setActiveResult(null);
              setTimeout(() => { 
                isCooldownRef.current = false; 
                lastActivityRef.current = Date.now();
                startScanLoop();
              }, 600);
              return 0;
            }
            return sec - 1;
          });
        }, 1000);
      }
      return next;
    });
  };

  // Dismiss result manually to scan next ticket immediately
  const dismissResultNow = () => {
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    setActiveResult(null);
    setIsTimerPaused(false);
    setTimeout(() => {
      isCooldownRef.current = false;
      lastActivityRef.current = Date.now();
      startScanLoop();
    }, 400);
  };

  // Handle ticket image upload or photo capture decoding
  const handleImageFileScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingImage(true);
    setCameraError(null);

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const dataUrl = event.target?.result as string;
        if (!dataUrl) {
          setIsProcessingImage(false);
          return;
        }

        const img = new Image();
        img.onload = async () => {
          try {
            // 1. Primary decoder: Multi-pass zxing-wasm + ROI crop sweep + unsharp mask
            const decoded = await decodeTicketImage(img, {
              barcodeDetector: barcodeDetectorRef.current,
            });

            if (decoded) {
              handleScannedData(decoded.trim());
              setIsProcessingImage(false);
              return;
            }

            // 2. Fallback to canvas ZXing reader if not caught above
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            if (ctx && zxingReaderRef.current) {
              const maxDim = 800;
              const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
              canvas.width = Math.round(img.width * scale);
              canvas.height = Math.round(img.height * scale);
              ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
              const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
              try {
                const luminanceSource = new RGBLuminanceSource(imgData.data, canvas.width, canvas.height);
                const binaryBitmap = new BinaryBitmap(new HybridBinarizer(luminanceSource));
                const zxResult = zxingReaderRef.current.decode(binaryBitmap);
                if (zxResult?.getText()) {
                  handleScannedData(zxResult.getText().trim());
                  setIsProcessingImage(false);
                  return;
                }
              } catch {
                // ignore
              }
            }

            setCameraError(language === 'si'
              ? 'ඡායාරූපයෙන් QR කේතය කියවාගත නොහැකි විය. කරුණාකර පැහැදිලි ආලෝකයෙන් ටිකට් පතේ QR කේතය පමණක් පෙනෙන සේ නැවත ඡායාරූපයක් ලබාගන්න.'
              : 'Could not detect QR code in the image. Please take a clear close-up photo of the ticket QR code in good lighting.');
          } finally {
            setIsProcessingImage(false);
          }
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('File scan error:', err);
      setIsProcessingImage(false);
    } finally {
      e.target.value = '';
    }
  };

  // Start camera with robust Chrome fallbacks, continuous autofocus, and zoom
  const startCamera = async (overrideDeviceId?: string, isAutoMount = false) => {
    setCameraError(null);
    soundCtrl.unlockAudio(); // Unlock audio context on user gesture

    if (!navigator?.mediaDevices?.getUserMedia) {
      if (!isAutoMount) {
        setCameraError(language === 'si'
          ? 'ඔබගේ බ්‍රවුසරයේ කැමරා සහාය නොමැත. කරුණාකර පහත "ඡායාරූපයක් තෝරන්න" බොත්තම භාවිතා කරන්න.'
          : 'Camera access is not supported or restricted. Please use the "Upload / Take Photo" button below.');
      }
      setIsCameraActive(false);
      return;
    }

    try {
      const isManualOverride = Boolean(overrideDeviceId);
      const deviceIdToUse = overrideDeviceId || selectedDeviceId;

      let stream: MediaStream | null = null;
      let isPermissionBlocked = false;

      // Attempt 1: Standard environment back camera with thermally optimized resolution & frame rate
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            deviceId: isManualOverride && deviceIdToUse ? { exact: deviceIdToUse } : undefined,
            facingMode: isManualOverride ? undefined : { ideal: 'environment' },
            width: { ideal: 1280, max: 1280 },
            height: { ideal: 720, max: 720 },
            frameRate: { ideal: 20, max: 24 },
          },
        });
      } catch (err1: unknown) {
        const msg = err1 instanceof Error ? err1.message : String(err1);
        if (
          (err1 instanceof DOMException && err1.name === 'NotAllowedError') ||
          msg.toLowerCase().includes('permission') ||
          msg.toLowerCase().includes('notallowed')
        ) {
          isPermissionBlocked = true;
        }
      }

      // Attempt 2: Basic environment camera without resolution constraints (if not permission blocked)
      if (!stream && !isPermissionBlocked) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: {
              facingMode: { ideal: 'environment' },
            },
          });
        } catch (err2: unknown) {
          const msg = err2 instanceof Error ? err2.message : String(err2);
          if (
            (err2 instanceof DOMException && err2.name === 'NotAllowedError') ||
            msg.toLowerCase().includes('permission') ||
            msg.toLowerCase().includes('notallowed')
          ) {
            isPermissionBlocked = true;
          }
        }
      }

      // Attempt 3: Any available video camera (front, external, etc.) (if not permission blocked)
      if (!stream && !isPermissionBlocked) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: true,
          });
        } catch {
          // ignore
        }
      }

      if (!stream) {
        setIsCameraActive(false);
        if (!isAutoMount) {
          setCameraError(isPermissionBlocked
            ? (language === 'si'
                ? 'බ්‍රවුසරයේ කැමරා අවසරය අවහිර කර ඇත (Camera Permission Denied). කරුණාකර ලිපින තීරුවේ (Address bar) 🔒 අයිකනයෙන් Camera ➔ Allow කරන්න හෝ පහත "📷 ඡායාරූපයක් තෝරන්න / ගන්න" බොත්තම භාවිතා කරන්න.'
                : 'Camera permission denied or blocked. Please click the 🔒 icon in the browser address bar to Allow Camera, or use the "📷 Take / Upload Ticket Photo" button below.')
            : (language === 'si'
                ? 'කැමරාව ආරම්භ කිරීමට නොහැකි විය. කරුණාකර පහත බොත්තම මඟින් ඡායාරූපයක් තෝරා ස්කෑන් කරන්න.'
                : 'Could not access camera. Please use the "📷 Take / Upload Ticket Photo" button below.'));
        }
        return;
      }

      streamRef.current = stream;

      // Crucial for Chrome: activate visible state before play to prevent suspended layout
      setIsCameraActive(true);
      isCameraActiveRef.current = true;

      if (videoRef.current) {
        const v = videoRef.current;
        v.srcObject = stream;
        v.setAttribute('playsinline', 'true');
        v.setAttribute('webkit-playsinline', 'true');
        v.muted = true;
        v.onloadedmetadata = async () => {
          try {
            await v.play();
          } catch (playErr) {
            console.warn('[Camera] onloadedmetadata play() warning:', playErr);
          }
        };
        try {
          await v.play();
        } catch (playErr) {
          console.warn('[Camera] direct play() notice (waiting for onloadedmetadata):', playErr);
        }
      }

      // Inspect hardware capabilities (autofocus, torch, zoom)
      const track = stream.getVideoTracks()[0];
      if (track) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const capabilities: any = track.getCapabilities ? track.getCapabilities() : {};

        // 1. Continuous Autofocus for Chrome on Android
        if (capabilities.focusMode && capabilities.focusMode.includes('continuous')) {
          try {
            await track.applyConstraints({
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              advanced: [{ focusMode: 'continuous' } as any],
            });
            console.log('[Camera] Continuous autofocus activated.');
          } catch {
            // ignore
          }
        }

        // 2. Torch capability
        if (capabilities.torch) {
          setTorchAvailable(true);
        }

        // 3. Zoom capability (Crucial for small Sri Lankan micro QR codes!)
        if (capabilities.zoom) {
          setHasZoomSupport(true);
          const maxZ = Math.min(4.0, capabilities.zoom.max || 3.0);
          setMaxZoom(maxZ);
          const initialZoom = Math.min(1.5, maxZ);
          setZoomLevel(initialZoom);
          try {
            await track.applyConstraints({
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              advanced: [{ zoom: initialZoom } as any],
            });
          } catch {
            // ignore
          }
        }
      }

      startScanLoop();
    } catch (err: unknown) {
      if (isAutoMount) {
        // Silent on auto-mount: do not show a scary banner until user explicitly clicks Start Camera
        setIsCameraActive(false);
        return;
      }
      const errMsg = err instanceof Error ? err.message : String(err);
      const isPermissionDenied = errMsg.toLowerCase().includes('permission') || 
                                errMsg.toLowerCase().includes('notallowed') || 
                                (err instanceof DOMException && err.name === 'NotAllowedError');

      setCameraError(isPermissionDenied
        ? (language === 'si'
            ? 'බ්‍රවුසරයේ කැමරා අවසරය අවහිර කර ඇත (Camera Permission Denied). කරුණාකර ලිපින තීරුවේ (Address bar) 🔒 අයිකනය ක්ලික් කර Camera ➔ Allow කරන්න හෝ පහත "📷 ඡායාරූපයක් තෝරන්න / ගන්න" බොත්තම භාවිතා කරන්න.'
            : 'Camera permission denied. Please click the 🔒 icon in the browser address bar to Allow Camera, or use the "📷 Take / Upload Ticket Photo" button below.')
        : (language === 'si'
            ? `කැමරාව ආරම්භ කිරීමට නොහැකි විය: ${errMsg}. පහත බොත්තම මඟින් ඡායාරූපයක් තෝරා ස්කෑන් කරන්න.`
            : `Could not start camera: ${errMsg}. Please use the "Take / Upload Photo" button below.`));
      setIsCameraActive(false);
    }
  };

  // Toggle Torch/Flashlight
  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (track) {
      try {
        const nextState = !isTorchOn;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await track.applyConstraints({ advanced: [{ torch: nextState } as any] });
        setIsTorchOn(nextState);
      } catch (err) {
        console.warn('[Torch] Could not toggle torch:', err);
      }
    }
  };

  // Adjust Zoom
  const handleZoomChange = async (val: number) => {
    setZoomLevel(val);
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (track) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await track.applyConstraints({ advanced: [{ zoom: val } as any] });
      } catch (err) {
        console.warn('[Zoom] Could not apply zoom:', err);
      }
    }
  };

  // Explicit refocus trigger to force Chrome/Android camera to cycle autofocus motor
  const triggerRefocus = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;

    setIsRefocusing(true);
    setFocusIndicator({ x: 140, y: 140 });
    setTimeout(() => setFocusIndicator(null), 1200);

    try {
      // Step 1: Nudge focus constraint
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await track.applyConstraints({ advanced: [{ focusMode: 'manual' } as any] });
    } catch {
      // ignore
    }

    setTimeout(async () => {
      try {
        // Step 2: Re-lock continuous autofocus
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await track.applyConstraints({
          advanced: [
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            { focusMode: 'continuous' } as any,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            { exposureMode: 'continuous' } as any,
          ],
        });
        console.log('[Camera] Refocus cycle completed.');
      } catch {
        // fallback
      }
      setIsRefocusing(false);
    }, 200);
  };

  // Wake camera scanning from thermal eco sleep
  const wakeFromEcoSleep = () => {
    setIsEcoSleeping(false);
    lastActivityRef.current = Date.now();
    startScanLoop();
  };

  // Tap-to-focus on screen
  const handleViewfinderTap = async (e: React.MouseEvent<HTMLDivElement>) => {
    lastActivityRef.current = Date.now();
    if (isEcoSleeping) {
      wakeFromEcoSleep();
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    setFocusIndicator({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    setTimeout(() => setFocusIndicator(null), 1200);

    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (track) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await track.applyConstraints({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          advanced: [{ pointsOfInterest: [{ x, y }], focusMode: 'continuous' } as any],
        });
      } catch {
        triggerRefocus();
      }
    }
  };

  // Thermally optimized scanning loop (drastically reduces mobile phone heat & battery drain)
  const startScanLoop = () => {
    if (scanTimerRef.current) {
      clearTimeout(scanTimerRef.current);
      scanTimerRef.current = null;
    }

    let frameCount = 0;
    const SCAN_INTERVAL_MS = 380; // ~2.6 FPS: smooth, instantaneous barcode detection without heating the phone

    const scan = async () => {
      if (!videoRef.current || !canvasRef.current || !streamRef.current || !isCameraActiveRef.current) return;

      // 1. Immediately pause CPU/GPU execution when tab is backgrounded
      if (document.hidden) return;

      // 2. Pause completely during cooldown or while viewing result modal (0% CPU work while modal is open)
      if (isCooldownRef.current) return;

      // 3. Thermal Eco Sleep: pause scan loop after 60 seconds of inactivity to protect battery & prevent phone overheating
      if (Date.now() - lastActivityRef.current > 60000) {
        setIsEcoSleeping(true);
        return;
      }

      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (video.readyState >= 2 && video.videoWidth > 0 && !video.paused) {
        frameCount++;

        // 1. First priority: Hardware BarcodeDetector in Chrome (GPU/NPU-accelerated, Zero CPU heat)
        let handled = false;
        if (barcodeDetectorRef.current) {
          try {
            const barcodes = await barcodeDetectorRef.current.detect(video);
            if (barcodes && barcodes.length > 0) {
              const targetCode = barcodes.find((b: any) => b.format === 'qr_code') || barcodes[0];
              if (targetCode?.rawValue) {
                handled = true;
                handleScannedData(targetCode.rawValue.trim());
                return;
              }
            }
          } catch {
            // Native BarcodeDetector error, fallback below
          }
        }

        // If hardware BarcodeDetector is active and working, do NOT run heavy software jsQR on every frame!
        // Only run jsQR software pass every 6 frames (~2.3s) as an edge-case fallback, OR every frame if BarcodeDetector is unsupported.
        const shouldRunSoftwarePass = !barcodeDetectorRef.current || (frameCount % 6 === 0);

        if (!handled && shouldRunSoftwarePass) {
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (ctx) {
            const vW = video.videoWidth;
            const vH = video.videoHeight;
            const cropSize = Math.min(vW, vH, 360); // 360px: 44% lighter memory footprint than 480px, perfectly crisp for micro-QRs
            const startX = Math.round((vW - cropSize) / 2);
            const startY = Math.round((vH - cropSize) / 2);

            // Maintain fixed canvas buffer to avoid continuous memory reallocation
            if (canvas.width !== cropSize || canvas.height !== cropSize) {
              canvas.width = cropSize;
              canvas.height = cropSize;
            }

            ctx.drawImage(video, startX, startY, cropSize, cropSize, 0, 0, cropSize, cropSize);
            const imgData = ctx.getImageData(0, 0, cropSize, cropSize);

            // Fast single-pass jsQR without heavy inversion on standard frames
            const invertOption = (frameCount % 4 === 0) ? 'attemptBoth' : 'dontInvert';
            const code = jsQR(imgData.data, cropSize, cropSize, {
              inversionAttempts: invertOption,
            });

            if (code && code.data && code.data.trim()) {
              handled = true;
              handleScannedData(code.data.trim());
              return;
            }

            // Fallback: ZXing engine only every 10 cycles (~3.8s) when hardware BarcodeDetector is missing
            if (!barcodeDetectorRef.current && zxingReaderRef.current && frameCount % 10 === 0) {
              try {
                const source = new RGBLuminanceSource(imgData.data, cropSize, cropSize);
                const bitmap = new BinaryBitmap(new HybridBinarizer(source));
                const zxResult = zxingReaderRef.current.decode(bitmap);
                if (zxResult?.getText()) {
                  handled = true;
                  handleScannedData(zxResult.getText().trim());
                  return;
                }
              } catch {
                // not detected
              }
            }
          }
        }
      }

      // Schedule next scan with zero CPU busy-waiting
      scanTimerRef.current = setTimeout(scan, SCAN_INTERVAL_MS);
    };

    scanTimerRef.current = setTimeout(scan, SCAN_INTERVAL_MS);
  };

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (scanTimerRef.current) {
          clearTimeout(scanTimerRef.current);
          scanTimerRef.current = null;
        }
      } else {
        if (isCameraActiveRef.current && !scanTimerRef.current) {
          startScanLoop();
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (scanTimerRef.current) {
        clearTimeout(scanTimerRef.current);
        scanTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    return () => {
      stopCamera();
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    };
  }, [stopCamera]);

  return (
    <div className="space-y-4">
      {/* Chrome Autofocus Guidance Banner */}
      {isCameraActive && (
        <div className="bg-slate-900/90 border border-slate-700/80 rounded-xl px-3 py-2 flex items-center justify-between text-xs text-slate-300 shadow-md">
          <div className="flex items-center space-x-2">
            <span className="text-amber-400 text-sm">💡</span>
            <span className="text-[11px] text-slate-200">
              {language === 'si'
                ? 'කැමරාව ටිකට්පතෙන් 15-20cm ඈතින් තබා 1.5x හෝ 2x Zoom භාවිතා කරන්න'
                : 'Hold ticket 15-20cm away & use 1.5x / 2x zoom for sharpest focus'}
            </span>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              triggerRefocus();
            }}
            className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] font-bold hover:bg-amber-500/30 transition-all shrink-0 ml-2"
          >
            {language === 'si' ? '🎯 Focus කරන්න' : '🎯 Refocus'}
          </button>
        </div>
      )}
      
      {/* Viewfinder and Camera Frame */}
      <div 
        onClick={handleViewfinderTap}
        className="relative rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden shadow-2xl min-h-[380px] sm:min-h-[460px] flex flex-col items-center justify-center cursor-pointer select-none"
      >
        {/* Hidden Canvas for QR decoding */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Hidden File Input for Native Camera Photo Capture or Gallery Upload */}
        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          capture="environment"
          onChange={handleImageFileScan}
          className="hidden"
        />

        {/* Video feed */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover min-h-[380px] sm:min-h-[460px] ${
            isCameraActive ? 'block' : 'hidden'
          }`}
        />

        {/* Thermal Eco Sleep Overlay (Zero CPU heat when idle for 60s) */}
        {isCameraActive && isEcoSleeping && (
          <div 
            onClick={(e) => {
              e.stopPropagation();
              wakeFromEcoSleep();
            }}
            className="absolute inset-0 bg-slate-950/90 backdrop-blur-md z-40 flex flex-col items-center justify-center p-6 text-center cursor-pointer pointer-events-auto select-none"
          >
            <div className="w-16 h-16 rounded-2xl bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 flex items-center justify-center mb-3 shadow-lg text-2xl animate-pulse">
              ❄️
            </div>
            <h3 className="text-sm sm:text-base font-black text-slate-100 mb-1">
              {language === 'si' ? 'සිසිලන මාදිලිය සක්‍රීයයි (Thermal Eco Sleep)' : 'Thermal Eco Sleep Active'}
            </h3>
            <p className="text-xs text-slate-400 max-w-xs mb-4">
              {language === 'si' 
                ? 'දුරකථනය රත්වීම වැළැක්වීමට සහ බැටරිය ඉතිරි කර ගැනීමට ස්කෑනරය තාවකාලිකව විරාම ගන්වා ඇත.' 
                : 'Camera scanning paused after inactivity to keep your phone cool and conserve battery.'}
            </p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                wakeFromEcoSleep();
              }}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-extrabold text-xs shadow-lg shadow-cyan-900/40 active:scale-95 transition-all flex items-center gap-2"
            >
              <span>▶️</span>
              <span>{language === 'si' ? 'ස්කෑන් කිරීම නැවත අරඹන්න (Tap to Resume)' : 'Tap to Resume Scanning'}</span>
            </button>
          </div>
        )}

        {/* Tap to Focus Indicator */}
        {focusIndicator && (
          <div 
            className="absolute pointer-events-none z-30 w-16 h-16 border-2 border-amber-400 rounded-lg animate-ping"
            style={{ left: focusIndicator.x - 32, top: focusIndicator.y - 32 }}
          />
        )}

        {/* Viewfinder Overlay when Camera is Active */}
        {isCameraActive && (
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-between p-4 z-10">
            
            {/* Top status bar */}
            <div className="w-full flex items-center justify-between pointer-events-auto">
              <div className="flex items-center space-x-1.5">
                <div className="px-2.5 py-1 rounded-full bg-slate-900/80 backdrop-blur-md border border-slate-700/80 flex items-center space-x-1.5 text-[10px] sm:text-[11px] text-amber-400 font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span>{language === 'si' ? 'ස්කෑනරය ක්‍රියාකාරීයි' : 'Scanner Active'}</span>
                </div>
                <div className="px-2 py-1 rounded-full bg-cyan-950/80 backdrop-blur-md border border-cyan-700/60 flex items-center space-x-1 text-[10px] text-cyan-300 font-bold" title="Battery & Thermal Optimization Active (~20 FPS, GPU-accelerated)">
                  <span>❄️</span>
                  <span>{language === 'si' ? 'සිසිලන ප්‍රශස්තකරණය' : 'Thermal Eco'}</span>
                </div>
              </div>

              {/* Torch & Camera Switch Controls */}
              <div className="flex items-center space-x-2">
                {torchAvailable && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleTorch();
                    }}
                    className={`p-2.5 rounded-full backdrop-blur-md border transition-all ${
                      isTorchOn 
                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-lg shadow-amber-500/30' 
                        : 'bg-slate-900/80 text-slate-300 border-slate-700 hover:text-white'
                    }`}
                    title="Torch / Flashlight"
                  >
                    {isTorchOn ? <Zap className="w-4 h-4 fill-current" /> : <ZapOff className="w-4 h-4" />}
                  </button>
                )}

                {/* Direct Gallery / Native Camera Photo Upload Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  className="p-2.5 rounded-full bg-slate-900/80 backdrop-blur-md border border-slate-700 text-slate-300 hover:text-white transition-all flex items-center justify-center"
                  title={language === 'si' ? 'ටිකට් පතේ ඡායාරූපයක් තෝරන්න (Upload / Take Photo)' : 'Upload / Take Ticket Photo'}
                >
                  <ImageIcon className="w-4 h-4 text-amber-400" />
                </button>

                {videoDevices.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const curIdx = videoDevices.findIndex(d => d.deviceId === selectedDeviceId);
                      const nextDevice = videoDevices[(curIdx + 1) % videoDevices.length];
                      setSelectedDeviceId(nextDevice.deviceId);
                      stopCamera();
                      setTimeout(() => startCamera(nextDevice.deviceId), 200);
                    }}
                    className="p-2.5 rounded-full bg-slate-900/80 backdrop-blur-md border border-slate-700 text-slate-300 hover:text-white transition-all"
                    title="Switch Camera Lens"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Target Reticle (Centered Laser & Corner Markers) */}
            <div className="relative w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center my-auto">
              {/* Corner brackets */}
              <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-amber-400 rounded-tl-lg" />
              <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-amber-400 rounded-tr-lg" />
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-amber-400 rounded-bl-lg" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-amber-400 rounded-br-lg" />

              {/* Scanning Laser Beam */}
              <div className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-[0_0_12px_#f59e0b] animate-scan-laser" />

              {/* Subtle guide text */}
              <div className="px-3 py-1 rounded bg-slate-950/70 backdrop-blur-sm text-[11px] text-slate-300 font-medium tracking-wide">
                {language === 'si' ? 'ලොතරැයි QR එක මෙතැනට යොමු කරන්න' : 'Align Lottery QR in frame'}
              </div>
            </div>

            {/* Bottom Macro Zoom Presets & Chrome Refocus Button */}
            <div className="w-full flex flex-wrap items-center justify-center gap-2 pointer-events-auto">
              <div className="flex items-center space-x-1.5 p-1 rounded-xl bg-slate-900/90 backdrop-blur-md border border-slate-700/80 shadow-xl">
                <span className="text-[10px] text-slate-400 font-bold px-2 flex items-center gap-1">
                  <Focus className="w-3 h-3 text-amber-400" /> Focus Zoom:
                </span>
                {[1.0, 1.5, 2.0, 2.5].map((z) => (
                  <button
                    key={z}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleZoomChange(z);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                      Math.abs(zoomLevel - z) < 0.2
                        ? 'bg-amber-500 text-slate-950 shadow-md font-extrabold'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    {z}x
                  </button>
                ))}
              </div>

              {/* Direct Chrome Hardware Autofocus Trigger Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  triggerRefocus();
                }}
                className={`flex items-center space-x-1 px-3 py-1.5 rounded-xl backdrop-blur-md border text-xs font-bold transition-all shadow-xl active:scale-95 ${
                  isRefocusing
                    ? 'bg-amber-500 text-slate-950 border-amber-400 font-black'
                    : 'bg-slate-900/90 text-amber-300 border-slate-700/80 hover:bg-slate-800 hover:text-white hover:border-amber-500/50'
                }`}
                title="Force camera lens to re-focus in Chrome"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefocusing ? 'animate-spin' : ''}`} />
                <span>{language === 'si' ? 'නැවත Focus කරන්න' : 'Refocus Lens'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Inactive Camera State */}
        {!isCameraActive && (
          <div className="p-8 text-center max-w-sm mx-auto space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 mx-auto flex items-center justify-center shadow-inner">
              <Camera className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-white">
                {language === 'si' ? 'ස්වයංක්‍රීය QR ස්කෑනරය' : 'Instant QR Scanner'}
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                {language === 'si'
                  ? 'DLB (dlb.lk) සහ NLB (nlb.lk) ලොතරැයි ටිකට් වල ඇති QR කේතය ස්කෑන් කර ජයග්‍රහණය ශ්‍රවණය කරන්න.'
                  : 'Scan DLB & NLB lottery QR codes to check winnings with live voice prize announcements.'}
              </p>
            </div>

            {cameraError && (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs text-left space-y-1.5 shadow-sm">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="font-bold text-white text-xs">
                    {language === 'si' ? 'කැමරා අවසරය පිළිබඳ සටහන' : 'Camera Access Notice'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed pl-6">
                  {cameraError}
                </p>
              </div>
            )}

            <div className="space-y-2.5 w-full">
              <button
                onClick={() => startCamera()}
                className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-bold text-sm shadow-xl shadow-amber-500/20 active:scale-95 transition-all flex items-center justify-center space-x-2"
              >
                <Camera className="w-4 h-4" />
                <span>{language === 'si' ? 'කැමරාව ක්‍රියාත්මක කරන්න' : 'Start Camera Scanner'}</span>
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessingImage}
                className="w-full py-3 px-6 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm border border-slate-700 active:scale-95 transition-all flex items-center justify-center space-x-2 shadow-lg"
              >
                <ImageIcon className="w-4 h-4 text-amber-400" />
                <span>
                  {isProcessingImage 
                    ? (language === 'si' ? 'පරීක්ෂා කරමින්...' : 'Scanning Image...') 
                    : (language === 'si' ? 'ඡායාරූපයක් තෝරන්න / ගන්න' : 'Take / Upload Ticket Photo')}
                </span>
              </button>
            </div>
          </div>
        )}

        {/* DUAL COMPARISON RESULT CARD (Shows both Scanned Ticket Data from QR & Actual Official Winning Results) */}
        {activeResult && (
          <div className="absolute inset-x-2 sm:inset-x-4 bottom-2 sm:bottom-3 z-40 max-h-[88vh] overflow-y-auto animate-fade-in pointer-events-auto custom-scrollbar">
            <div className={`p-3.5 sm:p-4 rounded-2xl backdrop-blur-xl border shadow-2xl transition-all ${
              activeResult.isWon 
                ? 'bg-emerald-950/95 border-emerald-500/70 shadow-emerald-900/60' 
                : (activeResult.isValidLottery && !activeResult.isFutureDraw)
                  ? 'bg-slate-900/95 border-slate-700 shadow-slate-950'
                  : 'bg-amber-950/95 border-amber-600/60 shadow-amber-950'
            }`}>
              
              {/* Header: Board Badge, Lottery Name, Draw No & Actions */}
              <div className="flex items-center justify-between border-b border-slate-700/60 pb-2 mb-2.5">
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-0.5 rounded text-[11px] font-black tracking-wider shadow-sm ${
                    activeResult.board === 'DLB' ? 'bg-rose-500/25 text-rose-300 border border-rose-500/40' : 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/40'
                  }`}>
                    {activeResult.board}
                  </span>
                  <span className="text-sm sm:text-base font-extrabold text-white tracking-wide">
                    {activeResult.lotteryName}
                  </span>
                  {activeResult.drawNo > 0 && (
                    <span className="text-xs text-amber-400 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                      #{activeResult.drawNo}
                    </span>
                  )}
                  {activeResult.drawDate && (
                    <span className="text-[11px] text-slate-400 hidden sm:inline">
                      ({activeResult.drawDate})
                    </span>
                  )}
                </div>

                {/* Top Action Buttons: Pause/Resume Timer & Scan Next */}
                <div className="flex items-center space-x-1.5">
                  <button
                    onClick={togglePauseTimer}
                    title={isTimerPaused ? 'Resume Timer' : 'Pause Timer to view results'}
                    className={`p-1.5 rounded-lg border text-xs font-bold transition-all ${
                      isTimerPaused
                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md font-black'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-600'
                    }`}
                  >
                    {isTimerPaused ? <Play className="w-3.5 h-3.5 fill-current" /> : <Pause className="w-3.5 h-3.5" />}
                  </button>

                  <button
                    onClick={dismissResultNow}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-600 flex items-center space-x-1 transition-all active:scale-95 shadow-sm"
                  >
                    <span>{language === 'si' ? 'ඊළඟ ටිකට්පත' : 'Next'}</span>
                    {!isTimerPaused && (
                      <span className="text-amber-400 font-mono text-[11px]">({countdownSeconds}s)</span>
                    )}
                  </button>
                </div>
              </div>

              {/* Main Outcome Banner */}
              {activeResult.isWon ? (
                <div className="bg-gradient-to-r from-emerald-900/50 to-teal-900/40 p-2.5 rounded-xl border border-emerald-500/40 mb-2.5 flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/30 border border-emerald-400/50 text-emerald-300 flex items-center justify-center shrink-0 shadow-inner">
                      <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-emerald-300 font-bold">
                        {language === 'si' ? '🎉 ජයග්‍රහණයක් හිමිව ඇත!' : '🎉 WINNING TICKET!'}
                      </div>
                      <div className="text-xl sm:text-2xl font-black text-amber-400 tracking-tight">
                        Rs. {activeResult.totalPrize.toLocaleString('en-US')}/=
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-1.5">
                    {/* Audio Replay Button */}
                    <button
                      onClick={() => {
                        soundCtrl.unlockAudio();
                        soundCtrl.playWinFanfare();
                        soundCtrl.speakPrize(activeResult.totalPrize, language);
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-emerald-700/80 hover:bg-emerald-600 text-white font-bold text-xs flex items-center space-x-1 shadow active:scale-95 transition-all border border-emerald-500/40"
                      title="Replay Voice Announcement"
                    >
                      <Volume2 className="w-3.5 h-3.5 text-amber-300" />
                      <span className="text-[11px]">{language === 'si' ? 'අසන්න' : 'Listen'}</span>
                    </button>

                    {activeResult.prizeCategory && (
                      <div className="px-2 py-1 rounded-lg bg-emerald-800/60 border border-emerald-600/70 text-emerald-200 text-xs font-bold max-w-[140px] text-right truncate hidden sm:block">
                        🏆 {activeResult.prizeCategory}
                      </div>
                    )}
                  </div>
                </div>
              ) : activeResult.isValidLottery && !activeResult.isFutureDraw ? (
                <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/80 mb-2.5 flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-8 h-8 rounded-lg bg-slate-700/60 border border-slate-600 text-slate-400 flex items-center justify-center shrink-0">
                      <XCircle className="w-5 h-5 text-slate-400" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-200">
                        {activeResult.hasTicketNumbers 
                          ? (language === 'si' ? 'මෙවර ඔබට ජයග්‍රහණයක් හිමිවී නොමැත (දිනුමක් නැත)' : 'You have lost this time (Non-Winning)')
                          : (language === 'si' ? 'ටිකට් අංක කියවා නැත (දිනුමක් නැත - රු. 0.00)' : 'No Numbers in QR (Not a Win - Rs. 0.00)')}
                      </div>
                      <div className="text-[11px] text-amber-400/90 font-medium">
                        {activeResult.hasTicketNumbers 
                          ? (language === 'si' ? 'මීළඟ වර ඔබ දිනනු ඇත! (ජයග්‍රාහී මුදල: රු. 0.00)' : 'Next time you may win! (Prize: Rs. 0.00)')
                          : (language === 'si' ? 'ටිකට්පතේ අංක පහත කොටුවේ ඇතුළත් කර පරීක්ෂා කරන්න' : 'Enter ticket numbers below to verify against official draw')}
                      </div>
                    </div>
                  </div>

                  {activeResult.hasTicketNumbers && (
                    <button
                      onClick={() => {
                        soundCtrl.unlockAudio();
                        soundCtrl.playLoseTone();
                        soundCtrl.speakLose(language);
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-700/80 hover:bg-slate-600 text-slate-200 hover:text-white text-xs font-bold flex items-center space-x-1 shadow active:scale-95 transition-all border border-slate-600"
                      title="Replay Voice Announcement"
                    >
                      <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                      <span className="text-[11px]">{language === 'si' ? 'අසන්න' : 'Listen'}</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="bg-amber-950/60 p-2 rounded-xl border border-amber-600/40 mb-2.5 flex items-center space-x-2.5">
                  <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
                  <div className="text-xs text-slate-200">
                    {language === 'si' ? activeResult.messageSi : activeResult.messageEn}
                  </div>
                </div>
              )}

              {/* DUAL COMPARISON GRID: [1] Scanned Ticket vs [2] Official Results */}
              {(() => {
                const isZodiacGame = activeResult.lotteryCode === 'LW' || activeResult.lotteryCode === 'HD' || activeResult.lotteryCode === 'SD' || activeResult.lotteryType === '4N+Z' || activeResult.lotteryType === '3N+Z';
                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                    
                    {/* BOX 1: 🎟️ Scanned Ticket Data from QR OR Manual Checker Form */}
                    <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-700/60 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-1.5 pb-1 border-b border-slate-800">
                          <span className="font-extrabold text-slate-300 text-[11px] flex items-center space-x-1">
                            <span>🎟️</span>
                            <span>{language === 'si' ? 'ඔබගේ ටිකට්පත' : 'Your Ticket'}</span>
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {activeResult.drawDate || 'Today'}
                          </span>
                        </div>

                        {isEditingNumbers ? (
                          <div className="space-y-2 py-1">
                            <div className="text-[10px] text-amber-300 font-bold flex items-center justify-between">
                              <span>
                                {language === 'si' 
                                  ? (activeResult.hasTicketNumbers ? 'අංක සංස්කරණය කරන්න:' : 'ටිකට්පත් අංක ඇතුළත් කරන්න:') 
                                  : (activeResult.hasTicketNumbers ? 'Edit Ticket Numbers:' : 'Enter Ticket Numbers:')}
                              </span>
                              {activeResult.hasTicketNumbers && (
                                <button
                                  onClick={() => setIsEditingNumbers(false)}
                                  className="text-slate-400 hover:text-slate-200 text-[10px]"
                                >
                                  {language === 'si' ? 'අවලංගු' : 'Cancel'}
                                </button>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center gap-1.5">
                              {/* Letter Input (STRICTLY if NOT a Zodiac game) */}
                              {!isZodiacGame && (
                                <div className="flex flex-col items-center">
                                  <input
                                    type="text"
                                    maxLength={1}
                                    value={manualLetter}
                                    onChange={e => setManualLetter(e.target.value.toUpperCase())}
                                    placeholder={activeResult.officialLetter || 'A'}
                                    className="w-8 h-8 rounded-lg bg-slate-900 border border-amber-500/70 text-amber-300 font-black text-center text-sm uppercase focus:outline-none focus:ring-1 focus:ring-amber-400"
                                  />
                                  <span className="text-[9px] text-slate-400 mt-0.5">{language === 'si' ? 'අකුර' : 'Letter'}</span>
                                </div>
                              )}

                              {/* Zodiac Select (STRICTLY for Zodiac games: Lagna Wasana, Handahana, Suba Dawasak) */}
                              {isZodiacGame && (
                                <div className="flex flex-col items-center">
                                  <select
                                    value={manualZodiac}
                                    onChange={e => setManualZodiac(e.target.value)}
                                    className="h-8 px-1.5 rounded-lg bg-slate-900 border border-purple-500 text-purple-200 font-bold text-xs focus:outline-none"
                                  >
                                    {Object.values(ZODIAC_MAPPING)
                                      .filter((v, i, a) => a.findIndex(t => t.si === v.si) === i)
                                      .map(z => (
                                        <option key={z.index} value={z.si}>
                                          {z.si} ({z.en})
                                        </option>
                                      ))}
                                  </select>
                                  <span className="text-[9px] text-purple-300 mt-0.5">{language === 'si' ? 'ලග්නය' : 'Zodiac'}</span>
                                </div>
                              )}

                              {/* Number Inputs */}
                              {manualNums.map((numStr, idx) => {
                                const is6D = activeResult.lotteryType === '6D+L';
                                return (
                                  <div key={idx} className="flex flex-col items-center">
                                    <input
                                      type="number"
                                      min={is6D ? 0 : 1}
                                      max={is6D ? 9 : 99}
                                      value={numStr}
                                      onChange={e => {
                                        const val = e.target.value;
                                        const next = [...manualNums];
                                        next[idx] = val;
                                        setManualNums(next);
                                      }}
                                      placeholder={is6D ? `0` : `N${idx + 1}`}
                                      className="w-8 h-8 rounded-lg bg-slate-900 border border-emerald-500/70 text-emerald-300 font-black text-center text-sm focus:outline-none focus:ring-1 focus:ring-emerald-400"
                                    />
                                    <span className="text-[9px] text-slate-400 mt-0.5">
                                      {is6D ? `D${idx + 1}` : `N${idx + 1}`}
                                    </span>
                                  </div>
                                );
                              })}

                              {/* Super Ball / Special Number Input (if 4N+L+SB or 2N+L+SB) */}
                              {(activeResult.lotteryType === '4N+L+SB' || activeResult.lotteryType === '2N+L+SB') && (
                                <div className="flex flex-col items-center">
                                  <input
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    maxLength={activeResult.lotteryCode === 'SW' ? 5 : 2}
                                    value={manualSuperBall}
                                    onChange={e => {
                                      const val = e.target.value.replace(/[^0-9]/g, '');
                                      const limit = activeResult.lotteryCode === 'SW' ? 5 : 2;
                                      setManualSuperBall(val.slice(0, limit));
                                    }}
                                    placeholder={activeResult.lotteryCode === 'SW' ? '17533' : 'SB'}
                                    className={`h-8 rounded-lg bg-slate-900 border text-center font-black focus:outline-none transition-all ${
                                      activeResult.lotteryCode === 'SW'
                                        ? 'w-18 sm:w-20 px-1 text-xs font-mono border-sky-500 text-sky-300 focus:ring-1 focus:ring-sky-400'
                                        : 'w-8 text-sm border-amber-500 text-amber-300 focus:ring-1 focus:ring-amber-400'
                                    }`}
                                  />
                                  <span className={`text-[9px] font-bold mt-0.5 ${activeResult.lotteryCode === 'SW' ? 'text-sky-300' : 'text-amber-400'}`}>
                                    {activeResult.lotteryCode === 'SW'
                                      ? (language === 'si' ? 'විශේෂ' : 'Special')
                                      : (language === 'si' ? 'සුපිරි' : 'Super')}
                                  </span>
                                </div>
                              )}
                            </div>

                            <button
                              onClick={handleVerifyManualTicket}
                              className="w-full mt-2 py-2 px-3 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs shadow-md transition-all active:scale-95 flex items-center justify-center space-x-1"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>{language === 'si' ? 'ප්‍රතිඵලය සසඳන්න (Check Prize)' : 'Check Prize Now'}</span>
                            </button>
                          </div>
                        ) : activeResult.hasTicketNumbers ? (
                          <div className="space-y-1.5">
                            <div className="flex flex-wrap items-center gap-1.5">
                              {/* Scanned Ticket Letter (STRICTLY if NOT a Zodiac lottery) */}
                              {!isZodiacGame && activeResult.ticketLetter && (
                                <div className="flex flex-col items-center">
                                  <span className={`w-8 h-8 rounded-lg font-black text-sm flex items-center justify-center shadow-md transition-all ${
                                    activeResult.matchedLetter 
                                      ? 'bg-emerald-500 text-slate-950 ring-2 ring-emerald-300 font-black' 
                                      : 'bg-slate-800 text-slate-200 border border-slate-700'
                                  }`}>
                                    {activeResult.ticketLetter}
                                  </span>
                                  <span className="text-[9px] text-slate-400 mt-0.5">
                                    {activeResult.matchedLetter ? '✓ ' + (language === 'si' ? 'ගැලපේ' : 'Match') : (language === 'si' ? 'අකුර' : 'Letter')}
                                  </span>
                                </div>
                              )}

                              {/* Scanned Ticket Zodiac (STRICTLY for Lagna Wasana, Handahana, Suba Dawasak) */}
                              {isZodiacGame && (activeResult.ticketZodiac || activeResult.ticketZodiacEn) && (
                                <div className="flex flex-col items-center">
                                  <span className={`px-2.5 h-8 rounded-lg font-black text-xs flex items-center justify-center shadow-md transition-all ${
                                    activeResult.matchedZodiac 
                                      ? 'bg-emerald-500 text-slate-950 ring-2 ring-emerald-300 font-black' 
                                      : 'bg-purple-950 text-purple-200 border border-purple-600/60'
                                  }`}>
                                    {activeResult.ticketZodiac || activeResult.ticketZodiacEn}
                                  </span>
                                  <span className="text-[9px] text-purple-300 mt-0.5">
                                    {activeResult.matchedZodiac 
                                      ? '✓ ' + (language === 'si' ? 'ලග්නය' : 'Zodiac') 
                                      : (language === 'si' ? 'ලග්නය' : (activeResult.ticketZodiacEn || 'Zodiac'))}
                                  </span>
                                </div>
                              )}

                              {/* Scanned Numbers (Customized for 6 Single Digits vs Standard 4 Numbers) */}
                              {activeResult.ticketNumbers.map((n, idx) => {
                                const is6DigitGame = activeResult.lotteryType === '6D+L';
                                const isMatch = is6DigitGame
                                  ? (activeResult.matchedIndices ? activeResult.matchedIndices.includes(idx) : false)
                                  : activeResult.matchedNumbers.includes(n);

                                return (
                                  <div key={idx} className="flex flex-col items-center">
                                    <span
                                      className={`w-8 h-8 rounded-lg font-black text-sm flex items-center justify-center shadow-md transition-all ${
                                        isMatch 
                                          ? 'bg-emerald-500 text-slate-950 ring-2 ring-emerald-300 font-black shadow-emerald-500/30' 
                                          : 'bg-slate-800 text-slate-200 border border-slate-700'
                                      }`}
                                    >
                                      {is6DigitGame ? n : (n < 10 ? `0${n}` : n)}
                                    </span>
                                    <span className={`text-[9px] mt-0.5 ${isMatch ? 'text-emerald-400 font-bold' : 'text-slate-500'}`}>
                                      {isMatch ? '✓' : (is6DigitGame ? `D${idx + 1}` : `N${idx + 1}`)}
                                    </span>
                                  </div>
                                );
                              })}

                              {/* Super ball / Special Number if present (Super Ball, Mega Power, Kapruka, Shanida) */}
                              {activeResult.ticketSuperBall !== undefined && (
                                  <div className="flex flex-col items-center">
                                    <span className={`h-8 rounded-lg font-black font-mono flex items-center justify-center shadow-md transition-all ${
                                      activeResult.lotteryCode === 'SW' ? 'min-w-[4.75rem] px-2 text-xs sm:text-sm tracking-tight' : 'w-8 text-sm'
                                    } ${
                                      activeResult.matchedSuperBall 
                                        ? (activeResult.lotteryCode === 'SW' ? 'bg-sky-400 text-slate-950 ring-2 ring-sky-300 font-black shadow-sky-500/30' : 'bg-amber-400 text-slate-950 ring-2 ring-amber-300 font-black') 
                                        : (activeResult.lotteryCode === 'SW' ? 'bg-sky-950/80 text-sky-300 border border-sky-500/70' : 'bg-amber-950/80 text-amber-300 border border-amber-600/70')
                                    }`}>
                                      {activeResult.lotteryCode === 'SW'
                                        ? String(activeResult.ticketSuperBall).padStart(5, '0')
                                        : (activeResult.ticketSuperBall < 10 ? `0${activeResult.ticketSuperBall}` : activeResult.ticketSuperBall)}
                                    </span>
                                  <span className={`text-[9px] font-bold mt-0.5 ${activeResult.lotteryCode === 'SW' ? 'text-sky-300' : 'text-amber-400'}`}>
                                    {activeResult.lotteryCode === 'SW'
                                      ? (activeResult.matchedSuperBall ? '✓ ' + (language === 'si' ? 'විශේෂ' : 'Special') : (language === 'si' ? 'විශේෂ අංකය' : 'Special No'))
                                      : (activeResult.matchedSuperBall ? '✓ ' + (language === 'si' ? 'සුපිරි' : 'Super') : (language === 'si' ? 'සුපිරි' : 'Super'))}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="py-2 text-center text-slate-400 text-xs italic">
                            {language === 'si' ? 'QR කේතයේ ප්‍රතිඵල සබැඳිය පමණක් අඩංගුය' : 'QR code contains official draw link'}
                          </div>
                        )}
                      </div>

                      {/* Ticket Footer: Edit toggle and Raw toggle */}
                      <div className="mt-2 pt-1 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
                        <div className="flex items-center space-x-1.5">
                          <span>
                            {activeResult.hasTicketNumbers 
                              ? (language === 'si' ? `අංක: ${activeResult.ticketNumbers.join(', ')}` : `Numbers: ${activeResult.ticketNumbers.join(', ')}`)
                              : (language === 'si' ? 'ටිකට් අංක ඇතුළත් කරන්න' : 'Enter ticket numbers')}
                          </span>
                          {activeResult.hasTicketNumbers && !isEditingNumbers && (
                            <button
                              onClick={() => {
                                setIsEditingNumbers(true);
                                setIsTimerPaused(true);
                                if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
                              }}
                              className="text-amber-400 hover:text-amber-300 text-[10px] font-bold flex items-center space-x-0.5 ml-1"
                            >
                              <Edit3 className="w-3 h-3" />
                              <span>{language === 'si' ? 'වෙනස් කරන්න' : 'Edit'}</span>
                            </button>
                          )}
                        </div>
                        <button
                          onClick={() => setShowRawData(!showRawData)}
                          className="text-slate-400 hover:text-amber-400 flex items-center space-x-1"
                        >
                          {showRawData ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          <span>{showRawData ? 'Hide QR' : 'Raw QR'}</span>
                        </button>
                      </div>
                    </div>

                    {/* BOX 2: 🏆 Actual Official Winning Results */}
                    <div className="p-2.5 rounded-xl bg-slate-950/60 border border-amber-500/40 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-1.5 pb-1 border-b border-slate-800">
                          <span className="font-extrabold text-amber-300 text-[11px] flex items-center space-x-1">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                            <span>{language === 'si' ? 'නිල දිනුම් ප්‍රතිඵල' : 'Official Results'}</span>
                          </span>
                          <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                            {activeResult.officialSource ? activeResult.officialSource.split(' ')[0] : (activeResult.board === 'DLB' ? 'dlb.lk' : 'nlb.lk')}
                          </span>
                        </div>

                        {/* Official Winning Letter & Numbers */}
                        <div className="flex flex-wrap items-center gap-1.5">
                          {/* Official Letter (STRICTLY if NOT a Zodiac lottery) */}
                          {!isZodiacGame && activeResult.officialLetter && (
                            <div className="flex flex-col items-center">
                              <span className="w-8 h-8 rounded-lg bg-gradient-to-b from-amber-400 to-yellow-500 text-slate-950 font-black text-sm flex items-center justify-center shadow-md ring-1 ring-amber-300">
                                {activeResult.officialLetter}
                              </span>
                              <span className="text-[9px] text-amber-300/80 font-bold mt-0.5">
                                {language === 'si' ? 'අකුර' : 'Letter'}
                              </span>
                            </div>
                          )}

                          {/* Official Zodiac (STRICTLY for Lagna Wasana, Handahana, Suba Dawasak) */}
                          {isZodiacGame && (activeResult.officialZodiac || activeResult.officialZodiacEn) && (
                            <div className="flex flex-col items-center">
                              <span className="px-2 h-8 rounded-lg bg-gradient-to-b from-amber-400 to-yellow-500 text-slate-950 font-black text-xs flex items-center justify-center shadow-md ring-1 ring-amber-300">
                                {activeResult.officialZodiac || activeResult.officialZodiacEn}
                              </span>
                              <span className="text-[9px] text-amber-300/80 font-bold mt-0.5">
                                {language === 'si' ? 'ලග්නය' : 'Zodiac'}
                              </span>
                            </div>
                          )}

                      {/* Official Winning Numbers */}
                      {(activeResult.officialNumbers || []).map((num, idx) => (
                        <div key={idx} className="flex flex-col items-center">
                          <span className="w-8 h-8 rounded-lg bg-gradient-to-b from-amber-400 to-yellow-500 text-slate-950 font-black text-sm flex items-center justify-center shadow-md ring-1 ring-amber-300">
                            {num < 10 ? `0${num}` : num}
                          </span>
                          <span className="text-[9px] text-amber-300/80 font-bold mt-0.5">
                            Win
                          </span>
                        </div>
                      ))}

                      {/* Official Super Ball / Special Number */}
                      {activeResult.officialSuperBall !== undefined && (
                        <div className="flex flex-col items-center">
                          <span className={`h-8 rounded-lg font-black font-mono flex items-center justify-center shadow-md transition-all ${
                            activeResult.lotteryCode === 'SW'
                              ? 'min-w-[4.75rem] px-2 text-xs sm:text-sm tracking-tight bg-gradient-to-b from-sky-300 to-indigo-500 text-white ring-1 ring-sky-300'
                              : 'w-8 text-sm bg-gradient-to-b from-yellow-300 to-amber-500 text-slate-950 ring-1 ring-amber-300'
                          }`}>
                            {activeResult.lotteryCode === 'SW'
                              ? String(activeResult.officialSuperBall).padStart(5, '0')
                              : (activeResult.officialSuperBall < 10 ? `0${activeResult.officialSuperBall}` : activeResult.officialSuperBall)}
                          </span>
                          <span className="text-[9px] text-amber-300/80 font-bold mt-0.5">
                            {activeResult.lotteryCode === 'SW' ? (language === 'si' ? 'විශේෂ' : 'Special') : (language === 'si' ? 'සුපිරි' : 'Super')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Official Draw Summary footer */}
                  <div className="mt-2 pt-1 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
                    <span>
                      {language === 'si' ? 'දිනුම් අංකය:' : 'Draw #:'} {activeResult.officialDrawNo || activeResult.drawNo}
                    </span>
                    <span className="text-slate-400 font-medium text-[10px]">
                      {activeResult.isWon ? (
                        <span className="text-emerald-400 font-bold">
                          ✓ {language === 'si' ? 'දිනුම් මුදල:' : 'Prize Won:'} Rs. {activeResult.totalPrize.toLocaleString('en-US')}/=
                        </span>
                      ) : activeResult.hasTicketNumbers ? (
                        <span className="text-slate-400">
                          {language === 'si' ? 'දිනුමක් නැත (රු. 0.00)' : 'No Prize (Rs. 0.00)'}
                        </span>
                      ) : (
                        <span className="text-amber-400/90 font-medium">
                          {language === 'si' ? 'ටිකට් අංක ඇතුළත් කර නැත' : 'Enter Ticket Numbers to check'}
                        </span>
                      )}
                    </span>
                  </div>
                </div>

                  </div>
                );
              })()}

              {/* Match Comparison Summary Bar */}
              {activeResult.hasTicketNumbers && (
                <div className="mt-2.5 p-2 rounded-xl bg-slate-950/40 border border-slate-800 flex flex-wrap items-center justify-between gap-1.5 text-xs">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-slate-300 font-bold">
                      {language === 'si' ? '🎯 සැසඳීමේ ප්‍රතිඵලය:' : '🎯 Match Verdict:'}
                    </span>

                    {/* 6-Digit Lotteries Verdict (MS / SDS) */}
                    {activeResult.lotteryType === '6D+L' ? (
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        (activeResult.trailingMatches || 0) > 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {activeResult.trailingMatches === 6
                          ? (language === 'si' ? 'ඉලක්කම් 6 ම පිළිවෙළින් ගැලපේ' : 'All 6 Digits in Order Matched')
                          : ((activeResult.trailingMatches || 0) > 0
                              ? (language === 'si' ? `අවසන් ඉලක්කම් ${activeResult.trailingMatches} ගැලපේ` : `Last ${activeResult.trailingMatches} Digits Matched`)
                              : (language === 'si' ? 'ඉලක්කම් නොගැලපේ' : 'Digits Missed'))}
                      </span>
                    ) : (
                      /* Standard / Zodiac / Super Ball Number Matches */
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        activeResult.matchedNumbers.length > 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {language === 'si' 
                          ? `අංක ${activeResult.matchedNumbers.length} ක් ගැලපේ` 
                          : `${activeResult.matchedNumbers.length} Numbers Matched`}
                      </span>
                    )}

                    {/* Letter Match Badge (if not Zodiac lottery) */}
                    {activeResult.lotteryCode !== 'LW' && activeResult.lotteryCode !== 'HD' && activeResult.lotteryCode !== 'SD' && activeResult.lotteryType !== '4N+Z' && activeResult.lotteryType !== '3N+Z' && activeResult.ticketLetter && (
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        activeResult.matchedLetter ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {activeResult.matchedLetter 
                          ? (language === 'si' ? '✓ අකුර ගැලපේ' : '✓ Letter Matched')
                          : (language === 'si' ? 'අකුර නොගැලපේ' : 'Letter Missed')}
                      </span>
                    )}

                    {/* Zodiac Match Badge (for LW / HD / SD) */}
                    {(activeResult.lotteryCode === 'LW' || activeResult.lotteryCode === 'HD' || activeResult.lotteryCode === 'SD' || activeResult.lotteryType === '4N+Z' || activeResult.lotteryType === '3N+Z') && (activeResult.ticketZodiac || activeResult.ticketZodiacEn) && (
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        activeResult.matchedZodiac ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {activeResult.matchedZodiac 
                          ? (language === 'si' ? '✓ ලග්නය ගැලපේ' : '✓ Zodiac Matched')
                          : (language === 'si' ? 'ලග්නය නොගැලපේ' : 'Zodiac Missed')}
                      </span>
                    )}

                    {/* Super Ball / Special Number Match Badge (for SB / MP / KP / SW) */}
                    {activeResult.ticketSuperBall !== undefined && (
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        activeResult.matchedSuperBall 
                          ? (activeResult.lotteryCode === 'SW' ? 'bg-sky-500/25 text-sky-300 ring-1 ring-sky-400/50' : 'bg-amber-500/20 text-amber-300') 
                          : 'bg-slate-800 text-slate-400'
                      }`}>
                        {activeResult.matchedSuperBall 
                          ? (language === 'si' 
                              ? (activeResult.lotteryCode === 'SW' ? `✓ විශේෂ අංකය (${activeResult.ticketSuperBall}) ගැලපේ` : `✓ සුපිරි අංකය (${activeResult.ticketSuperBall}) ගැලපේ`)
                              : (activeResult.lotteryCode === 'SW' ? `✓ Special No (${activeResult.ticketSuperBall}) Matched` : `✓ Super Ball (${activeResult.ticketSuperBall}) Matched`))
                          : (language === 'si' 
                              ? (activeResult.lotteryCode === 'SW' ? `විශේෂ අංකය (${activeResult.ticketSuperBall}) නොගැලපේ` : `සුපිරි අංකය (${activeResult.ticketSuperBall}) නොගැලපේ`)
                              : (activeResult.lotteryCode === 'SW' ? `Special No (${activeResult.ticketSuperBall}) Missed` : `Super Ball (${activeResult.ticketSuperBall}) Missed`))}
                      </span>
                    )}
                  </div>

                  <span className={`font-black text-xs ${activeResult.isWon ? 'text-amber-400' : 'text-slate-400'}`}>
                    {activeResult.isWon 
                      ? `Rs. ${activeResult.totalPrize.toLocaleString('en-US')}/=`
                      : (language === 'si' ? 'ජයග්‍රහණයක් නැත' : 'No Prize')}
                  </span>
                </div>
              )}

              {/* Raw Scanned String Details (when toggled) */}
              {showRawData && activeResult.rawString && (
                <div className="mt-2 p-2 rounded-lg bg-black/80 border border-slate-800 text-[10px] font-mono text-slate-300 break-all">
                  <span className="text-amber-400 font-bold block mb-0.5">Scanned QR Payload:</span>
                  {activeResult.rawString}
                </div>
              )}

              {/* Countdown progress bar (Paused when user clicks pause) */}
              <div className="w-full bg-slate-800 h-1 rounded-full mt-2.5 overflow-hidden">
                <div 
                  className={`h-full transition-all duration-1000 ease-linear ${
                    isTimerPaused ? 'bg-amber-500 animate-pulse' : 'bg-amber-400'
                  }`}
                  style={{ width: isTimerPaused ? '100%' : `${(countdownSeconds / 5) * 100}%` }}
                />
              </div>

            </div>
          </div>
        )}

      </div>

      {/* Action Controls & AI Scan Button Underneath */}
      <div className="space-y-2">
        {/* AI Scan Button */}
        <button
          onClick={() => {
            soundCtrl.unlockAudio();
            onOpenAIScan();
          }}
          className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold text-sm shadow-lg shadow-indigo-600/20 active:scale-95 transition-all flex items-center justify-center space-x-2 border border-purple-400/30"
        >
          <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
          <span>{language === 'si' ? 'AI කැමරා ස්කෑනරය (සේදී ගිය / කැඩුණු ටිකට්පත්)' : 'AI Camera Scan (For Damaged Tickets)'}</span>
        </button>

        {/* Camera Toggle Button */}
        <div className="flex items-center space-x-2">
          {isCameraActive ? (
            <button
              onClick={stopCamera}
              className="flex-1 py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-rose-400 font-bold text-xs border border-rose-500/30 transition-all flex items-center justify-center space-x-2"
            >
              <CameraOff className="w-4 h-4" />
              <span>{language === 'si' ? 'කැමරාව නවතන්න' : 'Stop Camera'}</span>
            </button>
          ) : (
            <button
              onClick={() => startCamera()}
              className="flex-1 py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold text-xs border border-amber-500/30 transition-all flex items-center justify-center space-x-2"
            >
              <Camera className="w-4 h-4" />
              <span>{language === 'si' ? 'නැවත කැමරාව අරඹන්න' : 'Restart Camera'}</span>
            </button>
          )}
        </div>
      </div>

      {/* OPTIONAL DEMO / TEST SIMULATOR - Collapsed by default so real users have a clean, distraction-free interface */}
      <div className="rounded-2xl bg-slate-900/60 border border-slate-800 shadow-md overflow-hidden transition-all">
        <button
          type="button"
          onClick={() => setIsTestPanelOpen(!isTestPanelOpen)}
          className="w-full px-4 py-3 flex items-center justify-between text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 transition-colors"
        >
          <div className="flex items-center space-x-2">
            <span>🛠️</span>
            <span className="font-bold text-slate-300">
              {language === 'si' ? 'නියැදි ටිකට්පත් පරීක්ෂණ පුවරුව (Test / Demo Simulator)' : 'Sample Ticket Verification Simulator'}
            </span>
          </div>
          <div className="flex items-center space-x-1.5 text-[11px] text-amber-400 font-bold">
            <span>{isTestPanelOpen ? (language === 'si' ? 'සඟවන්න ▲' : 'Collapse ▲') : (language === 'si' ? 'පෙන්වන්න (නියැදි 34ක්) ▼' : 'Show (34 Demos) ▼')}</span>
          </div>
        </button>

        {isTestPanelOpen && (
          <div className="p-3 pt-0 border-t border-slate-800/80 space-y-2.5 animate-fadeIn">
            <div className="flex items-center justify-between text-xs pt-2.5">
              <span className="font-extrabold text-amber-400 flex items-center gap-1.5">
                <span>✨</span>
                <span>{language === 'si' ? 'ක්ෂණික පරීක්ෂණ බොත්තම්:' : 'Instant Verification Tests:'}</span>
              </span>
              <span className="text-[10px] text-slate-400 font-medium">1-Click Live Test</span>
            </div>

            {/* Audio Sound & Voice Test Bar */}
            <div className="flex items-center space-x-2 p-2 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1 shrink-0">
                <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                <span>{language === 'si' ? 'ශබ්ද පරීක්ෂාව:' : 'Sound Test:'}</span>
              </span>
              
              <button
                onClick={() => soundCtrl.testAudio('win', 2500, language)}
                className="flex-1 py-1.5 px-2.5 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition-all active:scale-95 flex items-center justify-center space-x-1"
              >
                <span>🎉</span>
                <span>{language === 'si' ? 'දිනුම් හඬ (Win)' : 'Test Win Audio'}</span>
              </button>

              <button
                onClick={() => soundCtrl.testAudio('lose', 0, language)}
                className="flex-1 py-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-bold transition-all active:scale-95 flex items-center justify-center space-x-1"
              >
                <span>🔔</span>
                <span>{language === 'si' ? 'පරාජ හඬ (Loss)' : 'Test Loss Audio'}</span>
              </button>
            </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[11px]">
          {/* URL Test 1. Official Govisetha URL (NLB Physical Ticket QR) */}
          <button
            onClick={() => handleScannedData('https://www.nlb.lk/results/govisetha/4563')}
            className="p-2 rounded-xl bg-purple-950/40 hover:bg-purple-900/60 border border-purple-500/40 text-purple-200 font-bold text-left transition-all active:scale-95"
            title="Scan NLB Official Results URL"
          >
            <div className="text-[10px] text-purple-300">🔗 {language === 'si' ? 'ගොවිසෙත URL' : 'Govisetha URL'}</div>
            <div className="truncate text-white font-extrabold">nlb.lk Official</div>
            <div className="text-[9px] text-purple-400 font-mono">/govisetha/4563</div>
          </button>

          {/* URL Test 2. Official Ada Kotipathi URL (DLB Physical Ticket QR) */}
          <button
            onClick={() => handleScannedData('https://www.dlb.lk/results/details?l=AK&d=3121')}
            className="p-2 rounded-xl bg-purple-950/40 hover:bg-purple-900/60 border border-purple-500/40 text-purple-200 font-bold text-left transition-all active:scale-95"
            title="Scan DLB Official Results URL"
          >
            <div className="text-[10px] text-purple-300">🔗 {language === 'si' ? 'අද කෝටිපති URL' : 'Ada Kotipathi URL'}</div>
            <div className="truncate text-white font-extrabold">dlb.lk Official</div>
            <div className="text-[9px] text-purple-400 font-mono">?l=AK&d=3121</div>
          </button>

          {/* 1. Govisetha Win */}
          <button
            onClick={() => handleScannedData('NLB|GS|4563|2026-09-25|T|16|30|34|51')}
            className="p-2 rounded-xl bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-600/40 text-emerald-200 font-bold text-left transition-all active:scale-95"
            title="Govisetha Winning Ticket: Super Prize"
          >
            <div className="text-[10px] text-emerald-400">🌾 {language === 'si' ? 'ගොවිසෙත දිනුම්' : 'Govisetha Win'}</div>
            <div className="truncate text-white font-extrabold">GS #4563</div>
            <div className="text-[9px] text-emerald-300 font-mono">T 16-30-34-51</div>
          </button>

          {/* 2. Govisetha Loss */}
          <button
            onClick={() => handleScannedData('NLB|GS|4563|2026-09-25|A|02|15|27|40')}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-600 text-slate-200 font-bold text-left transition-all active:scale-95"
            title="Govisetha Non-Winning Ticket"
          >
            <div className="text-[10px] text-rose-400">🌾 {language === 'si' ? 'ගොවිසෙත පරාජ' : 'Govisetha Loss'}</div>
            <div className="truncate text-white font-extrabold">GS Loss Test</div>
            <div className="text-[9px] text-slate-400 font-mono">A 02-15-27-40</div>
          </button>

          {/* 3. Ada Kotipathi Win */}
          <button
            onClick={() => handleScannedData('DLB|AK|3121|2026-09-25|I|08|53|57|74')}
            className="p-2 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 border border-rose-600/40 text-rose-200 font-bold text-left transition-all active:scale-95"
            title="Ada Kotipathi Winning Ticket"
          >
            <div className="text-[10px] text-rose-400">💰 {language === 'si' ? 'අද කෝටිපති' : 'Ada Kotipathi'}</div>
            <div className="truncate text-white font-extrabold">AK #3121 Win</div>
            <div className="text-[9px] text-rose-300 font-mono">I 08-53-57-74</div>
          </button>

          {/* 4. Ada Kotipathi Loss */}
          <button
            onClick={() => handleScannedData('DLB|AK|3121|2026-09-25|A|01|02|03|04')}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-600 text-slate-200 font-bold text-left transition-all active:scale-95"
            title="Ada Kotipathi Non-Winning Ticket"
          >
            <div className="text-[10px] text-slate-400">💰 {language === 'si' ? 'අද කෝටිපති පරාජ' : 'AK Loss'}</div>
            <div className="truncate text-white font-extrabold">AK Loss Test</div>
            <div className="text-[9px] text-slate-400 font-mono">A 01-02-03-04</div>
          </button>

          {/* 5. Mahajana Sampatha Win */}
          <button
            onClick={() => handleScannedData('NLB|MS|6321|2026-09-25|M|4|8|1|9|0|3')}
            className="p-2 rounded-xl bg-blue-950/40 hover:bg-blue-900/60 border border-blue-600/40 text-blue-200 font-bold text-left transition-all active:scale-95"
            title="Mahajana Sampatha: Letter + 6 Single Digits"
          >
            <div className="text-[10px] text-blue-400">🏆 {language === 'si' ? 'මහජන සම්පත' : 'Mahajana Sampatha'}</div>
            <div className="truncate text-white font-extrabold">MS #6321 Win</div>
            <div className="text-[9px] text-blue-300 font-mono">M 4-8-1-9-0-3</div>
          </button>

          {/* 6. Shanida Losing Ticket (No Win) */}
          <button
            onClick={() => handleScannedData('DLB|SW|5448|2026-09-17|Z|12|24|36|48|11111')}
            className="p-2 rounded-xl bg-slate-900/60 hover:bg-slate-800 border border-slate-700 text-slate-200 font-bold text-left transition-all active:scale-95"
            title="Shanida Wasana Non-Winning Ticket (0 Matches)"
          >
            <div className="text-[10px] text-slate-400">📅 {language === 'si' ? 'ශනිදා (දිනුමක් නැත)' : 'Shanida (No Win)'}</div>
            <div className="truncate text-white font-extrabold">SW #5448 Lose</div>
            <div className="text-[9px] text-slate-400 font-mono">Z 12-24-36-48 (0 Win)</div>
          </button>

          {/* 7. Lagna Wasana Losing Ticket (No Win) */}
          <button
            onClick={() => handleScannedData('DLB|LW|4993|2026-09-11|මේෂ|05|14|22|31')}
            className="p-2 rounded-xl bg-slate-900/60 hover:bg-slate-800 border border-slate-700 text-slate-200 font-bold text-left transition-all active:scale-95"
            title="Lagna Wasana Non-Winning Ticket (0 Matches)"
          >
            <div className="text-[10px] text-slate-400">♈ {language === 'si' ? 'ලග්න (දිනුමක් නැත)' : 'LW (No Win)'}</div>
            <div className="truncate text-white font-extrabold">LW #4993 Lose</div>
            <div className="text-[9px] text-slate-400 font-mono">මේෂ 05-14-22-31</div>
          </button>

          {/* 8. Super Ball Win */}
          <button
            onClick={() => handleScannedData('DLB|SB|3295|2026-09-25|S|04|18|42|66|SB:19')}
            className="p-2 rounded-xl bg-amber-950/40 hover:bg-amber-900/60 border border-amber-600/40 text-amber-200 font-bold text-left transition-all active:scale-95"
            title="Super Ball: Letter + 4 Numbers + Super Ball"
          >
            <div className="text-[10px] text-amber-400">⚽ {language === 'si' ? 'සුපර් බෝල්' : 'Super Ball'}</div>
            <div className="truncate text-white font-extrabold">SB #3295 Win</div>
            <div className="text-[9px] text-amber-300 font-mono">S 04-18-42-66 (19)</div>
          </button>

          {/* 9. Kapruka Win */}
          <button
            onClick={() => handleScannedData('DLB|KP|2471|2026-09-25|K|11|29|45|59|SB:07')}
            className="p-2 rounded-xl bg-amber-950/40 hover:bg-amber-900/60 border border-amber-600/40 text-amber-200 font-bold text-left transition-all active:scale-95"
            title="Kapruka: Letter + 4 Numbers + Super Number"
          >
            <div className="text-[10px] text-amber-400">🌴 {language === 'si' ? 'කප්රුක' : 'Kapruka'}</div>
            <div className="truncate text-white font-extrabold">KP #2471 Win</div>
            <div className="text-[9px] text-amber-300 font-mono">K 11-29-45-59 (7)</div>
          </button>

          {/* 10. Mega Power Win */}
          <button
            onClick={() => handleScannedData('NLB|MP|2669|2026-09-25|B|05|23|47|69|MB:88')}
            className="p-2 rounded-xl bg-fuchsia-950/40 hover:bg-fuchsia-900/60 border border-fuchsia-600/40 text-fuchsia-200 font-bold text-left transition-all active:scale-95"
            title="Mega Power: Letter + 4 Numbers + Mega Ball"
          >
            <div className="text-[10px] text-fuchsia-400">⚡ {language === 'si' ? 'මෙගා පවර්' : 'Mega Power'}</div>
            <div className="truncate text-white font-extrabold">MP #2669 Win</div>
            <div className="text-[9px] text-fuchsia-300 font-mono">B 05-23-47-69 (88)</div>
          </button>

          {/* 11. Dhana Nidhanaya Win */}
          <button
            onClick={() => handleScannedData('NLB|DN|2351|2026-09-25|D|12|35|58|84')}
            className="p-2 rounded-xl bg-sky-950/40 hover:bg-sky-900/60 border border-sky-600/40 text-sky-200 font-bold text-left transition-all active:scale-95"
            title="Dhana Nidhanaya: Letter + 4 Numbers"
          >
            <div className="text-[10px] text-sky-400">💎 {language === 'si' ? 'ධන නිධානය' : 'Dhana Nidhanaya'}</div>
            <div className="truncate text-white font-extrabold">DN #2351 Win</div>
            <div className="text-[9px] text-sky-300 font-mono">D 12-35-58-84</div>
          </button>

          {/* 12. Handahana Win */}
          <button
            onClick={() => handleScannedData('NLB|HD|1630|2026-09-25|මේෂ|07|21|49|63')}
            className="p-2 rounded-xl bg-indigo-950/40 hover:bg-indigo-900/60 border border-indigo-600/40 text-indigo-200 font-bold text-left transition-all active:scale-95"
            title="Handahana: Zodiac + 4 Numbers"
          >
            <div className="text-[10px] text-indigo-400">🔮 {language === 'si' ? 'හඳහන' : 'Handahana'}</div>
            <div className="truncate text-white font-extrabold">HD #1630 Win</div>
            <div className="text-[9px] text-indigo-300 font-mono">මේෂ 07-21-49-63</div>
          </button>

          {/* 13. Jayoda Win */}
          <button
            onClick={() => handleScannedData('NLB|JD|2120|2026-09-25|J|03|16|31|47')}
            className="p-2 rounded-xl bg-teal-950/40 hover:bg-teal-900/60 border border-teal-600/40 text-teal-200 font-bold text-left transition-all active:scale-95"
            title="Jayoda: Letter + 4 Numbers"
          >
            <div className="text-[10px] text-teal-400">🌟 {language === 'si' ? 'ජයෝදා' : 'Jayoda'}</div>
            <div className="truncate text-white font-extrabold">JD #2120 Win</div>
            <div className="text-[9px] text-teal-300 font-mono">J 03-16-31-47</div>
          </button>

          {/* 14. Sasiri Win */}
          <button
            onClick={() => handleScannedData('DLB|SASIRI|1125|2026-09-25|17|44|68')}
            className="p-2 rounded-xl bg-cyan-950/40 hover:bg-cyan-900/60 border border-cyan-600/40 text-cyan-200 font-bold text-left transition-all active:scale-95"
            title="Sasiri: 3 Numbers Match"
          >
            <div className="text-[10px] text-cyan-400">🎯 {language === 'si' ? 'සසිරි' : 'Sasiri (3N)'}</div>
            <div className="truncate text-white font-extrabold">Sasiri #1125 Win</div>
            <div className="text-[9px] text-cyan-300 font-mono">17-44-68</div>
          </button>

          {/* 15. Supiri Dhana Sampatha Win */}
          <button
            onClick={() => handleScannedData('DLB|SDS|1029|2026-09-25|X|6|3|7|3|1|0')}
            className="p-2 rounded-xl bg-red-950/40 hover:bg-red-900/60 border border-red-600/40 text-red-200 font-bold text-left transition-all active:scale-95"
            title="Supiri Dhana Sampatha: Letter + 6 Digits"
          >
            <div className="text-[10px] text-red-400">👑 {language === 'si' ? 'සුපිරි ධන සම්පත' : 'Supiri Dhana'}</div>
            <div className="truncate text-white font-extrabold">SDS #1029 Win</div>
            <div className="text-[9px] text-red-300 font-mono">X 6-3-7-3-1-0</div>
          </button>

          {/* 16. Suba Dawasak Win (3N+Z) */}
          <button
            onClick={() => handleScannedData('NLB|SD|1852|2026-09-25|සිංහ|18|42|77')}
            className="p-2 rounded-xl bg-lime-950/40 hover:bg-lime-900/60 border border-lime-600/40 text-lime-200 font-bold text-left transition-all active:scale-95"
            title="Suba Dawasak: Zodiac + 3 Numbers"
          >
            <div className="text-[10px] text-lime-400">☀️ {language === 'si' ? 'සුබ දවසක්' : 'Suba Dawasak'}</div>
            <div className="truncate text-white font-extrabold">SD #1852 Win</div>
            <div className="text-[9px] text-lime-300 font-mono">සිංහ 18-42-77</div>
          </button>

          {/* 17. Lagna Wasana Numeric Index (04 = Kataka) */}
          <button
            onClick={() => handleScannedData('DLB|LW|5007|2026-09-25|04|10|24|39|52')}
            className="p-2 rounded-xl bg-purple-950/40 hover:bg-purple-900/60 border border-purple-600/40 text-purple-200 font-bold text-left transition-all active:scale-95"
            title="Lagna Wasana with Numeric Zodiac Index 04"
          >
            <div className="text-[10px] text-purple-400">♈ {language === 'si' ? 'ලග්න වාසනාව (අංක 04)' : 'LW (Z:04)'}</div>
            <div className="truncate text-white font-extrabold">LW #5007 (04)</div>
            <div className="text-[9px] text-purple-300 font-mono">04(කටක) 10-24-39-52</div>
          </button>

          {/* 18. Govisetha Compact */}
          <button
            onClick={() => handleScannedData('GS4563T16303451')}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-600 text-slate-200 font-bold text-left transition-all active:scale-95"
            title="Govisetha Compact Barcode"
          >
            <div className="text-[10px] text-teal-400">🌾 {language === 'si' ? 'තනි Barcode කේතය' : 'Compact Barcode'}</div>
            <div className="truncate text-white font-extrabold">GS4563T16303451</div>
            <div className="text-[9px] text-teal-300 font-mono">POS Terminal format</div>
          </button>

          {/* 19. Kapruka 2452 Scanned Ticket */}
          <button
            onClick={() => handleScannedData('K112945593524522026.09.25')}
            className="p-2 rounded-xl bg-amber-950/60 hover:bg-amber-900 border border-amber-500 text-amber-200 font-bold text-left transition-all active:scale-95 shadow-md"
            title="Kapruka 2452 Scanned Ticket: K 11-29-45-59 [Super No: 35]"
          >
            <div className="text-[10px] text-amber-300">🌴 {language === 'si' ? 'කප්රුක #2452 ටිකට්පත' : 'Kapruka #2452 Ticket'}</div>
            <div className="truncate text-white font-extrabold font-mono text-xs">K11294559352452..</div>
            <div className="text-[9px] text-amber-300 font-mono">K 11-29-45-59 [35]</div>
          </button>

          {/* 20. Lagna Wasana 4993 Scanned Ticket */}
          <button
            onClick={() => handleScannedData('041024395249932026.09.25')}
            className="p-2 rounded-xl bg-purple-950/60 hover:bg-purple-900 border border-purple-500 text-purple-200 font-bold text-left transition-all active:scale-95 shadow-md"
            title="Lagna Wasana 4993 Scanned Ticket: කටක 10-24-39-52"
          >
            <div className="text-[10px] text-purple-300">♈ {language === 'si' ? 'ලග්න වාසනාව #4993 ටිකට්පත' : 'LW #4993 Ticket'}</div>
            <div className="truncate text-white font-extrabold font-mono text-xs">04102439524993..</div>
            <div className="text-[9px] text-purple-300 font-mono">04(කටක) 10-24-39-52</div>
          </button>

          {/* 21. Ada Kotipathi 3112 Scanned Ticket */}
          <button
            onClick={() => handleScannedData('I0853577431122026.09.25')}
            className="p-2 rounded-xl bg-rose-950/60 hover:bg-rose-900 border border-rose-500 text-rose-200 font-bold text-left transition-all active:scale-95 shadow-md"
            title="Ada Kotipathi 3112 Scanned Ticket: I 08-53-57-74"
          >
            <div className="text-[10px] text-rose-300">💰 {language === 'si' ? 'අද කෝටිපති #3112 ටිකට්පත' : 'AK #3112 Ticket'}</div>
            <div className="truncate text-white font-extrabold font-mono text-xs">I085357743112..</div>
            <div className="text-[9px] text-rose-300 font-mono">I 08-53-57-74</div>
          </button>

          {/* 22. Shanida Letter Match (Rs. 40/=) */}
          <button
            onClick={() => handleScannedData('DLB|SW|5472|2026-10-11|S|01|02|03|04')}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-600 text-slate-200 font-bold text-left transition-all active:scale-95 shadow-md"
            title="Shanida 5472 Letter Match: S Matches = Rs. 40"
          >
            <div className="text-[10px] text-emerald-400">💵 {language === 'si' ? 'ශනිදා (රු. 40 දිනුම - අකුර)' : 'SW #5472 (Rs. 40 - Letter)'}</div>
            <div className="truncate text-white font-extrabold font-mono text-xs">SW 5472 (Rs. 40)</div>
            <div className="text-[9px] text-emerald-300 font-mono">[S] 01-02-03-04</div>
          </button>

          {/* 23. Shanida 2 Numbers Match (Rs. 200/=) */}
          <button
            onClick={() => handleScannedData('DLB|SW|5472|2026-10-11|Z|17|21|33|55')}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-600 text-slate-200 font-bold text-left transition-all active:scale-95 shadow-md"
            title="Shanida 5472 2-Numbers Match: 17, 21 Match = Rs. 200"
          >
            <div className="text-[10px] text-emerald-400">💵 {language === 'si' ? 'ශනිදා (රු. 200 දිනුම - අංක 2ක්)' : 'SW #5472 (Rs. 200 - 2 Match)'}</div>
            <div className="truncate text-white font-extrabold font-mono text-xs">SW 5472 (Rs. 200)</div>
            <div className="text-[9px] text-emerald-300 font-mono">Z [17]-[21]-33-55</div>
          </button>

          {/* 24. Handahana 1626 Scanned Ticket */}
          <button
            onClick={() => handleScannedData('011948540416262026.09.21')}
            className="p-2 rounded-xl bg-fuchsia-950/60 hover:bg-fuchsia-900 border border-fuchsia-500 text-fuchsia-200 font-bold text-left transition-all active:scale-95 shadow-md"
            title="Handahana 1626 Scanned Ticket: කටක 01-19-48-54"
          >
            <div className="text-[10px] text-fuchsia-300">🔮 {language === 'si' ? 'හඳහන #1626 ටිකට්පත' : 'HD #1626 Ticket'}</div>
            <div className="truncate text-white font-extrabold font-mono text-xs">01194854041626..</div>
            <div className="text-[9px] text-fuchsia-300 font-mono">04(කටක) 01-19-48-54</div>
          </button>

          {/* 25. Shanida 5472 Single Number Only Match (Rs. 40/=) */}
          <button
            onClick={() => handleScannedData('DLB|SW|5472|2026-10-11|Z|17|02|03|04')}
            className="p-2 rounded-xl bg-sky-950/70 hover:bg-sky-900 border border-sky-400 text-sky-200 font-bold text-left transition-all active:scale-95 shadow-md"
            title="Shanida 5472 Single Number 17 Match Only = Rs. 40"
          >
            <div className="text-[10px] text-sky-300">🌟 {language === 'si' ? 'ශනිදා (තනි අංකය පමණක් - රු. 40)' : 'SW #5472 (No 17 - Rs. 40)'}</div>
            <div className="truncate text-white font-extrabold font-mono text-xs">SW 5472 (Single 17)</div>
            <div className="text-[9px] text-sky-300 font-mono">Z [17]-02-03-04</div>
          </button>

          {/* 26. Shanida 5472 3 Numbers + Letter (Rs. 200,000/=) */}
          <button
            onClick={() => handleScannedData('DLB|SW|5472|2026-10-11|S|17|21|29|55')}
            className="p-2 rounded-xl bg-amber-950/70 hover:bg-amber-900 border border-amber-400 text-amber-200 font-bold text-left transition-all active:scale-95 shadow-md"
            title="Shanida 5472 3 Numbers + Letter Match = Rs. 200,000"
          >
            <div className="text-[10px] text-amber-300">🏆 {language === 'si' ? 'ශනිදා (රු. 200,000 දිනුම - අංක 3+අකුර)' : 'SW #5472 (Rs. 200k - 3N+L)'}</div>
            <div className="truncate text-white font-extrabold font-mono text-xs">SW 5472 (Rs. 200,000)</div>
            <div className="text-[9px] text-amber-300 font-mono">[S] [17]-[21]-[29]-55</div>
          </button>

          {/* 27. Lagna Wasana 4993 Winning Draw */}
          <button
            onClick={() => handleScannedData('032351575849932026.09.11')}
            className="p-2 rounded-xl bg-purple-950/70 hover:bg-purple-900 border border-purple-400/60 text-purple-200 font-bold text-left transition-all active:scale-95 shadow-md"
            title="Lagna Wasana 4993 Winning Draw: 03(මිථුන) 23-51-57-58"
          >
            <div className="text-[10px] text-purple-300">🏆 {language === 'si' ? 'LW #4993 ජයග්‍රාහී Draw' : 'LW #4993 Win Draw'}</div>
            <div className="truncate text-white font-extrabold font-mono text-xs">03235157584993..</div>
            <div className="text-[9px] text-purple-300 font-mono">03(මිථුන) 23-51-57-58</div>
          </button>

          {/* 28. Ada Kotipathi 3112 Winning Draw */}
          <button
            onClick={() => handleScannedData('C1450616431122026.09.16')}
            className="p-2 rounded-xl bg-rose-950/70 hover:bg-rose-900 border border-rose-400/60 text-rose-200 font-bold text-left transition-all active:scale-95 shadow-md"
            title="Ada Kotipathi 3112 Winning Draw: C 14-50-61-64"
          >
            <div className="text-[10px] text-rose-300">🏆 {language === 'si' ? 'AK #3112 ජයග්‍රාහී Draw' : 'AK #3112 Win Draw'}</div>
            <div className="truncate text-white font-extrabold font-mono text-xs">C145061643112..</div>
            <div className="text-[9px] text-rose-300 font-mono">C 14-50-61-64</div>
          </button>

          {/* 29. Handahana 1626 Winning Draw */}
          <button
            onClick={() => handleScannedData('091213430416262026.09.21')}
            className="p-2 rounded-xl bg-fuchsia-950/70 hover:bg-fuchsia-900 border border-fuchsia-400/60 text-fuchsia-200 font-bold text-left transition-all active:scale-95 shadow-md"
            title="Handahana 1626 Winning Draw: කටක 09-12-13-43"
          >
            <div className="text-[10px] text-fuchsia-300">🏆 {language === 'si' ? 'HD #1626 ජයග්‍රාහී Draw' : 'HD #1626 Win Draw'}</div>
            <div className="truncate text-white font-extrabold font-mono text-xs">09121343041626..</div>
            <div className="text-[9px] text-fuchsia-300 font-mono">04(කටක) 09-12-13-43</div>
          </button>

          {/* 30. Kapruka 2452 Winning Draw */}
          <button
            onClick={() => handleScannedData('U041364661024522026.09.06')}
            className="p-2 rounded-xl bg-amber-950/70 hover:bg-amber-900 border border-amber-400/60 text-amber-200 font-bold text-left transition-all active:scale-95 shadow-md"
            title="Kapruka 2452 Winning Draw: U 04-13-64-66 [Super No: 10]"
          >
            <div className="text-[10px] text-amber-300">🏆 {language === 'si' ? 'KP #2452 ජයග්‍රාහී Draw' : 'KP #2452 Win Draw'}</div>
            <div className="truncate text-white font-extrabold font-mono text-xs">U04136466102452..</div>
            <div className="text-[9px] text-amber-300 font-mono">U 04-13-64-66 [10]</div>
          </button>

          {/* 31. Shanida 5472 Real Printed Ticket (No Win / දිනුමක් නැත) */}
          <button
            onClick={() => handleScannedData('SHANIDA 5472 2026.10.11 5472 - 233819851 - 2 - 01 M 08 23 37 65 www.dlb.lk')}
            className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-slate-200 font-bold text-left transition-all active:scale-95 shadow-md"
            title="Shanida 5472 Printed Ticket: M 08-23-37-65 (0 Matches - No Win)"
          >
            <div className="text-[10px] text-slate-400">🎟️ {language === 'si' ? 'ශනිදා #5472 (දිනුමක් නැත)' : 'SW #5472 (No Win)'}</div>
            <div className="truncate text-white font-extrabold font-mono text-xs">SW 5472 (Lose)</div>
            <div className="text-[9px] text-slate-400 font-mono">M 08-23-37-65</div>
          </button>

          {/* 32. Shanida 5472 Real Printed Ticket (Rs. 40 English Letter Prize) */}
          <button
            onClick={() => handleScannedData('SHANIDA 5472 2026.10.11 5472 - 233422057 - 1 - 02 S 04 18 33 46 www.dlb.lk')}
            className="p-2 rounded-xl bg-sky-950/70 hover:bg-sky-900 border border-sky-400 text-sky-200 font-bold text-left transition-all active:scale-95 shadow-md"
            title="Shanida 5472 Printed Ticket: S 04-18-33-46 (Letter S matches = Rs. 40)"
          >
            <div className="text-[10px] text-sky-300">🎟️ {language === 'si' ? 'ශනිදා #5472 (රු. 40 අකුර)' : 'SW #5472 (Rs. 40 Letter)'}</div>
            <div className="truncate text-white font-extrabold font-mono text-xs">SW 5472 (Rs. 40)</div>
            <div className="text-[9px] text-sky-300 font-mono">[S] 04-18-33-46</div>
          </button>

          {/* 32B. Shanida 5472 Super Jackpot Test Demo (Rs. 56M) */}
          <button
            onClick={() => handleScannedData('SHANIDA 5472 2026.10.11 5472 - 233422057 - 1 - 02 S 17 21 29 57 www.dlb.lk')}
            className="p-2 rounded-xl bg-amber-950/60 hover:bg-amber-900 border border-amber-500 text-amber-200 font-bold text-left transition-all active:scale-95 shadow-md"
            title="Shanida 5472 Jackpot Test: S 17-21-29-57 = Super Jackpot Rs. 56M"
          >
            <div className="text-[10px] text-amber-300">🌟 {language === 'si' ? 'ශනිදා (ජැක්පොට් Demo - 56M)' : 'SW (Jackpot Demo - 56M)'}</div>
            <div className="truncate text-white font-extrabold font-mono text-xs">SW 5472 (Rs. 56M)</div>
            <div className="text-[9px] text-amber-300 font-mono">S 17-21-29-57</div>
          </button>

          {/* 33. Lagna Wasana 4993 Real Printed Ticket */}
          <button
            onClick={() => handleScannedData('LAGNA WASANA 4993 2026.09.11 4993 - 500395754 - 7 - 04 GEM 23 51 57 58 www.dlb.lk')}
            className="p-2 rounded-xl bg-purple-950/70 hover:bg-purple-900 border border-purple-400 text-purple-200 font-bold text-left transition-all active:scale-95 shadow-md"
            title="Lagna Wasana 4993 Printed Ticket: GEM 23-51-57-58"
          >
            <div className="text-[10px] text-purple-300">🎟️ {language === 'si' ? 'LW #4993 ටිකට්පත (මිථුන)' : 'LW #4993 Ticket (GEM)'}</div>
            <div className="truncate text-white font-extrabold font-mono text-xs">LW 4993 GEM 23-51..</div>
            <div className="text-[9px] text-purple-300 font-mono">GEM(මිථුන) 23-51-57-58</div>
          </button>

          {/* 34. Lagna Wasana 4993 Draw First Compact Ticket */}
          <button
            onClick={() => handleScannedData('499304102439522026.09.25')}
            className="p-2 rounded-xl bg-purple-950/70 hover:bg-purple-900 border border-purple-400 text-purple-200 font-bold text-left transition-all active:scale-95 shadow-md"
            title="Lagna Wasana Draw First Compact Ticket: 4993 04(කටක) 10-24-39-52"
          >
            <div className="text-[10px] text-purple-300">🎟️ {language === 'si' ? 'LW #4993 Draw-First' : 'LW #4993 Draw-First'}</div>
            <div className="truncate text-white font-extrabold font-mono text-xs">49930410243952..</div>
            <div className="text-[9px] text-purple-300 font-mono">04(කටක) 10-24-39-52</div>
          </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};
