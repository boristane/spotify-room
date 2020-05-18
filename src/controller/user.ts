import logger from "logger";
import _ from "lodash";
import { NextFunction, Response, Request } from "express";
import { getUser, updateUserEmailSubscription } from "../services/database";
import { sendEmail, emailType } from "../services/emails";

export async function getMe(req: Request, res: Response, next: NextFunction) {
  const { id } = req.query;
  try {
    if (!id) {
      const response = { message: "Not found" };
      res.locals.body = response;
      res.status(404).json(response);
      return next();
    }
    const user = await getUser(id);
    if (!user) {
      const response = { message: "Not found" };
      res.locals.body = response;
      res.status(404).json(response);
      return next();
    }
    res.locals.body = user;
    res.status(200).json({ user: _.omit(user, ["email", "birthdate"]) });
    return next();
  } catch (error) {
    const message = "Error getting a user";
    logger.error(message, { error, id });
    res.status(500).json({ message });
    return next();
  }
}

export async function updateEmailSubscription(req: Request, res: Response, next: NextFunction) {
  const { id } = req.query;
  const { isEmailSubscriber } = req.body;
  try {
    if (!id) {
      const response = { message: "Not found" };
      res.locals.body = response;
      res.status(404).json(response);
      return next();
    }
    const user = await getUser(id);
    if (!user) {
      const response = { message: "Not found" };
      res.locals.body = response;
      res.status(404).json(response);
      return next();
    }
    await updateUserEmailSubscription(user, isEmailSubscriber);
    if(isEmailSubscriber) {
      sendEmail({ name: user.display_name, email: user.email }, emailType.createAccount);
    }
    res.locals.body = { user: user.id, isEmailSubscriber };
    res.status(200).json({
      message: "All good", isEmailSubscriber, user: user.id,
    });
    return next();
  } catch (error) {
    const message = "Error Updating the email subscriber status of a user";
    logger.error(message, { error, id });
    res.status(500).json({ message });
    return next();
  }
}