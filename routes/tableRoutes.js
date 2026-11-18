const express = require('express');
const tableController = require('../controllers/tableController');
const recordRoutes = require('./recordRoutes');

const router = express.Router();

router.get('/types', tableController.getTypes);
router.get('/', tableController.listTables);
router.post('/', tableController.createTable);
router.get('/:table', tableController.getTable);
router.delete('/:table', tableController.deleteTable);

router.use('/:table/records', recordRoutes);

module.exports = router;
