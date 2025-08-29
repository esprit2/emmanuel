  // js/commande-detail.js (ou intégré ici)
        document.addEventListener('DOMContentLoaded', async () => {
            const currentYearSpan = document.getElementById('current-year');
            if(currentYearSpan) currentYearSpan.textContent = new Date().getFullYear();

            const mobileMenuButton = document.getElementById('mobile-menu-button-order-detail');
            const mobileMenuContent = document.getElementById('mobile-menu-order-detail-content');
            if(mobileMenuButton && mobileMenuContent) {
                mobileMenuButton.addEventListener('click', () => mobileMenuContent.classList.toggle('hidden'));
            }

            const orderDetailLoading = document.getElementById('order-detail-loading');
            const orderDetailError = document.getElementById('order-detail-error');
            const orderDetailContent = document.getElementById('order-detail-content');
            
            const orderIdDisplay = document.getElementById('order-id-display');
            const orderDateDisplay = document.getElementById('order-date-display');
            const orderStatusBadge = document.getElementById('order-status-badge');
            const orderItemsList = document.getElementById('order-items-list');
            const orderSubtotalDisplay = document.getElementById('order-subtotal-display');
            const orderShippingDisplay = document.getElementById('order-shipping-display'); // À calculer ou récupérer
            const orderTotalDisplay = document.getElementById('order-total-display');
            const shippingAddressDisplay = document.getElementById('shipping-address-display');
            const backToDashboardLink = document.getElementById('back-to-dashboard-link');


            const urlParams = new URLSearchParams(window.location.search);
            const orderId = urlParams.get('orderId');

            if (!orderId) {
                orderDetailLoading.classList.add('hidden');
                orderDetailError.textContent = "Aucun ID de commande fourni.";
                orderDetailError.classList.remove('hidden');
                return;
            }

            try {
                // L'API GET /api/orders/:orderId doit être créée côté serveur
                const response = await fetch(`http://localhost:3000/api/orders/${orderId}`);
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({ message: `Erreur HTTP ${response.status}` }));
                    throw new Error(errorData.message || `Erreur HTTP ${response.status}`);
                }
                const data = await response.json();
                const order = data.order; // Supposons que l'API renvoie { order: { ... } }

                if (order && order.items && order.shipping_address_data) {
                    orderDetailLoading.classList.add('hidden');
                    orderDetailContent.classList.remove('hidden');

                    orderIdDisplay.textContent = `#${order.id}`;
                    orderDateDisplay.textContent = new Date(order.order_date).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' });
                    
                    orderStatusBadge.textContent = order.status.charAt(0).toUpperCase() + order.status.slice(1);
                    let statusClass = 'bg-gray-500';
                    if (order.status === 'livré') statusClass = 'bg-green-500';
                    else if (order.status === 'expédié') statusClass = 'bg-blue-500';
                    else if (order.status === 'en préparation') statusClass = 'bg-yellow-500';
                    else if (order.status === 'annulé' || order.status === 'remboursé') statusClass = 'bg-red-500';
                    orderStatusBadge.className = `text-xs font-medium text-white px-3 py-1 rounded-full ${statusClass}`;


                    orderItemsList.innerHTML = '';
                    let calculatedSubtotal = 0;
                    order.items.forEach(item => {
                        const itemTotal = item.price_at_purchase * item.quantity;
                        calculatedSubtotal += itemTotal;
                        const itemHtml = `
                            <div class="flex items-center py-3 border-b border-stone-100 last:border-b-0">
                                <img src="${item.product_image_url || 'https://placehold.co/64x64/ccc/999?text=Img'}" alt="${item.product_name}" class="item-image rounded-md mr-4">
                                <div class="flex-grow">
                                    <p class="font-semibold text-stone-700">${item.product_name}</p>
                                    <p class="text-sm text-stone-500">Quantité: ${item.quantity}</p>
                                </div>
                                <p class="text-sm text-stone-600">${itemTotal.toFixed(2)} €</p>
                            </div>
                        `;
                        orderItemsList.innerHTML += itemHtml;
                    });

                    // Pour l'instant, frais de port fixes (à ajuster si stockés avec la commande)
                    const shipping = 5.00; 
                    orderSubtotalDisplay.textContent = calculatedSubtotal.toFixed(2) + ' €';
                    orderShippingDisplay.textContent = shipping.toFixed(2) + ' €';
                    orderTotalDisplay.textContent = (calculatedSubtotal + shipping).toFixed(2) + ' €';
                    // Idéalement, le total_amount et les frais de port viendraient directement de l'objet 'order' de l'API

                    const addr = order.shipping_address_data;
                    shippingAddressDisplay.innerHTML = `
                        <p><strong>${addr.firstname} ${addr.lastname}</strong></p>
                        <p>${addr.address}</p>
                        <p>${addr.postal_code} ${addr.city}</p>
                        <p>${addr.country}</p>
                        ${addr.phone ? `<p>Tél: ${addr.phone}</p>` : ''}
                    `;

                    // Mettre à jour le lien de retour en fonction du type d'utilisateur (si stocké)
                    const storedUser = sessionStorage.getItem('currentUser');
                    if(storedUser){
                        const user = JSON.parse(storedUser);
                        if(user.accountType === 'vendeur'){
                            backToDashboardLink.href = 'dashboard-vendeur.html#commandes-recues-vendeur';
                        } else { // acheteur ou admin
                            backToDashboardLink.href = 'dashboard-acheteur.html#mes-commandes-acheteur';
                        }
                    }


                } else {
                    throw new Error("Format de données de commande incorrect reçu du serveur.");
                }

            } catch (error) {
                console.error("Erreur chargement détails commande:", error);
                orderDetailLoading.classList.add('hidden');
                orderDetailError.textContent = `Erreur: ${error.message || 'Impossible de charger les détails de la commande.'}`;
                orderDetailError.classList.remove('hidden');
            }
        });