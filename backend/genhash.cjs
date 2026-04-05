const b = require('bcryptjs');
console.log(b.hashSync('Password1!', 10));
