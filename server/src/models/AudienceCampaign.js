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
    paymentStatus: {
      type: String,
      enum: ['all', 'pending', 'under_review', 'confirmed', 'failed'],
      default: 'all'
    },
    engagementLevel: {
      type: String,
      enum: ['all', 'low', 'medium', 'high'],
      default: 'all'
    },
    location: {
      type: String,
      default: '',
      trim: true
    },
    tag: {
      type: String,
      default: '',
      trim: true
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
    campaignType: {
      type: String,
      enum: ['bulk_email', 'reminder', 'promotion', 'workflow'],
      default: 'bulk_email'
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
      },
      push: {
        type: Boolean,
        default: false
      }
    },
    fallbackChannel: {
      type: String,
      enum: ['none', 'email', 'sms', 'whatsapp', 'push'],
      default: 'none'
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
    launchAction: {
      type: String,
      enum: ['send_now', 'save_draft', 'schedule', 'submit_for_approval'],
      default: 'send_now'
    },
    templateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AudienceCampaignTemplate',
      default: null
    },
    templateName: {
      type: String,
      default: '',
      trim: true
    },
    requiresApproval: {
      type: Boolean,
      default: false
    },
    submittedForApprovalAt: {
      type: Date,
      default: null
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    approvedAt: {
      type: Date,
      default: null
    },
    scheduledAt: {
      type: Date,
      default: null
    },
    timezone: {
      type: String,
      default: 'Asia/Calcutta',
      trim: true
    },
    audienceCount: {
      type: Number,
      default: 0
    },
    emailSentCount: {
      type: Number,
      default: 0
    },
    deliveredCount: {
      type: Number,
      default: 0
    },
    openCount: {
      type: Number,
      default: 0
    },
    clickCount: {
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
      enum: ['draft', 'pending_approval', 'scheduled', 'sending', 'sent', 'partial', 'failed', 'cancelled'],
      default: 'draft'
    },
    estimatedSmsCost: {
      type: Number,
      default: 0
    },
    estimatedWhatsAppCost: {
      type: Number,
      default: 0
    },
    costCurrency: {
      type: String,
      default: 'INR',
      trim: true
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
    lastProcessedAt: {
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
