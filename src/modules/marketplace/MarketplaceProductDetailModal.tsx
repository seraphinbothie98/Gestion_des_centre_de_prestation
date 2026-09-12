import React, { useState } from 'react';
import { 
  X, MapPin, Store, Star, ShoppingBag, Zap, 
  MessageSquare, Heart, ShieldCheck, Truck, Check, 
  Package, Info, ArrowRight, Share2, Video, Play, 
  ChevronRight, Layers, HelpCircle, Phone, Radio
} from 'lucide-react';
import { Product, Tenant } from '../../types';
import { GuineanCity, ConakryCommune } from './types';

interface MarketplaceProductDetailModalProps {
  product: Product;
  store: Tenant;
  storeOtherProducts?: Product[];
  currentCity: GuineanCity;
  currentCommune?: ConakryCommune;
  isFavorite: boolean;
  onToggleFavorite: (product: Product) => void;
  onAddToCart: (product: Product, quantity: number) => void;
  onBuyNow: (product: Product, quantity: number) => void;
  onOpenChat: (product: Product, store: Tenant) => void;
  onOpenStoreView: (store: Tenant) => void;
  onSelectOtherProduct?: (product: Product) => void;
  onOpenLiveStream?: (store: Tenant) => void;
  onClose: () => void;
}

export const MarketplaceProductDetailModal: React.FC<MarketplaceProductDetailModalProps> = ({
  product,
  store,
  storeOtherProducts = [],
  currentCity,
  currentCommune,
  isFavorite,
  onToggleFavorite,
  onAddToCart,
  onBuyNow,
  onOpenChat,
  onOpenStoreView,
  onSelectOtherProduct,
  onOpenLiveStream,
  onClose
}) => {
  const [quantity, setQuantity] = useState(1);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [activeMediaTab, setActiveMediaTab] = useState<'photos' | 'video'>('photos');
  const [addedToast, setAddedToast] = useState(false);

  // Derive store location and proximity
  const storeCity = store.city || 'Conakry';
  const isNearby = storeCity.toLowerCase() === currentCity.toLowerCase();
  const isStoreOnline = store.isOnline !== false; // default true if not set
  const isLive = store.isLiveStreaming === true;
  const storeRating = 4.8;
  const storeReviewsCount = 42;

  // Stock & Public Selling Unit configuration
  const availableStock = product.currentStock || 15;
  const publicUnit = product.publicUnit || product.defaultSaleUnit || product.baseUnit || product.unit || 'Unité';
  const publicPrice = product.publicPrice || product.salePrice || product.costPrice || 0;
  const conversionFactor = product.conversionFactorToStockUnit || (product.conversionFactor || 1);
  const internalStockUnit = product.baseUnit || product.unit || 'pièce';

  // Multi-image gallery compilation (only real product images, max 4)
  const productImages: string[] = React.useMemo(() => {
    if (product.images && Array.isArray(product.images) && product.images.length > 0) {
      const valid = product.images.filter(img => typeof img === 'string' && img.trim().length > 0);
      if (valid.length > 0) return valid.slice(0, 4);
    }
    if (product.imageUrl && product.imageUrl.trim().length > 0) {
      return [product.imageUrl.trim()];
    }
    return [];
  }, [product]);

  const activeImageSrc = productImages[selectedImageIndex] || productImages[0] || '';

  const handleAddToCartClick = () => {
    onAddToCart(product, quantity);
    setAddedToast(true);
    setTimeout(() => setAddedToast(false), 2200);
  };

  const handleBuyNowClick = () => {
    onBuyNow(product, quantity);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-5xl max-h-[94vh] overflow-y-auto shadow-2xl relative my-auto">
        
        {/* Guinean Tricolor accent top strip */}
        <div className="h-1.5 w-full flex">
          <div className="flex-1 bg-red-600" />
          <div className="flex-1 bg-yellow-400" />
          <div className="flex-1 bg-emerald-600" />
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 rounded-full bg-slate-950/80 hover:bg-slate-800 text-slate-400 hover:text-white transition-all shadow-md"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-4 sm:p-8 space-y-8">
          
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 lg:gap-8">
            
            {/* LEFT COLUMN: Multi-Images Gallery & Video Player (7 cols) */}
            <div className="md:col-span-6 space-y-4">
              
              {/* Media Switcher: Photos / Vidéo */}
              {product.videoUrl && (
                <div className="flex items-center gap-2 p-1 bg-slate-950 rounded-xl border border-slate-800 w-fit">
                  <button
                    onClick={() => setActiveMediaTab('photos')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                      activeMediaTab === 'photos'
                        ? 'bg-yellow-400 text-slate-950 shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>📷 Photos ({productImages.length > 0 ? productImages.length : 0})</span>
                  </button>
                  <button
                    onClick={() => setActiveMediaTab('video')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                      activeMediaTab === 'video'
                        ? 'bg-red-600 text-white shadow-sm'
                        : 'text-red-400 hover:text-red-300'
                    }`}
                  >
                    <Video className="w-3.5 h-3.5" />
                    <span>Vidéo Démo</span>
                  </button>
                </div>
              )}

              {/* Media Main Viewer */}
              {activeMediaTab === 'photos' ? (
                <div className="relative aspect-square rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center group shadow-xl">
                  {activeImageSrc ? (
                    <img 
                      src={activeImageSrc} 
                      alt={`${product.name} - Vue ${selectedImageIndex + 1}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-3 p-6 text-center text-slate-500">
                      <div className="w-20 h-20 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center">
                        <Package className="w-10 h-10 text-slate-600" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-400">Aucune photo fournie</p>
                        <p className="text-[11px] text-slate-600 mt-0.5">Visuel générique catalogue</p>
                      </div>
                    </div>
                  )}

                  {/* Badges Over Image */}
                  <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
                    {isNearby ? (
                      <span className="inline-flex items-center gap-1 bg-emerald-600 text-white font-black text-xs px-2.5 py-1 rounded-full shadow-lg backdrop-blur-sm">
                        <MapPin className="w-3.5 h-3.5" /> Disponible à {storeCity}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 bg-slate-900/95 text-yellow-300 border border-yellow-500/40 font-bold text-xs px-2.5 py-1 rounded-full shadow-lg backdrop-blur-sm">
                        <MapPin className="w-3.5 h-3.5 text-yellow-400" /> Expédition depuis {storeCity}
                      </span>
                    )}

                    <span className="inline-flex items-center gap-1 bg-slate-900/90 text-yellow-400 text-[11px] font-bold px-2 py-0.5 rounded-md border border-yellow-500/30">
                      {product.category || 'Article Boutique'}
                    </span>
                  </div>

                  {/* Wishlist Button */}
                  <button
                    onClick={() => onToggleFavorite(product)}
                    className={`absolute top-3 right-3 z-10 p-2.5 rounded-full backdrop-blur-sm transition-all shadow-md ${
                      isFavorite 
                        ? 'bg-red-600 text-white shadow-red-600/30' 
                        : 'bg-slate-950/75 text-slate-300 hover:text-red-400 hover:bg-slate-900'
                    }`}
                    title="Ajouter aux favoris"
                  >
                    <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
                  </button>

                  {/* Image count pill (only if multiple images) */}
                  {productImages.length > 1 && (
                    <div className="absolute bottom-3 right-3 bg-slate-950/80 px-2.5 py-1 rounded-lg border border-slate-800 text-[11px] font-bold text-slate-300 backdrop-blur-sm">
                      Vue {selectedImageIndex + 1} / {productImages.length}
                    </div>
                  )}
                </div>
              ) : (
                /* Video Player Preview */
                <div className="relative aspect-square rounded-2xl overflow-hidden bg-black border border-slate-800 flex flex-col items-center justify-center p-6 text-center shadow-xl">
                  <div className="w-16 h-16 rounded-full bg-red-600/30 text-red-500 flex items-center justify-center mb-3 border border-red-500/40">
                    <Play className="w-8 h-8 ml-1 fill-current" />
                  </div>
                  <h4 className="text-sm font-bold text-white mb-1">Vidéo de présentation du produit</h4>
                  <p className="text-xs text-slate-400 max-w-xs mb-4">
                    Découvrez les détails, l'utilisation et la qualité de fabrication de cet article en vidéo.
                  </p>
                  {product.videoUrl && (
                    <a
                      href={product.videoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs transition-colors shadow-md"
                    >
                      <span>Ouvrir la vidéo</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              )}

              {/* Thumbnails Row - Dynamically rendered only when multiple real images exist */}
              {productImages.length > 1 && (
                <div className={`grid gap-2.5 ${
                  productImages.length === 2 ? 'grid-cols-2' : productImages.length === 3 ? 'grid-cols-3' : 'grid-cols-4'
                }`}>
                  {productImages.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setSelectedImageIndex(idx);
                        setActiveMediaTab('photos');
                      }}
                      className={`aspect-square rounded-xl overflow-hidden border-2 transition-all relative ${
                        selectedImageIndex === idx && activeMediaTab === 'photos'
                          ? 'border-yellow-400 ring-2 ring-yellow-400/30 shadow-md scale-95'
                          : 'border-slate-800 hover:border-slate-700 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={img} alt={`Vue ${idx + 1}`} className="w-full h-full object-cover" />
                      <span className="absolute bottom-0 inset-x-0 bg-slate-950/80 text-[9px] text-center font-bold text-slate-300 py-0.5">
                        Vue {idx + 1}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* Seller Information Card */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 shadow-md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-slate-900 text-yellow-400 flex items-center justify-center border border-slate-700 font-black text-base shrink-0 overflow-hidden">
                      {store.logoUrl ? (
                        <img src={store.logoUrl} alt={store.name} className="w-full h-full object-cover" />
                      ) : (
                        <Store className="w-6 h-6" />
                      )}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white flex items-center gap-1.5 flex-wrap">
                        <span>{store.name}</span>
                        <span title="Boutique Partenaire Vérifiée" className="inline-flex">
                          <ShieldCheck className="w-4 h-4 text-emerald-400" />
                        </span>
                      </h4>
                      
                      {/* Online/Offline & Live status badge */}
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        {isLive && (
                          <button
                            onClick={() => onOpenLiveStream && onOpenLiveStream(store)}
                            className="inline-flex items-center gap-1 bg-red-600 text-white font-black text-[10px] px-2 py-0.5 rounded-full animate-pulse hover:bg-red-500"
                          >
                            <Radio className="w-2.5 h-2.5" /> 🔴 EN DIRECT
                          </button>
                        )}

                        {isStoreOnline ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            <span>En ligne</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400">
                            <span className="w-2 h-2 rounded-full bg-slate-500" />
                            <span>Hors ligne (Commandes 24/7 actives)</span>
                          </span>
                        )}

                        <span className="text-slate-500 text-[11px]">•</span>
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-emerald-400" />
                          <span>{storeCity}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="flex items-center gap-1 text-yellow-400 font-bold text-xs">
                      <Star className="w-3.5 h-3.5 fill-current" />
                      <span>{storeRating}</span>
                    </div>
                    <span className="text-[10px] text-slate-500">{storeReviewsCount} avis</span>
                  </div>
                </div>

                {/* Seller Quick Buttons */}
                <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                  <button
                    onClick={() => onOpenStoreView(store)}
                    className="flex-1 py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-850 text-slate-200 hover:text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5 border border-slate-700"
                  >
                    <Store className="w-3.5 h-3.5 text-yellow-400" />
                    <span>Visiter la boutique</span>
                  </button>

                  <button
                    onClick={() => onOpenChat(product, store)}
                    className="flex-1 py-2 px-3 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 font-bold text-xs border border-emerald-500/30 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Discuter avec le vendeur</span>
                  </button>
                </div>
              </div>

            </div>

            {/* RIGHT COLUMN: Commercial Details, Public Selling Unit & Order Form (5 cols) */}
            <div className="md:col-span-6 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                
                {/* Product Reference & Availability header */}
                <div>
                  <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                    <span>Réf : <strong className="text-slate-300">{product.code || 'ART-001'}</strong></span>
                    <span>•</span>
                    <span className="text-emerald-400 font-medium">✓ Article en stock disponible</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-white leading-tight">
                    {product.name}
                  </h2>
                </div>

                {/* PUBLIC SELLING UNIT & PRICING BLOCK */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border border-slate-800 space-y-2.5">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                        Prix Public Marketplace
                      </span>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl sm:text-3xl font-black text-yellow-400">
                          {publicPrice.toLocaleString('fr-FR')} GNF
                        </span>
                        <span className="text-sm font-bold text-slate-300">
                          / {publicUnit}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[11px] text-slate-400 font-bold uppercase">Disponibilité</span>
                      <p className="text-xs font-bold text-emerald-400">
                        {availableStock > 0 ? `${availableStock} ${publicUnit}s en rayon` : 'Sur commande (24/7)'}
                      </p>
                    </div>
                  </div>

                  {/* Internal stock unit conversion note if different from public unit */}
                  {conversionFactor > 1 && (
                    <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400 flex items-center gap-1.5">
                      <Package className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
                      <span>
                        Conditionnement : 1 <strong className="text-white">{publicUnit}</strong> = {conversionFactor} {internalStockUnit}s
                      </span>
                    </div>
                  )}
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-yellow-400" />
                    Description de l'article
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80">
                    {product.description || "Article garanti par la boutique partenaire. Conforme aux standards de qualité pour achat au détail ou en demi-gros en République de Guinée."}
                  </p>
                </div>

                {/* Characteristics Grid */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Unité de vente</span>
                    <p className="font-bold text-yellow-400">{publicUnit}</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Ville du vendeur</span>
                    <p className="font-bold text-slate-200">📍 {storeCity}</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Catégorie</span>
                    <p className="font-bold text-slate-200">{product.category || 'Général'}</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Livraison</span>
                    <p className="font-bold text-emerald-400">Conakry & Intérieur</p>
                  </div>
                </div>

                {/* Quantity Selector */}
                <div className="flex items-center gap-4 pt-2">
                  <span className="text-xs font-bold text-slate-300">Quantité demandée ({publicUnit}) :</span>
                  <div className="flex items-center border border-slate-700 bg-slate-950 rounded-xl overflow-hidden shadow-inner">
                    <button
                      type="button"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="px-3.5 py-1.5 text-slate-300 hover:text-white hover:bg-slate-800 text-sm font-black transition-colors"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min={1}
                      value={quantity}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        setQuantity(isNaN(val) || val < 1 ? 1 : val);
                      }}
                      className="w-12 py-1.5 text-xs font-black text-white text-center bg-transparent focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setQuantity(prev => prev + 1)}
                      className="px-3.5 py-1.5 text-slate-300 hover:text-white hover:bg-slate-800 text-sm font-black transition-colors"
                    >
                      +
                    </button>
                  </div>
                  <span className="text-xs text-slate-400">
                    Total estimé : <strong className="text-yellow-400 font-black">{(publicPrice * quantity).toLocaleString('fr-FR')} GNF</strong>
                  </span>
                </div>
              </div>

              {/* Order Actions */}
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
                    <span>Commander ({quantity} {publicUnit})</span>
                  </button>
                </div>

                {/* Direct Chat Button (Vert) */}
                <button
                  type="button"
                  onClick={() => onOpenChat(product, store)}
                  className="w-full py-2.5 px-4 rounded-xl bg-emerald-950/50 hover:bg-emerald-900/50 text-emerald-300 font-bold text-xs border border-emerald-800/60 transition-all flex items-center justify-center gap-2"
                >
                  <MessageSquare className="w-4 h-4 text-emerald-400" />
                  <span>Poser une question au vendeur ({store.name})</span>
                </button>
              </div>

            </div>

          </div>

          {/* OTHER PRODUCTS FROM THIS STORE SECTION */}
          {storeOtherProducts.length > 0 && (
            <div className="pt-6 border-t border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <Store className="w-4 h-4 text-yellow-400" />
                  <span>Autres articles proposés par {store.name}</span>
                </h3>
                <button
                  onClick={() => onOpenStoreView(store)}
                  className="text-xs text-yellow-400 hover:text-yellow-300 font-bold flex items-center gap-1"
                >
                  <span>Voir tous les articles</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {storeOtherProducts.slice(0, 4).map(otherP => {
                  const otherPrice = otherP.publicPrice || otherP.salePrice || otherP.costPrice || 0;
                  const otherUnit = otherP.publicUnit || otherP.defaultSaleUnit || otherP.baseUnit || 'unité';
                  const otherImg = (otherP.images && otherP.images[0]) || otherP.imageUrl || '';

                  return (
                    <button
                      key={otherP.id}
                      onClick={() => onSelectOtherProduct && onSelectOtherProduct(otherP)}
                      className="p-2.5 rounded-2xl bg-slate-950 border border-slate-800 hover:border-yellow-500/50 transition-all text-left group flex flex-col justify-between space-y-2"
                    >
                      <div className="aspect-square rounded-xl overflow-hidden bg-slate-900 flex items-center justify-center">
                        {otherImg ? (
                          <img 
                            src={otherImg} 
                            alt={otherP.name} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        ) : (
                          <Package className="w-8 h-8 text-slate-700 group-hover:text-yellow-500/60 transition-colors" />
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white line-clamp-1 group-hover:text-yellow-400">
                          {otherP.name}
                        </p>
                        <p className="text-xs font-black text-yellow-400">
                          {otherPrice.toLocaleString('fr-FR')} GNF
                          <span className="text-[10px] text-slate-400 font-normal"> / {otherUnit}</span>
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
