import mongoose from 'mongoose';

export const securityAlertCategories = [
  'security',
  'contact',
  'registration',
  'payment',
  'system'
];

const securityAlertSchema = new mongoose.Schema(
  {
    fingerprint: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    type: {
      type: String,
      required: true,
      trim: true
    },
    category: {
      type: String,
      enum: securityAlertCategories,
      default: 'security'
    },
    severity: {
      type: String,
      enum: ['medium', 'high', 'critical'],
      default: 'medium'
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    message: {
      type: String,
      required: true,
      trim: true
    },
    status: {
      type: String,
      enum: ['open', 'acknowledged'],
      default: 'open'
    },
    count: {
      type: Number,
      default: 1
    },
    method: {
      type: String,
      default: '',
      trim: true
    },
    path: {
      type: String,
      default: '',
      trim: true
    },
    ip: {
      type: String,
      default: '',
      trim: true
    },
    statusCode: {
      type: Number,
      default: 0
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    subjectType: {
      type: String,
      default: '',
      trim: true
    },
    subjectId: {
      type: String,
      default: '',
      trim: true
    },
    firstSeenAt: {
      type: Date,
      default: Date.now
    },
    lastSeenAt: {
      type: Date,
      default: Date.now
    },
    lastNotifiedAt: {
      type: Date,
      default: null
    },
    acknowledgedAt: {
      type: Date,
      default: null
    },
    acknowledgedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },
  {
    timestamps: true
  }
);

securityAlertSchema.index({ status: 1, lastSeenAt: -1 });
securityAlertSchema.index({ category: 1, status: 1, lastSeenAt: -1 });
securityAlertSchema.index({ createdAt: -1 });

export const SecurityAlert = mongoose.model('SecurityAlert', securityAlertSchema);
