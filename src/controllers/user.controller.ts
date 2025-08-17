import { User, validate } from "../models/user.model";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import type { Request, Response } from "express";
import { encrypt, decrypt } from "../utils/confirmation";
import nodemailer from "nodemailer";
import { google } from "googleapis";
import { OAuth2Client } from "google-auth-library";

const createTransporter = async (): Promise<nodemailer.Transporter> => {
  const oauth2Client = new OAuth2Client(
    process.env.OAUTH_CLIENT_ID as string,
    process.env.OAUTH_CLIENT_SECRET as string,
    "https://developers.google.com/oauthplayground"
  );

  oauth2Client.setCredentials({
    refresh_token: process.env.OAUTH_REFRESH_TOKEN as string,
  });

  const accessToken = await new Promise<string>((resolve, reject) => {
    oauth2Client.getAccessToken((err, token) => {
      if (err || !token) {
        reject(err);
        return;
      }
      resolve(token);
    });
  });

  const Transport = nodemailer.createTransport({
    service: "gmail",
    auth: {
      type: "OAuth2",
      user: process.env.GMAIL_EMAIL as string,
      accessToken,
      clientId: process.env.OAUTH_CLIENT_ID as string,
      clientSecret: process.env.OAUTH_CLIENT_SECRET as string,
      refreshToken: process.env.OAUTH_REFRESH_TOKEN as string,
    },
  });

  return Transport;
};

interface SendEmailParams {
  email: string;
  username: string;
  res: Response;
}

const sendEmail = async ({
  email,
  username,
  res,
}: SendEmailParams): Promise<void> => {
  // Create a unique confirmation token
  const confirmationToken = encrypt(username);
  const apiUrl =
    process.env.API_URL ||
    "https://ed-5313042160418816.educative.run" ||
    "http://0.0.0.0:4000";

  // Initialize the Nodemailer with your Gmail credentials
  const Transport = await createTransporter();

  // Configure the email options
  const mailOptions = {
    from: "Educative Fullstack Course",
    to: email,
    subject: "Email Confirmation",
    html: `Press the following link to verify your email: <a href=${apiUrl}/verify/${confirmationToken}>Verification Link</a>`,
  };

  // Send the email
  Transport.sendMail(mailOptions, function (error, response) {
    if (error) {
      res.status(400).send(error);
    } else {
      res.status(201).json({
        message: "Account created successfully, please verify your email.",
      });
    }
  });
};

export const verifyEmail = async (req: Request, res: Response) => {
  try {
    // Get the confirmation token
    const { confirmationToken } = req.params;

    // Decrypt the username
    const username = decrypt(confirmationToken as string);

    // Check if there is anyone with that username
    const user = await User.findOne({ username: username });

    if (user) {
      // If there is anyone, mark them as confirmed account
      user.isConfirmed = true;
      await user.save();

      // Return the created user data
      res
        .status(201)
        .json({ message: "User verified successfully", data: user });
    } else {
      return res.status(409).send("User Not Found");
    }
  } catch (err) {
    console.error(err);
    return res.status(400).send(err);
  }
};

export const signup = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate the user data
    const { error } = validate(req.body as any);
    if (error) {
      const message =
        error.details?.[0]?.message ||
        (error as any).message ||
        "Invalid input";
      res.status(400).send(message);
    }

    const { firstName, lastName, username, email, password } = req.body; // Get the user data

    // Check if the user exists in the database
    const oldUser = await User.findOne({ email: email.toLowerCase() });
    if (oldUser) {
      res.status(409).json({
        status: "fail",
        message: "User Already Exist. Please Login",
      });
      return;
    }

    // Hash the password. Provide a default salt rounds if env var is missing
    const saltRounds = Number(process.env.SALT) || 10;
    const salt = await bcrypt.genSalt(saltRounds);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create an user object
    const user = await User.create({
      firstName,
      lastName,
      username,
      email: email.toLowerCase(),
      password: hashedPassword,
    });

    // Create the user token. Ensure TOKEN_SECRET_KEY exists
    const secret = process.env.TOKEN_SECRET_KEY as string;
    if (!secret) {
      console.error("TOKEN_SECRET_KEY is not defined in environment variables");
      res.status(500).send("Server configuration error");
      return;
    }

    const token = jwt.sign({ userId: user._id, email }, secret, {
      expiresIn: "2h",
    });
    user.token = token;
    await user.save();

    // Remove password before returning the user object
    const userObj = user.toObject();
    // avoid exposing password hash
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete (userObj as any).password;

    // Return the created user data
    res.status(201).json(userObj);
    return sendEmail({ email, username, res });
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal server error");
  }
};
