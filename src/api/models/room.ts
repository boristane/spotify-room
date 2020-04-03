import mongoose, { Document, Schema } from "mongoose";

const RoomSchema: Schema = new Schema({
  _id: mongoose.Types.ObjectId,
  master: { id: String, token: String },
  members: [{ id: String, token: String }],
  duration: Number,
  tracks: [{ uri: String, completed: Boolean, approved: Boolean, current: Boolean }],
}, { timestamps: true });

export interface IRoom extends Document {
  _id: string;
  master: { id: string; token: string };
  members: { id: string; token: string }[];
  duration: number;
  tracks: {
    uri: string;
    completed: boolean;
    approved: boolean;
    current: boolean;
  }[]
}

export default mongoose.model<IRoom>("Room", RoomSchema);
