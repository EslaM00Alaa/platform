const express = require("express");
const client = require("../../database/db");
const isUser = require("../../middleware/isUser");
const sendMail = require("../../utils/sendMail");
const router = express.Router();

router.put("/code", isUser, async (req, res) => {
  try {
    const { user_id, code, mail } = req.body;
    const result = (
      await client.query("SELECT value FROM codes WHERE code = $1", [code])
    ).rows;
    if (!result.length) {
      return res.status(404).json({ msg: "Code is not correct" });
    }
    const { value } = result[0];
    await client.query("BEGIN");
    const { rows } = await client.query(
      "UPDATE userwallet SET value = value + $1 WHERE u_id = $2 RETURNING value",
      [value, user_id]
    );
    const total = rows[0].value;
    await client.query("DELETE FROM codes WHERE code = $1", [code]);
    await client.query("COMMIT");
    sendMail(mail,`<h4>لقد تم الشحن بنجاح واصبح الان في محفظتك ${total} جنيه </h4>`);
   res.json({msg:"Done"})
  } catch (error) {
    await client.query("ROLLBACK");
    return res.status(500).json({ msg: error.message });
  } finally {
    await client.query("END");
  }
});

router.get("/mywallet", isUser, async (req, res) => {
  try {
    let { user_id } = req.body;
    let value = (
      await client.query("SELECT value FROM userwallet WHERE u_id = $1 ;", [
        user_id,
      ])
    ).rows[0].value;
    res.json({ value });
  } catch (error) {
    return res.status(500).json({ msg: error.message });
  }
});

router.put("/buylecture", isUser, async (req, res) => {
    try {
      const { user_id, mail, l_id } = req.body;
  
      // Fetch price and teacher_id
      const { price, teacher_id } = (await client.query(
        "SELECT price, teacher_id FROM lecture_online WHERE id = $1;",
        [l_id]
      )).rows[0];
  
      // Fetch user's wallet value
      const { value } = (await client.query(
        "SELECT value FROM userwallet WHERE u_id = $1;",
        [user_id]
      )).rows[0];
  
      if (price <= value) {
        await client.query("BEGIN");
  
        // Update userwallet
        await client.query(
          "UPDATE userwallet SET value = value - $1 WHERE u_id = $2;",
          [price, user_id]
        );
  
        // Update teacherwallet
        await client.query(
          "UPDATE teacherwallet SET value = value + $1 WHERE teacher_id = $2;",
          [price, teacher_id]
        );
  
        // Insert into joininglecture
        await client.query(
          "INSERT INTO joininglecture (u_id, lonline_id) VALUES ($1, $2);",
          [user_id, l_id]
        );
  
        await client.query("COMMIT");
        sendMail(mail, `<h4>تم عمليه شراء الحصه بنجاح </h4>`);
        res.json({ msg: "Done" });
      } else {
        res.status(404).json({ msg: "Insufficient funds" });
      }
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Error in buylecture endpoint:", error);
      return res.status(500).json({ msg: "Internal Server Error" });
    }
  });


////// no test 

router.put("/buymonth", isUser, async (req, res) => {
  try {
    const { user_id, mail, m_id } = req.body;

    // Fetch price and teacher_id
    const { price, teacher_id } = (await client.query(
      "SELECT price, teacher_id FROM months WHERE id = $1;",
      [m_id]
    )).rows[0];

    // Fetch user's wallet value
    const { value } = (await client.query(
      "SELECT value FROM userwallet WHERE u_id = $1;",
      [user_id]
    )).rows[0];

    if (price <= value) {
      await client.query("BEGIN");

      // Update userwallet
      await client.query(
        "UPDATE userwallet SET value = value - $1 WHERE u_id = $2;",
        [price, user_id]
      );

      // Update teacherwallet
      await client.query(
        "UPDATE teacherwallet SET value = value + $1 WHERE teacher_id = $2;",
        [price, teacher_id]
      );

      // Insert into joininglecture
      await client.query(
        "INSERT INTO joiningmonth (u_id, m_id) VALUES ($1, $2);",
        [user_id, m_id]
      );

      await client.query("COMMIT");
      sendMail(mail, `<h4>تم عمليه شراء الشهر بنجاح </h4>`);
      res.json({ msg: "Done" });
    } else {
      res.status(404).json({ msg: "Insufficient funds" });
    }
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error in buylecture endpoint:", error);
    return res.status(500).json({ msg: "Internal Server Error" });
  }
});







router.put("/buymonthbycode", isUser, async (req, res) => {
  try {
    const { user_id, code, m_id } = req.body;

    // Fetch teacher_id from months table
    const { rows } = await client.query("SELECT teacher_id FROM months WHERE id = $1;", [m_id]);
    if (rows.length === 0) {
      return res.status(400).json({ msg: "Month ID is not valid." });
    }
    const { teacher_id } = rows[0];

    // Check if the code exists and is not used
    const result = await client.query(
      "SELECT * FROM teachercode WHERE code = $1 AND teacher_id = $2 AND used = false;",
      [code, teacher_id]
    );

    if (result.rows.length > 0) {
      // Insert into joiningmonth
      await client.query(
        "INSERT INTO joiningmonth (u_id, m_id) VALUES ($1, $2);",
        [user_id, m_id]
      );

      // Mark the code as used
      await client.query(
        "UPDATE teachercode SET used = true WHERE code = $1 AND teacher_id = $2;",
        [code, teacher_id]
      );

      res.json({ msg: "Purchase successful." });
    } else {
      // Check if the code exists but has been used
      const usedResult = await client.query(
        "SELECT * FROM teachercode WHERE code = $1 AND teacher_id = $2;",
        [code, teacher_id]
      );

      if (usedResult.rows.length > 0) {
        return res.status(400).json({ msg: "Code has already been used." });
      } else {
        return res.status(400).json({ msg: "Code is not correct." });
      }
    }
  } catch (error) {
    console.error("Error in buyMonthByCode endpoint:", error);
    return res.status(500).json({ msg: "Internal Server Error" });
  }
});



















module.exports = router;
