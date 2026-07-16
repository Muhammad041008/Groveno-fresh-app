const jwt = require('jsonwebtoken');
const CommunityLeader = require('../models/CommunityLeader');

module.exports = async function clAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ success: false, message: 'No CL token provided' });

    const decoded = jwt.verify(token, process.env.JWT_CL_SECRET);
    if (decoded.role !== 'cl') {
      return res.status(401).json({ success: false, message: 'Invalid token role' });
    }
    const cl = await CommunityLeader.findById(decoded.id);
    if (!cl) return res.status(401).json({ success: false, message: 'CL not found' });
    if (cl.status !== 'approved') {
      return res.status(403).json({ success: false, message: 'CL account not approved yet' });
    }

    req.cl = cl;
    req.clId = cl._id.toString();
    next();
  } catch (e) {
    return res.status(401).json({ success: false, message: 'Invalid or expired CL token' });
  }
};
