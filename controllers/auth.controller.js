const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { createToken}  = require('../utils/helper');

module.exports = (db) => {
  return {
    registerUser: async (req, res) => {
      let { name, email, password } = req.body;
      if (!name || !email || !password) {
        return res.status(400).json({ error: 'Missing fields' });
      }

      // Normalize email
      email = email.trim().toLowerCase();
      name = name.trim();

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
          // const token = jwt.sign(
          //   { 
          //     user_id: user.user_id, 
          //     email: user.email,
          //     name: user.name  // Including name can be useful
          //   },
          //   process.env.JWT_SECRET,
          //   { expiresIn: '1h', issuer: 'grocery-buddy' }
          // );
          // Remove password before sending
          const { password: _, ...userWithoutPassword } = user;
          const token = await createToken(userWithoutPassword, jwt, process.env.JWT_SECRET);

          return {
            user: userWithoutPassword,
            groups: [group],
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
    },
    loginUser: async (req, res) => {
      let { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      // Normalize email
      email = email.trim().toLowerCase();

      try {
        const user = await db('users').where({ email }).first();
        if (!user) {
          return res.status(401).json({ error: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
          return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Get associated grocery groups
        const groups = await db('grocery_groups')
          .join('user_groups', 'grocery_groups.group_id', '=', 'user_groups.group_id')
          .where('user_groups.user_id', '=', user.user_id)
          .select('grocery_groups.group_id', 'grocery_groups.group_name');

        // Remove password before sending
        const { password: _, ...userWithoutPassword } = user;
        const token = await createToken(userWithoutPassword, jwt, process.env.JWT_SECRET);

        // Create JWT token
        // const token = jwt.sign(
        //   { 
        //     user_id: user.user_id, 
        //     email: user.email,
        //     name: user.name
        //   },
        //   process.env.JWT_SECRET,
        //   { expiresIn: '1h', issuer: 'grocery-buddy'  }
        // );

        
        return res.status(200).json({ user: userWithoutPassword, token, groups});
      } catch (err) {
        console.error('Login error:', err);
        return res.status(500).json({ error: 'Authentication failed. Please try again.' });
      }
    }
  };
};
