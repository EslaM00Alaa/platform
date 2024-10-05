const path = require("path");
const isReady = require("./database/dbready");
const isAdmin = require("./middleware/isAdmin");

require("dotenv").config();
const express = require("express"),
  bodyParser = require("body-parser"),
  cors = require("cors"),
  app = express(),
  port = process.env.PORT,
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
app.use(cors());

app.get("/", (req, res) => {
  res.send("server is work");
});

app.use("/api/admin", require("./routes/admin/auth"));
app.use("/api/user", require("./routes/user/auth"));
app.use("/api/teacher", require("./routes/teacher/register"));
app.use("/api/teacher", require("./routes/teacher/login"));
app.use("/api/teacherwallet", require("./routes/teacher/mywallet"));
app.use("/api/groups", require("./routes/groups/group"));
app.use("/api/classes", require("./routes/classes/classesTeacher"));
app.use("/api/lecture", require("./routes/lectures/lecture"));
app.use("/api/code", require("./routes/admin/mange"));
app.use("/api/user", require("./routes/user/code"));
app.use("/api/user", require("./routes/user/exam/exam"));
app.use("/api/month", require("./routes/month/month"));
app.use("/api/teachercode", require("./routes/codeTeacher/validatecode"));
app.use("/api/teacherusers", require("./routes/teacher/usersTeacher"));



app.get("/api/users", async (req, res) => {
  try {
    let result = await client.query("SELECT fName , mail , pass FROM users ;");
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ msg: error.message });
  }
});


// POST: Insert grade
app.post("/api/grad",isAdmin, async (req, res) => {
  try {
    const name = req.body.name;

    // Check if the name exists in the request
    if (!name) {
      return res.status(400).json({ message: "Name is required" });
    }

    // Insert the grade into the database
    await client.query("INSERT INTO grades (name) VALUES ($1);", [name]);

    // Send a success response
    res.status(201).json({ message: "Grade added successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// GET: Fetch all grades
app.get("/api/grad", async (req, res) => {
  try {
    // Retrieve all the grades from the database
    const result = await client.query("SELECT * FROM grades");

    // Send the results as a JSON response
    res.status(200).json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});




// app.get("/dealltable", async (req, res) => {
//   try {
//     const query = `SELECT 'DROP TABLE IF EXISTS "' || tablename || '" CASCADE;' FROM pg_tables WHERE schemaname = 'public';`;
//     const result = await client.query(query);

//     for (const row of result.rows) {
//       const dropTableQuery = row["?column?"];
//       await client.query(dropTableQuery);
//     }

//     res.json({ msg: "All tables deleted." });
//   } catch (error) {
//     res.status(500).json({ msg: error.message });
//   }
// });

client.connect().then(async () => {
  await client.query("DROP TABLE IF EXISTS teachercode");
  console.log("psql is connected ..");
  app.listen(port, () => console.log(`server run on port ${port} ...... `));
  await isReady();
});
