const axios = require('axios'); // Ensure axios is installed

async function fetchData() {
    try {
        const response = await axios.get('https://api.coingecko.com/api/v3/simple/price',{
            params: {
                ids: 'bitcoin,matic-network,ethereum',
                vs_currencies: 'usd',
                include_market_cap: 'true',
                include_24hr_change: 'true',
              }
        });
        console.log(response.data['matic-network']);
    } catch (error) {
        console.error('Error fetching data:', error);
    }
}

fetchData();
