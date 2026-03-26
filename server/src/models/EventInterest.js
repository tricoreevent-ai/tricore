import mongoose from 'mongoose';

const eventInterestSchema = new mongoose.Schema(
  {
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
      index: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
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
      default: '',
      trim: true
    },
    source: {
      type: String,
      enum: ['notify_later'],
      default: 'notify_later'
    },
    registrationOpenedNotifiedAt: {
      type: Date,
      default: null
    },
    lastManualEmailSentAt: {
      type: Date,
      default: null
    },
    notificationCount: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  {
    timestamps: true
  }
);

eventInterestSchema.index({ eventId: 1, email: 1 }, { unique: true });

export const EventInterest = mongoose.model('EventInterest', eventInterestSchema);
