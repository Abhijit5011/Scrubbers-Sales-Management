const mongoose = require('mongoose');

const saleSchema = new mongoose.Schema({
  date: { type: Date, default: Date.now },
  sheetsSold: Number,
  sellingPrice: Number
});

module.exports = mongoose.model('Sale', saleSchema);
