import mongoose from 'mongoose';

const audienceCampaignFiltersSchema = new mongoose.Schema(
  {
    search: {
      type: String,
      default: '',
      trim: true
    },
    segment: {
      type: String,
      enum: ['all', 'registered', 'current', 'previous', 'interested'],
      default: 'all'
    },
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      default: null
    },
    sort: {
      type: String,
      enum: ['recent', 'name'],
      default: 'recent'
    }
  },
  { _id: false }
);

const audienceCampaignSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    subject: {
      type: String,
      required: true,
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
    medium: {
      type: String,
      enum: ['email'],
      default: 'email'
    },
    channels: {
      email: {
        type: Boolean,
        default: true
      },
      sms: {
        type: Boolean,
        default: false
      },
      whatsapp: {
        type: Boolean,
        default: false
      }
    },
    filters: {
      type: audienceCampaignFiltersSchema,
      default: () => ({})
    },
    selectedEmails: {
      type: [String],
      default: []
    },
    targetMode: {
      type: String,
      enum: ['filtered', 'selected'],
      default: 'filtered'
    },
    audienceCount: {
      type: Number,
      default: 0
    },
    emailSentCount: {
      type: Number,
      default: 0
    },
    skippedOptOutCount: {
      type: Number,
      default: 0
    },
    failedEmailCount: {
      type: Number,
      default: 0
    },
    status: {
      type: String,
      enum: ['draft', 'sent', 'partial', 'failed'],
      default: 'draft'
    },
    notes: {
      type: String,
      default: '',
      trim: true
    },
    launchedAt: {
      type: Date,
      default: null
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },
  {
    timestamps: true
  }
);

audienceCampaignSchema.index({ createdAt: -1 });

export const AudienceCampaign = mongoose.model('AudienceCampaign', audienceCampaignSchema);
