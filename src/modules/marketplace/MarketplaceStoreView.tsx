import React, { useState } from 'react';
import { 
  Store, MapPin, Phone, Mail, Star, ShieldCheck, 
  ArrowLeft, Search, MessageSquare, Heart, ShoppingBag, 
  Package, Award, CheckCircle2, ChevronRight, Radio, 
  Zap, Video, Sparkles, Filter
} from 'lucide-react';
import { Tenant, Product } from '../../types';
import { GuineanCity, ConakryCommune } from './types';
import { MarketplaceProductDetailModal } from './MarketplaceProductDetailModal';

interface MarketplaceStoreViewProps {
  store: Tenant;
  products: Product[];
  currentCity: GuineanCity;
  currentCommune?: ConakryCommune;
  favoriteProductIds: string[];
  cartCount?: number;
  unreadMessagesCount?: number;
  onToggleFavorite: (product: Product) => void;
  onAddToCart: (product: Product, quantity: number) => void;
  onBuyNow?: (product: Product, quantity: number) => void;
  onOpenProductDetail?: (product: Product) => void;
  onOpenChat: (store: Tenant, product?: Product) => void;
  onOpenLiveStream?: (store: Tenant) => void;
  onOpenCart?: () => void;
  onOpenOrders?: () => void;
  onOpenMessaging?: () => void;
  onOpenWishlist?: () => void;
  onBackToMarketplace: () => void;
}

export const MarketplaceStoreView: React.FC<MarketplaceStoreViewProps> = ({
  store,
  products,
  currentCity,
  currentCommune,
  favoriteProductIds,
  cartCount = 0,
  unreadMessagesCount = 0,
  onToggleFavorite,
  onAddToCart,
  onBuyNow,
  onOpenProductDetail,
  onOpenChat,
  onOpenLiveStream,
  onOpenCart,
  onOpenOrders,
  onOpenMessaging,
  onOpenWishlist,
  onBackToMarketplace
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [localSelectedProduct, setLocalSelectedProduct] = useState<Product | null>(null);

  const storeCity = store.city || 'Conakry';
  const isNearby = storeCity.toLowerCase() === currentCity.toLowerCase();
  const isOnline = store.isOnline !== false;
  const isLive = store.isLiveStreaming === true || store.id === 't-002';
  const storeRating = 4.8;
  const storeReviewsCount = 48;

  // Filter store products strictly belonging to this tenant
  const storeProducts = products.filter(p => {
    if (p.tenantId !== store.id) return false;
    const matchesQuery = !searchQuery || 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCat = selectedCategory === 'ALL' || p.category === selectedCategory;
    return matchesQuery && matchesCat;
  });

  // Extract store categories (either from store.selectedCategories or from current products)
  const storeCategories = React.useMemo(() => {
    const list = new Set<string>();
    if (store.selectedCategories && store.selectedCategories.length > 0) {
      store.selectedCategories.forEach(c => list.add(c));
    }
    products.filter(p => p.tenantId === store.id).forEach(p => {
      if (p.category) list.add(p.category);
    });
    return ['ALL', ...Array.from(list)];
  }, [store, products]);

  const handleOpenProduct = (product: Product) => {
    setLocalSelectedProduct(product);
    if (onOpenProductDetail) {
      onOpenProductDetail(product);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-28 selection:bg-red-500 selection:text-white max-w-full overflow-x-hidden relative">
      
      {/* Top Store Banner with Guinea Tricolor Accent */}
      <div className="h-1.5 w-full flex shrink-0">
        <div className="flex-1 bg-red-600" />
        <div className="flex-1 bg-amber-400" />
        <div className="flex-1 bg-emerald-600" />
      </div>

      <div className="relative bg-white border-b border-slate-200 py-6 px-4 sm:px-6 lg:px-8 shadow-sm">
        <div className="max-w-7xl mx-auto space-y-5">
          
          {/* Top Bar: Back button + In-store client action shortcuts */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <button
              onClick={onBackToMarketplace}
              className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-950 bg-slate-100 hover:bg-slate-200/80 px-3.5 py-2 rounded-2xl border border-slate-200 transition-colors shadow-sm"
            >
              <ArrowLeft className="w-4 h-4 text-red-600" />
              <span>← Retour à l'accueil Marketplace</span>
            </button>

            {/* In-store Client Tools: Wishlist, Messaging, Orders & Cart */}
            <div className="flex items-center gap-2 flex-wrap">
              {onOpenWishlist && (
                <button
                  onClick={onOpenWishlist}
                  className="p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-red-600 border border-slate-200 transition-colors flex items-center gap-1.5 text-xs font-bold shadow-sm"
                  title="Mes Favoris"
                >
                  <Heart className="w-4 h-4 text-red-500" />
                  <span className="hidden sm:inline">Favoris</span>
                  {favoriteProductIds.length > 0 && (
                    <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.2 rounded-full">
                      {favoriteProductIds.length}
                    </span>
                  )}
                </button>
              )}

              {onOpenMessaging && (
                <button
                  onClick={onOpenMessaging}
                  className="p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-emerald-600 border border-slate-200 transition-colors flex items-center gap-1.5 text-xs font-bold shadow-sm relative"
                  title="Messagerie Directe"
                >
                  <MessageSquare className="w-4 h-4 text-emerald-600" />
                  <span className="hidden sm:inline">Messages</span>
                  {unreadMessagesCount > 0 && (
                    <span className="bg-emerald-600 text-white text-[10px] px-1.5 py-0.2 rounded-full">
                      {unreadMessagesCount}
                    </span>
                  )}
                </button>
              )}

              {onOpenOrders && (
                <button
                  onClick={onOpenOrders}
                  className="p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-950 border border-slate-200 transition-colors flex items-center gap-1.5 text-xs font-bold shadow-sm"
                  title="Suivi de mes commandes"
                >
                  <Package className="w-4 h-4 text-amber-500" />
                  <span className="hidden sm:inline">Mes Commandes</span>
                </button>
              )}

              {onOpenCart && (
                <button
                  onClick={onOpenCart}
                  className="py-2 px-4 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-black text-xs shadow-md shadow-red-600/20 transition-all flex items-center gap-2"
                >
                  <ShoppingBag className="w-4 h-4 text-amber-300" />
                  <span>Mon Panier</span>
                  {cartCount > 0 && (
                    <span className="bg-amber-400 text-slate-950 font-black px-2 py-0.5 rounded-full text-[11px]">
                      {cartCount}
                    </span>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Store Profile Card */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 bg-slate-50 p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-5">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white text-amber-500 flex items-center justify-center font-black text-2xl shadow-md border border-slate-200 shrink-0 overflow-hidden">
                {store.logoUrl ? (
                  <img src={store.logoUrl} alt={store.name} className="w-full h-full object-cover" />
                ) : (
                  <Store className="w-10 h-10 text-amber-500" />
                )}
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-black text-slate-950">{store.name}</h1>
                  <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 font-extrabold text-xs px-2.5 py-0.5 rounded-full border border-emerald-200">
                    <ShieldCheck className="w-3.5 h-3.5" /> Boutique Vérifiée
                  </span>
                  {isNearby && (
                    <span className="bg-emerald-100/80 text-emerald-800 font-bold text-xs px-2.5 py-0.5 rounded-full border border-emerald-300">
                      📍 Dans votre ville ({storeCity})
                    </span>
                  )}
                </div>

                {/* Real-time Status + Location */}
                <div className="flex items-center gap-3 text-xs flex-wrap">
                  {isOnline ? (
                    <span className="inline-flex items-center gap-1.5 font-extrabold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span>🟢 En ligne</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 font-semibold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
                      <span className="w-2 h-2 rounded-full bg-slate-400" />
                      <span>⚪ Hors ligne (Commandes acceptées)</span>
                    </span>
                  )}

                  <span className="flex items-center gap-1 text-slate-600">
                    <MapPin className="w-3.5 h-3.5 text-amber-500" />
                    <strong className="text-slate-900">{storeCity}</strong> {store.address ? `• ${store.address}` : ''}
                  </span>

                  {store.phone && (
                    <span className="flex items-center gap-1 text-slate-600">
                      <Phone className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{store.phone}</span>
                    </span>
                  )}
                </div>

                {store.slogan && (
                  <p className="text-xs text-slate-500 italic">« {store.slogan} »</p>
                )}
              </div>
            </div>

            {/* Quick Actions & Store Stats */}
            <div className="flex flex-row md:flex-col items-center md:items-end justify-between w-full md:w-auto gap-4 pt-4 md:pt-0 border-t md:border-t-0 border-slate-200">
              <div className="text-left md:text-right">
                <div className="flex items-center gap-1.5 text-amber-500 font-black text-base">
                  <Star className="w-5 h-5 fill-current" />
                  <span>{storeRating} / 5</span>
                </div>
                <span className="text-xs text-slate-500 font-medium">{storeReviewsCount} avis vérifiés</span>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {isLive && (
                  <button
                    onClick={() => onOpenLiveStream && onOpenLiveStream(store)}
                    className="py-2.5 px-4 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-black text-xs shadow-md shadow-red-600/20 flex items-center gap-2 transition-all animate-pulse"
                  >
                    <Radio className="w-4 h-4" />
                    <span>EN DIRECT • Rejoindre</span>
                  </button>
                )}

                <button
                  onClick={() => onOpenChat(store)}
                  className="py-2.5 px-5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md shadow-emerald-600/20 flex items-center gap-2 transition-all"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Discuter avec le vendeur</span>
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        
        {/* Search & Category Filter Bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-4 rounded-3xl border border-slate-200 shadow-sm">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher dans cette boutique..."
              className="w-full bg-slate-50 text-slate-900 text-xs pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 focus:border-amber-400 focus:bg-white focus:outline-none transition-all"
            />
          </div>

          {/* Categories Pill Selector */}
          <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 max-w-full">
            {storeCategories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-2xl text-xs font-extrabold shrink-0 transition-all ${
                  selectedCategory === cat
                    ? 'bg-amber-400 text-slate-950 shadow-sm'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                }`}
              >
                {cat === 'ALL' ? 'Tous les articles' : cat}
              </button>
            ))}
          </div>
        </div>

        {/* Dedicated Live Streaming Banner if store is streaming live */}
        {isLive && (
          <div className="bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 text-white p-5 sm:p-6 rounded-3xl shadow-xl border border-red-400/30 flex flex-col md:flex-row items-center justify-between gap-5 relative overflow-hidden">
            <div className="flex items-center gap-4 relative z-10">
              <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shrink-0 border border-white/30 animate-pulse">
                <Video className="w-7 h-7 text-yellow-300" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="bg-red-950/80 text-yellow-300 font-black text-[10px] tracking-wider uppercase px-2.5 py-0.5 rounded-full border border-yellow-400/30 flex items-center gap-1.5 shadow-sm">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                    DIFFUSION VIDÉO EN DIRECT
                  </span>
                  <span className="text-white/80 text-xs font-semibold hidden sm:inline">
                    • Session Live Shopping Active
                  </span>
                </div>
                <h3 className="font-black text-base sm:text-lg text-white">
                  {store.name} est en direct vidéo actuellement
                </h3>
                <p className="text-xs text-red-100 max-w-xl">
                  Accédez au streaming en direct pour assister aux démonstrations, poser vos questions en temps réel et commander directement !
                </p>
              </div>
            </div>
            <button
              onClick={() => onOpenLiveStream && onOpenLiveStream(store)}
              className="shrink-0 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black text-xs sm:text-sm px-6 py-3 rounded-2xl shadow-lg shadow-black/20 hover:shadow-xl transition-all flex items-center gap-2.5 active:scale-95 z-10"
            >
              <Radio className="w-4 h-4 text-red-600 animate-pulse" />
              <span>Rejoindre la Vidéo Directe</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Store Products Grid */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Package className="w-5 h-5 text-amber-500" />
              <span>Articles en rayon ({storeProducts.length})</span>
            </h2>
            <span className="text-xs text-slate-500 font-bold">Prix en Francs Guinéens (GNF)</span>
          </div>

          {storeProducts.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 space-y-3 shadow-sm">
              <Package className="w-12 h-12 text-slate-400 mx-auto" />
              <p className="text-sm font-bold text-slate-700">Aucun produit ne correspond à votre recherche</p>
              <button
                onClick={() => { setSearchQuery(''); setSelectedCategory('ALL'); }}
                className="text-xs text-amber-600 hover:underline font-bold"
              >
                Réinitialiser les filtres
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
              {storeProducts.map(product => {
                const isFavorite = favoriteProductIds.includes(product.id);
                const publicUnit = product.publicUnit || product.defaultSaleUnit || product.baseUnit || 'Unité';
                const publicPrice = product.publicPrice || product.salePrice || product.costPrice || 0;
                const prodImg = (product.images && product.images[0]) || product.imageUrl || '';
                const imagesCount = product.images && product.images.length > 0 
                  ? product.images.filter(img => typeof img === 'string' && img.trim().length > 0).length 
                  : (product.imageUrl ? 1 : 0);

                return (
                  <div 
                    key={product.id}
                    className="bg-white border border-slate-200 hover:border-amber-400 rounded-3xl overflow-hidden transition-all duration-300 hover:shadow-xl flex flex-col justify-between group"
                  >
                    {/* Image Box */}
                    <div className="relative aspect-square overflow-hidden bg-slate-100 flex items-center justify-center">
                      {prodImg ? (
                        <img 
                          src={prodImg} 
                          alt={product.name} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 cursor-pointer"
                          onClick={() => handleOpenProduct(product)}
                        />
                      ) : (
                        <div 
                          className="w-full h-full flex flex-col items-center justify-center bg-slate-100 text-slate-400 gap-1 cursor-pointer"
                          onClick={() => handleOpenProduct(product)}
                        >
                          <Package className="w-10 h-10 group-hover:text-amber-500 transition-colors" />
                          <span className="text-[10px] font-medium text-slate-500">Sans photo</span>
                        </div>
                      )}

                      {/* Favorite Button */}
                      <button
                        onClick={() => onToggleFavorite(product)}
                        className={`absolute top-2.5 right-2.5 p-2 rounded-full backdrop-blur-md transition-all ${
                          isFavorite 
                            ? 'bg-red-600 text-white shadow-sm' 
                            : 'bg-white/80 text-slate-500 hover:text-red-600 hover:bg-white shadow-sm'
                        }`}
                      >
                        <Heart className={`w-3.5 h-3.5 ${isFavorite ? 'fill-current' : ''}`} />
                      </button>

                      {/* Photos count pill */}
                      {imagesCount > 1 && (
                        <span className="absolute bottom-2 left-2 bg-slate-900/80 text-[10px] font-bold text-white px-2 py-0.5 rounded-md backdrop-blur-sm">
                          📷 {imagesCount} photos
                        </span>
                      )}
                    </div>

                    {/* Product Card Details */}
                    <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
                      <div className="space-y-1">
                        <span className="text-[10px] text-amber-600 font-extrabold uppercase tracking-wider block">
                          {product.category || 'Article'}
                        </span>
                        <h3 
                          onClick={() => handleOpenProduct(product)}
                          className="text-xs sm:text-sm font-bold text-slate-900 line-clamp-2 hover:text-red-600 cursor-pointer transition-colors"
                        >
                          {product.name}
                        </h3>
                      </div>

                      {/* Price & Public Unit */}
                      <div className="pt-2 border-t border-slate-100 flex items-baseline justify-between">
                        <div>
                          <span className="text-sm sm:text-base font-black text-slate-900">
                            {publicPrice.toLocaleString('fr-FR')} GNF
                          </span>
                          <span className="text-[10px] text-slate-500 ml-1 font-semibold">/ {publicUnit}</span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="grid grid-cols-2 gap-2 pt-2">
                        <button
                          onClick={() => onAddToCart(product, 1)}
                          className="py-2.5 px-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs border border-slate-200 flex items-center justify-center gap-1 transition-colors"
                        >
                          <ShoppingBag className="w-3.5 h-3.5" />
                          <span>+ Panier</span>
                        </button>

                        <button
                          onClick={() => onBuyNow ? onBuyNow(product, 1) : handleOpenProduct(product)}
                          className="py-2.5 px-2 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-black text-xs shadow-md shadow-red-600/20 flex items-center justify-center gap-1 transition-colors"
                        >
                          <Zap className="w-3.5 h-3.5" />
                          <span>Acheter</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </main>

      {/* Floating Bottom Quick Action Bar */}
      <div className="fixed bottom-6 right-6 z-40 flex items-center gap-3">
        {onOpenMessaging && (
          <button
            onClick={onOpenMessaging}
            className="p-3.5 rounded-full bg-slate-900 text-emerald-400 hover:text-white hover:bg-emerald-600 shadow-xl transition-all relative flex items-center justify-center border border-slate-700"
            title="Messagerie Directe"
          >
            <MessageSquare className="w-5 h-5" />
            {unreadMessagesCount > 0 && (
              <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-400 ring-2 ring-white" />
            )}
          </button>
        )}

        {onOpenCart && (
          <button
            onClick={onOpenCart}
            className="py-3 px-5 rounded-full bg-red-600 hover:bg-red-700 text-white font-black text-xs shadow-2xl shadow-red-600/30 hover:scale-105 transition-all flex items-center gap-2"
          >
            <ShoppingBag className="w-4 h-4 text-amber-300" />
            <span>Mon Panier</span>
            {cartCount > 0 && (
              <span className="bg-amber-400 text-slate-950 font-black px-2 py-0.5 rounded-full text-[11px]">
                {cartCount}
              </span>
            )}
          </button>
        )}
      </div>

      {/* In-Store Product Detail Modal */}
      {localSelectedProduct && (
        <MarketplaceProductDetailModal
          product={localSelectedProduct}
          store={store}
          storeOtherProducts={products.filter(p => p.tenantId === store.id && p.id !== localSelectedProduct.id)}
          currentCity={currentCity}
          currentCommune={currentCommune}
          isFavorite={favoriteProductIds.includes(localSelectedProduct.id)}
          onToggleFavorite={onToggleFavorite}
          onAddToCart={onAddToCart}
          onBuyNow={(prod, q) => {
            if (onBuyNow) onBuyNow(prod, q);
          }}
          onOpenChat={(prod, st) => onOpenChat(st, prod)}
          onOpenStoreView={() => {}}
          onSelectOtherProduct={(other) => setLocalSelectedProduct(other)}
          onOpenLiveStream={onOpenLiveStream}
          onClose={() => setLocalSelectedProduct(null)}
        />
      )}
    </div>
  );
};
