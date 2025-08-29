// public/js/admin.js
document.addEventListener('DOMContentLoaded', () => {
    
    
    // 1. Protection de la page Admin (côté client)
    const storedUser = sessionStorage.getItem('currentUser');
    let isAdminUser = false;
    let currentAdmin = null; 

    if (storedUser) {
        try {
            const user = JSON.parse(storedUser);
            if (user && user.accountType === 'admin') {
                isAdminUser = true;
                currentAdmin = user; // Stocker l'objet admin connecté
                console.log("INFO (admin.js): Admin connecté:", currentAdmin.fullname, "(ID:", currentAdmin.id, ")");
            }
        } catch (e) {
            console.error("ERREUR (admin.js): Parsing utilisateur pour vérification admin:", e);
        }
    }

    if (!isAdminUser) {
        alert("Accès non autorisé. Vous devez être administrateur pour accéder à cette page. Redirection...");
        window.location.href = '/connexion.html'; // connexion.html est à la racine de public
        return; 
    }

    console.log("INFO (admin.js): Initialisation de la page admin.");

    // Éléments Globaux du DOM Admin
    const sidebarLinks = document.querySelectorAll('.admin-sidebar a.admin-nav-link');
    const sections = document.querySelectorAll('.admin-section');
    const adminLogoutButton = document.getElementById('admin-logout-button');

    // Éléments pour la gestion des utilisateurs
    const adminUsersTable = document.getElementById('admin-users-table');
    const adminUsersTbody = document.getElementById('admin-users-tbody');
    const adminUsersLoadingMessage = document.getElementById('admin-users-loading-message');
    const adminNoUsersMessage = document.getElementById('admin-no-users-message');
    const showAddUserModalButton = document.getElementById('show-add-user-modal-button');
    const addUserModal = document.getElementById('add-user-modal');
    const addUserForm = document.getElementById('add-user-form');
    const cancelAddUserButton = document.getElementById('cancel-add-user-button');
    const addUserGeneralError = document.getElementById('add-user-general-error');


    // Éléments pour la gestion des commandes (admin)
    const adminOrdersTable = document.getElementById('admin-orders-table');
    const adminOrdersTbody = document.getElementById('admin-orders-tbody');
    const adminOrdersLoadingMessage = document.getElementById('admin-orders-loading-message');
    const adminNoOrdersMessage = document.getElementById('admin-no-orders-message');
    
    // Éléments pour les statistiques de la vue d'ensemble
    const adminTotalUsersEl = document.getElementById('admin-total-users');
    const adminTotalSellersEl = document.getElementById('admin-total-sellers');
    const adminTotalProductsEl = document.getElementById('admin-total-products');
    const adminTotalOrdersMonthEl = document.getElementById('admin-total-orders-month');


    // --- FONCTIONS UTILITAIRES POUR LES ERREURS ---
    function displayError(element, message) {
        if (element) {
            element.textContent = message;
            element.classList.remove('hidden');
        }
    }
    function hideError(element) {
        if (element) {
            element.textContent = '';
            element.classList.add('hidden');
        }
    }
    function hideAllFormErrors(formElement) {
        formElement.querySelectorAll('p.text-red-600').forEach(el => {
            el.textContent = '';
            el.classList.add('hidden');
        });


    }


    // --- GESTION DES UTILISATEURS 
    async function fetchAndDisplayAdminUsers() {
        if (!adminUsersTable || !adminUsersTbody || !adminUsersLoadingMessage || !adminNoUsersMessage) return;
        
        adminUsersLoadingMessage.textContent = 'Chargement des utilisateurs...';
        adminUsersLoadingMessage.classList.remove('hidden', 'text-red-500');
        adminUsersTable.classList.add('hidden');
        adminNoUsersMessage.classList.add('hidden');
        adminUsersTbody.innerHTML = '';

        try {
            const response = await fetch('http://localhost:3000/api/admin/users');
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: `Erreur HTTP ${response.status}`}));
                throw new Error(errorData.message || `Erreur (${response.status})`);
            }
            const data = await response.json();
            const users = data.users || [];

            if(adminTotalUsersEl) adminTotalUsersEl.textContent = users.length; // Mise à jour stat (simplifié)

            adminUsersLoadingMessage.classList.add('hidden');
            if (users.length === 0) {
                adminNoUsersMessage.classList.remove('hidden');
            } else {
                users.forEach(user => {
                    const userRow = `
                        <tr>
                            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-100">${user.id}</td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-300">${user.fullname}</td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-300">${user.email}</td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-300">${user.account_type.charAt(0).toUpperCase() + user.account_type.slice(1)}</td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-300">${new Date(user.created_at).toLocaleDateString('fr-FR')}</td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium table-cell-actions">
                                ${user.id !== currentAdmin.id ? 
                                    `<button data-user-id="${user.id}" data-user-name="${user.fullname}" class="admin-delete-user-btn text-red-400 hover:text-red-300">Supprimer</button>` : 
                                    '<span class="text-xs text-gray-500">(Admin actuel)</span>'
                                }
                            </td>
                        </tr>
                    `;
                    adminUsersTbody.innerHTML += userRow;
                });
                adminUsersTable.classList.remove('hidden');
                attachAdminUserActionListeners();
            }
        } catch (error) {
            console.error("ERREUR fetch utilisateurs (admin):", error);
            adminUsersLoadingMessage.textContent = `Erreur: ${error.message}`;
            adminUsersLoadingMessage.classList.add('text-red-500');
        }
    }

    function attachAdminUserActionListeners() {
        document.querySelectorAll('.admin-delete-user-btn').forEach(button => {
            if (button.dataset.listenerAttachedAdminUserDelete) return;
            button.dataset.listenerAttachedAdminUserDelete = 'true';
            button.addEventListener('click', async function() {
                const userIdToDelete = this.dataset.userId;
                const userName = this.dataset.userName;
                if (confirm(`Êtes-vous sûr de vouloir supprimer l'utilisateur ${userName} (ID: ${userIdToDelete}) ? Cette action est irréversible.`)) {
                    try {
                        const response = await fetch(`http://localhost:3000/api/admin/users/${userIdToDelete}`, { method: 'DELETE' });
                        const responseData = await response.json();
                        if (response.ok) {
                            alert(responseData.message || 'Utilisateur supprimé.');
                            fetchAndDisplayAdminUsers();
                        } else {
                            alert(`Erreur: ${responseData.message || 'Impossible de supprimer.'}`);
                        }
                    } catch (err) {
                        console.error('ERREUR suppression utilisateur (admin):', err);
                        alert('Erreur de communication.');
                    }
                }
            });
        });
    }

    if (showAddUserModalButton && addUserModal && cancelAddUserButton) {
        showAddUserModalButton.addEventListener('click', () => {
            addUserModal.classList.remove('hidden');
            addUserModal.classList.add('flex');
        });
        cancelAddUserButton.addEventListener('click', () => {
            addUserModal.classList.add('hidden');
            addUserModal.classList.remove('flex');
            addUserForm.reset();
            hideAllFormErrors(addUserForm);
            hideError(addUserGeneralError);
        });
        // Fermer le modal en cliquant à l'extérieur
        addUserModal.addEventListener('click', (event) => {
            if (event.target === addUserModal) {
                addUserModal.classList.add('hidden');
                addUserModal.classList.remove('flex');
                addUserForm.reset();
                hideAllFormErrors(addUserForm);
                hideError(addUserGeneralError);
            }
        });
    }

    if (addUserForm) {
        addUserForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            hideAllFormErrors(this);
            hideError(addUserGeneralError);

            const fullname = document.getElementById('add-user-fullname').value.trim();
            const email = document.getElementById('add-user-email').value.trim().toLowerCase();
            const password = document.getElementById('add-user-password').value;
            const accountType = document.getElementById('add-user-account-type').value;

            let isValid = true;
            if (!fullname) { displayError(document.getElementById('add-user-fullname-error'), 'Nom complet requis.'); isValid = false; }
            if (!email) { displayError(document.getElementById('add-user-email-error'), 'Email requis.'); isValid = false; }
            else if (!/\S+@\S+\.\S+/.test(email)) { displayError(document.getElementById('add-user-email-error'), 'Email invalide.'); isValid = false; }
            if (!password) { displayError(document.getElementById('add-user-password-error'), 'Mot de passe requis.'); isValid = false; }
            else if (password.length < 8) { displayError(document.getElementById('add-user-password-error'), 'Minimum 8 caractères.'); isValid = false; }
            if (!accountType) { displayError(document.getElementById('add-user-account-type-error'), 'Type de compte requis.'); isValid = false; }

            if (!isValid) return;

            const userData = { fullname, email, password, accountType };

            try {
                const response = await fetch('http://localhost:3000/api/auth/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(userData)
                });
                const responseData = await response.json();
                if (response.ok) {
                    alert(responseData.message || 'Utilisateur ajouté avec succès!');
                    addUserForm.reset();
                    addUserModal.classList.add('hidden');
                    addUserModal.classList.remove('flex');
                    fetchAndDisplayAdminUsers(); // Recharger la liste
                } else {
                    displayError(addUserGeneralError, responseData.message || "Erreur lors de l'ajout.");
                }
            } catch (error) {
                console.error("Erreur ajout utilisateur (admin):", error);
                displayError(addUserGeneralError, "Impossible de contacter le serveur.");
            }
        });
    }

    // --- GESTION DES COMMANDES (ADMIN) ---
    async function fetchAndDisplayAdminOrders() {
        if (!adminOrdersTable || !adminOrdersTbody || !adminOrdersLoadingMessage || !adminNoOrdersMessage) return;
        adminOrdersLoadingMessage.textContent = 'Chargement de toutes les commandes...';
        adminOrdersLoadingMessage.classList.remove('hidden', 'text-red-500');
        adminOrdersTable.classList.add('hidden');
        adminNoOrdersMessage.classList.add('hidden');
        adminOrdersTbody.innerHTML = '';

        try {
            const response = await fetch('http://localhost:3000/api/admin/orders');
            if (!response.ok) {
                 const errorData = await response.json().catch(() => ({ message: `Erreur HTTP ${response.status}`}));
                 throw new Error(errorData.message || `Erreur (${response.status})`);
            }
            const data = await response.json();
            const orders = data.orders || [];
            
            if(adminTotalOrdersMonthEl) adminTotalOrdersMonthEl.textContent = orders.length; // Simplicication pour l'instant

            adminOrdersLoadingMessage.classList.add('hidden');
            if (orders.length === 0) {
                adminNoOrdersMessage.classList.remove('hidden');
            } else {
                orders.forEach(order => {
                    let statusClass = 'bg-gray-600 text-gray-100';
                    if (order.status === 'livré') statusClass = 'bg-green-600 text-white';
                    else if (order.status === 'expédié') statusClass = 'bg-blue-500 text-white';
                    else if (order.status === 'en préparation') statusClass = 'bg-yellow-500 text-black';
                    else if (order.status === 'annulé' || order.status === 'remboursé') statusClass = 'bg-red-600 text-white';
                    
                    const orderRow = `
                        <tr>
                            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-orange-300 hover:underline"><a href="commande-detail.html?orderId=${order.id}" target="_blank">#${order.id}</a></td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-300">${order.buyer_fullname || 'Acheteur Inconnu'} (ID: ${order.buyer_id})</td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-300">${new Date(order.order_date).toLocaleDateString('fr-FR')}</td>
                            <td class="px-6 py-4 whitespace-nowrap">
                                <select class="admin-order-status-select bg-gray-600 text-gray-100 text-xs p-1 rounded-md border-gray-500 focus:ring-orange-400 focus:border-orange-400" data-order-id="${order.id}" data-previous-status="${order.status}">
                                    <option value="en préparation" ${order.status === 'en préparation' ? 'selected' : ''}>En préparation</option>
                                    <option value="expédié" ${order.status === 'expédié' ? 'selected' : ''}>Expédié</option>
                                    <option value="livré" ${order.status === 'livré' ? 'selected' : ''}>Livré</option>
                                    <option value="annulé" ${order.status === 'annulé' ? 'selected' : ''}>Annulé</option>
                                    <option value="remboursé" ${order.status === 'remboursé' ? 'selected' : ''}>Remboursé</option>
                                </select>
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-100">${parseFloat(order.total_amount).toFixed(2)} €</td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium table-cell-actions">
                                <button data-order-id="${order.id}" class="admin-cancel-order-btn text-red-400 hover:text-red-300">Annuler</button>
                            </td>
                        </tr>
                    `;
                    adminOrdersTbody.innerHTML += orderRow;
                });
                adminOrdersTable.classList.remove('hidden');
                attachAdminOrderActionListeners();
            }
        } catch (error) {
            console.error("ERREUR fetch commandes (admin):", error);
            adminOrdersLoadingMessage.textContent = `Erreur: ${error.message}`;
            adminOrdersLoadingMessage.classList.add('text-red-500');
        }
    }

    function attachAdminOrderActionListeners() {
        document.querySelectorAll('.admin-order-status-select').forEach(select => {
            if(select.dataset.listenerAttachedAdminStatus) return;
            select.dataset.listenerAttachedAdminStatus = 'true';
            select.addEventListener('change', async function() {
                const orderId = this.dataset.orderId;
                const newStatus = this.value;
                const previousStatus = this.dataset.previousStatus;
                try {
                    const response = await fetch(`http://localhost:3000/api/admin/orders/${orderId}/status`, {
                        method: 'PUT',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({ status: newStatus })
                    });
                    const responseData = await response.json();
                    if (response.ok) {
                        alert(responseData.message || 'Statut commande mis à jour.');
                        this.dataset.previousStatus = newStatus;
                        this.className = `admin-order-status-select bg-${getStatusColor(newStatus)}-600 text-${getStatusTextColor(newStatus)} text-xs p-1 rounded-md border-gray-500 focus:ring-orange-400 focus:border-orange-400`;
                    } else {
                        alert(`Erreur: ${responseData.message || 'Impossible de mettre à jour.'}`);
                        this.value = previousStatus; 
                    }
                } catch(err) {
                    alert('Erreur communication (maj statut commande admin).');
                    this.value = previousStatus; 
                }
            });
        });
         document.querySelectorAll('.admin-cancel-order-btn').forEach(button => {
            if(button.dataset.listenerAttachedAdminCancel) return;
            button.dataset.listenerAttachedAdminCancel = 'true';
            button.addEventListener('click', async function() {
                const orderId = this.dataset.orderId;
                if (confirm(`Êtes-vous sûr de vouloir annuler la commande #${orderId} ?`)) {
                     try {
                        const response = await fetch(`http://localhost:3000/api/admin/orders/${orderId}`, { method: 'DELETE' });
                        const responseData = await response.json();
                        if (response.ok) {
                            alert(responseData.message || 'Commande annulée.');
                            fetchAndDisplayAdminOrders(); 
                        } else {
                            alert(`Erreur: ${responseData.message || 'Impossible d\'annuler.'}`);
                        }
                    } catch(err) {
                        alert('Erreur communication (annulation commande admin).');
                    }
                }
            });
        });
    }
    function getStatusColor(status) {
        if (status === 'livré') return 'green';
        if (status === 'expédié') return 'blue';
        if (status === 'en préparation') return 'yellow';
        if (status === 'annulé' || status === 'remboursé') return 'red';
        return 'gray';
    }
    function getStatusTextColor(status) {
         if (status === 'en préparation') return 'black';
         return 'white';
    }

    // --- GESTION DES PRODUITS (ADMIN) ---
    async function fetchAndDisplayAdminAllProducts() {
        const productAdminContainer = document.querySelector('#gestion-produits-admin .bg-gray-700'); // Cible la div de contenu
        if (!productAdminContainer) return;
        productAdminContainer.innerHTML = '<p class="text-gray-400">Chargement de tous les produits...</p>';
        try {
           
            const response = await fetch('http://localhost:3000/api/products'); // Utilise l'API publique
            if (!response.ok) throw new Error("Erreur chargement produits pour admin.");
            const data = await response.json();
            const products = data.products || [];

            if (products.length === 0) {
                productAdminContainer.innerHTML = '<p class="text-gray-400">Aucun produit à afficher.</p>';
            } else {
                let tableHtml = `
                    <table class="min-w-full divide-y divide-gray-600">
                        <thead class="bg-gray-750">
                            <tr>
                                <th class="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase">ID</th>
                                <th class="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase">Nom</th>
                                <th class="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase">Vendeur</th>
                                <th class="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase">Prix</th>
                                <th class="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody class="bg-gray-700 divide-y divide-gray-600">`;
                products.forEach(p => {
                    tableHtml += `
                        <tr>
                            <td class="px-4 py-2 text-sm text-gray-100">${p.id}</td>
                            <td class="px-4 py-2 text-sm text-gray-300">${p.name}</td>
                            <td class="px-4 py-2 text-sm text-gray-300">${p.seller_name || 'N/A'}</td>
                            <td class="px-4 py-2 text-sm text-gray-300">${parseFloat(p.price).toFixed(2)} €</td>
                            <td class="px-4 py-2 text-sm">
                                <button class="text-blue-400 hover:text-blue-300 mr-2">Modifier</button>
                                <button class="text-red-400 hover:text-red-300">Supprimer</button>
                            </td>
                        </tr>`;
                });
                tableHtml += `</tbody></table>`;
                productAdminContainer.innerHTML = tableHtml;
                // TODO: Attacher les listeners pour les boutons modifier/supprimer (nécessite API admin spécifiques)
            }
        } catch(error) {
            productAdminContainer.innerHTML = `<p class="text-red-400">Erreur: ${error.message}</p>`;
        }
    }
    
    // --- GESTION DES CATEGORIES (ADMIN) ---
    async function fetchAndDisplayAdminCategories() {
        const categoryAdminContainer = document.querySelector('#gestion-categories-admin .bg-gray-700');
        if(!categoryAdminContainer) return;
        categoryAdminContainer.innerHTML = '<p class="text-gray-400">Chargement des catégories...</p>';
        try {
            // API à créer: GET /api/categories ou GET /api/admin/categories
            // const response = await fetch('http://localhost:3000/api/categories');
            // if (!response.ok) throw new Error("Erreur chargement catégories pour admin.");
            // const data = await response.json();
            // const categories = data.categories || [];
            // Pour l'instant, placeholder:
             const categories = [ {id:1, name: "Miel et Confitures"}, {id:2, name: "Fromages"}]; // Placeholder

            if (categories.length === 0) {
                categoryAdminContainer.innerHTML = '<p class="text-gray-400">Aucune catégorie à afficher.</p>';
            } else {
                 let listHtml = '<ul class="list-disc list-inside space-y-1">';
                 categories.forEach(cat => {
                    listHtml += `<li class="text-gray-300">${cat.name} (ID: ${cat.id}) 
                                    <button class="text-xs text-blue-400 hover:underline ml-2">Modifier</button> 
                                    <button class="text-xs text-red-400 hover:underline ml-1">Supprimer</button>
                                </li>`;
                 });
                 listHtml += '</ul>';
                 categoryAdminContainer.innerHTML = `
                    <div class="mb-4">
                        <button class="bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-3 text-sm rounded-md">+ Ajouter Catégorie</button>
                    </div>
                    ${listHtml}`;
                 // TODO: Attacher les listeners pour les boutons CRUD catégories
            }
        } catch(error) {
             categoryAdminContainer.innerHTML = `<p class="text-red-400">Erreur: ${error.message}</p>`;
        }
    }


    function setActiveAdminSection(targetId) {
        sections.forEach(section => {
            if (section.id === targetId) {
                section.classList.remove('hidden'); section.classList.add('active');
                if (targetId === 'gestion-utilisateurs-admin') { fetchAndDisplayAdminUsers(); }
                else if (targetId === 'gestion-commandes-admin') { fetchAndDisplayAdminOrders(); }
                else if (targetId === 'gestion-produits-admin') { fetchAndDisplayAdminAllProducts(); }
                else if (targetId === 'gestion-categories-admin') { fetchAndDisplayAdminCategories(); }
                // else if (targetId === 'vue-ensemble-admin') { fetchAdminDashboardStats(); } 
            } else {
                section.classList.add('hidden'); section.classList.remove('active');
            }
        });
        sidebarLinks.forEach(link => {
            if (link.getAttribute('href') === `#${targetId}`) { link.classList.add('active'); } 
            else { link.classList.remove('active'); }
        });
    }

    sidebarLinks.forEach(link => {
        link.addEventListener('click', function(event) {
            if (this.getAttribute('href').startsWith('#')) {
                event.preventDefault();
                const targetId = this.getAttribute('href').substring(1);
                setActiveAdminSection(targetId);
                window.location.hash = targetId;
            }
        });
    });

    const defaultAdminSection = 'vue-ensemble-admin';
    let currentHash = window.location.hash.substring(1);
    if (!currentHash || !document.getElementById(currentHash)) {
        currentHash = defaultAdminSection;
        if(window.location.hash && window.location.hash !== `#${defaultAdminSection}`) {
           window.location.hash = defaultAdminSection;
        } else if (!window.location.hash && currentHash === defaultAdminSection) {
           window.location.hash = defaultAdminSection;
        }
    }
    setActiveAdminSection(currentHash);
    
    if(adminLogoutButton) {
        adminLogoutButton.addEventListener('click', async (e) => {
            e.preventDefault();
            if (typeof window.handleLogout === 'function') {
                await window.handleLogout(e);
            } else {
                sessionStorage.removeItem('currentUser'); 
                alert('Déconnexion admin (locale). L\'API backend doit être appelée par main.js.');
                window.location.href = '/connexion.html';
            }
        });
    }
});


 document.addEventListener('DOMContentLoaded', () => {
            // 1. Protection de la page Admin
            const storedUser = sessionStorage.getItem('currentUser');
            let isAdminUser = false;
            let currentAdminId = null;
            if (storedUser) {
                try {
                    const user = JSON.parse(storedUser);
                    if (user.accountType === 'admin') {
                        isAdminUser = true;
                        currentAdminId = user.id; 
                    }
                } catch (e) { console.error("Erreur parsing utilisateur:", e); }
            }

            if (!isAdminUser) {
                alert("Accès non autorisé. Redirection vers la page de connexion.");
                window.location.href = '/connexion.html';
                return; 
            }

            // 2. Logique de navigation et de contenu du panneau admin
            const sidebarNav = document.getElementById('admin-sidebar-nav');
            const mobileMenuButton = document.getElementById('admin-mobile-menu-button');
            const sidebarLinks = document.querySelectorAll('.admin-sidebar a.admin-nav-link');
            const sections = document.querySelectorAll('.admin-section');
            const adminLogoutButton = document.getElementById('admin-logout-button');
            
            // Logique pour le menu mobile de l'admin
            if(mobileMenuButton && sidebarNav) {
                mobileMenuButton.addEventListener('click', () => {
                    sidebarNav.classList.toggle('hidden');
                });
            }

            // Logique pour afficher/masquer les sections
            function setActiveAdminSection(targetId) {
                sections.forEach(section => {
                    if (section.id === targetId) {
                        section.classList.remove('hidden'); section.classList.add('active');
                        // Charger les données pour la section activée
                        if (targetId === 'gestion-utilisateurs-admin') { fetchAndDisplayAdminUsers(); }
                        else if (targetId === 'gestion-commandes-admin') { fetchAndDisplayAdminOrders(); }
                    } else {
                        section.classList.add('hidden'); section.classList.remove('active');
                    }
                });
                sidebarLinks.forEach(link => {
                    if (link.getAttribute('href') === `#${targetId}`) { link.classList.add('active'); } 
                    else { link.classList.remove('active'); }
                });
            }

            // Gérer la navigation par clic et l'état initial
            sidebarLinks.forEach(link => {
                link.addEventListener('click', function(event) {
                    if (this.getAttribute('href').startsWith('#')) {
                        event.preventDefault();
                        const targetId = this.getAttribute('href').substring(1);
                        setActiveAdminSection(targetId);
                        window.location.hash = targetId;
                        // Fermer le menu mobile après clic
                        if (!sidebarNav.classList.contains('md:block')) {
                            sidebarNav.classList.add('hidden');
                        }
                    }
                });
            });

            const defaultAdminSection = 'vue-ensemble-admin';
            let currentHash = window.location.hash.substring(1);
            if (!currentHash || !document.getElementById(currentHash)) {
                currentHash = defaultAdminSection;
                 if(window.location.hash !== `#${defaultAdminSection}`) {
                    window.location.hash = defaultAdminSection;
                 }
            }
            setActiveAdminSection(currentHash);
            

            if(adminLogoutButton) {
                adminLogoutButton.addEventListener('click', async (e) => {
                    e.preventDefault();
                    if (typeof window.handleLogout === 'function') {
                        await window.handleLogout(e);
                    } else {
                        sessionStorage.removeItem('currentUser'); 
                        alert('Déconnexion admin (locale).');
                        window.location.href = '/connexion.html'; 
                    }
                });
            }


            // --- Fonctions de chargement des données pour l'admin ---
            
            const adminUsersTable = document.getElementById('admin-users-table');
            const adminUsersTbody = document.getElementById('admin-users-tbody');
            const adminUsersLoadingMessage = document.getElementById('admin-users-loading-message');
            const adminNoUsersMessage = document.getElementById('admin-no-users-message');
            
            async function fetchAndDisplayAdminUsers() {
                if (!adminUsersTable) return;
                adminUsersLoadingMessage.classList.remove('hidden');
                adminUsersTable.classList.add('hidden');
                adminNoUsersMessage.classList.add('hidden');

                try {
                    const response = await fetch('http://localhost:3000/api/admin/users');
                    if (!response.ok) {
                        const errorData = await response.json().catch(() => ({}));
                        throw new Error(errorData.message || `Erreur HTTP ${response.status}`);
                    }
                    const data = await response.json();
                    const users = data.users || [];

                    adminUsersLoadingMessage.classList.add('hidden');
                    adminUsersTbody.innerHTML = '';
                    if (users.length === 0) {
                        adminNoUsersMessage.classList.remove('hidden');
                    } else {
                        users.forEach(user => {
                            const userRow = `
                                <tr>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-300">${user.id}</td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-300">${user.fullname}</td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-300">${user.email}</td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-300">${user.account_type.charAt(0).toUpperCase() + user.account_type.slice(1)}</td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-300">${new Date(user.created_at).toLocaleDateString('fr-FR')}</td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium table-cell-actions">
                                        ${user.id !== currentAdminId ? 
                                            `<button data-user-id="${user.id}" data-user-name="${user.fullname}" class="admin-delete-user-btn text-red-400 hover:text-red-300">Supprimer</button>` : 
                                            '<span class="text-xs text-gray-500">(Vous)</span>'
                                        }
                                    </td>
                                </tr>`;
                            adminUsersTbody.innerHTML += userRow;
                        });
                        adminUsersTable.classList.remove('hidden');
                        attachAdminUserActionListeners();
                    }
                } catch (error) {
                    adminUsersLoadingMessage.textContent = `Erreur: ${error.message}`;
                    adminUsersLoadingMessage.classList.add('text-red-500');
                }
            }

            function attachAdminUserActionListeners() {
                document.querySelectorAll('.admin-delete-user-btn').forEach(button => {
                    if (button.dataset.listenerAttachedAdminUserDelete) return;
                    button.dataset.listenerAttachedAdminUserDelete = 'true';
                    button.addEventListener('click', async function() {
                        const userIdToDelete = this.dataset.userId;
                        const userName = this.dataset.userName;
                        if (confirm(`Êtes-vous sûr de vouloir supprimer l'utilisateur ${userName} (ID: ${userIdToDelete}) ?`)) {
                            try {
                                const response = await fetch(`http://localhost:3000/api/admin/users/${userIdToDelete}`, { method: 'DELETE' });
                                const responseData = await response.json();
                                if (response.ok) {
                                    alert(responseData.message || 'Utilisateur supprimé.');
                                    fetchAndDisplayAdminUsers();
                                } else {
                                    alert(`Erreur: ${responseData.message || 'Impossible de supprimer.'}`);
                                }
                            } catch (err) {
                                alert('Erreur de communication.');
                            }
                        }
                    });
                });
            }

            async function fetchAndDisplayAdminOrders() {
                // ... La logique pour charger les commandes admin reste la même
            }
            function attachAdminOrderActionListeners() {
                // ... La logique pour les actions sur les commandes reste la même
            }
        });

        // public/js/admin.js

document.addEventListener('DOMContentLoaded', () => {
    // ... (votre code de protection admin et déclarations existantes)

    // NOUVEAUX Éléments pour la gestion des témoignages
    const adminTestimonialsTable = document.getElementById('admin-testimonials-table');
    const adminTestimonialsTbody = document.getElementById('admin-testimonials-tbody');
    const adminTestimonialsLoadingMessage = document.getElementById('admin-testimonials-loading-message');
    const adminNoTestimonialsMessage = document.getElementById('admin-no-testimonials-message');

    // ... (vos fonctions utilitaires existantes)

    // NOUVELLE FONCTION : Charger et afficher les témoignages pour l'admin
    async function fetchAndDisplayAdminTestimonials() {
        if (!adminTestimonialsTable || !adminTestimonialsTbody || !adminTestimonialsLoadingMessage || !adminNoTestimonialsMessage) return;

        adminTestimonialsLoadingMessage.textContent = 'Chargement des témoignages...';
        adminTestimonialsLoadingMessage.classList.remove('hidden', 'text-red-500');
        adminTestimonialsTable.classList.add('hidden');
        adminNoTestimonialsMessage.classList.add('hidden');
        adminTestimonialsTbody.innerHTML = '';

        try {
            // Utilise la même API que le frontend pour récupérer les témoignages,
            // mais l'admin peut voir tous les témoignages ici si vous modifiez la requête GET sur le backend.
            // Pour l'instant, elle retourne les 3 derniers par défaut. Si l'admin doit tout voir,
            // vous aurez besoin d'une route séparée pour l'admin qui ne met pas de LIMIT.
            // Pour cet exemple, je vais appeler une route qui retourne TOUS les témoignages (à créer si besoin, ou modifier l'existante)
            const response = await fetch('http://localhost:3000/api/testimonials'); // Cette route retourne les 3 derniers
            // Si vous voulez que l'admin voie TOUS les témoignages, vous devrez créer une route spécifique sur server.js
            // ex: app.get('/api/admin/testimonials', isAdmin, (req, res) => { const sql = "SELECT * FROM testimonials ORDER BY created_at DESC"; ... });
            // et l'appeler ici : await fetch('http://localhost:3000/api/admin/testimonials');

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: `Erreur HTTP ${response.status}`}));
                throw new Error(errorData.message || `Erreur (${response.status})`);
            }
            const data = await response.json();
            const testimonials = data.testimonials || [];

            adminTestimonialsLoadingMessage.classList.add('hidden');
            if (testimonials.length === 0) {
                adminNoTestimonialsMessage.classList.remove('hidden');
            } else {
                testimonials.forEach(t => {
                    const contentExcerpt = t.content.length > 50 ? t.content.substring(0, 50) + '...' : t.content;
                    const testimonialRow = `
                        <tr>
                            <td class="px-4 py-2 whitespace-nowrap text-sm text-gray-100">${t.id}</td>
                            <td class="px-4 py-2 whitespace-nowrap text-sm text-gray-300">
                                ${t.image_url ? `<img src="${t.image_url}" class="h-8 w-8 rounded-full inline-block mr-2" alt="Photo de ${t.author_name}">` : ''}
                                ${t.author_name}
                            </td>
                            <td class="px-4 py-2 whitespace-nowrap text-sm text-gray-300">${t.author_role || 'N/A'}</td>
                            <td class="px-4 py-2 whitespace-nowrap text-sm text-gray-300">${t.rating} / 5</td>
                            <td class="px-4 py-2 text-sm text-gray-300">${contentExcerpt}</td>
                            <td class="px-4 py-2 whitespace-nowrap text-sm text-gray-300">${new Date(t.created_at).toLocaleDateString('fr-FR')}</td>
                            <td class="px-4 py-2 whitespace-nowrap text-sm font-medium table-cell-actions">
                                <button data-testimonial-id="${t.id}" class="admin-delete-testimonial-btn text-red-400 hover:text-red-300">Supprimer</button>
                            </td>
                        </tr>
                    `;
                    adminTestimonialsTbody.innerHTML += testimonialRow;
                });
                adminTestimonialsTable.classList.remove('hidden');
                attachAdminTestimonialActionListeners();
            }
        } catch (error) {
            console.error("ERREUR fetch témoignages (admin):", error);
            adminTestimonialsLoadingMessage.textContent = `Erreur: ${error.message}`;
            adminTestimonialsLoadingMessage.classList.add('text-red-500');
        }
    }

    // NOUVELLE FONCTION : Attacher les listeners pour les actions sur les témoignages
    function attachAdminTestimonialActionListeners() {
        document.querySelectorAll('.admin-delete-testimonial-btn').forEach(button => {
            if (button.dataset.listenerAttachedAdminTestimonialDelete) return; // Empêcher l'attachement multiple
            button.dataset.listenerAttachedAdminTestimonialDelete = 'true';
            button.addEventListener('click', async function() {
                const testimonialId = this.dataset.testimonialId;
                if (confirm(`Êtes-vous sûr de vouloir supprimer ce témoignage (ID: ${testimonialId}) ? Cette action est irréversible.`)) {
                    try {
                        const response = await fetch(`http://localhost:3000/api/admin/testimonials/${testimonialId}`, {
                            method: 'DELETE'
                        });
                        const responseData = await response.json();
                        if (response.ok) {
                            alert(responseData.message || 'Témoignage supprimé avec succès.');
                            fetchAndDisplayAdminTestimonials(); // Recharger la liste
                        } else {
                            alert(`Erreur: ${responseData.message || 'Impossible de supprimer le témoignage.'}`);
                        }
                    } catch (err) {
                        console.error('ERREUR suppression témoignage (admin):', err);
                        alert('Erreur de communication lors de la suppression du témoignage.');
                    }
                }
            });
        });
    }

  
});

// IMPORTANT : Si vous avez deux document.addEventListener('DOMContentLoaded', ...);
// dans votre admin.js, veuillez les fusionner en un seul pour éviter des comportements inattendus.
// Le code ci-dessus suppose que vous allez l'intégrer dans votre bloc DOMContentLoaded existant.