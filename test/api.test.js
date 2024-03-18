const request = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');

// Luo express-sovellus
const app = express();
app.use(bodyParser.json());

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
