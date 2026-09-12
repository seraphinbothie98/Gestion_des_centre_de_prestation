import { dbStore } from '../server/db/mockStore';
import { Tenant, Product } from '../types';

let totalTests = 0;
let passedTests = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ PASS: ${testName}`);
  } else {
    console.error(`  ❌ FAIL: ${testName}`);
    if (detail) console.error(`     Detail: ${detail}`);
  }
}

async function runStoreVerificationTestSuite() {
  console.log('========================================================================');
  console.log('🧪 TEST SUITE: SYSTÈME COMPLET DE VÉRIFICATION DES BOUTIQUES E2E');
  console.log('========================================================================\n');

  // Reset db to a clean baseline
  dbStore.resetToDefault();

  // -------------------------------------------------------------------------
  // TEST 1: Initial Default Stores Status (CPEP & Horizon)
  // -------------------------------------------------------------------------
  console.log('--- TEST 1: Statuts initiaux des boutiques agréées existantes ---');
  const publicStoresInitial = dbStore.getPublicStores();
  const cpep = publicStoresInitial.find(s => s.id === 't-001');
  const horizon = publicStoresInitial.find(s => s.id === 't-002');

  assert(
    Boolean(cpep && cpep.verificationStatus === 'APPROUVE' && cpep.commercialStatus === 'ACTIVE'),
    'Boutique t-001 (CPEP) est approuvée et active par défaut',
    `cpep.verificationStatus = ${cpep?.verificationStatus}, commercialStatus = ${cpep?.commercialStatus}`
  );

  assert(
    Boolean(horizon && horizon.verificationStatus === 'APPROUVE' && horizon.commercialStatus === 'ACTIVE'),
    'Boutique t-002 (Horizon) est approuvée et active par défaut',
    `horizon.verificationStatus = ${horizon?.verificationStatus}, commercialStatus = ${horizon?.commercialStatus}`
  );

  // -------------------------------------------------------------------------
  // TEST 2: Soumission d'une nouvelle boutique avec OTP Téléphone
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 2: Soumission d\'une demande de création de boutique ---');
  const submissionRes = dbStore.submitStoreVerificationRequest({
    storeName: 'Alpha Tech Guinée',
    description: 'Vente d\'ordinateurs, smartphones et accessoires informatiques',
    activityType: 'RETAIL_STORE',
    businessType: 'PRODUCTS',
    primaryCategory: 'Électronique & multimédia',
    selectedCategories: ['Électronique & multimédia', 'Téléphones & tablettes'],
    city: 'Conakry',
    commune: 'Dixinn',
    neighborhood: 'Belle-Vue',
    address: 'Avenue Corinthe, Immeuble Alpha',
    landmark: 'Près du Carrefour Belle-Vue',
    phone: '+224 621 99 88 77',
    isPhoneVerified: true,
    responsibleFirstName: 'Mamadou',
    responsibleLastName: 'Alpha Diallo',
    responsiblePhone: '+224 621 99 88 77',
    responsibleEmail: 'mamadou.alpha@alphatech-gn.com',
    responsibleRole: 'Propriétaire',
    ownerUserId: 'u-user-client-01',
    isRegisteredBusiness: true,
    registrationType: 'RCCM',
    registrationNumber: 'GN.TCC.2026.B.99128',
    commercialDocUrl: 'https://docs.alphatech.gn/rccm-prive.pdf'
  });

  assert(
    submissionRes.success && Boolean(submissionRes.tenant) && Boolean(submissionRes.verification),
    'La soumission de la boutique a réussi avec succès',
    submissionRes.message
  );

  const newStore = submissionRes.tenant!;
  const newVerif = submissionRes.verification!;

  assert(
    newStore.verificationStatus === 'EN_ATTENTE',
    'Statut Dossier initial = EN_ATTENTE',
    `reçu: ${newStore.verificationStatus}`
  );

  assert(
    newStore.commercialStatus === 'EN_ATTENTE_VALIDATION',
    'Statut Commercial initial = EN_ATTENTE_VALIDATION',
    `reçu: ${newStore.commercialStatus}`
  );

  assert(
    newStore.isPhoneVerified === true,
    'Téléphone marqué vérifié par OTP (isPhoneVerified = true)',
    `reçu: ${newStore.isPhoneVerified}`
  );

  assert(
    newStore.isVerifiedStore === false,
    'Boutique non encore certifiée publiquement (isVerifiedStore = false)',
    `reçu: ${newStore.isVerifiedStore}`
  );

  // -------------------------------------------------------------------------
  // TEST 3: Règle de visibilité publique stricte (100% invisible)
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 3: Invisibilité publique absolue avant approbation ---');
  
  // Create a draft product inside the pending store
  const testProduct: Product = {
    id: `prod-test-${Date.now()}`,
    tenantId: newStore.id,
    code: 'LAP-HP-01',
    name: 'HP Pavilion 15 Core i7 16GB',
    category: 'Électronique & multimédia',
    costPrice: 6500000,
    salePrice: 7500000,
    publicPrice: 7500000,
    currentStock: 10,
    isActive: true
  };
  dbStore.getState().products.push(testProduct);

  const publicStoresNow = dbStore.getPublicStores();
  const isStorePubliclyVisible = publicStoresNow.some(s => s.id === newStore.id);
  
  assert(
    !isStorePubliclyVisible,
    'La boutique EN_ATTENTE_VALIDATION est invisible sur getPublicStores()',
    `Présente dans getPublicStores: ${isStorePubliclyVisible}`
  );

  const publicProductsNow = dbStore.getPublicProducts();
  const isProductPubliclyVisible = publicProductsNow.some(p => p.id === testProduct.id);

  assert(
    !isProductPubliclyVisible,
    'Les produits de la boutique en attente sont invisibles sur getPublicProducts()',
    `Présent dans getPublicProducts: ${isProductPubliclyVisible}`
  );

  // -------------------------------------------------------------------------
  // TEST 4: Détection Anti-Doublon proactive
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 4: Système Anti-Doublon ---');
  const dupCheckSamePhone = dbStore.detectPotentialDuplicateStore({
    name: 'Autre Nom Informatique',
    phone: '+224 621 99 88 77',
    responsibleName: 'Autre Personne'
  });

  assert(
    dupCheckSamePhone.isDuplicate === true,
    'Détection anti-doublon détecte le même numéro de téléphone',
    dupCheckSamePhone.message
  );

  const dupCheckSimilarName = dbStore.detectPotentialDuplicateStore({
    name: 'Alpha Tech Guinée',
    phone: '+224 666 00 00 00',
    responsibleName: 'Inconnu'
  });

  assert(
    dupCheckSimilarName.isDuplicate === true,
    'Détection anti-doublon détecte le nom de boutique identique',
    dupCheckSimilarName.message
  );

  // -------------------------------------------------------------------------
  // TEST 5: Action Admin « DEMANDER DES INFORMATIONS » & Renvoyer
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 5: Action Admin "Demander des informations" & Réexpédition ---');
  const requestInfoRes = dbStore.requestStoreInformation(
    newVerif.id,
    'Merci de préciser le numéro de boutique au rez-de-chaussée.',
    'u-superadmin',
    'Super Administrateur'
  );

  assert(
    requestInfoRes.success,
    'Action Demander des informations exécutée avec succès',
    requestInfoRes.message
  );

  const verifAfterInfoReq = dbStore.getStoreVerificationById(newVerif.id);
  const tenantAfterInfoReq = dbStore.getTenants(true).find(t => t.id === newStore.id);

  assert(
    verifAfterInfoReq?.status === 'INFORMATIONS_DEMANDEES',
    'Statut Dossier devient INFORMATIONS_DEMANDEES',
    `reçu: ${verifAfterInfoReq?.status}`
  );

  assert(
    tenantAfterInfoReq?.requestedInformation === 'Merci de préciser le numéro de boutique au rez-de-chaussée.',
    'Motif de la demande d\'informations enregistré dans le dossier',
    tenantAfterInfoReq?.requestedInformation
  );

  // Merchant updates and resubmits
  const resubmitRes = dbStore.resubmitStoreVerification(newStore.id, {
    address: 'Avenue Corinthe, Immeuble Alpha, Boutique N° 12'
  });

  assert(
    resubmitRes.success,
    'Le commerçant a renvoyé son dossier avec succès',
    resubmitRes.message
  );

  const verifAfterResubmit = dbStore.getStoreVerificationById(newVerif.id);
  assert(
    verifAfterResubmit?.status === 'EN_ATTENTE',
    'Le dossier rebascule en statut EN_ATTENTE après renvoi',
    `reçu: ${verifAfterResubmit?.status}`
  );

  // -------------------------------------------------------------------------
  // TEST 6: Action Admin « REFUSER » sur une boutique non conforme
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 6: Action Admin "Refuser" sur boutique non conforme ---');
  const fakeSubmission = dbStore.submitStoreVerificationRequest({
    storeName: 'Usurpation Boutique Contrefaçon',
    activityType: 'RETAIL_STORE',
    primaryCategory: 'Vêtements & habillement',
    city: 'Conakry',
    neighborhood: 'Madina',
    address: 'Madina Marché',
    phone: '+224 600 00 00 99',
    isPhoneVerified: true,
    responsibleFirstName: 'Faux',
    responsibleLastName: 'Vendeur',
    responsiblePhone: '+224 600 00 00 99',
    ownerUserId: 'u-fake-01'
  });

  const rejectRes = dbStore.rejectStoreVerification(
    fakeSubmission.verification!.id,
    'Tentative d\'usurpation',
    'Activité non conforme aux conditions générales de vente.',
    'Note interne: signalement reçu pour vente frauduleuse.',
    'u-superadmin',
    'Super Administrateur'
  );

  assert(
    rejectRes.success,
    'Action Refuser exécutée avec succès',
    rejectRes.message
  );

  const fakeVerif = dbStore.getStoreVerificationById(fakeSubmission.verification!.id);
  const fakeTenant = dbStore.getTenants(true).find(t => t.id === fakeSubmission.tenant!.id);

  assert(
    fakeVerif?.status === 'REFUSE' && fakeTenant?.verificationStatus === 'REFUSE',
    'Statut Dossier passe à REFUSE',
    `verif: ${fakeVerif?.status}, tenant: ${fakeTenant?.verificationStatus}`
  );

  assert(
    fakeVerif?.rejectionReason === 'Tentative d\'usurpation',
    'Motif de refus standard consigné fidèlement',
    fakeVerif?.rejectionReason
  );

  assert(
    !dbStore.getPublicStores().some(s => s.id === fakeSubmission.tenant!.id),
    'La boutique refusée reste totalement invisible du public',
    'OK'
  );

  // -------------------------------------------------------------------------
  // TEST 7: Action Admin « APPROUVER » & Période d'essai 10 jours
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 7: Action Admin "Approuver", Essai 10j et Visibilité Publique ---');
  const approveRes = dbStore.approveStoreVerification(
    newVerif.id,
    'u-superadmin',
    'Super Administrateur'
  );

  assert(
    approveRes.success,
    'Action Approuver exécutée avec succès',
    approveRes.message
  );

  const approvedTenant = dbStore.getTenants(true).find(t => t.id === newStore.id)!;
  const approvedVerif = dbStore.getStoreVerificationById(newVerif.id)!;

  assert(
    approvedVerif.status === 'APPROUVE' && approvedTenant.verificationStatus === 'APPROUVE',
    'Statut Dossier = APPROUVE',
    `verif: ${approvedVerif.status}, tenant: ${approvedTenant.verificationStatus}`
  );

  assert(
    approvedVerif.commercialStatus === 'ESSAI_GRATUIT' && approvedTenant.commercialStatus === 'ESSAI_GRATUIT',
    'Statut Commercial = ESSAI_GRATUIT',
    `verif: ${approvedVerif.commercialStatus}, tenant: ${approvedTenant.commercialStatus}`
  );

  assert(
    approvedTenant.isVerifiedStore === true,
    'Badge « Boutique vérifiée » attribué (isVerifiedStore = true)',
    `reçu: ${approvedTenant.isVerifiedStore}`
  );

  const trialDurationMs = new Date(approvedTenant.trialEndsAt).getTime() - new Date(approvedTenant.trialStartedAt).getTime();
  const trialDaysCalculated = Math.round(trialDurationMs / (24 * 60 * 60 * 1000));

  assert(
    trialDaysCalculated === 10,
    'Période d\'essai gratuit de 10 jours configurée automatiquement',
    `Jours calculés: ${trialDaysCalculated}`
  );

  // Now verify that the store and its products ARE visible publicly!
  const publicStoresAfterApproval = dbStore.getPublicStores();
  const isApprovedStorePublic = publicStoresAfterApproval.some(s => s.id === approvedTenant.id);

  assert(
    isApprovedStorePublic,
    'La boutique approuvée devient immédiatement visible sur la marketplace publique',
    `Présente dans getPublicStores: ${isApprovedStorePublic}`
  );

  const publicProductsAfterApproval = dbStore.getPublicProducts();
  const isApprovedProductPublic = publicProductsAfterApproval.some(p => p.id === testProduct.id);

  assert(
    isApprovedProductPublic,
    'Les produits de la boutique approuvée deviennent visibles sur la marketplace',
    `Présent dans getPublicProducts: ${isApprovedProductPublic}`
  );

  // -------------------------------------------------------------------------
  // FINAL SUMMARY
  // -------------------------------------------------------------------------
  console.log('\n========================================================================');
  console.log(`📊 RÉSULTATS DU TEST SUITE: ${passedTests}/${totalTests} TESTS PASSÉS`);
  console.log('========================================================================\n');

  if (passedTests === totalTests) {
    console.log('🎉 TOUS LES TESTS DE VÉRIFICATION DES BOUTIQUES SONT AU VERT !');
  } else {
    console.error(`⚠️ ${totalTests - passedTests} test(s) ont échoué.`);
    process.exit(1);
  }
}

runStoreVerificationTestSuite().catch(err => {
  console.error('Fatal error in test suite:', err);
  process.exit(1);
});
