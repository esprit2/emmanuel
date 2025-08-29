// database.js
// database.js
const { Pool } = require('pg');

// Utilisez une variable d'environnement pour la chaîne de connexion
const connectionString = process.env.DATABASE_URL;

const pool = new Pool({
    connectionString: connectionString,
});

pool.on('error', (err, client) => {
    console.error('Erreur inattendue sur un client inactif', err);
    process.exit(-1);
});

module.exports = {
    query: (text, params) => pool.query(text, params),
};
const path = require('path');
const bcrypt = require('bcryptjs'); // Assurez-vous que bcryptjs est disponible


// Fonction pour hacher un mot de passe (si je veux l'utiliser ailleurs)
async function hashPassword(password) {
    const saltRounds = 10;
    return await bcrypt.hash(password, saltRounds);
}



            // 3. Table des produits
            db.run(`CREATE TABLE IF NOT EXISTS products (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                description TEXT,
                price REAL NOT NULL,
                category_id INTEGER,
                seller_id INTEGER NOT NULL,
                image_url TEXT,
                quantity_available INTEGER DEFAULT 0 NOT NULL,
                created_at DATETIME DEFAULT (datetime('now','localtime')),
                FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE SET NULL ON UPDATE CASCADE,
                FOREIGN KEY (seller_id) REFERENCES users (id) ON DELETE CASCADE ON UPDATE CASCADE
            )`, (err) => {
                if (err) console.error("Erreur table 'products':", err.message);
                else console.log("Table 'products' prête.");
            });

            // 4. Table orders
           // database.js
// ... (votre code existant)

// 4. Table orders
db.run(`CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    buyer_id INTEGER NOT NULL,
    order_date DATETIME DEFAULT (datetime('now','localtime')),
    total_amount REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'en préparation' 
           CHECK(status IN ('en préparation', 'expédié', 'livré', 'annulé', 'remboursé')),
    shipping_address_json TEXT,
    delivery_method TEXT,
    payment_method TEXT, -- Assurez-vous que cette ligne est présente
    FOREIGN KEY (buyer_id) REFERENCES users (id) ON DELETE CASCADE 
)`, (err) => {
    if (err) console.error("Erreur table 'orders':", err.message);
    else console.log("Table 'orders' prête.");
});

// ... (votre code existant)
            // 5. Table order_items
            db.run(`CREATE TABLE IF NOT EXISTS order_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                order_id INTEGER NOT NULL,
                product_id INTEGER, /* Peut être NULL si le produit est supprimé */
                seller_id INTEGER NOT NULL, 
                quantity INTEGER NOT NULL,
                price_at_purchase REAL NOT NULL,
                FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE,
                FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE SET NULL, 
                FOREIGN KEY (seller_id) REFERENCES users (id) ON DELETE CASCADE 
            )`, (err) => {
                if (err) console.error("Erreur table 'order_items':", err.message);
                else console.log("Table 'order_items' prête.");
            });
   
//  crée l'admin par défaut
async function createDefaultAdmin() {
    const adminEmail = 'admin@marchelocal.com';
    const adminFullname = 'Administrateur Principal';
    // MOT DE PASSE FORT POUR L'ADMIN 
    const adminPassword = 'SuperAdminPassword123!'; 
    const adminAccountType = 'admin';

    // Vérifie si l'admin existe déjà
    db.get("SELECT email FROM users WHERE email = ?", [adminEmail], async (err, row) => {
        if (err) {
            console.error("Erreur lors de la vérification de l'admin par défaut:", err.message);
            return;
        }
        if (row) {
            console.log("L'utilisateur admin par défaut existe déjà.");
        } else {
            // L'admin n'existe pas, le créer
            try {
                const passwordHash = await hashPassword(adminPassword); // Utilise la fonction de hachage
                const sqlInsertAdmin = `INSERT INTO users (fullname, email, password_hash, account_type) VALUES (?, ?, ?, ?)`;
                db.run(sqlInsertAdmin, [adminFullname, adminEmail, passwordHash, adminAccountType], function(insertErr) {
                    if (insertErr) {
                        console.error("Erreur lors de la création de l'admin par défaut:", insertErr.message);
                    } else {
                        console.log(`Utilisateur admin par défaut créé avec l'ID: ${this.lastID} et l'email: ${adminEmail}`);
                    }
                });
            } catch (hashError) {
                console.error("Erreur lors du hachage du mot de passe admin:", hashError);
            }
        }
    });
}

// Dans database.js, après la création des autres tables
db.run(`CREATE TABLE IF NOT EXISTS testimonials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    author_name TEXT NOT NULL,
    author_role TEXT, -- Ex: 'Client fidèle', 'Apiculteur', 'Famille'
    author_location TEXT, -- Ex: 'Paris', 'Provence', 'Lyon'
    content TEXT NOT NULL,
    rating INTEGER CHECK(rating >= 1 AND rating <= 5), -- Note de 1 à 5 étoiles
    image_url TEXT, -- URL de l'image de l'auteur (facultatif)
    created_at DATETIME DEFAULT (datetime('now','localtime'))
)`, (err) => {
    if (err) {
        console.error("Erreur création table 'testimonials':", err.message);
    } else {
        console.log("Table 'testimonials' prête.");
        // Insérer quelques témoignages par défaut si la table est vide
        insertDefaultTestimonials();
    }
});

// Fonction pour insérer les témoignages par défaut
async function insertDefaultTestimonials() {
    const defaultTestimonials = [
        {
            author_name: 'Marie D.',
            author_role: 'Cliente fidèle',
            author_location: 'Paris',
            content: 'Enfin des produits qui ont du goût ! On sent la différence et le savoir-faire. Je commande chaque semaine.',
            rating: 5,
            image_url: 'https://placehold.co/200x200/d4a373/4a4a4a?text=Marie+D.'
        },
        {
            author_name: 'Julien P.',
            author_role: 'Apiculteur',
            author_location: 'Provence',
            content: 'Cette plateforme a transformé mon activité. Je peux maintenant toucher des clients qui apprécient vraiment la qualité.',
            rating: 5,
            image_url: 'https://placehold.co/200x200/a5a58d/4a4a4a?text=Julien+P.'
        },
        {
            author_name: 'Aline et Léo',
            author_role: 'Famille',
            author_location: 'Lyon',
            content: 'Les paniers de légumes sont incroyables. C\'est un plaisir de cuisiner avec des produits aussi frais.',
            rating: 4,
            image_url: 'https://placehold.co/200x200/b0c4b1/4a4a4a?text=A.+et+L.'
        }
    ];

    db.get("SELECT COUNT(*) as count FROM testimonials", (err, row) => {
        if (err) {
            console.error("Erreur comptage témoignages:", err.message);
            return;
        }
        if (row && row.count === 0) {
            const insertTestimonial = `
                INSERT INTO testimonials (author_name, author_role, author_location, content, rating, image_url) 
                VALUES (?, ?, ?, ?, ?, ?)
            `;
            defaultTestimonials.forEach(t => {
                db.run(insertTestimonial, [t.author_name, t.author_role, t.author_location, t.content, t.rating, t.image_url], (insErr) => {
                    if (insErr) console.error("Erreur insertion témoignage défaut:", insErr.message);
                });
            });
            console.log("Témoignages par défaut insérés.");
        }
    });
}
