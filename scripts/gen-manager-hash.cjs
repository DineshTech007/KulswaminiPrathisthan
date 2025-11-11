const { scryptSync, randomBytes } = require('crypto');
const pwd = 'Manage@123';
const salt = randomBytes(16);
const hash = scryptSync(pwd, salt, 64);
console.log('MANAGER_PASSWORD_SALT_HEX=' + salt.toString('hex'));
console.log('MANAGER_PASSWORD_HASH_HEX=' + hash.toString('hex'));
