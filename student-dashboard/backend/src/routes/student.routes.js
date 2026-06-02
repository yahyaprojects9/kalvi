import { Router } from "express";
import { requireStudent, asyncRoute } from "./auth.routes.js";
import { updateStudent } from "../repositories/student.repository.js";

const router = Router();

router.get("/me", asyncRoute(async (req, res) => {
  const session = await requireStudent(req, res);
  if (!session) return;
  res.json({ success: true, data: session.student });
}));

router.patch("/me", asyncRoute(async (req, res) => {
  const session = await requireStudent(req, res);
  if (!session) return;
  const student = await updateStudent(session.student.id, req.body ?? {});
  res.json({ success: true, data: student ?? session.student });
}));

export default router;
