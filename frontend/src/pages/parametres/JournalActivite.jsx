import { useMemo, useState } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import {
  ShoppingCart, Package, Wallet, Users, KeyRound, Store, Tag, DatabaseBackup, ScrollText,
  Truck, ClipboardCheck, Search, ChevronDown, ArrowRight, WifiOff, ShieldAlert,
} from 'lucide-react';
import api from '../../utils/api';
import { inputCls } from '../../utils/format';
import EmptyState from '../../components/ui/EmptyState';
import { CenteredSpinner } from '../../components/ui/LoadingState';

const TYPES = [
  { id: '',            label: 'Tout' },
  { id: 'vente',       label: 'Ventes' },
  { id: 'produit',     label: 'Produits & stock' },
  { id: 'dette',       label: 'Dettes' },
  { id: 'commande',    label: 'Commandes' },
  { id: 'inventaire',  label: 'Inventaires' },
  { id: 'utilisateur', label: 'Utilisateurs' },
  { id: 'compte',      label: 'Connexions' },
  { id: 'boutique',    label: 'Boutique' },
  { id: 'categorie',   label: 'Catégories' },
  { id: 'systeme',     label: 'Sauvegardes' },
];

const ENTITE = {
  vente:       { Icon: ShoppingCart,   ton: 'bg-emerald-100 text-emerald-600' },
  produit:     { Icon: Package,        ton: 'bg-indigo-100 text-indigo-600' },
  dette:       { Icon: Wallet,         ton: 'bg-violet-100 text-violet-600' },
  commande:    { Icon: Truck,          ton: 'bg-orange-100 text-orange-600' },
  inventaire:  { Icon: ClipboardCheck, ton: 'bg-teal-100 text-teal-600' },
  utilisateur: { Icon: Users,          ton: 'bg-sky-100 text-sky-600' },
  compte:      { Icon: KeyRound,       ton: 'bg-slate-200 text-slate-600' },
  boutique:    { Icon: Store,          ton: 'bg-amber-100 text-amber-600' },
  categorie:   { Icon: Tag,            ton: 'bg-pink-100 text-pink-600' },
  systeme:     { Icon: DatabaseBackup, ton: 'bg-teal-100 text-teal-600' },
};
// Actions sensibles mises en évidence
const ALERTE = new Set(['vente_annulee', 'bon_statut', 'connexion_echec', 'produit_archive', 'utilisateur_mdp', 'utilisateur_toggle', 'categorie_supprimee']);

const ROLES = { admin: 'Administrateur', gestionnaire: 'Gestionnaire', lecteur: 'Lecteur' };

const jourCle = (d) => new Date(d).toLocaleDateString('fr-CA'); // AAAA-MM-JJ en heure locale
function libelleJour(cle) {
  const auj = jourCle(new Date());
  const hier = jourCle(Date.now() - 86400000);
  if (cle === auj) return "Aujourd'hui";
  if (cle === hier) return 'Hier';
  return new Date(cle + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}
const heure = (d) => new Date(d).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
const fmtVal = (champ, v) => {
  if (v === '' || v === null || v === undefined) return '—';
  if (typeof v === 'number' || (/^prix/.test(champ) && !isNaN(Number(v)))) return new Intl.NumberFormat('fr-FR').format(Number(v)) + (/^prix/.test(champ) ? ' GNF' : '');
  return String(v);
};

function Ligne({ e }) {
  const [ouvert, setOuvert] = useState(false);
  const cfg = ENTITE[e.entite] || ENTITE.systeme;
  const alerte = ALERTE.has(e.action);
  const chg = e.details?.changements;
  const articles = e.details?.articles;
  const aDetail = (chg && chg.length) || (articles && articles.length) || e.details?.motif || e.details?.note;
  return (
    <div className={`rounded-2xl border p-3.5 ${alerte ? 'border-red-200 bg-red-50/50' : 'border-slate-100 bg-white'}`}>
      <div className="flex items-start gap-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${alerte ? 'bg-red-100 text-red-600' : cfg.ton}`}>
          {e.action === 'connexion_echec' ? <ShieldAlert size={16} /> : <cfg.Icon size={16} />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-slate-800 leading-snug break-words">{e.libelle}</p>
          <p className="text-[11px] text-slate-400 mt-1">
            {e.utilisateur?.nom ? <><span className="font-semibold text-slate-500">{e.utilisateur.nom}</span>{e.utilisateur.role ? ` · ${ROLES[e.utilisateur.role] || e.utilisateur.role}` : ''}</> : 'Visiteur non connecté'}
            {' · '}{heure(e.createdAt)}
          </p>
          {aDetail && (
            <button type="button" onClick={() => setOuvert(o => !o)} className="mt-1.5 flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-700">
              Détails <ChevronDown size={12} className={`transition-transform ${ouvert ? 'rotate-180' : ''}`} />
            </button>
          )}
          {ouvert && (
            <div className="mt-2 bg-slate-50 rounded-xl p-3 text-xs text-slate-600 flex flex-col gap-1.5">
              {chg?.map((c, i) => (
                <div key={i} className="flex flex-wrap items-center gap-1.5">
                  <span className="font-semibold text-slate-700">{c.label} :</span>
                  <span className="line-through text-slate-400">{fmtVal(c.champ, c.avant)}</span>
                  <ArrowRight size={11} className="text-slate-400" />
                  <span className="font-semibold text-slate-800">{fmtVal(c.champ, c.apres)}</span>
                </div>
              ))}
              {articles?.map((a, i) => <div key={i}>• {a}</div>)}
              {e.details?.motif && <div><span className="font-semibold">Motif :</span> {e.details.motif}</div>}
              {e.details?.note && <div><span className="font-semibold">Note :</span> {e.details.note}</div>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function JournalActivite() {
  const [entite, setEntite] = useState('');
  const [utilisateur, setUtilisateur] = useState('');
  const [q, setQ] = useState('');
  const [debut, setDebut] = useState('');
  const [fin, setFin] = useState('');

  const { data: users } = useQuery({ queryKey: ['utilisateurs-journal'], queryFn: () => api.get('/utilisateurs').then(r => r.data.data) });

  const params = { entite, utilisateur, q: q.trim(), dateDebut: debut, dateFin: fin };
  const { data, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage, refetch } = useInfiniteQuery({
    queryKey: ['journal', params],
    initialPageParam: 1,
    queryFn: ({ pageParam }) => api.get('/journal', { params: { ...params, page: pageParam, limit: 30 } }).then(r => r.data),
    getNextPageParam: (last) => (last.pagination.page < last.pagination.pages ? last.pagination.page + 1 : undefined),
  });

  const lignes = useMemo(() => (data?.pages || []).flatMap(p => p.data), [data]);
  const total = data?.pages?.[0]?.pagination?.total ?? 0;
  const groupes = useMemo(() => {
    const m = new Map();
    lignes.forEach(e => { const k = jourCle(e.createdAt); if (!m.has(k)) m.set(k, []); m.get(k).push(e); });
    return [...m.entries()];
  }, [lignes]);

  const filtresActifs = entite || utilisateur || q || debut || fin;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="font-syne text-lg font-bold text-slate-900 mb-1">Journal d'activité</h2>
        <p className="text-sm text-slate-400">Qui a fait quoi, et quand : ventes, annulations, prix, stocks, dettes, comptes. Conservé 13 mois.</p>
      </div>

      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Rechercher (produit, client, numéro de vente, personne…)" className={`${inputCls} pl-10`} />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
          {TYPES.map(t => (
            <button key={t.id} onClick={() => setEntite(t.id)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${entite === t.id ? 'gradient-brand text-white border-transparent shadow-md' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'}`}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <select value={utilisateur} onChange={e => setUtilisateur(e.target.value)} className={inputCls} aria-label="Personne">
            <option value="">Toutes les personnes</option>
            {(users || []).map(u => <option key={u._id} value={u._id}>{u.nom}</option>)}
          </select>
          <label className="flex items-center gap-2 text-xs text-slate-400">Du
            <input type="date" value={debut} max={fin || undefined} onChange={e => setDebut(e.target.value)} className={inputCls} />
          </label>
          <label className="flex items-center gap-2 text-xs text-slate-400">au
            <input type="date" value={fin} min={debut || undefined} onChange={e => setFin(e.target.value)} className={inputCls} />
          </label>
        </div>
        {filtresActifs && (
          <button onClick={() => { setEntite(''); setUtilisateur(''); setQ(''); setDebut(''); setFin(''); }} className="self-start text-xs font-semibold text-indigo-600 hover:text-indigo-700">
            Effacer les filtres
          </button>
        )}
      </div>

      {isLoading ? <CenteredSpinner /> : isError ? (
        <EmptyState icon={WifiOff} title="Journal indisponible" description="Impossible de charger le journal. Réessayez dans un instant." action={<button className="btn-secondary" onClick={() => refetch()}>Réessayer</button>} />
      ) : lignes.length === 0 ? (
        <EmptyState icon={ScrollText} title="Aucune activité trouvée" description={filtresActifs ? 'Aucun résultat avec ces filtres.' : "Les actions s'afficheront ici dès qu'elles seront effectuées."} />
      ) : (
        <>
          <p className="text-xs text-slate-400 -mb-2">{new Intl.NumberFormat('fr-FR').format(total)} événement{total > 1 ? 's' : ''}</p>
          {groupes.map(([jour, items]) => (
            <div key={jour} className="flex flex-col gap-2">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider capitalize">{libelleJour(jour)}</p>
              {items.map(e => <Ligne key={e._id} e={e} />)}
            </div>
          ))}
          {hasNextPage && (
            <button onClick={() => fetchNextPage()} disabled={isFetchingNextPage} className="btn-secondary self-center">
              {isFetchingNextPage ? 'Chargement…' : 'Voir plus'}
            </button>
          )}
        </>
      )}
    </div>
  );
}
