
const request = require('request');
const ProgressBar = require('progress');
const Bottleneck = require('bottleneck');

const getAllProducts = async () => {
    var bar = new ProgressBar(`[:bar] :rate/pps :percent :etas`, {complete: '=', incomplete: ' ', width: 30, total: 1});
    const limiter = new Bottleneck({minTime: 10, maxConcurrent: 50});
    const limitedQuery = limiter.wrap(_getAllProducts);

    let currentPage = 0;
    let results = [];

    let response = await _getAllProducts(currentPage);
    const numberOfPages = response.pagination.totalPages;

    bar.total = numberOfPages;
    bar.tick(1);
    results.push(...response.products);


    if(currentPage > numberOfPages) return results;
    currentPage++;

    let allRequests = [];
    for (let i = currentPage; i <= numberOfPages; i++) {
        allRequests.push(limitedQuery(i)
        .then(res => {
            bar.tick(1);    //Each time a request is fulfilled then update progress bar
            return res;
        }));
    }
    const responses = await Promise.all(allRequests); //Wait for all requests to return
    results.push(...responses.map(r => r.products));
    return flatten(results); //flatten so that the array contains just products rather than products per request sub arrays
}

const _getAllProducts = async page => { 
    const options = {
        method: "GET",
        url: "https://www.ishopchangi.com/bin/cagcommerce/webservices/v2/cag/products/search.json?pageSize=100&currentPage="+page+"&query=::cagCategory:%2Fbeauty&categoryCodes=travel-electronics-chargers,beauty,food,Womens-fashion&lang=en",
        headers: {
            "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.100 Safari/537.36",
            "content-type": "application/json",  
            "accept": "application/json, text/plain, */*",
            "referer": "https://www.ishopchangi.com/en/categories?cagCategory=%7B%22%2Fwine-and-spirits%22%3A%5B%22%2Fwine-and-spirits%2Fspirits-sake",
            "accept-language": "en-GB,en;q=0.9",
        }
    }

    return new Promise( (resolve, reject) => 
    request(options, (err, res, body) => {
        if (err) reject(err);
        else {
            const json = JSON.parse(body);
            resolve(json);
        }
    })
)}

const parseProducts = products => {
    const parsed = products.map(p => {
        let product = {}
        product.name = p.name;
        product.manufacturer = p.manufacturer;
        if(p.price) {
            product.price = p.price.value;
            product.currency = p.price.currencyIso;
        } else product.price = product.currency = 'na';
        
        product.inStock = p.inStock
        return product;
    })

    return parsed;
}

function flatten(arr) {
    return arr.reduce(function (flat, toFlatten) {
      return flat.concat(Array.isArray(toFlatten) ? flatten(toFlatten) : toFlatten);
    }, []);
}

module.exports = {
    getAllProducts,
    parseProducts
}