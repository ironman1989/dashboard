const express = require('express');
const router = express.Router();
const Member = require('../models/Member');

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
    const updated = await Member.findOneAndUpdate(
      { member: member.trim(), period },
      { pending: pending || 0, income: income || 0, etc: etc || 0, from3Team: from3Team || 0, result: result || 0 },
      { upsert: true, new: true }
    );
    res.status(201).json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
