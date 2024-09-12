const express = require("express");
const client = require("../../../database/db");
const isUser = require("../../../middleware/isUser");
const sendMail = require("../../../utils/sendMail");
const router = express.Router();

// get exam
router.get("/exam/:id", isUser, async (req, res) => {
  try {

    const exam_id = req.params.id;
    const result = await client.query(
      "SELECT (SELECT COUNT(id) FROM questiones WHERE exam_id = $1) AS qcnt, number FROM exams WHERE id = $1",
      [exam_id]
    );
    
    const { qcnt, number } = result.rows[0];
    const minNumber = Math.min(qcnt, number);
    

    const question = await client.query(
      "SELECT q.id, q.question, q.answer1, q.answer2, q.answer3, q.answer4, c.image FROM  questiones q  LEFT JOIN covers c  ON q.cover = c.image_id  WHERE q.exam_id = $1 ORDER BY RANDOM() LIMIT $2;",
      [exam_id, minNumber]
    );

    const exam_info = (await client.query("SELECT name,time FROM exams WHERE id = $1 ;",[exam_id])).rows[0]

    let exam = {name:exam_info.name , time : exam_info.time, questions : question.rows }

    res.json(exam);
  } catch (error) {
    console.error("Error fetching exam questions:", error);
    res.status(500).json({ msg: "Internal server error." });
  }
});


// router.post("/getResult", isUser, async (req, res) => {
//   try {
//     const { answers, exam_id, user_id } = req.body;

//     let result = 0;
//     let total = 0;

//     const questionesResult = await client.query("SELECT * FROM questiones WHERE exam_id = $1;", [exam_id]);
//     const questiones = questionesResult.rows;

//     for (let i = 0; i < answers.length; i++) {
//       const answer = answers[i];
//       const qid = answer.qid;

//       const q = questiones.find((e) => e.id == qid);
//       const { correctanswer, degree } = q;
//       total += degree;
//       result += correctanswer === answer.ans ? degree : 0;
//     }

//     const solvedBefore = (
//       await client.query("SELECT * FROM examssresult WHERE exam_id = $1 AND u_id = $2;", [exam_id, user_id])
//     ).rows.length == 0;
    
//     if (solvedBefore)
//       await client.query("INSERT INTO examssresult (u_id, exam_id, result) VALUES ($1, $2, $3)", [user_id, exam_id, result]);
    
//     res.json({ result, total });
//   } catch (error) {
//     console.error("Error processing exam result:", error);
//     res.status(500).json({ msg: "Internal server error." });
//   }
// });
router.post("/getResult", isUser, async (req, res) => {
  try {
    const { answers, exam_id, user_id } = req.body;
    let result = 0;
    let wrongQuestions = [];

    // Fetch questions related to the exam
    const questionesResult = await client.query("SELECT * FROM questiones WHERE exam_id = $1;", [exam_id]);
    const questiones = questionesResult.rows;

    // Loop through the provided answers
    for (let i = 0; i < answers.length; i++) {
      const answer = answers[i];
      const qid = answer.qid;

      // Find the corresponding question from the database
      const q = questiones.find((e) => e.id == qid);
      const { correctanswer, degree } = q;

      // Compare user's answer to the correct answer
      if (correctanswer === answer.ans) {
        result += degree;
      } else {
        wrongQuestions.push({ question: q.question, correctanswer, useranswer: answer.ans });
      }
    }

    // Save the result in the examresult table
    await client.query("INSERT INTO examresult (u_id, exam_id, result) VALUES ($1, $2, $3)", [user_id, exam_id, result]);

    // Fetch total possible marks for the exam
    const totalQueryResult = await client.query("SELECT number FROM exams WHERE id = $1;", [exam_id]);
    let total = totalQueryResult.rows[0].number;

    // Return the result, total score, and any wrong answers
    console.log({ result, total, wrongQuestions });
    
    res.json({ result, total, wrongQuestions });
  } catch (error) {
    console.error("Error processing exam result:", error);
    res.status(500).json({ msg: "Internal server error." });
  }
});


module.exports = router;
