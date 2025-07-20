const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const app = express();

// ✅ MongoDB connection
const MONGODB_URI = 'mongodb+srv://abhijitdeshmukh501:abhi@cluster0.pnsz7au.mongodb.net/scrubberDB?retryWrites=true&w=majority';

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("✅ Connected to MongoDB"))
.catch(err => console.error("❌ MongoDB connection error:", err));

// ✅ Define Mongoose Schema
const SalesSchema = new mongoose.Schema({
  date: { type: Date, default: Date.now },
  sheets: Number,
  price: Number,
  raw: Number,
  plastic: Number,
  petrol: Number
});

const Sale = mongoose.model('Sale', SalesSchema);

// ✅ Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public')); // to serve index.html, report.html etc.

// ✅ Handle form submission
app.post('/submit', async (req, res) => {
  try {
    const { sheets, price, raw, plastic, petrol } = req.body;
    const newSale = new Sale({ sheets, price, raw, plastic, petrol });
    await newSale.save();
    res.send('✅ Data saved successfully!');
  } catch (err) {
    console.error(err);
    res.status(500).send('❌ Error saving data.');
  }
});

// ✅ API to fetch report data
app.get('/report-data', async (req, res) => {
  try {
    const allData = await Sale.find().sort({ date: -1 });
    res.json(allData);
  } catch (err) {
    console.error(err);
    res.status(500).send("❌ Error fetching report data.");
  }
});

// ✅ Fallback route (optional for SPA)
// app.get('*', (req, res) => {
//   res.sendFile(path.join(__dirname, 'public/index.html'));
// });

// ✅ Start server
const port = process.env.PORT || 10000;
app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});
