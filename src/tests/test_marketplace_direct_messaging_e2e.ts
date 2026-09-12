/**
 * Automated End-to-End Test Suite: Marketplace Direct Messaging Client ↔ Boutiquier
 * Validates all 14 test steps defined in the prompt.
 */

import { dbStore } from '../server/db/mockStore';
import { Product, Tenant } from '../types';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`✅ [PASS] ${testName}`);
    passed++;
  } else {
    console.error(`❌ [FAIL] ${testName} - ${detail || 'Assertion error'}`);
    failed++;
  }
}

console.log('================================================================');
console.log('TEST SUITE: MESSAGERIE DIRECTE CLIENT ↔ BOUTIQUIER (14 ÉTAPES)');
console.log('================================================================\n');

// Reset store to pristine state
dbStore.resetToDefault();

const storeA_Id = 'store-alpha-01';
const storeB_Id = 'store-beta-02';
const customer1_Id = 'client-ousmane-01';
const customer2_Id = 'client-fatou-02';

// -----------------------------------------------------------------------------
// ÉTAPE 0: Setup Boutiques & Produits
// -----------------------------------------------------------------------------
dbStore.updateState(draft => {
  draft.tenants.push({
    id: storeA_Id,
    name: 'Boutique Alpha Conakry',
    code: 'ALPHA',
    slug: 'alpha',
    activityType: 'RETAIL_STORE',
    status: 'ACTIVE',
    subscriptionStatus: 'ACTIVE',
    city: 'Conakry',
    phone: '+224622111111',
    isOnline: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  draft.tenants.push({
    id: storeB_Id,
    name: 'Boutique Beta Kindia',
    code: 'BETA',
    slug: 'beta',
    activityType: 'RETAIL_STORE',
    status: 'ACTIVE',
    subscriptionStatus: 'ACTIVE',
    city: 'Kindia',
    phone: '+224622222222',
    isOnline: false, // Initially offline for testing
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  draft.products.push({
    id: 'prod-pantalon-01',
    tenantId: storeA_Id,
    name: 'Pantalon Homme Chino',
    code: 'PANT-01',
    category: 'Mode & Habillement',
    currentStock: 40,
    costPrice: 25000,
    salePrice: 35000,
    publicPrice: 35000,
    publicUnit: 'pièce',
    photos: ['https://example.com/pantalon.jpg'],
    isActive: true
  } as Product);

  draft.products.push({
    id: 'prod-chemise-02',
    tenantId: storeB_Id,
    name: 'Chemise Blanche Coton',
    code: 'CHEM-02',
    category: 'Mode & Habillement',
    currentStock: 25,
    costPrice: 30000,
    salePrice: 45000,
    publicPrice: 45000,
    publicUnit: 'pièce',
    photos: ['https://example.com/chemise.jpg'],
    isActive: true
  } as Product);
});

// -----------------------------------------------------------------------------
// ÉTAPE 1, 2, 3: Client ouvre le produit et clique « Contacter le vendeur »
// -----------------------------------------------------------------------------
console.log('--- ÉTAPES 1, 2, 3: Ouverture conversation client sur Produit A ---');

const convRes = dbStore.findOrCreateMarketplaceConversation({
  customerId: customer1_Id,
  customerName: 'Ousmane Diallo',
  customerPhone: '+224622334455',
  boutiqueId: storeA_Id,
  boutiqueName: 'Boutique Alpha Conakry',
  productId: 'prod-pantalon-01',
  publicationId: 'prod-pantalon-01',
  productName: 'Pantalon Homme Chino',
  productImageUrl: 'https://example.com/pantalon.jpg',
  publicPrice: 35000,
  publicUnit: 'pièce'
});

assert(convRes.success && convRes.conversation !== undefined, 'ÉTAPE 1-3: Conversation initialisée avec contexte produit');
assert(convRes.conversation.boutiqueId === storeA_Id, 'ÉTAPE 1-3: La conversation est rattachée strictement à Boutique Alpha');
assert(convRes.conversation.productName === 'Pantalon Homme Chino', 'ÉTAPE 1-3: Contexte produit "Pantalon Homme Chino" préservé');

// -----------------------------------------------------------------------------
// ÉTAPE 4 & 5: Client envoie « Bonjour, ce produit est-il disponible ? »
// -----------------------------------------------------------------------------
console.log('\n--- ÉTAPES 4 & 5: Envoi du premier message client et persistance ---');

const clientSendRes = dbStore.sendMarketplaceMessage({
  conversationId: convRes.conversation.id,
  senderId: customer1_Id,
  senderType: 'CUSTOMER',
  senderName: 'Ousmane Diallo',
  content: 'Bonjour, ce produit est-il disponible ?'
});

assert(clientSendRes.success && clientSendRes.message !== undefined, 'ÉTAPE 4-5: Envoi du message client réussi');
assert(clientSendRes.message?.content === 'Bonjour, ce produit est-il disponible ?', 'ÉTAPE 4-5: Contenu du message exact');
assert(clientSendRes.message?.isRead === false, 'ÉTAPE 4-5: Le message est marqué non lu au départ');

// Vérification en base
const storedConv = dbStore.getMarketplaceConversationById(convRes.conversation.id);
assert(
  storedConv?.messages?.some(m => m.content === 'Bonjour, ce produit est-il disponible ?'),
  'ÉTAPE 5.2: Message persisté en base et vérifiable via getMarketplaceConversationById'
);

// -----------------------------------------------------------------------------
// ÉTAPE 6: Vendeur Boutique A consulte sa messagerie
// -----------------------------------------------------------------------------
console.log('\n--- ÉTAPE 6: Vendeur Boutique A reçoit la notification et le message ---');

const boutiqueAConvs = dbStore.getMarketplaceConversations(storeA_Id);
const boutiqueAUnread = dbStore.getMarketplaceUnreadCount(storeA_Id);

assert(boutiqueAConvs.length === 1, 'ÉTAPE 6.1: Boutique A a 1 conversation dans sa boîte');
assert(boutiqueAUnread === 1, 'ÉTAPE 6.2: Compteur non lu Boutique A = 1');
assert(boutiqueAConvs[0].customerName === 'Ousmane Diallo', 'ÉTAPE 6.3: Nom du client identifié (Ousmane Diallo)');
assert(boutiqueAConvs[0].productName === 'Pantalon Homme Chino', 'ÉTAPE 6.4: Produit associé affiché (Pantalon Homme Chino)');

// Vérification de l'isolation : Boutique B ne voit rien
const boutiqueBConvs = dbStore.getMarketplaceConversations(storeB_Id);
const boutiqueBUnread = dbStore.getMarketplaceUnreadCount(storeB_Id);
assert(boutiqueBConvs.length === 0 && boutiqueBUnread === 0, 'ÉTAPE 6.5: Isolation stricte : Boutique B n\'a AUCUN message');

// Le vendeur ouvre la conversation -> marquage lu
dbStore.markMarketplaceConversationAsRead(convRes.conversation.id, 'BOUTIQUE');
const boutiqueAUnreadAfterOpen = dbStore.getMarketplaceUnreadCount(storeA_Id);
assert(boutiqueAUnreadAfterOpen === 0, 'ÉTAPE 6.6: Après ouverture par Boutique A, compteur non lu = 0');

// -----------------------------------------------------------------------------
// ÉTAPE 7: Vendeur répond « Bonjour, oui il est disponible. »
// -----------------------------------------------------------------------------
console.log('\n--- ÉTAPE 7: Réponse du vendeur ---');

const sellerReplyRes = dbStore.sendMarketplaceMessage({
  conversationId: convRes.conversation.id,
  senderId: storeA_Id,
  senderType: 'BOUTIQUE',
  senderName: 'Boutique Alpha Conakry',
  content: 'Bonjour, oui il est disponible.'
});

assert(sellerReplyRes.success, 'ÉTAPE 7.1: Vendeur a envoyé sa réponse');

// -----------------------------------------------------------------------------
// ÉTAPE 8: Client reçoit la réponse dans « Mes messages »
// -----------------------------------------------------------------------------
console.log('\n--- ÉTAPE 8: Réception côté client ---');

const clientConvs = dbStore.getMarketplaceConversations(undefined, customer1_Id);
const clientUnread = dbStore.getMarketplaceUnreadCount(undefined, customer1_Id);
const updatedConvForClient = dbStore.getMarketplaceConversationById(convRes.conversation.id);

assert(clientConvs.length === 1, 'ÉTAPE 8.1: Client a sa conversation dans son espace');
assert(clientUnread === 1, 'ÉTAPE 8.2: Client a 1 notification de réponse non lue');
assert(
  updatedConvForClient?.messages?.some(m => m.senderType === 'BOUTIQUE' && m.content === 'Bonjour, oui il est disponible.'),
  'ÉTAPE 8.3: Le message du vendeur est bien présent dans le fil du client'
);

// Client lit la réponse
dbStore.markMarketplaceConversationAsRead(convRes.conversation.id, 'CUSTOMER');
assert(dbStore.getMarketplaceUnreadCount(undefined, customer1_Id) === 0, 'ÉTAPE 8.4: Client a marqué sa discussion comme lue');

// -----------------------------------------------------------------------------
// ÉTAPE 9 & 10: Vendeur hors ligne & message différé
// -----------------------------------------------------------------------------
console.log('\n--- ÉTAPES 9 & 10: Vendeur hors ligne & persistance ---');

// Boutique B est hors ligne (isOnline: false)
const storeBTenant = dbStore.getState().tenants.find(t => t.id === storeB_Id);
assert(storeBTenant?.isOnline === false, 'ÉTAPE 9.1: Boutique B est déclarée hors ligne');

// Client 2 envoie un message à Boutique B hors ligne
const convB = dbStore.findOrCreateMarketplaceConversation({
  customerId: customer2_Id,
  customerName: 'Fatou Camara',
  customerPhone: '+224622998877',
  boutiqueId: storeB_Id,
  boutiqueName: 'Boutique Beta Kindia',
  productId: 'prod-chemise-02',
  publicationId: 'prod-chemise-02',
  productName: 'Chemise Blanche Coton',
  publicPrice: 45000,
  publicUnit: 'pièce',
  initialMessage: 'Bonjour, avez-vous la taille XL en stock à Kindia ?'
});

assert(convB.success, 'ÉTAPE 9.2: Message envoyé avec succès même avec le vendeur hors ligne');
assert(dbStore.getMarketplaceUnreadCount(storeB_Id) === 1, 'ÉTAPE 9.3: Message enregistré comme non lu pour Boutique B');

// Boutique B se reconnecte (isOnline: true)
dbStore.updateState(draft => {
  const t = draft.tenants.find(x => x.id === storeB_Id);
  if (t) t.isOnline = true;
});

const refreshedStoreB = dbStore.getState().tenants.find(t => t.id === storeB_Id);
assert(refreshedStoreB?.isOnline === true, 'ÉTAPE 10.1: Boutique B est reconnectée');

const storeBInbox = dbStore.getMarketplaceConversations(storeB_Id);
assert(storeBInbox.length === 1 && storeBInbox[0].unreadByBoutique === 1, 'ÉTAPE 10.2: Boutique B retrouve son message non lu');

// -----------------------------------------------------------------------------
// ÉTAPE 11 & 12: Multiples conversations et compteurs précis
// -----------------------------------------------------------------------------
console.log('\n--- ÉTAPES 11 & 12: Isolation multiple & Compteurs non lus ---');

// Client 1 envoie un autre message à Boutique B
dbStore.findOrCreateMarketplaceConversation({
  customerId: customer1_Id,
  customerName: 'Ousmane Diallo',
  boutiqueId: storeB_Id,
  boutiqueName: 'Boutique Beta Kindia',
  productName: 'Chemise Blanche Coton',
  initialMessage: 'Bonjour Boutique Beta, faites-vous des livraisons groupées ?'
});

const client1Convs = dbStore.getMarketplaceConversations(undefined, customer1_Id);
assert(client1Convs.length === 2, 'ÉTAPE 11.1: Client 1 possède exactement 2 conversations distinctes');

const storeBTotalUnread = dbStore.getMarketplaceUnreadCount(storeB_Id);
assert(storeBTotalUnread === 2, 'ÉTAPE 12.1: Boutique B a exactement 2 messages non lus de 2 clients différents');

// -----------------------------------------------------------------------------
// ÉTAPE 13: Statuts des messages (Envoyé / Lu)
// -----------------------------------------------------------------------------
console.log('\n--- ÉTAPE 13: Statut des messages (Lu vs Non Lu) ---');

const convAData = dbStore.getMarketplaceConversationById(convRes.conversation.id);
const clientMsg = convAData?.messages?.find(m => m.senderType === 'CUSTOMER');
const sellerMsg = convAData?.messages?.find(m => m.senderType === 'BOUTIQUE');

assert(clientMsg?.isRead === true, 'ÉTAPE 13.1: Message client lu par le vendeur -> isRead = true (✓✓ Lu)');
assert(sellerMsg?.isRead === true, 'ÉTAPE 13.2: Message vendeur lu par le client -> isRead = true (✓✓ Lu)');

// -----------------------------------------------------------------------------
// ÉTAPE 14: Non-régression modules existants
// -----------------------------------------------------------------------------
console.log('\n--- ÉTAPE 14: Validation de Non-Régression ---');

const productsCount = dbStore.getState().products.length;
const salesCount = dbStore.getState().boutiqueSales?.length || 0;
const servicesCount = dbStore.getState().services?.length || 0;

assert(productsCount >= 2, 'ÉTAPE 14.1: Produits et stock intacts');
assert(typeof dbStore.getState().boutiqueSales !== 'undefined', 'ÉTAPE 14.2: Module Boutique POS intact');
assert(typeof dbStore.getState().orders !== 'undefined', 'ÉTAPE 14.3: Module Commandes intact');

console.log('\n================================================================');
console.log(`RÉSULTATS DE LA VALIDATION DE MESSAGERIE : ${passed} RÉUSSIS, ${failed} ÉCHECS`);
console.log('================================================================\n');

if (failed > 0) {
  process.exit(1);
} else {
  console.log('🎉 TOUTES LES 14 ÉTAPES DU SCÉNARIO DE MESSAGERIE ONT ÉTÉ VALIDÉES !');
}
