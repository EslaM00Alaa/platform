const isTeacher = require("../../middleware/isTeacher");
const express = require("express");
const client = require("../../database/db");
const router = express.Router();

router.get("/", isTeacher, async (req, res) => {
  try {
    const { teacher_id } = req.body;
    const teachersData = await client.query(
      `
    SELECT
    tw.value AS value,
    COALESCE(COUNT(DISTINCT jl.id), 0) AS nOnline,
    COALESCE(COUNT(DISTINCT jg.std_id), 0) AS nGroup
FROM
    teachers t
LEFT JOIN
    teacherwallet tw ON t.id = tw.teacher_id
LEFT JOIN
    lecture_online lo ON t.id = lo.teacher_id
LEFT JOIN
    joininglecture jl ON jl.lonline_id = lo.id
LEFT JOIN
groups g ON g.teacher_id = t.id
LEFT JOIN
    joingroup jg ON jg.group_id = g.id
    WHERE t.id = $1
GROUP BY
    t.id, t.name, t.mail,tw.value;
    `,
      [teacher_id]
    );

    res.json(teachersData.rows);
  } catch (error) {
    console.error("Error fetching teacher data:", error);
    res.status(500).json({ msg: "Internal server error." });
  }
});

module.exports = router;
