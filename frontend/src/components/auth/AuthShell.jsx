import { Zap } from 'lucide-react';

// Cadre commun des pages publiques (connexion, mot de passe oublié, réinitialisation).
export default function AuthShell({ children }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200 mx-auto mb-4">
            <Zap size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">StockBTP</h1>
          <p className="text-slate-500 text-sm mt-1">Gestion de stock BTP</p>
        </div>

        {/* Card */}
        <div className="card p-7 animate-slide-up">{children}</div>
      </div>
    </div>
  );
}
