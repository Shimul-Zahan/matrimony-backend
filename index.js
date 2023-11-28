const express = require('express');
const app = express();
const cors = require('cors');
const port = process.env.PORT || 5000;
require('dotenv').config();
const stripe = require("stripe")('sk_test_51OF1GOHUw9AEQwQEvRlzEAUHSGAOeBfwquYTk5W0Z2N0syCZ31WYnu3BeB0StuCuiBP5WBdIh4lqAWbPQZSmcgv4009tnwiwQR');
// sk_test_51OF1GOHUw9AEQwQEvRlzEAUHSGAOeBfwquYTk5W0Z2N0syCZ31WYnu3BeB0StuCuiBP5WBdIh4lqAWbPQZSmcgv4009tnwiwQR
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
        const favouriteCollection = client.db("matrmonyDB").collection("favouriteCollection");
        const requesterCollections = client.db("matrmonyDB").collection("requesterCollections");
        const successStoryCollection = client.db("matrmonyDB").collection("successStoryCollection");

        app.get('/', async (req, res) => {
            res.send('Hello i am ready')
        })

        // get all data
        app.get('/all-users', async (req, res) => {
            try {
                const result = await allUsers.find().sort({age: -1}).toArray()
                res.send(result);
            } catch (error) {
                console.log(error)
            }
        })

        // viewdetails
        app.get('/user/:id', async (req, res) => {
            try {
                const id = req.params.id;
                const result = await allUsers.findOne({_id: new ObjectId(id)})
                res.send(result);
            } catch (error) {
                console.log(error)
            }
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
                const premiumMember = await allUsers.countDocuments({ accountType: 'premium' })
                const totalMarriage = await successStoryCollection.estimatedDocumentCount();
                const totalTk = await requesterCollections.aggregate([
                    {
                        $group: {
                            _id: null,
                            totalRevenue: {
                                $sum: "$paidTk"
                            }
                        }
                    }
                ]).toArray();
                const totalTaka = totalTk.length > 0 ? totalTk[0].totalRevenue: 0
                res.send({users, male, female, premiumMember, totalTaka, totalMarriage});
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

        // favourite biodatas
        app.get('/favourite-biodatas', async (req, res) => {
            try {
                const email = req.query.email;
                console.log(email)
                const result = await favouriteCollection.find({ userEmail : email}).toArray();
                res.send(result);
            } catch (error) {
                console.log(error)
            }
        })

        // manage premium request
        app.get('/manage-premium-request', async (req, res) => {
            try {
                const result = await premiumRequests.find().toArray();
                res.send(result);
            } catch (error) {
                console.log(error)
            }
        })

        // get all contact requested id
        app.get('/contact-request', async (req, res) => {
            try {
                const email = req.query.email
                const result = await requesterCollections.find({ requesterEmail: email }).toArray();
                res.send(result);
            } catch (error) {
                console.log(error)
            }
        })

        // all contact request for admin 
        app.get('/contact-request-for-admin', async (req, res) => {
            try {
                const result = await requesterCollections.find().toArray();
                res.send(result);
            } catch (error) {
                console.log(error)
            }
        })

        // filter data
        app.get('/filter-data', async (req, res) => {
            try {
                const lowAge = parseInt(req.query.low)
                const highAge = parseInt(req.query.high)
                const division = req.query.division;
                const gender = req.query.gender;
                console.log(lowAge, highAge, division, gender)
                if (lowAge || highAge) {
                    const options = { $lt: highAge, $gt: lowAge };
                    const result = await allUsers.find({ age: options }).toArray();
                    console.log(result, 'age')
                    return res.send(result)
                }
                if (gender) {
                    const result = await allUsers.find({ biodataType: gender }).toArray();
                    console.log(result, 'gender')
                    return res.send(result)
                }
                if (division) {
                    const result = await allUsers.find({ permanentDivision: division }).toArray();
                    console.log(result, 'div')
                    return res.send(result)
                }
                const result = await allUsers.find().toArray();
                console.log(result)
                res.send(result);
            } catch (error) {
                console.log(error)
            }
        })

        // get success story 
        app.get("/successStory", async (req, res) => {
            const result = await successStoryCollection.find().toArray()
            res.send(result)
        })
        
        // user role
        app.get("/user-role", async (req, res) => {
            const email = req.query.email;
            const user = await manageUsers.findOne({ email: email })
            let isAdmin = false;
            if (user) {
                isAdmin = user?.role === 'admin';
            }
            res.send({ isAdmin });
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

        // update user biodata
        app.patch('/update-biodata', async (req, res) => {
            try {
                const email = req.query.email
                const updateBiodata = req.body;
                const query = { userEmail: email };
                const available = await allUsers.findOne()
                delete updateBiodata._id;
                delete available._id;
                const update = {
                    ...available,
                    ...updateBiodata
                }
                console.log(update)
                const result = await allUsers.updateOne(query, {$set: update});
                res.send(result);
                console.log(result);
            } catch (error) {
                console.log(error)
            }
        })


        // post favourite data
        app.post('/add-to-favourite', async (req, res) => {
            try {
                const userInfo = req.body;
                const available = await favouriteCollection.findOne({ $and: [{ biodataId: userInfo.biodataId }, { userEmail: userInfo.userEmail }] })
                if (available) {
                    return res.send({message: 'You choosen biodata already exist in your favourite biodata list'})
                }
                const result = await favouriteCollection.insertOne(userInfo);
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

        //successStory
        app.post('/success-story', async (req, res) => {
            const successStory = req.body
            const storyReview = await successStoryCollection.insertOne(successStory)
            res.send(storyReview)
        })


        // approve premium
        app.patch('/approve-premium', async (req, res) => {
            try {
                const id = parseInt(req.query.id)
                const query = { biodataId: id }
                const updateDoc = {
                    $set: {
                        premiumRequestStatus: 'approved',
                        accountType: 'premium'
                    },
                };
                const updateResult = await allUsers.updateOne(query, updateDoc);
                const updateDoc2 = {
                    $set: {
                        premiumRequestStatus: 'approved',
                    },
                }
                const result = await premiumRequests.updateOne(query, updateDoc2)
                console.log(result)
                res.send(result);
            } catch (error) {
                console.log(error)
            }
        })

        // approve-contact-request
        app.patch('/approve-contact-request', async (req, res) => {
            try {
                const id = req.query.id
                const query = { _id: new ObjectId(id) }
                const updateDoc = {
                    $set: {
                        status: 'approved',
                    },
                };
                const updateResult = await requesterCollections.updateOne(query, updateDoc);
                console.log(updateResult)
                res.send(updateResult);
            } catch (error) {
                console.log(error)
            }
        })

        // manage users role
        app.patch('/manage-users-role/:id', async (req, res) => {
            try {
                const id = req.params.id;
                const query = { _id: new ObjectId(id) }
                console.log(id);
                const updateField = {
                    $set: {
                        role: 'admin'
                    }
                }
                console.log(updateField)
                const user = await manageUsers.findOne(query);
                console.log(user)
                const result = await manageUsers.updateOne(query, updateField);
                console.log(result)
                // res.send(result);
            } catch (error) {
                console.log(error)
            }
        })

        // approve-user-premium
        app.patch('/manage-users-premium/:email', async (req, res) => {
            try {
                const email = req.params.email
                console.log(email)
                const updateDoc = {
                    $set: {
                        accountType: 'premium',
                    },
                };
                const updateResult = await manageUsers.updateOne({ email: email }, updateDoc);
                const updateUserpremium = await allUsers.updateOne({ userEmail: email}, updateDoc)
                console.log(updateResult, updateUserpremium)
                res.send(updateResult);
            } catch (error) {
                console.log(error)
            }
        })

        // delete favourite biodata
        app.delete('/delete-favourite-bios', async (req, res) => {
            try {
                const id = req.query.id;
                const result = await favouriteCollection.deleteOne({ _id: new ObjectId(id) });
                res.send(result);
            } catch (error) {
                console.log(error)
            }
        })


        app.delete('/delete-requested-contact', async (req, res) => {
            try {
                const id = req.query.id;
                const result = await requesterCollections.deleteOne({ _id: new ObjectId(id) });
                res.send(result);
            } catch (error) {
                console.log(error)
            }
        })

        // create payment intent
        app.post("/create-payment-intent", async (req, res) => {
            const { price } = req.body;
            const taka = parseFloat(price * 100);
            const paymentIntent = await stripe.paymentIntents.create({
                amount: taka,
                currency: 'usd',
                payment_method_types: [
                    'card'
                ]
            })
            res.send({ clientSecret: paymentIntent.client_secret });
        })

        app.post("/payments", async (req, res) => {
            const requesterData = req.body;
            const query = { $and: [{ neededID: requesterData.neededID, requesterEmail: requesterData.requesterEmail }] }
            const available = await requesterCollections.findOne(query)
            if (available) {
                return res.send({ message: 'Already requested' })
            }
            const result = await requesterCollections.insertOne(requesterData);
            console.log(result)
            res.send(result);
        })


        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
    }
}
run().catch(console.dir);

app.listen(port, () => {
    console.log(`Server running at localhost: ${port}`)
})

