const express    = require('express');
const cors       = require('cors');
const morgan     = require('morgan');
const mongoose   = require('mongoose');
const helmet     = require('helmet');
const rateLimit  = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
require('dotenv').config();

const app = express();

// ─── Sécurité — Headers HTTP ──────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// ─── CORS ────────────────────────────────────────────────────────────────────
app.use(cors({ origin: '*', credentials: false }));

// ─── Rate Limiting global ─────────────────────────────────────────────────────
const limiterGlobal = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  message: { success: false, message: 'Trop de requêtes, réessayez dans 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiterGlobal);

// ─── Rate Limiting strict sur l'authentification ──────────────────────────────
const limiterAuth = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Trop de tentatives de connexion, réessayez dans 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/auth/connexion', limiterAuth);

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(mongoSanitize()); // Protection injection NoSQL
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

// ─── Santé ────────────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status:    'ok',
    timestamp: new Date().toISOString(),
    env:       process.env.NODE_ENV,
  });
});

// ─── 404 ──────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route introuvable' });
});

// ─── Erreurs globales ─────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('❌ Erreur :', err.message);

  // Erreur CORS
  if (err.message === 'Non autorisé par CORS') {
    return res.status(403).json({ success: false, message: 'Accès refusé' });
  }

  // Erreur JWT
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ success: false, message: 'Token invalide' });
  }

  // Erreur Mongoose validation
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({ success: false, message: messages.join(', ') });
  }

  // Erreur duplicate MongoDB
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

mongoose
  .connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
  })
  .then(() => {
    console.log('✅ MongoDB connecté');
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Serveur démarré sur le port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ Erreur MongoDB :', err.message);
    process.exit(1);
  });