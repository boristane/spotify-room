import { Request, Response, NextFunction } from "express";
import logger from "logger";

export async function apiAuth(req: Request, res: Response, next: NextFunction) {
  const apiToken = process.env.API_TOKEN;
  try {
    const token = req.get("X-TOKEN-AUTH") || "";
    if (!token) {
      throw new Error("No token found in the headers");
    }
    if(token !== apiToken) {
      throw new Error("Bad Token");
    }
    next();
  } catch (error) {
    logger.error("There was an error with the authentication token", { error });
    const response = { message: "unauthorized" };
    res.locals.body = response;
    res.status(401).json(response);
  }
}
