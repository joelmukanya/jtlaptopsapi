// Importing Authentication Middleware
require('dotenv').config();
const {sign, verify} = require('jsonwebtoken');
// Creating a token
function createToken(user) {
    return sign({
        email: user.email,
        userpassword: user.userpassword
    },
    process.env.SECRET_KEY,
    {
        expiresIn: '1h'
    });
}
//
function verifyAToken(req, res, next) {
    try{
        const token = req.cookies["LegitUser"];
        console.log(token);
        const isValid = verify(token, process.env.SECRET_KEY);
        if(isValid) {
            req.authenticated = true;
            next();
        }else {
            res.status(400).json({err: "Do register."})
        }
    }catch(e) {
        res.status(400).json({err: e.message});
    }
}
module.exports= {createToken, verifyAToken};