require("dotenv").config()
const  
     pg =require("pg"),
     database = process.env.DATABASE ,
     client = new pg.Client(database) ;


     module.exports = client;
