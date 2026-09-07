import { Router } from "express";
import { AppError } from "../utils/appError.js";

export function createAuthRoutes({ studentRepository }) {
  const router = Router();

  router.post("/login", (req, res) => {
    const studentNumber = String(req.body?.studentId || "").trim();
    if (!studentNumber) {
      throw new AppError(400, "studentId is required.");
    }

    const student = studentRepository.getStudentByStudentNumber(studentNumber);
    if (!student) {
      throw new AppError(404, "Student not found.");
    }

    res.json({
      ok: true,
      data: {
        id: student.id,
        studentNumber: student.student_number,
        name: student.name,
        program: {
          id: student.selected_program_id,
          code: student.program_code,
          name: student.program_name
        },
        major: {
          id: student.selected_major_id,
          code: student.major_code,
          name: student.major_name
        }
      }
    });
  });

  return router;
}
