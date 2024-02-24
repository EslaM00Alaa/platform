const isTeacher = require("../../middleware/isTeacher");
const express = require("express");
const client = require("../../database/db");
const router = express.Router();

router.get("/", isTeacher, async (req, res) => {
  try {
    const { teacher_id } = req.body;

    // Combine queries into a single Promise
    const [teacherWalletResult, nOnlineResult, nGroupResult] = await Promise.all([
      client.query("SELECT value FROM teacherwallet WHERE teacher_id = $1 ;", [teacher_id]),
      client.query("SELECT COUNT(jl.id) FROM joininglecture jl JOIN lecture_online lo ON jl.lonline_id = lo.id WHERE lo.teacher_id = $1;", [teacher_id]),
      client.query("SELECT COUNT(jg.group_id) FROM joingroup jg JOIN groups g ON jg.group_id = g.id WHERE g.teacher_id = $1;", [teacher_id])
    ]);

    const value = teacherWalletResult.rows[0].value;
    const nOnline = nOnlineResult.rows[0].count;
    const nGroup = nGroupResult.rows[0].count;

    res.json({ value, nOnline, nGroup });
  } catch (error) {
    console.error("Error fetching teacher data:", error);
    res.status(500).json({ msg: "Internal server error." });
  }
});

module.exports = router;
