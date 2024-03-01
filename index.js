const isReady = require("./database/dbready");

require("dotenv").config();
const express = require("express"),
  bodyParser = require("body-parser"),
  cors = require("cors"),
  app = express(),
  port = process.env.PORT,
  helmet = require("helmet"),
  client = require("./database/db");

app.use(function (req, res, next) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Credentials", true);
  next();
});

app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(helmet());
app.use(cors());

app.use('/api/admin',require("./routes/admin/auth"))
app.use('/api/user',require("./routes/user/auth"))
app.use('/api/teacher',require("./routes/teacher/register"))
app.use('/api/teacher',require("./routes/teacher/login"))
app.use('/api/teacherwallet',require("./routes/teacher/mywallet"))
app.use('/api/groups',require("./routes/groups/group"))
app.use('/api/classes',require("./routes/classes/classesTeacher"))
app.use('/api/lecture',require("./routes/lectures/lecture"))
app.use('/api/code',require("./routes/admin/mange"))
app.use('/api/user',require("./routes/user/code"))
app.use('/api/user',require("./routes/user/exam/exam"))





app.get('/dealltable', async (req, res) => {
  try {
    const query = `SELECT 'DROP TABLE IF EXISTS "' || tablename || '" CASCADE;' FROM pg_tables WHERE schemaname = 'public';`;
    const result = await client.query(query);

    for (const row of result.rows) {
      const dropTableQuery = row['?column?'];
      await client.query(dropTableQuery);
    }

    res.json({ msg: "All tables deleted." });
  } catch (error) {
    res.status(500).json({ msg: error.message });
  }
});   



client.connect().then(async() => {
  console.log("psql is connected ..");
  app.listen(port, () => console.log(`server run on port ${port} ...... `));
  await isReady();
});
