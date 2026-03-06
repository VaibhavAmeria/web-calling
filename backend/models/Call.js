const mongoose = require('mongoose');

const callSchema = new mongoose.Schema(
  {
    caller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['initiated', 'active', 'ended', 'rejected', 'missed'],
      default: 'initiated',
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    endedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Indexes for efficient querying
callSchema.index({ caller: 1, startedAt: -1 });
callSchema.index({ receiver: 1, startedAt: -1 });

module.exports = mongoose.model('Call', callSchema);
