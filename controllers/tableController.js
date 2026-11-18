const registry = require('../services/tableRegistry');

const describe = (entry) => ({
  name: entry.model.tableName,
  fields: entry.fields,
});

exports.getTypes = (req, res) => {
  res.json(registry.TYPE_NAMES);
};

exports.listTables = (req, res) => {
  res.json(registry.listTables());
};

exports.createTable = async (req, res) => {
  const { name, fields } = req.body;
  const entry = await registry.createTable(String(name || '').trim(), fields);
  res.status(201).json(describe(entry));
};

exports.getTable = async (req, res) => {
  const entry = registry.getTable(req.params.table);
  const records = await entry.model.findAll({ order: [['id', 'ASC']] });
  res.json({ ...describe(entry), records });
};

exports.deleteTable = async (req, res) => {
  await registry.dropTable(req.params.table);
  res.status(204).end();
};
