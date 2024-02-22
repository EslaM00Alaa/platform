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

module.exports = router;
