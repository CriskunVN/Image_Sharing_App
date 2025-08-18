// Type cho token (ví dụ payload của JWT)
export type TokenPayload = {
  user_id: string;
  email: string;
  iat?: number;
  exp?: number;
};
import jwt from "jsonwebtoken";
import { Response, Request, NextFunction } from "express";

// Extend Request interface to include user
declare module "express-serve-static-core" {
  interface Request {
    user?: string | TokenPayload;
  }
}

const verify = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers["authorization"];
  // Considering the possible 4 methods to pass the token
  const token =
    (req.body && req.body.token) ||
    (req.query && req.query.token) ||
    req.headers["x-access-token"] ||
    (authHeader && authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : undefined);
  if (!token) {
    // If the token is not represented in any method, return an error
    res.status(403).send("A token is required for authentication");
    return;
  }
  try {
    // decode the token, using the TOKEN_SECRET_KEY that we used to encode it, to get the user data
  const decoded = jwt.verify(token, process.env.TOKEN_SECRET_KEY as string) as TokenPayload;
  req.user = decoded;
  } catch (err) {
    // In case of failing to detect the token
    res.status(401).send("Invalid Token");
    return;
  }
  // This is useful if you have much middleware, the next() function passes the request to the next middleware
  return next();
};

export default verify;
