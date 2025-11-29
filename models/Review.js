const { Schema, model } = require('mongoose');

const ReviewSchema = new Schema(
  {
    title: { type: String, required: true },
    username: { type: String, required: true },
    rating: { type: Number, min: 1, max: 5, required: true },
    text: { type: String, default: '' }
  },
  { timestamps: true }
);

module.exports = model('Review', ReviewSchema);
