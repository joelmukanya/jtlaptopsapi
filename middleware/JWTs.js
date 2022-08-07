// Importing Authentication Middleware
const jwt = require('jsonwebtoken');

function createToken(user){
    const token = jwt.sign({
        fullname: user.fullname,
        email: user.email,
        userpassword: user.userpassword,
        userRole: user.userRole,
        joinDate: user.joinDate
    },
    process.env.Secret_key,
    {
        expiresIn: '1h'
    }, (err)=> {
        if(err) throw err
    }
    );
    return token;
}

module.exports = createToken;