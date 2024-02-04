const bcrypt = require('bcrypt');
const User = require('../models/userModel');

exports.register = async (req, res) => {
  try {
    const { username, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      username,
      password: hashedPassword
    });

    await user.save();
    res.status(201).send('Käyttäjä rekisteröity onnistuneesti');
  } catch (error) {
    res.status(500).send('Server error');
  }
};
