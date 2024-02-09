const  
     express = require('express') ,
     client = require("../../database/db"),
     validateAdmin=require("../../models/admin"),
     createToken=require("../../utils/AdminToken"),
     router =express.Router();



     router.post('/login',async(req,res)=>{
     try {
       
        const { error } = validateAdmin(req.body);
        if (error) return res.status(404).json({ msg: error.details[0].message });
       
        let sqlQuery = `SELECT * FROM admins WHERE mail = $1 and pass = $2 `
        let  result = await client.query(sqlQuery,[req.body.mail,req.body.pass]) ;
        if(result.rows.length>0)
        {
           let {pass,...data} = result.rows[0];
           return res.json({token:createToken(result.rows[0].id,result.rows[0].mail),Data:data})
        }
        else
        {
          return  res.status(404).json({msg:"USER NAME OR PASSWOR INVLID"});
        }
        
     } catch (error) {
       return  res.status(404).json({msg:error.message})
     }
})

























     module.exports = router;


