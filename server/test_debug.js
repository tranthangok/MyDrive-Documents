const express = require('express');
const app = express();

app.use(express.json());

// Middleware 1 - không gọi next
app.use((req, res, next) => {
  console.log('✅ Middleware 1 passed');
  next(); // PHẢI gọi next()
});

// Middleware 2 - có lỗi
app.use((req, res, next) => {
  console.log('✅ Middleware 2 passed');
  next();
});

// Route test
app.post('/api/auth/register', (req, res) => {
  console.log('✅ Route handler hit:', req.body);
  res.json({ success: true, data: req.body });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('❌ Error:', err);
  res.status(500).json({ error: err.message });
});

app.listen(5002, () => {
  console.log('🚀 Debug server on port 5002');
});