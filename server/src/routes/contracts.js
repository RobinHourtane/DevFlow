const express = require('express');
const router  = express.Router();
const auth    = require('../middleware/auth');
const {
  getContracts, getContract, updateContract, deleteContract, downloadContractPDF,
} = require('../controllers/contractController');

router.use(auth);
router.get('/',          getContracts);
router.get('/:id/pdf',   downloadContractPDF);   // AVANT /:id pour éviter conflit
router.get('/:id',       getContract);
router.put('/:id',       updateContract);
router.delete('/:id',    deleteContract);

module.exports = router;
