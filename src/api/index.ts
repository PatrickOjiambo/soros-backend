import express, {Router} from "express";
import type MessageResponse from "../interfaces/message-response";
import auth from "./auth";
import strategies from "./strategies";
import treasury from "./treasury";

const router: Router = express.Router();

router.get<object, MessageResponse>("/", (req, res) => {
  res.json({
    message: "API - 👋🌎🌍🌏",
  });
});

router.use("/auth", auth);
router.use("/strategies", strategies);
router.use("/treasury", treasury);

export default router;
