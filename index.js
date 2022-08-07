// Importing modules and framework
require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const {hash, compare } = require('bcrypt');
const bodyParser = require('body-parser');
// Middlewares
const {createToken} = require('./middleware/AuthenticateUser');
const errorHandling = require('./middleware/ErrorHandling');
// Database connection
const db = require('./config/dbconn');
// Express app
const app = express();
// Router
const router = express.Router();
// port 
const port = parseInt(process.env.PORT) || 4000;

app.use(router, cors(), express.json(), express.urlencoded({
    extended: true
}));

app.listen(port, ()=> {
    console.log(`Server is runnin on port ${port}`);
})

// Routers
// Home
router.get('^/$|/jtlaptops', (req, res)=> {
    res.sendFile(path.join(__dirname, 'views', 'readMe.html'))
})
// All users have been retrieved.
router.get('/users', (req, res)=> {
    let strQry =
    `SELECT id, fullname, email, userRole, phonenumber, joinDate, cart
    FROM users`;
    db.query(strQry, (err, results)=> {
        if(err) throw err; 
        res.status(200).json({
            results: results
        })
    });
})
// Display a specific user's information by their id.
router.get('/users/:id', (req, res)=> {
    // Query
    const strQry = 
    `
    SELECT id, fullname, email, userRole, phonenumber, joinDate, cart
    FROM users
    WHERE id = ?;
    `;
    db.query(strQry, [req.params.id], (err, results)=> {
        if(err) throw err;
        res.json({
            status: 200,
            results: (results.length < 1) ? "Sorry, no data was found." : results
        })
    })
});
// Register a new user
router.post('/users', bodyParser.json(), (req, res)=> {
    // Create user object
    let user = {};
    // Retrieving data that was sent by the user
    let {fullname, email, userpassword, userRole, phonenumber, joinDate} = req.body; 
    // If the userRole is null or empty, set it to "user".
    if(userRole.length === 0) {
        if(( userRole.includes() !== 'user' || 
            userRole.includes() !== 'admin'))
            userRole = "user";
    }
    // Check if a user already exists
    let strQry =
    `SELECT id, fullname, email, userpassword, userRole, joinDate
    FROM users
    WHERE LOWER(email) = LOWER('${email}')`;
    db.query(strQry, 
        async (err, results)=> {
        if(err){
            throw err
        }else {
            if(results.length) {
                res.status(409).json({msg: 'User already exist'});
            }else {
                // Encrypting a password
                // Default value of salt is 10. 
                userpassword = await hash(userpassword, 10);
                // It will be used for payload on the JWT.
                user = {
                    id: results[0].id,
                    fullname: results[0].fullname,
                    email: results[0].email,
                    userpassword: results[0].userpassword,
                    userRole: results[0].userRole,
                    joinDate: results[0].joinDate               
                }

                // Query
                strQry = 
                `
                INSERT INTO users(fullname, email, userpassword, userRole, phonenumber, joinDate)
                VALUES(?, ?, ?, ?, ?, ?);
                `;
                db.query(strQry, 
                    [fullname, email, userpassword, userRole, phonenumber, joinDate],
                    (err, results)=> {
                        if(err){
                           throw err;
                        }else {
                            const accessToken = createToken(user);
                            res.status(200).json({msg: `number of affected row is: ${results.affectedRows}`});
                        }
                    })
            }
        }
    });
 });
 // User login
 router.patch('/users', (req, res)=> {
    const { email, userpassword } = req.body;
    console.log(userpassword);
    const strQry = 
    `
    SELECT fullname, email, userpassword, userRole
    FROM users 
    WHERE email = '${email}';
    `;
    db.query(strQry, async (err, results)=> {
        // In case there is an error
        if(err) throw err;
        // When user provide a wrong email
        if(!results.length) {
            res.status(401).json( 
                {msg: 'You provided the wrong email.'} 
            );
        }
        // Authenticating a user
        await compare(userpassword, 
            results[0].userpassword,
            (cmpErr, cmpResults)=> {
            if(cmpErr) {
                res.status(401).json(
                    {
                        msg: 'You provided the wrong password'
                    }
                )
            }
            // Apply a token and it will expire within 1 hr.
            if(cmpResults) {
                const token = 
                jwt.sign(
                    {
                        id: results[0].id,
                        firstname: results[0].firstname,
                        lastname: results[0].lastname,
                        gender: results[0].gender,
                        email: results[0].email
                    },
                    process.env.TOKEN_KEY, 
                    {
                        expiresIn: '1h'
                    }, (err) => {
                        if(err) throw err
                    }  
                );
                // Login
                res.status(200).json({
                    msg: 'Logged in',
                    token,
                    results: results[0]
                })                
            }
        });
    })
 })

// To be able to catch all errors.
app.use(errorHandling);