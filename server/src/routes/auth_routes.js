const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const UsersModel = require('../models/User.js');
const { protect } = require('./protect'); 
const saltRounds = 10;
// signup
router.post('/signup', async (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
        return res.status(400).json({ error: 'Please fill in all required fields' });
    }
    const existingUser = await UsersModel.findOne({ email });
    if (existingUser) {
        return res.status(400).json({ error: 'This email is already registered' });
    }
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    const newUser = await UsersModel.create({ 
        name,  
        email, 
        password: hashedPassword 
    });
    const token = jwt.sign(
        { id: newUser._id, email: newUser.email },
        process.env.JWT_SECRET || "jwt-secret-key",
        { expiresIn: "7d" }
    );
    res.status(201).json({
        message: 'Account created successfully!',
        token,
        user: { 
            id: newUser._id, 
            name: newUser.name,  
            email: newUser.email 
        }
    });
});
// login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    const user = await UsersModel.findOne({ email });
    if (!user) { 
        return res.status(404).json({ error: 'Email does not exist' });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        return res.status(401).json({ error: 'Email or password is incorrect' });
    }
    const token = jwt.sign(
        { id: user._id, email: user.email }, 
        process.env.JWT_SECRET || "jwt-secret-key", 
        { expiresIn: "7d" }
    );
    res.status(200).json({
        message: 'Login successful!',
        token,
        user: { id: user._id, name: user.name, email: user.email }
    });
});
router.get('/user', protect, async (req, res) => {res.json({ id: req.user._id, name: req.user.name, email: req.user.email });});
router.post('/logout', (req, res) => {res.status(200).json({ message: 'Logout successful!' });});
// Update name
router.put('/update-name', protect, async (req, res) => {
  try {
    const { newName, password } = req.body;
    const user = await UsersModel.findById(req.user._id).select('+password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid password' });
    }
    user.name = newName;
    await user.save();
    res.json({ 
      message: 'Name updated successfully', 
      user: { name: user.name } 
    });
  } catch (err) {
    console.error('Update name error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/update-password', protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await UsersModel.findById(req.user._id).select('+password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }
    user.password = await bcrypt.hash(newPassword, saltRounds);
    await user.save();
    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error('Update password error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router; 