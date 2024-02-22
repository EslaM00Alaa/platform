const  
     express = require('express') ,
     client = require("../../database/db"),
     isAdmin = require("../../middleware/isAdmin"),
     generateRandomString=require("../../utils/createcode");
const { route } = require('./auth');
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
    



    router.get("/totalmony",isAdmin,async(req,res)=>{
        try {
            const result = (await client.query("SELECT * FROM platfomwallet ;")).rows[0]
            console.log(result);
            res.json(result);
        } catch (error) {
            return res.status(404).json({ msg: error.message });
        }
    })

module.exports = router;