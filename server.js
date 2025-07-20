const express = require('express');
const mongoose = require('mongoose');
const app = express();

const MONGODB_URI = 'mongodb+srv://abhijitdeshmukh501:abhi@cluster0.pnsz7au.mongodb.net/scrubberDB?retryWrites=true&w=majority';

mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch(err => console.error("❌ MongoDB connection error:", err));

const SalesSchema = new mongoose.Schema({
  date: { type: Date, default: Date.now },
  sheets: Number,
  price: Number,
  raw: Number,
  plastic: Number,
  petrol: Number
});

const Sale = mongoose.model('Sale', SalesSchema);

app.use(express.json());
app.use(express.static('public'));

app.post('/submit', async (req, res) => {
  try {
    await Sale.create(req.body);
    res.send('✅ Data saved successfully!');
  } catch (err) {
    res.status(500).send('❌ Error saving data.');
  }
});

app.get('/all', async (req, res) => {
  const sales = await Sale.find();
  res.json(sales);
});

const port = process.env.PORT || 10000;
app.listen(port, () => console.log(`🚀 Server running on port ${port}`));

app.get('/report', async (req, res) => {
  try {
    const allData = await Sale.find().sort({ date: -1 }); // newest first
    res.json(allData);
  } catch (err) {
    res.status(500).send("Error fetching report.");
  }
});

