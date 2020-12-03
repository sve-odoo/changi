
const request = require('request');
const ProgressBar = require('progress');
const Bottleneck = require('bottleneck');

const getAllProducts = async () => {
    console.log('Getting Products');
    var bar = new ProgressBar(`[:bar] :rate/pps :percent :etas`, {complete: '=', incomplete: ' ', width: 30, total: 1});
    const limiter = new Bottleneck({minTime: 10, maxConcurrent: 50});
    const limitedQuery = limiter.wrap(getAllProductsRequest);

    let currentPage = 0;
    let results = [];

    let response = await getAllProductsRequest(currentPage);
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

const getAllProductsRequest = async page => { 
    const options = {
        method: "GET",
        url: "https://www.ishopchangi.com/bin/cagcommerce/webservices/v2/cag/products/search.json?pageSize=100&currentPage="+page+"&query=:price-asc&lang=en",
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

const getVariants = async products => {
    console.log("Getting Variants");
    const variantInfo = products.map(p => {
        return {
            url: `https://www.ishopchangi.com${p.url.split('.')[0]}.model.json`,
            code: p.code
        }
    });
    var bar = new ProgressBar(`[:bar] :rate/pps :percent :etas`, {complete: '=', incomplete: ' ', width: 30, total: 1});
    const limiter = new Bottleneck({minTime: 20, maxConcurrent: 50});
    const limitedQuery = limiter.wrap(getVariantsRequest);
    bar.total = variantInfo.length;

    let allRequests = [];
    for (let i = 0; i < variantInfo.length; i++) {
        allRequests.push(limitedQuery(variantInfo[i].url)
        .then(res => {
            bar.tick(1); 
            if(res[":items"].root[":items"].responsivegrid[":items"].productpage)
                return {
                    product: variantInfo[i].code,
                    variants:  res[":items"].root[":items"].responsivegrid[":items"].productpage.product.variantOptions
                }
        }));
    }
    return await Promise.all(allRequests);
}

const getVariantsRequest = async url => {
    const options = {
        method: "GET",
        url: url,
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
    return products.map(p => {
        let product = {}
        product.name = p.name;
        product.manufacturer = p.manufacturer;
        product.multidimensional = p.multidimensional;
        product.code = p.code;
        product.inStock = p.inStock;
        product.url = p.url;
        if(p.price) {
            product.price = p.price.value;
            product.currency = p.price.currencyIso;
        } else product.price = product.currency = 'na';
        return product;
    })
}

const parseVariants = products => {
    return products.map(p => {
        let variants = p.variants.map(v => {
            let variant = {};
            variant.code = v.code;
            variant.offers = v.offers.map(o => o.channelPrices.map(cp => {
                return {"channel": cp.channelCode, "discountedPrice": cp.enDiscountedPrice}
            }))
            return variant;
        })
        return {product: p.product, variants: variants}
    })
}

function flatten(arr) {
    return arr.reduce(function (flat, toFlatten) {
      return flat.concat(Array.isArray(toFlatten) ? flatten(toFlatten) : toFlatten);
    }, []);
}

module.exports = {
    getAllProducts,
    getVariants,
    parseProducts,
    parseVariants
}
