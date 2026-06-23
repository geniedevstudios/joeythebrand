const fs = require('fs');

const files = [
  { path: 'c:/Users/sarko/Documents/JOEY THE BRAND/joey-app/src/app/shop/ShopClient.tsx', style: 'styles' },
  { path: 'c:/Users/sarko/Documents/JOEY THE BRAND/joey-app/src/app/wishlist/WishlistClient.tsx', style: 'shopStyles' },
  { path: 'c:/Users/sarko/Documents/JOEY THE BRAND/joey-app/src/components/home/FeaturedSection.tsx', style: 'styles' },
  { path: 'c:/Users/sarko/Documents/JOEY THE BRAND/joey-app/src/components/shop/ProductSuggestions.tsx', style: 'shopStyles' },
  { path: 'c:/Users/sarko/Documents/JOEY THE BRAND/joey-app/src/app/collection/[slug]/CollectionDetailClient.tsx', style: 'shopStyles' }
];

for (const { path, style } of files) {
  if (!fs.existsSync(path)) continue;
  let content = fs.readFileSync(path, 'utf-8');

  // 1. Add import { Clock } from 'lucide-react'
  if (!content.includes('import { Clock }')) {
    content = content.replace(/(import .*;\n)/, '$1import { Clock } from "lucide-react";\n');
  }

  // 2. Add badgeStack to modalImageWrap
  const modalImageWrapRegex = new RegExp(`<div className={((?:styles|shopStyles)\\.modalImageWrap)}>(.*?<ProductMedia .*?className={((?:styles|shopStyles)\\.modalImage)}.*?/>)`, 's');
  if (content.match(modalImageWrapRegex) && !content.includes('BESPOKE ORDER</span>\n                      ) : quickViewPiece.isOutOfStock')) {
    content = content.replace(modalImageWrapRegex, `<div className={$1}>\n$2\n                  <div className={${style}.badgeStack} aria-hidden="true">\n                    {(() => {\n                      const isBespoke = !!(quickViewPiece.bespokeAvailable && quickViewPiece.quantity <= 0);\n                      return isBespoke ? (\n                        <span className={${style}.saleBadge} style={{ background: "#8b5cf6" }}>BESPOKE ORDER</span>\n                      ) : quickViewPiece.isOutOfStock ? (\n                        <span className={${style}.saleBadge} style={{ background: "#ef4444" }}>OUT OF STOCK</span>\n                      ) : (\n                        <>\n                          {quickViewPiece.category === "sample-sale" && (\n                            <span className={${style}.saleBadge}>SALE</span>\n                          )}\n                          {quickViewPiece.isLimited && quickViewPiece.category !== "sample-sale" && (\n                            <span className={${style}.saleBadge} style={{ background: "#8b5cf6" }}>LIMITED</span>\n                          )}\n                          {quickViewPiece.isBestSeller && (\n                            <span className={${style}.saleBadge} style={{ background: "#f59e0b" }}>BEST SELLER</span>\n                          )}\n                        </>\n                      );\n                    })()}\n                  </div>`);
  }

  // 3. customNotice replacement
  const outOfStockNoticeRegex = new RegExp(`{quickViewPiece\\.isOutOfStock && \\(\\s*<p className={((?:styles|shopStyles)\\.customNotice)}.*?>\\s*This item is currently out of stock\\.\\s*</p>\\s*\\)}`, 's');
  if (content.match(outOfStockNoticeRegex)) {
    content = content.replace(outOfStockNoticeRegex, `{(() => {\n                  const isBespoke = !!(quickViewPiece.bespokeAvailable && quickViewPiece.quantity <= 0);\n                  return isBespoke ? (\n                    <p className={${style}.customNotice} style={{ color: "#5b21b6", background: "#f5f3ff" }}>\n                      🧵 Bespoke order. Expect ~{quickViewPiece.bespokeLeadDays || 14} days for production.\n                    </p>\n                  ) : quickViewPiece.isOutOfStock ? (\n                    <p className={${style}.customNotice} style={{ color: "#c00", background: "#fee" }}>\n                      This item is currently out of stock.\n                    </p>\n                  ) : null;\n                })()}`);
  } else {
    // maybe it already has a bespoke block? like in ShopClient/FeaturedSection
    const oldBespokeRegex = new RegExp(`🧵 Made to order\\. Expect ~{quickViewPiece\\.bespokeLeadDays \\|\\| 14} days for production\\.`, 'g');
    content = content.replace(oldBespokeRegex, `🧵 Bespoke order. Expect ~{quickViewPiece.bespokeLeadDays || 14} days for production.`);
  }

  // 4. Quantity logic
  const qtyPlusBtnRegex = new RegExp(`(<button\\s+className={((?:styles|shopStyles)\\.qtyBtn)}\\s+onClick={\\(\\) => {\\s+if \\(qty < quickViewPiece\\.quantity\\) {\\s+setQty\\(qty \\+ 1\\);\\s+} else {\\s+toast\\.error\\(\`Only \\$\\{quickViewPiece\\.quantity\\} items available\\.\`\\);\\s+}\\s+}}\\s+disabled={qty >= quickViewPiece\\.quantity}\\s+>\\s+\\+\\s+</button>)`, 's');
  if (content.match(qtyPlusBtnRegex)) {
    content = content.replace(qtyPlusBtnRegex, `<button \n                        className={${style}.qtyBtn} \n                        onClick={() => {\n                          const isBespoke = !!(quickViewPiece.bespokeAvailable && quickViewPiece.quantity <= 0);\n                          if (isBespoke || qty < quickViewPiece.quantity) {\n                            setQty(qty + 1);\n                          } else {\n                            toast.error(\`Only \${quickViewPiece.quantity} items available.\`);\n                          }\n                        }}\n                        disabled={!(!!(quickViewPiece.bespokeAvailable && quickViewPiece.quantity <= 0)) && qty >= quickViewPiece.quantity}\n                      >\n                        +\n                      </button>`);
  }

  // 5. Add To Cart Button text
  const addToCartBtnRegex = new RegExp(`({quickViewPiece\\.isOutOfStock\\s+\\?\\s+"Out of Stock"\\s+:\\s+\\(addStatus === "idle" \\? "Add To Cart" : addStatus === "adding" \\? "Adding\\.\\.\\." : "Added 👍"\\)})`, 's');
  if (content.match(addToCartBtnRegex)) {
    content = content.replace(addToCartBtnRegex, `{quickViewPiece.isOutOfStock && !(!!(quickViewPiece.bespokeAvailable && quickViewPiece.quantity <= 0))\n                          ? "Out of Stock" \n                          : !!(quickViewPiece.bespokeAvailable && quickViewPiece.quantity <= 0)\n                            ? (addStatus === "idle" ? "Order Bespoke" : addStatus === "adding" ? "Adding..." : "Added 👍")\n                            : (addStatus === "idle" ? "Add To Cart" : addStatus === "adding" ? "Adding..." : "Added 👍")}`);
  }

  // 6. lowStockNotice (the clock icon notice) below modalActions
  const modalActionsRegex = new RegExp(`(<div className={((?:styles|shopStyles)\\.modalActions)}>.*?</div>)`, 's');
  if (content.match(modalActionsRegex) && !content.includes('role="status" aria-live="polite" style={{ display: "inline-flex"')) {
    content = content.replace(modalActionsRegex, `$1\n\n                {(() => {\n                  const isBespoke = !!(quickViewPiece.bespokeAvailable && quickViewPiece.quantity <= 0);\n                  return isBespoke ? (\n                    <div role="status" aria-live="polite" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "10px", marginTop: "16px", marginBottom: "2px", fontSize: "0.95rem", color: "rgba(20, 20, 20, 0.78)", background: "#f5f3ff", borderColor: "#c4b5fd", padding: "8px", borderRadius: "6px" }}>\n                      <Clock aria-hidden style={{ flex: "0 0 auto", opacity: 0.85, width: "18px", height: "18px", color: "#7c3aed" }} />\n                      <span style={{ color: "#5b21b6" }}>\n                        Bespoke piece — handcrafted for you in ~{quickViewPiece.bespokeLeadDays || 14} days\n                      </span>\n                    </div>\n                  ) : null;\n                })()}`);
  }

  fs.writeFileSync(path, content);
  console.log('Processed', path);
}
