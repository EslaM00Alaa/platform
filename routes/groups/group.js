const express = require("express");
const client = require("../../database/db");
const validateGroup = require("../../models/group");
const isTeacher = require("../../middleware/isTeacher");

const router = express.Router();
// اضافه مجموعه
router.post("/", isTeacher, async (req, res) => {
  try {
    const { error } = validateGroup(req.body);
    if (error) return res.status(404).json({ msg: error.details[0].message });
    await client.query(
      "INSERT INTO groups (teacher_id, group_name, grad_id ) VALUES ($1, $2, $3)",
      [req.body.teacher_id, req.body.group_name, req.body.grad_id]
    );
    return res.json(`The group ${req.body.group_name} is created.`);
  } catch (error) {
    return res.status(404).json({ msg: error.message });
  }
});

// الحصول ع كل مجموعات المدرس

router.get("/", isTeacher, async (req, res) => {
  try {
    let result = await client.query(
      "SELECT id,group_name FROM groups WHERE teacher_id = $1",
      [req.body.teacher_id]
    );
    return res.json(result.rows);
  } catch (error) {
    return res.status(404).json({ msg: error.message });
  }
});

// فلتر حسب الصف
router.get("/filter/:id", isTeacher, async (req, res) => {
  try {
    let grad_id = req.params.id;
    let result = await client.query(
      "SELECT id,group_name FROM groups WHERE teacher_id = $1 and grad_id =$2 ",
      [req.body.teacher_id, grad_id]
    );
    return res.json(result.rows);
  } catch (error) {
    return res.status(404).json({ msg: error.message });
  }
});

// كل الطلاب داخل المجموعه

router.get("/:id", isTeacher, async (req, res) => {
  try {
    let group_id = req.params.id;
    let result = await client.query(
      `SELECT g.group_name, u.id, u.fname, u.lname, u.mail 
      FROM groups g
      LEFT JOIN joingroup j ON g.id = j.group_id 
      LEFT JOIN users u ON j.std_id = u.id 
      WHERE g.id = $1;      
      `,
      [group_id]
    );

    if (result.rows.length > 0) {
      const output = {
        group_name: result.rows[0].group_name,
        data: result.rows.map((row) => ({
          id: row.id,
          fname: row.fname,
          lname: row.lname,
          mail: row.mail,
        })),
      };
      if (!output.data[0].id) output.data = null;
      return res.json(output);
    } else {
      return res.status(404).json({ msg: "No data found for this group ID" });
    }
  } catch (error) {
    return res.status(500).json({ msg: error.message });
  }
});

// ادخال طالب المجموعه
router.post("/join", isTeacher, async (req, res) => {
  try {
    const { group_id, mail } = req.body;

    // Check if the student is registered
    const std = await client.query(
      "SELECT id FROM users WHERE mail = $1 OR mail LIKE $2",
      [mail, mail + " %"]
    );

    if (std.rows.length > 0) {
      const stdId = std.rows[0].id;

      // Check if the student is already in the group
      const existingMembership = await client.query(
        "SELECT * FROM joingroup WHERE group_id = $1 AND std_id = $2",
        [group_id, stdId]
      );
      if (existingMembership.rows.length > 0) {
        return res
          .status(409)
          .json({ msg: "This student is already in this group." });
      }

      // Insert the student into the group
      await client.query(
        "INSERT INTO joingroup (group_id, std_id) VALUES ($1, $2)",
        [group_id, stdId]
      );

      // Get lectures associated with the group
      const lectures = await client.query(
        "SELECT l_id FROM groupslecture WHERE g_id = $1",
        [group_id]
      );

      // Insert the student into joining lectures
      const insertions = lectures.rows.map(async (lecture) => {
        await client.query(
          "INSERT INTO joininglecture (u_id, lgroup_id) VALUES ($1, $2)",
          [stdId, lecture.l_id]
        );
      });

      await Promise.all(insertions);

      return res.status(200).json({ msg: "Student joined the group." });
    } else {
      return res.status(404).json({ msg: "This student is not registered." });
    }
  } catch (error) {
    console.error("Error in /join endpoint:", error);
    return res.status(500).json({ msg: "Internal server error." });
  }
});
//

router.post("/joinbyid", isTeacher, async (req, res) => {
  try {
    const { group_id, id } = req.body;

    // Check if the student is registered
    const std = await client.query("SELECT * FROM users WHERE id = $1", [id]);

    if (std.rows.length > 0) {
      const stdId = std.rows[0].id;

      // Check if the student is already in the group
      const existingMembership = await client.query(
        "SELECT * FROM joingroup WHERE group_id = $1 AND std_id = $2",
        [group_id, stdId]
      );
      if (existingMembership.rows.length > 0) {
        return res
          .status(409)
          .json({ msg: "This student is already in this group." });
      }

      // Insert the student into the group
      await client.query(
        "INSERT INTO joingroup (group_id, std_id) VALUES ($1, $2)",
        [group_id, stdId]
      );

      // Get lectures associated with the group
      const lectures = await client.query(
        "SELECT l_id FROM groupslecture WHERE g_id = $1",
        [group_id]
      );
      const months = await client.query(
        "SELECT m_id FROM groupsmonths WHERE g_id = $1",
        [group_id]
      );

      // Insert the student into joining lectures
      const insertions = lectures.rows.map(async (lecture) => {
        await client.query(
          "INSERT INTO joininglecture (u_id, lgroup_id) VALUES ($1, $2)",
          [stdId, lecture.l_id]
        );
      });
      const insertions2 = months.rows.map(async (m) => {
        await client.query(
          "INSERT INTO joiningmonth (u_id, m_id) VALUES ($1, $2)",
          [stdId, m.m_id]
        );
      });

      await Promise.all(insertions);
      await Promise.all(insertions2);

      return res.status(200).json({ msg: "Student joined the group." });
    } else {
      return res.status(404).json({ msg: "This student is not registered." });
    }
  } catch (error) {
    console.error("Error in /join endpoint:", error);
    return res.status(500).json({ msg: "Internal server error." });
  }
});

//  available lecture for group
router.post("/openlecture/group", isTeacher, async (req, res) => {
  try {
    let { l_id, g_id } = req.body;
    await client.query(
      "INSERT INTO groupslecture (g_id,l_id) VALUES ($1,$2);",
      [g_id, l_id]
    );
    let result = await client.query(
      "SELECT u.id FROM joingroup j JOIN users u ON j.std_id = u.id WHERE j.group_id = $1",
      [g_id]
    );
    for (let i = 0; i < result.rows.length; i++) {
      await client.query(
        "INSERT INTO joininglecture (u_id, lgroup_id) VALUES ($1, $2);",
        [result.rows[i].id, l_id]
      );
    }
    res.json({ msg: "done" });
  } catch (error) {
    return res.status(500).json({ msg: error.message });
  }
});



//  available lecture for group

router.post("/openmonth/group", isTeacher, async (req, res) => {
  try {
    let { m_id, g_id } = req.body;
    await client.query("INSERT INTO groupsmonths (g_id, m_id) VALUES ($1, $2);", [
      g_id,
      m_id,
    ]);
    let result = await client.query(
      `SELECT DISTINCT u.id 
       FROM joingroup j 
       JOIN users u ON j.std_id = u.id 
       WHERE j.group_id = $1;`,
      [g_id] // Pass the value for the placeholder $1
    );
    for (let i = 0; i < result.rows.length; i++) {
      await client.query(
        "INSERT INTO joiningmonth (u_id, m_id) VALUES ($1, $2);",
        [result.rows[i].id, m_id]
      );
    }
    res.json({ msg: "done" });
  } catch (error) {
    return res.status(500).json({ msg: error.message });
  }
});

// ازاله طالب من المجموعه
router.delete("/remove", isTeacher, async (req, res) => {
  try {
    let group_id = req.body.group_id;
    let std_id = req.body.std_id;
    let std = await client.query("SELECT * FROM users WHERE id = $1", [std_id]);
    if (std.rows.length > 0) {
      let monthsgroup = (
        await client.query("SELECT m_id FROM groupsmonths WHERE g_id = $1", [
          group_id,
        ])
      ).rows;
    
      for (let i = 0; i < monthsgroup.length; i++) {
        await client.query(
          "DELETE FROM joiningmonth WHERE u_id = $1 AND m_id = $2",
          [std_id, monthsgroup[i].m_id]
        );
      }

      // let lecturesgroup = (
      //   await client.query("SELECT l_id FROM groupslecture WHERE g_id = $1", [
      //     group_id,
      //   ])
      // ).rows;

      // for (let i = 0; i < lecturesgroup.length; i++) {
      //   await client.query(
      //     "DELETE FROM joininglecture WHERE u_id = $1 AND l_id = $2",
      //     [std_id, lecturesgroup[i].l_id]
      //   );
      // }

      await client.query(
        "DELETE FROM joingroup WHERE group_id = $1 AND std_id = $2",
        [group_id, std_id]
      );
      return res.status(200).json("Student removed from the group.");
    } else {
      return res.status(404).json({ msg: "This student is not registered." });
    }
  } catch (error) {
    return res.status(500).json({ msg: error.message });
  }
});

// ازاله المجموعه
router.delete("/:id", isTeacher, async (req, res) => {
  try {
    let group_id = req.params.id;
    let teacher_id = req.body.teacher_id;

    await client.query("BEGIN"); // Start a database transaction
  

    await client.query("DELETE FROM groupsmonths WHERE g_id = $1 ;",[group_id])

    // Delete the records from the joingroup table first
    await client.query("DELETE FROM joingroup WHERE group_id = $1", [group_id]);

    // Delete the record from the groups table
    await client.query("DELETE FROM groups WHERE id = $1 AND teacher_id = $2", [
      group_id,
      teacher_id,
    ]);

    await client.query("COMMIT"); // Commit the database transaction

    return res.json({ msg: "The group has been deleted." });
  } catch (error) {
    await client.query("ROLLBACK"); // Rollback the database transaction in case of an error
    return res.status(404).json({ msg: error.message });
  } finally {
    await client.query("END"); // End the database transaction
  }
});

module.exports = router;
