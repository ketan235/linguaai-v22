import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  name:       { type: String, required: true, trim: true },
  email:      { type: String, required: true, unique: true, lowercase: true, trim: true },
  password:   { type: String, select: false }, // null for Google OAuth users
  avatar:     { type: String, default: '🌟' },
  plan:       { type: String, default: 'Free', enum: ['Free', 'Pro'] },
  googleId:   { type: String, sparse: true },
  picture:    { type: String }, // Google profile picture URL
  provider:   { type: String, default: 'local', enum: ['local', 'google'] },
  resetToken:  { type: String, select: false },
  resetExpiry: { type: Date,   select: false },
}, { timestamps: true });

// Hash password before save
userSchema.pre('save', async function(next) {
  if (!this.isModified('password') || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function(plain) {
  if (!this.password) return false;
  return bcrypt.compare(plain, this.password);
};

userSchema.methods.toSafe = function() {
  const obj = this.toObject();
  delete obj.password;
  delete obj.googleId;
  return obj;
};

export default mongoose.model('User', userSchema);
