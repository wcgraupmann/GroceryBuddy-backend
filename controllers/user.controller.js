/**
 * Factory function that creates the user controller with dependency injection for knex
 * This pattern allows us to inject the transaction in tests
 */
module.exports = (db) => {
    // Use the provided db connection (either knex instance or transaction)
    return {
      /**
       * Get a user by ID
       */
      getUserById: async (req, res) => {
        try {
          const { id } = req.params;
          
          const user = await db('users').where({ id }).first();
          
          if (!user) {
            return res.status(404).json({ error: 'User not found' });
          }
          
          return res.status(200).json(user);
        } catch (error) {
          console.error('Error getting user:', error);
          return res.status(500).json({ error: 'Server error' });
        }
      }
    };
  };