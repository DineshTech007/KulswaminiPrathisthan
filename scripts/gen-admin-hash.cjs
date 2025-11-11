const { randomBytes, scryptSync } = require('crypto');

const password = 'Samarth@007';
const salt = randomBytes(16);
const hash = scryptSync(password, salt, 64);

console.log('ADMIN_PASSWORD_SALT_HEX=' + salt.toString('hex'));
console.log('ADMIN_PASSWORD_HASH_HEX=' + hash.toString('hex'));
