const express = require('express');
const mongoose = require('mongoose');
const app = express();
const port = process.env.PORT || 3000;

// MongoDB connection (use direct connection string with database name)
mongoose.connect('mongodb+srv://abhijitdeshmukh501:abhi@cluster0.pnsz7au.mongodb.net/webapp?retryWrites=true&w=majority&appName=Cluster0', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log('Connected to MongoDB');
}).catch(err => {
  console.error('MongoDB connection error:', err);
});

// Define model
const Form = mongoose.model('Form', new mongoose.Schema({ name: String, email: String }));

// Middleware to parse incoming data
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // <-- IMPORTANT for HTML form submissions
app.use(express.static('public')); // serve index.html, etc.

// Handle form submission
app.post('/submit', async (req, res) => {
  try {
    const { name, email } = req.body;
    await Form.create({ name, email });
    res.send('Form submitted!');
  } catch (err) {
    console.error('Error saving form:', err);
    res.status(500).send('Error saving data');
  }
});

// Start server
app.listen(port, () => console.log(`Server running on port ${port}`));

// Fetch submitted form data
app.get('/data', async (req, res) => {
  const forms = await Form.find().sort({ _id: -1 }); // latest first
  res.json(forms);
});

