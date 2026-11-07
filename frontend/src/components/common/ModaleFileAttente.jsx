import { useEffect, useState } from 'react';
import { CloudUpload, Trash2, RefreshCw, AlertTriangle, Clock } from 'lucide-react';
import Modal from '../ui/Modal';
import { fmt } from '../../utils/format';
import { listerVentes, majVente, retirerVente } from '../../utils/horsLigne';

// Ventes faites hors connexion, en attente d'envoi (ou refusées par le serveur et à traiter).
export default function ModaleFileAttente({ onClose, onRelancer, envoi }) {
  const [liste, setListe] = useState(null);
  const charger = () => listerVentes().then(setListe).catch(() => setListe([]));
  useEffect(() => {
    charger();
    window.addEventListener('file-hors-ligne', charger);
    return () => window.removeEventListener('file-hors-ligne', charger);
  }, []);

  const reessayer = async (v) => { await majVente(v.cle, { statut: 'attente', erreur: undefined }); onRelancer(); };
  const supprimer = async (v) => {
    const ok = window.confirm(`Supprimer cette vente de ${fmt(v.resume?.total || 0)} GNF ?\n\nElle n'a PAS été enregistrée sur le serveur : le stock ne sera pas déduit et elle n'apparaîtra nulle part.`);
    if (ok) await retirerVente(v.cle);
  };

  return (
    <Modal open onClose={onClose} icon={CloudUpload} title="Ventes en attente d'envoi" subtitle="Faites sur cet appareil, pas encore enregistrées sur le serveur" size="md"
      footer={<>
        <button onClick={onClose} className="btn-secondary">Fermer</button>
        <button onClick={onRelancer} disabled={envoi || !liste?.some((v) => v.statut !== 'erreur')} className="btn-primary disabled:opacity-40">
          <RefreshCw size={14} className={envoi ? 'animate-spin' : ''} /> {envoi ? 'Envoi…' : 'Envoyer maintenant'}
        </button>
      </>}>
      {!liste ? null : liste.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-8">Tout est envoyé ✓</p>
      ) : (
        <div className="flex flex-col gap-2">
          {liste.map((v) => (
            <div key={v.cle} className={`rounded-xl border p-3 ${v.statut === 'erreur' ? 'border-red-200 bg-red-50/50' : 'border-slate-200 bg-white'}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800">{fmt(v.resume?.total || 0)} GNF <span className="font-normal text-slate-400">· {v.resume?.nb || 0} article{(v.resume?.nb || 0) > 1 ? 's' : ''}</span></p>
                  <p className="text-xs text-slate-400 truncate">
                    {v.resume?.client && v.resume.client !== 'Client comptoir' ? `${v.resume.client} · ` : ''}
                    {new Date(v.creeLe).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {v.statut === 'erreur' && <button onClick={() => reessayer(v)} className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50" title="Réessayer"><RefreshCw size={15} /></button>}
                  <button onClick={() => supprimer(v)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50" title="Supprimer"><Trash2 size={15} /></button>
                </div>
              </div>
              {v.statut === 'erreur'
                ? <p className="mt-2 text-xs text-red-600 flex gap-1.5"><AlertTriangle size={13} className="flex-shrink-0 mt-0.5" />{v.erreur} — corrigez la cause (stock, prix…) puis « Réessayer », ou supprimez la vente.</p>
                : <p className="mt-1.5 text-[11px] text-amber-600 flex items-center gap-1"><Clock size={11} /> En attente de réseau</p>}
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
