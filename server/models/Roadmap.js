import mongoose from 'mongoose';

const stepSchema = new mongoose.Schema({
  week: { type: Number, required: true },
  title: { type: String, required: true },
  why: { type: String, required: true },
  how: { type: String, required: true },
  estimatedScoreGain: { type: Number, default: 0 },
  severity: { type: String, enum: ['critical', 'high', 'medium', 'low', 'info', null], default: null },
  isDone: { type: Boolean, default: false },
  completedAt: { type: Date, default: null },
});

const roadmapSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    scanId: { type: mongoose.Schema.Types.ObjectId, ref: 'Scan', required: true },
    websiteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Website', required: true },
    summary: { type: String, default: null },
    estimatedStartScore: { type: Number, default: null },
    estimatedEndScore: { type: Number, default: null },
    steps: { type: [stepSchema], default: [] },
    status: { type: String, enum: ['generating', 'completed', 'failed'], default: 'generating' },
    error: { type: String, default: null },
    generatedAt: { type: Date, default: null },
    tokenUsage: {
      inputTokens: { type: Number, default: null },
      outputTokens: { type: Number, default: null },
    },
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

roadmapSchema.index({ scanId: 1 }, { unique: true });
roadmapSchema.index({ userId: 1, createdAt: -1 });

const Roadmap = mongoose.models.Roadmap || mongoose.model('Roadmap', roadmapSchema);
export default Roadmap;
