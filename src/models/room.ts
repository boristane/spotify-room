import mongoose, { Document, Schema } from "mongoose";

const RoomSchema: Schema = new Schema({
  _id: mongoose.Types.ObjectId,
  name: String,
  host: { id: String, token: String, name: String, deviceId: String },
  guests: [{ id: String, token: String, name: String, deviceId: String, isActive: Boolean, currentTrack: String, isApproved: Boolean }],
  duration: Number,
  isActive: Boolean,
  tracks: [{ uri: String,
    completed: Boolean,
    approved: Boolean,
    current: Boolean,
    removed: Boolean,
    name: String,
    artists: [String],
    image: String,
    addedBy: String,
  }],
}, { timestamps: true });

export interface IRoom extends Document {
  _id: string;
  host: { id: string; token: string; name: string, deviceId: string };
  guests: { id: string; token: string; name: string, deviceId: string, isActive: boolean, currentTrack: string, isApproved: boolean; }[];
  duration: number;
  name: string;
  isActive: boolean;
  tracks: {
    uri: string;
    completed: boolean;
    approved: boolean;
    current: boolean;
    removed: boolean;
    name: string; artists: string[]; image: string;
    addedBy: string;
  }[]
}

export default mongoose.model<IRoom>("Room", RoomSchema);
