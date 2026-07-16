const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const { asyncHandler } = require('../utils/helpers');

function issueAdminToken(admin) {
  return jwt.sign(
    { id: admin._id.toString(), role: 'admin', email: admin.email },
    process.env.JWT_ADMIN_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '30d' }
  );
}

exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required' });
  }
  const admin = await Admin.findOne({ email: email.toLowerCase() });
  if (!admin || !admin.isActive) {
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }
  const ok = await admin.comparePassword(password);
  if (!ok) return res.status(401).json({ success: false, message: 'Invalid credentials' });

  const token = issueAdminToken(admin);
  return res.json({ success: true, token, admin });
});

exports.me = asyncHandler(async (req, res) => {
  return res.json({ success: true, admin: req.admin });
});
