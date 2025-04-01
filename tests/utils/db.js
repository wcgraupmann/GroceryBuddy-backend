const knex = require('../../db/knex'); // adjust path to your knex instance

/**
 * Creates a transaction and runs the provided test function within it.
 * automatically rolls back the transaction after the test completes.
 * @param {Function} testFn - the function containing your test logic
 * @returns {Function} - a function that can be used as a Jest test
 */
const withTransaction = (testFn) => {
    return async () => {
        const trx = await knex.transaction();
        try {
            await testFn(trx);
        } finally {
            await trx.rollback();
        }
    };
};

/**
 * Helper function to seed test data within a transaction
 * @param {Object} trx - the transaction object
 * @param {string} table - Table name to seed
 * @param {Array} data - Array of data objects to insert
 */
 const seedTable = async (trx, table, data) => {
    await trx(table).insert(data);
 }

 module.exports = {
    withTransaction,
    seedTable
 }