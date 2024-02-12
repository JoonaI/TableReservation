//vaaditaan mysql kirjasto:
const mysql = require('mysql');

//luodaan yhteys tietokantaan:
const connection = require('./db.js');

//luodaan käyttäjämalli
const createUserQuery = `CREATE TABLE IF NOT EXISTS Users (
    id INT AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL,
    password VARCHAR(100) NOT NULL,
    PRIMARY KEY (id)
    )`;

    connection.query(createUserQuery, function (error, results, fields) {
        if (error) throw error;
        console.log('Käyttäjämalli luotu!');
    });

//suljetaan yhteys
connection.end();