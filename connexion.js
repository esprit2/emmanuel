// js/connexion.js
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const emailInput = document.getElementById('login-email'); // Défini ici pour être accessible globalement dans ce scope
    const rememberMeCheckbox = document.getElementById('remember-me'); // Défini ici

    // Pré-remplir l'email et cocher la case si l'email a été sauvegardé
    if (emailInput && rememberMeCheckbox) {
        const rememberedEmail = localStorage.getItem('rememberedUserEmail');
        if (rememberedEmail) {
            emailInput.value = rememberedEmail;
            rememberMeCheckbox.checked = true;
        }
    }

    if (loginForm) {
        const emailErrorElement = document.getElementById('login-email-error');
        const passwordErrorElement = document.getElementById('login-password-error');
        const generalErrorElement = document.getElementById('general-login-error');

        loginForm.addEventListener('submit', async function(event) {
            event.preventDefault();

            hideLoginErrorMessages([emailErrorElement, passwordErrorElement, generalErrorElement]);

            // emailInput et rememberMeCheckbox sont déjà définis plus haut dans ce scope
            const passwordInput = document.getElementById('login-password');

            const email = emailInput.value.trim();
            const password = passwordInput.value; 
            const rememberMe = rememberMeCheckbox.checked; // Utilise la variable définie plus haut

            let isValid = true;

            if (email === '') {
                displayLoginError(emailErrorElement, 'Veuillez entrer votre adresse e-mail.');
                isValid = false;
            } else if (!isValidEmailFormat(email)) { 
                displayLoginError(emailErrorElement, 'Format d\'e-mail invalide.');
                isValid = false;
            }

            if (password === '') {
                displayLoginError(passwordErrorElement, 'Veuillez entrer votre mot de passe.');
                isValid = false;
            }

            if (!isValid) {
                return;
            }

            const loginData = {
                email: email,
                password: password
            };

            try {
                const response = await fetch('http://localhost:3000/api/auth/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(loginData)
                });

                const responseData = await response.json();

                if (response.ok) {
                    console.log('Connexion réussie (réponse serveur):', responseData);
                    
                    if (responseData.user) {
                        sessionStorage.setItem('currentUser', JSON.stringify(responseData.user));
                        
                        // Gérer "Se souvenir de moi"
                        if (rememberMe) {
                            localStorage.setItem('rememberedUserEmail', email);
                        } else {
                            localStorage.removeItem('rememberedUserEmail');
                        }
                        
                        // Appeler la fonction globale pour mettre à jour l'en-tête immédiatement
                        if (typeof window.updateUserSpecificHeader === 'function') {
                           window.updateUserSpecificHeader();
                        }
                    }
                    
                    alert(responseData.message || 'Connexion réussie !');
                    
                    // Redirection
                    if (responseData.user && responseData.user.accountType) {
                        if (responseData.user.accountType === 'acheteur') {
                            window.location.href = 'dashboard-acheteur.html#vue-ensemble-acheteur';
                        } else if (responseData.user.accountType === 'vendeur') {
                            window.location.href = 'dashboard-vendeur.html#vue-ensemble-vendeur';
                        } else if (responseData.user.accountType === 'admin') {
                            window.location.href = 'admin.html#vue-ensemble-admin';
                        } else {
                            window.location.href = 'index.html';
                        }
                    } else {
                        window.location.href = 'index.html';
                    }

                } else {
                    console.error('Erreur de connexion (réponse serveur):', responseData);
                    displayLoginError(generalErrorElement, responseData.message || 'Identifiants incorrects ou erreur serveur.');
                }

            } catch (error) {
                console.error('Erreur lors de la communication avec le serveur (connexion):', error);
                displayLoginError(generalErrorElement, 'Impossible de contacter le serveur. Vérifiez votre connexion.');
            }
        });
    }

    function isValidEmailFormat(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    function displayLoginError(element, message) {
        if (element) {
            element.textContent = message;
            element.classList.remove('hidden');
        }
    }

    function hideLoginErrorMessages(elements) {
        elements.forEach(element => {
            if (element) {
                element.textContent = '';
                element.classList.add('hidden');
            }
        });
    }
});
