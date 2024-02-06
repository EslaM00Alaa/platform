const client = require("./db");


async function isReady() {
    try {
      const tableCheckQuery = `
        SELECT EXISTS (
          SELECT 1
          FROM information_schema.tables
          WHERE table_name = $1
        );
      `;
  
      const createTableQueries = [
      `
      CREATE TABLE admins (
      id SERIAL PRIMARY KEY,
      fName VARCHAR(255) NOT NULL ,
      lName VARCHAR(255) NOT NULL ,    
      mail VARCHAR(255) NOT NULL,
      pass VARCHAR(255) NOT NULL,
      phone VARCHAR(255) NOT NULL ,
      role VARCHAR(20) NOT NULL 	  
      );

      insert into admins (fName,lName,mail,pass,phone,role) values ('muhamed','abdelQader','emadmen15@gmail.com','mu1234','01227145090','admin')
      
      `,
      `
      CREATE TABLE users (
      id  SERIAL PRIMARY KEY ,
      fName VARCHAR(255) NOT NULL ,
      lName VARCHAR(255) NOT NULL ,
      verify_code VARCHAR(255),
      mail VARCHAR(255) NOT NULL UNIQUE ,
      pass VARCHAR(255) NOT NULL UNIQUE ,
      phone VARCHAR(255) NOT NULL ,
      grad INT NOT NULL	
      )
      `,
      `
      create table covers (
          image_id varchar(255) primary key,
          image varchar(255) not null 
      )
      `,
      
      `
      CREATE TABLE teachers (
      id SERIAL PRIMARY KEY ,
      cover varchar(255) references covers(image_id) not null, 
      name VARCHAR(255) NOT NULL ,
      description VARCHAR(255) NOT NULL ,
      mail  VARCHAR(255) NOT NULL ,
      pass  VARCHAR(255) NOT NULL ,
      subject VARCHAR(255) NOT NULL ,
      verify_code VARCHAR(255) ,
      whats VARCHAR(255) ,
      facebook VARCHAR(255)  ,
      tele VARCHAR(255) 
      )
      
      `,
      `
      CREATE TABLE classes (
          id SERIAL PRIMARY KEY ,
          class VARCHAR(255) NOT NULL ,
          teacher_id INT  references teachers(id) not null
      )
      `

      ];   
  
      const tablesToCheck = [
        "admins",
        "users",
        "covers",
        "teachers",
        "classes"
      ];
  
      let c = 0;
  
      for (let i = 0; i < tablesToCheck.length; i++) {
        const res = await client.query(tableCheckQuery, [tablesToCheck[i]]);
        const existingTable = res.rows[0].exists;
  
        if (!existingTable) {
          await client.query(createTableQueries[i]);
          c++;
        }
      }
  
      console.log(`${c} tables created successfully!`);
    } catch (error) {
      console.error('Error occurred:', error);
    } 
  }
  
  module.exports = isReady;