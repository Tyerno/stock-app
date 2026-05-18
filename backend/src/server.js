require('dotenv').config();
const express     = require('express');
const cors        = require('cors');
const helmet      = require('helmet');
const morgan      = require('morgan');
const rateLimit   = require('express-rate-limit');
const connectDB   = require('./config/db');

connectDB();

const app = express();

// ── Sécurité ──────────────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? process.env.FRONTEND_URL
    : ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true,
}));

// Rate limiting global
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 300, message: 'Trop de requêtes, réessayez dans 15 minutes' }));

// Rate limiting strict sur l'auth
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, max: 20 }));

// ── Middlewares ───────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth',         require('./routes/auth').router || require('./routes/auth'));
app.use('/api/dashboard',    require('./routes/dashboard'));
app.use('/api/produits',     require('./routes/produits'));
app.use('/api/ventes',       require('./routes/ventes'));
app.use('/api/categories',   require('./routes/categories'));
app.use('/api/alertes',      require('./routes/alertes'));
app.use('/api/mouvements',   require('./routes/mouvements'));
app.use('/api/utilisateurs', require('./routes/utilisateurs'));
app.use('/api/superadmin',   require('./routes/superadmin'));
app.use('/api/parametres',   require('./routes/parametres'));

// ── Santé ─────────────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) =>
  res.json({ status: 'OK', env: process.env.NODE_ENV, ts: new Date().toISOString() })
);

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((req, res) =>
  res.status(404).json({ success: false, message: `Route introuvable : ${req.method} ${req.path}` })
);

// ── Erreurs globales ──────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('💥', err.stack);
  res.status(err.status || 500).json({ success: false, message: err.message || 'Erreur serveur' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 StockSaaS API → http://localhost:${PORT}`));
