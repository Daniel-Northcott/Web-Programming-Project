const { Schema, model } = require('mongoose');

/**
 * Review Model
 * Represents a single user review for a movie.
 * Fields:
 *  - title: Movie title (string match to Movie.title)
 *  - username: Author's username (reference by value for simplicity)
 *  - rating: Integer 1–5 inclusive
 *  - text: Optional free-form comment
 * Timestamps: createdAt used for ordering (newest first).
 */
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
