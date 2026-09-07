import React, { useState } from 'react';
import { 
  X, MessageSquare, Send, Store, User, 
  MapPin, Clock, ShieldCheck, CheckCheck, Sparkles, Image as ImageIcon
} from 'lucide-react';
import { MarketplaceConversation, MarketplaceChatMessage } from './types';
import { Product, Tenant } from '../../types';

interface MarketplaceMessagingModalProps {
  initialProduct?: Product;
  initialStore?: Tenant;
  conversations: MarketplaceConversation[];
  onSendMessage: (conversationId: string, content: string) => void;
  onCreateConversation: (store: Tenant, product?: Product, initialMessage?: string) => MarketplaceConversation;
  onClose: () => void;
}

export const MarketplaceMessagingModal: React.FC<MarketplaceMessagingModalProps> = ({
  initialProduct,
  initialStore,
  conversations,
  onSendMessage,
  onCreateConversation,
  onClose
}) => {
  // Find or create active conversation
  const [activeConvId, setActiveConvId] = useState<string>(() => {
    if (initialStore) {
      const existing = conversations.find(c => c.storeId === initialStore.id);
      if (existing) return existing.id;
      const created = onCreateConversation(initialStore, initialProduct);
      return created.id;
    }
    return conversations[0]?.id || '';
  });

  const [messageInput, setMessageInput] = useState('');

  const activeConversation = conversations.find(c => c.id === activeConvId);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !activeConvId) return;

    onSendMessage(activeConvId, messageInput.trim());
    setMessageInput('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-3 sm:p-4 overflow-hidden animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl h-[88vh] shadow-2xl relative flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="p-4 sm:px-6 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white flex items-center gap-1.5">
                <span>Messagerie Directe Client ↔ Vendeur</span>
                <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                  Guinée Boutiques
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Discutez avant/après commande, convenez des frais de transport et suivez la livraison
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body (Sidebar Conversations + Chat Area) */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Left: Conversations List */}
          <div className="w-72 sm:w-80 bg-slate-950/50 border-r border-slate-800 flex flex-col overflow-y-auto hidden md:flex">
            <div className="p-3 border-b border-slate-800/80">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Vos Discussions ({conversations.length})
              </p>
            </div>

            <div className="divide-y divide-slate-800/50">
              {conversations.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500">
                  Aucune conversation en cours.
                </div>
              ) : (
                conversations.map((conv) => {
                  const isSelected = conv.id === activeConvId;
                  return (
                    <button
                      key={conv.id}
                      onClick={() => setActiveConvId(conv.id)}
                      className={`w-full p-3.5 text-left transition-colors flex items-start gap-3 ${
                        isSelected 
                          ? 'bg-emerald-600/15 border-l-4 border-emerald-500' 
                          : 'hover:bg-slate-800/50'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 text-yellow-400 flex items-center justify-center font-bold text-sm shrink-0 overflow-hidden">
                        {conv.storeLogoUrl ? (
                          <img src={conv.storeLogoUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Store className="w-5 h-5" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-white truncate">{conv.storeName}</h4>
                          <span className="text-[10px] text-emerald-400 font-semibold shrink-0">📍 {conv.storeCity}</span>
                        </div>

                        {conv.productName && (
                          <p className="text-[11px] text-yellow-400 font-medium truncate mt-0.5">
                            Article : {conv.productName}
                          </p>
                        )}

                        <p className="text-xs text-slate-400 truncate mt-1">
                          {conv.lastMessageText}
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right: Active Chat View */}
          <div className="flex-1 flex flex-col bg-slate-900/60 justify-between">
            {activeConversation ? (
              <>
                {/* Active Store Bar */}
                <div className="p-3 px-6 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-slate-900 text-yellow-400 border border-slate-800 flex items-center justify-center">
                      <Store className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                        {activeConversation.storeName}
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      </h4>
                      <p className="text-[11px] text-slate-400 flex items-center gap-2">
                        <span className="text-emerald-400">📍 {activeConversation.storeCity}</span>
                        {activeConversation.productName && (
                          <>
                            <span>•</span>
                            <span className="text-yellow-400 truncate max-w-xs">
                              Sujet : {activeConversation.productName}
                            </span>
                          </>
                        )}
                      </p>
                    </div>
                  </div>

                  <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                    ● Vendeur en ligne
                  </span>
                </div>

                {/* Messages Feed */}
                <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4">
                  
                  {/* Transport prompt note */}
                  <div className="max-w-md mx-auto p-3 rounded-2xl bg-yellow-400/10 border border-yellow-400/30 text-center text-xs text-yellow-300">
                    💡 <strong>Conseil :</strong> Indiquez votre ville ou quartier pour que le commerçant vous confirme le mode et les frais de livraison.
                  </div>

                  {activeConversation.messages.map((msg) => {
                    const isMe = msg.senderRole === 'CUSTOMER';
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                      >
                        <div className="flex items-end gap-2 max-w-[85%] sm:max-w-md">
                          {!isMe && (
                            <div className="w-7 h-7 rounded-lg bg-slate-800 text-yellow-400 flex items-center justify-center shrink-0 text-xs">
                              <Store className="w-3.5 h-3.5" />
                            </div>
                          )}

                          <div
                            className={`p-3.5 rounded-2xl text-xs sm:text-sm ${
                              isMe
                                ? 'bg-emerald-600 text-white rounded-br-none shadow-md shadow-emerald-600/20'
                                : 'bg-slate-800 text-slate-100 rounded-bl-none border border-slate-700'
                            }`}
                          >
                            {!isMe && (
                              <p className="text-[10px] font-bold text-yellow-400 mb-1">
                                {msg.senderName}
                              </p>
                            )}
                            <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                            <span className={`text-[10px] block text-right mt-1.5 ${
                              isMe ? 'text-emerald-200' : 'text-slate-400'
                            }`}>
                              {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Message Input Box */}
                <form 
                  onSubmit={handleSend}
                  className="p-3 sm:p-4 bg-slate-950 border-t border-slate-800 flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    placeholder="Écrivez votre message ou demandez les frais de livraison..."
                    className="flex-1 bg-slate-900 text-white text-xs sm:text-sm px-4 py-3 rounded-xl border border-slate-700 focus:border-emerald-500 focus:outline-none"
                  />
                  
                  <button
                    type="submit"
                    disabled={!messageInput.trim()}
                    className="py-3 px-5 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md transition-all shrink-0"
                  >
                    <span>Envoyer</span>
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center p-6 text-center text-xs text-slate-500">
                Sélectionnez une discussion pour afficher les messages.
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};
