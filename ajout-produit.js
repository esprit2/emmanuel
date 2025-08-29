// js/ajout-produit.js
document.addEventListener('DOMContentLoaded', () => {
    const addProductForm = document.getElementById('add-product-form');
    const categorySelect = document.getElementById('product-category');

    // Éléments pour les messages d'erreur
    const productNameError = document.getElementById('product-name-error');
    const productDescriptionError = document.getElementById('product-description-error');
    const productPriceError = document.getElementById('product-price-error');
    const productQuantityError = document.getElementById('product-quantity-error');
    const productCategoryError = document.getElementById('product-category-error');
    const productImageURLError = document.getElementById('product-image-url-error');
    const generalProductError = document.getElementById('general-product-error'); // Pour les erreurs générales du serveur

    // Fonction pour charger les catégories dynamiquement (si vous avez une API pour cela)
    async function loadCategories() {
        try {
            // Remplacer par votre véritable endpoint API si vous en avez un
            // const response = await fetch('http://localhost:3000/api/categories');
            // if (!response.ok) {
            //     throw new Error('Impossible de charger les catégories');
            // }
            // const data = await response.json();
            // const categories = data.categories || [];

            // Pour la démo, utilisons des catégories statiques (comme dans le HTML original)
            // À remplacer par les données de l'API une fois disponible
            const categories = [
                { id: 1, name: 'Miel et Confitures' },
                { id: 2, name: 'Formages et Laitiers' },
                { id: 3, name: 'Ortofrutta' },
                { id: 4, name: 'Huile et Conserves' },
                { id: 5, name: 'Autre' } // Exemple
            ];

            if (categorySelect) {
                categories.forEach(category => {
                    const option = document.createElement('option');
                    option.value = category.id; // Utiliser l'ID de la catégorie comme valeur
                    option.textContent = category.name;
                    categorySelect.appendChild(option);
                });
            }
        } catch (error) {
            console.error("Erreur lors du chargement des catégories:", error);
            if(productCategoryError) displayError(productCategoryError, "Erreur de chargement des catégories.");
        }
    }

    // Charger les catégories au chargement de la page
    if (categorySelect) {
        loadCategories();
    }
    
    // Gérer le menu mobile spécifique à cette page si besoin
    const mobileMenuButtonAjout = document.getElementById('mobile-menu-button-ajout-produit');
    const mobileMenuAjoutContent = document.getElementById('mobile-menu-ajout-produit-content');
    if(mobileMenuButtonAjout && mobileMenuAjoutContent){
        mobileMenuButtonAjout.addEventListener('click', () => {
            mobileMenuAjoutContent.classList.toggle('hidden');
        });
    }


    if (addProductForm) {
        addProductForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            hideAllErrorMessages();

            const name = document.getElementById('product-name').value.trim();
            const description = document.getElementById('product-description').value.trim();
            const price = document.getElementById('product-price').value;
            const quantity_available = document.getElementById('product-quantity').value;
            const category_id = categorySelect.value;
            const image_url = document.getElementById('product-image-url').value.trim();

            let isValid = true;

            if (name === '') {
                displayError(productNameError, 'Le nom du produit est requis.');
                isValid = false;
            }
            if (description === '') {
                displayError(productDescriptionError, 'La description est requise.');
                isValid = false;
            }
            if (price === '' || parseFloat(price) <= 0) {
                displayError(productPriceError, 'Le prix doit être un nombre positif.');
                isValid = false;
            }
            if (quantity_available === '' || parseInt(quantity_available) < 0) {
                displayError(productQuantityError, 'La quantité doit être un nombre positif ou zéro.');
                isValid = false;
            }
            if (category_id === '') {
                displayError(productCategoryError, 'Veuillez sélectionner une catégorie.');
                isValid = false;
            }
            if (image_url !== '' && !isValidHttpUrl(image_url)) {
                displayError(productImageURLError, 'Veuillez entrer une URL d\'image valide (commençant par http:// ou https://).');
                isValid = false;
            }


            if (!isValid) {
                return;
            }

            const productData = {
                name,
                description,
                price: parseFloat(price),
                category_id: parseInt(category_id),
                image_url: image_url || null, // Envoyer null si vide
                quantity_available: parseInt(quantity_available)
            };

            try {
                // Assurez-vous que le vendeur est connecté et que le token/session est envoyé
                // Le backend vérifiera l'authentification et l'autorisation.
                const response = await fetch('http://localhost:3000/api/products', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        // Si vous utilisez des tokens JWT, vous ajouteriez l'en-tête Authorization ici
                        // 'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(productData)
                });

                const responseData = await response.json();

                if (response.ok) { // 201 Created
                    alert(responseData.message || 'Produit ajouté avec succès !');
                    addProductForm.reset();
                    // Rediriger vers le tableau de bord ou la liste des produits du vendeur
                    window.location.href = 'dashboard-vendeur.html#mes-produits-vendeur'; 
                } else {
                    console.error('Erreur du serveur lors de l\'ajout du produit:', responseData);
                    displayError(generalProductError, responseData.message || 'Erreur lors de l\'ajout du produit.');
                }
            } catch (error) {
                console.error('Erreur de communication avec le serveur:', error);
                displayError(generalProductError, 'Impossible de contacter le serveur. Veuillez réessayer.');
            }
        });
    }

    function isValidHttpUrl(string) {
        let url;
        try {
            url = new URL(string);
        } catch (_) {
            return false;  
        }
        return url.protocol === "http:" || url.protocol === "https:";
    }

    function displayError(element, message) {
        if (element) {
            element.textContent = message;
            element.classList.remove('hidden');
        }
    }

    function hideAllErrorMessages() {
        const errorElements = [
            productNameError, productDescriptionError, productPriceError,
            productQuantityError, productCategoryError, productImageURLError, generalProductError
        ];
        errorElements.forEach(element => {
            if (element) {
                element.textContent = '';
                element.classList.add('hidden');
            }
        });
    }
});
