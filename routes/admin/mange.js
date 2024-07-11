const express = require("express"),
  isAdmin = require("../../middleware/isAdmin"),
  admin = require("../../controller/admin.con")
  router = express.Router();

router.post("/", isAdmin,admin.codes);

router.get("/allcodes",admin.getcodes);

router.get("/totalmony", isAdmin,admin.totalmoney);

router.get("/mange", isAdmin,admin.manage);
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

router.put("/zero/:id", isAdmin, admin.zeroto);



router.put("/changeuserdevice", isAdmin, admin.changedevice);




module.exports = router;
