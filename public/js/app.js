const API = '/api/tables';

const $ = (id) => document.getElementById(id);

const tableList = $('tableList');
const emptyTables = $('emptyTables');
const currentTableName = $('currentTableName');
const placeholder = $('placeholder');
const recordsTable = $('recordsTable');
const recordsHead = $('recordsHead');
const recordsBody = $('recordsBody');
const openInsertRecord = $('openInsertRecord');
const deleteTableBtn = $('deleteTableBtn');

const createTableModal = $('createTableModal');
const createTableForm = $('createTableForm');
const tableNameInput = $('tableName');
const fieldRows = $('fieldRows');
const createTableError = $('createTableError');

const addRecordModal = $('addRecordModal');
const addRecordForm = $('addRecordForm');
const recordInputs = $('recordInputs');
const addRecordError = $('addRecordError');

let types = ['STRING'];
let current = null;

async function request(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `Request failed (${res.status})`);
  }
  return res.status === 204 ? null : res.json();
}

function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  Object.assign(node, props);
  for (const child of [].concat(children)) {
    node.append(child);
  }
  return node;
}

function showError(node, message) {
  node.textContent = message;
  node.hidden = !message;
}

function openModal(modal) {
  modal.hidden = false;
  const firstInput = modal.querySelector('input, select');
  if (firstInput) firstInput.focus();
}

function closeModal(modal) {
  modal.hidden = true;
}

document.querySelectorAll('[data-close]').forEach((btn) => {
  btn.addEventListener('click', () => closeModal(btn.closest('.overlay')));
});

document.querySelectorAll('.overlay').forEach((overlay) => {
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal(overlay);
  });
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') document.querySelectorAll('.overlay').forEach(closeModal);
});

async function loadTables(selectName) {
  const names = await request(API);
  tableList.replaceChildren(
    ...names.map((name) => {
      const li = el('li', { textContent: name });
      if (current && current.name === name) li.classList.add('active');
      li.addEventListener('click', () => selectTable(name));
      return li;
    })
  );
  emptyTables.hidden = names.length > 0;

  if (selectName) await selectTable(selectName);
}

function formatValue(value, type) {
  if (value === null || value === undefined) return '';
  if (type === 'DATE') return new Date(value).toLocaleString();
  if (type === 'BOOLEAN') return value ? 'true' : 'false';
  return String(value);
}

function renderRecords() {
  const { name, fields, records } = current;

  currentTableName.textContent = name;
  placeholder.hidden = true;
  recordsTable.hidden = false;
  openInsertRecord.hidden = false;
  deleteTableBtn.hidden = false;

  [...tableList.children].forEach((li) => li.classList.toggle('active', li.textContent === name));

  const columns = [...fields, { name: 'created_at', type: 'DATE' }, { name: 'updated_at', type: 'DATE' }];

  recordsHead.replaceChildren(...columns.map((c) => el('th', { textContent: c.name })), el('th'));

  if (records.length === 0) {
    recordsBody.replaceChildren(
      el('tr', {}, el('td', { colSpan: columns.length + 1, className: 'muted', textContent: 'No records yet' }))
    );
    return;
  }

  recordsBody.replaceChildren(
    ...records.map((record) => {
      const deleteBtn = el('button', { type: 'button', className: 'row-delete', textContent: 'Delete' });
      deleteBtn.addEventListener('click', () => deleteRecord(record.id));

      return el('tr', {}, [
        ...columns.map((c) => el('td', { textContent: formatValue(record[c.name], c.type) })),
        el('td', {}, deleteBtn),
      ]);
    })
  );
}

async function selectTable(name) {
  try {
    current = await request(`${API}/${encodeURIComponent(name)}`);
    renderRecords();
  } catch (err) {
    alert(err.message);
  }
}

function clearSelection() {
  current = null;
  currentTableName.textContent = '';
  placeholder.hidden = false;
  recordsTable.hidden = true;
  openInsertRecord.hidden = true;
  deleteTableBtn.hidden = true;
}

async function deleteRecord(id) {
  try {
    await request(`${API}/${encodeURIComponent(current.name)}/records/${id}`, { method: 'DELETE' });
    current.records = current.records.filter((r) => r.id !== id);
    renderRecords();
  } catch (err) {
    alert(err.message);
  }
}

deleteTableBtn.addEventListener('click', async () => {
  if (!current) return;
  if (!confirm(`Delete table "${current.name}" and all of its records? This cannot be undone.`)) return;
  try {
    await request(`${API}/${encodeURIComponent(current.name)}`, { method: 'DELETE' });
    clearSelection();
    await loadTables();
  } catch (err) {
    alert(err.message);
  }
});

function addFieldRow(name = '', type = 'STRING') {
  const nameInput = el('input', { type: 'text', placeholder: 'field name', value: name, required: true, autocomplete: 'off' });
  nameInput.className = 'field-name';

  const typeSelect = el(
    'select',
    { className: 'field-type' },
    types.map((t) => el('option', { value: t, textContent: t, selected: t === type }))
  );

  const removeBtn = el('button', { type: 'button', className: 'remove-field', textContent: '✕', title: 'Remove field' });
  const row = el('div', { className: 'field-row' }, [nameInput, el('div', {}, [typeSelect, removeBtn])]);
  removeBtn.addEventListener('click', () => {
    if (fieldRows.children.length > 1) row.remove();
  });

  fieldRows.append(row);
  return nameInput;
}

$('openCreateTable').addEventListener('click', () => {
  createTableForm.reset();
  fieldRows.replaceChildren();
  addFieldRow();
  showError(createTableError, '');
  openModal(createTableModal);
});

$('addFieldBtn').addEventListener('click', (e) => {
  e.preventDefault();
  addFieldRow().focus();
});

createTableForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = tableNameInput.value.trim();
  const fields = [...fieldRows.children].map((row) => ({
    name: row.querySelector('.field-name').value.trim(),
    type: row.querySelector('.field-type').value,
  }));

  try {
    const created = await request(API, { method: 'POST', body: JSON.stringify({ name, fields }) });
    closeModal(createTableModal);
    await loadTables(created.name);
  } catch (err) {
    showError(createTableError, err.message);
  }
});

function inputFor(field) {
  const id = `record-${field.name}`;

  if (field.type === 'BOOLEAN') {
    const input = el('input', { type: 'checkbox', id, name: field.name });
    return el('div', { className: 'record-input' }, el('label', { className: 'checkbox-label', htmlFor: id }, [input, field.name]));
  }

  const input = el('input', { id, name: field.name, placeholder: field.name, autocomplete: 'off' });
  if (field.type === 'INTEGER') {
    input.type = 'number';
    input.step = '1';
  } else if (field.type === 'FLOAT' || field.type === 'DOUBLE') {
    input.type = 'number';
    input.step = 'any';
  } else if (field.type === 'DATE') {
    input.type = 'datetime-local';
    input.title = field.name;
  } else {
    input.type = 'text';
  }
  return el('div', { className: 'record-input' }, input);
}

openInsertRecord.addEventListener('click', () => {
  if (!current) return;
  recordInputs.replaceChildren(...current.fields.map(inputFor));
  showError(addRecordError, '');
  openModal(addRecordModal);
});

addRecordForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const values = {};
  for (const field of current.fields) {
    const input = addRecordForm.elements[field.name];
    if (field.type === 'BOOLEAN') values[field.name] = input.checked;
    else if (field.type === 'DATE') values[field.name] = input.value ? new Date(input.value).toISOString() : '';
    else values[field.name] = input.value.trim();
  }

  try {
    const record = await request(`${API}/${encodeURIComponent(current.name)}/records`, {
      method: 'POST',
      body: JSON.stringify(values),
    });
    current.records.push(record);
    renderRecords();
    closeModal(addRecordModal);
  } catch (err) {
    showError(addRecordError, err.message);
  }
});

window.addEventListener('DOMContentLoaded', async () => {
  try {
    types = await request(`${API}/types`);
    await loadTables();
  } catch (err) {
    alert(`Could not reach the server: ${err.message}`);
  }
});
