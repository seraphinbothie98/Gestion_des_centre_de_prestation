import { dbStore } from '../server/db/mockStore';

async function runTests() {
  console.log('🧪 [TEST SUITE] Début des tests - Assistant de Configuration Guidée en 10 Étapes (Setup Wizard)\n');
  let passedCount = 0;
  let totalCount = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    totalCount++;
    if (condition) {
      console.log(`  ✅ [PASS] ${testName}`);
      passedCount++;
    } else {
      console.error(`  ❌ [FAIL] ${testName}${detail ? ' - ' + detail : ''}`);
    }
  }

  // 1. Création d'une nouvelle agence vierge
  console.log('--- 1. CRÉATION D\'UNE NOUVELLE AGENCE VIERGE ---');
  const registerRes = dbStore.registerAutonomousAgency({
    firstName: 'Ibrahima',
    lastName: 'Barry',
    phone: '+224 625 00 11 22',
    email: 'admin@elite-prestation.gn',
    password: 'AdminPassword123!',
    agencyName: 'Centre Élite Multimédia',
    activityType: 'SERVICE_CENTER',
    currency: 'GNF'
  });

  assert(registerRes.success && !!registerRes.tenant, 'Création de l\'agence autonome réussie');
  const tenant = registerRes.tenant!;
  const tenantId = tenant.id;

  assert(tenant.onboardingCompleted === false, 'Statut initial onboardingCompleted = false');
  assert(tenant.onboardingStep === 1, 'Étape initiale = 1');

  // Vérifier le score initial
  const initialScore = dbStore.getTenantOnboardingScore(tenantId);
  assert(initialScore.score < 100, `Score initial partiel (${initialScore.score}%)`);

  // 2. ÉTAPE 1 : Informations Générales
  console.log('\n--- 2. ÉTAPE 1 : INFORMATIONS GÉNÉRALES ---');
  const step1Res = dbStore.saveOnboardingStep(
    tenantId,
    1,
    {
      agencyName: 'Centre Élite Multimédia SARL',
      slogan: 'L\'Excellence Graphique & Bureautique',
      country: 'Guinée',
      city: 'Conakry',
      address: 'Immeuble Kouléwondy, Kaloum',
      phone: '+224 625 00 11 22',
      whatsapp: '+224 625 00 11 22',
      email: 'contact@elite-prestation.gn',
      website: 'www.elite-prestation.gn',
      currency: 'GNF',
      timezone: 'Africa/Conakry'
    },
    false,
    tenantId,
    true
  );

  assert(step1Res.success, 'Étape 1 enregistrée avec succès');
  const tAfter1 = dbStore.getState().tenants.find(t => t.id === tenantId);
  assert(tAfter1?.name === 'Centre Élite Multimédia SARL', 'Nom de l\'agence mis à jour');
  assert(tAfter1?.slogan === 'L\'Excellence Graphique & Bureautique', 'Slogan enregistré');
  assert(tAfter1?.city === 'Conakry', 'Ville enregistrée');

  // 3. ÉTAPE 2 : Personnalisation Visuelle & Documents
  console.log('\n--- 3. ÉTAPE 2 : PERSONNALISATION VISUELLE & DOCUMENTS ---');
  const step2Res = dbStore.saveOnboardingStep(
    tenantId,
    2,
    {
      headerText: 'CENTRE DE PRESTATION NUMÉRIQUE & IMPRIMERIE RAPIDE',
      footerText: 'NIF: 998877665 - RCCM/GN.TCC.2026 - Conakry, République de Guinée',
      sealUrl: 'https://images.unsplash.com/photo-seal.png',
      directorSignatureUrl: 'https://images.unsplash.com/photo-signature.png'
    },
    false,
    tenantId,
    true
  );

  assert(step2Res.success, 'Étape 2 enregistrée avec succès');
  const tAfter2 = dbStore.getState().tenants.find(t => t.id === tenantId);
  assert(tAfter2?.headerText === 'CENTRE DE PRESTATION NUMÉRIQUE & IMPRIMERIE RAPIDE', 'En-tête de document sauvegardé');
  assert(!!tAfter2?.sealUrl && !!tAfter2?.directorSignatureUrl, 'Cachet et signature directeur enregistrés');

  // 4. ÉTAPE 3 : Utilisateurs & Sécurité
  console.log('\n--- 4. ÉTAPE 3 : UTILISATEURS & SÉCURITÉ ---');
  const step3Res = dbStore.saveOnboardingStep(
    tenantId,
    3,
    {
      users: [
        {
          fullName: 'Aissatou Diallo',
          username: 'aissatou_caisse',
          role: 'CAISSIER',
          password: 'CaissierPass123!',
          phone: '+224 621 00 22 44',
          email: 'caisse@elite-prestation.gn'
        },
        {
          fullName: 'Mohamed Camara',
          username: 'mohamed_formateur',
          role: 'GESTIONNAIRE',
          password: 'FormatPass123!',
          phone: '+224 622 33 44 88',
          email: 'formation@elite-prestation.gn'
        }
      ]
    },
    false,
    tenantId,
    true
  );

  assert(step3Res.success, 'Étape 3 enregistrée avec succès');
  const usersAfter3 = dbStore.getState().users.filter(u => u.tenantId === tenantId);
  assert(usersAfter3.length >= 3, 'Admin principal + 2 collaborateurs créés dans la base', `Nombre: ${usersAfter3.length}`);

  // 5. ÉTAPE 4 : Services & Activités
  console.log('\n--- 5. ÉTAPE 4 : SERVICES & ACTIVITÉS ---');
  const step4Res = dbStore.saveOnboardingStep(
    tenantId,
    4,
    {
      services: [
        { code: 'PHOTO-A4-NB', name: 'Photocopie A4 Noir & Blanc', category: 'Impression & Photocopie', unit: 'page', basePrice: 500, baseCost: 150 },
        { code: 'IMP-A4-COL', name: 'Impression A4 Couleur', category: 'Impression & Photocopie', unit: 'page', basePrice: 2000, baseCost: 600 },
        { code: 'REL-SPIR-A4', name: 'Reliure Spirale Plastique A4', category: 'Finition & Reliure', unit: 'document', basePrice: 10000, baseCost: 3000 },
        { code: 'PAO-DESIGN', name: 'Conception Graphique / Affiche', category: 'Design & Multimédia', unit: 'forfait', basePrice: 50000, baseCost: 5000 }
      ]
    },
    false,
    tenantId,
    true
  );

  assert(step4Res.success, 'Étape 4 enregistrée avec succès');
  const servicesAfter4 = dbStore.getState().services.filter(s => s.tenantId === tenantId);
  assert(servicesAfter4.length === 4, '4 prestations créées et rattachées à l\'agence', `Nombre: ${servicesAfter4.length}`);

  // 6. ÉTAPE 5 : Tarifs & Règles Commerciales
  console.log('\n--- 6. ÉTAPE 5 : TARIFS & RÈGLES COMMERCIALES ---');
  const step5Res = dbStore.saveOnboardingStep(
    tenantId,
    5,
    {
      maxDiscountWithoutApprovalPct: 15,
      allowDiscounts: true
    },
    false,
    tenantId,
    true
  );

  assert(step5Res.success, 'Étape 5 enregistrée avec succès');
  const tAfter5 = dbStore.getState().tenants.find(t => t.id === tenantId);
  assert(tAfter5?.maxDiscountWithoutApprovalPct === 15, 'Plafond de remise caissière = 15%');

  // Test de sauvegarde intermédiaire ("Enregistrer et quitter")
  assert(tAfter5?.onboardingStep === 5, 'Étape mémorisée à 5 pour reprise ultérieure');

  // 7. ÉTAPE 6 : Configuration Module Formation
  console.log('\n--- 7. ÉTAPE 6 : CONFIGURATION DU MODULE FORMATION ---');
  const step6Res = dbStore.saveOnboardingStep(
    tenantId,
    6,
    {
      hasTraining: true,
      courses: [
        { code: 'FORM-BUR-01', title: 'Informatique Bureautique', category: 'Bureautique', durationWeeks: 8, durationHours: 40, price: 600000, minDepositAmount: 200000 },
        { code: 'FORM-PAO-01', title: 'Infographie & Design Graphique', category: 'Design', durationWeeks: 12, durationHours: 60, price: 1200000, minDepositAmount: 400000 }
      ]
    },
    false,
    tenantId,
    true
  );

  assert(step6Res.success, 'Étape 6 enregistrée avec succès');
  const coursesAfter6 = dbStore.getState().trainings.filter(c => c.tenantId === tenantId);
  assert(coursesAfter6.length === 2, '2 formations professionnelles configurées', `Nombre: ${coursesAfter6.length}`);

  // 8. ÉTAPE 7 : Boutique et Stock
  console.log('\n--- 8. ÉTAPE 7 : BOUTIQUE ET GESTION DE STOCK ---');
  const step7Res = dbStore.saveOnboardingStep(
    tenantId,
    7,
    {
      hasShop: true,
      products: [
        {
          code: 'ART-RAM-A4',
          name: 'Ramette Papier A4 80g',
          category: 'Papeterie',
          unit: 'paquet',
          costPrice: 45000,
          sellingPrice: 55000,
          initialStock: 20,
          minStockAlert: 5,
          packagings: [{ level: 2, unitName: 'carton', containedQuantity: 5, salePrice: 260000, isDefaultPurchaseUnit: true }]
        },
        {
          code: 'ART-STY-BIC',
          name: 'Stylo à bille BIC Bleu',
          category: 'Fournitures',
          unit: 'pièce',
          costPrice: 1500,
          sellingPrice: 2500,
          initialStock: 100,
          minStockAlert: 20
        }
      ]
    },
    false,
    tenantId,
    true
  );

  assert(step7Res.success, 'Étape 7 enregistrée avec succès');
  const productsAfter7 = dbStore.getState().products.filter(p => p.tenantId === tenantId);
  assert(productsAfter7.length === 2, '2 articles de boutique créés avec stock initial', `Nombre: ${productsAfter7.length}`);

  // 9. ÉTAPE 8 : Fournisseurs
  console.log('\n--- 9. ÉTAPE 8 : FOURNISSEURS ---');
  const step8Res = dbStore.saveOnboardingStep(
    tenantId,
    8,
    {
      suppliers: [
        {
          name: 'Papeterie Centrale SARL',
          code: 'FOUR-PAP-01',
          contactPerson: 'M. Diallo',
          phone: '+224 628 00 11 22',
          email: 'diallo@papeterie.gn',
          address: 'Madina Marché',
          paymentTerms: 'NET_30',
          suppliedCategories: ['Papeterie', 'Fournitures']
        }
      ]
    },
    false,
    tenantId,
    true
  );

  assert(step8Res.success, 'Étape 8 enregistrée avec succès');
  const suppliersAfter8 = dbStore.getState().suppliers.filter(s => s.tenantId === tenantId);
  assert(suppliersAfter8.length === 1, '1 fournisseur enregistré dans le carnet d\'adresses');

  // 10. ÉTAPE 9 : Finance & Trésorerie
  console.log('\n--- 10. ÉTAPE 9 : FINANCE & TRÉSORERIE ---');
  const step9Res = dbStore.saveOnboardingStep(
    tenantId,
    9,
    {
      financialAccounts: [
        {
          name: 'Caisse Principale',
          code: 'CP-01',
          type: 'CASH',
          initialBalance: 300000,
          isMainCash: true,
          isDefault: true
        },
        {
          name: 'Petite Caisse Dépenses',
          code: 'PC-01',
          type: 'CASH',
          initialBalance: 500000,
          isPettyCash: true,
          isMainCash: false,
          isDefault: false
        },
        {
          name: 'Compte Ecobank',
          code: 'BNK-01',
          type: 'BANK',
          bankName: 'Ecobank Guinée',
          accountNumber: 'GN012-0012-998877',
          initialBalance: 10000000,
          isMainCash: false,
          isDefault: false
        },
        {
          name: 'Orange Money Agence',
          code: 'OM-01',
          type: 'MOBILE_MONEY',
          accountNumber: '+224 625 00 11 22',
          initialBalance: 2000000,
          isMainCash: false,
          isDefault: false
        }
      ]
    },
    false,
    tenantId,
    true
  );

  assert(step9Res.success, 'Étape 9 enregistrée avec succès');
  const accountsAfter9 = dbStore.getFinancialAccounts(tenantId, false);
  assert(accountsAfter9.length === 4, '4 comptes financiers créés avec leurs soldes de départ', `Nombre: ${accountsAfter9.length}`);
  const totalBalance = accountsAfter9.reduce((s, a) => s + a.currentBalance, 0);
  assert(totalBalance === 12800000, 'Solde de trésorerie consolidé initial = 12 800 000 GNF', `Total: ${totalBalance}`);

  // 11. ÉTAPE 10 : Vérification & Finalisation
  console.log('\n--- 11. ÉTAPE 10 : VÉRIFICATION, SCORE & FINALISATION ---');
  const finalScoreBefore = dbStore.getTenantOnboardingScore(tenantId);
  assert(finalScoreBefore.score >= 90, `Score avant validation finale = ${finalScoreBefore.score}%`);

  const step10Res = dbStore.saveOnboardingStep(
    tenantId,
    10,
    {},
    true, // isComplete = true
    tenantId,
    true
  );

  assert(step10Res.success, 'Étape 10 : Finalisation validée');
  const finalTenant = dbStore.getState().tenants.find(t => t.id === tenantId);
  assert(finalTenant?.onboardingCompleted === true, 'Agence marquée avec succès comme onboardingCompleted = true');

  const finalScoreAfter = dbStore.getTenantOnboardingScore(tenantId);
  assert(finalScoreAfter.score === 100, `Score d'onboarding final = ${finalScoreAfter.score}% (100% EXCELLENCE)`);
  assert(finalScoreAfter.completedItems.length === 10, 'Les 10 dimensions d\'onboarding sont validées');

  console.log(`\n==================================================`);
  console.log(`RÉSULTATS DE LA VALIDATION : ${passedCount}/${totalCount} tests réussis (${Math.round((passedCount / totalCount) * 100)}%)`);
  console.log(`==================================================\n`);

  if (passedCount !== totalCount) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Erreur fatale lors des tests onboarding 10 étapes:', err);
  process.exit(1);
});
