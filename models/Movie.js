const { Schema, model } = require('mongoose');

const MovieSchema = new Schema(
  {
    title: { type: String, required: true, unique: true, trim: true },
    image: { type: String },
    description: { type: String },
    director: { type: String },
    year: { type: Number },
    genre: { type: String }
  },
  { timestamps: true }
);

module.exports = model('Movie', MovieSchema);
