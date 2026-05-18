// dashboard.js
const r1 = require('express').Router();
const { proteger, tenantScope } = require('../middleware/auth');
r1.use(proteger, tenantScope);
r1.get('/', require('../controllers/dashboardController').obtenir);
module.exports = r1;
