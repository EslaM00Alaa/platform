const isTeacher = require("../../middleware/isTeacher");
const express = require("express"),
  client = require("../../database/db"),
  router = express.Router();

router.get("/", isTeacher, async (req, res) => {
  try {
    let { teacher_id } = req.body;
    let value = (
      await client.query(
        "SELECT value FROM teacherwallet WHERE teacher_id = $1 ;",
        [teacher_id]
      )
    ).rows[0].value;
    
    res.json({ value });
  } catch (error) {
    return res.status(500).json({ msg: error.message });
  }
});

module.exports = router;
