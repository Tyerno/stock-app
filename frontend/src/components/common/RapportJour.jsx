import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { FileText, ChevronLeft, ChevronRight, MessageCircle, Copy, Check, TrendingUp, TrendingDown } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import Modal from '../ui/Modal';
import { Spinner } from '../ui/LoadingState';
import { fmt, inputCls } from '../../utils/format';
import { lireBoutiqueLocale } from '../../utils/boutique';
import { texteRapport, evolution, libelleMode } from '../../utils/rapportJour';
import { envoyerRapportJour } from '../../utils/rapportsPdf';
import { prechargerPdf } from '../../utils/recuPdf';

const aujourdhui = () => new Date().toISOString().slice(0, 10);
const decaler = (j, n) => new Date(new Date(j + 'T00:00:00Z').getTime() + n * 86400000).toISOString().slice(0, 10);

function Stat({ label, valeur, sous, accent = 'text-slate-900' }) {
  return (
    <div className="bg-slate-50 rounded-xl p-3">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
      <p className={`font-syne text-lg font-bold ${accent}`}>{valeur}</p>
      {sous && <p className="text-[11px] text-slate-400">{sous}</p>}
    </div>
  );
}

export default function RapportJour() {
  const [ouvert, setOuvert] = useState(false);
  const [jour, setJour] = useState(aujourdhui());
  const [copie, setCopie] = useState(false);
  const [envoi, setEnvoi] = useState(false);

  const { data: r, isLoading, isError } = useQuery({
    queryKey: ['rapport-jour', jour],
    queryFn: () => api.get('/rapport/jour', { params: { date: jour } }).then((x) => x.data.data),
    enabled: ouvert,
  });

  const texte = r ? texteRapport(r, lireBoutiqueLocale().nom) : '';
  const copier = async () => {
    try { await navigator.clipboard.writeText(texte); setCopie(true); setTimeout(() => setCopie(false), 2000); }
    catch { toast.error('Copie impossible'); }
  };
  const envoyer = async () => {
    setEnvoi(true);
    try { await envoyerRapportJour(r); } catch { toast.error('Création du PDF impossible'); } finally { setEnvoi(false); }
  };
  const ev = r ? evolution(r.ventes.ca, r.ventes.caVeille) : null;

  return (
    <>
      <button onClick={() => { setOuvert(true); prechargerPdf(); }}
        className="flex items-center gap-2 bg-white border border-slate-100 rounded-2xl px-4 py-2 shadow-sm text-xs font-semibold text-indigo-600 hover:bg-indigo-50">
        <FileText size={14} /> Rapport du jour
      </button>

      {createPortal(<Modal open={ouvert} onClose={() => setOuvert(false)} icon={FileText} size="lg"
        title="Rapport du jour" subtitle="Résumé d'activité à partager"
        footer={
          <>
            <button className="btn btn-secondary" onClick={copier} disabled={!r}>
              {copie ? <Check size={14} /> : <Copy size={14} />} {copie ? 'Copié' : 'Copier le texte'}
            </button>
            <button className="btn btn-primary disabled:opacity-50" onClick={envoyer} disabled={!r || envoi}>
              <MessageCircle size={14} /> {envoi ? 'Préparation du PDF…' : 'Envoyer en PDF'}
            </button>
          </>
        }>
        <div className="flex items-center gap-2 mb-4">
          <button className="btn-icon" onClick={() => setJour(decaler(jour, -1))} aria-label="Jour précédent"><ChevronLeft size={16} /></button>
          <input type="date" className={inputCls} value={jour} max={aujourdhui()}
            onChange={(e) => e.target.value && setJour(e.target.value)} />
          <button className="btn-icon" onClick={() => setJour(decaler(jour, 1))} disabled={jour >= aujourdhui()} aria-label="Jour suivant"><ChevronRight size={16} /></button>
        </div>

        {isLoading && <div className="py-10 flex justify-center"><Spinner /></div>}
        {isError && <p className="text-sm text-red-500 py-6 text-center">Impossible de charger le rapport.</p>}

        {r && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Stat label="Chiffre d'affaires" valeur={`${fmt(r.ventes.ca)} GNF`} accent="text-indigo-600"
                sous={r.ventes.caVeille ? `Veille : ${fmt(r.ventes.caVeille)}` : undefined} />
              <Stat label="Ventes" valeur={r.ventes.nb} sous={r.ventes.nb ? `Panier moyen ${fmt(r.ventes.panierMoyen)}` : 'Aucune vente'} />
              <Stat label="Dettes encaissées" valeur={`${fmt(r.dettes.encaisse.total)} GNF`} accent="text-emerald-600" />
              {r.finances && <Stat label="Dépenses" valeur={`${fmt(r.finances.depenses)} GNF`} accent="text-amber-600" sous={`${r.finances.nbDepenses} dépense(s)`} />}
              {r.finances && <Stat label="Bénéfice net estimé" valeur={`${fmt(r.finances.beneficeNet)} GNF`} accent={r.finances.beneficeNet >= 0 ? 'text-emerald-600' : 'text-red-600'} sous="marge − dépenses" />}
              <Stat label="Reste à recouvrer" valeur={`${fmt(r.dettes.enCours.total)} GNF`} accent="text-amber-600"
                sous={r.dettes.enCours.enRetard ? `${r.dettes.enCours.enRetard} en retard` : `${r.dettes.enCours.nb} dette(s)`} />
            </div>

            {ev !== null && r.ventes.caVeille > 0 && (
              <p className={`flex items-center gap-1.5 text-xs font-semibold ${ev >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                {ev >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                {ev >= 0 ? '+' : ''}{ev} % par rapport à la veille
              </p>
            )}

            {r.ventes.parMode.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {r.ventes.parMode.map((m) => (
                  <span key={m.mode} className="text-xs bg-indigo-50 text-indigo-700 rounded-lg px-2.5 py-1 font-medium">
                    {libelleMode(m.mode)} : {fmt(m.total)} GNF ({m.nb})
                  </span>
                ))}
              </div>
            )}

            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Aperçu du résumé</p>
              <pre className="whitespace-pre-wrap text-xs text-slate-700 bg-emerald-50/60 border border-emerald-100 rounded-xl p-3 font-sans leading-relaxed">{texte}</pre>
            </div>
          </div>
        )}
      </Modal>, document.body)}
    </>
  );
}
