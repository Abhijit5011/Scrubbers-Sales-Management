const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors');
const { createCanvas } = require('canvas');
const { PDFDocument } = require('pdf-lib');
const fs = require('fs');
const app = express();

// MongoDB connection
const MONGODB_URI = 'mongodb+srv://abhijitdeshmukh501:abhi@cluster0.pnsz7au.mongodb.net/scrubberDB?retryWrites=true&w=majority';

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("✅ Connected to MongoDB"))
.catch(err => console.error("❌ MongoDB connection error:", err));

// Define Mongoose Schema
const SalesSchema = new mongoose.Schema({
  date: { type: Date, default: Date.now, index: true },
  sheets: { type: Number, required: true, min: 1 },
  price: { type: Number, required: true, min: 60, max: 100 },
  rawMaterialCost: { type: Number, required: true },
  plasticCost: { type: Number, required: true },
  petrolCost: { type: Number, required: true },
  notes: { type: String }
}, { timestamps: true });

const Sale = mongoose.model('Sale', SalesSchema);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.post('/api/sales', async (req, res) => {
  try {
    const productionCostPerSheet = 47;
    const { date, sheets, price, rawMaterialCost, plasticCost, petrolCost, notes } = req.body;
    
    const newSale = new Sale({
      date: date || new Date(),
      sheets,
      price,
      rawMaterialCost,
      plasticCost,
      petrolCost,
      notes
    });

    await newSale.save();
    res.status(201).json({ success: true, message: 'Sale recorded successfully', data: newSale });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Error saving sale data', error: err.message });
  }
});

app.get('/api/sales', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let query = {};

    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const sales = await Sale.find(query).sort({ date: -1 });
    res.json({ success: true, data: sales });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error fetching sales data', error: err.message });
  }
});

app.get('/api/reports/summary', async (req, res) => {
  try {
    const { period } = req.query;
    let dateFilter = {};
    const now = new Date();

    switch (period) {
      case 'today':
        dateFilter.date = { 
          $gte: new Date(now.setHours(0, 0, 0, 0)),
          $lte: new Date(now.setHours(23, 59, 59, 999))
        };
        break;
      case 'month':
        dateFilter.date = {
          $gte: new Date(now.getFullYear(), now.getMonth(), 1),
          $lte: new Date()
        };
        break;
      case 'year':
        dateFilter.date = {
          $gte: new Date(now.getFullYear(), 0, 1),
          $lte: new Date()
        };
        break;
      default:
        // All time
    }

    const summary = await Sale.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: null,
          totalSheets: { $sum: "$sheets" },
          totalSales: { $sum: { $multiply: ["$sheets", "$price"] } },
          totalProductionCost: { $sum: { $multiply: ["$sheets", 47] } },
          totalExpenses: { $sum: { $add: ["$rawMaterialCost", "$plasticCost", "$petrolCost"] } },
          avgPricePerSheet: { $avg: "$price" }
        }
      },
      {
        $project: {
          _id: 0,
          totalSheets: 1,
          totalSales: 1,
          totalProductionCost: 1,
          totalExpenses: 1,
          totalProfit: { $subtract: ["$totalSales", { $add: ["$totalProductionCost", "$totalExpenses"] }] },
          avgPricePerSheet: { $round: ["$avgPricePerSheet", 2] }
        }
      }
    ]);

    res.json({ success: true, data: summary[0] || {} });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Error generating report', error: err.message });
  }
});

app.get('/api/reports/download', async (req, res) => {
  try {
    const { period } = req.query;
    const sales = await Sale.find().sort({ date: -1 });
    
    // Generate PDF report
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([600, 800]);
    const { width, height } = page.getSize();
    
    // Add content to PDF
    page.drawText('Scrubber Business Report', {
      x: 50,
      y: height - 50,
      size: 20,
    });
    
    // Add more content as needed...
    
    const pdfBytes = await pdfDoc.save();
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=scrubber-report.pdf');
    res.send(pdfBytes);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Error generating PDF report', error: err.message });
  }
});

// Start server
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
