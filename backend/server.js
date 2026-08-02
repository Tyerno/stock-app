const express    = require('express');
const cors       = require('cors');
const morgan     = require('morgan');
const mongoose   = require('mongoose');
const helmet     = require('helmet');
const rateLimit  = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
require('dotenv').config();

const app = express();
app.set('trust proxy', 1);

// ─── Sécurité — Headers HTTP ──────────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

// ─── CORS ─────────────────────────────────────────────────────────────────────
const origines = (process.env.FRONTEND_URL || 'http://localhost:3000')
  .split(',')
  .map((o) => o.trim());
app.use(cors({ origin: origines, credentials: false }));

// ─── Rate Limiting ────────────────────────────────────────────────────────────
const limiterGlobal = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { success: false, message: 'Trop de requêtes, réessayez dans 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiterGlobal);

const limiterAuth = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Trop de tentatives de connexion' },
});
app.use('/api/auth/connexion', limiterAuth);

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(mongoSanitize());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth',          require('./routes/auth'));
app.use('/api/produits',      require('./routes/produits'));
app.use('/api/mouvements',    require('./routes/mouvements'));
app.use('/api/categories',    require('./routes/categories'));
app.use('/api/dashboard',     require('./routes/dashboard'));
app.use('/api/alertes',       require('./routes/alertes'));
app.use('/api/ventes',        require('./routes/ventes'));
app.use('/api/utilisateurs',  require('./routes/utilisateurs'));
app.use('/api/stats',         require('./routes/stats'));
app.use('/api/previsions',    require('./routes/previsions'));
app.use('/api/emails',        require('./routes/emails'));

// ─── Santé ────────────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), env: process.env.NODE_ENV });
});

// ─── 404 ──────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route introuvable' });
});

// ─── Erreurs globales ─────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('❌ Erreur :', err.message);
  if (err.name === 'ValidationError') {
    return res.status(400).json({ success: false, message: Object.values(err.errors).map(e => e.message).join(', ') });
  }
  if (err.code === 11000) {
    return res.status(400).json({ success: false, message: 'Cette valeur existe déjà' });
  }
  res.status(err.statusCode || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'Erreur serveur interne' : err.message,
  });
});

// ─── Connexion MongoDB ────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Serveur démarré sur le port ${PORT}`);
});

mongoose
  .connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
  })
  .then(() => {
    console.log('✅ MongoDB connecté');

    // Démarrer les crons après connexion DB
    const demarrerCrons = require('./services/cronJobs');
    demarrerCrons();

    // Tester le service email au démarrage
    const emailService = require('./services/emailService');
    emailService.testerConnexion();
  })
  .catch((err) => {
    console.error('❌ Erreur MongoDB :', err.message);
  });
