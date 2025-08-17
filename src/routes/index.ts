import express, { Router } from "express";

import * as userController from "../controllers/user.controller";

const router = Router();

router.post("/signup", userController.signup);

// Map the `verify` request to the verify function
router.get("/verify/:confirmationToken", userController.verifyEmail);

export default router;
