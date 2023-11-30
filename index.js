const express = require('express');
const app = express();
const cors = require('cors');
const port = process.env.PORT || 5000;
const cookieParser = require('cookie-parser')
const jwt = require('jsonwebtoken');
require('dotenv').config();
const stripe = require("stripe")('sk_test_51OF1GOHUw9AEQwQEvRlzEAUHSGAOeBfwquYTk5W0Z2N0syCZ31WYnu3BeB0StuCuiBP5WBdIh4lqAWbPQZSmcgv4009tnwiwQR');


app.use(cors({
    origin: ['http://localhost:5173'],
    credentials: true,
}));
app.use(express.json())
app.use(cookieParser())



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

const verifyToken = (req, res, next) => {
    const token = req.cookies?.token
    console.log(token)
    if (!token) {
        return res.status(401).send({ message: "unauthorized access" })
    }
    jwt.verify(token, process.env.SECRET_KEY, (err, decoded) => {
        if (err) {
            console.log(err)
            return res.status(403).send({ message: 'Access forbiden' })
        }
        req.decode = decoded
        next();
    })
}

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
                const pageNumber = parseInt(req.query.page);
                console.log(pageNumber)
                if (pageNumber) {
                    const result = await allUsers.find().skip(pageNumber * 5).limit(5).toArray();
                    // console.log(result)
                    return res.send(result)
                }
                const result = await allUsers.find().sort({ age: 1 }).toArray()
                res.send(result);
            } catch (error) {
                console.log(error)
            }
        })

        app.get('/all-users-biodatas', async (req, res) => {
            try {
                const limit = 5;
                const page = parseInt(req.query.page);
                const result = await allUsers.find().skip(page * limit).limit(limit).toArray();
                res.send(result);
            } catch (error) {
                console.log(error)
            }
        })

        // viewdetails
        app.get('/user/:id', async (req, res) => {
            try {
                const id = req.params.id;
                const result = await allUsers.findOne({ _id: new ObjectId(id) })
                res.send(result);
            } catch (error) {
                console.log(error)
            }
        })

        app.get('/count', async (req, res) => {
            try {
                const count = await allUsers.estimatedDocumentCount();
                res.send({ count });
            } catch (error) {
                console.error(error);
            }
        });

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
                const male = await allUsers.countDocuments({ biodataType: 'male' })
                const female = await allUsers.countDocuments({ biodataType: 'female' })
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
                const totalTaka = totalTk.length > 0 ? totalTk[0].totalRevenue : 0
                res.send({ users, male, female, premiumMember, totalTaka, totalMarriage });
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
                const result = await favouriteCollection.find({ userEmail: email }).toArray();
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
                let query = {};
                const lowAge = parseInt(req.query.lowAge)
                const highAge = parseInt(req.query.highAge)
                const gender = req.query.search;
                const division = req.query.gender;
                const page = req.query.page;
                let skip = page * 5;
                console.log(lowAge, highAge, skip, gender, division)
                if (lowAge && highAge) {
                    query.age = { $gte: lowAge, $lte: highAge }
                }
                if (gender) {
                    query.biodataType = gender;
                }
                if (division) {
                    query.permanentDivision = division;
                }
                console.log(query)
                const result = await allUsers.find(query).skip(skip).limit(6).toArray();
                console.log(result)
                res.send(result);
            } catch (error) {
                console.log(error)
            }
        })

        // get manage users by search
        app.get('/search-manage-users', async (req, res) => {
            try {
                const searchValue = req.query.name;
                const regex = new RegExp(`\\b${searchValue}`, 'iu');
                const result = await manageUsers.find({ name: regex }).toArray()
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

        // jot er kaj
        app.post('/jwt', async (req, res) => {
            try {
                const user = req.body;
                console.log(process.env.SECRET_KEY)
                const token = jwt.sign(user, process.env.SECRET_KEY, { expiresIn: '10h' })
                res.cookie('token', token, {
                    httpOnly: true,
                    secure: false,
                }).send({ token: token });
            } catch (error) {
                console.log(error)
            }
        })

        app.post('/logout', (req, res) => {
            res.clearCookie('token', { maxAge: 0 }).send({ message: 'successfully cookie remove' });
        })

        // save all the new account details in db
        app.post('/users', async (req, res) => {
            try {
                const userInfo = req.body;
                const available = await manageUsers.findOne({ email: userInfo.email })
                if (available) {
                    return res.send({ message: 'user already in database' })
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
                const result = await allUsers.updateOne(query, { $set: update });
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
                    return res.send({ message: 'You choosen biodata already exist in your favourite biodata list' })
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
                const query = { userEmail: email }
                const available = await allUsers.findOne(query);
                if (available) {
                    return res.send({ message: 'Email already use. Please Login with a new email and add your biodata.' })
                }
                const count = await allUsers.estimatedDocumentCount();
                const result = await allUsers.insertOne({ biodataId: count + 1, ...biodata })
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
                const updateUserpremium = await allUsers.updateOne({ userEmail: email }, updateDoc)
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

