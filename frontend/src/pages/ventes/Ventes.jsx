import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search, ShoppingCart, Printer, X, CheckCircle,
  Plus, Minus, Trash2, Tag, CreditCard, Smartphone,
  Layers, Receipt, Package, Zap, HandCoins, Check
} from 'lucide-react';
import toast from 'react-hot-toast';

import api from '../../utils/api';
import { fmt, fmtDate, inputCls } from '../../utils/format';
import Modal from '../../components/ui/Modal';
import Table from '../../components/ui/Table';
import EmptyState from '../../components/ui/EmptyState';
import { Spinner } from '../../components/ui/LoadingState';

// ─── Impression reçu ──────────────────────────────────────────────────────────
function imprimerRecu(vente) {
  const modeLabel   = { especes:'Espèces', mobile_money:'Mobile Money', mixte:'Mixte' };
  const nomBoutique = localStorage.getItem('boutique_nom')       || 'StockBTP';
  const adresse     = localStorage.getItem('boutique_adresse')   || 'Conakry, Guinée';
  const telephone   = localStorage.getItem('boutique_telephone') || '';

  const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"/>
  <title>Reçu ${vente.numero}</title>
  <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Courier New',monospace;width:80mm;margin:0 auto;padding:10px;font-size:12px;color:#111}.center{text-align:center}.bold{font-weight:700}.divider{border-top:1px dashed #aaa;margin:8px 0}.row{display:flex;justify-content:space-between;margin-bottom:4px;font-size:11px}.muted{color:#666}.total-row{display:flex;justify-content:space-between;font-size:14px;font-weight:700;border-top:1px solid #ccc;padding-top:6px;margin-top:6px}@media print{body{margin:0}}</style>
  </head><body>
  <div class="center" style="margin-bottom:12px">
    <div class="bold" style="font-size:16px">⚡ ${nomBoutique}</div>
    <div class="muted" style="font-size:10px">${adresse}</div>
    ${telephone ? `<div class="muted" style="font-size:10px">Tél: ${telephone}</div>` : ''}
    <div class="divider"></div>
    <div class="bold" style="font-size:13px">REÇU DE VENTE</div>
    <div class="muted" style="font-size:10px">N° ${vente.numero}</div>
  </div>
  <div class="row"><span class="muted">Date :</span><span>${fmtDate(vente.createdAt)}</span></div>
  <div class="row"><span class="muted">Client :</span><span class="bold">${vente.client?.nom || 'Client comptoir'}</span></div>
  ${vente.client?.telephone ? `<div class="row"><span class="muted">Tél :</span><span>${vente.client.telephone}</span></div>` : ''}
  <div class="row"><span class="muted">Vendeur :</span><span>${vente.vendeur?.nom || ''}</span></div>
  <div class="row"><span class="muted">Paiement :</span><span>${modeLabel[vente.modePaiement] || vente.modePaiement}</span></div>
  <div class="divider"></div>
  <div style="display:flex;font-size:9px;font-weight:700;color:#999;text-transform:uppercase;margin-bottom:6px">
    <span style="flex:1">Produit</span>
    <span style="width:36px;text-align:center">Qté</span>
    <span style="width:60px;text-align:right">P.U</span>
    <span style="width:70px;text-align:right">Total</span>
  </div>
  ${vente.lignes.map(l => `
    <div style="margin-bottom:8px">
      <div style="font-size:11px;font-weight:600">${l.nomProduit}</div>
      <div style="display:flex;font-size:10px;color:#666">
        <span style="flex:1">${l.unite}</span>
        <span style="width:36px;text-align:center">${l.quantite}</span>
        <span style="width:60px;text-align:right">${fmt(l.prixUnitaire)}</span>
        <span style="width:70px;text-align:right;font-weight:600;color:#111">${fmt(l.sousTotal)}</span>
      </div>
    </div>`).join('')}
  <div class="divider"></div>
  <div class="row"><span class="muted">Sous-total :</span><span>${fmt(vente.totalHT)} GNF</span></div>
  ${vente.remise > 0 ? `<div class="row" style="color:#dc2626"><span>Remise :</span><span>- ${fmt(vente.remise)} GNF</span></div>` : ''}
  <div class="total-row"><span>TOTAL :</span><span>${fmt(vente.totalNet)} GNF</span></div>
  ${vente.montantRecu > 0 ? `
    <div class="row" style="margin-top:4px"><span class="muted">Reçu :</span><span>${fmt(vente.montantRecu)} GNF</span></div>
    <div class="row"><span class="muted">Monnaie :</span><span class="bold">${fmt(vente.monnaie)} GNF</span></div>` : ''}
  <div class="divider"></div>
  <div class="center muted" style="font-size:10px">
    <div class="bold">Merci pour votre achat !</div>
    <div style="margin-top:2px">Conservez ce reçu comme preuve d'achat</div>
  </div>
  <script>window.onload=function(){window.print();setTimeout(function(){window.close();},1000);};</script>
  </body></html>`;

  const win = window.open('', '_blank', 'width=400,height=600');
  win.document.write(html);
  win.document.close();
}

// ─── Modal succès ─────────────────────────────────────────────────────────────
function SuccessModal({ vente, onClose, onPrint }) {
  useEffect(() => {
    const t = setTimeout(onClose, 8000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <Modal open onClose={onClose} size="sm" hideHeader>
      <div className="-m-5">
        {/* Header animé */}
        <div className="bg-gradient-to-br from-emerald-400 to-green-500 p-8 text-center relative overflow-hidden rounded-t-2xl">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="absolute w-2 h-2 bg-white/30 rounded-full animate-bounce"
              style={{ left:`${10+i*16}%`, top:`${20+Math.sin(i)*30}%`, animationDelay:`${i*0.15}s` }}/>
          ))}
          <div className="relative">
            <div className="w-20 h-20 bg-white/25 rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg">
              <CheckCircle size={40} className="text-white"/>
            </div>
            <h2 className="font-syne text-2xl font-bold text-white">Vente enregistrée !</h2>
            <p className="text-green-100 text-sm font-mono mt-1">{vente.numero}</p>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-2 gap-3 mb-5">
            {[
              { label:'Client',   value: vente.client?.nom || 'Comptoir' },
              { label:'Articles', value: `${vente.lignes.length} produit(s)` },
              { label:'Total',    value: `${fmt(vente.totalNet)} GNF` },
              { label:'Monnaie',  value: `${fmt(vente.monnaie)} GNF` },
            ].map(item => (
              <div key={item.label} className="bg-slate-50 rounded-2xl p-3 text-center border border-slate-100">
                <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">{item.label}</p>
                <p className="text-sm font-bold text-slate-800 truncate">{item.value}</p>
              </div>
            ))}
          </div>
          <div className="flex gap-3">
            <button onClick={() => { onPrint(vente); onClose(); }}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-slate-900 text-white font-semibold text-sm hover:bg-slate-700 transition-all active:scale-95">
              <Printer size={15}/> Imprimer
            </button>
            <button onClick={onClose}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl gradient-brand text-white font-semibold text-sm hover:opacity-90 transition-all shadow-md shadow-indigo-200 active:scale-95">
              <Zap size={15}/> Nouvelle vente
            </button>
          </div>
          <p className="text-center text-[10px] text-slate-400 mt-3">Fermeture automatique dans 8 secondes</p>
        </div>
      </div>
    </Modal>
  );
}

// ─── Card produit ─────────────────────────────────────────────────────────────
function ProduitCard({ produit, onAjouter, quantitePanier }) {
  const [pulse, setPulse] = useState(false);
  const isRupture = produit.quantiteStock === 0;

  const handleClick = () => {
    if (isRupture) return;
    onAjouter(produit);
    setPulse(true);
    setTimeout(() => setPulse(false), 300);
  };

  return (
    <div onClick={handleClick}
      className={`relative rounded-2xl border-2 p-4 transition-all duration-200 select-none
        ${isRupture
          ? 'border-slate-100 bg-slate-50 opacity-50 cursor-not-allowed'
          : quantitePanier > 0
            ? 'border-indigo-400 bg-indigo-50 shadow-lg shadow-indigo-100 cursor-pointer'
            : 'border-slate-100 bg-white hover:border-indigo-200 hover:shadow-md hover:shadow-indigo-50 hover:-translate-y-0.5 cursor-pointer active:scale-95'
        } ${pulse ? 'scale-95' : ''}`}>

      {/* Badge panier */}
      {quantitePanier > 0 && (
        <div className="absolute -top-2.5 -right-2.5 w-6 h-6 gradient-brand rounded-full flex items-center justify-center text-white text-[10px] font-bold shadow-md z-10">
          {Math.round(quantitePanier)}
        </div>
      )}

      {/* Point statut */}
      <div className={`absolute top-3 right-3 w-2 h-2 rounded-full flex-shrink-0
        ${isRupture ? 'bg-red-400' : produit.quantiteStock <= produit.seuilAlerte ? 'bg-amber-400' : 'bg-emerald-400'}`}/>

      {/* Icône */}
      <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 text-white font-bold text-base shadow-sm"
        style={{ background: produit.categorie?.couleur || '#3B82F6' }}>
        {produit.nom.charAt(0).toUpperCase()}
      </div>

      {/* Nom */}
      <p className="text-xs font-bold text-slate-800 leading-tight mb-1 pr-2 line-clamp-2 min-h-[2rem]">
        {produit.nom}
      </p>

      {produit.reference && (
        <p className="text-[9px] font-mono text-slate-400 mb-2">{produit.reference}</p>
      )}

      {/* Prix + stock */}
      <div className="flex items-end justify-between mt-2">
        <div>
          <p className="text-sm font-bold text-indigo-600 leading-none">{fmt(produit.prixVente)}</p>
          <p className="text-[9px] text-slate-400 mt-0.5">GNF / {produit.unite}</p>
        </div>
        <p className={`text-[9px] font-bold px-2 py-0.5 rounded-full
          ${isRupture ? 'bg-red-100 text-red-500'
            : produit.quantiteStock <= produit.seuilAlerte ? 'bg-amber-100 text-amber-600'
            : 'bg-emerald-100 text-emerald-600'}`}>
          {isRupture ? 'Rupture' : `${produit.quantiteStock} ${produit.unite}`}
        </p>
      </div>

      {/* Bouton + */}
      {!isRupture && (
        <div className={`absolute bottom-3 right-3 w-7 h-7 rounded-xl flex items-center justify-center transition-all
          ${quantitePanier > 0 ? 'gradient-brand shadow-md shadow-indigo-200' : 'bg-slate-100'}`}>
          <Plus size={13} className={quantitePanier > 0 ? 'text-white' : 'text-slate-500'}/>
        </div>
      )}
    </div>
  );
}

// ─── Ligne panier ─────────────────────────────────────────────────────────────
function LignePanier({ ligne, onUpdate, onRemove }) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-slate-100 last:border-0 group animate-fade-up">
      {/* Nom + prix */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800 truncate">{ligne.nomProduit}</p>
        <p className="text-xs text-slate-400 mt-0.5">{fmt(ligne.prixUnitaire)} GNF / {ligne.unite}</p>
      </div>

      {/* Contrôle quantité */}
      <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1 flex-shrink-0">
        <button onClick={() => onUpdate(ligne.produitId, 'quantite', Math.max(0.5, ligne.quantite - 1))}
          className="w-7 h-7 rounded-lg bg-white shadow-sm flex items-center justify-center hover:bg-red-50 transition-all active:scale-90">
          <Minus size={11} className="text-slate-600"/>
        </button>
        <input type="number" min="0.01" step="any" value={ligne.quantite}
          onChange={e => onUpdate(ligne.produitId, 'quantite', Number(e.target.value))}
          className="w-10 text-center text-sm font-bold text-slate-800 bg-transparent outline-none"/>
        <button onClick={() => onUpdate(ligne.produitId, 'quantite', ligne.quantite + 1)}
          className="w-7 h-7 rounded-lg bg-white shadow-sm flex items-center justify-center hover:bg-indigo-50 transition-all active:scale-90">
          <Plus size={11} className="text-slate-600"/>
        </button>
      </div>

      {/* Sous-total */}
      <div className="text-right flex-shrink-0 w-24">
        <p className="text-sm font-bold text-slate-900">{fmt(ligne.quantite * ligne.prixUnitaire)}</p>
        <p className="text-[10px] text-slate-400">GNF</p>
      </div>

      {/* Supprimer */}
      <button onClick={() => onRemove(ligne.produitId)}
        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all flex-shrink-0">
        <Trash2 size={13}/>
      </button>
    </div>
  );
}

// ─── Historique ───────────────────────────────────────────────────────────────
// ─── Modale : créer une dette depuis une vente ─────────────────────────────
function ModaleCreerDette({ vente, onClose }) {
  const qc = useQueryClient();
  const [nom, setNom]             = useState(vente.client?.nom || '');
  const [telephone, setTelephone] = useState(vente.client?.telephone || '');
  const [montant, setMontant]     = useState(vente.totalNet);

  const mutation = useMutation({
    mutationFn: () => api.post('/dettes', {
      client: { nom, telephone },
      montantInitial: Number(montant),
      vente: vente._id,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dettes'] });
      toast.success('Dette enregistrée ✓');
      onClose();
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Erreur'),
  });

  return (
    <Modal
      open
      onClose={onClose}
      icon={HandCoins}
      title="Créer une dette"
      subtitle={`Depuis la vente ${vente.numero}`}
      size="sm"
      footer={<>
        <button onClick={onClose} className="btn-secondary">Annuler</button>
        <button onClick={() => mutation.mutate()}
          disabled={!nom || !montant || Number(montant) <= 0 || Number(montant) > vente.totalNet || mutation.isPending}
          className="btn-primary">
          {mutation.isPending ? 'Enregistrement…' : <><Check size={14}/> Enregistrer</>}
        </button>
      </>}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-500">Nom du client *</label>
          <input className={inputCls} value={nom} onChange={e => setNom(e.target.value)} placeholder="Ex: Mamadou Diallo"/>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-500">Téléphone</label>
          <input className={inputCls} value={telephone} onChange={e => setTelephone(e.target.value)} placeholder="Ex: 622 00 00 00"/>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-500">Montant dû (GNF) *</label>
          <input type="number" min="1" max={vente.totalNet} className={inputCls} value={montant}
            onChange={e => setMontant(e.target.value)} placeholder="0"/>
          <p className="text-[11px] text-slate-400">Total de la vente : {fmt(vente.totalNet)} GNF — modifiable si seule une partie est à crédit.</p>
        </div>
      </div>
    </Modal>
  );
}

function HistoriqueVentes() {
  const [recuVente, setRecuVente] = useState(null);
  const [venteADette, setVenteADette] = useState(null);
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin]     = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['ventes', dateDebut, dateFin],
    queryFn:  () => api.get('/ventes', {
      params: { dateDebut:dateDebut||undefined, dateFin:dateFin||undefined, limit:50 }
    }).then(r => r.data),
  });

  const totalCA = data?.data?.reduce((s, v) => s + v.totalNet, 0) || 0;

  return (
    <div className="p-5 lg:p-7 flex flex-col gap-5">

      {/* Stat + filtres */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="sm:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full">
            <label className="text-xs font-semibold text-slate-500 whitespace-nowrap">Du</label>
            <input type="date" value={dateDebut} onChange={e => setDateDebut(e.target.value)}
              className="flex-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-400 transition-all"/>
            <label className="text-xs font-semibold text-slate-500 whitespace-nowrap">Au</label>
            <input type="date" value={dateFin} onChange={e => setDateFin(e.target.value)}
              className="flex-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-400 transition-all"/>
          </div>
        </div>
        <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl p-5 text-white shadow-md shadow-indigo-200 flex flex-col items-center justify-center text-center">
          <p className="text-[10px] font-bold opacity-70 uppercase tracking-wider mb-1">CA Total</p>
          <p className="font-syne text-2xl font-bold">{fmt(Math.round(totalCA/1000))}k</p>
          <p className="text-xs opacity-70">GNF · {data?.data?.length || 0} vente(s)</p>
        </div>
      </div>

      {/* Table */}
      <Table
        columns={['N° Vente','Client','Articles','Total','Paiement','Vendeur','Date','']}
        loading={isLoading}
        isEmpty={data?.data?.length === 0}
        emptyState={<EmptyState icon={Receipt} title="Aucune vente sur cette période" />}
      >
        {data?.data?.map(v => (
                  <tr key={v._id} className="border-b border-slate-50 hover:bg-indigo-50/30 transition-colors group">
                    <td className="px-4 py-3.5 text-sm font-mono font-bold text-indigo-600">{v.numero}</td>
                    <td className="px-4 py-3.5 text-sm text-slate-700">{v.client?.nom || 'Comptoir'}</td>
                    <td className="px-4 py-3.5 text-xs text-slate-400">{v.lignes.length} art.</td>
                    <td className="px-4 py-3.5 text-sm font-bold font-mono text-slate-800 whitespace-nowrap">{fmt(v.totalNet)} GNF</td>
                    <td className="px-4 py-3.5">
                      <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap
                        ${v.modePaiement === 'especes' ? 'bg-green-50 text-green-700'
                          : v.modePaiement === 'mobile_money' ? 'bg-indigo-50 text-indigo-700'
                          : 'bg-purple-50 text-purple-700'}`}>
                        {v.modePaiement === 'mobile_money' ? '📱 Mobile' : v.modePaiement === 'mixte' ? '🔀 Mixte' : '💵 Espèces'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-400">{v.vendeur?.nom}</td>
                    <td className="px-4 py-3.5 text-xs text-slate-400 whitespace-nowrap">{fmtDate(v.createdAt)}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => setRecuVente(v)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 text-slate-600 hover:gradient-brand hover:text-white transition-all whitespace-nowrap">
                          <Printer size={11}/> Reçu
                        </button>
                        {v.client?.nom && (
                          <button onClick={() => setVenteADette(v)} title="Créer une dette"
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-red-50 text-red-600 hover:bg-red-100 transition-all whitespace-nowrap">
                            <HandCoins size={11}/> Dette
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
        ))}
      </Table>

      {/* Modal aperçu reçu */}
      {recuVente && (
        <Modal open onClose={() => setRecuVente(null)} size="sm" hideHeader>
          <div className="text-center">
            <p className="font-syne text-lg font-bold text-slate-900 mb-1">{recuVente.numero}</p>
            <p className="text-2xl font-bold text-indigo-600 mb-1">{fmt(recuVente.totalNet)} GNF</p>
            <p className="text-sm text-slate-500 mb-4">
              {recuVente.client?.nom || 'Comptoir'} · {fmtDate(recuVente.createdAt)}
            </p>
            <div className="flex gap-3">
              <button onClick={() => { imprimerRecu(recuVente); setRecuVente(null); }}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl gradient-brand text-white font-semibold text-sm active:scale-95">
                <Printer size={14}/> Imprimer
              </button>
              <button onClick={() => setRecuVente(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-600 font-semibold text-sm hover:bg-slate-200 transition-all">
                Fermer
              </button>
            </div>
          </div>
        </Modal>
      )}

      {venteADette && <ModaleCreerDette vente={venteADette} onClose={() => setVenteADette(null)} />}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// PAGE PRINCIPALE
// ════════════════════════════════════════════════════════════════════════════
export default function Ventes() {
  const qc = useQueryClient();


  const [search, setSearch]             = useState('');
  const [catFiltre, setCatFiltre]       = useState('');
  const [panier, setPanier]             = useState([]);
  const [client, setClient]             = useState({ nom:'', telephone:'' });
  const [modePaiement, setMode]         = useState('especes');
  const [montantRecu, setMontantRecu]   = useState('');
  const [remise, setRemise]             = useState('');
  const [successVente, setSuccessVente] = useState(null);
  const [onglet, setOnglet]             = useState('caisse');
  const [panierOuvert, setPanierOuvert] = useState(false); // mobile

  const { data: produitsData } = useQuery({
    queryKey: ['produits-vente', search, catFiltre],
    queryFn:  () => api.get('/produits', {
      params: { search, categorie:catFiltre||undefined, limit:100 }
    }).then(r => r.data.data),
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn:  () => api.get('/categories').then(r => r.data.data),
  });

  const totalHT  = panier.reduce((s, l) => s + l.quantite * l.prixUnitaire, 0);
  const totalNet = Math.max(0, totalHT - (Number(remise) || 0));
  const monnaie  = montantRecu ? Math.max(0, Number(montantRecu) - totalNet) : 0;
  const nbPanier = panier.reduce((s, l) => s + l.quantite, 0);

  const ajouterAuPanier = (p) => {
    if (p.quantiteStock === 0) return toast.error('Rupture de stock');
    setPanier(prev => {
      const exist = prev.find(l => l.produitId === p._id);
      if (exist) {
        if (exist.quantite >= p.quantiteStock) {
          toast.error(`Max : ${p.quantiteStock} ${p.unite}`);
          return prev;
        }
        return prev.map(l => l.produitId === p._id ? { ...l, quantite: l.quantite + 1 } : l);
      }
      return [...prev, {
        produitId:    p._id,
        nomProduit:   p.nom,
        unite:        p.unite,
        quantite:     1,
        prixUnitaire: p.prixVente,
        stockMax:     p.quantiteStock,
      }];
    });
  };

  const mettreAJour = (id, champ, valeur) => {
    if (champ === 'quantite' && valeur <= 0) return supprimerDuPanier(id);
    setPanier(prev => prev.map(l => l.produitId === id ? { ...l, [champ]: valeur } : l));
  };

  const supprimerDuPanier = (id) => setPanier(prev => prev.filter(l => l.produitId !== id));

  const viderPanier = () => {
    setPanier([]);
    setClient({ nom:'', telephone:'' });
    setMontantRecu('');
    setRemise('');
  };

  const mutation = useMutation({
    mutationFn: (data) => api.post('/ventes', data),
    onSuccess: (r) => {
      setSuccessVente(r.data.data);
      setPanierOuvert(false);
      viderPanier();
      qc.invalidateQueries({ queryKey:['produits-vente'] });
      qc.invalidateQueries({ queryKey:['dashboard'] });
      qc.invalidateQueries({ queryKey:['ventes'] });
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Erreur'),
  });

  const validerVente = () => {
    if (panier.length === 0) return toast.error('Le panier est vide');
    mutation.mutate({
      client,
      remise:       Number(remise) || 0,
      modePaiement,
      montantRecu:  Number(montantRecu) || 0,
      monnaie,
      lignes: panier.map(l => ({
        produitId:    l.produitId,
        quantite:     l.quantite,
        prixUnitaire: l.prixUnitaire,
      })),
    });
  };

  // Suggestions montant
  const suggestions = [
    totalNet,
    Math.ceil(totalNet / 5000)  * 5000,
    Math.ceil(totalNet / 10000) * 10000,
    Math.ceil(totalNet / 50000) * 50000,
  ].filter((v, i, a) => v > 0 && a.indexOf(v) === i).slice(0, 4);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">

      {/* ── Header ── */}
      <div className="bg-white border-b border-slate-100 shadow-sm sticky top-14 z-30">
        <div className="px-4 lg:px-6 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl gradient-brand flex items-center justify-center shadow-md shadow-indigo-200 flex-shrink-0">
              <ShoppingCart size={16} className="text-white"/>
            </div>
            <div className="hidden sm:block">
              <h1 className="font-syne text-base font-bold text-slate-900 leading-none">Point de Vente</h1>
              <p className="text-[10px] text-slate-400 mt-0.5">Caisse enregistreuse</p>
            </div>
          </div>

          {/* Onglets */}
          <div className="flex bg-slate-100 rounded-2xl p-1">
            {[
              { id:'caisse',     label:'Caisse',     Icon:ShoppingCart },
              { id:'historique', label:'Historique', Icon:Receipt },
            ].map(o => (
              <button key={o.id} onClick={() => setOnglet(o.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${onglet === o.id ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>
                <o.Icon size={13}/><span className="hidden sm:inline">{o.label}</span>
              </button>
            ))}
          </div>

          {/* Bouton panier mobile */}
          {onglet === 'caisse' && (
            <button onClick={() => setPanierOuvert(true)}
              className="lg:hidden relative flex items-center gap-2 px-3 py-2 gradient-brand text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-200">
              <ShoppingCart size={14}/>
              {nbPanier > 0 && (
                <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full text-[9px] font-bold flex items-center justify-center">
                  {Math.round(nbPanier)}
                </span>
              )}
              Panier {nbPanier > 0 ? `(${Math.round(nbPanier)})` : ''}
            </button>
          )}
        </div>
      </div>

      {/* ── Historique ── */}
      {onglet === 'historique' && <HistoriqueVentes />}

      {/* ── Caisse ── */}
      {onglet === 'caisse' && (
        <div className="flex-1 flex flex-col lg:flex-row lg:overflow-hidden">

          {/* Colonne gauche : Catalogue */}
          <div className="flex-1 flex flex-col p-4 lg:p-6 gap-4 lg:overflow-hidden">

            {/* Recherche */}
            <div className="relative">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"/>
              <input
                className="w-full bg-white border border-slate-200 text-slate-800 text-sm rounded-2xl pl-10 pr-4 py-3 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all placeholder:text-slate-400 shadow-sm"
                placeholder="Rechercher un produit par nom ou référence…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            {/* Filtres catégories */}
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1 flex-shrink-0">
              <button onClick={() => setCatFiltre('')}
                className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${!catFiltre ? 'gradient-brand text-white shadow-md shadow-indigo-200' : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                Tous
              </button>
              {categories?.map(c => (
                <button key={c._id} onClick={() => setCatFiltre(catFiltre === c._id ? '' : c._id)}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap
                    ${catFiltre === c._id ? 'text-white shadow-md' : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'}`}
                  style={catFiltre === c._id ? { background: c.couleur } : {}}>
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: c.couleur }}/>
                  {c.nom}
                </button>
              ))}
            </div>

            {/* Grille produits */}
            <div className="lg:flex-1 lg:overflow-y-auto scrollbar-hide">
              {!produitsData ? (
                <div className="flex justify-center pt-16"><Spinner /></div>
              ) : produitsData.length === 0 ? (
                <EmptyState icon={Package} title="Aucun produit trouvé" />
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 gap-3 pb-24 lg:pb-6">
                  {produitsData.map(p => (
                    <ProduitCard
                      key={p._id}
                      produit={p}
                      onAjouter={ajouterAuPanier}
                      quantitePanier={panier.find(l => l.produitId === p._id)?.quantite || 0}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Colonne droite : Panier desktop ── */}
          <div className="hidden lg:flex w-96 flex-shrink-0 flex-col border-l border-slate-200 bg-white overflow-hidden">

            {/* En-tête panier */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <ShoppingCart size={16} className="text-indigo-500"/>
                <span className="font-syne font-bold text-slate-800">Panier</span>
                {panier.length > 0 && (
                  <span className="text-[10px] gradient-brand text-white px-1.5 py-0.5 rounded-full font-bold">
                    {panier.length}
                  </span>
                )}
              </div>
              {panier.length > 0 && (
                <button onClick={viderPanier}
                  className="text-xs text-red-400 hover:text-red-600 font-semibold transition-colors">
                  Tout vider
                </button>
              )}
            </div>

            {/* Lignes panier */}
            <div className="flex-1 overflow-y-auto scrollbar-hide px-5">
              {panier.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-slate-300">
                  <ShoppingCart size={28} className="mb-2 opacity-30"/>
                  <p className="text-sm text-center">Cliquez sur un produit<br/>pour l'ajouter</p>
                </div>
              ) : (
                panier.map(l => (
                  <LignePanier key={l.produitId} ligne={l} onUpdate={mettreAJour} onRemove={supprimerDuPanier}/>
                ))
              )}
            </div>

            {/* Zone paiement */}
            {panier.length > 0 && (
              <div className="border-t border-slate-100 p-5 flex flex-col gap-4 bg-slate-50">

                {/* Client */}
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">👤 Client</label>
                  <input className="w-full bg-white border border-slate-200 text-slate-700 text-sm rounded-xl px-3 py-2 outline-none focus:border-indigo-400 transition-all placeholder:text-slate-400"
                    placeholder="Nom du client" value={client.nom} onChange={e => setClient(c => ({ ...c, nom:e.target.value }))}/>
                  <input className="w-full bg-white border border-slate-200 text-slate-700 text-sm rounded-xl px-3 py-2 outline-none focus:border-indigo-400 transition-all placeholder:text-slate-400"
                    placeholder="Téléphone" value={client.telephone} onChange={e => setClient(c => ({ ...c, telephone:e.target.value }))}/>
                </div>

                {/* Mode paiement */}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">💳 Paiement</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id:'especes',      label:'Espèces', Icon:CreditCard },
                      { id:'mobile_money', label:'Mobile',  Icon:Smartphone },
                      { id:'mixte',        label:'Mixte',   Icon:Layers },
                    ].map(m => (
                      <button key={m.id} onClick={() => setMode(m.id)}
                        className={`flex flex-col items-center gap-1.5 py-2.5 rounded-xl text-[10px] font-bold transition-all
                          ${modePaiement === m.id ? 'gradient-brand text-white shadow-md shadow-indigo-200' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                        <m.Icon size={15}/>{m.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Remise + monnaie */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                      <Tag size={10} className="inline mr-1"/>Remise
                    </label>
                    <input type="number" min="0" placeholder="0 GNF" value={remise}
                      onChange={e => setRemise(e.target.value)}
                      className="w-full bg-white border border-slate-200 text-slate-700 text-sm rounded-xl px-3 py-2 outline-none focus:border-indigo-400 transition-all"/>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                      💰 Reçu
                    </label>
                    <input type="number" min="0" placeholder={fmt(totalNet)} value={montantRecu}
                      onChange={e => setMontantRecu(e.target.value)}
                      className="w-full bg-white border border-slate-200 text-slate-700 text-sm rounded-xl px-3 py-2 outline-none focus:border-indigo-400 transition-all"/>
                  </div>
                </div>

                {/* Suggestions montant */}
                {totalNet > 0 && (
                  <div className="flex gap-1.5 flex-wrap">
                    {suggestions.map(v => (
                      <button key={v} onClick={() => setMontantRecu(v.toString())}
                        className={`flex-1 min-w-0 py-1.5 rounded-xl text-[10px] font-bold transition-all truncate
                          ${Number(montantRecu) === v ? 'gradient-brand text-white shadow-md' : 'bg-white border border-slate-200 text-slate-600 hover:border-indigo-300'}`}>
                        {fmt(v)}
                      </button>
                    ))}
                  </div>
                )}

                {/* Monnaie */}
                {montantRecu && (
                  <div className={`flex items-center justify-between px-4 py-3 rounded-xl border font-bold
                    ${monnaie >= 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
                    <span className="text-xs text-slate-600">Monnaie à rendre</span>
                    <span className={`text-lg font-mono ${monnaie >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                      {fmt(monnaie)} GNF
                    </span>
                  </div>
                )}

                {/* Total + bouton */}
                <div className="bg-white rounded-2xl border border-slate-100 p-4">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-slate-500">Sous-total</span>
                    <span className="text-sm font-mono text-slate-700">{fmt(totalHT)} GNF</span>
                  </div>
                  {Number(remise) > 0 && (
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm text-red-500">Remise</span>
                      <span className="text-sm font-mono text-red-500">- {fmt(remise)} GNF</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-2 border-t border-slate-100 mb-4">
                    <span className="font-bold text-slate-900">Total à payer</span>
                    <span className="font-syne text-xl font-bold text-indigo-600">{fmt(totalNet)} GNF</span>
                  </div>
                  <button onClick={validerVente} disabled={mutation.isPending}
                    className="w-full py-4 rounded-2xl font-bold text-base gradient-brand text-white hover:opacity-90 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50 flex items-center justify-center gap-2 active:scale-95">
                    {mutation.isPending
                      ? <><span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"/> Enregistrement…</>
                      : <><CheckCircle size={20}/> Valider la vente</>
                    }
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── Drawer panier mobile ── */}
          {panierOuvert && (
            <div className="lg:hidden fixed inset-0 z-50 flex justify-end">
              <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
                onClick={() => setPanierOuvert(false)}/>
              <div className="relative w-full max-w-sm bg-white flex flex-col shadow-2xl animate-slide-in h-full overflow-hidden">

                {/* Header */}
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <ShoppingCart size={16} className="text-indigo-500"/>
                    <span className="font-syne font-bold text-slate-800">Panier ({panier.length})</span>
                  </div>
                  <button onClick={() => setPanierOuvert(false)}
                    className="p-2 rounded-xl hover:bg-slate-200 text-slate-500 transition-all">
                    <X size={16}/>
                  </button>
                </div>

                {/* Lignes */}
                <div className="flex-1 overflow-y-auto px-5 scrollbar-hide">
                  {panier.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 text-slate-300">
                      <ShoppingCart size={28} className="mb-2 opacity-30"/>
                      <p className="text-sm">Panier vide</p>
                    </div>
                  ) : panier.map(l => (
                    <LignePanier key={l.produitId} ligne={l} onUpdate={mettreAJour} onRemove={supprimerDuPanier}/>
                  ))}
                </div>

                {/* Paiement mobile */}
                {panier.length > 0 && (
                  <div className="border-t border-slate-100 p-5 flex flex-col gap-3 bg-slate-50 overflow-y-auto flex-shrink-0">
                    <div className="flex flex-col gap-2">
                      <input className="w-full bg-white border border-slate-200 text-slate-700 text-sm rounded-xl px-3 py-2.5 outline-none focus:border-indigo-400 transition-all"
                        placeholder="Nom du client" value={client.nom} onChange={e => setClient(c => ({ ...c, nom:e.target.value }))}/>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id:'especes', label:'Espèces', Icon:CreditCard },
                        { id:'mobile_money', label:'Mobile', Icon:Smartphone },
                        { id:'mixte', label:'Mixte', Icon:Layers },
                      ].map(m => (
                        <button key={m.id} onClick={() => setMode(m.id)}
                          className={`flex flex-col items-center gap-1 py-2 rounded-xl text-[10px] font-bold transition-all
                            ${modePaiement === m.id ? 'gradient-brand text-white shadow-md' : 'bg-white border border-slate-200 text-slate-500'}`}>
                          <m.Icon size={14}/>{m.label}
                        </button>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input type="number" min="0" placeholder="Remise GNF" value={remise}
                        onChange={e => setRemise(e.target.value)}
                        className="bg-white border border-slate-200 text-slate-700 text-sm rounded-xl px-3 py-2 outline-none focus:border-indigo-400"/>
                      <input type="number" min="0" placeholder={`Reçu: ${fmt(totalNet)}`} value={montantRecu}
                        onChange={e => setMontantRecu(e.target.value)}
                        className="bg-white border border-slate-200 text-slate-700 text-sm rounded-xl px-3 py-2 outline-none focus:border-indigo-400"/>
                    </div>
                    {montantRecu && (
                      <div className={`flex justify-between px-3 py-2.5 rounded-xl border font-bold text-sm
                        ${monnaie >= 0 ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-red-50 border-red-100 text-red-500'}`}>
                        <span>Monnaie</span><span>{fmt(monnaie)} GNF</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center py-2">
                      <span className="font-bold text-slate-900">Total</span>
                      <span className="font-syne text-xl font-bold text-indigo-600">{fmt(totalNet)} GNF</span>
                    </div>
                    <button onClick={validerVente} disabled={mutation.isPending}
                      className="w-full py-4 rounded-2xl font-bold text-base gradient-brand text-white shadow-lg shadow-indigo-200 disabled:opacity-50 flex items-center justify-center gap-2 active:scale-95">
                      {mutation.isPending
                        ? <><span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"/> Enregistrement…</>
                        : <><CheckCircle size={20}/> Valider</>
                      }
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal succès */}
      {successVente && (
        <SuccessModal vente={successVente} onClose={() => setSuccessVente(null)} onPrint={imprimerRecu}/>
      )}
    </div>
  );
}
