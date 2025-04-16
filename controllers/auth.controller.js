// controllers/auth.controller.js
const bcrypt = require('bcryptjs');

module.exports = (db) => {
  return {
    registerUser: async (req, res) => {
      const { name, email, password } = req.body;

      if (!name || !email || !password) {
        return res.status(400).json({ error: 'Missing fields' });
      }

      try {
        const existingUser = await db('users').where({ email }).first();
        if (existingUser) {
          return res.status(409).json({ error: 'Email already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const [user] = await db('users')
          .insert({ name, email, password: hashedPassword })
          .returning(['user_id', 'name', 'email']);

        return res.status(201).json(user);
      } catch (err) {
        console.error('Registration error:', err);
        return res.status(500).json({ error: 'Server error' });
      }
    }
  };
};
