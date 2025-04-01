const knex = require('knex'); // adjust path to your knex instance

// Global beforeAll - runs once before all tests
beforeAll(async () => {
    await knex.migrate.latest(); // ensures migrations are up to date
    // await knex.seed.run(); // seeds the database
})

// Global afterAll - runs once after all tests
afterAll(async () => {
    await knex.destroy(); // closes the database connection
})