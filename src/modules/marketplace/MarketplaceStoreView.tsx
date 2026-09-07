import React, { useState } from 'react';
import { 
  Store, MapPin, Phone, Mail, Star, ShieldCheck, 
  ArrowLeft, Search, MessageSquare, Heart, ShoppingBag, 
  Package, Award, CheckCircle2, ChevronRight
} from 'lucide-react';
import { Tenant, Product } from '../../types';
import { GuineanCity } from './types';

interface MarketplaceStoreViewProps {
  store: Tenant;
  products: Product[];
  currentCity: GuineanCity;
  favoriteProductIds: string[];
  onToggleFavorite: (product: Product) => void;
  onAddToCart: (product: Product, quantity: number) => void;
  onOpenProductDetail: (product: Product) => void;
  onOpenChat: (store: Tenant) => void;
  onBackToMarketplace: () => void;
}

export const MarketplaceStoreView: React.FC<MarketplaceStoreViewProps> = ({
  store,
  products,
  currentCity,
  favoriteProductIds,
  onToggleFavorite,
  onAddToCart,
  onOpenProductDetail,
  onOpenChat,
  onBackToMarketplace
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  const storeCity = store.city || 'Conakry';
  const isNearby = storeCity.toLowerCase() === currentCity.toLowerCase();
  const storeRating = 4.8;
  const storeReviewsCount = 48;

  // Filter store products
  const storeProducts = products.filter(p => {
    const matchesQuery = !searchQuery || 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = selectedCategory === 'ALL' || p.category === selectedCategory;
    return matchesQuery && matchesCat;
  });

  // Extract store categories
  const categories = ['ALL', ...Array.from(new Set(products.map(p => p.category)))];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-20">
      
      {/* Top Store Banner Header with Guinea Accent */}
      <div className="h-1.5 w-full flex">
        <div className="flex-1 bg-red-600" />
        <div className="flex-1 bg-yellow-400" />
        <div className="flex-1 bg-emerald-600" />
      </div>

      <div className="relative bg-slate-950 border-b border-slate-800 py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-6">
          
          {/* Back button */}
          <button
            onClick={onBackToMarketplace}
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 px-3.5 py-2 rounded-xl border border-slate-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>← Retour à l'accueil Marketplace</span>
          </button>

          {/* Store Profile Card */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 bg-slate-900/90 backdrop-blur-md p-6 sm:p-8 rounded-3xl border border-slate-800 shadow-2xl">
            <div className="flex items-center gap-5">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-slate-950 text-yellow-400 flex items-center justify-center font-black text-2xl shadow-xl border border-slate-800 shrink-0 overflow-hidden">
                {store.logoUrl ? (
                  <img src={store.logoUrl} alt={store.name} className="w-full h-full object-cover" />
                ) : (
                  <Store className="w-10 h-10" />
                )}
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-black text-white">{store.name}</h1>
                  <span className="inline-flex items-center gap-1 bg-emerald-500/15 text-emerald-400 font-bold text-xs px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                    <ShieldCheck className="w-3.5 h-3.5" /> Boutique Vérifiée
                  </span>
                  {isNearby && (
                    <span className="bg-emerald-600/20 text-emerald-300 font-bold text-xs px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                      📍 Dans votre ville ({storeCity})
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-300 flex items-center gap-3 flex-wrap">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                    <strong className="text-yellow-400">{storeCity}</strong> {store.address ? `• ${store.address}` : ''}
                  </span>
                  {store.phone && (
                    <span className="flex items-center gap-1 text-slate-400">
                      <Phone className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{store.phone}</span>
                    </span>
                  )}
                </p>

                {store.slogan && (
                  <p className="text-xs text-slate-400 italic">« {store.slogan} »</p>
                )}
              </div>
            </div>

            {/* Quick Actions & Store Stats */}
            <div className="flex flex-row md:flex-col items-center md:items-end justify-between w-full md:w-auto gap-4 pt-4 md:pt-0 border-t md:border-t-0 border-slate-800">
              <div className="text-left md:text-right">
                <div className="flex items-center gap-1.5 text-yellow-400 font-black text-base">
                  <Star className="w-5 h-5 fill-current" />
                  <span>{storeRating} / 5</span>
                </div>
                <span className="text-xs text-slate-400">{storeReviewsCount} évaluations clients</span>
              </div>

              <button
                onClick={() => onOpenChat(store)}
                className="py-2.5 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 flex items-center gap-2 transition-all"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Discuter avec le vendeur</span>
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        
        {/* Search & Category Filter Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/90 p-4 rounded-2xl border border-slate-800">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher dans cette boutique..."
              className="w-full bg-slate-950 text-white text-xs pl-10 pr-4 py-2.5 rounded-xl border border-slate-700 focus:border-red-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap border ${
                  selectedCategory === cat
                    ? 'bg-yellow-400 text-slate-950 border-yellow-400 shadow-sm'
                    : 'bg-slate-950 text-slate-400 hover:text-white border-slate-800'
                }`}
              >
                {cat === 'ALL' ? 'Tous les articles' : cat}
              </button>
            ))}
          </div>
        </div>

        {/* Store Catalog Grid */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-white">
              Catalogue de la boutique ({storeProducts.length} article{storeProducts.length > 1 ? 's' : ''})
            </h2>
          </div>

          {storeProducts.length === 0 ? (
            <div className="p-12 text-center bg-slate-900/50 rounded-3xl border border-slate-800 space-y-3">
              <Package className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="text-sm font-bold text-slate-300">Aucun produit ne correspond à votre recherche.</p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('ALL');
                }}
                className="text-xs text-yellow-400 hover:underline font-semibold"
              >
                Réinitialiser les filtres
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
              {storeProducts.map((product) => {
                const isFav = favoriteProductIds.includes(product.id);
                const price = product.salePrice || product.costPrice || 0;

                return (
                  <div
                    key={product.id}
                    className="group bg-slate-900 rounded-2xl border border-slate-800 hover:border-yellow-500/40 overflow-hidden shadow-lg transition-all flex flex-col justify-between"
                  >
                    <div className="relative aspect-square overflow-hidden bg-slate-950">
                      <img
                        src={product.imageUrl || 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=400&auto=format&fit=crop&q=80'}
                        alt={product.name}
                        onClick={() => onOpenProductDetail(product)}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 cursor-pointer"
                      />

                      <button
                        onClick={() => onToggleFavorite(product)}
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
                        <span className="text-[10px] text-yellow-400 font-bold uppercase">{product.category}</span>
                        <h3 
                          onClick={() => onOpenProductDetail(product)}
                          className="text-xs sm:text-sm font-bold text-white group-hover:text-yellow-400 transition-colors line-clamp-2 cursor-pointer leading-tight"
                        >
                          {product.name}
                        </h3>
                      </div>

                      <div className="pt-2 border-t border-slate-800 flex items-end justify-between gap-2">
                        <div>
                          <span className="text-[10px] text-slate-500 block uppercase">Prix</span>
                          <p className="text-sm font-black text-yellow-400">
                            {price.toLocaleString('fr-FR')} <span className="text-[11px] font-normal text-slate-400">GNF</span>
                          </p>
                        </div>

                        <button
                          onClick={() => onAddToCart(product, 1)}
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
        </div>

      </main>

    </div>
  );
};
