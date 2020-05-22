require("dotenv").config();
import { connectToDb } from "../helpers/database";
import Room from "../models/room";
import { writeFileSync } from "fs";

async function up() {
  await connectToDb();
  const rooms = await Room.find();
  writeFileSync(`./rooms-${(new Date().toISOString())}.json`, JSON.stringify(rooms));
  console.log(`Found ${rooms.length} rooms`);
  for (let i = 0; i < rooms.length; i += 1) {
    const room = rooms[i];
    const roomObject = room.toObject();
    if (!roomObject.master) {
      console.log(`Ignoring the room with id ${room.id}`);
      continue;
    }
    const master = roomObject.master;
    const members = roomObject.members;

    room.host = master;
    room.guests = members;
    // @ts-ignore
    room.master = undefined; room.members = undefined;
    console.log(`Updating room ${i + 1} of ${rooms.length}`);
    await room.save();
  }
}


up();