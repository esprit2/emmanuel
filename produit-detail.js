 // La logique pour l'année et le menu mobile est idéalement dans main.js
        // La logique pour rendre le contenu de cette page dynamique est dans main.js
        const currentYearSpan_pd = document.getElementById('current-year');
        if (currentYearSpan_pd) {
            currentYearSpan_pd.textContent = new Date().getFullYear();
        }

        const mobileMenuButton_pd = document.getElementById('mobile-menu-button');
        const mobileMenu_pd = document.getElementById('mobile-menu');
        if (mobileMenuButton_pd && mobileMenu_pd) {
            mobileMenuButton_pd.addEventListener('click', () => {
                mobileMenu_pd.classList.toggle('hidden');
                const isExpanded = mobileMenuButton_pd.getAttribute('aria-expanded') === 'true' || false;
                mobileMenuButton_pd.setAttribute('aria-expanded', !isExpanded);
            });
        }