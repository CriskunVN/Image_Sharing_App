import mongoose from "mongoose";
import Joi from "joi";

export interface IUser {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  password: string;
  token?: string;
  isConfirmed: boolean;
}

const userSchema = new mongoose.Schema<IUser>({
  firstName: { type: String, default: null },
  lastName: { type: String, default: null },
  username: { type: String, unique: true },
  email: { type: String, unique: true },
  password: { type: String },
  token: { type: String },
  isConfirmed: { type: Boolean, default: false },
});

const User = mongoose.model<IUser>("User", userSchema);

const validate = (user: IUser) => {
  const schema = Joi.object({
    firstName: Joi.string().required(),
    lastName: Joi.string().required(),
    username: Joi.string().required(),
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  });
  return schema.validate(user);
};

export { User, validate };
