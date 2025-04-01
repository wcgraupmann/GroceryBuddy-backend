const request = require('supertest');
const { withTransaction, seedTable } = require('../utils/db');

// We'll define app with a factory function for testing with transactions
const createApp = (trx) => {
  // This is where you'd import your app with the transaction injected
  // We're mocking it here for the example
  const express = require('express');
  const app = express();
  
  // Import controller with transaction dependency injected
  const userController = require('../../controllers/user.controller')(trx);
  
  // Define routes
  app.get('/api/users/:id', userController.getUserById);
  
  return app;
};

describe('User API', () => {
  test('GET /api/users/:id returns a user when found', withTransaction(async (trx) => {
    // ARRANGE: Seed test data
    const testUsers = [
      { id: 1, username: 'testuser1', email: 'test1@example.com', full_name: 'Test User 1' },
      { id: 2, username: 'testuser2', email: 'test2@example.com', full_name: 'Test User 2' }
    ];
    
    await seedTable(trx, 'users', testUsers);
    
    // Create app with transaction
    const app = createApp(trx);
    
    // ACT: Make request
    const response = await request(app).get('/api/users/1');
    
    // ASSERT: Verify response
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('id', 1);
    expect(response.body).toHaveProperty('username', 'testuser1');
  }));
  
  test('GET /api/users/:id returns 404 when user not found', withTransaction(async (trx) => {
    // Create app with transaction
    const app = createApp(trx);
    
    // ACT: Make request for non-existent ID
    const response = await request(app).get('/api/users/999');
    
    // ASSERT: Verify response
    expect(response.status).toBe(404);
  }));
});