import express, { Router, Request, Response } from "express";

import * as userController from "../controllers/user.controller";
import auth from "../middleware/auth.middleware";
import * as fileController from "../controllers/file.controller";
import { upload } from "../middleware/multer.middleware";
const router = Router();

router.post("/signup", userController.signup);
router.post("/login", userController.login);
// Map the `verify` request to the verify function
router.get("/verify/:confirmationToken", userController.verifyEmail);
// Map the 'upload' request to the upload function
router.post("/upload", auth, upload.single("file"), fileController.upload);
export default router;
