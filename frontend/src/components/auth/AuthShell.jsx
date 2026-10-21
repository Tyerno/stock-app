import MarqueLogo from '../ui/MarqueLogo';

// Cadre commun des pages publiques (connexion, mot de passe oublié, réinitialisation).
export default function AuthShell({ children }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <MarqueLogo taille={56} rond="rounded-2xl" className="mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-900">StockBTP</h1>
          <p className="text-slate-500 text-sm mt-1">Gestion de stock BTP</p>
        </div>

        {/* Card */}
        <div className="card p-7 animate-slide-up">{children}</div>
      </div>
    </div>
  );
}
