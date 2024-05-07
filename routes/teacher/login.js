
const express = require("express"),
  client = require("../../database/db"),
  {validateLoginTeacher,validateEmail,validateChangePass} = require("../../models/teacher");
const isTeacher = require("../../middleware/isTeacher");
  generateToken = require("../../utils/UserToken"),
  nodemailer = require("nodemailer"),
  bcrypt = require("bcryptjs"),
  router = express.Router();

  const {
    cloadinaryUploadImage,
    cloadinaryRemoveImage,
  } = require("../../utils/uploadimageCdn"),
  fs = require("fs") ;
const photoUpload = require("../../utils/uploadimage");
const path = require("path");
  

router.post("/login", async (req, res) => {
    try {
      const { error } = validateLoginTeacher(req.body);
      if (error) return res.status(404).json({ msg: error.details[0].message });
  
      let sqlQuery = `SELECT * FROM teachers WHERE mail = $1 `;
      let result = await client.query(sqlQuery, [req.body.mail]);
      if (result.rows.length > 0) {
        const { pass,verify_code,...obj } = result.rows[0];
        let isPasswordMatch = await bcrypt.compare(
          req.body.pass,
          result.rows[0].pass
        );
        obj.role="teacher";
  
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


  router.put('/updateprofile', [photoUpload.single('image'),isTeacher],async (req, res) => {
    try {
      let id = req.body.teacher_id;
  
      if (!req.file) {
        return res.status(400).json({ message: 'You must send images' });
      }
  
     
    const imagePath = path.join(__dirname, `../../images/${req.file.filename}`);
    const uploadResult = await cloadinaryUploadImage(imagePath); // Assuming you have a function named 'cloadinaryUploadImage' to upload the image asynchronously
    const { public_id, secure_url } = uploadResult;

      fs.unlink(imagePath, (err) => {
      if (err) {
        console.error("Error deleting image:", err);
      }})
    
      await client.query('INSERT INTO covers (image_id, image) VALUES ($1, $2);', [public_id, secure_url]);
      const result = await client.query('UPDATE teachers SET cover = $1 WHERE id = $2 ;', [public_id, id]);
     
      
      return res.status(200).json({ message: 'Update successful' });
    } catch (error) {
      // Handle errors appropriately
      console.error(error);
      return res.status(500).json({ msg: 'Internal Server Error' });
    }
  });
  
  


  router.post("/verifycode", async (req, res) => {
    try {
      const { error } = validateEmail(req.body);
      if (error) {
        return res.status(400).json({ msg: error.details[0].message });
      }
  
      const sqlQuery = "SELECT * FROM teachers WHERE mail = $1";
      const result = await client.query(sqlQuery, [req.body.mail]);
  
      if (result.rows.length > 0) {
        const user = result.rows[0];
        const randomNumber = Math.floor(1000 + Math.random() * 9000);
        const salt = await bcrypt.genSalt(10);
        const hashedNumber = await bcrypt.hash(randomNumber.toString(), salt);
  
        const sqlQuery1 = "UPDATE teachers SET verify_code = $1 WHERE id = $2";
        await client.query(sqlQuery1, [hashedNumber.toString().trim(), user.id]);
  
        const transporter = nodemailer.createTransport({
          service: "gmail",
          auth: {
            user: "onlineem936@gmail.com",
            pass: "qgqfaphmbvijlrur",
          },
        });
  
        const mailOptions = {
          from: "onlineem936@gmail.com",
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
    const sqlQuery = "SELECT * FROM teachers WHERE mail = $1";
    const result = await client.query(sqlQuery, [mail]);
  
    const user = result.rows[0];
    console.log(user)
    let isPasswordMatch = await bcrypt.compare(verifycode, user.verify_code.trim()); // Trim the user.verify_code
    console.log(isPasswordMatch)
    if (isPasswordMatch) {
      const sqlQuery1 = "UPDATE teachers SET pass = $1 WHERE id = $2";
      await client.query(sqlQuery1, [pass, user.id]);
  
      res.json({ msg: "password is changed" });
    } else {
      res.status(404).json({ msg: "verify code is not correct" });
    }
  });
  

module.exports = router;
