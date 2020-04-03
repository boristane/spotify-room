import mongoose, { Document, Schema } from "mongoose";

const RoomSchema: Schema = new Schema({
  _id: mongoose.Types.ObjectId,
  master: { id: String, token: String, name: String },
  members: [{ id: String, token: String, name: String }],
  duration: Number,
  tracks: [{ uri: String, completed: Boolean, approved: Boolean, current: Boolean, name: String, artist: String, image: String }],
}, { timestamps: true });

export interface IRoom extends Document {
  _id: string;
  master: { id: string; token: string; name: string };
  members: { id: string; token: string; name: string }[];
  duration: number;
  tracks: {
    uri: string;
    completed: boolean;
    approved: boolean;
    current: boolean;
    name: string; artist: string; image: string;
  }[]
}

export default mongoose.model<IRoom>("Room", RoomSchema);
