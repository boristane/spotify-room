export interface IEMailUser {
  name: string;
  email: string;
}

export interface ICreateAccountData {
  email: string;
  name: string;
}


export interface ICreateRoomData {
  email: string;
  name: string;
  roomName: string;
  roomId: string;
}

export interface IInviteToRoomData {
  email: string;
  name: string;
  roomName: string;
  roomId: string;
}