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



const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
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
        const manageUsers = client.db("matrmonyDB").collection("manageUsers");
        const premiumRequests = client.db("matrmonyDB").collection("premiumRequests");

        app.get('/', async (req, res) => {
            res.send('Hello i am ready')
        })

        // view biodata api
        app.get('/view-biodata', async (req, res) => {
            try {
                const email = req.query.email;
                const result = await allUsers.findOne({ userEmail: email })
                res.send(result);
            } catch (error) {
                console.log(error)
            }
        })

        // all statistics
        app.get('/statistics', async (req, res) => {
            try {
                const users = await allUsers.estimatedDocumentCount()
                const male = await allUsers.countDocuments({ biodataType : 'male'})
                const female = await allUsers.countDocuments({ biodataType : 'female'})
                const premiumMember = await premiumRequests.estimatedDocumentCount()
                res.send({users, male, female, premiumMember});
            } catch (error) {
                console.log(error)
            }
        })

        // manage users
        app.get('/manage-users', async (req, res) => {
            try {
                const result = await manageUsers.find().toArray();
                res.send(result);
            } catch (error) {
                console.log(error)
            }
        })

        // save all the new account details in db
        app.post('/users', async (req, res) => {
            try {
                const userInfo = req.body;
                const available = await manageUsers.findOne({ email: userInfo.email })
                if (available) {
                    return res.send({message: 'user already in database'})
                }
                const result = await manageUsers.insertOne(userInfo);
                res.send(result);
            } catch (error) {
                console.log(error)
            }
        })

        // premium request api
        app.post('/premium-request', async (req, res) => {
            try {
                const requestedData = req.body
                const query = { userEmail: requestedData.email }
                const updateDoc = {
                    $set: {
                        premiumRequestStatus: 'pending'
                    },
                };
                await allUsers.updateOne(query, updateDoc)
                const result = await premiumRequests.insertOne(requestedData);
                res.send(result);
            } catch (error) {
                console.log(error)
            }
        })

        // save the users biodata 
        app.post('/edit-biodata', async (req, res) => {
            try {
                const biodata = req.body;
                const email = req.query.email;
                const query = {userEmail: email}
                const available = await allUsers.findOne(query);
                if (available) {
                    return res.send({message: 'Email already use. Please Login with a new email and add your biodata.'})
                }
                const count = await allUsers.estimatedDocumentCount();
                const result = await allUsers.insertOne({biodataId: count + 1, ...biodata})
                res.send(result)
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

