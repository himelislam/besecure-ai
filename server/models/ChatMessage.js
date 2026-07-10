import mongoose from 'mongoose';

const chatMessageSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    scanId: { type: mongoose.Schema.Types.ObjectId, ref: 'Scan', default: null },
    role: { type: String, enum: ['user', 'assistant'], required: true },
    content: { type: String, required: true, maxlength: 10000 },
    tokenUsage: {
      inputTokens: { type: Number, default: null },
      outputTokens: { type: Number, default: null },
    },
    tier: { type: String, enum: ['free', 'premium'], default: null },
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

chatMessageSchema.index({ userId: 1, createdAt: -1 });
chatMessageSchema.index({ userId: 1, createdAt: 1 });
// Auto-cleanup per docs/04_DATABASE_SCHEMA.md: chat history isn't retained forever.
chatMessageSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 }); // 90 days

const ChatMessage = mongoose.models.ChatMessage || mongoose.model('ChatMessage', chatMessageSchema);
export default ChatMessage;
