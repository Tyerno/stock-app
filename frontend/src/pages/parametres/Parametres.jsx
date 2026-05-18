import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, Loader, Building2, Palette, Bell, Package } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

const DEVISES = ['GNF', 'USD', 'EUR', 'XOF', 'MAD', 'DZD'];
const COULEURS = ['#6366f1','#10b981','#f59e0b','#ef4444','#8b5cf6','#0ea5e9','#f97316','#14b8a6'];

export default function Parametres() {
  const { updateEntreprise } = useAuth();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['parametres'],
    queryFn:  () => api.get('/parametres').then(r => r.data.data),
  });

  const [boutique, setBoutique] = useState({ nom:'', adresse:'', telephone:'', email:'', devise:'GNF', couleur:'#6366f1' });
  const [stock, setStock]       = useState({ seuilAlerteDefaut: 5 });

  useEffect(() => {
    if (data) {
      setBoutique(prev => ({ ...prev, ...data.boutique }));
      setStock(prev => ({ ...prev, ...data.stock }));
    }
  }, [data]);

  const mutation = useMutation({
    mutationFn: body => api.put('/parametres', body),
    onSuccess: (res) => {
      qc.invalidateQueries(['parametres']);
      updateEntreprise(res.data.data);
      toast.success('Paramètres sauvegardés !');
    },
    onError: e => toast.error(e.response?.data?.message || 'Erreur'),
  });

  const handleSave = () => mutation.mutate({ boutique, stock });

  const setB = k => e => setBoutique(b => ({ ...b, [k]: e.target.value }));
  const setS = k => e => setStock(s => ({ ...s, [k]: e.target.value }));

  if (isLoading) return <div className="p-12 text-center"><Loader size={24} className="animate-spin text-indigo-500 mx-auto" /></div>;

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div className="page-header">
        <div>
          <h1 className="page-title">Paramètres</h1>
          <p className="page-subtitle">Configuration de votre espace</p>
        </div>
        <button className="btn-primary" onClick={handleSave} disabled={mutation.isPending}>
          {mutation.isPending ? <Loader size={14} className="animate-spin" /> : <Save size={14} />}
          Sauvegarder
        </button>
      </div>

      {/* Infos boutique */}
      <div className="card p-5 space-y-4">
        <h2 className="font-bold text-slate-800 flex items-center gap-2">
          <Building2 size={16} className="text-indigo-500" /> Informations boutique
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="form-group col-span-2">
            <label className="label">Nom de l'entreprise</label>
            <input className="input" value={boutique.nom} onChange={setB('nom')} placeholder="Mon Entreprise" />
          </div>
          <div className="form-group">
            <label className="label">Email</label>
            <input type="email" className="input" value={boutique.email} onChange={setB('email')} placeholder="contact@entreprise.com" />
          </div>
          <div className="form-group">
            <label className="label">Téléphone</label>
            <input className="input" value={boutique.telephone} onChange={setB('telephone')} placeholder="+224 620 000 000" />
          </div>
          <div className="form-group col-span-2">
            <label className="label">Adresse</label>
            <input className="input" value={boutique.adresse} onChange={setB('adresse')} placeholder="Quartier, Ville, Pays" />
          </div>
        </div>
      </div>

      {/* Devise & couleur */}
      <div className="card p-5 space-y-4">
        <h2 className="font-bold text-slate-800 flex items-center gap-2">
          <Palette size={16} className="text-indigo-500" /> Préférences affichage
        </h2>
        <div className="form-group">
          <label className="label">Devise</label>
          <select className="input w-auto" value={boutique.devise} onChange={setB('devise')}>
            {DEVISES.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="label">Couleur principale</label>
          <div className="flex gap-2 flex-wrap">
            {COULEURS.map(c => (
              <button key={c}
                onClick={() => setBoutique(b => ({ ...b, couleur: c }))}
                className={`w-9 h-9 rounded-xl transition-all ${boutique.couleur === c ? 'ring-2 ring-offset-2 ring-slate-400 scale-110' : 'hover:scale-105'}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Stock */}
      <div className="card p-5 space-y-4">
        <h2 className="font-bold text-slate-800 flex items-center gap-2">
          <Package size={16} className="text-indigo-500" /> Paramètres stock
        </h2>
        <div className="form-group max-w-xs">
          <label className="label">Seuil d'alerte par défaut</label>
          <input type="number" className="input" min="0"
            value={stock.seuilAlerteDefaut} onChange={setS('seuilAlerteDefaut')} />
          <p className="text-xs text-slate-400 mt-1">Utilisé lors de la création d'un nouveau produit</p>
        </div>
      </div>
    </div>
  );
}
