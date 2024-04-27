require("dotenv").config();
const jwt = require("jsonwebtoken");
const SALT = process.env.SALT;
const expirationTime = '367d';
function generateToken(id, mail) {
  return jwt.sign({ id, mail }, SALT, { expiresIn: expirationTime });
}

module.exports = generateToken;