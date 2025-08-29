 // js/panier.js (ou intégré ici pour la démo)
        document.addEventListener('DOMContentLoaded', async () => {
            const cartPageContainer = document.getElementById('cart-page-container');
            const cartLoadingMessage = document.getElementById('cart-loading-message');

            async function displayCart() {
                if (!cartPageContainer) return;

                // Utiliser la fonction fetchCartFromServer de main.js (assurez-vous qu'elle est globale ou importée)
                // Pour cet exemple, je vais supposer qu'elle est disponible globalement via window
                // ou que ce script est combiné avec main.js ou a accès à ses fonctions.
                // Idéalement, main.js exposerait ses fonctions de panier.
                // Pour l'instant, nous allons dupliquer un peu la logique de fetch pour être autonome ici,
                // mais à terme, il faudrait la centraliser.
                
                let cartItems = [];
                try {
                    console.log("INFO (panier.html): Récupération du panier depuis le serveur...");
                    const response = await fetch('http://localhost:3000/api/cart'); // Utilise le cookie de session
                    if (!response.ok) {
                        const errorData = await response.json().catch(() => ({message: "Erreur de communication avec le serveur du panier."}));
                        throw new Error(errorData.message || `Erreur HTTP: ${response.status}`);
                    }
                    const data = await response.json();
                    cartItems = data.cart || [];
                    console.log("INFO (panier.html): Panier reçu:", cartItems);
                } catch (error) {
                    console.error("ERREUR (panier.html) fetchCart:", error);
                    cartPageContainer.innerHTML = `<p class="text-center text-red-600 py-10">Impossible de charger votre panier: ${error.message}</p>`;
                    return;
                }


                if (cartLoadingMessage) cartLoadingMessage.classList.add('hidden');

                if (cartItems.length === 0) {
                    cartPageContainer.innerHTML = `
                        <div class="text-center py-10">
                            <p class="text-xl text-stone-600 mb-4">Votre panier est actuellement vide.</p>
                            <a href="catalogue.html" class="bg-orange-700 text-white font-semibold py-3 px-6 rounded-md hover:bg-orange-800 transition-colors">
                                Commencer vos achats
                            </a>
                        </div>`;
                    return;
                }

                let subtotal = 0;
                const itemsHtml = cartItems.map(item => {
                    const itemTotal = item.price * item.quantity;
                    subtotal += itemTotal;
                    return `
                        <div class="cart-item flex items-center justify-between py-6 border-b border-stone-200" data-product-id="${item.id}">
                            <div class="flex items-center">
                                <img src="${item.image_url || 'https://placehold.co/100x100/ccc/999?text=Img'}" alt="${item.name}" class="w-20 h-20 sm:w-24 sm:h-24 object-cover rounded-md shadow-sm">
                                <div class="ml-4 sm:ml-6">
                                    <h2 class="text-lg font-semibold text-stone-800 hover:text-orange-700"><a href="produit-detail.html?id=${item.id}">${item.name}</a></h2>
                                    <p class="text-sm text-stone-500">Prix unitaire: ${parseFloat(item.price).toFixed(2)} €</p>
                                    <button class="remove-item-btn mt-1 text-xs text-red-600 hover:text-red-800 font-medium" data-product-id="${item.id}">Supprimer</button>
                                </div>
                            </div>
                            <div class="flex flex-col items-end ml-4">
                                 <p class="text-lg font-semibold text-stone-800 mb-1">${itemTotal.toFixed(2)} €</p>
                                 <label for="quantity-${item.id}" class="sr-only">Quantité pour ${item.name}</label>
                                 <input type="number" id="quantity-${item.id}" name="quantity-${item.id}" value="${item.quantity}" min="0" data-product-id="${item.id}"
                                        class="quantity-input rounded-md border-stone-300 text-center text-sm shadow-sm focus:border-orange-500 focus:ring-orange-500">
                            </div>
                        </div>
                    `;
                }).join('');

                // Simuler les frais de port pour l'instant
                const shippingCost = cartItems.length > 0 ? 5.00 : 0; 
                const totalGeneral = subtotal + shippingCost;

                cartPageContainer.innerHTML = `
                    <div id="cart-items-list">
                        ${itemsHtml}
                    </div>
                    <div id="cart-summary-actions" class="mt-10">
                        <div class="bg-white p-6 rounded-lg shadow-md">
                            <h2 class="text-xl font-semibold text-stone-800 mb-4 border-b pb-3">Récapitulatif de la commande</h2>
                            <div class="space-y-3 text-stone-700">
                                <div class="flex justify-between">
                                    <span>Sous-total</span>
                                    <span id="cart-subtotal">${subtotal.toFixed(2)} €</span>
                                </div>
                                <div class="flex justify-between">
                                    <span>Frais de port estimés</span>
                                    <span id="cart-shipping">${shippingCost.toFixed(2)} €</span>
                                </div>
                                <div class="flex justify-between text-lg font-bold text-stone-800 border-t pt-3 mt-3">
                                    <span>Total Général</span>
                                    <span id="cart-total">${totalGeneral.toFixed(2)} €</span>
                                </div>
                            </div>
                            <div class="mt-6 text-right">
                                <button id="clear-cart-btn" class="text-sm text-red-600 hover:text-red-800 font-medium mb-4">Vider le panier</button>
                            </div>
                            <div class="mt-4 space-y-3">
                                <a href="checkout.html" class="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-700 hover:bg-orange-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500">
                                    Passer à la caisse
                                </a>
                                <a href="catalogue.html" class="block text-center w-full py-3 px-4 border border-orange-700 rounded-md shadow-sm text-sm font-medium text-orange-700 bg-white hover:bg-orange-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500">
                                    Continuer les achats
                                </a>
                            </div>
                        </div>
                    </div>
                `;
                attachCartPageListeners();
            }

            function attachCartPageListeners() {
                document.querySelectorAll('.quantity-input').forEach(input => {
                    // pour Éviter d'attacher plusieurs fois
                    if (input.dataset.listenerAttached) return;
                    input.dataset.listenerAttached = 'true';

                    input.addEventListener('change', async function() {
                        const productId = this.dataset.productId;
                        let newQuantity = parseInt(this.value);
                        if (isNaN(newQuantity) || newQuantity < 0) newQuantity = 0; // Mettre à 0 si invalide ou négatif

                        // Appeler la fonction de main.js (si elle est globale) ou une API directe
                        if (typeof window.updateCartItemQuantityOnServer === 'function') {
                            const success = await window.updateCartItemQuantityOnServer(productId, newQuantity);
                            if (success) {
                                displayCart(); // Recharger l'affichage du panier
                            } else {
                                // L'alerte d'erreur est déjà gérée dans updateCartItemQuantityOnServer
                                // On pourrait recharger pour refléter l'état serveur si la quantité a été refusée
                                displayCart(); 
                            }
                        } else {
                            console.error("La fonction updateCartItemQuantityOnServer n'est pas définie globalement.");
                        }
                    });
                });

                document.querySelectorAll('.remove-item-btn').forEach(button => {
                    if (button.dataset.listenerAttached) return;
                    button.dataset.listenerAttached = 'true';

                    button.addEventListener('click', async function() {
                        const productId = this.dataset.productId;
                        if (confirm("Êtes-vous sûr de vouloir retirer cet article du panier ?")) {
                             if (typeof window.removeCartItemFromServer === 'function') {
                                const success = await window.removeCartItemFromServer(productId);
                                if (success) {
                                    displayCart(); // Recharger l'affichage
                                }
                            } else {
                                console.error("La fonction removeCartItemFromServer n'est pas définie globalement.");
                            }
                        }
                    });
                });
                
                const clearCartButton = document.getElementById('clear-cart-btn');
                if (clearCartButton && !clearCartButton.dataset.listenerAttached) {
                    clearCartButton.addEventListener('click', async () => {
                        if (confirm("Êtes-vous sûr de vouloir vider complètement votre panier ?")) {
                            if (typeof window.clearCartOnServer === 'function') {
                                const success = await window.clearCartOnServer();
                                if (success) {
                                    displayCart();
                                }
                            } else {
                                console.error("La fonction clearCartOnServer n'est pas définie globalement.");
                            }
                        }
                    });
                    clearCartButton.dataset.listenerAttached = 'true';
                }
            }

            // Afficher le panier au chargement de la page
            displayCart();

            // Gérer le menu mobile (si l'ID est différent de celui géré par main.js)
            const mobileMenuButtonPage = document.getElementById('mobile-menu-button'); // Utilise l'ID standard
            const mobileMenuPageContent = document.getElementById('mobile-menu'); // Utilise l'ID standard
            if(mobileMenuButtonPage && mobileMenuPageContent){
                // La logique du menu mobile principal est déjà dans main.js et devrait fonctionner ici
            }
        });