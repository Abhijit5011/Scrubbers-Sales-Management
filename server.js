require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');

const app = express();

// Database connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://abhijitdeshmukh501:abhi@cluster0.pnsz7au.mongodb.net/scrubberDB?retryWrites=true&w=majority';

mongoose.connect(MONGODB_URI, { 
  useNewUrlParser: true, 
  useUnifiedTopology: true,
  retryWrites: true,
  w: 'majority'
})
.then(() => console.log("✅ Connected to MongoDB"))
.catch(err => console.error("❌ MongoDB connection error:", err));

// Middleware
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.static('public'));

// Schemas
const SalesSchema = new mongoose.Schema({
  date: { type: Date, default: Date.now, required: true },
  customer: { type: String, default: 'Walk-in' },
  sheets: { type: Number, required: true, min: 1 },
  price: { type: Number, required: true, min: 60, max: 100 },
  total: { type: Number },
  profit: { type: Number }
}, { timestamps: true });

const ExpenseSchema = new mongoose.Schema({
  date: { type: Date, default: Date.now, required: true },
  type: { 
    type: String, 
    required: true,
    enum: ['raw', 'plastic', 'petrol', 'other']
  },
  amount: { type: Number, required: true, min: 0 },
  notes: { type: String }
}, { timestamps: true });

const SettingSchema = new mongoose.Schema({
  productionCost: { type: Number, default: 47 },
  defaultPrice: { type: Number, default: 80 }
});

// Models
const Sale = mongoose.model('Sale', SalesSchema);
const Expense = mongoose.model('Expense', ExpenseSchema);
const Setting = mongoose.model('Setting', SettingSchema);

// Initialize settings if they don't exist
async function initializeSettings() {
  const count = await Setting.countDocuments();
  if (count === 0) {
    await Setting.create({});
    console.log('Initialized default settings');
  }
}

// Routes

// Sales Routes
app.post('/api/sales', async (req, res) => {
  try {
    const settings = await Setting.findOne();
    const productionCost = settings?.productionCost || 47;
    
    const { date, customer, sheets, price } = req.body;
    const total = sheets * price;
    const profit = total - (sheets * productionCost);
    
    const sale = await Sale.create({ 
      date, 
      customer, 
      sheets, 
      price, 
      total, 
      profit 
    });
    
    res.status(201).json({
      success: true,
      message: 'Sale recorded successfully',
      data: sale
    });
  } catch (err) {
    console.error('Error creating sale:', err);
    res.status(500).json({
      success: false,
      message: 'Error recording sale',
      error: err.message
    });
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
    res.json({
      success: true,
      count: sales.length,
      data: sales
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Error fetching sales',
      error: err.message
    });
  }
});

// Expense Routes
app.post('/api/expenses', async (req, res) => {
  try {
    const { date, type, amount, notes } = req.body;
    const expense = await Expense.create({ date, type, amount, notes });
    
    res.status(201).json({
      success: true,
      message: 'Expense recorded successfully',
      data: expense
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Error recording expense',
      error: err.message
    });
  }
});

app.get('/api/expenses', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let query = {};
    
    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    
    const expenses = await Expense.find(query).sort({ date: -1 });
    res.json({
      success: true,
      count: expenses.length,
      data: expenses
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Error fetching expenses',
      error: err.message
    });
  }
});

// Report Routes
app.get('/api/reports/summary', async (req, res) => {
  try {
    const { period } = req.query;
    let dateFilter = {};
    let groupFormat = {};
    
    // Set date range based on period
    const now = new Date();
    switch (period) {
      case 'today':
        dateFilter = { 
          date: { 
            $gte: new Date(now.setHours(0, 0, 0, 0)),
            $lte: new Date(now.setHours(23, 59, 59, 999))
          }
        };
        break;
      case 'week':
        const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
        dateFilter = {
          date: {
            $gte: new Date(startOfWeek.setHours(0, 0, 0, 0)),
            $lte: new Date()
          }
        };
        break;
      case 'month':
        dateFilter = {
          date: {
            $gte: new Date(now.getFullYear(), now.getMonth(), 1),
            $lte: new Date()
          }
        };
        break;
      case 'year':
        dateFilter = {
          date: {
            $gte: new Date(now.getFullYear(), 0, 1),
            $lte: new Date()
          }
        };
        break;
      default:
        // No date filter for all time
    }
    
    // Get sales summary
    const salesSummary = await Sale.aggregate([
      { $match: dateFilter },
      { 
        $group: {
          _id: null,
          totalSheets: { $sum: "$sheets" },
          totalSales: { $sum: "$total" },
          totalProfit: { $sum: "$profit" },
          avgPrice: { $avg: "$price" }
        }
      }
    ]);
    
    // Get expenses summary
    const expensesSummary = await Expense.aggregate([
      { $match: dateFilter },
      { 
        $group: {
          _id: null,
          totalExpenses: { $sum: "$amount" },
          byType: {
            $push: {
              type: "$type",
              amount: "$amount"
            }
          }
        }
      }
    ]);
    
    res.json({
      success: true,
      data: {
        sales: salesSummary[0] || {},
        expenses: expensesSummary[0] || {}
      }
    });
  } catch (err) {
    console.error('Error generating report:', err);
    res.status(500).json({
      success: false,
      message: 'Error generating report',
      error: err.message
    });
  }
});

// Settings Routes
app.get('/api/settings', async (req, res) => {
  try {
    const settings = await Setting.findOne();
    res.json({
      success: true,
      data: settings || { productionCost: 47, defaultPrice: 80 }
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Error fetching settings',
      error: err.message
    });
  }
});

app.put('/api/settings', async (req, res) => {
  try {
    const { productionCost, defaultPrice } = req.body;
    const settings = await Setting.findOneAndUpdate(
      {},
      { productionCost, defaultPrice },
      { new: true, upsert: true }
    );
    
    res.json({
      success: true,
      message: 'Settings updated successfully',
      data: settings
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Error updating settings',
      error: err.message
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Something broke!',
    error: err.message
  });
});

// Start server
const port = process.env.PORT || 10000;
app.listen(port, async () => {
  await initializeSettings();
  console.log(`🚀 Server running on port ${port}`);
});
