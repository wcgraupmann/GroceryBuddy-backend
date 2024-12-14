const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();
app.use(express.json()); // latest version of exressJS now comes with Body-Parser!

app.use(cors());

app.use(
  cors({
    origin: [
      // Allowed origin
      "http://localhost:3001", // For web app testing
      "http://192.168.2.63:8081", // For React Native app using Expo
    ],
    methods: ["GET", "POST", "PUT", "DELETE"], // Allowed HTTP methods
    allowedHeaders: ["Content-Type", "Authorization"], // Allowed headers
  })
);

const secretKey = "your_secret_key";

const witClientKey = "UX7IIBGQ7BONGFHX7P5QSGPZ3BFNOISA";

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
    // activity: 0,
    groupIds: [],
    groceryGroups: {},
    // groceryList: {},
    // recipes: {},
    // transactions: {},
  };
  user.groupIds.push(name);
  user.groceryGroups[name] = {
    groceryList: {},
    recipes: {},
    transactions: {},
  };
  users.push(user);
  // Generate JWT token
  const token = jwt.sign({ user }, secretKey, { expiresIn: "1h" });
  res.json({ token });
  console.log("successfully registered new user");
});

// endpoint for user authentication
app.post("/signin", (req, res) => {
  console.log("ENTERED SIGNIN");
  const { email, password } = req.body;
  const user = users.find((u) => u.email === email);
  // check that user exists and, if so, that the email matches the password
  if (!user || !bcrypt.compareSync(password, user.hash)) {
    return res.status(401).json({ error: "Invalid email or password" });
  }
  user.activity++;
  console.log("successfully logged in");
  // Generate JWT token
  const token = jwt.sign({ user }, secretKey, { expiresIn: "3h" });
  res.json({ token });
});

// fetch groupIds
app.get("/groupIds", verifyToken, (req, res) => {
  jwt.verify(req.token, secretKey, (err, decoded) => {
    if (err) {
      //If error send Forbidden (403)
      console.log("ERROR: Could not connect to the protected route");
      res.sendStatus(403);
    } else {
      const { email } = decoded.user;
      const foundUser = getUser(email);
      const { groupIds } = foundUser;

      //If token is successfully verified, we can send the autorized data
      res.json({
        message: "Successful log in",
        groupIds,
      });
      console.log("SUCCESS: Connected to /groceryList");
    }
  });
});

// fetch user's grocery list
app.post("/groceryList", verifyToken, (req, res) => {
  jwt.verify(req.token, secretKey, (err, decoded) => {
    if (err) {
      //If error send Forbidden (403)
      console.log("ERROR: Could not connect to the protected route");
      res.sendStatus(403);
    } else {
      const { email } = decoded.user;
      const foundUser = getUser(email);
      const { groceryGroups } = foundUser;
      const { groupId } = req.body;
      const { recipes, groceryList, transactions } = groceryGroups[groupId];

      console.log("recipes:", recipes);
      console.log("groceryList", groceryList);
      console.log("transactions\n\n", transactions);
      //If token is successfully verified, we can send the autorized data
      res.json({
        message: "Successful log in",
        groceryList,
        recipes,
        transactions,
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
      const { category, item, recipe, groupId } = req.body;
      const { groceryGroups } = foundUser;
      const { recipes, groceryList } = groceryGroups[groupId];

      console.log("category is", category);

      // try to connect to witai

      var salt = bcrypt.genSaltSync(10);
      const itemHash = bcrypt.hashSync(item, salt);

      // add item to recipes list (sorted by recipe)
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
        if (!recipes["Miscellaneous Items"]) {
          recipes["Miscellaneous Items"] = [
            {
              id: itemHash,
              item,
              // quantity,
              type: "recipe item",
            },
          ];
        } else {
          recipes["Miscellaneous Items"].push({
            id: itemHash,
            item,
            // quantity,
            type: "recipe item",
          });
        }
      }

      // add item to recipes list (sorted by recipe)
      if (!groceryList[category]) {
        groceryList[category] = [
          {
            id: itemHash,
            item,
          },
        ];
      } else {
        groceryList[category].push({
          id: itemHash,
          item,
        });
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
        groupId,
      } = req.body;
      // console.log("addItem", addItem);
      const { groceryGroups } = foundUser;
      const { recipes, groceryList } = groceryGroups[groupId];

      let idToDelete = -1;

      let indexToDelete = -1;
      recipes[recipe].find((oldItem, index) => {
        // console.log("oldItem.item", oldItem.item);
        // console.log("item to delete", item);
        // console.log("oldItem.item === item", oldItem.item === item);
        if (oldItem.item === item) {
          console.log("INDEX", index);
          indexToDelete = index;
          idToDelete = oldItem.id;
        }
      });

      recipes[recipe].splice(indexToDelete, 1);

      if (recipes[recipe].length === 0) {
        delete recipes[recipe];
      }

      // remove from category list: groceryList
      const deleteId = { category: "", index: 0 };
      Object.keys(groceryList).forEach((category) => {
        groceryList[category].find((item, index) => {
          // let index = 0;
          if (item.id === idToDelete) {
            deleteId.category = category;
            deleteId.index = index;
          }
        });
      });
      groceryList[deleteId.category].splice(deleteId.index, 1);

      if (groceryList[deleteId.category].length === 0) {
        delete groceryList[deleteId.category];
      }
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

//
// delete item from user's grocery list on checkout in app
app.delete("/itemCheckout", verifyToken, (req, res) => {
  console.log("entered itemCheckout");
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
      console.log("foundUser", foundUser);
      const { itemId, category, dateId, groupId } = req.body;
      const { groceryGroups } = foundUser;
      const { recipes, groceryList, transactions } = groceryGroups[groupId];

      // Remove item from groceryList
      // let indexToDelete = -1;
      // groceryList[category].forEach((oldItem, index) => {
      //   if (oldItem.itemId === itemId) {
      //     indexToDelete = index;
      //   }
      // });
      // groceryList[category].splice(indexToDelete, 1);
      // if (groceryList[category].length === 0) {
      //   delete groceryList[category];
      // }

      const indexToDelete = groceryList[category].findIndex(
        (oldItem) => oldItem.id === itemId
      );
      console.log("indexToDelete", indexToDelete, "in", category, "\n\n\n");
      if (indexToDelete !== -1) {
        groceryList[category].splice(indexToDelete, 1);
        if (groceryList[category].length === 0) {
          delete groceryList[category];
        }
      }

      Object.keys(recipes).forEach((recipe) => {
        const recipeIndex = recipes[recipe].findIndex(
          (item) => item.id === itemId
        );
        if (recipeIndex !== -1) {
          transactionItem = recipes[recipe][recipeIndex].item;
          recipes[recipe].splice(recipeIndex, 1);

          // If recipe is empty after deletion, remove it
          if (recipes[recipe].length === 0) {
            delete recipes[recipe];
          }
        }
      });

      // also need to remove item from recipes
      // let transactionItem = "";
      // const deleteId = { recipe: "", index: 0 };

      // Object.keys(recipes).forEach((recipe) => {
      //   const recipeIndex = recipes[recipe].findIndex(
      //     (item) => item.id === itemId
      //   );
      //   if (recipeIndex !== -1) {
      //     deleteId.recipe = recipe;
      //     deleteId.index = recipeIndex;
      //     transactionItem = recipes[recipe][recipeIndex].item;
      //     // Remove item from recipe
      //     recipes[recipe].splice(recipeIndex, 1);
      //   }
      // });

      // // If recipe is empty after deletion, remove the recipe
      // if (recipes[deleteId.recipe] && recipes[deleteId.recipe].length === 0) {
      //   delete recipes[deleteId.recipe];
      // }

      // Object.keys(recipes).forEach((recipe) => {
      //   recipes[recipe].find((item, index) => {
      //     // let index = 0;
      //     if (item.id === itemId) {
      //       deleteId.recipe = recipe;
      //       deleteId.index = index;
      //       transactionItem = item.item;
      //     }
      //   });
      // });
      // recipes[deleteId.recipe].splice(deleteId.index, 1);

      // if (recipes[deleteId.recipe].length === 0) {
      //   delete recipes[deleteId.recipe];
      // }

      // add deleted item to transactions
      if (!transactions[dateId]) {
        transactions[dateId] = [
          {
            item: transactionItem,
            buyer: foundUser.name,
          },
        ];
      } else {
        transactions[dateId].push({
          item: transactionItem,
          buyer: foundUser.name,
        });
      }
      console.log("TRANSACTIONS", transactions);
      console.log("transactions length", transactions[dateId].length);

      //If token is successfully verified, we can send the autorized data
      res.json({
        message: "Successfully deleted item",
      });
      console.log("SUCCESS: Connected to /itemCheckout");
    }
  });
});
//

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
        groupId,
      } = req.body;
      // console.log("addItem", addItem);
      const { groceryGroups } = foundUser;
      const { recipes, groceryList } = groceryGroups[groupId];

      // console.log(
      //   "groceryList[category][index]:\n",
      //   groceryList[category][index]
      // );
      // console.log();
      console.log("item to replace", item);
      let indexToReplace = -1;
      let idToReplace = "";
      let index = 0;
      recipes[recipe].find((oldItem) => {
        console.log("old item", oldItem);
        console.log(index);
        if (oldItem.item === item) {
          indexToReplace = index;
          idToReplace = oldItem.id;
        }
        index++;
      });
      console.log("index to replace", index);
      console.log("recipes[recipe][index]", recipes[recipe][indexToReplace]);
      recipes[recipe][indexToReplace].item = newItem;

      indexToReplace = -1;
      categoryToReplce = "";
      Object.keys(groceryList).forEach((category) => {
        index = 0;
        groceryList[category].find((oldItem) => {
          if (oldItem.id === idToReplace) {
            indexToReplace = index;
            categoryToReplce = category;
          }
          index++;
        });
      });
      groceryList[categoryToReplce][indexToReplace].item = newItem;
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
