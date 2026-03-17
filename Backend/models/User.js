const mongoose = require('mongoose');
const userSchema = new mongoose.Schema({
  email: { type: String, unique: true },
  phone: { type: String, unique: true, sparse: true },
  password: String,
  name: String,
  otp: String,
  otpExpires: Date,
  verified: { type: Boolean, default: false }
});
module.exports = mongoose.model('User', userSchema);