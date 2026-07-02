const fs = require('fs');
const files = [
  'joey-app/src/app/shop/ShopClient.tsx',
  'joey-app/src/app/collection/[slug]/CollectionDetailClient.tsx',
  'joey-app/src/app/wishlist/WishlistClient.tsx'
];

for (const file of files) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    
    // In ShopClient.tsx: image: quickViewActiveCombo?.thumbnailUrl || quickViewGalleryImages[0] || quickViewPiece.image,
    // In CollectionDetailClient.tsx: image: product.image,
    // In WishlistClient.tsx: image: quickViewItem.image,
    
    content = content.replace(/image: quickViewActiveCombo\?\.thumbnailUrl \|\| quickViewGalleryImages\[0\] \|\| quickViewPiece\.image,/g, 
      "image: quickViewActiveCombo?.thumbnailUrl || quickViewGalleryImages[0] || quickViewPiece.image,\n          image2: quickViewActiveCombo?.images?.[0] || quickViewGalleryImages[1] || quickViewPiece.images?.[0],");
      
    content = content.replace(/image: product\.image,/g, 
      "image: product.image,\n          image2: product.images?.[0],");
      
    content = content.replace(/image: quickViewItem\.image,/g, 
      "image: quickViewItem.image,\n          image2: quickViewItem.images?.[0],");
      
    fs.writeFileSync(file, content, 'utf8');
  }
}
