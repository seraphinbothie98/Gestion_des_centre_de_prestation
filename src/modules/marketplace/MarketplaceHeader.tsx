import React, { useState, useRef, useEffect } from 'react';
import { 
  Store, MapPin, Search, Heart, ShoppingBag, User as UserIcon, 
  Menu, X, Sparkles, ChevronDown, Check, HelpCircle, 
  Layers, PhoneCall, PlusCircle, ArrowRight, ShieldCheck, MessageSquare, Package, LogOut, Settings, UserCheck
} from 'lucide-react';
import { GuineanCity, ConakryCommune } from './types';
import { User } from '../../types';

export const GUINEAN_CITIES: GuineanCity[] = [
  'Conakry',
  'Kindia',
  'Boké',
  'Mamou',
  'Labé',
  'Faranah',
  'Kankan',
  'N\'Zérékoré',
  'Siguiri',
  'Kissidougou',
  'Coyah',
  'Dubréka',
  'Autre ville'
];

export const CONAKRY_COMMUNES: ConakryCommune[] = [
  'Kaloum',
  'Dixinn',
  'Matam',
  'Ratoma',
  'Matoto',
  'Sonfonia',
  'Gbessia',
  'Tombolia',
  'Kagbelen'
];

interface MarketplaceHeaderProps {
  currentCity: GuineanCity;
  currentCommune?: ConakryCommune;
  currentUser?: User | null;
  onLogout?: () => void;
  onSelectLocation: (city: GuineanCity, commune?: ConakryCommune) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSearchSubmit: () => void;
  wishlistCount: number;
  cartCount: number;
  unreadMessagesCount?: number;
  onOpenWishlist: () => void;
  onOpenCart: () => void;
  onOpenMessaging?: () => void;
  onOpenOrders?: () => void;
  onOpenAccount?: () => void;
  onOpenLogin: (mode?: 'CLIENT' | 'BOUTIQUE' | 'SUPER_ADMIN') => void;
  onOpenRegister?: () => void;
  onOpenRegisterStore: () => void;
  onNavigateSection: (section: 'home' | 'categories' | 'stores' | 'how-it-works' | 'contact') => void;
  activeNavSection: 'home' | 'categories' | 'stores' | 'how-it-works' | 'contact';
}

export const MarketplaceHeader: React.FC<MarketplaceHeaderProps> = ({
  currentCity,
  currentCommune,
  currentUser,
  onLogout,
  onSelectLocation,
  searchQuery,
  onSearchChange,
  onSearchSubmit,
  wishlistCount,
  cartCount,
  unreadMessagesCount = 0,
  onOpenWishlist,
  onOpenCart,
  onOpenMessaging,
  onOpenOrders,
  onOpenAccount,
  onOpenLogin,
  onOpenRegister,
  onOpenRegisterStore,
  onNavigateSection,
  activeNavSection,
}) => {
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [selectedCityInModal, setSelectedCityInModal] = useState<GuineanCity>(currentCity);
  const [selectedCommuneInModal, setSelectedCommuneInModal] = useState<ConakryCommune | undefined>(currentCommune);

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsUserDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleApplyLocation = () => {
    onSelectLocation(
      selectedCityInModal, 
      selectedCityInModal === 'Conakry' ? selectedCommuneInModal : undefined
    );
    setIsLocationModalOpen(false);
  };

  return (
    <>
      {/* Top Banner with Guinea National Colors Accent Bar */}
      <div className="h-1.5 w-full flex shrink-0">
        <div className="flex-1 bg-red-600" />
        <div className="flex-1 bg-amber-400" />
        <div className="flex-1 bg-emerald-600" />
      </div>

      {/* Top Announcement Banner - Midnight Blue Accent */}
      <div className="bg-[#07162c] text-blue-100 text-xs py-2 px-4 border-b border-blue-900/40">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 bg-blue-950/80 text-amber-300 font-bold px-2.5 py-0.5 rounded-full text-[11px] border border-amber-500/30 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              🇬🇳 Marketplace Officielle de Guinée
            </span>
            <span className="hidden md:inline text-blue-200/90 text-[11px]">
              Achetez directement auprès des commerçants et boutiques vérifiées
            </span>
          </div>

          <div className="flex items-center gap-3 text-[11px]">
            <button 
              onClick={() => onNavigateSection('how-it-works')}
              className="text-blue-200 hover:text-amber-300 transition-colors flex items-center gap-1 font-medium"
            >
              <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
              <span>Comment ça marche ?</span>
            </button>
            <span className="text-blue-800">|</span>
            <button 
              onClick={() => onNavigateSection('contact')}
              className="text-blue-200 hover:text-emerald-300 transition-colors flex items-center gap-1 font-medium"
            >
              <PhoneCall className="w-3.5 h-3.5 text-emerald-400" />
              <span>Assistance</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Header - Attractive Deep Royal Blue Premium Theme */}
      <header className="sticky top-0 z-40 bg-gradient-to-r from-[#0b2857] via-[#103a7a] to-[#0c2b5c] text-white border-b border-blue-800/60 shadow-lg shadow-blue-950/25 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20 gap-3 sm:gap-6">
            
            {/* Logo with Guinea Tri-color Accents */}
            <div className="flex items-center gap-3 shrink-0">
              <button 
                onClick={() => onNavigateSection('home')}
                className="flex items-center gap-2.5 text-left group"
              >
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-red-500 via-amber-400 to-emerald-400 p-0.5 shadow-md group-hover:scale-105 transition-transform">
                  <div className="w-full h-full bg-[#0a1f42] rounded-[14px] flex items-center justify-center">
                    <Store className="w-6 h-6 text-amber-400" />
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    <span className="text-xl font-black text-white tracking-tight drop-shadow-sm">GUINÉE</span>
                    <span className="text-xl font-black text-amber-400 tracking-tight drop-shadow-sm">BOUTIQUES</span>
                  </div>
                  <p className="text-[10px] text-emerald-300 font-extrabold -mt-1 tracking-wider uppercase flex items-center gap-1">
                    <span className="text-emerald-400">●</span> Commerce & Marchés de Guinée
                  </p>
                </div>
              </button>
            </div>

            {/* City / Location Selector Button */}
            <button
              onClick={() => {
                setSelectedCityInModal(currentCity);
                setSelectedCommuneInModal(currentCommune);
                setIsLocationModalOpen(true);
              }}
              className="hidden lg:flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/40 rounded-2xl px-3.5 py-2 text-xs text-left transition-all shrink-0 group backdrop-blur-sm shadow-sm"
              title="Changer votre localisation"
            >
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-all border border-emerald-400/30">
                <MapPin className="w-4 h-4" />
              </div>
              <div className="pr-1">
                <p className="text-[10px] text-blue-200 font-bold uppercase leading-tight">Votre Ville</p>
                <p className="text-xs font-black text-white group-hover:text-amber-300 transition-colors flex items-center gap-1">
                  {currentCity} {currentCity === 'Conakry' && currentCommune ? `(${currentCommune})` : ''}
                  <ChevronDown className="w-3.5 h-3.5 text-blue-200 group-hover:text-amber-300" />
                </p>
              </div>
            </button>

            {/* Global Search Bar */}
            <div className="flex-1 max-w-lg min-w-0">
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  onSearchSubmit();
                }}
                className="relative flex items-center shadow-md rounded-2xl"
              >
                <div className="absolute left-3.5 text-slate-400 pointer-events-none">
                  <Search className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder="Rechercher un produit, téléphone, quincaillerie, vêtement..."
                  className="w-full bg-white text-slate-900 placeholder-slate-400 text-xs sm:text-sm pl-10 pr-24 py-2.5 rounded-2xl border border-white/30 focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-400/30 focus:outline-none transition-all shadow-inner font-medium"
                />
                <button
                  type="submit"
                  className="absolute right-1.5 bg-red-600 hover:bg-red-700 active:scale-95 text-white text-xs font-bold px-3.5 py-1.5 rounded-xl transition-all shadow-sm flex items-center gap-1"
                >
                  <span>Chercher</span>
                </button>
              </form>
            </div>

            {/* Right Action Icons & Buttons */}
            <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
              
              {/* Wishlist */}
              <button
                onClick={onOpenWishlist}
                className="relative p-2.5 rounded-2xl text-blue-100 hover:text-white hover:bg-white/15 transition-all"
                title="Mes Favoris"
              >
                <Heart className="w-5 h-5" />
                {wishlistCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-red-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-sm">
                    {wishlistCount}
                  </span>
                )}
              </button>

              {/* Messages Client */}
              {onOpenMessaging && (
                <button
                  onClick={onOpenMessaging}
                  className="relative p-2.5 rounded-2xl text-blue-100 hover:text-white hover:bg-white/15 transition-all flex items-center gap-1.5"
                  title="Mes Messages Vendeurs"
                >
                  <div className="relative">
                    <MessageSquare className="w-5 h-5 text-blue-100" />
                    {unreadMessagesCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white font-black text-[10px] rounded-full flex items-center justify-center shadow-sm animate-pulse">
                        {unreadMessagesCount}
                      </span>
                    )}
                  </div>
                  <span className="hidden xl:inline text-xs font-bold text-blue-100">Messages</span>
                </button>
              )}

              {/* Cart */}
              <button
                onClick={onOpenCart}
                className="relative p-2.5 rounded-2xl text-blue-100 hover:text-white hover:bg-white/15 transition-all flex items-center gap-1.5"
                title="Mon Panier"
              >
                <div className="relative">
                  <ShoppingBag className="w-5 h-5 text-blue-100" />
                  {cartCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 text-slate-950 font-black text-[10px] rounded-full flex items-center justify-center shadow-sm">
                      {cartCount}
                    </span>
                  )}
                </div>
                <span className="hidden xl:inline text-xs font-bold text-blue-100">Panier</span>
              </button>

              {/* User Account or Client Login/Register */}
              {currentUser ? (
                /* CONNECTED CLIENT DROPDOWN MENU */
                <div className="relative" ref={dropdownRef}>
                  <button
                    type="button"
                    onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                    className="flex items-center gap-2 px-3 py-2 rounded-2xl text-xs font-bold text-white bg-white/15 hover:bg-white/25 border border-white/25 transition-all cursor-pointer shadow-sm group backdrop-blur-sm"
                    title="Mon Compte Client"
                  >
                    {currentUser.avatarUrl ? (
                      <img
                        src={currentUser.avatarUrl}
                        alt={currentUser.firstName}
                        className="w-6 h-6 rounded-full object-cover border border-emerald-400"
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-emerald-500 text-white text-[11px] font-black flex items-center justify-center">
                        {currentUser.firstName?.[0]?.toUpperCase() || 'C'}
                      </div>
                    )}
                    <div className="text-left hidden sm:block">
                      <p className="leading-tight font-extrabold text-white truncate max-w-[100px]">
                        {currentUser.firstName}
                      </p>
                      <p className="text-[10px] text-emerald-300 font-bold -mt-0.5">Espace Client</p>
                    </div>
                    <ChevronDown className="w-3.5 h-3.5 text-blue-200 group-hover:text-white transition-transform" />
                  </button>

                  {/* Personal Client Dropdown Menu */}
                  {isUserDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl border border-slate-200 shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150 text-slate-800">
                      <div className="px-4 py-2.5 border-b border-slate-100">
                        <p className="text-xs font-bold text-slate-900 truncate">
                          {currentUser.firstName} {currentUser.lastName || ''}
                        </p>
                        <p className="text-[11px] text-slate-500 truncate">{currentUser.phone || currentUser.email}</p>
                        <span className="inline-block mt-1 bg-emerald-50 text-emerald-700 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-emerald-200">
                          ✓ Compte Client Vérifié
                        </span>
                      </div>

                      <div className="py-1">
                        <button
                          onClick={() => {
                            setIsUserDropdownOpen(false);
                            if (onOpenAccount) onOpenAccount();
                          }}
                          className="w-full px-4 py-2 text-left text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-slate-900 flex items-center gap-2.5 transition-colors"
                        >
                          <UserCheck className="w-4 h-4 text-emerald-600" />
                          <span>Mon Profil & Coordonnées</span>
                        </button>

                        {onOpenOrders && (
                          <button
                            onClick={() => {
                              setIsUserDropdownOpen(false);
                              onOpenOrders();
                            }}
                            className="w-full px-4 py-2 text-left text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-slate-900 flex items-center gap-2.5 transition-colors"
                          >
                            <Package className="w-4 h-4 text-amber-500" />
                            <span>Mes Commandes</span>
                          </button>
                        )}

                        <button
                          onClick={() => {
                            setIsUserDropdownOpen(false);
                            onOpenWishlist();
                          }}
                          className="w-full px-4 py-2 text-left text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-slate-900 flex items-center gap-2.5 transition-colors"
                        >
                          <Heart className="w-4 h-4 text-red-500" />
                          <span>Mes Favoris ({wishlistCount})</span>
                        </button>

                        {onOpenMessaging && (
                          <button
                            onClick={() => {
                              setIsUserDropdownOpen(false);
                              onOpenMessaging();
                            }}
                            className="w-full px-4 py-2 text-left text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-slate-900 flex items-center justify-between transition-colors"
                          >
                            <div className="flex items-center gap-2.5">
                              <MessageSquare className="w-4 h-4 text-emerald-600" />
                              <span>Ma Messagerie Vendeurs</span>
                            </div>
                            {unreadMessagesCount > 0 && (
                              <span className="bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">
                                {unreadMessagesCount}
                              </span>
                            )}
                          </button>
                        )}
                      </div>

                      <div className="border-t border-slate-100 pt-1 mt-1">
                        {onLogout && (
                          <button
                            onClick={() => {
                              setIsUserDropdownOpen(false);
                              onLogout();
                            }}
                            className="w-full px-4 py-2 text-left text-xs font-extrabold text-red-600 hover:bg-red-50 flex items-center gap-2.5 transition-colors"
                          >
                            <LogOut className="w-4 h-4 text-red-600" />
                            <span>Déconnexion</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* VISITOR CLIENT BUTTONS */
                <div className="hidden sm:flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onOpenLogin('CLIENT')}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-extrabold text-white bg-white/15 hover:bg-white/25 border border-white/25 transition-all cursor-pointer shadow-sm backdrop-blur-sm hover:scale-[1.02]"
                    title="Connexion Espace Client (Mes commandes, favoris, panier)"
                  >
                    <UserIcon className="w-4 h-4 text-amber-300" />
                    <span>Se connecter</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (onOpenRegister) {
                        onOpenRegister();
                      } else {
                        onOpenLogin('CLIENT');
                      }
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-black text-slate-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 border border-amber-300 transition-all cursor-pointer shadow-md shadow-amber-950/20 hover:scale-[1.02]"
                    title="Créer un nouveau compte client gratuit"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-slate-950" />
                    <span>Créer un compte</span>
                  </button>
                </div>
              )}

              {/* Mobile Hamburger Toggle */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="lg:hidden p-2 text-white hover:bg-white/15 rounded-2xl transition-all"
              >
                {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1.5 py-2.5 border-t border-white/15 text-xs font-bold">
            <button
              onClick={() => onNavigateSection('home')}
              className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
                activeNavSection === 'home'
                  ? 'bg-white text-[#0b2857] font-black shadow-md'
                  : 'text-blue-100 hover:text-white hover:bg-white/15'
              }`}
            >
              <Store className={`w-4 h-4 ${activeNavSection === 'home' ? 'text-red-600' : 'text-amber-300'}`} />
              <span>Accueil Marketplace</span>
            </button>

            <button
              onClick={() => onNavigateSection('categories')}
              className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
                activeNavSection === 'categories'
                  ? 'bg-white text-[#0b2857] font-black shadow-md'
                  : 'text-blue-100 hover:text-white hover:bg-white/15'
              }`}
            >
              <Layers className={`w-4 h-4 ${activeNavSection === 'categories' ? 'text-amber-600' : 'text-amber-300'}`} />
              <span>Toutes les Catégories</span>
            </button>

            <button
              onClick={() => onNavigateSection('stores')}
              className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
                activeNavSection === 'stores'
                  ? 'bg-white text-[#0b2857] font-black shadow-md'
                  : 'text-blue-100 hover:text-white hover:bg-white/15'
              }`}
            >
              <ShieldCheck className={`w-4 h-4 ${activeNavSection === 'stores' ? 'text-emerald-600' : 'text-emerald-300'}`} />
              <span>Boutiques Vérifiées</span>
            </button>

            <button
              onClick={() => onNavigateSection('how-it-works')}
              className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
                activeNavSection === 'how-it-works'
                  ? 'bg-white text-[#0b2857] font-black shadow-md'
                  : 'text-blue-100 hover:text-white hover:bg-white/15'
              }`}
            >
              <HelpCircle className={`w-4 h-4 ${activeNavSection === 'how-it-works' ? 'text-amber-600' : 'text-amber-300'}`} />
              <span>Comment ça marche ?</span>
            </button>

            <button
              onClick={() => onNavigateSection('contact')}
              className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
                activeNavSection === 'contact'
                  ? 'bg-white text-[#0b2857] font-black shadow-md'
                  : 'text-blue-100 hover:text-white hover:bg-white/15'
              }`}
            >
              <PhoneCall className={`w-4 h-4 ${activeNavSection === 'contact' ? 'text-emerald-600' : 'text-emerald-300'}`} />
              <span>Aide & Contact</span>
            </button>

            {/* Current city reminder pill */}
            <div className="ml-auto flex items-center gap-2 text-[11px]">
              <span className="text-amber-300 font-bold">📍 Ville :</span>
              <span className="font-black text-white bg-white/15 border border-white/25 px-2.5 py-1 rounded-xl shadow-inner backdrop-blur-sm">
                {currentCity} {currentCity === 'Conakry' && currentCommune ? `• ${currentCommune}` : ''}
              </span>
            </div>
          </nav>
        </div>

        {/* Mobile Navigation Drawer */}
        {isMobileMenuOpen && (
          <div className="lg:hidden bg-[#0a234f] border-b border-blue-900/60 p-4 space-y-3 animate-in slide-in-from-top duration-200 shadow-2xl max-w-full overflow-x-hidden text-white">
            {/* Mobile City Selector Button */}
            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                setIsLocationModalOpen(true);
              }}
              className="w-full flex items-center justify-between p-3 bg-white/10 hover:bg-white/15 rounded-2xl border border-white/20 text-left transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center border border-emerald-400/30">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10px] text-blue-200 uppercase font-bold">Votre localisation</p>
                  <p className="text-xs font-black text-white">
                    {currentCity} {currentCity === 'Conakry' && currentCommune ? `(${currentCommune})` : ''}
                  </p>
                </div>
              </div>
              <span className="text-xs font-extrabold text-amber-300">Modifier</span>
            </button>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={() => {
                  onNavigateSection('home');
                  setIsMobileMenuOpen(false);
                }}
                className={`p-3 rounded-2xl text-xs font-extrabold flex items-center gap-2 border transition-all ${
                  activeNavSection === 'home' 
                    ? 'bg-white text-[#0b2857] border-white shadow-md' 
                    : 'bg-white/10 hover:bg-white/15 text-white border-white/15'
                }`}
              >
                <Store className={`w-4 h-4 ${activeNavSection === 'home' ? 'text-red-600' : 'text-amber-300'}`} />
                Accueil
              </button>
              <button
                onClick={() => {
                  onNavigateSection('categories');
                  setIsMobileMenuOpen(false);
                }}
                className={`p-3 rounded-2xl text-xs font-extrabold flex items-center gap-2 border transition-all ${
                  activeNavSection === 'categories' 
                    ? 'bg-white text-[#0b2857] border-white shadow-md' 
                    : 'bg-white/10 hover:bg-white/15 text-white border-white/15'
                }`}
              >
                <Layers className={`w-4 h-4 ${activeNavSection === 'categories' ? 'text-amber-600' : 'text-amber-300'}`} />
                Catégories
              </button>
              <button
                onClick={() => {
                  onNavigateSection('stores');
                  setIsMobileMenuOpen(false);
                }}
                className={`p-3 rounded-2xl text-xs font-extrabold flex items-center gap-2 border transition-all ${
                  activeNavSection === 'stores' 
                    ? 'bg-white text-[#0b2857] border-white shadow-md' 
                    : 'bg-white/10 hover:bg-white/15 text-white border-white/15'
                }`}
              >
                <ShieldCheck className={`w-4 h-4 ${activeNavSection === 'stores' ? 'text-emerald-600' : 'text-emerald-300'}`} />
                Boutiques
              </button>
              {onOpenOrders && (
                <button
                  onClick={() => {
                    onOpenOrders();
                    setIsMobileMenuOpen(false);
                  }}
                  className="p-3 rounded-2xl bg-white/10 hover:bg-white/15 text-white text-xs font-extrabold flex items-center justify-between col-span-2 border border-white/15"
                >
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-amber-300" />
                    <span>Mes Commandes</span>
                  </div>
                </button>
              )}
              {onOpenMessaging && (
                <button
                  onClick={() => {
                    onOpenMessaging();
                    setIsMobileMenuOpen(false);
                  }}
                  className="p-3 rounded-2xl bg-white/10 hover:bg-white/15 text-white text-xs font-extrabold flex items-center justify-between col-span-2 border border-white/15"
                >
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-emerald-300" />
                    <span>Mes Messages Directs</span>
                  </div>
                  {unreadMessagesCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-red-600 text-white">
                      {unreadMessagesCount}
                    </span>
                  )}
                </button>
              )}
            </div>

            {/* Mobile Client Authentication */}
            <div className="pt-2 border-t border-white/15 flex flex-col gap-2">
              {currentUser ? (
                <div className="p-3 rounded-2xl bg-white/10 border border-white/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => {
                        if (onOpenAccount) onOpenAccount();
                        setIsMobileMenuOpen(false);
                      }}
                      className="flex items-center gap-2 text-left font-extrabold text-xs text-white"
                    >
                      <UserCheck className="w-4 h-4 text-emerald-300" />
                      <span>{currentUser.firstName} (Mon Profil)</span>
                    </button>
                    {onLogout && (
                      <button
                        onClick={() => {
                          onLogout();
                          setIsMobileMenuOpen(false);
                        }}
                        className="text-xs font-extrabold text-red-300 hover:text-red-200 underline"
                      >
                        Déconnexion
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onOpenLogin('CLIENT');
                      setIsMobileMenuOpen(false);
                    }}
                    className="py-2.5 px-3 rounded-2xl bg-white/15 hover:bg-white/25 text-white border border-white/25 font-black text-xs text-center shadow-md transition-all"
                  >
                    Se connecter
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (onOpenRegister) {
                        onOpenRegister();
                      } else {
                        onOpenLogin('CLIENT');
                      }
                      setIsMobileMenuOpen(false);
                    }}
                    className="py-2.5 px-3 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-black text-xs text-center shadow-md shadow-amber-500/20 transition-all"
                  >
                    Créer compte
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Location Modal */}
      {isLocationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-slate-200 w-full max-w-md p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-emerald-600" />
                <h3 className="font-extrabold text-slate-900 text-base">Sélectionner votre Localisation</h3>
              </div>
              <button 
                onClick={() => setIsLocationModalOpen(false)}
                className="p-1 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Ville Principale
                </label>
                <select
                  value={selectedCityInModal}
                  onChange={(e) => {
                    const c = e.target.value as GuineanCity;
                    setSelectedCityInModal(c);
                    if (c !== 'Conakry') setSelectedCommuneInModal(undefined);
                  }}
                  className="w-full bg-slate-50 text-slate-900 text-xs px-3.5 py-2.5 rounded-2xl border border-slate-200 focus:border-emerald-500 focus:outline-none"
                >
                  {GUINEAN_CITIES.map(city => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
              </div>

              {selectedCityInModal === 'Conakry' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Commune de Conakry
                  </label>
                  <select
                    value={selectedCommuneInModal || 'Kaloum'}
                    onChange={(e) => setSelectedCommuneInModal(e.target.value as ConakryCommune)}
                    className="w-full bg-slate-50 text-slate-900 text-xs px-3.5 py-2.5 rounded-2xl border border-slate-200 focus:border-emerald-500 focus:outline-none"
                  >
                    {CONAKRY_COMMUNES.map(commune => (
                      <option key={commune} value={commune}>{commune}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsLocationModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleApplyLocation}
                className="px-5 py-2 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 transition-all"
              >
                Valider ma position
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
