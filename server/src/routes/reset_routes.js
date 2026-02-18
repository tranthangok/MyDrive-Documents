const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const UsersModel = require('../models/User.js');     
const LinksModel = require('../models/Link.js');
const { transporter } = require('../config/Email.js');
// Generate token cho reset password
const generateToken = () => { return crypto.randomBytes(32).toString('hex');};
// Email template for reset password
const getResetPasswordEmail = (token) => {
  const resetLink = `http://localhost:3000/reset-password?token=${token}`;
  return {
    subject: 'Reset Your Password - MyDrive',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
        <h2 style="color: #3366CC; text-align: center;">Reset Password</h2>
        <p style="font-size: 16px; color: #333;">You requested to reset your password. Click the button below to proceed:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" style="background: #3366CC; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-size: 16px; font-weight: bold;">Reset Password</a>
        </div>
        <p style="color: #666; font-size: 14px;">If you didn't request this, please ignore this email.</p>
        <p style="color: #666; font-size: 14px;">This link will expire in 1 hour.</p>
        <hr style="border: 1px solid #e0e0e0; margin: 20px 0;">
        <p style="color: #999; font-size: 12px; text-align: center;">© 2026 MyDrive. All rights reserved.</p>
      </div>
    `,
  };
};

const validateEmail = (email) => {
  const emailRegex = /^\S+@\S+\.\S+$/;
  return emailRegex.test(email);
};
// endpoint verify token
router.post('/verify-token', async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }
    const tokenRecord = await LinksModel.findOne({
      token,
      type: 'reset',
      used: false,
      expiresAt: { $gt: Date.now() }
    });
    if (!tokenRecord) {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }
    res.json({ 
      message: 'Token is valid',
      email: tokenRecord.email 
    });
  } catch (error) {
    console.error('Verify token error:', error);
    res.status(500).json({ error: error.message });
  }
});
// forgot password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    if (!validateEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
    // check email
    const user = await UsersModel.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: 'Email not registered' });
    }
    // token reset
    const token = generateToken();
    // TOKEN in DATABASE
    await LinksModel.create({ email, token, type: 'reset', expiresAt: new Date(Date.now() + 60 * 60 * 1000)}); //1h
    // email reset password
    const emailContent = getResetPasswordEmail(token);
    await transporter.sendMail({
      from: `"MyDrive" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: emailContent.subject,
      html: emailContent.html
    });
    res.json({message: 'Password reset link sent', expiresIn: '1 hour'});
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: error.message });
  }
});
// reset password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }
    // Validate password strength
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPassword)) {
      return res.status(400).json({ 
        error: 'Password must contain uppercase, lowercase and number' 
      });
    }
    // TOKEN DATABASE
    const tokenRecord = await LinksModel.findOne({ token, type: 'reset', used: false, expiresAt: { $gt: Date.now() }});
    if (!tokenRecord) {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }
    // update password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await UsersModel.updateOne(
      { email: tokenRecord.email },
      { password: hashedPassword }
    );
    tokenRecord.used = true;
    await tokenRecord.save();
    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
