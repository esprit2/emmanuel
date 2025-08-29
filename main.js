// js/main.js

document.addEventListener('DOMContentLoaded', async () => {
    // --- LOGIQUE GLOBALE COMMUNE ---
    const currentYearSpan = document.getElementById('current-year');
    if (currentYearSpan) {
        currentYearSpan.textContent = new Date().getFullYear();
    }

 const testimonialForm = document.getElementById('testimonial-form');
    const formMessage = document.getElementById('form-message');

    if (testimonialForm) {
        testimonialForm.addEventListener('submit', async (event) => {
            event.preventDefault(); // Empêche le rechargement de la page

            formMessage.textContent = 'Envoi en cours...';
            formMessage.className = 'text-sm text-stone-600';

            const formData = new FormData(testimonialForm);
            const data = Object.fromEntries(formData.entries());

            // Convertir la note en nombre
            data.rating = parseInt(data.rating, 10);

            try {
                const response = await fetch('http://localhost:3000/api/testimonials', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(data)
                });

                const result = await response.json();

                if (response.ok) {
                    formMessage.textContent = result.message;
                    formMessage.className = 'text-sm text-green-600';
                    testimonialForm.reset(); // Réinitialiser le formulaire
                    // Optionnel: Recharger les témoignages pour afficher le nouveau
                    await fetchAndDisplayTestimonials();
                } else {
                    formMessage.textContent = `Erreur: ${result.message || 'Quelque chose a mal tourné.'}`;
                    formMessage.className = 'text-sm text-red-600';
                }
            } catch (error) {
                console.error("Erreur lors de l'envoi du témoignage:", error);
                formMessage.textContent = `Erreur réseau: ${error.message}`;
                formMessage.className = 'text-sm text-red-600';
            }
        });
    }
    // Gestion du menu mobile principal (celui utilisé sur index.html, catalogue.html, etc.)
    // =============================================
// FONCTIONS GÉNÉRALES
// =============================================

function initCurrentYear() {
    const currentYearSpan = document.getElementById('current-year');
    if (currentYearSpan) {
        currentYearSpan.textContent = new Date().getFullYear();
    }
}

async function fetchAndDisplayTestimonials() {
    const container = document.getElementById('testimonials-container');
    if (!container) return;

    container.innerHTML = '<p class="text-center text-stone-500">Chargement des témoignages...</p>';

    try {
        const response = await fetch('http://localhost:3000/api/testimonials');
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: `Erreur HTTP: ${response.status}` }));
            throw new Error(errorData.message || `Erreur lors de la récupération des témoignages: ${response.status}`);
        }
        const data = await response.json();
        const testimonials = data.testimonials || [];

        container.innerHTML = ''; // Vider le message de chargement

        if (testimonials.length === 0) {
            container.innerHTML = '<p class="col-span-full text-center text-stone-500">Aucun témoignage disponible pour le moment.</p>';
            return;
        }

        testimonials.forEach((testimonial, index) => {
            const alignmentClass = index % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse';
            const textAlignClass = index % 2 === 0 ? 'md:text-left' : 'md:text-right';
            const quoteMark = index % 2 === 0 ? '<span class="text-orange-500 font-bold text-4xl leading-none">“</span>' : '<span class="text-orange-500 font-bold text-4xl leading-none">”</span>';
            const quotePosition = index % 2 === 0 ? '' : 'order-first md:order-none'; // Pour positionner la citation sur les témoignages impairs
            
            const testimonialHtml = `
                <div class="flex flex-col ${alignmentClass} items-center gap-8 md:gap-12">
                    <div class="flex-shrink-0">
                        <img class="h-28 w-28 md:h-32 md:w-32 object-cover rounded-full shadow-lg" 
                             src="${testimonial.image_url || 'https://placehold.co/200x200/ccc/999?text=Profil'}" 
                             alt="Photo de ${testimonial.author_name}">
                    </div>
                    <div class="text-center ${textAlignClass} flex-grow">
                        <div class="text-2xl text-stone-600 ${quotePosition}">
                            ${index % 2 === 0 ? quoteMark : ''}
                            ${testimonial.content}
                            ${index % 2 !== 0 ? quoteMark : ''}
                        </div>
                        <cite class="mt-4 block font-semibold text-stone-800 not-italic">
                            ${testimonial.author_name}
                            <span class="ml-2 font-normal text-stone-500">- ${testimonial.author_role}, ${testimonial.author_location}</span>
                        </cite>
                    </div>
                </div>
            `;
            container.innerHTML += testimonialHtml;
        });

    } catch (error) {
        console.error("ERREUR fetchAndDisplayTestimonials:", error);
        container.innerHTML = `<p class="col-span-full text-center text-red-600">Erreur chargement des témoignages: ${error.message}.</p>`;
    }
}

function setupMobileMenu() {
    const menuButton = document.getElementById('mobile-menu-button');
    const mobileMenu = document.getElementById('mobile-menu');

    if (menuButton && mobileMenu) {
        // Configuration initiale
        mobileMenu.style.transition = 'max-height 0.3s ease-out';
        mobileMenu.style.maxHeight = '0';
        mobileMenu.classList.add('hidden');

        // Gestionnaire de clic
        menuButton.addEventListener('click', (e) => {
            e.stopPropagation();
            const isHidden = mobileMenu.classList.contains('hidden');
            
            mobileMenu.classList.toggle('hidden');
            menuButton.setAttribute('aria-expanded', isHidden);
            mobileMenu.style.maxHeight = isHidden ? `${mobileMenu.scrollHeight}px` : '0';
        });

        // Fermeture en cliquant à l'extérieur
        document.addEventListener('click', (e) => {
            if (!mobileMenu.contains(e.target) && !menuButton.contains(e.target)) {
                mobileMenu.classList.add('hidden');
                menuButton.setAttribute('aria-expanded', 'false');
                mobileMenu.style.maxHeight = '0';
            }
        });
    }
}

    // Mise à jour de l'en-tête en fonction de l'état d'authentification
    updateUserSpecificHeader();

    // --- GESTION DES PRODUITS (DYNAMIQUE VIA API) ---
    let fetchedProductsCache = null; 
    let currentProductDetail = null; // Stocke les détails du produit actuellement visualisé sur produit-detail.html
    
    // Récupère tous les produits depuis l'API (avec mise en cache simple)
    async function fetchProducts() {
        if (fetchedProductsCache !== null) {
            console.log("INFO: Utilisation du cache pour tous les produits.");
            return fetchedProductsCache;
        }
        try {
            console.log("INFO: Récupération de tous les produits depuis l'API...");
            const response = await fetch('http://localhost:3000/api/products');
            if (!response.ok) {
                let errorMsg = `Erreur HTTP: ${response.status} ${response.statusText}`;
                try { const errorData = await response.json(); errorMsg = errorData.message || errorMsg; } catch(e) {}
                throw new Error(errorMsg);
            }
            const data = await response.json();
            fetchedProductsCache = data.products || [];
            console.log("INFO: Produits reçus de l'API (tous):", fetchedProductsCache.length);
            return fetchedProductsCache;
        } catch (error) {
            console.error("ERREUR fetchProducts:", error);
            const productListContainerError = document.getElementById('product-list-container');
            const featuredProductsContainerError = document.getElementById('featured-products');
            if(productListContainerError) productListContainerError.innerHTML = `<p class="col-span-full text-center text-red-600 ">Erreur chargement produits: ${error.message}.</p>`;
            if(featuredProductsContainerError) featuredProductsContainerError.innerHTML = `<p class="col-span-full text-center text-red-600">Erreur chargement produits: ${error.message}.</p>`;
            return [];
        }
    }

    // Récupère un produit spécifique par son ID depuis l'API
    async function fetchProductById(productId) {
        try {
            console.log(`INFO: Récupération du produit ID ${productId} depuis l'API...`);
            const response = await fetch(`http://localhost:3000/api/products/${productId}`);
            if (!response.ok) {
                let errorMsg = `Erreur HTTP: ${response.status} ${response.statusText}`;
                if (response.status === 404) errorMsg = "Produit non trouvé.";
                else { try { const errorData = await response.json(); errorMsg = errorData.message || errorMsg; } catch(e) {} }
                throw new Error(errorMsg);
            }
            const data = await response.json();
            console.log(`INFO: Produit ID ${productId} reçu:`, data.product);
            return data.product || null;
        } catch (error) {
            console.error(`ERREUR fetchProductById (ID: ${productId}):`, error);
            if (window.location.pathname.includes('produit-detail.html')) {
                const mainContent = document.querySelector('main.container');
                if (mainContent) mainContent.innerHTML = `<p class="text-center text-xl text-red-600 py-10">Erreur chargement produit: ${error.message}</p>`;
            }
            return null;
        }
    }

    // --- GESTION DU PANIER VIA API ---
    let currentCart = []; // Cache local du panier, synchronisé avec le serveur

    async function fetchCartFromServer() {
        try {
            console.log("INFO: Récupération du panier depuis le serveur...");
            const response = await fetch('http://localhost:3000/api/cart'); // Le cookie de session est envoyé automatiquement
            if (!response.ok) {
                if (response.status === 401) { // Souvent si l'utilisateur n'est pas connecté
                    console.warn("AVERTISSEMENT: Utilisateur non connecté, panier serveur non accessible. Initialisation panier local vide.");
                    currentCart = [];
                } else {
                    const errorData = await response.json().catch(() => ({ message: `Erreur HTTP: ${response.status}` }));
                    throw new Error(errorData.message || `Erreur HTTP: ${response.status}`);
                }
            } else {
                const data = await response.json();
                currentCart = data.cart || [];
            }
            console.log("INFO: Panier (après fetch/init):", currentCart);
            updateCartIcon();
            return currentCart;
        } catch (error) {
            console.error("ERREUR fetchCartFromServer:", error);
            currentCart = []; 
            updateCartIcon();
            return [];
        }
    }

    async function addToCart(productId, quantity = 1) {
        console.log(`INFO: Tentative d'ajout au panier - Produit ID: ${productId}, Quantité: ${quantity}`);
        try {
            const response = await fetch('http://localhost:3000/api/cart/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ productId: parseInt(productId), quantity: quantity })
            });
            const responseData = await response.json();
            if (response.ok) {
                currentCart = responseData.cart || [];
                updateCartIcon();
                alert(responseData.message || 'Produit ajouté au panier !');
                console.log("INFO: Panier mis à jour après ajout:", currentCart);
            } else {
                alert(`Erreur: ${responseData.message || 'Impossible d\'ajouter le produit au panier.'}`);
            }
        } catch (error) {
            console.error("ERREUR addToCart (fetch):", error);
            alert('Erreur de communication avec le serveur pour ajouter au panier.');
        }
    }
    
    // Fonctions pour panier.html (exposées globalement)
    window.updateCartItemQuantityOnServer = async function(productId, quantity) {
        console.log(`INFO: Mise à jour quantité - Produit ID: ${productId}, Quantité: ${quantity}`);
        try {
            const response = await fetch(`http://localhost:3000/api/cart/item/${productId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ quantity: parseInt(quantity) })
            });
            const responseData = await response.json();
            if (response.ok) {
                currentCart = responseData.cart || [];
                updateCartIcon();
                return true;
            } else {
                alert(`Erreur: ${responseData.message || 'Impossible de mettre à jour la quantité.'}`);
                return false;
            }
        } catch (error) {
            console.error("ERREUR updateCartItemQuantityOnServer (fetch):", error);
            alert('Erreur de communication pour mettre à jour la quantité.');
            return false;
        }
    };

    window.removeCartItemFromServer = async function(productId) {
        console.log(`INFO: Suppression article - Produit ID: ${productId}`);
        try {
            const response = await fetch(`http://localhost:3000/api/cart/item/${productId}`, {
                method: 'DELETE'
            });
            const responseData = await response.json();
            if (response.ok) {
                currentCart = responseData.cart || [];
                updateCartIcon();
                return true;
            } else {
                alert(`Erreur: ${responseData.message || 'Impossible de supprimer le produit du panier.'}`);
                return false;
            }
        } catch (error) {
            console.error("ERREUR removeCartItemFromServer (fetch):", error);
            alert('Erreur de communication pour supprimer du panier.');
            return false;
        }
    };
    
    window.clearCartOnServer = async function() {
        console.log("INFO: Tentative de vider le panier sur le serveur...");
        try {
            const response = await fetch('http://localhost:3000/api/cart/clear', { method: 'POST' });
            const responseData = await response.json();
            if (response.ok) {
                currentCart = [];
                updateCartIcon();
                alert(responseData.message || "Panier vidé avec succès.");
                return true;
            } else {
                alert(`Erreur: ${responseData.message || "Impossible de vider le panier."}`);
                return false;
            }
        } catch (error) {
            console.error("ERREUR clearCartOnServer (fetch):", error);
            alert("Erreur de communication pour vider le panier.");
            return false;
        }
    };

    function updateCartIcon() {
        const cartItemCountElement = document.getElementById('cart-item-count');
        if (cartItemCountElement) {
            const totalItems = currentCart.reduce((sum, item) => sum + item.quantity, 0);
            cartItemCountElement.textContent = totalItems;
            cartItemCountElement.classList.toggle('hidden', totalItems === 0);
        }
    }
    
    function attachAddToCartListeners() {
        document.querySelectorAll('.add-to-cart-button').forEach(button => {
            if (!button.dataset.listenerAttachedCart) { 
                button.addEventListener('click', function() {
                    const productId = this.dataset.productId;
                    addToCart(productId);
                });
                button.dataset.listenerAttachedCart = 'true';
            }
        });
    }
    
    // Initialiser le panier et l'icône au chargement de chaque page
    await fetchCartFromServer();

    // --- LOGIQUE SPÉCIFIQUE AUX PAGES ---

    // Page Catalogue
    const filterForm = document.getElementById('filter-form');
    const productListContainer = document.getElementById('product-list-container');
    let productsForCatalogue = [];

    if (filterForm && productListContainer) {
        try {
            productsForCatalogue = await fetchProducts(); // Utilise le cache si disponible
            displayProductsOnCatalogue(productsForCatalogue);
        } catch (error) { /* géré dans fetchProducts */ }

        filterForm.addEventListener('submit', (event) => {
            event.preventDefault();
            filterAndDisplayCatalogueProducts();
        });
    }
    
    function displayProductsOnCatalogue(productsToDisplay) {
        if (!productListContainer) return;
        productListContainer.innerHTML = '';
        if (productsToDisplay.length === 0) {
            productListContainer.innerHTML = '<p class="col-span-full text-center text-stone-500">Aucun produit ne correspond à vos critères ou aucun produit disponible.</p>';
            return;
        }
        productsToDisplay.forEach(product => {
            const categoryText = product.category_name || 'Non catégorisé';
            const isAvailable = product.quantity_available > 0;
            const productCard = `
                <div class="product-card group relative bg-white rounded-lg shadow-sm overflow-hidden flex flex-col">
                    <a href="produit-detail.html?id=${product.id}" class="block flex-grow">
                        <img src="${product.image_url || 'https://placehold.co/400x300/ccc/999?text=Image+Indisponible'}" alt="${product.name}" class="h-56 w-full object-cover group-hover:opacity-75">
                        <div class="p-4">
                            <p class="text-xs text-orange-700 font-semibold uppercase">${categoryText}</p>
                            <h3 class="text-lg font-semibold text-stone-800 mt-1">${product.name}</h3>
                            <p class="text-xl font-bold text-stone-900 mt-2">${parseFloat(product.price).toFixed(2)} €</p>
                            ${!isAvailable ? '<p class="text-sm text-red-500 mt-1">Non disponible</p>' : ''}
                        </div>
                    </a>
                    <div class="p-4 pt-0">
                        <button class="w-full bg-orange-100 text-orange-800 font-semibold py-2 px-4 rounded-md hover:bg-orange-200 transition-colors add-to-cart-button" data-product-id="${product.id}" ${!isAvailable ? 'disabled' : ''}>
                            Ajouter au panier
                        </button>
                    </div>
                </div>`;
            productListContainer.innerHTML += productCard;
        });
        attachAddToCartListeners();
    }

    function filterAndDisplayCatalogueProducts() {
        if (!document.getElementById('search-keyword') || !productsForCatalogue || productsForCatalogue.length === 0) return; 
        
        const keyword = document.getElementById('search-keyword').value.toLowerCase();
        const categoryValue = document.getElementById('category-filter').value;
        const minPrice = parseFloat(document.getElementById('min-price').value) || 0;
        const maxPrice = parseFloat(document.getElementById('max-price').value) || Infinity;
        const availableOnly = document.getElementById('availability-filter').checked;

        let filtered = productsForCatalogue.filter(product => {
            const nameMatches = product.name.toLowerCase().includes(keyword);
            const categoryMatches = !categoryValue || (product.category_name && product.category_name.toLowerCase() === categoryValue.toLowerCase());
            const priceMatches = product.price >= minPrice && product.price <= maxPrice;
            const availabilityMatches = !availableOnly || product.quantity_available > 0;
            return nameMatches && categoryMatches && priceMatches && availabilityMatches;
        });
        displayProductsOnCatalogue(filtered);
    }
    
    // Page Détail Produit
    if (window.location.pathname.includes('produit-detail.html')) {
        const params = new URLSearchParams(window.location.search);
        const productId = params.get('id');
        if (productId) {
            const product = await fetchProductById(productId); // Utilise la fonction optimisée
            if (product) {
                // (le reste du code pour remplir la page produit-detail.html est le même que celui que vous aviez)
                 document.title = `Marché Local - ${product.name}`;
                const breadcrumbCat = document.getElementById('breadcrumb-category');
                const breadcrumbName = document.getElementById('breadcrumb-product-name');
                if(breadcrumbCat) breadcrumbCat.textContent = product.category_name || 'Catégorie';
                if(breadcrumbName) breadcrumbName.textContent = product.name;

                const productNameTitle = document.getElementById('product-detail-page-title');
                if (productNameTitle) productNameTitle.textContent = product.name;
                
                const sellerElement = document.getElementById('product-detail-seller');
                if(sellerElement) sellerElement.innerHTML = `Vendu par : <a href="#" class="text-orange-700 hover:underline">${product.seller_name || 'Vendeur inconnu'}</a>`;
                
                const priceElement = document.getElementById('product-detail-price');
                if(priceElement) priceElement.textContent = `${parseFloat(product.price).toFixed(2)} €`;
                
                const shortDescElement = document.getElementById('product-detail-short-desc');
                if(shortDescElement) shortDescElement.textContent = product.description; 

                const mainImage = document.getElementById('product-detail-main-image');
                if(mainImage){
                    mainImage.src = product.image_url || 'https://placehold.co/600x500/ccc/999?text=Image+Indisponible';
                    mainImage.alt = product.name;
                }
                
                const detailedDescContainer = document.getElementById('product-detail-long-desc');
                if(detailedDescContainer) detailedDescContainer.innerHTML = `<p>${product.long_description || product.description || "Aucune description détaillée."}</p>`;
                
                const sellerNameInTitle = document.getElementById('product-detail-seller-name');
                if(sellerNameInTitle) sellerNameInTitle.textContent = product.seller_name || 'Vendeur Inconnu';

                const addToCartButton = document.getElementById('product-detail-add-to-cart');
                if(addToCartButton) {
                    addToCartButton.dataset.productId = product.id;
                     if(!(product.quantity_available > 0)){
                        addToCartButton.disabled = true;
                        addToCartButton.textContent = "Non disponible";
                        addToCartButton.classList.replace('bg-orange-700','bg-gray-400');
                        addToCartButton.classList.replace('hover:bg-orange-800','hover:bg-gray-500');
                    } else {
                        addToCartButton.disabled = false;
                        addToCartButton.textContent = "Ajouter au panier";
                        addToCartButton.classList.remove('bg-gray-400', 'hover:bg-gray-500');
                        addToCartButton.classList.add('bg-orange-700', 'hover:bg-orange-800');
                    }
                    // S'assurer que le listener est attaché (ou ré-attaché si la page ne recharge pas)
                    if (!addToCartButton.dataset.listenerAttachedDetail) { // Utiliser un dataset unique
                        addToCartButton.addEventListener('click', function() {
                            const pId = this.dataset.productId;
                            addToCart(pId); // Appelle la fonction globale addToCart
                        });
                        addToCartButton.dataset.listenerAttachedDetail = 'true';
                    }
                }
            } // else, l'erreur est gérée par fetchProductById
        } else {
            const mainContent = document.querySelector('main.container');
            if (mainContent) mainContent.innerHTML = '<p class="text-center text-xl text-red-600 py-10">Aucun ID de produit spécifié.</p>';
        }
    }
    
    // Page Index (Produits en Vedette)
    const featuredProductsContainer = document.getElementById('featured-products');
    if (featuredProductsContainer && (window.location.pathname.endsWith('index.html') || window.location.pathname === '/' || window.location.pathname.endsWith('/'))) {
        fetchProducts().then(allProds => {
            const featured = allProds.filter(p => p.quantity_available > 0).slice(0, 4);
            displayFeaturedProducts(featured, featuredProductsContainer);
        });
    }

    function displayFeaturedProducts(products, container) {
        container.innerHTML = '';
        if (products.length === 0) {
            container.innerHTML = '<p class="col-span-full text-center text-stone-500">Aucun produit en vedette pour le moment.</p>';
            return;
        }
        products.forEach(product => {
            const categoryText = product.category_name || 'Non catégorisé';
            const isAvailable = product.quantity_available > 0;
             const productCard = `
                <div class="product-card group relative bg-white rounded-lg shadow-sm overflow-hidden flex flex-col">
                    <a href="produit-detail.html?id=${product.id}" class="block flex-grow">
                        <div class="aspect-w-1 aspect-h-1 w-full overflow-hidden lg:aspect-none group-hover:opacity-75" style="height: 200px;">
                            <img src="${product.image_url || 'https://placehold.co/400x300/ccc/999?text=Image'}" alt="${product.name}" class="h-full w-full object-cover object-center">
                        </div>
                        <div class="p-4">
                            <h3 class="text-lg font-semibold text-stone-800 truncate" title="${product.name}">
                                ${product.name}
                            </h3>
                            <p class="text-sm text-stone-500 mt-1">${categoryText}</p>
                            <p class="text-xl font-bold text-stone-900 mt-2">${parseFloat(product.price).toFixed(2)} €</p>
                        </div>
                    </a>
                    <div class="p-4 pt-0">
                        <button class="w-full bg-orange-100 text-orange-800 font-semibold py-2 px-4 rounded-md hover:bg-orange-200 transition-colors add-to-cart-button" data-product-id="${product.id}" ${!isAvailable ? 'disabled' : ''}>
                            Ajouter au panier
                        </button>
                    </div>
                </div>`;
            container.innerHTML += productCard;
        });
        attachAddToCartListeners();
    }
    

}); // Fin de DOMContentLoaded


// --- FONCTIONS GLOBALES POUR L'EN-TÊTE ET LA DÉCONNEXION ---
// (Ces fonctions doivent être accessibles globalement ou au moins dans la portée de DOMContentLoaded si appelées de là)

function updateUserSpecificHeader() {
    const userActionArea = document.getElementById('user-action-area');
    const mobileUserActionArea = document.getElementById('mobile-user-action-area'); 
    const storedUser = sessionStorage.getItem('currentUser');

    if (storedUser) {
        try {
            const user = JSON.parse(storedUser);
            let dashboardLink = 'index.html'; 
            let dashboardText = 'Mon Espace'; 

            if (user.accountType === 'acheteur') {
                dashboardLink = 'dashboard-acheteur.html#vue-ensemble-acheteur'; // Lien vers la section par défaut
                dashboardText = 'Mon Espace Client';
            } else if (user.accountType === 'vendeur') {
                dashboardLink = 'dashboard-vendeur.html#vue-ensemble-vendeur'; // Lien vers la section par défaut
                dashboardText = 'Tableau de Bord Vendeur';
            } else if (user.accountType === 'admin') { 
                dashboardLink = 'admin.html#vue-ensemble-admin'; // Lien vers la section par défaut
                dashboardText = 'Panneau Admin';
            }

            const welcomeMessage = `<span class="text-sm text-stone-700 mr-2 md:mr-3">Bonjour, ${user.fullname}!</span>`;
            const dashboardHtmlLink = `<a href="${dashboardLink}" class="text-stone-600 hover:text-orange-900 px-3 py-2 rounded-md text-sm font-medium">${dashboardText}</a>`;
            const logoutLink = `<a href="#" id="logout-button" class="text-stone-600 hover:text-orange-900 px-3 py-2 rounded-md text-sm font-medium border border-stone-300 hover:border-orange-700 ml-2 md:ml-3">Déconnexion</a>`;
            
            if (userActionArea) userActionArea.innerHTML = welcomeMessage + dashboardHtmlLink + logoutLink;
            if (mobileUserActionArea) {
                mobileUserActionArea.innerHTML = `
                    <span class="block px-3 py-2 text-base font-medium text-stone-700">Bonjour, ${user.fullname}!</span>
                    <a href="${dashboardLink}" class="block px-3 py-2 rounded-md text-base font-medium text-stone-600 hover:bg-orange-50 hover:text-orange-900">${dashboardText}</a>
                    <a href="#" id="mobile-logout-button" class="block px-3 py-2 rounded-md text-base font-medium text-stone-600 hover:bg-orange-50 hover:text-orange-900">Déconnexion</a>
                `;
            }

            const logoutButton = document.getElementById('logout-button');
            if (logoutButton) logoutButton.addEventListener('click', handleLogout);
            const mobileLogoutButton = document.getElementById('mobile-logout-button');
            if (mobileLogoutButton) mobileLogoutButton.addEventListener('click', handleLogout);

        } catch (e) {
            console.error("Erreur lors du parsing des données utilisateur:", e);
            sessionStorage.removeItem('currentUser');
            if (userActionArea) setDefaultAuthLinks(userActionArea);
            if (mobileUserActionArea) setDefaultAuthLinksMobile(mobileUserActionArea);
        }
    } else {
        if (userActionArea) setDefaultAuthLinks(userActionArea);
        if (mobileUserActionArea) setDefaultAuthLinksMobile(mobileUserActionArea);
    }
}

function setDefaultAuthLinks(area) {
    if (area) {
        area.innerHTML = `
            <a href="connexion.html" class="text-stone-600 hover:text-orange-900 px-3 py-2 rounded-md text-sm font-medium">Connexion</a>
            <a href="choix-inscription.html" class="ml-2 md:ml-4 text-stone-600 hover:text-orange-900 px-3 py-2 rounded-md text-sm font-medium">S'inscrire</a>
        `;
    }
}

function setDefaultAuthLinksMobile(area) {
     if (area) {
        area.innerHTML = `
            <a href="connexion.html" class="block px-3 py-2 rounded-md text-base font-medium text-stone-600 hover:bg-orange-50 hover:text-orange-900">Connexion</a>
            <a href="choix-inscription.html" class="block px-3 py-2 rounded-md text-base font-medium text-stone-600 hover:bg-orange-50 hover:text-orange-900">S'inscrire</a>
        `;
    }
}

 // Script pour le carrousel
        document.addEventListener('DOMContentLoaded', () => {
            const carousel = document.getElementById('new-products-carousel');
            const scrollLeftBtn = document.getElementById('scroll-left-btn');
            const scrollRightBtn = document.getElementById('scroll-right-btn');

            
            if (carousel && scrollLeftBtn && scrollRightBtn) {
                const scrollAmount = 300; // Décalage en pixels

                scrollLeftBtn.addEventListener('click', () => {
                    carousel.scrollLeft -= scrollAmount;
                });

                scrollRightBtn.addEventListener('click', () => {
                    carousel.scrollLeft += scrollAmount;
                });
            }

            
        });

// Rendre handleLogout accessible globalement ou l'attacher spécifiquement après création des boutons
window.handleLogout = async function(event) { // Exposer globalement ou passer en argument
    event.preventDefault();
    console.log('INFO: Déconnexion demandée...');
    
    try {
        const response = await fetch('http://localhost:3000/api/auth/logout', { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' } // Souvent optionnel pour un POST sans corps, mais bon à avoir
        });
        
        const responseData = await response.json().catch(() => ({})); // Gérer le cas où la réponse n'est pas JSON

        if (response.ok) {
            console.log("INFO: Session serveur détruite (ou tentative).", responseData.message || "Réponse OK sans message.");
        } else {
            console.warn("AVERTISSEMENT: Problème lors de la déconnexion serveur:", responseData.message || response.statusText);
        }
    } catch (error) {
        console.error("ERREUR fetch (déconnexion):", error);
    } finally {
        // Ces étapes sont exécutées que la déconnexion serveur ait réussi ou non pour une meilleure UX
        sessionStorage.removeItem('currentUser');
        currentCart = []; // Vider le cache du panier local
        updateUserSpecificHeader(); // Remet les liens "Connexion/S'inscrire"
        if (typeof updateCartIcon === 'function') updateCartIcon(); // Mettre à jour l'icône du panier pour afficher 0
        
        // Ne pas alerter ici, la redirection suffit et updateUserSpecificHeader rafraîchit l'UI
        // alert("Vous avez été déconnecté."); 
        window.location.href = 'index.html';
    }
};


window.addEventListener('load', () => {
    const loader = document.getElementById('page-loader');
    if (loader) {
        // On ajoute un petit délai pour s'assurer que l'animation du loader soit visible
        // un court instant et pour éviter un "flash" de contenu non stylisé sur certains navigateurs.
        setTimeout(() => {
            loader.classList.add('loader-hidden');
        }, 300); // Vous pouvez ajuster cette valeur (en millisecondes) si vous le souhaitez.
    }
});


/*codice page connexion*/


 document.getElementById('current-year').textContent = new Date().getFullYear();

        const mobileMenuButton = document.getElementById('mobile-menu-button');
        const mobileMenu = document.getElementById('mobile-menu');
        if (mobileMenuButton && mobileMenu) {
            mobileMenuButton.addEventListener('click', () => {
                mobileMenu.classList.toggle('hidden');
                const isExpanded = mobileMenuButton.getAttribute('aria-expanded') === 'true' || false;
                mobileMenuButton.setAttribute('aria-expanded', !isExpanded);
            });
        }
        
        /*confirmation commande */

                // Afficher l'ID de la commande si présent dans l'URL
        document.addEventListener('DOMContentLoaded', () => {
            const params = new URLSearchParams(window.location.search);
            const orderId = params.get('orderId');
            const orderConfirmationIdElement = document.getElementById('order-confirmation-id');

            if (orderId && orderConfirmationIdElement) {
                orderConfirmationIdElement.textContent = `#${orderId}`;
            }

            const currentYearSpan = document.getElementById('current-year');
            if(currentYearSpan) currentYearSpan.textContent = new Date().getFullYear();
        });

        

        /*dashboard buyer */


         // Script pour la navigation interne du tableau de bord acheteur
        document.addEventListener('DOMContentLoaded', () => {
            const currentYearSpan = document.getElementById('current-year');
            if(currentYearSpan) currentYearSpan.textContent = new Date().getFullYear();

            const sidebarLinks = document.querySelectorAll('.dashboard-sidebar a[href^="#"], .mobile-dashboard-link');
            const sections = document.querySelectorAll('.dashboard-section');
            const mobileMenuButtonBuyer = document.getElementById('mobile-menu-button-buyer');
            const mobileMenuBuyerContent = document.getElementById('mobile-menu-buyer-content');
            const buyerWelcomeTitle = document.getElementById('buyer-welcome-title');

            const buyerOrdersTable = document.getElementById('buyer-orders-table');
            const buyerOrdersTbody = document.getElementById('buyer-orders-tbody');
            const buyerOrdersLoadingMessage = document.getElementById('buyer-orders-loading-message');


            const storedUser = sessionStorage.getItem('currentUser');
            if (storedUser) {
                try {
                    const user = JSON.parse(storedUser);
                    if (buyerWelcomeTitle) buyerWelcomeTitle.textContent = `Bienvenue, ${user.fullname} !`;
                    
                    const profileFullname = document.getElementById('profile-fullname');
                    const profileEmail = document.getElementById('profile-email');
                    if(profileFullname) profileFullname.value = user.fullname;
                    if(profileEmail) profileEmail.value = user.email;

                } catch(e) { console.error("Erreur parsing utilisateur:", e); }
            }


            async function fetchAndDisplayBuyerOrders() {
                if (!buyerOrdersTable || !buyerOrdersTbody || !buyerOrdersLoadingMessage) return;
                
                buyerOrdersLoadingMessage.textContent = 'Chargement de vos commandes...';
                buyerOrdersLoadingMessage.classList.remove('hidden', 'text-red-600');
                buyerOrdersTable.classList.add('hidden');
                buyerOrdersTbody.innerHTML = '';

                try {
                    const response = await fetch('http://localhost:3000/api/acheteur/commandes');
                    if (!response.ok) {
                        const errorData = await response.json().catch(()=>({message: "Erreur de communication."}));
                        throw new Error(errorData.message || `Erreur HTTP ${response.status}`);
                    }
                    const data = await response.json();
                    const orders = data.orders || [];

                    buyerOrdersLoadingMessage.classList.add('hidden');
                    if (orders.length === 0) {
                        buyerOrdersTbody.innerHTML = '<tr><td colspan="5" class="text-center p-4 text-stone-500">Vous n\'avez pas encore passé de commande.</td></tr>';
                        buyerOrdersTable.classList.remove('hidden');
                    } else {
                        orders.forEach(order => {
                            let statusClass = 'bg-gray-100 text-gray-800';
                            if (order.status === 'livré') statusClass = 'bg-green-100 text-green-800';
                            else if (order.status === 'expédié') statusClass = 'bg-blue-100 text-blue-800';
                            else if (order.status === 'en préparation') statusClass = 'bg-yellow-100 text-yellow-800';
                            else if (order.status === 'annulé' || order.status === 'remboursé') statusClass = 'bg-red-100 text-red-800';

                            let actionButtonsHtml = `<a href="commande-detail.html?orderId=${order.id}" class="text-orange-600 hover:text-orange-900 mr-4">Détails</a>`;
                            if (order.status === 'en préparation') { 
                                actionButtonsHtml += `<button data-order-id="${order.id}" class="cancel-buyer-order-btn text-xs text-red-600 hover:text-red-800 font-medium">Annuler</button>`;
                            }
                            if (order.status === 'livré') {
                                actionButtonsHtml += `<button data-order-id="${order.id}" class="download-receipt-btn text-xs text-green-600 hover:text-green-800 font-medium ml-2">Télécharger le reçu</button>`;
                            }

                            const orderRow = `
                                <tr>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-orange-700 hover:underline"><a href="commande-detail.html?orderId=${order.id}">#${order.id}</a></td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-stone-700">${new Date(order.order_date).toLocaleDateString('fr-FR')}</td>
                                    <td class="px-6 py-4 whitespace-nowrap">
                                        <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClass}">${order.status}</span>
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-stone-900">${parseFloat(order.total_amount).toFixed(2)} €</td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        ${actionButtonsHtml}
                                    </td>
                                </tr>`;
                            buyerOrdersTbody.innerHTML += orderRow;
                        });
                        buyerOrdersTable.classList.remove('hidden');
                        attachBuyerOrderActionListeners(); 
                    }
                } catch (error) {
                    console.error("Erreur chargement commandes acheteur:", error);
                    buyerOrdersLoadingMessage.textContent = `Erreur: ${error.message}`;
                    buyerOrdersLoadingMessage.classList.add('text-red-600');
                    buyerOrdersLoadingMessage.classList.remove('hidden');
                    buyerOrdersTable.classList.add('hidden');
                }
            }

            function attachBuyerOrderActionListeners() {
                document.querySelectorAll('.cancel-buyer-order-btn').forEach(button => {
                    if (button.dataset.listenerAttached) return;
                    button.dataset.listenerAttached = 'true';
                    button.addEventListener('click', async function() {
                        const orderId = this.dataset.orderId;
                        if (confirm(`Êtes-vous sûr de vouloir annuler la commande #${orderId} ?`)) {
                            try {
                                const response = await fetch(`http://localhost:3000/api/acheteur/commandes/${orderId}/cancel`, { 
                                    method: 'POST' 
                                });
                                const responseData = await response.json();
                                if (response.ok) {
                                    alert(responseData.message || "Commande annulée avec succès.");
                                    fetchAndDisplayBuyerOrders(); 
                                } else {
                                    alert(`Erreur: ${responseData.message || "Impossible d'annuler la commande."}`);
                                }
                            } catch (err) {
                                console.error("Erreur annulation commande acheteur (catch):", err);
                                alert("Erreur de communication lors de l'annulation de la commande.");
                            }
                        }
                    });
                });
                
                // MODIFIÉ : Logique pour le téléchargement du reçu
                document.querySelectorAll('.download-receipt-btn').forEach(button => {
                    if(button.dataset.listenerAttachedReceipt) return;
                    button.dataset.listenerAttachedReceipt = 'true';
                    button.addEventListener('click', async function() {
                        const orderId = this.dataset.orderId;
                        this.textContent = 'Chargement...';
                        this.disabled = true;

                        try {
                            const response = await fetch(`http://localhost:3000/api/orders/${orderId}/receipt`);
                            if(response.ok) {
                                const receiptHtml = await response.text();
                                const blob = new Blob([receiptHtml], { type: 'text/html' });
                                const url = window.URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.style.display = 'none';
                                a.href = url;
                                a.download = `recu-commande-${orderId}.html`; // Nom du fichier
                                document.body.appendChild(a);
                                a.click();
                                window.URL.revokeObjectURL(url);
                                a.remove();
                                this.textContent = 'Reçu'; // Rétablir le texte du bouton
                                this.disabled = false;
                            } else {
                                const errorData = await response.json();
                                alert(`Erreur: ${errorData.message || 'Impossible de télécharger le reçu.'}`);
                                this.textContent = 'Reçu';
                                this.disabled = false;
                            }
                        } catch(err) {
                            console.error('Erreur téléchargement reçu:', err);
                            alert('Erreur de communication pour le téléchargement du reçu.');
                            this.textContent = 'Reçu';
                            this.disabled = false;
                        }
                    });
                });
            }


            function setActiveBuyerSection(targetId) {
                // ... (votre logique setActiveBuyerSection existante)
                sections.forEach(section => {
                    if (section.id === targetId) {
                        section.classList.remove('hidden');
                        section.classList.add('active');
                        if (targetId === 'mes-commandes-acheteur') {
                            fetchAndDisplayBuyerOrders();
                        }
                    } else {
                        section.classList.add('hidden');
                        section.classList.remove('active');
                    }
                });
                sidebarLinks.forEach(link => {
                    if (link.getAttribute('href') === `#${targetId}`) {
                        link.classList.add('active');
                    } else {
                        link.classList.remove('active');
                    }
                });
            }

            // ... (le reste de votre script de navigation pour le dashboard acheteur)
            sidebarLinks.forEach(link => {
                link.addEventListener('click', function(event) { /* ... */ });
            });
            if (mobileMenuButtonBuyer && mobileMenuBuyerContent) {
                mobileMenuButtonBuyer.addEventListener('click', () => { /* ... */ });
            }
            const currentHash = window.location.hash.substring(1);
            if (currentHash && document.getElementById(currentHash)) {
                setActiveBuyerSection(currentHash);
            } else {
                 setActiveBuyerSection('vue-ensemble-acheteur');
            }
        });
         // Script pour la navigation interne du tableau de bord acheteur
        document.addEventListener('DOMContentLoaded', () => {
            const currentYearSpan = document.getElementById('current-year');
            if(currentYearSpan) currentYearSpan.textContent = new Date().getFullYear();

            const sidebarLinks = document.querySelectorAll('.dashboard-sidebar a[href^="#"], .mobile-dashboard-link');
            const sections = document.querySelectorAll('.dashboard-section');
            const mobileMenuButtonBuyer = document.getElementById('mobile-menu-button-buyer');
            const mobileMenuBuyerContent = document.getElementById('mobile-menu-buyer-content');
            const buyerWelcomeTitle = document.getElementById('buyer-welcome-title');

            const buyerOrdersTable = document.getElementById('buyer-orders-table');
            const buyerOrdersTbody = document.getElementById('buyer-orders-tbody');
            const buyerOrdersLoadingMessage = document.getElementById('buyer-orders-loading-message');


            const storedUser = sessionStorage.getItem('currentUser');
            if (storedUser) {
                try {
                    const user = JSON.parse(storedUser);
                    if (buyerWelcomeTitle) buyerWelcomeTitle.textContent = `Bienvenue, ${user.fullname} !`;
                    
                    const profileFullname = document.getElementById('profile-fullname');
                    const profileEmail = document.getElementById('profile-email');
                    if(profileFullname) profileFullname.value = user.fullname;
                    if(profileEmail) profileEmail.value = user.email;

                } catch(e) { console.error("Erreur parsing utilisateur:", e); }
            }


            async function fetchAndDisplayBuyerOrders() {
                if (!buyerOrdersTable || !buyerOrdersTbody || !buyerOrdersLoadingMessage) {
                    console.warn("Éléments DOM pour la liste des commandes acheteur non trouvés.");
                    return;
                }
                
                buyerOrdersLoadingMessage.textContent = 'Chargement de vos commandes...';
                buyerOrdersLoadingMessage.classList.remove('hidden', 'text-red-600');
                buyerOrdersTable.classList.add('hidden');
                buyerOrdersTbody.innerHTML = '';

                try {
                    const response = await fetch('http://localhost:3000/api/acheteur/commandes');
                    if (!response.ok) {
                        const errorData = await response.json().catch(()=>({message: "Erreur de communication."}));
                        throw new Error(errorData.message || `Erreur HTTP ${response.status}`);
                    }
                    const data = await response.json();
                    const orders = data.orders || [];

                    buyerOrdersLoadingMessage.classList.add('hidden');
                    if (orders.length === 0) {
                        buyerOrdersTbody.innerHTML = '<tr><td colspan="5" class="text-center p-4 text-stone-500">Vous n\'avez pas encore passé de commande.</td></tr>';
                        buyerOrdersTable.classList.remove('hidden');
                    } else {
                        orders.forEach(order => {
                            let statusClass = 'bg-gray-100 text-gray-800';
                            if (order.status === 'livré') statusClass = 'bg-green-100 text-green-800';
                            else if (order.status === 'expédié') statusClass = 'bg-blue-100 text-blue-800';
                            else if (order.status === 'en préparation') statusClass = 'bg-yellow-100 text-yellow-800';
                            else if (order.status === 'annulé' || order.status === 'remboursé') statusClass = 'bg-red-100 text-red-800';

                            let actionButtonsHtml = `<a href="commande-detail.html?orderId=${order.id}" class="text-orange-600 hover:text-orange-900 mr-3">Détails</a>`;
                            if (order.status === 'en préparation') { 
                                actionButtonsHtml += `<button data-order-id="${order.id}" class="cancel-buyer-order-btn text-xs text-red-600 hover:text-red-800 font-medium">Annuler</button>`;
                            }

                            const orderRow = `
                                <tr>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-orange-700 hover:underline"><a href="commande-detail.html?orderId=${order.id}">#${order.id}</a></td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-stone-700">${new Date(order.order_date).toLocaleDateString('fr-FR')}</td>
                                    <td class="px-6 py-4 whitespace-nowrap">
                                        <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClass}">${order.status}</span>
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-stone-900">${parseFloat(order.total_amount).toFixed(2)} €</td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        ${actionButtonsHtml}
                                    </td>
                                </tr>`;
                            buyerOrdersTbody.innerHTML += orderRow;
                        });
                        buyerOrdersTable.classList.remove('hidden');
                        attachBuyerOrderActionListeners(); 
                    }
                } catch (error) {
                    console.error("Erreur chargement commandes acheteur:", error);
                    buyerOrdersLoadingMessage.textContent = `Erreur: ${error.message}`;
                    buyerOrdersLoadingMessage.classList.remove('hidden');
                    buyerOrdersLoadingMessage.classList.add('text-red-600');
                    buyerOrdersTable.classList.add('hidden');
                }
            }

            function attachBuyerOrderActionListeners() {
                document.querySelectorAll('.cancel-buyer-order-btn').forEach(button => {
                    if (button.dataset.listenerAttached) return;
                    button.dataset.listenerAttached = 'true';
                    button.addEventListener('click', async function() {
                        const orderId = this.dataset.orderId;
                        if (confirm(`Êtes-vous sûr de vouloir annuler la commande #${orderId} ?`)) {
                            try {
                                const response = await fetch(`http://localhost:3000/api/acheteur/commandes/${orderId}/cancel`, { 
                                    method: 'POST' 
                                });
                                const responseData = await response.json();
                                if (response.ok) {
                                    alert(responseData.message || "Commande annulée avec succès.");
                                    fetchAndDisplayBuyerOrders(); 
                                } else {
                                    alert(`Erreur: ${responseData.message || "Impossible d'annuler la commande."}`);
                                }
                            } catch (err) {
                                console.error("Erreur annulation commande acheteur (catch):", err);
                                alert("Erreur de communication lors de l'annulation de la commande.");
                            }
                        }
                    });
                });
            }


            function setActiveBuyerSection(targetId) {
                sections.forEach(section => {
                    const sectionIdWithoutHash = section.id;
                    if (sectionIdWithoutHash === targetId) {
                        section.classList.remove('hidden');
                        section.classList.add('active');
                        if (targetId === 'mes-commandes-acheteur') {
                            fetchAndDisplayBuyerOrders();
                        }
                        if (targetId === 'vue-ensemble-acheteur' && storedUser && buyerWelcomeTitle) {
                            try {
                                const user = JSON.parse(storedUser);
                                buyerWelcomeTitle.textContent = `Bienvenue, ${user.fullname} !`;
                            } catch(e){}
                        }
                    } else {
                        section.classList.add('hidden');
                        section.classList.remove('active');
                    }
                });
                sidebarLinks.forEach(link => {
                    if (link.getAttribute('href') === `#${targetId}`) {
                        link.classList.add('active');
                    } else {
                        link.classList.remove('active');
                    }
                });
            }

            sidebarLinks.forEach(link => {
                link.addEventListener('click', function(event) {
                    if (this.getAttribute('href').startsWith('#')) {
                        event.preventDefault();
                        const targetId = this.getAttribute('href').substring(1);
                        setActiveBuyerSection(targetId);
                        window.location.hash = targetId; 
                        if (mobileMenuBuyerContent && !mobileMenuBuyerContent.classList.contains('hidden') && this.classList.contains('mobile-dashboard-link')) {
                           mobileMenuBuyerContent.classList.add('hidden');
                        }
                    }
                });
            });
            
            if (mobileMenuButtonBuyer && mobileMenuBuyerContent) {
                mobileMenuButtonBuyer.addEventListener('click', () => {
                    mobileMenuBuyerContent.classList.toggle('hidden');
                });
            }

            const currentHash = window.location.hash.substring(1);
            if (currentHash && document.getElementById(currentHash)) {
                setActiveBuyerSection(currentHash);
            } else {
                 setActiveBuyerSection('vue-ensemble-acheteur');
            }
        });
  

        /*dashboard seller */

        document.addEventListener('DOMContentLoaded', () => {
            // Logique de base de la page
            const currentYearSpan = document.getElementById('current-year');
            if(currentYearSpan) currentYearSpan.textContent = new Date().getFullYear();
            
            const sidebarLinks = document.querySelectorAll('.dashboard-sidebar a[href^="#"], .mobile-dashboard-seller-link');
            const sections = document.querySelectorAll('.dashboard-section');
            const sellerProductsGrid = document.getElementById('seller-products-grid');
            const sellerActiveProductsCount = document.getElementById('seller-active-products-count');
            
            const sellerOrdersTable = document.getElementById('seller-orders-table');
            const sellerOrdersTbody = document.getElementById('seller-orders-tbody');
            const sellerOrdersLoadingMessage = document.getElementById('seller-orders-loading-message');

            async function fetchAndDisplaySellerProducts() {
                if (!sellerProductsGrid) return;
                sellerProductsGrid.innerHTML = '<p class="col-span-full text-stone-500">Chargement de vos produits...</p>';

                try {
                    const response = await fetch('http://localhost:3000/api/vendeur/mes-produits');
                    if (!response.ok) {
                        const errorData = await response.json().catch(() => ({}));
                        throw new Error(errorData.message || `Erreur HTTP ${response.status}`);
                    }
                    const data = await response.json();
                    const products = data.products || [];

                    if(sellerActiveProductsCount) sellerActiveProductsCount.textContent = products.length;
                    
                    sellerProductsGrid.innerHTML = ''; 
                    if (products.length === 0) {
                        sellerProductsGrid.innerHTML = '<p class="col-span-full text-stone-500">Vous n\'avez pas encore ajouté de produit.</p>';
                    } else {
                        products.forEach(product => {
                            const isAvailable = product.quantity_available > 0;
                            const productCardHTML = `
                                <div class="product-manage-card bg-white p-4 rounded-lg shadow flex flex-col justify-between">
                                    <div>
                                        <img src="${product.image_url || 'https://placehold.co/300x200/ccc/999?text=Image'}" alt="${product.name}" class="w-full h-32 object-cover rounded-md mb-3">
                                        <h4 class="text-md font-semibold text-stone-800 truncate" title="${product.name}">${product.name}</h4>
                                        <p class="text-lg font-bold text-stone-700 my-1">${parseFloat(product.price).toFixed(2)} €</p>
                                        <p class="text-xs ${isAvailable ? 'text-green-600' : 'text-red-600'}">
                                            ${isAvailable ? `En stock: ${product.quantity_available}` : 'Épuisé'}
                                        </p>
                                    </div>
                                    <div class="mt-3 flex space-x-2">
                                        <a href="modifier-produit.html?id=${product.id}" class="text-xs bg-blue-500 hover:bg-blue-600 text-white py-1 px-3 rounded-md w-full text-center">Modifier</a>
                                        <button data-product-id="${product.id}" class="delete-product-btn text-xs bg-red-500 hover:bg-red-600 text-white py-1 px-3 rounded-md w-full">Supprimer</button>
                                    </div>
                                </div>
                            `;
                            sellerProductsGrid.innerHTML += productCardHTML;
                        });
                        attachProductActionListeners();
                    }
                } catch (error) {
                    console.error("Erreur récupération produits vendeur:", error); 
                    sellerProductsGrid.innerHTML = `<p class="col-span-full text-red-600">Erreur lors du chargement de vos produits: ${error.message}.</p>`;
                    if(sellerActiveProductsCount) sellerActiveProductsCount.textContent = 'Erreur';
                }
            }

            function attachProductActionListeners() {
                document.querySelectorAll('.delete-product-btn').forEach(button => {
                    if(button.dataset.listenerAttached) return;
                    button.dataset.listenerAttached = 'true';
                    button.addEventListener('click', async function() {
                        const productId = this.dataset.productId;
                        if (confirm(`Êtes-vous sûr de vouloir supprimer ce produit (ID: ${productId}) ?`)) {
                            try {
                                const response = await fetch(`http://localhost:3000/api/vendeur/produits/${productId}`, { method: 'DELETE' });
                                const responseData = await response.json();
                                if (response.ok) {
                                    alert(responseData.message || 'Produit supprimé.');
                                    fetchAndDisplaySellerProducts(); 
                                } else {
                                    alert(`Erreur: ${responseData.message || 'Impossible de supprimer le produit.'}`);
                                }
                            } catch (err) {
                                console.error('Erreur suppression produit:', err);
                                alert('Erreur de communication lors de la suppression.');
                            }
                        }
                    });
                });
            }

            async function fetchAndDisplaySellerOrders() {

                
                if (!sellerOrdersTbody || !sellerOrdersTable) return;
                sellerOrdersLoadingMessage.classList.remove('hidden');
                sellerOrdersTable.classList.add('hidden');
                sellerOrdersTbody.innerHTML = '';

                try {
                    const response = await fetch('http://localhost:3000/api/vendeur/commandes');
                    if (!response.ok) {
                        const errorData = await response.json().catch(()=>({message: "Erreur de communication."}));
                        throw new Error(errorData.message || `Erreur HTTP ${response.status}`);
                    }
                    const data = await response.json();
                    const orders = data.orders || [];
                    
                    sellerOrdersLoadingMessage.classList.add('hidden');
                    sellerOrdersTable.classList.remove('hidden');
                    if (orders.length === 0) {
                        sellerOrdersTbody.innerHTML = '<tr><td colspan="6" class="text-center p-4 text-stone-500">Aucune commande reçue pour le moment.</td></tr>';
                    } else {
                        orders.forEach(order => {
                            const orderRow = `
                                <tr>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-orange-700 hover:underline"><a href="commande-detail.html?orderId=${order.id}" target="_blank">#${order.id}</a></td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-stone-700">${order.buyer_name || 'Client Inconnu'}</td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-stone-700">${new Date(order.order_date).toLocaleDateString('fr-FR')}</td>
                                    <td class="px-6 py-4 whitespace-nowrap">
                                        <select class="order-status-select text-xs p-1 rounded-md border-stone-300 focus:ring-orange-500 focus:border-orange-500" data-order-id="${order.id}" data-previous-status="${order.status}">
                                            <option value="en préparation" ${order.status === 'en préparation' ? 'selected' : ''}>En préparation</option>
                                            <option value="expédié" ${order.status === 'expédié' ? 'selected' : ''}>Expédié</option>
                                            <option value="livré" ${order.status === 'livré' ? 'selected' : ''}>Livré</option>
                                            <option value="remboursé" ${order.status === 'remboursé' ? 'selected' : ''}>Remboursé</option>
                                            <option value="annulé" ${order.status === 'annulé' ? 'selected' : ''}>Annulé</option>
                                        </select>
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-stone-900">${parseFloat(order.total_amount).toFixed(2)} €</td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <a href="commande-detail.html?orderId=${order.id}" class="text-xs text-blue-600 hover:text-blue-800 mr-3">Détails</a>
                                        <button data-order-id="${order.id}" class="cancel-order-btn text-xs text-red-600 hover:text-red-800">Annuler</button>
                                    </td>
                                </tr>`;
                            sellerOrdersTbody.innerHTML += orderRow;
                        });
                        attachOrderActionListeners();
                    }
                } catch (error) {
                    console.error("Erreur chargement commandes vendeur:", error);
                    sellerOrdersLoadingMessage.textContent = `Erreur: ${error.message}`;
                    sellerOrdersLoadingMessage.classList.add('text-red-600');
                    sellerOrdersLoadingMessage.classList.remove('hidden');
                }
            }

             orders.forEach(order => {
                            // ... (logique statusClass)

                            const orderRow = `
                                <tr>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-orange-700 hover:underline"><a href="commande-detail.html?orderId=${order.id}" target="_blank">#${order.id}</a></td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-stone-700">${order.buyer_name || 'Client Inconnu'}</td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-stone-700">${new Date(order.order_date).toLocaleDateString('fr-FR')}</td>
                                    <td class="px-6 py-4 whitespace-nowrap">
                                        <select class="order-status-select text-xs p-1 rounded-md border-stone-300 focus:ring-orange-500 focus:border-orange-500" data-order-id="${order.id}" data-previous-status="${order.status}">
                                            <option value="en préparation" ${order.status === 'en préparation' ? 'selected' : ''}>En préparation</option>
                                            <option value="expédié" ${order.status === 'expédié' ? 'selected' : ''}>Expédié</option>
                                            <option value="livré" ${order.status === 'livré' ? 'selected' : ''}>Livré</option>
                                            <option value="remboursé" ${order.status === 'remboursé' ? 'selected' : ''}>Remboursé</option>
                                            <option value="annulé" ${order.status === 'annulé' ? 'selected' : ''}>Annulé</option>
                                        </select>
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-stone-700">${order.payment_method ? order.payment_method.toUpperCase() : 'N/A'}</td> <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-stone-900">${parseFloat(order.total_amount).toFixed(2)} €</td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <a href="commande-detail.html?orderId=${order.id}" class="text-xs text-blue-600 hover:text-blue-800 mr-3">Détails</a>
                                        <button data-order-id="${order.id}" class="cancel-order-btn text-xs text-red-600 hover:text-red-800">Annuler</button>
                                    </td>
                                </tr>`;
                            sellerOrdersTbody.innerHTML += orderRow;
                        });
                        attachOrderActionListeners();
                
            
            function attachOrderActionListeners() {
                document.querySelectorAll('.order-status-select').forEach(select => {
                    if(select.dataset.listenerAttached) return;
                    select.dataset.listenerAttached = 'true';
                    select.addEventListener('change', async function() {
                        const orderId = this.dataset.orderId;
                        const newStatus = this.value;
                        const previousStatus = this.dataset.previousStatus; 
                        try {
                            const response = await fetch(`http://localhost:3000/api/vendeur/commandes/${orderId}/statut`, {
                                method: 'PUT',
                                headers: {'Content-Type': 'application/json'},
                                body: JSON.stringify({ status: newStatus })
                            });
                            const responseData = await response.json();
                            if (response.ok) {
                                alert(responseData.message || 'Statut mis à jour.');
                                this.dataset.previousStatus = newStatus;
                            } else {
                                alert(`Erreur: ${responseData.message || 'Impossible de mettre à jour.'}`);
                                this.value = previousStatus; 
                            }
                        } catch(err) {
                            alert('Erreur de communication pour la mise à jour.');
                            this.value = previousStatus; 
                        }
                    });
                });

                document.querySelectorAll('.cancel-order-btn').forEach(button => {
                    if(button.dataset.listenerAttachedCancel) return;
                    button.dataset.listenerAttachedCancel = 'true';
                    button.addEventListener('click', async function() {
                        const orderId = this.dataset.orderId;
                        if (confirm(`Êtes-vous sûr de vouloir annuler la commande #${orderId} ?`)) {
                             try {
                                const response = await fetch(`http://localhost:3000/api/vendeur/commandes/${orderId}`, { method: 'DELETE' });
                                const responseData = await response.json();
                                if (response.ok) {
                                    alert(responseData.message || 'Commande annulée.');
                                    fetchAndDisplaySellerOrders(); 
                                } else {
                                    alert(`Erreur: ${responseData.message || 'Impossible d\'annuler.'}`);
                                }
                            } catch(err) {
                                alert('Erreur de communication pour l\'annulation.');
                            }
                        }
                    });
                });
            }

            function setActiveSellerSection(targetId) {
                 sections.forEach(section => {
                    if (section.id === targetId) {
                        section.classList.remove('hidden');
                        section.classList.add('active');
                        if (targetId === 'mes-produits-vendeur') {
                            fetchAndDisplaySellerProducts();
                        } else if (targetId === 'commandes-recues-vendeur') {
                            fetchAndDisplaySellerOrders();
                        }
                    } else {
                        section.classList.add('hidden');
                        section.classList.remove('active');
                    }
                });
                sidebarLinks.forEach(link => {
                    if (link.getAttribute('href') === `#${targetId}`) {
                        link.classList.add('active');
                    } else {
                        link.classList.remove('active');
                    }
                });
            }

            sidebarLinks.forEach(link => {
                link.addEventListener('click', function(event) {
                    if (this.getAttribute('href').startsWith('#')) {
                        event.preventDefault();
                        const targetId = this.getAttribute('href').substring(1);
                        setActiveSellerSection(targetId);
                        window.location.hash = targetId; 
                        const mobileMenuSellerContent = document.getElementById('mobile-menu-seller-content');
                        if (mobileMenuSellerContent && this.classList.contains('mobile-dashboard-seller-link')) {
                            mobileMenuSellerContent.classList.add('hidden');
                        }
                    }
                });
            });

            const currentHash = window.location.hash.substring(1);
            if (currentHash && document.getElementById(currentHash)) {
                setActiveSellerSection(currentHash);
            } else {
                 setActiveSellerSection('vue-ensemble-vendeur'); 
            }

            const salesChartVendeurCtx = document.getElementById('salesChartVendeur')?.getContext('2d');
            if (salesChartVendeurCtx) {
                new Chart(salesChartVendeurCtx, { /* ... */ });
            }

            const mobileMenuButtonSeller = document.getElementById('mobile-menu-button-seller');
            const mobileMenuSellerContent = document.getElementById('mobile-menu-seller-content'); 
            if(mobileMenuButtonSeller && mobileMenuSellerContent) {
                mobileMenuButtonSeller.addEventListener('click', () => {
                    mobileMenuSellerContent.classList.toggle('hidden');
                });
            }
        });