import spotifyRouter from "./router/spotify";

import cookieParser from "cookie-parser";
import express, { Response, Request, NextFunction } from "express";
import path from "path";
import mongoose from "mongoose";
import logger from "logger";

const mongoDBURI = `mongodb+srv://eclectic:${process.env.MONGO_ATLAS_PASSWORD}@eclecticdata-zt9sk.mongodb.net/${process.env.MONGO_ATLAS_DATABASE}?retryWrites=true&w=majority`;
mongoose.connect(mongoDBURI, { useNewUrlParser: true });

const app = express()
  .use(express.static(__dirname + "/../../dist"))
  .use(express.json())
  .use(cookieParser());

app.use((req, res, next) => {
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
      url: req.url,
      body: req.body,
      query: req.query,
      method: req.method,
      token: req.headers.authorization,
    });
  }
  next();
}

app.use(requestLogger);
app.use("/spotify", spotifyRouter);
app.get("/you", (req: Request, res: Response) => {
  res.status(200).sendFile(path.join(__dirname + "/../../dist/me.html"));
});

export default app;
