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
app.use('/api/groups',require("./routes/groups/group"))





app.get("/", (req, res) => res.send("Hello World!"));

client.connect().then(async() => {
  console.log("psql is connected ..");
  app.listen(port, () => console.log(`server run on port ${port} ...... `));
  await isReady();
});
