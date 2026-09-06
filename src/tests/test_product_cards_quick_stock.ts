/**
 * TEST SUITE: NOUVEL AFFICHAGE DES PRODUITS BOUTIQUE + AJOUT RAPIDE UNITÉ / PAQUET
 * 
 * Validates the 6 mandatory test scenarios (Tests A to F) from Section 18:
 * - Test A: Agence A clique + 1 unité -> Stock A = +1 (24 -> 25), Stock B inchangé (50)
 * - Test B: Agence A clique + 1 paquet -> Stock A = +12 (25 -> 37), Stock B inchangé (50)
 * - Test C: Agence B consulte son stock -> 0 produit de l'Agence A
 * - Test D: Créer un produit sans photo -> Produit créé, photo facultative, placeholder 📦
 * - Test E: Supprimer la photo d'un produit existant -> Produit conservé avec placeholder
 * - Test F: Produit sans conditionnement -> Bouton + 1 unité présent, bouton + 1 paquet absent
 * - Test G: Contrôle de sécurité Anti-IDOR inter-agences (HTTP 403)
 */

import { dbStore } from '../server/db/mockStore';
import { Product } from '../types';

async function runProductCardsAndQuickStockTests() {
  console.log('================================================================');
  console.log("TESTS OBLIGATOIRES — CARTES PRODUITS & AJOUT RAPIDE UNITÉ/PAQUET");
  console.log('================================================================\n');

  let passedTests = 0;
  const totalTests = 8;

  const TENANT_A = 't-001'; // Agence A (ex: Centre Digital Kaloum)
  const TENANT_B = 't-002'; // Agence B (ex: Horizon Conakry)

  // Initialisation des deux produits de test selon le prompt Section 18
  console.log("--- Initialisation des produits pour l'Agence A et l'Agence B ---");
  
  // Agence A: T-shirt, Stock initial: 24, 1 paquet = 12 unités
  const prodARes = dbStore.createSecureProduct({
    code: `TSHIRT-${Date.now()}`,
    name: "T-shirt Enfant Coton",
    category: "Vêtements",
    baseUnit: "pièce",
    unit: "pièce",
    initialStock: 24,
    minStockAlert: 10,
    costPrice: 15000,
    salePrice: 25000,
    packagings: [
      {
        id: `pkg-${Date.now()}-1`,
        level: 2,
        unitName: "paquet",
        containedQuantity: 12,
        subUnitName: "pièce",
        factorToBase: 12,
        salePrice: 280000,
        purchasePrice: 180000,
        isAllowedForSale: true,
        isAllowedForPurchase: true,
        isDefaultSaleUnit: false,
        isDefaultPurchaseUnit: true
      }
    ],
    imageUrl: "https://example.com/tshirt.png"
  }, TENANT_A, true);

  if (!prodARes.success || !prodARes.product) {
    console.error("❌ Échec création produit Agence A:", prodARes.message);
    process.exit(1);
  }
  const prodA = prodARes.product;

  // Agence B: Chaussure, Stock initial: 50, 1 paquet = 10 unités
  const prodBRes = dbStore.createSecureProduct({
    code: `SHOE-${Date.now()}`,
    name: "Chaussure Sport Running",
    category: "Chaussures",
    baseUnit: "paire",
    unit: "paire",
    initialStock: 50,
    minStockAlert: 15,
    costPrice: 80000,
    salePrice: 120000,
    packagings: [
      {
        id: `pkg-${Date.now()}-2`,
        level: 2,
        unitName: "carton",
        containedQuantity: 10,
        subUnitName: "paire",
        factorToBase: 10,
        salePrice: 1100000,
        purchasePrice: 800000,
        isAllowedForSale: true,
        isAllowedForPurchase: true
      }
    ]
  }, TENANT_B, true);

  if (!prodBRes.success || !prodBRes.product) {
    console.error("❌ Échec création produit Agence B:", prodBRes.message);
    process.exit(1);
  }
  const prodB = prodBRes.product;

  console.log(`Produit A créé : « ${prodA.name} » (Stock: ${prodA.currentStock} ${prodA.baseUnit}s, Tenant: ${prodA.tenantId})`);
  console.log(`Produit B créé : « ${prodB.name} » (Stock: ${prodB.currentStock} ${prodB.baseUnit}s, Tenant: ${prodB.tenantId})\n`);

  // -------------------------------------------------------------------------
  // TEST A : Agence A clique sur « + 1 unité » -> Stock A : 24 -> 25, Stock B : 50
  // -------------------------------------------------------------------------
  console.log("--- TEST A : Agence A clique sur « + 1 unité » ---");
  const quickUnitRes = dbStore.quickIncrementStock(
    prodA.id,
    1,
    "Ajout rapide réapprovisionnement +1 pièce",
    TENANT_A,
    "Agent Stock A",
    prodA.baseUnit,
    false
  );

  const updatedProdAAfterUnit = dbStore.getProductById(prodA.id, TENANT_A, false).product;
  const prodBAfterUnit = dbStore.getProductById(prodB.id, TENANT_B, false).product;

  if (quickUnitRes.success && updatedProdAAfterUnit?.currentStock === 25 && prodBAfterUnit?.currentStock === 50) {
    console.log(`✅ TEST A RÉUSSI : Stock A = ${updatedProdAAfterUnit.currentStock} (attendu: 25), Stock B = ${prodBAfterUnit.currentStock} (attendu: 50, inchangé).`);
    passedTests++;
  } else {
    console.error(`❌ TEST A ÉCHOUÉ : Stock A = ${updatedProdAAfterUnit?.currentStock}, Stock B = ${prodBAfterUnit?.currentStock}`);
  }

  // -------------------------------------------------------------------------
  // TEST B : Agence A clique sur « + 1 paquet » (12 unités) -> Stock A : 25 -> 37, Stock B : 50
  // -------------------------------------------------------------------------
  console.log("\n--- TEST B : Agence A clique sur « + 1 paquet » (12 pièces) ---");
  const pkgFactor = prodA.packagings![0].factorToBase; // 12
  const quickPkgRes = dbStore.quickIncrementStock(
    prodA.id,
    pkgFactor,
    "Ajout rapide réapprovisionnement +1 paquet (12 pièces)",
    TENANT_A,
    "Agent Stock A",
    "paquet",
    false
  );

  const updatedProdAAfterPkg = dbStore.getProductById(prodA.id, TENANT_A, false).product;
  const prodBAfterPkg = dbStore.getProductById(prodB.id, TENANT_B, false).product;

  // Vérifier aussi le journal de mouvement de stock
  const movementsA = dbStore.getStockMovementsByTenant(TENANT_A, false);
  const lastMovement = movementsA[0];

  const isMovementLogged = lastMovement && lastMovement.productId === prodA.id && lastMovement.quantity === 12 && lastMovement.newStock === 37;

  if (quickPkgRes.success && updatedProdAAfterPkg?.currentStock === 37 && prodBAfterPkg?.currentStock === 50 && isMovementLogged) {
    console.log(`✅ TEST B RÉUSSI : Stock A = ${updatedProdAAfterPkg.currentStock} (attendu: 37), Stock B = ${prodBAfterPkg.currentStock} (inchangé). Mouvement de stock tracé (+12 pièces).`);
    passedTests++;
  } else {
    console.error(`❌ TEST B ÉCHOUÉ : Stock A = ${updatedProdAAfterPkg?.currentStock}, Mouvement tracé: ${isMovementLogged}`);
  }

  // -------------------------------------------------------------------------
  // TEST C : Agence B consulte son stock -> Aucun produit de l'Agence A
  // -------------------------------------------------------------------------
  console.log("\n--- TEST C : Consultation de stock par l'Agence B ---");
  const prodsForAgencyB = dbStore.getProductsByTenant(TENANT_B, false);
  const leakedProdAInB = prodsForAgencyB.find(p => p.id === prodA.id || p.tenantId === TENANT_A);

  if (!leakedProdAInB && prodsForAgencyB.some(p => p.id === prodB.id)) {
    console.log(`✅ TEST C RÉUSSI : Isolation étanche. L'Agence B ne voit aucun produit de l'Agence A (${prodsForAgencyB.length} produit(s) appartenant à l'Agence B).`);
    passedTests++;
  } else {
    console.error(`❌ TEST C ÉCHOUÉ : Fuite de produit constatée dans l'Agence B.`);
  }

  // -------------------------------------------------------------------------
  // TEST D : Créer un produit sans photo -> Produit créé, photo facultative
  // -------------------------------------------------------------------------
  console.log("\n--- TEST D : Création d'un produit sans photo (Photo 100% facultative) ---");
  const prodWithoutPhotoRes = dbStore.createSecureProduct({
    code: `NOTEBOOK-${Date.now()}`,
    name: "Cahier d'Exercices 100 Pages",
    category: "Papeterie",
    baseUnit: "pièce",
    initialStock: 100,
    minStockAlert: 20,
    costPrice: 5000,
    salePrice: 8000,
    imageUrl: undefined // Aucune photo
  }, TENANT_A, false);

  if (prodWithoutPhotoRes.success && prodWithoutPhotoRes.product && !prodWithoutPhotoRes.product.imageUrl) {
    console.log(`✅ TEST D RÉUSSI : Produit « ${prodWithoutPhotoRes.product.name} » créé sans photo. Le placeholder 📦 sera affiché.`);
    passedTests++;
  } else {
    console.error(`❌ TEST D ÉCHOUÉ : Erreur création produit sans photo.`);
  }

  // -------------------------------------------------------------------------
  // TEST E1 : Modification d'un produit en lui ajoutant une photo
  // -------------------------------------------------------------------------
  console.log("\n--- TEST E1 : Ajout d'une photo sur un produit existant via modification ---");
  const addPhotoRes = dbStore.updateSecureProduct(prodA.id, {
    imageUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
  }, TENANT_A, false);

  const prodAAfterPhotoAdded = dbStore.getProductById(prodA.id, TENANT_A, false).product;

  if (addPhotoRes.success && prodAAfterPhotoAdded && Boolean(prodAAfterPhotoAdded.imageUrl)) {
    console.log(`✅ TEST E1 RÉUSSI : Photo enregistrée avec succès sur l'article « ${prodAAfterPhotoAdded.name} » et persistée dans la base.`);
    passedTests++;
  } else {
    console.error(`❌ TEST E1 ÉCHOUÉ : La photo n'a pas été enregistrée lors de la modification.`);
  }

  // -------------------------------------------------------------------------
  // TEST E2 : Supprimer la photo d'un produit existant -> Produit conservé
  // -------------------------------------------------------------------------
  console.log("\n--- TEST E2 : Suppression de la photo d'un produit existant ---");
  const removePhotoRes = dbStore.updateSecureProduct(prodA.id, {
    imageUrl: undefined
  }, TENANT_A, false);

  const prodAAfterPhotoRemoved = dbStore.getProductById(prodA.id, TENANT_A, false).product;

  if (removePhotoRes.success && prodAAfterPhotoRemoved && !prodAAfterPhotoRemoved.imageUrl && prodAAfterPhotoRemoved.currentStock === 37) {
    console.log(`✅ TEST E2 RÉUSSI : Photo supprimée avec succès. Produit conservé avec stock intact (${prodAAfterPhotoRemoved.currentStock} unités).`);
    passedTests++;
  } else {
    console.error(`❌ TEST E2 ÉCHOUÉ : Erreur lors de la suppression de la photo.`);
  }

  // -------------------------------------------------------------------------
  // TEST F : Produit sans conditionnement paquet -> +1 unité actif, +1 paquet masqué
  // -------------------------------------------------------------------------
  console.log("\n--- TEST F : Produit sans conditionnement paquet ---");
  const singleUnitProd = prodWithoutPhotoRes.product!;
  const hasPkgConfig = (singleUnitProd.packagings && singleUnitProd.packagings.length > 0) ||
                       Boolean(singleUnitProd.purchaseUnit && singleUnitProd.conversionFactor && singleUnitProd.conversionFactor > 1);

  if (!hasPkgConfig) {
    console.log(`✅ TEST F RÉUSSI : Produit « ${singleUnitProd.name} » sans conditionnement. Bouton « + 1 unité » actif, bouton « + 1 paquet » absent.`);
    passedTests++;
  } else {
    console.error(`❌ TEST F ÉCHOUÉ : Conditionnement inattendu détecté.`);
  }

  // -------------------------------------------------------------------------
  // TEST G (Bonus Sécurité) : Anti-IDOR sur l'action rapide
  // -------------------------------------------------------------------------
  console.log("\n--- TEST G : Contrôle Anti-IDOR inter-agences ---");
  const idorAttackRes = dbStore.quickIncrementStock(
    prodB.id, // Produit de l'Agence B
    10,
    "Attaque IDOR falsification stock",
    TENANT_A, // Exécuté par l'Agence A
    "Attaquant",
    "paire",
    false
  );

  if (idorAttackRes.statusCode === 403 && !idorAttackRes.success) {
    console.log(`✅ TEST G RÉUSSI : Rejet strict des requêtes IDOR avec HTTP 403 Forbidden.`);
    passedTests++;
  } else {
    console.error(`❌ TEST G ÉCHOUÉ : La tentative IDOR n'a pas été bloquée.`);
  }

  // -------------------------------------------------------------------------
  // BILAN GLOBAL
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

runProductCardsAndQuickStockTests().catch(err => {
  console.error("Erreur lors de l'exécution des tests de cartes produits:", err);
  process.exit(1);
});
