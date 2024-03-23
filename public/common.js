// Funktio, joka vaihtaa annetun elementin näkyvyyden.
function toggleDisplay(elementId, displayStyle) {
    const element = document.getElementById(elementId);
    if (element) {
        element.style.display = displayStyle;
    }
}

// Tämä funktio käsittelee kirjautumislomakkeen lähetyksen.
function handleHeaderLoginFormSubmit(event) {
    event.preventDefault(); // Estetään lomakkeen oletusarvoinen lähetys.
    const username = document.getElementById('header-login-username').value;
    const password = document.getElementById('header-login-password').value;

    fetch('/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
    })
    .then(response => response.json())
    .then(data => {
        if (data.token) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('username', username);
            alert('Kirjautuminen onnistui!');
            updateHeaderAfterLogin(); // Päivitetään otsikko kirjautumisen jälkeen
            window.location.href = 'profile.html'; // Ohjataan käyttäjä profiilisivulle
        } else {
            alert('Kirjautuminen epäonnistui: ' + (data.message || 'Tuntematon virhe'));
        }
    })
    .catch(error => {
        console.error('Kirjautumisessa tapahtui virhe:', error);
    });
}

// Funktio, jota kutsutaan joka kerta, kun sivu ladataan.
function updateHeaderAfterLogin() {
    const token = localStorage.getItem('token');
    const username = localStorage.getItem('username');

    if (token) {
        toggleDisplay('login-link', 'none');
        toggleDisplay('register-link', 'none');
        toggleDisplay('header-login-form', 'none'); // Piilotetaan kirjautumislomake
        document.querySelectorAll('.user-specific').forEach(elem => elem.style.display = 'block');

        const logoutButton = document.getElementById('logout-button');
        if (logoutButton) {
            logoutButton.style.display = 'inline-block';
            logoutButton.addEventListener('click', function(e) {
                e.preventDefault();
                localStorage.removeItem('token');
                localStorage.removeItem('username');
                updateHeaderAfterLogin(); // Päivitetään otsikko uloskirjautumisen jälkeen
                window.location.href = 'index.html'; // Ohjataan käyttäjä etusivulle
            });
        }

        if (username === 'admin') {
            toggleDisplay('profile-link', 'none');
            toggleDisplay('admin-panel-link', 'block');
            toggleDisplay('raportit-link', 'block');
        } else {
            toggleDisplay('admin-panel-link', 'none');
            toggleDisplay('raportit-link', 'none');
            toggleDisplay('profile-link', 'block');
        }
    } else {
        toggleDisplay('login-link', 'block');
        toggleDisplay('register-link', 'block');
        toggleDisplay('header-login-form', 'block'); // Näytetään kirjautumislomake
        document.querySelectorAll('.user-specific').forEach(elem => elem.style.display = 'none');
    }
}

// Lisätään tapahtumakuuntelija kirjautumislomakkeelle, jos se on olemassa.
document.addEventListener('DOMContentLoaded', () => {
    updateHeaderAfterLogin(); // Päivitetään otsikko heti, kun sivu on ladattu.

    const headerLoginForm = document.getElementById('header-login-form');
    if (headerLoginForm) {
        headerLoginForm.addEventListener('submit', handleHeaderLoginFormSubmit);
    }
});
