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
      directory: './migrations',
    },
    seeds: {
      directory: './seeds',
    },
  },
};
