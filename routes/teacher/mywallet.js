const isTeacher = require("../../middleware/isTeacher");
const express = require("express");
const client = require("../../database/db");
const router = express.Router();


async function Teacher_student(t_id) {
  try {
    // Query to get the number of center students
    let centerStudents = await client
      .query(
        `SELECT 
          g.teacher_id,
          COUNT(j.std_id) AS number_of_students
        FROM 
          groups g
        JOIN 
          joingroup j ON g.id = j.group_id
        WHERE 
          g.teacher_id = $1
        GROUP BY 
          g.teacher_id;`,
        [t_id]
      )
      .then(result => result.rows[0]?.number_of_students || 0); // Default to 0 if no results

    // Query to get the number of online students
    let onlineStudents = await client
      .query(
        `SELECT 
          COUNT(u.id) AS number_of_online_students
        FROM 
          users u
        JOIN 
          joiningmonth jm ON u.id = jm.u_id
        JOIN 
          months m ON jm.m_id = m.id
        WHERE 
          m.teacher_id = $1  
          AND m.price > 0;`,
        [t_id]
      )
      .then(result => result.rows[0]?.number_of_online_students || 0); // Default to 0 if no results

    return { centerStudents, onlineStudents };
  } catch (error) {
    console.log(error);
    return null;
  }
}







router.get("/", isTeacher, async (req, res) => {
  try {
    const { teacher_id } = req.body;
    
    // Fetch number of students
    let { centerStudents, onlineStudents } = await Teacher_student(teacher_id);

    // Fetch teacher wallet value
    const teacherWalletResult = await client.query(
      `
      SELECT value FROM teacherwallet WHERE teacher_id = $1
      `,  // Removed the comma
      [teacher_id]
    );

    // Extract value safely, handle possible null result
    const teachersWallet = teacherWalletResult.rows[0]?.value || 0;

    // Respond with the data
    res.json({ teachersWallet, centerStudents, onlineStudents });
  } catch (error) {
    console.error("Error fetching teacher data:", error);
    res.status(500).json({ msg: "Internal server error." });
  }
});







module.exports = router;
