// Keeps a Sequelize model for every user-created table.
// Tables are defined at runtime, and rebuilt from the database on startup.
const { DataTypes } = require('sequelize');
const sequelize = require('../util/database');
const HttpError = require('../util/httpError');

const NAME_PATTERN = /^[A-Za-z_][A-Za-z0-9_]{0,62}$/;
const RESERVED_COLUMNS = new Set(['id', 'created_at', 'updated_at']);

const TYPES = {
  STRING: DataTypes.STRING,
  TEXT: DataTypes.TEXT,
  INTEGER: DataTypes.INTEGER,
  FLOAT: DataTypes.FLOAT,
  DOUBLE: DataTypes.DOUBLE,
  BOOLEAN: DataTypes.BOOLEAN,
  DATE: DataTypes.DATE,
};

const VALIDATORS = {
  INTEGER: { isInt: { msg: 'must be a whole number' } },
  FLOAT: { isFloat: { msg: 'must be a number' } },
  DOUBLE: { isFloat: { msg: 'must be a number' } },
  DATE: { isDate: { msg: 'must be a valid date' } },
};

const tables = new Map(); // tableName -> { model, fields: [{ name, type }] }

function sqlTypeToKey(sqlType) {
  const t = sqlType.toUpperCase();
  if (t.startsWith('TINYINT(1)') || t === 'BOOLEAN') return 'BOOLEAN';
  if (t.startsWith('VARCHAR')) return 'STRING';
  if (t.includes('TEXT')) return 'TEXT';
  if (t.startsWith('DOUBLE')) return 'DOUBLE';
  if (t.startsWith('FLOAT') || t.startsWith('REAL')) return 'FLOAT';
  if (t.includes('INT')) return 'INTEGER';
  if (t.startsWith('DATE') || t.startsWith('TIMESTAMP')) return 'DATE';
  return 'STRING';
}

function defineModel(name, fields) {
  const attributes = {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
  };
  for (const field of fields) {
    attributes[field.name] = { type: TYPES[field.type], allowNull: true };
    if (VALIDATORS[field.type]) attributes[field.name].validate = VALIDATORS[field.type];
  }

  const model = sequelize.define(name, attributes, {
    tableName: name,
    freezeTableName: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  });

  const entry = { model, fields };
  tables.set(name, entry);
  return entry;
}

function findTableName(name) {
  const lower = String(name).toLowerCase();
  return [...tables.keys()].find((t) => t.toLowerCase() === lower);
}

function validateDefinition(name, fields) {
  if (!NAME_PATTERN.test(name || '')) {
    throw new HttpError(400, 'Table name must start with a letter or _ and contain only letters, numbers and _');
  }
  if (findTableName(name)) {
    throw new HttpError(409, `Table "${name}" already exists`);
  }
  if (!Array.isArray(fields) || fields.length === 0) {
    throw new HttpError(400, 'Add at least one field');
  }

  const seen = new Set();
  for (const field of fields) {
    if (!NAME_PATTERN.test(field.name || '')) {
      throw new HttpError(400, `Invalid field name "${field.name || ''}"`);
    }
    const lower = field.name.toLowerCase();
    if (RESERVED_COLUMNS.has(lower)) {
      throw new HttpError(400, `"${field.name}" is added automatically, choose another field name`);
    }
    if (seen.has(lower)) {
      throw new HttpError(400, `Duplicate field name "${field.name}"`);
    }
    if (!TYPES[field.type]) {
      throw new HttpError(400, `Unsupported type "${field.type}" for field "${field.name}"`);
    }
    seen.add(lower);
  }
}

exports.TYPE_NAMES = Object.keys(TYPES);

exports.loadExistingTables = async () => {
  const queryInterface = sequelize.getQueryInterface();
  const existing = await queryInterface.showAllTables();

  for (const t of existing) {
    const name = typeof t === 'string' ? t : t.tableName;
    const columns = await queryInterface.describeTable(name);
    const columnNames = Object.keys(columns);

    // Only pick up tables shaped like the ones this app creates.
    if (!['id', 'created_at', 'updated_at'].every((c) => columnNames.includes(c))) continue;

    const fields = columnNames
      .filter((c) => !RESERVED_COLUMNS.has(c))
      .map((c) => ({ name: c, type: sqlTypeToKey(columns[c].type) }));
    defineModel(name, fields);
  }
};

exports.listTables = () => [...tables.keys()].sort((a, b) => a.localeCompare(b));

exports.getTable = (name) => {
  const entry = tables.get(findTableName(name));
  if (!entry) throw new HttpError(404, `Table "${name}" not found`);
  return entry;
};

exports.createTable = async (name, rawFields) => {
  const fields = (rawFields || []).map((f) => ({
    name: String(f.name || '').trim(),
    type: String(f.type || '').trim().toUpperCase(),
  }));
  validateDefinition(name, fields);

  const entry = defineModel(name, fields);
  try {
    await entry.model.sync();
  } catch (err) {
    tables.delete(name);
    sequelize.modelManager.removeModel(entry.model);
    throw err;
  }
  return entry;
};

exports.dropTable = async (name) => {
  const entry = exports.getTable(name);
  await entry.model.drop();
  sequelize.modelManager.removeModel(entry.model);
  tables.delete(entry.model.tableName);
};
