// tests/auth.test.js
const request = require('supertest');
const app = require('../app');
const db = require('../models/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

/**
 * Auth Controller Tests
 * 
 * Tests the authentication endpoints including user registration,
 * login functionality, and all related edge cases.
 * 
 * Requirements:
 * - Test database must be configured
 * - Auth routes must be registered in the app
 */
describe('Auth Controller', () => {
  // Clear database tables before each test
  beforeEach(async () => {
    // Clear tables in reverse order of dependencies
    await db('grocery_lists').del();
    await db('user_groups').del();
    await db('grocery_groups').del();
    await db('users').del();
  });

  describe('POST /auth/register', () => {
    it('should register a new user with personal group successfully', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          name: 'Test User',
          email: 'test@example.com',
          password: 'password123'
        });

      expect(response.statusCode).toBe(201);
      expect(response.body.user).toHaveProperty('user_id');
      expect(response.body.user).toHaveProperty('name', 'Test User');
      expect(response.body.user).toHaveProperty('email', 'test@example.com');
      expect(response.body.user).not.toHaveProperty('password'); // Password should not be returned
      
      // Verify personal group was created and returned
      expect(response.body).toHaveProperty('groups');
      expect(response.body.groups[0]).toHaveProperty('group_id');
      expect(response.body.groups[0]).toHaveProperty('group_name', "Test User's Personal Group");
      
      // Verify the user was inserted in database
      const user = await db('users').where('email', 'test@example.com').first();
      expect(user).toBeTruthy();
      expect(user.name).toBe('Test User');
      
      // Verify the personal group was created
      const group = await db('grocery_groups')
        .where('group_id', response.body.groups[0].group_id)
        .first();
      expect(group).toBeTruthy();
      expect(group.group_name).toBe("Test User's Personal Group");
      
      // Verify user-group relationship
      const userGroup = await db('user_groups')
        .where({
          user_id: response.body.user.user_id,
          group_id: response.body.groups[0].group_id
        })
        .first();
      expect(userGroup).toBeTruthy();
      
      // Verify grocery list was created
      const groceryList = await db('grocery_lists')
        .where('group_id', response.body.groups[0].group_id)
        .first();
      expect(groceryList).toBeTruthy();
    });

    it('should normalize email addresses', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          name: 'Email User',
          email: '  Test@EXAMPLE.com  ', // Uppercase with spaces
          password: 'password123'
        });

      expect(response.statusCode).toBe(201);
      expect(response.body.user.email).toBe('test@example.com'); // Normalized
      
      // Verify in database too
      const user = await db('users').where('user_id', response.body.user.user_id).first();
      expect(user.email).toBe('test@example.com');
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
      
      // Verify nothing was created in database
      const usersCount = await db('users').count('user_id as count').first();
      expect(parseInt(usersCount.count)).toBe(0);
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
          name: 'New User',
          email: 'test@example.com', // Same email
          password: 'password123'
        });

      expect(response.statusCode).toBe(409);
      expect(response.body).toHaveProperty('error', 'Email already exists');
      
      // Verify no additional user was created
      const usersCount = await db('users').count('user_id as count').first();
      expect(parseInt(usersCount.count)).toBe(1);
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

    
    it('should return a valid JWT token upon successful registration', async () => {
        const payload = {
            name: 'JWT User',
            email: 'jwt@example.com',
            password: 'securepass'
        };

        const response = await request(app)
            .post('/auth/register')
            .send(payload);

        expect(response.statusCode).toBe(201);

        // Token should exist
        expect(response.body).toHaveProperty('token');

        const token = response.body.token;

        // Decode token and verify payload
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        expect(decoded).toHaveProperty('user_id');
        expect(decoded).toHaveProperty('email', payload.email.toLowerCase());

        // Optional: check expiration is within 1 hour
        const now = Math.floor(Date.now() / 1000);
        expect(decoded.exp - now).toBeLessThanOrEqual(3600);
    });


    // it('should rollback transaction if any step fails', async () => {
    //   // Mock a failure in the process - simulate grocery_groups table error
    //   const originalInsert = db.fn.insert;
      
    //   // Create a spy to make grocery_groups insert fail
    //   jest.spyOn(db.fn, 'insert').mockImplementation(function() {
    //     if (this.toString().includes('grocery_groups')) {
    //       return Promise.reject(new Error('Simulated database error'));
    //     }
    //     return originalInsert.apply(this, arguments);
    //   });
      
    //   try {
    //     const response = await request(app)
    //       .post('/auth/register')
    //       .send({
    //         name: 'Rollback User',
    //         email: 'rollback@example.com',
    //         password: 'password123'
    //       });
        
    //     // Should not reach here, but if it does, test should fail
    //     expect(response.statusCode).toBe(500);
    //   } catch (error) {
    //     // Expected to fail
    //   } finally {
    //     // Restore the original implementation
    //     jest.restoreAllMocks();
    //   }
      
    //   // Verify nothing was committed to the database
    //   const usersCount = await db('users').where('email', 'rollback@example.com').count('user_id as count').first();
    //   expect(parseInt(usersCount.count)).toBe(0);
      
    //   const groupsCount = await db('grocery_groups').count('group_id as count').first();
    //   expect(parseInt(groupsCount.count)).toBe(0);
    // });
  });
});