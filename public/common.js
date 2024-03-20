// Funktio, joka vaihtaa annetun elementin näkyvyyden.
function toggleDisplay(elementId, displayStyle) {
    const element = document.getElementById(elementId); // Etsi elementti ID:n perusteella.
    if (element) {
        element.style.display = displayStyle; // Aseta elementin display-tyyli, jos elementti löytyy.
    }
}

// Funktio, jota kutsutaan joka kerta, kun sivu ladataan.
// Tämä funktio päivittää navigointipalkin oikean näkymän käyttäjän kirjautumistilanteen mukaan.
function updateHeaderAfterLogin() {
    const token = localStorage.getItem('token'); // Haetaan 'token' local storagesta.
    const username = localStorage.getItem('username'); // Haetaan 'username' local storagesta.

    if (token) {
        // Jos käyttäjä on kirjautunut sisään (token löytyy), piilota 'kirjaudu sisään' ja 'rekisteröidy' linkit.
        toggleDisplay('login-link', 'none');
        toggleDisplay('register-link', 'none');

        // Näytä 'kirjaudu ulos' nappi ja muut käyttäjäkohtaiset elementit.
        toggleDisplay('logout-button', 'inline-block');
        document.querySelectorAll('.user-specific').forEach(elem => elem.style.display = 'block');

        // Jos kirjautunut käyttäjä on 'admin', näytä hallinnointilinkit.
        if (username === 'admin') {
            toggleDisplay('profile-link', 'none');
            toggleDisplay('admin-panel-link', 'block');
            toggleDisplay('raportit-link', 'block');
        } else {
            // Jos normaali käyttäjä, piilota hallinnointilinkit ja näytä profiililinkki.
            toggleDisplay('admin-panel-link', 'none');
            toggleDisplay('raportit-link', 'none');
            toggleDisplay('profile-link', 'block');
        }
    } else {
        // Jos käyttäjä ei ole kirjautunut sisään, näytä 'kirjaudu sisään' ja 'rekisteröidy' linkit ja piilota käyttäjäkohtaiset elementit.
        toggleDisplay('login-link', 'block');
        toggleDisplay('register-link', 'block');
        document.querySelectorAll('.user-specific').forEach(elem => elem.style.display = 'none');
        toggleDisplay('logout-button', 'none');
    }

    // Varmista, että kirjautumislomake näytetään, jos käyttäjä ei ole kirjautunut sisään.
    toggleDisplay('login-form-header', token ? 'none' : 'block');
}

// Asetetaan event listener, joka suorittaa updateHeaderAfterLogin-funktion, kun DOM on täysin ladattu.
document.addEventListener('DOMContentLoaded', updateHeaderAfterLogin);
