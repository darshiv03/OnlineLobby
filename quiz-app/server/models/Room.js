import mongoose from 'mongoose';

const PlayerSchema = new mongoose.Schema({
  socketId: { type: String, index: true },
  name: String,
  score: { type: Number, default: 0 },
  answered: { type: Boolean, default: false },
});

const RoomSchema = new mongoose.Schema(
  {
    code: { type: String, unique: true, index: true },
    hostId: String,
    status: {
      type: String,
      enum: ['lobby', 'question', 'reveal', 'over'],
      default: 'lobby',
      index: true,
    },
    questionIndex: { type: Number, default: -1 },
    acceptingAnswers: { type: Boolean, default: false },
    players: [PlayerSchema],
  },
  { timestamps: true }
);

export default mongoose.model('Room', RoomSchema);
