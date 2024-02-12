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
app.post('/tarkista-saatavuus', (req, res) => {
    // Tässä voit käsitellä pöytävarausten tarkistamiseen liittyvän logiikan
    // Esimerkiksi voit kutsua haeVapaatPoydat-funktiota tässä ja palauttaa sen tulokset
    res.json({ message: 'Pöytävarausten tarkistaminen suoritettu!' });
});

// Funktio, joka hakee vapaana olevat pöydät halutulle päivämäärälle
function haeVapaatPoydat(haluttuPaivamaara, callback) {
    // SQL-kysely vapaana olevien pöytien hakemiseksi halutulle päivämäärälle
    const sql = `
      SELECT p.poyta_id, p.kapasiteetti, p.lisatiedot
      FROM poytavaraus.poyta p
      WHERE p.poyta_id NOT IN (
        SELECT pv.poyta_id
        FROM mydb.poytavaraus pv
        JOIN poytavaraus.varaus v ON pv.varaus_id = v.varaus_id
        WHERE v.paivamaara = ?
      )
    `;
    
    // Suoritetaan kysely
    connection.query(sql, [haluttuPaivamaara], (error, results) => {
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
