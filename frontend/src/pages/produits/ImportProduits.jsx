import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { FileSpreadsheet, Upload, Download, CheckCircle2, AlertTriangle, X } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import Modal from '../../components/ui/Modal';
import { lireFichier, telechargerModele } from '../../utils/importProduits';

const LIB = { creer: 'Nouveau', maj: 'Mise à jour', ignore: 'Déjà existant', erreur: 'Erreur' };
const CLS = {
  creer: 'bg-emerald-100 text-emerald-700', maj: 'bg-indigo-100 text-indigo-700',
  ignore: 'bg-slate-200 text-slate-600', erreur: 'bg-red-100 text-red-600',
};

export default function ImportProduits({ open, onClose }) {
  const qc = useQueryClient();
  const entree = useRef(null);
  const [fichier, setFichier] = useState(null);
  const [lecture, setLecture] = useState(null);   // { lignes, reconnues, ignorees }
  const [apercu, setApercu] = useState(null);     // { resume, lignes }
  const [mode, setMode] = useState('ignorer');
  const [erreur, setErreur] = useState('');
  const [attente, setAttente] = useState(false);
  const [resultat, setResultat] = useState(null);

  const reinit = () => { setFichier(null); setLecture(null); setApercu(null); setErreur(''); setResultat(null); setMode('ignorer'); if (entree.current) entree.current.value = ''; };
  const fermer = () => { if (attente) return; reinit(); onClose(); };

  const analyser = async (lignes, m) => {
    setAttente(true); setErreur('');
    try {
      const r = await api.post('/produits/import/apercu', { lignes, mode: m }, { timeout: 60000 });
      setApercu(r.data.data);
    } catch (e) {
      setApercu(null);
      setErreur(e.response?.data?.message || "Analyse impossible. Vérifiez votre connexion.");
    } finally { setAttente(false); }
  };

  const choisir = async (f) => {
    reinit();
    if (!f) return;
    setFichier(f); setAttente(true);
    try {
      const l = await lireFichier(f);
      setLecture(l);
      await analyser(l.lignes, 'ignorer');
    } catch (e) {
      setErreur(e.message || 'Lecture du fichier impossible.');
      setAttente(false);
    }
  };

  useEffect(() => { if (lecture) analyser(lecture.lignes, mode); /* eslint-disable-next-line */ }, [mode]);

  const importer = async () => {
    setAttente(true);
    try {
      const r = await api.post('/produits/import', { lignes: lecture.lignes, mode }, { timeout: 120000 });
      setResultat(r.data.data);
      ['produits', 'categories', 'produits-vente', 'alertes', 'dashboard'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      toast.success(r.data.message);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Import impossible');
    } finally { setAttente(false); }
  };

  const r = apercu?.resume;
  const aTraiter = r ? r.aCreer + r.aMettreAJour : 0;
  const problemes = apercu ? apercu.lignes.filter((l) => l.statut === 'erreur') : [];

  return (
    <Modal open={open} onClose={fermer} icon={FileSpreadsheet} size="lg"
      title="Importer des produits" subtitle="Depuis un fichier Excel (.xlsx) ou CSV"
      footer={resultat ? (
        <button className="btn btn-primary" onClick={fermer}>Terminer</button>
      ) : (
        <>
          <button className="btn btn-secondary" onClick={fermer} disabled={attente}>Annuler</button>
          <button className="btn btn-primary disabled:opacity-40" disabled={!aTraiter || attente} onClick={importer}>
            {attente ? 'Traitement…' : aTraiter ? `Importer ${aTraiter} produit${aTraiter > 1 ? 's' : ''}` : 'Importer'}
          </button>
        </>
      )}>
      {resultat ? (
        <div className="text-center py-6 space-y-3">
          <CheckCircle2 size={44} className="mx-auto text-emerald-500" />
          <p className="font-syne text-lg font-bold text-slate-900">Import terminé</p>
          <p className="text-sm text-slate-600">
            {resultat.crees} produit{resultat.crees > 1 ? 's' : ''} créé{resultat.crees > 1 ? 's' : ''}
            {resultat.misAJour ? `, ${resultat.misAJour} mis à jour` : ''}
            {resultat.ignores ? `, ${resultat.ignores} déjà existant${resultat.ignores > 1 ? 's' : ''} ignoré${resultat.ignores > 1 ? 's' : ''}` : ''}
            {resultat.erreurs ? `, ${resultat.erreurs} ligne${resultat.erreurs > 1 ? 's' : ''} en erreur non importée${resultat.erreurs > 1 ? 's' : ''}` : ''}.
          </p>
          <p className="text-xs text-slate-400">Le stock initial est enregistré comme une entrée dans l'historique des mouvements.</p>
        </div>
      ) : (
        <div className="space-y-4 text-sm">
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 flex items-start gap-3">
            <Download size={16} className="text-indigo-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-slate-700 text-xs">Colonnes attendues : Nom, Catégorie, au moins un prix, puis (facultatif) Référence, Unité, Quantité, Seuil, Fournisseur, Délai. Les catégories qui n'existent pas sont créées automatiquement.</p>
              <button onClick={telechargerModele} className="text-xs font-semibold text-indigo-600 hover:underline mt-1">Télécharger le modèle de fichier</button>
            </div>
          </div>

          <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-200 hover:border-indigo-300 rounded-2xl py-6 cursor-pointer text-center">
            <Upload size={22} className="text-slate-400" />
            <span className="text-sm font-semibold text-slate-700">{fichier ? fichier.name : 'Choisir un fichier'}</span>
            <span className="text-[11px] text-slate-400">.xlsx ou .csv — 2000 produits maximum, 5 Mo</span>
            <input ref={entree} type="file" accept=".xlsx,.csv,.txt" className="hidden" onChange={(e) => choisir(e.target.files?.[0])} />
          </label>

          {erreur && (
            <p className="flex items-start gap-2 text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl p-3">
              <X size={14} className="flex-shrink-0 mt-0.5" /> {erreur}
            </p>
          )}
          {attente && !apercu && !erreur && <p className="text-xs text-slate-400 text-center">Analyse en cours…</p>}

          {apercu && (
            <>
              {lecture?.ignorees?.length > 0 && (
                <p className="text-[11px] text-slate-400">Colonnes non reconnues, ignorées : {lecture.ignorees.join(', ')}</p>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[['aCreer', 'À créer', 'text-emerald-600'], ['aMettreAJour', 'À mettre à jour', 'text-indigo-600'], ['ignores', 'Déjà existants', 'text-slate-500'], ['erreurs', 'En erreur', 'text-red-600']].map(([k, l, c]) => (
                  <div key={k} className="bg-slate-50 rounded-xl p-2.5 text-center">
                    <p className={`font-syne text-xl font-bold ${c}`}>{r[k]}</p>
                    <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">{l}</p>
                  </div>
                ))}
              </div>
              {r.categoriesNouvelles > 0 && <p className="text-xs text-slate-500">{r.categoriesNouvelles} nouvelle{r.categoriesNouvelles > 1 ? 's' : ''} catégorie{r.categoriesNouvelles > 1 ? 's seront créées' : ' sera créée'}.</p>}

              {(r.ignores > 0 || r.aMettreAJour > 0) && (
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-slate-500">Si un produit existe déjà (même référence, ou même nom sans référence) :</p>
                  {[['ignorer', 'Le laisser tel quel'], ['mettre_a_jour', "Mettre à jour ses prix et infos (le stock n'est jamais modifié)"]].map(([v, l]) => (
                    <label key={v} className="flex items-center gap-2 text-xs text-slate-600">
                      <input type="radio" name="mode" checked={mode === v} onChange={() => setMode(v)} /> {l}
                    </label>
                  ))}
                </div>
              )}

              {problemes.length > 0 && (
                <div className="border border-red-100 rounded-xl overflow-hidden">
                  <p className="flex items-center gap-1.5 text-xs font-bold text-red-600 bg-red-50 px-3 py-2"><AlertTriangle size={13} /> Lignes à corriger (non importées)</p>
                  <ul className="max-h-40 overflow-y-auto divide-y divide-slate-100">
                    {problemes.slice(0, 100).map((l) => (
                      <li key={l.ligne} className="px-3 py-1.5 text-xs text-slate-600">
                        <span className="font-semibold text-slate-800">Ligne {l.ligne + 1}</span> : {l.erreurs.join(' ; ')}
                      </li>
                    ))}
                    {problemes.length > 100 && <li className="px-3 py-1.5 text-xs text-slate-400">… et {problemes.length - 100} autres</li>}
                  </ul>
                  <p className="text-[11px] text-slate-400 px-3 py-2 bg-slate-50">Vous pouvez importer les lignes valides maintenant et corriger le reste ensuite.</p>
                </div>
              )}

              <details className="text-xs">
                <summary className="cursor-pointer text-slate-500 font-semibold">Voir les lignes ({apercu.lignes.length})</summary>
                <ul className="mt-2 max-h-48 overflow-y-auto divide-y divide-slate-100 border border-slate-100 rounded-xl">
                  {apercu.lignes.slice(0, 300).map((l) => (
                    <li key={l.ligne} className="flex items-center gap-2 px-3 py-1.5">
                      <span className="text-slate-400 w-8 text-right">{l.ligne + 1}</span>
                      <span className="flex-1 truncate text-slate-700">{l.nom || '—'}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${CLS[l.statut]}`}>{LIB[l.statut]}</span>
                    </li>
                  ))}
                </ul>
              </details>
            </>
          )}
        </div>
      )}
    </Modal>
  );
}
