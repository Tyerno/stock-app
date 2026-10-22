import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Store, Palette, Download, Settings2, UserCircle,
  Plus, Pencil, Trash2, Save, Check,
  FileJson, FileText, AlertTriangle, Info, ImagePlus
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import { inputCls } from '../../utils/format';
import { CHAMPS_BOUTIQUE, lireBoutiqueLocale, memoriserBoutique } from '../../utils/boutique';
import { preparerLogo } from '../../utils/logo';
import { ContenuCompte } from '../compte/MonCompte';
import MarqueLogo, { useLogoBoutique } from '../../components/ui/MarqueLogo';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import EmptyState from '../../components/ui/EmptyState';
import { CenteredSpinner } from '../../components/ui/LoadingState';

// ─── Onglets ──────────────────────────────────────────────────────────────────
const TABS = [
  { id:'boutique',    label:'Boutique',    Icon:Store    },
  { id:'categories',  label:'Catégories',  Icon:Palette  },
  { id:'preferences', label:'Préférences', Icon:Settings2 },
  { id:'compte',      label:'Mon compte',  Icon:UserCircle },
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
  const qc = useQueryClient();
  const { data: serveur, isLoading, isError } = useQuery({
    queryKey: ['boutique'],
    queryFn:  () => api.get('/boutique').then(r => r.data.data),
  });

  if (isLoading) return <CenteredSpinner />;
  if (isError)   return <EmptyState icon={AlertTriangle} title="Impossible de charger les informations" description="Vérifiez votre connexion et réessayez." />;

  // Tant que rien n'est enregistré en base, on part de ce qui était saisi sur cet appareil (ancienne version).
  const initial = serveur?.configure ? serveur : lireBoutiqueLocale();
  return <FormulaireBoutique initial={initial} premiereFois={!serveur?.configure} qc={qc} />;
}

// ─── Logo de la boutique ──────────────────────────────────────────────────────
// Envoi immédiat (pas besoin de « Sauvegarder »). Si les infos de la boutique n'ont jamais été
// enregistrées en base, on les enregistre avec le logo pour ne pas perdre la saisie locale.
function CarteLogo({ form, premiereFois, qc }) {
  const entree = useRef(null);
  const [occupe, setOccupe] = useState(false);

  const appliquer = (data) => {
    memoriserBoutique(data);
    qc.setQueryData(['boutique'], data);
    qc.setQueryData(['boutique-public'], { nom: data.nom, logo: data.logo });
  };

  const envoyer = async (corps, message) => {
    setOccupe(true);
    try {
      const data = await api.put('/boutique', premiereFois ? { ...form, ...corps } : corps).then(r => r.data.data);
      appliquer(data);
      toast.success(message);
    } catch (e) {
      toast.error(e.response?.data?.message || e.message || 'Erreur lors de l\'enregistrement du logo');
    } finally {
      setOccupe(false);
      if (entree.current) entree.current.value = '';
    }
  };

  const choisir = async (e) => {
    const fichier = e.target.files?.[0];
    if (!fichier) return;
    try {
      const logo = await preparerLogo(fichier);
      await envoyer({ logo }, 'Logo enregistré ✓');
    } catch (err) {
      toast.error(err.message);
      if (entree.current) entree.current.value = '';
    }
  };

  const logoActuel = useLogoBoutique();

  return (
    <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row sm:items-center gap-4">
      <MarqueLogo taille={80} rond="rounded-2xl" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800">Logo de la boutique</p>
        <p className="text-xs text-slate-400 mt-0.5">Affiché dans le menu, sur la page de connexion et sur les reçus. PNG, JPG ou WebP — de préférence carré, fond transparent.</p>
        <div className="flex flex-wrap gap-2 mt-3">
          <input ref={entree} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={choisir}/>
          <button type="button" onClick={() => entree.current?.click()} disabled={occupe} className="btn-secondary btn-sm">
            <ImagePlus size={14}/> {occupe ? 'Envoi…' : logoActuel ? 'Changer le logo' : 'Choisir une image'}
          </button>
          {logoActuel && (
            <button type="button" disabled={occupe} onClick={() => envoyer({ logo: '' }, 'Logo retiré')}
              className="btn btn-sm bg-red-50 text-red-600 border border-red-200 hover:bg-red-100">
              <Trash2 size={14}/> Retirer
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function FormulaireBoutique({ initial, premiereFois, qc }) {
  const [form, setForm] = useState(() => CHAMPS_BOUTIQUE.reduce((o, k) => ({ ...o, [k]: initial[k] ?? '' }), {}));
  const [saved, setSaved] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const mutation = useMutation({
    mutationFn: () => api.put('/boutique', form).then(r => r.data.data),
    onSuccess: (data) => {
      memoriserBoutique(data);
      qc.setQueryData(['boutique'], data);
      setSaved(true);
      toast.success('Informations enregistrées pour tous les appareils ✓');
      setTimeout(() => setSaved(false), 2000);
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Erreur lors de la sauvegarde'),
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-syne text-lg font-bold text-slate-900 mb-1">Informations de la boutique</h2>
        <p className="text-sm text-slate-400">Ces informations apparaîtront sur vos reçus, sur tous les appareils</p>
      </div>

      {premiereFois && (
        <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-2xl text-xs text-indigo-700 flex items-start gap-2">
          <Info size={14} className="flex-shrink-0 mt-0.5"/>
          <span>Ces informations ne sont pas encore enregistrées en ligne. Vérifiez-les puis cliquez sur « Sauvegarder » pour qu'elles s'appliquent partout.</span>
        </div>
      )}

      <CarteLogo form={form} premiereFois={premiereFois} qc={qc} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5 md:col-span-2">
          <label className="text-xs font-semibold text-slate-500">Nom de la boutique *</label>
          <input className={inputCls} maxLength={80} value={form.nom} onChange={e => set('nom', e.target.value)} placeholder="Ex: StockBTP Conakry"/>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-500">Téléphone</label>
          <input className={inputCls} maxLength={40} value={form.telephone} onChange={e => set('telephone', e.target.value)} placeholder="Ex: +224 620 00 00 00"/>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-500">Email</label>
          <input type="email" className={inputCls} maxLength={120} value={form.email} onChange={e => set('email', e.target.value)} placeholder="contact@boutique.com"/>
        </div>
        <div className="flex flex-col gap-1.5 md:col-span-2">
          <label className="text-xs font-semibold text-slate-500">Adresse</label>
          <input className={inputCls} maxLength={200} value={form.adresse} onChange={e => set('adresse', e.target.value)} placeholder="Ex: Quartier Madina, Avenue du Commerce"/>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-500">Ville</label>
          <input className={inputCls} maxLength={80} value={form.ville} onChange={e => set('ville', e.target.value)} placeholder="Conakry"/>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-500">Pays</label>
          <input className={inputCls} maxLength={80} value={form.pays} onChange={e => set('pays', e.target.value)} placeholder="Guinée"/>
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
        <button onClick={() => mutation.mutate()} disabled={!form.nom.trim() || mutation.isPending}
          className={`btn shadow-md ${saved ? 'bg-green-500 text-white shadow-green-200' : 'gradient-brand text-white shadow-indigo-200 hover:opacity-90'}`}>
          {mutation.isPending ? 'Enregistrement…' : saved ? <><Check size={15}/> Sauvegardé</> : <><Save size={15}/> Sauvegarder</>}
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-syne text-lg font-bold text-slate-900 mb-1">Catégories de produits</h2>
          <p className="text-sm text-slate-400">{cats?.length || 0} catégorie(s) configurée(s)</p>
        </div>
        <button onClick={() => ouvrirModale()} className="btn-primary w-full sm:w-auto justify-center whitespace-nowrap">
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
              {/* Toujours visibles au tactile ; au survol seulement sur ordinateur (lg et plus) */}
              <div className="flex gap-1 lg:opacity-0 lg:group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                <button onClick={() => ouvrirModale(c)} title="Modifier" aria-label={`Modifier ${c.nom}`}
                  className="p-2.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"><Pencil size={15}/></button>
                <button onClick={() => setASupprimer(c)} title="Supprimer" aria-label={`Supprimer ${c.nom}`}
                  className="p-2.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all"><Trash2 size={15}/></button>
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
                  <button key={c} type="button" onClick={() => setForm(f=>({...f,couleur:c}))} aria-label={`Couleur ${c}`}
                    className={`w-9 h-9 rounded-xl transition-all hover:scale-110 ${form.couleur === c ? 'ring-2 ring-offset-2 ring-slate-400 scale-110' : ''}`}
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
// Enregistrées en base (même fiche que les infos de la boutique) : valables sur tous les appareils.
function OngletPreferences() {
  const qc = useQueryClient();
  const { data: serveur, isLoading, isError } = useQuery({
    queryKey: ['boutique'],
    queryFn:  () => api.get('/boutique').then(r => r.data.data),
  });

  if (isLoading) return <CenteredSpinner />;
  if (isError)   return <EmptyState icon={AlertTriangle} title="Impossible de charger les préférences" description="Vérifiez votre connexion et réessayez." />;
  return <FormulairePreferences initial={serveur} qc={qc} />;
}

function FormulairePreferences({ initial, qc }) {
  const [prefs, setPrefs] = useState({
    seuilDefaut:  String(initial?.seuilDefaut ?? 10),
    emailAlertes: initial?.emailAlertes || '',
  });
  const [saved, setSaved] = useState(false);
  const set = (k, v) => setPrefs(p => ({ ...p, [k]: v }));

  const seuilValide = /^\d+$/.test(prefs.seuilDefaut.trim());
  const emailValide = !prefs.emailAlertes.trim() || /^\S+@\S+\.\S+$/.test(prefs.emailAlertes.trim());

  const mutation = useMutation({
    mutationFn: () => api.put('/boutique', {
      seuilDefaut:  Number(prefs.seuilDefaut),
      emailAlertes: prefs.emailAlertes.trim(),
    }).then(r => r.data.data),
    onSuccess: (data) => {
      qc.setQueryData(['boutique'], (old) => ({ ...(old || {}), ...data }));
      setSaved(true);
      toast.success('Préférences enregistrées ✓');
      setTimeout(() => setSaved(false), 2000);
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Erreur lors de la sauvegarde'),
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-syne text-lg font-bold text-slate-900 mb-1">Préférences</h2>
        <p className="text-sm text-slate-400">Configurez le comportement de l'application, sur tous les appareils</p>
      </div>

      <div className="flex flex-col gap-4">
        <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800">Seuil d'alerte par défaut</p>
              <p className="text-xs text-slate-400 mt-0.5">Proposé quand vous créez un nouveau produit. Les produits existants ne changent pas.</p>
            </div>
            <input type="number" min="0" step="1" inputMode="numeric"
              className={`w-20 flex-shrink-0 bg-slate-50 border text-slate-800 text-sm rounded-xl px-3 py-2 outline-none focus:border-indigo-400 text-center ${seuilValide ? 'border-slate-200' : 'border-red-300'}`}
              value={prefs.seuilDefaut} onChange={e => set('seuilDefaut', e.target.value)}/>
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex flex-col gap-2">
            <div>
              <p className="text-sm font-semibold text-slate-800">Email pour les alertes</p>
              <p className="text-xs text-slate-400 mt-0.5">Reçoit les alertes de stock et le résumé quotidien. Laissez vide pour utiliser l'adresse configurée sur le serveur.</p>
            </div>
            <input type="email" maxLength={120} className={`${inputCls} ${emailValide ? '' : '!border-red-300'}`} value={prefs.emailAlertes}
              onChange={e => set('emailAlertes', e.target.value)} placeholder="votre@email.com"/>
            {!emailValide && <p className="text-xs text-red-500">Adresse email invalide.</p>}
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button onClick={() => mutation.mutate()} disabled={!seuilValide || !emailValide || mutation.isPending}
          className={`btn shadow-md ${saved ? 'bg-green-500 text-white shadow-green-200' : 'btn-primary shadow-indigo-200'}`}>
          {mutation.isPending ? 'Enregistrement…' : saved ? <><Check size={15}/> Sauvegardé</> : <><Save size={15}/> Sauvegarder</>}
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
    compte:      <ContenuCompte />,
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
