const express = require('express');
const router  = express.Router();
const auth    = require('../middleware/auth');
const {
  getInvoices, getInvoice, createInvoice, updateInvoice, deleteInvoice, downloadInvoicePDF,
} = require('../controllers/invoiceController');

router.use(auth);
router.get('/',          getInvoices);
router.post('/',         createInvoice);
router.get('/:id/pdf',   downloadInvoicePDF);   // AVANT /:id pour éviter conflit
router.get('/:id',       getInvoice);
router.put('/:id',       updateInvoice);
router.delete('/:id',    deleteInvoice);

module.exports = router;
