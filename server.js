const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();
app.use(express.json()); // latest version of exressJS now comes with Body-Parser!
app.use(cors());
app.use(
  cors({
    // origin: [
    //   // Allowed origin
    //   "http://localhost:3001", // For web app testing
    //   "http://192.168.2.63:8081", // For React Native app using Expo
    //   "exp://192.168.1.27:8081",
    // ],
    origin: "*", // Allow all origins during development
    methods: ["GET", "POST", "PUT", "DELETE"], // Allowed HTTP methods
    allowedHeaders: ["Content-Type", "Authorization"], // Allowed headers
  })
);

// TODO: convert to environmental variables
const secretKey = "your_secret_key";
const witClientKey = "UX7IIBGQ7BONGFHX7P5QSGPZ3BFNOISA";

// example user data with hashed passwords
const users = [];

// function to match a user to the email stored in user database
const getUser = (email) => {
  return users.find((user) => user.email === email);
};

// HTTP ENDPOINTS:

/**
 * @description Registers a new user and returns a JWT token upon successful registration.
 *
 * @route POST /register
 *
 * @param {Object} req.body - The request body containing:
 *   @param {string} req.body.name - The user's name.
 *   @param {string} req.body.email - The user's email address.
 *   @param {string} req.body.password - The user's password.
 *
 * @returns {Object} JSON response containing:
 *   @returns {string} token - A JWT token for authenticated access.
 *
 * @throws {400} If the email is already registered.
 */
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
    groupIds: [],
    groceryGroups: {},
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

/**
 * @description Authenticates a user and returns a JWT token upon successful sign-in.
 *
 * @route POST /signin
 *
 * @param {Object} req.body - The request body containing:
 *   @param {string} req.body.email - The user's email address.
 *   @param {string} req.body.password - The user's password.
 *
 * @returns {Object} JSON response containing:
 *   @returns {string} token - A JWT token for authenticated access.
 *   @returns {Array} groupIds - An array of group IDs associated with the user.
 *
 * @throws {401} If authentication fails due to an invalid email or password.
 */
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
  res.json({ token, groupIds: user.groupIds });
});

/**
 * @description Retrieves the list of group IDs associated with the authenticated user.
 *
 * @route GET /groupIds
 * @middleware verifyToken - Ensures the request contains a valid JWT token.
 *
 * @param {Object} req.headers.authorization - The JWT token required for authentication.
 *
 * @returns {Object} JSON response containing:
 * - `groupIds`: An array of group IDs the user belongs to.
 * - `message`: A success message confirming the request.
 */
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

/**
 * @description Retrieves the user's grocery data, including recipes, a sorted grocery list, and past transactions.
 *
 * @route POST /groceryList
 * @middleware verifyToken - Ensures the request contains a valid JWT token.
 *
 * @param {string} req.body.groupId - The ID of the selected grocery group.
 * @param {Object} req.headers.authorization - The JWT token required for authentication.
 *
 * @returns {Object} JSON response containing:
 * - `recipes`: Grocery items sorted by recipe.
 * - `groceryList`: Grocery items sorted by category.
 * - `transactions`: Past transactions.
 */
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

/**
 * @description Adds a new item to the selected group's grocery lists, categorized by recipe and grocery category.
 *
 * @route POST /addItem
 * @middleware verifyToken - Ensures the request contains a valid JWT token.
 *
 * @param {string} req.body.item - The name of the item to add.
 * @param {string} req.body.category - The grocery category under which the item should be classified.
 * @param {string} req.body.recipe - The recipe associated with the item (if applicable).
 * @param {string} req.body.groupId - The group ID where the item should be added.
 *
 * @returns {Object} JSON response confirming the item was successfully added.
 */
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

      // create unique id for item
      var salt = bcrypt.genSaltSync(10);
      const itemHash = bcrypt.hashSync(item, salt);

      // add item to recipes list (sorted by recipe)
      // check if item has an associated recipe
      if (recipe.length !== 0) {
        // check if recipe object exists
        if (!recipes[recipe]) {
          recipes[recipe] = [
            {
              id: itemHash,
              item,
              type: "individual item",
            },
          ];
        } else {
          // create new object for recipe
          recipes[recipe].push({
            id: itemHash,
            item,
            type: "individual item",
          });
        }
      } else {
        // otherwise, add item to "misc" recipe
        if (!recipes["Miscellaneous Items"]) {
          recipes["Miscellaneous Items"] = [
            {
              id: itemHash,
              item,
              type: "recipe item",
            },
          ];
        } else {
          recipes["Miscellaneous Items"].push({
            id: itemHash,
            item,
            type: "recipe item",
          });
        }
      }

      // add item to recipes list (sorted by recipe)
      // if category does not exist, create a new category object
      if (!groceryList[category]) {
        groceryList[category] = [
          {
            id: itemHash,
            item,
          },
        ];
      } else {
        // otherwise, add to existing category object
        groceryList[category].push({
          id: itemHash,
          item,
        });
      }

      res.json({
        message: "Successfully added item",
      });
      console.log("SUCCESS: Connected to /addItem");
    }
  });
});

// add item to delete item from user's grocery list
/**
 * @description Deletes an item from the user's grocery list and associated recipe.
 *
 * @route DELETE /deleteItem
 * @middleware verifyToken - Ensures the request contains a valid JWT token.
 *
 * @param {string} req.body.item - The name of the item to delete.
 * @param {string} req.body.recipe - The recipe from which the item should be removed.
 * @param {string} req.body.groupId - The grocery group where the item is stored.
 *
 * @returns {Object} JSON response confirming the item was successfully deleted.
 */
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
      const { item, recipe, groupId } = req.body;
      const { groceryGroups } = foundUser;
      const { recipes, groceryList } = groceryGroups[groupId];

      // variables to store id and index of matching item
      let idToDelete = -1;
      let indexToDelete = -1;

      // search recipe object for matching item
      recipes[recipe].find((oldItem, index) => {
        if (oldItem.item === item) {
          console.log("INDEX", index);
          indexToDelete = index;
          idToDelete = oldItem.id;
        }
      });
      // delete matching item with indexToDelete
      recipes[recipe].splice(indexToDelete, 1);
      // if last item, delete recipe object
      if (recipes[recipe].length === 0) {
        delete recipes[recipe];
      }

      // loop through category objects to find matching id using found idToDelete
      // TODO: break out of loop to optimize
      const deleteId = { category: "", index: 0 };
      Object.keys(groceryList).forEach((category) => {
        groceryList[category].find((item, index) => {
          if (item.id === idToDelete) {
            deleteId.category = category;
            deleteId.index = index;
          }
        });
      });
      // delete matching item with deleteId object's index value
      groceryList[deleteId.category].splice(deleteId.index, 1);
      // if last item in category, delete category object
      if (groceryList[deleteId.category].length === 0) {
        delete groceryList[deleteId.category];
      }

      //If token is successfully verified, we can send the autorized data
      res.json({
        message: "Successfully deleted item",
      });
      console.log("SUCCESS: Connected to /deleteItem");
    }
  });
});

/**
 * @description Handles item checkout by removing it from the user's grocery list
 *              and adding it to the transaction history under the specified date.
 *
 * @route DELETE /itemCheckout
 * @middleware verifyToken - Ensures the request contains a valid JWT token.
 *
 * @param {string} req.body.itemId - The unique ID of the item to check out.
 * @param {string} req.body.category - The category from which the item should be removed.
 * @param {string} req.body.dateId - The date identifier for logging the transaction.
 * @param {string} req.body.groupId - The grocery group from which the item is checked out.
 *
 * @returns {Object} JSON response confirming the item was successfully checked out.
 */
app.delete("/itemCheckout", verifyToken, (req, res) => {
  console.log("entered itemCheckout");
  jwt.verify(req.token, secretKey, (err, decoded) => {
    if (err) {
      //If error send Forbidden (403)
      console.log("ERROR: Could not connect to the protected route");
      res.sendStatus(403);
    } else {
      const { email } = decoded.user;
      // access decoded user from db of users
      let foundUser = getUser(email);
      const { itemId, category, dateId, groupId } = req.body;
      const { groceryGroups } = foundUser;
      const { recipes, groceryList, transactions } = groceryGroups[groupId];

      // first need to remove item from sorted and recipe grocery lists
      // use specified category to find id of matching item's index
      const indexToDelete = groceryList[category].findIndex(
        (oldItem) => oldItem.id === itemId
      );
      if (indexToDelete !== -1) {
        // if index is found, remove from list
        groceryList[category].splice(indexToDelete, 1);

        if (groceryList[category].length === 0) {
          // if last item in category is removed, delete category from list
          delete groceryList[category];
        }
      }

      // search the recipe list for matching id
      Object.keys(recipes).forEach((recipe) => {
        const recipeIndex = recipes[recipe].findIndex(
          (item) => item.id === itemId
        );
        if (recipeIndex !== -1) {
          // if index is found, remove from list
          transactionItem = recipes[recipe][recipeIndex].item;
          recipes[recipe].splice(recipeIndex, 1);

          // If recipe is empty after deletion, remove it
          if (recipes[recipe].length === 0) {
            delete recipes[recipe];
          }
        }
      });

      // after item is removed from both lists: add item to transactions list
      // item should be added to a date object within transactions
      // create dateId object if it does not exist
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

      res.json({
        message: "Successfully deleted item",
      });
      console.log("SUCCESS: Connected to /itemCheckout");
    }
  });
});

/**
 * @description Edits an existing item in a user's grocery list.
 *
 * @route PUT /editItem
 * @middleware verifyToken - Ensures the request contains a valid JWT token.
 *
 * @param {string} req.body.item - The name of the item to be edited.
 * @param {string} req.body.newItem - The new item name to replace the old one.
 * @param {string} req.body.recipe - The recipe where the item is found.
 * @param {string} req.body.groupId - The ID of the grocery group to modify.
 *
 * @returns {Object} JSON response confirming the item was successfully edited.
 */
app.put("/editItem", verifyToken, (req, res) => {
  jwt.verify(req.token, secretKey, (err, decoded) => {
    if (err) {
      //If error send Forbidden (403)
      console.log("ERROR: Could not connect to the protected route");
      res.sendStatus(403);
    } else {
      const { email } = decoded.user;
      // access decoded user from db of users
      let foundUser = getUser(email);
      const { item, newItem, recipe, groupId } = req.body;
      // console.log("addItem", addItem);
      const { groceryGroups } = foundUser;
      const { recipes, groceryList } = groceryGroups[groupId];

      //
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
      // update item
      recipes[recipe][indexToReplace].item = newItem;
      // create unique id for item
      var salt = bcrypt.genSaltSync(10);
      const newItemId = bcrypt.hashSync(newItem, salt);
      recipes[recipe][indexToReplace].id = newItemId;

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
      groceryList[categoryToReplce][indexToReplace].id = newItemId;
      //If token is successfully verified, we can send the autorized data
      res.json({
        message: "Successfully edited item",
        // groceryList,
      });
      console.log("SUCCESS: Connected to /editItem");
    }
  });
});

/**
 * Checks if the HTTP request includes a JWT token in the "Authorization" header.
 * If the token is present and properly formatted, it stores the token in req.token
 * and passes control to the next middleware.
 *
 * @param {Request} req - Express request object.
 * @param {Response} res - Express response object.
 * @param {Function} next - Function to proceed to the next middleware.
 * @returns {Response|void} - Returns a 403 error if the token is missing, otherwise proceeds with the request.
 */
function verifyToken(req, res, next) {
  // Extract the "Authorization" header from the request
  const header = req.headers["authorization"];

  // If no authorization header is provided, return a 403 error
  if (!header) {
    return res.status(403).json({ error: "Token is required" });
  }

  // Ensure the header is properly defined and formatted
  if (typeof header !== "undefined") {
    // Split the header value into "Bearer <token>"
    const bearer = header.split(" ");
    const token = bearer[1]; // Extract the actual token

    // Store the token in the request object for later use
    req.token = token;

    // Proceed to the next middleware or route handler
    next();
  } else {
    //If header is undefined return Forbidden (403)
    res.sendStatus(403);
  }
}

app.listen(3000, () => {
  console.log("app is running on port 3000");
});
