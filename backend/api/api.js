//vaaditaan tarvittavat kirjastot
const express = require('express');
const mysql = require('mysql');
const multer = require('multer');
const upload = multer();
const bcrypt = require('bcrypt');
const saltRounds = 10;
const jwt = require('jsonwebtoken');
const JWT_SECRET = 'salainenAvain'; // muokkaa myöhemmin



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
        res.json({ message: 'Käyttäjätiedot päivitetty!' });
    });
});

const path = require('path');
const { error } = require('console');


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

//luodaan reitti hallintapaneeli sivulle siirtymiselle
app.get('/hallintapaneeli', (req, res) => {
    res.sendFile(path.join(__dirname, '/..//../public/hallintapaneeli.html'));
});

// Luodaan reitti pöytävarausten tarkistamiselle
app.post('/tarkista-saatavuus', upload.array(), (req, res) => {
    console.log("BOODI", req.body)
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
    console.log("halutut tiedot: ", haluttuPaivamaara, henkilomaara);
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
        console.log('palvelin results: ', results);
        callback(null, results);
    });
}

// Luodaan reitti pöydän varaamiselle
app.post('/varaa-poyta', (req, res) => {

    // tarkastetaan löytyykö tokenia = onko kirjautunut
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ message: 'Ei tokenia, autorisointi vaaditaan' });
    }

    const token = authHeader.split(' ')[1]; // Otetaan token "Bearer" -sanasta erilleen

    let decoded;
    try {
        decoded = jwt.verify(token, JWT_SECRET);
    } catch (error) {
        return res.status(401).json({ message: 'Virheellinen tai vanhentunut token' });
    }

    const userId = decoded.userId; // Käyttäjän id saadaan puretusta tokenista
    console.log('Tarkistetaan purkamisen jälkeen saatu käyttäjä id:', userId);

    console.log('tarkistetaan pöytä id', req.body);
    console.log('tarkistetaan tyyppi: ', typeof req.body.pöytä_id)

    const pöytä_id = req.body.pöytä_id; // Haetaan varaajan valitsema pöytä ID:n perusteella

    // Päivitetään tietokantaan pöytä varatuksi
    connection.query('UPDATE poytavaraus.pöytä SET on_varattu = 1 WHERE pöytä_id = ?', [pöytä_id], (error, results) => {
        if (error) {
            console.error('Virhe pöydän varaamisessa: ' + error.stack);
            res.status(500).json({ error: 'Pöydän varaaminen epäonnistui' });
            return;
        }
        console.log('results ennen :', results);
        console.log('Pöytä varattu onnistuneesti.', pöytä_id);


        console.log('req.body:', req.body);

        // Lisätään varaus tietokantaan

        const varausData = {
            päivämäärä: req.body.pvm,
            aika: req.body.aika,
            henkilömäärä: req.body.henkilomaara,
            user_id: userId,
            pöytä_id: pöytä_id
        };
        connection.query('INSERT INTO varaus SET ?', varausData, (error, results) => {
            if (error) {
                console.error('Virhe varauksen lisäämisessä: ' + error.stack);
                res.status(500).json({ error: 'Varauksen lisääminen epäonnistui' });
                return;
            }
            console.log('Varaus lisätty onnistuneesti.');
            res.json({ message: 'Pöytä varattu ja varaus lisätty onnistuneesti' });
        });
    });


});

module.exports = {
    haeVapaatPoydat: haeVapaatPoydat
};

//Luodaan reitti varattujen pöytien hakemiselle hallintapaneelia varten
app.get('/varatut-poydat', (req, res) => {
    //tietokantakysely pöytien hakemiseksi
    connection.query('SELECT * FROM poytavaraus.pöytä WHERE on_varattu IS NOT NULL', (error, results) => {
        if (error) {
            console.error('Virhe tietokantakyselyssä: ' + error.stack);
            res.status(500).json({ error: 'Pöytien haku epäonnistui' });
            return;
        }
        console.log('Palautetut pöydät: ', results);
        res.json(results); //palautetaan pöydät JSON-muodossa
    });
});

// Luodaan reitti varauksen muokkaamiselle
app.put('/muokkaa-varausta/:poytaID', (req, res) => {
    const poytaID = req.params.poytaID;
    const { poyta_id, kapasiteetti, lisatiedot } = req.body; // Uudet tiedot pöydälle

    // Päivitetään tietokantaan varaus
    connection.query('UPDATE poytavaraus.pöytä SET pöytä_id = ?, kapasiteetti = ?, lisätiedot = ? WHERE pöytä_id = ?', [poyta_id, kapasiteetti, lisatiedot, poytaID], (error, results) => {
        if (error) {
            console.error('Virhe varauksen muokkaamisessa: ' + error.stack);
            res.status(500).json({ error: 'Varauksen muokkaaminen epäonnistui' });
            return;
        }
        res.json({ message: 'Varaus päivitetty' });
    });
});

// Luodaan reitti varauksen peruuttamiselle
app.post('/peruuta-varaus/:poytaID', (req, res) => {
    const poytaID = req.params.poytaID;
    // Päivitetään tietokantaan pöytä vapaaksi
    connection.query('UPDATE poytavaraus.pöytä SET on_varattu = NULL WHERE pöytä_id = ?', [poytaID], (error, results) => {
        if (error) {
            console.error('Virhe varauksen peruuttamisessa: ' + error.stack);
            res.status(500).json({ error: 'Varauksen peruuttaminen epäonnistui' });
            return;
        }
        res.json({ message: 'Varaus on peruutettu' });
    });
});


//Luodaan reitti rekisteröintilomakkeen lähetykselle: 
app.post('/register', async (req, res) => {
    const { etunimi, sukunimi, email, username, password } = req.body;

    const passwordRegex = /^(?=.*\d)(?=.*[!@#$%^&*])(?=.*[a-z])(?=.*[A-Z]).{8,}$/;
    /*
    if (!passwordRegex.test(password)) {
        return res.status(400).json({ message: 'Salasanan on sisällettävä vähintään yksi numero, yksi erityismerkki, yksi iso kirjain, yksi pieni kirjain ja oltava vähintään 8 merkkiä pitkä.' });
    }
    */

    try {
        // Hasheetaan salasana bcryptillä
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Suoritetaan kysely ja tallennetaan hasheerattu salasana tietokantaan
        const query = `INSERT INTO Users (etunimi, sukunimi, email, username, password) VALUES (?, ?, ?, ?, ?)`;
        connection.query(query, [etunimi, sukunimi, email, username, hashedPassword], (error, results) => {
            if (error) {
                console.error(error);
                res.status(500).json({ message: 'Virhe rekisteröinnissä' });
            } else {
                res.json({ message: 'Rekisteröinti onnistui!' });
            }
        });
    } catch (error) {
        console.error('Salasanan hashauksessa tapahtui virhe:', error);
        res.status(500).json({ message: 'Virhe käyttäjän rekisteröinnissä' });
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
            const comparison = await bcrypt.compare(password, results[0].password);
            if (comparison) {
                //Tulosta käyttäjän id
                console.log('Käyttäjän id:', results[0].user_id);
                // Luodaan token
                const token = jwt.sign({ userId: results[0].user_id, username: username }, JWT_SECRET);
                // Palautetaan token käyttäjälle
                return res.json({ message: 'Kirjautuminen onnistui!', token: token });
            } else {
                return res.status(401).json({ message: 'Väärä salasana' });
            }
        } else {
            return res.status(404).json({ message: 'Käyttäjää ei löydy' });
        }
    });
});

app.post('/logout', (req, res) => {
    res.clearCookie('token'); // Poistetaan token evästeestä
    res.json({ message: 'Uloskirjautuminen onnistui' });
});

//käynnistetään palvelin
app.listen(3000, () => {
    console.log('Palvelin käynnistetty porttiin 3000');
});
