import mongoose from 'mongoose';

const audiencePreferenceSchema = new mongoose.Schema(
  {
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
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true
    },
    phone: {
      type: String,
      default: '',
      trim: true
    },
    tags: {
      type: [String],
      default: []
    },
    emailOptOut: {
      type: Boolean,
      default: false
    },
    smsOptOut: {
      type: Boolean,
      default: false
    },
    whatsappOptOut: {
      type: Boolean,
      default: false
    },
    emailOptOutAt: {
      type: Date,
      default: null
    },
    smsOptOutAt: {
      type: Date,
      default: null
    },
    whatsappOptOutAt: {
      type: Date,
      default: null
    },
    lastCampaignAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

export const AudiencePreference = mongoose.model('AudiencePreference', audiencePreferenceSchema);
