import React from 'react';
import { X, Heart, Trash2, ShoppingBag, Package } from 'lucide-react';
import { Product } from '../../types';

interface MarketplaceWishlistModalProps {
  favoriteProducts: Product[];
  onRemoveFavorite: (productId: string) => void;
  onAddToCart: (product: Product, quantity: number) => void;
  onOpenProductDetail: (product: Product) => void;
  onClose: () => void;
}

export const MarketplaceWishlistModal: React.FC<MarketplaceWishlistModalProps> = ({
  favoriteProducts,
  onRemoveFavorite,
  onAddToCart,
  onOpenProductDetail,
  onClose
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-red-600/20 text-red-500">
              <Heart className="w-5 h-5 fill-current" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">Ma Liste de Souhaits</h3>
              <p className="text-xs text-slate-400">
                {favoriteProducts.length} article{favoriteProducts.length > 1 ? 's' : ''} sauvegardé{favoriteProducts.length > 1 ? 's' : ''}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 max-h-[60vh] overflow-y-auto">
          {favoriteProducts.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-slate-800 text-slate-500 flex items-center justify-center mx-auto">
                <Heart className="w-8 h-8" />
              </div>
              <h4 className="text-base font-bold text-white">Aucun favori pour le moment</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Cliquez sur le cœur d'un produit pour l'enregistrer dans votre liste de souhaits.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-800/80 space-y-3">
              {favoriteProducts.map((product) => {
                const price = product.publicPrice || product.salePrice || product.costPrice || 0;
                const unit = product.publicUnit || product.defaultSaleUnit || product.baseUnit || product.unit || 'unité';
                const prodImg = (product.images && product.images[0]) || product.imageUrl || '';

                return (
                  <div key={product.id} className="pt-3 first:pt-0 flex items-center justify-between gap-4">
                    <div 
                      onClick={() => onOpenProductDetail(product)}
                      className="flex items-center gap-3.5 cursor-pointer group flex-1"
                    >
                      {prodImg ? (
                        <img
                          src={prodImg}
                          alt={product.name}
                          className="w-14 h-14 rounded-xl object-cover bg-slate-950 border border-slate-800 group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-xl flex items-center justify-center bg-slate-950 border border-slate-800 text-slate-600 group-hover:text-yellow-400 transition-colors">
                          <Package className="w-6 h-6" />
                        </div>
                      )}
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-white group-hover:text-yellow-400 transition-colors leading-tight">
                          {product.name}
                        </h4>
                        <p className="text-xs font-black text-yellow-400">
                          {price.toLocaleString('fr-FR')} GNF <span className="text-[11px] text-slate-400 font-normal">/ {unit}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onAddToCart(product, 1)}
                        className="py-2 px-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm"
                      >
                        <ShoppingBag className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Ajouter</span>
                      </button>

                      <button
                        onClick={() => onRemoveFavorite(product.id)}
                        className="p-2 rounded-xl text-slate-500 hover:text-red-400 hover:bg-slate-800 transition-colors"
                        title="Retirer des favoris"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
