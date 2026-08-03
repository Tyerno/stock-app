import { useState, useEffect, useRef } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

// ─── Hook : compteur animé ────────────────────────────────────────────────────
export function useAnimatedCounter(target, duration = 1200) {
  const [value, setValue] = useState(0);
  const rafRef = useRef(null);

  useEffect(() => {
    const numTarget = parseFloat(String(target).replace(/[^0-9.]/g, '')) || 0;
    if (numTarget === 0) { setValue(0); return; }

    const startTime = performance.now();
    const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

    const tick = (now) => {
      const elapsed  = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased    = easeOutCubic(progress);
      setValue(Math.round(numTarget * eased));
      if (progress < 1) rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return value;
}

// ─── Compteur animé ───────────────────────────────────────────────────────────
export function AnimatedCounter({ value, prefix = '', suffix = '', className = '' }) {
  const count = useAnimatedCounter(value);
  const isLarge = typeof value === 'string' && value.includes('M');
  const display = isLarge
    ? (count / 1_000_000).toFixed(1) + 'M'
    : new Intl.NumberFormat('fr-FR').format(count);

  return <span className={className}>{prefix}{display}{suffix}</span>;
}

// ─── Barre de progression animée ─────────────────────────────────────────────
export function AnimatedBar({ percent, color, delay = 0 }) {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setWidth(percent), 300 + delay);
    return () => clearTimeout(timer);
  }, [percent, delay]);

  return (
    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full"
        style={{
          width:      `${width}%`,
          background: color,
          transition: 'width 1.2s cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      />
    </div>
  );
}

// ─── Config couleurs KPI ──────────────────────────────────────────────────────
const KPI_CONFIG = {
  blue:   { glow: 'kpi-glow-blue',   bar: '#6366F1', top: 'from-indigo-500 to-indigo-400',     icon: 'bg-indigo-50',   iconColor: '#6366F1' },
  red:    { glow: 'kpi-glow-red',    bar: '#EF4444', top: 'from-red-500 to-red-400',       icon: 'bg-red-50',    iconColor: '#EF4444' },
  amber:  { glow: 'kpi-glow-amber',  bar: '#F59E0B', top: 'from-amber-500 to-yellow-400',  icon: 'bg-amber-50',  iconColor: '#F59E0B' },
  violet: { glow: 'kpi-glow-violet', bar: '#6366F1', top: 'from-violet-500 to-indigo-500', icon: 'bg-violet-50', iconColor: '#6366F1' },
  green:  { glow: 'kpi-glow-green',  bar: '#10B981', top: 'from-emerald-500 to-green-400', icon: 'bg-emerald-50',iconColor: '#10B981' },
};

// ─── KpiCard ──────────────────────────────────────────────────────────────────
export default function KpiCard({ label, value, sub, Icon, accent, progress, delay, trend }) {
  const cfg = KPI_CONFIG[accent] || KPI_CONFIG.blue;
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className={`card-kpi p-5 animate-fade-up-${delay} ${cfg.glow}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Barre top colorée */}
      <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${cfg.top} transition-all duration-300 ${hovered ? 'h-1' : ''}`} />

      {/* Fond décoratif */}
      <div className={`absolute top-0 right-0 w-20 h-20 rounded-bl-full opacity-5 bg-gradient-to-br ${cfg.top} transition-all duration-300 ${hovered ? 'opacity-10 w-24 h-24' : ''}`} />

      <div className="relative">
        <div className="flex items-start justify-between mb-4">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">{label}</p>
          <div className={`w-9 h-9 rounded-xl ${cfg.icon} flex items-center justify-center transition-transform duration-300 ${hovered ? 'scale-110' : ''}`}>
            <Icon size={17} style={{ color: cfg.iconColor }} />
          </div>
        </div>

        <div className="mb-1">
          <p className="font-syne text-2xl font-bold text-slate-900 tracking-tight animate-count-up">
            <AnimatedCounter value={value} />
          </p>
        </div>

        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-slate-400">{sub}</p>
          {trend !== undefined && (
            <div className={`flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${trend >= 0 ? 'text-emerald-600 bg-emerald-50' : 'text-red-500 bg-red-50'}`}>
              {trend >= 0 ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
              {Math.abs(trend)}%
            </div>
          )}
        </div>

        {progress !== undefined && (
          <AnimatedBar percent={progress} color={cfg.bar} delay={(delay || 1) * 100} />
        )}
      </div>
    </div>
  );
}
