import mongoose from 'mongoose';

const toolRunSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    status: { type: String, enum: ['success', 'failed'], required: true },
    durationMs: { type: Number, default: null },
    error: { type: String, default: null },
  },
  { _id: false }
);

const scanSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    websiteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Website', required: true },
    type: { type: String, enum: ['baseline', 'deep'], required: true },
    targetUrl: { type: String, required: true },
    status: { type: String, enum: ['queued', 'running', 'completed', 'failed'], default: 'queued' },
    progress: { type: Number, default: 0, min: 0, max: 100 },
    progressMessage: { type: String, default: null },
    error: { type: String, default: null },
    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    durationMs: { type: Number, default: null },
    score: { type: Number, default: null },
    grade: { type: String, default: null },
    findingCounts: {
      critical: { type: Number, default: 0 },
      high: { type: Number, default: 0 },
      medium: { type: Number, default: 0 },
      low: { type: Number, default: 0 },
      info: { type: Number, default: 0 },
    },
    toolsRun: { type: [toolRunSchema], default: [] },
    isDeleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

scanSchema.index({ websiteId: 1, createdAt: -1 });
scanSchema.index({ userId: 1, createdAt: -1 });
scanSchema.index({ status: 1 });

const Scan = mongoose.model('Scan', scanSchema);
export default Scan;
