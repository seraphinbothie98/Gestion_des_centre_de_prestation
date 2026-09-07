import React, { useState } from 'react';
import { 
  X, MapPin, Store, Star, ShoppingBag, Zap, 
  MessageSquare, Heart, ShieldCheck, Truck, Check, 
  Package, Info, ArrowRight, Share2
} from 'lucide-react';
import { Product, Tenant } from '../../types';
import { GuineanCity, ConakryCommune } from './types';

interface MarketplaceProductDetailModalProps {
  product: Product;
  store: Tenant;
  currentCity: GuineanCity;
  currentCommune?: ConakryCommune;
  isFavorite: boolean;
  onToggleFavorite: (product: Product) => void;
  onAddToCart: (product: Product, quantity: number) => void;
  onBuyNow: (product: Product, quantity: number) => void;
  onOpenChat: (product: Product, store: Tenant) => void;
  onOpenStoreView: (store: Tenant) => void;
  onClose: () => void;
}

export const MarketplaceProductDetailModal: React.FC<MarketplaceProductDetailModalProps> = ({
  product,
  store,
  currentCity,
  currentCommune,
  isFavorite,
  onToggleFavorite,
  onAddToCart,
  onBuyNow,
  onOpenChat,
  onOpenStoreView,
  onClose
}) => {
  const [quantity, setQuantity] = useState(1);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [addedToast, setAddedToast] = useState(false);

  // Derive store location and proximity
  const storeCity = store.city || 'Conakry';
  const isNearby = storeCity.toLowerCase() === currentCity.toLowerCase();
  const storeRating = 4.8;
  const storeReviewsCount = 42;

  // Stock availability
  const availableStock = product.currentStock || 10;
  const unitLabel = product.defaultSaleUnit || product.baseUnit || product.unit || 'unité';
  const unitPrice = product.salePrice || product.costPrice || 0;

  // Mock product images gallery
  const images = [
    product.imageUrl || 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=600&auto=format&fit=crop&q=80'
  ];

  const handleAddToCartClick = () => {
    onAddToCart(product, quantity);
    setAddedToast(true);
    setTimeout(() => setAddedToast(false), 2000);
  };

  const handleBuyNowClick = () => {
    onBuyNow(product, quantity);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[92vh] overflow-y-auto shadow-2xl relative my-auto">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 rounded-full bg-slate-950/70 hover:bg-slate-800 text-slate-400 hover:text-white transition-all shadow-md"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 p-6 sm:p-8">
          
          {/* Left: Product Images Gallery */}
          <div className="space-y-4">
            <div className="relative aspect-square rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center group">
              <img 
                src={images[selectedImageIndex] || images[0]} 
                alt={product.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />

              {/* Badges */}
              <div className="absolute top-3 left-3 flex flex-col gap-1.5">
                {isNearby ? (
                  <span className="inline-flex items-center gap-1 bg-emerald-600 text-white font-black text-xs px-2.5 py-1 rounded-full shadow-lg backdrop-blur-sm">
                    <MapPin className="w-3.5 h-3.5" /> Près de vous ({storeCity})
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 bg-slate-900/95 text-yellow-300 border border-yellow-500/40 font-bold text-xs px-2.5 py-1 rounded-full shadow-lg backdrop-blur-sm">
                    <MapPin className="w-3.5 h-3.5 text-yellow-400" /> {storeCity}
                  </span>
                )}
                <span className="inline-flex items-center gap-1 bg-slate-900/90 text-yellow-400 text-[11px] font-bold px-2 py-0.5 rounded-md border border-yellow-500/30">
                  {product.category || 'Article Boutique'}
                </span>
              </div>

              {/* Wishlist Button */}
              <button
                onClick={() => onToggleFavorite(product)}
                className={`absolute top-3 right-14 p-2.5 rounded-full backdrop-blur-sm transition-all shadow-md ${
                  isFavorite 
                    ? 'bg-red-600 text-white' 
                    : 'bg-slate-950/70 text-slate-300 hover:text-red-400 hover:bg-slate-900'
                }`}
                title="Favoris"
              >
                <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
              </button>
            </div>

            {/* Thumbnail Row */}
            <div className="grid grid-cols-3 gap-3">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImageIndex(idx)}
                  className={`aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                    selectedImageIndex === idx
                      ? 'border-yellow-400 ring-2 ring-yellow-400/20 shadow-md'
                      : 'border-slate-800 hover:border-slate-700 opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>

            {/* Seller Quick Card */}
            <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-slate-900 text-yellow-400 flex items-center justify-center border border-slate-700 font-black text-base shrink-0">
                    {store.logoUrl ? (
                      <img src={store.logoUrl} alt={store.name} className="w-full h-full object-cover rounded-xl" />
                    ) : (
                      <Store className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                      {store.name}
                      <span title="Boutique Vérifiée" className="inline-flex">
                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      </span>
                    </h4>
                    <p className="text-xs text-slate-400 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-emerald-400" />
                      <span>{storeCity} {store.address ? `• ${store.address}` : ''}</span>
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <div className="flex items-center gap-1 text-yellow-400 font-bold text-xs">
                    <Star className="w-3.5 h-3.5 fill-current" />
                    <span>{storeRating}</span>
                  </div>
                  <span className="text-[10px] text-slate-500">{storeReviewsCount} avis vérifiés</span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1 border-t border-slate-800/80">
                <button
                  onClick={() => onOpenStoreView(store)}
                  className="flex-1 py-1.5 px-3 rounded-lg bg-slate-850 hover:bg-slate-800 text-slate-200 hover:text-white font-bold text-xs transition-colors flex items-center justify-center gap-1 border border-slate-700"
                >
                  <Store className="w-3.5 h-3.5 text-yellow-400" />
                  <span>Visiter la boutique</span>
                </button>

                <button
                  onClick={() => onOpenChat(product, store)}
                  className="flex-1 py-1.5 px-3 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 font-bold text-xs border border-emerald-500/30 transition-colors flex items-center justify-center gap-1"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Discuter</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right: Product Details & Actions */}
          <div className="flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              
              {/* Header Info */}
              <div>
                <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                  <span>Réf : {product.code || 'ART-001'}</span>
                  <span>•</span>
                  <span className="text-emerald-400 font-medium">✓ Article en stock</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-white leading-tight">
                  {product.name}
                </h2>
              </div>

              {/* Price & Unit */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-slate-800 flex items-baseline justify-between">
                <div>
                  <span className="text-xs text-slate-400 font-semibold uppercase">Prix TTC</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl sm:text-3xl font-black text-yellow-400">
                      {unitPrice.toLocaleString('fr-FR')} GNF
                    </span>
                    <span className="text-xs text-slate-400">/ {unitLabel}</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs text-slate-400 font-semibold uppercase">Disponibilité</span>
                  <p className="text-xs font-bold text-emerald-400">
                    {availableStock > 0 ? `${availableStock} ${unitLabel}s disponibles` : 'Stock limité'}
                  </p>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-yellow-400" />
                  Description du produit
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/50 p-3.5 rounded-xl border border-slate-800/80">
                  {product.description || "Article de qualité supérieure vendu et garanti par la boutique partenaire. Conforme aux normes et disponible pour retrait immédiat en magasin ou expédition partout en Guinée."}
                </p>
              </div>

              {/* Characteristics Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">État</span>
                  <p className="font-bold text-slate-200">Neuf sous emballage</p>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Localisation stock</span>
                  <p className="font-bold text-yellow-300">📍 {storeCity}</p>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Catégorie</span>
                  <p className="font-bold text-slate-200">{product.category || 'Général'}</p>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Transport / Expédition</span>
                  <p className="font-bold text-emerald-400">Disponible toutes villes</p>
                </div>
              </div>

              {/* Quantity Selector */}
              <div className="flex items-center gap-4 pt-2">
                <span className="text-xs font-bold text-slate-300">Quantité :</span>
                <div className="flex items-center border border-slate-700 bg-slate-950 rounded-xl overflow-hidden shadow-inner">
                  <button
                    type="button"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="px-3 py-1.5 text-slate-300 hover:text-white hover:bg-slate-800 text-sm font-black transition-colors"
                  >
                    -
                  </button>
                  <span className="px-4 py-1.5 text-xs font-black text-white min-w-10 text-center">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity(Math.min(availableStock, quantity + 1))}
                    className="px-3 py-1.5 text-slate-300 hover:text-white hover:bg-slate-800 text-sm font-black transition-colors"
                  >
                    +
                  </button>
                </div>
                <span className="text-xs text-slate-400">
                  Total : <strong className="text-yellow-400 font-black">{(unitPrice * quantity).toLocaleString('fr-FR')} GNF</strong>
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 pt-4 border-t border-slate-800">
              
              {addedToast && (
                <div className="p-2.5 rounded-xl bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold text-center flex items-center justify-center gap-2 animate-in fade-in">
                  <Check className="w-4 h-4 text-emerald-400" />
                  Produit ajouté à votre panier avec succès !
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Secondary Button: Ajouter au panier */}
                <button
                  type="button"
                  onClick={handleAddToCartClick}
                  className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-yellow-400 hover:text-yellow-300 font-bold text-xs border border-slate-700 hover:border-yellow-500/50 shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <ShoppingBag className="w-4 h-4 text-yellow-400" />
                  <span>Ajouter au panier</span>
                </button>

                {/* Primary Button: Commander maintenant (Rouge) */}
                <button
                  type="button"
                  onClick={handleBuyNowClick}
                  className="py-3 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs shadow-lg shadow-red-600/30 transition-all flex items-center justify-center gap-2"
                >
                  <Zap className="w-4 h-4 text-yellow-300 fill-current" />
                  <span>Commander maintenant</span>
                </button>
              </div>

              {/* Chat Button (Vert) */}
              <button
                type="button"
                onClick={() => onOpenChat(product, store)}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-950/40 hover:bg-emerald-900/40 text-emerald-300 font-bold text-xs border border-emerald-800/60 transition-all flex items-center justify-center gap-2"
              >
                <MessageSquare className="w-4 h-4 text-emerald-400" />
                <span>Discuter avec le vendeur ({store.name})</span>
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};
