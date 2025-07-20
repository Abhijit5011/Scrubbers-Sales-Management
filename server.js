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
  pricePerSheet: { type: Number } // Added for easier reporting
}, { timestamps: true });

const ExpenseSchema = new mongoose.Schema({
  date: { type: Date, default: Date.now, index: true },
  type: { type: String, enum: ['petrol', 'other'], required: true },
  amount: { type: Number, required: true },
  description: { type: String }
}, { timestamps: true });

const Sale = mongoose.model('Sale', SalesSchema);
const Expense = mongoose.model('Expense', ExpenseSchema);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.post('/api/sales', async (req, res) => {
  try {
    const { date, sheetsSold, totalRevenue } = req.body;
    const pricePerSheet = totalRevenue / sheetsSold;
    
    const newSale = new Sale({
      date: date || new Date(),
      sheetsSold,
      totalRevenue,
      pricePerSheet
    });

    await newSale.save();
    res.status(201).json({ 
      success: true, 
      message: 'Sale recorded successfully',
      data: newSale
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

app.post('/api/expenses', async (req, res) => {
  try {
    const { date, type, amount, description } = req.body;
    
    const newExpense = new Expense({
      date: date || new Date(),
      type,
      amount,
      description: description || `${type} expense`
    });

    await newExpense.save();
    res.status(201).json({ 
      success: true, 
      message: 'Expense recorded successfully',
      data: newExpense
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ 
      success: false, 
      message: 'Error saving expense data', 
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
      case 'week':
        const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
        dateFilter.date = {
          $gte: new Date(startOfWeek.setHours(0, 0, 0, 0)),
          $lte: new Date()
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
        // All time - no date filter
    }

    // Get sales data
    const salesSummary = await Sale.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: null,
          totalSheets: { $sum: "$sheetsSold" },
          totalRevenue: { $sum: "$totalRevenue" },
          totalProductionCost: { $sum: { $multiply: ["$sheetsSold", 47] } },
          avgPricePerSheet: { $avg: "$pricePerSheet" }
        }
      }
    ]);

    // Get expenses data (petrol only)
    const expensesSummary = await Expense.aggregate([
      { 
        $match: { 
          ...dateFilter,
          type: 'petrol'
        } 
      },
      {
        $group: {
          _id: null,
          totalPetrolExpense: { $sum: "$amount" }
        }
      }
    ]);

    const result = {
      ...(salesSummary[0] || { 
        totalSheets: 0,
        totalRevenue: 0,
        totalProductionCost: 0,
        avgPricePerSheet: 0
      }),
      ...(expensesSummary[0] || { totalPetrolExpense: 0 })
    };

    // Calculate profit
    result.totalProfit = result.totalRevenue - result.totalProductionCost - result.totalPetrolExpense;
    result.avgPricePerSheet = result.avgPricePerSheet ? parseFloat(result.avgPricePerSheet.toFixed(2)) : 0;

    res.json({ success: true, data: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ 
      success: false, 
      message: 'Error generating report', 
      error: err.message 
    });
  }
});

app.get('/api/reports/download', async (req, res) => {
  try {
    const { period } = req.query;
    const sales = await Sale.find().sort({ date: -1 });
    const expenses = await Expense.find({ type: 'petrol' }).sort({ date: -1 });
    
    // CSV header
    let csv = 'Report Period,Sheets Sold,Revenue (₹),Production Cost (₹),Petrol Expense (₹),Profit (₹)\n';
    
    // Add summary data
    const response = await fetch(`/api/reports/summary?period=${period}`);
    const result = await response.json();
    
    if (result.success) {
      const data = result.data;
      csv += `${period},${data.totalSheets},${data.totalRevenue},${data.totalProductionCost},${data.totalPetrolExpense},${data.totalProfit}\n\n`;
    }
    
    // Add detailed sales data
    csv += 'Date,Sheets Sold,Revenue (₹),Price/Sheet (₹),Production Cost (₹)\n';
    sales.forEach(sale => {
      const productionCost = sale.sheetsSold * 47;
      csv += `${new Date(sale.date).toLocaleDateString()},${sale.sheetsSold},${sale.totalRevenue},${(sale.totalRevenue/sale.sheetsSold).toFixed(2)},${productionCost}\n`;
    });
    
    // Add petrol expenses
    csv += '\nDate,Petrol Expense (₹),Description\n';
    expenses.forEach(expense => {
      csv += `${new Date(expense.date).toLocaleDateString()},${expense.amount},${expense.description}\n`;
    });
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=scrubber-report-${period}.csv`);
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
