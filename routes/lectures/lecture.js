const {validateExam,validateQuestion} = require("../../models/exam");
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


router.post("/exam", isTeacher, async (req, res) => {
  try {
    const { error } = validateExam(req.body);
    if (error) {
      return res.status(400).json({ msg: error.details[0].message }); // Changed status code to 400 for bad request
    }

    const { lo_id, name, number, lg_id } = req.body;

    // Start a database transaction
    await client.query("BEGIN");

    // Insert new exam
    const result = await client.query("INSERT INTO exams (name, number) VALUES ($1, $2) RETURNING id;", [name, number]);
    const examId = result.rows[0].id;

    if(lo_id)
    {
      await client.query("UPDATE lecture_online SET exam_id = $1 WHERE id = $2;" , [examId, lo_id]);
    }
    if(lg_id)
    {
    await client.query("UPDATE lecture_group SET exam_id = $1 WHERE id = $2;" , [examId, lg_id]);
    }
    // Commit the transaction
    await client.query("COMMIT");

    res.json({ msg: "Exam created and associated with lecture successfully",examId });
  } catch (error) {
    // Rollback the transaction in case of error
    await client.query("ROLLBACK");
    console.error("Error creating exam:", error);
    res.status(500).json({ msg: "Internal server error." });
  }
});

router.get("/exams/:gradId", isTeacher, async (req, res) => {
  try {
    let grad_id = req.params.gradId;
    let teacher_id = req.body.teacher_id; // Assuming teacher_id is accessible through req.user

    let result = await client.query(`
      SELECT DISTINCT id, name FROM (
          SELECT e.id, e.name 
          FROM exams e 
          LEFT JOIN lecture_group lg ON lg.exam_id = e.id 
          WHERE lg.teacher_id = $1 AND lg.grad_id = $2
          UNION 
          SELECT e.id, e.name 
          FROM exams e 
          LEFT JOIN lecture_online lo ON lo.exam_id = e.id 
          WHERE lo.teacher_id = $3 AND lo.grad_id = $4 
      ) AS combined_exams;
    `, [teacher_id, grad_id, teacher_id, grad_id]);
    
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ msg: "Internal server error." });
  }
});




// get exam 
router.get("/exam/:id/:qid",isTeacher,async (req, res) => {
  try {
    let exam_id = req.params.id;
    let limit = 1;
    let skip = (+req.params.qid - 1) * limit;

    // Corrected SQL query syntax and added alias for q.exam_id
    let result = await client.query("SELECT q.id, q.exam_id AS exam_id, q.question, q.answer1, q.answer2, q.answer3, q.answer4, q.degree, c.image FROM questiones q left JOIN covers c ON c.image_id = q.cover WHERE q.exam_id = $1 LIMIT $2 OFFSET $3;", [exam_id, limit, skip]);

    if (result.rows.length === 0) {
      return res.status(404).json({ msg: "No questions found for the provided exam ID and question ID." });
    }

    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching exam questions:", error);
    res.status(500).json({ msg: "Internal server error." });
  }
});


// questiones  
router.post("/question", photoUpload.single("image"), isTeacher, async (req, res) => {
  try {
    const { error } = validateQuestion(req.body);
    if (error) return res.status(400).json({ msg: error.details[0].message });

    let {
      exam_id,
      question,
      answer1,
      answer2,
      answer3,
      answer4,
      correctAnswer,
      degree
    } = req.body;

    let public_id, secure_url;

    // If an image is uploaded
    if (req.file) {
      const imagePath = path.join(__dirname, `../../images/${req.file.filename}`);
      const uploadResult = await cloadinaryUploadImage(imagePath);
      public_id = uploadResult.public_id;
      secure_url = uploadResult.secure_url;
    }

    await client.query("BEGIN"); // Start a database transaction

    // Insert the image into the covers table
    if (public_id && secure_url) {
      await client.query("INSERT INTO covers(image_id, image) VALUES ($1, $2);", [public_id, secure_url]);
    }

    // Insert the question into the questiones table
    await client.query("INSERT INTO questiones (exam_id, question, answer1, answer2, answer3, answer4, correctAnswer, degree, cover) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9);", [exam_id, question, answer1, answer2, answer3, answer4, correctAnswer, degree, public_id]);

    await client.query("COMMIT"); // Commit the transaction

    res.json({ msg: "Question added successfully" });
    fs.unlink(imagePath, (err) => {
      if (err) {
        console.error("Error deleting image:", err);
      }})
  } catch (error) {
    await client.query("ROLLBACK"); // Rollback the transaction in case of error
    console.error("Error adding question:", error);
    res.status(500).json({ msg: "Internal server error." });
  }
});

router.delete("/question/:id", isTeacher, async (req, res) => {
  try {
    const qid = req.params.id; // Corrected accessing parameter from URL
    const result = await client.query("DELETE FROM questiones WHERE id = $1 RETURNING cover;", [qid]);
   
    if (result.rows.length > 0 && result.rows[0].cover) { // Check if 'cover' exists
      await cloudinaryRemoveImage(result.rows[0].cover); // Corrected function name
    }

    res.json({ msg: "One question deleted" }); // Corrected response method
  } catch (error) {
    console.error("Error deleting question:", error);
    res.status(500).json({ msg: "Internal server error." });
  }
});























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

    // Check if there are any associated records in the joininglecture table
    const joiningLectureCheckQuery = "SELECT * FROM joininglecture WHERE lonline_id = $1";
    const joiningLectureCheckResult = await client.query(joiningLectureCheckQuery, [lectureId]);

    if (joiningLectureCheckResult.rows.length > 0) {
      // If there are associated records, delete them first
      const deleteJoiningLectureQuery = "DELETE FROM joininglecture WHERE lonline_id = $1";
      await client.query(deleteJoiningLectureQuery, [lectureId]);
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
  const lectureId = req.params.id;
  const teacherId = req.body.teacher_id; // Assuming teacher_id is accessible through req.user

  try {
    await client.query("BEGIN"); // Start a database transaction

    // Check if the lecture exists and is associated with the teacher
    const checkQuery = "SELECT * FROM lecture_group WHERE id = $1 AND teacher_id = $2";
    const checkResult = await client.query(checkQuery, [lectureId, teacherId]);

    if (checkResult.rows.length === 0) {
      await client.query("ROLLBACK"); // Rollback the transaction
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

    await client.query("COMMIT"); // Commit the transaction

    res.json({ msg: "The lecture and associated image have been deleted" });
  } catch (error) {
    await client.query("ROLLBACK"); // Rollback the transaction in case of an error
    console.error("Error deleting lecture:", error);
    res.status(500).json({ msg: "Internal server error" });
  } finally {
    await client.query("END"); // End the transaction
  }
});


module.exports = router;
