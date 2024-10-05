const express = require("express");
const client = require("../../database/db");
const router = express.Router();


router.get("/:id", async (req, res) => {
    try {
      const { id } = req.params; // Get teacher id from the URL parameters
  

    if (!id) {
      return res.status(400).json({ message: "Teacher ID is required" });
    }

    // Await the result of the query
    const result = await client.query(`
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
        AND m.price > 0;
    `, [id]);

    // Send the result back to the client
    res.status(200).json(result.rows);

  } catch (error) {
    console.error("Error executing query:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = router;
