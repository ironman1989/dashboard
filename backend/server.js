require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const transactionsRouter = require('./routes/transactions');
const membersRouter = require('./routes/members');
const authRouter = require('./routes/auth');
const authMiddleware = require('./middleware/auth');
const Transaction = require('./models/Transaction');
const Member = require('./models/Member');

const app = express();
const PORT = 3000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/mar2025dashboard';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Connect to MongoDB
mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('Connected to MongoDB at', MONGO_URI);
  })
  .catch(err => {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  });

// Public routes
app.use('/api/auth', authRouter);

// Protected routes
app.use('/api/transactions', authMiddleware, transactionsRouter);
app.use('/api/members', authMiddleware, membersRouter);

// Summary endpoint (protected)
app.get('/api/summary', authMiddleware, async (req, res) => {
  try {
    const { period } = req.query;
    const txFilter = period ? { period } : {};
    const mbFilter = { member: { $ne: 'TOTAL' }, ...(period ? { period } : {}) };
    const transactions = await Transaction.find(txFilter);
    const members = await Member.find(mbFilter);

    const totalTransactions = transactions.length;
    const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);
    const realMembers = members.filter(m => m.member !== '_init');
    const totalResult = realMembers.reduce((sum, m) => sum + m.result, 0);
    const positiveCount = realMembers.filter(m => m.result > 0).length;
    const negativeCount = realMembers.filter(m => m.result < 0).length;

    res.json({
      totalTransactions,
      totalAmount: parseFloat(totalAmount.toFixed(2)),
      totalResult: parseFloat(totalResult.toFixed(2)),
      totalMembers: realMembers.length,
      positiveMembers: positiveCount,
      negativeMembers: negativeCount
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const DEBANK_API_KEY = process.env.DEBANK_API_KEY || '';

// TX Lookup (protected)
app.get('/api/tx-lookup', authMiddleware, async (req, res) => {
  try {
    let { hash } = req.query;
    if (!hash) return res.status(400).json({ error: 'hash is required' });

    const match = hash.match(/0x[a-fA-F0-9]{64}/);
    if (!match) return res.status(400).json({ error: 'Invalid transaction hash' });
    const txHash = match[0];

    if (!DEBANK_API_KEY) return res.status(500).json({ error: 'DeBank API key not configured. Set DEBANK_API_KEY env variable.' });

    const isBsc = hash.includes('bscscan');
    const chainId = isBsc ? 'bsc' : 'eth';

    // Call DeBank explain_tx to decode the transaction
    const debankRes = await fetch('https://pro-openapi.debank.com/v1/wallet/explain_tx', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'AccessKey': DEBANK_API_KEY },
      body: JSON.stringify({ chain_id: chainId, tx_id: txHash }),
      signal: AbortSignal.timeout(10000)
    });

    if (!debankRes.ok) {
      const err = await debankRes.text();
      return res.status(debankRes.status).json({ error: `DeBank error: ${err}` });
    }

    const debankData = await debankRes.json();

    // Extract token transfers — prefer sends (outgoing), then receives
    const transfers = debankData.sends?.length > 0 ? debankData.sends : debankData.receives;

    if (transfers && transfers.length > 0) {
      // Pick the largest token transfer by USD value
      const top = transfers.sort((a, b) => (b.usd_value || 0) - (a.usd_value || 0))[0];
      const amount = parseFloat((top.amount || top.usd_value || 0).toFixed(2));
      const symbol = top.token_id ? (top.token_id.length < 10 ? top.token_id.toUpperCase() : 'TOKEN') : 'TOKEN';
      return res.json({ amount, usd_value: parseFloat((top.usd_value || amount).toFixed(2)), type: symbol });
    }

    res.status(404).json({ error: 'No token transfers found in this transaction' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// One-time data fix: seed pending from previous period result (no auth, localhost only)
app.get('/api/fix-pending', async (req, res) => {
  try {
    const { from, to } = req.query;
    if (!from || !to) return res.status(400).json({ error: 'from and to query params required' });
    const fromMembers = await Member.find({ period: from, member: { $nin: ['_init', 'TOTAL'] } });
    const results = [];
    for (const fm of fromMembers) {
      const updated = await Member.findOneAndUpdate(
        { member: fm.member, period: to },
        { $set: { pending: fm.result } },
        { new: true }
      );
      if (updated) results.push({ member: fm.member, pending: fm.result });
    }
    res.json({ updated: results.length, results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
