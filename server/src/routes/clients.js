const express = require('express');
const router  = express.Router();
const auth    = require('../middleware/auth');
const {
  getClients, getClient, getClientSummary,
  createClient, updateClient, deleteClient,
} = require('../controllers/clientController');

router.use(auth);

router.get('/',           getClients);
router.get('/:id',        getClient);
router.get('/:id/summary', getClientSummary);
router.post('/',          createClient);
router.put('/:id',        updateClient);
router.delete('/:id',     deleteClient);

module.exports = router;
