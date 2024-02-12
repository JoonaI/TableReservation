// Vaadi mysql ja luo yhteys:
const mysql = require('mysql');

// Ympäristömuuttujien käyttö konfiguraation määrittämiseen
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'poytavaraus'
};

const connection = mysql.createConnection(dbConfig);

connection.connect(err => {
  if (err) {
    console.error('Virhe yhdistettäessä tietokantaan: ' + err.stack);
    return;
  }
  console.log('Yhdistetty tietokantaan ' + connection.threadId);
});

module.exports = connection;
