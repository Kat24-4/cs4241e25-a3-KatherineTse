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
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        await client.close();
    }
}
run().catch(console.dir);

app.post ('/login', (req, res) => {
    console.log(req.body)

    if (req.body.password === 'temp') {
        req.session.login = true

        res.redirect('/app.html')
    } else {
        req.session.login = false
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

const appdata = [
    { "id": 1, "compInfo": "San Francisco Classic 2021", "level": "Platinum", "vaultScore": 8.9, "barScore":  9.1, "beamScore": 9.25, "floorScore": 8.925, "totalScore": 36.175 },
    { "id": 2, "compInfo": "Region 1 Regionals 2018", "level": "Gold", "vaultScore": 9.3, "barScore":  9.225, "beamScore": 9.5, "floorScore": 9.375, "totalScore": 37.4 },
    { "id": 3, "compInfo": "Worcester Invitational 2022", "level": "Diamond", "vaultScore": 8.9, "barScore":  9.1, "beamScore": 9.25, "floorScore": 8.925, "totalScore": 36.175 }
]

let nextID = 4; // track what the next entry ID will be

app.post ('/submit', (req, res) => {
    let dataString = ""

    req.on( "data", function( data ) {
        dataString += data
    })

    req.on( "end", function() {
        const data = JSON.parse( dataString )
        //console.log( data )

        // ... do something with the data here!!!
        if ( data.compInfo && data.level && data.vaultScore && data.barScore && data.beamScore && data.floorScore ) {
            // add new entry or update entry
            const totalScore = Number(data.vaultScore) + Number(data.barScore) + Number(data.beamScore) + Number(data.floorScore)
            data.totalScore = Math.round(totalScore * 1000) / 1000

            if ( data.id ) { // if there is an ID, update the corresponding information
                appdata[data.id - 1] = data;
            } else { // if no existing ID, add new data entry
                let finalData = {"id": nextID, ...data}
                appdata.push( finalData );

                nextID += 1;
            }

            res.writeHead( 200, "OK", {"Content-Type": "text/plain" })
            res.end( JSON.stringify(appdata) )
        } else if ( Number(data) < nextID) {
            // if there is only an ID number, and it is less than the next ID number, delete corresponding data entry
            appdata.splice( (Number(data) - 1), 1 )

            appdata.forEach((entry, index) => {
                entry.id = index + 1;
            });

            nextID -= 1;

            res.writeHead( 200, "OK", {"Content-Type": "text/plain" })
            res.end( JSON.stringify(appdata) )
        } else {
            // if none of the three known actions, throw error
            res.writeHead( 400, "Bad Request", {"Content-Type": "text/plain"} )
            res.end( "400 Error: Bad Request" )
        }
    })
})

app.get('/loadData', (req, res) => {
    res.writeHead( 200, "OK", {"Content-Type": "text/plain" })
    res.end( JSON.stringify(appdata) )
})

app.listen(3000)
