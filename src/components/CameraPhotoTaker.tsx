import React, { useEffect, useRef, useState } from 'react';
import { Camera, VideoOff, RefreshCw, X, Check, Trash2, Upload, Sparkles } from 'lucide-react';
import { Language } from '../types';

interface CameraPhotoTakerProps {
  language: Language;
  onPhotoCaptured: (base64Image: string) => void;
  onClose: () => void;
  initialPhoto?: string;
}

export default function CameraPhotoTaker({
  language,
  onPhotoCaptured,
  onClose,
  initialPhoto = '',
}: CameraPhotoTakerProps) {
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [previewImage, setPreviewImage] = useState<string>(initialPhoto);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const t = {
    title: language === 'kh' ? 'ថតរូបគម្របសៀវភៅ' : 'Capture Book Cover Photo',
    subtitle: language === 'kh' ? 'ប្រើប្រាស់កាមេរ៉ា ឬទាញយកឯកសាររូបភាពដើម្បីភ្ជាប់ជាមួយសៀវភៅ' : 'Use camera or upload an image file to associate with the book',
    allowCamera: language === 'kh' ? 'កំពុងស្នើសុំសិទ្ធិប្រើប្រាស់កាមេរ៉ា...' : 'Requesting camera access permissions...',
    noCamera: language === 'kh' ? 'រកមិនឃើញកាមេរ៉ា ឬមិនទាន់បានអនុញ្ញាតឡើយ' : 'No camera found or permission denied.',
    selectCam: language === 'kh' ? 'ជ្រើសរើសកាមេរ៉ា' : 'Select Camera',
    takeSnapshot: language === 'kh' ? 'ថតរូបភាព' : 'Take Snapshot',
    retake: language === 'kh' ? 'ថតរូបភាពឡើងវិញ' : 'Retake Photo',
    uploadFallback: language === 'kh' ? 'ជ្រើសរើសរូបភាពពីម៉ាស៊ីន' : 'Upload from Device',
    useThisPhoto: language === 'kh' ? 'ប្រើប្រាស់រូបភាពនេះ' : 'Use This Photo',
    removePhoto: language === 'kh' ? 'លុបរូបភាពចោល' : 'Remove Photo',
    close: language === 'kh' ? 'បិទ' : 'Close',
  };

  // Get list of cameras
  useEffect(() => {
    navigator.mediaDevices.enumerateDevices()
      .then((devices) => {
        const videoDevices = devices.filter((d) => d.kind === 'videoinput');
        if (videoDevices.length > 0) {
          setCameras(videoDevices);
          // Auto select first or environment/back camera
          const backCam = videoDevices.find(
            (d) =>
              d.label.toLowerCase().includes('back') ||
              d.label.toLowerCase().includes('rear') ||
              d.label.toLowerCase().includes('environment')
          );
          setSelectedCameraId(backCam ? backCam.deviceId : videoDevices[0].deviceId);
        } else {
          setErrorMsg(t.noCamera);
        }
      })
      .catch((err) => {
        console.error('Error enumerating cameras:', err);
        setErrorMsg(t.noCamera);
      });

    return () => {
      stopCameraStream();
    };
  }, []);

  // Handle starting the camera stream
  useEffect(() => {
    if (selectedCameraId && !previewImage) {
      startCameraStream(selectedCameraId);
    } else {
      stopCameraStream();
    }
    return () => {
      stopCameraStream();
    };
  }, [selectedCameraId, previewImage]);

  const startCameraStream = async (cameraId: string) => {
    setErrorMsg('');
    stopCameraStream();
    try {
      const constraints = {
        video: {
          deviceId: cameraId ? { exact: cameraId } : undefined,
          width: { ideal: 640 },
          height: { ideal: 800 }, // Portrait aspect ratio preferred for book covers
        },
      };
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      setIsCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      console.error('Failed to get media stream:', err);
      setErrorMsg(
        language === 'kh'
          ? 'មិនអាចភ្ជាប់ទៅកាន់កាមេរ៉ាបានទេ៖ សូមពិនិត្យសិទ្ធិអនុញ្ញាត'
          : `Failed to open camera stream: ${err?.message || 'Access Denied'}`
      );
      setIsCameraActive(false);
    }
  };

  const stopCameraStream = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setIsCameraActive(false);
  };

  // Capture frame from canvas
  const handleTakeSnapshot = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    
    // Create standard size canvas (ideal ratio for book cover)
    const targetWidth = 400;
    const targetHeight = 520;
    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      // Calculate crop coordinates for center fill (aspect-fill)
      const videoWidth = video.videoWidth;
      const videoHeight = video.videoHeight;
      const videoRatio = videoWidth / videoHeight;
      const targetRatio = targetWidth / targetHeight;

      let sx = 0, sy = 0, sWidth = videoWidth, sHeight = videoHeight;

      if (videoRatio > targetRatio) {
        // Video is wider than target cover ratio: crop sides
        sWidth = videoHeight * targetRatio;
        sx = (videoWidth - sWidth) / 2;
      } else {
        // Video is taller than target cover ratio: crop top/bottom
        sHeight = videoWidth / targetRatio;
        sy = (videoHeight - sHeight) / 2;
      }

      ctx.drawImage(video, sx, sy, sWidth, sHeight, 0, 0, targetWidth, targetHeight);
      
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      setPreviewImage(dataUrl);
      stopCameraStream();
    }
  };

  // Handle local file upload as backup
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        // Load in image to resize on a canvas for uniformity
        const img = new Image();
        img.onload = () => {
          const targetWidth = 400;
          const targetHeight = 520;
          const canvas = document.createElement('canvas');
          canvas.width = targetWidth;
          canvas.height = targetHeight;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            const imgRatio = img.width / img.height;
            const targetRatio = targetWidth / targetHeight;
            let sx = 0, sy = 0, sWidth = img.width, sHeight = img.height;

            if (imgRatio > targetRatio) {
              sWidth = img.height * targetRatio;
              sx = (img.width - sWidth) / 2;
            } else {
              sHeight = img.width / targetRatio;
              sy = (img.height - sHeight) / 2;
            }
            ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, targetWidth, targetHeight);
            setPreviewImage(canvas.toDataURL('image/jpeg', 0.82));
            stopCameraStream();
          }
        };
        img.src = dataUrl;
      }
    };
    reader.readAsDataURL(file);
  };

  const handleApply = () => {
    onPhotoCaptured(previewImage);
    onClose();
  };

  const handleRetake = () => {
    setPreviewImage('');
    if (selectedCameraId) {
      setTimeout(() => startCameraStream(selectedCameraId), 100);
    }
  };

  const handleRemove = () => {
    setPreviewImage('');
    onPhotoCaptured('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white/95 backdrop-blur-xl border border-white/60 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl relative flex flex-col">
        {/* Header bar */}
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Camera className="w-5 h-5 text-blue-600 animate-pulse" />
              {t.title}
            </h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
              {t.subtitle}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-500 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Preview / Viewfinder screen */}
        <div className="bg-slate-900 relative aspect-[4/5] max-h-[380px] flex items-center justify-center overflow-hidden">
          {previewImage ? (
            // Captured preview image
            <div className="relative w-full h-full">
              <img src={previewImage} alt="Cover Preview" className="w-full h-full object-cover" />
              <div className="absolute top-3 left-3 bg-black/60 backdrop-blur text-white px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                {language === 'kh' ? 'រួចរាល់' : 'Preview Active'}
              </div>
            </div>
          ) : isCameraActive ? (
            // Live webcam viewport
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          ) : (
            // Default inactive overlay / fallback
            <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-6 text-center space-y-3">
              {errorMsg ? (
                <>
                  <VideoOff className="w-10 h-10 text-red-400" />
                  <p className="text-xs font-bold text-red-200 px-4">{errorMsg}</p>
                </>
              ) : (
                <>
                  <Camera className="w-12 h-12 text-slate-500 animate-pulse" />
                  <p className="text-xs font-bold text-slate-300">
                    {t.allowCamera}
                  </p>
                </>
              )}
            </div>
          )}

          {/* Guidelines framing marker overlay (only if camera is streaming) */}
          {isCameraActive && !previewImage && (
            <div className="absolute inset-0 pointer-events-none border-4 border-slate-900/30 flex items-center justify-center">
              <div className="w-[75%] h-[80%] border-2 border-dashed border-white/60 rounded-2xl flex items-center justify-center">
                <span className="text-[10px] text-white/70 bg-black/50 backdrop-blur px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">
                  {language === 'kh' ? 'ដាក់គម្របសៀវភៅក្នុងប្រអប់នេះ' : 'Fit book cover here'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Controls block */}
        <div className="p-5 bg-white/50 backdrop-blur border-t border-slate-100 space-y-4">
          {/* Top row with camera selection or actions */}
          {!previewImage && isCameraActive && cameras.length > 1 && (
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                {t.selectCam}
              </label>
              <select
                value={selectedCameraId}
                onChange={(e) => setSelectedCameraId(e.target.value)}
                className="w-full py-2 px-3 text-xs text-slate-700 font-semibold border border-slate-200 rounded-xl focus:outline-none bg-white"
              >
                {cameras.map((cam, idx) => (
                  <option key={cam.deviceId} value={cam.deviceId}>
                    {cam.label || `Camera ${idx + 1}`}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Hidden file uploader fallback */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="image/*"
            className="hidden"
          />

          <div className="flex flex-col gap-2.5">
            {previewImage ? (
              // Actions if photo is captured
              <div className="space-y-2.5">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleApply}
                    className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition cursor-pointer shadow-md shadow-emerald-600/15"
                  >
                    <Check className="w-4 h-4" />
                    {t.useThisPhoto}
                  </button>
                  <button
                    type="button"
                    onClick={handleRetake}
                    className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    {t.retake}
                  </button>
                </div>
                {initialPhoto && (
                  <button
                    type="button"
                    onClick={handleRemove}
                    className="w-full py-2 bg-red-50 hover:bg-red-100 border border-red-100 text-red-600 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                    {t.removePhoto}
                  </button>
                )}
              </div>
            ) : (
              // Actions if live camera is working / fallback
              <div className="flex flex-col gap-2.5">
                {isCameraActive && (
                  <button
                    type="button"
                    onClick={handleTakeSnapshot}
                    className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition cursor-pointer shadow-md shadow-blue-500/15"
                  >
                    <Camera className="w-4 h-4" />
                    {t.takeSnapshot}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5 text-indigo-500" />
                  {t.uploadFallback}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
