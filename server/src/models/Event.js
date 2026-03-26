import mongoose from 'mongoose';

const eventSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      default: ''
    },
    bannerImage: {
      type: String,
      default: ''
    },
    sportType: {
      type: String,
      enum: ['Cricket', 'Football', 'Badminton', 'Swimming'],
      required: true
    },
    venue: {
      type: String,
      required: true,
      trim: true
    },
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date,
      required: true
    },
    maxParticipants: {
      type: Number,
      required: true,
      min: 1
    },
    entryFee: {
      type: Number,
      required: true,
      min: 0
    },
    registrationDeadline: {
      type: Date,
      required: true
    },
    teamSize: {
      type: Number,
      required: true,
      min: 1
    },
    playerLimit: {
      type: Number,
      required: true,
      min: 1
    },
    registrationEnabled: {
      type: Boolean,
      default: true
    },
    isHidden: {
      type: Boolean,
      default: false
    },
    isDeleted: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

export const Event = mongoose.model('Event', eventSchema);
