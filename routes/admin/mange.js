const express = require("express"),
  client = require("../../database/db"),
  isAdmin = require("../../middleware/isAdmin"),
  generateRandomString = require("../../utils/createcode"),
  router = express.Router();

router.post("/", isAdmin, async (req, res) => {
  try {
    const { n, value } = req.body;
    let ar = [];

    for (let i = 0; i < n; i++) {
      const code = generateRandomString();
      ar.push({ code, value });
    }

    const values = ar
      .map(({ code, value }) => `('${code}', ${value})`)
      .join(", ");
    const insertQuery = `INSERT INTO codes (code, value) VALUES ${values}`;

    await client.query("UPDATE platformwallet SET value = value + $1;", [
      n * value,
    ]);
    await client.query(insertQuery);

    res.json(ar);
  } catch (error) {
    return res.status(404).json({ msg: error.message });
  }
});

router.get("/allcodes", async (req, res) => {
  let result = await client.query("SELECT * FROM codes ;");
  res.json(result.rows);
});

router.get("/totalmony", isAdmin, async (req, res) => {
  try {
    const result = (await client.query("SELECT * FROM platformwallet ;"))
      .rows[0];
    console.log(result);
    res.json(result);
  } catch (error) {
    return res.status(404).json({ msg: error.message });
  }
});

router.get("/mange", isAdmin, async (req, res) => {
  try {
    const teachersData = await client.query(`
      SELECT
      t.id,
      t.name,
      t.mail,
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
  GROUP BY
      t.id, t.name, t.mail,tw.value;
      `);

    res.json(teachersData.rows);
  } catch (error) {
    console.error("Error fetching teachers data:", error);
    res.status(500).json({ msg: "Internal server error." });
  }
});
// router.get("/mange", isAdmin, async (req, res) => {
//     try {
//       let result = await client.query("SELECT id, name, mail FROM teachers;");
//       let ar = [];

//       for (let i = 0; i < result.rows.length; i++) {
//         let id = result.rows[i].id;

//         const [teacherWalletResult, nOnlineResult, nGroupResult] =
//           await Promise.all([
//             client.query(
//               "SELECT value FROM teacherwallet WHERE teacher_id = $1;",
//               [id]
//             ),
//             client.query(
//               "SELECT COUNT(jl.id) FROM joininglecture jl JOIN lecture_online lo ON jl.lonline_id = lo.id WHERE lo.teacher_id = $1;",
//               [id]
//             ),
//             client.query(
//               "SELECT COUNT(jg.group_id) FROM joingroup jg JOIN groups g ON jg.group_id = g.id WHERE g.teacher_id = $1;",
//               [id]
//             ),
//           ]);

//         ar.push({
//           id: result.rows[i].id,
//           name: result.rows[i].name,
//           mail: result.rows[i].mail,
//           value: teacherWalletResult.rows[0].value,
//           nOnline: nOnlineResult.rows[0].count,
//           nGroup: nGroupResult.rows[0].count,
//         });
//       }

//       res.json(ar);
//     } catch (error) {
//       console.error("Error fetching teachers data:", error);
//       res.status(500).json({ msg: "Internal server error." });
//     }
//   });

router.put("/zero/:id", isAdmin, async (req, res) => {
  try {
    let id = req.params.id;
    // Assuming 'client' is properly configured and connected to your database
    await client.query(
      "UPDATE teacherwallet SET value = 0 WHERE teacher_id = $1;",
      [id]
    );
    res.json({ msg: "Done" });
  } catch (error) {
    console.error("Error in updating teacherwallet:", error);
    return res.status(500).json({ msg: "Internal server error" });
  }
});



router.put("/changeuserdevice",isAdmin,async (req, res) => {
  try {
    let { mail } = req.body;
    let result = await client.query("SELECT id FROM users WHERE mail = $1", [mail]);
    if (result.rows.length > 0) {
      let u_id = result.rows[0].id;
      await client.query("UPDATE usersip SET ip = 'sata' WHERE u_id = $1", [u_id]);
      res.json({ msg: "DONE" });
    } else {
      res.status(404).json({ msg: "User not found" });
    }
  } catch (error) {
    return res.status(500).json({ msg: "Internal server error" });
  }
});


module.exports = router;
