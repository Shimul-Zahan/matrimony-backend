const express = require('express');
const app = express();
const cors = require('cors');
const port = process.env.PORT || 5000;

app.use(cors({
    origin: ['http://localhost:5173'],
    credentials: true,
}));
app.use(express.json())

app.get('/', (req, res) => {
    res.send('I am ready now !!!')
})

app.listen(port, () => {
    console.log(`Server running at localhost: ${port}`)
})

