import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Users, Search, Phone, MessageCircle, HandCoins, ShoppingBag, AlertTriangle, ChevronRight, Send, Crown, Receipt } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import { fmt, fmtDate } from '../../utils/format';
import { numeroWhatsApp } from '../../utils/bonCommande';
import { lienRappel, peutRelancer } from '../../utils/rappelDette';
import { envoyerRecuVente, prechargerPdf } from '../../utils/recuPdf';
import Modal from '../../components/ui/Modal';
import EmptyState from '../../components/ui/EmptyState';
import { CenteredSpinner, Spinner } from '../../components/ui/LoadingState';

const TRIS = [
  { id: 'recent', label: 'Plus récents' },
  { id: 'achats', label: 'Meilleurs clients' },
  { id: 'dette', label: 'Plus gros débiteurs' },
  { id: 'nom', label: 'Nom (A → Z)' },
];

function Kpi({ label, valeur, sous, ton = 'text-slate-900' }) {
  return (
    <div className="card-neu p-4">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
      <p className={`font-syne text-xl font-bold mt-1 ${ton}`}>{valeur}</p>
      {sous && <p className="text-[11px] text-slate-400 mt-0.5">{sous}</p>}
    </div>
  );
}

const initiales = (nom) => nom.split(/\s+/).slice(0, 2).map((m) => m[0]?.toUpperCase() || '').join('');

function ModaleFiche({ client, onClose }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['clients', 'fiche', client.cle],
    queryFn: () => api.get('/clients/fiche', { params: { nom: client.nom } }).then((r) => r.data.data),
  });
  const [envoi, setEnvoi] = useState(null);
  const f = data;
  const wa = numeroWhatsApp(f?.telephone || client.telephone);
  const tel = (f?.telephone || client.telephone || '').replace(/[^\d+]/g, '');
  const dettesOuvertes = (f?.dettes || []).filter((d) => d.statut === 'EN_COURS');

  const envoyer = async (v) => {
    if (envoi) return;
    setEnvoi(v._id);
    try { await envoyerRecuVente(v); }
    catch (e) { if (e?.name !== 'AbortError') toast.error("Le reçu PDF n'a pas pu être créé"); }
    finally { setEnvoi(null); }
  };

  return (
    <Modal open onClose={onClose} icon={Users} title={client.nom} subtitle={f?.telephone || client.telephone || 'Pas de téléphone enregistré'} size="lg">
      {isLoading ? <div className="py-10 flex justify-center"><Spinner /></div>
        : isError ? <p className="text-sm text-red-500 py-6 text-center">Fiche indisponible. Réessayez dans un instant.</p>
        : (
        <div className="flex flex-col gap-5" onMouseEnter={prechargerPdf} onTouchStart={prechargerPdf}>
          <div className="flex flex-wrap gap-2">
            {tel && <a href={`tel:${tel}`} className="btn btn-secondary"><Phone size={14} /> Appeler</a>}
            {wa && <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer" className="btn btn-secondary"><MessageCircle size={14} /> WhatsApp</a>}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Kpi label="Achats" valeur={f.nbAchats} sous={f.premierAchat ? `depuis ${new Date(f.premierAchat).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}` : ''} />
            <Kpi label="Total acheté" valeur={fmt(f.totalAchats)} sous="GNF" />
            <Kpi label="Panier moyen" valeur={fmt(f.panierMoyen)} sous="GNF" />
            <Kpi label="Reste à payer" valeur={fmt(f.restantDu)} sous={f.enRetard ? `${f.enRetard} en retard` : 'GNF'} ton={f.restantDu > 0 ? (f.enRetard ? 'text-red-600' : 'text-amber-600') : 'text-emerald-600'} />
          </div>

          {dettesOuvertes.length > 0 && (
            <section>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Dettes en cours</h4>
              <div className="flex flex-col gap-2">
                {dettesOuvertes.map((d) => {
                  const retard = d.dateEcheance && new Date(d.dateEcheance) < new Date(new Date().setUTCHours(0, 0, 0, 0));
                  return (
                    <div key={d._id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-white p-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800">{fmt(d.montantRestant)} GNF <span className="text-slate-400 font-normal">sur {fmt(d.montantInitial)}</span></p>
                        <p className={`text-[11px] ${retard ? 'text-red-500 font-semibold' : 'text-slate-400'}`}>
                          {d.dateEcheance ? `Échéance : ${new Date(d.dateEcheance).toLocaleDateString('fr-FR', { timeZone: 'UTC' })}${retard ? ' (dépassée)' : ''}` : 'Sans échéance'}
                        </p>
                      </div>
                      {peutRelancer(d) && (
                        <a href={lienRappel(d)} target="_blank" rel="noreferrer" className="btn btn-secondary text-xs whitespace-nowrap"><MessageCircle size={13} /> Rappeler</a>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {f.topProduits.length > 0 && (
            <section>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Ce qu'il achète le plus</h4>
              <div className="flex flex-wrap gap-2">
                {f.topProduits.map((p) => (
                  <span key={p.nom} className="text-xs rounded-full bg-indigo-50 text-indigo-700 px-3 py-1.5 font-medium">
                    {p.nom} · {fmt(p.quantite)} {p.unite}
                  </span>
                ))}
              </div>
            </section>
          )}

          <section>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Historique des achats {f.ventes.length < f.nbAchats && `(${f.ventes.length} plus récents)`}</h4>
            {f.ventes.length === 0 ? <p className="text-sm text-slate-400">Aucun achat enregistré (dette seule).</p> : (
              <div className="flex flex-col gap-2">
                {f.ventes.map((v) => (
                  <div key={v._id} className="rounded-xl border border-slate-100 bg-white p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800">{v.numero} <span className="text-slate-400 font-normal">· {fmtDate(v.createdAt)}</span></p>
                        <p className="text-xs text-slate-500 truncate">{v.lignes.map((l) => `${l.quantite} × ${l.nomProduit}`).join(', ')}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="font-syne font-bold text-sm text-slate-900">{fmt(v.totalNet)}</span>
                        <button onClick={() => envoyer(v)} disabled={!!envoi} title="Envoyer le reçu en PDF" className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 disabled:opacity-40">
                          {envoi === v._id ? <Spinner size={14} /> : <Send size={14} />}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </Modal>
  );
}

export default function Clients() {
  const [recherche, setRecherche] = useState('');
  const [tri, setTri] = useState('recent');
  const [ouvert, setOuvert] = useState(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['clients', 'liste'],
    queryFn: () => api.get('/clients').then((r) => r.data),
    staleTime: 60 * 1000,
  });

  const liste = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    const chiffres = q.replace(/\D/g, '');
    let l = (data?.data || []).filter((c) => !q || c.cle.includes(q) || (chiffres && c.telephone.replace(/\D/g, '').includes(chiffres)));
    const t = {
      recent: (a, b) => (b.dernierAchat ? +new Date(b.dernierAchat) : 0) - (a.dernierAchat ? +new Date(a.dernierAchat) : 0),
      achats: (a, b) => b.totalAchats - a.totalAchats,
      dette: (a, b) => b.restantDu - a.restantDu,
      nom: (a, b) => a.nom.localeCompare(b.nom),
    }[tri];
    return [...l].sort(t);
  }, [data, recherche, tri]);

  const meilleur = useMemo(() => (data?.data || []).reduce((m, c) => (c.totalAchats > (m?.totalAchats || 0) ? c : m), null), [data]);

  if (isLoading) return <CenteredSpinner />;
  if (isError) return (
    <EmptyState icon={AlertTriangle} title="Clients indisponibles" description="Impossible de charger la liste pour le moment."
      action={<button className="btn-primary" onClick={() => refetch()}>Réessayer</button>} />
  );

  const s = data.stats;
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi label="Clients" valeur={s.total} sous="avec nom enregistré" />
        <Kpi label="Total des achats" valeur={fmt(s.totalAchats)} sous="GNF" />
        <Kpi label="À recevoir" valeur={fmt(s.totalDu)} sous={`${s.debiteurs} client${s.debiteurs > 1 ? 's' : ''} débiteur${s.debiteurs > 1 ? 's' : ''}`} ton={s.totalDu > 0 ? 'text-amber-600' : 'text-emerald-600'} />
        <Kpi label="Meilleur client" valeur={meilleur ? meilleur.nom : '—'} sous={meilleur ? `${fmt(meilleur.totalAchats)} GNF` : ''} />
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
          <input className="w-full bg-white border border-slate-200 text-sm rounded-xl pl-9 pr-3 py-2.5 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" placeholder="Chercher un nom ou un numéro…" value={recherche} onChange={(e) => setRecherche(e.target.value)} />
        </div>
        <select className="bg-white border border-slate-200 text-sm rounded-xl px-3 py-2.5 outline-none focus:border-indigo-400" value={tri} onChange={(e) => setTri(e.target.value)} aria-label="Trier">
          {TRIS.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>
      </div>

      {liste.length === 0 ? (
        <EmptyState icon={Users} title={recherche ? 'Aucun client trouvé' : 'Pas encore de client'}
          description={recherche ? 'Essayez un autre nom ou numéro.' : "Les clients apparaissent ici dès qu'une vente ou une dette est enregistrée avec un nom (à la caisse, saisissez le nom du client)."} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {liste.map((c) => (
            <button key={c.cle} onClick={() => setOuvert(c)} className="card-neu p-4 text-left flex items-center gap-3 hover:shadow-md transition-shadow">
              <div className="w-11 h-11 rounded-full bg-indigo-100 text-indigo-700 font-syne font-bold flex items-center justify-center flex-shrink-0">{initiales(c.nom)}</div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-slate-900 truncate flex items-center gap-1.5">
                  {c.nom}
                  {meilleur?.cle === c.cle && s.total > 1 && <Crown size={13} className="text-amber-500 flex-shrink-0" />}
                </p>
                <p className="text-xs text-slate-400 truncate">
                  {c.telephone || 'Pas de téléphone'}
                  {c.dernierAchat ? ` · dernier achat ${new Date(c.dernierAchat).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}` : ''}
                </p>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {c.nbAchats > 0 && <span className="text-[11px] rounded-full bg-slate-100 text-slate-600 px-2 py-0.5 inline-flex items-center gap-1"><ShoppingBag size={10} />{c.nbAchats} · {fmt(c.totalAchats)} GNF</span>}
                  {c.restantDu > 0 && <span className={`text-[11px] rounded-full px-2 py-0.5 inline-flex items-center gap-1 font-semibold ${c.enRetard ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-700'}`}><HandCoins size={10} />doit {fmt(c.restantDu)}</span>}
                </div>
              </div>
              <ChevronRight size={16} className="text-slate-300 flex-shrink-0" />
            </button>
          ))}
        </div>
      )}
      {ouvert && <ModaleFiche client={ouvert} onClose={() => setOuvert(null)} />}
    </div>
  );
}
