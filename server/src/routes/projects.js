const express = require('express');
const router = express.Router();
const {
  getProjects, getProject, createProject, updateProject, deleteProject, getStats,
  createDriveFolder, saveAgentToDrive,
} = require('../controllers/projectController');
const auth = require('../middleware/auth');

router.use(auth);

router.get('/stats', getStats);
router.get('/', getProjects);
router.get('/:id', getProject);
router.post('/', createProject);
router.post('/:id/drive-folder', createDriveFolder);
router.post('/:id/agents/save-to-drive', saveAgentToDrive);
router.put('/:id', updateProject);
router.delete('/:id', deleteProject);

module.exports = router;
