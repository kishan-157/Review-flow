import React, { useRef, useEffect, useState } from 'react';
import jsQR from 'jsqr';
import {
  Camera,
  X,
  Flashlight,
  SwitchCamera,
  Upload,
  AlertCircle,
  ScanLine,
  CheckCircle2,
  Sparkles,
  RefreshCw,
  ExternalLink,
  Image as ImageIcon,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

interface RewardQRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (decodedValue: string) => void;
  title?: string;
}

export const RewardQRScannerModal: React.FC<RewardQRScannerModalProps> = ({
  isOpen,
  onClose,
  onScanSuccess,
  title = 'Scan Customer Reward QR Code',
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cameraCaptureInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isIframe, setIsIframe] = useState<boolean>(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [torchOn, setTorchOn] = useState<boolean>(false);
  const [hasTorch, setHasTorch] = useState<boolean>(false);
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [isProcessingImage, setIsProcessingImage] = useState<boolean>(false);
  const [manualCodeInput, setManualCodeInput] = useState<string>('');
  const [decodeMessage, setDecodeMessage] = useState<string | null>(null);

  // Detect if app is running inside an iframe (like AI Studio preview)
  useEffect(() => {
    try {
      setIsIframe(window.self !== window.top);
    } catch {
      setIsIframe(true);
    }
  }, []);

  // Play audio beep on detection
  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.16);
    } catch {
      // Audio not permitted or supported
    }
  };

  const stopCamera = () => {
    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
  };

  const startCamera = async () => {
    stopCamera();
    setCameraError(null);
    setScannedCode(null);
    setDecodeMessage(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Live video streaming is restricted by browser security in this preview window. Use "Snap Photo with Camera" below.');
      return;
    }

    try {
      // 1. First attempt: ideal environment facing mode
      let stream: MediaStream | null = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
      } catch {
        // 2. Second attempt: simple video constraints fallback
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: facingMode },
            audio: false,
          });
        } catch {
          // 3. Third attempt: basic video
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        }
      }

      if (!stream) throw new Error('No video stream available');

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        videoRef.current.muted = true;
        try {
          await videoRef.current.play();
        } catch (playErr) {
          console.warn('Video play error:', playErr);
        }
        setIsScanning(true);
        checkTorchSupport(stream);
        startDecodingLoop();
      }
    } catch (err: any) {
      console.warn('Camera stream error:', err);
      let msg = 'Live camera stream is blocked by the browser in this embedded window. Use the "Snap with Camera" button below for instant 1-tap scanning.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError' || err.name === 'SecurityError') {
        msg = isIframe
          ? 'Live camera is restricted by browser security inside the embedded preview frame. Tap "📸 Take Photo with Camera" below to scan directly with your phone camera!'
          : 'Camera permission was denied in browser settings. Tap "📸 Take Photo with Camera" below or allow camera in browser.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        msg = 'No video camera detected. You can snap a photo or select an image.';
      }
      setCameraError(msg);
    }
  };

  const checkTorchSupport = (stream: MediaStream) => {
    const track = stream.getVideoTracks()[0];
    if (track) {
      const caps = (track.getCapabilities && track.getCapabilities()) || {};
      if ((caps as any).torch) {
        setHasTorch(true);
      } else {
        setHasTorch(false);
      }
    }
  };

  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (track) {
      try {
        const next = !torchOn;
        await (track as any).applyConstraints({
          advanced: [{ torch: next }],
        });
        setTorchOn(next);
      } catch {
        // Torch constraint failed
      }
    }
  };

  const toggleCameraFacing = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Continuous frame analysis loop with throttling and downscaling
  const startDecodingLoop = () => {
    let lastScanTime = 0;

    const scanFrame = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      // Ensure video is actively receiving frames (readyState >= 2 is HAVE_CURRENT_DATA)
      if (!video || !canvas || video.readyState < 2) {
        animFrameIdRef.current = requestAnimationFrame(scanFrame);
        return;
      }

      const rawW = video.videoWidth;
      const rawH = video.videoHeight;
      if (rawW === 0 || rawH === 0) {
        animFrameIdRef.current = requestAnimationFrame(scanFrame);
        return;
      }

      // Throttle decode to every ~120ms to avoid pegging CPU / thermal throttling
      const now = performance.now();
      if (now - lastScanTime >= 120) {
        lastScanTime = now;

        // Downscale to max 640px for blazing fast, highly accurate jsQR detection
        const maxDim = 640;
        let w = rawW;
        let h = rawH;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }

        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          ctx.drawImage(video, 0, 0, w, h);
          const imageData = ctx.getImageData(0, 0, w, h);

          // jsQR scanning with both normal and inverted attempt
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'attemptBoth',
          });

          if (code && code.data && code.data.trim()) {
            const found = code.data.trim();
            playBeep();
            setScannedCode(found);
            stopCamera();
            setTimeout(() => {
              onScanSuccess(found);
              onClose();
            }, 300);
            return;
          }
        }
      }

      animFrameIdRef.current = requestAnimationFrame(scanFrame);
    };

    animFrameIdRef.current = requestAnimationFrame(scanFrame);
  };

  /**
   * Resilient Multi-Scale QR Decoder for Photos and Screenshots
   * Handles high-res phone camera photos (e.g. 12MP - 48MP) by scaling
   * to optimal resolution for jsQR detection.
   */
  const processImageFile = (file: File) => {
    setIsProcessingImage(true);
    setDecodeMessage('Analyzing QR code from image...');

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current || document.createElement('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          setIsProcessingImage(false);
          setDecodeMessage('Failed to create canvas context.');
          return;
        }

        // Try multiple scale resolutions: 800px, 1200px, 500px, original
        const testScales = [800, 1200, 500, 1600];
        let detectedCode: string | null = null;

        for (const maxDim of testScales) {
          let w = img.width;
          let h = img.height;

          if (w > maxDim || h > maxDim) {
            if (w > h) {
              h = Math.round((h * maxDim) / w);
              w = maxDim;
            } else {
              w = Math.round((w * maxDim) / h);
              h = maxDim;
            }
          }

          canvas.width = w;
          canvas.height = h;
          ctx.drawImage(img, 0, 0, w, h);

          const imgData = ctx.getImageData(0, 0, w, h);
          const qr = jsQR(imgData.data, imgData.width, imgData.height, {
            inversionAttempts: 'attemptBoth',
          });

          if (qr && qr.data && qr.data.trim()) {
            detectedCode = qr.data.trim();
            break;
          }
        }

        setIsProcessingImage(false);

        if (detectedCode) {
          playBeep();
          setScannedCode(detectedCode);
          setDecodeMessage('✅ QR code detected successfully!');
          setTimeout(() => {
            onScanSuccess(detectedCode!);
            onClose();
          }, 350);
        } else {
          setDecodeMessage('❌ Could not detect a clear QR code in this photo. Please hold the camera closer or ensure good lighting.');
        }
      };

      img.onerror = () => {
        setIsProcessingImage(false);
        setDecodeMessage('❌ Error loading photo. Please try again.');
      };

      img.src = event.target?.result as string;
    };

    reader.onerror = () => {
      setIsProcessingImage(false);
      setDecodeMessage('❌ Error reading file. Please try again.');
    };

    reader.readAsDataURL(file);
  };

  const handleCameraSnap = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processImageFile(file);
    e.target.value = ''; // Reset input
  };

  const handleGalleryUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processImageFile(file);
    e.target.value = ''; // Reset input
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCodeInput.trim()) return;
    playBeep();
    onScanSuccess(manualCodeInput.trim());
    onClose();
  };

  const handleOpenStandalone = () => {
    try {
      window.open(window.location.href, '_blank');
    } catch {
      // fallback
    }
  };

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, facingMode]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200 overflow-y-auto">
      {/* Hidden file inputs for direct native camera and gallery */}
      <input
        type="file"
        ref={cameraCaptureInputRef}
        onChange={handleCameraSnap}
        accept="image/*"
        capture="environment"
        className="hidden"
      />
      <input
        type="file"
        ref={galleryInputRef}
        onChange={handleGalleryUpload}
        accept="image/*"
        className="hidden"
      />

      <div className="bg-neutral-900 border border-neutral-700/80 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl flex flex-col text-white my-auto">
        {/* Header */}
        <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-600/30 border border-purple-500/40 flex items-center justify-center text-purple-300">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight text-white">{title}</h3>
              <p className="text-[11px] text-neutral-400">Scan customer's reward QR banner or voucher</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewport / Video Area */}
        <div className="relative aspect-square sm:aspect-4/3 w-full bg-neutral-950 flex items-center justify-center overflow-hidden">
          {cameraError ? (
            <div className="p-5 text-center space-y-3.5 max-w-sm w-full animate-in fade-in">
              <div className="w-12 h-12 mx-auto rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shadow-lg">
                <Camera className="w-6 h-6" />
              </div>

              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Mobile Camera Ready (Snap & Scan)
                </h4>
                <p className="text-[11px] text-neutral-300 mt-1 leading-relaxed">
                  {cameraError}
                </p>
              </div>

              {/* PRIMARY 1-TAP SNAP CAMERA BUTTON: ALWAYS WORKS 100% ON ANDROID & IOS */}
              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={() => cameraCaptureInputRef.current?.click()}
                  className="w-full py-3 px-4 bg-linear-to-r from-[#6C3BFF] to-purple-600 hover:from-[#5A2DE2] hover:to-purple-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-purple-600/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Camera className="w-4 h-4 text-amber-300" />
                  <span>📸 Open Camera (Snap & Scan QR)</span>
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => galleryInputRef.current?.click()}
                    className="py-2.5 px-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <ImageIcon className="w-3.5 h-3.5 text-purple-400" />
                    <span>Upload Screenshot</span>
                  </button>

                  <button
                    type="button"
                    onClick={startCamera}
                    className="py-2.5 px-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Retry Live Video</span>
                  </button>
                </div>

                {isIframe && (
                  <button
                    type="button"
                    onClick={handleOpenStandalone}
                    className="w-full py-2 px-3 text-[11px] text-purple-300 hover:text-purple-200 bg-purple-950/40 hover:bg-purple-950/70 border border-purple-800/50 rounded-xl font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open in Full Browser Tab (Enables Live Stream)</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <>
              {/* Live Video Feed */}
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                autoPlay
                muted
                playsInline
              />

              {/* Hidden Canvas for Decoding */}
              <canvas ref={canvasRef} className="hidden" />

              {/* Scanner Reticle Overlay */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-60 h-60 border-2 border-dashed border-purple-400/80 rounded-2xl relative shadow-2xl flex items-center justify-center">
                  {/* Corner accents */}
                  <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-amber-400 rounded-tl-lg" />
                  <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-amber-400 rounded-tr-lg" />
                  <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-amber-400 rounded-bl-lg" />
                  <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-amber-400 rounded-br-lg" />

                  {/* Animated laser scan bar */}
                  {isScanning && !scannedCode && (
                    <div className="absolute inset-x-2 h-0.5 bg-linear-to-r from-transparent via-amber-400 to-transparent shadow-lg shadow-amber-400/80 animate-bounce duration-1000" />
                  )}

                  {/* Success indicator if found */}
                  {scannedCode && (
                    <div className="bg-emerald-500/90 text-white px-4 py-2 rounded-xl flex items-center gap-2 font-bold text-xs shadow-lg animate-in zoom-in-95">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>QR Code Scanned!</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Top Controls Overlay: Torch & Flip Camera */}
              <div className="absolute top-3 right-3 flex items-center gap-2">
                {hasTorch && (
                  <button
                    type="button"
                    onClick={toggleTorch}
                    className={`p-2.5 rounded-xl backdrop-blur-md border text-xs font-bold transition-all cursor-pointer ${
                      torchOn
                        ? 'bg-amber-400 text-neutral-950 border-amber-300'
                        : 'bg-black/40 text-white border-white/20 hover:bg-black/60'
                    }`}
                    title={torchOn ? 'Turn Flashlight Off' : 'Turn Flashlight On'}
                  >
                    <Flashlight className="w-4 h-4" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={toggleCameraFacing}
                  className="p-2.5 rounded-xl bg-black/40 backdrop-blur-md border border-white/20 text-white hover:bg-black/60 transition-all cursor-pointer"
                  title="Switch Front/Rear Camera"
                >
                  <SwitchCamera className="w-4 h-4" />
                </button>
              </div>

              {/* Floating Camera Snap Trigger on Live View */}
              <div className="absolute bottom-3 inset-x-3 flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => cameraCaptureInputRef.current?.click()}
                  className="py-1.5 px-3 bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/20 text-white rounded-xl text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
                >
                  <Camera className="w-3.5 h-3.5 text-amber-300" />
                  <span>Snap Photo Instead</span>
                </button>
              </div>
            </>
          )}

          {/* Processing Status Banner */}
          {isProcessingImage && (
            <div className="absolute inset-0 bg-black/75 backdrop-blur-xs flex flex-col items-center justify-center p-4 z-20 space-y-2">
              <RefreshCw className="w-7 h-7 text-purple-400 animate-spin" />
              <p className="text-xs font-bold text-white">Scanning QR Code from image...</p>
            </div>
          )}
        </div>

        {/* Decode status message if any */}
        {decodeMessage && (
          <div className="p-3 bg-neutral-950 border-t border-neutral-800 text-center text-xs">
            <span className={decodeMessage.includes('✅') ? 'text-emerald-400 font-bold' : 'text-amber-300 font-medium'}>
              {decodeMessage}
            </span>
          </div>
        )}

        {/* Bottom Options: Manual Input & Actions */}
        <div className="p-4 bg-neutral-950 border-t border-neutral-800 space-y-3.5">
          {/* Quick Manual Code Input */}
          <form onSubmit={handleManualSubmit} className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={manualCodeInput}
                onChange={(e) => setManualCodeInput(e.target.value.toUpperCase())}
                placeholder="Or type code (e.g. VIP-7JAT)..."
                className="w-full px-3 py-2 text-xs font-mono font-bold bg-neutral-900 border border-neutral-700 rounded-xl text-white placeholder:text-neutral-500 focus:outline-hidden focus:ring-2 focus:ring-purple-500 uppercase"
              />
              {manualCodeInput && (
                <button
                  type="button"
                  onClick={() => setManualCodeInput('')}
                  className="absolute right-2.5 top-2 text-neutral-400 hover:text-white text-xs cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>
            <button
              type="submit"
              disabled={!manualCodeInput.trim()}
              className="py-2 px-3.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0 flex items-center gap-1"
            >
              <span>Verify</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>

          {/* Action Row */}
          <div className="flex items-center gap-2 pt-0.5">
            <button
              type="button"
              onClick={() => cameraCaptureInputRef.current?.click()}
              className="flex-1 py-2 px-3 bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-500/40 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Camera className="w-3.5 h-3.5 text-amber-300" />
              <span>Snap Photo</span>
            </button>

            <button
              type="button"
              onClick={() => galleryInputRef.current?.click()}
              className="flex-1 py-2 px-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Gallery</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="py-2 px-4 bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
