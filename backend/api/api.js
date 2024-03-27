//vaaditaan tarvittavat kirjastot
const express = require('express');
const mysql = require('mysql');
const multer = require('multer');
const upload = multer();
const bcrypt = require('bcrypt');
const saltRounds = 10;
const jwt = require('jsonwebtoken');
const schedule = require('node-schedule');
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

// Hae ravintolan aukioloajat
app.get('/paivita-aukioloajat', (req, res) => {
    connection.query('SELECT avausaika, sulkuaika FROM aukiolo', (error, results) => {
        if (error) {
            return res.status(500).json({ message: 'Aukioloaikojen hakeminen epäonnistui' });
        }
        res.json(results);
    });
});

// Päivitä aukioloajat tietokantaan
app.put('/paivita-aukioloajat', (req, res) => {
    const { avausaika, sulkuaika } = req.body;
    console.log('Saapuneet tiedot:', avausaika, sulkuaika); // Lisää tämä rivi

    if (!avausaika || !sulkuaika) {
        return res.status(400).json({ message: 'Aukioloaikoja ei ole annettu' });
    }

    connection.query('UPDATE aukiolo SET avausaika = ?, sulkuaika =?', [avausaika, sulkuaika], (error, results) => {
        if (error) {
            return res.status(500).json({ message: 'Aukioloaikojen päivittäminen epäonnistui' });
        }
        res.json({ message: 'Aukioloajat päivitetty onnistuneesti' });
    });
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


        // Tarkistetaan, etteivät etunimi tai sukunimi sisällä numeroita ja ovat vähintään kaksi merkkiä pitkiä
        if (/\d/.test(etunimi) || etunimi.length < 2) {
            return res.status(400).json({ message: 'Etunimen on oltava vähintään kaksi merkkiä pitkä ja se ei saa sisältää numeroita' });
        }

        if (/\d/.test(sukunimi) || sukunimi.length < 2) {
            return res.status(400).json({ message: 'Sukunimen on oltava vähintään kaksi merkkiä pitkä ja se ei saa sisältää numeroita' });
        }

        // Tarkistetaan, että käyttäjänimen on oltava vähintään kaksi kirjainta eikä se saa koostua pelkästään numeroista
        if (!/^[A-Za-z].*[A-Za-z]+$/.test(username) || /^\d+$/.test(username)) {
            return res.status(400).json({ message: 'Käyttäjänimen tulee sisältää vähintään kaksi kirjainta eikä se voi olla numero' });
        }

        // Tarkista, että käyttäjänimi tai sähköpostiosoite ei ole jo käytössä
        connection.query('SELECT * FROM users WHERE (username = ? OR email = ?) AND user_id != ?', [username, email, userId], (error, results) => {
            if (error) throw error;

            let errors = [];
            if (results.some(user => user.email === email)) {
                errors.push('Sähköpostiosoite on jo käytössä.');
            }
            if (results.some(user => user.username === username)) {
                errors.push('Käyttäjänimi on jo käytössä');
            }

            if (errors.length > 0) {
                return res.status(400).json({ message: errors.join(' ja ') });
            } else {
                // Kaikki tarkistukset menivät läpi, päivitä käyttäjän tiedot
                connection.query('UPDATE users SET etunimi = ?, sukunimi = ?, email = ?, username = ? WHERE user_id = ?', [etunimi, sukunimi, email, username, userId], (updateError, updateResults) => {
                    if (updateError) throw updateError;
                    res.json({ message: 'Käyttäjätiedot päivitetty onnistuneesti' });
                });
            }
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

app.put('/muokkaa-varausta/:varausID', (req, res) => {
    const varausID = req.params.varausID;
    const { päivämäärä, aika, henkilömäärä, erikoispyynnöt, lisätiedot, tilaisuus } = req.body;
    // Oletetaan, että loppumisaika lasketaan aina 2 tuntia varauksen alkamisajankohdasta
    const loppumisaika = new Date(`1970-01-01T${aika}Z`);
    loppumisaika.setHours(loppumisaika.getHours() + 2);
    const loppumisaikaFormatoituna = loppumisaika.toISOString().split('T')[1].substring(0, 5) + ":00";

    // Tarkistetaan, onko päällekkäisyyksiä olemassa olevien varausten kanssa
    const tarkistusQuery = `
        SELECT varaus_id FROM varaus
        WHERE päivämäärä = ? AND NOT (
            loppumisaika <= ? OR aika >= ?
        ) AND varaus_id != ?;
    `;

    connection.query(tarkistusQuery, [päivämäärä, loppumisaikaFormatoituna, aika, varausID], (error, results) => {
        if (error) {
            return res.status(500).json({ error: 'Tietokantavirhe tarkistettaessa päällekkäisyyksiä' });
        }
        if (results.length > 0) {
            // Löytyi päällekkäisyyksiä
            return res.status(409).json({ message: 'Varaus päällekkäin olemassa olevan varauksen kanssa.' });
        } else {
            // Päällekkäisyyksiä ei löytynyt, päivitetään varaus
            const päivitysQuery = 'UPDATE varaus SET päivämäärä = ?, aika = ?, loppumisaika = ?, henkilömäärä = ?, erikoispyynnöt = ?, lisätiedot = ?, tilaisuus = ? WHERE varaus_id = ?';
            connection.query(päivitysQuery, [päivämäärä, aika, loppumisaikaFormatoituna, henkilömäärä, erikoispyynnöt, lisätiedot, tilaisuus, varausID], (updateError, updateResults) => {
                if (updateError) {
                    return res.status(500).json({ error: 'Varauksen päivittäminen epäonnistui.' });
                }
                res.json({ message: 'Varaus päivitetty onnistuneesti.' });
            });
        }
    });
});

// Poistetaan varaus omassa profiilissa
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
                console.error('Virhe varauksen peruuttamisessa: ' + error.stack);
                return res.status(500).json({ error: 'Varauksen peruuttaminen epäonnistui' });
            }
            if (results.affectedRows === 0) {
                return res.status(404).json({ message: 'Varausta ei löytynyt, tai se ei kuulu sinulle' });
            }
            // Onnistuneen varauksen peruutuksen käsittely
            res.json({ message: 'Varaus peruutettu onnistuneesti.' });
        });
    } catch (error) {
        res.status(401).json({ message: 'Virheellinen token' });
    }
});

// Luodaan reitti uuden salasanan asettamiseksi käyttäjän profiilissa tehtynä
app.post('/update-password', async (req, res) => {
    // Otetaan token Authorization-headerista
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ message: 'Token puuttuu' });
    }

    try {
        // Puretaan token ja haetaan siitä userId
        const decoded = jwt.verify(token, JWT_SECRET);
        const userId = decoded.userId;

        const { newPassword } = req.body;
        if (!newPassword) {
            return res.status(400).json({ message: 'Uusi salasana on pakollinen' });
        }

        // Tarkistetaan, täyttääkö uusi salasana vahvuusvaatimukset
        const passwordRegex = /^(?=.*\d)(?=.*[!@#$%^&*])(?=.*[a-z])(?=.*[A-Z]).{8,}$/;
        if (!passwordRegex.test(newPassword)) {
            return res.status(400).json({ message: 'Salasanan on sisällettävä vähintään yksi numero, yksi erityismerkki, yksi iso kirjain, yksi pieni kirjain ja oltava vähintään 8 merkkiä pitkä.' });
        }

        // Salataan uusi salasana bcryptillä
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

        // Päivitetään uusi salasana tietokantaan käyttäjän id:llä
        connection.query('UPDATE Users SET password = ? WHERE user_id = ?', [hashedPassword, userId], (error, results) => {
            if (error) {
                console.error('Virhe salasanan päivittämisessä:', error);
                return res.status(500).json({ message: 'Virhe salasanan päivittämisessä' });
            }
            // Onnistuneen päivityksen käsittely
            res.json({ message: 'Salasana päivitetty onnistuneesti' });
        });
    } catch (error) {
        console.error('Virhe tokenin käsittelyssä:', error);
        res.status(401).json({ message: 'Virheellinen tai vanhentunut token' });
    }
});

// Luodaan reitti salasanan resetointi-tokenin luomiseksi ja lähettämiseksi
app.post('/reset-password', async (req, res) => {
    const { email } = req.body;
    if (!email) {
        return res.status(400).json({ message: 'Sähköposti on pakollinen' });
    }

    connection.query('SELECT * FROM Users WHERE email = ?', [email], async (error, results) => {
        if (error || results.length === 0) {
            return res.status(404).json({ message: 'Sähköpostiosoitetta ei löydy' });
        }
        const user = results[0];

        // Luo resetointi-token ja sen vanhentumisaika
        const resetToken = jwt.sign({ userId: user.user_id }, JWT_SECRET, { expiresIn: '1h' });

        // Lähetä sähköposti käyttäjälle
        const resetLink = `http://localhost:3000/new-password-page.html?token=${resetToken}`;
        await sendEmail(
            email,
            'Salasanan resetointi',
            'Olet pyytänyt salasanasi resetointia. Voit vaihtaa salasanasi käyttämällä alla olevaa linkkiä.',
            `<p>Voit vaihtaa salasanasi käyttämällä <a href="${resetLink}">tätä linkkiä</a>. Linkki on voimassa 1 tunnin.</p>`
        );

        res.json({ message: 'Mikäli sähköpostiosoitteellasi on luotu tili, saat pian linkin salasanan resetointiin.' });
    });
});

// Luodaan reitti uuden salasanan asettamiseksi
app.post('/new-password', async (req, res) => {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
        return res.status(400).json({ message: 'Token ja uusi salasana ovat pakollisia' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const userId = decoded.userId;

        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

        connection.query('UPDATE Users SET password = ? WHERE user_id = ?', [hashedPassword, userId], (error, results) => {
            if (error) {
                return res.status(500).json({ message: 'Virhe salasanan päivittämisessä' });
            }
            res.json({ message: 'Salasana päivitetty onnistuneesti' });
        });
    } catch (error) {
        res.status(401).json({ message: 'Virheellinen tai vanhentunut token' });
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

// Luodaan reitti aukioloaikojen hakemiselle
app.get('/api/aukioloajat', (req, res) => {
    console.log('Saapui /api/aukioloajat-reitille.');

    haeAukioloajat((error, results) => {
        if (error) {
            console.error('Virhe aukioloaikoja haettaessa: ' + error.stack);
            res.status(500).json({ error: 'Virhe aukioloaikoja haettaessa' });
            return;
        }
        console.log('Haetut aukioloajat:', results); // Lisätään lokituloste
        res.json(results); // Palautetaan aukioloajat JSON-muodossa
    });
});

function haeAukioloajat(callback) {
    console.log("Haetaan aukioloaikoja.");

    const sql = `
    SELECT avausaika, sulkuaika
        FROM aukiolo
        LIMIT 1
    `;

    // Suoritetaan kysely
    connection.query(sql, (error, results) => {
        if (error) {
            console.error('Virhe tietokantakyselyssä: ' + error.stack);
            callback(error, null);
            return;
        }
        // Palautetaan kyselyn tulokset
        console.log('palvelin results: ', results);
        callback(null, results[0]);
    });
}


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
    (? >= DATE_ADD(v.aika, INTERVAL -2 HOUR) AND ? < v.loppumisaika)
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

    //tarkistetaan isoPoyta arvo
    const isoPoyta = req.body.iso_poyta === 1 ? true : false;
    // Lisätään varaus tietokantaan
    const aika = req.body.aika;
    const loppumisaika = new Date(`1970-01-01T${aika}Z`); // Lisätään varauksen loppumisaika
    loppumisaika.setHours(loppumisaika.getHours() + 2); // Lisätään varauksen loppumisaika
    const erikoispyynnot = req.body.erikoispyynnot;
    const lisatiedot = req.body.lisatiedot;
    const tilaisuus = req.body.tilaisuus;

    const varausData = {
        päivämäärä: req.body.pvm,
        aika: req.body.aika,
        loppumisaika: loppumisaika.toISOString().split('T')[1].split('Z')[0],
        henkilömäärä: req.body.henkilomaara,
        user_id: userId,
        pöytä_id: pöytä_id,
        erikoispyynnöt: erikoispyynnot,
        lisätiedot: lisatiedot,
        tilaisuus: tilaisuus,
        iso_poyta: isoPoyta
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
    connection.query('SELECT p.*, v.päivämäärä, v.aika, v.varaus_id, v.erikoispyynnöt, v.lisätiedot, v.tilaisuus FROM poytavaraus.pöytä p JOIN poytavaraus.varaus v ON p.pöytä_id = v.pöytä_id', (error, results) => {
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
    const { päivämäärä, aika, henkilömäärä, pöytä_id } = req.body; // Uudet tiedot varaukselle

    // Päivitetään tietokantaan varaus
    connection.query('UPDATE poytavaraus.pöytä SET pöytä_id = ?, kapasiteetti = ?, lisätiedot = ? WHERE pöytä_id = ?', [poyta_id, kapasiteetti, lisatiedot, poytaID], (error, results) => {
        if (error) {
            console.error('Virhe varauksen muokkaamisessa: ' + error.stack);
            res.status(500).json({ error: 'Varauksen muokkaaminen epäonnistui' });
            return;
        }

        connection.query('SELECT email FROM poytavaraus.users WHERE user_id = (SELECT user_id FROM poytavaraus.varaus WHERE varaus_id = ?)', [varausID], (error, emailResults) => {
            if (error) {
                console.error('Virhe käyttäjän sähköpostiosoitteen haussa: ' + error.stack);
                return res.status(500).json({ error: 'Sähköpostiosoitteen haku epäonnistui' });
            } else if (emailResults.length > 0) {
                const userEmail = emailResults[0].email;
                const formattedDate = new Date(päivämäärä).toISOString().split('T')[0].split('-').reverse().join('.'); // muuttaa päivämäärän muotoon pp.kk.vvvv
                const formattedTime = aika.slice(0, 5); // poistaa sekunnit kellonajasta

                const emailHtml = `
                    <h1>Olet muokannut varaustasi</h1>
                    <p>Alla päivitetyt varauksen tiedot:</p>
                    <p>Pöytä: ${pöytä_id}</p>
                    <p>Päivämäärä: ${formattedDate}</p>
                    <p>Kellonaika: ${formattedTime}</p>
                    <p>Voit tarkastella tai muokata varaustasi vielä profiilistasi.</p>
                `;

                sendEmail(
                    userEmail,
                    'Varauksesi on päivitetty',
                    'Olet muokannut varaustasi. Alla uudet varauksen tiedot.',
                    emailHtml
                ).then(() => {
                    return res.json({ message: 'Varaus päivitetty ja sähköposti lähetetty.' });
                }).catch(error => {
                    console.error('Sähköpostin lähetys epäonnistui: ' + error);
                    return res.status(500).json({ error: 'Sähköpostin lähetys epäonnistui' });
                });
            } else {
                console.error('Käyttäjän sähköpostiosoite ei löytynyt.');
                return res.status(404).json({ message: 'Käyttäjän sähköpostiosoite ei löytynyt.' });
            }
        });
    });
});

// Luodaan reitti varauksen peruuttamiselle
app.post('/peruuta-varaus/:varausID', (req, res) => {
    const varausID = req.params.varausID;

    // Ensin haetaan varauksen tiedot käyttäjän sähköpostiosoitteen hankkimiseksi
    connection.query('SELECT * FROM varaus JOIN users ON varaus.user_id = users.user_id WHERE varaus_id = ?', [varausID], (selectError, varausResults) => {
        if (selectError) {
            console.error('Virhe varauksen haussa: ' + selectError.stack);
            return res.status(500).json({ error: 'Varauksen haku epäonnistui' });
        }
        if (varausResults.length === 0) {
            return res.status(404).json({ message: 'Varausta ei löytynyt' });
        }

        // Oletetaan, että sähköposti on haettu käyttäjän ja varauksen yhdistävistä tiedoista
        const userEmail = varausResults[0].email;
        if (!userEmail) {
            return res.status(404).json({ message: 'Varaukseen liittyvän käyttäjän sähköpostiosoitetta ei löytynyt' });
        }

        // Tämän jälkeen poistetaan varaus tietokannasta
        connection.query('DELETE FROM varaus WHERE varaus_id = ?', [varausID], (deleteError, deleteResults) => {
            if (deleteError) {
                console.error('Virhe varauksen peruuttamisessa: ' + deleteError.stack);
                return res.status(500).json({ error: 'Varauksen peruuttaminen epäonnistui' });
            }
            if (deleteResults.affectedRows === 0) {
                return res.status(404).json({ message: 'Varausta ei löytynyt' });
            }

            // Lähetetään sähköposti käyttäjälle varauksen peruutuksesta
            const emailHtml = `
                <h1>Henkilökuntamme on peruuttanut varauksesi</h1>
                <p>Pahoittelemme, mutta olemme joutuneet peruuttamaan varauksesi meidän ravintolassamme. Jos tarvitset lisätietoja tai haluat tehdä uuden varauksen, olethan yhteydessä henkilökuntaamme.</p>
                <p>Voit ottaa meihin yhteyttä sähköpostitse tai puhelimitse. Kaikki yhteystietomme löydät verkkosivuiltamme.</p>
            `;


            sendEmail(
                userEmail,
                'Varauksesi on peruutettu',
                'Olet peruuttanut varauksesi meidän ravintolassamme.',
                emailHtml
            ).then(() => {
                res.json({ message: 'Varaus peruutettu ja sähköposti lähetetty.' });
            }).catch(emailError => {
                console.error('Sähköpostin lähetys epäonnistui: ' + emailError);
                res.status(500).json({ error: 'Sähköpostin lähetys epäonnistui' });
            });
        });
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

        connection.query('SELECT v.päivämäärä, v.aika, u.email, v.pöytä_id FROM poytavaraus.varaus v JOIN poytavaraus.users u ON v.user_id = u.user_id WHERE v.varaus_id = ?', [varausID], (error, results) => {
            if (error) {
                console.error('Virhe käyttäjän sähköpostiosoitteen haussa: ' + error.stack);
                // Tässä voi päättää, mitä tehdä jos sähköpostiosoitteen haku epäonnistuu.
                res.status(500).json({ error: 'Sähköpostin lähetys epäonnistui' });
            } else if (results.length > 0) {
                const { päivämäärä, aika, email, pöytä_id } = results[0];
                const formattedDate = päivämäärä.toISOString().split('T')[0].split('-').reverse().join('.'); // muuttaa päivämäärän muotoon pp:kk:vvvv
                const formattedTime = aika.slice(0, 5); // poistaa sekunnit kellonajasta

                const emailHtml = `
                    <h1>Henkilökunta on vahvistanut varauksesi</h1>
                    <p>Alla varauksen tiedot:</p>
                    <p>Pöytä: ${pöytä_id}</p>
                    <p>Päivämäärä: ${formattedDate}</p>
                    <p>Kellonaika: ${formattedTime}</p>
                    <p>Odotamme innolla tapaamistasi!</p>
                `;

                sendEmail(
                    email,
                    'Varauksesi on vahvistettu',
                    'Henkilökunta on vahvistanut varauksesi. Voit tarkastella varauksen tietoja profiilissasi.',
                    emailHtml
                ).then(() => {
                    return res.json({ message: 'Varaus vahvistettu ja sähköposti lähetetty.' });
                }).catch(error => {
                    console.error('Sähköpostin lähetys epäonnistui: ' + error);
                    return res.status(500).json({ error: 'Sähköpostin lähetys epäonnistui' });
                });
            } else {
                console.error('Käyttäjän sähköpostiosoite ei löytynyt.');
                res.status(404).json({ message: 'Käyttäjän sähköpostiosoite ei löytynyt.' });
            }
        });
    });
});

// Lisätään funktio muistutusten lähettämiseen tulevista varauksista
function sendReservationReminders() {
    const twoHoursLater = new Date();
    twoHoursLater.setHours(twoHoursLater.getHours() + 2);

    const query = `
        SELECT v.varaus_id, u.email, v.päivämäärä, v.aika
        FROM varaus v
        JOIN users u ON v.user_id = u.user_id
        WHERE v.päivämäärä = CURDATE() AND 
              v.aika BETWEEN CURTIME() AND ADDTIME(CURTIME(), '2:00:00');
    `;

    connection.query(query, (error, results) => {
        if (error) {
            console.error('Virhe varauksien haussa: ', error);
            return;
        }

        results.forEach(varaus => {
            const emailHtml = `
                <h1>Muistutus varauksestasi</h1>
                <p>Muistutamme, että sinulla on varaus ravintolassamme tänään klo ${varaus.aika.substring(0, 5)}.</p>
                <p>Jos sinulla on kysyttävää varauksestasi, ota meihin yhteyttä.</p>
            `;

            sendEmail(
                varaus.email,
                'Muistutus tulevasta varauksestasi',
                'Sinulla on varaus meidän ravintolassamme tänään.',
                emailHtml
            );
        });
    });
}

// Aikataulutetaan muistutusten lähetys suoritettavaksi viisi minuuttia yli jokaisen täyden tunnin
schedule.scheduleJob('5 * * * *', function () {
    console.log('Suoritetaan varausmuistutusten lähetys joka tunti viisi minuuttia yli...');
    sendReservationReminders();
});

// Luodaan reitti suosituimpien varausaikojen hakemiselle
app.get('/raportit/suosituimmat-ajat', (req, res) => {
    const sql = `
        SELECT 
            DAYNAME(päivämäärä) as viikonpäivä, 
            DATE_FORMAT(aika, '%H:%i') as kellonaika, 
            COUNT(*) AS varauksien_maara, 
            AVG(henkilömäärä) AS keskiarvo_henkilomaara
        FROM varaus
        WHERE päivämäärä BETWEEN DATE_SUB(NOW(), INTERVAL 1 MONTH) AND NOW()
        GROUP BY DAYNAME(päivämäärä), DATE_FORMAT(aika, '%H:%i')
        ORDER BY varauksien_maara DESC, kellonaika
        LIMIT 10;
    `;
    connection.query(sql, (error, results) => {
        if (error) {
            res.status(500).json({ message: 'Tietokantavirhe', error: error });
        } else {
            res.json(results);
        }
    });
});

app.get('/api/kokonais-tilastot', (req, res) => {
    const sql = `
        SELECT 
            COUNT(*) as kokonais_varaukset,
            SUM(henkilömäärä) as kokonais_kävijät
        FROM varaus;
    `;

    connection.query(sql, (error, results) => {
        if (error) {
            console.error('Virhe tietokantakyselyssä: ', error);
            return res.status(500).json({ error: 'Virhe tietokantakyselyssä' });
        }

        // Oletetaan, että kysely palauttaa yhden rivin, joka sisältää kokonaistiedot
        const data = results[0];
        res.json({
            kokonaisVaraukset: data.kokonais_varaukset,
            kokonaisKavijat: data.kokonais_kävijät
        });
    });
});


// Luodaan reitti viime viikon varauksien tilastotietojen hakemiselle
app.get('/api/viikon-tilastot', (req, res) => {
    const sql = `
        SELECT 
            DATE_FORMAT(päivämäärä, '%Y-%m-%d') as päivä, 
            COUNT(*) as varauksien_määrä, 
            SUM(henkilömäärä) as henkilöitä_yhteensä
        FROM varaus
        WHERE päivämäärä BETWEEN DATE_SUB(CURDATE(), INTERVAL 1 WEEK) AND CURDATE()
        GROUP BY päivä
        ORDER BY päivä ASC;
    `;

    connection.query(sql, (error, results) => {
        if (error) {
            console.error('Virhe tietokantakyselyssä: ', error);
            return res.status(500).json({ error: 'Virhe tietokantakyselyssä' });
        }

        // Lasketaan yhteenlasketut arvot viikolle
        let kavijatYhteensa = 0;
        let varauksetYhteensa = 0;
        results.forEach(r => {
            kavijatYhteensa += r.henkilöitä_yhteensä;
            varauksetYhteensa += r.varauksien_määrä;
        });

        const varauksiaKeskimäärin = varauksetYhteensa / results.length;

        // Palautetaan lasketut arvot ja päiväkohtaiset tiedot
        res.json({
            kavijatYhteensa,
            varauksetYhteensa,
            varauksiaKeskimäärin,
            päiväkohtaisetTiedot: results
        });
    });
});


//Luodaan reitti rekisteröintilomakkeen lähetykselle: 
app.post('/register', async (req, res) => {
    const { etunimi, sukunimi, email, username, password } = req.body;

    //tarkistetaan onko käyttäjänimi tai salasana jo käytössä
    connection.query('SELECT * FROM Users WHERE username = ? OR email = ?', [username, email], async (error, results) => {
        if (error) {
            console.error(error);
            return res.status(500).json({ message: 'Virhe tietokannan kyselyssä' });
        }

        if (results.length > 0) {
            // Käyttäjänimi tai sähköpostiosoite on jo käytössä
            return res.status(400).json({ message: 'Käyttäjänimi tai sähköpostiosoite on jo käytössä' });
        }

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
                    res.status(500).json({ message: 'Virhe rekisteröinnissä' });
                } else {
                    res.json({ message: 'Rekisteröinti onnistui!', redirectUrl: '/login.html' });
                }
            });
        } catch (error) {
            console.error('Salasanan hashauksessa tapahtui virhe:', error);
            res.status(500).json({ message: 'Virhe käyttäjän rekisteröinnissä' });
        }
    });
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


module.exports = app;
