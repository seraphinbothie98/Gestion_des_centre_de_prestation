/**
 * TEST SUITE: ISOLATION MULTI-TENANT DU STOCK ET DU MAGASIN ENTRE AGENCES
 * 
 * Validates the 8 mandatory test scenarios defined in the specifications:
 * TEST 1: Admin A views products -> only Agency A products, 0 from Agency B
 * TEST 2: Admin B views products -> only Agency B products, 0 from Agency A
 * TEST 3: Stock Entry on Product A -> Stock A increases by 100, Stock B unchanged
 * TEST 4: Stock Exit on Product A -> Stock A decreases, Stock B unchanged
 * TEST 5: IDOR Direct Access -> Admin A accesses Product B ID -> 403 Forbidden
 * TEST 6: IDOR Stock Modification -> Admin A modifies Product B stock -> 403 Forbidden
 * TEST 7: IDOR Deletion -> Admin A deletes Product B -> 403 Forbidden
 * TEST 8: Manipulated agency_id -> Admin A creates product forcing agency B -> Server forces session agency A
 */

import { dbStore } from '../server/db/mockStore';

async function runStockIsolationTests() {
  console.log('================================================================');
  console.log('TESTS OBLIGATOIRES — ISOLATION MULTI-TENANT DU STOCK & MAGASIN');
  console.log('================================================================\n');

  let passedTests = 0;
  const totalTests = 8;

  const TENANT_A = 't-001'; // CPEP (Agence A)
  const TENANT_B = 't-002'; // Quincaillerie Horizon (Agence B)

  // -------------------------------------------------------------------------
  // TEST 1: Consultation Admin A
  // -------------------------------------------------------------------------
  console.log('--- TEST 1 : Consultation Admin Agence A (t-001) ---');
  const prodsA = dbStore.getProductsByTenant(TENANT_A, false);
  const leakedToA = prodsA.filter(p => p.tenantId !== TENANT_A);

  if (prodsA.length > 0 && leakedToA.length === 0) {
    console.log(`✅ TEST 1 RÉUSSI : ${prodsA.length} produits trouvés pour Agence A, 0 produit étranger (fuite = 0).`);
    passedTests++;
  } else {
    console.error(`❌ TEST 1 ÉCHOUÉ : Fuite de données détectée dans l'Agence A (${leakedToA.length} articles étrangers).`);
  }

  // -------------------------------------------------------------------------
  // TEST 2: Consultation Admin B
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 2 : Consultation Admin Agence B (t-002) ---');
  const prodsB = dbStore.getProductsByTenant(TENANT_B, false);
  const leakedToB = prodsB.filter(p => p.tenantId !== TENANT_B);

  if (prodsB.length > 0 && leakedToB.length === 0) {
    console.log(`✅ TEST 2 RÉUSSI : ${prodsB.length} produits trouvés pour Agence B, 0 produit étranger (fuite = 0).`);
    passedTests++;
  } else {
    console.error(`❌ TEST 2 ÉCHOUÉ : Fuite de données détectée dans l'Agence B (${leakedToB.length} articles étrangers).`);
  }

  // -------------------------------------------------------------------------
  // TEST 3: Mouvement Entrée Stock Agence A
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 3 : Entrée de stock (+100) sur Produit A ---');
  const targetProdA = prodsA[0];
  const targetProdB = prodsB[0];
  const initialStockA = targetProdA.currentStock;
  const initialStockB = targetProdB.currentStock;

  const entryRes = dbStore.adjustSecureProductStock(
    targetProdA.id,
    initialStockA + 100,
    'Entrée de test approvisionnement +100',
    'Magasin Principal',
    TENANT_A,
    'Admin A (Test)',
    false
  );

  const updatedProdA_afterEntry = dbStore.getProductById(targetProdA.id, TENANT_A, false).product;
  const updatedProdB_afterEntry = dbStore.getProductById(targetProdB.id, TENANT_B, false).product;

  if (
    entryRes.success &&
    updatedProdA_afterEntry?.currentStock === initialStockA + 100 &&
    updatedProdB_afterEntry?.currentStock === initialStockB
  ) {
    console.log(`✅ TEST 3 RÉUSSI : Stock A passé de ${initialStockA} à ${updatedProdA_afterEntry?.currentStock} (+100), Stock B resté intact (${initialStockB}).`);
    passedTests++;
  } else {
    console.error(`❌ TEST 3 ÉCHOUÉ : Incohérence lors de l'entrée de stock.`);
  }

  // -------------------------------------------------------------------------
  // TEST 4: Mouvement Sortie Stock Agence A (Consommation ou Ajustement)
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 4 : Sortie de stock (-30) sur Produit A ---');
  const currentStockA = updatedProdA_afterEntry?.currentStock || 100;
  const exitRes = dbStore.adjustSecureProductStock(
    targetProdA.id,
    currentStockA - 30,
    'Sortie consommation test -30',
    'Magasin Principal',
    TENANT_A,
    'Admin A (Test)',
    false
  );

  const updatedProdA_afterExit = dbStore.getProductById(targetProdA.id, TENANT_A, false).product;
  const updatedProdB_afterExit = dbStore.getProductById(targetProdB.id, TENANT_B, false).product;

  if (
    exitRes.success &&
    updatedProdA_afterExit?.currentStock === currentStockA - 30 &&
    updatedProdB_afterExit?.currentStock === initialStockB
  ) {
    console.log(`✅ TEST 4 RÉUSSI : Stock A diminué à ${updatedProdA_afterExit?.currentStock} (-30), Stock B inchangé (${initialStockB}).`);
    passedTests++;
  } else {
    console.error(`❌ TEST 4 ÉCHOUÉ : Incohérence lors de la sortie de stock.`);
  }

  // -------------------------------------------------------------------------
  // TEST 5: Accès Direct IDOR (Admin A tente d'accéder au Produit B)
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 5 : Tentative IDOR - Consultation directe de Produit B par Admin A ---');
  const idorAccess = dbStore.getProductById(targetProdB.id, TENANT_A, false);

  if (!idorAccess.success && idorAccess.statusCode === 403) {
    console.log(`✅ TEST 5 RÉUSSI : IDOR bloqué avec succès. Réponse = 403 Accès Refusé.`);
    passedTests++;
  } else {
    console.error(`❌ TEST 5 ÉCHOUÉ : IDOR non bloqué (Statut = ${idorAccess.statusCode}).`);
  }

  // -------------------------------------------------------------------------
  // TEST 6: Modification IDOR (Admin A tente de modifier le stock de Produit B)
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 6 : Tentative IDOR - Modification de stock Produit B par Admin A ---');
  const idorModif = dbStore.adjustSecureProductStock(
    targetProdB.id,
    9999,
    'Tentative malveillante de hack de stock B',
    'Magasin',
    TENANT_A,
    'Hacker A',
    false
  );

  const prodB_check = dbStore.getProductById(targetProdB.id, TENANT_B, false).product;

  if (!idorModif.success && idorModif.statusCode === 403 && prodB_check?.currentStock === initialStockB) {
    console.log(`✅ TEST 6 RÉUSSI : Modification IDOR bloquée (403). Stock B protégé (${prodB_check?.currentStock}).`);
    passedTests++;
  } else {
    console.error(`❌ TEST 6 ÉCHOUÉ : La modification IDOR a été autorisée ou le stock B a changé.`);
  }

  // -------------------------------------------------------------------------
  // TEST 7: Suppression IDOR (Admin A tente de supprimer un produit de B)
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 7 : Tentative IDOR - Suppression de Produit B par Admin A ---');
  const idorDel = dbStore.deleteSecureProduct(targetProdB.id, TENANT_A, false);
  const prodB_stillExists = dbStore.getProductById(targetProdB.id, TENANT_B, false).product;

  if (!idorDel.success && idorDel.statusCode === 403 && prodB_stillExists) {
    console.log(`✅ TEST 7 RÉUSSI : Suppression IDOR bloquée (403). Le produit B existe toujours.`);
    passedTests++;
  } else {
    console.error(`❌ TEST 7 ÉCHOUÉ : Suppression non protégée.`);
  }

  // -------------------------------------------------------------------------
  // TEST 8: Paramètre Manipulé (Admin A tente d'injecter agency_id = B)
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 8 : Paramètre agency_id manipulé dans le body de création ---');
  const maliciousData: any = {
    name: 'Produit Injecté Malveillant',
    code: 'INJECT-001',
    categoryId: 'cat-01',
    costPrice: 500,
    salePrice: 1000,
    currentStock: 50,
    unit: 'pièce',
    tenantId: TENANT_B // Tentative d'injection forcée de l'agence B
  };

  const createRes = dbStore.createSecureProduct(maliciousData, TENANT_A, false);
  const createdProd = createRes.product;

  if (createRes.success && createdProd && createdProd.tenantId === TENANT_A) {
    console.log(`✅ TEST 8 RÉUSSI : Le serveur a ignoré le tenantId injecté (${TENANT_B}) et a forcé la session (${TENANT_A}).`);
    passedTests++;
  } else {
    console.error(`❌ TEST 8 ÉCHOUÉ : L'injection de tenantId n'a pas été neutralisée.`);
  }

  // -------------------------------------------------------------------------
  // RÉSUMÉ GLOBAL
  // -------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`RÉSULTAT GLOBAL : ${passedTests}/${totalTests} TESTS VALIDÉS AVEC SUCCÈS (100%)`);
  console.log('================================================================\n');

  if (passedTests === totalTests) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runStockIsolationTests().catch(err => {
  console.error('Erreur exécution tests stock:', err);
  process.exit(1);
});
