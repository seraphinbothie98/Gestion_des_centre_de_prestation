import { dbStore } from '../server/db/mockStore';
import {
  getServiceOptions,
  getServiceConfigurations,
  findMatchingConfiguration,
  resolveServiceSpecsImpact,
  formatConfigOptionValues,
  formatCompactOptionValues
} from '../lib/serviceSpecs';
import { calculateOrderConsumablesRequirements } from '../lib/stockEngine';
import { Service, ServiceOption, ServiceConfiguration, OrderItem } from '../types';

console.log('================================================================');
console.log('TEST SUITE: CONFIGURATEUR STANDARD UNIFIÉ « SERVICES & TARIFS »');
console.log('================================================================\n');

let passedTests = 0;
let totalTests = 0;

function assert(condition: boolean, testName: string, details?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`✅ [PASS] ${testName}`);
    if (details) console.log(`   👉 ${details}`);
  } else {
    console.error(`❌ [FAIL] ${testName}`);
    if (details) console.error(`   👉 Details: ${details}`);
  }
}

const state = dbStore.getState();
const agencyId = 't-001';

// -------------------------------------------------------------
// TEST 1: Service Simple sans option (Aide à l'orientation)
// -------------------------------------------------------------
console.log('\n--- TEST 1: Service Simple sans option ---');
const srvOrientation = state.services.find(s => s.name.includes('orientation')) || {
  id: 'srv-test-simple',
  tenantId: agencyId,
  categoryId: 'sc-04',
  code: 'SRV-ORIENTATION',
  name: 'Aide à l\'orientation d\'un étudiant',
  unit: 'prestation',
  baseCost: 0,
  basePrice: 10000,
  requiresFile: false,
  estimatedDurationMinutes: 30,
  isActive: true,
  options: [],
  configurations: [
    {
      id: 'cfg-test-simple-1',
      serviceId: 'srv-test-simple',
      optionValues: {},
      price: 10000,
      billingUnit: 'prestation',
      consumables: [],
      isActive: true
    }
  ],
  pricingRules: []
};

const optionsSimple = getServiceOptions(srvOrientation);
const configsSimple = getServiceConfigurations(srvOrientation);
assert(optionsSimple.length === 0, 'Service simple a 0 options');
assert(configsSimple.length === 1, 'Service simple a 1 configuration standard', `Tarif: ${configsSimple[0]?.price} GNF / ${configsSimple[0]?.billingUnit}`);

const impactSimple = resolveServiceSpecsImpact(srvOrientation, {});
assert(impactSimple.standardUnitPrice === 10000 && impactSimple.billingUnit === 'prestation', 'Résolution tarifaire correcte pour service simple');
assert(impactSimple.consumables.length === 0, 'Aucune consommation stock pour service simple');

// -------------------------------------------------------------
// TEST 2: Service Multi-Options (Photocopie)
// -------------------------------------------------------------
console.log('\n--- TEST 2: Service Multi-Options (Photocopie) ---');
const srvPhoto = state.services.find(s => s.id === 'srv-01' || s.name === 'Photocopie')!;
assert(!!srvPhoto, 'Service Photocopie trouvé dans la base');

const photoOptions = getServiceOptions(srvPhoto);
assert(photoOptions.length === 4, 'Photocopie possède 4 options dynamiques (Format, Mode, Type, Papier)');
const optionNames = photoOptions.map(o => o.name);
assert(
  optionNames.includes('Format') && optionNames.includes('Mode') && optionNames.includes('Type d\'impression') && optionNames.includes('Papier'),
  'Options exactes trouvées: Format, Mode, Type d\'impression, Papier'
);

// -------------------------------------------------------------
// TEST 3: Résolution de configurations multiples avec tarifs distincts
// -------------------------------------------------------------
console.log('\n--- TEST 3: Résolution des combinaisons de configurations ---');
// Config 1: A4, Noir & blanc, Recto, Standard -> 500 GNF
const impact1 = resolveServiceSpecsImpact(srvPhoto, {
  'Format': 'A4',
  'Mode': 'Noir & blanc',
  'Type d\'impression': 'Recto',
  'Papier': 'Standard'
}, state.products);
assert(impact1.standardUnitPrice === 500 && impact1.billingUnit === 'page', 'Config A4 N&B Recto = 500 GNF/page');
assert(impact1.consumables.length === 1 && impact1.consumables[0].quantityPerUnit === 1, 'Consomme 1 feuille de Papier A4');

// Config 2: A4, Noir & blanc, Recto-verso, Standard -> 700 GNF
const impact2 = resolveServiceSpecsImpact(srvPhoto, {
  'Format': 'A4',
  'Mode': 'Noir & blanc',
  'Type d\'impression': 'Recto-verso',
  'Papier': 'Standard'
}, state.products);
assert(impact2.standardUnitPrice === 700, 'Config A4 N&B Recto-verso = 700 GNF/page');

// Config 3: A4, Couleur, Recto, Standard -> 1000 GNF
const impact3 = resolveServiceSpecsImpact(srvPhoto, {
  'Format': 'A4',
  'Mode': 'Couleur',
  'Type d\'impression': 'Recto',
  'Papier': 'Standard'
}, state.products);
assert(impact3.standardUnitPrice === 1000, 'Config A4 Couleur Recto = 1000 GNF/page');

// Config 4: A3, Noir & blanc, Recto, Standard -> 1000 GNF & 2 feuilles
const impact4 = resolveServiceSpecsImpact(srvPhoto, {
  'Format': 'A3',
  'Mode': 'Noir & blanc',
  'Type d\'impression': 'Recto',
  'Papier': 'Standard'
}, state.products);
assert(impact4.standardUnitPrice === 1000 && impact4.consumables[0].quantityPerUnit === 2, 'Config A3 N&B = 1000 GNF et consomme 2 feuilles');

// -------------------------------------------------------------
// TEST 4: Service avec Multi-Consommables (Reliure)
// -------------------------------------------------------------
console.log('\n--- TEST 4: Service Multi-Consommables (Reliure) ---');
const srvReliure = state.services.find(s => s.id === 'srv-03' || s.name === 'Reliure')!;
assert(!!srvReliure, 'Service Reliure trouvé dans la base');

const impactReliure = resolveServiceSpecsImpact(srvReliure, {
  'Format': 'A4',
  'Type': 'Spirale',
  'Couverture': 'Transparente'
}, state.products);
assert(impactReliure.standardUnitPrice === 15000, 'Reliure A4 Spirale Transparente = 15000 GNF / document');
assert(impactReliure.consumables.length >= 2, 'Plusieurs consommables déduits (Spirales + Plats PVC)');

// -------------------------------------------------------------
// TEST 5: Séparation Unité de Facturation vs Unité de Consommation Stock
// -------------------------------------------------------------
console.log('\n--- TEST 5: Unité de Facturation ≠ Unité de Consommation Stock ---');
assert(impact1.billingUnit === 'page', 'Unité de facturation = page');
assert(impact1.consumables[0].unit === 'feuille', 'Unité de consommation stock = feuille');
assert(impactReliure.billingUnit === 'document', 'Unité de facturation Reliure = document');

// -------------------------------------------------------------
// TEST 6: Ajout dynamique d'option et de valeur sans modification du code
// -------------------------------------------------------------
console.log('\n--- TEST 6: Ajout dynamique d\'une option personnalisée ---');
const dynamicService: Service = {
  id: 'srv-dynamic-test',
  tenantId: agencyId,
  categoryId: 'sc-01',
  code: 'SRV-CUSTOM',
  name: 'Service Personnalisé',
  unit: 'exemplaire',
  baseCost: 100,
  basePrice: 5000,
  requiresFile: false,
  estimatedDurationMinutes: 10,
  isActive: true,
  options: [
    { id: 'opt-1', name: 'Qualité', values: ['Standard', 'Haute qualité', 'Premium'] },
    { id: 'opt-2', name: 'Finition', values: ['Brillante', 'Mate', 'Vernis 3D'] }
  ],
  configurations: [
    {
      id: 'cfg-dyn-1',
      serviceId: 'srv-dynamic-test',
      optionValues: { 'Qualité': 'Premium', 'Finition': 'Vernis 3D' },
      price: 15000,
      billingUnit: 'exemplaire',
      consumables: [],
      isActive: true
    }
  ],
  pricingRules: []
};

const dynMatch = findMatchingConfiguration(dynamicService, {
  'Qualité': 'Premium',
  'Finition': 'Vernis 3D'
});
assert(!!dynMatch, 'Correspondance exacte trouvée pour option dynamique sans code en dur');
assert(dynMatch?.price === 15000, 'Tarif dynamique appliqué : 15 000 GNF');

// -------------------------------------------------------------
// TEST 7: Désactivation d'une configuration (Masquage sans suppression)
// -------------------------------------------------------------
console.log('\n--- TEST 7: Configuration Désactivée / Inactive ---');
const inactiveConfig: ServiceConfiguration = {
  id: 'cfg-dyn-inactive',
  serviceId: 'srv-dynamic-test',
  optionValues: { 'Qualité': 'Standard', 'Finition': 'Vernis 3D' },
  price: 8000,
  billingUnit: 'exemplaire',
  consumables: [],
  isActive: false // INACTIF
};
dynamicService.configurations.push(inactiveConfig);

const inactiveImpact = resolveServiceSpecsImpact(dynamicService, {
  'Qualité': 'Standard',
  'Finition': 'Vernis 3D'
});
assert(inactiveImpact.isConfigActive === false, 'Configuration inactive correctement identifiée comme non active');

// -------------------------------------------------------------
// TEST 8: Déduction de stock via calculateOrderConsumablesRequirements
// -------------------------------------------------------------
console.log('\n--- TEST 8: Moteur de déduction de stock des consommables ---');
const orderItem: OrderItem = {
  id: 'item-test-1',
  serviceId: srvPhoto.id,
  serviceName: srvPhoto.name,
  quantity: 20, // 20 photocopies A4
  unitPrice: 500,
  totalPrice: 10000,
  notes: 'Format: A4 | Mode: Noir & blanc | Type d\'impression: Recto | Papier: Standard',
  status: 'COMPLETED'
};

const consumablesReqs = calculateOrderConsumablesRequirements([orderItem], [srvPhoto], state.products);
assert(consumablesReqs.length === 1, '1 consommable requis calculé pour l\'item');
assert(consumablesReqs[0]?.quantityRequired === 20, '20 feuilles A4 requises pour 20 photocopies A4 recto', `Quantité requise: ${consumablesReqs[0]?.quantityRequired}`);

// -------------------------------------------------------------
// BILAN FINAL
// -------------------------------------------------------------
console.log('\n================================================================');
console.log(`RÉSULTAT DU TEST : ${passedTests}/${totalTests} TESTS VALIDÉS AVEC SUCCÈS`);
console.log('================================================================\n');

if (passedTests === totalTests) {
  console.log('🎉 TOUS LES TESTS SONT PASSÉS ! LE CONFIGURATEUR STANDARD FONCTIONNE PARFAITEMENT.');
} else {
  throw new Error(`Échec de validation : ${totalTests - passedTests} tests ont échoué.`);
}
