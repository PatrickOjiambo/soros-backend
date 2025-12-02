import express, {Router} from "express";
import type MessageResponse from "../interfaces/message-response";
import auth from "./auth";

const router: Router = express.Router();

router.get<object, MessageResponse>("/", (req, res) => {
  res.json({
    message: "API - 👋🌎🌍🌏",
  });
});

router.use("/auth", auth);

export default router;
