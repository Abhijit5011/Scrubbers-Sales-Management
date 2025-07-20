const express = require('express');
const mongoose = require('mongoose');
const path = require('path');

const app = express();

// MongoDB connection
const MONGODB_URI = 'mongodb+srv://abhijitdeshmukh501:abhi@cluster0.pnsz7au.mongodb.net/scrubberDB?retryWrites=true&w=majority';

mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch(err => console.error("❌ MongoDB connection error:", err));

// Mongoose Schema and Model
const SalesSchema = new mongoose.Schema({
  date: { type: Date, default: Date.now },
  sheets: Number,
  price: Number,
  raw: Number,
  plastic: Number,
  petrol: Number
});

const Sale = mongoose.model('Sale', SalesSchema);

// Middleware
app.use(express.json());
app.use(express.static('public')); // serves index.html and report.html

// POST route to submit data
app.post('/submit', async (req, res) => {
  try {
    await Sale.create(req.body);
    res.send('✅ Data saved successfully!');
  } catch (err) {
    console.error(err);
    res.status(500).send('❌ Error saving data.');
  }
});

// GET route for report data
app.get('/report-data', async (req, res) => {
  try {
    const allData = await Sale.find().sort({ date: -1 }); // newest first
    res.json(allData);
  } catch (err) {
    console.error(err);
    res.status(500).send("❌ Error fetching report.");
  }
});

// Serve report.html explicitly (optional)
app.get('/report', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'report.html'));
});

// Start server
const port = process.env.PORT || 10000;
app.listen(port, () => console.log(`🚀 Server running on port ${port}`));
