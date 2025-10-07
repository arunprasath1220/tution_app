const db = require("../config/db");

exports.login = async (req, res) => {
  const { email, password } = req.body;
  console.log(req.body);
  if (!email || !password)
    return res.status(400).json({ error: "Email and password are required" });

  try {
    // using promise wrapper
    const [rows] = await db
      .promise()
      .execute(
        "SELECT id, email, role FROM `user` WHERE email = ? AND password = ?",
        [email, password]
      );
      console.log(rows);
    if (!rows || rows.length === 0)
      return res.status(401).json({ error: "Invalid credentials" });
    const user = rows[0];
    return res.json(user);
  } catch (err) {
    console.error("DB error in login:", err);
    return res.status(500).json({ error: "Database error" });
  }
};
