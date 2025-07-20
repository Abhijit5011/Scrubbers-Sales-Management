require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const Sale = require('./models/Sale');
const Expense = require('./models/Expense');

const app = express();
const port = process.env.PORT || 3000;

// DB Connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log("Connected to MongoDB"))
  .catch(err => console.error("MongoDB connection error:", err));

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Routes
app.post('/sale', async (req, res) => {
  const { sheetsSold, sellingPrice } = req.body;
  const sale = new Sale({ sheetsSold, sellingPrice });
  await sale.save();
  res.send('Sale saved');
});

app.post('/expense', async (req, res) => {
  const { type, amount } = req.body;
  const expense = new Expense({ type, amount });
  await expense.save();
  res.send('Expense saved');
});

app.get('/report', async (req, res) => {
  const sales = await Sale.find();
  const expenses = await Expense.find();

  res.json({ sales, expenses });
});

// Start server
app.listen(port, () => console.log(`Server running on port ${port}`));
