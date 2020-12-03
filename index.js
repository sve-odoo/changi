const changi = require('./changi');
const fs = require('fs');

const main = async () => {
    const products = await changi.getAllProducts();
    const parsedProducts = changi.parseProducts(products);

    let multidimensional = parsedProducts.filter(p => p.multidimensional === true);
    const variants = await changi.getVariants(multidimensional);
    const parsedVariants = changi.parseVariants(variants.filter(v => v !== undefined))
  
    fs.writeFileSync(`changi_all_products_${Date.now()}.json`, JSON.stringify(parsedProducts));
    fs.writeFileSync(`changi_variants_${Date.now()}.json`, JSON.stringify(parsedVariants));
}

main();