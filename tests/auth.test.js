// tests/auth.test.js
const request = require('supertest');
const app = require('../app');
const db = require('../models/db');
const bcrypt = require('bcryptjs');

describe('Auth Controller', () => {
  // Before each test clear any data from the users table
  beforeEach(async () => {
    await db('users').del();
  });

  describe('POST /auth/register', () => {
    it('should register a new user successfully', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          name: 'Test User',
          email: 'test@example.com',
          password: 'password123'
        });

      expect(response.statusCode).toBe(201);
      expect(response.body).toHaveProperty('user_id');
      expect(response.body).toHaveProperty('name', 'Test User');
      expect(response.body).toHaveProperty('email', 'test@example.com');
      expect(response.body).not.toHaveProperty('password'); // Password should not be returned
      
      // Verify the user was actually inserted in the database
      const user = await db('users').where('email', 'test@example.com').first();
      expect(user).toBeTruthy();
      expect(user.name).toBe('Test User');
    });

    it('should return 400 when fields are missing', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          name: 'Test User',
          // email missing
          password: 'password123'
        });

      expect(response.statusCode).toBe(400);
      expect(response.body).toHaveProperty('error', 'Missing fields');
    });

    it('should return 409 when email already exists', async () => {
      // Insert a user first
      const hashedPassword = await bcrypt.hash('existingpass', 10);
      await db('users').insert({
        name: 'Existing User',
        email: 'test@example.com',
        password: hashedPassword
      });

      const response = await request(app)
        .post('/auth/register')
        .send({
          name: 'Test User',
          email: 'test@example.com', // Same email
          password: 'password123'
        });

      expect(response.statusCode).toBe(409);
      expect(response.body).toHaveProperty('error', 'Email already exists');
    });

    it('should hash the password before storing', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          name: 'Security User',
          email: 'security@example.com',
          password: 'password123'
        });

      expect(response.statusCode).toBe(201);
      
      // Check that password is hashed
      const user = await db('users').where('email', 'security@example.com').first();
      expect(user.password).not.toBe('password123');
      
      // Verify the hash is a valid bcrypt hash
      expect(user.password.startsWith('$2')).toBe(true);
      
      // Verify the hash actually works for authentication
      const isValidPassword = await bcrypt.compare('password123', user.password);
      expect(isValidPassword).toBe(true);
    });
  });
});