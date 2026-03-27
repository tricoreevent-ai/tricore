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
    matchType: {
      type: String,
      enum: ['League', 'Group Stage', 'Quarterfinal', 'Semifinal', 'Final', 'Third Place', 'Knockout'],
      default: 'League'
    },
    groupName: {
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
      enum: ['Scheduled', 'Pending', 'Completed', 'Postponed', 'Abandoned', 'Cancelled', 'Bye'],
      default: 'Scheduled'
    },
    winnerTeam: {
      type: String,
      default: '',
      trim: true
    },
    officialName: {
      type: String,
      default: '',
      trim: true
    },
    officialRole: {
      type: String,
      default: '',
      trim: true
    },
    teamARuns: {
      type: Number,
      default: null
    },
    teamAWickets: {
      type: Number,
      default: null
    },
    teamAOvers: {
      type: String,
      default: '',
      trim: true
    },
    teamAGoals: {
      type: Number,
      default: null
    },
    teamABonusPoints: {
      type: Number,
      default: 0
    },
    teamBRuns: {
      type: Number,
      default: null
    },
    teamBWickets: {
      type: Number,
      default: null
    },
    teamBOvers: {
      type: String,
      default: '',
      trim: true
    },
    teamBGoals: {
      type: Number,
      default: null
    },
    teamBBonusPoints: {
      type: Number,
      default: 0
    },
    manOfTheMatch: {
      type: String,
      default: '',
      trim: true
    },
    resultNotes: {
      type: String,
      default: '',
      trim: true
    },
    cancellationReason: {
      type: String,
      default: '',
      trim: true
    },
    resultLocked: {
      type: Boolean,
      default: false
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
