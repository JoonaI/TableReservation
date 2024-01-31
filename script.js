document.addEventListener('DOMContentLoaded', function () {
    const mainContent = document.getElementById('main-content');

    function loadPage(page) {
        const mainContent = document.getElementById('main-content');

        if (!mainContent) {
            console.error('mainContent-elementtiä ei löydetty.');
            return;
        }

        fetch(`pages/${page}.html`)
            .then(response => response.text())
            .then(html => {
                mainContent.innerHTML = html;
            })
            .catch(error => console.error('Sivun lataaminen epäonnistui', error));
    }

    const navLinks = document.querySelectorAll('nav a');
    navLinks.forEach(link => {
        link.addEventListener('click', function (event) {
            event.preventDefault();
            const page = link.dataset.page;
            loadPage(page);
        });
    });

    //loadPage('home');
});
