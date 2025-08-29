// js/modifier-produit.js
document.addEventListener('DOMContentLoaded', async () => {
    const editProductForm = document.getElementById('edit-product-form');
    const categorySelect = document.getElementById('edit-product-category');
    const loadingMessage = document.getElementById('loading-product-message');
    const generalErrorElement = document.getElementById('general-edit-product-error');

    // Récupérer l'ID du produit depuis l'URL
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');

    if (!productId) {
        if (loadingMessage) loadingMessage.textContent = 'Aucun ID de produit fourni.';
        if (generalErrorElement) displayError(generalErrorElement, 'Aucun produit spécifié pour la modification.');
        if (editProductForm) editProductForm.classList.add('hidden');
        return;
    }

    // Éléments pour les messages d'erreur du formulaire
    const productNameError = document.getElementById('edit-product-name-error');
    const productDescriptionError = document.getElementById('edit-product-description-error');
    const productPriceError = document.getElementById('edit-product-price-error');
    const productQuantityError = document.getElementById('edit-product-quantity-error');
    const productCategoryError = document.getElementById('edit-product-category-error');
    const productImageURLError = document.getElementById('edit-product-image-url-error');

    // Charger les catégories (similaire à ajout-produit.js)
    async function loadCategories() {
        try {
            // TODO: Remplacer par un appel API réel à /api/categories
            const categories = [
                { id: 1, name: 'Miel et Confitures' },
                { id: 2, name: 'Formages et Laitiers' },
                { id: 3, name: 'Ortofrutta' },
                { id: 4, name: 'Huile et Conserves' },
                { id: 5, name: 'Autre' }
            ];
            if (categorySelect) {
                categories.forEach(category => {
                    const option = document.createElement('option');
                    option.value = category.id;
                    option.textContent = category.name;
                    categorySelect.appendChild(option);
                });
            }
            return categories; // Retourner les catégories pour pouvoir présélectionner
        } catch (error) {
            console.error("Erreur chargement catégories:", error);
            if(productCategoryError) displayError(productCategoryError, "Erreur chargement catégories.");
            return [];
        }
    }

    // Charger les détails du produit et pré-remplir le formulaire
    async function loadProductDetails() {
        if (!editProductForm) return;

        try {
            const categories = await loadCategories(); // Charger les catégories d'abord

            const response = await fetch(`http://localhost:3000/api/products/${productId}`);
            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error('Produit non trouvé.');
                }
                throw new Error(`Erreur HTTP: ${response.status}`);
            }
            const data = await response.json();
            const product = data.product;

            if (product) {
                document.getElementById('product-id').value = product.id;
                document.getElementById('edit-product-name').value = product.name || '';
                document.getElementById('edit-product-description').value = product.description || '';
                document.getElementById('edit-product-price').value = parseFloat(product.price).toFixed(2) || '';
                document.getElementById('edit-product-quantity').value = product.quantity_available || 0;
                document.getElementById('edit-product-image-url').value = product.image_url || '';
                
                // Pré-sélectionner la catégorie
                if (categorySelect && product.category_id) {
                    categorySelect.value = product.category_id;
                }
                
                if (loadingMessage) loadingMessage.classList.add('hidden');
                editProductForm.classList.remove('hidden');
            } else {
                throw new Error('Données du produit non reçues.');
            }
        } catch (error) {
            console.error("Erreur chargement détails produit:", error);
            if (loadingMessage) loadingMessage.classList.add('hidden');
            if (generalErrorElement) displayError(generalErrorElement, `Erreur: ${error.message || 'Impossible de charger les détails du produit.'}`);
            if (editProductForm) editProductForm.classList.add('hidden');
        }
    }

    // Charger les détails au chargement de la page
    await loadProductDetails();


    if (editProductForm) {
        editProductForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            hideAllEditErrorMessages();

            const id = document.getElementById('product-id').value; // Récupérer l'ID stocké
            const name = document.getElementById('edit-product-name').value.trim();
            const description = document.getElementById('edit-product-description').value.trim();
            const price = document.getElementById('edit-product-price').value;
            const quantity_available = document.getElementById('edit-product-quantity').value;
            const category_id = categorySelect.value;
            const image_url = document.getElementById('edit-product-image-url').value.trim();

            let isValid = true;
            // ... (Validations similaires à ajout-produit.js) ...
            if (name === '') { displayError(productNameError, 'Nom requis.'); isValid = false; }
            if (description === '') { displayError(productDescriptionError, 'Description requise.'); isValid = false; }
            if (price === '' || parseFloat(price) <= 0) { displayError(productPriceError, 'Prix valide requis.'); isValid = false; }
            if (quantity_available === '' || parseInt(quantity_available) < 0) { displayError(productQuantityError, 'Quantité valide requise.'); isValid = false; }
            if (category_id === '') { displayError(productCategoryError, 'Catégorie requise.'); isValid = false; }
             if (image_url !== '' && !isValidHttpUrl(image_url)) {
                displayError(productImageURLError, 'URL d\'image invalide.');
                isValid = false;
            }

            if (!isValid) return;

            const productData = {
                name, description, 
                price: parseFloat(price), 
                category_id: parseInt(category_id), 
                image_url: image_url || null, 
                quantity_available: parseInt(quantity_available)
            };

            try {
                const response = await fetch(`http://localhost:3000/api/vendeur/produits/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(productData)
                });
                const responseData = await response.json();
                if (response.ok) {
                    alert(responseData.message || 'Produit modifié avec succès !');
                    window.location.href = 'dashboard-vendeur.html#mes-produits-vendeur';
                } else {
                    displayError(generalErrorElement, responseData.message || 'Erreur lors de la modification.');
                }
            } catch (error) {
                console.error('Erreur communication serveur (modification):', error);
                displayError(generalErrorElement, 'Impossible de contacter le serveur.');
            }
        });
    }
    
    function isValidHttpUrl(string) {
        let url;
        try { url = new URL(string); } catch (_) { return false; }
        return url.protocol === "http:" || url.protocol === "https:";
    }

    function displayError(element, message) {
        if (element) {
            element.textContent = message;
            element.classList.remove('hidden');
        }
    }
    function hideAllEditErrorMessages() {
        const errorElements = [
            productNameError, productDescriptionError, productPriceError,
            productQuantityError, productCategoryError, productImageURLError, generalErrorElement
        ];
        errorElements.forEach(element => {
            if (element) {
                element.textContent = '';
                element.classList.add('hidden');
            }
        });
    }
    
    // Gérer le menu mobile spécifique à cette page
    const mobileMenuButtonModif = document.getElementById('mobile-menu-button-modifier-produit');
    const mobileMenuModifContent = document.getElementById('mobile-menu-modifier-produit-content');
    if(mobileMenuButtonModif && mobileMenuModifContent){
        mobileMenuButtonModif.addEventListener('click', () => {
            mobileMenuModifContent.classList.toggle('hidden');
        });
    }
});
