const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { getCalendarEvents } = require('../controllers/calendarController');

router.use(auth);
router.get('/', getCalendarEvents);

module.exports = router;
