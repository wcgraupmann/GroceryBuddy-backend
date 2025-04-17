const request = require('supertest');
const app = require('../app');
const db = require('../models/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');


describe('POST /auth/login',  () => {
    // Initialize test user data
    beforeAll(async () => {
        await request(app)
        .post('/auth/register')
        .send({
          name: 'Test User',
          email: 'test@example.com',
          password: 'password123'
        });
    })
    
    it('should return 400 if fields are missing', async () => {
        const response = await request(app)
            .post('/auth/login')
            .send({
                email: '',
                password: ''
            });
        expect(response.statusCode).toBe(400);
        expect(response.body).toHaveProperty('error', 'Email and password are required');
    });

    it('should return 401 if user is not found', async () => {
        const response = await request(app)
            .post('/auth/login')
            .send({
                email: 'wrong@example.com',
                password: 'password123'
            });
        expect(response.statusCode).toBe(401);
        expect(response.body).toHaveProperty('error', 'Invalid credentials');
    });

    it('should return 401 if password is incorrect', async () => {
        const response = await request(app)
            .post('/auth/login')
            .send({
                email: 'test@example.com',
                password: 'wrongpassword'
            });
        expect(response.statusCode).toBe(401);
        expect(response.body).toHaveProperty('error', 'Invalid credentials');
    });

    it('should compare generate and return a valid JWT token on a successful login', async () => {
        const response = await request(app)
            .post('/auth/login')
            .send({
                email: 'test@example.com',
                password: 'password123'
            });
        expect(response.statusCode).toBe(200);
        expect(response.body).toHaveProperty('token');
        expect(response.body.token).toBeDefined();
        expect(response.body.token).not.toBeNull();
        // Verify the token
        const decoded = jwt.verify(response.body.token, process.env.JWT_SECRET);
        expect(decoded).toHaveProperty('email', 'test@example.com');
    });

    it('should return the user info without password', async () => {
        const response = await request(app)
            .post('/auth/login')
            .send({
                email: 'test@example.com',
                password: 'password123'
            });
        expect(response.statusCode).toBe(200);
        expect(response.body).not.toHaveProperty('password');
        expect(response.body.user).toHaveProperty('name', 'Test User');
        expect(response.body.user).toHaveProperty('email', 'test@example.com');
        expect(response.body.user).toHaveProperty('user_id');
    });

    it('should return all grocery groups associated with the user', async () => {
        const response = await request(app)
            .post('/auth/login')
            .send({
                email: 'test@example.com',
                password: 'password123'
            });
        expect(response.body).toHaveProperty('groups');
        expect(Array.isArray(response.body.groups)).toBe(true);
        expect(response.body.groups.length).toBeGreaterThan(0);
        expect(response.body.groups[0]).toHaveProperty('group_name', "Test User's Personal Group");
    });
  });