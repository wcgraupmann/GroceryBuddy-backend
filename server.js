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
  const user = { id: users.length + 1, name, email, hash, activity: 0 };
  users.push(user);
  // Generate JWT token
  const token = jwt.sign({ user }, secretKey);
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
  // Generate JWT token
  const token = jwt.sign({ user }, secretKey);
  res.json({ token });
});

// Design of protected route (needs JWT)
// if token is valid, return protected data
app.get("/protected", verifyToken, (req, res) => {
  jwt.verify(req.token, secretKey, (err, decoded) => {
    if (err) {
      //If error send Forbidden (403)
      console.log("ERROR: Could not connect to the protected route");
      res.sendStatus(403);
    } else {
      const { id, name } = decoded.user;
      console.log(id, name);
      //If token is successfully verified, we can send the autorized data
      res.json({
        message: "Successful log in",
        id,
        name,
      });
      console.log("SUCCESS: Connected to protected route");
    }
  });
});

// Verify JWT token middleware
function verifyToken(req, res, next) {
  console.log("verifying token");
  const header = req.headers["authorization"];
  if (!header) {
    return res.status(403).json({ error: "Token is required" });
  }
  if (typeof header !== "undefined") {
    const bearer = header.split(" ");
    const token = bearer[1];

    req.token = token;
    next();
  } else {
    //If header is undefined return Forbidden (403)
    res.sendStatus(403);
  }
}

app.listen(3000, () => {
  console.log("app is running on port 3000");
});
