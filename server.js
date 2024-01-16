const express = require("express");
const cors = require("cors");

const app = express();

app.use(express.json());
app.use(cors());

const db = {
  users: [
    {
      id: "1",
      name: "John",
      email: "john@gmail.com",
      password: "cookies",
      recipes: 0,
      joined: new Date(),
      recipes: [{ title: "Dumplings", Author: "Fly By Jing" }],
    },
    {
      id: "2",
      name: "Sally",
      email: "sally@gmail.com",
      password: "tacos",
      recipes: 0,
      joined: new Date(),
      recipes: [{ title: "Dumplings", Author: "Fly By Jing" }],
    },
  ],
};

app.get("/", (req, res) => {
  res.send(db.users);
});

app.post("/signin", (req, res) => {
  if (
    req.body.email === db.users[0].email &&
    req.body.password === db.users[0].password
  ) {
    res.json(db.users[0]);
  } else {
    res.status(400).json("error logging in");
  }
});

app.post("/register", (req, res) => {
  const { email, name, password } = req.body;
  db.users.push({
    id: "3",
    name: name,
    email: email,
    password: password,
    recipes: 0,
    joined: new Date(),
    recipes: [{ title: "Dumplings", Author: "Fly By Jing" }],
  });
  res.json(db.users[db.users.length - 1]);
});

app.listen(3000, () => {
  console.log("app is running on port 3000");
});
