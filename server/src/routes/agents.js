const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { projectIntake, applyAnalysis } = require('../agents/projectIntake');
const { generateStructure } = require('../agents/projectStructure');
const { generateContract }  = require('../agents/contractGenerator');
const { composeEmail }      = require('../agents/emailComposer');
const { generateSpec }      = require('../agents/specGenerator');

router.use(auth);

// Agent principal : analyse complète cahier des charges
router.post('/intake', projectIntake);

// Ré-applique une analyse standalone déjà générée à un projet (sans relancer le LLM)
router.post('/apply-analysis', applyAnalysis);

// Agents utilitaires (utilisés aussi depuis ProjectDetail)
router.post('/structure', generateStructure);
router.post('/contract',  generateContract);
router.post('/email',     composeEmail);
router.post('/spec',      generateSpec);

module.exports = router;
