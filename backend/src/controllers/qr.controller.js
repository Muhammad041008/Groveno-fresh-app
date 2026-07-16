const CommunityLeader = require('../models/CommunityLeader');
const { asyncHandler } = require('../utils/helpers');

// QR scan tracking - public endpoint, increments CL source counter
exports.track = asyncHandler(async (req, res) => {
  const { ref, source = 'other' } = req.query;
  if (!ref) return res.status(400).json({ success: false, message: 'ref (clCode) is required' });
  const cl = await CommunityLeader.findOne({ clCode: (ref || '').toUpperCase() });
  if (!cl) return res.status(404).json({ success: false, message: 'CL not found' });

  const key = ['poster', 'whatsapp', 'standee'].includes(source) ? source : 'other';
  cl.qrScans[key] = (cl.qrScans[key] || 0) + 1;
  await cl.save();

  return res.json({
    success: true,
    tracked: true,
    clCode: cl.clCode,
    clName: cl.name,
    society: cl.societyName,
    source: key,
  });
});
