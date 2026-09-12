import React, { useState } from 'react';
import { 
  X, Radio, Users, MessageSquare, Send, ShoppingBag, 
  Store, ShieldCheck, Heart, Sparkles, MapPin, Zap, 
  ExternalLink, Eye, Play, Volume2, Package
} from 'lucide-react';
import { Product, Tenant } from '../../types';
import { MarketplaceLiveSession, GuineanCity } from './types';

interface MarketplaceLiveModalProps {
  session: MarketplaceLiveSession;
  store: Tenant;
  featuredProducts: Product[];
  currentCity: GuineanCity;
  onAddToCart: (product: Product, quantity: number) => void;
  onBuyNow: (product: Product, quantity: number) => void;
  onOpenProductDetail: (product: Product) => void;
  onOpenStoreView: (store: Tenant) => void;
  onClose: () => void;
}

export const MarketplaceLiveModal: React.FC<MarketplaceLiveModalProps> = ({
  session,
  store,
  featuredProducts,
  currentCity,
  onAddToCart,
  onBuyNow,
  onOpenProductDetail,
  onOpenStoreView,
  onClose
}) => {
  const [comments, setComments] = useState(session.comments || [
    { id: 'c1', userName: 'Amadou (Madina)', userCity: 'Conakry', message: 'Bonjour ! Quel est le prix en gros pour 10 pièces ?', timestamp: '14:22' },
    { id: 'c2', userName: 'Fatoumata Binta', userCity: 'Labé', message: 'Est-ce que vous expédiez à Labé par la gare routière ?', timestamp: '14:24' },
    { id: 'c3', userName: store.responsibleName || 'Vendeur', userCity: store.city || 'Conakry', message: 'Oui tout à fait, nous livrons à Labé en 24h et il y a 10% de remise dès 5 pièces !', timestamp: '14:25', isSeller: true },
    { id: 'c4', userName: 'Mohamed Camara', userCity: 'Kindia', message: 'La qualité est vraiment top, j’ai commandé la semaine passée !', timestamp: '14:26' },
  ]);
  const [newComment, setNewComment] = useState('');
  const [likesCount, setLikesCount] = useState(148);
  const [hasLiked, setHasLiked] = useState(false);

  const handleSendComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    const added = {
      id: `comm-${Date.now()}`,
      userName: `Client (${currentCity})`,
      userCity: currentCity,
      message: newComment.trim(),
      timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    };

    setComments(prev => [...prev, added]);
    setNewComment('');
  };

  const handleLike = () => {
    if (!hasLiked) {
      setLikesCount(prev => prev + 1);
      setHasLiked(true);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-5xl max-h-[94vh] overflow-hidden shadow-2xl flex flex-col my-auto relative">
        
        {/* Top Live Bar */}
        <div className="bg-slate-950 px-4 sm:px-6 py-3 border-b border-slate-800 flex items-center justify-between z-10 shrink-0">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-600 text-white font-black text-xs shadow-lg shadow-red-600/30 animate-pulse">
              <Radio className="w-3.5 h-3.5" />
              <span>EN DIRECT</span>
            </span>
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <span className="flex items-center gap-1 bg-slate-900 px-2.5 py-0.5 rounded-full border border-slate-800 font-bold">
                <Users className="w-3.5 h-3.5 text-yellow-400" />
                <span>{session.viewerCount || 86} spectateurs</span>
              </span>
              <span className="hidden sm:inline text-slate-400 truncate max-w-xs font-medium">
                {session.title || 'Présentation des Nouveautés & Ventes Flash'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onOpenStoreView(store)}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-yellow-400 text-xs font-bold border border-slate-700 transition-colors"
            >
              <Store className="w-3.5 h-3.5" />
              <span>Visiter la Boutique</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-full bg-slate-850 hover:bg-slate-800 text-slate-400 hover:text-white transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Main Grid: Video Stream + Live Chat & Products */}
        <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 overflow-y-auto">
          
          {/* Video Stream Window (7 cols) */}
          <div className="lg:col-span-7 bg-black relative flex flex-col justify-between p-4 sm:p-6 min-h-[320px] lg:min-h-[480px]">
            {/* Background Stream Simulation */}
            <div className="absolute inset-0 opacity-40 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-800 via-slate-950 to-black pointer-events-none" />
            
            {/* Live Video Preview Box */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center space-y-3 p-6">
                <div className="w-20 h-20 rounded-full bg-red-600/20 text-red-500 flex items-center justify-center mx-auto border border-red-500/40 animate-pulse">
                  <Radio className="w-10 h-10" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-white uppercase tracking-wider">
                    {store.name} • Diffusion en direct
                  </p>
                  <p className="text-xs text-yellow-400 font-semibold">
                    📍 Direct depuis {store.city || 'Conakry'}
                  </p>
                </div>
              </div>
            </div>

            {/* Top Seller Floating Badge on Video */}
            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center gap-3 bg-slate-950/80 backdrop-blur-md p-2 rounded-2xl border border-slate-800">
                <div className="w-10 h-10 rounded-xl bg-slate-900 overflow-hidden border border-slate-700 shrink-0 flex items-center justify-center text-yellow-400 font-black">
                  {store.logoUrl ? (
                    <img src={store.logoUrl} alt={store.name} className="w-full h-full object-cover" />
                  ) : (
                    <Store className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white flex items-center gap-1">
                    {store.name}
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  </h4>
                  <p className="text-[10px] text-emerald-400 font-medium">🟢 En direct maintenant</p>
                </div>
              </div>

              {/* Heart floating button */}
              <button
                onClick={handleLike}
                className={`p-3 rounded-full backdrop-blur-md border transition-all flex items-center gap-1.5 text-xs font-bold ${
                  hasLiked 
                    ? 'bg-red-600/90 text-white border-red-500' 
                    : 'bg-slate-900/80 text-red-400 hover:text-white hover:bg-red-600 border-slate-700'
                }`}
              >
                <Heart className={`w-4 h-4 ${hasLiked ? 'fill-current' : ''}`} />
                <span>{likesCount}</span>
              </button>
            </div>

            {/* Bottom Live Promo Overlay on Video */}
            <div className="relative z-10 p-3 sm:p-4 rounded-2xl bg-gradient-to-r from-red-950/90 via-slate-900/90 to-slate-950/90 backdrop-blur-md border border-red-500/30 space-y-2">
              <div className="flex items-center gap-2 text-[11px] text-yellow-300 font-bold uppercase">
                <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                <span>Offre Spéciale Live • Réduction exclusive</span>
              </div>
              <p className="text-xs text-white">
                Commandez directement pendant le direct pour bénéficier de la livraison prioritaire et des prix négociés !
              </p>
            </div>
          </div>

          {/* Right Panel: Live Products & Live Chat (5 cols) */}
          <div className="lg:col-span-5 bg-slate-900 flex flex-col justify-between border-t lg:border-t-0 lg:border-l border-slate-800 h-[480px]">
            
            {/* Tab Header / Featured live items */}
            <div className="p-3.5 border-b border-slate-800 bg-slate-950/60">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black text-white flex items-center gap-1.5 uppercase tracking-wider">
                  <ShoppingBag className="w-3.5 h-3.5 text-yellow-400" />
                  Articles présentés en direct ({featuredProducts.length})
                </span>
              </div>

              {/* Horizontal Scroll for Featured Products */}
              <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-thin">
                {featuredProducts.map(p => {
                  const unitPrice = p.publicPrice || p.salePrice || p.costPrice || 0;
                  const unitLabel = p.publicUnit || p.defaultSaleUnit || p.baseUnit || 'unité';
                  
                  return (
                    <div 
                      key={p.id}
                      className="w-48 shrink-0 p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-yellow-500/40 transition-all flex flex-col justify-between space-y-1.5"
                    >
                      <div className="flex items-center gap-2">
                        {p.imageUrl || (p.images && p.images[0]) ? (
                          <img 
                            src={p.imageUrl || (p.images && p.images[0])} 
                            alt={p.name}
                            className="w-10 h-10 rounded-lg object-cover bg-slate-950 shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-slate-950 flex items-center justify-center text-slate-600 shrink-0">
                            <Package className="w-5 h-5" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-bold text-white truncate">{p.name}</p>
                          <p className="text-[10px] text-yellow-400 font-black">
                            {unitPrice.toLocaleString('fr-FR')} GNF
                            <span className="text-slate-400 font-normal"> / {unitLabel}</span>
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-1.5 pt-1">
                        <button
                          onClick={() => onAddToCart(p, 1)}
                          className="py-1 px-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-yellow-400 font-bold text-[10px] border border-slate-700"
                        >
                          + Panier
                        </button>
                        <button
                          onClick={() => onBuyNow(p, 1)}
                          className="py-1 px-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-black text-[10px] shadow-sm flex items-center justify-center gap-0.5"
                        >
                          <Zap className="w-2.5 h-2.5" /> Acheter
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Live Chat Messages Feed */}
            <div className="flex-1 p-3.5 overflow-y-auto space-y-2.5 text-xs bg-slate-950/40">
              {comments.map(c => (
                <div 
                  key={c.id} 
                  className={`p-2.5 rounded-xl border ${
                    c.isSeller 
                      ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-100' 
                      : 'bg-slate-900 border-slate-800 text-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] mb-1">
                    <span className="font-bold flex items-center gap-1">
                      {c.isSeller ? (
                        <strong className="text-yellow-400 flex items-center gap-0.5">
                          <Store className="w-2.5 h-2.5" /> {c.userName} (Vendeur)
                        </strong>
                      ) : (
                        <span className="text-slate-300 font-bold">{c.userName}</span>
                      )}
                      {c.userCity && !c.isSeller && (
                        <span className="text-slate-500">📍 {c.userCity}</span>
                      )}
                    </span>
                    <span className="text-slate-500">{c.timestamp}</span>
                  </div>
                  <p className="text-[11px] leading-snug">{c.message}</p>
                </div>
              ))}
            </div>

            {/* Comment Input Box */}
            <form onSubmit={handleSendComment} className="p-3 bg-slate-950 border-t border-slate-800 flex items-center gap-2">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Poser une question en direct..."
                className="flex-1 bg-slate-900 text-white text-xs px-3 py-2 rounded-xl border border-slate-700 focus:border-yellow-400 focus:outline-none"
              />
              <button
                type="submit"
                className="p-2 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold transition-all shadow-md shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>

          </div>

        </div>

      </div>
    </div>
  );
};
