function updateHeaderAfterLogin() {
    const token = localStorage.getItem('token');
    if (token) {
        document.getElementById('login-link').style.display = 'none';
        document.getElementById('register-link').style.display = 'none';
        const userSpecificElements = document.querySelectorAll('.user-specific');
        userSpecificElements.forEach(elem => elem.style.display = 'block');
        const logoutButton = document.getElementById('logout-button');
        if (logoutButton) {
            logoutButton.style.display = 'inline-block';
            // Liitetään logout-napin tapahtumankäsittelijä tässä
            logoutButton.addEventListener('click', function(e) {
                e.preventDefault();
                console.log('Logout button clicked'); // Tarkistetaan, suoritetaanko tapahtumankäsittelijää

                fetch('/logout', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    }
                })
                .then(response => response.json())
                .then(data => {
                    alert(data.message);
                    localStorage.removeItem('token');
                    window.location.href = 'index.html'; // Ohjaa käyttäjä etusivulle
                })
                .catch(error => {
                    console.error('Uloskirjautumisessa tapahtui virhe:', error);
                });
            });
        }
        document.getElementById('login-form-header').style.display = 'none'; // Piilota kirjautumislomake, kun käyttäjä on kirjautunut sisään
    } else {
        // Kirjaudu ja Rekisteröidy linkit näkyvät, jos ei tokenia
        document.getElementById('login-link').style.display = 'block';
        document.getElementById('register-link').style.display = 'block';
        const userSpecificElements = document.querySelectorAll('.user-specific');
        userSpecificElements.forEach(elem => elem.style.display = 'none');
        if (document.getElementById('logout-button')) {
            document.getElementById('logout-button').style.display = 'none';
        }
        document.getElementById('login-form-header').style.display = 'block'; // Näytä kirjautumislomake, kun käyttäjä ei ole kirjautunut sisään
    }
}

// Varmistetaan, että updateHeaderAfterLogin suoritetaan jokaisen sivulatauksen yhteydessä
document.addEventListener('DOMContentLoaded', updateHeaderAfterLogin);
