const fs = require('fs');

const files = [
  'src/components/home/FeaturedSection.tsx',
  'src/app/wishlist/WishlistClient.tsx',
  'src/app/shop/ShopClient.tsx',
  'src/app/shop/[slug]/ProductClient.tsx',
  'src/app/collection/[slug]/CollectionDetailClient.tsx'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/title=\{v\.id === "main-color" \? "Main Color" : "Additional Color"\}/g, 'title={v.name || "Color"}');
  
  // Replace the quickViewActiveVariant fallback
  content = content.replace(/\|\| \(quickViewActiveVariant\?\.id === "main-color" \? "Main Color" : undefined\)/g, '');
  content = content.replace(/\|\| \(activeColorVariant\?\.id === "main-color" \? "Main Color" : undefined\)/g, '');
  content = content.replace(/\|\| \(quickViewActiveColorVariant\?\.id === "main-color" \? "Main Color" : undefined\)/g, '');
  fs.writeFileSync(file, content);
}
console.log('Done!');
