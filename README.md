# Database Management

Create MySQL tables from the browser and manage their records, built with Node.js, Express and Sequelize.

## Features

- **Create tables:** give a table name, add as many fields as you need, and pick a type for each (STRING, TEXT, INTEGER, FLOAT, DOUBLE, BOOLEAN, DATE). `id`, `created_at` and `updated_at` are added automatically.
- **Browse tables:** every table appears in the sidebar; click one to see its records.
- **Insert records:** the "Insert record" form is generated from the table's fields.
- **Delete records**, or delete a whole table.
- Tables are read back from MySQL when the server starts, so nothing is lost on restart.

## Project Structure

```
app.js                          # Express server, error handler, startup
util/database.js                # Sequelize connection + auto-creates the database
util/httpError.js
services/tableRegistry.js       # Defines a Sequelize model for each table at runtime
controllers/tableController.js  # list / create / view / drop tables
controllers/recordController.js # insert / delete records
routes/tableRoutes.js           # /api/tables
routes/recordRoutes.js          # /api/tables/:table/records
public/                         # Frontend (index.html, css, js)
```

## API

| Method | Route                              | Description                     |
|--------|------------------------------------|---------------------------------|
| GET    | `/api/tables/types`                | Supported field types           |
| GET    | `/api/tables`                      | List tables                     |
| POST   | `/api/tables`                      | Create a table `{ name, fields: [{ name, type }] }` |
| GET    | `/api/tables/:table`               | Table fields and all records    |
| DELETE | `/api/tables/:table`               | Drop a table                    |
| POST   | `/api/tables/:table/records`       | Insert a record                 |
| DELETE | `/api/tables/:table/records/:id`   | Delete a record                 |

## How to Run

1. Make sure MySQL is running.
2. Copy `.env.example` to `.env` and set `DB_PASSWORD`. The `database_management` database is created automatically on first start.
3. Install and start:
   ```bash
   npm install
   npm run dev   # or: npm start
   ```
4. Open http://localhost:3000
