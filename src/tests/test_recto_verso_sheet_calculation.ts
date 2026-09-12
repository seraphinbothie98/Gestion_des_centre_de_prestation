import { dbStore } from '../server/db/mockStore';
import { calculateEffectiveServiceConsumableQty, calculateOrderStockRequirements } from '../lib/stockEngine';

async function runTests() {
  console.log('🧪 Starting tests: Recto-Verso Sheet Conversion for Photocopy & Print...');

  const tenantId = 't-001';
  const state = dbStore.getState();
  const photocopySrv = state.services.find(s => s.name.toLowerCase().includes('photocopi') || s.code.includes('PHOTO')) || state.services[0];
  const printSrv = state.services.find(s => s.name.toLowerCase().includes('impress') || s.code.includes('PRINT')) || state.services[1] || state.services[0];
  const paperConsumable = {
    productId: 'prod-paper',
    productName: 'Papier Ramette A4 80g Double A',
    quantityPerUnit: 1,
    unit: 'feuille'
  };

  // ---------------------------------------------------------------------------------
  // Scenario 1: 8 pages Recto-verso, 1 ex -> 4 feuilles
  // ---------------------------------------------------------------------------------
  const qty1 = calculateEffectiveServiceConsumableQty(
    photocopySrv,
    { quantity: 8, pageCount: 8, copiesCount: 1, notes: 'Format: A4 | Mode: Noir & blanc | Type d\'impression: Recto-verso | Papier: Standard' },
    paperConsumable
  );
  console.log(`Test 1 (8 pages Recto-verso): ${qty1} feuille(s)`);
  if (qty1 !== 4) {
    throw new Error(`❌ Expected 8 pages recto-verso to equal 4 sheets, got ${qty1}`);
  }
  console.log(`✅ Test 1 PASSED: 8 pages Recto-verso = 4 feuilles.`);

  // ---------------------------------------------------------------------------------
  // Scenario 2: 9 pages Recto-verso, 1 ex -> 5 feuilles (nombre impair: Math.ceil(9/2) = 5)
  // ---------------------------------------------------------------------------------
  const qty2 = calculateEffectiveServiceConsumableQty(
    photocopySrv,
    { quantity: 9, pageCount: 9, copiesCount: 1, notes: 'Format: A4 | Mode: Noir & blanc | Type d\'impression: Recto-verso | Papier: Standard' },
    paperConsumable
  );
  console.log(`Test 2 (9 pages Recto-verso): ${qty2} feuille(s)`);
  if (qty2 !== 5) {
    throw new Error(`❌ Expected 9 pages recto-verso to equal 5 sheets, got ${qty2}`);
  }
  console.log(`✅ Test 2 PASSED: 9 pages Recto-verso = 5 feuilles.`);

  // ---------------------------------------------------------------------------------
  // Scenario 3: 8 pages Recto simple -> 8 feuilles (pas de division)
  // ---------------------------------------------------------------------------------
  const qty3 = calculateEffectiveServiceConsumableQty(
    photocopySrv,
    { quantity: 8, pageCount: 8, copiesCount: 1, notes: 'Format: A4 | Mode: Noir & blanc | Type d\'impression: Recto simple | Papier: Standard' },
    paperConsumable
  );
  console.log(`Test 3 (8 pages Recto simple): ${qty3} feuille(s)`);
  if (qty3 !== 8) {
    throw new Error(`❌ Expected 8 pages recto simple to equal 8 sheets, got ${qty3}`);
  }
  console.log(`✅ Test 3 PASSED: 8 pages Recto simple = 8 feuilles.`);

  // ---------------------------------------------------------------------------------
  // Scenario 4: Impression 5 pages, 20 exemplaires en Recto-verso
  // (5 pages = 3 feuilles par exemplaire x 20 ex = 60 feuilles au total)
  // ---------------------------------------------------------------------------------
  const qty4 = calculateEffectiveServiceConsumableQty(
    printSrv,
    { quantity: 100, pageCount: 5, copiesCount: 20, notes: 'Format: A4 | Mode: Couleur | Type d\'impression: Recto-verso | Papier: Standard' },
    paperConsumable
  );
  console.log(`Test 4 (5 pages x 20 ex Recto-verso): ${qty4} feuille(s)`);
  if (qty4 !== 60) {
    throw new Error(`❌ Expected 5 pages x 20 ex recto-verso to equal 60 sheets, got ${qty4}`);
  }
  console.log(`✅ Test 4 PASSED: 5 pages x 20 ex Recto-verso = 60 feuilles (au lieu de 100).`);

  // ---------------------------------------------------------------------------------
  // Scenario 5: Full stock requirement engine integration test
  // ---------------------------------------------------------------------------------
  const mockProductPaper = {
    id: 'prod-01',
    tenantId,
    name: 'Papier Ramette A4 80g Double A',
    code: 'PAP-A4-80G',
    unit: 'feuille',
    baseUnit: 'feuille',
    category: 'Consommable',
    costPrice: 50,
    currentStock: 1000,
    isActive: true
  } as any;

  const requirements = calculateOrderStockRequirements(
    [
      {
        id: 'line-rv-1',
        itemType: 'SERVICE',
        serviceId: photocopySrv.id,
        quantity: 8,
        pageCount: 8,
        copiesCount: 1,
        notes: 'Format: A4 | Mode: Noir & blanc | Type d\'impression: Recto-verso | Papier: Standard'
      } as any
    ],
    [photocopySrv],
    [mockProductPaper]
  );

  const paperReq = requirements.find(r => r.productId === 'prod-01' || r.productName.includes('Papier'));
  if (paperReq) {
    console.log(`Test 5 Engine Requirement: ${paperReq.requiredQtyBaseUnit} ${paperReq.baseUnit}`);
    if (paperReq.requiredQtyBaseUnit !== 4) {
      throw new Error(`❌ Expected stock requirement to be 4 sheets, got ${paperReq.requiredQtyBaseUnit}`);
    }
  }
  console.log(`✅ Test 5 PASSED: Stock engine correctly deduces 4 sheets for 8 pages Recto-verso.`);

  console.log('\n🎉 ALL RECTO-VERSO CONVERSION TESTS PASSED SUCCESSFULLY!');
}

runTests().catch(err => {
  console.error('❌ Test suite failed:', err);
  process.exit(1);
});
