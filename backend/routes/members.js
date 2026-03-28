const express = require('express');
const router = express.Router();
const Member = require('../models/Member');
const Transaction = require('../models/Transaction');

// GET all members for a period (excluding TOTAL row)
router.get('/', async (req, res) => {
  try {
    const { period } = req.query;
    const filter = { member: { $ne: 'TOTAL' } };
    if (period) filter.period = period;
    const members = await Member.find(filter).sort({ member: 1 });
    res.json(members);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET all available periods
router.get('/periods/list', async (req, res) => {
  try {
    const periods = await Member.distinct('period');
    res.json(periods.sort());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST recalculate income and result from transactions
// Apr 2026+: income = -(sum of tx), result = pending + income + etc
// Before Apr 2026: result = pending + income + etc + from3Team (income kept as-is)
router.post('/recalculate-income', async (req, res) => {
  try {
    const { period } = req.body;
    if (!period) return res.status(400).json({ error: 'period is required' });

    const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const [m, y] = period.split(' ');
    const periodDate = new Date(+y, MONTHS.indexOf(m));
    const aprDate = new Date(2026, 3); // Apr 2026
    const isAutoIncome = periodDate >= aprDate;

    const transactions = await Transaction.find({ period });
    const totals = {};
    transactions.forEach(t => { totals[t.name] = (totals[t.name] || 0) + t.amount; });

    const members = await Member.find({ period, member: { $nin: ['_init', 'TOTAL'] } });
    const updates = await Promise.all(members.map(m => {
      const income = isAutoIncome ? parseFloat((-(totals[m.member] || 0)).toFixed(2)) : m.income;
      const result = isAutoIncome
        ? parseFloat((m.pending + income + m.etc).toFixed(2))
        : parseFloat((m.pending - income + m.etc + m.from3Team).toFixed(2));
      return Member.findOneAndUpdate({ member: m.member, period }, { $set: { income, result } }, { new: true });
    }));
    res.json({ updated: updates.filter(Boolean).length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST seed pending of a period from result of another period
router.post('/seed-pending', async (req, res) => {
  try {
    const { fromPeriod, toPeriod } = req.body;
    if (!fromPeriod || !toPeriod) return res.status(400).json({ error: 'fromPeriod and toPeriod are required' });
    const fromMembers = await Member.find({ period: fromPeriod, member: { $ne: '_init' } });
    const updates = await Promise.all(fromMembers.map(fm =>
      Member.findOneAndUpdate({ member: fm.member, period: toPeriod }, { $set: { pending: fm.result } }, { new: true })
    ));
    res.json({ message: `Seeded pending for ${updates.filter(Boolean).length} members in ${toPeriod}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST copy pending from one period as result of another period
router.post('/carry-forward', async (req, res) => {
  try {
    const { fromPeriod, toPeriod } = req.body;
    if (!fromPeriod || !toPeriod) return res.status(400).json({ error: 'fromPeriod and toPeriod are required' });

    const fromMembers = await Member.find({ period: fromPeriod, member: { $ne: '_init' } });
    if (!fromMembers.length) return res.status(404).json({ error: `No members found for period: ${fromPeriod}` });

    const updates = await Promise.all(fromMembers.map(fm =>
      Member.findOneAndUpdate(
        { member: fm.member, period: toPeriod },
        { $set: { result: fm.pending } },
        { new: true }
      )
    ));

    const updated = updates.filter(Boolean);
    res.json({ message: `Updated result for ${updated.length} members in ${toPeriod}`, updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create or update a member for a period
router.post('/', async (req, res) => {
  try {
    const { member, pending, income, etc, from3Team, result, period } = req.body;
    if (!member || !period) return res.status(400).json({ error: 'member and period are required' });
    const fields = {};
    if (pending !== undefined) fields.pending = pending;
    if (income !== undefined) fields.income = income;
    if (etc !== undefined) fields.etc = etc;
    if (from3Team !== undefined) fields.from3Team = from3Team;
    if (result !== undefined) fields.result = result;
    const updated = await Member.findOneAndUpdate(
      { member: member.trim(), period },
      { $set: fields },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.status(201).json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
