import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Undo2, Search, Plus, Trash2, Check, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import { fmt, inputCls } from '../../utils/format';
import Modal from '../ui/Modal';
import { useAuth } from '../../context/AuthContext';
import { Spinner } from '../ui/LoadingState';

const arrondiQte = (n) => Math.round(n * 1000) / 1000;
const num = (v) => (v === '' || v == null ? 0 : Number(String(v).replace(',', '.')) || 0);

// Retour ou échange sur une vente : on choisit les articles repris, éventuellement ceux donnés en échange,
// et l'application calcule la différence à rembourser ou à encaisser.
export default function ModaleRetour({ vente, onClose }) {
  const qc = useQueryClient();
  const { isAdmin } = useAuth();
  const [reprise, setReprise] = useState({});   // produitId -> { q, abime }
  const [echange, setEchange] = useState([]);   // [{ produitId, nom, unite, q, prix, stock }]
  const [avecEchange, setAvecEchange] = useState(false);
  const [recherche, setRecherche] = useState('');
  const [reglement, setReglement] = useState('especes');
  const [motif, setMotif] = useState('');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['retour-vente', vente._id],
    queryFn: () => api.get(`/retours/vente/${vente._id}`).then((r) => r.data.data),
  });
  const { data: trouves } = useQuery({
    queryKey: ['retour-produits', recherche],
    queryFn: () => api.get('/produits', { params: { search: recherche, limit: 6 } }).then((r) => r.data.data),
    enabled: avecEchange && recherche.trim().length >= 2,
  });

  const ratio = data?.ratio ?? 1;
  const valeurReprise = useMemo(() => Math.round((data?.lignes || []).reduce((s, l) => s + num(reprise[l.produit]?.q) * l.prixUnitaire, 0) * ratio), [data, reprise, ratio]);
  const valeurEchange = echange.reduce((s, l) => s + Math.round(num(l.q) * num(l.prix)), 0);
  const difference = valeurEchange - valeurReprise;
  const aReprendre = (data?.lignes || []).some((l) => num(reprise[l.produit]?.q) > 0);
  const echangeValide = echange.every((l) => num(l.q) > 0 && num(l.prix) >= 0);
  const reglementEffectif = difference < 0 ? reglement : (reglement === 'dette' ? 'especes' : reglement);

  const m = useMutation({
    mutationFn: () => api.post('/retours', {
      venteId: vente._id,
      retour: (data.lignes).filter((l) => num(reprise[l.produit]?.q) > 0).map((l) => ({ produitId: l.produit, quantite: num(reprise[l.produit].q), remisEnStock: !reprise[l.produit].abime })),
      echange: avecEchange ? echange.map((l) => ({ produitId: l.produitId, quantite: num(l.q), prixUnitaire: num(l.prix) })) : [],
      reglement: reglementEffectif, motif: motif.trim() || undefined,
    }).then((r) => r.data),
    onSuccess: (r) => {
      toast.success(r.message, { duration: 6000 });
      ['ventes', 'produits', 'produits-vente', 'caisse', 'rapport-jour', 'clients', 'dettes', 'dettes-dashboard', 'dashboard', 'alertes', 'mouvements', 'retour-vente']
        .forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      onClose();
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Retour non enregistré'),
  });

  const changerQte = (l, v) => {
    const q = Math.min(l.rendable, Math.max(0, num(v)));
    setReprise((r) => ({ ...r, [l.produit]: { ...r[l.produit], q: v === '' ? '' : String(arrondiQte(q)) } }));
  };
  const ajouter = (p) => {
    if (echange.some((l) => l.produitId === p._id)) return;
    setEchange((e) => [...e, { produitId: p._id, nom: p.nom, unite: p.unite, q: '1', prix: String(p.prixVente), stock: p.quantiteStock, prixMin: p.prixMin || 0 }]);
    setRecherche('');
  };
  const maj = (id, k, v) => setEchange((e) => e.map((l) => (l.produitId === id ? { ...l, [k]: v } : l)));

  const sousPlancher = avecEchange && echange.some((l) => l.prixMin > 0 && num(l.prix) < l.prixMin);
  const peutValider = aReprendre && (!avecEchange || (echange.length > 0 && echangeValide)) && !m.isPending && !(sousPlancher && !isAdmin);
  const rendableTotal = (data?.lignes || []).some((l) => l.rendable > 0);

  return (
    <Modal open onClose={onClose} icon={Undo2} title={`Retour / échange · ${vente.numero}`} subtitle={vente.client?.nom && vente.client.nom !== 'Client comptoir' ? vente.client.nom : 'Client comptoir'} size="lg"
      footer={<>
        <button onClick={onClose} className="btn-secondary">Fermer</button>
        {rendableTotal && <button onClick={() => m.mutate()} disabled={!peutValider} className="btn-primary disabled:opacity-40">
          {m.isPending ? 'Enregistrement…' : <><Check size={14} /> Valider {avecEchange ? "l'échange" : 'le retour'}</>}
        </button>}
      </>}>
      {isLoading ? <div className="py-10 flex justify-center"><Spinner /></div>
        : isError ? <p className="text-sm text-red-500 py-6 text-center">Impossible de charger cette vente.</p>
        : data.vente.statut !== 'validee' ? <p className="text-sm text-slate-500 py-6 text-center">Cette vente est annulée : aucun retour possible.</p>
        : (
        <div className="flex flex-col gap-5">
          <section>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Articles que le client rapporte</h4>
            <div className="flex flex-col gap-2">
              {data.lignes.map((l) => {
                const r = reprise[l.produit] || {};
                return (
                  <div key={l.produit} className={`rounded-xl border p-3 ${l.rendable <= 0 ? 'bg-slate-50 border-slate-100 opacity-60' : 'bg-white border-slate-200'}`}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{l.nomProduit}</p>
                        <p className="text-[11px] text-slate-400">
                          Acheté : {l.vendu} {l.unite} à {fmt(l.prixUnitaire)}{l.dejaRendu > 0 ? ` · déjà rendu : ${l.dejaRendu}` : ''}
                        </p>
                      </div>
                      {l.rendable > 0 ? (
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <input className={inputCls + ' !w-20 text-center'} inputMode="decimal" aria-label={`Quantité rendue ${l.nomProduit}`} placeholder="0" value={r.q ?? ''} onChange={(e) => changerQte(l, e.target.value)} />
                          <span className="text-[11px] text-slate-400 whitespace-nowrap">/ {l.rendable}</span>
                        </div>
                      ) : <span className="text-[11px] text-slate-400">Tout rendu</span>}
                    </div>
                    {num(r.q) > 0 && (
                      <label className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                        <input type="checkbox" checked={!!r.abime} onChange={(e) => setReprise((x) => ({ ...x, [l.produit]: { ...x[l.produit], abime: e.target.checked } }))} />
                        Article abîmé : ne pas le remettre en stock
                      </label>
                    )}
                  </div>
                );
              })}
            </div>
            {ratio < 1 && <p className="text-[11px] text-slate-400 mt-2">La remise accordée sur cette vente est déduite du remboursement (prix payé réellement).</p>}
          </section>

          {rendableTotal && (
            <section>
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <input type="checkbox" checked={avecEchange} onChange={(e) => setAvecEchange(e.target.checked)} />
                Le client prend d'autres articles en échange
              </label>
              {avecEchange && (
                <div className="mt-3 flex flex-col gap-2">
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
                    <input className={inputCls + ' !pl-9'} placeholder="Chercher l'article donné en échange…" value={recherche} onChange={(e) => setRecherche(e.target.value)} />
                  </div>
                  {trouves && recherche.trim().length >= 2 && (
                    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                      {trouves.length === 0 ? <p className="p-3 text-xs text-slate-400">Aucun produit trouvé.</p> : trouves.map((p) => (
                        <button key={p._id} type="button" disabled={p.quantiteStock <= 0} onClick={() => ajouter(p)}
                          className="w-full flex items-center justify-between gap-3 px-3 py-2 text-left hover:bg-indigo-50 disabled:opacity-40 border-b border-slate-50 last:border-0">
                          <span className="text-sm text-slate-700 truncate">{p.nom}</span>
                          <span className="text-[11px] text-slate-400 whitespace-nowrap">{fmt(p.prixVente)} · stock {p.quantiteStock} <Plus size={12} className="inline" /></span>
                        </button>
                      ))}
                    </div>
                  )}
                  {echange.map((l) => (
                    <div key={l.produitId} className="rounded-xl border border-slate-200 bg-white p-3 grid grid-cols-12 gap-2 items-end">
                      <p className="col-span-12 sm:col-span-4 text-sm font-semibold text-slate-800 truncate">{l.nom}<span className="block text-[11px] font-normal text-slate-400">stock : {l.stock} {l.unite}</span></p>
                      <div className="col-span-4 sm:col-span-2"><label className="text-[10px] text-slate-400">Quantité</label>
                        <input className={inputCls} inputMode="decimal" aria-label={`Quantité échange ${l.nom}`} value={l.q} onChange={(e) => maj(l.produitId, 'q', e.target.value)} /></div>
                      <div className="col-span-6 sm:col-span-4"><label className="text-[10px] text-slate-400">Prix unitaire (modifiable)</label>
                        <input className={inputCls} inputMode="numeric" aria-label={`Prix échange ${l.nom}`} value={l.prix} onChange={(e) => maj(l.produitId, 'prix', e.target.value.replace(/[^\d]/g, ''))} />
                        {l.prixMin > 0 && num(l.prix) < l.prixMin && <p className={`text-[10px] mt-0.5 font-semibold ${isAdmin ? 'text-amber-600' : 'text-red-500'}`}>Sous le prix plancher ({fmt(l.prixMin)}){isAdmin ? '' : ' : administrateur requis'}</p>}</div>
                      <button type="button" onClick={() => setEchange((e) => e.filter((x) => x.produitId !== l.produitId))} className="col-span-2 sm:col-span-2 p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 justify-self-end" aria-label="Retirer"><Trash2 size={15} /></button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {aReprendre && (
            <section className="rounded-2xl bg-slate-50 border border-slate-100 p-4 flex flex-col gap-2 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Valeur des articles repris</span><span className="font-semibold">{fmt(valeurReprise)} GNF</span></div>
              {avecEchange && <div className="flex justify-between"><span className="text-slate-500">Valeur des articles donnés</span><span className="font-semibold">{fmt(valeurEchange)} GNF</span></div>}
              <div className={`flex justify-between pt-2 border-t border-slate-200 font-bold ${difference > 0 ? 'text-emerald-700' : difference < 0 ? 'text-amber-700' : 'text-slate-700'}`}>
                <span>{difference > 0 ? 'Le client doit payer' : difference < 0 ? 'Vous rendez au client' : 'Aucune différence'}</span>
                <span>{difference !== 0 ? `${fmt(Math.abs(difference))} GNF` : '—'}</span>
              </div>
              {difference !== 0 && (
                <div className="flex items-center justify-between gap-3 pt-1">
                  <label className="text-xs text-slate-500">{difference > 0 ? 'Payé en' : 'Remboursé en'}</label>
                  <select className={inputCls + ' !w-56'} value={reglementEffectif} onChange={(e) => setReglement(e.target.value)}>
                    <option value="especes">Espèces (sort / entre en caisse)</option>
                    <option value="mobile_money">Mobile Money (hors caisse)</option>
                    {difference < 0 && data.dette && <option value="dette">Déduire de sa dette ({fmt(data.dette.montantRestant)} GNF)</option>}
                  </select>
                </div>
              )}
              {difference < 0 && data.dette && reglementEffectif !== 'dette' && (
                <p className="text-[11px] text-amber-600 flex gap-1.5"><AlertTriangle size={12} className="flex-shrink-0 mt-0.5" />Ce client a encore une dette sur cette vente : pensez à la déduire plutôt que de rendre de l'argent.</p>
              )}
              <input className={inputCls} maxLength={200} placeholder="Motif (optionnel) : trop grand, défectueux, erreur de commande…" value={motif} onChange={(e) => setMotif(e.target.value)} />
            </section>
          )}

          {data.retours.length > 0 && (
            <section>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Déjà enregistrés sur cette vente</h4>
              {data.retours.map((r) => (
                <p key={r._id} className="text-xs text-slate-500 py-1">
                  <span className="font-semibold text-slate-700">{r.numero}</span> · {r.type === 'echange' ? 'Échange' : 'Retour'} · {fmt(r.totalRetourne)} GNF{r.motif ? ` · ${r.motif}` : ''}
                </p>
              ))}
            </section>
          )}
        </div>
      )}
    </Modal>
  );
}
