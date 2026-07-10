import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Camera, VideoOff, Volume2, VolumeX, X, AlertCircle, RefreshCw, QrCode, Barcode, HelpCircle } from 'lucide-react';
import { Language } from '../types';

interface CameraScannerProps {
  language: Language;
  onScanSuccess: (decodedText: string) => void;
  onClose: () => void;
}

export default function CameraScanner({
  language,
  onScanSuccess,
  onClose,
}: CameraScannerProps) {
  const [cameras, setCameras] = useState<{ id: string; label: string; }[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isBeepEnabled, setIsBeepEnabled] = useState<boolean>(true);
  const [lastScannedText, setLastScannedText] = useState<string>('');
  const [scanCooldown, setScanCooldown] = useState<boolean>(false);
  const [mockBarcode, setMockBarcode] = useState<string>('');
  const [scanMode, setScanMode] = useState<'qr' | 'barcode'>('qr');
  const [showHelp, setShowHelp] = useState<boolean>(false);

  const html5QrcodeRef = useRef<Html5Qrcode | null>(null);
  const elementId = 'webcam-scanner-viewport';

  // Translations
  const t = {
    title: language === 'kh' ? 'ស្កេនកូដតាមកាមេរ៉ា' : 'Webcam Barcode/QR Scanner',
    subtitle: language === 'kh' ? 'សូមដាក់បារកូដ ឬ QR code សៀវភៅឱ្យចំប្រអប់កណ្តាល' : 'Position the book barcode or QR code inside the target box',
    allowCamera: language === 'kh' ? 'កំពុងស្វែងរក ឬស្នើសុំសិទ្ធិប្រើប្រាស់កាមេរ៉ា...' : 'Requesting camera access permissions...',
    noCamera: language === 'kh' ? 'រកមិនឃើញកាមេរ៉ា ឬមិនទាន់បានអនុញ្ញាតឡើយ' : 'No camera found or permission denied.',
    selectCam: language === 'kh' ? 'ជ្រើសរើសកាមេរ៉ា' : 'Select Camera',
    startScanning: language === 'kh' ? 'ចាប់ផ្តើមស្កេន' : 'Start Scanning',
    stopScanning: language === 'kh' ? 'ផ្អាកស្កេន' : 'Stop Scanning',
    close: language === 'kh' ? 'បិទ' : 'Close',
    successScan: language === 'kh' ? 'បានរកឃើញបារកូដ៖' : 'Barcode Scanned:',
    beepSound: language === 'kh' ? 'សំឡេងប៊ីប' : 'Beep Audio',
    cooldown: language === 'kh' ? 'សូមរង់ចាំបន្តិច...' : 'Scanning cooled down...',
    scanModeLabel: language === 'kh' ? 'របៀបស្កេន' : 'Scanning Mode',
    qrMode: language === 'kh' ? 'ស្កេន QR Code' : 'Scan QR Code',
    barcodeMode: language === 'kh' ? 'ស្កេន Barcode' : 'Scan Barcode',
    helpTitle: language === 'kh' ? 'គន្លឹះស្កេនឱ្យលឿន' : 'Quick Scan Tips',
    tips: language === 'kh' 
        ? ['រក្សាភាពស្ងប់ស្ងាត់', 'ដាក់បារកូដឱ្យចំប្រអប់', 'រក្សាកន្លែងមានពន្លឺគ្រប់គ្រាន់']
        : ['Keep device steady', 'Align barcode in box', 'Ensure good lighting'],
  };

  // Generate synthesizer beep sound using Web Audio API on success
  const playBeep = () => {
    if (!isBeepEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.type = 'sine';
      oscillator.frequency.value = 1200; // Sharp beep sound
      gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.12, audioCtx.currentTime + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.25);

      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + 0.25);
    } catch (e) {
      console.warn('Browser blocked auto-play audio context until user interaction:', e);
    }
  };

  // Enumerate cameras
  useEffect(() => {
    Html5Qrcode.getCameras()
      .then((devices) => {
        if (devices && devices.length > 0) {
          setCameras(devices);
          // Prefer back/rear camera by default if present
          const backCam = devices.find(
            (d) =>
              d.label.toLowerCase().includes('back') ||
              d.label.toLowerCase().includes('rear') ||
              d.label.toLowerCase().includes('environment')
          );
          setSelectedCameraId(backCam ? backCam.id : devices[0].id);
        } else {
          setErrorMsg(t.noCamera);
        }
      })
      .catch((err) => {
        console.warn('Expected warning - Camera device not found or permission pending:', err);
        setErrorMsg(t.noCamera);
      });

    return () => {
      // Ensure we clean up when component unmounts
      stopScannerImmediate();
    };
  }, []);

  // Control starting and stopping based on camera ID and scan state
  useEffect(() => {
    if (selectedCameraId) {
      startScanner(selectedCameraId);
    }
    return () => {
      stopScannerImmediate();
    };
  }, [selectedCameraId, scanMode]);

  const startScanner = async (cameraId: string) => {
    setErrorMsg('');
    try {
      // If we already have a scanner running, stop it first
      await stopScannerImmediate();

      const html5Qrcode = new Html5Qrcode(elementId);
      html5QrcodeRef.current = html5Qrcode;

      setIsScanning(true);
      await html5Qrcode.start(
        cameraId,
        {
          fps: 15,
          qrbox: (width, height) => {
            if (scanMode === 'qr') {
              // Square box optimal for QR code labels
              const boxDim = Math.min(width * 0.7, height * 0.7, 240);
              return {
                x: (width - boxDim) / 2,
                y: (height - boxDim) / 2,
                width: boxDim,
                height: boxDim,
              };
            } else {
              // Horizontal narrow box optimal for 1D ISBN/barcodes
              const boxWidth = Math.min(width * 0.85, 340);
              const boxHeight = Math.min(height * 0.45, 140);
              return {
                x: (width - boxWidth) / 2,
                y: (height - boxHeight) / 2,
                width: boxWidth,
                height: boxHeight,
              };
            }
          },
          aspectRatio: 1.333333,
        },
        (decodedText) => {
          // Prevent multiple double scans within 1.5 seconds
          if (scanCooldown) return;

          playBeep();
          setLastScannedText(decodedText);
          onScanSuccess(decodedText);

          // Trigger cooldown
          setScanCooldown(true);
          setTimeout(() => {
            setScanCooldown(false);
          }, 1500);
        },
        () => {
          // Verbose log failures are ignored by default
        }
      );
    } catch (err: any) {
      console.warn('Expected warning - Failed to start camera scan:', err);
      setErrorMsg(
        language === 'kh'
          ? 'មិនអាចបើកកាមេរ៉ាបានទេ៖ សូមប្រាកដថាមិនមានកម្មវិធីផ្សេងកំពុងប្រើប្រាស់វា។'
          : `Could not access webcam stream: ${err?.message || 'Access Denied'}`
      );
      setIsScanning(false);
    }
  };

  const stopScannerImmediate = async () => {
    if (html5QrcodeRef.current && html5QrcodeRef.current.isScanning) {
      try {
        await html5QrcodeRef.current.stop();
      } catch (err) {
        console.warn('Error stopping scanner:', err);
      }
    }
    setIsScanning(false);
  };

  const handleToggleScanning = async () => {
    if (isScanning) {
      await stopScannerImmediate();
    } else if (selectedCameraId) {
      await startScanner(selectedCameraId);
    } else {
      setErrorMsg(t.noCamera);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white/90 backdrop-blur-xl border border-white/60 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl relative flex flex-col">
        {/* Header bar */}
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Camera className="w-5 h-5 text-blue-600 animate-pulse" />
              {t.title}
              <div className="flex items-center gap-1 bg-blue-50 border border-blue-100/50 px-1.5 py-0.5 rounded-md">
                <Barcode className="w-3 h-3 text-blue-600" />
                <span className="text-[9px] text-blue-400 font-bold">+</span>
                <QrCode className="w-3 h-3 text-blue-600" />
              </div>
            </h3>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
              {t.subtitle}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowHelp(true)}
              className="p-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-600 transition cursor-pointer"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-500 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Camera Viewport and Visual Target Frame */}
        <div className="bg-slate-900 relative aspect-video flex items-center justify-center overflow-hidden">
          {/* Help Overlay */}
          {showHelp && (
            <div className="absolute inset-0 bg-white/95 z-20 p-6 flex flex-col items-center justify-center text-center">
              <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
                <HelpCircle className="w-6 h-6 text-blue-600" />
                {t.helpTitle}
              </h3>
              <ul className="space-y-4 text-left w-full max-w-xs">
                {t.tips.map((tip, i) => (
                  <li key={i} className="flex items-center gap-3 bg-slate-50 p-4 rounded-2xl font-bold text-sm text-slate-700 border border-slate-100">
                    <span className="w-6 h-6 flex items-center justify-center rounded-full bg-blue-100 text-blue-600 font-black text-xs">{i + 1}</span>
                    {tip}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => setShowHelp(false)}
                className="mt-8 px-6 py-3 bg-blue-600 text-white font-bold text-xs rounded-xl hover:bg-blue-700 transition cursor-pointer"
              >
                {language === 'kh' ? 'យល់ព្រម' : 'Got it'}
              </button>
            </div>
          )}
          {/* Main video element target */}
          <div id={elementId} className="w-full h-full object-cover [&>video]:object-cover" />

          {/* Custom Overlay Scanning Target UI */}
          {isScanning && !errorMsg && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-4">
              {/* Highlight target box with shadow-masking spotlight effect */}
              <div 
                className={`border-2 border-dashed border-blue-400 rounded-2xl flex flex-col items-center justify-center relative bg-blue-500/5 transition-all duration-300 shadow-[0_0_0_9999px_rgba(15,23,42,0.65)] ${
                  scanMode === 'qr' 
                    ? 'w-[65%] aspect-square max-w-[240px]' 
                    : 'w-[85%] h-[120px] max-w-[340px]'
                }`}
              >
                {/* Thick high-contrast corner brackets */}
                <div className="absolute -top-[2px] -left-[2px] w-5 h-5 border-t-4 border-l-4 border-blue-500 rounded-tl-[10px]" />
                <div className="absolute -top-[2px] -right-[2px] w-5 h-5 border-t-4 border-r-4 border-blue-500 rounded-tr-[10px]" />
                <div className="absolute -bottom-[2px] -left-[2px] w-5 h-5 border-b-4 border-l-4 border-blue-500 rounded-bl-[10px]" />
                <div className="absolute -bottom-[2px] -right-[2px] w-5 h-5 border-b-4 border-r-4 border-blue-500 rounded-br-[10px]" />

                {/* Animated scanning laser line with pulse */}
                <div className="absolute left-1 right-1 h-[3px] bg-gradient-to-r from-red-500/20 via-red-500 to-red-500/20 animate-bounce shadow-[0_0_8px_rgba(239,68,68,0.8)]" />

                {/* Visual feedback or helper text floating inside or relative to alignment area */}
                <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-blue-600 text-white font-mono text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full shadow-lg border border-blue-400 whitespace-nowrap animate-pulse">
                  {scanMode === 'qr' 
                    ? (language === 'kh' ? 'ដាក់ QR Code ក្នុងប្រអប់' : 'ALIGN QR CODE HERE')
                    : (language === 'kh' ? 'ដាក់ Barcode ក្នុងប្រអប់' : 'ALIGN BARCODE HERE')
                  }
                </div>
              </div>
            </div>
          )}

          {/* Loading / Status Screen */}
          {(!isScanning || errorMsg) && (
            <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-6 text-center space-y-3.5">
              {errorMsg ? (
                <>
                  <AlertCircle className="w-10 h-10 text-red-500 animate-bounce" />
                  <p className="text-xs font-bold text-red-200 px-4">{errorMsg}</p>
                  
                  {/* Mock Simulator option */}
                  <div className="w-full max-w-xs mt-2 p-3 bg-slate-900 border border-slate-850 rounded-2xl space-y-2 text-left shadow-inner">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      {language === 'kh' ? 'សាកល្បងស្កេន (របៀបពិសោធន៍)' : 'Simulate Scan (Demo Mode)'}
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="e.g. KH-12-001"
                        value={mockBarcode}
                        onChange={(e) => setMockBarcode(e.target.value)}
                        className="flex-1 py-1.5 px-3 text-xs font-semibold text-white bg-slate-950 border border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                      />
                      <button
                        onClick={() => {
                          if (mockBarcode.trim()) {
                            playBeep();
                            setLastScannedText(mockBarcode.trim());
                            onScanSuccess(mockBarcode.trim());
                          }
                        }}
                        className="py-1.5 px-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition cursor-pointer"
                      >
                        {language === 'kh' ? 'ស្កេន' : 'Scan'}
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-500 font-medium leading-tight">
                      {language === 'kh' 
                        ? 'បញ្ចូលលេខបារកូដ (ឧ. KH-12-001) ដើម្បីសាកល្បងដោយគ្មានកាមេរ៉ា' 
                        : 'Enter a book barcode (e.g., KH-12-001) to simulate scan without camera access'}
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="relative">
                    <VideoOff className="w-10 h-10 text-slate-400" />
                    <RefreshCw className="w-4 h-4 text-blue-400 animate-spin absolute -bottom-1 -right-1" />
                  </div>
                  <p className="text-xs font-bold text-slate-300 animate-pulse">
                    {t.allowCamera}
                  </p>
                </>
              )}
            </div>
          )}
        </div>

        {/* Bottom controls & options */}
        <div className="p-5 bg-white/50 backdrop-blur border-t border-slate-100 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between gap-4 items-stretch sm:items-center">
            {/* Scanning Mode Selector */}
            <div className="flex-1">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                {t.scanModeLabel}
              </label>
              <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/40">
                <button
                  type="button"
                  onClick={() => setScanMode('qr')}
                  className={`flex-1 py-1.5 rounded-lg text-[10px] font-extrabold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                    scanMode === 'qr'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <QrCode className="w-3.5 h-3.5" />
                  {t.qrMode}
                </button>
                <button
                  type="button"
                  onClick={() => setScanMode('barcode')}
                  className={`flex-1 py-1.5 rounded-lg text-[10px] font-extrabold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                    scanMode === 'barcode'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Barcode className="w-3.5 h-3.5" />
                  {t.barcodeMode}
                </button>
              </div>
            </div>

            {/* Camera Select Dropdown */}
            {cameras.length > 1 && (
              <div className="flex-1 min-w-[150px]">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                  {t.selectCam}
                </label>
                <select
                  value={selectedCameraId}
                  onChange={(e) => setSelectedCameraId(e.target.value)}
                  className="w-full py-2 px-3 text-xs text-slate-700 font-semibold border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition bg-white/80"
                >
                  {cameras.map((cam, idx) => (
                    <option key={cam.id} value={cam.id}>
                      {cam.label || `Camera ${idx + 1}`}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Mute toggle / Beep setting */}
            <div className="flex items-center gap-2 self-start sm:self-end h-9">
              <button
                type="button"
                onClick={() => setIsBeepEnabled(!isBeepEnabled)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition cursor-pointer h-full ${
                  isBeepEnabled
                    ? 'bg-blue-50 border-blue-200/40 text-blue-600 hover:bg-blue-100'
                    : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                }`}
              >
                {isBeepEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                <span>{t.beepSound}</span>
              </button>
            </div>
          </div>

          {/* Quick Stats / Scan Feedback */}
          {lastScannedText && (
            <div className="bg-blue-50/60 border border-blue-100/50 rounded-2xl p-3 flex justify-between items-center text-xs animate-fade-in shadow-inner">
              <div className="font-semibold text-blue-800">
                <span className="opacity-80 block text-[9px] font-black uppercase tracking-wider">{t.successScan}</span>
                <span className="font-mono font-black text-sm text-blue-900 break-all">{lastScannedText}</span>
              </div>
              {scanCooldown && (
                <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wider animate-pulse bg-blue-100/40 px-2 py-1 rounded-lg">
                  {t.cooldown}
                </span>
              )}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-3 pt-1">
            <button
              onClick={handleToggleScanning}
              className={`flex-1 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition cursor-pointer ${
                isScanning
                  ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-500/15'
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/15'
              }`}
            >
              <RefreshCw className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
              {isScanning ? t.stopScanning : t.startScanning}
            </button>
            <button
              onClick={onClose}
              className="px-5 py-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-black uppercase tracking-wider transition cursor-pointer"
            >
              {t.close}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
