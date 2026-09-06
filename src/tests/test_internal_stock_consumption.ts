/**
 * TEST SUITE: CONSOMMATION INTERNE DU STOCK & TRANSFERT VERS SERVICE DE PRESTATION
 * 
 * Validates the 8 mandatory test cases:
 * - TEST 1: Config 1 carton = 500 consommations. Transfert 1 carton -> 500 consommations.
 * - TEST 2: Transfert 5 cartons -> 2 500 consommations.
 * - TEST 3: Disponible 500 consommations. Demande 600 -> REFUSÉ avec message d'alerte.
 * - TEST 4: Disponible 2 cartons. Demande 3 cartons -> REFUSÉ (Stock insuffisant).
 * - TEST 5: Disponible 10 cartons. Demande 1 carton -> ACCEPTÉ (Nouveau dispo: 9 cartons = 4 500 consommations).
 * - TEST 6: Aucune valeur erronée (ex: 2 500 000) n'est générée.
 * - TEST 7: Produit en paquet (1 paquet = 100 consommations, transfert 5 paquets = 500 consommations).
 * - TEST 8: Isolation multi-agence hermétique et protection anti-IDOR.
 */

import { dbStore } from '../server/db/mockStore';
import { calculateServiceStockConsumption } from '../lib/stockEngine';
import { Product } from '../types';

async function runInternalStockConsumptionTests() {
  console.log('================================================================');
  console.log('TESTS — CONSOMMATION INTERNE / TRANSFERT STOCK PRESTATION');
  console.log('================================================================\n');

  let passedTests = 0;
  const totalTests = 8;

  const TENANT_A = 'tenant-agency-a-stock';
  const TENANT_B = 'tenant-agency-b-stock';

  // Create Agency A product: Papier Ramette A4 (1 carton = 500 feuilles, 1 photocopie = 1 feuille => 1 carton = 500 consommations)
  const prodRam500Res = dbStore.createSecureProduct({
    code: 'RAM-A4-500',
    name: 'Papier Ramette A4 (Cond. 500)',
    category: 'Papeterie',
    baseUnit: 'feuille',
    costPrice: 500,
    initialStock: 5000, // 5 000 feuilles = 10 cartons (1 carton = 500 feuilles)
    packagings: [
      {
        id: 'pkg-ram500-carton',
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

  const ram500Prod = prodRam500Res.product!;

  // -------------------------------------------------------------------------
  // TEST 1 : 1 carton = 500 consommations -> Transfert 1 carton = 500 consommations
  // -------------------------------------------------------------------------
  console.log('--- TEST 1 : Transfert 1 carton (1 carton = 500 consommations) ---');

  const calc1 = calculateServiceStockConsumption(ram500Prod, 1, 'carton', null, 'Photocopie & Impression', 1);

  const t1_ok = (
    calc1.transferQty === 1 &&
    calc1.transferUnitName === 'carton' &&
    calc1.qtyInBaseUnit === 500 &&
    calc1.prestationCapacity === 500 &&
    calc1.isStockSufficient === true
  );

  if (t1_ok) {
    console.log(`✅ TEST 1 RÉUSSI :`);
    console.log(`   - Quantité transférée : ${calc1.transferQty} ${calc1.transferUnitName}`);
    console.log(`   - Équivalent base : ${calc1.qtyInBaseUnit} ${calc1.baseUnitName}s`);
    console.log(`   - Capacité de prestation : ${calc1.prestationCapacity} consommations (attendu: 500)`);
    passedTests++;
  } else {
    console.error('❌ TEST 1 ÉCHOUÉ :', calc1);
  }

  // -------------------------------------------------------------------------
  // TEST 2 : Transfert 5 cartons -> 2 500 consommations
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 2 : Transfert 5 cartons ---');

  const calc2 = calculateServiceStockConsumption(ram500Prod, 5, 'carton', null, 'Photocopie & Impression', 1);

  const t2_ok = (
    calc2.transferQty === 5 &&
    calc2.qtyInBaseUnit === 2500 &&
    calc2.prestationCapacity === 2500 &&
    calc2.isStockSufficient === true
  );

  if (t2_ok) {
    console.log(`✅ TEST 2 RÉUSSI :`);
    console.log(`   - Quantité transférée : ${calc2.transferQty} ${calc2.transferUnitName}s`);
    console.log(`   - Capacité de prestation : ${calc2.prestationCapacity} consommations (attendu: 2 500)`);
    passedTests++;
  } else {
    console.error('❌ TEST 2 ÉCHOUÉ :', calc2);
  }

  // -------------------------------------------------------------------------
  // TEST 3 : Stock disponible 500 consommations, demande 600 -> REFUSÉ
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 3 : Disponible 500 consommations, demande 600 -> Rejet strict ---');

  // Create product with only 500 sheets
  const prodSmallStock = dbStore.createSecureProduct({
    code: 'PROD-500-STOCK',
    name: 'Papier Stock 500',
    category: 'Papeterie',
    baseUnit: 'feuille',
    costPrice: 500,
    initialStock: 500, // Exactly 500 sheets available
  }, TENANT_A).product!;

  const calc3 = calculateServiceStockConsumption(prodSmallStock, 600, 'feuille', null, 'Photocopie & Impression', 1);

  // Backend rejection test
  const backendRes3 = dbStore.consumeSecureProductStock(
    prodSmallStock.id,
    600,
    'Photocopie & Impression',
    '',
    'Test dépassement',
    TENANT_A,
    'Opérateur Test'
  );

  const t3_ok = (
    calc3.isStockSufficient === false &&
    calc3.missingQtyInBase === 100 &&
    backendRes3.success === false &&
    backendRes3.statusCode === 400 &&
    backendRes3.message.includes('Quantité insuffisante')
  );

  if (t3_ok) {
    console.log(`✅ TEST 3 RÉUSSI : Rejet frontend & backend validé :`);
    console.log(`   - isStockSufficient = false (Manquant: ${calc3.missingQtyInBase} feuilles)`);
    console.log(`   - Message backend : "${backendRes3.message}"`);
    passedTests++;
  } else {
    console.error('❌ TEST 3 ÉCHOUÉ :', { calc3, backendRes3 });
  }

  // -------------------------------------------------------------------------
  // TEST 4 : Disponible 2 cartons (1 000 feuilles), demande 3 cartons -> REFUSÉ
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 4 : Disponible 2 cartons, demande 3 cartons -> Rejet strict ---');

  const prod2Cartons = dbStore.createSecureProduct({
    code: 'PROD-2-CARTONS',
    name: 'Papier 2 Cartons Dispo',
    category: 'Papeterie',
    baseUnit: 'feuille',
    costPrice: 500,
    initialStock: 1000, // 2 cartons * 500 feuilles = 1 000 feuilles
    packagings: [
      {
        id: 'pkg-2c-carton',
        level: 2,
        unitName: 'carton',
        containedQuantity: 500,
        subUnitName: 'feuille',
        factorToBase: 500,
        purchasePrice: 250000,
        isAllowedForPurchase: true,
        isAllowedForSale: true,
      }
    ]
  }, TENANT_A).product!;

  const calc4 = calculateServiceStockConsumption(prod2Cartons, 3, 'carton', null, 'Photocopie & Impression', 1);

  const backendRes4 = dbStore.consumeSecureProductStock(
    prod2Cartons.id,
    3,
    'Photocopie & Impression',
    '',
    'Demande 3 cartons',
    TENANT_A,
    'Opérateur Test',
    false,
    'carton'
  );

  const t4_ok = (
    calc4.isStockSufficient === false &&
    calc4.missingQtyInTransferUnit === 1 && // 1 carton missing
    calc4.missingQtyInBase === 500 && // 500 sheets missing
    backendRes4.success === false &&
    backendRes4.statusCode === 400
  );

  if (t4_ok) {
    console.log(`✅ TEST 4 RÉUSSI :`);
    console.log(`   - Demande 3 cartons sur 2 disponibles correctement refusée.`);
    console.log(`   - Manquant : ${calc4.missingQtyInTransferUnit} carton (${calc4.missingQtyInBase} feuilles)`);
    console.log(`   - Rejet serveur : "${backendRes4.message}"`);
    passedTests++;
  } else {
    console.error('❌ TEST 4 ÉCHOUÉ :', { calc4, backendRes4 });
  }

  // -------------------------------------------------------------------------
  // TEST 5 : Disponible 10 cartons, demande 1 carton -> ACCEPTÉ (Nouveau dispo : 9 cartons = 4 500 consommations)
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 5 : Disponible 10 cartons, demande 1 carton -> Succès & Solde exact ---');

  const calc5 = calculateServiceStockConsumption(ram500Prod, 1, 'carton', null, 'Photocopie & Impression', 1);

  const backendRes5 = dbStore.consumeSecureProductStock(
    ram500Prod.id,
    1,
    'Photocopie & Impression',
    'CMD-TEST-001',
    'Tirage 500 photocopies',
    TENANT_A,
    'Opérateur Test',
    false,
    'carton'
  );

  const updatedProdAfter5 = dbStore.getProductById(ram500Prod.id, TENANT_A).product!;
  const newDispoCartons = Math.floor(updatedProdAfter5.currentStock / 500);
  const newCapacite = updatedProdAfter5.currentStock; // 4 500

  const t5_ok = (
    backendRes5.success === true &&
    backendRes5.statusCode === 200 &&
    backendRes5.deductedBaseQty === 500 &&
    updatedProdAfter5.currentStock === 4500 &&
    newDispoCartons === 9 &&
    newCapacite === 4500
  );

  if (t5_ok) {
    console.log(`✅ TEST 5 RÉUSSI :`);
    console.log(`   - Transfert 1 carton validé avec succès.`);
    console.log(`   - Nouveau stock disponible : ${newDispoCartons} cartons (${updatedProdAfter5.currentStock} feuilles)`);
    console.log(`   - Capacité correspondante : ${newCapacite} consommations (attendu: 4 500)`);
    passedTests++;
  } else {
    console.error('❌ TEST 5 ÉCHOUÉ :', { backendRes5, updatedProdAfter5 });
  }

  // -------------------------------------------------------------------------
  // TEST 6 : Vérification qu'aucune valeur incohérente (comme 2 500 000) n'est générée
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 6 : Intégrité des calculs — Aucune valeur fallacieuse (2 500 000) ---');

  const check1Carton = calculateServiceStockConsumption(ram500Prod, 1, 'carton', null, 'Photocopie & Impression', 1);

  const capacityVal = check1Carton.prestationCapacity;
  const qtyBaseVal = check1Carton.qtyInBaseUnit;
  const t6_ok = (
    capacityVal === 500 &&
    qtyBaseVal === 500
  );

  if (t6_ok) {
    console.log(`✅ TEST 6 RÉUSSI :`);
    console.log(`   - Capacité pour 1 carton strictement égale à ${check1Carton.prestationCapacity} (et non 2 500 000)`);
    console.log(`   - Conversion certifiée : ${check1Carton.conversionSummary}`);
    passedTests++;
  } else {
    console.error('❌ TEST 6 ÉCHOUÉ : Valeur erronée détectée !', check1Carton);
  }

  // -------------------------------------------------------------------------
  // TEST 7 : Produit en paquet (1 paquet = 100 consommations, transfert 5 paquets = 500 consommations)
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 7 : Produit avec conditionnement en paquet (1 paquet = 100 consommations) ---');

  const prodPaquet100 = dbStore.createSecureProduct({
    code: 'PROD-PAQ-100',
    name: 'Papier Photo 10x15 (Paquet 100)',
    category: 'Papeterie Photo',
    baseUnit: 'feuille',
    costPrice: 1000,
    initialStock: 1000, // 10 paquets de 100 feuilles
    packagings: [
      {
        id: 'pkg-paq-100',
        level: 2,
        unitName: 'paquet',
        containedQuantity: 100,
        subUnitName: 'feuille',
        factorToBase: 100,
        purchasePrice: 90000,
        isAllowedForPurchase: true,
        isAllowedForSale: true,
        isDefaultPurchaseUnit: true,
      }
    ]
  }, TENANT_A).product!;

  const calc7 = calculateServiceStockConsumption(prodPaquet100, 5, 'paquet', null, 'Tirage Photo 10x15', 1);

  const t7_ok = (
    calc7.transferQty === 5 &&
    calc7.transferUnitName === 'paquet' &&
    calc7.factorToBase === 100 &&
    calc7.qtyInBaseUnit === 500 &&
    calc7.prestationCapacity === 500 &&
    calc7.isStockSufficient === true
  );

  if (t7_ok) {
    console.log(`✅ TEST 7 RÉUSSI :`);
    console.log(`   - Configuration : 1 paquet = ${calc7.factorToBase} feuilles = 100 consommations`);
    console.log(`   - Transfert 5 paquets -> ${calc7.qtyInBaseUnit} feuilles -> ${calc7.prestationCapacity} consommations (attendu: 500)`);
    passedTests++;
  } else {
    console.error('❌ TEST 7 ÉCHOUÉ :', calc7);
  }

  // -------------------------------------------------------------------------
  // TEST 8 : Multi-Agence — Isolation stricte et rejet IDOR
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 8 : Isolation Multi-Agence et Protection IDOR ---');

  // Create product in Agency B
  const prodAgencyB = dbStore.createSecureProduct({
    code: 'PROD-AGENCY-B',
    name: 'Papier Agence B',
    category: 'Papeterie',
    baseUnit: 'feuille',
    costPrice: 600,
    initialStock: 2000,
  }, TENANT_B).product!;

  // Agency A attempts to consume Agency B's product
  const idorConsumeRes = dbStore.consumeSecureProductStock(
    prodAgencyB.id,
    100,
    'Photocopie & Impression',
    '',
    'Tentative IDOR',
    TENANT_A,
    'Hacker',
    false
  );

  // Agency B consumes its own product legitimately
  const legitimateBRes = dbStore.consumeSecureProductStock(
    prodAgencyB.id,
    200,
    'Photocopie & Impression',
    'CMD-B-001',
    'Consommation légitime Agence B',
    TENANT_B,
    'Gestionnaire B',
    false
  );

  const updatedProdB = dbStore.getProductById(prodAgencyB.id, TENANT_B).product!;

  const t8_ok = (
    idorConsumeRes.success === false &&
    idorConsumeRes.statusCode === 403 &&
    legitimateBRes.success === true &&
    legitimateBRes.statusCode === 200 &&
    updatedProdB.currentStock === 1800 // 2000 - 200 = 1800
  );

  if (t8_ok) {
    console.log(`✅ TEST 8 RÉUSSI :`);
    console.log(`   - Tentative de consommation du stock Agence B par Agence A -> Rejetée HTTP 403 Forbidden.`);
    console.log(`   - Consommation légitime Agence B validée (Stock B : ${updatedProdB.currentStock} feuilles).`);
    passedTests++;
  } else {
    console.error('❌ TEST 8 ÉCHOUÉ :', { idorConsumeRes, legitimateBRes });
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

runInternalStockConsumptionTests().catch(err => {
  console.error('FATAL TEST ERROR:', err);
  process.exit(1);
});
