//vaaditaan tarvittavat kirjastot
const express = require('express');
const mysql = require('mysql');
const multer = require('multer');
const upload = multer();
const bcrypt = require('bcrypt');
const saltRounds = 10; 


//luodaan uusi express sovellus
const app = express();
app.use(express.urlencoded({ extended: true }));

//käytetään JSON middlewarea jotta voidaan käsitellä JSON dataa:
app.use(express.json());

//käytetään staattista tiedostoa jotta voidaan palvella staattisia tiedostoja:
app.use(express.static(__dirname + '/..//../public'));

//luodaan yhteys tietokantaan
const connection = require('../db.js');

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
      AND (p.on_varattu = 0 OR p.on_varattu IS NULL)
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
app.post('/register', async (req, res) => {
    const {etunimi, sukunimi, email, username, password} = req.body;

    const passwordRegex = /^(?=.*\d)(?=.*[!@#$%^&*])(?=.*[a-z])(?=.*[A-Z]).{8,}$/;

    if (!passwordRegex.test(password)) {
        return res.status(400).json({ message: 'Salasanan on sisällettävä vähintään yksi numero, yksi erityismerkki, yksi iso kirjain, yksi pieni kirjain ja oltava vähintään 8 merkkiä pitkä.' });
    }
    
    try {
        // Hasheetaan salasana bcryptillä
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Suoritetaan kysely ja tallennetaan hasheerattu salasana tietokantaan
        const query = `INSERT INTO Users (etunimi, sukunimi, email, username, password) VALUES (?, ?, ?, ?, ?)`;
        connection.query(query, [etunimi, sukunimi, email, username, hashedPassword], (error, results) => {
            if (error) {
                console.error(error);
                res.status(500).json({message: 'Virhe rekisteröinnissä'});
            } else {
                res.json({message: 'Rekisteröinti onnistui!'});
            }
        });
    } catch (error) {
        console.error('Salasanan hashauksessa tapahtui virhe:', error);
        res.status(500).json({message: 'Virhe käyttäjän rekisteröinnissä'});
    }
});

// Kirjautumisreitti
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    connection.query('SELECT * FROM Users WHERE username = ?', [username], async (error, results) => {
        if (error) {
            return res.status(500).json({ message: 'Virhe tietokannan kyselyssä' });
        }
        if (results.length > 0) {
            // Tarkistetaan, vastaako annettu salasana tietokannassa olevaa hashattua salasanaa
            const comparison = await bcrypt.compare(password, results[0].password);
            if (comparison) {
                // Käyttäjä löytyi ja salasana on oikea
                return res.json({ message: 'Kirjautuminen onnistui!', userId: results[0].id });
            } else {
                // Väärä salasana
                return res.status(401).json({ message: 'Väärä salasana' });
            }
        } else {
            // Käyttäjätunnus ei löydy
            return res.status(404).json({ message: 'Käyttäjää ei löydy' });
        }
    });
});

//käynnistetään palvelin
app.listen(3000, () => {
    console.log('Palvelin käynnistetty porttiin 3000');
});
