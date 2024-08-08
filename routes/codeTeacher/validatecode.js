const express = require('express');
const isTeacher = require('../../middleware/isTeacher');
const router = express.Router();
const generateRandomString = require("../../utils/createcode");
const client = require('../../database/db');
const { validateCreateCode } = require('../../utils/validation'); // Make sure to export validateCreateCode properly

router.post('/create', isTeacher, async (req, res) => {
    try {
        // Validate the request body
        const { error } = validateCreateCode(req.body);
        if (error) return res.status(400).json({ msg: error.details[0].message }); // Use 400 for validation errors

        let { teacher_id, number } = req.body;
        let codes = [];

        // Insert the codes into the database
        for (let i = 0; i < number; i++) {
            let code = generateRandomString();
            await client.query("INSERT INTO teachercode (code, teacher_id) VALUES ($1, $2)", [code, teacher_id]);
            codes.push(code);
        }

        // Respond with the generated codes
        res.json({ codes });
    } catch (error) {
        console.error(error); // Log the error for debugging
        res.status(500).json({ msg: 'An error occurred while creating the codes.' }); // Send a 500 error response
    }
});

module.exports = router;
