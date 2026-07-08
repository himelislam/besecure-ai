import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const BCRYPT_ROUNDS = 12;

const subscriptionSchema = new mongoose.Schema(
  {
    stripeCustomerId: { type: String, default: null },
    stripeSubscriptionId: { type: String, default: null },
    status: {
      type: String,
      enum: ['trialing', 'active', 'past_due', 'canceled', 'incomplete'],
      default: 'trialing',
    },
    plan: { type: String, enum: ['free', 'premium'], default: 'free' },
    currentPeriodEnd: { type: Date, default: null },
    trialEnd: {
      type: Date,
      default: () => new Date(Date.now() + (parseInt(process.env.TRIAL_DAYS) || 14) * 24 * 60 * 60 * 1000),
    },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    avatar: { type: String, default: null },
    emailVerified: { type: Boolean, default: false },
    emailVerificationToken: { type: String, default: null, select: false },
    passwordResetToken: { type: String, default: null, select: false },
    passwordResetExpires: { type: Date, default: null, select: false },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    // Bumped on password change/reset to invalidate all previously issued refresh tokens
    tokenVersion: { type: Number, default: 0, select: false },
    subscription: { type: subscriptionSchema, default: () => ({}) },
    aiMessagesUsedToday: { type: Number, default: 0 },
    aiMessagesResetAt: { type: Date, default: Date.now },
    lastLoginAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(doc, ret) {
        delete ret.__v;
        delete ret.password;
        delete ret.emailVerificationToken;
        delete ret.passwordResetToken;
        delete ret.passwordResetExpires;
        delete ret.tokenVersion;
        if (ret.subscription) {
          delete ret.subscription.stripeCustomerId;
          delete ret.subscription.stripeSubscriptionId;
        }
        return ret;
      },
    },
  }
);

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ 'subscription.stripeCustomerId': 1 });
userSchema.index({ emailVerificationToken: 1 });
userSchema.index({ passwordResetToken: 1 });

userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, BCRYPT_ROUNDS);
  next();
});

userSchema.methods.comparePassword = function comparePassword(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.isPremium = function isPremium() {
  const sub = this.subscription;
  if (!sub) return false;
  if (sub.status === 'active') return true;
  if (sub.status === 'trialing' && sub.trialEnd && sub.trialEnd.getTime() > Date.now()) return true;
  return false;
};

const User = mongoose.model('User', userSchema);
export default User;
