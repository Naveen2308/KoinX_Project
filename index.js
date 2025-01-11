const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');
const schedule = require('node-schedule');
const ss = require('simple-statistics');
require('dotenv').config(); 

const app = express();
app.use(express.static('public'));
app.use(express.json()); 

const url = process.env.MONGO_URL;

mongoose.connect(url, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => {
    console.log("Connected successfully to MongoDB");
})
.catch((err) => {
    console.error("Database connection error:", err);
    process.exit(1);
});

const cryptoSchema = new mongoose.Schema({
    bitcoin: {
        price: Number,
        marketCap: Number,
        "24hChange": Number,
    },
    matic: {
        price: Number,
        marketCap: Number,
        "24hChange": Number,
    },
    ethereum: {
        price: Number,
        marketCap: Number,
        "24hChange": Number,
    },
    timestamp: { type: Date, default: Date.now },
});

const Crypto = mongoose.model('Crypto', cryptoSchema);

async function fetchData() {
    try {
        const response = await axios.get('https://api.coingecko.com/api/v3/simple/price', {
            params: {
                ids: 'bitcoin,matic-network,ethereum',
                vs_currencies: 'usd',
                include_market_cap: 'true',
                include_24hr_change: 'true',
            }
        });
        const data = response.data;
        const cryptoData = {
            bitcoin: {
                price: data.bitcoin.usd,
                marketCap: data.bitcoin.usd_market_cap,
                "24hChange": data.bitcoin.usd_24h_change,
            },
            matic: {  
                price: data['matic-network'].usd,
                marketCap: data['matic-network'].usd_market_cap,
                "24hChange": data['matic-network'].usd_24h_change,
            },
            ethereum: {
                price: data.ethereum.usd,
                marketCap: data.ethereum.usd_market_cap,
                "24hChange": data.ethereum.usd_24h_change,
            },
        };
       
        await Crypto.insertMany([cryptoData]);
        console.log('Data stored successfully');
    } catch (error) {
        console.error('Error fetching data:', error);
    }
}

function scheduleJob() {
    fetchData();
    schedule.scheduleJob('0 */2 * * *', async () => {
        console.log('Running background job...');
        await fetchData(); 
    });
}

async function initApp() {
    scheduleJob();
}



app.post('/', async (req, res) => {
    const { coin } = req.body;
    try {
        
        const response = await axios.get(`http://localhost:3000/status`, {
            params: { coin }
        });
        const deviation = await axios.get(`http://localhost:3000/deviation`, {
            params: { coin }
        });

        console.log(response.data);
        console.log(deviation.data);
        res.json({status : response.data, deviation: deviation.data}); 
    } catch (error) {
        console.error('Error fetching data:', error);
        res.status(500).json({ message: 'Error fetching data' });
    }
});

app.get('/status', async (req, res) => {
    const { coin } = req.query;
    try {
        
        const result = await Crypto.findOne({}, { [coin]: 1, _id: 0 }).limit(1);
        res.json(result);
    } catch (error) {
        console.error('Error fetching data:', error);
        res.status(500).json({ message: 'Error fetching data', error });
    }
});

app.get('/deviation',async (req,res) => {
    const { coin } = req.query;
    try{
        const result = await Crypto.find({} , { [`${coin}.price`]: 1, _id: 0 }).sort({ timestamp: -1 }).limit(100);
        const prices = result.map(doc => doc[coin]?.price);
        console.log(prices);
        const deviation = ss.standardDeviation(prices);
        res.json({ deviation: deviation.toFixed(2) });
    } catch (error) {
        console.error('Error fetching data:', error);
        res.status(500).json({ message: 'Error fetching data', error });
    }
})


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    initApp();
});
