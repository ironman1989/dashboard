const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  date: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  amount: {
    type: Number,
    required: true
  },
  transactionHash: {
    type: String,
    default: null
  },
  period: {
    type: String,
    required: true,
    default: 'Mar 2026'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Transaction', transactionSchema);
