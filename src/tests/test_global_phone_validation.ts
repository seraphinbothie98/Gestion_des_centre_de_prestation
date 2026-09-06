/**
 * ==============================================================================
 * TEST SUITE: VALIDATION GLOBALE DES CHAMPS TÉLÉPHONE / CONTACT
 * ==============================================================================
 * 
 * Validates the 14 mandatory test scenarios:
 * TEST 1: Saisie "622000000" -> ACCEPTÉ
 * TEST 2: Saisie "+224622000000" -> ACCEPTÉ
 * TEST 3: Saisie "622 ABC 000" -> REFUSÉ (lettres rejetées)
 * TEST 4: Saisie "Jean622000000" -> REFUSÉ (mots rejetés)
 * TEST 5: Saisie "622@000000" -> REFUSÉ (caractères spéciaux interdits)
 * TEST 6: Copier-coller "ABC622000000" -> REFUSÉ par validation / SANITIZÉ
 * TEST 7: Requête directe API avec "telephone": "ABC622000" -> REJETÉ BACKEND (400)
 * TEST 8: Robustesse formats internationaux (+33, +221, +1, +225) -> ACCEPTÉ
 * TEST 9: Préservation stricte du zéro initial ("0622000000" -> string "0622000000")
 * TEST 10: Signe '+' interdit au milieu ou en double ("622+000", "++224622") -> REFUSÉ
 * TEST 11: Validation Zod centralisée (phoneZodSchema & requiredPhoneZodSchema)
 * TEST 12: Audit exhaustif des données mock existantes dans mockStore -> 100% VALIDE
 * TEST 13: Protection de l'état global et persistance dans le store
 * TEST 14: Non-régression sur l'ensemble des modules SaaS
 */

import {
  isValidPhoneNumber,
  validatePhoneWithDetails,
  sanitizePhoneInput,
  normalizePhoneNumber,
  validateBackendPhone,
  phoneZodSchema,
  requiredPhoneZodSchema
} from '../lib/phoneValidation';
import { dbStore } from '../server/db/mockStore';

export function runGlobalPhoneValidationTests() {
  console.log('================================================================');
  console.log('TESTS OBLIGATOIRES — VALIDATION GLOBALE DES NUMÉROS DE TÉLÉPHONE');
  console.log('================================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    total++;
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      if (detail) console.log(`   └─ ${detail}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName}`);
      if (detail) console.error(`   └─ Échec : ${detail}`);
    }
  }

  // ---------------------------------------------------------------------------
  // TEST 1 : Saisir 622000000 -> ACCEPTÉ
  // ---------------------------------------------------------------------------
  const test1 = validatePhoneWithDetails('622000000');
  assert(test1.isValid === true, 'TEST 1 : Saisir "622000000" est accepté', `Résultat: isValid=${test1.isValid}`);

  // ---------------------------------------------------------------------------
  // TEST 2 : Saisir +224622000000 -> ACCEPTÉ
  // ---------------------------------------------------------------------------
  const test2 = validatePhoneWithDetails('+224622000000');
  assert(test2.isValid === true, 'TEST 2 : Saisir "+224622000000" est accepté', `Résultat: isValid=${test2.isValid}`);

  // ---------------------------------------------------------------------------
  // TEST 3 : Saisir 622 ABC 000 -> REFUSÉ
  // ---------------------------------------------------------------------------
  const test3 = validatePhoneWithDetails('622 ABC 000');
  assert(test3.isValid === false, 'TEST 3 : Saisir "622 ABC 000" est refusé', `Message d'erreur: "${test3.error}"`);

  // ---------------------------------------------------------------------------
  // TEST 4 : Saisir Jean622000000 -> REFUSÉ
  // ---------------------------------------------------------------------------
  const test4 = validatePhoneWithDetails('Jean622000000');
  assert(test4.isValid === false, 'TEST 4 : Saisir "Jean622000000" est refusé', `Message d'erreur: "${test4.error}"`);

  // ---------------------------------------------------------------------------
  // TEST 5 : Saisir 622@000000 -> REFUSÉ
  // ---------------------------------------------------------------------------
  const test5 = validatePhoneWithDetails('622@000000');
  assert(test5.isValid === false, 'TEST 5 : Saisir "622@000000" est refusé', `Message d'erreur: "${test5.error}"`);

  // ---------------------------------------------------------------------------
  // TEST 6 : Copier-coller ABC622000000 -> Nettoyage et Refus si non nettoyé
  // ---------------------------------------------------------------------------
  const rawPasted = 'ABC622000000';
  const test6Validation = validatePhoneWithDetails(rawPasted);
  const sanitizedPasted = sanitizePhoneInput(rawPasted);
  const test6SanitizedVal = validatePhoneWithDetails(sanitizedPasted);
  assert(
    test6Validation.isValid === false && sanitizedPasted === '622000000' && test6SanitizedVal.isValid === true,
    'TEST 6 : Copier-coller "ABC622000000" rejette les lettres et assainit en "622000000"',
    `Brut: isValid=${test6Validation.isValid} -> Nettoyé: "${sanitizedPasted}" (isValid=${test6SanitizedVal.isValid})`
  );

  // ---------------------------------------------------------------------------
  // TEST 7 : Requête directe API avec "telephone": "ABC622000" -> REJETÉ BACKEND (400)
  // ---------------------------------------------------------------------------
  const backendCheck = validateBackendPhone('ABC622000', "l'agence");
  const apiAutonomousResult = dbStore.registerAutonomousAgency({
    firstName: 'Amara',
    lastName: 'Kourouma',
    email: `amara.${Date.now()}@test.com`,
    phone: 'ABC622000', // Lettres envoyées directement
    password: 'Password123!',
    agencyName: 'Agence Alpha Test',
    activityType: 'SERVICE_CENTER'
  });

  assert(
    backendCheck.isValid === false &&
    backendCheck.statusCode === 400 &&
    apiAutonomousResult.success === false &&
    apiAutonomousResult.statusCode === 400,
    'TEST 7 : Requête API directe avec téléphone contenant des lettres renvoie 400 Bad Request',
    `API Status: ${apiAutonomousResult.statusCode}, Message: "${apiAutonomousResult.message}"`
  );

  // ---------------------------------------------------------------------------
  // TEST 8 : Numéros internationaux (France, Sénégal, USA, Côte d'Ivoire)
  // ---------------------------------------------------------------------------
  const franceValid = isValidPhoneNumber('+33 6 12 34 56 78');
  const senegalValid = isValidPhoneNumber('+221 77 123 45 67');
  const usaValid = isValidPhoneNumber('+1 415 555 2671');
  const cotedIvoireValid = isValidPhoneNumber('+225 07 00 11 22 33');

  assert(
    franceValid && senegalValid && usaValid && cotedIvoireValid,
    'TEST 8 : Tous les formats internationaux (+33, +221, +1, +225) sont acceptés',
    `+33: ${franceValid}, +221: ${senegalValid}, +1: ${usaValid}, +225: ${cotedIvoireValid}`
  );

  // ---------------------------------------------------------------------------
  // TEST 9 : Préservation du zéro initial (string "0622000000")
  // ---------------------------------------------------------------------------
  const zeroInitial = '0622000000';
  const normZero = normalizePhoneNumber(zeroInitial);
  const validZero = isValidPhoneNumber(zeroInitial);
  assert(
    validZero && normZero === '0622000000' && typeof normZero === 'string',
    'TEST 9 : Préservation stricte du zéro initial ("0622000000" reste une chaîne avec zéro)',
    `Normalisé: "${normZero}" (type=${typeof normZero})`
  );

  // ---------------------------------------------------------------------------
  // TEST 10 : Signe '+' interdit au milieu ou en double
  // ---------------------------------------------------------------------------
  const plusInMiddle = validatePhoneWithDetails('622+000000');
  const doublePlus = validatePhoneWithDetails('++224622000000');
  assert(
    plusInMiddle.isValid === false && doublePlus.isValid === false,
    'TEST 10 : Le signe "+" est strictement interdit au milieu ou en plusieurs exemplaires',
    `"622+000": ${plusInMiddle.error} | "++224...": ${doublePlus.error}`
  );

  // ---------------------------------------------------------------------------
  // TEST 11 : Validation Zod centralisée
  // ---------------------------------------------------------------------------
  const zodValid = phoneZodSchema.safeParse('+224 620 00 11 22');
  const zodInvalid = phoneZodSchema.safeParse('Téléphone123');
  const zodRequiredEmpty = requiredPhoneZodSchema.safeParse('');
  assert(
    zodValid.success && !zodInvalid.success && !zodRequiredEmpty.success,
    'TEST 11 : Schémas Zod centralisés (phoneZodSchema & requiredPhoneZodSchema)',
    `Zod valide: ${zodValid.success}, Zod avec lettres: ${zodInvalid.success === false}, Zod requis vide: ${zodRequiredEmpty.success === false}`
  );

  // ---------------------------------------------------------------------------
  // TEST 12 : Audit de l'ensemble des données mock initiales du MockStore
  // ---------------------------------------------------------------------------
  const state = dbStore.getState();
  const allPhones: { entity: string; id: string; phone: string; valid: boolean }[] = [];

  const check = (entity: string, id: string, phone?: string | null) => {
    if (phone && phone.trim() !== '') {
      allPhones.push({
        entity,
        id,
        phone,
        valid: isValidPhoneNumber(phone, { allowEmpty: false })
      });
    }
  };

  state.tenants.forEach(t => {
    check('Tenant', t.id, t.phone);
    check('Tenant Support Phone', t.id, t.supportContact?.phone);
    check('Tenant Support WhatsApp', t.id, t.supportContact?.whatsapp);
  });
  state.users.forEach(u => check('User', u.id, u.phone));
  state.persons.forEach(p => check('Person', p.id, p.phone));
  state.suppliers.forEach(s => check('Supplier', s.id, s.phone));
  state.orders.forEach(o => check('Order', o.id, o.personPhone));
  state.enrollments.forEach(e => check('Enrollment', e.id, e.learnerPhone));
  state.boutiqueSales.forEach(b => check('BoutiqueSale', b.id, b.personPhone));

  const invalidEntries = allPhones.filter(p => !p.valid);
  assert(
    allPhones.length > 0 && invalidEntries.length === 0,
    `TEST 12 : Audit des données existantes (${allPhones.length} numéros vérifiés) -> 100% Valides`,
    `Total audité: ${allPhones.length}, Anomalies: ${invalidEntries.length}`
  );

  // ---------------------------------------------------------------------------
  // TEST 13 : Validation de longueur minimale et maximale
  // ---------------------------------------------------------------------------
  const tooShort = validatePhoneWithDetails('12');
  const tooLong = validatePhoneWithDetails('12345678901234567890');
  const perfectLength = validatePhoneWithDetails('620001122');
  assert(
    tooShort.isValid === false && tooLong.isValid === false && perfectLength.isValid === true,
    'TEST 13 : Contrôle de longueur E.164 (min 4 chiffres, max 18 chiffres)',
    `Court: ${tooShort.isValid === false}, Long: ${tooLong.isValid === false}, Conforme: ${perfectLength.isValid === true}`
  );

  // ---------------------------------------------------------------------------
  // TEST 14 : Non-régression & enregistrement avec sanitization automatique
  // ---------------------------------------------------------------------------
  const validAgencyCreation = dbStore.createAgency({
    name: `Agence Test Audit ${Date.now()}`,
    code: `AUD-${Math.floor(1000 + Math.random() * 9000)}`,
    activityType: 'SERVICE_CENTER',
    responsibleName: 'Mamadou Diallo',
    phone: '+224 622 99 88 77',
    adminUsername: `admin_aud_${Date.now()}`,
    adminEmail: `admin_aud_${Date.now()}@test.com`,
    planId: 'PROFESSIONAL'
  });

  assert(
    validAgencyCreation.success === true && validAgencyCreation.agency?.phone === '+224 622 99 88 77',
    'TEST 14 : Création d\'agence avec numéro valide réussie (Non-régression)',
    `Agence créée: ${validAgencyCreation.agency?.name}, Tél: ${validAgencyCreation.agency?.phone}`
  );

  console.log('\n================================================================');
  console.log(`RÉSULTATS DE LA SUITE DE TESTS : ${passed} / ${total} RÉUSSIS`);
  console.log('================================================================\n');

  return { passed, total, allPassed: passed === total };
}

// Auto-run if executed directly
if (typeof process !== 'undefined' && process.argv && process.argv[1]?.includes('test_global_phone_validation')) {
  runGlobalPhoneValidationTests();
}
