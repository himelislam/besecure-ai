import mongoose from 'mongoose';

const TTL_MS = 2 * 24 * 60 * 60 * 1000; // 2 days

function todayString() {
  return new Date().toISOString().split('T')[0];
}

const scanRateLimitSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    websiteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Website', required: true },
    date: { type: String, required: true }, // "YYYY-MM-DD"
    scanCount: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true, default: () => new Date(Date.now() + TTL_MS) },
  },
  { timestamps: true }
);

scanRateLimitSchema.index({ userId: 1, websiteId: 1, date: 1 }, { unique: true });
scanRateLimitSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

scanRateLimitSchema.statics.getTodayCount = async function getTodayCount(userId, websiteId) {
  const record = await this.findOne({ userId, websiteId, date: todayString() });
  return record?.scanCount || 0;
};

scanRateLimitSchema.statics.incrementAndGet = async function incrementAndGet(userId, websiteId) {
  const record = await this.findOneAndUpdate(
    { userId, websiteId, date: todayString() },
    { $inc: { scanCount: 1 }, $setOnInsert: { expiresAt: new Date(Date.now() + TTL_MS) } },
    { upsert: true, new: true }
  );
  return record.scanCount;
};

const ScanRateLimit = mongoose.models.ScanRateLimit || mongoose.model('ScanRateLimit', scanRateLimitSchema);
export default ScanRateLimit;
