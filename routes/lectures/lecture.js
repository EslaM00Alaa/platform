const { validateExam, validateQuestion } = require("../../models/exam");
const photoUpload = require("../../utils/uploadimage");
const {
  cloadinaryUploadImage,
  cloadinaryRemoveImage,
} = require("../../utils/uploadimageCdn");
const express = require("express"),
  client = require("../../database/db"),
  {
    validateLectureGroup,
    validateLectureOnline,
  } = require("../../models/lecture"),
  isTeacher = require("../../middleware/isTeacher"),
  path = require("path"),
  fs = require("fs"),
  router = express.Router();
  const isUser = require("../../middleware/isUser.js");
const video = require("fluent-ffmpeg/lib/options/video.js");
  

router.post(
  "/add",
  photoUpload.single("image"),
  isTeacher,
  async (req, res) => {
    try {
      const { teacher_id, description, grad_id, price } = req.body;

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

      const imagePath = path.join(
        __dirname,
        `../../images/${req.file.filename}`
      );
      const uploadResult = await cloadinaryUploadImage(imagePath); // Assuming you have a function named 'cloadinaryUploadImage' to upload the image asynchronously
      const { public_id, secure_url } = uploadResult;

      await client.query("BEGIN"); // Start a database transaction

      await client.query(
        "INSERT INTO covers(image_id, image) VALUES ($1, $2);",
        [public_id, secure_url]
      );

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
  }
);

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



router.post("/video", isTeacher , async (req, res) => {
  try {
    
    const { lo_id, lg_id, name , video } = req.body;  
    await client.query(
      "INSERT INTO lecturevideos (lo_id, lg_id, video, v_name) VALUES ($1, $2, $3, $4);",
      [lo_id, lg_id, video, name]
    );

    res.status(200).json({ message: "Video uploaded successfully" });
  } catch (error) {
    res.status(500).json({ msg: error.message });
  }
});


router.get("/lectureonline/:lo_id", isUser, async (req, res) => {
  try {
    const { lo_id } = req.params;
    const { user_id } = req.body;

    const permissionCheckQuery = {
      text: "SELECT * FROM joininglecture WHERE u_id = $1 AND lonline_id = $2",
      values: [user_id, lo_id]
    };
    const permissionResult = await client.query(permissionCheckQuery);

    if (permissionResult.rows.length === 0) {
      return res.status(404).json({ msg: "You do not have permission to access this lecture content." });
    }

    const lectureQuery = {
      text: "SELECT c.image,lo.description, e.id AS exam_id, e.name AS exam_name , er.result AS last_result  FROM lecture_online lo LEFT JOIN covers c ON lo.cover = c.image_id  LEFT JOIN exams e ON lo.exam_id = e.id LEFT JOIN examssresult er ON er.u_id = $1 AND er.exam_id = e.id WHERE lo.id = $2",
      values: [user_id, lo_id]
    };
    const lectureResult = await client.query(lectureQuery);
   
    let videos = await client.query("SELECT id, v_name FROM lecturevideos WHERE lo_id = $1", [lo_id]);

    lectureResult.rows[0].videos = videos.rows;
    
    res.json(lectureResult.rows[0]);
  } catch (error) {
    console.error("Error fetching lecture details:", error);
    res.status(500).json({ msg: "Internal server error" });
  }
});
router.get("/lecturegroup/:lg_id", isUser, async (req, res) => {
  try {
    const { lg_id } = req.params; // Corrected variable name from lo_id to lg_id
    const { user_id } = req.body;

    const permissionCheckQuery = {
      text: "SELECT * FROM joininglecture WHERE u_id = $1 AND lgroup_id = $2", // Corrected lonline_id to lgroup_id
      values: [user_id, lg_id]
    };
    const permissionResult = await client.query(permissionCheckQuery);

    if (permissionResult.rows.length === 0) {
      return res.status(404).json({ msg: "You do not have permission to access this lecture content." });
    }

    const lectureQuery = {
      text: "SELECT c.image,lg.description, e.id AS exam_id, e.name AS exam_name, er.result AS last_result FROM lecture_group lg LEFT JOIN covers c ON lg.cover = c.image_id  LEFT JOIN exams e ON lg.exam_id = e.id LEFT JOIN examssresult er ON er.u_id = $1 AND er.exam_id = e.id WHERE lg.id = $2",
      values: [user_id, lg_id]
    };
    const lectureResult = await client.query(lectureQuery);
   
    let videos = await client.query("SELECT id, v_name FROM lecturevideos WHERE lg_id = $1", [lg_id]); // Corrected lo_id to lg_id

    lectureResult.rows[0].videos = videos.rows;
    
    res.json(lectureResult.rows[0]);
  } catch (error) {
    console.error("Error fetching lecture details:", error);
    res.status(500).json({ msg: "Internal server error" });
  }
});

router.get("/video/:id", isUser, async (req, res) => {
  try {
    const vid = req.params.id;
    const { user_id } = req.body;

    const query = `
      SELECT lv.video
      FROM lecturevideos lv
      JOIN joininglecture jl ON jl.lgroup_id = lv.lg_id OR jl.lonline_id = lv.lo_id
      WHERE jl.u_id = $1 AND lv.id = $2
    `;

    const { rows } = await client.query(query, [user_id,vid]);

    if (rows.length > 0) {
      res.json({ video: rows[0].video });
    } else {
      res.status(404).json({ msg: "You can't access this video" });
    }
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ msg: "Internal server error" });
  }
});




router.get("/lectureonlinet/:lo_id", isTeacher, async (req, res) => {
  try {
    const { lo_id } = req.params;
    const { teacher_id } = req.body;

    const permissionCheckQuery = {
      text: "SELECT teacher_id FROM lecture_online WHERE id = $1 ;",
      values: [lo_id]
    };
    const permissionResult = await client.query(permissionCheckQuery);

    if (permissionResult.rows.length === 0 || teacher_id != permissionResult.rows[0].teacher_id ) {
      return res.status(404).json({ msg: "You do not have permission to access this lecture content." });
    }

    const lectureQuery = {
      text: "SELECT c.image,lo.description,lo.price,e.id AS exam_id, e.name AS exam_name  FROM lecture_online lo LEFT JOIN covers c ON lo.cover = c.image_id  LEFT JOIN exams e ON lo.exam_id = e.id  WHERE lo.id = $1",
      values: [lo_id]
    };
    const lectureResult = await client.query(lectureQuery);
   
    let videos = await client.query("SELECT id, v_name FROM lecturevideos WHERE lo_id = $1", [lo_id]);

    lectureResult.rows[0].videos = videos.rows;
    
    res.json(lectureResult.rows[0]);
  } catch (error) {
    console.error("Error fetching lecture details:", error);
    res.status(500).json({ msg: "Internal server error" });
  }
});
router.get("/lecturegroupt/:lg_id", isTeacher, async (req, res) => {
  try {
    const { lg_id } = req.params; // Corrected variable name from lo_id to lg_id
    const { teacher_id } = req.body;

    const permissionCheckQuery = {
      text: "SELECT teacher_id FROM lecture_group WHERE id = $1 ;",
      values: [lg_id]
    };
    const permissionResult = await client.query(permissionCheckQuery);

    if (permissionResult.rows.length === 0 || teacher_id != permissionResult.rows[0].teacher_id ) {
      return res.status(404).json({ msg: "You do not have permission to access this lecture content." });
    }


    const lectureQuery = {
      text: "SELECT c.image,lg.description ,e.id AS exam_id, e.name AS exam_name FROM lecture_group lg LEFT JOIN covers c ON lg.cover = c.image_id  LEFT JOIN exams e ON lg.exam_id = e.id  WHERE lg.id = $1",
      values: [ lg_id]
    };
    const lectureResult = await client.query(lectureQuery);
   
    let videos = await client.query("SELECT id, v_name FROM lecturevideos WHERE lg_id = $1", [lg_id]); // Corrected lo_id to lg_id

    lectureResult.rows[0].videos = videos.rows;
    
    res.json(lectureResult.rows[0]);
  } catch (error) {
    console.error("Error fetching lecture details:", error);
    res.status(500).json({ msg: "Internal server error" });
  }
});

router.get("/videot/:id", isTeacher, async (req, res) => {
  try {
    const { id } = req.params; // Assuming user ID is in params, not body

    const query = `
      SELECT lv.video
      FROM lecturevideos lv
      WHERE id = $1 
    `;

    const { rows } = await client.query(query, [id]);

    if (rows.length > 0) {
      res.json({ video: rows[0].video });
    } else {
      res.status(404).json({ msg: "You can't access this video" });
    }
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ msg: "Internal server error" });
  }
});


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
    const result = await client.query(
      "INSERT INTO exams (name, number) VALUES ($1, $2) RETURNING id;",
      [name, number]
    );
    const examId = result.rows[0].id;

    if (lo_id) {
      let isExist = (await client.query("SELECT exam_id FROM lecture_online WHERE id = $1;", [lo_id])).rows[0];
      if (isExist && isExist.exam_id) {
          return res.status(404).json({ msg: "lecture has exam" });
      }
      await client.query(
        "UPDATE lecture_online SET exam_id = $1 WHERE id = $2;",
        [examId, lo_id]
      );
    }
    if (lg_id) {
      let isExist = (await client.query("SELECT exam_id FROM lecture_group WHERE id = $1;", [lg_id])).rows[0];
      if (isExist && isExist.exam_id) {
          return res.status(404).json({ msg: "lecture has exam" });
      }
      await client.query(
        "UPDATE lecture_group SET exam_id = $1 WHERE id = $2;",
        [examId, lg_id]
      );
    }
    // Commit the transaction
    await client.query("COMMIT");

    res.json({
      msg: "Exam created and associated with lecture successfully",
      examId,
    });
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

    let result = await client.query(
      `
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
    `,
      [teacher_id, grad_id, teacher_id, grad_id]
    );

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ msg: "Internal server error." });
  }
});

// get exam
router.get("/exam/:id", isTeacher, async (req, res) => {
  try {
    let exam_id = req.params.id;
    let name = (await client.query("SELECT name FROM exams WHERE id = $1;",[exam_id])).rows[0].name
    let result = await client.query(
      "SELECT q.id, q.exam_id AS exam_id, q.question, q.answer1, q.answer2, q.answer3, q.answer4, q.degree, c.image FROM questiones q left JOIN covers c ON c.image_id = q.cover WHERE q.exam_id = $1 ",
      [exam_id]
    );
    res.json({name,qusetions:result.rows});
  } catch (error) {
    console.error("Error fetching exam questions:", error);
    res.status(500).json({ msg: "Internal server error." });
  }
});


router.delete("/exam/lonline/:id",isTeacher, async (req, res) => {
  try {
    const id = req.params.id;
    let exam_id =( await client.query("SELECT exam_id FROM lecture_online WHERE id = $1 ; ",[id])).rows[0].exam_id
    // Assuming client is a properly initialized database client
     await client.query("UPDATE lecture_online SET exam_id = null WHERE id = $1 ;", [id]);
    
    let result2 = await client.query("SELECT * FROM lecture_group WHERE exam_id = $1",[exam_id])
    if(result2.rows.length==0)
    {
      await client.query("DELETE FROM exams WHERE id = $1;",[exam_id])
    }

    
      res.json("Exam deleted from this lecture");
  } catch (error) {
    console.error("Error deleting exam:", error);
    res.status(500).json({ msg: "Internal server error" });
  }
});

router.delete("/exam/group/:id",isTeacher,async (req, res) => {
  try {
    const id = req.params.id;
    // Assuming client is a properly initialized database client
    let exam_id =( await client.query("SELECT exam_id FROM lecture_group WHERE id = $1 ; ",[id])).rows[0].exam_id

    const result = await client.query("UPDATE lecture_group SET exam_id = null WHERE id = $1", [id]);
    let result2 = await client.query("SELECT * FROM lecture_online WHERE exam_id = $1",[exam_id])
    if(result2.rows.length==0)
    {
      await client.query("DELETE FROM exams WHERE id = $1;",[exam_id])
    }

    if (result.rowCount === 1) {
      res.json("Exam deleted from this lecture");
    } else {
      res.status(404).json({ msg: "No lecture found with the provided ID" });
    }
  } catch (error) {
    console.error("Error deleting exam:", error);
    res.status(500).json({ msg: "Internal server error" });
  }
});


router.delete("/video/lonline/:id",isTeacher, async (req, res) => {
  try {
    const vid = req.params.id;
       await client.query("UPDATE lecturevideos SET lo_id = null WHERE id = $1 ;", [vid]);
    
      res.json("video deleted from this lecture");
  } catch (error) {
    console.error("Error deleting exam:", error);
    res.status(500).json({ msg: "Internal server error" });
  }
});


router.delete("/video/group/:id",isTeacher, async (req, res) => {
  try {
    const vid = req.params.id;
       await client.query("UPDATE lecturevideos SET lg_id = null WHERE id = $1 ;", [vid]);
    
      res.json("video deleted from this lecture");
  } catch (error) {
    console.error("Error deleting exam:", error);
    res.status(500).json({ msg: "Internal server error" });
  }
});






// questiones
router.post(
  "/question",
  photoUpload.single("image"),
  isTeacher,
  async (req, res) => {
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
        degree,
      } = req.body;

      let public_id, secure_url, imagePath;

      // If an image is uploaded
      if (req.file) {
        imagePath = path.join(__dirname, `../../images/${req.file.filename}`);
        const uploadResult = await cloadinaryUploadImage(imagePath);
        public_id = uploadResult.public_id;
        secure_url = uploadResult.secure_url;

        fs.unlink(imagePath, (err) => {
          if (err) {
            console.error("Error deleting image:", err);
          }
        });
      }

      await client.query("BEGIN"); // Start a database transaction

      // Insert the image into the covers table
      if (public_id && secure_url) {
        await client.query(
          "INSERT INTO covers(image_id, image) VALUES ($1, $2);",
          [public_id, secure_url]
        );
      } 
      
      // Convert correctAnswer to a number
      correctAnswer = parseInt(correctAnswer);

      let correctAns="";
      switch (correctAnswer) {
        case 1:
          correctAns = answer1;
          break;
        case 2:
          correctAns = answer2;
          break;
        case 3:
          correctAns = answer3;
          break;
        case 4:
          correctAns = answer4;
          break;
        default:
          correctAns = "";
      }

      // Insert the question into the questiones table
      await client.query(
        "INSERT INTO questiones (exam_id, question, answer1, answer2, answer3, answer4, correctAnswer, degree, cover) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9);",
        [
          exam_id,
          question,
          answer1,
          answer2,
          answer3,
          answer4,
          correctAns,
          degree,
          public_id,
        ]
      );

      await client.query("COMMIT"); // Commit the transaction

      res.json({ msg: "Question added successfully" });
    } catch (error) {
      await client.query("ROLLBACK"); // Rollback the transaction in case of error
      console.error("Error adding question:", error);
      res.status(500).json({ msg: "Internal server error." });
    }
  }
);

router.delete("/question/:id", isTeacher, async (req, res) => {
  try {
    const qid = req.params.id; // Corrected accessing parameter from URL
    const result = await client.query(
      "DELETE FROM questiones WHERE id = $1 RETURNING cover;",
      [qid]
    );

    if (result.rows.length > 0 && result.rows[0].cover) {
      // Check if 'cover' exists
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
    const checkQuery =
      "SELECT * FROM lecture_online WHERE id = $1 AND teacher_id = $2";
    const checkResult = await client.query(checkQuery, [lectureId, teacherId]);

    if (checkResult.rows.length === 0) {
      return res
        .status(404)
        .json({ msg: "Lecture not found or unauthorized to delete" });
    }

    // Check if there are any associated records in the joininglecture table
    const joiningLectureCheckQuery =
      "SELECT * FROM joininglecture WHERE lonline_id = $1";
    const joiningLectureCheckResult = await client.query(
      joiningLectureCheckQuery,
      [lectureId]
    );

    if (joiningLectureCheckResult.rows.length > 0) {
      // If there are associated records, delete them first
      const deleteJoiningLectureQuery =
        "DELETE FROM joininglecture WHERE lonline_id = $1";
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
    const checkQuery =
      "SELECT * FROM lecture_group WHERE id = $1 AND teacher_id = $2";
    const checkResult = await client.query(checkQuery, [lectureId, teacherId]);

    if (checkResult.rows.length === 0) {
      await client.query("ROLLBACK"); // Rollback the transaction
      return res
        .status(404)
        .json({ msg: "Lecture not found or unauthorized to delete" });
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
