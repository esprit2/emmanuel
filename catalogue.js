 // La logique pour l'année et le menu mobile est idéalement dans main.js
        // Assurez-vous que main.js est chargé et exécute updateUserSpecificHeader()
        // après le chargement du DOM.

        // Code pour le menu mobile (si pas déjà géré de manière centralisée dans main.js pour cet ID spécifique)
        const mobileMenuButton = document.getElementById('mobile-menu-button');
        const mobileMenu = document.getElementById('mobile-menu');

        if (mobileMenuButton && mobileMenu) {
            mobileMenuButton.addEventListener('click', () => {
                mobileMenu.classList.toggle('display');
                const isExpanded = mobileMenuButton.getAttribute('aria-expanded') === 'true' || false;
                mobileMenuButton.setAttribute('aria-expanded', !isExpanded);
            });
        }
        
        // Code pour l'année (si pas déjà géré de manière centralisée dans main.js)
        const currentYearSpan = document.getElementById('current-year');
        if (currentYearSpan) {
            currentYearSpan.textContent = new Date().getFullYear();
        }