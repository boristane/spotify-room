


import mailgun from "mailgun-js";
require("dotenv").config();

import logger from "logger";
import { IRegisterForAlphaRelease } from "../typings/emails";

export async function sendEmail(data: object, type: string) {
  const mg = mailgun({
    apiKey: process.env.MAILGUN_API_KEY || "",
    domain: process.env.MAILGUN_DOMAIN || "",
    host: "api.eu.mailgun.net"
  });
  let emailData: mailgun.messages.SendTemplateData;
  let subscriberData: mailgun.lists.MemberCreateData;
  console.log(type);
  switch (type) {
    // case eventType.resetPassword: {
    //   emailData = getPasswordResetEmailData(data as IResetPasswordData);
    //   break;
    // }
    // case eventType.signup: {
    //   emailData = getSignupEmailData(data as IActivateAccountData);
    //   break;
    // }
    case emailType.createAccount: {
      emailData = getCreateAccountEmailData(data as IRegisterForAlphaRelease);
      subscriberData = getCreateAccountSubscriberData(data as IRegisterForAlphaRelease);
      const alphaEmailListId = process.env.USERS_EMAIL_LIST_ID || "";
      await mg.lists(alphaEmailListId).members().create(subscriberData);
      break;
    }
    default: {
      const m = "Seriously -_- ... Got an unknown email type. Sending to dead letter.";
      logger.error(m, { data, type });
    }
  }

  try {
    logger.info("Ready to send email", { data: emailData });
    await mg.messages().send(emailData);
  } catch (error) {
    const m = "There was a problem sending an email";
    console.log(emailData);
    logger.error(m, { data: {domain: process.env.MAILGUN_DOMAIN, key: process.env.MAILGUN_API_KEY}, error });
  }
}

export const enum emailType {
  createAccount = "CREATE_ACCOUNT",
}

export function getCreateAccountEmailData(data: IRegisterForAlphaRelease): mailgun.messages.SendTemplateData {
  const emailData: mailgun.messages.SendTemplateData = {
    from: `${process.env.MAILGUN_USER_NAME} ${process.env.MAILGUN_FROM}`,
    to: `${data.email}`,
    bcc: "boris.tane@gmail.com",
    subject: "welcome to rooom",
    template: process.env.MG_CREATE_ACCOUNT_EMAIL || "",
    "h:X-Mailgun-Variables": JSON.stringify({
      name: data.name.trim().split(" ")[0],
    }),
  };
  return emailData;
}

export function getCreateAccountSubscriberData(data: IRegisterForAlphaRelease): mailgun.lists.MemberCreateData {
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