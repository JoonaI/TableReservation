// Vaadi mysql ja luo yhteys:
const mysql = require('mysql');
const connection = mysql.createConnection({
  host     : 'localhost',
  user     : 'root',
  password : 'root',
  database : 'poytavaraus'
});

connection.connect((err) => {
  if (err) throw err;
  console.log('Yhdistetty tietokantaan!');
});