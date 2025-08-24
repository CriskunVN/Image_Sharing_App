import jwt from "jsonwebtoken";
import { Response, Request, NextFunction } from "express";

// Extend Request interface to include user
// Định nghĩa type cho payload của JWT
export type TokenPayload = {
  user_id?: string;
  userId?: string;
  email?: string;
  iat?: number;
  exp?: number;
};

declare module "express-serve-static-core" {
  interface Request {
    user?: TokenPayload;
  }
}

const verify = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers["authorization"];
  const token =
    (req.body && req.body.token) ||
    (req.query && req.query.token) ||
    req.headers["x-access-token"] ||
    (authHeader &&
    typeof authHeader === "string" &&
    authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : undefined);

  if (!token) {
    res.status(403).send("A token is required for authentication");
    return;
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.TOKEN_SECRET_KEY as string
    ) as TokenPayload;
    req.user = decoded;
  } catch (err) {
    res.status(401).send("Invalid Token");
    return;
  }

  next();
};

export default verify;
