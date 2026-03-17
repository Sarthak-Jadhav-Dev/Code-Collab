const mongoose = require('mongoose');
const codeSchema = new mongoose.Schema({
  roomId: String,
  fileName: String,
  code: String,
  updatedAt: { type: Date, default: Date.now }
});
module.exports = mongoose.model('Code', codeSchema);