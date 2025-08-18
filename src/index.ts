import dotenv from "dotenv";
dotenv.config();

import { connect } from "./database/database";
import express, { Express, Request, Response } from "express";
import router from "./routes/index";
import auth from "./middleware/auth.middleware";

const app: Express = express();
const port: Number = Number(process.env.PORT);
connect();

app.use(express.json());

app.get("/", (req: Request, res: Response) => {
  res.send("Hello World!");
});

app.post("/api/hello", auth, (req: Request, res: Response): void => {
  res.status(200).send("Hello 🙌 ");
});

// Import Routes

// Register the application main router
app.use("/api", router);

app.listen(port, () => {
  console.log(`App is listening on port ${port}!`);
});
