const express = require('express');
const isTeacher = require('../../middleware/isTeacher');
const router = express.Router();
const generateRandomString = require("../../utils/createcode");
const client = require('../../database/db');
const validateCreateCode = require('./validate');


router.post('/create', isTeacher, async (req, res) => {
    try {
        console.log(req.body);

        // Validate the request body
        const { error } = validateCreateCode(req.body);
        if (error) return res.status(400).json({ msg: error.details[0].message });

        let { teacher_id, number, m_id } = req.body;

        // Check if the teacher is associated with the specified month
        const result = await client.query("SELECT * FROM months WHERE id = $1 AND teacher_id = $2", [m_id, teacher_id]);
        const flag = result.rows.length > 0;

        if (!flag) {
            return res.status(403).json({ msg: "You must send a valid month associated with you." });
        }

        let codes = [];

        // Start a database transaction
        await client.query('BEGIN');

        for (let i = 0; i < number; i++) {
            let code = generateRandomString();
            await client.query("INSERT INTO teachercode (code, m_id, teacher_id) VALUES ($1, $2, $3)", [code, m_id, teacher_id]);
            codes.push(code);
        }

        // Commit the transaction
        await client.query('COMMIT');

        // Respond with the generated codes
        res.json({ codes });
    } catch (error) {
        console.error(error);

        // Rollback the transaction if an error occurs
        await client.query('ROLLBACK');

        res.status(500).json({ msg: 'An error occurred while creating the codes.' });
    }
});



module.exports = router;
