const express = require('express');
const router = express.Router();
const { register, login, refresh, me, updateProfile, changePassword } = require('../controllers/authController');
const auth = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refresh);
router.get('/me', auth, me);
router.put('/profile', auth, updateProfile);
router.put('/password', auth, changePassword);

module.exports = router;
