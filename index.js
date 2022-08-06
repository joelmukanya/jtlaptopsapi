// Importing modules and framework
require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');
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
// Users
router.get('^/$|/jtlaptops', (req, res)=> {
    res.sendFile(path.join(__dirname, 'views', 'readMe.html'))
})