import mongoose from 'mongoose';

const supportedSportTypes = [
  'Cricket',
  'Football',
  'Badminton',
  'Swimming',
  'Multi-Sport',
  'Other'
];

const calendarSportsEventSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      default: '',
      trim: true
    },
    sportType: {
      type: String,
      enum: supportedSportTypes,
      default: 'Other'
    },
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date,
      required: true
    },
    location: {
      type: String,
      default: '',
      trim: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },
  {
    timestamps: true
  }
);

calendarSportsEventSchema.index({ startDate: 1, endDate: 1, sportType: 1 });

export const calendarSportTypes = supportedSportTypes;
export const CalendarSportsEvent = mongoose.model(
  'CalendarSportsEvent',
  calendarSportsEventSchema
);
