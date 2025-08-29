// js/inscription.js
document.addEventListener('DOMContentLoaded', () => {
    const registrationForm = document.getElementById('registration-form');

    // La simulation registeredUsers et isEmailRegistered n'est plus nécessaire ici
    // car le backend se chargera de la vérification d'unicité de l'e-mail.
    // let registeredUsers = [
    //     { email: 'deja@pris.com', fullname: 'Utilisateur Existant', accountType: 'acheteur' }
    // ];
    // function isEmailRegistered(email) {
    //     return registeredUsers.some(user => user.email.toLowerCase() === email.toLowerCase());
    // }

    if (registrationForm) {
        const fullnameError = document.getElementById('fullname-error');
        const emailError = document.getElementById('email-error');
        const passwordError = document.getElementById('password-error');
        const confirmPasswordError = document.getElementById('confirm-password-error');
        const termsError = document.getElementById('terms-error');
        // Vous pourriez vouloir un élément pour afficher les erreurs générales du serveur, par exemple :
        // const generalServerErrorElement = document.getElementById('general-server-error');

        registrationForm.addEventListener('submit', async function(event) { // Ajout de async ici
            event.preventDefault();

            // Cacher les anciens messages d'erreur
            hideErrorMessages([fullnameError, emailError, passwordError, confirmPasswordError, termsError]);
            // if (generalServerErrorElement) hideErrorMessages([generalServerErrorElement]);


            const fullnameInput = document.getElementById('register-fullname');
            const emailInput = document.getElementById('register-email');
            const passwordInput = document.getElementById('register-password');
            const confirmPasswordInput = document.getElementById('register-confirm-password');
            const accountTypeInput = document.querySelector('input[name="account-type"]:checked');
            const termsCheckbox = document.getElementById('terms-conditions');

            const fullname = fullnameInput.value.trim();
            const email = emailInput.value.trim();
            const password = passwordInput.value;
            const confirmPassword = confirmPasswordInput.value;
            const accountType = accountTypeInput ? accountTypeInput.value : null;
            const termsAccepted = termsCheckbox.checked;

            let isValid = true;

            // --- Validation Côté Client (toujours utile pour une expérience utilisateur rapide) ---
            if (fullname === '') {
                displayError(fullnameError, 'Veuillez entrer votre nom complet.');
                isValid = false;
            }

            if (email === '') {
                displayError(emailError, 'Veuillez entrer votre adresse e-mail.');
                isValid = false;
            } else if (!isValidEmail(email)) {
                displayError(emailError, 'Veuillez entrer une adresse e-mail valide.');
                isValid = false;
            }
            // La vérification d'e-mail existant (isEmailRegistered) est retirée ici, le backend s'en charge.

            if (password === '') {
                displayError(passwordError, 'Veuillez entrer un mot de passe.');
                isValid = false;
            } else if (password.length < 8) {
                displayError(passwordError, 'Le mot de passe doit contenir au moins 8 caractères.');
                isValid = false;
            }

            if (confirmPassword === '') {
                displayError(confirmPasswordError, 'Veuillez confirmer votre mot de passe.');
                isValid = false;
            } else if (password !== confirmPassword) {
                displayError(confirmPasswordError, 'Les mots de passe ne correspondent pas.');
                isValid = false;
            }
            
            if (!accountType) {
                console.error("Aucun type de compte sélectionné !");
                // Idéalement, afficher une erreur à l'utilisateur pour le type de compte
                isValid = false;
            }

            if (!termsAccepted) {
                displayError(termsError, 'Vous devez accepter les termes et conditions.');
                isValid = false;
            }

            if (!isValid) {
                return; // Arrêter si la validation côté client échoue
            }

            // --- Si la validation côté client est OK, préparer et envoyer les données au backend ---
            const userData = {
                fullname: fullname,
                email: email,
                password: password, // Le backend hachera ce mot de passe
                accountType: accountType
            };

            try {
                const response = await fetch('http://localhost:3000/api/auth/register', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(userData)
                });

                const responseData = await response.json(); // Toujours essayer de parser le JSON

                if (response.ok) { // Vérifie si le statut HTTP est 2xx (ex: 201 Created)
                    console.log('Inscription réussie (réponse serveur) :', responseData);
                    alert(responseData.message || 'Inscription réussie ! Vous allez être redirigé vers la page de connexion.');
                    registrationForm.reset();
                    window.location.href = 'connexion.html';
                } else {
                    // Gérer les erreurs spécifiques renvoyées par le backend (4xx, 5xx)
                    console.error('Erreur du serveur lors de l\'inscription:', responseData);
                    // Afficher le message d'erreur du serveur.
                    // On peut essayer de le mettre dans le champ email si c'est pertinent, ou un message général.
                    if (responseData.message && responseData.message.toLowerCase().includes('e-mail est déjà utilisé')) {
                        displayError(emailError, responseData.message);
                    } else {
                        // Pour les autres erreurs serveur, une alerte ou un message général
                        alert(`Erreur d'inscription: ${responseData.message || 'Une erreur inconnue est survenue.'}`);
                        // Ou, si vous avez un élément pour les erreurs générales :
                        // displayError(generalServerErrorElement, responseData.message || 'Une erreur inconnue est survenue.');
                    }
                }
            } catch (error) {
                // Gérer les erreurs réseau ou si le serveur est inaccessible
                console.error('Erreur de communication avec le serveur:', error);
                alert('Impossible de joindre le serveur pour l\'inscription. Veuillez réessayer plus tard.');
                // Ou, si vous avez un élément pour les erreurs générales :
                // displayError(generalServerErrorElement, 'Impossible de joindre le serveur. Veuillez réessayer plus tard.');
            }
        });
    }

    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    function displayError(element, message) {
        if (element) {
            element.textContent = message;
            element.classList.remove('hidden');
        }
    }

    function hideErrorMessages(elements) {
        elements.forEach(element => {
            if (element) {
                element.textContent = '';
                element.classList.add('hidden');
            }
        });
    }
});