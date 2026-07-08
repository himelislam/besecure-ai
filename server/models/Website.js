import mongoose from 'mongoose';

const websiteSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    url: { type: String, required: true }, // normalized: "https://example.com"
    domain: { type: String, required: true }, // "example.com"
    nickname: { type: String, required: true, trim: true },
    verified: { type: Boolean, default: false },
    verificationToken: { type: String, required: true },
    verificationMethod: { type: String, enum: ['dns', 'meta_tag', null], default: null },
    verifiedAt: { type: Date, default: null },
    lastVerificationAttempt: { type: Date, default: null },
    verificationAttempts: { type: Number, default: 0 },
    lastScanAt: { type: Date, default: null },
    lastScanId: { type: mongoose.Schema.Types.ObjectId, ref: 'Scan', default: null },
    lastScore: { type: Number, default: null },
    lastGrade: { type: String, default: null },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
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

websiteSchema.index({ userId: 1 });
websiteSchema.index({ userId: 1, domain: 1 }, { unique: true });
websiteSchema.index({ userId: 1, isDeleted: 1 });
websiteSchema.index({ verificationToken: 1 });

websiteSchema.methods.getVerificationInstructions = function getVerificationInstructions() {
  return {
    token: this.verificationToken,
    dns: {
      type: 'TXT',
      host: `_security-audit-verify.${this.domain}`,
      value: this.verificationToken,
    },
    metaTag: {
      tag: `<meta name="security-audit-verify" content="${this.verificationToken}">`,
      placement: 'Add inside the <head> element of your homepage',
    },
  };
};

const Website = mongoose.model('Website', websiteSchema);
export default Website;
