const bcrypt = require('bcryptjs');

const HASH_ROUNDS = 10;

const hashPassword = async (plain) => {
  const salt = await bcrypt.genSalt(HASH_ROUNDS);
  return bcrypt.hash(plain, salt);
};

const comparePassword = (plain, hash) => bcrypt.compare(plain, hash);

module.exports = {
  hashPassword,
  comparePassword
};

















