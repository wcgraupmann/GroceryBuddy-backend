const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();
app.use(express.json()); // latest version of exressJS now comes with Body-Parser!
app.use(cors());

const secretKey = "your_secret_key";

// example user data with hashed passwords
const users = [];

// endpoint to check existing users (dev only)
app.get("/", (req, res) => {
  res.json(users);
});

// endpoint for user registration
app.post("/register", (req, res) => {
  const { email, name, password } = req.body;
  // check if email already exists
  if (users.find((u) => u.email === email)) {
    return res.status(400).json({ error: "Email already exists" });
  }
  // hash the password
  var salt = bcrypt.genSaltSync(10);
  const hash = bcrypt.hashSync(password, salt);
  // add the user to the db
  const newUser = { id: users.length + 1, name, email, hash, activity: 0 };
  users.push(newUser);
  // Generate JWT token
  const token = jwt.sign({ userId: newUser.id }, secretKey);
  res.json({ token });
  console.log("successfully registered new user");
});

// endpoint for user authentication
app.post("/signin", (req, res) => {
  const { email, password } = req.body;
  const user = users.find((u) => u.email === email);
  // check that user exists and, if so, that the email matches the password
  if (!user || !bcrypt.compareSync(password, user.hash)) {
    return res.status(401).json({ error: "Invalid email or password" });
  }
  user.activity++;
  console.log(user, "signed in");
  // Generate JWT token
  const token = jwt.sign({ userId: user.id }, secretKey);
  res.json({ token });
});

// Design of protected route (needs JWT)
app.get("/protected", verifyToken, (req, res) => {
  // if token is valid, return protected data
  res.json({ data: "this is protected data" });
});

// Verify JWT token middleware
function verifyToken(req, res, next) {
  const token = req.headers["authorization"];
  if (!token) {
    return res.status(403).json({ error: "Token is required" });
  }
  jwt.verify(token, secretKey, (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: "Token is not valid" });
    }
    req.userId = decoded.userId;
    next();
  });
}

app.listen(3000, () => {
  console.log("app is running on port 3000");
});
