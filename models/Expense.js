const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  date: { type: Date, default: Date.now },
  type: String, // e.g., "raw material", "plastic cups", etc.
  amount: Number
});

module.exports = mongoose.model('Expense', expenseSchema);
