// controllers/usersController.js
import pool from '../db.js';

// ➕ Create user
export const createUser = async (req, res) => {
  const { name, email, role} = req.body;

  if (!name || !email || !role) {
    return res.status(400).json({ error: 'Name, email, and role are required' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO users (name, email, role) VALUES ($1, $2, $3) RETURNING *',
      [name, email, role]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating user:', err);
    res.status(500).json({ error: 'Failed to create user' });
  }
};

// 🔍 Get user by ID
export const getUserById = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching user by ID:', err);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
};

// 🔍 Get user(s) by name (case-insensitive)
export const getUserByName = async (req, res) => {
  const { name } = req.params;

  try {
    const result = await pool.query('SELECT * FROM users WHERE LOWER(name) = LOWER($1)', [name]);
    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Error fetching user by name:', err);
    res.status(500).json({ error: 'Failed to fetch user(s)' });
  }
};

// 🔍 Get users by role
export const getUsersByRole = async (req, res) => {
  const { role } = req.params;

  try {
    const result = await pool.query('SELECT * FROM users WHERE role = $1', [role]);
    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Error fetching users by role:', err);
    res.status(500).json({ error: 'Failed to fetch users by role' });
  }
};

// 📥 Get all users
export const getAllUsers = async (_req, res) => {
  try {
    const result = await pool.query('SELECT * FROM users ORDER BY id');
    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Error fetching all users:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};
