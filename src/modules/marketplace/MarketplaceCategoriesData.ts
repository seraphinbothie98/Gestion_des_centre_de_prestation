// ==============================================================================
// GLOBAL MARKETPLACE CATEGORIES - GUINÉE BOUTIQUES
// Extensible and Dynamic Catalog (21 Initial Categories)
// ==============================================================================

export interface GlobalMarketplaceCategory {
  id: string;
  code: string;
  name: string;
  icon: string; // Emoji or Lucide icon identifier
  description: string;
  color: 'red' | 'yellow' | 'green' | 'blue' | 'purple' | 'amber';
  badgeColorClass: string;
  borderColorClass: string;
  textColorClass: string;
  bgGradientClass: string;
  popularItemCount?: string;
  subcategories: string[];
  isActive: boolean;
  sortOrder: number;
}

export const GLOBAL_MARKETPLACE_CATEGORIES: GlobalMarketplaceCategory[] = [
  {
    id: 'cat-vetements',
    code: 'VETEMENTS',
    name: 'Vêtements & habillement',
    icon: '👔',
    description: 'Robes, boubous traditionnels, chemises, pantalons, t-shirts, ensembles',
    color: 'red',
    badgeColorClass: 'bg-red-500/15 text-red-400 border-red-500/30',
    borderColorClass: 'border-red-500/30 hover:border-red-500',
    textColorClass: 'text-red-400',
    bgGradientClass: 'from-red-950/40 to-slate-900',
    popularItemCount: '450+ articles',
    subcategories: ['Boubous & Tissus traditionnels', 'Costumes & Chemises', 'Robes & Ensembles', 'Pantalons & Jeans', 'T-shirts & Polos'],
    isActive: true,
    sortOrder: 1
  },
  {
    id: 'cat-chaussures',
    code: 'CHAUSSURES',
    name: 'Chaussures & accessoires',
    icon: '👟',
    description: 'Sneakers, sandales, mocassins, sacs à main, ceintures, casquettes',
    color: 'yellow',
    badgeColorClass: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
    borderColorClass: 'border-yellow-500/30 hover:border-yellow-400',
    textColorClass: 'text-yellow-400',
    bgGradientClass: 'from-yellow-950/40 to-slate-900',
    popularItemCount: '320+ articles',
    subcategories: ['Chaussures homme', 'Chaussures femme', 'Sandales & Babouches', 'Sacs & Valises', 'Casquettes & Chapeaux', 'Ceintures & Portefeuilles'],
    isActive: true,
    sortOrder: 2
  },
  {
    id: 'cat-telephones',
    code: 'TELEPHONES',
    name: 'Téléphones & télécommunications',
    icon: '📱',
    description: 'Smartphones, téléphones basiques, routeurs 4G/5G, écouteurs, accessoires',
    color: 'green',
    badgeColorClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    borderColorClass: 'border-emerald-500/30 hover:border-emerald-400',
    textColorClass: 'text-emerald-400',
    bgGradientClass: 'from-emerald-950/40 to-slate-900',
    popularItemCount: '580+ articles',
    subcategories: ['Smartphones Android & iOS', 'Téléphones simples (touches)', 'AirPods & Écouteurs', 'Chargeurs & Powerbanks', 'Routeurs & Modems 4G', 'Cartes SIM & Recharges'],
    isActive: true,
    sortOrder: 3
  },
  {
    id: 'cat-informatique',
    code: 'INFORMATIQUE',
    name: 'Informatique & électronique',
    icon: '💻',
    description: 'Ordinateurs portables, PC de bureau, imprimantes, disques durs, composants',
    color: 'red',
    badgeColorClass: 'bg-red-500/15 text-red-400 border-red-500/30',
    borderColorClass: 'border-red-500/30 hover:border-red-500',
    textColorClass: 'text-red-400',
    bgGradientClass: 'from-red-950/40 to-slate-900',
    popularItemCount: '290+ articles',
    subcategories: ['PC Portables (Laptops)', 'Unités centrales & Écrans', 'Imprimantes & Scanners', 'Disques SSD & Clés USB', 'Claviers, Souris & Accessoires'],
    isActive: true,
    sortOrder: 4
  },
  {
    id: 'cat-electromenager',
    code: 'ELECTROMENAGER',
    name: 'Électroménager',
    icon: '🧊',
    description: 'Réfrigérateurs, congélateurs, micro-ondes, climatiseurs, ventilateurs',
    color: 'yellow',
    badgeColorClass: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
    borderColorClass: 'border-yellow-500/30 hover:border-yellow-400',
    textColorClass: 'text-yellow-400',
    bgGradientClass: 'from-yellow-950/40 to-slate-900',
    popularItemCount: '195+ articles',
    subcategories: ['Réfrigérateurs & Congélateurs', 'Climatiseurs & Brasseurs', 'Cuisinières & Fours', 'Fers à repasser & Mixeurs', 'Machines à laver'],
    isActive: true,
    sortOrder: 5
  },
  {
    id: 'cat-maison',
    code: 'MAISON',
    name: 'Maison & meubles',
    icon: '🛋️',
    description: 'Salons complets, lits, matelas, armoires, tables à manger, rideaux & déco',
    color: 'green',
    badgeColorClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    borderColorClass: 'border-emerald-500/30 hover:border-emerald-400',
    textColorClass: 'text-emerald-400',
    bgGradientClass: 'from-emerald-950/40 to-slate-900',
    popularItemCount: '210+ articles',
    subcategories: ['Salons & Fauteuils', 'Lits & Matelas orthopédiques', 'Armoires & Dressings', 'Tables & Chaises', 'Rideaux & Tapis'],
    isActive: true,
    sortOrder: 6
  },
  {
    id: 'cat-alimentation',
    code: 'ALIMENTATION',
    name: 'Alimentation & épicerie',
    icon: '🍚',
    description: 'Riz local & importé, huile de palme, arachides, épices, produits vivriers',
    color: 'yellow',
    badgeColorClass: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
    borderColorClass: 'border-yellow-500/30 hover:border-yellow-400',
    textColorClass: 'text-yellow-400',
    bgGradientClass: 'from-yellow-950/40 to-slate-900',
    popularItemCount: '340+ articles',
    subcategories: ['Riz de Guinée (Bara Bara) & Importé', 'Huile rouge (Palme) & végétale', 'Condiments & Épices', 'Lait & Boissons', 'Farine & Sucre'],
    isActive: true,
    sortOrder: 7
  },
  {
    id: 'cat-agriculture',
    code: 'AGRICULTURE',
    name: 'Agriculture & élevage',
    icon: '🌱',
    description: 'Semences maraîchères, engrais, matériel d’irrigation, aliments bétail',
    color: 'green',
    badgeColorClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    borderColorClass: 'border-emerald-500/30 hover:border-emerald-400',
    textColorClass: 'text-emerald-400',
    bgGradientClass: 'from-emerald-950/40 to-slate-900',
    popularItemCount: '150+ articles',
    subcategories: ['Semences certifiées', 'Engrais & Fertilisants', 'Pompes solaires & Tuyaux', 'Aliments volailles & bétail', 'Outils agricoles'],
    isActive: true,
    sortOrder: 8
  },
  {
    id: 'cat-materiaux',
    code: 'MATERIAUX',
    name: 'Matériaux de construction',
    icon: '🏗️',
    description: 'Ciment, fer à béton, tôles, carreaux, peinture, plomberie et électricité BTP',
    color: 'red',
    badgeColorClass: 'bg-red-500/15 text-red-400 border-red-500/30',
    borderColorClass: 'border-red-500/30 hover:border-red-500',
    textColorClass: 'text-red-400',
    bgGradientClass: 'from-red-950/40 to-slate-900',
    popularItemCount: '480+ articles',
    subcategories: ['Ciment CPJ 35 / 42.5', 'Fers à béton & Treillis', 'Tôles bac & Ondulées', 'Carrelage & Sanitaires', 'Peintures & Enduits'],
    isActive: true,
    sortOrder: 9
  },
  {
    id: 'cat-automobile',
    code: 'AUTOMOBILE',
    name: 'Automobile',
    icon: '🚗',
    description: 'Véhicules neufs & occasion, pièces détachées, huiles moteur, pneus',
    color: 'red',
    badgeColorClass: 'bg-red-500/15 text-red-400 border-red-500/30',
    borderColorClass: 'border-red-500/30 hover:border-red-500',
    textColorClass: 'text-red-400',
    bgGradientClass: 'from-red-950/40 to-slate-900',
    popularItemCount: '120+ articles',
    subcategories: ['Voitures & SUV', 'Pneus & Jantes', 'Huiles moteur & Filtres', 'Batteries auto', 'Accessoires & Sonorisation'],
    isActive: true,
    sortOrder: 10
  },
  {
    id: 'cat-motos',
    code: 'MOTOS',
    name: 'Motos & accessoires',
    icon: '🛵',
    description: 'Motos TVS, Haojue, tricycles, casques homologués, pièces de rechange',
    color: 'yellow',
    badgeColorClass: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
    borderColorClass: 'border-yellow-500/30 hover:border-yellow-400',
    textColorClass: 'text-yellow-400',
    bgGradientClass: 'from-yellow-950/40 to-slate-900',
    popularItemCount: '180+ articles',
    subcategories: ['Motos TVS Star & HLX', 'Motos Haojue & KTM', 'Tricycles utilitaires (Kavaki)', 'Casques & Gilets de sécurité', 'Pièces moteur moto'],
    isActive: true,
    sortOrder: 11
  },
  {
    id: 'cat-beaute',
    code: 'BEAUTE',
    name: 'Beauté & soins',
    icon: '✨',
    description: 'Cosmétiques, mèches, perruques, crèmes corporelles, parfums, maquillage',
    color: 'yellow',
    badgeColorClass: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
    borderColorClass: 'border-yellow-500/30 hover:border-yellow-400',
    textColorClass: 'text-yellow-400',
    bgGradientClass: 'from-yellow-950/40 to-slate-900',
    popularItemCount: '390+ articles',
    subcategories: ['Perruques & Mèches naturelles', 'Crèmes & Laits corporels', 'Parfums de luxe & Déodorants', 'Maquillage & Vernis', 'Soins barbe & cheveux'],
    isActive: true,
    sortOrder: 12
  },
  {
    id: 'cat-sante',
    code: 'SANTE',
    name: 'Santé',
    icon: '💊',
    description: 'Compléments alimentaires, tensiomètres, thermomètres, hygiène médicale',
    color: 'green',
    badgeColorClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    borderColorClass: 'border-emerald-500/30 hover:border-emerald-400',
    textColorClass: 'text-emerald-400',
    bgGradientClass: 'from-emerald-950/40 to-slate-900',
    popularItemCount: '110+ articles',
    subcategories: ['Tensiomètres & Glucomètres', 'Compléments & Vitamines', 'Masques & Gants médicaux', 'Fauteuils & Béquilles', 'Hygiène & Savons antiseptiques'],
    isActive: true,
    sortOrder: 13
  },
  {
    id: 'cat-bebe',
    code: 'BEBE',
    name: 'Bébé & enfants',
    icon: '👶',
    description: 'Vêtements enfants, couches, biberons, poussettes, jouets éducatifs',
    color: 'yellow',
    badgeColorClass: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
    borderColorClass: 'border-yellow-500/30 hover:border-yellow-400',
    textColorClass: 'text-yellow-400',
    bgGradientClass: 'from-yellow-950/40 to-slate-900',
    popularItemCount: '220+ articles',
    subcategories: ['Couches & Lingettes', 'Vêtements bébé & enfant', 'Poussettes & Sièges auto', 'Biberons & Chauffe-biberons', 'Jouets d’éveil'],
    isActive: true,
    sortOrder: 14
  },
  {
    id: 'cat-papeterie',
    code: 'PAPETERIE',
    name: 'Papeterie & fournitures',
    icon: '📝',
    description: 'Papier Bristol, ramettes A4/A3, cahiers, registres, stylos, fournitures scolaires et de bureau',
    color: 'green',
    badgeColorClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    borderColorClass: 'border-emerald-500/30 hover:border-emerald-400',
    textColorClass: 'text-emerald-400',
    bgGradientClass: 'from-emerald-950/40 to-slate-900',
    popularItemCount: '380+ articles',
    subcategories: ['Papier Bristol & Cartonné', 'Ramettes papier A4 / A3', 'Cahiers & Registres', 'Stylos, Crayons & Marqueurs', 'Classeurs & Chemises'],
    isActive: true,
    sortOrder: 15
  },
  {
    id: 'cat-bureautique',
    code: 'BUREAUTIQUE',
    name: 'Bureautique & consommables',
    icon: '📚',
    description: 'Cartons de ramettes A4, stylos, classeurs, spirales, toners & cartouches',
    color: 'green',
    badgeColorClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    borderColorClass: 'border-emerald-500/30 hover:border-emerald-400',
    textColorClass: 'text-emerald-400',
    bgGradientClass: 'from-emerald-950/40 to-slate-900',
    popularItemCount: '410+ articles',
    subcategories: ['Ramettes papier A4 / A3', 'Cartouches & Toners', 'Cahiers & Registres', 'Spirales & Baguettes de reliure', 'Stylos & Marqueurs'],
    isActive: true,
    sortOrder: 16
  },
  {
    id: 'cat-machines',
    code: 'MACHINES',
    name: 'Machines & équipements professionnels',
    icon: '⚙️',
    description: 'Groupes électrogènes, compresseurs, machines à coudre industrielles, tours',
    color: 'red',
    badgeColorClass: 'bg-red-500/15 text-red-400 border-red-500/30',
    borderColorClass: 'border-red-500/30 hover:border-red-500',
    textColorClass: 'text-red-400',
    bgGradientClass: 'from-red-950/40 to-slate-900',
    popularItemCount: '95+ articles',
    subcategories: ['Groupes électrogènes diesel/essence', 'Machines à coudre professionnelles', 'Compresseurs d’air', 'Bétonnières & Vibreurs', 'Postes à souder'],
    isActive: true,
    sortOrder: 16
  },
  {
    id: 'cat-electricite',
    code: 'ELECTRICITE',
    name: 'Électricité & énergie',
    icon: '⚡',
    description: 'Panneaux solaires, batteries gel/lithium, onduleurs, câbles électriques',
    color: 'yellow',
    badgeColorClass: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
    borderColorClass: 'border-yellow-500/30 hover:border-yellow-400',
    textColorClass: 'text-yellow-400',
    bgGradientClass: 'from-yellow-950/40 to-slate-900',
    popularItemCount: '310+ articles',
    subcategories: ['Panneaux Solaires Monocristallins', 'Batteries Solaires Gel & Lithium', 'Onduleurs hybrides', 'Câbles & Disjoncteurs', 'Projecteurs LED solaires'],
    isActive: true,
    sortOrder: 17
  },
  {
    id: 'cat-sports',
    code: 'SPORTS',
    name: 'Sports & loisirs',
    icon: '⚽',
    description: 'Maillots du Syli National, ballons, survêtements, vélos, équipements fitness',
    color: 'green',
    badgeColorClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    borderColorClass: 'border-emerald-500/30 hover:border-emerald-400',
    textColorClass: 'text-emerald-400',
    bgGradientClass: 'from-emerald-950/40 to-slate-900',
    popularItemCount: '160+ articles',
    subcategories: ['Maillots Guinée & Clubs', 'Ballons de football & basket', 'Chaussures de sport (Crampons)', 'Tapis & Haltères fitness', 'Vélos VTT'],
    isActive: true,
    sortOrder: 18
  },
  {
    id: 'cat-gros',
    code: 'GROS',
    name: 'Commerce de gros',
    icon: '📦',
    description: 'Vente par conteneurs, cartons, palettes, remises dégressives pour revendeurs',
    color: 'red',
    badgeColorClass: 'bg-red-500/15 text-red-400 border-red-500/30',
    borderColorClass: 'border-red-500/30 hover:border-red-500',
    textColorClass: 'text-red-400',
    bgGradientClass: 'from-red-950/40 to-slate-900',
    popularItemCount: '270+ lots',
    subcategories: ['Conteneurs & Palettes', 'Lots Vêtements & Friperie', 'Lots Téléphonie de gros', 'Alimentation par tonnes', 'BTP & Quincaillerie de gros'],
    isActive: true,
    sortOrder: 19
  },
  {
    id: 'cat-services',
    code: 'SERVICES',
    name: 'Services & prestations',
    icon: '🛠️',
    description: 'Imprimerie & sérigraphie, transport & fret, réparations électroniques, formations',
    color: 'yellow',
    badgeColorClass: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
    borderColorClass: 'border-yellow-500/30 hover:border-yellow-400',
    textColorClass: 'text-yellow-400',
    bgGradientClass: 'from-yellow-950/40 to-slate-900',
    popularItemCount: '190+ offres',
    subcategories: ['Impression & Reliure professionnelle', 'Transport Conakry - Intérieur', 'Réparation Smartphones & PC', 'Formations & Bureautique', 'Nettoyage & Sécurité'],
    isActive: true,
    sortOrder: 20
  },
  {
    id: 'cat-autres',
    code: 'AUTRES',
    name: 'Autres produits',
    icon: '🏷️',
    description: 'Articles divers, artisanat guinéen, objets d’art, quincaillerie variée',
    color: 'green',
    badgeColorClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    borderColorClass: 'border-emerald-500/30 hover:border-emerald-400',
    textColorClass: 'text-emerald-400',
    bgGradientClass: 'from-emerald-950/40 to-slate-900',
    popularItemCount: '85+ articles',
    subcategories: ['Artisanat local (Sculptures, Cuir)', 'Instruments de musique (Djembé, Kora)', 'Articles insolites', 'Brocante & Divers'],
    isActive: true,
    sortOrder: 21
  }
];

export function getCategoryByIdOrName(query: string): GlobalMarketplaceCategory | undefined {
  const q = query.toLowerCase().trim();
  return GLOBAL_MARKETPLACE_CATEGORIES.find(
    cat => cat.id === q || cat.code.toLowerCase() === q || cat.name.toLowerCase().includes(q)
  );
}

export function getAllActiveCategories(): GlobalMarketplaceCategory[] {
  return GLOBAL_MARKETPLACE_CATEGORIES.filter(c => c.isActive).sort((a, b) => a.sortOrder - b.sortOrder);
}
