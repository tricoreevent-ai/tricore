import mongoose from 'mongoose';

const contactInquirySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },
    phone: {
      type: String,
      trim: true,
      default: ''
    },
    message: {
      type: String,
      required: true,
      trim: true
    },
    forwardedTo: {
      type: [String],
      default: []
    },
    forwardingStatus: {
      type: String,
      enum: ['pending', 'sent', 'failed', 'not_configured'],
      default: 'pending'
    },
    forwardedAt: {
      type: Date,
      default: null
    },
    forwardingError: {
      type: String,
      default: ''
    },
    sourceIp: {
      type: String,
      default: ''
    },
    userAgent: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

export const ContactInquiry = mongoose.model('ContactInquiry', contactInquirySchema);
