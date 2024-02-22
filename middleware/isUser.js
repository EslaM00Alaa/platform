const client = require("../database/db");
const verifyToken = require("../utils/verifyToken");

const isUser = async (req, res, next) => {
  try {
    const token = req.headers.token;
    const { id, mail } = verifyToken(token);
    const sqlQuery = `SELECT * FROM users WHERE mail = $1 AND id = $2`;
    const result = await client.query(sqlQuery, [mail, id]);
    if (result.rows.length > 0) {
      req.body.user_id=id;
      req.body.mail=mail;
      next();
    } else {
      return res.status(403).json({ msg: "You do not have permission to perform this action." });
    }
  } catch (error) {
    return res.status(500).json({ msg: "TOKEN IS INVALID TOKEN" });
  }
};

module.exports = isUser;

