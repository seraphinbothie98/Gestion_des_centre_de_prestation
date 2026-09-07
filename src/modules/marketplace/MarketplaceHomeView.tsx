import React, { useState, useMemo } from 'react';
import { 
  Store, MapPin, Search, Star, ShoppingBag, Heart, 
  Sparkles, ShieldCheck, ChevronRight, ArrowRight, Zap, 
  Layers, Package, Phone, Check, HelpCircle, PhoneCall,
  SlidersHorizontal, Award, Filter, RefreshCw
} from 'lucide-react';
import { Product, Tenant } from '../../types';
import { GuineanCity, ConakryCommune, MarketplaceCartItem, MarketplaceConversation, MarketplaceChatMessage } from './types';
import { MarketplaceHeader, GUINEAN_CITIES, CONAKRY_COMMUNES } from './MarketplaceHeader';
import { MarketplaceFooter } from './MarketplaceFooter';
import { MarketplaceProductDetailModal } from './MarketplaceProductDetailModal';
import { MarketplaceCartModal } from './MarketplaceCartModal';
import { MarketplaceWishlistModal } from './MarketplaceWishlistModal';
import { MarketplaceMessagingModal } from './MarketplaceMessagingModal';
import { MarketplaceRegisterStoreModal } from './MarketplaceRegisterStoreModal';
import { MarketplaceStoreView } from './MarketplaceStoreView';

// Curated Category list with Guinean national accents (Rouge, Jaune, Vert)
export const MARKETPLACE_CATEGORIES = [
  { id: 'cat-tel', name: 'Téléphones & Informatique', icon: '💻', count: '140+ articles', accent: 'border-red-500/30 text-red-400' },
  { id: 'cat-elec', name: 'Électronique & Maison', icon: '⚡', count: '85+ articles', accent: 'border-yellow-500/30 text-yellow-400' },
  { id: 'cat-mode', name: 'Mode & Vêtements', icon: '👔', count: '210+ articles', accent: 'border-emerald-500/30 text-emerald-400' },
  { id: 'cat-chauss', name: 'Chaussures & Maroquinerie', icon: '👟', count: '95+ articles', accent: 'border-red-500/30 text-red-400' },
  { id: 'cat-beaute', name: 'Beauté, Cosmétiques & Santé', icon: '✨', count: '70+ articles', accent: 'border-yellow-500/30 text-yellow-400' },
  { id: 'cat-maison', name: 'Maison, Déco & Électroménager', icon: '🛋️', count: '115+ articles', accent: 'border-emerald-500/30 text-emerald-400' },
  { id: 'cat-alim', name: 'Alimentation & Produits Locaux', icon: '🍚', count: '60+ articles', accent: 'border-yellow-500/30 text-yellow-400' },
  { id: 'cat-quinc', name: 'Quincaillerie & BTP', icon: '🔨', count: '130+ articles', accent: 'border-red-500/30 text-red-400' },
  { id: 'cat-fourn', name: 'Papeterie & Fournitures Pro', icon: '📚', count: '180+ articles', accent: 'border-emerald-500/30 text-emerald-400' },
  { id: 'cat-auto', name: 'Automobile & Moto', icon: '🛵', count: '45+ articles', accent: 'border-red-500/30 text-red-400' },
];

interface MarketplaceHomeViewProps {
  tenants: Tenant[];
  products: Product[];
  onOpenLogin: () => void;
  onRegisterStoreSuccess: (newTenant: Tenant) => void;
}

export const MarketplaceHomeView: React.FC<MarketplaceHomeViewProps> = ({
  tenants,
  products,
  onOpenLogin,
  onRegisterStoreSuccess
}) => {
  // Navigation & Location state
  const [currentCity, setCurrentCity] = useState<GuineanCity>('Conakry');
  const [currentCommune, setCurrentCommune] = useState<ConakryCommune | undefined>('Kaloum');
  const [activeNavSection, setActiveNavSection] = useState<'home' | 'categories' | 'stores' | 'how-it-works' | 'contact'>('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');

  // Interactive Modals state
  const [selectedProductForDetail, setSelectedProductForDetail] = useState<Product | null>(null);
  const [selectedStoreForView, setSelectedStoreForView] = useState<Tenant | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isWishlistOpen, setIsWishlistOpen] = useState(false);
  const [isMessagingOpen, setIsMessagingOpen] = useState(false);
  const [isRegisterStoreOpen, setIsRegisterStoreOpen] = useState(false);
  const [chatTargetProduct, setChatTargetProduct] = useState<Product | undefined>();
  const [chatTargetStore, setChatTargetStore] = useState<Tenant | undefined>();

  // Cart & Wishlist storage
  const [cartItems, setCartItems] = useState<MarketplaceCartItem[]>([]);
  const [favoriteProductIds, setFavoriteProductIds] = useState<string[]>([]);

  // Internal Messaging conversations state
  const [conversations, setConversations] = useState<MarketplaceConversation[]>([
    {
      id: 'conv-demo-01',
      storeId: 't-002',
      storeName: 'Boutique Quincaillerie & Matériaux Horizon',
      storeCity: 'Conakry',
      storeLogoUrl: 'https://images.unsplash.com/photo-1581783898377-1c85bf937427?w=150&auto=format&fit=crop&q=80',
      customerId: 'user-guest-01',
      customerName: 'Client Marketplace',
      productName: 'Ciment Guinée 50kg CPJ 35',
      lastMessageText: 'Bonjour, oui nous livrons également à Kindia par transporteur.',
      lastMessageAt: new Date(Date.now() - 3600000).toISOString(),
      unreadCountCustomer: 1,
      unreadCountStore: 0,
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      messages: [
        {
          id: 'msg-01',
          conversationId: 'conv-demo-01',
          senderId: 'user-guest-01',
          senderName: 'Client Marketplace',
          senderRole: 'CUSTOMER',
          content: 'Bonjour ! Le ciment est-il disponible pour livraison à Kindia ?',
          createdAt: new Date(Date.now() - 7200000).toISOString(),
          isRead: true
        },
        {
          id: 'msg-02',
          conversationId: 'conv-demo-01',
          senderId: 't-002',
          senderName: 'Horizon Quincaillerie',
          senderRole: 'STORE',
          content: 'Bonjour, oui nous livrons également à Kindia par transporteur.',
          createdAt: new Date(Date.now() - 3600000).toISOString(),
          isRead: false
        }
      ]
    }
  ]);

  // ==============================================================================
  // RULE: STRICT STORE VISIBILITY EVALUATION
  // Only ACTIVE stores or VALID TRIAL stores display products publicly.
  // ==============================================================================
  const activeTenantsMap = useMemo(() => {
    const map = new Map<string, Tenant>();
    tenants.forEach(t => {
      const isStatusActive = t.status === 'ACTIVE' || !t.status;
      const isTrialValid = t.subscriptionStatus === 'TRIAL' || t.subscriptionStatus === 'ACTIVE';
      const isNotSuspended = t.subscriptionStatus !== 'SUSPENDED' && t.subscriptionStatus !== 'EXPIRED' && t.status !== 'SUSPENDED' && t.status !== 'EXPIRED' && t.status !== 'CLOSED';
      
      if (isStatusActive && isTrialValid && isNotSuspended && t.isActive) {
        map.set(t.id, t);
      }
    });
    return map;
  }, [tenants]);

  // Visible Products (only from active stores & sellable items)
  const visibleProducts = useMemo(() => {
    return products.filter(p => {
      if (!p.isActive || p.isArchived) return false;
      const store = activeTenantsMap.get(p.tenantId);
      if (!store) return false;
      return true;
    });
  }, [products, activeTenantsMap]);

  // Filtered Products based on search query and category
  const filteredProducts = useMemo(() => {
    return visibleProducts.filter(p => {
      const store = activeTenantsMap.get(p.tenantId);
      const storeName = store?.name || '';
      const storeCityName = store?.city || 'Conakry';

      const matchesQuery = !searchQuery || 
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        storeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        storeCityName.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory = selectedCategoryFilter === 'ALL' || 
        p.category.toLowerCase().includes(selectedCategoryFilter.toLowerCase());

      return matchesQuery && matchesCategory;
    });
  }, [visibleProducts, searchQuery, selectedCategoryFilter, activeTenantsMap]);

  // Nearby Products vs Products from Other Cities
  const nearbyProducts = useMemo(() => {
    return filteredProducts.filter(p => {
      const store = activeTenantsMap.get(p.tenantId);
      const storeCity = (store?.city || 'Conakry').toLowerCase();
      return storeCity === currentCity.toLowerCase();
    });
  }, [filteredProducts, currentCity, activeTenantsMap]);

  const otherCityProducts = useMemo(() => {
    return filteredProducts.filter(p => {
      const store = activeTenantsMap.get(p.tenantId);
      const storeCity = (store?.city || 'Conakry').toLowerCase();
      return storeCity !== currentCity.toLowerCase();
    });
  }, [filteredProducts, currentCity, activeTenantsMap]);

  // Active stores for showcase
  const activeStoresList = useMemo(() => {
    return Array.from(activeTenantsMap.values());
  }, [activeTenantsMap]);

  // ==============================================================================
  // CART & WISHLIST HANDLERS
  // ==============================================================================
  const handleAddToCart = (product: Product, quantity: number = 1) => {
    const store = activeTenantsMap.get(product.tenantId) || tenants.find(t => t.id === product.tenantId);
    const storeName = store?.name || 'Boutique Partenaire';
    const storeCity = store?.city || 'Conakry';

    setCartItems(prev => {
      const existing = prev.find(item => item.productId === product.id);
      if (existing) {
        return prev.map(item => 
          item.productId === product.id 
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          productName: product.name,
          productCode: product.code,
          imageUrl: product.imageUrl,
          storeId: product.tenantId,
          storeName,
          storeCity,
          unitPrice: product.salePrice || product.costPrice || 0,
          quantity,
          unit: product.defaultSaleUnit || product.unit || 'unité',
          maxStock: product.currentStock || 50
        }
      ];
    });
  };

  const handleUpdateCartQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      setCartItems(prev => prev.filter(i => i.productId !== productId));
    } else {
      setCartItems(prev => prev.map(i => i.productId === productId ? { ...i, quantity } : i));
    }
  };

  const handleRemoveCartItem = (productId: string) => {
    setCartItems(prev => prev.filter(i => i.productId !== productId));
  };

  const handleToggleFavorite = (product: Product) => {
    setFavoriteProductIds(prev => 
      prev.includes(product.id) 
        ? prev.filter(id => id !== product.id)
        : [...prev, product.id]
    );
  };

  const favoriteProductsList = useMemo(() => {
    return visibleProducts.filter(p => favoriteProductIds.includes(p.id));
  }, [visibleProducts, favoriteProductIds]);

  // Open Chat with a store
  const handleOpenChatWithStore = (store: Tenant, product?: Product) => {
    setChatTargetStore(store);
    setChatTargetProduct(product);
    setIsMessagingOpen(true);
  };

  const handleCreateOrGetConversation = (store: Tenant, product?: Product, initialText?: string) => {
    const existing = conversations.find(c => c.storeId === store.id);
    if (existing) return existing;

    const newConv: MarketplaceConversation = {
      id: `conv-${Date.now()}`,
      storeId: store.id,
      storeName: store.name,
      storeCity: store.city || 'Conakry',
      storeLogoUrl: store.logoUrl,
      customerId: 'user-guest',
      customerName: 'Client Marketplace',
      productId: product?.id,
      productName: product?.name,
      productImageUrl: product?.imageUrl,
      lastMessageText: initialText || 'Nouvelle discussion initiée',
      lastMessageAt: new Date().toISOString(),
      unreadCountCustomer: 0,
      unreadCountStore: 1,
      createdAt: new Date().toISOString(),
      messages: initialText ? [
        {
          id: `msg-${Date.now()}`,
          conversationId: `conv-${Date.now()}`,
          senderId: 'user-guest',
          senderName: 'Client',
          senderRole: 'CUSTOMER',
          content: initialText,
          createdAt: new Date().toISOString(),
          isRead: true
        }
      ] : []
    };

    setConversations(prev => [newConv, ...prev]);
    return newConv;
  };

  const handleSendMessage = (conversationId: string, content: string) => {
    const newMsg: MarketplaceChatMessage = {
      id: `msg-${Date.now()}`,
      conversationId,
      senderId: 'user-guest',
      senderName: 'Client Marketplace',
      senderRole: 'CUSTOMER',
      content,
      createdAt: new Date().toISOString(),
      isRead: false
    };

    setConversations(prev => prev.map(conv => {
      if (conv.id === conversationId) {
        return {
          ...conv,
          lastMessageText: content,
          lastMessageAt: new Date().toISOString(),
          messages: [...conv.messages, newMsg]
        };
      }
      return conv;
    }));
  };

  // If a single store showcase view is active, render that view
  if (selectedStoreForView) {
    const storeProducts = visibleProducts.filter(p => p.tenantId === selectedStoreForView.id);
    return (
      <MarketplaceStoreView
        store={selectedStoreForView}
        products={storeProducts}
        currentCity={currentCity}
        favoriteProductIds={favoriteProductIds}
        onToggleFavorite={handleToggleFavorite}
        onAddToCart={handleAddToCart}
        onOpenProductDetail={(prod) => setSelectedProductForDetail(prod)}
        onOpenChat={(st) => handleOpenChatWithStore(st)}
        onBackToMarketplace={() => setSelectedStoreForView(null)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-red-600 selection:text-white">
      
      {/* 1. HEADER & TOP NAVIGATION */}
      <MarketplaceHeader
        currentCity={currentCity}
        currentCommune={currentCommune}
        onSelectLocation={(city, commune) => {
          setCurrentCity(city);
          setCurrentCommune(commune);
        }}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSearchSubmit={() => {}}
        wishlistCount={favoriteProductIds.length}
        cartCount={cartItems.reduce((sum, item) => sum + item.quantity, 0)}
        onOpenWishlist={() => setIsWishlistOpen(true)}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenLogin={onOpenLogin}
        onOpenRegisterStore={() => setIsRegisterStoreOpen(true)}
        onNavigateSection={(section) => setActiveNavSection(section)}
        activeNavSection={activeNavSection}
      />

      <main className="flex-1">
        
        {/* 2. HERO SECTION & PROMINENT SEARCH (Couleurs Nationales Guinée) */}
        <section className="relative overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 border-b border-slate-800/80 pt-8 pb-16 px-4 sm:px-6 lg:px-8">
          
          {/* Guinea Tri-Color Glows */}
          <div className="absolute top-0 left-10 w-80 h-80 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute top-10 left-1/2 -translate-x-1/2 w-80 h-80 bg-yellow-400/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute top-0 right-10 w-80 h-80 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

          <div className="max-w-5xl mx-auto text-center space-y-6 relative z-10">
            
            {/* Top Badge: Guinea Flag Tri-Color Pill */}
            <div className="inline-flex items-center gap-2 bg-slate-900 border border-slate-700 px-4 py-1.5 rounded-full shadow-lg backdrop-blur-md">
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-red-600" />
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
              </div>
              <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <span>Localisation :</span>
                <strong className="text-yellow-400">{currentCity}</strong>
                {currentCity === 'Conakry' && currentCommune ? <span className="text-emerald-400">({currentCommune})</span> : ''}
              </span>
            </div>

            {/* Main Headline with Guinea Flag Gradient */}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
              Trouvez ce que vous cherchez, <br className="hidden sm:inline" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-yellow-400 to-emerald-400">
                près de chez vous.
              </span>
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl mx-auto leading-relaxed">
              Découvrez des milliers d'articles vérifiés publiés par des boutiques réelles à Conakry, Kindia, Labé, Kankan et dans toute la République de Guinée.
            </p>

            {/* Hero Main Search Bar */}
            <div className="max-w-3xl mx-auto bg-slate-900/95 p-2 sm:p-2.5 rounded-2xl border border-slate-700 shadow-2xl backdrop-blur-md">
              <div className="flex flex-col sm:flex-row items-center gap-2">
                <div className="flex-1 w-full relative flex items-center">
                  <Search className="w-5 h-5 text-slate-400 absolute left-4 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Que recherchez-vous ? Téléphone, vêtements, ordinateur, ciment..."
                    className="w-full bg-slate-950 text-white text-xs sm:text-sm pl-11 pr-4 py-3 rounded-xl border border-slate-700 focus:border-red-500 focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <select
                    value={currentCity}
                    onChange={(e) => setCurrentCity(e.target.value as GuineanCity)}
                    className="flex-1 sm:flex-none bg-slate-950 text-slate-200 text-xs font-bold px-3.5 py-3 rounded-xl border border-slate-700 focus:border-emerald-500 focus:outline-none"
                  >
                    {GUINEAN_CITIES.map(c => (
                      <option key={c} value={c}>📍 {c}</option>
                    ))}
                  </select>

                  {/* Red Action Button (Action Principale) */}
                  <button
                    onClick={() => {}}
                    className="py-3 px-6 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs shadow-lg shadow-red-600/30 transition-all flex items-center justify-center gap-1.5 shrink-0"
                  >
                    <span>Rechercher</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Keyword Pills */}
            <div className="flex items-center justify-center gap-2 flex-wrap text-xs text-slate-400 pt-1">
              <span className="font-semibold text-slate-500">Recherches fréquentes :</span>
              {['iPhone 15', 'Papier Ramette A4', 'Ciment 50kg', 'Chaussures Cuir', 'Ordinateur HP', 'Peinture'].map(tag => (
                <button
                  key={tag}
                  onClick={() => setSearchQuery(tag)}
                  className="bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-yellow-400 px-2.5 py-1 rounded-lg border border-slate-800 text-[11px] font-medium transition-colors"
                >
                  {tag}
                </button>
              ))}
            </div>

          </div>
        </section>

        {/* 3. EXPLORER LES CATÉGORIES */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                <h2 className="text-lg sm:text-xl font-black text-white">Explorer les Catégories</h2>
              </div>
              <p className="text-xs text-slate-400">Parcourez les rayons des commerçants guinéens</p>
            </div>

            <button
              onClick={() => setSelectedCategoryFilter('ALL')}
              className="text-xs font-bold text-yellow-400 hover:text-yellow-300 flex items-center gap-1"
            >
              <span>Voir tout</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4">
            {MARKETPLACE_CATEGORIES.map((cat) => {
              const isSelected = selectedCategoryFilter.toLowerCase() === cat.name.toLowerCase();
              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    setSelectedCategoryFilter(isSelected ? 'ALL' : cat.name);
                  }}
                  className={`p-4 rounded-2xl text-left transition-all group flex flex-col justify-between h-28 border ${
                    isSelected 
                      ? 'bg-yellow-500/15 border-yellow-400 shadow-lg shadow-yellow-500/10' 
                      : 'bg-slate-900 hover:bg-slate-850 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <span className="text-2xl">{cat.icon}</span>
                  <div>
                    <h3 className={`text-xs font-bold transition-colors leading-tight line-clamp-1 ${
                      isSelected ? 'text-yellow-300' : 'text-white group-hover:text-yellow-400'
                    }`}>
                      {cat.name}
                    </h3>
                    <span className="text-[10px] text-slate-500">{cat.count}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* 4. PRODUITS PRÈS DE CHEZ VOUS (Vert = Proximité & Disponibilité) */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-950 p-5 rounded-3xl border border-emerald-500/30">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
                <h2 className="text-lg sm:text-xl font-black text-white">
                  Produits près de chez vous ({currentCity})
                </h2>
              </div>
              <p className="text-xs text-slate-400">
                Disponibles immédiatement pour retrait en boutique ou livraison express à {currentCity}
              </p>
            </div>

            <span className="text-xs font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 rounded-xl self-start sm:self-auto">
              📍 {nearbyProducts.length} article{nearbyProducts.length > 1 ? 's' : ''} disponible{nearbyProducts.length > 1 ? 's' : ''}
            </span>
          </div>

          {nearbyProducts.length === 0 ? (
            <div className="p-8 text-center bg-slate-900/40 rounded-3xl border border-slate-800 space-y-2">
              <Package className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-xs text-slate-300 font-bold">Aucun produit ne correspond à ces critères à {currentCity}.</p>
              <p className="text-[11px] text-slate-500">Découvrez les offres disponibles dans les autres villes ci-dessous.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
              {nearbyProducts.map((product) => {
                const store = activeTenantsMap.get(product.tenantId);
                const isFav = favoriteProductIds.includes(product.id);
                const price = product.salePrice || product.costPrice || 0;

                return (
                  <div
                    key={product.id}
                    className="group bg-slate-900 rounded-2xl border border-slate-800 hover:border-emerald-500/40 overflow-hidden shadow-lg transition-all flex flex-col justify-between"
                  >
                    <div className="relative aspect-square overflow-hidden bg-slate-950">
                      <img
                        src={product.imageUrl || 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=400&auto=format&fit=crop&q=80'}
                        alt={product.name}
                        onClick={() => setSelectedProductForDetail(product)}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 cursor-pointer"
                      />

                      {/* Green Location Badge */}
                      <div className="absolute top-2.5 left-2.5 flex flex-col gap-1">
                        <span className="inline-flex items-center gap-1 bg-emerald-600 text-white font-black text-[10px] px-2.5 py-0.5 rounded-full shadow-md">
                          <MapPin className="w-3 h-3" /> Près de vous
                        </span>
                      </div>

                      {/* Favorite Button (Red on active) */}
                      <button
                        onClick={() => handleToggleFavorite(product)}
                        className={`absolute top-2.5 right-2.5 p-2 rounded-full backdrop-blur-sm transition-all ${
                          isFav 
                            ? 'bg-red-600 text-white shadow-md' 
                            : 'bg-slate-950/70 text-slate-300 hover:text-red-400 hover:bg-slate-900'
                        }`}
                        title="Favoris"
                      >
                        <Heart className={`w-3.5 h-3.5 ${isFav ? 'fill-current' : ''}`} />
                      </button>
                    </div>

                    <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                      <div className="space-y-1">
                        {/* Store name and city */}
                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                          <span className="font-semibold text-slate-300 truncate max-w-32">{store?.name}</span>
                          <span className="text-emerald-400 font-bold shrink-0">📍 {store?.city || currentCity}</span>
                        </div>

                        <h3 
                          onClick={() => setSelectedProductForDetail(product)}
                          className="text-xs sm:text-sm font-bold text-white group-hover:text-yellow-400 transition-colors line-clamp-2 cursor-pointer leading-tight"
                        >
                          {product.name}
                        </h3>
                      </div>

                      <div className="pt-2 border-t border-slate-800 flex items-end justify-between gap-2">
                        <div>
                          <span className="text-[10px] text-slate-500 block uppercase">Prix</span>
                          <p className="text-sm font-black text-yellow-400">
                            {price.toLocaleString('fr-FR')} <span className="text-[11px] font-normal text-slate-300">GNF</span>
                          </p>
                        </div>

                        {/* Red Primary Action Button */}
                        <button
                          onClick={() => handleAddToCart(product, 1)}
                          className="p-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white shadow-md shadow-red-600/30 transition-all flex items-center justify-center"
                          title="Ajouter au panier"
                        >
                          <ShoppingBag className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* 5. PRODUITS D'AUTRES VILLES (Jaune = Découverte régionale) */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                <h2 className="text-lg sm:text-xl font-black text-white">
                  Découvrez aussi dans d'autres villes de Guinée
                </h2>
              </div>
              <p className="text-xs text-slate-400">
                Commandez auprès de commerçants situés à Kindia, Labé, Kankan, Boké, Conakry...
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {otherCityProducts.map((product) => {
              const store = activeTenantsMap.get(product.tenantId);
              const storeCity = store?.city || 'Autre ville';
              const isFav = favoriteProductIds.includes(product.id);
              const price = product.salePrice || product.costPrice || 0;

              return (
                <div
                  key={product.id}
                  className="group bg-slate-900 rounded-2xl border border-slate-800 hover:border-yellow-500/30 overflow-hidden shadow-lg transition-all flex flex-col justify-between"
                >
                  <div className="relative aspect-square overflow-hidden bg-slate-950">
                    <img
                      src={product.imageUrl || 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=400&auto=format&fit=crop&q=80'}
                      alt={product.name}
                      onClick={() => setSelectedProductForDetail(product)}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 cursor-pointer"
                    />

                    {/* Distinct City Badge in Yellow / Gold */}
                    <div className="absolute top-2.5 left-2.5">
                      <span className="inline-flex items-center gap-1 bg-slate-900/95 text-yellow-300 border border-yellow-500/40 font-bold text-[10px] px-2.5 py-0.5 rounded-full shadow-md">
                        <MapPin className="w-3 h-3 text-yellow-400" /> 📍 {storeCity}
                      </span>
                    </div>

                    {/* Favorite Button */}
                    <button
                      onClick={() => handleToggleFavorite(product)}
                      className={`absolute top-2.5 right-2.5 p-2 rounded-full backdrop-blur-sm transition-all ${
                        isFav 
                          ? 'bg-red-600 text-white shadow-md' 
                          : 'bg-slate-950/70 text-slate-300 hover:text-red-400 hover:bg-slate-900'
                      }`}
                    >
                      <Heart className={`w-3.5 h-3.5 ${isFav ? 'fill-current' : ''}`} />
                    </button>
                  </div>

                  <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span className="font-semibold text-slate-300 truncate max-w-32">{store?.name}</span>
                        <span className="text-yellow-400 font-bold shrink-0">📍 {storeCity}</span>
                      </div>

                      <h3 
                        onClick={() => setSelectedProductForDetail(product)}
                        className="text-xs sm:text-sm font-bold text-white group-hover:text-yellow-400 transition-colors line-clamp-2 cursor-pointer leading-tight"
                      >
                        {product.name}
                      </h3>
                    </div>

                    <div className="pt-2 border-t border-slate-800 flex items-end justify-between gap-2">
                      <div>
                        <span className="text-[10px] text-slate-500 block uppercase">Prix</span>
                        <p className="text-sm font-black text-white">
                          {price.toLocaleString('fr-FR')} <span className="text-[11px] font-normal text-slate-400">GNF</span>
                        </p>
                      </div>

                      <button
                        onClick={() => handleAddToCart(product, 1)}
                        className="p-2.5 rounded-xl bg-slate-800 hover:bg-red-600 text-slate-200 hover:text-white border border-slate-700 hover:border-red-500 transition-all"
                        title="Ajouter au panier"
                      >
                        <ShoppingBag className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 6. MINI-BOUTIQUES / BOUTIQUES RECOMMANDÉES (Vert & Or = Confiance) */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                <h2 className="text-lg sm:text-xl font-black text-white">
                  Découvrez nos Boutiques Populaires
                </h2>
              </div>
              <p className="text-xs text-slate-400">Vendeurs vérifiés et réputés en République de Guinée</p>
            </div>

            <button
              onClick={() => {}}
              className="text-xs font-bold text-yellow-400 hover:text-yellow-300 flex items-center gap-1"
            >
              <span>Voir toutes les boutiques ({activeStoresList.length})</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {activeStoresList.map((store) => {
              const storeProds = visibleProducts.filter(p => p.tenantId === store.id);
              const storeCity = store.city || 'Conakry';

              return (
                <div
                  key={store.id}
                  className="bg-slate-900 rounded-3xl border border-slate-800 hover:border-yellow-500/40 p-6 space-y-5 shadow-xl transition-all flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    {/* Store Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3.5">
                        <div className="w-14 h-14 rounded-2xl bg-slate-950 border border-slate-700 text-yellow-400 flex items-center justify-center font-black text-lg overflow-hidden shrink-0">
                          {store.logoUrl ? (
                            <img src={store.logoUrl} alt={store.name} className="w-full h-full object-cover" />
                          ) : (
                            <Store className="w-7 h-7" />
                          )}
                        </div>
                        <div>
                          <h3 className="text-sm font-black text-white leading-tight">{store.name}</h3>
                          <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                            <span>{storeCity}</span>
                          </p>
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full mt-1 border border-emerald-500/20">
                            <ShieldCheck className="w-3 h-3" /> Boutique Vérifiée
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="flex items-center gap-1 text-yellow-400 font-black text-xs">
                          <Star className="w-3.5 h-3.5 fill-current" />
                          <span>4.8</span>
                        </div>
                        <span className="text-[10px] text-slate-500">42 avis</span>
                      </div>
                    </div>

                    {/* Store Sample Products Thumbnails */}
                    {storeProds.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Articles phares :</span>
                        <div className="grid grid-cols-3 gap-2">
                          {storeProds.slice(0, 3).map((sp) => (
                            <div
                              key={sp.id}
                              onClick={() => setSelectedProductForDetail(sp)}
                              className="aspect-square rounded-xl bg-slate-950 border border-slate-800 overflow-hidden cursor-pointer hover:opacity-80 transition-opacity relative group"
                            >
                              <img src={sp.imageUrl || 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=200&auto=format&fit=crop&q=80'} alt="" className="w-full h-full object-cover" />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Visit Store Button in Green */}
                  <button
                    onClick={() => setSelectedStoreForView(store)}
                    className="w-full py-2.5 px-4 rounded-xl bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white font-bold text-xs border border-emerald-500/30 transition-all flex items-center justify-center gap-2"
                  >
                    <span>Voir la boutique</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        {/* 7. CALL TO ACTION: CRÉER MA BOUTIQUE (Rouge & Or) */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="relative rounded-3xl bg-gradient-to-r from-red-700 via-red-600 to-red-800 p-8 sm:p-12 text-white overflow-hidden shadow-2xl border border-yellow-400/30">
            <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-yellow-400/10 skew-x-12 pointer-events-none" />

            <div className="max-w-2xl space-y-4 relative z-10">
              <span className="inline-flex items-center gap-1.5 bg-yellow-400 text-slate-950 font-black text-xs px-3 py-1 rounded-full uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" /> Espace Vendeurs en Guinée
              </span>

              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight">
                Vous possédez un commerce ou une boutique ? Vendez en ligne dès aujourd'hui !
              </h2>

              <p className="text-xs sm:text-sm text-slate-100 font-medium leading-relaxed">
                Rejoignez des centaines de commerçants en Guinée. Créez votre boutique en 2 minutes et bénéficiez de <strong className="text-yellow-300">10 jours d'essai gratuit</strong> avec gestion des stocks, commandes et messagerie directe.
              </p>

              <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                <button
                  onClick={() => setIsRegisterStoreOpen(true)}
                  className="w-full sm:w-auto py-3.5 px-8 rounded-2xl bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black text-xs shadow-xl hover:scale-105 transition-all flex items-center justify-center gap-2"
                >
                  <Store className="w-4 h-4 text-red-600" />
                  <span>Créer ma boutique maintenant (10 jours gratuits)</span>
                </button>

                <button
                  onClick={onOpenLogin}
                  className="w-full sm:w-auto py-3.5 px-6 rounded-2xl bg-slate-950/50 hover:bg-slate-950/70 text-white font-bold text-xs transition-colors flex items-center justify-center border border-white/20"
                >
                  Déjà commerçant ? Se connecter
                </button>
              </div>
            </div>
          </div>
        </section>

      </main>

      {/* 8. FOOTER */}
      <MarketplaceFooter
        onNavigateSection={(sec) => setActiveNavSection(sec)}
        onOpenRegisterStore={() => setIsRegisterStoreOpen(true)}
        onOpenLogin={onOpenLogin}
      />

      {/* 9. ALL INTERACTIVE MODALS */}
      {selectedProductForDetail && (
        <MarketplaceProductDetailModal
          product={selectedProductForDetail}
          store={activeTenantsMap.get(selectedProductForDetail.tenantId) || tenants[0]}
          currentCity={currentCity}
          currentCommune={currentCommune}
          isFavorite={favoriteProductIds.includes(selectedProductForDetail.id)}
          onToggleFavorite={handleToggleFavorite}
          onAddToCart={handleAddToCart}
          onBuyNow={(prod, qty) => {
            handleAddToCart(prod, qty);
            setSelectedProductForDetail(null);
            setIsCartOpen(true);
          }}
          onOpenChat={(prod, st) => {
            setSelectedProductForDetail(null);
            handleOpenChatWithStore(st, prod);
          }}
          onOpenStoreView={(st) => {
            setSelectedProductForDetail(null);
            setSelectedStoreForView(st);
          }}
          onClose={() => setSelectedProductForDetail(null)}
        />
      )}

      {isCartOpen && (
        <MarketplaceCartModal
          items={cartItems}
          currentCity={currentCity}
          onUpdateQuantity={handleUpdateCartQuantity}
          onRemoveItem={handleRemoveCartItem}
          onClearCart={() => setCartItems([])}
          onCheckoutSuccess={(orders) => {}}
          onClose={() => setIsCartOpen(false)}
        />
      )}

      {isWishlistOpen && (
        <MarketplaceWishlistModal
          favoriteProducts={favoriteProductsList}
          onRemoveFavorite={(id) => setFavoriteProductIds(prev => prev.filter(fid => fid !== id))}
          onAddToCart={handleAddToCart}
          onOpenProductDetail={(prod) => {
            setIsWishlistOpen(false);
            setSelectedProductForDetail(prod);
          }}
          onClose={() => setIsWishlistOpen(false)}
        />
      )}

      {isMessagingOpen && (
        <MarketplaceMessagingModal
          initialProduct={chatTargetProduct}
          initialStore={chatTargetStore}
          conversations={conversations}
          onSendMessage={handleSendMessage}
          onCreateConversation={handleCreateOrGetConversation}
          onClose={() => setIsMessagingOpen(false)}
        />
      )}

      {isRegisterStoreOpen && (
        <MarketplaceRegisterStoreModal
          onRegisterSuccess={(newT) => {
            onRegisterStoreSuccess(newT);
          }}
          onClose={() => setIsRegisterStoreOpen(false)}
          onOpenLogin={() => {
            setIsRegisterStoreOpen(false);
            onOpenLogin();
          }}
        />
      )}

    </div>
  );
};
