import mongoose from "mongoose";

export async function connectToDb() {
  const uri = `mongodb+srv://rooom:${process.env.MONGO_ATLAS_PASSWORD}@eclecticdata.zt9sk.mongodb.net/?retryWrites=true&w=majority&appName=eclecticData`;
  mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
}