const express = require('express');
const router = express.Router({ mergeParams: true });
const auth = require('../middleware/auth');
const { createPhase, updatePhase, deletePhase } = require('../controllers/phaseController');
const { createTask } = require('../controllers/taskController');

router.use(auth);

router.post('/', createPhase);
router.put('/:phaseId', updatePhase);
router.delete('/:phaseId', deletePhase);
router.post('/:phaseId/tasks', createTask);

module.exports = router;
