import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Store, Palette, Download, Settings2,
  Plus, Pencil, Trash2, Save, Check,
  FileJson, FileText, AlertTriangle, Info
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import { inputCls } from '../../utils/format';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import EmptyState from '../../components/ui/EmptyState';
import { CenteredSpinner } from '../../components/ui/LoadingState';

// ─── Onglets ──────────────────────────────────────────────────────────────────
const TABS = [
  { id:'boutique',    label:'Boutique',    Icon:Store    },
  { id:'categories',  label:'Catégories',  Icon:Palette  },
  { id:'preferences', label:'Préférences', Icon:Settings2 },
  { id:'export',      label:'Export',      Icon:Download  },
];

// ─── Couleurs disponibles pour les catégories ─────────────────────────────────
const COULEURS = [
  '#3B82F6','#6366F1','#10B981','#F59E0B','#EF4444',
  '#8B5CF6','#EC4899','#14B8A6','#F97316','#78716C',
  '#6B7280','#92400E','#0369A1','#DC2626','#059669',
];

// ─── Onglet Boutique ──────────────────────────────────────────────────────────
function OngletBoutique() {
  const [form, setForm] = useState({
    nom:       localStorage.getItem('boutique_nom')       || 'StockBTP',
    adresse:   localStorage.getItem('boutique_adresse')   || '',
    telephone: localStorage.getItem('boutique_telephone') || '',
    email:     localStorage.getItem('boutique_email')     || '',
    devise:    localStorage.getItem('boutique_devise')    || 'GNF',
    ville:     localStorage.getItem('boutique_ville')     || 'Conakry',
    pays:      localStorage.getItem('boutique_pays')      || 'Guinée',
  });
  const [saved, setSaved] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const sauvegarder = () => {
    Object.entries(form).forEach(([k, v]) => localStorage.setItem(`boutique_${k}`, v));
    setSaved(true);
    toast.success('Informations sauvegardées !');
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-syne text-lg font-bold text-slate-900 mb-1">Informations de la boutique</h2>
        <p className="text-sm text-slate-400">Ces informations apparaîtront sur vos reçus de vente</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5 md:col-span-2">
          <label className="text-xs font-semibold text-slate-500">Nom de la boutique *</label>
          <input className={inputCls} value={form.nom} onChange={e => set('nom', e.target.value)} placeholder="Ex: StockBTP Conakry"/>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-500">Téléphone</label>
          <input className={inputCls} value={form.telephone} onChange={e => set('telephone', e.target.value)} placeholder="Ex: +224 620 00 00 00"/>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-500">Email</label>
          <input type="email" className={inputCls} value={form.email} onChange={e => set('email', e.target.value)} placeholder="contact@boutique.com"/>
        </div>
        <div className="flex flex-col gap-1.5 md:col-span-2">
          <label className="text-xs font-semibold text-slate-500">Adresse</label>
          <input className={inputCls} value={form.adresse} onChange={e => set('adresse', e.target.value)} placeholder="Ex: Quartier Madina, Avenue du Commerce"/>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-500">Ville</label>
          <input className={inputCls} value={form.ville} onChange={e => set('ville', e.target.value)} placeholder="Conakry"/>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-500">Pays</label>
          <input className={inputCls} value={form.pays} onChange={e => set('pays', e.target.value)} placeholder="Guinée"/>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-500">Devise</label>
          <select className={inputCls} value={form.devise} onChange={e => set('devise', e.target.value)}>
            <option value="GNF">GNF — Franc Guinéen</option>
            <option value="USD">USD — Dollar américain</option>
            <option value="EUR">EUR — Euro</option>
            <option value="XOF">XOF — Franc CFA</option>
          </select>
        </div>
      </div>

      <div className="flex justify-end">
        <button onClick={sauvegarder}
          className={`btn shadow-md ${saved ? 'bg-green-500 text-white shadow-green-200' : 'gradient-brand text-white shadow-indigo-200 hover:opacity-90'}`}>
          {saved ? <><Check size={15}/> Sauvegardé</> : <><Save size={15}/> Sauvegarder</>}
        </button>
      </div>
    </div>
  );
}

// ─── Onglet Catégories ────────────────────────────────────────────────────────
function OngletCategories() {
  const qc = useQueryClient();
  const [modaleF, setModaleF] = useState(null);
  const [form, setForm]       = useState({ nom:'', description:'', couleur:'#3B82F6' });
  const [aSupprimer, setASupprimer] = useState(null);

  const { data: cats, isLoading, isError } = useQuery({
    queryKey: ['categories'],
    queryFn:  () => api.get('/categories').then(r => r.data.data),
  });

  const mutation = useMutation({
    mutationFn: (d) => modaleF?._id ? api.put(`/categories/${modaleF._id}`, d) : api.post('/categories', d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] });
      toast.success(modaleF?._id ? 'Catégorie mise à jour ✓' : 'Catégorie créée ✓');
      setModaleF(null);
      setForm({ nom:'', description:'', couleur:'#3B82F6' });
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Erreur'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/categories/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['categories'] }); toast.success('Catégorie supprimée'); setASupprimer(null); },
    onError: () => toast.error('Erreur — cette catégorie contient peut-être des produits'),
  });

  const ouvrirModale = (cat = null) => {
    setModaleF(cat || {});
    setForm(cat ? { nom:cat.nom, description:cat.description||'', couleur:cat.couleur } : { nom:'', description:'', couleur:'#3B82F6' });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-syne text-lg font-bold text-slate-900 mb-1">Catégories de produits</h2>
          <p className="text-sm text-slate-400">{cats?.length || 0} catégorie(s) configurée(s)</p>
        </div>
        <button onClick={() => ouvrirModale()} className="btn-primary">
          <Plus size={15}/> Nouvelle catégorie
        </button>
      </div>

      {isLoading ? (
        <CenteredSpinner />
      ) : isError ? (
        <EmptyState icon={AlertTriangle} title="Impossible de charger les catégories" description="Vérifiez votre connexion et réessayez." />
      ) : !cats?.length ? (
        <EmptyState icon={Palette} title="Aucune catégorie" description="Créez votre première catégorie pour organiser vos produits."
          action={<button onClick={() => ouvrirModale()} className="btn-primary">Nouvelle catégorie</button>} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {cats.map(c => (
            <div key={c._id} className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all group">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-white font-bold text-sm"
                style={{ background: c.couleur }}>
                {c.nom.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">{c.nom}</p>
                <p className="text-xs text-slate-400">{c.nombreProduits || 0} produit(s)</p>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => ouvrirModale(c)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"><Pencil size={13}/></button>
                <button onClick={() => setASupprimer(c)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all"><Trash2 size={13}/></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modale */}
      {modaleF !== null && (
        <Modal
          open
          onClose={() => setModaleF(null)}
          icon={Palette}
          title={`${modaleF._id ? 'Modifier' : 'Nouvelle'} catégorie`}
          footer={<>
            <button onClick={() => setModaleF(null)} className="btn-secondary">Annuler</button>
            <button onClick={() => mutation.mutate(form)} disabled={!form.nom || mutation.isPending} className="btn-primary">
              {mutation.isPending ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </>}>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-500">Nom *</label>
              <input className={inputCls} value={form.nom} onChange={e => setForm(f=>({...f,nom:e.target.value}))} placeholder="Ex: Ciment & Béton"/>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-500">Description</label>
              <input className={inputCls} value={form.description} onChange={e => setForm(f=>({...f,description:e.target.value}))} placeholder="Description optionnelle"/>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-slate-500">Couleur</label>
              <div className="flex flex-wrap gap-2">
                {COULEURS.map(c => (
                  <button key={c} onClick={() => setForm(f=>({...f,couleur:c}))}
                    className={`w-8 h-8 rounded-xl transition-all hover:scale-110 ${form.couleur === c ? 'ring-2 ring-offset-2 ring-slate-400 scale-110' : ''}`}
                    style={{ background: c }}/>
                ))}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-6 h-6 rounded-lg" style={{ background: form.couleur }}/>
                <span className="text-xs font-mono text-slate-500">{form.couleur}</span>
              </div>
            </div>
          </div>
        </Modal>
      )}

      <ConfirmDialog
        open={!!aSupprimer}
        onClose={() => setASupprimer(null)}
        onConfirm={() => deleteMutation.mutate(aSupprimer._id)}
        title={aSupprimer ? `Supprimer "${aSupprimer.nom}" ?` : ''}
        message="Cette action est irréversible. Si des produits utilisent encore cette catégorie, la suppression sera refusée."
        confirmLabel="Supprimer"
        danger
        loading={deleteMutation.isPending}
      />
    </div>
  );
}

// ─── Onglet Préférences ───────────────────────────────────────────────────────
function OngletPreferences() {
  const [prefs, setPrefs] = useState({
    seuilDefaut:  localStorage.getItem('pref_seuil')    || '10',
    alerteEmail:  localStorage.getItem('pref_email')    || '',
    affichageQte: localStorage.getItem('pref_qte')      || 'unite',
  });
  const set = (k, v) => setPrefs(p => ({ ...p, [k]: v }));

  const sauvegarder = () => {
    Object.entries(prefs).forEach(([k, v]) => localStorage.setItem(`pref_${k}`, v));
    toast.success('Préférences sauvegardées !');
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-syne text-lg font-bold text-slate-900 mb-1">Préférences</h2>
        <p className="text-sm text-slate-400">Configurez le comportement de l'application</p>
      </div>

      <div className="flex flex-col gap-4">
        <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-800">Seuil d'alerte par défaut</p>
              <p className="text-xs text-slate-400 mt-0.5">Quantité minimum avant déclenchement d'une alerte</p>
            </div>
            <input type="number" min="0" className="w-20 bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl px-3 py-2 outline-none focus:border-indigo-400 text-center"
              value={prefs.seuilDefaut} onChange={e => set('seuilDefaut', e.target.value)}/>
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex flex-col gap-2">
            <div>
              <p className="text-sm font-semibold text-slate-800">Email pour les alertes</p>
              <p className="text-xs text-slate-400 mt-0.5">Recevez les alertes de stock par email (bientôt disponible)</p>
            </div>
            <input type="email" className={inputCls} value={prefs.alerteEmail}
              onChange={e => set('alerteEmail', e.target.value)} placeholder="votre@email.com"/>
          </div>
        </div>

        <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex items-start gap-3">
          <AlertTriangle size={16} className="text-amber-500 flex-shrink-0 mt-0.5"/>
          <div>
            <p className="text-sm font-semibold text-amber-700">Réinitialiser les données</p>
            <p className="text-xs text-amber-600 mt-0.5 mb-3">Cette action supprime définitivement toutes les données de test.</p>
            <button className="btn btn-sm bg-red-50 text-red-600 border border-red-200 hover:bg-red-100">
              Contacter l'administrateur
            </button>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button onClick={sauvegarder} className="btn-primary shadow-md shadow-indigo-200">
          <Save size={15}/> Sauvegarder
        </button>
      </div>
    </div>
  );
}

// ─── Onglet Export ────────────────────────────────────────────────────────────
function OngletExport() {
  const [loading, setLoading] = useState({});

  const exporter = async (type, format) => {
    setLoading(l => ({ ...l, [`${type}-${format}`]: true }));
    try {
      const res = await api.get(`/${type}`, { params: { limit: 10000 } });
      const data = res.data.data;

      if (format === 'json') {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href = url; a.download = `${type}-${new Date().toISOString().slice(0,10)}.json`;
        a.click(); URL.revokeObjectURL(url);
      } else if (format === 'csv') {
        if (!data.length) return toast.error('Aucune donnée à exporter');
        // Aplatit les objets imbriqués sur un niveau (ex: client.nom) ; ignore les tableaux (ex: paiements)
        const aplatir = (row) => {
          const flat = {};
          Object.entries(row).forEach(([k, v]) => {
            if (Array.isArray(v)) return;
            if (v && typeof v === 'object') {
              Object.entries(v).forEach(([sk, sv]) => { flat[`${k}.${sk}`] = sv; });
            } else {
              flat[k] = v;
            }
          });
          return flat;
        };
        const rows = data.map(aplatir);
        const keys = Object.keys(rows[0]);
        const csv  = [keys.join(';'), ...rows.map(row => keys.map(k => `"${row[k] ?? ''}"`).join(';'))].join('\n');
        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href = url; a.download = `${type}-${new Date().toISOString().slice(0,10)}.csv`;
        a.click(); URL.revokeObjectURL(url);
      }
      toast.success(`Export ${format.toUpperCase()} réussi !`);
    } catch { toast.error('Erreur lors de l\'export'); }
    finally { setLoading(l => ({ ...l, [`${type}-${format}`]: false })); }
  };

  const exports = [
    { label:'Produits',    endpoint:'produits',   desc:'Liste complète des produits et stocks',      color:'blue'   },
    { label:'Ventes',      endpoint:'ventes',     desc:'Historique de toutes les ventes',            color:'indigo' },
    { label:'Mouvements',  endpoint:'mouvements', desc:'Tous les mouvements de stock',               color:'green'  },
    { label:'Dettes',      endpoint:'dettes',     desc:'Cahier de dettes et historique des paiements', color:'red'  },
  ];

  const colorMap = {
    blue:   'bg-indigo-50 border-indigo-100',
    indigo: 'bg-indigo-50 border-indigo-100',
    green:  'bg-emerald-50 border-emerald-100',
    red:    'bg-red-50 border-red-100',
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-syne text-lg font-bold text-slate-900 mb-1">Export des données</h2>
        <p className="text-sm text-slate-400">Téléchargez vos données en CSV ou JSON</p>
      </div>

      <div className="flex flex-col gap-3">
        {exports.map(e => (
          <div key={e.endpoint} className={`flex items-center justify-between p-4 rounded-2xl border ${colorMap[e.color]}`}>
            <div>
              <p className="text-sm font-semibold text-slate-800">{e.label}</p>
              <p className="text-xs text-slate-400 mt-0.5">{e.desc}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => exporter(e.endpoint, 'csv')} disabled={loading[`${e.endpoint}-csv`]}
                className="btn btn-sm bg-white border border-slate-200 text-slate-700 hover:bg-slate-50">
                <FileText size={12}/> CSV
              </button>
              <button onClick={() => exporter(e.endpoint, 'json')} disabled={loading[`${e.endpoint}-json`]}
                className="btn btn-sm gradient-brand text-white hover:opacity-90 shadow-sm">
                <FileJson size={12}/> JSON
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-xs text-slate-400 flex items-start gap-2">
        <Info size={14} className="flex-shrink-0 mt-0.5"/>
        <span><strong>CSV</strong> s'ouvre dans Excel · <strong>JSON</strong> pour les développeurs ou la sauvegarde</span>
      </div>
    </div>
  );
}

// ─── Page Paramètres principale ───────────────────────────────────────────────
export default function Parametres() {
  const [onglet, setOnglet] = useState('boutique');

  const TabContent = {
    boutique:    <OngletBoutique />,
    categories:  <OngletCategories />,
    preferences: <OngletPreferences />,
    export:      <OngletExport />,
  };

  return (
    <div className="min-h-screen bg-slate-100 p-5 lg:p-7">
      <div className="flex items-center gap-3 mb-6 animate-fade-up">
        <div className="w-11 h-11 rounded-2xl gradient-brand flex items-center justify-center shadow-md shadow-indigo-200 flex-shrink-0">
          <Settings2 size={20} className="text-white"/>
        </div>
        <div>
          <h1 className="font-syne text-2xl font-bold text-slate-900 tracking-tight">Paramètres</h1>
          <p className="text-sm text-slate-400 mt-0.5">Configurez votre application et votre boutique</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-5 animate-fade-up-2">
        {/* Navigation — onglets horizontaux sur mobile/tablette, menu latéral sur desktop */}
        <div className="lg:w-52 flex-shrink-0">
          <div className="card-neu p-2 flex lg:flex-col gap-1 overflow-x-auto scrollbar-hide">
            {TABS.map(t => (
              <button key={t.id} onClick={() => setOnglet(t.id)}
                className={`lg:w-full flex-shrink-0 flex items-center justify-center lg:justify-start gap-2 px-4 lg:px-3 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${onglet === t.id ? 'gradient-brand text-white shadow-md shadow-indigo-200' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}>
                <t.Icon size={15}/>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Contenu */}
        <div className="flex-1 card-neu p-5 sm:p-6 animate-fade-up-3">
          {TabContent[onglet]}
        </div>
      </div>
    </div>
  );
}
