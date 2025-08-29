// js/checkout.js
document.addEventListener('DOMContentLoaded', async () => {
    const checkoutForm = document.getElementById('checkout-form');
    const generalErrorElement = document.getElementById('checkout-general-error');
    const checkoutTotalAmountSpan = document.getElementById('checkout-total-amount');
    let currentCartForCheckout = []; // Pour stocker le panier actuel
    
    // Définir les coûts de livraison
    const deliveryCosts = {
        standard: 5.00,
        express: 12.00
    };

    // Récupérer et afficher le total du panier (simplifié, suppose que le panier est déjà chargé par main.js ou récupéré ici)
    async function fetchAndDisplayCartTotal() {
        try {
            // Tenter de récupérer le panier via l'API (si l'utilisateur est connecté)
            const response = await fetch('http://localhost:3000/api/cart');
            if (response.ok) {
                const data = await response.json();
                currentCartForCheckout = data.cart || [];
            } else {
                // Essayer de lire depuis sessionStorage si l'API échoue ou si l'utilisateur n'est pas connecté
                const localCartData = sessionStorage.getItem('cart');
                if (localCartData) {
                    currentCartForCheckout = JSON.parse(localCartData);
                } else {
                    currentCartForCheckout = [];
                }
            }
        } catch (error) {
            console.warn("Impossible de récupérer le panier du serveur pour le checkout, tentative avec sessionStorage:", error);
            const localCartData = sessionStorage.getItem('cart');
            if (localCartData) {
                currentCartForCheckout = JSON.parse(localCartData);
            } else {
                currentCartForCheckout = [];
            }
        }
        
        if (currentCartForCheckout.length === 0 && checkoutTotalAmountSpan) {
             checkoutTotalAmountSpan.textContent = "0.00";
             if(generalErrorElement) displayError(generalErrorElement, "Votre panier est vide. Impossible de finaliser la commande.");
             const submitButton = document.getElementById('submit-order-button');
             if(submitButton) submitButton.disabled = true;
             return; // Arrêter si le panier est vide
        }

        updateTotalDisplay();
    }
    
    function updateTotalDisplay() {
        const subtotal = currentCartForCheckout.reduce((sum, item) => sum + item.price * item.quantity, 0);
        const selectedDeliveryMethod = document.querySelector('input[name="delivery-method"]:checked');
        const shippingCost = selectedDeliveryMethod ? deliveryCosts[selectedDeliveryMethod.value] : 0;
        const total = subtotal + shippingCost;
        if (checkoutTotalAmountSpan) {
            checkoutTotalAmountSpan.textContent = total.toFixed(2);
        }
    }

    // Gestion de la sélection des options de livraison et de paiement
    document.querySelectorAll('.delivery-option input[type="radio"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            document.querySelectorAll('.delivery-option').forEach(label => {
                label.classList.remove('ring-2', 'ring-orange-500', 'border-transparent');
                label.querySelector('.checked-icon').classList.add('hidden');
                label.classList.add('border-stone-200');
            });
            if (e.target.checked) {
                const parentLabel = e.target.closest('label');
                parentLabel.classList.add('ring-2', 'ring-orange-500', 'border-transparent');
                parentLabel.querySelector('.checked-icon').classList.remove('hidden');
                updateTotalDisplay();
            }
        });
    });

    document.querySelectorAll('.payment-option input[type="radio"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            document.querySelectorAll('.payment-option').forEach(label => {
                label.classList.remove('ring-2', 'ring-orange-500', 'border-transparent');
                label.querySelector('.checked-icon').classList.add('hidden');
                label.classList.add('border-stone-200');
            });
            if (e.target.checked) {
                const parentLabel = e.target.closest('label');
                parentLabel.classList.add('ring-2', 'ring-orange-500', 'border-transparent');
                parentLabel.querySelector('.checked-icon').classList.remove('hidden');
            }
        });
    });
    
    // Simuler le clic sur l'option de livraison par défaut
    const defaultDeliveryOption = document.querySelector('input[name="delivery-method"][value="standard"]');
    if (defaultDeliveryOption) {
        defaultDeliveryOption.click();
    }


    // Charger le total au chargement de la page
    await fetchAndDisplayCartTotal();


    // Pré-remplir l'email si l'utilisateur est connecté
    const storedUser = sessionStorage.getItem('currentUser');
    if (storedUser) {
        try {
            const user = JSON.parse(storedUser);
            const emailInput = document.getElementById('email');
            if (emailInput && user.email) {
                emailInput.value = user.email;
            }
        } catch(e) { console.error("Erreur parsing utilisateur pour pré-remplissage checkout:", e); }
    }


    if (checkoutForm) {
        checkoutForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            hideAllCheckoutErrorMessages();

            if (currentCartForCheckout.length === 0) {
                displayError(generalErrorElement, "Votre panier est vide. Impossible de passer commande.");
                return;
            }

            // Récupération des valeurs du formulaire
            const email = document.getElementById('email').value.trim();
            const firstname = document.getElementById('firstname').value.trim();
            const lastname = document.getElementById('lastname').value.trim();
            const address = document.getElementById('address').value.trim();
            const city = document.getElementById('city').value.trim();
            const postalCode = document.getElementById('postal-code').value.trim();
            const country = document.getElementById('country').value;
            const phone = document.getElementById('phone').value.trim(); // Optionnel
            
            const selectedDeliveryMethod = document.querySelector('input[name="delivery-method"]:checked');
            const selectedPaymentMethod = document.querySelector('input[name="payment-method"]:checked');

            // Validation côté client
            let isValid = true;
            if (!email) { displayError(document.getElementById('email-error'), 'E-mail requis.'); isValid = false; }
            if (!firstname) { displayError(document.getElementById('firstname-error'), 'Prénom requis.'); isValid = false; }
            if (!lastname) { displayError(document.getElementById('lastname-error'), 'Nom requis.'); isValid = false; }
            if (!address) { displayError(document.getElementById('address-error'), 'Adresse requise.'); isValid = false; }
            if (!city) { displayError(document.getElementById('city-error'), 'Ville requise.'); isValid = false; }
            if (!postalCode) { displayError(document.getElementById('postal-code-error'), 'Code postal requis.'); isValid = false; }
            if (!country) { displayError(document.getElementById('country-error'), 'Pays requis.'); isValid = false; }
            
            // Validation des nouvelles options
            if (!selectedDeliveryMethod) { displayError(document.getElementById('delivery-error'), 'Veuillez sélectionner un mode de livraison.'); isValid = false; }
            if (!selectedPaymentMethod) { displayError(document.getElementById('payment-error'), 'Veuillez sélectionner un mode de paiement.'); isValid = false; }
            
            if (!isValid) return;

            const shipping_address = {
                firstname,
                lastname,
                address,
                city,
                postal_code: postalCode,
                country,
                phone: phone || null
            };

            const orderData = {
                shipping_address: shipping_address,
                // Ajout des nouvelles données de livraison et de paiement
                delivery_method: selectedDeliveryMethod.value,
                payment_method: selectedPaymentMethod.value
                // Le panier sera lu depuis la session côté serveur
            };

            console.log("Envoi de la commande:", orderData);

            try {
                const response = await fetch('http://localhost:3000/api/orders', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(orderData)
                });

                const responseData = await response.json();

                if (response.ok) { // 201 Created
                    alert(responseData.message || 'Commande passée avec succès !');
                    // Vider le panier localement (le serveur vide celui en session)
                    sessionStorage.removeItem('cart'); 
                    if (typeof window.updateCartIcon === 'function') {
                        window.updateCartIcon(); // Mettre à jour l'icône du panier
                    }
                    // Rediriger vers la page de confirmation avec l'ID de la commande
                    window.location.href = `confirmation-commande.html?orderId=${responseData.orderId}`;
                } else {
                    console.error('Erreur serveur lors de la commande:', responseData);
                    displayError(generalErrorElement, responseData.message || 'Erreur lors de la finalisation de la commande.');
                }
            } catch (error) {
                console.error('Erreur de communication avec le serveur (commande):', error);
                displayError(generalErrorElement, 'Impossible de contacter le serveur. Vérifiez votre connexion.');
            }
        });
    }

    function displayError(element, message) {
        if (element) {
            element.textContent = message;
            element.classList.remove('hidden');
        }
    }

    function hideAllCheckoutErrorMessages() {
        document.querySelectorAll('#checkout-form p.text-red-600').forEach(el => {
            el.classList.add('hidden');
            el.textContent = '';
        });
        if(generalErrorElement) {
            generalErrorElement.classList.add('hidden');
            generalErrorElement.textContent = '';
        }
    }
});

// js/checkout.js

document.addEventListener('DOMContentLoaded', async () => {
    // ... (votre code existant)

    if (checkoutForm) {
        checkoutForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            hideAllCheckoutErrorMessages();

            // ... (récupération des données du formulaire)
            const selectedDeliveryMethod = document.querySelector('input[name="delivery-method"]:checked');
            const selectedPaymentMethod = document.querySelector('input[name="payment-method"]:checked'); // <-- Cette ligne récupère l'élément sélectionné

            // Validation des nouvelles options
            if (!selectedDeliveryMethod) { displayError(document.getElementById('delivery-error'), 'Veuillez sélectionner un mode de livraison.'); isValid = false; }
            if (!selectedPaymentMethod) { displayError(document.getElementById('payment-error'), 'Veuillez sélectionner un mode de paiement.'); isValid = false; } // <-- Validation du mode de paiement

            if (!isValid) return;

            const shipping_address = { /* ... */ };

            const orderData = {
                shipping_address: shipping_address,
                delivery_method: selectedDeliveryMethod.value,
                payment_method: selectedPaymentMethod.value // <-- S'ASSURER QUE C'EST INCLUS ICI
                // Le panier sera lu depuis la session côté serveur
            };

            console.log("Envoi de la commande:", orderData);

            try {
                const response = await fetch('http://localhost:3000/api/orders', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(orderData)
                });

                // ... (reste de votre logique de soumission)
            } catch (error) { /* ... */ }
        });
    }
    // ... (votre fonction displayError et hideAllCheckoutErrorMessages)
});