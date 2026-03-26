import mongoose from 'mongoose';

const matchSchema = new mongoose.Schema(
  {
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true
    },
    teamA: {
      type: String,
      required: true,
      trim: true
    },
    teamB: {
      type: String,
      required: true,
      trim: true
    },
    teamASource: {
      type: String,
      default: '',
      trim: true
    },
    teamBSource: {
      type: String,
      default: '',
      trim: true
    },
    venue: {
      type: String,
      default: '',
      trim: true
    },
    date: {
      type: String,
      default: ''
    },
    time: {
      type: String,
      default: ''
    },
    roundNumber: {
      type: Number,
      default: 1
    },
    roundLabel: {
      type: String,
      default: 'Round 1',
      trim: true
    },
    matchNumber: {
      type: Number,
      default: 1
    },
    status: {
      type: String,
      enum: ['Scheduled', 'Pending', 'Completed', 'Bye'],
      default: 'Scheduled'
    },
    winnerTeam: {
      type: String,
      default: '',
      trim: true
    },
    scheduledAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

matchSchema.index({ eventId: 1, scheduledAt: 1 });

export const Match = mongoose.model('Match', matchSchema);
