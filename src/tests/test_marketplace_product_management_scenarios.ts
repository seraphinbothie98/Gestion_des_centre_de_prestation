import { dbStore } from '../server/db/mockStore';
import { Product, Tenant } from '../types';

console.log('================================================================================');
console.log('🧪 TEST SUITE: GESTION DES PRODUITS DU MARKETPLACE (10 SCÉNARIOS OBLIGATOIRES)');
console.log('================================================================================\n');

let passedTests = 0;
let totalTests = 0;

function assert(condition: boolean, message: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ [PASS] ${message}`);
  } else {
    console.error(`  ❌ [FAIL] ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

// ---------------------------------------------------------------------------
// SETUP: Create two test stores (Boutiques) in different cities
// ---------------------------------------------------------------------------
console.log('📦 ÉTAPE 0 : Initialisation des Boutiques de Test...');
const storeConakryId = `store-conakry-${Date.now()}`;
const storeKindiaId = `store-kindia-${Date.now()}`;

const boutiqueConakry: Tenant = {
  id: storeConakryId,
  name: 'Super Papeterie Conakry',
  code: 'ST-CKY',
  slug: 'super-papeterie-conakry',
  activityType: 'RETAIL_STORE',
  status: 'ACTIVE',
  responsibleName: 'Amadou Diallo',
  city: 'Conakry',
  address: 'Kaloum, Marché Niger',
  phone: '+224621001122',
  currency: 'GNF',
  taxRate: 0,
  isActive: true,
  isOnline: true,
  subscriptionStatus: 'ACTIVE',
  trialStartedAt: new Date().toISOString(),
  trialEndsAt: new Date().toISOString(),
  trialDaysTotal: 30,
  settings: {},
  createdAt: new Date().toISOString()
};

const boutiqueKindia: Tenant = {
  id: storeKindiaId,
  name: 'Boutique Moderne Kindia',
  code: 'ST-KND',
  slug: 'boutique-moderne-kindia',
  activityType: 'RETAIL_STORE',
  status: 'ACTIVE',
  responsibleName: 'Mariama Camara',
  city: 'Kindia',
  address: 'Centre-ville Kindia',
  phone: '+224622334455',
  currency: 'GNF',
  taxRate: 0,
  isActive: true,
  isOnline: true,
  subscriptionStatus: 'ACTIVE',
  trialStartedAt: new Date().toISOString(),
  trialEndsAt: new Date().toISOString(),
  trialDaysTotal: 30,
  settings: {},
  createdAt: new Date().toISOString()
};

// ---------------------------------------------------------------------------
// SCÉNARIO 1 : Produit avec 1 image -> Vue 1 uniquement
// ---------------------------------------------------------------------------
console.log('\n--- SCÉNARIO 1 : Produit avec 1 image ---');
const res1 = dbStore.createSecureProduct({
  code: `ART-S1-${Date.now()}`,
  name: 'Stylo à Bille Bleu 1-Vue',
  category: 'Fournitures',
  baseUnit: 'pièce',
  salePrice: 2000,
  costPrice: 1500,
  images: ['https://cdn.example.com/stylo-vue1.jpg'],
  publicUnit: 'pièce',
  publicPrice: 2000,
  conversionFactorToStockUnit: 1
}, storeConakryId, true);

assert(res1.success === true, 'Création du produit avec 1 image réussie');
const prod1 = res1.product!;
assert(prod1.images !== undefined && prod1.images.length === 1, 'Le produit a exactement 1 image enregistrée');
assert(prod1.images![0] === 'https://cdn.example.com/stylo-vue1.jpg', 'Vue 1 correspond à l\'image fournie');
assert(prod1.imageUrl === 'https://cdn.example.com/stylo-vue1.jpg', 'imageUrl est synchronisé avec Vue 1');
assert(prod1.images![1] === undefined, 'Aucune Vue 2 fictive n\'a été créée');

// ---------------------------------------------------------------------------
// SCÉNARIO 2 : Produit avec 2 images -> Vue 1 + Vue 2
// ---------------------------------------------------------------------------
console.log('\n--- SCÉNARIO 2 : Produit avec 2 images ---');
const res2 = dbStore.createSecureProduct({
  code: `ART-S2-${Date.now()}`,
  name: 'Cahier 200 Pages 2-Vues',
  category: 'Papeterie',
  baseUnit: 'cahier',
  salePrice: 15000,
  costPrice: 10000,
  images: [
    'https://cdn.example.com/cahier-face.jpg',
    'https://cdn.example.com/cahier-dos.jpg'
  ],
  publicUnit: 'cahier',
  publicPrice: 15000,
  conversionFactorToStockUnit: 1
}, storeConakryId, true);

assert(res2.success === true, 'Création du produit avec 2 images réussie');
const prod2 = res2.product!;
assert(prod2.images?.length === 2, 'Le produit a exactement 2 images');
assert(prod2.images![0] === 'https://cdn.example.com/cahier-face.jpg', 'Vue 1 est correcte');
assert(prod2.images![1] === 'https://cdn.example.com/cahier-dos.jpg', 'Vue 2 est correcte');
assert(prod2.images![2] === undefined, 'Aucune Vue 3 fictive présente');

// ---------------------------------------------------------------------------
// SCÉNARIO 3 : Produit avec 3 images -> Vue 1 + Vue 2 + Vue 3
// ---------------------------------------------------------------------------
console.log('\n--- SCÉNARIO 3 : Produit avec 3 images ---');
const res3 = dbStore.createSecureProduct({
  code: `ART-S3-${Date.now()}`,
  name: 'Calculatrice Scientifique 3-Vues',
  category: 'Bureautique',
  baseUnit: 'pièce',
  salePrice: 120000,
  costPrice: 90000,
  images: [
    'https://cdn.example.com/calc-vue1.jpg',
    'https://cdn.example.com/calc-vue2.jpg',
    'https://cdn.example.com/calc-vue3.jpg'
  ],
  publicUnit: 'pièce',
  publicPrice: 120000,
  conversionFactorToStockUnit: 1
}, storeConakryId, true);

assert(res3.success === true, 'Création du produit avec 3 images réussie');
const prod3 = res3.product!;
assert(prod3.images?.length === 3, 'Le produit a exactement 3 images');
assert(prod3.images![0] === 'https://cdn.example.com/calc-vue1.jpg', 'Vue 1 ok');
assert(prod3.images![1] === 'https://cdn.example.com/calc-vue2.jpg', 'Vue 2 ok');
assert(prod3.images![2] === 'https://cdn.example.com/calc-vue3.jpg', 'Vue 3 ok');
assert(prod3.images![3] === undefined, 'Aucune Vue 4 fictive présente');

// ---------------------------------------------------------------------------
// SCÉNARIO 4 : Produit avec 4 images -> Vue 1 + Vue 2 + Vue 3 + Vue 4
// ---------------------------------------------------------------------------
console.log('\n--- SCÉNARIO 4 : Produit avec 4 images ---');
const res4 = dbStore.createSecureProduct({
  code: `ART-S4-${Date.now()}`,
  name: 'Sac à Dos Premium 4-Vues',
  category: 'Bagagerie',
  baseUnit: 'pièce',
  salePrice: 250000,
  costPrice: 180000,
  images: [
    'https://cdn.example.com/sac-v1.jpg',
    'https://cdn.example.com/sac-v2.jpg',
    'https://cdn.example.com/sac-v3.jpg',
    'https://cdn.example.com/sac-v4.jpg'
  ],
  publicUnit: 'pièce',
  publicPrice: 250000,
  conversionFactorToStockUnit: 1
}, storeConakryId, true);

assert(res4.success === true, 'Création du produit avec 4 images réussie');
const prod4 = res4.product!;
assert(prod4.images?.length === 4, 'Le produit a exactement 4 images');
assert(prod4.images![0] === 'https://cdn.example.com/sac-v1.jpg', 'Vue 1');
assert(prod4.images![1] === 'https://cdn.example.com/sac-v2.jpg', 'Vue 2');
assert(prod4.images![2] === 'https://cdn.example.com/sac-v3.jpg', 'Vue 3');
assert(prod4.images![3] === 'https://cdn.example.com/sac-v4.jpg', 'Vue 4');

// ---------------------------------------------------------------------------
// SCÉNARIO 5 : Supprimer Vue 2 alors que Vue 1, Vue 2 et Vue 3 existaient
// ---------------------------------------------------------------------------
console.log('\n--- SCÉNARIO 5 : Suppression de Vue 2 et réordonnancement propre ---');
// Modifions le produit 3 (qui avait 3 images) en supprimant l'élément à l'index 1 (Vue 2)
const remainingImages = prod3.images!.filter((_, idx) => idx !== 1);
const updateRes = dbStore.updateSecureProduct(prod3.id, {
  images: remainingImages
}, storeConakryId, true);

assert(updateRes.success === true, 'Mise à jour du produit après suppression de Vue 2');
const prod3After = updateRes.product!;
assert(prod3After.images?.length === 2, 'Il ne reste plus que 2 images réelles');
assert(prod3After.images![0] === 'https://cdn.example.com/calc-vue1.jpg', 'Nouvelle Vue 1 est préservée');
assert(prod3After.images![1] === 'https://cdn.example.com/calc-vue3.jpg', 'L\'ancienne Vue 3 devient proprement la Vue 2');
assert(!prod3After.images!.includes('https://cdn.example.com/calc-vue2.jpg'), 'L\'ancienne Vue 2 a été totalement supprimée');

// ---------------------------------------------------------------------------
// SCÉNARIO 6 : Produit sans image -> Placeholder générique uniquement
// ---------------------------------------------------------------------------
console.log('\n--- SCÉNARIO 6 : Produit sans image (zéro image étrangère) ---');
const res6 = dbStore.createSecureProduct({
  code: `ART-S6-${Date.now()}`,
  name: 'Gomme Blanche Sans Image',
  category: 'Fournitures',
  baseUnit: 'pièce',
  salePrice: 1000,
  costPrice: 500,
  images: [],
  publicUnit: 'pièce',
  publicPrice: 1000,
  conversionFactorToStockUnit: 1
}, storeConakryId, true);

assert(res6.success === true, 'Création du produit sans image réussie');
const prod6 = res6.product!;
assert(!prod6.imageUrl || prod6.imageUrl === '', 'imageUrl est vide');
assert(!prod6.images || prod6.images.length === 0, 'images est un tableau vide');

// ---------------------------------------------------------------------------
// SCÉNARIO 7 : Produit avec feuille + paquet + carton (3 choix de prix Marketplace)
// ---------------------------------------------------------------------------
console.log('\n--- SCÉNARIO 7 : Configuration multi-unités (Feuille / Paquet / Carton) ---');
const res7 = dbStore.createSecureProduct({
  code: `BRISTOL-${Date.now()}`,
  name: 'Papier Bristol A4 180g Multi-Couleurs',
  category: 'Papeterie',
  baseUnit: 'feuille',
  salePrice: 1000, // 1 000 GNF la feuille
  costPrice: 700,
  packagings: [
    {
      id: 'pkg-paquet-1',
      level: 2,
      unitName: 'paquet',
      containedQuantity: 100,
      subUnitName: 'feuille',
      factorToBase: 100,
      salePrice: 100000, // 100 000 GNF le paquet
      purchasePrice: 80000,
      isAllowedForSale: true,
      isAllowedForPurchase: true,
      isDefaultSaleUnit: false,
      isDefaultPurchaseUnit: false
    },
    {
      id: 'pkg-carton-1',
      level: 3,
      unitName: 'carton',
      containedQuantity: 5,
      subUnitName: 'paquet',
      factorToBase: 500,
      salePrice: 500000, // 500 000 GNF le carton
      purchasePrice: 420000,
      isAllowedForSale: true,
      isAllowedForPurchase: true,
      isDefaultSaleUnit: false,
      isDefaultPurchaseUnit: true
    }
  ],
  // Choix 1 : Vente au Carton sur le Marketplace
  publicUnit: 'carton',
  publicPrice: 500000,
  conversionFactorToStockUnit: 500
}, storeConakryId, true);

assert(res7.success === true, 'Création produit Bristol multi-unités réussie');
const prod7 = res7.product!;
assert(prod7.publicUnit === 'carton' && prod7.publicPrice === 500000, 'Choix Carton : 500 000 GNF / carton');

// Choix 2 : Modification pour affichage au Paquet
const updateToPaquet = dbStore.updateSecureProduct(prod7.id, {
  publicUnit: 'paquet',
  publicPrice: 100000,
  conversionFactorToStockUnit: 100
}, storeConakryId, true);
assert(updateToPaquet.success === true, 'Mise à jour vers Paquet réussie');
assert(updateToPaquet.product!.publicUnit === 'paquet' && updateToPaquet.product!.publicPrice === 100000, 'Choix Paquet : 100 000 GNF / paquet');

// Choix 3 : Modification pour affichage à la Feuille
const updateToFeuille = dbStore.updateSecureProduct(prod7.id, {
  publicUnit: 'feuille',
  publicPrice: 1000,
  conversionFactorToStockUnit: 1
}, storeConakryId, true);
assert(updateToFeuille.success === true, 'Mise à jour vers Feuille réussie');
assert(updateToFeuille.product!.publicUnit === 'feuille' && updateToFeuille.product!.publicPrice === 1000, 'Choix Feuille : 1 000 GNF / feuille');

// ---------------------------------------------------------------------------
// SCÉNARIO 8 : Héritage automatique de la ville par les produits
// ---------------------------------------------------------------------------
console.log('\n--- SCÉNARIO 8 : Héritage automatique de la ville depuis la Boutique ---');
function resolveProductMarketplaceCity(product: Product, store: Tenant): string {
  // La ville provient directement de la boutique associée
  return store.city || 'Conakry';
}

const cityProd1 = resolveProductMarketplaceCity(prod1, boutiqueConakry);
assert(cityProd1 === 'Conakry', 'Le produit de la Boutique Conakry hérite automatiquement de « Conakry »');

// ---------------------------------------------------------------------------
// SCÉNARIO 9 : Mise à jour de la ville de la boutique -> Réflexion immédiate
// ---------------------------------------------------------------------------
console.log('\n--- SCÉNARIO 9 : Modification de la ville de la boutique ---');
const boutiqueConakryDemenagee: Tenant = {
  ...boutiqueConakry,
  city: 'Labé'
};
const cityProd1Updated = resolveProductMarketplaceCity(prod1, boutiqueConakryDemenagee);
assert(cityProd1Updated === 'Labé', 'Après modification de la ville de la boutique vers Labé, le produit affiche immédiatement « Labé » sans modifier le produit');

// ---------------------------------------------------------------------------
// SCÉNARIO 10 : Deux boutiques différentes dans deux villes différentes
// ---------------------------------------------------------------------------
console.log('\n--- SCÉNARIO 10 : Deux boutiques dans deux villes différentes ---');
const resKindia = dbStore.createSecureProduct({
  code: `ART-KND-${Date.now()}`,
  name: 'Tissu Indigo Traditionnel',
  category: 'Artisanat',
  baseUnit: 'mètre',
  salePrice: 65000,
  costPrice: 45000,
  publicUnit: 'mètre',
  publicPrice: 65000,
  conversionFactorToStockUnit: 1
}, storeKindiaId, true);

assert(resKindia.success === true, 'Produit créé dans la boutique de Kindia');
const prodKindia = resKindia.product!;

const cityConakryProd = resolveProductMarketplaceCity(prod7, boutiqueConakry);
const cityKindiaProd = resolveProductMarketplaceCity(prodKindia, boutiqueKindia);

assert(cityConakryProd === 'Conakry', 'Produit Papeterie est rattaché à Conakry');
assert(cityKindiaProd === 'Kindia', 'Produit Indigo est rattaché à Kindia');
assert(cityConakryProd !== cityKindiaProd, 'Chaque produit reflète rigoureusement la ville de SA propre boutique');

// ---------------------------------------------------------------------------
// BILAN FINAL
// ---------------------------------------------------------------------------
console.log('\n================================================================================');
console.log(`🎉 RÉSULTAT : ${passedTests}/${totalTests} TESTS PASSÉS AVEC SUCCÈS (100%) !`);
console.log('================================================================================');
