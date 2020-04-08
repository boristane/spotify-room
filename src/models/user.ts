import mongoose, { Document, Schema } from "mongoose";

const UserSchema: Schema = new Schema({
  _id: mongoose.Types.ObjectId,
  birthdate: String,
  country: String,
  display_name: String,
  email: String,
  external_urls: Object,
  followers: {
    href: String,
    total: Number,
  },
  id: String,
  href: String,
  images: [{
    height: Number,
    url: String,
    width: Number,
  }],
  product: String,
  type: String,
  uri: String,
  explicit_content: { filter_enabled: Boolean, filter_locked: Boolean }
}, { timestamps: true });

export interface IUser extends Document {
  _id: string;
  birthdate: string;
  country: string;
  display_name: string;
  email: string;
  external_urls: { [propName: string]: string };
  followers: { href?: string; total: number };
  href: string;
  id: string;
  images: {
    height: number;
    url: string;
    width: number;
  }[];
  product: string;
  type: string;
  uri: string;
  explicit_content: { filter_enabled: boolean; filter_locked: boolean; }
}

export default mongoose.model<IUser>("User", UserSchema);
