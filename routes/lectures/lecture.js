const photoUpload = require("../../utils/uploadimage");
const { cloadinaryUploadImage , cloadinaryRemoveImage } = require("../../utils/uploadimageCdn");

const express = require("express"),
  client = require("../../database/db"),
  {validateLectureGroup,validateLectureOnline} = require("../../models/lecture"),
  isTeacher = require("../../middleware/isTeacher"),
  path = require("path"),
  fs = require("fs"),
  router = express.Router();




  // ` 
  // CREATE TABLE lecture_group (
  // id SERIAL PRIMARY KEY ,
  // teacher_id INT references teachers(id) NOT NULL,   
  // cover varchar(255) references covers(image_id) not null,
  // description VARCHAR(255) NOT NULL ,
  // grad_id  INT  references grades(id) not null
  // )
  // `,

  // `
  // CREATE TABLE lecture_online (
  //   id SERIAL PRIMARY KEY ,
  //   teacher_id INT references teachers(id) NOT NULL,   
  //   cover varchar(255) references covers(image_id) not null,
  //   description VARCHAR(255) NOT NULL ,
  //   grad_id INT  references grades(id) not null,
  //   price INT NOT NULL 
  // )
  // `


  router.post("/add", photoUpload.single("image"),isTeacher, async (req, res) => {
    try {
      const {
        teacher_id,
        description,
        grad_id,
        price
      } = req.body;
  
      let error;
      let validationSchema;
     
   
      
      if (price) {
        validationSchema = validateLectureOnline(req.body);
        error = validationSchema.error;
      } else {
        validationSchema = validateLectureGroup(req.body);
        error = validationSchema.error;
      }
  
      if (error) {
        return res.status(400).json({ msg: error.details[0].message });
      }
  
      if (!req.file) {
        return res.status(400).json({ message: "You must send an image" });
      }
  
      const imagePath = path.join(__dirname, `../../images/${req.file.filename}`);
      const uploadResult = await cloadinaryUploadImage(imagePath); // Assuming you have a function named 'cloadinaryUploadImage' to upload the image asynchronously
      const { public_id, secure_url } = uploadResult;
  
      await client.query("BEGIN"); // Start a database transaction
  
      await client.query("INSERT INTO covers(image_id, image) VALUES ($1, $2);", [
        public_id,
        secure_url,
      ]);
  
      const sql = price
        ? "INSERT INTO lecture_online(teacher_id, cover, description, grad_id, price) VALUES ($1, $2, $3, $4, $5) RETURNING id"
        : "INSERT INTO lecture_group(teacher_id, cover, description, grad_id) VALUES ($1, $2, $3, $4) RETURNING id";
  
      const result = await client.query(
        sql,
        price
          ? [teacher_id, public_id, description, grad_id, price]
          : [teacher_id, public_id, description, grad_id]
      );
  
      await client.query("COMMIT"); // Commit the database transaction
  
      res.json({ msg: "One Lecture Saved" });
  
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


// router.get("/group",isTeacher, async (req, res) => {
//   try {
//     let result = await client.query(
//       "select g.id g.cover g.description gr.name  from  lecture_group g join grades gr on g.grade_id = gr.grade_id   where g.teacher_id = $1 ",[req.body.teacher_id]
//     );
//     res.json(result.rows);
//   } catch (error) {
//     res.status(500).json({ msg: error.message });
//   }
// });

// router.get("/online",isTeacher, async (req, res) => {
//   try {
//     let result = await client.query(
//       "select g.id g.cover g.description g.price gr.name  from  lecture_online g join grades gr on g.grade_id = gr.grade_id  where g.teacher_id = $1 ",[req.body.teacher_id]
//     );
//     res.json(result.rows);
//   } catch (error) {
//     res.status(500).json({ msg: error.message });
//   }
// });


// router.get("/group/:id",isTeacher, async (req, res) => {
//   try {
//     let grad_id = req.params.id ;
//     let result = await client.query(
//       "select g.id g.cover g.description gr.name from  lecture_group g join grades gr on g.grade_id = gr.grade_id   where g.teacher_id = $1 and g.grad_id =$2 ",[req.body.teacher_id,grad_id]
//     );
//     res.json(result.rows);
//   } catch (error) {
//     res.status(500).json({ msg: error.message });
//   }
// });

// router.get("/online/:grad_id",isTeacher, async (req, res) => {
//   try {
//     let grad_id = req.params.id ;
//     let result = await client.query(
//       "select g.id g.cover g.description g.price gr.name from  lecture_online g join grades gr on g.grade_id = gr.grade_id   where g.teacher_id = $1 and g.grad_id =$2 ",[req.body.teacher_id,grad_id]
//     );
//     res.json(result.rows);
//   } catch (error) {
//     res.status(500).json({ msg: error.message });
//   }
// });

router.get("/group", isTeacher, async (req, res) => {
  try {
    const teacherId = req.body.teacher_id;
    const result = await client.query(
      "SELECT g.id, c.image, g.description, gr.name FROM lecture_group g JOIN grades gr ON g.grad_id = gr.id JOIN covers c on c.image_id = g.cover  WHERE g.teacher_id = $1",
      [teacherId]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ msg: error.message });
  }
});

router.get("/online", isTeacher, async (req, res) => {
  try {
    const teacherId = req.body.teacher_id;
    const result = await client.query(
      "SELECT g.id,  c.image , g.description, g.price, gr.name FROM lecture_online g JOIN grades gr ON g.grad_id = gr.id  JOIN covers c on c.image_id = g.cover WHERE g.teacher_id = $1",
      [teacherId]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ msg: error.message });
  }
});

router.get("/group/:id", isTeacher, async (req, res) => {
  try {
    const teacherId = req.body.teacher_id;
    const gradId = req.params.id;
    const result = await client.query(
      "SELECT g.id,  c.image , g.description, gr.name FROM lecture_group g JOIN grades gr ON g.grad_id = gr.id  JOIN covers c on c.image_id = g.cover WHERE g.teacher_id = $1 AND g.grad_id = $2",
      [teacherId, gradId]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ msg: error.message });
  }
});


// router.delete("/group/:lid", isTeacher, async (req, res) => {
//   const client = await pool.connect(); // Assuming you're using a database connection pool

//   try {
//       const teacherId = req.body.teacher_id;
//       const lectureId = req.params.lid;


//       const { rows } = await client.query("SELECT cover FROM lecture_group WHERE id = $1 AND teacher_id = $2", [lectureId, teacherId]);
//       if (rows.length === 0) {
//           return res.status(404).json({ msg: "Lecture group not found for the specified teacher." });
//       }
//       const imgId = rows[0].cover;

//       await client.query('BEGIN');

      
//       await cloadinaryRemoveImage(imgId);

      
//       await client.query("DELETE FROM covers WHERE image_id = $1", [imgId]);

    
//       await client.query("DELETE FROM lecture_group WHERE id = $1 AND teacher_id = $2", [lectureId, teacherId]);

  
//       await client.query('COMMIT');

//       res.json({ msg: "Lecture group and associated cover image deleted successfully." });
//   } catch (error) {
//       // Rollback transaction on error
//       await client.query('ROLLBACK');
//       console.error("Error in deleting lecture group:", error);
//       res.status(500).json({ msg: "Internal server error." });
//   } finally {
//       // Release the client back to the pool
//       client.release();
//   }
// });



router.get("/online/:grad_id", isTeacher, async (req, res) => {
  try {
    const teacherId = req.body.teacher_id;
    const gradId = req.params.grad_id;
    const result = await client.query(
      "SELECT g.id,  c.image , g.description, g.price, gr.name FROM lecture_online g JOIN grades gr ON g.grad_id = gr.id   JOIN covers c on c.image_id = g.cover WHERE g.teacher_id = $1 AND g.grad_id = $2",
      [teacherId, gradId]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ msg: error.message });
  }
});



// router.delete("/online/:lid", isTeacher, async (req, res) => {
//   const client = await pool.connect(); // Assuming you're using a database connection pool

//   try {
//       const teacherId = req.body.teacher_id;
//       const lectureId = req.params.lid;

//       // Fetch cover image ID
//       const { rows } = await client.query("SELECT cover FROM lecture_group WHERE id = $1 AND teacher_id = $2", [lectureId, teacherId]);
//       if (rows.length === 0) {
//           return res.status(404).json({ msg: "Lecture group not found for the specified teacher." });
//       }
//       const imgId = rows[0].cover;

//       // Start transaction
//       await client.query('BEGIN');

//       // Remove image from Cloudinary
//       await cloadinaryRemoveImage(imgId);

//       // Delete image record from the database
//       await client.query("DELETE FROM covers WHERE image_id = $1", [imgId]);

//       // Delete lecture group record
//       await client.query("DELETE FROM lecture_online WHERE id = $1 AND teacher_id = $2", [lectureId, teacherId]);

//       // Commit transaction
//       await client.query('COMMIT');

//       res.json({ msg: "Lecture group and associated cover image deleted successfully." });
//   } catch (error) {
//       // Rollback transaction on error
//       await client.query('ROLLBACK');
//       console.error("Error in deleting lecture group:", error);
//       res.status(500).json({ msg: "Internal server error." });
//   } finally {
//       // Release the client back to the pool
//       client.release();
//   }
// });






































router.delete("/online/:id", isTeacher, async (req, res) => {
  try {
    const lectureId = req.params.id;
    const teacherId = req.body.teacher_id;

    await client.query("BEGIN"); // Start a database transaction

    // Check if the lecture exists and is associated with the teacher
    const checkQuery = "SELECT * FROM lecture_online WHERE id = $1 AND teacher_id = $2";
    const checkResult = await client.query(checkQuery, [lectureId, teacherId]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ msg: "Lecture not found or unauthorized to delete" });
    }

    // Retrieve the image ID associated with the lecture
    const imageIdQuery = "SELECT cover FROM lecture_online WHERE id = $1";
    const imageIdResult = await client.query(imageIdQuery, [lectureId]);
    const imageId = imageIdResult.rows[0].cover;

    // Delete the lecture from the database
    const deleteQuery = "DELETE FROM lecture_online WHERE id = $1";
    await client.query(deleteQuery, [lectureId]);

    // Remove the image from Cloudinary
    await cloadinaryRemoveImage(imageId);

    await client.query("COMMIT"); // Commit the database transaction

    res.json({ msg: "The lecture and associated image have been deleted" });
  } catch (error) {
    await client.query("ROLLBACK"); // Rollback the database transaction in case of an error
    res.status(500).json({ msg: error.message });
  } finally {
    await client.query("END"); // End the database transaction
  }
});


router.delete("/group/:id", isTeacher, async (req, res) => {
  try {
    const lectureId = req.params.id;
    const teacherId = req.body.teacher_id;

    await client.query("BEGIN"); // Start a database transaction

    // Check if the lecture exists and is associated with the teacher
    const checkQuery = "SELECT * FROM lecture_group WHERE id = $1 AND teacher_id = $2";
    const checkResult = await client.query(checkQuery, [lectureId, teacherId]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ msg: "Lecture not found or unauthorized to delete" });
    }

    // Retrieve the image ID associated with the lecture
    const imageIdQuery = "SELECT cover FROM lecture_group WHERE id = $1";
    const imageIdResult = await client.query(imageIdQuery, [lectureId]);
    const imageId = imageIdResult.rows[0].cover;

    // Delete the lecture from the database
    const deleteQuery = "DELETE FROM lecture_group WHERE id = $1";
    await client.query(deleteQuery, [lectureId]);

    // Remove the image from Cloudinary
    await cloadinaryRemoveImage(imageId);

    await client.query("COMMIT"); // Commit the database transaction

    res.json({ msg: "The lecture and associated image have been deleted" });
  } catch (error) {
    await client.query("ROLLBACK"); // Rollback the database transaction in case of an error
    res.status(500).json({ msg: error.message });
  } finally {
    await client.query("END"); // End the database transaction
  }
});




module.exports = router;
