import { useEffect, useState } from 'react';
import { useMarque } from '../ui/MarqueLogo';
import { WifiOff, Download, RefreshCw, X, Share, PlusSquare, CloudUpload, AlertTriangle } from 'lucide-react';
import { useSynchro } from '../../utils/synchro';
import ModaleFileAttente from '../common/ModaleFileAttente';

const CLE = 'pwa-install-masque';
const DELAI = 14 * 24 * 3600 * 1000;

const lire = () => { try { return Number(localStorage.getItem(CLE)) || 0; } catch { return 0; } };
const ecrire = () => { try { localStorage.setItem(CLE, String(Date.now())); } catch { /* ignoré */ } };

const estInstallee = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;
const estIOS = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;

export default function BarrePWA() {
  const { nom } = useMarque();
  const synchro = useSynchro();
  const [fileOuverte, setFileOuverte] = useState(false);
  const [horsLigne, setHorsLigne] = useState(!navigator.onLine);
  const [invite, setInvite] = useState(null);      // événement beforeinstallprompt
  const [aideIOS, setAideIOS] = useState(false);
  const [masque, setMasque] = useState(() => Date.now() - lire() < DELAI);
  const [maj, setMaj] = useState(() => !!window.__appliquerMaj);

  useEffect(() => {
    const on = () => setHorsLigne(false);
    const off = () => setHorsLigne(true);
    const avantInstall = (e) => { e.preventDefault(); setInvite(e); };
    const installe = () => setInvite(null);
    const majPrete = () => setMaj(true);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    window.addEventListener('beforeinstallprompt', avantInstall);
    window.addEventListener('appinstalled', installe);
    window.addEventListener('pwa-update', majPrete);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
      window.removeEventListener('beforeinstallprompt', avantInstall);
      window.removeEventListener('appinstalled', installe);
      window.removeEventListener('pwa-update', majPrete);
    };
  }, []);

  const installer = async () => {
    if (!invite) return;
    invite.prompt();
    try { await invite.userChoice; } catch { /* ignoré */ }
    setInvite(null);
  };
  const fermer = () => { ecrire(); setMasque(true); setAideIOS(false); };

  const proposerInstall = !masque && !estInstallee() && (invite || estIOS());

  return (
    <>
      {horsLigne && (
        <div role="status" className="flex items-center justify-center gap-2 bg-amber-500 text-white text-xs font-semibold px-3 py-1.5">
          <WifiOff size={14} />
          Pas de connexion — la caisse reste utilisable, le reste est en lecture seule
        </div>
      )}
      {(synchro.enAttente > 0 || synchro.refusees > 0) && (
        <button type="button" onClick={() => setFileOuverte(true)} role="status"
          className={`w-full flex items-center justify-center gap-2 text-white text-xs font-semibold px-3 py-1.5 ${synchro.refusees > 0 ? 'bg-red-500' : 'bg-slate-800'}`}>
          {synchro.refusees > 0 ? <AlertTriangle size={14} /> : <CloudUpload size={14} className={synchro.envoi ? 'animate-pulse' : ''} />}
          {synchro.enAttente > 0 && `${synchro.enAttente} vente${synchro.enAttente > 1 ? 's' : ''} en attente d'envoi`}
          {synchro.enAttente > 0 && synchro.refusees > 0 && ' · '}
          {synchro.refusees > 0 && `${synchro.refusees} à vérifier`}
          <span className="underline underline-offset-2">Voir</span>
        </button>
      )}
      {fileOuverte && <ModaleFileAttente onClose={() => setFileOuverte(false)} onRelancer={synchro.lancer} envoi={synchro.envoi} />}
      {maj && (
        <div role="status" className="flex items-center justify-center gap-3 bg-indigo-600 text-white text-xs font-semibold px-3 py-1.5">
          <RefreshCw size={14} />
          Une nouvelle version de l'application est disponible
          <button onClick={() => window.__appliquerMaj?.()} className="bg-white/20 hover:bg-white/30 rounded-md px-2 py-0.5">
            Actualiser
          </button>
        </div>
      )}
      {proposerInstall && (
        <div className="flex items-center gap-3 bg-indigo-50 border-b border-indigo-100 px-4 py-2 text-sm text-slate-700">
          <div className="gradient-brand w-8 h-8 rounded-lg flex items-center justify-center text-white flex-shrink-0">
            <Download size={16} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold leading-tight">Installer {nom} sur cet appareil</p>
            {aideIOS ? (
              <p className="text-xs text-slate-500 flex flex-wrap items-center gap-1">
                Touchez <Share size={12} /> Partager puis <PlusSquare size={12} /> « Sur l'écran d'accueil »
              </p>
            ) : (
              <p className="text-xs text-slate-500">Accès direct depuis l'écran d'accueil, plein écran.</p>
            )}
          </div>
          {!aideIOS && (
            <button onClick={invite ? installer : () => setAideIOS(true)} className="btn btn-primary btn-sm">
              Installer
            </button>
          )}
          <button onClick={fermer} className="btn-icon text-slate-400" aria-label="Plus tard">
            <X size={16} />
          </button>
        </div>
      )}
    </>
  );
}
