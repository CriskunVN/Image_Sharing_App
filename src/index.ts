import dotenv from "dotenv";
dotenv.config();

import { connect } from "./database/database";
import express, { Express, Request, Response } from "express";
import router from "./routes/index";
const app: Express = express();
const port: Number = Number(process.env.PORT);
connect();

app.use(express.json());
app.use("/api", router);

app.get("/", (req: Request, res: Response) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`App is listening on port ${port}!`);
});
