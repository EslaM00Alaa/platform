const  
     express = require('express') ,
     client = require("../../database/db"),
     isAdmin = require("../../middleware/isAdmin"),
     generateRandomString=require("../../utils/createcode"),
     router =express.Router();


     router.post("/", isAdmin, async (req, res) => {
        try {
            const { n, value } = req.body;
            let ar = [];
            
            for (let i = 0; i < n; i++) {
                const code = generateRandomString();
                ar.push({ code, value });
            }
            
        
            const values = ar.map(({ code, value }) => `('${code}', ${value})`).join(', ');
            const insertQuery = `INSERT INTO codes (code, value) VALUES ${values}`;
            
            await client.query("UPDATE platfomwallet SET value = value + $1;",[(n*value)])
            await client.query(insertQuery);
            
            res.json(ar);
        } catch (error) {
            return res.status(404).json({ msg: error.message });
        }
    });
    
    router.get("/allcodes",async(req,res)=>{
        let result = await client.query("SELECT * FROM codes ;")
        res.json(result.rows);
    })



    router.get("/totalmony",isAdmin,async(req,res)=>{
        try {
            const result = (await client.query("SELECT * FROM platfomwallet ;")).rows[0]
            console.log(result);
            res.json(result);
        } catch (error) {
            return res.status(404).json({ msg: error.message });
        }
    })



    router.get("/mange",isAdmin,async(req,res)=>{
        try {
            const teachersData = await client.query(`
            SELECT 
                t.name AS teacher_name, 
                t.mail AS teacher_mail, 
                tw.value AS teacher_wallet_value, 
                COUNT(lo.id) AS nOnline, 
                COUNT(g.id) AS nGroup
            FROM 
                teachers t
            LEFT JOIN 
                lecture_online lo ON t.id = lo.teacher_id
            LEFT JOIN 
                groups g ON t.id = g.teacher_id
            LEFT JOIN 
                teacherwallet tw ON t.id = tw.teacher_id
            WHERE 
                t.id IS NOT NULL
            GROUP BY 
                t.id, tw.value;
        `);
        
        const teachers = teachersData.rows;
              res.json(teachers);
        } catch (error) {
            return res.status(404).json({ msg: error.message });
        }
    })

    router.put("/zero/:id", isAdmin, async (req, res) => {
        try {
            let id = req.params.id;
            // Assuming 'client' is properly configured and connected to your database
            await client.query("UPDATE teacherwallet SET value = 0 WHERE teacher_id = $1;", [id]);
            res.json({ msg: "Done" });
        } catch (error) {
            console.error("Error in updating teacherwallet:", error);
            return res.status(500).json({ msg: "Internal server error" });
        }
    });
    
    

module.exports = router;