import { Router } from "express";
import { UserController } from "../controllers/mysql/user.js";
import { User } from "../models/mysql/user.js"; // O tu modelo Sequelize

export const routeForUser = Router();
const userController = new UserController(User);

routeForUser.get("/verify", userController.verify);
routeForUser.get("/", userController.getAll);
routeForUser.post("/login", userController.login);
routeForUser.post("/auth/google", userController.loginWithGoogle);
routeForUser.post("/register", userController.register);
routeForUser.post("/resend-verification", userController.resendVerification);
routeForUser.get("/auth", userController.auth);
routeForUser.post("/logout", userController.logout);
routeForUser.post("/forgot-password", userController.forgotPassword);
routeForUser.post("/reset-password", userController.resetPassword);
routeForUser.post("/send-factura", userController.sendFactura);