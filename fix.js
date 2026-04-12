const fs = require('fs');
let text = fs.readFileSync('tests/e2e/pagination-load-more.spec.ts', 'utf8');
text = text.replace(/await expect\(page\.locator\('\.card:has\(\.card-img-top\)'\)\)\.toHaveCount\(8, \{ timeout: 10000 \}\);[\s\S]*$/, `await expect(page.locator('.card:has(.card-img-top)')).toHaveCount(8, { timeout: 10000 });
    await expect(loadMoreBtn).toBeHidden();
  });
});
`);
fs.writeFileSync('tests/e2e/pagination-load-more.spec.ts', text);
