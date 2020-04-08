import app from "./src/server";
import logger from "logger";
import serverless from "serverless-http";

const handler = serverless(app);

export const server = async (event: any, context: any) => {
  logger.info("Rooom started", { event });
  return handler(event, context);
}