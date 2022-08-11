// Importing modules and framework
require('dotenv').config();
const express = require('express');
const path = require('path');
const {hash, compare, hashSync } = require('bcrypt');
// Middlewares
const {createToken, verifyAToken} = require('./middleware/AuthenticateUser');
const {errorHandling} = require('./middleware/ErrorHandling');
const bodyParser = require('body-parser');
const cors = require('cors');
const cookieParser = require('cookie-parser');
// Database connection
const db = require('./config/dbconn');
// Express app
const app = express();
// Router
const router = express.Router();
// port 
const port = parseInt(process.env.PORT) || 4000;
// Set header
app.use((req, res, next)=>{
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "*");
    next();
});
app.use(router, cors(), express.json(), 
    cookieParser(), 
    express.urlencoded({
        extended: true
    })
);
app.listen(port);
// ====================Routers====================
// Home
router.get('^/$|/jtlaptops', (req, res)=> {
    res.sendFile(path.join(__dirname, 'views', 'readMe.html'));
})
// ====================USER====================
// All users have been retrieved.
router.get('/users', (req, res)=> {
    let strQry =
    `SELECT id, fullname, email, userpassword, userRole, phonenumber, joinDate, cart
    FROM users`;
    db.query(strQry, (err, results)=> {
        if(err) throw err; 
        res.status(200).json({
            results: (results.length < 1) ? "Sorry, no data was found." : results
        })
    });
})
// Display a specific user's information by their id.
router.get('/users/:id', (req, res)=> {
    const strQry = 
    `
    SELECT id, fullname, email, userpassword, userRole, phonenumber, joinDate, cart
    FROM users
    WHERE id = ?;
    `;
    db.query(strQry, [req.params.id], (err, results)=> {
        if(err) throw err;
        res.json({
            status: 204,
            results: (results.length < 1) ? "Sorry, no data was found." : results
        })
    })
});
// Register a new user
router.post('/users', bodyParser.json(), async (req, res)=> {
    // Create user object
    let user = {};
    // Retrieving data that was sent by the user
    let {fullname, email, userpassword, userRole, phonenumber, joinDate, cart} = req.body; 
    // If the userRole is null or empty, set it to "user".
    if((userRole === null) || (userRole === undefined)) {
            userRole = "user";
    }
    if((joinDate === null) || (joinDate === undefined)) {
        joinDate = new Date();
    }
    // JWT's payload.
    // Encrypting a password. NB: Default value of salt is 10. 
    userpassword = await hash(userpassword, 10);
    // information that will be used for authentication.
    user = {
        email,
        userpassword
    }
    strQry = 
    `
    INSERT INTO users(fullname, email, userpassword, userRole, phonenumber, joinDate, cart)
    VALUES(?, ?, ?, ?, ?, ?, ?);
    `;
    db.query(strQry,[fullname, email, userpassword, userRole, 
        phonenumber, joinDate, cart],
        (err)=> {
            if(err){
                res.status(400).json({err: "Unable to insert a new record, or this email is already taken."});
            }else {
                const jwToken = createToken(user);
                // Keeping the token for later use
                // After install cookie-parser then we can use res.cookie()
                /*
                    cookie(name, value, {
                        (It will expire in a millisecond = 1000) maxAge:  
                        m * sec * hrs * 1000
                        1 = 24 hrs
                        2 = 48 hrs
                        3 = 72 hrs,
                        httpOnly: true
                    })
                */
                res.cookie( "LegitUser", jwToken, {
                    // 2.592e+8 = 3 days
                    maxAge: 2.592e+8,
                    httpOnly: true
                });
                res.status(200).json({msg: "You are now registered."});
            }
        })
 });
 // Updating user
router.put('/users/:id', bodyParser.json(), (req, res)=> {
    let bd = req.body;
    if(bd.userpassword !== null || bd.userpassword !== undefined){
        bd.userpassword = hashSync(bd.userpassword, 10);
    }
    const strQry = 
    `UPDATE users
     SET ?
     WHERE id = ?`;
    db.query(strQry,[bd, req.params.id], (err)=> {
        if(err) throw err;
        res.status(200).json({
            msg: "The user record was updated."
        });
    })
});
 // User login
 router.patch('/users', bodyParser.json(), (req, res)=> {
    const { email, userpassword } = req.body;
    const strQry = 
    `
    SELECT fullname, email, userpassword, userRole, phonenumber, joinDate, cart
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
        }else {
            // Authenticating a user
            await compare(userpassword, 
                results[0].userpassword,
                (cmpErr, cmpResults)=> {
                if(cmpErr) throw cmpErr 
                //
                const user = {
                    email,
                    userpassword
                };
                jwToken = createToken(user);
                res.cookie( "LegitUser", jwToken, {
                    // 2.592e+8 = 3 days
                    maxAge: 2.592e+8,
                    httpOnly: true
                });
                if(cmpResults) {
                    // Login
                    res.status(200).json({
                        msg: 'Logged in',
                        jwToken,
                        results: results[0]
                    })                
                }else {
                    res.status(200).json({
                        msg: 'Invalid password or you have not registered'
                    })            
                }
            });
        }
    })
 })
// Delete a user 
router.delete('/users/:id', (req, res)=> {
    const strQry = 
    `
    DELETE FROM users 
    WHERE id = ?;
    `;
    db.query(strQry,[req.params.id], (err)=> {
        if(err) throw err;
        res.status(200).json({msg: "A user was deleted."});
    })
})
// ====================CART====================
/*
1. Can add multiple items to cart
2. View cart: No duplicate should be display. User with a matching ID
3. Update cart items: Adding or removing items
4. delete /users/:id/cart Clear cart
======

*/
// Get a cart of a specific user
router.get('/users/:id/cart', (req, res)=> {
    const strQry = 
    `
    SELECT cart
    FROM users
    WHERE id = ?;
    `;
    db.query(strQry,[req.params.id], (err, results)=> {
        if(err) throw err;
        res.status(200).json(
            {results: (results.length < 1) ? "Sorry, no cart is available." : results});
    })
});
// Add a cart for a specific user.
router.post('/users/:id/cart', (req, res)=> {
    /*
        INSERT INTO foo_table (id, foo_ids, name) VALUES (
            1,
            JSON_ARRAY_APPEND(
                '[]',
                '$',
                CAST('{"id": "432"}' AS JSON),
                '$',
                CAST('{"id": "433"}' AS JSON)
            ),
            'jumbo burger'
        );
    */
    const strQry = 
    `UPDATE users
     WHERE id = ?`; 
    db.query(strQry,[req.params.cart, req.params.id], (err, results)=> {
        if(err) throw err;
        res.status(200).json({results: results});
    })
})
// ====================PRODUCTS====================
// Fetch all products.
router.get('/products', (req, res)=> {
    const strQry = 
    `
    SELECT id, title, category, prodDescription, imgURL, price, quantity, availableInStore, userID 
    FROM products;
    `;
    db.query(strQry, (err, results)=> {
        if(err) throw err;
        res.status(200).json(
            {results: (results.length < 1) ? "Sorry, products are not yet available." : results});
    })
})
// Obtain a specific product.
router.get('/products/:id', (req, res)=> {
    const strQry = 
    `
    SELECT id, title, category, prodDescription, imgURL, price, quantity, availableInStore, userID
    FROM products
    WHERE id = ?;
    `;
    db.query(strQry, [req.params.id], (err, results)=> {
        if(err) throw err;
        res.status(200).json(
            {results: (results.length < 1 || 
                results == null) ? "Sorry, this product is not yet available." : results});
    })
})
// Add a new product.
router.post('/products', bodyParser.json(), (req, res)=> {
    const {title, category, prodDescription, imgURL, price,
         quantity, availableInStore, userID} = req.body;
    const strQry = 
    `
    INSERT INTO products(title, category, prodDescription, imgURL, price, quantity, availableInStore, userID)
    VALUES(?, ?, ?, ?, ?, ?, ?, ?);`;
    db.query(strQry, [title, category, prodDescription, imgURL, price, quantity, availableInStore, userID], (err)=> {
        if(err) throw err;
        res.status(200).json({msg: "A product was saved."});
    })
});
// Update product
router.put('/products/:id', bodyParser.json(), (req, res)=> {
    const bd = req.body;
    const strQry = 
    `
    UPDATE products
    SET ?
    WHERE id = ?
    `;
    db.query(strQry, [bd, req.params.id], (err)=> {
        if(err) throw err;
        res.status(200).json({msg: "A product was modified."});
    })
});
// Delete a product.
router.delete('/products/:id', (req, res)=> {
    const strQry = 
    `
    DELETE FROM products
    WHERE id = ?;
    `;
    db.query(strQry, [req.params.id], (err)=> {
        if(err) throw err;
        res.status(200).json({msg: "A product was deleted."});
    })
});
// To be able to catch all errors.
app.use(errorHandling);
module.exports = {
    devServer: {
        Proxy: '*'
    }
}