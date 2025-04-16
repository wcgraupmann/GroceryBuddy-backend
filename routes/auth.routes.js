const express = require('express');
const router = express.Router();
const db = require('../models/db');
const authController = require('../controllers/auth.controller')(db);

router.post('/register', authController.registerUser);

module.exports = router;
