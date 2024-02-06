require("dotenv").config();
const jwt = require("jsonwebtoken");
const SALT = process.env.SALT;

function generateToken(id, mail) {
  return jwt.sign({ id, mail }, SALT);
}

module.exports = generateToken;