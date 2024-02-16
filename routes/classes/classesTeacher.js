const express = require("express");
const client = require("../../database/db");
const isTeacher = require("../../middleware/isTeacher");
const router = express.Router();


router.get("/", isTeacher, async (req, res) => {
    try {
      let result = await client.query("select g.name , g.id from grades g join classes c on g.id = c.grad_id where c.teacher_id = $1 ",[req.body.teacher_id]);
      return res.json(result.rows);
    } catch (error) {
      return res.status(404).json({ msg: error.message });
    }
  });
  



module.exports = router ;