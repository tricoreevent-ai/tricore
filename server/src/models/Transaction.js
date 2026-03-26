import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema(
  {
    scope: {
      type: String,
      enum: ['event', 'common'],
      default: 'event'
    },
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required() {
        return this.scope !== 'common';
      }
    },
    type: {
      type: String,
      enum: ['income', 'expense'],
      required: true
    },
    category: {
      type: String,
      required: true
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    date: {
      type: Date,
      required: true
    },
    reference: {
      type: String,
      required: true,
      trim: true
    },
    referenceDocument: {
      type: String,
      default: '',
      trim: true
    },
    paymentMode: {
      type: String,
      enum: ['online', 'cash', 'upi', 'bank'],
      default: 'online'
    },
    notes: {
      type: String,
      default: '',
      trim: true
    },
    invoiceDetails: {
      documentNumber: {
        type: String,
        default: '',
        trim: true
      },
      issueDate: {
        type: Date,
        default: null
      },
      dueDate: {
        type: Date,
        default: null
      },
      billToName: {
        type: String,
        default: '',
        trim: true
      },
      billToCompany: {
        type: String,
        default: '',
        trim: true
      },
      billToEmail: {
        type: String,
        default: '',
        trim: true
      },
      billToPhone: {
        type: String,
        default: '',
        trim: true
      },
      billingAddress: {
        type: String,
        default: '',
        trim: true
      },
      itemDescription: {
        type: String,
        default: '',
        trim: true
      },
      taxLabel: {
        type: String,
        default: '',
        trim: true
      },
      taxRate: {
        type: Number,
        default: 0,
        min: 0
      },
      taxAmount: {
        type: Number,
        default: 0,
        min: 0
      },
      subtotal: {
        type: Number,
        default: 0,
        min: 0
      },
      total: {
        type: Number,
        default: 0,
        min: 0
      }
    },
    source: {
      type: String,
      enum: ['manual', 'payment'],
      default: 'manual'
    },
    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment'
    },
    registrationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Registration'
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true
  }
);

transactionSchema.index({ scope: 1, eventId: 1, type: 1, date: -1 });
transactionSchema.index({ paymentId: 1 }, { unique: true, sparse: true });

export const Transaction = mongoose.model('Transaction', transactionSchema);
