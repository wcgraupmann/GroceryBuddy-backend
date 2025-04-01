exports.up = function(knex) {
    return knex.schema
      // Users table
      .createTable('users', (table) => {
        table.increments('user_id').primary();
        table.string('name').notNullable();
        table.string('email').unique().notNullable();
        table.string('password').notNullable();
      })
  
      // Grocery Groups table
      .createTable('grocery_groups', (table) => {
        table.increments('group_id').primary();
        table.string('group_name').notNullable();
      })
  
      // User Groups table (Many-to-Many relationship)
      .createTable('user_groups', (table) => {
        table.integer('user_id').unsigned().notNullable();
        table.integer('group_id').unsigned().notNullable();
        table.foreign('user_id').references('users.user_id').onDelete('CASCADE');
        table.foreign('group_id').references('grocery_groups.group_id').onDelete('CASCADE');
        table.primary(['user_id', 'group_id']);
      })
  
      // Grocery Lists table
      .createTable('grocery_lists', (table) => {
        table.increments('list_id').primary();
        table.integer('group_id').unsigned().notNullable().unique();
        table.foreign('group_id').references('grocery_groups.group_id').onDelete('CASCADE');
      })
  
      // Categories table
      .createTable('categories', (table) => {
        table.increments('category_id').primary();
        table.string('category_name').unique().notNullable();
      })
  
      // Recipe Lists table
      .createTable('recipe_lists', (table) => {
        table.increments('recipe_id').primary();
        table.integer('group_id').unsigned().notNullable();
        table.string('recipe_name').notNullable().defaultTo('Miscellaneous');
        table.foreign('group_id').references('grocery_groups.group_id').onDelete('CASCADE');
      })
  
      // Grocery Items table
      .createTable('grocery_items', (table) => {
        table.increments('item_id').primary();
        table.string('product_name').notNullable();
        table.integer('category_id').unsigned().notNullable();
        table.integer('list_id').unsigned().notNullable();
        table.integer('recipe_id').unsigned();
        table.boolean('is_checked_out').defaultTo(false);
        table.foreign('category_id').references('categories.category_id');
        table.foreign('list_id').references('grocery_lists.list_id').onDelete('CASCADE');
        table.foreign('recipe_id').references('recipe_lists.recipe_id').onDelete('SET NULL');
      })
  
      // Transactions table
      .createTable('transactions', (table) => {
        table.increments('transaction_id').primary();
        table.integer('user_id').unsigned().notNullable();
        table.integer('group_id').unsigned().notNullable();
        table.timestamp('purchase_date').defaultTo(knex.fn.now());
        table.foreign('user_id').references('users.user_id');
        table.foreign('group_id').references('grocery_groups.group_id');
      })
  
      // Transaction Items table
      .createTable('transaction_items', (table) => {
        table.increments('transaction_item_id').primary();
        table.integer('transaction_id').unsigned().notNullable();
        table.string('product_name').notNullable();
        table.integer('user_id').unsigned().notNullable();
        table.integer('group_id').unsigned().notNullable();
        table.timestamp('purchase_date').defaultTo(knex.fn.now());
        table.foreign('transaction_id').references('transactions.transaction_id').onDelete('CASCADE');
        table.foreign('user_id').references('users.user_id');
        table.foreign('group_id').references('grocery_groups.group_id');
      })
  
      // Create trigger function to auto-delete grocery items after purchase
      .then(() => knex.raw(`
        CREATE OR REPLACE FUNCTION remove_grocery_item_on_purchase()
        RETURNS TRIGGER AS $$
        BEGIN
          DELETE FROM grocery_items
          WHERE item_id = NEW.item_id;
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
      `))
  
      // Create the trigger on transaction_items insertion
      .then(() => knex.raw(`
        CREATE TRIGGER after_transaction_insert
        AFTER INSERT ON transaction_items
        FOR EACH ROW
        EXECUTE FUNCTION remove_grocery_item_on_purchase();
      `));
  };
  
  exports.down = function(knex) {
    return knex.schema
      .dropTableIfExists('transaction_items')
      .dropTableIfExists('transactions')
      .dropTableIfExists('grocery_items')
      .dropTableIfExists('recipe_lists')
      .dropTableIfExists('categories')
      .dropTableIfExists('grocery_lists')
      .dropTableIfExists('user_groups')
      .dropTableIfExists('grocery_groups')
      .dropTableIfExists('users')
      // Drop the trigger and trigger function
      .then(() => knex.raw(`DROP TRIGGER IF EXISTS after_transaction_insert ON transaction_items`))
      .then(() => knex.raw(`DROP FUNCTION IF EXISTS remove_grocery_item_on_purchase`));
  };
  