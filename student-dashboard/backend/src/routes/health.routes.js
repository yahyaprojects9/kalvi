import { Router } from "express";
import { databasePing } from "../repositories/content.repository.js";

const router = Router();

router.get("/", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

router.get("/db", async (_req, res, next) => {
  try {
    res.status(200).json(await databasePing());
  } catch (error) {
    next(error);
  }
});

export default router;
