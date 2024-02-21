

function updateHeaderAfterLogin() {
    const token = localStorage.getItem('token');
    if (token) {
        document.getElementById('login-link').style.display = 'none';
        document.getElementById('register-link').style.display = 'none';
        const userSpecificElements = document.querySelectorAll('.user-specific');
        userSpecificElements.forEach(elem => elem.style.display = 'block');
        if (document.getElementById('logout-button')) {
            document.getElementById('logout-button').style.display = 'inline-block';
        }
    } else {
        // Kirjaudu ja Rekisteröidy linkit näkyvät, jos ei tokenia
        document.getElementById('login-link').style.display = 'block';
        document.getElementById('register-link').style.display = 'block';
        const userSpecificElements = document.querySelectorAll('.user-specific');
        userSpecificElements.forEach(elem => elem.style.display = 'none');
        if (document.getElementById('logout-button')) {
            document.getElementById('logout-button').style.display = 'none';
        }
    }
}