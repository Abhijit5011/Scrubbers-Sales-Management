const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors');
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
  sheetsSold: { type: Number, required: true, min: 1 },
  totalRevenue: { type: Number, required: true },
  petrolExpense: { type: Number, required: true }
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
    const { date, sheetsSold, totalRevenue, petrolExpense } = req.body;
    
    const newSale = new Sale({
      date: date || new Date(),
      sheetsSold,
      totalRevenue,
      petrolExpense
    });

    await newSale.save();
    res.status(201).json({ 
      success: true, 
      message: 'Sale recorded successfully',
      data: {
        ...newSale.toObject(),
        productionCost: sheetsSold * 47,
        netProfit: totalRevenue - (sheetsSold * 47) - petrolExpense
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ 
      success: false, 
      message: 'Error saving sale data', 
      error: err.message 
    });
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
          totalSheets: { $sum: "$sheetsSold" },
          totalRevenue: { $sum: "$totalRevenue" },
          totalProductionCost: { $sum: { $multiply: ["$sheetsSold", 47] } },
          totalPetrolExpense: { $sum: "$petrolExpense" },
          avgPricePerSheet: { $avg: { $divide: ["$totalRevenue", "$sheetsSold"] } }
        }
      },
      {
        $project: {
          _id: 0,
          totalSheets: 1,
          totalRevenue: 1,
          totalProductionCost: 1,
          totalPetrolExpense: 1,
          totalProfit: { 
            $subtract: [
              "$totalRevenue", 
              { $add: ["$totalProductionCost", "$totalPetrolExpense"] }
            ] 
          },
          avgPricePerSheet: { $round: ["$avgPricePerSheet", 2] }
        }
      }
    ]);

    res.json({ 
      success: true, 
      data: summary[0] || {
        totalSheets: 0,
        totalRevenue: 0,
        totalProductionCost: 0,
        totalPetrolExpense: 0,
        totalProfit: 0,
        avgPricePerSheet: 0
      } 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ 
      success: false, 
      message: 'Error generating report', 
      error: err.message 
    });
  }
});

// CSV download endpoint
app.get('/api/reports/download', async (req, res) => {
  try {
    const sales = await Sale.find().sort({ date: -1 });
    
    // CSV header
    let csv = 'Date,Sheets Sold,Revenue (₹),Production Cost (₹),Petrol Expense (₹),Profit (₹)\n';
    
    // CSV rows
    sales.forEach(sale => {
      const productionCost = sale.sheetsSold * 47;
      const profit = sale.totalRevenue - productionCost - sale.petrolExpense;
      csv += `${new Date(sale.date).toLocaleDateString()},${sale.sheetsSold},${sale.totalRevenue},${productionCost},${sale.petrolExpense},${profit}\n`;
    });
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=scrubber-report.csv');
    res.send(csv);
  } catch (err) {
    console.error(err);
    res.status(500).json({ 
      success: false, 
      message: 'Error generating report', 
      error: err.message 
    });
  }
});

// Start server
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
