const knex = require('./db');

function getUserByUsername(username) {
  return knex('users').where({ username }).first();
}

function createUser(userData) {
  return knex('users').insert(userData).returning('*');
}

function getGroceryListsByUser(userId) {
  return knex('grocery_lists').where({ user_id: userId });
}

module.exports = {
  getUserByUsername,
  createUser,
  getGroceryListsByUser
};
