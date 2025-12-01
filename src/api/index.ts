import express, {Router} from "express";

import type MessageResponse from "../interfaces/message-response";

import emojis from "./emojis";

const router: Router = express.Router();

router.get<object, MessageResponse>("/", (req, res) => {
  res.json({
    message: "API - 👋🌎🌍🌏",
  });
});

router.use("/emojis", emojis);

export default router;
