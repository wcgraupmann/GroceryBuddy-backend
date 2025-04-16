const db = require('../models/db'); // <- your actual knex instance

// Global beforeAll - runs once before all tests
beforeAll(async () => {
    await db.migrate.latest(); // ensures migrations are up to date
    // await knex.seed.run(); // seeds the database
})

// Global afterAll - runs once after all tests
afterAll(async () => {
    await db.destroy(); // closes the database connection
})