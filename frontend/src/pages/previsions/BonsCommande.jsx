import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FileText, Printer, Send, PackageCheck, Ban, Trash2, Search, MessageCircle, Truck, WifiOff, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import { fmt, inputCls } from '../../utils/format';
import Modal from '../../components/ui/Modal';
import EmptyState from '../../components/ui/EmptyState';
import { CenteredSpinner } from '../../components/ui/LoadingState';
import { STATUT_BON, imprimerBon, lienWhatsApp } from '../../utils/bonCommande';

const nb = (n) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(n ?? 0);
const dateCourte = (d) => (d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
const msgErreur = (e, def) => e?.response?.data?.message || def;

// Les stocks et les prévisions changent quand un bon est créé, annulé ou reçu.
const CLES_A_ACTUALISER = ['bons-commande', 'previsions', 'prevision-produit', 'produits', 'produits-vente', 'dashboard', 'alertes', 'mouvements'];
function useActualiser() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ predicate: (q) => CLES_A_ACTUALISER.includes(q.queryKey[0]) });
}

// ─── Création d'un bon (depuis le plan d'achats) ──────────────────────────────
export function ModalNouveauBon({ fournisseur, lignes: lignesInit, onClose, onCree }) {
  const actualiser = useActualiser();
  const [nom, setNom] = useState(fournisseur?.nom || '');
  const [contact, setContact] = useState(fournisseur?.contact || '');
  const [note, setNote] = useState('');
  const [lignes, setLignes] = useState(lignesInit);

  const maj = (i, champ, v) => setLignes((ls) => ls.map((l, k) => (k === i ? { ...l, [champ]: v } : l)));
  const total = lignes.reduce((s, l) => s + (Number(l.quantite) || 0) * (Number(l.prixUnitaire) || 0), 0);
  const valide = nom.trim() && lignes.length > 0 && lignes.every((l) => Number(l.quantite) > 0 && Number(l.prixUnitaire) >= 0 && l.prixUnitaire !== '');

  const creer = useMutation({
    mutationFn: () => api.post('/bons-commande', {
      fournisseur: { nom: nom.trim(), contact: contact.trim() },
      lignes: lignes.map((l) => ({ produit: l.produit, quantite: Number(l.quantite), prixUnitaire: Number(l.prixUnitaire) })),
      note: note.trim(),
    }).then((r) => r.data.data),
    onSuccess: (bon) => { toast.success(`Bon ${bon.numero} créé`); actualiser(); onCree(bon); },
    onError: (e) => toast.error(msgErreur(e, 'Création impossible')),
  });

  return (
    <Modal open onClose={onClose} icon={FileText} title="Nouveau bon de commande" subtitle="Vérifiez les quantités et les prix avant de créer le bon" size="lg"
      footer={<>
        <button className="btn-secondary" onClick={onClose}>Annuler</button>
        <button className="btn gradient-brand text-white disabled:opacity-50" disabled={!valide || creer.isPending} onClick={() => creer.mutate()}>
          {creer.isPending ? 'Création…' : 'Créer le bon'}
        </button>
      </>}>
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="text-xs font-semibold text-slate-500">Fournisseur *
            <input className={`${inputCls} mt-1`} value={nom} onChange={(e) => setNom(e.target.value)} maxLength={100} placeholder="Nom du fournisseur" />
          </label>
          <label className="text-xs font-semibold text-slate-500">Téléphone / contact
            <input className={`${inputCls} mt-1`} value={contact} onChange={(e) => setContact(e.target.value)} maxLength={100} placeholder="ex. 622 00 00 00 (pour WhatsApp)" />
          </label>
        </div>

        <div className="flex flex-col gap-2">
          {lignes.map((l, i) => (
            <div key={l.produit} className="border border-slate-100 rounded-2xl p-3 bg-slate-50/60">
              <div className="flex items-start justify-between gap-2 mb-2">
                <p className="text-sm font-semibold text-slate-800 min-w-0 truncate">{l.nomProduit}</p>
                <button type="button" aria-label={`Retirer ${l.nomProduit}`} onClick={() => setLignes((ls) => ls.filter((_, k) => k !== i))} className="p-1 text-slate-400 hover:text-red-500"><Trash2 size={14} /></button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-[10px] font-semibold text-slate-400 uppercase">Quantité ({l.unite})
                  <input type="number" inputMode="decimal" min="0" className={`${inputCls} mt-1`} value={l.quantite} onChange={(e) => maj(i, 'quantite', e.target.value)} />
                </label>
                <label className="text-[10px] font-semibold text-slate-400 uppercase">Prix unitaire (GNF)
                  <input type="number" inputMode="numeric" min="0" className={`${inputCls} mt-1`} value={l.prixUnitaire} onChange={(e) => maj(i, 'prixUnitaire', e.target.value)} />
                </label>
              </div>
              <p className="text-right text-xs text-slate-500 mt-1.5">Montant : <strong className="text-slate-800">{fmt((Number(l.quantite) || 0) * (Number(l.prixUnitaire) || 0))} GNF</strong></p>
            </div>
          ))}
          {lignes.length === 0 && <p className="text-sm text-slate-400 text-center py-4">Aucun produit : fermez la fenêtre pour recommencer.</p>}
        </div>

        <label className="text-xs font-semibold text-slate-500">Note pour le fournisseur (facultatif)
          <textarea className={`${inputCls} mt-1`} rows={2} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder="ex. Livraison avant vendredi" />
        </label>

        <div className="flex items-center justify-between bg-indigo-50 border border-indigo-100 rounded-2xl px-4 py-3">
          <span className="text-sm font-semibold text-indigo-800">Total du bon</span>
          <span className="font-syne text-lg font-bold text-indigo-700">{fmt(total)} GNF</span>
        </div>
      </div>
    </Modal>
  );
}

// ─── Réception ────────────────────────────────────────────────────────────────
function ModalReception({ bon, onClose, onFait }) {
  const actualiser = useActualiser();
  const [recu, setRecu] = useState(() => Object.fromEntries(bon.lignes.map((l) => [l._id, String(l.quantite)])));
  const valide = bon.lignes.every((l) => recu[l._id] !== '' && Number(recu[l._id]) >= 0);

  const valider = useMutation({
    mutationFn: () => api.post(`/bons-commande/${bon._id}/reception`, {
      lignes: bon.lignes.map((l) => ({ ligne: l._id, quantiteRecue: Number(recu[l._id]) })),
    }).then((r) => r.data),
    onSuccess: (r) => { toast.success(r.message); actualiser(); onFait(r.data); },
    onError: (e) => toast.error(msgErreur(e, 'Réception impossible')),
  });

  return (
    <Modal open onClose={onClose} icon={PackageCheck} title="Réceptionner la livraison" subtitle={`${bon.numero} · ${bon.fournisseur?.nom}`}
      footer={<>
        <button className="btn-secondary" onClick={onClose}>Annuler</button>
        <button className="btn gradient-brand text-white disabled:opacity-50" disabled={!valide || valider.isPending} onClick={() => valider.mutate()}>
          {valider.isPending ? 'Enregistrement…' : 'Ajouter au stock'}
        </button>
      </>}>
      <div className="flex flex-col gap-3">
        <p className="text-xs text-slate-500">Indiquez ce que vous avez réellement reçu. Les quantités seront ajoutées au stock et le bon sera clôturé. Cette action ne peut pas être répétée.</p>
        {bon.lignes.map((l) => (
          <div key={l._id} className="flex items-center gap-3 border border-slate-100 rounded-2xl p-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-800 truncate">{l.nomProduit}</p>
              <p className="text-[11px] text-slate-400">Commandé : {nb(l.quantite)} {l.unite}</p>
            </div>
            <input type="number" inputMode="decimal" min="0" aria-label={`Quantité reçue ${l.nomProduit}`} className={`${inputCls} !w-28 text-right`} value={recu[l._id]} onChange={(e) => setRecu((r) => ({ ...r, [l._id]: e.target.value }))} />
          </div>
        ))}
      </div>
    </Modal>
  );
}

// ─── Détail d'un bon ──────────────────────────────────────────────────────────
export function ModalBon({ bonInitial, peutEcrire, onClose }) {
  const actualiser = useActualiser();
  const [bon, setBon] = useState(bonInitial);
  const [reception, setReception] = useState(false);
  const st = STATUT_BON[bon.statut] || STATUT_BON.brouillon;

  const statut = useMutation({
    mutationFn: (s) => api.patch(`/bons-commande/${bon._id}/statut`, { statut: s }).then((r) => r.data),
    onSuccess: (r) => { toast.success(r.message); setBon((b) => ({ ...b, ...r.data, creePar: b.creePar })); actualiser(); },
    onError: (e) => toast.error(msgErreur(e, 'Action impossible')),
  });

  const imprimer = () => { if (!imprimerBon(bon)) toast.error("Impossible d'ouvrir la fenêtre d'impression : autorisez les fenêtres pop-up."); };
  const ouvert = bon.statut === 'brouillon' || bon.statut === 'envoye';

  return (
    <>
      <Modal open onClose={onClose} icon={FileText} title={`Bon ${bon.numero}`} subtitle={bon.fournisseur?.nom} size="lg">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${st.cls}`}>{st.label}</span>
            <span className="text-xs text-slate-400">Créé le {dateCourte(bon.createdAt)}{bon.creePar?.nom ? ` par ${bon.creePar.nom}` : ''}</span>
            {bon.dateEnvoi && <span className="text-xs text-slate-400">· envoyé le {dateCourte(bon.dateEnvoi)}</span>}
            {bon.dateReception && <span className="text-xs text-slate-400">· reçu le {dateCourte(bon.dateReception)}</span>}
          </div>

          <div className="border border-slate-100 rounded-2xl divide-y divide-slate-100">
            {bon.lignes.map((l) => (
              <div key={l._id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{l.nomProduit}</p>
                  <p className="text-[11px] text-slate-400">{nb(l.quantite)} {l.unite} × {fmt(l.prixUnitaire)} GNF
                    {bon.statut === 'recu' && <span className={l.quantiteRecue < l.quantite ? 'text-amber-600 font-semibold' : 'text-emerald-600 font-semibold'}> · reçu : {nb(l.quantiteRecue ?? 0)}</span>}
                  </p>
                </div>
                <p className="text-sm font-bold text-slate-800 flex-shrink-0">{fmt(l.sousTotal)} GNF</p>
              </div>
            ))}
            <div className="flex items-center justify-between px-4 py-3 bg-slate-50 rounded-b-2xl">
              <span className="text-sm font-bold text-slate-700">Total</span>
              <span className="font-syne text-lg font-bold text-indigo-600">{fmt(bon.total)} GNF</span>
            </div>
          </div>
          {bon.note && <p className="text-xs text-slate-500 bg-slate-50 rounded-xl p-3"><strong>Note :</strong> {bon.note}</p>}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button className="btn-secondary justify-center" onClick={imprimer}><Printer size={15} /> Imprimer / PDF</button>
            <a className="btn justify-center bg-emerald-500 text-white hover:bg-emerald-600" href={lienWhatsApp(bon)} target="_blank" rel="noopener noreferrer"><MessageCircle size={15} /> Envoyer par WhatsApp</a>
            {peutEcrire && bon.statut === 'brouillon' && (
              <button className="btn justify-center bg-indigo-50 text-indigo-700 hover:bg-indigo-100" disabled={statut.isPending} onClick={() => statut.mutate('envoye')}><Send size={15} /> Marquer comme envoyé</button>
            )}
            {peutEcrire && ouvert && (
              <button className="btn justify-center gradient-brand text-white" onClick={() => setReception(true)}><PackageCheck size={15} /> Réceptionner</button>
            )}
            {peutEcrire && ouvert && (
              <button className="btn justify-center bg-red-50 text-red-600 hover:bg-red-100 sm:col-span-2" disabled={statut.isPending}
                onClick={() => { if (window.confirm(`Annuler le bon ${bon.numero} ?`)) statut.mutate('annule'); }}><Ban size={15} /> Annuler ce bon</button>
            )}
          </div>
          <p className="text-[11px] text-slate-400">Astuce : WhatsApp ouvre la conversation avec le texte du bon déjà rédigé. Si le téléphone du fournisseur est renseigné, le message lui est adressé directement.</p>
        </div>
      </Modal>
      {reception && <ModalReception bon={bon} onClose={() => setReception(false)} onFait={(b) => { setBon((o) => ({ ...o, ...b, creePar: o.creePar })); setReception(false); }} />}
    </>
  );
}

// ─── Liste des bons (onglet) ──────────────────────────────────────────────────
const FILTRES = [
  { id: '', label: 'Tous' }, { id: 'brouillon', label: 'Brouillons' }, { id: 'envoye', label: 'Envoyés' },
  { id: 'recu', label: 'Reçus' }, { id: 'annule', label: 'Annulés' },
];

export function ListeBons({ peutEcrire, onVoirPlan }) {
  const [statut, setStatut] = useState('');
  const [q, setQ] = useState('');
  const [ouvert, setOuvert] = useState(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['bons-commande', 'liste', statut, q.trim()],
    queryFn: () => api.get('/bons-commande', { params: { statut: statut || undefined, q: q.trim() || undefined, limit: 50 } }).then((r) => r.data),
  });
  const bons = data?.data || [];

  return (
    <div className="flex flex-col gap-4">
      <div className="relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher (n° de bon, fournisseur, produit…)" className="w-full bg-white border border-slate-200 rounded-2xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200" />
      </div>
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
        {FILTRES.map((f) => (
          <button key={f.id} onClick={() => setStatut(f.id)} className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${statut === f.id ? 'gradient-brand text-white border-transparent shadow-md' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'}`}>{f.label}</button>
        ))}
      </div>

      {isLoading ? <CenteredSpinner /> : isError ? (
        <div className="card-neu"><EmptyState icon={WifiOff} title="Bons indisponibles" description="Impossible de charger les bons de commande." action={<button className="btn-secondary" onClick={() => refetch()}>Réessayer</button>} /></div>
      ) : bons.length === 0 ? (
        <div className="card-neu"><EmptyState icon={Truck} title="Aucun bon de commande" description="Créez votre premier bon depuis le Plan d'achats : un clic par fournisseur."
          action={<button className="btn gradient-brand text-white" onClick={onVoirPlan}><Plus size={15} /> Aller au plan d'achats</button>} /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {bons.map((b) => {
            const st = STATUT_BON[b.statut] || STATUT_BON.brouillon;
            return (
              <button key={b._id} type="button" onClick={() => setOuvert(b)} className="text-left card-neu p-4 hover:-translate-y-0.5 hover:shadow-md transition-all">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <p className="text-sm font-bold text-slate-800 truncate">{b.numero}</p>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${st.cls}`}>{st.label}</span>
                </div>
                <p className="text-sm text-slate-600 truncate">{b.fournisseur?.nom}</p>
                <p className="text-[11px] text-slate-400 mt-0.5 truncate">{b.lignes.length} produit{b.lignes.length > 1 ? 's' : ''} · {b.lignes.slice(0, 2).map((l) => l.nomProduit).join(', ')}{b.lignes.length > 2 ? '…' : ''}</p>
                <div className="flex items-center justify-between mt-2.5">
                  <span className="text-[11px] text-slate-400">{dateCourte(b.createdAt)}</span>
                  <span className="text-sm font-bold text-indigo-600">{fmt(b.total)} GNF</span>
                </div>
              </button>
            );
          })}
        </div>
      )}
      {ouvert && <ModalBon key={ouvert._id} bonInitial={ouvert} peutEcrire={peutEcrire} onClose={() => setOuvert(null)} />}
    </div>
  );
}
