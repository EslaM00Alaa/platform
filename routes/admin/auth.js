const  
     express = require('express') ,
     
     router =express.Router(),
     admin = require("../../controller/admin.con")


     router.post('/login',admin.auth)



     module.exports = router;


