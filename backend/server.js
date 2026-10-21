const express    = require('express');
const cors       = require('cors');
const morgan     = require('morgan');
const mongoose   = require('mongoose');
const helmet     = require('helmet');
const rateLimit  = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
require('dotenv').config();

const app = express();

// Derrière le proxy de Render : sans cela, toutes les requêtes paraissent venir de la même IP
// et les limites de débit ci-dessous s'appliqueraient à tous les utilisateurs à la fois.
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

// Mot de passe oublié : 5 demandes par heure et par adresse IP (évite l'envoi massif d'emails)
const limiterOubli = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { success: false, message: 'Trop de demandes. Réessayez dans une heure.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/auth/mot-de-passe-oublie', limiterOubli);

// Choix du nouveau mot de passe : 10 essais par heure et par IP (limite les tentatives sur les jetons)
const limiterReinit = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Trop de tentatives. Réessayez dans une heure.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/auth/reinitialiser-mot-de-passe', limiterReinit);

// ─── Middleware ───────────────────────────────────────────────────────────────
// Le logo de la boutique (image réduite en base64) dépasse 10 Ko : limite relevée pour cette seule route.
app.use('/api/boutique', express.json({ limit: '200kb' }));
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
app.use('/api/dettes',        require('./routes/dettes'));
app.use('/api/boutique',       require('./routes/boutique'));

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
