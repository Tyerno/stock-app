import { useEffect, useRef, useState } from 'react';
import { X, Zap, ZapOff, Keyboard, CameraOff, ScanLine } from 'lucide-react';

function bip() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine'; o.frequency.value = 1040; g.gain.value = 0.15;
    o.connect(g); g.connect(ctx.destination);
    o.start(); o.stop(ctx.currentTime + 0.12);
    setTimeout(() => ctx.close(), 300);
  } catch { /* son indisponible */ }
  try { navigator.vibrate?.(40); } catch { /* ignoré */ }
}

/**
 * Scanner de code-barres / QR par la caméra.
 * onCode(code) est appelé à chaque lecture (même code ignoré pendant 3 s).
 * continu=false : se ferme après la première lecture.
 */
export default function ScannerCode({ onCode, onClose, continu = false, titre = 'Scanner un code', info }) {
  const videoRef = useRef(null);
  const ctrlRef = useRef(null);
  const dernier = useRef({ code: '', t: 0 });
  const onCodeRef = useRef(onCode);
  onCodeRef.current = onCode;
  const [erreur, setErreur] = useState('');
  const [torche, setTorche] = useState(false);
  const [torcheDispo, setTorcheDispo] = useState(false);
  const [manuel, setManuel] = useState(false);
  const [saisie, setSaisie] = useState('');
  const [dernierLu, setDernierLu] = useState('');

  useEffect(() => {
    let actif = true;
    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setErreur("La caméra n'est pas disponible sur cet appareil ou ce navigateur.");
        return;
      }
      try {
        const [{ BrowserMultiFormatReader }, { DecodeHintType, BarcodeFormat }] = await Promise.all([
          import('@zxing/browser'),
          import('@zxing/library'),
        ]);
        const hints = new Map();
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [
          BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A, BarcodeFormat.UPC_E,
          BarcodeFormat.CODE_128, BarcodeFormat.CODE_39, BarcodeFormat.ITF, BarcodeFormat.QR_CODE,
        ]);
        hints.set(DecodeHintType.TRY_HARDER, true);
        const lecteur = new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 120 });
        const ctrl = await lecteur.decodeFromConstraints(
          { video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } } },
          videoRef.current,
          (result) => {
            if (!result || !actif) return;
            const code = result.getText().trim();
            const now = Date.now();
            if (code === dernier.current.code && now - dernier.current.t < 3000) return;
            dernier.current = { code, t: now };
            bip();
            setDernierLu(code);
            onCodeRef.current?.(code);
            if (!continu) onClose?.();
          }
        );
        if (!actif) { ctrl.stop(); return; }
        ctrlRef.current = ctrl;
        const track = videoRef.current?.srcObject?.getVideoTracks?.()[0];
        setTorcheDispo(!!track?.getCapabilities?.().torch);
      } catch (e) {
        setErreur(
          e?.name === 'NotAllowedError'
            ? "Accès à la caméra refusé. Autorise la caméra dans les réglages du navigateur, ou saisis le code à la main."
            : "Impossible de démarrer la caméra. Saisis le code à la main."
        );
      }
    })();
    return () => { actif = false; try { ctrlRef.current?.stop(); } catch { /* ignoré */ } };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const basculerTorche = async () => {
    try {
      const track = videoRef.current?.srcObject?.getVideoTracks?.()[0];
      await track.applyConstraints({ advanced: [{ torch: !torche }] });
      setTorche(!torche);
    } catch { /* non supporté */ }
  };

  const valider = (e) => {
    e.preventDefault();
    const code = saisie.trim();
    if (!code) return;
    onCodeRef.current?.(code);
    setDernierLu(code); setSaisie('');
    if (!continu) onClose?.();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col" role="dialog" aria-label={titre}>
      <div className="flex items-center gap-3 px-4 py-3 text-white">
        <ScanLine size={18} />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm leading-tight">{titre}</p>
          {info && <p className="text-xs text-white/60 truncate">{info}</p>}
        </div>
        {torcheDispo && (
          <button onClick={basculerTorche} className="p-2 rounded-lg bg-white/10" aria-label="Lampe">
            {torche ? <ZapOff size={18} /> : <Zap size={18} />}
          </button>
        )}
        <button onClick={() => setManuel((v) => !v)} className="p-2 rounded-lg bg-white/10" aria-label="Saisie manuelle">
          <Keyboard size={18} />
        </button>
        <button onClick={onClose} className="p-2 rounded-lg bg-white/10" aria-label="Fermer">
          <X size={18} />
        </button>
      </div>

      <div className="relative flex-1 overflow-hidden">
        <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" muted playsInline />
        {!erreur && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="relative w-[78%] max-w-sm aspect-[3/2] rounded-2xl border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]">
              <span className="absolute left-2 right-2 top-1/2 h-0.5 bg-red-500/80 animate-pulse" />
            </div>
          </div>
        )}
        {erreur && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center text-white px-8">
            <CameraOff size={36} className="text-white/60" />
            <p className="text-sm">{erreur}</p>
          </div>
        )}
      </div>

      <div className="px-4 py-3 bg-black text-white space-y-2">
        {dernierLu && <p className="text-xs text-emerald-400 font-mono truncate">Dernier code lu : {dernierLu}</p>}
        {(manuel || erreur) && (
          <form onSubmit={valider} className="flex gap-2">
            <input
              autoFocus value={saisie} onChange={(e) => setSaisie(e.target.value)}
              placeholder="Saisir le code…" inputMode="text"
              className="flex-1 bg-white/10 rounded-xl px-3 py-2 text-sm outline-none placeholder:text-white/40"
            />
            <button className="px-4 rounded-xl bg-indigo-500 text-sm font-semibold">OK</button>
          </form>
        )}
        {!manuel && !erreur && <p className="text-xs text-white/60 text-center">Place le code-barres dans le cadre</p>}
      </div>
    </div>
  );
}
