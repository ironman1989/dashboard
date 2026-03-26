const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema({
  member: {
    type: String,
    required: true,
    trim: true
  },
  pending: {
    type: Number,
    default: 0
  },
  income: {
    type: Number,
    default: 0
  },
  etc: {
    type: Number,
    default: 0
  },
  from3Team: {
    type: Number,
    default: 0
  },
  result: {
    type: Number,
    default: 0
  },
  period: {
    type: String,
    required: true,
    default: 'Mar 2026'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Member', memberSchema);
