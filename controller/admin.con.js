const client = require("../database/db"),
  validateAdmin = require("../models/admin"),
  generateRandomString = require("../utils/createcode"),
  createToken = require("../utils/AdminToken");

class Admin {
  auth = async (req, res) => {
    try {
      const { error } = validateAdmin(req.body);
      if (error) return res.status(404).json({ msg: error.details[0].message });

      let sqlQuery = `SELECT * FROM admins WHERE mail = $1 and pass = $2 `;
      let result = await client.query(sqlQuery, [req.body.mail, req.body.pass]);
      if (result.rows.length > 0) {
        let { pass, ...data } = result.rows[0];
        return res.json({
          token: createToken(result.rows[0].id, result.rows[0].mail),
          Data: data,
        });
      } else {
        return res.status(404).json({ msg: "USER NAME OR PASSWOR INVLID" });
      }
    } catch (error) {
      return res.status(404).json({ msg: error.message });
    }
  };

  codes = async (req, res) => {
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
  };

  getcodes = async (req, res) => {
    let result = await client.query("SELECT * FROM codes ;");
    res.json(result.rows);
  };

  totalmoney = async (req, res) => {
    try {
      const result = (await client.query("SELECT * FROM platformwallet ;"))
        .rows[0];
      console.log(result);
      res.json(result);
    } catch (error) {
      return res.status(404).json({ msg: error.message });
    }
  };

  manage = async (req, res) => {
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
  };

  zeroto = async (req, res) => {
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
  };

  changedevice = async (req, res) => {
    try {
      let { mail } = req.body;
      let result = await client.query(
        "SELECT id FROM users WHERE mail = $1 OR mail LIKE $2",
        [mail, mail + " %"]
      );
      if (result.rows.length > 0) {
        let u_id = result.rows[0].id;
        await client.query("UPDATE usersip SET ip = 'sata' WHERE u_id = $1", [
          u_id,
        ]);
        res.json({ msg: "تم" });
      } else {
        res.status(404).json({ msg: "لم يتم العثور على المستخدم" });
      }
    } catch (error) {
      return res.status(500).json({ msg: "خطأ في الخادم الداخلي" });
    }
  };
}

module.exports = new Admin();
