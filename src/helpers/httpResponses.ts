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

export async function send400(res: Response, message: string) {
  const response = { message: message ?? "Bad Request" };
  res.locals.body = response;
  return res.status(400).json(response);
}

export async function send500(res: Response, message: string) {
  const response = { message: message ?? "Unexpected error" };
  res.locals.body = response;
  return res.status(500).json(response);
}
