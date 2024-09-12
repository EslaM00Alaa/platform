const isTeacher = require("../../middleware/isTeacher");
const express = require("express");
const client = require("../../database/db");
const router = express.Router();



async function Teacher_student(t_id) {
  try {
    
  let centerStudents = await client.query(`SELECT 
    g.teacher_id,
    COUNT(j.std_id) AS number_of_students
    FROM 
        groups g
    JOIN 
        joingroup j ON g.id = j.group_id
    WHERE 
        g.teacher_id = $1 -- Replace $1 with the teacher_id value
    GROUP BY 
        g.teacher_id;
`,[t_id]).rows[0].number_of_students ;

let num = await client.query(`SELECT 
  SELECT 
    SUM(group_totals.student_count * group_totals.month_count) AS total
FROM (
    SELECT 
        g.id AS group_id,
        COUNT(DISTINCT j.std_id) AS student_count,
        COUNT(DISTINCT gm.m_id) AS month_count
    FROM 
        groups g
    LEFT JOIN 
        joingroup j ON g.id = j.group_id
    LEFT JOIN 
        groupsmonths gm ON g.id = gm.g_id
    WHERE 
        g.teacher_id = $1  -- Replace $1 with the teacher_id value
    GROUP BY 
        g.id
) AS group_totals;

`,[t_id]).rows[0].group_totals ;

let onlineStudents = await client.query(`SELECT 
    COUNT(DISTINCT jm.u_id) AS number_of_users
FROM 
    months m
JOIN 
    joiningmonth jm ON m.id = jm.m_id
WHERE 
    m.teacher_id = $1;  -- Replace $1 with the teacher_id (t_id) value
`,[t_id]).rows[0].number_of_users - num 

   return {centerStudents,onlineStudents}
  } catch (error) {
   console.log(error);
   return null 
  }
} 





// router.get("/", isTeacher, async (req, res) => {
//   try {
//     const { teacher_id } = req.body;
//     const teachersData = await client.query(
//       `
//     SELECT
//     tw.value AS value,
//     COALESCE(COUNT(DISTINCT jl.id), 0) AS nOnline,
//     COALESCE(COUNT(DISTINCT jg.std_id), 0) AS nGroup
// FROM
//     teachers t
// LEFT JOIN
//     teacherwallet tw ON t.id = tw.teacher_id
// LEFT JOIN
//     lecture_online lo ON t.id = lo.teacher_id
// LEFT JOIN
//     joininglecture jl ON jl.lonline_id = lo.id
// LEFT JOIN
// groups g ON g.teacher_id = t.id
// LEFT JOIN
//     joingroup jg ON jg.group_id = g.id
//     WHERE t.id = $1
// GROUP BY
//     t.id, t.name, t.mail,tw.value;
//     `,
//       [teacher_id]
//     );

//     res.json(teachersData.rows);
//   } catch (error) {
//     console.error("Error fetching teacher data:", error);
//     res.status(500).json({ msg: "Internal server error." });
//   }
// });





router.get("/", isTeacher, async (req, res) => {
  try {
    const { teacher_id } = req.body;
    let {centerStudents,onlineStudents} = await Teacher_student(teacher_id)
    const teachersWallet = await client.query(
      `
    SELECT value  FROM teacherwallet WHERE teacher_id = $1 ,
    `,
      [teacher_id]
    ).rows[0].value;

    res.json({teachersWallet,centerStudents,onlineStudents});
  } catch (error) {
    console.error("Error fetching teacher data:", error);
    res.status(500).json({ msg: "Internal server error." });
  }
});









module.exports = router;
