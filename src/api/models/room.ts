import mongoose, { Document, Schema } from "mongoose";

const RoomSchema: Schema = new Schema({
  _id: mongoose.Types.ObjectId,
  master: { id: String, token: String },
  members: [{ id: String, token: String }],
  songs: [{ id: String, completed: Boolean, approved: Boolean }],
}, { timestamps: true });

export interface IRoom extends Document {
  _id: string;
  master: { id: string; token: string };
  members: { id: string; token: string }[];
  songs: {
    id: string;
    completed: boolean;
    approved: boolean;
  }
}

export default mongoose.model<IRoom>("Room", RoomSchema);
