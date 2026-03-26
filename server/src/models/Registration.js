import mongoose from 'mongoose';

const playerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    phone: {
      type: String,
      required: true,
      trim: true
    },
    address: {
      type: String,
      required: true,
      trim: true
    }
  },
  { _id: false }
);

const registrationSchema = new mongoose.Schema(
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
    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
      required: true
    },
    status: {
      type: String,
      enum: ['Registered', 'Confirmed'],
      default: 'Registered',
      index: true
    },
    confirmedAt: {
      type: Date,
      default: null
    },
    name: {
      type: String,
      default: ''
    },
    teamName: {
      type: String
    },
    captainName: {
      type: String
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true
    },
    phone1: {
      type: String,
      required: true,
      trim: true
    },
    phone2: {
      type: String,
      required: true,
      trim: true
    },
    address: {
      type: String,
      required: true,
      trim: true
    },
    players: {
      type: [playerSchema],
      default: []
    }
  },
  {
    timestamps: true
  }
);

registrationSchema.index({ eventId: 1, email: 1 }, { unique: true });
registrationSchema.index(
  { eventId: 1, teamName: 1 },
  {
    unique: true,
    partialFilterExpression: {
      teamName: { $exists: true, $ne: '' }
    }
  }
);

export const Registration = mongoose.model('Registration', registrationSchema);
