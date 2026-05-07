import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Pencil, Trash2, ArrowDownCircle, ArrowUpCircle, X, Package, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';

const fmt = (n) => new Intl.NumberFormat('fr-FR').format(n || 0);
const inputCls = "w-full bg-white border border-gray-200 text-gray-800 text-sm rounded-xl px-3 py-2.5 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all placeholder:text-gray-300";

function StatutBadge({ statut }) {
  const cfg = {
    normal:  'bg-green-50 text-green-700 border border-green-100',
    faible:  'bg-amber-50 text-amber-700 border border-amber-100',
    rupture: 'bg-red-50 text-red-700 border border-red-100',
  };
  const labels = { normal: '● Normal', faible: '● Faible', rupture: '● Rupture' };
  return <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full ${cfg[statut]}`}>{labels[statut]}</span>;
}

function Modal({ title, onClose, children, footer }) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl animate-scale-in">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="font-syne font-bold text-gray-900">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all"><X size={15}/></button>
        </div>
        <div className="px-6 py-5 flex flex-col gap-4 max-h-[70vh] overflow-y-auto">{children}</div>
        {footer && <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2 bg-gray-50 rounded-b-2xl">{footer}</div>}
      </div>
    </div>
  );
}

function ModaleProduit({ produit, onClose, categories }) {
  const qc = useQueryClient();
  const isEdit = !!produit?._id;
  const [form, setForm] = useState({
    nom: produit?.nom||'', reference: produit?.reference||'',
    description: produit?.description||'',
    categorie: produit?.categorie?._id||produit?.categorie||'',
    unite: produit?.unite||'unité',
    prixAchat: produit?.prixAchat||'', prixVente: produit?.prixVente||'',
    quantiteStock: produit?.quantiteStock||0, seuilAlerte: produit?.seuilAlerte||10,
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const mutation = useMutation({
    mutationFn: (d) => isEdit ? api.put(`/produits/${produit._id}`, d) : api.post('/produits', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['produits'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); toast.success(isEdit ? 'Produit mis à jour ✓' : 'Produit créé ✓'); onClose(); },
    onError: (e) => toast.error(e.response?.data?.message || 'Erreur'),
  });

  return (
    <Modal title={isEdit ? 'Modifier le produit' : 'Nouveau produit'} onClose={onClose}
      footer={<>
        <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm text-gray-500 hover:bg-gray-100 transition-all">Annuler</button>
        <button onClick={() => mutation.mutate(form)} disabled={mutation.isPending}
          className="px-5 py-2 rounded-xl text-sm font-semibold gradient-brand text-white hover:opacity-90 transition-all shadow-md shadow-blue-200 disabled:opacity-50">
          {mutation.isPending ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </>}>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5"><label className="text-xs font-semibold text-gray-500">Nom *</label><input className={inputCls} value={form.nom} onChange={e=>set('nom',e.target.value)} placeholder="Ex: Ciment Portland"/></div>
        <div className="flex flex-col gap-1.5"><label className="text-xs font-semibold text-gray-500">Référence</label><input className={inputCls} value={form.reference} onChange={e=>set('reference',e.target.value)} placeholder="CIM-001"/></div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5"><label className="text-xs font-semibold text-gray-500">Catégorie *</label>
          <select className={inputCls} value={form.categorie} onChange={e=>set('categorie',e.target.value)}>
            <option value="">— Choisir —</option>
            {categories?.map(c=><option key={c._id} value={c._id}>{c.nom}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1.5"><label className="text-xs font-semibold text-gray-500">Unité</label>
          <select className={inputCls} value={form.unite} onChange={e=>set('unite',e.target.value)}>
            {['unité','kg','tonne','m','m²','m³','litre','sac','palette','lot'].map(u=><option key={u}>{u}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5"><label className="text-xs font-semibold text-gray-500">Prix d'achat (GNF) *</label><input type="number" className={inputCls} value={form.prixAchat} onChange={e=>set('prixAchat',e.target.value)}/></div>
        <div className="flex flex-col gap-1.5"><label className="text-xs font-semibold text-gray-500">Prix de vente (GNF) *</label><input type="number" className={inputCls} value={form.prixVente} onChange={e=>set('prixVente',e.target.value)}/></div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {!isEdit && <div className="flex flex-col gap-1.5"><label className="text-xs font-semibold text-gray-500">Quantité initiale</label><input type="number" className={inputCls} value={form.quantiteStock} onChange={e=>set('quantiteStock',e.target.value)}/></div>}
        <div className="flex flex-col gap-1.5"><label className="text-xs font-semibold text-gray-500">Seuil d'alerte</label><input type="number" className={inputCls} value={form.seuilAlerte} onChange={e=>set('seuilAlerte',e.target.value)}/></div>
      </div>
      <div className="flex flex-col gap-1.5"><label className="text-xs font-semibold text-gray-500">Description</label><textarea rows={2} className={inputCls} value={form.description} onChange={e=>set('description',e.target.value)}/></div>
    </Modal>
  );
}

function ModaleMouvement({ produit, type, onClose }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ quantite:'', motif:'', reference:'', client:'', fournisseur:'' });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const isEntree = type === 'entree';

  const mutation = useMutation({
    mutationFn: () => api.post(`/produits/${produit._id}/${type}`, form),
    onSuccess: (r) => { qc.invalidateQueries({ queryKey: ['produits'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); toast.success(r.data.message); onClose(); },
    onError: (e) => toast.error(e.response?.data?.message || 'Erreur'),
  });

  return (
    <Modal title={isEntree ? '↓ Entrée de stock' : '↑ Sortie de stock'} onClose={onClose}
      footer={<>
        <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm text-gray-500 hover:bg-gray-100 transition-all">Annuler</button>
        <button onClick={() => mutation.mutate()} disabled={!form.quantite || mutation.isPending}
          className={`px-5 py-2 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50 shadow-md ${isEntree ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-200' : 'bg-red-500 hover:bg-red-600 shadow-red-200'}`}>
          {mutation.isPending ? '…' : isEntree ? 'Valider l\'entrée' : 'Valider la sortie'}
        </button>
      </>}>
      <div className="flex items-center justify-between bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
        <span className="text-xs text-gray-500">Stock actuel</span>
        <span className="text-sm font-bold text-gray-800 font-mono">{produit.quantiteStock} {produit.unite}</span>
      </div>
      <div className="flex flex-col gap-1.5"><label className="text-xs font-semibold text-gray-500">Quantité * ({produit.unite})</label>
        <input type="number" min="0.01" step="any" className={inputCls} value={form.quantite} onChange={e=>set('quantite',e.target.value)} autoFocus/>
      </div>
      {isEntree
        ? <div className="flex flex-col gap-1.5"><label className="text-xs font-semibold text-gray-500">Fournisseur</label><input className={inputCls} value={form.fournisseur} onChange={e=>set('fournisseur',e.target.value)} placeholder="Nom du fournisseur"/></div>
        : <div className="flex flex-col gap-1.5"><label className="text-xs font-semibold text-gray-500">Client</label><input className={inputCls} value={form.client} onChange={e=>set('client',e.target.value)} placeholder="Nom du client"/></div>
      }
      <div className="flex flex-col gap-1.5"><label className="text-xs font-semibold text-gray-500">Référence (BL / Facture)</label><input className={inputCls} value={form.reference} onChange={e=>set('reference',e.target.value)} placeholder="N° de document"/></div>
      <div className="flex flex-col gap-1.5"><label className="text-xs font-semibold text-gray-500">Motif</label><input className={inputCls} value={form.motif} onChange={e=>set('motif',e.target.value)} placeholder="Raison du mouvement"/></div>
    </Modal>
  );
}

export default function Produits() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const isLecteur = user?.role === 'lecteur';
  const [search, setSearch] = useState('');
  const [catId, setCatId]   = useState('');
  const [statut, setStatut] = useState('');
  const [modaleF, setModaleF] = useState(null);
  const [mvt, setMvt]         = useState(null);

  const { data: cats } = useQuery({ queryKey:['categories'], queryFn: ()=>api.get('/categories').then(r=>r.data.data) });
  const { data, isLoading } = useQuery({
    queryKey: ['produits', search, catId, statut],
    queryFn: () => api.get('/produits', { params:{ search, categorie:catId||undefined, statut:statut||undefined, limit:50 } }).then(r=>r.data),
    keepPreviousData: true,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/produits/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey:['produits'] }); toast.success('Produit archivé'); },
    onError: () => toast.error('Erreur'),
  });

  const selectCls = "bg-white border border-gray-200 text-gray-600 text-sm rounded-xl px-3 py-2 outline-none focus:border-blue-400 transition-all";

  return (
    <div className="min-h-screen bg-gray-100 p-5 lg:p-7">
      <div className="flex items-start justify-between mb-6 animate-fade-up">
        <div>
          <h1 className="font-syne text-xl font-bold text-gray-900 tracking-tight">Produits</h1>
          <p className="text-sm text-gray-400 mt-1">{data?.pagination?.total||0} produits dans le catalogue</p>
        </div>
        {!isLecteur ? (
          <button onClick={() => setModaleF({})}
            className="flex items-center gap-2 px-4 py-2.5 gradient-brand text-white font-semibold text-sm rounded-xl transition-all shadow-lg shadow-blue-200 hover:opacity-90 active:scale-95">
            <Plus size={15}/> Nouveau produit
          </button>
        ) : (
          <div className="flex items-center gap-1.5 bg-gray-100 border border-gray-200 px-3 py-2 rounded-xl text-xs text-gray-500">
            <Eye size={13}/> Lecture seule
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 mb-5 animate-fade-up-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
          <input className="w-full bg-white border border-gray-200 text-gray-800 text-sm rounded-xl pl-9 pr-3 py-2 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all placeholder:text-gray-300"
            placeholder="Rechercher…" value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>
        <select className={selectCls} value={catId} onChange={e=>setCatId(e.target.value)}>
          <option value="">Toutes catégories</option>
          {cats?.map(c=><option key={c._id} value={c._id}>{c.nom}</option>)}
        </select>
        <select className={selectCls} value={statut} onChange={e=>setStatut(e.target.value)}>
          <option value="">Tous statuts</option>
          <option value="normal">Normal</option>
          <option value="faible">Faible</option>
          <option value="rupture">Rupture</option>
        </select>
      </div>

      <div className="card-neu overflow-hidden animate-fade-up-3">
        {isLoading ? (
          <div className="flex justify-center py-16"><div className="w-7 h-7 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin"/></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {['Produit','Catégorie','Stock','Seuil','Prix achat','Prix vente','Statut',''].map(h=>(
                    <th key={h} className="text-left px-5 py-3.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data?.data?.length===0 ? (
                  <tr><td colSpan={8}><div className="flex flex-col items-center py-16 text-gray-300"><Package size={32} className="mb-3 opacity-40"/><p className="text-sm">Aucun produit trouvé</p></div></td></tr>
                ) : data?.data?.map(p=>(
                  <tr key={p._id} className="border-b border-gray-50 hover:bg-blue-50/40 transition-colors group">
                    <td className="px-5 py-3.5">
                      <p className="text-sm font-semibold text-gray-800 group-hover:text-blue-700 transition-colors">{p.nom}</p>
                      {p.reference && <p className="text-[10px] font-mono text-gray-400 mt-0.5">{p.reference}</p>}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{background:p.categorie?.couleur}}/>
                        <span className="text-xs text-gray-500">{p.categorie?.nom}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-sm font-bold font-mono text-gray-800">{fmt(p.quantiteStock)} <span className="text-gray-400 font-normal text-xs">{p.unite}</span></td>
                    <td className="px-5 py-3.5 text-xs font-mono text-gray-400">{fmt(p.seuilAlerte)}</td>
                    <td className="px-5 py-3.5 text-xs font-mono text-gray-500">{fmt(p.prixAchat)}</td>
                    <td className="px-5 py-3.5 text-xs font-mono text-gray-500">{fmt(p.prixVente)}</td>
                    <td className="px-5 py-3.5"><StatutBadge statut={p.statutStock}/></td>
                    <td className="px-5 py-3.5">
                      {!isLecteur && (
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={()=>setMvt({produit:p,type:'entree'})} className="p-1.5 rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all"><ArrowDownCircle size={14}/></button>
                          <button onClick={()=>setMvt({produit:p,type:'sortie'})} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all"><ArrowUpCircle size={14}/></button>
                          <button onClick={()=>setModaleF(p)} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all"><Pencil size={14}/></button>
                          <button onClick={()=>window.confirm(`Archiver "${p.nom}" ?`)&&deleteMutation.mutate(p._id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all"><Trash2 size={14}/></button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modaleF!==null && <ModaleProduit produit={modaleF._id?modaleF:null} categories={cats} onClose={()=>setModaleF(null)}/>}
      {mvt && <ModaleMouvement produit={mvt.produit} type={mvt.type} onClose={()=>setMvt(null)}/>}
    </div>
  );
}
