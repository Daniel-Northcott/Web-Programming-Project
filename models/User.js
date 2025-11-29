const { Schema, model } = require('mongoose');

/**
 * User Model
 * Stores account credentials and basic profile information.
 * Fields:
 *  - firstName / lastName: Optional personal details
 *  - username: Unique handle (lowercased) used for attribution in reviews
 *  - email: Unique email address for login alternative
 *  - password: Hashed password (bcrypt) stored server-side
 * Timestamps: createdAt, updatedAt automatically managed by Mongoose.
 */
const UserSchema = new Schema(
  {
    firstName: { type: String, trim: true },
    lastName: { type: String, trim: true },
    username: { type: String, required: true, unique: true, lowercase: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true }
  },
  { timestamps: true }
);

module.exports = model('User', UserSchema);
