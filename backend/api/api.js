//vaaditaan tarvittavat kirjastot
const express = require('express');
const mysql = require('mysql');
const multer = require('multer');
const upload = multer();

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


// Luodaan reitti rekisteröintisivulle siirtymiseen
app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, '/..//../public/register.html'));
});

// Luodaan reitti yhteystietoihin siirtymiseen
app.get('/contact', (req, res) => {
    res.sendFile(path.join(__dirname, '/..//../public/contact.html'));
});

//luodaan reitti varaus sivulle siirtymiselle
app.get('/reservations', (req, res) => {
    res.sendFile(path.join(__dirname, '/..//../public/reservations.html'));
});

// Luodaan reitti pöytävarausten tarkistamiselle
app.post('/tarkista-saatavuus', upload.array(), (req, res) => {
    console.log("BOODI",req.body)
    const haluttuPaivamaara = req.body.pvm; // Haetaan päivämäärä lomakkeen lähetyksestä
    const henkilomaara = req.body.henkilomaara; // Haetaan henkilömäärä lomakkeen lähetyksestä
    console.log('Saapui tarkista-saatavuus-reitille.');
    console.log('Haluttu päivämäärä:', haluttuPaivamaara); // Lisätään lokituloste
    console.log('Haluttu henkilömäärä:', henkilomaara); // Lisätään lokituloste
    

    haeVapaatPoydat(haluttuPaivamaara, henkilomaara, (error, results) => {
        if (error) {
            console.error('Virhe vapaata pöytää haettaessa: ' + error.stack);
            res.status(500).json({ error: 'Virhe vapaata pöytää haettaessa' });
            return;
        }
        console.log('Haetut vapaat pöydät:', results); // Lisätään lokituloste
        res.json(results); // Palautetaan vapaat pöydät JSON-muodossa
    });
});


// Funktio, joka hakee vapaana olevat pöydät halutulle päivämäärälle ja henkilömäärälle
function haeVapaatPoydat(haluttuPaivamaara, henkilomaara, callback) {
    // SQL-kysely vapaana olevien pöytien hakemiseksi halutulle päivämäärälle ja henkilömäärälle
    console.log("jeps",haluttuPaivamaara, henkilomaara);
    const sql = `
    SELECT p.pöytä_id, p.kapasiteetti, p.lisätiedot
    FROM poytavaraus.pöytä p
    WHERE p.pöytä_id NOT IN (
      SELECT pv.pöytä_id
      FROM mydb.Pöytävaraus pv
      JOIN poytavaraus.varaus v ON pv.varaus_id = v.varaus_id
      WHERE v.päivämäärä = ?
      )
      AND p.kapasiteetti >= ?
    `;
    
    // Suoritetaan kysely
    connection.query(sql, [haluttuPaivamaara, henkilomaara], (error, results) => {
      if (error) {
        console.error('Virhe tietokantakyselyssä: ' + error.stack);
        callback(error, null);
        return;
      }
  
      // Palautetaan kyselyn tulokset

      callback(null, results);
    });
}

module.exports = {
    haeVapaatPoydat: haeVapaatPoydat
};

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
