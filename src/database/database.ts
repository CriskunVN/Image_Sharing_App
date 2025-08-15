import mongoose from "mongoose";

const { MONGO_URI } = process.env;

export const connect = () => {
  mongoose
    .connect(MONGO_URI as string)
    .then(() => {
      console.log("connected to database successfully...");
    })
    .catch((error: any) => {
      console.log(
        "failed to connect to the database. terminating the application..."
      );
      console.error(error);
      process.exit(1);
    });
};
