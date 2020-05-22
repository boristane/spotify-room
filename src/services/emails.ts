


import mailgun from "mailgun-js";
require("dotenv").config();

import logger from "logger";
import { ICreateAccountData, ICreateRoomData, IInviteToRoomData } from "../typings/emails";

export async function sendEmail(data: Record<string, any>, type: string) {
  const mg = mailgun({
    apiKey: process.env.MAILGUN_API_KEY || "",
    domain: process.env.MAILGUN_DOMAIN || "",
    host: "api.eu.mailgun.net"
  });
  let emailData: mailgun.messages.SendTemplateData;
  let subscriberData: mailgun.lists.MemberCreateData;
  switch (type) {
    case emailType.createRoom: {
      emailData = getCreateRoomEmailData(data as ICreateRoomData);
      break;
    }
    case emailType.inviteToRoom: {
      emailData = getInviteToRoomEmailData(data as IInviteToRoomData);
      break;
    }
    case emailType.createAccount: {
      emailData = getCreateAccountEmailData(data as ICreateAccountData);
      subscriberData = getCreateAccountSubscriberData(data as ICreateAccountData);
      const alphaEmailListId = process.env.USERS_EMAIL_LIST_ID || "";
      await mg.lists(alphaEmailListId).members().create(subscriberData);
      break;
    }
    default: {
      const m = "Seriously -_- ... Got an unknown email type.";
      logger.error(m, { data, type });
      return;
    }
  }

  try {
    logger.info("Ready to send email", { data: emailData });
    await mg.messages().send(emailData);
  } catch (error) {
    const m = "There was a problem sending an email";
    logger.error(m, { data: {domain: process.env.MAILGUN_DOMAIN, key: process.env.MAILGUN_API_KEY}, error });
  }
}

export const enum emailType {
  createAccount = "CREATE_ACCOUNT",
  createRoom = "CREATE_ROOM",
  inviteToRoom = "INVITE_TO_ROOM"
}

function getCreateRoomEmailData(data: ICreateRoomData): mailgun.messages.SendTemplateData {
  const emailData: mailgun.messages.SendTemplateData = {
    from: `${process.env.MAILGUN_USER_NAME} ${process.env.MAILGUN_FROM}`,
    to: `${data.email}`,
    subject: "Your rooom awaits",
    template: process.env.MG_CREATE_ROOM_EMAIL || "",
    "h:X-Mailgun-Variables": JSON.stringify({
      name: data.name.trim().split(" ")[0],
      roomName: data.roomName,
      roomId: data.roomId,
    }),
    "h:Reply-To": process.env.MAILGUN_REPLY_TO,
    "o:tag": "create-room",
  };
  return emailData;
}

function getInviteToRoomEmailData(data: IInviteToRoomData): mailgun.messages.SendTemplateData {
  const emailData: mailgun.messages.SendTemplateData = {
    from: `${process.env.MAILGUN_USER_NAME} ${process.env.MAILGUN_FROM}`,
    to: `${data.email}`,
    subject: `Happening now: ${data.name} is inviting you to a music listening session`,
    template: process.env.MG_INVITE_TO_ROOM_EMAIL || "",
    "h:X-Mailgun-Variables": JSON.stringify({
      name: data.name,
      roomName: data.roomName,
      roomId: data.roomId,
    }),
    "o:tag": "invite-to-room",
  };
  return emailData;
}

function getCreateAccountEmailData(data: ICreateAccountData): mailgun.messages.SendTemplateData {
  const emailData: mailgun.messages.SendTemplateData = {
    from: `${process.env.MAILGUN_USER_NAME} ${process.env.MAILGUN_FROM}`,
    to: `${data.email}`,
    subject: "Welcome to rooom",
    template: process.env.MG_CREATE_ACCOUNT_EMAIL || "",
    "h:X-Mailgun-Variables": JSON.stringify({
      name: data.name.trim().split(" ")[0],
    }),
    "h:Reply-To": process.env.MAILGUN_REPLY_TO,
    "o:tag": "create-account",
  };
  return emailData;
}

export function getCreateAccountSubscriberData(data: ICreateAccountData): mailgun.lists.MemberCreateData {
  const subscriberData: mailgun.lists.MemberCreateData = {
    subscribed: true,
    address: data.email,
    name: data.name,
    vars: {
      created: new Date().toISOString(),
    }
  };
  return subscriberData;
}