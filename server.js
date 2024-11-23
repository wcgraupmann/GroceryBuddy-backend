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
// console.log(users);

// function to find user in db
const getUser = (email) => {
  // console.log("db of users", users);
  // console.log("users[0]", users[0]);
  // console.log("users[0].email", users[0].email);
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
    groceryList: {},
    recipes: {},
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
  console.log("successfully logged in");
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
      const { recipes } = foundUser;
      // console.log("recipes\n", recipes);
      //If token is successfully verified, we can send the autorized data
      res.json({
        message: "Successful log in",
        // groceryList,
        recipes,
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
      // console.log("decoded.user", decoded.user);
      const { email } = decoded.user;
      // access decoded user from db of users
      let foundUser = getUser(email);
      const {
        // category,
        item,
        // quantity,
        recipe,
      } = req.body;
      // console.log("addItem", addItem);
      const { recipes } = foundUser;
      // console.log("existing groceryList", groceryList);
      // console.log("category in groceryList = ", category in groceryList);
      // if (category in groceryList) {
      //   groceryList[category].push({ item, quantity });
      // } else {
      //   groceryList[category] = [{ item, quantity }];
      // }
      var salt = bcrypt.genSaltSync(10);
      const itemHash = bcrypt.hashSync(item, salt);

      if (recipe.length !== 0) {
        if (!recipes[recipe]) {
          recipes[recipe] = [
            {
              id: itemHash,
              item,
              // quantity,
              type: "individual item",
            },
          ];
        } else {
          recipes[recipe].push({
            id: itemHash,
            item,
            // quantity,
            type: "individual item",
          });
        }
      } else {
        if (!recipes["misc"]) {
          recipes["misc"] = [
            {
              id: itemHash,
              item,
              // quantity,
              type: "recipe item",
            },
          ];
        } else {
          recipes["misc"].push({
            id: itemHash,
            item,
            // quantity,
            type: "recipe item",
          });
        }
      }

      // decoded.user = {
      //   ...decoded.user,
      //   groceryList,
      // };
      // console.log("decoded.user", decoded.user);
      // console.log("user db[0]", users[0]);
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
      // console.log("decoded.user", decoded.user);
      const { email } = decoded.user;
      // access decoded user from db of users
      let foundUser = getUser(email);
      const {
        item,
        //  category,
        recipe,
      } = req.body;
      // console.log("addItem", addItem);
      const { recipes } = foundUser;

      // console.log("category to delete from", category, "index", index);
      // console.log("recipe to delete from", recipe, "index", index);

      // if (category.length !== 0) {
      //   const itemToDelete = groceryList[category][index];
      //   groceryList[category].splice(index, 1);
      //   const deleteId = { key: "", index: 0 };
      //   Object.keys(recipes).forEach((key) => {
      //     key.find((item, index) => {
      //       if (item.id === itemToDelete.id) {
      //         deleteId.key = key;
      //         deleteId.index = index;
      //       }
      //     });
      //   });
      //   recipes[deleteId.key].splice(deleteId.index, 1);
      // } else {

      let indexToDelete = -1;
      recipes[recipe].find((oldItem, index) => {
        console.log("oldItem.item", oldItem.item);
        console.log("item to delete", item);
        console.log("oldItem.item === item", oldItem.item === item);
        if (oldItem.item === item) {
          console.log("INDEX", index);
          indexToDelete = index;
        }
      });
      console.log("Inded after", indexToDelete);
      recipes[recipe].splice(indexToDelete, 1);

      if (recipes[recipe].length === 0) {
        delete recipes.recipe;
      }
      //   const deleteId = { key: "", index: 0 };
      //   Object.keys(groceryList).forEach((key) => {
      //     key.find((item, index) => {
      //       if (item.id === itemToDelete.id) {
      //         deleteId.key = key;
      //         deleteId.index = index;
      //       }
      //     });
      //   });
      //   groceryList[deleteId.key].splice(deleteId.index, 1);
      // }

      //If token is successfully verified, we can send the autorized data
      res.json({
        message: "Successfully deleted item",
        // deletedItem: itemToDelete,
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
      const {
        item,
        //  quantity,
        newItem,
        recipe,
      } = req.body;
      // console.log("addItem", addItem);
      const { recipes } = foundUser;

      // console.log(
      //   "groceryList[category][index]:\n",
      //   groceryList[category][index]
      // );
      // console.log();
      console.log("item to replace", item);
      let indexToReplace = -1;
      let index = 0;
      recipes[recipe].find((oldItem) => {
        console.log("old item", oldItem);
        console.log(index);
        if (oldItem.item === item) {
          indexToReplace = index;
        }
        index++;
      });
      console.log("index to replace", index);
      console.log("recipes[recipe][index]", recipes[recipe][indexToReplace]);
      recipes[recipe][indexToReplace].item = newItem;
      // recipes[recipe][indexToReplace] = {
      //   id: recipes[recipe][indexToReplace].id,
      //   item: newItem,
      //   type: recipes[recipe][indexToReplace].type,
      // };
      // console.log("editItem\n", groceryList);

      //If token is successfully verified, we can send the autorized data
      res.json({
        message: "Successfully edited item",
        // groceryList,
      });
      console.log("SUCCESS: Connected to /editItem");
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
