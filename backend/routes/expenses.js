const express = require('express');
const jwt = require('jsonwebtoken');
const { getConnection } = require('../config/database');

const router = express.Router();

// Middleware to verify JWT token
function verifyToken(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'No token provided' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = decoded.id;
        next();
    } catch (error) {
        res.status(401).json({ message: 'Invalid token' });
    }
}

// Get all expenses for a user
router.get('/', verifyToken, async (req, res) => {
    try {
        const connection = await getConnection();

        const [expenses] = await connection.query(
            'SELECT * FROM expenses WHERE user_id = ? ORDER BY date DESC',
            [req.userId]
        );

        connection.release();

        res.json(expenses);
    } catch (error) {
        console.error('Error fetching expenses:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Add a new expense
router.post('/', verifyToken, async (req, res) => {
    const { category, amount, description, date } = req.body;

    try {
        if (!category || !amount || !description || !date) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        const connection = await getConnection();

        await connection.query(
            'INSERT INTO expenses (user_id, category, amount, description, date) VALUES (?, ?, ?, ?, ?)',
            [req.userId, category, amount, description, date]
        );

        connection.release();

        res.status(201).json({ message: 'Expense added successfully' });
    } catch (error) {
        console.error('Error adding expense:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Delete an expense
router.delete('/:id', verifyToken, async (req, res) => {
    const { id } = req.params;

    try {
        const connection = await getConnection();

        // Check if expense belongs to the user
        const [expense] = await connection.query(
            'SELECT * FROM expenses WHERE id = ? AND user_id = ?',
            [id, req.userId]
        );

        if (expense.length === 0) {
            connection.release();
            return res.status(403).json({ message: 'Expense not found' });
        }

        // Delete the expense
        await connection.query('DELETE FROM expenses WHERE id = ? AND user_id = ?', [id, req.userId]);

        connection.release();

        res.json({ message: 'Expense deleted successfully' });
    } catch (error) {
        console.error('Error deleting expense:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Delete all expenses for a user
router.delete('/delete-all', verifyToken, async (req, res) => {
    try {
        const connection = await getConnection();

        await connection.query('DELETE FROM expenses WHERE user_id = ?', [req.userId]);

        connection.release();

        res.json({ message: 'All expenses deleted successfully' });
    } catch (error) {
        console.error('Error deleting all expenses:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

module.exports = router;
