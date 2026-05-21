const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, '../frontend')));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'BB-Stock server running!' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});