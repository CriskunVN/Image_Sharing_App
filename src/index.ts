import dotenv from "dotenv";
dotenv.config();

import { connect } from "./database/database";

import express, { Express, Request, Response } from "express";

const app: Express = express();
const port: number = 5000;
connect();

app.get("/", (req: Request, res: Response) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`App is listening on port ${port}!`);
});
