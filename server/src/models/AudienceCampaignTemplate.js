import mongoose from 'mongoose';

const audienceCampaignTemplateSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      default: '',
      trim: true
    },
    channel: {
      type: String,
      enum: ['email', 'sms', 'whatsapp', 'push'],
      default: 'email'
    },
    subject: {
      type: String,
      default: '',
      trim: true
    },
    previewText: {
      type: String,
      default: '',
      trim: true
    },
    message: {
      type: String,
      required: true,
      trim: true
    },
    ctaLabel: {
      type: String,
      default: '',
      trim: true
    },
    ctaUrl: {
      type: String,
      default: '',
      trim: true
    },
    isActive: {
      type: Boolean,
      default: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },
  {
    timestamps: true
  }
);

audienceCampaignTemplateSchema.index({ createdAt: -1 });

export const AudienceCampaignTemplate = mongoose.model(
  'AudienceCampaignTemplate',
  audienceCampaignTemplateSchema
);
