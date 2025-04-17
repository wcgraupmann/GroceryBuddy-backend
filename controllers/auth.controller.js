const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

module.exports = (db) => {
  return {
    registerUser: async (req, res) => {
      let { name, email, password } = req.body;
      if (!name || !email || !password) {
        return res.status(400).json({ error: 'Missing fields' });
      }

      // Normalize email
      email = email.trim().toLowerCase();

      try {
        const result = await db.transaction(async trx => {
          // Check if email exists
          const existingUser = await trx('users').where({ email }).first();
          if (existingUser) {
            const error = new Error('Email already exists');
            error.status = 409;
            throw error;
          }

          // Hash password and insert user
          const hashedPassword = await bcrypt.hash(password, 10);
          const [user] = await trx('users')
            .insert({ name, email, password: hashedPassword })
            .returning(['user_id', 'name', 'email']);

          // Create personal grocery group
          const personalGroupName = `${name}'s Personal Group`;
          const [group] = await trx('grocery_groups')
            .insert({ group_name: personalGroupName })
            .returning(['group_id', 'group_name']);

          // Link user to their personal group
          await trx('user_groups').insert({
            user_id: user.user_id,
            group_id: group.group_id
          });

          // Create a grocery list for the group
          await trx('grocery_lists').insert({
            group_id: group.group_id
          });

          // Create JWT token
          const token = jwt.sign(
            { user_id: user.user_id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
          );

          return {
            ...user,
            personal_group: {
              group_id: group.group_id,
              group_name: group.group_name
            },
            token
          };
        });

        return res.status(201).json(result);
      } catch (err) {
        if (err.status && err.message) {
          return res.status(err.status).json({ error: err.message });
        }
        console.error('Registration error:', err);
        return res.status(500).json({ error: 'Server error' });
      }
    }
  };
};
