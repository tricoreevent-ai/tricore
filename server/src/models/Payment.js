import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    currency: {
      type: String,
      default: 'INR'
    },
    status: {
      type: String,
      enum: ['Pending', 'Under Review', 'Confirmed', 'Failed', 'Paid'],
      default: 'Pending'
    },
    method: {
      type: String,
      enum: ['razorpay', 'manual', 'free'],
      default: 'razorpay',
      index: true
    },
    paymentId: {
      type: String,
      default: ''
    },
    manualReference: {
      type: String,
      default: '',
      trim: true
    },
    orderId: {
      type: String,
      required: true
    },
    receipt: {
      type: String,
      default: ''
    },
    receiptFilename: {
      type: String,
      default: '',
      trim: true
    },
    proofSubmittedAt: {
      type: Date,
      default: null
    },
    proofEmailRecipients: {
      type: [String],
      default: []
    },
    razorpaySignature: {
      type: String,
      default: ''
    },
    confirmedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    confirmedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

paymentSchema.index({ eventId: 1, status: 1 });
paymentSchema.index({ userId: 1, orderId: 1 }, { unique: true });

export const Payment = mongoose.model('Payment', paymentSchema);
