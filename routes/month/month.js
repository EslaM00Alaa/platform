const { validateExam, validateQuestion } = require("../../models/exam");
const photoUpload = require("../../utils/uploadimage");
const {
  cloadinaryUploadImage,
  cloadinaryRemoveImage,
} = require("../../utils/uploadimageCdn");
const express = require("express"),
  client = require("../../database/db"),
  { validateMonth } = require("../../models/month.js"),
  isTeacher = require("../../middleware/isTeacher"),
  path = require("path"),
  fs = require("fs"),
  router = express.Router();
const isUser = require("../../middleware/isUser.js");

router.get("/free", isUser, async (req, res) => {
  try {
    const { user_id } = req.body; // Change to req.params if more appropriate

    const result = await client.query(
      `SELECT 
          m.id, 
          COALESCE(c.image, '') AS image, 
          m.description, 
          m.noflecture, 
          m.price,
          CASE 
            WHEN jm.id IS NOT NULL AND ((CURRENT_DATE - jm.joindate) <= m.days OR m.days = 0) THEN TRUE 
            ELSE FALSE 
          END AS open
       FROM 
          months m 
       LEFT JOIN 
          covers c ON c.image_id = m.cover  
       LEFT JOIN 
          joiningmonth jm ON m.id = jm.m_id AND jm.u_id = $1 
       WHERE 
          m.price = 0 AND m.grad_id = (
            SELECT grad 
            FROM users 
            WHERE id = $1
          );`,
      [user_id]
    );

    res.json({ months: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Internal server error." });
  }
});

router.post(
  "/add",
  photoUpload.single("image"),
  isTeacher,
  async (req, res) => {
    try {
      const { error } = validateMonth(req.body);
      if (error) {
        return res.status(400).json({ msg: error.details[0].message });
      }

      const { teacher_id, description, grad_id, price, days } = req.body;

      if (!req.file) {
        return res.status(400).json({ message: "You must send an image" });
      }

      const imagePath = path.join(
        __dirname,
        `../../images/${req.file.filename}`
      );
      const uploadResult = await cloadinaryUploadImage(imagePath); // Assuming you have a function named 'cloadinaryUploadImage' to upload the image asynchronously
      const { public_id, secure_url } = uploadResult;

      await client.query("BEGIN"); // Start a database transaction

      await client.query(
        "INSERT INTO covers(image_id, image) VALUES ($1, $2);",
        [public_id, secure_url]
      );

      if (price >= 0) {
        await client.query(
          "INSERT INTO months (teacher_id,cover,description,grad_id,days,price)VALUES($1,$2,$3,$4,$5,$6);",
          [teacher_id, public_id, description, grad_id, days, price]
        );
      } else {
        await client.query(
          "INSERT INTO months (teacher_id,cover,description,grad_id,days)VALUES($1,$2,$3,$4,$5);",
          [teacher_id, public_id, description, grad_id, days]
        );
      }

      await client.query("COMMIT"); // Commit the database transaction
      fs.unlink(imagePath, (err) => {
        if (err) {
          console.error("Error deleting image:", err);
        }
      });
      res.json({ msg: "One Month Saved" });
    } catch (error) {
      await client.query("ROLLBACK"); // Rollback the database transaction in case of an error
      res.status(500).json({ msg: error.message });
    }
  }
);

router.get("/mymonth/group/:gradId", isTeacher, async (req, res) => {
  try {
    let grad_id = req.params.gradId;
    let { teacher_id } = req.body;
    let result2 = await client.query(
      "SELECT  m.id , c.image , m.description , m.noflecture FROM months m LEFT JOIN covers c ON c.image_id = m.cover WHERE m.teacher_id = $1 AND m.grad_id = $2 AND m.price = -1 ;",
      [teacher_id, grad_id]
    );
    res.json(result2.rows);
  } catch (error) {
    res.status(500).json({ msg: error.message });
  }
});

router.get("/mymonth/online/:gradId", isTeacher, async (req, res) => {
  try {
    let grad_id = req.params.gradId;
    let { teacher_id } = req.body;
    let result2 = await client.query(
      "SELECT  m.id , c.image , m.description , m.noflecture ,m.price FROM months m LEFT JOIN covers c ON c.image_id = m.cover WHERE m.teacher_id = $1 AND m.grad_id = $2 AND m.price >= 0 ;",
      [teacher_id, grad_id]
    );
    res.json(result2.rows);
  } catch (error) {
    res.status(500).json({ msg: error.message });
  }
});

router.put("/tazweeed/:monthId", isTeacher, async (req, res) => {
  try {
    let monthId = req.params.monthId;
    let { teacher_id, days } = req.body;

    await client.query(
      "UPDATE months SET days = (days + $1) WHERE id = $2 AND teacher_id = $3;",
      [days, monthId, teacher_id]
    );
    res.json({ msg: "Done" });
  } catch (error) {
    res.status(500).json({ msg: error.message });
  }
});

router.delete("/:monthId", isTeacher, async (req, res) => {
  try {
    let monthId = req.params.monthId;
    let { teacher_id } = req.body;

    await client.query("DELETE FROM lectureofmonths WHERE m_id = $1 ;", [
      monthId,
    ]);

    await client.query("DELETE FROM joiningmonth WHERE m_id = $1 ;", [monthId]);

    await client.query("DELETE FROM groupsmonths WHERE m_id = $1 ;", [monthId]);

    await client.query(
      "DELETE FROM months WHERE id = $1 AND teacher_id = $2 ;",
      [monthId, teacher_id]
    );
    res.json({ msg: "Done" });
  } catch (error) {
    res.status(500).json({ msg: error.message });
  }
});

router.get("/month/:id", isTeacher, async (req, res) => {
  try {
    const { teacher_id } = req.body; // Assuming teacher_id is in req.user instead of req.body
    const monthId = req.params.id;

    const sql1 = `
    SELECT  m.id , c.image , m.description , m.noflecture FROM months m LEFT JOIN covers c ON c.image_id = m.cover WHERE  m.id = $1
  `;

    const result1 = await client.query(sql1, [monthId]);

    const sql = `
      SELECT lg.id, c.image, lg.description
      FROM lecture_group lg
      JOIN covers c ON c.image_id = lg.cover
      JOIN lectureofmonths lofm ON lofm.lg_id = lg.id
      WHERE lg.teacher_id = $1 AND lofm.m_id = $2
      ORDER BY lofm.id ;
    `;

    const result = await client.query(sql, [teacher_id, monthId]);
    res.json({ monthData: result1.rows[0], monthcontent: result.rows });
  } catch (error) {
    console.error(
      "Error occurred while retrieving lectures for the month:",
      error
    );
    res.status(500).json({ msg: "Internal server error." });
  }
});

router.delete("/lecture/lecturefrommonth", isTeacher, async (req, res) => {
  try {
    const { m_id, l_id } = req.body; // Assuming m_id and l_id are in params instead of body

    await client.query(
      "UPDATE months SET noflecture = noflecture - 1 WHERE id = $1;",
      [m_id]
    );

    await client.query(
      "DELETE FROM lectureofmonths WHERE lg_id = $1 AND m_id = $2 ;",
      [l_id, m_id]
    );

    await client.query("DELETE FROM lecture_group WHERE id = $1;", [l_id]);

    res.json({ msg: "One lecture deleted from the month." });
  } catch (error) {
    console.error(
      "Error occurred while deleting lecture from the month:",
      error
    );
    res.status(500).json({ msg: "Internal server error." });
  }
});

// get all month to teacher

router.get("/teacher/:id", isUser, async (req, res) => {
  try {
    const { user_id } = req.body;
    let teacher_id = req.params.id;

    let teacher = await client.query(
      "select t.id ,c.image ,t.name, t.description , t.mail , t.subject , t.whats ,t.facebook, t.tele   from teachers t join covers c on t.cover = c.image_id  WHERE t.id = $1 ; ",
      [teacher_id]
    );

    let grad = (
      await client.query("SELECT grad FROM users WHERE id = $1;", [user_id])
    ).rows[0].grad;

    let result2 = await client.query(
      `SELECT m.id, 
              CASE 
                WHEN jm.id IS NOT NULL AND ((CURRENT_DATE - jm.joindate) <= m.days OR m.days = 0 ) THEN TRUE 
                ELSE FALSE 
              END AS open, 
              c.image, 
              m.description, 
              m.noflecture, 
              m.price 
       FROM months m 
       LEFT JOIN covers c ON c.image_id = m.cover  
       LEFT JOIN joiningmonth jm ON m.id = jm.m_id AND jm.u_id = $1 
       WHERE m.teacher_id = $2 AND m.grad_id = $3 AND m.price >= 0;`,
      [user_id, teacher_id, grad]
    );

    res.json({ teacher: teacher.rows[0], months: result2.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Internal server error." });
  }
});

router.get("/mymonthuser", isUser, async (req, res) => {
  try {
    const { user_id } = req.body;

    // Fetch the months joined by the user
    const result = await client.query(
      `SELECT DISTINCT m.id, c.image, m.description, m.grad_id, m.noflecture, m.price
       FROM months m
       JOIN joiningmonth jm ON m.id = jm.m_id AND jm.u_id = $1
       JOIN covers c ON m.cover = c.image_id
       WHERE jm.u_id = $1 AND (CURRENT_DATE - jm.joindate) <= m.days OR m.days = 0;
      `,
      [user_id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Internal server error." });
  }
});

// router.get('/monthinfo/:id', isUser, async (req, res) => {
//   try {
//     const m_id = req.params.id;
//     const { user_id } = req.body; // Assuming user_id is coming from the request body

//     if (!user_id) {
//       return res.status(400).json({ msg: "User ID is required." });
//     }

//     const resss = await client.query("SELECT * FROM joiningmonth WHERE u_id = $1 AND m_id = $2;", [user_id, m_id]);
//     if (resss.rows.length === 0) {
//       return res.status(404).json({ msg: "YOU DON'T HAVE PERMISSION" });
//     }

//     const sql1 = `
//       SELECT m.id, c.image, m.description, m.noflecture
//       FROM months m
//       LEFT JOIN covers c ON c.image_id = m.cover
//       WHERE m.id = $1;
//     `;
//     const result1 = await client.query(sql1, [m_id]);

//     const sql = `
//       SELECT lg.id, c.image, lg.description
//       FROM lecture_group lg
//       JOIN covers c ON c.image_id = lg.cover
//       JOIN lectureofmonths lofm ON lofm.lg_id = lg.id
//       WHERE lofm.m_id = $1
//       ORDER BY lofm.id ;
//     `;

//     const result = await client.query(sql, [m_id]);
//     result.rows[0].open = true;

//     for (let i = 1; i < result.rows.length; i++) {
//       const lg_id = result.rows[i - 1].id;
//       let flag = true;
//       const exam_id = (await client.query("SELECT exam_id FROM lecture_group WHERE id = $1;", [lg_id])).rows[0].exam_id;

//       if (exam_id) {
//         const number = (await client.query("SELECT number FROM exams WHERE id = $1;", [exam_id])).rows[0].number;
//         const resultsofexam = await client.query("SELECT result FROM examssresult WHERE u_id = $1 AND exam_id = $2;", [user_id, exam_id]);
//         flag = false ;
//         for (let j = 0; j < resultsofexam.rows.length; j++) {
//           let resultofexam = resultsofexam.rows[j].result;
//           if (resultofexam >= (number / 2)) {
//             flag = true;
//           }
//         }
//       }
//       result.rows[i].open = flag;
//     }

//     res.json({ monthData: result1.rows[0], monthcontent: result.rows });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ msg: "Internal server error." });
//   }
// });

router.get("/monthinfo/:id", isUser, async (req, res) => {
  try {
    const m_id = req.params.id;
    const { user_id } = req.body; // Assuming user_id is coming from the request body

    if (!user_id) {
      return res.status(400).json({ msg: "User ID is required." });
    }

    const resss = await client.query(
      "SELECT * FROM joiningmonth WHERE u_id = $1 AND m_id = $2;",
      [user_id, m_id]
    );
    if (resss.rows.length === 0) {
      return res.status(404).json({ msg: "YOU DON'T HAVE PERMISSION" });
    }

    const sql1 = `
      SELECT m.id, c.image, m.description, m.noflecture 
      FROM months m 
      LEFT JOIN covers c ON c.image_id = m.cover 
      WHERE m.id = $1;
    `;
    const result1 = await client.query(sql1, [m_id]);

    const sql = `
      SELECT lg.id, c.image, lg.description
      FROM lecture_group lg
      JOIN covers c ON c.image_id = lg.cover
      JOIN lectureofmonths lofm ON lofm.lg_id = lg.id
      WHERE lofm.m_id = $1
      ORDER BY lofm.id;
    `;

    const result = await client.query(sql, [m_id]);

    const openFlags = [true]; // Array to store the open flags

    for (let i = 1; i < result.rows.length; i++) {
      const lg_id = result.rows[i-1].id;
      let flag = true;

      const exam_id_res = await client.query(
        "SELECT exam_id FROM lecture_group WHERE id = $1;",
        [lg_id]
      );
      const exam_id = exam_id_res.rows[0]?.exam_id;

      if (exam_id) {
        const number_res = await client.query(
          "SELECT number FROM exams WHERE id = $1;",
          [exam_id]
        );
        const number = number_res.rows[0]?.number;

        const resultsofexam = await client.query(
          "SELECT result FROM examssresult WHERE u_id = $1 AND exam_id = $2;",
          [user_id, exam_id]
        );

        flag = false;
        for (let j = 0; j < resultsofexam.rows.length; j++) {
          const resultofexam = resultsofexam.rows[j].result;
          if (resultofexam >= number / 2) {
            flag = true;
            break; // Break the loop once a passing result is found
          }
        }
      }
      openFlags.push(flag);
    }

    // Assign open flags to result rows
    for (let i = 0; i < result.rows.length; i++) {
      result.rows[i].open = openFlags[i];
    }

    res.json({ monthData: result1.rows[0], monthcontent: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Internal server error." });
  }
});










module.exports = router;
