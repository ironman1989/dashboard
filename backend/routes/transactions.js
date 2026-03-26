const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');

// GET all transactions for a period
router.get('/', async (req, res) => {
  try {
    const { period } = req.query;
    const filter = period ? { period } : {};
    const transactions = await Transaction.find(filter).sort({ _id: 1 });
    res.json(transactions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create new transaction
router.post('/', async (req, res) => {
  try {
    const { date, name, amount, transactionHash, period } = req.body;
    if (!date || !name || amount === undefined || !period) {
      return res.status(400).json({ error: 'date, name, amount and period are required' });
    }
    const transaction = new Transaction({
      date, name: name.trim(),
      amount: parseFloat(amount),
      transactionHash: transactionHash || null,
      period
    });
    const saved = await transaction.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET transaction by ID
router.get('/:id', async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id);
    if (!transaction) return res.status(404).json({ error: 'Transaction not found' });
    res.json(transaction);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
