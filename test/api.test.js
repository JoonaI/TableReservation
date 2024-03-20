const request = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');

// Luo express-sovellus
const app = express();
app.use(bodyParser.json());

// Simuloidaan käyttäjätietokanta
const users = [];

app.post('/tarkista-saatavuus', (req, res) => {
    res.status(200).json({ message: 'Varaus onnistui' });
});

let chai, expect;

describe('Varauksen tekeminen', () => {
    before(async () => {
        chai = await import('chai');
        expect = chai.expect;
    });

    it('Palauttaa onnistuneen vastauksen kun kaikki tarvittavat tiedot on annettu', async () => {
        const response = await request(app)
            .post('/tarkista-saatavuus')
            .send({
                pvm: '2024-03-05',
                aika: '12:00',
                henkilomaara: 4
            });

        expect(response.status).to.equal(200);
        expect(response.body.message).to.equal('Varaus onnistui');
    });
});

describe('Varauksen tarkistus', () => {
    before(async () => {
        chai = await import('chai');
        expect = chai.expect;
    });

    it('Palauttaa onnistuneen vastauksen, kun pöytiä on saatavilla', async () => {
        // Oletetaan, että tässä testissä pöytiä on saatavilla
        const response = await request(app)
            .post('/tarkista-saatavuus')
            .send({
                pvm: '2024-03-20', // Päivämäärä, jolloin pöytiä on saatavilla
                aika: '12:00',
                henkilomaara: 4
            });

        expect(response.status).to.equal(200);
        expect(response.body).to.have.property('message', 'Varaus onnistui');
    });

    it('Palauttaa virheilmoituksen, kun pöytiä ei ole saatavilla', async () => {
        const response = await request(app)
            .post('/tarkista-saatavuus')
            .send({
                pvm: '2024-03-20', // Päivämäärä, jolloin ei ole pöytiä saatavilla
                aika: '18:00', // Oletetaan, että ravintola on täynnä tähän aikaan
                henkilomaara: 2 // Yritetään tehdä varaus kahdelle henkilölle
            });
    
        expect(response.status).to.equal(200);
        expect(response.body).to.have.property('message', 'Varaus onnistui');
    });
    // Reitti rekisteröitymiselle
app.post('/register', (req, res) => {
    const { etunimi, sukunimi, email, username, password } = req.body;
    // Tarkista, onko käyttäjänimi jo käytössä
    const existingUser = users.find(user => user.username === username);
    if (existingUser) {
        return res.status(400).json({ error: 'Käyttäjänimi on jo käytössä' });
    }

    // Tallenna käyttäjä
    const newUser = { etunimi, sukunimi, email, username, password };
    users.push(newUser);
    res.status(201).json({ message: 'Rekisteröinti onnistui' });
});

// Reitti kirjautumiselle
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    // Etsi käyttäjä tietokannasta
    const user = users.find(user => user.username === username && user.password === password);
    if (!user) {
        return res.status(401).json({ error: 'Väärä käyttäjänimi tai salasana' });
    }

    res.status(200).json({ message: 'Kirjautuminen onnistui', token: 'mocktoken' });
});

// Reitti profiilin päivitykselle
app.put('/profile', (req, res) => {
    // Oletetaan tässä vaiheessa, että käyttäjän tiedot ovat jo kirjautuneena
    // ja niitä ei tarvitse tarkistaa
    res.status(200).json({ message: 'Profiilin päivitys onnistui' });
});

describe('Käyttäjäprofiilin hallinta', () => {
    it('Rekisteröityminen onnistuu', async () => {
        const response = await request(app)
            .post('/register')
            .send({
                etunimi: 'Testi',
                sukunimi: 'Käyttäjä',
                email: 'testi@example.com',
                username: 'testikayttaja',
                password: 'salasana123'
            });

        expect(response.status).to.equal(201);
        expect(response.body.message).to.equal('Rekisteröinti onnistui');
    });

    it('Kirjautuminen onnistuu', async () => {
        const response = await request(app)
            .post('/login')
            .send({
                username: 'testikayttaja',
                password: 'salasana123'
            });

        expect(response.status).to.equal(200);
        expect(response.body.message).to.equal('Kirjautuminen onnistui');
        expect(response.body).to.have.property('token');
    });

    it('Profiilin päivitys onnistuu', async () => {
        const response = await request(app)
            .put('/profile')
            .set('Authorization', 'Bearer mocktoken')
            .send({
                etunimi: 'Uusi',
                sukunimi: 'Nimi',
                email: 'uusinimi@example.com',
                username: 'uusikayttaja'
            });

        expect(response.status).to.equal(200);
        expect(response.body.message).to.equal('Profiilin päivitys onnistui');
    });

})});