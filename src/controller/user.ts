import logger from "logger";
import _ from "lodash";
import { NextFunction, Response, Request } from "express";
import { getUser, updateUserEmailSubscription } from "../services/database";
import { sendEmail, emailType } from "../services/emails";
import { send500, send404, send401 } from "../helpers/httpResponses";

export async function getMe(req: Request, res: Response, next: NextFunction) {
  const { id } = req.query;
  try {
    if (!id) {
      send401(res, "We could not find you in our database. Please try again.");
      return next();
    }
    const user = await getUser(id);
    if (!user) {
      send404(res, "We could not find you in our database. Please try again.");
      return next();
    }
    res.locals.body =  _.omit(user, ["email", "birthdate"]);
    res.status(200).json({ user: _.omit(user, ["email", "birthdate"]) });
    return next();
  } catch (error) {
    const message = "Error getting a user";
    logger.error(message, { error, id });
    send500(res, message);
    return next();
  }
}

export async function updateEmailSubscription(req: Request, res: Response, next: NextFunction) {
  const { id } = req.query;
  const { isEmailSubscriber } = req.body;
  try {
    if (!id) {
      send401(res, "We could not find you in our database. Please try again.");
      return next();
    }
    const user = await getUser(id);
    if (!user) {
      send404(res, "We could not find you in our database. Please try again.");
      return next();
    }
    await updateUserEmailSubscription(user, isEmailSubscriber);
    if (isEmailSubscriber) {
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
    send500(res, message);
    return next();
  }
}