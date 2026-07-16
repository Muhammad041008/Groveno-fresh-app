const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

module.exports = async function adminAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ success: false, message: 'No admin token provided' });

    const decoded = jwt.verify(token, process.env.JWT_ADMIN_SECRET);
    if (decoded.role !== 'admin') {
      return res.status(401).json({ success: false, message: 'Invalid token role' });
    }
    const admin = await Admin.findById(decoded.id);
    if (!admin) return res.status(401).json({ success: false, message: 'Admin not found' });

    req.admin = admin;
    req.adminId = admin._id.toString();
    next();
  } catch (e) {
    return res.status(401).json({ success: false, message: 'Invalid or expired admin token' });
  }
};
