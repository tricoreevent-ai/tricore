import mongoose from 'mongoose';

const adminOtpChallengeSchema = new mongoose.Schema(
  {
    purpose: {
      type: String,
      required: true,
      trim: true
    },
    resourceType: {
      type: String,
      required: true,
      trim: true
    },
    resourceId: {
      type: String,
      required: true,
      trim: true
    },
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    targetEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },
    codeHash: {
      type: String,
      required: true
    },
    attemptCount: {
      type: Number,
      default: 0
    },
    consumedAt: {
      type: Date,
      default: null
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expireAfterSeconds: 0 }
    }
  },
  {
    timestamps: true
  }
);

adminOtpChallengeSchema.index({
  purpose: 1,
  resourceType: 1,
  resourceId: 1,
  requestedBy: 1,
  createdAt: -1
});

export const AdminOtpChallenge = mongoose.model('AdminOtpChallenge', adminOtpChallengeSchema);
