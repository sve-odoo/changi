const changi = require('./changi');
const fs = require('fs');
//const config = require('./config.json');
//const dir = __dirname+'/searches';

const main = async () => {
    const products = await changi.getAllProducts();
    const parsed = changi.parseProducts(products);
    fs.writeFileSync(`changi_all_products_${Date.now()}.json`, JSON.stringify(parsed));
}

main();