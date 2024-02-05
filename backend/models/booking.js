//vaaditaan mysql kirjasto:
const mysql = require('mysql');

//luodaan yhteys tietokantaan:
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: '----'
});

//luodaan varausmalli
const createBookingQuery = `CREATE TABLE IF NOT EXISTS Bookings (
    id INT AUTO_INCREMENT,
    tableId INT NOT NULL,
    date DATE NOT NULL,
    time TIME NOT NULL,
    duration INT NOT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY (tableId) REFERENCES Tables(id)
    FOREIGN KEY (userId) REFERENCES Users(id)
    )`;

    connection.query(createBookingQuery, function (error, results, fields) {
        if (error) throw error;
        console.log('Varausmalli luotu!');
    });

//suljetaan yhteys
connection.end();
