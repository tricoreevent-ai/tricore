import mongoose from 'mongoose';

import { adminPermissions } from '../constants/adminAccess.js';

const userSchema = new mongoose.Schema(
  {
    authProvider: {
      type: String,
      enum: ['google', 'local'],
      default: 'google'
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true
    },
    username: {
      type: String,
      trim: true,
      lowercase: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      lowercase: true,
      trim: true
    },
    passwordHash: {
      type: String,
      default: '',
      select: false
    },
    avatar: {
      type: String,
      default: ''
    },
    role: {
      type: String,
      default: 'user'
    },
    roleName: {
      type: String,
      trim: true,
      default: ''
    },
    permissions: {
      type: [
        {
          type: String,
          enum: Object.values(adminPermissions)
        }
      ],
      default: []
    },
    payoutDetails: {
      upiId: {
        type: String,
        default: '',
        trim: true
      },
      accountHolderName: {
        type: String,
        default: '',
        trim: true
      },
      accountNumber: {
        type: String,
        default: '',
        trim: true
      },
      bankName: {
        type: String,
        default: '',
        trim: true
      },
      ifscCode: {
        type: String,
        default: '',
        trim: true
      },
      branchName: {
        type: String,
        default: '',
        trim: true
      },
      notes: {
        type: String,
        default: '',
        trim: true
      }
    },
    lastLoginAt: Date
  },
  {
    timestamps: true
  }
);

userSchema.index(
  { username: 1 },
  {
    unique: true,
    partialFilterExpression: {
      username: { $gt: '' }
    }
  }
);

userSchema.index(
  { email: 1 },
  {
    unique: true,
    partialFilterExpression: {
      email: { $gt: '' }
    }
  }
);

userSchema.set('toJSON', {
  transform: (_document, returnedObject) => {
    delete returnedObject.passwordHash;
    return returnedObject;
  }
});

export const User = mongoose.model('User', userSchema);
