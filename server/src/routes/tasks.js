const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { getMyTasks, updateTask, deleteTask } = require('../controllers/taskController');

router.use(auth);

router.get('/my', getMyTasks);
router.put('/:taskId', updateTask);
router.delete('/:taskId', deleteTask);

module.exports = router;
