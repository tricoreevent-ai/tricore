import mongoose from 'mongoose';

const activityLogSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      required: true,
      trim: true
    },
    action: {
      type: String,
      required: true,
      trim: true
    },
    subjectType: {
      type: String,
      required: true,
      trim: true
    },
    subjectId: {
      type: String,
      default: '',
      trim: true
    },
    summary: {
      type: String,
      required: true,
      trim: true
    },
    details: {
      type: String,
      default: '',
      trim: true
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },
  {
    timestamps: true
  }
);

activityLogSchema.index({ createdAt: -1, category: 1 });
activityLogSchema.index({ subjectType: 1, subjectId: 1, createdAt: -1 });

export const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);
