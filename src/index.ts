import dotenv from "dotenv";
dotenv.config();

import { connect } from "./database/database";
import express, { Express, Request, Response } from "express";
import router from "./routes/index";
import auth from "./middleware/auth.middleware";
import corsConfig from "./config/cors.config";
import bodyParser from "body-parser";

const app: Express = express();
app.use(corsConfig);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use("/uploads", express.static("./uploads"));

// PORT SERVER
const port: Number = Number(process.env.PORT);
connect();

app.get("/", (req: Request, res: Response) => {
  res.send("Hello World!");
});

// Import Routes

// Register the application main router
app.use("/api", router);

app.listen(port, () => {
  console.log(`App is listening on port ${port}!`);
});
