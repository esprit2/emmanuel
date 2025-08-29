// database.js
const { Pool } = require('pg');

// Utilisez une variable d'environnement pour la chaîne de connexion
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.error("ERREUR: La variable d'environnement DATABASE_URL n'est pas définie.");
    process.exit(1);
}

const pool = new Pool({
    connectionString: connectionString,
    // Configuration SSL si nécessaire pour certains environnements de production
    ssl: {
        rejectUnauthorized: false
    }
});

pool.on('error', (err, client) => {
    console.error('Erreur inattendue sur un client inactif', err);
    process.exit(-1);
});

async function initializeDatabase() {
    console.log('Initialisation de la base de données PostgreSQL...');
    try {
        const createTablesSql = `
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                fullname TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                account_type TEXT NOT NULL CHECK(account_type IN ('acheteur', 'vendeur', 'admin')),
                created_at TIMESTAMPTZ DEFAULT NOW()
            );

            CREATE TABLE IF NOT EXISTS categories (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL UNIQUE,
                description TEXT
            );

            CREATE TABLE IF NOT EXISTS products (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                price REAL NOT NULL,
                quantity INTEGER NOT NULL CHECK(quantity >= 0),
                seller_id INTEGER NOT NULL,
                image_url TEXT,
                category_id INTEGER,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                FOREIGN KEY (seller_id) REFERENCES users (id) ON DELETE CASCADE,
                FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE SET NULL
            );
            
            CREATE TABLE IF NOT EXISTS orders (
                id SERIAL PRIMARY KEY,
                buyer_id INTEGER NOT NULL,
                order_date TIMESTAMPTZ DEFAULT NOW(),
                total_amount REAL NOT NULL,
                status TEXT NOT NULL DEFAULT 'en préparation' 
                    CHECK(status IN ('en préparation', 'expédié', 'livré', 'annulé', 'remboursé')),
                shipping_address_json JSONB,
                delivery_method TEXT,
                payment_method TEXT,
                FOREIGN KEY (buyer_id) REFERENCES users (id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS order_items (
                id SERIAL PRIMARY KEY,
                order_id INTEGER NOT NULL,
                product_id INTEGER,
                seller_id INTEGER NOT NULL, 
                quantity INTEGER NOT NULL,
                price_at_purchase REAL NOT NULL,
                FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE,
                FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE SET NULL, 
                FOREIGN KEY (seller_id) REFERENCES users (id) ON DELETE CASCADE
            );
            
            CREATE TABLE IF NOT EXISTS testimonials (
                id SERIAL PRIMARY KEY,
                author_id INTEGER,
                author_name TEXT NOT NULL,
                author_role TEXT,
                author_location TEXT,
                content TEXT NOT NULL,
                rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
                created_at TIMESTAMPTZ DEFAULT NOW(),
                image_url TEXT,
                FOREIGN KEY (author_id) REFERENCES users (id) ON DELETE SET NULL
            );
        `;

        await pool.query(createTablesSql);
        console.log('Toutes les tables sont prêtes.');
    } catch (err) {
        console.error("Erreur lors de l'initialisation de la base de données:", err);
    }
}

initializeDatabase();

module.exports = {
    query: (text, params) => pool.query(text, params),
    pool,
};
