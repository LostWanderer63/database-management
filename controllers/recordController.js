const registry = require('../services/tableRegistry');
const HttpError = require('../util/httpError');

exports.addRecord = async (req, res) => {
  const { model, fields } = registry.getTable(req.params.table);

  // Only accept the table's own fields; empty inputs become NULL.
  const values = {};
  for (const { name } of fields) {
    const value = req.body[name];
    values[name] = value === '' || value === undefined ? null : value;
  }

  const record = await model.create(values);
  res.status(201).json(record);
};

exports.deleteRecord = async (req, res) => {
  const { model } = registry.getTable(req.params.table);
  const deleted = await model.destroy({ where: { id: req.params.id } });
  if (!deleted) throw new HttpError(404, 'Record not found');
  res.status(204).end();
};
