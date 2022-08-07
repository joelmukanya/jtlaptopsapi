// Importing Authentication Middleware
require('dotenv').config();
const {sign, verify} = require('jsonwebtoken');

function createToken(user) {
    return sign({
        fullname: user.fullname,
        email: user.email,
        userpassword: user.userpassword,
        userRole: user.userRole,
        joinDate: user.joinDate
    },
    process.env.SECRET_KEY,
    {
        expiresIn: '1h'
    });
}
module.exports= {createToken};