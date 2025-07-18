const express = require('express');
const mongoose = require('mongoose');
const app = express();
const port = process.env.PORT || 3000;

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
const Form = mongoose.model('Form', new mongoose.Schema({ name: String, email: String }));

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Handle form submission
app.post('/submit', async (req, res) => {
  const { name, email } = req.body;
  await Form.create({ name, email });
  res.send('Form submitted!');
});

app.listen(port, () => console.log(`Running on port ${port}`));
