// js/ajout-utilisateur-admin.js
document.addEventListener('DOMContentLoaded', () => {
    // 1. Protection de la page
    const storedUser = sessionStorage.getItem('currentUser');
    let isAdmin = false;
    if (storedUser) {
        try {
            if (JSON.parse(storedUser).accountType === 'admin') {
                isAdmin = true;
            }
        } catch (e) {
            console.error("Erreur de parsing utilisateur:", e);
        }
    }

    if (!isAdmin) {
        alert("Accès non autorisé.");
        window.location.href = '/connexion.html';
        return;
    }

    // 2. Logique du formulaire
    const addUserForm = document.getElementById('add-user-form');
    if (!addUserForm) return;

    const errorElements = {
        fullname: document.getElementById('admin-add-fullname-error'),
        email: document.getElementById('admin-add-email-error'),
        password: document.getElementById('admin-add-password-error'),
        accountType: document.getElementById('admin-add-account-type-error'),
        general: document.getElementById('general-add-user-error')
    };

    addUserForm.addEventListener('submit', async function(event) {
        event.preventDefault();
        hideAllErrorMessages();

        const fullname = document.getElementById('admin-add-fullname').value.trim();
        const email = document.getElementById('admin-add-email').value.trim();
        const password = document.getElementById('admin-add-password').value;
        const accountType = document.getElementById('admin-add-account-type').value;

        let isValid = true;
        
        if (fullname === '') { displayError(errorElements.fullname, 'Le nom complet est requis.'); isValid = false; }
        if (email === '' || !isValidEmailFormat(email)) { displayError(errorElements.email, 'Une adresse e-mail valide est requise.'); isValid = false; }
        if (password === '' || password.length < 8) { displayError(errorElements.password, 'Un mot de passe d\'au moins 8 caractères est requis.'); isValid = false; }
        if (accountType === '') { displayError(errorElements.accountType, 'Veuillez sélectionner un type de compte.'); isValid = false; }

        if (!isValid) return;
        
        const userData = { fullname, email, password, accountType };

        try {
            // L'API POST /api/admin/users sera à créer sur le serveur
            const response = await fetch('http://localhost:3000/api/admin/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userData)
            });

            const responseData = await response.json();

            if (response.ok) { // 201 Created
                alert(responseData.message || "Utilisateur créé avec succès !");
                addUserForm.reset();
                window.location.href = 'admin.html#gestion-utilisateurs-admin';
            } else {
                displayError(errorElements.general, responseData.message || `Erreur ${response.status}`);
            }
        } catch (error) {
            console.error("Erreur communication avec le serveur (ajout utilisateur):", error);
            displayError(errorElements.general, "Impossible de joindre le serveur. Veuillez réessayer.");
        }
    });

    function isValidEmailFormat(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    function displayError(element, message) {
        if (element) {
            element.textContent = message;
            element.classList.remove('hidden');
        }
    }

    function hideAllErrorMessages() {
        Object.values(errorElements).forEach(el => {
            if (el) {
                el.classList.add('hidden');
                el.textContent = '';
            }
        });
    }
});
