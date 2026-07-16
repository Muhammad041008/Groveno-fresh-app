const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const AdminSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, index: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['super_admin', 'admin'], default: 'admin' },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

AdminSchema.methods.setPassword = async function (password) {
  this.passwordHash = await bcrypt.hash(password, 10);
};

AdminSchema.methods.comparePassword = function (password) {
  return bcrypt.compare(password, this.passwordHash);
};

AdminSchema.methods.toJSON = function () {
  const obj = this.toObject();
  obj.id = obj._id.toString();
  delete obj.passwordHash;
  return obj;
};

module.exports = mongoose.model('Admin', AdminSchema);
