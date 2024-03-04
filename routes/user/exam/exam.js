const express = require("express");
const client = require("../../../database/db");
const isUser = require("../../../middleware/isUser");
const sendMail = require("../../../utils/sendMail");
const router = express.Router();

// get exam
router.get("/exam/:id", isUser, async (req, res) => {
    try {
      const exam_id = req.params.id;
      const { user_id } = req.body;
  
      // Count the number of questions in the exam
      const countQuery = "SELECT COUNT(id) AS n FROM questiones WHERE exam_id = $1";
      const countmyquestionQuery =  "SELECT COUNT(q_id) AS n FROM examforuser WHERE u_id =$1 AND exam_id = $2  ;";

      const countResult = await client.query(countQuery, [exam_id]);
      const cntOfexam = countResult.rows[0].n;

      const countmyquestionQueryResult = await client.query(countmyquestionQuery, [user_id, exam_id]);
      const cntOfq = countmyquestionQueryResult.rows[0].n;
  
      if (cntOfexam === 0) {
        return res.status(404).json({ msg: "No questions found for this exam." });
      }

      if (cntOfexam === cntOfq) {
        return res.status(404).json({ msg: "you get all question" });
      }
  
      let randoum, result;
      let flag = false;
      let qid;
      do {
        // Generate a random number within the range of questions
        randoum = Math.floor(Math.random() * cntOfexam);
  
        // Fetch a random question
        const limit = 1;
        const offset = randoum;
        result = await client.query(
          "SELECT q.id, q.exam_id AS exam_id, q.question, q.answer1, q.answer2, q.answer3, q.answer4, q.degree, c.image FROM questiones q LEFT JOIN covers c ON c.image_id = q.cover WHERE q.exam_id = $1 OFFSET $2 LIMIT $3;",
          [exam_id, offset, limit]
        );
  
        // Check if the question has been already answered by the user
         qid = result.rows[0].id;
        const queryResult = await client.query(
          "SELECT * FROM examforuser WHERE u_id =$1 AND exam_id = $2 AND q_id = $3 ;",
          [user_id, exam_id, qid]
        );
        flag = queryResult && queryResult.rows && queryResult.rows.length > 0;
      } while (flag);
   
      await client.query("INSERT INTO examforuser (u_id,exam_id,q_id) VALUES ($1,$2,$3);",[user_id,exam_id,qid])
      res.json(result.rows);
    } catch (error) {
      console.error("Error fetching exam questions:", error);
      res.status(500).json({ msg: "Internal server error." });
    }
  });

 
  router.post("/getResult", isUser, async (req, res) => {
    try {
        const { answers, exam_id, user_id } = req.body;

        let result = 0;
        let total = 0;

        for (let i = 0; i < answers.length; i++) {
            const answer = answers[i];
            const qid = answer.qid;
            const queryResult = await client.query("SELECT correctanswer, degree FROM questiones WHERE id = $1", [qid]);

            if (queryResult.rows.length === 0) {
                return res.status(404).json({ msg: `Question with ID ${qid} not found.` });
            }

            const { correctanswer, degree } = queryResult.rows[0];
            total += degree;
            result += correctanswer === answer.ans ? degree : 0;
        }
 
        let solvedBefore = (await client.query("SELECT * FROM examssresult WHERE exam_id = $1 AND u_id = $2 ;",[user_id, exam_id])).router.length == 0;
        if(solvedBefore)
        await client.query("INSERT INTO examssresult (u_id, exam_id, result) VALUES ($1, $2, $3)", [user_id, exam_id, result]);
        res.json({ result, total });
    } catch (error) {
        console.error("Error processing exam result:", error);
        res.status(500).json({ msg: "Internal server error." });
    }
});



module.exports = router;
