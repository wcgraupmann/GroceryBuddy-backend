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
console.log(users);

// function to find user in db
const getUser = (email) => {
  console.log("db of users", users);
  console.log("users[0]", users[0]);
  console.log("users[0].email", users[0].email);
  console.log(
    "find method",
    users.find((user) => user.email === email)
  );

  const u = users.find((user) => user.email === email);
  return u;
};

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
  const user = {
    id: users.length + 1,
    name,
    email,
    hash,
    activity: 0,
    groceryList: {
      // numItems: 0,
      // produce: [],
      // meat: [],
      // baking: [],
      // bread: [],
      // dairy: [],
      // frozen: [],
      // condiments: [],
      // canned: [],
      // misc: [],
    },
  };
  users.push(user);
  // Generate JWT token
  const token = jwt.sign({ user }, secretKey, { expiresIn: "1h" });
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
  const token = jwt.sign({ user }, secretKey, { expiresIn: "1h" });
  res.json({ token });
});

// fetch user's grocery list
app.get("/groceryList", verifyToken, (req, res) => {
  jwt.verify(req.token, secretKey, (err, decoded) => {
    if (err) {
      //If error send Forbidden (403)
      console.log("ERROR: Could not connect to the protected route");
      res.sendStatus(403);
    } else {
      const { email } = decoded.user;
      // access decoded user from db of users
      const foundUser = getUser(email);
      // const { groceryList } = decoded.user;
      const { groceryList } = foundUser;
      console.log(groceryList);
      //If token is successfully verified, we can send the autorized data
      res.json({
        message: "Successful log in",
        groceryList,
      });
      console.log("SUCCESS: Connected to /groceryList");
    }
  });
});

// add item to user's grocery list
app.post("/addItem", verifyToken, (req, res) => {
  jwt.verify(req.token, secretKey, (err, decoded) => {
    if (err) {
      //If error send Forbidden (403)
      console.log("ERROR: Could not connect to the protected route");
      res.sendStatus(403);
    } else {
      console.log("decoded.user", decoded.user);
      const { email } = decoded.user;
      // access decoded user from db of users
      let foundUser = getUser(email);
      const { category, item, quantity } = req.body;
      // console.log("addItem", addItem);
      const { groceryList } = foundUser;
      // console.log("existing groceryList", groceryList);
      console.log("category in groceryList = ", category in groceryList);
      if (category in groceryList) {
        groceryList[category].push({ item, quantity });
      } else {
        groceryList[category] = [{ item, quantity }];
      }

      // decoded.user = {
      //   ...decoded.user,
      //   groceryList,
      // };
      console.log("decoded.user", decoded.user);
      console.log("user db[0]", users[0]);
      //If token is successfully verified, we can send the autorized data
      res.json({
        message: "Successfully added item",
        // groceryList,
      });
      console.log("SUCCESS: Connected to /addItem");
    }
  });
});

// add item to delete item from user's grocery list
app.delete("/deleteItem", verifyToken, (req, res) => {
  jwt.verify(req.token, secretKey, (err, decoded) => {
    if (err) {
      //If error send Forbidden (403)
      console.log("ERROR: Could not connect to the protected route");
      res.sendStatus(403);
    } else {
      console.log("decoded.user", decoded.user);
      const { email } = decoded.user;
      // access decoded user from db of users
      let foundUser = getUser(email);
      const { index, category } = req.body;
      // console.log("addItem", addItem);
      const { groceryList } = foundUser;

      console.log("category", category, "index", index);

      const itemToDelete = groceryList[category][index];
      console.log("itemToDelete", itemToDelete);
      console.log("current grocery list:\n", groceryList);

      groceryList[category].splice(index, 1);
      console.log("new grocery list:\n", groceryList);

      //If token is successfully verified, we can send the autorized data
      res.json({
        message: "Successfully deleted item",
        deletedItem: itemToDelete,
        // groceryList,
      });
      console.log("SUCCESS: Connected to /deleteItem");
    }
  });
});

// add item to edit item from user's grocery list
app.put("/editItem", verifyToken, (req, res) => {
  jwt.verify(req.token, secretKey, (err, decoded) => {
    if (err) {
      //If error send Forbidden (403)
      console.log("ERROR: Could not connect to the protected route");
      res.sendStatus(403);
    } else {
      console.log("decoded.user", decoded.user);
      const { email } = decoded.user;
      // access decoded user from db of users
      let foundUser = getUser(email);
      const { item, quantity, index, category } = req.body;
      // console.log("addItem", addItem);
      const { groceryList } = foundUser;

      console.log(
        "groceryList[category][index]:\n",
        groceryList[category][index]
      );
      groceryList[category][index] = {
        item: item,
        quantity: quantity,
      };
      console.log("editItem\n", groceryList);

      //If token is successfully verified, we can send the autorized data
      res.json({
        message: "Successfully edited item",
        // groceryList,
      });
      console.log("SUCCESS: Connected to /editItem");
    }
  });
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
      const { id, name, groceryList } = decoded.user;
      console.log(id, name, groceryList);
      //If token is successfully verified, we can send the autorized data
      res.json({
        message: "Successful log in",
        id,
        name,
        groceryList,
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
