import axios from "axios";

async function joinRoom(roomId: string, token: string, userId: string, deviceId: string) {
  const response = await axios.put("/room/join",{},{
    params: {
      id: roomId,
      token,
      userId,
      deviceId,
    }
  });
  return response;
}

export default {
  joinRoom,
}