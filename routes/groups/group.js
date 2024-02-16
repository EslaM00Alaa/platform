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
      [req.body.teacher_id,grad_id]
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
        "SELECT u.id, u.fName, u.mail FROM joingroup j JOIN users u ON j.std_id = u.id WHERE j.group_id = $1",
        [group_id]
      );
      return res.json(result.rows);
    } catch (error) {
      return res.status(404).json({ msg: error.message });
    }
  });
 // ادخال طالب المجموعه
router.post("/join", isTeacher, async (req, res) => {
    try {
      let group_id = req.body.group_id;
      let student_mail = req.body.mail;
      let std = await client.query("SELECT * FROM users WHERE mail = $1", [student_mail]);
      if (std.rows.length > 0) {
        let stdId = std.rows[0].id;
        await client.query("INSERT INTO joingroup (group_id, std_id) VALUES ($1, $2)", [group_id, stdId]);
        return res.status(200).json("Student joined the group.");
      } else {
        return res.status(404).json({ msg: "This student is not registered." });
      }
    } catch (error) {
      return res.status(500).json({ msg: error.message });
    }
  });

//  available lecture for group   
router.post("/openlecture/group", isTeacher,async (req, res) => {
  try {
    let { l_id, g_id } = req.body;
    let result = await client.query(
      "SELECT u.id FROM joingroup j JOIN users u ON j.std_id = u.id WHERE j.group_id = $1",
      [g_id]
    );
    for (let i = 0; i < result.rows.length; i++) {
      await client.query("INSERT INTO joininglecture (u_id, lgroup_id) VALUES ($1, $2);", [
        result.rows[i].id,
        l_id,
      ]);
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
        await client.query("DELETE FROM joingroup WHERE group_id = $1 AND std_id = $2", [group_id, std_id]);
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

    // Delete the records from the joingroup table first
    await client.query("DELETE FROM joingroup WHERE group_id = $1", [group_id]);

    // Delete the record from the groups table
    await client.query("DELETE FROM groups WHERE id = $1 AND teacher_id = $2", [group_id, teacher_id]);

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
