import React, { useState, useMemo, useEffect } from 'react';
import { dbStore } from '../../server/db/mockStore';
import { 
  Store, MapPin, Search, Star, ShoppingBag, Heart, 
  Sparkles, ShieldCheck, ChevronRight, ArrowRight, Zap, 
  Layers, Package, Phone, Check, HelpCircle, PhoneCall,
  SlidersHorizontal, Award, Filter, RefreshCw, Radio, 
  MessageSquare, Video, Flame, Clock, Truck, ChevronLeft, X,
  ChevronDown, ChevronUp
} from 'lucide-react';
import { Product, Tenant, Order } from '../../types';
import { 
  GuineanCity, ConakryCommune, MarketplaceCartItem, 
  MarketplaceConversation, MarketplaceChatMessage, MarketplaceLiveSession 
} from './types';
import { MarketplaceHeader, GUINEAN_CITIES, CONAKRY_COMMUNES } from './MarketplaceHeader';
import { MarketplaceFooter } from './MarketplaceFooter';
import { MarketplaceProductDetailModal } from './MarketplaceProductDetailModal';
import { MarketplaceCartModal } from './MarketplaceCartModal';
import { MarketplaceWishlistModal } from './MarketplaceWishlistModal';
import { MarketplaceMessagingModal } from './MarketplaceMessagingModal';
import { MarketplaceRegisterStoreModal } from './MarketplaceRegisterStoreModal';
import { MarketplaceStoreView } from './MarketplaceStoreView';
import { MarketplaceLiveModal } from './MarketplaceLiveModal';
import { MarketplaceClientOrdersModal } from './MarketplaceClientOrdersModal';
import { GLOBAL_MARKETPLACE_CATEGORIES, GlobalMarketplaceCategory } from './MarketplaceCategoriesData';
import { useAuth } from '../../context/AuthContext';
import { MarketplaceAuthModal } from './MarketplaceAuthModal';
import { MarketplaceClientAccountModal } from './MarketplaceClientAccountModal';

interface MarketplaceHomeViewProps {
  tenants: Tenant[];
  products: Product[];
  onOpenLogin: (mode?: 'CLIENT' | 'BOUTIQUE' | 'SUPER_ADMIN') => void;
  onRegisterStoreSuccess: (newTenant: Tenant) => void;
}

export const MarketplaceHomeView: React.FC<MarketplaceHomeViewProps> = ({
  tenants,
  products,
  onOpenLogin,
  onRegisterStoreSuccess
}) => {
  const { currentUser, isAuthenticated, logout } = useAuth();

  // Navigation & Location state
  const [currentCity, setCurrentCity] = useState<GuineanCity>('Conakry');
  const [currentCommune, setCurrentCommune] = useState<ConakryCommune | undefined>('Kaloum');
  const [activeNavSection, setActiveNavSection] = useState<'home' | 'categories' | 'stores' | 'how-it-works' | 'contact'>('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');
  const [showAllCategories, setShowAllCategories] = useState<boolean>(false);

  // Interactive Modals state
  const [selectedProductForDetail, setSelectedProductForDetail] = useState<Product | null>(null);
  const [selectedStoreForView, setSelectedStoreForView] = useState<Tenant | null>(null);
  const [activeLiveSession, setActiveLiveSession] = useState<MarketplaceLiveSession | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isOrdersModalOpen, setIsOrdersModalOpen] = useState(false);
  const [isWishlistOpen, setIsWishlistOpen] = useState(false);
  const [isMessagingOpen, setIsMessagingOpen] = useState(false);
  const [isRegisterStoreOpen, setIsRegisterStoreOpen] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [chatTargetProduct, setChatTargetProduct] = useState<Product | undefined>();
  const [chatTargetStore, setChatTargetStore] = useState<Tenant | undefined>();
  const [chatTargetOrder, setChatTargetOrder] = useState<Order | undefined>();

  // Client Auth Modal State for Visitors
  const [authModalState, setAuthModalState] = useState<{
    isOpen: boolean;
    initialMode?: 'LOGIN' | 'REGISTER';
    pendingActionDesc: string;
    callback?: (user: any) => void;
  }>({
    isOpen: false,
    initialMode: 'LOGIN',
    pendingActionDesc: 'continuer'
  });

  const handleRequireAuth = (actionDesc: string, callback: (user: any) => void) => {
    if (isAuthenticated && currentUser) {
      callback(currentUser);
      return;
    }
    setAuthModalState({
      isOpen: true,
      initialMode: 'LOGIN',
      pendingActionDesc: actionDesc,
      callback
    });
  };

  const handleLogout = () => {
    logout();
    setIsAccountModalOpen(false);
    setIsOrdersModalOpen(false);
    setIsMessagingOpen(false);
    setIsWishlistOpen(false);
  };

  // Cart & Wishlist state with robust local persistence
  const [cartItems, setCartItems] = useState<MarketplaceCartItem[]>(() => {
    try {
      const saved = localStorage.getItem('cms_marketplace_cart_items');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('cms_marketplace_cart_items', JSON.stringify(cartItems));
    } catch {}
  }, [cartItems]);

  const [favoriteProductIds, setFavoriteProductIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('cms_marketplace_favorites');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('cms_marketplace_favorites', JSON.stringify(favoriteProductIds));
    } catch {}
  }, [favoriteProductIds]);

  // Active Client ID resolution
  const activeCustomerId = currentUser?.id || 'user-guest-01';
  const activeCustomerName = currentUser ? `${currentUser.firstName} ${currentUser.lastName || ''}`.trim() : 'Client Marketplace';

  // Demo Live Streams
  const liveSessions: MarketplaceLiveSession[] = useMemo(() => [
    {
      id: 'live-01',
      storeId: 't-002',
      storeName: 'Boutique Quincaillerie & Matériaux Horizon',
      storeCity: 'Conakry',
      storeLogoUrl: 'https://images.unsplash.com/photo-1581783898377-1c85bf937427?w=150&auto=format&fit=crop&q=80',
      title: '🔴 Arrivage Spécial Ciment & Fer à Béton - Prix Promo Direct Madina',
      viewerCount: 142,
      startedAt: new Date(Date.now() - 1800000).toISOString(),
      isActive: true,
      featuredProductIds: products.filter(p => p.tenantId === 't-002').slice(0, 3).map(p => p.id),
      comments: [
        { id: 'l1', userName: 'Ousmane Bah', userCity: 'Conakry', message: 'Quel est le prix de la tonne de fer 12 ?', timestamp: '15:10' },
        { id: 'l2', userName: 'Mamadou Horizon', userCity: 'Conakry', message: 'Nous faisons 5% de remise pour tout achat de plus de 5 tonnes aujourd’hui !', timestamp: '15:11', isSeller: true },
        { id: 'l3', userName: 'Kadiatou Diallo', userCity: 'Coyah', message: 'La livraison à Coyah est possible ce soir ?', timestamp: '15:12' }
      ]
    }
  ], [products]);

  // DB Version & Customer ID for real-time reactivity
  const [dbVersion, setDbVersion] = useState(0);
  useEffect(() => {
    const unsubscribe = dbStore.subscribe(() => {
      setDbVersion(v => v + 1);
    });
    return unsubscribe;
  }, []);

  const customerUnreadCount = useMemo(() => {
    return dbStore.getMarketplaceUnreadCount(undefined, activeCustomerId);
  }, [activeCustomerId, dbVersion]);

  // Active tenants map
  const activeTenantsMap = useMemo(() => {
    const map = new Map<string, Tenant>();
    tenants.forEach(t => map.set(t.id, t));
    return map;
  }, [tenants]);

  // Public products list
  const visibleProducts = useMemo(() => {
    return products.filter(p => p.isActive !== false);
  }, [products]);

  // Filtered products according to category, search, and city
  const filteredProducts = useMemo(() => {
    return visibleProducts.filter(p => {
      const matchesSearch = !searchQuery || 
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCategory = selectedCategoryFilter === 'ALL' || 
        p.category.toLowerCase().includes(selectedCategoryFilter.toLowerCase()) ||
        (p.subcategory && p.subcategory.toLowerCase().includes(selectedCategoryFilter.toLowerCase()));

      return matchesSearch && matchesCategory;
    });
  }, [visibleProducts, searchQuery, selectedCategoryFilter]);

  // Verified stores list
  const verifiedStoresList = useMemo(() => {
    return tenants.filter(t => t.status === 'ACTIVE' || t.isOnline !== false);
  }, [tenants]);

  const handleOpenCreateStore = () => {
    setIsRegisterStoreOpen(true);
  };

  const handleToggleFavorite = (prod: Product) => {
    if (!isAuthenticated && !currentUser) {
      handleRequireAuth('ajouter cet article à vos favoris', () => {
        setFavoriteProductIds(prev => 
          prev.includes(prod.id) ? prev.filter(id => id !== prod.id) : [...prev, prod.id]
        );
      });
      return;
    }
    setFavoriteProductIds(prev => 
      prev.includes(prod.id) ? prev.filter(id => id !== prod.id) : [...prev, prod.id]
    );
  };

  // Cart actions
  const handleAddToCart = (prod: Product, qty: number = 1) => {
    const store = activeTenantsMap.get(prod.tenantId);
    const storeCityName = store?.city || 'Conakry';
    const storeName = store?.name || 'Boutique Partenaire';
    const isStoreOnline = store?.isOnline !== false;
    const publicUnit = prod.publicUnit || prod.defaultSaleUnit || prod.baseUnit || prod.unit || 'Unité';
    const unitPrice = prod.publicPrice || prod.salePrice || prod.costPrice || 0;

    setCartItems(prev => {
      const existing = prev.find(item => item.productId === prod.id);
      if (existing) {
        return prev.map(item => 
          item.productId === prod.id ? { ...item, quantity: item.quantity + qty } : item
        );
      }
      const newItem: MarketplaceCartItem = {
        productId: prod.id,
        productName: prod.name,
        productCode: prod.code || 'ART-001',
        imageUrl: (prod.images && prod.images[0]) || prod.imageUrl,
        images: prod.images,
        storeId: prod.tenantId,
        storeName: storeName,
        storeCity: storeCityName,
        isStoreOnline: isStoreOnline,
        unitPrice: unitPrice,
        quantity: qty,
        unit: publicUnit,
        internalStockUnit: prod.baseUnit || prod.unit,
        conversionFactorToStockUnit: prod.conversionFactorToStockUnit,
        maxStock: prod.currentStock || 50
      };
      return [...prev, newItem];
    });
  };

  const handleBuyNow = (prod: Product, qty: number = 1) => {
    handleAddToCart(prod, qty);
    setSelectedProductForDetail(null);
    setIsCartOpen(true);
  };

  const handleUpdateCartQty = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      setCartItems(prev => prev.filter(item => item.productId !== productId));
    } else {
      setCartItems(prev => prev.map(item => item.productId === productId ? { ...item, quantity } : item));
    }
  };

  const handleRemoveCartItem = (productId: string) => {
    setCartItems(prev => prev.filter(item => item.productId !== productId));
  };

  // Messaging actions
  const executeOpenChat = (storeOrProdOrOrder: Tenant | Product | Order, maybeStore?: Tenant, maybeOrder?: Order) => {
    let targetStore: Tenant | undefined;
    let targetProduct: Product | undefined;
    let targetOrder: Order | undefined = maybeOrder;

    if ('orderNumber' in storeOrProdOrOrder) {
      targetOrder = storeOrProdOrOrder as Order;
      targetStore = maybeStore || activeTenantsMap.get(targetOrder.tenantId);
    } else if ('tenantId' in storeOrProdOrOrder && 'salePrice' in storeOrProdOrOrder) {
      targetProduct = storeOrProdOrOrder as Product;
      targetStore = maybeStore || activeTenantsMap.get(targetProduct.tenantId);
    } else {
      targetStore = storeOrProdOrOrder as Tenant;
    }

    if (!targetStore) return;

    const res = dbStore.findOrCreateMarketplaceConversation({
      customerId: activeCustomerId,
      customerName: activeCustomerName,
      customerPhone: currentUser?.phone,
      boutiqueId: targetStore.id,
      boutiqueName: targetStore.name,
      productId: targetProduct?.id,
      publicationId: targetProduct?.id,
      productName: targetProduct?.name || (targetOrder ? `Commande ${targetOrder.orderNumber}` : 'Discussion Boutique'),
      productImageUrl: (targetProduct?.photos && targetProduct.photos[0]) || targetProduct?.photoUrl,
      publicPrice: targetProduct?.publicPrice || targetProduct?.salePrice,
      publicUnit: targetProduct?.publicUnit || targetProduct?.defaultSaleUnit || targetProduct?.baseUnit,
      orderId: targetOrder?.id,
      orderCode: targetOrder?.orderNumber,
      orderTotal: targetOrder?.totalAmount
    });

    dbStore.markMarketplaceConversationAsRead(res.conversation.id, 'CUSTOMER');

    setChatTargetStore(targetStore);
    setChatTargetProduct(targetProduct);
    setChatTargetOrder(targetOrder);
    setIsMessagingOpen(true);
  };

  const handleOpenChat = (storeOrProdOrOrder: Tenant | Product | Order, maybeStore?: Tenant, maybeOrder?: Order) => {
    if (!isAuthenticated && !currentUser) {
      handleRequireAuth('contacter le vendeur et échanger avec la boutique', () => {
        executeOpenChat(storeOrProdOrOrder, maybeStore, maybeOrder);
      });
      return;
    }
    executeOpenChat(storeOrProdOrOrder, maybeStore, maybeOrder);
  };

  // Total cart items count
  const totalCartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const renderSharedModals = () => (
    <>
      {/* MODALS */}
      {selectedProductForDetail && (
        <MarketplaceProductDetailModal
          product={selectedProductForDetail}
          store={activeTenantsMap.get(selectedProductForDetail.tenantId) || tenants[0]}
          storeOtherProducts={visibleProducts.filter(p => p.tenantId === selectedProductForDetail.tenantId && p.id !== selectedProductForDetail.id)}
          currentCity={currentCity}
          currentCommune={currentCommune}
          isFavorite={favoriteProductIds.includes(selectedProductForDetail.id)}
          onToggleFavorite={handleToggleFavorite}
          onAddToCart={handleAddToCart}
          onBuyNow={handleBuyNow}
          onOpenChat={(prod, store) => handleOpenChat(prod, store)}
          onOpenStoreView={(store) => {
            setSelectedProductForDetail(null);
            setSelectedStoreForView(store);
          }}
          onSelectOtherProduct={(otherProd) => setSelectedProductForDetail(otherProd)}
          onOpenLiveStream={(st) => {
            setSelectedProductForDetail(null);
            const live = liveSessions.find(l => l.storeId === st.id) || liveSessions[0];
            setActiveLiveSession(live);
          }}
          onClose={() => setSelectedProductForDetail(null)}
        />
      )}

      {isCartOpen && (
        <MarketplaceCartModal
          items={cartItems}
          currentCity={currentCity}
          currentUser={currentUser}
          onRequireAuth={handleRequireAuth}
          onUpdateQuantity={handleUpdateCartQty}
          onRemoveItem={handleRemoveCartItem}
          onClearCart={() => setCartItems([])}
          onCheckoutSuccess={() => {}}
          onOpenOrders={() => {
            setIsCartOpen(false);
            setIsOrdersModalOpen(true);
          }}
          onClose={() => setIsCartOpen(false)}
        />
      )}

      {/* Dedicated Client Authentication Modal for Visitors */}
      <MarketplaceAuthModal
        isOpen={authModalState.isOpen}
        initialMode={authModalState.initialMode || 'LOGIN'}
        onClose={() => setAuthModalState(prev => ({ ...prev, isOpen: false }))}
        pendingActionDescription={authModalState.pendingActionDesc}
        onSuccess={(user) => {
          if (authModalState.callback) {
            authModalState.callback(user);
          }
        }}
      />

      {isWishlistOpen && (
        <MarketplaceWishlistModal
          favoriteProducts={visibleProducts.filter(p => favoriteProductIds.includes(p.id))}
          onRemoveFavorite={(pId) => {
            const p = visibleProducts.find(item => item.id === pId);
            if (p) handleToggleFavorite(p);
          }}
          onAddToCart={handleAddToCart}
          onOpenProductDetail={(prod) => setSelectedProductForDetail(prod)}
          onClose={() => setIsWishlistOpen(false)}
        />
      )}

      {isMessagingOpen && (
        <MarketplaceMessagingModal
          initialProduct={chatTargetProduct}
          initialStore={chatTargetStore}
          initialOrder={chatTargetOrder}
          onClose={() => {
            setIsMessagingOpen(false);
            setChatTargetProduct(undefined);
            setChatTargetStore(undefined);
            setChatTargetOrder(undefined);
          }}
        />
      )}

      {isOrdersModalOpen && (
        <MarketplaceClientOrdersModal
          onClose={() => setIsOrdersModalOpen(false)}
          onOpenStoreChat={(storeId, ord) => {
            setIsOrdersModalOpen(false);
            const store = activeTenantsMap.get(storeId);
            if (store) handleOpenChat(store, undefined, ord);
          }}
        />
      )}

      {isRegisterStoreOpen && (
        <MarketplaceRegisterStoreModal
          onRegisterSuccess={(newTenant) => {
            onRegisterStoreSuccess(newTenant);
          }}
          onClose={() => setIsRegisterStoreOpen(false)}
          onOpenLogin={() => {
            setIsRegisterStoreOpen(false);
            onOpenLogin('BOUTIQUE');
          }}
        />
      )}

      {activeLiveSession && (
        <MarketplaceLiveModal
          session={activeLiveSession}
          store={activeTenantsMap.get(activeLiveSession.storeId) || tenants[0]}
          featuredProducts={products.filter(p => activeLiveSession.featuredProductIds.includes(p.id))}
          currentCity={currentCity}
          onAddToCart={handleAddToCart}
          onBuyNow={handleBuyNow}
          onOpenProductDetail={(prod) => setSelectedProductForDetail(prod)}
          onOpenStoreView={(store) => {
            setActiveLiveSession(null);
            setSelectedStoreForView(store);
          }}
          onClose={() => setActiveLiveSession(null)}
        />
      )}

      {isAccountModalOpen && (
        <MarketplaceClientAccountModal
          isOpen={isAccountModalOpen}
          onClose={() => setIsAccountModalOpen(false)}
          onLogout={handleLogout}
        />
      )}
    </>
  );

  // If a specific store view is requested
  if (selectedStoreForView) {
    return (
      <>
        <MarketplaceStoreView
          store={selectedStoreForView}
          products={visibleProducts}
          currentCity={currentCity}
          currentCommune={currentCommune}
          favoriteProductIds={favoriteProductIds}
          cartCount={totalCartCount}
          unreadMessagesCount={customerUnreadCount}
          onToggleFavorite={handleToggleFavorite}
          onAddToCart={handleAddToCart}
          onBuyNow={handleBuyNow}
          onOpenProductDetail={(prod) => setSelectedProductForDetail(prod)}
          onOpenChat={(st, pr) => handleOpenChat(pr || st, st)}
          onOpenLiveStream={(st) => {
            const live = liveSessions.find(l => l.storeId === st.id) || {
              id: `live-${st.id}`,
              storeId: st.id,
              storeName: st.name,
              storeCity: st.city || 'Conakry',
              storeLogoUrl: st.logoUrl || st.settings?.branding?.logoUrl,
              title: `🔴 Live Shopping & Démonstration en Direct - ${st.name}`,
              viewerCount: 115,
              startedAt: new Date(Date.now() - 900000).toISOString(),
              isActive: true,
              featuredProductIds: products.filter(p => p.tenantId === st.id).slice(0, 3).map(p => p.id),
              comments: [
                { id: 'cl1', userName: 'Client vérifié', userCity: 'Conakry', message: 'Bonjour, les articles présentés sont-ils disponibles ?', timestamp: '15:05' },
                { id: 'cl2', userName: st.responsibleName || st.name, userCity: st.city || 'Conakry', message: 'Bienvenue sur notre direct ! Tout est en stock et livrable immédiatement.', timestamp: '15:06', isSeller: true }
              ]
            };
            setActiveLiveSession(live);
          }}
          onOpenCart={() => setIsCartOpen(true)}
          onOpenOrders={() => {
            if (!isAuthenticated && !currentUser) {
              handleRequireAuth("consulter vos commandes", () => setIsOrdersModalOpen(true));
            } else {
              setIsOrdersModalOpen(true);
            }
          }}
          onOpenMessaging={() => {
            if (!isAuthenticated && !currentUser) {
              handleRequireAuth("accéder à vos messages", () => setIsMessagingOpen(true));
            } else {
              setIsMessagingOpen(true);
            }
          }}
          onOpenWishlist={() => {
            if (!isAuthenticated && !currentUser) {
              handleRequireAuth("consulter vos favoris", () => setIsWishlistOpen(true));
            } else {
              setIsWishlistOpen(true);
            }
          }}
          onBackToMarketplace={() => setSelectedStoreForView(null)}
        />
        {renderSharedModals()}
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col selection:bg-red-500 selection:text-white font-sans max-w-full overflow-x-hidden">
      
      {/* Guinean Tricolor accent top strip */}
      <div className="h-1.5 w-full flex shrink-0">
        <div className="flex-1 bg-red-600" />
        <div className="flex-1 bg-amber-400" />
        <div className="flex-1 bg-emerald-600" />
      </div>

      {/* Main Header */}
      <MarketplaceHeader
        currentCity={currentCity}
        currentCommune={currentCommune}
        currentUser={currentUser}
        onLogout={handleLogout}
        onSelectLocation={(city, commune) => {
          setCurrentCity(city);
          setCurrentCommune(commune);
        }}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSearchSubmit={() => {}}
        wishlistCount={favoriteProductIds.length}
        cartCount={totalCartCount}
        unreadMessagesCount={customerUnreadCount}
        onOpenWishlist={() => {
          if (!isAuthenticated && !currentUser) {
            handleRequireAuth('consulter vos articles favoris', () => setIsWishlistOpen(true));
          } else {
            setIsWishlistOpen(true);
          }
        }}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenMessaging={() => {
          if (!isAuthenticated && !currentUser) {
            handleRequireAuth('accéder à vos messages vendeurs', () => setIsMessagingOpen(true));
          } else {
            setIsMessagingOpen(true);
          }
        }}
        onOpenOrders={() => {
          if (!isAuthenticated && !currentUser) {
            handleRequireAuth("consulter l'historique et le suivi de vos commandes", () => setIsOrdersModalOpen(true));
          } else {
            setIsOrdersModalOpen(true);
          }
        }}
        onOpenAccount={() => setIsAccountModalOpen(true)}
        onOpenLogin={(mode) => {
          if (mode === 'CLIENT') {
            setAuthModalState({
              isOpen: true,
              initialMode: 'LOGIN',
              pendingActionDesc: 'accéder à votre compte client'
            });
          } else {
            onOpenLogin(mode);
          }
        }}
        onOpenRegister={() => {
          setAuthModalState({
            isOpen: true,
            initialMode: 'REGISTER',
            pendingActionDesc: 'créer votre compte client'
          });
        }}
        onOpenRegisterStore={handleOpenCreateStore}
        onNavigateSection={setActiveNavSection}
        activeNavSection={activeNavSection}
      />

      {/* HERO BANNER - Luminous, Modern Guinean Marketplace Experience */}
      <section className="relative overflow-hidden bg-gradient-to-br from-white via-slate-50 to-amber-50/30 border-b border-slate-200 py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            {/* Left Hero Text */}
            <div className="lg:col-span-7 space-y-6">
              
              <div className="inline-flex items-center gap-2 bg-white border border-slate-200 shadow-sm px-4 py-1.5 rounded-full text-xs font-black">
                <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse" />
                <span className="text-red-600 font-black">GUINÉE BOUTIQUES</span>
                <span className="text-slate-300">•</span>
                <span className="text-emerald-700">Marketplace Nationale Officielle</span>
              </div>

              <h1 className="text-3xl sm:text-5xl font-black text-slate-950 leading-tight tracking-tight">
                Achetez et Vendez au Meilleur Prix <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-600 via-amber-500 to-emerald-600">Partout en Guinée</span>
              </h1>

              <p className="text-sm sm:text-base text-slate-600 max-w-xl leading-relaxed">
                Découvrez des milliers d'articles au détail et en gros, visitez les boutiques vérifiées de Conakry et de l'intérieur, échangez en direct avec les commerçants et commandez 24h/24.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  onClick={() => {
                    const el = document.getElementById('marketplace-catalog');
                    el?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="py-3.5 px-6 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-black text-xs sm:text-sm shadow-xl shadow-red-600/20 hover:scale-105 transition-all flex items-center gap-2"
                >
                  <ShoppingBag className="w-4 h-4 text-amber-300" />
                  <span>Explorer les Rayons</span>
                </button>

                <button
                  onClick={handleOpenCreateStore}
                  className="py-3.5 px-6 rounded-2xl bg-white hover:bg-slate-50 text-slate-900 font-extrabold text-xs sm:text-sm border border-slate-300 hover:border-amber-400 transition-all flex items-center gap-2 shadow-sm"
                >
                  <Store className="w-4 h-4 text-amber-500" />
                  <span>Créer ma boutique</span>
                </button>
              </div>

              {/* Guinean Guarantees Strip */}
              <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-200 text-xs">
                <div className="flex items-center gap-2 text-slate-700 font-bold">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Boutiques Vérifiées</span>
                </div>
                <div className="flex items-center gap-2 text-slate-700 font-bold">
                  <Truck className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>Conakry & Régions</span>
                </div>
                <div className="flex items-center gap-2 text-slate-700 font-bold">
                  <MessageSquare className="w-4 h-4 text-red-600 shrink-0" />
                  <span>Contact Direct</span>
                </div>
              </div>

            </div>

            {/* Right Live Stream Teaser & Featured Card */}
            <div className="lg:col-span-5 space-y-4">
              {liveSessions.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xl relative overflow-hidden">
                  <div className="flex items-center justify-between mb-4">
                    <span className="flex items-center gap-2 text-xs font-black text-red-600 bg-red-50 border border-red-200 px-3 py-1 rounded-full uppercase tracking-wider">
                      <span className="w-2 h-2 rounded-full bg-red-600 animate-ping" />
                      EN DIRECT
                    </span>
                    <span className="text-xs text-slate-500 flex items-center gap-1 font-bold">
                      <Radio className="w-3.5 h-3.5 text-red-600 animate-pulse" />
                      {liveSessions[0].viewerCount} spectateurs
                    </span>
                  </div>

                  <h3 className="text-base font-black text-slate-900 mb-3 line-clamp-2">
                    {liveSessions[0].title}
                  </h3>

                  <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-slate-50 border border-slate-200 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center font-bold text-amber-500 text-sm overflow-hidden shrink-0 shadow-sm border border-slate-200">
                      {liveSessions[0].storeLogoUrl ? (
                        <img src={liveSessions[0].storeLogoUrl} alt={liveSessions[0].storeName} className="w-full h-full object-cover" />
                      ) : (
                        <Store className="w-6 h-6" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-black text-slate-900 truncate">{liveSessions[0].storeName}</div>
                      <div className="text-[11px] text-slate-500 font-semibold flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-amber-500" />
                        {liveSessions[0].storeCity}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setActiveLiveSession(liveSessions[0])}
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-red-600 via-amber-500 to-amber-600 hover:from-red-700 hover:to-amber-700 text-white font-black text-xs sm:text-sm shadow-lg shadow-red-600/20 flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
                  >
                    <Video className="w-4 h-4 text-white" />
                    <span>Rejoindre le Live</span>
                  </button>
                </div>
              )}
            </div>

          </div>

        </div>
      </section>

      {/* MAIN CONTENT AREA */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12 w-full" id="marketplace-catalog">
        
        {/* 21 GLOBAL CATEGORIES BROWSER */}
        <section className="space-y-4" id="marketplace-categories">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 text-xs font-black text-amber-600 uppercase tracking-wider">
                <Layers className="w-4 h-4" />
                <span>Rayons & Catégories</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-950">
                {showAllCategories ? 'Les 21 Catégories Officielles' : 'Catégories Principales'}
              </h2>
            </div>

            <div className="flex items-center gap-2">
              {selectedCategoryFilter !== 'ALL' && (
                <button
                  onClick={() => setSelectedCategoryFilter('ALL')}
                  className="text-xs font-bold text-slate-600 hover:text-slate-950 flex items-center gap-1 bg-white border border-slate-200 px-3 py-2 rounded-xl transition-colors shadow-sm"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Réinitialiser</span>
                </button>
              )}

              <button
                onClick={() => setShowAllCategories(!showAllCategories)}
                className={`text-xs font-black flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all shadow-sm ${
                  showAllCategories
                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200'
                    : 'bg-amber-400 hover:bg-amber-500 text-slate-950 border border-amber-300'
                }`}
              >
                <span>{showAllCategories ? 'Afficher moins' : 'Afficher plus (21)'}</span>
                {showAllCategories ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {!showAllCategories ? (
            /* COLLAPSED VIEW: 3 Categories + 1 "Afficher plus" Card */
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {GLOBAL_MARKETPLACE_CATEGORIES.slice(0, 3).map(cat => {
                const isSelected = selectedCategoryFilter === cat.name;
                const countInCat = visibleProducts.filter(p => 
                  p.category.toLowerCase().includes(cat.name.toLowerCase()) || 
                  (p.subcategory && p.subcategory.toLowerCase().includes(cat.name.toLowerCase()))
                ).length;

                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategoryFilter(isSelected ? 'ALL' : cat.name)}
                    className={`p-3.5 rounded-2xl border text-left transition-all group flex flex-col justify-between min-h-[95px] relative overflow-hidden ${
                      isSelected 
                        ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-400/30 shadow-md' 
                        : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50 shadow-sm'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-2xl">{cat.icon}</span>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                        isSelected ? 'bg-amber-400 text-slate-950' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {countInCat}
                      </span>
                    </div>

                    <div className="mt-2">
                      <h4 className={`text-xs sm:text-sm font-bold line-clamp-2 leading-tight ${isSelected ? 'text-amber-800' : 'text-slate-800 group-hover:text-slate-950'}`}>
                        {cat.name}
                      </h4>
                    </div>
                  </button>
                );
              })}

              {/* "Afficher plus" Card beside the 3 categories */}
              <button
                onClick={() => setShowAllCategories(true)}
                className="p-3.5 rounded-2xl border-2 border-dashed border-amber-300 hover:border-amber-500 bg-amber-50/70 hover:bg-amber-100/90 text-amber-950 transition-all flex flex-col items-center justify-center gap-1.5 text-center shadow-sm min-h-[95px] group cursor-pointer"
                title="Afficher toutes les 21 catégories"
              >
                <div className="w-8 h-8 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                  <ChevronDown className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-black text-amber-900 leading-tight">Afficher plus</p>
                  <p className="text-[10px] text-amber-700 font-bold">+{GLOBAL_MARKETPLACE_CATEGORIES.length - 3} catégories</p>
                </div>
              </button>
            </div>
          ) : (
            /* EXPANDED VIEW: All 21 Categories */
            <div className="space-y-3 animate-in fade-in duration-200">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2.5">
                {GLOBAL_MARKETPLACE_CATEGORIES.map(cat => {
                  const isSelected = selectedCategoryFilter === cat.name;
                  const countInCat = visibleProducts.filter(p => 
                    p.category.toLowerCase().includes(cat.name.toLowerCase()) || 
                    (p.subcategory && p.subcategory.toLowerCase().includes(cat.name.toLowerCase()))
                  ).length;

                  return (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategoryFilter(isSelected ? 'ALL' : cat.name)}
                      className={`p-3 rounded-2xl border text-left transition-all group flex flex-col justify-between min-h-[95px] relative overflow-hidden ${
                        isSelected 
                          ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-400/30 shadow-md' 
                          : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50 shadow-sm'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-xl">{cat.icon}</span>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                          isSelected ? 'bg-amber-400 text-slate-950' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {countInCat}
                        </span>
                      </div>

                      <div className="mt-2">
                        <h4 className={`text-xs font-bold line-clamp-2 leading-tight ${isSelected ? 'text-amber-800' : 'text-slate-800 group-hover:text-slate-950'}`}>
                          {cat.name}
                        </h4>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="flex justify-center pt-2">
                <button
                  onClick={() => setShowAllCategories(false)}
                  className="text-xs font-bold text-slate-600 hover:text-slate-950 flex items-center gap-1.5 px-4 py-1.5 rounded-full hover:bg-slate-100 border border-slate-200 transition-colors shadow-sm"
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                  <span>Afficher moins de catégories</span>
                </button>
              </div>
            </div>
          )}
        </section>

        {/* SEARCH & FILTERS BAR */}
        <section className="bg-white border border-slate-200 p-4 rounded-3xl shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-3.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Rechercher par article, marque, ville ou boutique..."
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-11 pr-4 py-2.5 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-400 focus:bg-white"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
            <span className="text-xs font-extrabold text-slate-600 shrink-0">
              {filteredProducts.length} article(s) trouvé(s)
            </span>
          </div>
        </section>

        {/* PRODUCTS CATALOG SECTION */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-black text-red-600 uppercase tracking-wider mb-0.5">
                <Flame className="w-4 h-4 text-red-600" />
                <span>Articles Disponibles</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-950">
                {selectedCategoryFilter === 'ALL' ? 'Tous les Articles Récents' : `Rayon : ${selectedCategoryFilter}`}
              </h2>
            </div>
          </div>

          {filteredProducts.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-white border border-slate-200 space-y-3 shadow-sm">
              <Package className="w-12 h-12 text-slate-400 mx-auto" />
              <h4 className="text-base font-bold text-slate-800">Aucun produit trouvé</h4>
              <p className="text-xs text-slate-500">Essayez d'ajuster votre recherche ou sélectionnez une autre catégorie.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-3 sm:gap-6">
              {filteredProducts.map(product => {
                const store = activeTenantsMap.get(product.tenantId);
                const storeName = store?.name || 'Boutique Partenaire';
                const storeCityName = store?.city || 'Conakry';
                const isFavorite = favoriteProductIds.includes(product.id);
                const publicPrice = product.publicPrice || product.salePrice || product.costPrice || 0;
                const publicUnit = product.publicUnit || product.defaultSaleUnit || product.baseUnit || product.unit || 'Unité';
                const mainImage = (product.images && product.images[0]) || product.imageUrl || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300&auto=format&fit=crop&q=80';

                return (
                  <div
                    key={product.id}
                    className="group rounded-3xl bg-white border border-slate-200 hover:border-amber-400 transition-all duration-300 overflow-hidden flex flex-col justify-between shadow-sm hover:shadow-xl"
                  >
                    {/* Image & Badges */}
                    <div className="relative aspect-square bg-slate-100 overflow-hidden cursor-pointer" onClick={() => setSelectedProductForDetail(product)}>
                      <img
                        src={mainImage}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />

                      {/* Store Badge */}
                      <div className="absolute top-2.5 left-2.5 bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-full border border-slate-200 flex items-center gap-1.5 text-[10px] font-bold text-slate-900 shadow-sm">
                        <Store className="w-3 h-3 text-amber-500" />
                        <span className="truncate max-w-[100px]">{storeName}</span>
                      </div>

                      {/* Favorite Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleFavorite(product);
                        }}
                        className={`absolute top-2.5 right-2.5 p-2 rounded-full backdrop-blur-md transition-colors ${
                          isFavorite 
                            ? 'bg-red-600 text-white shadow-sm' 
                            : 'bg-white/80 hover:bg-white text-slate-600 hover:text-red-600 border border-slate-200 shadow-sm'
                        }`}
                      >
                        <Heart className="w-3.5 h-3.5 fill-current" />
                      </button>

                      {/* City Pill */}
                      <div className="absolute bottom-2.5 left-2.5 bg-slate-900/80 backdrop-blur-md px-2.5 py-0.5 rounded-lg text-[10px] font-extrabold text-amber-300 border border-slate-800 flex items-center gap-1">
                        <MapPin className="w-2.5 h-2.5" />
                        <span>{storeCityName}</span>
                      </div>
                    </div>

                    {/* Content & Action Buttons */}
                    <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                      <div className="space-y-1">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-600 block truncate">
                          {product.category}
                        </span>

                        <h3
                          onClick={() => setSelectedProductForDetail(product)}
                          className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-red-600 transition-colors line-clamp-2 cursor-pointer leading-tight"
                        >
                          {product.name}
                        </h3>

                        {/* Verified badge */}
                        <div className="pt-0.5">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[9px] font-extrabold text-emerald-700">
                            <ShieldCheck className="w-2.5 h-2.5 text-emerald-600" />
                            <span>Boutique vérifiée</span>
                          </span>
                        </div>

                        {/* Price */}
                        <div className="pt-1 flex items-baseline flex-wrap">
                          <span className="text-sm sm:text-base font-black text-slate-900">
                            {publicPrice.toLocaleString('fr-FR')} GNF
                          </span>
                          <span className="text-[10px] text-slate-500 ml-1 font-semibold">/ {publicUnit}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-2">
                        <button onClick={() => handleAddToCart(product, 1)} className="py-2.5 px-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-[11px] border border-slate-200 transition-colors">
                          + Panier
                        </button>
                        <button onClick={() => handleBuyNow(product, 1)} className="py-2.5 px-2 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-black text-[11px] shadow-md shadow-red-600/20 transition-all">
                          Acheter
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* POPULAR VERIFIED STORES SECTION */}
        <section className="space-y-6 pt-6 border-t border-slate-200" id="marketplace-stores">
          <div className="flex items-center justify-between">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-black text-emerald-700 uppercase tracking-wider mb-0.5">
                <ShieldCheck className="w-4 h-4" />
                <span>Commerces Agréés</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-950">
                Boutiques Partenaires de Confiance
              </h2>
            </div>
            
            <button
              onClick={handleOpenCreateStore}
              className="text-xs text-amber-700 hover:underline font-extrabold"
            >
              + Créer ma boutique
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {verifiedStoresList.map(st => {
              const storeProds = visibleProducts.filter(p => p.tenantId === st.id);

              return (
                <div
                  key={st.id}
                  className="p-5 rounded-3xl bg-white border border-slate-200 hover:border-amber-400 transition-all shadow-sm hover:shadow-xl flex flex-col justify-between space-y-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-slate-100 text-amber-500 flex items-center justify-center border border-slate-200 font-black text-lg overflow-hidden shrink-0">
                      {st.logoUrl ? (
                        <img src={st.logoUrl} alt={st.name} className="w-full h-full object-cover" />
                      ) : (
                        <Store className="w-7 h-7" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="text-sm font-black text-slate-900 truncate">{st.name}</h4>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[10px] font-extrabold text-emerald-700">
                          <ShieldCheck className="w-3 h-3 text-emerald-600" />
                          <span>Vérifiée</span>
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 flex items-center gap-2 mt-0.5 font-semibold">
                        <span className="text-amber-700 font-extrabold">📍 {st.city || 'Conakry'}</span>
                        <span>•</span>
                        <span>{storeProds.length} articles</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                    <span className="font-extrabold text-emerald-700 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span>En ligne</span>
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenChat(st)}
                        className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-emerald-700 transition-colors"
                        title="Discuter"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </button>
                      
                      <button
                        onClick={() => setSelectedStoreForView(st)}
                        className="py-2 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs transition-all shadow-sm"
                      >
                        Visiter la boutique
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

      </main>

      {/* FOOTER */}
      <MarketplaceFooter 
        onNavigateSection={setActiveNavSection}
        onOpenRegisterStore={() => setIsRegisterStoreOpen(true)}
        onOpenLogin={onOpenLogin}
        onOpenOrders={() => {
          if (!isAuthenticated && !currentUser) {
            handleRequireAuth("consulter l'historique et le suivi de vos commandes", () => setIsOrdersModalOpen(true));
          } else {
            setIsOrdersModalOpen(true);
          }
        }}
        onOpenMessaging={() => {
          if (!isAuthenticated && !currentUser) {
            handleRequireAuth('accéder à vos messages vendeurs', () => setIsMessagingOpen(true));
          } else {
            setIsMessagingOpen(true);
          }
        }}
      />

      {/* FLOATING ACTION BAR FOR MOBILE / DESKTOP (CART & CHAT) */}
      <div className="fixed bottom-4 right-4 z-40 flex items-center gap-2.5">
        <button
          onClick={() => {
            if (!isAuthenticated && !currentUser) {
              handleRequireAuth('accéder à votre messagerie', () => setIsMessagingOpen(true));
            } else {
              setIsMessagingOpen(true);
            }
          }}
          className="p-3.5 rounded-full bg-slate-900 text-emerald-400 hover:text-white hover:bg-emerald-600 shadow-xl transition-all relative flex items-center justify-center border border-slate-700"
          title="Messagerie Directe"
        >
          <MessageSquare className="w-5 h-5" />
          <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-400 ring-2 ring-white" />
        </button>

        <button
          onClick={() => setIsCartOpen(true)}
          className="py-3 px-5 rounded-full bg-red-600 hover:bg-red-700 text-white font-black text-xs shadow-2xl shadow-red-600/30 hover:scale-105 transition-all flex items-center gap-2"
        >
          <ShoppingBag className="w-4 h-4 text-amber-300" />
          <span>Mon Panier</span>
          {totalCartCount > 0 && (
            <span className="bg-amber-400 text-slate-950 font-black px-2 py-0.5 rounded-full text-[11px]">
              {totalCartCount}
            </span>
          )}
        </button>
      </div>

      {/* MODALS */}
      {renderSharedModals()}

    </div>
  );
};
