// Thème clair / sombre. Tant que la personne n'a rien choisi, on suit le réglage de son téléphone ou de son ordinateur ;
// dès qu'elle touche au bouton soleil/lune, son choix est mémorisé sur cet appareil.
import { useEffect, useState } from 'react';

const CLE = 'stockbtp_theme';
const COULEUR_BARRE = { clair: '#4f46e5', sombre: '#0b1020' };

export function lireChoix() {
  try { const v = localStorage.getItem(CLE); return v === 'sombre' || v === 'clair' ? v : null; } catch { return null; }
}
const systemeSombre = () => { try { return window.matchMedia('(prefers-color-scheme: dark)').matches; } catch { return false; } };
export const estSombre = () => { const c = lireChoix(); return c ? c === 'sombre' : systemeSombre(); };

export function appliquerTheme() {
  const sombre = estSombre();
  document.documentElement.classList.toggle('dark', sombre);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', sombre ? COULEUR_BARRE.sombre : COULEUR_BARRE.clair);
  return sombre;
}

export function choisirTheme(sombre) {
  try { localStorage.setItem(CLE, sombre ? 'sombre' : 'clair'); } catch { /* navigation privée : le choix ne sera pas gardé */ }
  appliquerTheme();
  window.dispatchEvent(new Event('theme-change'));
}

export function useTheme() {
  const [sombre, setSombre] = useState(estSombre);
  useEffect(() => {
    const maj = () => setSombre(estSombre());
    const mq = (() => { try { return window.matchMedia('(prefers-color-scheme: dark)'); } catch { return null; } })();
    const surSysteme = () => { if (!lireChoix()) { appliquerTheme(); maj(); } };
    window.addEventListener('theme-change', maj);
    mq?.addEventListener?.('change', surSysteme);
    return () => { window.removeEventListener('theme-change', maj); mq?.removeEventListener?.('change', surSysteme); };
  }, []);
  return { sombre, basculer: () => choisirTheme(!sombre) };
}
