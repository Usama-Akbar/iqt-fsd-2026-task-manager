const express = require('express');
const { pool } = require('../db');

const router = express.Router();

function parseTask(body, { partial }) {
  const errors = [];
  const data = {};

  if (body.title !== undefined || !partial) {
    if (typeof body.title !== 'string' || !body.title.trim()) errors.push('title is required');
    else if (body.title.trim().length > 200) errors.push('title must be 200 characters or fewer');
    else data.title = body.title.trim();
  }
  if (body.description !== undefined) {
    if (typeof body.description !== 'string') errors.push('description must be a string');
    else data.description = body.description.trim();
  }
  if (body.completed !== undefined) {
    if (typeof body.completed !== 'boolean') errors.push('completed must be a boolean');
    else data.completed = body.completed;
  }
  if (partial && !errors.length && !Object.keys(data).length) errors.push('no valid fields to update');

  return { data, errors };
}

function parseId(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: 'invalid task id' });
    return null;
  }
  return id;
}

// GET /api/tasks — list all tasks
router.get('/', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM tasks ORDER BY completed ASC, created_at DESC');
  res.json(rows);
});

// POST /api/tasks — create a task
router.post('/', async (req, res) => {
  const { data, errors } = parseTask(req.body, { partial: false });
  if (errors.length) return res.status(400).json({ error: errors.join(', ') });

  const { rows } = await pool.query(
    'INSERT INTO tasks (title, description, completed) VALUES ($1, $2, $3) RETURNING *',
    [data.title, data.description ?? '', data.completed ?? false]
  );
  res.status(201).json(rows[0]);
});

// PUT /api/tasks/:id — update title, description and/or completed
router.put('/:id', async (req, res) => {
  const id = parseId(req, res);
  if (id === null) return;

  const { data, errors } = parseTask(req.body, { partial: true });
  if (errors.length) return res.status(400).json({ error: errors.join(', ') });

  const fields = Object.keys(data);
  const sets = fields.map((f, i) => `${f} = $${i + 1}`).join(', ');
  const { rows } = await pool.query(
    `UPDATE tasks SET ${sets}, updated_at = NOW() WHERE id = $${fields.length + 1} RETURNING *`,
    [...fields.map((f) => data[f]), id]
  );
  if (!rows.length) return res.status(404).json({ error: 'task not found' });
  res.json(rows[0]);
});

// DELETE /api/tasks/:id — delete a task
router.delete('/:id', async (req, res) => {
  const id = parseId(req, res);
  if (id === null) return;

  const { rowCount } = await pool.query('DELETE FROM tasks WHERE id = $1', [id]);
  if (!rowCount) return res.status(404).json({ error: 'task not found' });
  res.status(204).end();
});

module.exports = router;
