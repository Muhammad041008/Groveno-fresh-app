// Common helpers used across controllers
const Counter = require('../models/Counter');
const { v4: uuidv4 } = require('uuid');

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

async function generateOrderNumber() {
  const year = new Date().getFullYear();
  const seq = await Counter.next(`order_${year}`);
  return `GRV-${year}-${String(seq).padStart(5, '0')}`;
}

function generateCLCode() {
  // CL + 5 digits
  return 'CL' + Math.floor(10000 + Math.random() * 90000);
}

function generatePickupOtp() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

module.exports = {
  asyncHandler,
  generateOrderNumber,
  generateCLCode,
  generatePickupOtp,
  haversineKm,
  uuidv4,
};
