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
}

const sendEmail = async ({
  email,
  username,
}: SendEmailParams): Promise<void> => {
  // Create a unique confirmation token
  const confirmationToken = encrypt(username);
  const apiUrlFrontend =
    process.env.FRONTEND_URL ||
    "https://ed-5313042160418816.educative.run" ||
    "http://0.0.0.0:4000";

  // Initialize the Nodemailer with your Gmail credentials
  const Transport = await createTransporter();

  // Configure the email options
  const mailOptions = {
    from: "Educative Fullstack Course",
    to: email,
    subject: "Email Confirmation",
    html: `Press the following link to verify your email: <a href=${apiUrlFrontend}/verify/${confirmationToken}>Verification Link</a>`,
  };

  // Send the email (không gửi response ở đây)
  Transport.sendMail(mailOptions, function (error: any, res: Response) {
    if (error) {
      res.status(500).send(error);
      console.error("Send email error:", error);
    } else {
      res.status(200).json({
        status: "success",
        message: "Confirmation email sent",
      });
      console.log("Confirmation email sent");
    }
  });
};

export const verifyEmail = async (
  req: Request,
  res: Response
): Promise<void> => {
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
      res.status(409).json({ error: "User Not Found" });
      return;
    }
  } catch (err: any) {
    console.error(err);
    res.status(400).json({ error: err.message });
    return;
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
      return;
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

    await sendEmail({ email, username });
    // Return the created user data
    res.status(201).json({
      status: "success",
      message: "User created successfully , Please confirm your email",
      data: userObj,
    });
    return;
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal server error");
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    // Get user data
    const { emailOrUsername, password } = req.body;

    // Validate user data
    if (!(emailOrUsername && password)) {
      res.status(400).json({ error: "All data is required" });
      return;
    }

    // A regex expression to test if the given value is an email or username
    let regexEmail = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
    const data: { email?: string; username?: string } = regexEmail.test(
      emailOrUsername
    )
      ? {
          email: emailOrUsername,
        }
      : {
          username: emailOrUsername,
        };

    // Validate if user exist in our database
    const user = await User.findOne(data);

    if (user && (await bcrypt.compare(password, user.password))) {
      // Create token
      const email = user.email;
      const token = jwt.sign(
        { user_id: user._id, email },
        process.env.TOKEN_SECRET_KEY as string,
        {
          expiresIn: "2h",
        }
      );

      // save user token
      user.token = token;

      // user
      res.status(200).json(user);
      return;
    }
    res.status(400).json({ error: "Invalid Credentials" });
    return;
  } catch (err: any) {
    console.error(err);
    res.status(400).json({ error: err.message });
    return;
  }
};
