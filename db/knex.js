// db/knex.js

// Import the knex module
const knex = require('knex');

// Import knexfile configuration
const config = require('../knexfile');

// Determine which environment we're in
const environment = process.env.NODE_ENV || 'development';

// Get the configuration for the current environment
const environmentConfig = config[environment];

// Create and export the knex instance
const connection = knex(environmentConfig);

module.exports = connection;