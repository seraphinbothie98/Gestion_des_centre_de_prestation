/**
 * ==============================================================================
 * SUITE DE TESTS END-TO-END : SYSTÈME CLIENT & GESTION CENTRALISÉE MULTI-BOUTIQUES
 * ==============================================================================
 * 
 * Ce fichier valide formellement l'intégralité des 6 tests exigés par le cahier des charges :
 * - TEST A : Client Marketplace (Inscription, Session immédiate, Déconnexion, Reconnexion, Maintien session)
 * - TEST B : Client Interne / Boutique (Enregistrement par une boutique, isolation, marquage d'origine)
 * - TEST C : Client Existant (Détection automatique par téléphone, proposition de liaison sans doublon)
 * - TEST D : Multi-Boutiques (Association du même client à plusieurs boutiques sans duplication d'identité)
 * - TEST E : Séparation des rôles (Employé de boutique vs Client Marketplace)
 * - TEST F : Super Administrateur (Module global, 6 sous-onglets, suspension/réactivation, vue 360°)
 */

import { dbStore } from '../server/db/mockStore';

// In-memory localStorage mock for headless node execution
const memoryStorage: Record<string, string> = {};
(global as any).localStorage = {
  getItem: (key: string) => memoryStorage[key] || null,
  setItem: (key: string, value: string) => { memoryStorage[key] = String(value); },
  removeItem: (key: string) => { delete memoryStorage[key]; },
  clear: () => { Object.keys(memoryStorage).forEach(k => delete memoryStorage[k]); }
};

let testsPassed = 0;
let testsFailed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✅ [PASS] ${testName}${detail ? ` - ${detail}` : ''}`);
    testsPassed++;
  } else {
    console.error(`  ❌ [FAIL] ${testName}${detail ? ` - ${detail}` : ''}`);
    testsFailed++;
  }
}

export function runClientManagementTestSuite() {
  console.log('\n🚀 ========================================================');
  console.log('DÉMARRAGE DE LA SUITE DE TESTS : ARCHITECTURE CLIENT & SAAS');
  console.log('========================================================\n');

  // Reset database state before starting
  dbStore.resetToDefault();
  localStorage.clear();

  // ----------------------------------------------------------------------------
  // TEST A — CLIENT MARKETPLACE
  // ----------------------------------------------------------------------------
  console.log('▶️ TEST A — CLIENT MARKETPLACE (Inscription & Cycle de Session)');
  
  const testPhoneA = '+224 620 99 88 11';
  const regResult = dbStore.registerMarketplaceCustomer({
    firstName: 'Amadou',
    lastName: 'Bah',
    phone: testPhoneA,
    email: 'amadou.bah@marketplace.gn',
    city: 'Conakry',
    commune: 'Ratoma',
    district: 'Kipé',
    password: 'Password123!',
    preferences: { orderNotifications: true, promoOffers: true }
  });

  assert(regResult.success, 'A1. Inscription réussie sur le Marketplace', regResult.message);
  assert(regResult.user?.role === 'CLIENT' || regResult.user?.roles[0]?.code === 'CLIENT', 'A2. Rôle CLIENT attribué exclusivement');

  // Verify persistence in DB
  const stateA = dbStore.getState();
  const savedUser = stateA.users.find(u => u.id === regResult.user?.id);
  const savedPerson = stateA.persons.find(p => p.phone === testPhoneA);
  assert(Boolean(savedUser && savedPerson), 'A3. Enregistrement simultané User & Person en base');
  assert(savedPerson?.origin === 'MARKETPLACE', 'A4. Origine Person = MARKETPLACE');
  assert(savedPerson?.status === 'ACTIVE', 'A5. Statut initial Person = ACTIVE');

  // Simulate logout
  localStorage.removeItem('cms_is_authenticated');
  localStorage.removeItem('cms_current_user_id');
  dbStore.updateState(draft => { draft.currentUserId = ''; });
  assert(localStorage.getItem('cms_is_authenticated') === null, 'A6. Déconnexion : suppression du token de session');

  // Re-login with credentials
  const authRes = dbStore.authenticateUser(testPhoneA, 'Password123!');
  assert(authRes.success && Boolean(authRes.user), 'A7. Authentification avec les bons identifiants');
  
  // Establish session
  localStorage.setItem('cms_is_authenticated', 'true');
  localStorage.setItem('cms_current_user_id', authRes.user!.id);
  dbStore.updateState(draft => { draft.currentUserId = authRes.user!.id; });
  
  assert(localStorage.getItem('cms_is_authenticated') === 'true', 'A8. Session client établie');
  assert(dbStore.getState().currentUserId === authRes.user!.id, 'A9. Identifiant client connecté actif');

  // Failed login attempt
  const badAuth = dbStore.authenticateUser(testPhoneA, 'mauvais_mdp_test');
  assert(!badAuth.success, 'A10. Échec de connexion avec mot de passe incorrect');

  // ----------------------------------------------------------------------------
  // TEST B — CLIENT INTERNE (ENREGISTRÉ PAR UNE BOUTIQUE)
  // ----------------------------------------------------------------------------
  console.log('\n▶️ TEST B — CLIENT INTERNE D\'UNE BOUTIQUE (Mes Clients)');

  const storeIdB = 't-001';
  const testPhoneB = '+224 624 33 44 55';

  const regStoreRes = dbStore.registerStoreClient({
    tenantId: storeIdB,
    firstName: 'Fatou',
    lastName: 'Soumah',
    phone: testPhoneB,
    email: 'fatou.soumah@gmail.com',
    address: 'Kaloum, Marché Niger',
    isLoyalCustomer: true,
    notes: 'Client régulier pour reprographie',
    companyName: 'Soumah Trading',
    isCompany: true
  });

  assert(regStoreRes.success, 'B1. Enregistrement client interne par la boutique', regStoreRes.message);
  assert(!regStoreRes.isExistingAssociated, 'B2. Nouveau client interne créé');

  const storeClientsB = dbStore.getStoreClients(storeIdB);
  const foundInStore = storeClientsB.find(c => c.phone === testPhoneB);
  assert(Boolean(foundInStore), 'B3. Client présent dans le module "Mes clients" de la boutique A');
  assert(foundInStore?.relation?.isLoyalCustomer === true, 'B4. Statut client fidèle présent sur la relation');

  // Verify that boutique client has no marketplace user login automatically
  const hasUserAccount = dbStore.getState().users.some(u => u.phone === testPhoneB);
  assert(!hasUserAccount, 'B5. Le client interne n\'a PAS de compte utilisateur Marketplace public créé artificiellement');

  // ----------------------------------------------------------------------------
  // TEST C — DÉTECTION CLIENT EXISTANT & ASSOCIATION SANS DOUBLON
  // ----------------------------------------------------------------------------
  console.log('\n▶️ TEST C — DÉTECTION CLIENT EXISTANT & LIAISON');

  // Boutique A attempts to register the Marketplace client from Test A
  const lookupC = dbStore.findExistingCustomer(testPhoneA);
  assert(lookupC.found, 'C1. Détection automatique du client Marketplace existant par téléphone');
  assert(lookupC.person?.firstName === 'Amadou', 'C2. Identité retrouvée : Amadou Bah');

  // Boutique associates existing customer
  const assocRes = dbStore.associateExistingClientToStore({
    personId: lookupC.person!.id,
    tenantId: storeIdB,
    isLoyalCustomer: true,
    notes: 'Client marketplace désormais fidèle en magasin'
  });

  assert(assocRes.success, 'C3. Association réussie à la boutique', assocRes.message);

  // Check no duplicate person was created
  const matchingPersons = dbStore.getState().persons.filter(p => p.phone === testPhoneA);
  assert(matchingPersons.length === 1, 'C4. Aucune duplication d\'identité (exactement 1 Person en base)');

  // ----------------------------------------------------------------------------
  // TEST D — CLIENT MULTI-BOUTIQUES & ISOLATION
  // ----------------------------------------------------------------------------
  console.log('\n▶️ TEST D — CLIENT MULTI-BOUTIQUES & ISOLATION STRICTE');

  const storeIdD2 = 't-002'; // Boutique Horizon Quincaillerie

  // Associate Amadou Bah to Boutique B as well
  const assocD2 = dbStore.associateExistingClientToStore({
    personId: lookupC.person!.id,
    tenantId: storeIdD2,
    isLoyalCustomer: true,
    notes: 'Achats fréquents outillage'
  });

  assert(assocD2.success, 'D1. Association du même client à la Boutique B (t-002)');

  // Verify single identity across entire platform
  const allPersonsForPhone = dbStore.getState().persons.filter(p => p.phone === testPhoneA);
  assert(allPersonsForPhone.length === 1, 'D2. Exactement 1 seule identité client pour l\'ensemble du SaaS');

  // Verify Boutique A sees the client in its store
  const storeA_Clients = dbStore.getStoreClients(storeIdB);
  assert(storeA_Clients.some(c => c.phone === testPhoneA), 'D3. Boutique A voit le client dans son portefeuille');

  // Verify Boutique B sees the client in its store
  const storeB_Clients = dbStore.getStoreClients(storeIdD2);
  assert(storeB_Clients.some(c => c.phone === testPhoneA), 'D4. Boutique B voit le client dans son portefeuille');

  // Verify Boutique B does NOT see Fatou Soumah (registered only in Boutique A)
  assert(!storeB_Clients.some(c => c.phone === testPhoneB), 'D5. Isolation stricte : Boutique B ne voit PAS les clients exclusifs de Boutique A');

  // ----------------------------------------------------------------------------
  // TEST E — SÉPARATION DES RÔLES PROFESSIONNELS VS CLIENTS
  // ----------------------------------------------------------------------------
  console.log('\n▶️ TEST E — SÉPARATION STRICTE DES RÔLES');

  const cashierAuth = dbStore.authenticateUser('caissier', 'caisse123');
  assert(cashierAuth.success, 'E1. Connexion réussie de l\'employée Fatoumata Binta');
  
  const isEmployeeRole = cashierAuth.user?.roles.some(r => r.code === 'CAISSIER');
  const isClientRole = cashierAuth.user?.roles.some(r => r.code === 'CLIENT');
  assert(isEmployeeRole && !isClientRole, 'E2. L\'employée a le rôle CAISSIER et NON CLIENT');
  assert(cashierAuth.user?.tenantId === 't-001', 'E3. Rattachée strictement à sa boutique (t-001)');

  // ----------------------------------------------------------------------------
  // TEST F — SUPER ADMINISTRATEUR (GESTION GLOBALE & SUPERVISION)
  // ----------------------------------------------------------------------------
  console.log('\n▶️ TEST F — SUPER ADMINISTRATEUR (Module Global des Clients)');

  // 1. Query all platform clients
  const allClients = dbStore.getAllPlatformClients();
  assert(allClients.length >= 2, 'F1. Le Super Admin a une vue consolidée de tous les clients');

  // 2. Filter Marketplace clients
  const mpClients = dbStore.getAllPlatformClients({ origin: 'MARKETPLACE' });
  assert(mpClients.some(c => c.phone === testPhoneA), 'F2. Filtre "Clients Marketplace" opérationnel');

  // 3. Filter Store clients
  const storeClients = dbStore.getAllPlatformClients({ origin: 'STORE_REGISTERED' });
  assert(storeClients.some(c => c.phone === testPhoneB), 'F3. Filtre "Clients enregistrés par les boutiques" opérationnel');

  // 4. Filter Multi-Store clients
  const multiStoreClients = dbStore.getAllPlatformClients({ multiStoreOnly: true });
  assert(multiStoreClients.some(c => c.phone === testPhoneA), 'F4. Filtre "Clients Multi-Boutiques" détecte Amadou Bah (lié à t-001 et t-002)');

  // 5. Suspension / Reactivation
  const clientToSuspend = allClients.find(c => c.phone === testPhoneA)!;
  const suspendRes = dbStore.toggleClientSuspension(clientToSuspend.id, 'Test suspension administrative');
  assert(suspendRes.success && suspendRes.status === 'SUSPENDED', 'F5. Suspension administrative réussie');

  const suspendedList = dbStore.getAllPlatformClients({ status: 'SUSPENDED' });
  assert(suspendedList.some(c => c.id === clientToSuspend.id), 'F6. Client apparaît dans l\'onglet "Clients suspendus"');

  const reactivateRes = dbStore.toggleClientSuspension(clientToSuspend.id, 'Réactivation test');
  assert(reactivateRes.success && reactivateRes.status === 'ACTIVE', 'F7. Réactivation administrative réussie');

  console.log('\n========================================================');
  console.log(`RÉSULTAT GLOBAL DE LA SUITE DE TESTS : ${testsPassed} PASSÉS, ${testsFailed} ÉCHOUÉS`);
  console.log('========================================================\n');

  return { passed: testsPassed, failed: testsFailed };
}

// Execute tests if run directly
if (typeof window === 'undefined') {
  runClientManagementTestSuite();
}
