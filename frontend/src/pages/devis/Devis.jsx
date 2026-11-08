import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FileText, Plus, Search, Trash2, MessageCircle, ShoppingCart, Ban, RotateCcw, Copy, WifiOff, Clock, X } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import { fmt, inputCls } from '../../utils/format';
import Modal from '../../components/ui/Modal';
import EmptyState from '../../components/ui/EmptyState';
import { CenteredSpinner } from '../../components/ui/LoadingState';
import ListeClients, { ID_LISTE_CLIENTS } from '../../components/common/ListeClients';
import { useAuth } from '../../context/AuthContext';
import { useClientsConnus, telephoneConnu } from '../../utils/clients';
import { STATUT_DEVIS, statutDevis } from '../../utils/devis';
import { envoyerDevis } from '../../utils/rapportsPdf';
import { prechargerPdf } from '../../utils/recuPdf';

const nb = (n) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(n ?? 0);
const dateCourte = (d) => (d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }) : '—');
const msgErreur = (e, def) => e?.response?.data?.message || def;

// ─── Création d'un devis ──────────────────────────────────────────────────────
function ModalNouveauDevis({ modele, onClose, onCree }) {
  const qc = useQueryClient();
  const { isAdmin } = useAuth();
  const clientsConnus = useClientsConnus();
  const [nom, setNom] = useState(modele?.client?.nom || '');
  const [telephone, setTelephone] = useState(modele?.client?.telephone || '');
  const [lignes, setLignes] = useState(modele?.lignes || []);
  const [remise, setRemise] = useState(modele?.remise ? String(modele.remise) : '');
  const [validite, setValidite] = useState('15');
  const [note, setNote] = useState('');
  const [q, setQ] = useState('');

  const { data: resultats, isFetching } = useQuery({
    queryKey: ['produits-devis', q.trim()],
    queryFn: () => api.get('/produits', { params: { search: q.trim(), limit: 8 } }).then((r) => r.data.data),
    enabled: q.trim().length >= 2,
  });

  const ajouter = (p) => {
    setLignes((ls) => ls.some((l) => l.produit === p._id)
      ? ls.map((l) => (l.produit === p._id ? { ...l, quantite: String((Number(l.quantite) || 0) + 1) } : l))
      : [...ls, { produit: p._id, nomProduit: p.nom, unite: p.unite, quantite: '1', prixUnitaire: String(p.prixVente), prixMin: p.prixMin || 0, stock: p.quantiteStock }]);
    setQ('');
  };
  const maj = (i, champ, v) => setLignes((ls) => ls.map((l, k) => (k === i ? { ...l, [champ]: v } : l)));

  const totalHT = lignes.reduce((s, l) => s + (Number(l.quantite) || 0) * (Number(l.prixUnitaire) || 0), 0);
  const rem = Math.min(Number(remise) || 0, totalHT);
  const totalNet = Math.max(0, totalHT - rem);
  const ratio = totalHT > 0 ? totalNet / totalHT : 1;
  const sousPlancher = lignes.filter((l) => l.prixMin > 0 && Math.round((Number(l.prixUnitaire) || 0) * ratio) < l.prixMin);
  const bloque = sousPlancher.length > 0 && !isAdmin;
  const valide = nom.trim() && lignes.length > 0 && !bloque
    && lignes.every((l) => Number(l.quantite) > 0 && l.prixUnitaire !== '' && Number(l.prixUnitaire) >= 0)
    && Number(validite) >= 1 && Number(validite) <= 365 && (Number(remise) || 0) <= totalHT;

  const creer = useMutation({
    mutationFn: () => api.post('/devis', {
      client: { nom: nom.trim(), telephone: telephone.trim() },
      lignes: lignes.map((l) => ({ produit: l.produit, quantite: Number(l.quantite), prixUnitaire: Number(l.prixUnitaire) })),
      remise: rem, validiteJours: Number(validite), note: note.trim(),
    }).then((r) => r.data.data),
    onSuccess: (d) => { toast.success(`Devis ${d.numero} créé`); qc.invalidateQueries({ queryKey: ['devis'] }); onCree(d); },
    onError: (e) => toast.error(msgErreur(e, 'Création impossible')),
  });

  return (
    <Modal open onClose={onClose} icon={FileText} title="Nouveau devis" subtitle="Les prix proposés au client. Le stock n'est pas touché." size="lg"
      footer={<>
        <button className="btn-secondary" onClick={onClose}>Annuler</button>
        <button className="btn gradient-brand text-white disabled:opacity-50" disabled={!valide || creer.isPending} onClick={() => creer.mutate()}>
          {creer.isPending ? 'Création…' : 'Créer le devis'}
        </button>
      </>}>
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="text-xs font-semibold text-slate-500">Client *
            <input className={`${inputCls} mt-1`} list={ID_LISTE_CLIENTS} value={nom} maxLength={100} placeholder="Nom du client"
              onChange={(e) => { setNom(e.target.value); setTelephone((t) => t || telephoneConnu(clientsConnus, e.target.value)); }} />
          </label>
          <label className="text-xs font-semibold text-slate-500">Téléphone (pour WhatsApp)
            <input className={`${inputCls} mt-1`} value={telephone} maxLength={30} placeholder="ex. 622 00 00 00" onChange={(e) => setTelephone(e.target.value)} />
          </label>
        </div>

        <div className="relative">
          <label className="text-xs font-semibold text-slate-500">Ajouter un produit
            <div className="relative mt-1">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input className={`${inputCls} !pl-10`} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tapez au moins 2 lettres (nom ou référence)" />
            </div>
          </label>
          {q.trim().length >= 2 && (
            <div className="absolute z-10 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-2xl shadow-lg max-h-60 overflow-y-auto">
              {isFetching && <p className="text-xs text-slate-400 p-3">Recherche…</p>}
              {!isFetching && (resultats || []).length === 0 && <p className="text-xs text-slate-400 p-3">Aucun produit trouvé.</p>}
              {(resultats || []).map((p) => (
                <button key={p._id} type="button" onClick={() => ajouter(p)} className="w-full flex items-center justify-between gap-3 px-4 py-2.5 text-left hover:bg-indigo-50 border-b border-slate-50 last:border-0">
                  <span className="min-w-0"><span className="block text-sm font-semibold text-slate-800 truncate">{p.nom}</span>
                    <span className="block text-[11px] text-slate-400">Stock : {nb(p.quantiteStock)} {p.unite}</span></span>
                  <span className="text-sm font-bold text-indigo-600 flex-shrink-0">{fmt(p.prixVente)} GNF</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          {lignes.map((l, i) => {
            const manque = l.stock !== undefined && Number(l.quantite) > l.stock;
            return (
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
                {manque && <p className="text-[11px] text-amber-600 font-semibold">Stock actuel : {nb(l.stock)} {l.unite} (le devis reste possible)</p>}
              </div>
            );
          })}
          {lignes.length === 0 && <p className="text-sm text-slate-400 text-center py-3">Aucun produit ajouté.</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="text-xs font-semibold text-slate-500">Remise globale (GNF)
            <input type="number" inputMode="numeric" min="0" className={`${inputCls} mt-1`} value={remise} onChange={(e) => setRemise(e.target.value)} placeholder="0" />
          </label>
          <label className="text-xs font-semibold text-slate-500">Valable (jours)
            <input type="number" inputMode="numeric" min="1" max="365" className={`${inputCls} mt-1`} value={validite} onChange={(e) => setValidite(e.target.value)} />
          </label>
        </div>
        <label className="text-xs font-semibold text-slate-500">Note pour le client (facultatif)
          <textarea className={`${inputCls} mt-1`} rows={2} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder="ex. Livraison comprise à Kaloum" />
        </label>

        {sousPlancher.length > 0 && (
          <p className={`text-xs font-semibold ${bloque ? 'text-red-500' : 'text-amber-600'}`}>
            {bloque ? '⛔ Prix sous le plancher pour ' : '⚠ Sous le prix plancher (signalé dans le journal) : '}{sousPlancher.map((l) => l.nomProduit).join(', ')}{bloque ? " : demandez à l'administrateur." : ''}
          </p>
        )}
        <div className="flex items-center justify-between bg-indigo-50 border border-indigo-100 rounded-2xl px-4 py-3">
          <span className="text-sm font-semibold text-indigo-800">Total du devis{rem > 0 ? ` (remise ${fmt(rem)})` : ''}</span>
          <span className="font-syne text-lg font-bold text-indigo-700">{fmt(totalNet)} GNF</span>
        </div>
      </div>
    </Modal>
  );
}

// ─── Détail d'un devis ────────────────────────────────────────────────────────
function ModalDevis({ devisInitial, peutEcrire, onClose, onDupliquer }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [devis, setDevis] = useState(devisInitial);
  const [envoi, setEnvoi] = useState(false);
  const [prep, setPrep] = useState(false);
  const st = STATUT_DEVIS[statutDevis(devis)];
  const modifiable = devis.statut !== 'converti';
  const actualiser = () => qc.invalidateQueries({ queryKey: ['devis'] });

  const { data: detail } = useQuery({
    queryKey: ['devis', 'un', devisInitial._id],
    queryFn: () => api.get(`/devis/${devisInitial._id}`).then((r) => r.data.data),
    enabled: devisInitial.statut === 'converti',
  });

  const statut = useMutation({
    mutationFn: (s) => api.patch(`/devis/${devis._id}/statut`, { statut: s }).then((r) => r.data),
    onSuccess: (r) => { toast.success(r.message); setDevis((d) => ({ ...d, ...r.data, creePar: d.creePar })); actualiser(); },
    onError: (e) => toast.error(msgErreur(e, 'Action impossible')),
  });
  const supprimer = useMutation({
    mutationFn: () => api.delete(`/devis/${devis._id}`).then((r) => r.data),
    onSuccess: (r) => { toast.success(r.message); actualiser(); onClose(); },
    onError: (e) => toast.error(msgErreur(e, 'Suppression impossible')),
  });

  const envoyer = async () => {
    setEnvoi(true);
    try { await envoyerDevis(devis); } catch { toast.error('Création du PDF impossible'); } finally { setEnvoi(false); }
  };

  // La caisse reçoit le devis avec le stock et les prix planchers d'aujourd'hui ; la vente se fait par le circuit habituel.
  const transformer = async () => {
    if (devis.expire && !window.confirm('Ce devis a expiré : les prix ont peut-être changé. Continuer quand même ?')) return;
    setPrep(true);
    try {
      const r = await api.get(`/devis/${devis._id}/panier`);
      navigate('/ventes', { state: { devisPanier: r.data.data } });
    } catch (e) { toast.error(msgErreur(e, 'Impossible de préparer la vente')); setPrep(false); }
  };

  return (
    <Modal open onClose={onClose} icon={FileText} title={`Devis ${devis.numero}`} subtitle={devis.client?.nom} size="lg">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${st.cls}`}>{st.label}</span>
          <span className="text-xs text-slate-400">Créé le {dateCourte(devis.createdAt)}{devis.creePar?.nom ? ` par ${devis.creePar.nom}` : ''}</span>
          <span className="text-xs text-slate-400 inline-flex items-center gap-1"><Clock size={11} /> valable jusqu'au {dateCourte(devis.dateValidite)}</span>
          {devis.statut === 'converti' && detail?.vente?.numero && <span className="text-xs font-semibold text-emerald-600">· vente {detail.vente.numero}</span>}
        </div>
        {devis.client?.telephone && <p className="text-xs text-slate-500">Tél : {devis.client.telephone}</p>}

        <div className="border border-slate-100 rounded-2xl divide-y divide-slate-100">
          {devis.lignes.map((l) => (
            <div key={l._id} className="flex items-center gap-3 px-4 py-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">{l.nomProduit}</p>
                <p className="text-[11px] text-slate-400">{nb(l.quantite)} {l.unite} × {fmt(l.prixUnitaire)} GNF</p>
              </div>
              <p className="text-sm font-bold text-slate-800 flex-shrink-0">{fmt(l.sousTotal)} GNF</p>
            </div>
          ))}
          {devis.remise > 0 && (
            <div className="flex items-center justify-between px-4 py-2.5 text-sm"><span className="text-red-500">Remise</span><span className="font-semibold text-red-500">- {fmt(devis.remise)} GNF</span></div>
          )}
          <div className="flex items-center justify-between px-4 py-3 bg-slate-50 rounded-b-2xl">
            <span className="text-sm font-bold text-slate-700">Total</span>
            <span className="font-syne text-lg font-bold text-indigo-600">{fmt(devis.totalNet)} GNF</span>
          </div>
        </div>
        {devis.note && <p className="text-xs text-slate-500 bg-slate-50 rounded-xl p-3"><strong>Note :</strong> {devis.note}</p>}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button className="btn justify-center bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-60" disabled={envoi} onMouseEnter={prechargerPdf} onTouchStart={prechargerPdf} onClick={envoyer}>
            <MessageCircle size={15} /> {envoi ? 'Préparation du PDF…' : 'Envoyer en PDF par WhatsApp'}
          </button>
          {peutEcrire && modifiable && devis.statut !== 'refuse' && (
            <button className="btn justify-center gradient-brand text-white disabled:opacity-60" disabled={prep} onClick={transformer}>
              <ShoppingCart size={15} /> {prep ? 'Préparation…' : 'Transformer en vente'}
            </button>
          )}
          {peutEcrire && (
            <button className="btn-secondary justify-center" onClick={() => onDupliquer(devis)}><Copy size={15} /> Dupliquer</button>
          )}
          {peutEcrire && modifiable && devis.statut === 'en_cours' && (
            <button className="btn justify-center bg-slate-100 text-slate-700 hover:bg-slate-200" disabled={statut.isPending} onClick={() => statut.mutate('refuse')}><Ban size={15} /> Marquer comme refusé</button>
          )}
          {peutEcrire && modifiable && devis.statut === 'refuse' && (
            <button className="btn justify-center bg-indigo-50 text-indigo-700 hover:bg-indigo-100" disabled={statut.isPending} onClick={() => statut.mutate('en_cours')}><RotateCcw size={15} /> Remettre en cours</button>
          )}
          {peutEcrire && modifiable && (
            <button className="btn justify-center bg-red-50 text-red-600 hover:bg-red-100 sm:col-span-2" disabled={supprimer.isPending}
              onClick={() => { if (window.confirm(`Supprimer le devis ${devis.numero} ?`)) supprimer.mutate(); }}><Trash2 size={15} /> Supprimer ce devis</button>
          )}
        </div>
        <p className="text-[11px] text-slate-400">« Transformer en vente » ouvre la caisse avec les produits et les prix du devis. Le stock n'est utilisé qu'au moment où vous validez la vente.</p>
      </div>
    </Modal>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
const ONGLETS = [
  { id: '', label: 'Tous' }, { id: 'en_cours', label: 'En cours' }, { id: 'expire', label: 'Expirés' },
  { id: 'converti', label: 'Convertis' }, { id: 'refuse', label: 'Refusés' },
];

export default function Devis() {
  const { peutEcrire } = useAuth();
  const clientsConnus = useClientsConnus();
  const [statut, setStatut] = useState('en_cours');
  const [q, setQ] = useState('');
  const [ouvert, setOuvert] = useState(null);
  const [creation, setCreation] = useState(null); // null | {} | modèle (duplication)

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['devis', 'liste', statut, q.trim()],
    queryFn: () => api.get('/devis', { params: { statut: statut || undefined, q: q.trim() || undefined, limit: 50 } }).then((r) => r.data),
  });
  const liste = data?.data || [];
  const compteurs = data?.compteurs || {};

  return (
    <div className="p-4 md:p-6 flex flex-col gap-4">
      <ListeClients clients={clientsConnus} />
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher (n° de devis, client, produit…)" className="w-full bg-white border border-slate-200 rounded-2xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200" />
        </div>
        {peutEcrire && <button className="btn gradient-brand text-white justify-center" onClick={() => setCreation({})}><Plus size={15} /> Nouveau devis</button>}
      </div>

      <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
        {ONGLETS.map((o) => (
          <button key={o.id} onClick={() => setStatut(o.id)} className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${statut === o.id ? 'gradient-brand text-white border-transparent shadow-md' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'}`}>
            {o.label}{o.id && compteurs[o.id] ? ` (${compteurs[o.id]})` : ''}
          </button>
        ))}
      </div>

      {isLoading ? <CenteredSpinner /> : isError ? (
        <div className="card-neu"><EmptyState icon={WifiOff} title="Devis indisponibles" description="Impossible de charger les devis." action={<button className="btn-secondary" onClick={() => refetch()}>Réessayer</button>} /></div>
      ) : liste.length === 0 ? (
        <div className="card-neu"><EmptyState icon={FileText} title={q || statut ? 'Aucun devis ici' : 'Aucun devis'} description="Créez un devis pour donner un prix à un client, l'envoyer en PDF sur WhatsApp, puis le transformer en vente quand il confirme."
          action={peutEcrire ? <button className="btn gradient-brand text-white" onClick={() => setCreation({})}><Plus size={15} /> Nouveau devis</button> : undefined} /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {liste.map((d) => {
            const st = STATUT_DEVIS[statutDevis(d)];
            return (
              <button key={d._id} type="button" onClick={() => setOuvert(d)} className="text-left card-neu p-4 hover:-translate-y-0.5 hover:shadow-md transition-all">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <p className="text-sm font-bold text-slate-800 truncate">{d.numero}</p>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${st.cls}`}>{st.label}</span>
                </div>
                <p className="text-sm text-slate-600 truncate">{d.client?.nom}</p>
                <p className="text-[11px] text-slate-400 mt-0.5 truncate">{d.lignes.length} produit{d.lignes.length > 1 ? 's' : ''} · {d.lignes.slice(0, 2).map((l) => l.nomProduit).join(', ')}{d.lignes.length > 2 ? '…' : ''}</p>
                <div className="flex items-center justify-between mt-2.5">
                  <span className="text-[11px] text-slate-400">{d.statut === 'en_cours' ? `Valable jusqu'au ${dateCourte(d.dateValidite)}` : dateCourte(d.createdAt)}</span>
                  <span className="text-sm font-bold text-indigo-600">{fmt(d.totalNet)} GNF</span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {ouvert && <ModalDevis key={ouvert._id} devisInitial={ouvert} peutEcrire={peutEcrire} onClose={() => setOuvert(null)}
        onDupliquer={(d) => { setOuvert(null); setCreation({ client: d.client, remise: d.remise, lignes: d.lignes.map((l) => ({ produit: String(l.produit), nomProduit: l.nomProduit, unite: l.unite, quantite: String(l.quantite), prixUnitaire: String(l.prixUnitaire), prixMin: 0 })) }); }} />}
      {creation && <ModalNouveauDevis key={creation.client?.nom || 'nouveau'} modele={creation.lignes ? creation : null} onClose={() => setCreation(null)} onCree={(d) => { setCreation(null); setStatut('en_cours'); setOuvert({ ...d, expire: false }); }} />}
    </div>
  );
}
