module.exports = {
  development: {
    client: 'pg',
    connection: {
      host: 'localhost',
      user: 'grocery_user',
      password: 'marioandluigi',
      database: 'grocery_app',
    },
    migrations: {
      directory: './models/migrations',
    },
    seeds: {
      directory: './models/seeds',
    },
  },
  test: {
    client: 'pg',
    connection: {
      host: 'localhost',
      user: 'grocery_user_test',
      password: 'marioandluigi',
      database: 'grocery_app_test',
    },
    migrations: {
      directory: './models/migrations'  // Usually use the same migrations for test
    },
    seeds: {
      directory: './models/seeds'
    }
  }
};
