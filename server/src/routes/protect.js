const jwt = require('jsonwebtoken');
const UsersModel = require('../models/User');

const protect = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Not authorized, no token' });
  }
  const decoded = jwt.verify(token, process.env.JWT_SECRET || "jwt-secret-key");
  const user = await UsersModel.findById(decoded.id);
  
  if (!user) {
    return res.status(401).json({ error: 'Not authorized, user not found' });
  }
    req.user = user;
    next();
};

module.exports = { protect };