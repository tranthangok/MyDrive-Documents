require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const authRoutes = require('./src/routes/auth_routes');
const resetRoutes = require('./src/routes/reset_routes');
const documentRoutes = require('./src/routes/document_routes');
const folderRoutes = require('./src/routes/folder_routes');
const trashRoutes = require('./src/routes/trash_routes');
const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use((req, res, next) => { console.log(`${req.method} ${req.url}`); next();});
// Routes
app.use('/api/auth', authRoutes);
app.use('/api/reset', resetRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/folders', folderRoutes);
app.use('/api/trash', trashRoutes);
// MongoDB connection
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB error:', err));
// Test route
app.get('/', (req, res) => { res.json({ message: 'Server is running' }); });
// Error handler
app.use((err, req, res, next) => { console.error('Server error:', err); res.status(500).json({ error: err.message }); });
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => { console.log(`Server running on port ${PORT}`); });