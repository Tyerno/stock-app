const router = require('express').Router();
const { proteger, tenantScope } = require('../middleware/auth');
router.use(proteger, tenantScope);
router.get('/', require('../controllers/alertesController').lister);
module.exports = router;
