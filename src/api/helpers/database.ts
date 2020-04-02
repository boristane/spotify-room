import mongoose from "mongoose";

export async function connectToDb() {
  const mongoDBURI = `mongodb+srv://eclectic:${process.env.MONGO_ATLAS_PASSWORD}@eclecticdata-zt9sk.mongodb.net/${process.env.MONGO_ATLAS_DATABASE}?retryWrites=true&w=majority`;
  mongoose.connect(mongoDBURI, { useNewUrlParser: true, useUnifiedTopology: true });
}