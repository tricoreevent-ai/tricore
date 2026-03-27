import mongoose from 'mongoose';

const audienceCampaignRecipientSchema = new mongoose.Schema(
  {
    campaignId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AudienceCampaign',
      required: true,
      index: true
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    name: {
      type: String,
      default: '',
      trim: true
    },
    channel: {
      type: String,
      enum: ['email', 'sms', 'whatsapp', 'push'],
      default: 'email'
    },
    status: {
      type: String,
      enum: ['pending', 'scheduled', 'sent', 'failed', 'skipped_opt_out', 'test_sent'],
      default: 'pending'
    },
    subject: {
      type: String,
      default: '',
      trim: true
    },
    failureReason: {
      type: String,
      default: '',
      trim: true
    },
    sentAt: {
      type: Date,
      default: null
    },
    openedAt: {
      type: Date,
      default: null
    },
    lastOpenedAt: {
      type: Date,
      default: null
    },
    openCount: {
      type: Number,
      default: 0
    },
    clickedAt: {
      type: Date,
      default: null
    },
    lastClickedAt: {
      type: Date,
      default: null
    },
    clickCount: {
      type: Number,
      default: 0
    },
    lastClickedUrl: {
      type: String,
      default: '',
      trim: true
    },
    lastOpenUserAgent: {
      type: String,
      default: '',
      trim: true
    },
    lastClickUserAgent: {
      type: String,
      default: '',
      trim: true
    },
    deviceType: {
      type: String,
      default: '',
      trim: true
    },
    browserName: {
      type: String,
      default: '',
      trim: true
    }
  },
  {
    timestamps: true
  }
);

audienceCampaignRecipientSchema.index({ email: 1, createdAt: -1 });
audienceCampaignRecipientSchema.index({ campaignId: 1, email: 1 });

export const AudienceCampaignRecipient = mongoose.model(
  'AudienceCampaignRecipient',
  audienceCampaignRecipientSchema
);
