//vaaditaan tarvittavat kirjastot
const express = require('express');
const mysql = require('mysql');
const multer = require('multer');
const upload = multer();
const bcrypt = require('bcrypt');
const saltRounds = 10;
const jwt = require('jsonwebtoken');
const JWT_SECRET = 'salainenAvain'; // muokkaa myöhemmin
const { sendEmail } = require('../../email/emailService');


require('dotenv').config({ path: '../../.env' });

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

// Haetaan kirjautuneen käyttäjän profiilitiedot
app.get('/profile', (req, res) => {
    const token = req.headers.authorization?.split(' ')[1]; // Oletetaan Bearer token
    if (!token) {
        return res.status(401).json({ message: 'Token puuttuu' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const userId = decoded.userId;

        connection.query('SELECT etunimi, sukunimi, email, username FROM users WHERE user_id = ?', [userId], (error, results) => {
            if (error || results.length === 0) {
                return res.status(500).json({ message: 'Käyttäjän tietojen haku epäonnistui' });
            }
            res.json(results[0]);
        });
    } catch (error) {
        res.status(401).json({ message: 'Virheellinen token' });
    }
});

// Päivitä kirjautuneen käyttäjän profiilitiedot
app.put('/profile', (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ message: 'Token puuttuu' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const userId = decoded.userId;
        const { etunimi, sukunimi, email, username } = req.body;

        connection.query('UPDATE users SET etunimi = ?, sukunimi = ?, email = ?, username = ? WHERE user_id = ?', [etunimi, sukunimi, email, username, userId], (error, results) => {
            if (error) {
                return res.status(500).json({ message: 'Käyttäjän tietojen päivitys epäonnistui' });
            }
            res.json({ message: 'Käyttäjätiedot päivitetty onnistuneesti' });
        });
    } catch (error) {
        res.status(401).json({ message: 'Virheellinen token' });
    }
});

// Hae käyttäjän tekemät varaukset
app.get('/user-reservations', (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ message: 'Token puuttuu' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const userId = decoded.userId;

        const query = 'SELECT * FROM varaus WHERE user_id = ?';
        connection.query(query, [userId], (error, results) => {
            if (error) {
                return res.status(500).json({ message: 'Varausten haku epäonnistui' });
            }
            res.json(results);
        });
    } catch (error) {
        res.status(401).json({ message: 'Virheellinen token' });
    }
});

// Poistetaan käyttäjän tekemä varaus
app.delete('/peruuta-varaus/:varausID', (req, res) => {
    const varausID = req.params.varausID;
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ message: 'Token puuttuu' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const userId = decoded.userId;

        // Varmistetaan, että varaus kuuluu kirjautuneelle käyttäjälle
        const query = 'DELETE FROM varaus WHERE varaus_id = ? AND user_id = ?';
        connection.query(query, [varausID, userId], (error, results) => {
            if (error) {
                return res.status(500).json({ message: 'Varauksen poistaminen epäonnistui' });
            }
            if (results.affectedRows === 0) {
                return res.status(404).json({ message: 'Varausta ei löytynyt, tai se ei kuulu sinulle' });
            }
            res.json({ message: 'Varaus peruutettu onnistuneesti' });
        });
    } catch (error) {
        res.status(401).json({ message: 'Virheellinen token' });
    }
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
    var haluttuPaivamaara = req.body.pvm; // Haetaan päivämäärä lomakkeen lähetyksestä
    var haluttuAika = req.body.aika; // Haetaan aika lomakkeen lähetyksestä
    const henkilomaara = req.body.henkilomaara; // Haetaan henkilömäärä lomakkeen lähetyksestä

    // Muutetaan päivämäärä muotoon 'YYYY-MM-DD'
    var paivamaaraKomponentit = haluttuPaivamaara.split("/");
    haluttuPaivamaara = `${paivamaaraKomponentit[2]}-${paivamaaraKomponentit[1]}-${paivamaaraKomponentit[0]}`;

    // Lisätään sekunnit aikaan
    haluttuAika = haluttuAika + ":00";

    console.log('Saapui tarkista-saatavuus-reitille.');
    console.log('Haluttu päivämäärä:', haluttuPaivamaara); // Lisätään lokituloste
    console.log('Haluttu aika:', haluttuAika); // Lisätään lokituloste
    console.log('Haluttu henkilömäärä:', henkilomaara); // Lisätään lokituloste

    haeVapaatPoydat(haluttuPaivamaara, haluttuAika, henkilomaara, (error, results) => {
        if (error) {
            console.error('Virhe vapaata pöytää haettaessa: ' + error.stack);
            res.status(500).json({ error: 'Virhe vapaata pöytää haettaessa' });
            return;
        }
        console.log('Haetut vapaat pöydät:', results); // Lisätään lokituloste
        res.json(results); // Palautetaan vapaat pöydät JSON-muodossa
    });
});

function haeVapaatPoydat(haluttuPaivamaara, haluttuAika, henkilomaara, callback) {
    console.log("halutut tiedot: ", haluttuPaivamaara, haluttuAika, henkilomaara);

    const sql = `
    SELECT p.pöytä_id, p.kapasiteetti, p.lisätiedot
        FROM pöytä p
        WHERE p.kapasiteetti >= ? AND NOT EXISTS (
        SELECT 1 FROM varaus v
        WHERE p.pöytä_id = v.pöytä_id AND v.päivämäärä = ? AND 
        (? < v.loppumisaika AND ? > v.aika)
    )
    `;

    // Suoritetaan kysely
    connection.query(sql, [henkilomaara, haluttuPaivamaara, haluttuAika, haluttuAika], (error, results) => {
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



    // Lisätään varaus tietokantaan
    const aika = req.body.aika;
    const loppumisaika = new Date(`1970-01-01T${aika}Z`); // Lisätään varauksen loppumisaika
    loppumisaika.setHours(loppumisaika.getHours() + 2); // Lisätään varauksen loppumisaika

    const varausData = {
        päivämäärä: req.body.pvm,
        aika: req.body.aika,
        loppumisaika: loppumisaika.toISOString().split('T')[1].split('Z')[0],
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

        connection.query('SELECT email FROM Users WHERE user_id = ?', [userId], (error, results) => {
            if (error) {
                console.error('Virhe käyttäjän sähköpostiosoitteen haussa: ' + error.stack);
                // Tässä voi päättää, mitä tehdä jos sähköpostiosoitteen haku epäonnistuu.
            } else if (results.length > 0) {
                const userEmail = results[0].email;
                sendEmail(
                    userEmail,
                    'Pöytävarauksesi odottaa vahvistusta',
                    'Pöytävarauksesi on vastaanotettu ja odottaa henkilökunnan vahvistusta.',
                    '<h1>Pöytävarauksesi odottaa vahvistusta</h1><p>Pöytävarauksesi on vastaanotettu ja odottaa henkilökunnan vahvistusta.</p>'
                );
            } else {
                console.error('Käyttäjän sähköpostiosoite ei löytynyt.');
            }
        });


        console.log('Varaus lisätty onnistuneesti.');
        res.json({ message: 'Pöytä varattu ja varaus lisätty onnistuneesti' });
    });
});

module.exports = {
    haeVapaatPoydat: haeVapaatPoydat
};

//Luodaan reitti varattujen pöytien hakemiselle hallintapaneelia varten
app.get('/varatut-poydat', (req, res) => {
    connection.query('SELECT p.*, v.päivämäärä, v.aika, v.varaus_id FROM poytavaraus.pöytä p JOIN poytavaraus.varaus v ON p.pöytä_id = v.pöytä_id', (error, results) => {
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
    // Poistetaan ensin varaukset, jotka liittyvät tähän pöytään
    connection.query('DELETE FROM poytavaraus.varaus WHERE varaus_id = ?', [poytaID], (error, results) => {
        if (error) {
            console.error('Virhe varauksen peruuttamisessa: ' + error.stack);
            res.status(500).json({ error: 'Varauksen peruuttaminen epäonnistui' });
            return;
        }
        res.json({ message: 'Varaus on peruutettu' });
    });
});

// Luodaan reitti varauksen vahvistamiselle
app.put('/vahvista-varaus/:varausID', (req, res) => {
    const varausID = req.params.varausID;

    // Päivitetään tietokantaan varaus ja merkitään se vahvistetuksi
    connection.query('UPDATE poytavaraus.varaus SET on_vahvistettu = 1 WHERE varaus_id = ?', [varausID], (error, results) => {
        if (error) {
            console.error('Virhe varauksen vahvistamisessa: ' + error.stack);
            res.status(500).json({ error: 'Varauksen vahvistaminen epäonnistui' });
            return;
        }

        connection.query('SELECT u.email FROM poytavaraus.users u JOIN poytavaraus.varaus v ON u.user_id = v.user_id WHERE v.varaus_id = ?', [varausID], (error, results) => {
            if (error) {
                console.error('Virhe käyttäjän sähköpostiosoitteen haussa: ' + error.stack);
                // Tässä voi päättää, mitä tehdä jos sähköpostiosoitteen haku epäonnistuu.
                res.status(500).json({ error: 'Sähköpostin lähetys epäonnistui' });
            } else if (results.length > 0) {
                const userEmail = results[0].email;
                sendEmail(
                    userEmail,
                    'Pöytävarauksesi on vahvistettu',
                    'Pöytävarauksesi on nyt vahvistettu.',
                    '<h1>Pöytävarauksesi on vahvistettu</h1><p>Pöytävarauksesi on nyt vahvistettu. Odotamme innolla tapaamistasi!</p>'
                ).then(() => {
                    res.json({ message: 'Varaus vahvistettu ja sähköposti lähetetty.' });
                }).catch(error => {
                    console.error('Sähköpostin lähetys epäonnistui: ' + error);
                    res.status(500).json({ error: 'Sähköpostin lähetys epäonnistui' });
                });
            } else {
                console.error('Käyttäjän sähköpostiosoite ei löytynyt.');
                res.status(404).json({ message: 'Käyttäjän sähköpostiosoite ei löytynyt.' });
            }
        });

        res.json({ message: 'Varaus vahvistettu' });
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
