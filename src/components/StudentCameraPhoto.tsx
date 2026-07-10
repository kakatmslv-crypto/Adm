import React, { useRef, useState, useEffect } from 'react';
import { Camera, RefreshCw, Check, X, AlertTriangle } from 'lucide-react';
import { Language } from '../types';

interface StudentCameraPhotoProps {
  studentName: string;
  language: Language;
  onSave: (photoBase64: string) => void;
  onClose: () => void;
}

export default function StudentCameraPhoto({
  studentName,
  language,
  onSave,
  onClose,
}: StudentCameraPhotoProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  const t = {
    kh: {
      title: 'ថតរូបសិស្ស',
      subTitle: `សូមរៀបចំកាមេរ៉ាសម្រាប់ថតរូបសិស្ស៖ ${studentName}`,
      capture: 'ថតរូប',
      retake: 'ថតម្តងទៀត',
      save: 'រក្សាទុករូបថត',
      cancel: 'បោះបង់',
      cameraError: 'មិនអាចបើកកាមេរ៉ាបានទេ! សូមប្រាកដថាឧបករណ៍មានកាមេរ៉ា និងបានផ្តល់សិទ្ធិអនុញ្ញាត។',
      denied: 'ការអនុញ្ញាតកាមេរ៉ាត្រូវបានបដិសេធ។',
      initializing: 'កំពុងបើកដំណើរការកាមេរ៉ា...',
    },
    en: {
      title: 'Take Student Photo',
      subTitle: `Prepare camera to capture photo of ${studentName}`,
      capture: 'Capture Photo',
      retake: 'Retake',
      save: 'Save Photo',
      cancel: 'Cancel',
      cameraError: 'Unable to access camera! Please make sure a camera is connected and access is granted.',
      denied: 'Camera permission denied or camera not available.',
      initializing: 'Starting camera stream...',
    },
  }[language];

  useEffect(() => {
    let activeStream: MediaStream | null = null;

    async function startCamera() {
      setIsInitializing(true);
      setCameraError(null);
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 480 },
            height: { ideal: 480 },
            aspectRatio: 1,
            facingMode: 'user',
          },
          audio: false,
        });
        
        activeStream = mediaStream;
        setStream(mediaStream);
        
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (err: any) {
        console.error('Error accessing camera:', err);
        setCameraError(t.cameraError);
      } finally {
        setIsInitializing(false);
      }
    }

    startCamera();

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [language]);

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (context) {
      // Create a square crop from the video stream
      const size = Math.min(video.videoWidth, video.videoHeight);
      const startX = (video.videoWidth - size) / 2;
      const startY = (video.videoHeight - size) / 2;

      canvas.width = 320;
      canvas.height = 320;

      context.drawImage(
        video,
        startX,
        startY,
        size,
        size,
        0,
        0,
        320,
        320
      );

      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      setCapturedImage(dataUrl);

      // Stop the stream tracks to turn off the camera light while viewing the preview
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
        setStream(null);
      }
    }
  };

  const handleRetake = async () => {
    setCapturedImage(null);
    setIsInitializing(true);
    setCameraError(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 480 },
          height: { ideal: 480 },
          aspectRatio: 1,
          facingMode: 'user',
        },
        audio: false,
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error('Error restarting camera:', err);
      setCameraError(t.cameraError);
    } finally {
      setIsInitializing(false);
    }
  };

  const handleSave = () => {
    if (capturedImage) {
      onSave(capturedImage);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="glass-panel-heavy rounded-3xl max-w-md w-full shadow-2xl border border-white/80 overflow-hidden transform transition duration-200">
        {/* Header */}
        <div className="px-6 py-4 bg-white/40 backdrop-blur-md border-b border-white/40 flex justify-between items-center">
          <div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Camera className="w-4 h-4 text-blue-600" />
              {t.title}
            </h3>
            <p className="text-[10px] text-slate-400 font-bold mt-0.5">
              {t.subTitle}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-500 hover:text-slate-800 rounded-full p-1 bg-white/40 hover:bg-white/70 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Camera Stage */}
        <div className="p-6 flex flex-col items-center justify-center bg-slate-50/50">
          <div className="relative w-72 h-72 rounded-2xl overflow-hidden border-2 border-slate-200 shadow-inner bg-slate-950 flex items-center justify-center">
            {isInitializing && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-slate-400 text-xs font-bold bg-slate-900/90">
                <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
                <span>{t.initializing}</span>
              </div>
            )}

            {cameraError && (
              <div className="absolute inset-0 p-4 flex flex-col items-center justify-center text-center gap-2 text-rose-500 text-xs font-bold bg-slate-950">
                <AlertTriangle className="w-8 h-8 text-rose-500" />
                <p className="leading-relaxed">{cameraError}</p>
              </div>
            )}

            {/* Video View */}
            {!capturedImage && !cameraError && (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover scale-x-[-1]" // mirror image
              />
            )}

            {/* Preview Image */}
            {capturedImage && (
              <img
                src={capturedImage}
                alt="Captured Student Preview"
                className="w-full h-full object-cover"
              />
            )}
          </div>

          {/* Canvas for rendering frame (hidden) */}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-white/40 border-t border-white/40 flex justify-between items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold transition cursor-pointer"
          >
            {t.cancel}
          </button>

          <div className="flex gap-2">
            {!capturedImage ? (
              <button
                type="button"
                disabled={isInitializing || !!cameraError}
                onClick={handleCapture}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer shadow-md shadow-blue-500/10"
              >
                <Camera className="w-4 h-4" />
                {t.capture}
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleRetake}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer bg-white"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  {t.retake}
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-md shadow-emerald-500/10"
                >
                  <Check className="w-4 h-4" />
                  {t.save}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
