//vaaditaan tarvittavat kirjastot
const express = require('express');
const mysql = require('mysql');

//luodaan uusi express sovellus
const app = express();
app.use(express.urlencoded({ extended: true }));

//käytetään JSON middlewarea jotta voidaan käsitellä JSON dataa:
app.use(express.json());

//käytetään staattista tiedostoa jotta voidaan palvella staattisia tiedostoja:
app.use(express.static(__dirname + '/..//../public'));

//luodaan yhteys tietokantaan
const connection = mysql.createConnection({
  host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'poytavaraus'
});

//Luodaan reitti käyttäjätietojen hakuun
app.get('/users/:id', (req, res) => {
    const userId = req.params.id;
    connection.query('SELECT * FROM Users WHERE id = ?', [userId], (error, results) => {
        if (error) throw error;
        res.json(results[0]);
    });
});

//Luodaan reitti käyttäjätietojen lisäämiseen
app.put('/user/:id', (req, res) => {
    const userId = req.params.id;
    const updateUser = req.body;
    connection.query('UPDATE Users SET ? WHERE id = ?', [updateUser, userId], (error, results) => {
        if (error) throw error;
        res.json({message: 'Käyttäjätiedot päivitetty!'});
    });
});

const path = require('path');

// Luodaan reitti varaukset-sivulle siirtymiseen
app.get('/varaukset', (req, res) => {
    // Lähetä varauslomakkeen sivu
    res.sendFile(path.join(__dirname, '/..//../public/varaukset.html'));
});

// Luodaan reitti rekisteröintisivulle siirtymiseen
app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, '/..//../public/register.html'));
});

//Luodaan reitti rekisteröintilomakkeen lähetykselle: 
app.post('/register', (req, res) => {
    const {etunimi, sukunimi, email, username, password} = req.body;
    console.log('Received data:', {etunimi, sukunimi, email, username, password}); //Tulostetaan konsoliin saadut tiedot tarkistamista varten
    //Luodaan SQL-kysely joka lisää käyttäjän tietokantaan:
    const query = `INSERT INTO Users (etunimi, sukunimi, email, username, password) VALUES (?, ?, ?, ?, ?)`;

    //Suoritetaan kysely:
    connection.query(query, [etunimi, sukunimi, email, username, password], (error, results) => {
        if (error) {
            //Jos tulee virhe, lähetetään virheilmoitus
            console.error(error);
            res.status(500).json({message: 'Virhe rekisteröinnissä'});
        } else {
            //Jos rekisteröinti onnistuu, lähetetään onnistumisilmoitus
            res.json({message: 'Rekisteröinti onnistui!'});
        }
    });
});
//käynnistetään palvelin
app.listen(3000, () => {
    console.log('Palvelin käynnistetty porttiin 3000');
});
