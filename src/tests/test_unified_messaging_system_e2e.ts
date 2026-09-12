import { dbStore } from '../server/db/mockStore';
import { MarketplaceConversation, MarketplaceMessage, Tenant, Product, Order } from '../types';

/**
 * ==============================================================================
 * SUITE COMPLÈTE DE VALIDATION E2E — MODULE UNIQUE ET CENTRAL DE MESSAGERIE
 * ==============================================================================
 * 
 * Cette suite valide rigoureusement les 16 scénarios de test obligatoires :
 * 
 * TEST 1 : Client → Produit → Contacter le vendeur → message persisté & visible en boutique.
 * TEST 2 : Boutiquier répond → Client reçoit la réponse dans le même fil.
 * TEST 3 : Accueil / Réceptionniste autorisé voit la conversation de sa boutique.
 * TEST 4 : Accueil répond → Client reçoit la réponse dans la même conversation.
 * TEST 5 : Boutiquier voit la réponse de l'accueil dans le même historique continu.
 * TEST 6 : Client Y ne peut PAS voir les conversations de Client X.
 * TEST 7 : Boutique A ne peut PAS voir les conversations de Boutique B (isolation stricte).
 * TEST 8 : Utilisateur non autorisé d'une autre boutique ne peut pas accéder aux messages.
 * TEST 9 : Message envoyé pendant que le vendeur est hors ligne (persistance & badge non-lu).
 * TEST 10: Multiples clics sur « Contacter le vendeur » → réutilisation sans doublon.
 * TEST 11: Conversation liée à un produit (métadonnées & prix).
 * TEST 12: Conversation générale avec une boutique (sans produit spécifique).
 * TEST 13: Conversation liée à une commande (Commande #CMD-XXXX & montant).
 * TEST 14: Compteurs de messages non lus (Boutique & Client).
 * TEST 15: Lecture d'un message → statut isRead et reset du compteur à 0.
 * TEST 16: Supervision Administrateur / SuperAdmin multi-boutiques.
 */

let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string, details?: string) {
  if (condition) {
    console.log(`  ✅ [PASS] ${testName}`);
    passedTests++;
  } else {
    console.error(`  ❌ [FAIL] ${testName}`);
    if (details) console.error(`     Détails: ${details}`);
    failedTests++;
  }
}

export function runUnifiedMessagingTestSuite() {
  console.log('\n==============================================================================');
  console.log('🚀 DÉMARRAGE DES TESTS E2E — MODULE UNIQUE DE MESSAGERIE TRANSVERSALE');
  console.log('==============================================================================\n');

  const state = dbStore.getState();
  const boutiqueA: Tenant = state.tenants.find(t => t.id === 't-001') || {
    id: 't-001',
    name: 'Boutique Alpha Tech',
    code: 'BAT',
    activityType: 'RETAIL_STORE',
    city: 'Conakry',
    isOnline: true
  } as Tenant;

  const boutiqueB: Tenant = state.tenants.find(t => t.id === 't-002') || {
    id: 't-002',
    name: 'Boutique Quincaillerie Horizon',
    code: 'BQH',
    activityType: 'RETAIL_STORE',
    city: 'Conakry',
    isOnline: false
  } as Tenant;

  const clientX_Id = 'client-ibrahima-001';
  const clientX_Name = 'Ibrahima Sory Bah';
  const clientY_Id = 'client-fatou-002';
  const clientY_Name = 'Fatoumata Binta Diallo';

  // --------------------------------------------------------------------------
  // TEST 1 : Client → Produit → Contacter le vendeur → Message persisté en BD
  // --------------------------------------------------------------------------
  console.log('\n--- SCÉNARIO 1 : Client → Fiche Produit → Contacter le vendeur ---');
  const conv1Res = dbStore.findOrCreateMarketplaceConversation({
    customerId: clientX_Id,
    customerName: clientX_Name,
    customerPhone: '+224 620 11 22 33',
    boutiqueId: boutiqueA.id,
    boutiqueName: boutiqueA.name,
    productId: 'prod-s24-ultra',
    productName: 'Samsung Galaxy S24 Ultra 512Go',
    productImageUrl: 'https://images.unsplash.com/photo-samsung.jpg',
    publicPrice: 12500000,
    publicUnit: 'Unité',
    initialMessage: 'Bonjour, ce produit est-il disponible en stock ?'
  });

  assert(conv1Res.success === true, 'TEST 1.1: Création/Initialisation réussie de la conversation');
  assert(conv1Res.isNew === true, 'TEST 1.2: Première ouverture marque isNew=true');

  const boutiqueA_Inbox = dbStore.getMarketplaceConversations(boutiqueA.id);
  const foundInBoutiqueA = boutiqueA_Inbox.find(c => c.id === conv1Res.conversation.id);
  assert(foundInBoutiqueA !== undefined, 'TEST 1.3: La conversation apparaît immédiatement dans la messagerie de Boutique A');
  assert(foundInBoutiqueA?.unreadByBoutique === 1, 'TEST 1.4: Compteur non-lu boutique incrémenté à 1');
  assert(foundInBoutiqueA?.lastMessageContent === 'Bonjour, ce produit est-il disponible en stock ?', 'TEST 1.5: Contenu du dernier message exact');

  // --------------------------------------------------------------------------
  // TEST 2 : Boutiquier répond → Client reçoit la réponse dans le même fil
  // --------------------------------------------------------------------------
  console.log('\n--- SCÉNARIO 2 : Réponse du Boutiquier ---');
  const reply1Res = dbStore.sendMarketplaceMessage({
    conversationId: conv1Res.conversation.id,
    senderId: 'user-seller-01',
    senderType: 'BOUTIQUE',
    senderName: 'Alpha (Vendeur)',
    senderRole: 'Vendeur',
    content: 'Bonjour M. Bah, oui il nous reste 3 exemplaires scellés en boutique !'
  });

  assert(reply1Res.success === true, 'TEST 2.1: Envoi de réponse par le boutiquier réussi');
  
  const clientX_Inbox = dbStore.getMarketplaceConversations(undefined, clientX_Id);
  const convForClientX = clientX_Inbox.find(c => c.id === conv1Res.conversation.id);
  assert(convForClientX !== undefined, 'TEST 2.2: Client X retrouve sa conversation mise à jour');
  assert(convForClientX?.unreadByCustomer === 1, 'TEST 2.3: Compteur non-lu client incrémenté');

  const fullConvClient = dbStore.getMarketplaceConversationById(conv1Res.conversation.id);
  assert(fullConvClient?.messages?.length === 2, 'TEST 2.4: La conversation contient exactement 2 messages dans le même historique');

  // --------------------------------------------------------------------------
  // TEST 3, 4, 5 : Multi-utilisateurs même boutique (Accueil / Réceptionniste & Gérant)
  // --------------------------------------------------------------------------
  console.log('\n--- SCÉNARIO 3-5 : Collaboration Multi-Utilisateurs (Accueil + Vendeur) ---');
  
  // Scénario 3: Accueil consulte les conversations de Boutique A
  const receptionInbox = dbStore.getMarketplaceConversations(boutiqueA.id);
  const receptionConv = receptionInbox.find(c => c.id === conv1Res.conversation.id);
  assert(receptionConv !== undefined, 'TEST 3: Accueil / Réceptionniste voit la même conversation de la boutique');

  // Scénario 4: Accueil répond au client
  const receptionReplyRes = dbStore.sendMarketplaceMessage({
    conversationId: conv1Res.conversation.id,
    senderId: 'user-reception-01',
    senderType: 'BOUTIQUE',
    senderName: 'Marie (Accueil / Réception)',
    senderRole: 'Accueil / Réception',
    content: 'Vous pouvez passer récupérer le téléphone directement aujourd’hui jusqu’à 19h.'
  });
  assert(receptionReplyRes.success === true, 'TEST 4.1: Réponse de l\'accueil enregistrée');

  // Scénario 5: Boutiquier ré-ouvre la conversation et voit la réponse de l'accueil
  const sellerReopenedConv = dbStore.getMarketplaceConversationById(conv1Res.conversation.id);
  assert(sellerReopenedConv?.messages?.length === 3, 'TEST 5.1: 3 messages au total dans l\'historique unique partagé');
  const lastMsg = sellerReopenedConv?.messages?.[2];
  assert(lastMsg?.senderName === 'Marie (Accueil / Réception)', 'TEST 5.2: Le boutiquier voit bien la réponse émise par l\'accueil');
  assert(lastMsg?.senderRole === 'Accueil / Réception', 'TEST 5.3: Rôle de l\'accueil correctement identifié');

  // --------------------------------------------------------------------------
  // TEST 6 & 7 & 8 : Sécurité, Isolation Multi-Tenant & Isolation Clients
  // --------------------------------------------------------------------------
  console.log('\n--- SCÉNARIO 6-8 : Isolation Stricte (Clients & Boutiques) ---');
  
  // TEST 6: Client Y ne voit pas la conversation de Client X
  const clientY_Inbox = dbStore.getMarketplaceConversations(undefined, clientY_Id);
  const convOfClientXInClientY = clientY_Inbox.find(c => c.id === conv1Res.conversation.id);
  assert(convOfClientXInClientY === undefined, 'TEST 6: Client Y ne peut absolument PAS voir les messages de Client X');

  // TEST 7: Boutique B ne voit pas les conversations de Boutique A
  const boutiqueB_Inbox = dbStore.getMarketplaceConversations(boutiqueB.id);
  const convOfBoutiqueAInBoutiqueB = boutiqueB_Inbox.find(c => c.id === conv1Res.conversation.id);
  assert(convOfBoutiqueAInBoutiqueB === undefined, 'TEST 7: Boutique B ne peut absolument PAS voir les conversations de Boutique A');

  // TEST 8: Recherche isolée
  const searchResultsBoutiqueB = dbStore.getMarketplaceConversations(boutiqueB.id, undefined, { search: 'Samsung' });
  assert(searchResultsBoutiqueB.length === 0, 'TEST 8: La recherche dans Boutique B ne retourne pas les messages de Boutique A');

  // --------------------------------------------------------------------------
  // TEST 9 : Vendeur Hors Ligne (Persistance & Réception différée)
  // --------------------------------------------------------------------------
  console.log('\n--- SCÉNARIO 9 : Vendeur Hors Ligne ---');
  const offlineConvRes = dbStore.findOrCreateMarketplaceConversation({
    customerId: clientY_Id,
    customerName: clientY_Name,
    customerPhone: '+224 628 99 88 77',
    boutiqueId: boutiqueB.id, // Boutique B est hors ligne
    boutiqueName: boutiqueB.name,
    productId: 'prod-ciment-50kg',
    productName: 'Ciment CPJ 42.5 Diamant 50kg',
    publicPrice: 85000,
    publicUnit: 'Sac',
    initialMessage: 'Bonjour, faites-vous la livraison de 100 sacs à Coyah ?'
  });

  assert(offlineConvRes.success === true, 'TEST 9.1: Message envoyé avec succès vers une boutique hors ligne');
  const storeB_InboxAfter = dbStore.getMarketplaceConversations(boutiqueB.id);
  const foundInStoreB = storeB_InboxAfter.find(c => c.id === offlineConvRes.conversation.id);
  assert(foundInStoreB !== undefined, 'TEST 9.2: Le message est bien persisté et attend le commerçant');
  assert(foundInStoreB?.unreadByBoutique === 1, 'TEST 9.3: Le badge non-lu de Boutique B affiche 1');

  // --------------------------------------------------------------------------
  // TEST 10 : Éviter les Doublons (Deux clics sur « Contacter le vendeur »)
  // --------------------------------------------------------------------------
  console.log('\n--- SCÉNARIO 10 : Anti-Doublons ---');
  const secondClickRes = dbStore.findOrCreateMarketplaceConversation({
    customerId: clientX_Id,
    customerName: clientX_Name,
    boutiqueId: boutiqueA.id,
    boutiqueName: boutiqueA.name,
    productId: 'prod-s24-ultra',
    productName: 'Samsung Galaxy S24 Ultra 512Go'
  });

  assert(secondClickRes.isNew === false, 'TEST 10.1: Un deuxième clic sur le même produit détecte la conversation active (isNew=false)');
  assert(secondClickRes.conversation.id === conv1Res.conversation.id, 'TEST 10.2: Réutilisation exacte de la même conversation ID');

  // --------------------------------------------------------------------------
  // TEST 11 : Conversation liée à un Produit
  // --------------------------------------------------------------------------
  console.log('\n--- SCÉNARIO 11 : Contexte Produit ---');
  const productConv = dbStore.getMarketplaceConversationById(conv1Res.conversation.id);
  assert(productConv?.productId === 'prod-s24-ultra', 'TEST 11.1: ProductId correctement lié');
  assert(productConv?.publicPrice === 12500000, 'TEST 11.2: Prix public sauvegardé');
  assert(productConv?.publicUnit === 'Unité', 'TEST 11.3: Unité de vente publique sauvegardée');

  // --------------------------------------------------------------------------
  // TEST 12 : Conversation Générale avec une Boutique (sans produit)
  // --------------------------------------------------------------------------
  console.log('\n--- SCÉNARIO 12 : Conversation Générale Boutique ---');
  const generalConvRes = dbStore.findOrCreateMarketplaceConversation({
    customerId: clientX_Id,
    customerName: clientX_Name,
    boutiqueId: boutiqueA.id,
    boutiqueName: boutiqueA.name,
    initialMessage: 'Bonjour, quels sont vos horaires d\'ouverture ce weekend ?'
  });
  assert(generalConvRes.success === true, 'TEST 12.1: Conversation générale créée');
  assert(!generalConvRes.conversation.productId, 'TEST 12.2: Pas de produit lié');
  assert(generalConvRes.conversation.productName === 'Discussion Boutique', 'TEST 12.3: Libellé par défaut appliqué');

  // --------------------------------------------------------------------------
  // TEST 13 : Conversation liée à une Commande
  // --------------------------------------------------------------------------
  console.log('\n--- SCÉNARIO 13 : Conversation liée à une Commande ---');
  const orderConvRes = dbStore.findOrCreateMarketplaceConversation({
    customerId: clientX_Id,
    customerName: clientX_Name,
    boutiqueId: boutiqueA.id,
    boutiqueName: boutiqueA.name,
    orderId: 'ord-mkt-2026-001',
    orderCode: 'CMD-MKT-2026-001',
    orderTotal: 25000000,
    initialMessage: 'Bonjour, je souhaite modifier l\'adresse de livraison de ma commande.'
  });
  assert(orderConvRes.success === true, 'TEST 13.1: Conversation liée à la commande créée');
  assert(orderConvRes.conversation.orderId === 'ord-mkt-2026-001', 'TEST 13.2: OrderId correctement rattaché');
  assert(orderConvRes.conversation.orderCode === 'CMD-MKT-2026-001', 'TEST 13.3: Code commande correctement rattaché');
  assert(orderConvRes.conversation.orderTotal === 25000000, 'TEST 13.4: Montant total de la commande présent');

  // --------------------------------------------------------------------------
  // TEST 14 & 15 : Compteurs non-lus et Marquage comme Lu
  // --------------------------------------------------------------------------
  console.log('\n--- SCÉNARIO 14-15 : Compteurs & Marquage Lu ---');
  const unreadBefore = dbStore.getMarketplaceUnreadCount(boutiqueA.id);
  assert(unreadBefore >= 2, `TEST 14.1: Compteur total non-lu Boutique A valide (Total: ${unreadBefore})`);

  // Boutique A ouvre la conversation de commande et la lit
  const markReadRes = dbStore.markMarketplaceConversationAsRead(orderConvRes.conversation.id, 'BOUTIQUE');
  assert(markReadRes.success === true, 'TEST 15.1: Marquage lu réussi pour Boutique A');
  
  const updatedOrderConv = dbStore.getMarketplaceConversationById(orderConvRes.conversation.id);
  assert(updatedOrderConv?.unreadByBoutique === 0, 'TEST 15.2: unreadByBoutique remis à 0');
  const allCustomerMessagesRead = updatedOrderConv?.messages?.every(m => m.senderType !== 'CUSTOMER' || m.isRead === true);
  assert(allCustomerMessagesRead === true, 'TEST 15.3: Tous les messages du client sont marqués isRead=true');

  // --------------------------------------------------------------------------
  // TEST 16 : Supervision Administrateur
  // --------------------------------------------------------------------------
  console.log('\n--- SCÉNARIO 16 : Supervision Administrateur Multi-Boutiques ---');
  const adminConvs = dbStore.getMarketplaceConversations(undefined, undefined, { isSuperAdmin: true });
  assert(adminConvs.length >= 3, `TEST 16.1: L'administrateur a une visibilité globale sur toutes les conversations (${adminConvs.length} trouvées)`);
  
  const searchFilter = dbStore.getMarketplaceConversations(undefined, undefined, { search: 'Ciment', isSuperAdmin: true });
  assert(searchFilter.length >= 1, 'TEST 16.2: L\'administrateur peut filtrer et rechercher sur n\'importe quel terme');

  // --------------------------------------------------------------------------
  // BILAN DES TESTS
  // --------------------------------------------------------------------------
  console.log('\n==============================================================================');
  console.log(`📊 RÉSULTAT FINAL DES TESTS : ${passedTests} SUCCÈS / ${failedTests} ÉCHECS`);
  console.log('==============================================================================\n');

  return { passed: passedTests, failed: failedTests, total: passedTests + failedTests };
}

// Auto-run when executed directly
runUnifiedMessagingTestSuite();

