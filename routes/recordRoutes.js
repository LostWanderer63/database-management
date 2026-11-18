const express = require('express');
const recordController = require('../controllers/recordController');

const router = express.Router({ mergeParams: true });

router.post('/', recordController.addRecord);
router.delete('/:id', recordController.deleteRecord);

module.exports = router;
