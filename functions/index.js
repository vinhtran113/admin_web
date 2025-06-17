import {onRequest} from "firebase-functions/v2/https";
import express from "express";
import next from "next";
import {fileURLToPath} from "url";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dev = process.env.NODE_ENV !== "production";
const app = next({
  dev,
  dir: path.join(__dirname, ".."), // <-- Gốc dự án
  conf: {distDir: ".next"}, // <-- Thư mục build ở gốc
});
const handle = app.getRequestHandler();

const server = express();

let isPrepared = false;
const preparePromise = app.prepare().then(() => {
  isPrepared = true;
});

server.use(async (req, res, nextMiddleware) => {
  if (!isPrepared) await preparePromise;
  nextMiddleware();
});

server.all("*", (req, res) => {
  return handle(req, res);
});

export const nextServer = onRequest({region: "us-central1"}, server);
