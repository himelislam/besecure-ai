import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    scanId: { type: mongoose.Schema.Types.ObjectId, ref: 'Scan', required: true },
    websiteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Website', required: true },
    status: { type: String, enum: ['generating', 'completed', 'failed'], default: 'generating' },
    error: { type: String, default: null },
    cloudinaryUrl: { type: String, default: null },
    cloudinaryPublicId: { type: String, default: null },
    fileSizeBytes: { type: Number, default: null },
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

reportSchema.index({ scanId: 1 });
reportSchema.index({ userId: 1, createdAt: -1 });

const Report = mongoose.model('Report', reportSchema);
export default Report;
