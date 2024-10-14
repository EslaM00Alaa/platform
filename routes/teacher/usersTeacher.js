const express = require("express");
const client = require("../../database/db");
const isTeacher = require("../../middleware/isTeacher");
const router = express.Router();

router.get("/:month_id",isTeacher, async (req, res) => {
  try {
    const { month_id } = req.params;

    const {teacher_id} = req.body ;

    if (!month_id) {
      return res.status(400).json({ message: "month ID is required" });
    }

    const result = await client.query(
      `
      SELECT 
        u.fName AS user_first_name,
        u.lName AS user_last_name,
        u.mail AS user_email,
        m.description AS month_name
      FROM 
        users u
      JOIN 
        joiningmonth jm ON u.id = jm.u_id
      JOIN 
        months m ON jm.m_id = m.id
      WHERE 
        m.teacher_id = $1  
        AND m.id = $2 ;
    `,
      [teacher_id,month_id]
    );

    // Send the result back to the client
    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Error executing query:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = router;
