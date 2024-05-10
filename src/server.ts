require("dotenv").config();

import spotifyRouter from "./router/spotify";
import roomRouter from "./router/room";
import userRouter from "./router/user";
import internalRouter from "./router/internal";

import cookieParser from "cookie-parser";
import express, { Response, Request, NextFunction } from "express";
import path from "path";
import logger from "logger";
import { connectToDb } from "./helpers/database";

const app = express()
  .use(express.static(__dirname + "/../dist"))
  .use(express.json())
  .use(cookieParser());
// Todo change this
import winston from "winston";
import morgan from "morgan";
import json from "morgan-json"
import { apiAuth } from "./auth/auth";
const format = json({
  method: ':method',
  url: ':url',
  status: ':status',
  contentLength: ':res[content-length]',
  originIp: ':req[x-forwarded-for]',
  responseTime: ':response-time'
})

if (process.env.ENV === "prod") {
  const l = winston.createLogger({
    transports: []
  });
  const httpLogger = morgan(format, {
    stream: {
      write: (message) => l.info('HTTP LOG', JSON.parse(message))
    }
  });
  app.use((req: Request, res: Response, next: NextFunction) => {
    try {
      httpLogger(req, res, next);
    } catch (err) {
      }
  });
}

app.use((req, res, next) => {
  if(req.url.includes("javascript")) {
    return res.status(400).json({});
  }
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  if (req.method === "OPTIONS") {
    res.header("Access-Control-Allow-Methods", "PUT, POST, PATCH, DELETE, GET");
    return res.status(200).json({});
  }
  return next();
});

const suppressLoggingPaths = ["/"];
function requestLogger(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (!suppressLoggingPaths.includes(req.url)) {
    logger.info("REQUEST", {
      origin: req.hostname,
      ip: req['x-forwarded-for'],
      url: req.url,
      body: req.body,
      query: req.query,
      method: req.method,
      token: req.headers.authorization,
    });
  }
  next();
}

function responseLogger(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  if (!suppressLoggingPaths.includes(req.url)) {
    logger.info("RESPONSE", {
      statusCode: res.statusCode,
      locals: res.locals,
      url: req.url,
    });
  }
  next();
}

connectToDb();

app.use(logger.bindExpressMiddleware);
app.use(requestLogger);
app.use("/spotify", spotifyRouter);
app.use("/room", roomRouter);
app.use("/user", userRouter);
app.use("/internal", apiAuth, internalRouter);
app.use(responseLogger);
app.get("/you", (req: Request, res: Response) => {
  res.status(200).sendFile(path.join(__dirname + "/../dist/me.html"));
});
app.get("/login", (req: Request, res: Response) => {
  res.status(200).sendFile(path.join(__dirname + "/../dist/login.html"));
});

export default app;
