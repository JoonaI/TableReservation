// Funktio, joka vaihtaa annetun elementin näkyvyyden.
function toggleDisplay(elementId, displayStyle) {
    const element = document.getElementById(elementId);
    if (element) {
        element.style.display = displayStyle;
    }
}

// Funktio, jota kutsutaan joka kerta, kun sivu ladataan.
function updateHeaderAfterLogin() {
    const token = localStorage.getItem('token');
    const username = localStorage.getItem('username');

    if (token) {
        toggleDisplay('login-link', 'none');
        toggleDisplay('register-link', 'none');
        document.querySelectorAll('.user-specific').forEach(elem => elem.style.display = 'block');

        const logoutButton = document.getElementById('logout-button');
        if (logoutButton) {
            logoutButton.style.display = 'inline-block';
            logoutButton.addEventListener('click', function(e) {
                e.preventDefault();
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
                    localStorage.removeItem('username');
                    window.location.href = 'index.html';
                })
                .catch(error => {
                    console.error('Uloskirjautumisessa tapahtui virhe:', error);
                });
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
        document.querySelectorAll('.user-specific').forEach(elem => elem.style.display = 'none');
        toggleDisplay('logout-button', 'none');
    }

    toggleDisplay('login-form-header', token ? 'none' : 'block');
}

document.addEventListener('DOMContentLoaded', updateHeaderAfterLogin);
