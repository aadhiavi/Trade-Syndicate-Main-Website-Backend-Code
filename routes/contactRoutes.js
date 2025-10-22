const express = require('express');
const { handleFormSubmission, getForms, deleteForm, editForm } = require('./contact');
const router = express.Router();

router.post('/contact', handleFormSubmission);
router.get('/contacts', getForms);
router.delete('/contact/:id', deleteForm);
router.put('/contact/:id', editForm);

module.exports = router;