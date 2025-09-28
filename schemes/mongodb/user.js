import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  mail: { type: String, required: true, unique: true, trim: true, lowercase: true },
  name: { type: String, required: true, trim: true },
  password: { type: String, select: false },
  googleId: { type: String },
  type: { type: String, enum: ['user', 'admin'], default: 'user' },
  isVerified: { type: Boolean, default: false },
  verificationToken: { type: String },
  verificationExpires: { type: Date }
}, { timestamps: true });

UserSchema.set("toJSON", {
  transform: (doc, ret) => {
    ret.id = ret._id?.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

export const userModel = mongoose.model('User', UserSchema);