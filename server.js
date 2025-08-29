// server.js
const express = require('express');
const path = require('path');
const cors = require('cors');
const db = require('./database.js');
const bcrypt = require('bcryptjs');
const session = require('express-session');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares Globaux
app.use(cors({
    origin: `origin: process.env.FRONTEND_URL`, // Sostituire con l'URL del frontend in produzione
    credentials: true 
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret: 'secret: process.env.SESSION_SECRET', // IMPORTANTE: Changez ceci !
    resave: false,
    saveUninitialized: false,
    cookie: { 
        // secure: process.env.NODE_ENV === "production", // Da usare solo con HTTPS
        // httpOnly: true, // Impedisce l'accesso al cookie tramite JS lato client
        // sameSite: 'lax' // Aiuta a prevenire attacchi CSRF
    } 
}));

// Middleware per inizializzare il carrello in sessione
app.use((req, res, next) => {
    if (req.session && !req.session.cart) {
        req.session.cart = [];
    }
    next();
});

// Servire i files statici dalla cartella 'public'
app.use(express.static(path.join(__dirname, 'public')));

// Middleware per proteggere le rotte admin
const isAdmin = (req, res, next) => {
    if (req.session.userId && req.session.userAccountType === 'admin') {
        next();
    } else {
        console.warn("ADMIN ROUTE: Accès non autorisé. Session:", req.session);
        res.status(403).json({ message: "Accès non autorisé. Vous devez être administrateur." });
    }
};

// --- API ROUTES ---

// Test API
app.get('/api/test', (req, res) => {
    res.json({ message: 'Le backend fonctionne correctement! 🎉' });
});

// --- AUTHENTIFICATION ---
app.post('/api/auth/register', async (req, res) => {
    const { fullname, email, password, accountType } = req.body;
    if (!fullname || !email || !password || !accountType) {
        return res.status(400).json({ message: "Tous les champs sont obligatoires." });
    }
    if (password.length < 8) {
        return res.status(400).json({ message: "Le mot de passe doit contenir au moins 8 caractères." });
    }
    if (!['acheteur', 'vendeur', 'admin'].includes(accountType)) {
        return res.status(400).json({ message: "Type de compte invalide." });
    }
    try {
        const lowerCaseEmail = email.toLowerCase();
        const sqlCheckEmail = "SELECT email FROM users WHERE email = ?";
        db.get(sqlCheckEmail, [lowerCaseEmail], async (err, row) => {
            if (err) { console.error("Erreur vérification e-mail:", err.message); return res.status(500).json({ message: "Erreur serveur (vérification e-mail)." }); }
            if (row) { return res.status(409).json({ message: "Cet e-mail est déjà utilisé." });}
            const saltRounds = 10;
            const passwordHash = await bcrypt.hash(password, saltRounds);
            const sqlInsertUser = `INSERT INTO users (fullname, email, password_hash, account_type) VALUES (?, ?, ?, ?)`;
            db.run(sqlInsertUser, [fullname, lowerCaseEmail, passwordHash, accountType], function(err) {
                if (err) { console.error("Erreur insertion utilisateur:", err.message); return res.status(500).json({ message: "Erreur serveur (création compte)." });}
                console.log(`Nouvel utilisateur créé ID: ${this.lastID}, Type: ${accountType}`);
                res.status(201).json({ message: "Compte créé avec succès !", userId: this.lastID, email: lowerCaseEmail, accountType: accountType });
            });
        });
    } catch (error) { console.error("Erreur inscription:", error); res.status(500).json({ message: "Erreur inattendue." }); }
});

app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) { return res.status(400).json({ message: "L'e-mail et le mot de passe sont obligatoires." }); }
    const lowerCaseEmail = email.toLowerCase();
    const sqlFindUser = "SELECT * FROM users WHERE email = ?";
    db.get(sqlFindUser, [lowerCaseEmail], async (err, user) => {
        if (err) { console.error("Erreur recherche utilisateur:", err.message); return res.status(500).json({ message: "Erreur serveur (connexion)." }); }
        if (!user) { return res.status(401).json({ message: "Identifiants incorrects." }); }
        try {
            const isMatch = await bcrypt.compare(password, user.password_hash);
            if (!isMatch) { return res.status(401).json({ message: "Identifiants incorrects." }); }
            req.session.userId = user.id;
            req.session.userFullname = user.fullname;
            req.session.userEmail = user.email;
            req.session.userAccountType = user.account_type;
            req.session.cart = req.session.cart || []; 
            console.log(`Utilisateur connecté: ${user.email} (Type: ${user.account_type}), Session ID: ${req.session.id}`);
            res.status(200).json({ message: "Connexion réussie !", user: { id: user.id, fullname: user.fullname, email: user.email, accountType: user.account_type }});
        } catch (compareError) { console.error("Erreur comparaison mdp:", compareError); return res.status(500).json({ message: "Erreur serveur (connexion)." }); }
    });
});

app.post('/api/auth/logout', (req, res) => {
    const sessionId = req.session.id;
    const userEmail = req.session.userEmail;
    req.session.destroy(err => {
        if (err) {
            console.error("Erreur lors de la déconnexion (destruction session):", err);
            return res.status(500).json({ message: "Erreur lors de la déconnexion." });
        }
        res.clearCookie('connect.sid'); 
        console.log(`Utilisateur ${userEmail || '(inconnu)'} déconnecté, session ${sessionId} détruite.`);
        res.status(200).json({ message: "Déconnexion réussie." });
    });
});

// --- API PRODUITS ---
app.get('/api/products', (req, res) => {
    const sql = `
        SELECT p.id, p.name, p.description, p.price, p.image_url, p.quantity_available, p.created_at,
               c.name AS category_name, u.fullname AS seller_name 
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN users u ON p.seller_id = u.id
        ORDER BY p.created_at DESC`;
    db.all(sql, [], (err, rows) => {
        if (err) { console.error("Erreur récupération produits:", err.message); return res.status(500).json({ message: "Erreur serveur (récupération produits)." }); }
        res.json({ products: rows });
    });
});

app.get('/api/products/:productId', (req, res) => {
    const productId = req.params.productId;
    const sql = `
        SELECT p.id, p.name, p.description, p.price, p.category_id, p.image_url, p.quantity_available,
               c.name AS category_name, u.fullname AS seller_name, p.seller_id 
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN users u ON p.seller_id = u.id
        WHERE p.id = ?`;
    db.get(sql, [productId], (err, row) => {
        if (err) { console.error("Erreur récupération produit ID", productId, ":", err.message); return res.status(500).json({ message: "Erreur serveur (récupération produit)." }); }
        if (!row) { return res.status(404).json({ message: "Produit non trouvé." }); }
        res.json({ product: row });
    });
});

app.post('/api/products', async (req, res) => {
    if (!req.session.userId || req.session.userAccountType !== 'vendeur') { 
        return res.status(403).json({ message: "Action non autorisée. Seuls les vendeurs peuvent ajouter des produits." });
    }
    const { name, description, price, category_id, image_url, quantity_available } = req.body;
    const seller_id = req.session.userId;
    if (!name || !price || !category_id || quantity_available === undefined) { 
        return res.status(400).json({ message: "Nom, prix, catégorie et quantité sont obligatoires." });
    }
    if (isNaN(parseFloat(price)) || parseFloat(price) <= 0) { 
        return res.status(400).json({ message: "Le prix doit être un nombre positif." });
    }
    if (isNaN(parseInt(quantity_available)) || parseInt(quantity_available) < 0) { 
        return res.status(400).json({ message: "La quantité doit être un nombre positif ou zéro." });
    }
    const sqlInsertProduct = `INSERT INTO products (name, description, price, category_id, seller_id, image_url, quantity_available) VALUES (?, ?, ?, ?, ?, ?, ?)`;
    const params = [name, description || null, parseFloat(price), parseInt(category_id), seller_id, image_url || null, parseInt(quantity_available)];
    db.run(sqlInsertProduct, params, function(err) {
        if (err) { 
            console.error("Erreur insertion produit:", err.message);
            if (err.message.includes('FOREIGN KEY constraint failed')) {
                 return res.status(400).json({ message: "ID de catégorie invalide ou inexistant." });
            }
            return res.status(500).json({ message: "Erreur serveur (ajout produit)." });
        }
        console.log(`Nouveau produit ID: ${this.lastID} par vendeur ID: ${seller_id}`);
        res.status(201).json({ message: "Produit ajouté avec succès !", productId: this.lastID });
    });
});

// --- GESTION PRODUITS PAR VENDEUR ---
app.get('/api/vendeur/mes-produits', (req, res) => {
    if (!req.session.userId || req.session.userAccountType !== 'vendeur') { return res.status(403).json({ message: "Action non autorisée." });}
    const sellerId = req.session.userId;
    const sql = `SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.seller_id = ? ORDER BY p.created_at DESC`;
    db.all(sql, [sellerId], (err, rows) => {
        if (err) { console.error("Erreur produits vendeur:", err.message); return res.status(500).json({ message: "Erreur serveur." });}
        res.json({ products: rows });
    });
});

app.put('/api/vendeur/produits/:productId', async (req, res) => {
    if (!req.session.userId || req.session.userAccountType !== 'vendeur') { return res.status(403).json({ message: "Action non autorisée." });}
    const productId = req.params.productId;
    const sellerId = req.session.userId;
    const { name, description, price, category_id, image_url, quantity_available } = req.body;
    if (!name || !price || !category_id || quantity_available === undefined) { return res.status(400).json({ message: "Champs requis manquants pour la modification." });}
    
    const sqlCheckOwner = "SELECT seller_id FROM products WHERE id = ?";
    db.get(sqlCheckOwner, [productId], (err, product) => {
        if (err) { return res.status(500).json({ message: "Erreur serveur." }); }
        if (!product) { return res.status(404).json({ message: "Produit non trouvé." }); }
        if (product.seller_id !== sellerId) { return res.status(403).json({ message: "Non autorisé à modifier ce produit." });}
        
        const sqlUpdateProduct = `UPDATE products SET name = ?, description = ?, price = ?, category_id = ?, image_url = ?, quantity_available = ? WHERE id = ? AND seller_id = ?`;
        const params = [name, description || null, parseFloat(price), parseInt(category_id), image_url || null, parseInt(quantity_available), productId, sellerId];
        db.run(sqlUpdateProduct, params, function(err) {
            if (err) { 
                console.error("Erreur modif produit:", err.message);
                if (err.message.includes('FOREIGN KEY constraint failed')) {
                     return res.status(400).json({ message: "ID de catégorie invalide pour la modification." });
                }
                return res.status(500).json({ message: "Erreur serveur." });
            }
            if (this.changes === 0) { return res.status(404).json({ message: "Produit non modifié (ou non trouvé)." });}
            res.status(200).json({ message: "Produit modifié avec succès !", productId: productId });
        });
    });
});

app.delete('/api/vendeur/produits/:productId', (req, res) => {
    if (!req.session.userId || req.session.userAccountType !== 'vendeur') { return res.status(403).json({ message: "Action non autorisée." });}
    const productId = req.params.productId;
    const sellerId = req.session.userId;
    const sqlCheckOwner = "SELECT seller_id FROM products WHERE id = ?";
    db.get(sqlCheckOwner, [productId], (err, product) => {
        if (err) { return res.status(500).json({ message: "Erreur serveur." }); }
        if (!product) { return res.status(404).json({ message: "Produit non trouvé." }); }
        if (product.seller_id !== sellerId) { return res.status(403).json({ message: "Non autorisé à supprimer ce produit." });}
        
        const sqlDeleteProduct = "DELETE FROM products WHERE id = ? AND seller_id = ?";
        db.run(sqlDeleteProduct, [productId, sellerId], function(err) {
            if (err) { return res.status(500).json({ message: "Erreur serveur." });}
            if (this.changes === 0) { return res.status(404).json({ message: "Produit non supprimé (ou non trouvé)." });}
            res.status(200).json({ message: "Produit supprimé avec succès.", productId: productId });
        });
    });
});

// --- API PANIER ---
app.get('/api/cart', (req, res) => {
    res.status(200).json({ cart: req.session.cart || [] });
});
app.post('/api/cart/add', async (req, res) => {
    const { productId, quantity } = req.body;
    const qty = parseInt(quantity) || 1;
    if (!productId || qty <= 0) { return res.status(400).json({ message: "ID produit et quantité requis." });}
    const sqlGetProduct = "SELECT id, name, price, image_url, quantity_available, seller_id FROM products WHERE id = ?";
    db.get(sqlGetProduct, [productId], (err, productDetails) => {
        if (err) { return res.status(500).json({ message: "Erreur serveur." }); }
        if (!productDetails) { return res.status(404).json({ message: "Produit non trouvé." }); }
        if (productDetails.quantity_available < qty) { return res.status(400).json({ message: `Stock insuffisant pour ${productDetails.name}. Disponible: ${productDetails.quantity_available}` });}
        
        const cart = req.session.cart;
        const existingItemIndex = cart.findIndex(item => item.id === parseInt(productId));
        if (existingItemIndex > -1) {
            if (cart[existingItemIndex].quantity + qty > productDetails.quantity_available) { return res.status(400).json({ message: `Quantité maximale (${productDetails.quantity_available}) pour ${productDetails.name} atteinte dans le panier.`});}
            cart[existingItemIndex].quantity += qty;
        } else {
            cart.push({ id: productDetails.id, name: productDetails.name, price: productDetails.price, image_url: productDetails.image_url, quantity: qty, quantity_available: productDetails.quantity_available, seller_id: productDetails.seller_id });
        }
        req.session.cart = cart; 
        res.status(200).json({ message: `${productDetails.name} ajouté/mis à jour.`, cart: req.session.cart });
    });
});
app.put('/api/cart/item/:productId', (req, res) => {
    const productId = parseInt(req.params.productId);
    const { quantity } = req.body;
    const qty = parseInt(quantity);
    if (isNaN(productId) || isNaN(qty) || qty < 0) { return res.status(400).json({ message: "ID produit et quantité valides requis." });}
    const cart = req.session.cart;
    const itemIndex = cart.findIndex(item => item.id === productId);
    if (itemIndex === -1) { return res.status(404).json({ message: "Produit non trouvé dans le panier." });}
    const sqlGetProductQty = "SELECT quantity_available FROM products WHERE id = ?";
    db.get(sqlGetProductQty, [productId], (err, productDetails) => {
        if (err) { return res.status(500).json({ message: "Erreur serveur." }); }
        if (!productDetails) { return res.status(404).json({ message: "Détails produit non trouvés." }); }
        if (qty === 0) { cart.splice(itemIndex, 1); }
        else if (qty > productDetails.quantity_available) { return res.status(400).json({ message: `Stock insuffisant (${productDetails.quantity_available}).` });}
        else { cart[itemIndex].quantity = qty; }
        req.session.cart = cart;
        res.status(200).json({ message: "Quantité mise à jour.", cart: req.session.cart });
    });
});
app.delete('/api/cart/item/:productId', (req, res) => {
    const productId = parseInt(req.params.productId);
    if (isNaN(productId)) { return res.status(400).json({ message: "ID produit invalide." });}
    let cart = req.session.cart;
    const initialLength = cart.length;
    cart = cart.filter(item => item.id !== productId);
    if (cart.length === initialLength) { return res.status(404).json({ message: "Produit non trouvé dans panier." });}
    req.session.cart = cart;
    res.status(200).json({ message: "Produit retiré.", cart: req.session.cart });
});
app.post('/api/cart/clear', (req, res) => {
    req.session.cart = [];
    res.status(200).json({ message: "Panier vidé.", cart: req.session.cart });
});

// --- COMMANDES ---
app.post('/api/orders', async (req, res) => {
    if (!req.session.userId || req.session.userAccountType !== 'acheteur') {
        return res.status(401).json({ message: "Veuillez vous connecter en tant qu'acheteur pour commander." });
    }
    if (!req.session.cart || req.session.cart.length === 0) {
        return res.status(400).json({ message: "Votre panier est vide." });
    }
    const buyer_id = req.session.userId;
    const cartItemsToProcess = [...req.session.cart]; // Cloner le panier pour traitement
    const { shipping_address } = req.body;
    if (!shipping_address || typeof shipping_address !== 'object' || Object.keys(shipping_address).length === 0) {
        return res.status(400).json({ message: "L'adresse de livraison est requise." });
    }
    const shipping_address_json = JSON.stringify(shipping_address);

    let totalAmount = 0;
    const productChecksPromises = cartItemsToProcess.map(item => 
        new Promise((resolve, reject) => {
            db.get("SELECT price, quantity_available, seller_id FROM products WHERE id = ?", [item.id], (err, row) => {
                if (err) return reject(new Error(`Erreur DB vérification produit ID ${item.id}`));
                if (!row) return reject(new Error(`Produit "${item.name}" (ID: ${item.id}) non trouvé.`));
                if (row.quantity_available < item.quantity) return reject(new Error(`Stock insuffisant pour "${item.name}". Disponible: ${row.quantity_available}, Demandé: ${item.quantity}`));
                
                // Utiliser les données de l'item du panier pour price_at_purchase et seller_id,
                // car le prix ou le vendeur pourraient changer entre l'ajout au panier et la commande.
                // Cependant, la vérification de stock utilise la DB.
                const priceAtPurchase = item.price; // Prix de l'item DANS LE PANIER au moment de l'ajout
                const sellerIdForItem = item.seller_id; // Seller ID de l'item DANS LE PANIER

                totalAmount += priceAtPurchase * item.quantity;
                resolve({ 
                    id: item.id, 
                    newQuantity: row.quantity_available - item.quantity,
                    seller_id_from_db: sellerIdForItem, // Utilise seller_id du panier
                    price_at_purchase: priceAtPurchase   // Utilise le prix du panier
                });
            });
        })
    );

    try {
        const productQuantitiesToUpdate = await Promise.all(productChecksPromises);

        db.serialize(() => {
            db.run("BEGIN TRANSACTION;", (beginErr) => {
                if(beginErr) return res.status(500).json({ message: "Erreur DB (début transaction)." });

                const sqlInsertOrder = `INSERT INTO orders (buyer_id, total_amount, status, shipping_address_json) VALUES (?, ?, ?, ?)`;
                db.run(sqlInsertOrder, [buyer_id, totalAmount, 'en préparation', shipping_address_json], function(orderErr) {
                    if (orderErr) {
                        console.error("Erreur insertion commande:", orderErr.message);
                        return db.run("ROLLBACK;", () => res.status(500).json({ message: "Erreur serveur (création commande)." }));
                    }
                    const orderId = this.lastID;
                    console.log(`Nouvelle commande créée ID: ${orderId}`);

                    const sqlInsertItem = `INSERT INTO order_items (order_id, product_id, seller_id, quantity, price_at_purchase) VALUES (?, ?, ?, ?, ?)`;
                    let itemsProcessed = 0;
                    let itemInsertErrorOccurred = false;

                    for (const item of cartItemsToProcess) {
                        if (itemInsertErrorOccurred) continue;
                        const productInfo = productQuantitiesToUpdate.find(p => p.id === item.id);
                        db.run(sqlInsertItem, [orderId, item.id, productInfo.seller_id_from_db, item.quantity, productInfo.price_at_purchase], function(itemErr) {
                            if (itemErr && !itemInsertErrorOccurred) {
                                itemInsertErrorOccurred = true;
                                console.error("Erreur insertion item de commande:", itemErr.message);
                                return db.run("ROLLBACK;", () => res.status(500).json({ message: "Erreur serveur (insertion items)." }));
                            }
                            itemsProcessed++;
                            if (!itemInsertErrorOccurred && itemsProcessed === cartItemsToProcess.length) {
                                let updatesProcessed = 0;
                                let updateProductErrorOccurred = false;
                                for (const p of productQuantitiesToUpdate) {
                                    if (updateProductErrorOccurred) continue;
                                    db.run("UPDATE products SET quantity_available = ? WHERE id = ?", [p.newQuantity, p.id], (updateErr) => {
                                        if (updateErr && !updateProductErrorOccurred) {
                                            updateProductErrorOccurred = true;
                                            console.error("Erreur màj quantité produit:", updateErr.message);
                                            return db.run("ROLLBACK;", () => res.status(500).json({ message: "Erreur serveur (màj stock)." }));
                                        }
                                        updatesProcessed++;
                                        if (!updateProductErrorOccurred && updatesProcessed === productQuantitiesToUpdate.length) {
                                            db.run("COMMIT;", (commitErr) => {
                                                if(commitErr) {
                                                    console.error("Erreur COMMIT:", commitErr.message);
                                                    // Tenter un rollback si le commit échoue est complexe et peut ne pas être possible
                                                    return res.status(500).json({ message: "Erreur serveur (finalisation commande)." });
                                                }
                                                req.session.cart = [];
                                                console.log("Panier vidé après commande.");
                                                res.status(201).json({ message: "Commande créée avec succès !", orderId: orderId, totalAmount: totalAmount });
                                            });
                                        }
                                    });
                                }
                            }
                        });
                    }
                });
            });
        });
    } catch (validationError) {
        console.error("Erreur de validation avant transaction:", validationError.message);
        return res.status(400).json({ message: validationError.message });
    }
});

app.get('/api/acheteur/commandes', (req, res) => {
    if (!req.session.userId || req.session.userAccountType !== 'acheteur') {
        return res.status(403).json({ message: "Action non autorisée." });
    }
    const buyerId = req.session.userId;
    const sql = `SELECT id, order_date, total_amount, status FROM orders WHERE buyer_id = ? ORDER BY order_date DESC`;
    db.all(sql, [buyerId], (err, rows) => {
        if (err) { console.error("Erreur récupération commandes acheteur:", err.message); return res.status(500).json({ message: "Erreur serveur." });}
        res.json({ orders: rows });
    });
});

app.post('/api/acheteur/commandes/:orderId/cancel', async (req, res) => {
    if (!req.session.userId || req.session.userAccountType !== 'acheteur') {
        return res.status(403).json({ message: "Action non autorisée." });
    }
    const buyerId = req.session.userId;
    const orderId = req.params.orderId;

    db.get("SELECT * FROM orders WHERE id = ? AND buyer_id = ?", [orderId, buyerId], (err, order) => {
        if (err) { console.error("Erreur vérification commande acheteur:", err.message); return res.status(500).json({ message: "Erreur serveur." });}
        if (!order) { return res.status(404).json({ message: "Commande non trouvée ou non autorisée." });}
        
        if (order.status !== 'en préparation') { // Permettre l'annulation seulement si 'en préparation'
            return res.status(400).json({ message: "Impossible d'annuler une commande qui n'est plus 'en préparation'." });
        }

        const sqlGetItems = "SELECT product_id, quantity FROM order_items WHERE order_id = ?";
        db.all(sqlGetItems, [orderId], (itemErr, items) => {
            if (itemErr) { console.error("Erreur récupération items pour annulation:", itemErr.message); return res.status(500).json({ message: "Erreur serveur."}); }
            
            db.serialize(() => {
                db.run("BEGIN TRANSACTION;");
                let stockUpdateErrorOccurred = false;
                const itemPromises = items.map(item => {
                    return new Promise((resolve, reject) => {
                        db.run("UPDATE products SET quantity_available = quantity_available + ? WHERE id = ?", [item.quantity, item.product_id], function(updateErr) {
                            if (updateErr) {
                                console.error("Erreur màj stock (annulation):", updateErr.message);
                                return reject(updateErr);
                            }
                            resolve();
                        });
                    });
                });

                Promise.all(itemPromises)
                .then(() => {
                    const sqlCancelOrder = "UPDATE orders SET status = 'annulé' WHERE id = ? AND buyer_id = ?";
                    db.run(sqlCancelOrder, [orderId, buyerId], function(cancelErr) {
                        if (cancelErr) {
                            console.error("Erreur annulation commande (DB):", cancelErr.message);
                            return db.run("ROLLBACK;", () => res.status(500).json({ message: "Erreur serveur (annulation commande)."}));
                        }
                        if (this.changes > 0) {
                            db.run("COMMIT;", (commitErr)=>{
                                if(commitErr) { console.error("Erreur COMMIT (annulation):", commitErr.message); return res.status(500).json({ message: "Erreur serveur (commit annulation)."});}
                                console.log(`Commande ID ${orderId} annulée par acheteur ID ${buyerId}`);
                                res.status(200).json({ message: `Commande #${orderId} annulée avec succès.` });
                            });
                        } else {
                            db.run("ROLLBACK;"); // Même si la commande n'a pas été modifiée, le stock pourrait l'avoir été
                            res.status(404).json({ message: "Commande non trouvée ou déjà dans un état non annulable." });
                        }
                    });
                })
                .catch(stockError => {
                    console.error("Erreur lors de la mise à jour du stock pendant l'annulation:", stockError);
                    db.run("ROLLBACK;");
                    res.status(500).json({ message: "Erreur serveur lors de la mise à jour du stock pour annulation."});
                });
            });
        });
    });
});


app.get('/api/vendeur/commandes', (req, res) => {
    if (!req.session.userId || req.session.userAccountType !== 'vendeur') { return res.status(403).json({ message: "Action non autorisée." }); }
    const sellerId = req.session.userId;
    const sql = `
        SELECT DISTINCT o.id, o.order_date, o.total_amount, o.status, u.fullname AS buyer_name, u.email AS buyer_email
        FROM orders o
        JOIN order_items oi ON o.id = oi.order_id
        JOIN users u ON o.buyer_id = u.id
        WHERE oi.seller_id = ?
        ORDER BY o.order_date DESC`;
    db.all(sql, [sellerId], (err, rows) => {
        if (err) { console.error("Erreur récupération commandes vendeur:", err.message); return res.status(500).json({ message: "Erreur serveur." });}
        res.json({ orders: rows });
    });
});

app.put('/api/vendeur/commandes/:orderId/statut', (req, res) => {
    if (!req.session.userId || req.session.userAccountType !== 'vendeur') { return res.status(403).json({ message: "Action non autorisée." });}
    const sellerId = req.session.userId;
    const orderId = req.params.orderId;
    const { status } = req.body;
    if (!status || !['en préparation', 'expédié', 'livré', 'annulé', 'remboursé'].includes(status)) {
        return res.status(400).json({ message: "Statut de commande invalide." });
    }
    const sqlCheckSellerInOrder = "SELECT COUNT(*) as itemCount FROM order_items WHERE order_id = ? AND seller_id = ?";
    db.get(sqlCheckSellerInOrder, [orderId, sellerId], (err, row) => {
        if (err) { return res.status(500).json({ message: "Erreur serveur."}); }
        if (!row || row.itemCount === 0) { return res.status(403).json({ message: "Non autorisé à modifier cette commande." });}
        const sqlUpdateStatus = "UPDATE orders SET status = ? WHERE id = ?";
        db.run(sqlUpdateStatus, [status, orderId], function(err) {
            if (err) { console.error("Erreur màj statut commande:", err.message); return res.status(500).json({ message: "Erreur serveur." });}
            if (this.changes === 0) { return res.status(404).json({ message: "Commande non trouvée." });}
            console.log(`Statut commande ID ${orderId} mis à jour à '${status}' par vendeur ID ${sellerId}`);
            res.status(200).json({ message: `Statut de la commande #${orderId} mis à jour à '${status}'.` });
        });
    });
});

app.delete('/api/vendeur/commandes/:orderId', (req, res) => {
     if (!req.session.userId || req.session.userAccountType !== 'vendeur') { return res.status(403).json({ message: "Action non autorisée." });}
    const sellerId = req.session.userId;
    const orderId = req.params.orderId;
    const sqlCheckSellerInOrder = "SELECT COUNT(*) as itemCount FROM order_items WHERE order_id = ? AND seller_id = ?";
    db.get(sqlCheckSellerInOrder, [orderId, sellerId], (err, row) => {
        if (err) { return res.status(500).json({ message: "Erreur serveur."}); }
        if (!row || row.itemCount === 0) { return res.status(403).json({ message: "Non autorisé à modifier cette commande." });}
        
        const sqlGetItems = "SELECT product_id, quantity FROM order_items WHERE order_id = ? AND seller_id = ?";
        db.all(sqlGetItems, [orderId, sellerId], (itemErr, items) => {
            if (itemErr) { console.error("Erreur récupération items pour annulation (vendeur):", itemErr.message); return res.status(500).json({ message: "Erreur serveur."}); }
            db.serialize(() => {
                db.run("BEGIN TRANSACTION;");
                const itemPromises = items.map(item => 
                    new Promise((resolve, reject) => {
                        db.run("UPDATE products SET quantity_available = quantity_available + ? WHERE id = ?", [item.quantity, item.product_id], function(updateErr) {
                            if (updateErr) return reject(updateErr);
                            resolve();
                        });
                    })
                );
                Promise.all(itemPromises)
                .then(() => {
                    const sqlCancelOrder = "UPDATE orders SET status = 'annulé' WHERE id = ?"; // L'admin/vendeur annule toute la commande
                    db.run(sqlCancelOrder, [orderId], function(cancelErr) {
                        if (cancelErr) { return db.run("ROLLBACK;", () => res.status(500).json({ message: "Erreur serveur (annulation commande)."}));}
                        if (this.changes > 0) {
                            db.run("COMMIT;", (commitErr)=>{
                                if(commitErr) return res.status(500).json({ message: "Erreur serveur (commit annulation)."});
                                console.log(`Commande ID ${orderId} annulée par vendeur ID ${sellerId}`);
                                res.status(200).json({ message: `Commande #${orderId} marquée comme annulée.` });
                            });
                        } else {
                            db.run("ROLLBACK;");
                            res.status(404).json({ message: "Commande non trouvée ou déjà annulée." });
                        }
                    });
                })
                .catch(stockError => {
                    console.error("Erreur màj stock (annulation vendeur):", stockError);
                    db.run("ROLLBACK;");
                    res.status(500).json({ message: "Erreur serveur (màj stock annulation vendeur)."});
                });
            });
        });
    });
});

app.get('/api/orders/:orderId', (req, res) => {
    if (!req.session.userId) { return res.status(401).json({ message: "Veuillez vous connecter." }); }
    const orderId = req.params.orderId;
    const requestingUserId = req.session.userId;
    const requestingUserType = req.session.userAccountType;
    const sqlOrder = "SELECT * FROM orders WHERE id = ?";
    db.get(sqlOrder, [orderId], (err, order) => {
        if (err) { return res.status(500).json({ message: "Erreur serveur." }); }
        if (!order) { return res.status(404).json({ message: "Commande non trouvée." }); }
        const sqlOrderItems = `SELECT oi.*, p.name as product_name, p.image_url as product_image_url FROM order_items oi JOIN products p ON oi.product_id = p.id WHERE oi.order_id = ?`;
        db.all(sqlOrderItems, [orderId], (itemErr, items) => {
            if (itemErr) { return res.status(500).json({ message: "Erreur serveur." }); }
            let authorized = false;
            if (requestingUserType === 'acheteur' && order.buyer_id === requestingUserId) { authorized = true; }
            else if (requestingUserType === 'vendeur' && items.some(item => item.seller_id === requestingUserId)) { authorized = true; }
            else if (requestingUserType === 'admin') { authorized = true; }
            if (!authorized) { return res.status(403).json({ message: "Non autorisé." }); }
            let shipping_address_data = null;
            try { if (order.shipping_address_json) { shipping_address_data = JSON.parse(order.shipping_address_json); }} catch (e) { console.error("Erreur parsing adresse:", e); }
            res.status(200).json({ order: { ...order, shipping_address_data: shipping_address_data, items: items }});
        });
    });
});

// --- API ADMIN ---
app.get('/api/admin/users', isAdmin, (req, res) => {
    const sql = "SELECT id, fullname, email, account_type, created_at FROM users WHERE id != ? ORDER BY created_at DESC";
    db.all(sql, [req.session.userId], (err, users) => {
        if (err) { console.error("Erreur récupération utilisateurs (admin):", err.message); return res.status(500).json({ message: "Erreur serveur." }); }
        res.json({ users });
    });
});
app.delete('/api/admin/users/:userIdToDelete', isAdmin, (req, res) => {
    const userIdToDelete = req.params.userIdToDelete;
    if (parseInt(userIdToDelete) === req.session.userId) {
        return res.status(400).json({ message: "Un administrateur ne peut pas se supprimer lui-même." });
    }
    const sql = "DELETE FROM users WHERE id = ?";
    db.run(sql, [userIdToDelete], function(err) {
        if (err) { console.error(`Erreur suppression utilisateur ID ${userIdToDelete} (admin):`, err.message); return res.status(500).json({ message: "Erreur serveur." }); }
        if (this.changes === 0) { return res.status(404).json({ message: "Utilisateur non trouvé." }); }
        console.log(`Utilisateur ID ${userIdToDelete} supprimé par admin ID ${req.session.userId}`);
        res.status(200).json({ message: "Utilisateur supprimé avec succès.", userId: userIdToDelete });
    });
});
app.get('/api/admin/orders', isAdmin, (req, res) => {
    const sql = `
        SELECT o.id, o.order_date, o.total_amount, o.status, 
               u.fullname AS buyer_fullname, u.email AS buyer_email, o.buyer_id
        FROM orders o
        JOIN users u ON o.buyer_id = u.id
        ORDER BY o.order_date DESC`;
    db.all(sql, [], (err, orders) => {
        if (err) { console.error("Erreur récupération de toutes les commandes (admin):", err.message); return res.status(500).json({ message: "Erreur serveur." });}
        res.json({ orders });
    });
});
app.put('/api/admin/orders/:orderId/status', isAdmin, (req, res) => {
    const orderId = req.params.orderId;
    const { status } = req.body;
    if (!status || !['en préparation', 'expédié', 'livré', 'annulé', 'remboursé'].includes(status)) {
        return res.status(400).json({ message: "Statut de commande invalide." });
    }
    const sqlUpdateStatus = "UPDATE orders SET status = ? WHERE id = ?";
    db.run(sqlUpdateStatus, [status, orderId], function(err) {
        if (err) { console.error("Erreur màj statut commande (admin):", err.message); return res.status(500).json({ message: "Erreur serveur." });}
        if (this.changes === 0) { return res.status(404).json({ message: "Commande non trouvée." });}
        console.log(`Statut commande ID ${orderId} mis à jour à '${status}' par admin ID ${req.session.userId}`);
        res.status(200).json({ message: `Statut de la commande #${orderId} mis à jour à '${status}'.` });
    });
});
app.delete('/api/admin/orders/:orderId', isAdmin, (req, res) => {
    const orderId = req.params.orderId;
    // Pour l'admin, comme pour le vendeur, on met le statut à 'annulé' et on remet en stock.
    const sqlGetItems = "SELECT product_id, quantity FROM order_items WHERE order_id = ?";
    db.all(sqlGetItems, [orderId], (itemErr, items) => {
        if (itemErr) { console.error("Erreur récupération items pour annulation (admin):", itemErr.message); return res.status(500).json({ message: "Erreur serveur."}); }
        
        db.serialize(() => {
            db.run("BEGIN TRANSACTION;");
            const itemPromises = items.map(item => 
                new Promise((resolve, reject) => {
                    db.run("UPDATE products SET quantity_available = quantity_available + ? WHERE id = ?", [item.quantity, item.product_id], function(updateErr) {
                        if (updateErr) return reject(updateErr);
                        resolve();
                    });
                })
            );
            Promise.all(itemPromises)
            .then(() => {
                const sqlCancelOrder = "UPDATE orders SET status = 'annulé' WHERE id = ?";
                db.run(sqlCancelOrder, [orderId], function(cancelErr) {
                    if (cancelErr) { return db.run("ROLLBACK;", () => res.status(500).json({ message: "Erreur serveur (annulation commande)."}));}
                    if (this.changes > 0) {
                        db.run("COMMIT;", (commitErr)=>{
                            if(commitErr) return res.status(500).json({ message: "Erreur serveur (commit annulation)."});
                            console.log(`Commande ID ${orderId} annulée par admin ID ${req.session.userId}`);
                            res.status(200).json({ message: `Commande #${orderId} marquée comme annulée.` });
                        });
                    } else {
                        db.run("ROLLBACK;");
                        res.status(404).json({ message: "Commande non trouvée ou déjà annulée." });
                    }
                });
            })
            .catch(stockError => {
                console.error("Erreur màj stock (annulation admin):", stockError);
                db.run("ROLLBACK;");
                res.status(500).json({ message: "Erreur serveur (màj stock annulation admin)."});
            });
        });
    });
});



// --- NOUVELLE API POUR AJOUTER UN UTILISATEUR (par l'Admin) ---
app.post('/api/admin/users', isAdmin, async (req, res) => {
    // Le middleware isAdmin a déjà vérifié si l'utilisateur est un admin connecté.
    const { fullname, email, password, accountType } = req.body;

    // 1. Validation des données reçues
    if (!fullname || !email || !password || !accountType) {
        return res.status(400).json({ message: "Tous les champs sont obligatoires." });
    }
    if (password.length < 8) {
        return res.status(400).json({ message: "Le mot de passe doit contenir au moins 8 caractères." });
    }
    if (!['acheteur', 'vendeur', 'admin'].includes(accountType)) {
        return res.status(400).json({ message: "Type de compte invalide." });
    }

    try {
        // 2. Vérifier si l'e-mail existe déjà
        const lowerCaseEmail = email.toLowerCase();
        const sqlCheckEmail = "SELECT email FROM users WHERE email = ?";
        db.get(sqlCheckEmail, [lowerCaseEmail], async (err, row) => {
            if (err) {
                console.error("Erreur admin (vérification e-mail):", err.message);
                return res.status(500).json({ message: "Erreur serveur lors de la vérification de l'e-mail." });
            }
            if (row) {
                return res.status(409).json({ message: "Cet e-mail est déjà utilisé par un autre compte." });
            }

            // 3. Hacher le mot de passe
            const saltRounds = 10;
            const passwordHash = await bcrypt.hash(password, saltRounds);

            // 4. Insérer le nouvel utilisateur dans la base de données
            const sqlInsertUser = `INSERT INTO users (fullname, email, password_hash, account_type) VALUES (?, ?, ?, ?)`;
            db.run(sqlInsertUser, [fullname, lowerCaseEmail, passwordHash, accountType], function(err) {
                if (err) {
                    console.error("Erreur admin (insertion utilisateur):", err.message);
                    return res.status(500).json({ message: "Erreur serveur lors de la création du compte." });
                }
                console.log(`Utilisateur ID ${this.lastID} (${accountType}) créé par admin ID ${req.session.userId}`);
                res.status(201).json({ 
                    message: `Le compte ${accountType} pour ${fullname} a été créé avec succès.`,
                    userId: this.lastID
                });
            });
        });
    } catch (error) {
        console.error("Erreur inattendue (admin ajout utilisateur):", error);
        res.status(500).json({ message: "Une erreur inattendue est survenue." });
    }
});

// NOUVELLE API POUR GÉNÉRER LE REÇU D'UNE COMMANDE
app.get('/api/orders/:orderId/receipt', (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ message: "Veuillez vous connecter." });
    }

    const orderId = req.params.orderId;
    const requestingUserId = req.session.userId;
    const requestingUserType = req.session.userAccountType;

    const sqlOrder = "SELECT * FROM orders WHERE id = ?";
    db.get(sqlOrder, [orderId], (err, order) => {
        if (err) { return res.status(500).json({ message: "Erreur serveur." }); }
        if (!order) { return res.status(404).json({ message: "Commande non trouvée." }); }

        // Autorisation : seul l'acheteur de la commande ou un admin peuvent voir le reçu.
        if (requestingUserType !== 'admin' && order.buyer_id !== requestingUserId) {
            return res.status(403).json({ message: "Accès non autorisé à ce reçu." });
        }
        
        // Condition: le reçu n'est disponible que si la commande est livrée.
        if (order.status !== 'livré') {
            return res.status(403).json({ message: "Le reçu n'est disponible que pour les commandes livrées." });
        }

        const sqlOrderItems = `
            SELECT oi.quantity, oi.price_at_purchase, p.name as product_name 
            FROM order_items oi
            JOIN products p ON oi.product_id = p.id
            WHERE oi.order_id = ?`;
            
        db.all(sqlOrderItems, [orderId], (itemErr, items) => {
            if (itemErr) { return res.status(500).json({ message: "Erreur serveur (détails)." }); }

            const buyerName = req.session.userAccountType === 'acheteur' ? req.session.userFullname : 'Info Client'; // Sécurité: ne pas révéler le nom si c'est un admin qui regarde
            const shippingAddress = JSON.parse(order.shipping_address_json || '{}');
            
            // Génération de l'HTML pour le reçu
            const itemsHtml = items.map(item => `
                <tr>
                    <td style="padding: 8px; border-bottom: 1px solid #ddd;">${item.product_name}</td>
                    <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">${item.quantity}</td>
                    <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">${item.price_at_purchase.toFixed(2)} €</td>
                    <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">${(item.price_at_purchase * item.quantity).toFixed(2)} €</td>
                </tr>
            `).join('');

            const receiptHtml = `
                <!DOCTYPE html>
                <html lang="fr">
                <head>
                    <meta charset="UTF-8">
                    <title>Reçu pour la Commande #${order.id}</title>
                    <style>
                        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 800px; margin: 20px auto; padding: 20px; border: 1px solid #eee; box-shadow: 0 0 10px rgba(0,0,0,0.05); }
                        h1 { color: #c2410c; }
                        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                        th, td { text-align: left; padding: 8px; }
                        thead { background-color: #f2f2f2; }
                        .total-row { font-weight: bold; border-top: 2px solid #333; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <h1>Reçu de Commande</h1>
                        <p>Merci pour votre achat sur Marché Local !</p>
                        <hr>
                        <h2>Détails de la Commande #${order.id}</h2>
                        <p><strong>Date de la commande :</strong> ${new Date(order.order_date).toLocaleDateString('fr-FR')}</p>
                        <p><strong>Statut :</strong> Livré</p>
                        <p><strong>Client :</strong> ${buyerName}</p>
                        
                        <h3>Adresse de livraison :</h3>
                        <address>
                            ${shippingAddress.firstname || ''} ${shippingAddress.lastname || ''}<br>
                            ${shippingAddress.address || ''}<br>
                            ${shippingAddress.postal_code || ''} ${shippingAddress.city || ''}<br>
                            ${shippingAddress.country || ''}
                        </address>
                        
                        <h3>Articles</h3>
                        <table>
                            <thead>
                                <tr>
                                    <th>Produit</th>
                                    <th style="text-align: center;">Quantité</th>
                                    <th style="text-align: right;">Prix Unitaire</th>
                                    <th style="text-align: right;">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${itemsHtml}
                            </tbody>
                        </table>
                        
                        <h3 style="text-align: right; margin-top: 20px;">Montant Total Payé : <span style="color: #c2410c;">${parseFloat(order.total_amount).toFixed(2)} €</span></h3>
                    </div>
                </body>
                </html>
            `;
            
            res.setHeader('Content-Type', 'text/html');
            res.send(receiptHtml);
        });
    });
});

// Dans server.js, ajoutez cette route après les autres API existantes
// API pour récupérer les témoignages
app.get('/api/testimonials', (req, res) => {
    const sql = `SELECT * FROM testimonials ORDER BY created_at DESC`;
    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error("Erreur récupération témoignages:", err.message);
            return res.status(500).json({ message: "Erreur serveur (récupération témoignages)." });
        }
        res.json({ testimonials: rows });
    });
});

// Dans server.js, ajoutez cette nouvelle route POST
app.post('/api/testimonials', (req, res) => {
    const { author_name, author_role, author_location, content, rating } = req.body;

    // Validation basique des données
    if (!author_name || !content || !rating) {
        return res.status(400).json({ message: "Le nom, le contenu et la note sont requis." });
    }
    if (rating < 1 || rating > 5) {
        return res.status(400).json({ message: "La note doit être entre 1 et 5." });
    }

    const sql = `INSERT INTO testimonials (author_name, author_role, author_location, content, rating)
                 VALUES (?, ?, ?, ?, ?)`;

    db.run(sql, [author_name, author_role, author_location, content, rating], function (err) {
        if (err) {
            console.error("Erreur insertion témoignage:", err.message);
            return res.status(500).json({ message: "Erreur serveur lors de l'ajout du témoignage." });
        }
        // `this.lastID` contient l'ID du dernier enregistrement inséré
        res.status(201).json({
            message: "Témoignage ajouté avec succès!",
            testimonialId: this.lastID,
            testimonial: { id: this.lastID, author_name, author_role, author_location, content, rating, created_at: new Date().toISOString() }
        });
    });
});

// NOUVELLE ROUTE : Suppression d'un témoignage par l'admin
app.delete('/api/admin/testimonials/:testimonialId', isAdmin, (req, res) => {
    const testimonialId = req.params.testimonialId;

    const sqlDeleteTestimonial = "DELETE FROM testimonials WHERE id = ?";
    db.run(sqlDeleteTestimonial, [testimonialId], function(err) {
        if (err) {
            console.error(`Erreur suppression témoignage ID ${testimonialId} (admin):`, err.message);
            return res.status(500).json({ message: "Erreur serveur lors de la suppression du témoignage." });
        }
        if (this.changes === 0) {
            return res.status(404).json({ message: "Témoignage non trouvé ou déjà supprimé." });
        }
        console.log(`Témoignage ID ${testimonialId} supprimé par admin ID ${req.session.userId}`);
        res.status(200).json({ message: "Témoignage supprimé avec succès.", testimonialId: testimonialId });
    });
});



app.post('/api/orders', async (req, res) => {
    // ... (vérifications initiales)

    const buyer_id = req.session.userId;
    const cartItemsToProcess = [...req.session.cart];
    const { shipping_address, delivery_method, payment_method } = req.body; // <-- AJOUTER payment_method ICI

    // ... (validation de shipping_address)
    const shipping_address_json = JSON.stringify(shipping_address);

    // Nouvelle validation pour delivery_method et payment_method
    if (!delivery_method || !['standard', 'express'].includes(delivery_method)) {
        return res.status(400).json({ message: "Méthode de livraison invalide." });
    }
    if (!payment_method || !['om', 'wave', 'card'].includes(payment_method)) { // Assurez-vous que ces valeurs correspondent à votre frontend
        return res.status(400).json({ message: "Méthode de paiement invalide." });
    }

    let totalAmount = 0;
    // ... (logique de vérification de stock et calcul du total)
    // N'oubliez pas d'ajouter le coût de livraison au total si vous ne le faites pas déjà côté serveur
    if (delivery_method === 'standard') {
        totalAmount += 5.00; // Ajoutez le coût de la livraison standard
    } else if (delivery_method === 'express') {
        totalAmount += 12.00; // Ajoutez le coût de la livraison express
    }

    try {
        const productQuantitiesToUpdate = await Promise.all(productChecksPromises);

        db.serialize(() => {
            db.run("BEGIN TRANSACTION;", (beginErr) => {
                if(beginErr) return res.status(500).json({ message: "Erreur DB (début transaction)." });

                // MODIFIER LA REQUÊTE INSERT POUR INCLURE delivery_method ET payment_method
                const sqlInsertOrder = `INSERT INTO orders (buyer_id, total_amount, status, shipping_address_json, delivery_method, payment_method) VALUES (?, ?, ?, ?, ?, ?)`;
                db.run(sqlInsertOrder, [buyer_id, totalAmount, 'en préparation', shipping_address_json, delivery_method, payment_method], function(orderErr) { // <-- AJOUTER LES VALEURS ICI
                    if (orderErr) {
                        console.error("Erreur insertion commande:", orderErr.message);
                        return db.run("ROLLBACK;", () => res.status(500).json({ message: "Erreur serveur (création commande)." }));
                    }
                    const orderId = this.lastID;
                    console.log(`Nouvelle commande créée ID: ${orderId} (Méthode de paiement: ${payment_method})`);

                    // ... (logique d'insertion des order_items et mise à jour des stocks)

                    // Au moment du COMMIT:
                    db.run("COMMIT;", (commitErr) => {
                        if(commitErr) {
                            console.error("Erreur COMMIT:", commitErr.message);
                            return res.status(500).json({ message: "Erreur serveur (finalisation commande)." });
                        }
                        req.session.cart = [];
                        console.log("Panier vidé après commande.");
                        res.status(201).json({ message: "Commande créée avec succès !", orderId: orderId, totalAmount: totalAmount });
                    });
                });
            });
        });
    } catch (validationError) {
        console.error("Erreur de validation avant transaction:", validationError.message);
        return res.status(400).json({ message: validationError.message });
    }
});


app.get('/api/vendeur/commandes', (req, res) => {
    if (!req.session.userId || req.session.userAccountType !== 'vendeur') { return res.status(403).json({ message: "Action non autorisée." }); }
    const sellerId = req.session.userId;
    const sql = `
        SELECT DISTINCT o.id, o.order_date, o.total_amount, o.status, o.payment_method, -- <-- AJOUTER payment_method ICI
               u.fullname AS buyer_name, u.email AS buyer_email
        FROM orders o
        JOIN order_items oi ON o.id = oi.order_id
        JOIN users u ON o.buyer_id = u.id
        WHERE oi.seller_id = ?
        ORDER BY o.order_date DESC`;
    db.all(sql, [sellerId], (err, rows) => {
        if (err) { console.error("Erreur récupération commandes vendeur:", err.message); return res.status(500).json({ message: "Erreur serveur." });}
        res.json({ orders: rows });
    });
});
app.listen(PORT, () => {
    console.log(`Serveur démarré sur http://localhost:${PORT}`);
});

