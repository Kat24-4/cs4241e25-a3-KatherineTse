const express = require('express'),
      cookie = require('cookie-session'),
      hbs = require('express-handlebars').engine,
      { MongoClient, ObjectId } = require('mongodb'),
      app = express();

app.use(express.json());
app.use(express.urlencoded({extended: true}));

app.engine('handlebars', hbs())
app.set('view engine', 'handlebars');
app.set('views', __dirname + '/views');

app.use(cookie({
    name: 'session',
    keys: ['tempKey1', 'tempKey2']
}))

app.use(express.static('public'))

require('dotenv').config();

const uri = `mongodb+srv://${process.env.MDB_USER}:${process.env.MDB_PASS}@${process.env.MDB_HOST}`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri);

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();
        // Send a ping to confirm a successful connection
        await client.db("a3").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } catch {
        // Ensures that the client will close when you finish/error
        // await client.close();
        console.log("Error: Could not connect to MongoDB!");
    }
}
run().catch(console.dir);

let currUser = "";
let newUser = false;

app.post ('/login', async (req, res) => {
    console.log(req.body)
    const users = await client.db("a3").collection("users"),
        user = await users.find({username: req.body.username}).toArray();
    //console.log(user)

    if (user.length === 0) {
        currUser = req.body.username;
        newUser = true;

        client.db("a3").collection("users").insertOne({username: req.body.username, password: req.body.password})
        .then(result => {
            console.log(result);
            res.redirect('/app.html');
        }) .catch(error => {
            console.error(error);
            res.render('login', {msg: 'Account creation failed! Please try again.', layout:false});
        })

        req.session.login = true;
    } else if (user.length === 1) {
        if (user[0].password === req.body.password) {
            currUser = req.body.username;
            req.session.login = true;

            res.redirect('/app.html');
        } else {
            req.session.login = false;
            res.render('login', {msg:'Login Failed! Incorrect password. Please try again.', layout:false})
        }
    } else {
        console.error('Error: Multiple users with the same username');
        res.render('login', {msg:'Login Failed! Please try again.', layout:false})
    }
})

app.get('/', (req, res) => {
    if(req.session.login === true) {
        res.redirect('/app.html');
    } else {
        res.render('login', {msg:"", layout:false})
    }
})

app.use(function(req, res, next) {
    if( req.session.login === true )
        next()
    else
        res.render('login', {msg:'Login Failed! Please try again.', layout:false})
})

app.get('/app.html', (req, res) => {
    res.render('/app.html')
})

let collection
let comps
let nextID = 4; // track what the next entry ID will be

app.post ('/submit', (req, res) => {
    let dataString = ""

    req.on( "data", function( data ) {
        dataString += data
    })

    req.on( "end", async function() {
        const data = JSON.parse( dataString )
        //console.log( data )

        // ... do something with the data here!!!
        if ( data.compInfo && data.level && data.vaultScore && data.barScore && data.beamScore && data.floorScore ) {
            // add new entry or update entry
            const totalScore = Number(data.vaultScore) + Number(data.barScore) + Number(data.beamScore) + Number(data.floorScore)
            data.totalScore = `${Math.round(totalScore * 1000) / 1000}`

            if ( data.id ) { // if there is an ID, update the corresponding information
                //console.log(data)
                const result = await collection.updateOne({user:currUser, id: data.id}, {$set:{compInfo:data.compInfo, level:data.level, vaultScore:data.vaultScore, barScore:data.barScore, beamScore:data.beamScore, floorScore:data.floorScore, totalScore:data.totalScore}})
                //console.log(result)
            } else { // if no existing ID, add new data entry
                let finalData = {"user": currUser, "id": `${nextID}`, ...data}
                await collection.insertOne(finalData)

                nextID += 1;
            }

            comps = await collection.find({user: currUser}).toArray()
            res.json(comps)
        } else if ( Number(data) < nextID) {
            // if there is only an ID number, and it is less than the next ID number, delete corresponding data entry
            const delRes = await collection.deleteOne({id: data})
            console.log(delRes)

            nextID -= 1;

            for (let i = Number(data); i < nextID; i++) {
                let updateRes = await collection.updateOne({user:currUser, id:`${i+1}`}, {$set:{id:`${i}`}})
                console.log(updateRes)
            }

            comps = await collection.find({user: currUser}).toArray()
            res.json(comps)
        } else {
            // if none of the three known actions, throw error
            res.writeHead( 400, "Bad Request", {"Content-Type": "text/plain"} )
            res.end( "400 Error: Bad Request" )
        }
    })
})

app.get('/loadData', async (req, res) => {
    if (newUser === true) {
        res.writeHead( 200, "OK", {"Content-Type": "text/plain" })
        res.end(JSON.stringify("new"))
    } else {
        collection = await client.db("a3").collection("competitions")
        comps = await collection.find({user: currUser}).toArray()
        res.json(comps)

        nextID = comps.length + 1;
    }
})

app.listen(3000)
