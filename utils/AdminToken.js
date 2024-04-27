require("dotenv").config();
const jwt = require("jsonwebtoken");
const SALT = process.env.SALT;

function generateToken(id, mail) {
  const expirationTime = '367d'; // Set expiration time to 7 days

  return jwt.sign({ id, mail }, SALT, { expiresIn: expirationTime });
}

module.exports = generateToken;
