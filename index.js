const express = require('express');
const app = express();
const cors = require('cors');
const port = process.env.PORT || 5000;
require('dotenv').config();

app.use(cors({
    origin: ['http://localhost:5173'],
    credentials: true,
}));
app.use(express.json())

console.log(process.env.DB_NAME, process.env.DB_PASS)


const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_NAME}:${process.env.DB_PASS}@shimulclaster1.85diumq.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {

        // await client.connect();
        const allUsers = client.db("matrmonyDB").collection("allUsers");

        app.get('/', async (req, res) => {
            res.send('Hello i am ready')
        })

        app.post('/edit-biodata', async (req, res) => {
            try {
                const biodata = req.body;
                const count = await allUsers.estimatedDocumentCount();
                const result = await allUsers.insertOne({biodataId: count + 1, ...biodata})
                console.log(result)
            } catch (error) {
                console.log(error)
            }
        })

        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
    }
}
run().catch(console.dir);

app.listen(port, () => {
    console.log(`Server running at localhost: ${port}`)
})

