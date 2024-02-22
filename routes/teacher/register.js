const isUser = require("../../middleware/isUser");
const photoUpload = require("../../utils/uploadimage");
const { cloadinaryUploadImage , cloadinaryRemoveImage } = require("../../utils/uploadimageCdn");

const express = require("express"),
  client = require("../../database/db"),
  {validateTeacher} = require("../../models/teacher"),
  isAdmin = require("../../middleware/isAdmin"),
  path = require("path"),
  fs = require("fs"),
  bcrypt = require("bcryptjs"),
  router = express.Router();


router.post("/add", isAdmin, photoUpload.single("image"), async (req, res) => {
  try {
    const { error } = validateTeacher(req.body);
    if (error) {
      return res.status(400).json({ msg: error.details[0].message });
    }

    
    let tec = await client.query("select * from teachers where mail = $1  ;", [req.body.mail]);

      
    const salt = await bcrypt.genSalt(10);
    req.body.pass = await bcrypt.hash(req.body.pass, salt);

    if (!req.file) {
      return res.status(400).json({ message: "You must send images" });
    }

    const {
      name,
      mail,
      pass,
      subject,
      description,
      whats,
      facebook,
      tele,
      classes,
    } = req.body;

    const imagePath = path.join(__dirname, `../../images/${req.file.filename}`);
    const uploadResult = await cloadinaryUploadImage(imagePath); // Assuming you have a function named 'cloadinaryUploadImage' to upload the image asynchronously
    const { public_id, secure_url } = uploadResult;

    
    if (tec.rows.length > 0)
    {
      fs.unlink(imagePath, (err) => {
        if (err) {
          console.error("Error deleting image:", err);
        };
      })
      return res.status(404).json({ msg: "This user already registered" });
    }


    await client.query("BEGIN"); // Start a database transaction

    await client.query("INSERT INTO covers(image_id, image) VALUES ($1, $2);", [
      public_id,
      secure_url,
    ]);

    const result = await client.query(
      "INSERT INTO teachers(cover, name, description, mail, pass, subject, whats, facebook, tele) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id;",
      [public_id, name, description, mail, pass, subject, whats, facebook, tele]
    );
    const id = result.rows[0].id;
    await client.query("INSERT INTO teacherwallet (teacher_id) VALUES ($1) ;",[id]);
    const classInserts = classes.map((clas) => {
      return client.query(
        "INSERT INTO classes(grad_id, teacher_id) VALUES ($1, $2);",
        [clas, id]
      );
    });

    await Promise.all(classInserts);

    await client.query("COMMIT"); // Commit the database transaction

    res.json({ msg: "One teacher registered" });


    
    fs.unlink(imagePath, (err) => {
      if (err) {
        console.error("Error deleting image:", err);
      }
    });
  } catch (error) {
    await client.query("ROLLBACK"); // Rollback the database transaction in case of an error
    res.status(500).json({ msg: error.message });
  } finally {
    await client.query("END"); // End the database transaction
  }
});


router.get("/", async (req, res) => {
  try {
    let result = await client.query(
      "select t.id ,c.image ,t.name, t.description , t.mail , t.subject , t.whats ,t.facebook, t.tele , COUNT(lo.id) AS lecture_count  from teachers t join covers c on t.cover = c.image_id LEFT JOIN  lecture_online lo ON lo.teacher_id = t.id  GROUP BY  t.id, c.image, t.name, t.description, t.mail, t.subject, t.whats, t.facebook, t.tele; "
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ msg: error.message });
  }
});


router.get("/:grad_id", async (req, res) => {
   try {
    let result = await client.query("select t.id ,c.image ,t.name, t.description , t.mail , t.subject , t.whats ,t.facebook, t.tele , COUNT(lo.id) AS lecture_count  from teachers t join covers c on t.cover = c.image_id join classes cl on cl.teacher_id = t.id LEFT JOIN  lecture_online lo ON lo.teacher_id = t.id    where cl.grad_id = $1 GROUP BY t.id, c.image, t.name, t.description, t.mail, t.subject, t.whats, t.facebook, t.tele;",[req.params.grad_id]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ msg: error.message });
  }
});



router.get("/teacher/:id",isUser,async (req, res) => {
  try {
      let teacher_id = req.params.id; 
     
      const { user_id } = req.body; // Destructure user_id directly from req.body
      const queryResult = await client.query("SELECT u.grad , g.name FROM users u join grades g on u.grad = g.id WHERE u.id = $1", [user_id]);
      
      // Check if any rows were returned
      if (queryResult.rows.length === 0) {
        return res.status(404).json({ msg: "User not found" });
      }
  
      const grad_id = queryResult.rows[0].grad;
      const grad = queryResult.rows[0].name;

      const result = await client.query(`
      SELECT 
        t.id,
        c.image,
        t.name,
        t.description,
        t.mail,
        t.subject,
        t.whats,
        t.facebook,
        t.tele,
        COUNT(lo.id) AS lecture_count 
      FROM 
        teachers t 
      JOIN 
        covers c ON t.cover = c.image_id 
      JOIN 
        classes cl ON cl.teacher_id = t.id 
      LEFT JOIN 
        lecture_online lo ON lo.teacher_id = t.id  
      WHERE 
        cl.grad_id = $1 AND lo.grad_id = $2 AND t.id = $3
      GROUP BY 
        t.id, c.image, t.name, t.description, t.mail, t.subject, t.whats, t.facebook, t.tele;
    `, [grad_id,grad_id,teacher_id]);
      result.rows[0].grad = grad
    res.json(result.rows);

  } catch (error) {
    res.status(500).json({ msg: error.message });
  }
});









router.delete("/:id", isAdmin, async (req, res) => {
  try {
    const id = req.params.id;

        
    let tec = await client.query("select * from teachers where id = $1  ;", [id]);

    if (tec.rows.length>0)
   {
    await client.query("BEGIN"); // Start a database transaction

    // Delete related records from the 'classes' table
    await client.query("DELETE FROM classes WHERE teacher_id = $1", [id]);

    // Delete the teacher from the 'teachers' table
    const result = await client.query("DELETE FROM teachers WHERE id = $1 RETURNING cover", [id]);
    const image_id = result.rows[0].cover;

    // Delete the associated cover image if it exists
    if (image_id) {
      await client.query("DELETE FROM covers WHERE image_id = $1", [image_id]);
      await cloadinaryRemoveImage(image_id);
    }

    await client.query("COMMIT"); // Commit the database transaction

    res.json({ msg: "Teacher deleted" });
  }
  else 
  return res.json({msg:"not found"})
  } catch (error) {
    await client.query("ROLLBACK"); // Rollback the database transaction in case of an error
    res.status(404).json({ msg: error.message });
  } finally {
    await client.query("END"); // End the database transaction
  }
});

module.exports = router;
