const isUser = require("../../middleware/isUser");

const express = require("express"),
  client = require("../../database/db"),
  bcrypt = require("bcryptjs"),
  {
    validateUser,
    validateLoginUser,
    validateEmail,
    validateChangePass,
  } = require("../../models/user"),
  generateToken = require("../../utils/UserToken"),
  nodemailer = require("nodemailer"),
  router = express.Router();

router.post("/signup", async (req, res) => {
  try {
    const { error } = validateUser(req.body);
    if (error) return res.status(404).json({ msg: error.details[0].message });

    let sqlQuery = "select * from users where mail = $1 or phone = $2 ;";
    let user = await client.query(sqlQuery, [req.body.mail, req.body.phone]);

    if (user.rows.length > 0)
      return res.status(404).json({ msg: "This user already registered" });

    const salt = await bcrypt.genSalt(10);
    req.body.pass = await bcrypt.hash(req.body.pass, salt);

    sqlQuery =
      "INSERT INTO users (fName, lName, mail,pass, phone, grad) VALUES ($1, $2, $3, $4, $5,$6) RETURNING id, fName, lName, mail, phone, grad;";

    let result = await client.query(sqlQuery, [
      req.body.fName,
      req.body.lName,
      req.body.mail,
      req.body.pass,
      req.body.phone,
      req.body.grad,
    ]);
    const UID = result.rows[0].id,
      obj = result.rows[0];

    res.json({
      msg: "ok you register successfully",
      token: generateToken(UID, req.body.mail),
      Data: obj,
    });
  } catch (error) {
    return res.status(404).json({ msg: error.message });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { error } = validateLoginUser(req.body);
    if (error) return res.status(404).json({ msg: error.details[0].message });

    let sqlQuery = `SELECT * FROM users WHERE mail = $1 `;
    let result = await client.query(sqlQuery, [req.body.mail]);
    if (result.rows.length > 0) {
      const { pass, verify_code, ...obj } = result.rows[0];
      let isPasswordMatch = await bcrypt.compare(
        req.body.pass,
        result.rows[0].pass
      );
      if (isPasswordMatch)
        return res.json({
          token: generateToken(result.rows[0].id, result.rows[0].mail),
          Data: obj,
        });
      else return res.status(404).json({ msg: "USER NAME OR PASSWOR INVLID" });
    } else {
      return res.status(404).json({ msg: "USER NAME OR PASSWOR INVLID" });
    }
  } catch (error) {
    return res.status(404).json({ msg: error.message });
  }
});

router.post("/verifycode", async (req, res) => {
  try {
    const { error } = validateEmail(req.body);
    if (error) {
      return res.status(400).json({ msg: error.details[0].message });
    }

    const sqlQuery = "SELECT * FROM users WHERE mail = $1";
    const result = await client.query(sqlQuery, [req.body.mail]);

    if (result.rows.length > 0) {
      const user = result.rows[0];
      const randomNumber = Math.floor(1000 + Math.random() * 9000);
      const salt = await bcrypt.genSalt(10);
      const hashedNumber = await bcrypt.hash(randomNumber.toString(), salt);

      const sqlQuery1 = "UPDATE users SET verify_code = $1 WHERE id = $2";
      await client.query(sqlQuery1, [hashedNumber.toString().trim(), user.id]);

      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: "ea37645520@gmail.com",
          pass: "zuafhkesfceautux",
        },
      });

      const mailOptions = {
        from: "ea37645520@gmail.com",
        to: user.mail,
        subject: "Verify Code",
        html: `<h1>${randomNumber}</h1>`,
      };

      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.log(error);
          return res.status(500).json({ msg: "Failed to send email" });
        } else {
          console.log("Email sent successfully");
          return res.json({ msg: "Email sent" });
        }
      });
    } else {
      return res.status(404).json({ msg: "No account for this user" });
    }
  } catch (error) {
    console.log(error);
    return res.status(500).json({ msg: "Internal server error" });
  }
});
router.post("/resetpass", async (req, res) => {
  const { error } = validateChangePass({
    code: req.body.code,
    mail: req.body.mail,
    pass: req.body.pass,
  });
  if (error) return res.status(404).json({ msg: error.details[0].message });
  const salt = await bcrypt.genSalt(10);
  req.body.pass = await bcrypt.hash(req.body.pass, salt);
  const verifycode = req.body.code.trim(); // Trim the verify code
  const pass = req.body.pass;
  const mail = req.body.mail;
  const sqlQuery = "SELECT * FROM users WHERE mail = $1";
  const result = await client.query(sqlQuery, [mail]);

  const user = result.rows[0];
  console.log(user);
  let isPasswordMatch = await bcrypt.compare(
    verifycode,
    user.verify_code.trim()
  ); // Trim the user.verify_code
  console.log(isPasswordMatch);
  if (isPasswordMatch) {
    const sqlQuery1 = "UPDATE users SET pass = $1 WHERE id = $2";
    await client.query(sqlQuery1, [pass, user.id]);

    res.json({ msg: "password is changed" });
  } else {
    res.status(404).json({ msg: "verify code is not correct" });
  }
});

router.get("/mylecture", isUser, async (req, res) => {
  try {
      let { user_id } = req.body;
      let sql =
          "SELECT COALESCE(cg.image, co.image) AS cover_image,lg.id, lg.description AS group_description,lo.id, lo.description AS online_description FROM joininglecture jl LEFT JOIN lecture_group lg ON jl.lgroup_id = lg.id LEFT JOIN lecture_online lo ON jl.lonline_id = lo.id LEFT JOIN covers cg ON cg.image_id = lg.cover LEFT JOIN covers co ON co.image_id = lo.cover WHERE jl.u_id = $1";
      const result = await client.query(sql, [user_id]);
      res.json(result.rows);
  } catch (error) {
      return res.status(500).json({ msg: "Internal server error" });
  }
});


router.get("/lecture/:teacherId", isUser, async (req, res) => {
  try {
    const { teacherId } = req.params;
    const { user_id } = req.body;

    // Fetch user's graduation ID
    const grad_id = (await client.query("SELECT grad FROM users WHERE id = $1", [user_id])).rows[0].grad;

    // Fetch all lectures by the given teacher for the user's graduation
    const lecturesQuery = `
      SELECT 
        co.image AS cover_image,
        lo.id,
        lo.description,
        lo.price,
        CASE WHEN j.u_id IS NULL THEN FALSE ELSE TRUE END AS open
      FROM 
        lecture_online lo 
      JOIN 
        covers co ON co.image_id = lo.cover 
      LEFT JOIN 
        joininglecture j ON lo.id = j.lonline_id AND j.u_id = $1
      WHERE 
        lo.grad_id = $2 AND lo.teacher_id = $3`;

    const lecturesResult = await client.query(lecturesQuery, [user_id, grad_id, teacherId]);
    const lecturesData = lecturesResult.rows;

    res.json(lecturesData);
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ msg: "Internal server error" });
  }
});






module.exports = router;
