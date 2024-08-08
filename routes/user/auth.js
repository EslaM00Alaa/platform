const isUser = require("../../middleware/isUser");

const express = require("express"),
  client = require("../../database/db"),
  bcrypt = require("bcryptjs"),
  {
    validateUser,
    validateLoginUser,
    validateEmail,
    validateEmailU,
    validateChangePass,
    validatePhone,
  } = require("../../models/user"),
  generateToken = require("../../utils/UserToken"),
  nodemailer = require("nodemailer"),
  router = express.Router();

router.post("/signup", async (req, res) => {
  try {
    console.log(req.body.ip);
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
      req.body.mail.trim(),
      req.body.pass,
      req.body.phone,
      req.body.grad,
    ]);





    const UID = result.rows[0].id,
      obj = result.rows[0];
    await client.query("INSERT INTO userwallet (u_id) VALUES ($1) ;", [UID]);
    await client.query("INSERT INTO usersip (ip,u_id) VALUES($1,$2) ;", [
      req.body.ip,
      UID,
    ]);


    
    let userdata = await client.query(
      "SELECT * FROM users WHERE mail = $1 OR mail LIKE $2 OR phone = $3",
      [mail, mail + " %", mail]
    );


    const { pass, verify_code, ...userData } = userdata.rows[0];


    return res.json({
      msg: "ok you register successfully",
      token: generateToken(userdata.rows[0].id, userdata.rows[0].mail),
      data: userData,
    });

  } catch (error) {
    return res.status(404).json({ msg: error.message });
  }
});

router.put("/edit/phone", isUser, async (req, res) => {
  try {
    const { user_id, phone } = req.body;
    const { error } = validatePhone(req.body);

    if (error) {
      throw new Error(error.details[0].message);
    }

    await client.query("UPDATE users SET phone = $1 WHERE id = $2;", [
      phone,
      user_id,
    ]);

    res.json({ msg: "Phone number updated successfully" });
  } catch (error) {
    console.error("Error updating phone number:", error);
    res.status(500).json({ msg: "Internal server error" });
  }
});

router.put("/edit/mail", isUser, async (req, res) => {
  try {
    const { user_id, newmail } = req.body;
    const { error } = validateEmailU(req.body);

    if (error) {
      throw new Error(error.details[0].message);
    }

    await client.query("UPDATE users SET mail = $1 WHERE id = $2;", [
      newmail,
      user_id,
    ]);

    res.json({ msg: "mail  updated successfully" });
  } catch (error) {
    console.error("Error updating phone number:", error);
    res.status(500).json({ msg: "Internal server error" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { error } = validateLoginUser(req.body);
    if (error) return res.status(400).json({ msg: error.details[0].message });
    let mail = req.body.mail;
    let result = await client.query(
      "SELECT * FROM users WHERE mail = $1 OR mail LIKE $2 OR phone = $3",
      [mail, mail + " %", mail]
    );

    if (result.rows.length > 0) {
      let uid = result.rows[0].id;
      let userIpQuery = await client.query(
        "SELECT ip FROM usersip WHERE u_id = $1 ;",
        [uid]
      );
      if (userIpQuery.rows.length > 0) {
        let user_ip = userIpQuery.rows[0].ip;
        console.log(user_ip + "     " + req.body.ip);
        if (user_ip !== req.body.ip) {
          if (user_ip === "sata") {
            console.log("change");
            await client.query("UPDATE usersip SET ip = $1 WHERE u_id = $2;", [
              req.body.ip,
              uid,
            ]);
          } else {
            return res
              .status(400)
              .json({ msg: "You must login from the same device" });
          }
        }
      } else {
        await client.query("INSERT INTO usersip (ip, u_id) VALUES ($1, $2) ;", [
          req.body.ip,
          uid,
        ]);
      }

      const isPasswordMatch = await bcrypt.compare(
        req.body.pass,
        result.rows[0].pass
      );

      if (isPasswordMatch) {
        const { pass, verify_code, ...userData } = result.rows[0];
        return res.json({
          token: generateToken(result.rows[0].id, result.rows[0].mail),
          data: userData,
        });
      } else {
        return res.status(400).json({ msg: "Invalid username or password" });
      }
    } else {
      return res.status(400).json({ msg: "Invalid username or password" });
    }
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ msg: "Internal server error" });
  }
});

async function sendMail(mail, msg, sup) {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "onlineem936@gmail.com",
      pass: "qgqfaphmbvijlrur",
    },
  });
  console.log(mail);
  const mailOptions = {
    from: "onlineem936@gmail.com",
    to: mail,
    subject: sup,
    html: `<h1>${msg}</h1>`,
  };

  return new Promise((resolve, reject) => {
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error("Failed to send email:", error);
        reject(error);
      } else {
        console.log("Email sent successfully");
        resolve();
      }
    });
  });
}

router.post("/verifycode", async (req, res) => {
  try {
    const { error } = validateEmail(req.body);
    if (error) {
      return res.status(400).json({ msg: error.details[0].message });
    }
    let mail = req.body.mail;

    const result = await client.query(
      "SELECT id FROM users WHERE mail = $1 OR mail LIKE $2",
      [mail, mail + " %"]
    );

    if (result.rows.length > 0) {
      const user = result.rows[0];
      const randomNumber = Math.floor(1000 + Math.random() * 9000);
      const salt = await bcrypt.genSalt(10);
      const hashedNumber = await bcrypt.hash(randomNumber.toString(), salt);

      const sqlQuery1 = "UPDATE users SET verify_code = $1 WHERE id = $2";
      await client.query(sqlQuery1, [hashedNumber.toString().trim(), user.id]);

      await sendMail(mail, randomNumber, "Verify Code");

      return res.json({ msg: "Email sent" });
    } else {
      return res.status(404).json({ msg: "No account for this user" });
    }
  } catch (error) {
    console.log(error);
    return res.status(500).json({ msg: "Internal server error" });
  }
});

// Import bcrypt module

router.post("/resetpass", async (req, res) => {
  const { error } = validateChangePass({
    code: req.body.code,
    mail: req.body.mail,
    pass: req.body.pass,
  });
  if (error) return res.status(400).json({ msg: error.details[0].message }); // Changed status code to 400 for bad request

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(req.body.pass, salt);

  const mail = req.body.mail;
  const verifycode = req.body.code.trim(); // Trim the verify code

  const result = await client.query(
    "SELECT id, verify_code FROM users WHERE mail = $1 OR mail LIKE $2",
    [mail, mail + " %"]
  );
  const user = result.rows[0];

  if (!user) {
    return res.status(404).json({ msg: "User not found" }); // Handle case where user is not found
  }

  const isPasswordMatch = await bcrypt.compare(
    verifycode,
    user.verify_code.trim()
  ); // Trim the user.verify_code
  if (!isPasswordMatch) {
    return res.status(401).json({ msg: "Verify code is not correct" }); // Changed status code to 401 for unauthorized
  }

  const sqlQuery1 = "UPDATE users SET pass = $1 WHERE id = $2";
  await client.query(sqlQuery1, [hashedPassword, user.id]);

  res.json({ msg: "Password is changed" });
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
    const grad_id = (
      await client.query("SELECT grad FROM users WHERE id = $1", [user_id])
    ).rows[0].grad;

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

    const lecturesResult = await client.query(lecturesQuery, [
      user_id,
      grad_id,
      teacherId,
    ]);
    const lecturesData = lecturesResult.rows;

    res.json(lecturesData);
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ msg: "Internal server error" });
  }
});

router.get("/myteacher", isUser, async (req, res) => {
  try {
    const { user_id } = req.body; // Destructure user_id directly from req.body
    const queryResult = await client.query(
      "SELECT grad FROM users WHERE id = $1",
      [user_id]
    );

    // Check if any rows were returned
    if (queryResult.rows.length === 0) {
      return res.status(404).json({ msg: "User not found" });
    }

    const grad_id = queryResult.rows[0].grad;

    const result = await client.query(
      `
    SELECT 
    t.id,
    c.image,
    t.name,
    t.description,
    t.mail,
    t.subject,
    t.whats,
    t.facebook,
    t.tele
FROM 
    teachers t 
JOIN 
    covers c ON t.cover = c.image_id 
JOIN 
    classes cl ON cl.teacher_id = t.id 
WHERE 
    cl.grad_id = $1 
GROUP BY 
    t.id, c.image, t.name, t.description, t.mail, t.subject, t.whats, t.facebook, t.tele
ORDER BY 
    t.id ASC;
        `,
      [grad_id]
    );

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ msg: error.message });
  }
});

module.exports = router;
