/**
 * TEST SUITE: ÉVOLUTION STOCK & MAGASIN — STOCK PRESTATION
 * 
 * Validates the full functional specifications for « Stock Prestation »:
 * - Single Product Catalogue (no duplication of product records or images)
 * - Separation between Stock Magasin and Stock Prestation
 * - Transfer Magasin -> Prestation (e.g. 1 carton = 500 feuilles)
 * - Automatic Prestation Consumptions (100 photocopies -> 400, 400 photocopies -> 0 rupture)
 * - Strict Stock Negative Prevention (rejection when prestation stock is insufficient)
 * - Real-time image sharing and catalogue updates
 * - Multi-Cashier concurrency protection
 * - Multi-Agency isolation and IDOR security
 */

import { dbStore } from '../server/db/mockStore';
import { calculateServiceStockConsumption } from '../lib/stockEngine';
import { Product } from '../types';

async function runPrestationStockEvolutionTests() {
  console.log('================================================================');
  console.log('TESTS — ÉVOLUTION STOCK & MAGASIN : STOCK PRESTATION');
  console.log('================================================================\n');

  let passedTests = 0;
  const totalTests = 9;

  const TENANT_A = 'tenant-prestation-stock-a';
  const TENANT_B = 'tenant-prestation-stock-b';

  // -------------------------------------------------------------------------
  // TEST 1 : Création du Produit « Papier RAM A4 » avec image et conditionnement
  // -------------------------------------------------------------------------
  console.log('--- TEST 1 : Création Produit Catalogue avec Conditionnement ---');

  const createProdRes = dbStore.createSecureProduct({
    code: 'RAM-A4-EVO',
    name: 'Papier RAM A4',
    category: 'Papeterie',
    baseUnit: 'feuille',
    costPrice: 500,
    initialStock: 5000, // 10 cartons de 500 feuilles = 5 000 feuilles en magasin
    minStockAlert: 500,
    imageUrl: 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=300',
    packagings: [
      {
        id: 'pkg-ram-carton',
        level: 2,
        unitName: 'carton',
        containedQuantity: 500,
        subUnitName: 'feuille',
        factorToBase: 500,
        purchasePrice: 250000,
        salePrice: 300000,
        isAllowedForPurchase: true,
        isAllowedForSale: true,
        isDefaultPurchaseUnit: true,
      }
    ]
  }, TENANT_A);

  const productA = createProdRes.product!;

  const t1_ok = (
    createProdRes.success === true &&
    productA.currentStock === 5000 &&
    (productA.prestationStock || 0) === 0 &&
    productA.imageUrl !== undefined &&
    productA.packagings?.length === 1
  );

  if (t1_ok) {
    console.log(`✅ TEST 1 RÉUSSI :`);
    console.log(`   - Produit créé : ${productA.name} (${productA.code})`);
    console.log(`   - Stock Magasin initial : ${productA.currentStock} feuilles (10 cartons)`);
    console.log(`   - Stock Prestation initial : ${productA.prestationStock || 0} feuille`);
    console.log(`   - Image catalogue : ${productA.imageUrl}`);
    passedTests++;
  } else {
    console.error('❌ TEST 1 ÉCHOUÉ :', createProdRes);
  }

  // -------------------------------------------------------------------------
  // TEST 2 : Unicité de la fiche produit (Pas de duplication dans Stock Prestation)
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 2 : Source Unique Catalogue (Pas de double fiche produit) ---');

  const allTenantAProducts = (dbStore.getState().products || []).filter(p => p.tenantId === TENANT_A);
  const duplicates = allTenantAProducts.filter(p => p.code === 'RAM-A4-EVO');

  const t2_ok = (
    duplicates.length === 1 &&
    duplicates[0].id === productA.id &&
    duplicates[0].imageUrl === productA.imageUrl
  );

  if (t2_ok) {
    console.log(`✅ TEST 2 RÉUSSI :`);
    console.log(`   - Nombre d'enregistrements pour le produit : ${duplicates.length} (exactement 1)`);
    console.log(`   - Clé primaire unique : ${duplicates[0].id}`);
    passedTests++;
  } else {
    console.error('❌ TEST 2 ÉCHOUÉ : Duplication détectée !', duplicates);
  }

  // -------------------------------------------------------------------------
  // TEST 3 : Transfert de 1 carton Magasin -> Prestation
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 3 : Transfert 1 Carton Magasin -> Prestation ---');

  const transferRes = dbStore.consumeSecureProductStock(
    productA.id,
    1,
    'Photocopie & Impression',
    'CMD-TRANSFER-01',
    'Approvisionnement atelier poste photocopie',
    TENANT_A,
    'Responsable Magasin',
    false,
    'carton'
  );

  const updatedProdAfterTransfer = dbStore.getProductById(productA.id, TENANT_A).product!;

  const t3_ok = (
    transferRes.success === true &&
    transferRes.deductedBaseQty === 500 &&
    updatedProdAfterTransfer.currentStock === 4500 && // 9 cartons restants en magasin
    updatedProdAfterTransfer.prestationStock === 500 && // 500 feuilles en stock prestation
    updatedProdAfterTransfer.stockByLocation?.['MAIN_STORE'] === 4500 &&
    updatedProdAfterTransfer.stockByLocation?.['PRESTATION'] === 500
  );

  if (t3_ok) {
    console.log(`✅ TEST 3 RÉUSSI :`);
    console.log(`   - Transfert 1 carton (500 feuilles) validé.`);
    console.log(`   - Stock Magasin restant : ${updatedProdAfterTransfer.currentStock} feuilles (9 cartons)`);
    console.log(`   - Stock Prestation disponible : ${updatedProdAfterTransfer.prestationStock} consommations (500 feuilles)`);
    passedTests++;
  } else {
    console.error('❌ TEST 3 ÉCHOUÉ :', { transferRes, updatedProdAfterTransfer });
  }

  // -------------------------------------------------------------------------
  // TEST 4 : Consommation de 100 photocopies par un caissier
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 4 : Consommation Prestation (100 photocopies) ---');

  const cons100Res = dbStore.consumeSecurePrestationStock(
    productA.id,
    100,
    'Photocopie N&B',
    'CMD-2026-000100',
    'Tirage 100 copies cours d’histoire',
    TENANT_A,
    'Caissier Atelier A'
  );

  const prodAfter100 = dbStore.getProductById(productA.id, TENANT_A).product!;

  const t4_ok = (
    cons100Res.success === true &&
    prodAfter100.prestationStock === 400 && // 500 - 100 = 400
    prodAfter100.currentStock === 4500 // Le Stock Magasin reste intact à 4 500 !
  );

  if (t4_ok) {
    console.log(`✅ TEST 4 RÉUSSI :`);
    console.log(`   - Consommation de 100 feuilles enregistrée sur le Stock Prestation.`);
    console.log(`   - Nouveau Stock Prestation : ${prodAfter100.prestationStock} feuilles`);
    console.log(`   - Stock Magasin resté indépendant : ${prodAfter100.currentStock} feuilles (9 cartons)`);
    passedTests++;
  } else {
    console.error('❌ TEST 4 ÉCHOUÉ :', { cons100Res, prodAfter100 });
  }

  // -------------------------------------------------------------------------
  // TEST 5 : Consommation de 400 photocopies supplémentaires (Stock Prestation -> 0)
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 5 : Consommation 400 feuilles -> Rupture Prestation (0) ---');

  const cons400Res = dbStore.consumeSecurePrestationStock(
    productA.id,
    400,
    'Photocopie N&B',
    'CMD-2026-000101',
    'Tirage 400 livrets séminaire',
    TENANT_A,
    'Caissier Atelier A'
  );

  const prodAfter400 = dbStore.getProductById(productA.id, TENANT_A).product!;

  const t5_ok = (
    cons400Res.success === true &&
    prodAfter400.prestationStock === 0 &&
    prodAfter400.currentStock === 4500
  );

  if (t5_ok) {
    console.log(`✅ TEST 5 RÉUSSI :`);
    console.log(`   - Consommation 400 feuilles validée.`);
    console.log(`   - Stock Prestation = ${prodAfter400.prestationStock} feuille (Statut: RUPTURE ATELIER)`);
    console.log(`   - Stock Magasin = ${prodAfter400.currentStock} feuilles`);
    passedTests++;
  } else {
    console.error('❌ TEST 5 ÉCHOUÉ :', { cons400Res, prodAfter400 });
  }

  // -------------------------------------------------------------------------
  // TEST 6 : Tentative de prestation supplémentaire sur Stock Prestation vide -> REFUSÉE
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 6 : Blocage strict si Stock Prestation insuffisant ---');

  const refuseConsRes = dbStore.consumeSecurePrestationStock(
    productA.id,
    1,
    'Photocopie N&B',
    'CMD-2026-000102',
    'Tentative 1 copie sur stock épuisé',
    TENANT_A,
    'Caissier Atelier A'
  );

  const prodAfterRefuse = dbStore.getProductById(productA.id, TENANT_A).product!;

  const t6_ok = (
    refuseConsRes.success === false &&
    refuseConsRes.statusCode === 400 &&
    refuseConsRes.message.includes('Stock prestation insuffisant') &&
    prodAfterRefuse.prestationStock === 0 // Le stock ne devient JAMAIS négatif
  );

  if (t6_ok) {
    console.log(`✅ TEST 6 RÉUSSI :`);
    console.log(`   - Rejet immédiat avec message explicite : "${refuseConsRes.message}"`);
    console.log(`   - Stock Prestation préservé à ${prodAfterRefuse.prestationStock} (Anti-stock négatif garanti)`);
    passedTests++;
  } else {
    console.error('❌ TEST 6 ÉCHOUÉ :', { refuseConsRes, prodAfterRefuse });
  }

  // -------------------------------------------------------------------------
  // TEST 7 : Test de propagation automatique de l'image
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 7 : Mise à jour Image Catalogue & Réflexion Instantanée ---');

  const newImageUrl = 'https://images.unsplash.com/photo-paper-new?w=400';
  dbStore.updateSecureProduct(productA.id, {
    name: 'Papier RAM A4 (Nouveau Packaging)',
    imageUrl: newImageUrl
  }, TENANT_A);

  const prodUpdatedImage = dbStore.getProductById(productA.id, TENANT_A).product!;

  const t7_ok = (
    prodUpdatedImage.imageUrl === newImageUrl &&
    prodUpdatedImage.name === 'Papier RAM A4 (Nouveau Packaging)'
  );

  if (t7_ok) {
    console.log(`✅ TEST 7 RÉUSSI :`);
    console.log(`   - Image mise à jour sur la fiche catalogue.`);
    console.log(`   - Stock Prestation partage automatiquement la nouvelle image sans duplication.`);
    passedTests++;
  } else {
    console.error('❌ TEST 7 ÉCHOUÉ :', prodUpdatedImage);
  }

  // -------------------------------------------------------------------------
  // TEST 8 : Multi-Caissiers & Concurrence
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 8 : Protection Multi-Caissiers Simultanés ---');

  // Ajuster le stock prestation à 100 feuilles
  dbStore.adjustPrestationStock(productA.id, 100, 'Recharge test multi-caissier', TENANT_A, 'Gestionnaire');

  // Caissier A demande 60 photocopies
  const opCashierA = dbStore.consumeSecurePrestationStock(productA.id, 60, 'Photocopie', 'CMD-A', 'Caissier A', TENANT_A, 'Caissier A');

  // Caissier B demande 50 photocopies simultanément (Total demandé: 110, dispo restante: 40)
  const opCashierB = dbStore.consumeSecurePrestationStock(productA.id, 50, 'Photocopie', 'CMD-B', 'Caissier B', TENANT_A, 'Caissier B');

  const prodAfterMultiCashier = dbStore.getProductById(productA.id, TENANT_A).product!;

  const t8_ok = (
    opCashierA.success === true &&
    opCashierB.success === false &&
    opCashierB.statusCode === 400 &&
    prodAfterMultiCashier.prestationStock === 40 // 100 - 60 = 40 (et non pas -10)
  );

  if (t8_ok) {
    console.log(`✅ TEST 8 RÉUSSI :`);
    console.log(`   - Opération Caissier A (60) : ACCEPTÉE (reste 40).`);
    console.log(`   - Opération Caissier B (50 sur 40 dispo) : REFUSÉE.`);
    console.log(`   - Stock Prestation préservé à ${prodAfterMultiCashier.prestationStock} feuilles.`);
    passedTests++;
  } else {
    console.error('❌ TEST 8 ÉCHOUÉ :', { opCashierA, opCashierB, prodAfterMultiCashier });
  }

  // -------------------------------------------------------------------------
  // TEST 9 : Isolation Multi-Agence & Sécurité IDOR
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 9 : Isolation Multi-Agence Hermétique & IDOR ---');

  // Create product in Agency B
  const prodBRes = dbStore.createSecureProduct({
    code: 'RAM-AGENCY-B',
    name: 'Papier Ramette Agence B',
    category: 'Papeterie B',
    baseUnit: 'feuille',
    costPrice: 400,
    initialStock: 2000,
  }, TENANT_B);
  const prodB = prodBRes.product!;

  // Agency A attempts to consume Agency B's prestation stock
  const idorRes = dbStore.consumeSecurePrestationStock(
    prodB.id,
    50,
    'Photocopie',
    'CMD-HACK',
    'Tentative IDOR',
    TENANT_A,
    'Infiltré'
  );

  // Agency B consumes its own prestation stock
  dbStore.adjustPrestationStock(prodB.id, 300, 'Initialisation Stock Prestation B', TENANT_B, 'Admin B');
  const legitimateB = dbStore.consumeSecurePrestationStock(
    prodB.id,
    100,
    'Photocopie',
    'CMD-B-VALID',
    'Consommation légitime B',
    TENANT_B,
    'Caissier B'
  );

  const updatedProdB = dbStore.getProductById(prodB.id, TENANT_B).product!;

  const t9_ok = (
    idorRes.success === false &&
    idorRes.statusCode === 403 &&
    legitimateB.success === true &&
    updatedProdB.prestationStock === 200 // 300 - 100 = 200
  );

  if (t9_ok) {
    console.log(`✅ TEST 9 RÉUSSI :`);
    console.log(`   - Tentative de consommation inter-agences bloquée HTTP 403 Forbidden.`);
    console.log(`   - Consommation légitime Agence B validée (Stock Prestation B: ${updatedProdB.prestationStock} feuilles).`);
    passedTests++;
  } else {
    console.error('❌ TEST 9 ÉCHOUÉ :', { idorRes, legitimateB, updatedProdB });
  }

  // -------------------------------------------------------------------------
  // RÉCAPITULATIF
  // -------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`RÉSULTAT GLOBAL : ${passedTests}/${totalTests} TESTS VALIDÉS AVEC SUCCÈS (${Math.round((passedTests/totalTests)*100)}%)`);
  console.log('================================================================');

  if (passedTests === totalTests) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runPrestationStockEvolutionTests().catch(err => {
  console.error('FATAL TEST ERROR:', err);
  process.exit(1);
});
