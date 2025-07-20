const express = require('express');
const mongoose = require('mongoose');
const app = express();
const port = process.env.PORT || 10000; // Use Render's PORT

// ⚠️ Direct MongoDB URI (for quick use; avoid in production)
mongoose.connect("mongodb+srv://abhijitdeshmukh501:abhi@cluster0.pnsz7au.mongodb.net/scrubberDB?retryWrites=true&w=majority&appName=Cluster0", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("✅ Connected to MongoDB"))
.catch((err) => console.error("❌ MongoDB connection error:", err));

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Mongoose Schema
const sheetSchema = new mongoose.Schema({
  date: { type: Date, default: Date.now },
  sheetsSold: Number,
  sellingPrice: Number, // per sheet
  rawMaterialCost: Number,
  plasticCupsCost: Number,
  petrolCost: Number,
});

const Sheet = mongoose.model('Sheet', sheetSchema);

// API to submit daily sheet data
app.post('/submit', async (req, res) => {
  try {
    const entry = new Sheet(req.body);
    await entry.save();
    res.status(201).send('✅ Entry saved successfully!');
  } catch (error) {
    console.error(error);
    res.status(500).send('❌ Failed to save data');
  }
});

// API to get all data
app.get('/data', async (req, res) => {
  try {
    const data = await Sheet.find().sort({ date: -1 });
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).send('❌ Error fetching data');
  }
});

// Start the server
app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});
