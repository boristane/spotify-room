import { Response } from "express";

export async function send404(res: Response, message: string) {
  const response = { message: message ?? "Not found" };
  res.locals.body = response;
  return res.status(404).json(response);
}

export async function send401(res: Response, message: string) {
  const response = { message: message ?? "Unauthorized" };
  res.locals.body = response;
  return res.status(401).json(response);
}