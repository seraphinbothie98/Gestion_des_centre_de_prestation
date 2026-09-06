/**
 * TEST SUITE: BON DE COMMANDE FOURNISSEUR — CONDITIONNEMENT & PRIX D'ACHAT CONFIGURÉ
 * 
 * Validates the mandatory scenarios from the specifications:
 * 1. Configuration & Resolution of Ramette A4 (1 paquet = 500 feuilles, 1 carton = 5 paquets = 2500 feuilles, 1 250 000 GNF / carton).
 * 2. Purchase Order creation in commercial unit (10 cartons = 25 000 feuilles, unit price 1 250 000 GNF, total 12 500 000 GNF).
 * 3. Unit changes consistency (5 cartons = 12 500 feuilles, 20 paquets = 10 000 feuilles, 10 000 feuilles = 10 000 feuilles).
 * 4. Pricing priority (1 paquet = 250 000 GNF, 1 carton = 1 250 000 GNF; fallback to base cost price converted if no specific price).
 * 5. Price freezing (subsequent catalog price changes do NOT modify past PO prices).
 * 6. Partial and full supplier reception (6 cartons received -> +15 000 feuilles stock, 4 cartons remaining).
 * 7. Multi-tenant agency isolation (Agency A vs Agency B hermetic isolation and IDOR protection).
 */

import { dbStore } from '../server/db/mockStore';
import { resolveProductPurchasePrice, getProductPurchaseUnits, getAvailableProductUnits } from '../lib/stockEngine';
import { Product } from '../types';

async function runPurchaseOrderTests() {
  console.log('================================================================');
  console.log('TESTS — BON DE COMMANDE FOURNISSEUR (CONDITIONNEMENT & PRIX)');
  console.log('================================================================\n');

  let passedTests = 0;
  const totalTests = 7;

  const TENANT_A = 't-001';
  const TENANT_B = 't-002';

  // -------------------------------------------------------------------------
  // SCÉNARIO 1 : Configuration et Résolution du Cas RAM A4
  // -------------------------------------------------------------------------
  console.log('--- TEST 1 : Résolution du Produit « Papier Ramette A4 » multi-niveaux ---');

  const prodRamA4Res = dbStore.createSecureProduct({
    code: 'TEST-RAM-A4',
    name: 'Papier Ramette A4 80g Test',
    category: 'Papeterie',
    baseUnit: 'feuille',
    costPrice: 500, // 500 GNF / feuille
    initialStock: 0,
    packagings: [
      {
        id: 'pkg-ram-1',
        level: 2,
        unitName: 'paquet',
        containedQuantity: 500,
        subUnitName: 'feuille',
        factorToBase: 500,
        purchasePrice: 250000, // 250 000 GNF / paquet
        isAllowedForPurchase: true,
        isAllowedForSale: true,
      },
      {
        id: 'pkg-ram-2',
        level: 3,
        unitName: 'carton',
        containedQuantity: 5,
        subUnitName: 'paquet',
        factorToBase: 2500,
        purchasePrice: 1250000, // 1 250 000 GNF / carton
        isAllowedForPurchase: true,
        isAllowedForSale: true,
        isDefaultPurchaseUnit: true,
      }
    ]
  }, TENANT_A);

  const ramA4 = prodRamA4Res.product!;

  const resCarton = resolveProductPurchasePrice(ramA4, 'carton');
  const resPaquet = resolveProductPurchasePrice(ramA4, 'paquet');
  const resFeuille = resolveProductPurchasePrice(ramA4, 'feuille');

  const t1_ok = (
    resCarton.factorToBase === 2500 &&
    resCarton.unitPrice === 1250000 &&
    resCarton.isSpecificPrice === true &&
    resPaquet.factorToBase === 500 &&
    resPaquet.unitPrice === 250000 &&
    resFeuille.factorToBase === 1 &&
    resFeuille.unitPrice === 500
  );

  if (t1_ok) {
    console.log(`✅ TEST 1 RÉUSSI : Facteurs et prix d'achat résolus avec succès :`);
    console.log(`   - Carton : ${resCarton.unitPrice.toLocaleString('fr-FR')} GNF (1 carton = ${resCarton.factorToBase} feuilles)`);
    console.log(`   - Paquet : ${resPaquet.unitPrice.toLocaleString('fr-FR')} GNF (1 paquet = ${resPaquet.factorToBase} feuilles)`);
    console.log(`   - Feuille : ${resFeuille.unitPrice.toLocaleString('fr-FR')} GNF`);
    passedTests++;
  } else {
    console.error('❌ TEST 1 ÉCHOUÉ : Erreur de résolution des prix ou facteurs', { resCarton, resPaquet, resFeuille });
  }

  // -------------------------------------------------------------------------
  // SCÉNARIO 2 : Émission du Bon de Commande en Unité Commerciale (10 Cartons)
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 2 : Émission BC — 10 Cartons de RAM A4 ---');

  const suppliers = dbStore.getSuppliersByTenant(TENANT_A);
  const supplierId = suppliers[0]?.id || 'sup-01';

  const poRes = dbStore.createSecurePurchaseOrder({
    supplierId,
    orderDate: '2026-09-01',
    items: [
      {
        productId: ramA4.id,
        orderedQuantityPurchaseUnit: 10,
        purchaseUnitName: 'carton',
      }
    ]
  }, TENANT_A, 'Gestionnaire Test');

  const createdPO = poRes.purchaseOrder;
  const poItem = createdPO?.items[0];

  const t2_ok = (
    poRes.success &&
    createdPO &&
    createdPO.totalAmount === 12500000 &&
    poItem &&
    poItem.orderedQuantityPurchaseUnit === 10 &&
    poItem.purchaseUnitName === 'carton' &&
    poItem.conversionFactor === 2500 &&
    poItem.quantityInStockUnit === 25000 &&
    poItem.unitPricePurchaseUnit === 1250000 &&
    poItem.totalPrice === 12500000
  );

  if (t2_ok) {
    console.log(`✅ TEST 2 RÉUSSI : Bon de commande ${createdPO.poNumber} émis :`);
    console.log(`   - Quantité commerciale : ${poItem.orderedQuantityPurchaseUnit} ${poItem.purchaseUnitName}s`);
    console.log(`   - Équivalent Stock : ${poItem.quantityInStockUnit.toLocaleString('fr-FR')} ${poItem.stockUnitName}s`);
    console.log(`   - Prix unitaire : ${poItem.unitPricePurchaseUnit.toLocaleString('fr-FR')} GNF / carton`);
    console.log(`   - Montant total : ${poItem.totalPrice.toLocaleString('fr-FR')} GNF`);
    passedTests++;
  } else {
    console.error('❌ TEST 2 ÉCHOUÉ : Données du bon de commande incorrectes', poRes);
  }

  // -------------------------------------------------------------------------
  // SCÉNARIO 3 : Test des Changements d'Unités et Conversions
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 3 : Changement d\'unité et équivalences de stock ---');

  const c5_cartons = 5 * resolveProductPurchasePrice(ramA4, 'carton').factorToBase; // 5 * 2500 = 12500
  const c20_paquets = 20 * resolveProductPurchasePrice(ramA4, 'paquet').factorToBase; // 20 * 500 = 10000
  const c10000_feuilles = 10000 * resolveProductPurchasePrice(ramA4, 'feuille').factorToBase; // 10000 * 1 = 10000

  const t3_ok = (
    c5_cartons === 12500 &&
    c20_paquets === 10000 &&
    c10000_feuilles === 10000
  );

  if (t3_ok) {
    console.log(`✅ TEST 3 RÉUSSI : Calculs de conversion rigoureusement exacts :`);
    console.log(`   - 5 cartons = ${c5_cartons.toLocaleString('fr-FR')} feuilles (attendu: 12 500)`);
    console.log(`   - 20 paquets = ${c20_paquets.toLocaleString('fr-FR')} feuilles (attendu: 10 000)`);
    console.log(`   - 10 000 feuilles = ${c10000_feuilles.toLocaleString('fr-FR')} feuilles (attendu: 10 000)`);
    passedTests++;
  } else {
    console.error('❌ TEST 3 ÉCHOUÉ : Erreur lors des conversions d\'unités');
  }

  // -------------------------------------------------------------------------
  // SCÉNARIO 4 : Priorité des Prix & Fallback
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 4 : Priorité des prix (Prix spécifique vs Fallback converti) ---');

  // Create product with only base costPrice (no packaging purchasePrice set)
  const prodFallbackRes = dbStore.createSecureProduct({
    code: 'TEST-PROD-FALLBACK',
    name: 'Papier Traceur Rouleau 80g',
    category: 'Papeterie',
    baseUnit: 'mètre',
    costPrice: 4000, // 4 000 GNF / mètre
    packagings: [
      {
        id: 'pkg-fb-1',
        level: 2,
        unitName: 'rouleau',
        containedQuantity: 50,
        subUnitName: 'mètre',
        factorToBase: 50,
        // purchasePrice is undefined on purpose
        isAllowedForPurchase: true,
        isAllowedForSale: true,
      }
    ]
  }, TENANT_A);

  const fallbackProd = prodFallbackRes.product!;
  const fallbackRes = resolveProductPurchasePrice(fallbackProd, 'rouleau');

  // Should fallback to costPrice * factorToBase = 4000 * 50 = 200 000 GNF
  const t4_ok = (
    fallbackRes.unitPrice === 200000 &&
    fallbackRes.isSpecificPrice === false &&
    fallbackRes.factorToBase === 50
  );

  if (t4_ok) {
    console.log(`✅ TEST 4 RÉUSSI : Ordre de priorité validé :`);
    console.log(`   - Prix spécifique RAM A4 carton : ${resCarton.unitPrice.toLocaleString('fr-FR')} GNF (priorité 1)`);
    console.log(`   - Fallback Rouleau (50m @ 4 000 GNF/m) : ${fallbackRes.unitPrice.toLocaleString('fr-FR')} GNF (priorité 2)`);
    passedTests++;
  } else {
    console.error('❌ TEST 4 ÉCHOUÉ : Erreur dans l\'ordre de priorité du prix', fallbackRes);
  }

  // -------------------------------------------------------------------------
  // SCÉNARIO 5 : Gel des Prix dans la Commande (Immutabilité)
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 5 : Gel du prix dans les commandes existantes ---');

  // Update catalog price for RAM A4 carton to 1 300 000 GNF
  dbStore.updateSecureProduct(ramA4.id, {
    packagings: [
      {
        id: 'pkg-ram-1',
        level: 2,
        unitName: 'paquet',
        containedQuantity: 500,
        subUnitName: 'feuille',
        factorToBase: 500,
        purchasePrice: 260000,
        isAllowedForPurchase: true,
        isAllowedForSale: true,
      },
      {
        id: 'pkg-ram-2',
        level: 3,
        unitName: 'carton',
        containedQuantity: 5,
        subUnitName: 'paquet',
        factorToBase: 2500,
        purchasePrice: 1300000, // Price updated to 1 300 000 GNF
        isAllowedForPurchase: true,
        isAllowedForSale: true,
        isDefaultPurchaseUnit: true,
      }
    ]
  }, TENANT_A);

  // Check that the existing purchase order STILL holds the original price 1 250 000 GNF
  const fetchedPO = dbStore.getPurchaseOrderById(createdPO!.id, TENANT_A).purchaseOrder!;
  const frozenItem = fetchedPO.items[0];

  const t5_ok = (
    frozenItem.unitPricePurchaseUnit === 1250000 &&
    frozenItem.totalPrice === 12500000 &&
    fetchedPO.totalAmount === 12500000
  );

  if (t5_ok) {
    console.log(`✅ TEST 5 RÉUSSI : Le prix du bon de commande ${fetchedPO.poNumber} est resté gelé à ${frozenItem.unitPricePurchaseUnit.toLocaleString('fr-FR')} GNF (le catalogue a changé à 1 300 000 GNF).`);
    passedTests++;
  } else {
    console.error('❌ TEST 5 ÉCHOUÉ : Le prix de la commande existante a été altéré !', frozenItem);
  }

  // -------------------------------------------------------------------------
  // SCÉNARIO 6 : Réception Partielle (6 Cartons) puis Complète (+4 Cartons)
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 6 : Réception partielle (6 cartons) et totale (+4 cartons) ---');

  const stockBeforeReception = dbStore.getProductById(ramA4.id, TENANT_A).product!.currentStock; // 0

  // 1. Partial reception: 6 cartons out of 10
  const partialRecRes = dbStore.receiveSecurePurchaseOrder(
    createdPO!.id,
    { [ramA4.id]: 6 },
    TENANT_A,
    'Chef Réception',
    false,
    'Livraison partielle 6 cartons'
  );

  const poAfterPartial = partialRecRes.purchaseOrder!;
  const stockAfterPartial = dbStore.getProductById(ramA4.id, TENANT_A).product!.currentStock;
  const remainingCartons = poAfterPartial.items[0].orderedQuantityPurchaseUnit - (poAfterPartial.items[0].receivedQuantityPurchaseUnit || 0);

  // 2. Complete remaining 4 cartons
  const finalRecRes = dbStore.receiveSecurePurchaseOrder(
    createdPO!.id,
    { [ramA4.id]: 4 },
    TENANT_A,
    'Chef Réception',
    false,
    'Solde 4 cartons'
  );

  const poAfterFinal = finalRecRes.purchaseOrder!;
  const stockAfterFinal = dbStore.getProductById(ramA4.id, TENANT_A).product!.currentStock;

  const t6_ok = (
    poAfterPartial.status === 'PARTIALLY_RECEIVED' &&
    poAfterPartial.items[0].receivedQuantityPurchaseUnit === 6 &&
    stockAfterPartial === 15000 && // 6 * 2500 = 15 000 feuilles
    remainingCartons === 4 &&
    poAfterFinal.status === 'RECEIVED' &&
    poAfterFinal.items[0].receivedQuantityPurchaseUnit === 10 &&
    stockAfterFinal === 25000 // 10 * 2500 = 25 000 feuilles
  );

  if (t6_ok) {
    console.log(`✅ TEST 6 RÉUSSI : Réceptions conformes :`);
    console.log(`   - Réception partielle : 6 cartons -> Stock +${stockAfterPartial.toLocaleString('fr-FR')} feuilles (Reste: ${remainingCartons} cartons) | Statut: ${poAfterPartial.status}`);
    console.log(`   - Réception finale : +4 cartons -> Stock total: ${stockAfterFinal.toLocaleString('fr-FR')} feuilles | Statut: ${poAfterFinal.status}`);
    passedTests++;
  } else {
    console.error('❌ TEST 6 ÉCHOUÉ : Erreur de calcul de réception stock', { stockAfterPartial, stockAfterFinal, poAfterPartial, poAfterFinal });
  }

  // -------------------------------------------------------------------------
  // SCÉNARIO 7 : Isolation Multi-Agence (Agence A vs Agence B)
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 7 : Isolation Multi-Agence et Protection IDOR ---');

  // Create RAM A4 in Agency B with different price (1 carton = 1 400 000 GNF)
  const prodBRam = dbStore.createSecureProduct({
    code: 'TEST-RAM-B',
    name: 'Papier Ramette A4 Agence B',
    category: 'Papeterie',
    baseUnit: 'feuille',
    costPrice: 560,
    packagings: [
      {
        id: 'pkg-ram-b1',
        level: 2,
        unitName: 'carton',
        containedQuantity: 2500,
        subUnitName: 'feuille',
        factorToBase: 2500,
        purchasePrice: 1400000, // Agency B specific price
        isAllowedForPurchase: true,
        isAllowedForSale: true,
      }
    ]
  }, TENANT_B).product!;

  // Agency A attempts to read PO from Agency B or use product from B
  const idorPoAccess = dbStore.getPurchaseOrderById(createdPO!.id, TENANT_B, false);
  const idorPoCreation = dbStore.createSecurePurchaseOrder({
    supplierId,
    items: [{ productId: prodBRam.id, orderedQuantityPurchaseUnit: 2, purchaseUnitName: 'carton' }]
  }, TENANT_A, 'Hacker', false);

  const poListA = dbStore.getPurchaseOrdersByTenant(TENANT_A, false);
  const poListB = dbStore.getPurchaseOrdersByTenant(TENANT_B, false);

  const t7_ok = (
    idorPoAccess.success === false &&
    idorPoAccess.statusCode === 403 &&
    idorPoCreation.success === false &&
    idorPoCreation.statusCode === 403 &&
    !poListB.some(po => po.tenantId !== TENANT_B) &&
    !poListA.some(po => po.tenantId !== TENANT_A)
  );

  if (t7_ok) {
    console.log(`✅ TEST 7 RÉUSSI : Isolation multi-agence hermétique :`);
    console.log(`   - Tentative accès IDOR commande Agence A par Agence B -> 403 Forbidden bloqué.`);
    console.log(`   - Tentative création commande Agence A avec produit Agence B -> 403 Forbidden bloqué.`);
    console.log(`   - Commandes Agence A (${poListA.length}) et B (${poListB.length}) 100% isolées.`);
    passedTests++;
  } else {
    console.error('❌ TEST 7 ÉCHOUÉ : Faille d\'isolation multi-agence', { idorPoAccess, idorPoCreation });
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

runPurchaseOrderTests().catch(err => {
  console.error('FATAL TEST RUN ERROR:', err);
  process.exit(1);
});
