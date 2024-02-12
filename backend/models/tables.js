//vaaditaan mysql kirjasto: 
const mysql = require('mysql');

//luodaan yhteys:
const connection = require('./db.js');

//luodaan pöytämalli
const createTableQuery = `CREATE TABLE IF NOT EXISTS Tables (
    id INT AUTO_INCREMENT,
    number INT NOT NULL,
    capacity INT NOT NULL,
    isAvailable BOOLEAN DEFAULT true,
    PRIMARY KEY (id)
    )`;

    connection.query(createTableQuery, (error, results, fields) => {
        if (error) throw error;
        console.log('Pöytämalli luotu!');
    });

//suljetaan yhteys
    connection.end();
    