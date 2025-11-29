const { Schema, model } = require('mongoose');

/**
 * Movie Model
 * Canonical movie entries imported from JSON or added later.
 * Fields:
 *  - title: Unique movie title (serves as primary identifier)
 *  - image: Relative path/filename for poster asset
 *  - description: Short synopsis
 *  - director: Director name
 *  - year: Release year (Number)
 *  - genre: Genre label
 * Timestamps: allow future sorting/filtering by addition/update times.
 */
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
