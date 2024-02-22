const express = require("express");
const nodemailer = require("nodemailer");
const client = require("../../database/db");
const isUser = require("../../middleware/isUser");
const router = express.Router();

router.put("/code", isUser, async (req, res) => {
    try {
        const { user_id, code, mail } = req.body;
        const result = (await client.query("SELECT value FROM codes WHERE code = $1", [code])).rows;
        if (!result.length) {
            return res.status(404).json({ msg: "Code is not correct" });
        }
        const { value } = result[0];
        await client.query("BEGIN");
        const { rows } = await client.query("UPDATE userwallet SET value = value + $1 WHERE u_id = $2 RETURNING value", [value, user_id]);
        const total = rows[0].value;
        await client.query("DELETE FROM codes WHERE code = $1", [code]);
        await client.query("COMMIT");

        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: "ea37645520@gmail.com",
                pass: "zuafhkesfceautux",
            },
        });

          const mailOptions = {
            from: "ea37645520@gmail.com",
            to: mail,
            subject: "EM_Online",
            html: `<center><h1 style="padding: 8px; border-radius: 2px 23px; border: 2px solid #084e87;background-color: #084e87">EM Online</h1>  <br><h4>لقد تم الشحن بنجاح واصبح الان في محفظتك ${total} جنيه </h4></center>`,
        };
        

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error("Failed to send email:", error);
                // Don't return response here
            } else {
                console.log("Email sent successfully");
                // Return response here
                res.json({ msg: "Done" });
            }
        });
    } catch (error) {
        await client.query("ROLLBACK");
        return res.status(500).json({ msg: error.message });
    } finally {
        await client.query("END");
    }
});


router.get("/mywallet",isUser,async(req,res)=>{
    try {
        let {user_id} = req.body;
        let value = (await client.query("SELECT value FROM userwallet WHERE u_id = $1 ;",[user_id])).rows[0].value;
        res.json({value})
    } catch (error) {
        return res.status(500).json({ msg: error.message });
    }
})



module.exports = router;
