import mongoose, { Document, Schema } from "mongoose";

const RoomSchema: Schema = new Schema({
  _id: mongoose.Types.ObjectId,
  name: String,
  host: {
    id: String,
    token: String,
    name: String,
    deviceId: String
  },
  guests: [{
    id: String,
    token: String,
    name: String,
    deviceId: String,
    isActive: Boolean,
    currentTrack: String,
    isApproved: Boolean,
    isPlaying: Boolean,
    createdAt: Date,
    sessions: [{
      startDate: Date,
      endDate: Date,
    }],
  }],
  duration: Number,
  isActive: Boolean,
  cover: String,
  tracks: [{
    uri: String,
    completed: Boolean,
    approved: Boolean,
    current: Boolean,
    removed: Boolean,
    name: String,
    artists: [String],
    image: String,
    addedBy: String,
  }],
  sessions: [{
    startDate: Date,
    endDate: Date,
  }],
}, { timestamps: true });

export interface IRoom extends Document {
  _id: string;
  host: {
    id: string;
    token: string;
    name: string,
    deviceId: string
  };
  guests: Array<{
    id: string;
    token: string;
    name: string,
    deviceId: string,
    isActive: boolean,
    currentTrack: string,
    isApproved: boolean;
    isPlaying: boolean;
    createdAt: Date;
    sessions: Array<{
      startDate: Date,
      endDate: Date;
    }>;
  }>;
  duration: number;
  name: string;
  isActive: boolean;
  cover: string;
  tracks: Array<{
    uri: string;
    completed: boolean;
    approved: boolean;
    current: boolean;
    removed: boolean;
    name: string; artists: string[]; image: string;
    addedBy: string;
  }>;
  sessions: Array<{
    startDate: Date,
    endDate: Date;
  }>;
}

export default mongoose.model<IRoom>("Room", RoomSchema);
