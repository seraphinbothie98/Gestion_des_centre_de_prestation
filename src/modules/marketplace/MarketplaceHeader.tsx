import React, { useState } from 'react';
import { 
  Store, MapPin, Search, Heart, ShoppingBag, User, 
  Menu, X, Sparkles, ChevronDown, Check, HelpCircle, 
  Layers, PhoneCall, PlusCircle, ArrowRight, ShieldCheck
} from 'lucide-react';
import { GuineanCity, ConakryCommune } from './types';

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
  onSelectLocation: (city: GuineanCity, commune?: ConakryCommune) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSearchSubmit: () => void;
  wishlistCount: number;
  cartCount: number;
  onOpenWishlist: () => void;
  onOpenCart: () => void;
  onOpenLogin: () => void;
  onOpenRegisterStore: () => void;
  onNavigateSection: (section: 'home' | 'categories' | 'stores' | 'how-it-works' | 'contact') => void;
  activeNavSection: 'home' | 'categories' | 'stores' | 'how-it-works' | 'contact';
}

export const MarketplaceHeader: React.FC<MarketplaceHeaderProps> = ({
  currentCity,
  currentCommune,
  onSelectLocation,
  searchQuery,
  onSearchChange,
  onSearchSubmit,
  wishlistCount,
  cartCount,
  onOpenWishlist,
  onOpenCart,
  onOpenLogin,
  onOpenRegisterStore,
  onNavigateSection,
  activeNavSection,
}) => {
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [selectedCityInModal, setSelectedCityInModal] = useState<GuineanCity>(currentCity);
  const [selectedCommuneInModal, setSelectedCommuneInModal] = useState<ConakryCommune | undefined>(currentCommune);

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
      <div className="h-1.5 w-full flex">
        <div className="flex-1 bg-red-600" />
        <div className="flex-1 bg-yellow-400" />
        <div className="flex-1 bg-emerald-600" />
      </div>

      {/* Top Announcement Banner */}
      <div className="bg-slate-950 text-slate-300 text-xs py-1.5 px-4 border-b border-slate-800">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 bg-slate-900 text-yellow-400 font-bold px-2.5 py-0.5 rounded-full text-[11px] border border-yellow-500/30">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Marketplace Nationale de Guinée
            </span>
            <span className="hidden sm:inline text-slate-400 text-[11px]">
              La plateforme officielle reliant acheteurs et commerçants partout en République de Guinée
            </span>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <button 
              onClick={() => onNavigateSection('how-it-works')}
              className="hover:text-yellow-400 transition-colors flex items-center gap-1"
            >
              <HelpCircle className="w-3 h-3 text-yellow-400" />
              Comment ça marche ?
            </button>
            <span className="text-slate-700">|</span>
            <button 
              onClick={() => onNavigateSection('contact')}
              className="hover:text-emerald-400 transition-colors flex items-center gap-1"
            >
              <PhoneCall className="w-3 h-3 text-emerald-400" />
              Assistance 7j/7
            </button>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <header className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur-md border-b border-slate-800 shadow-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-18 gap-3 sm:gap-6">
            
            {/* Logo with Guinea Tri-color Accents */}
            <div className="flex items-center gap-3 shrink-0">
              <button 
                onClick={() => onNavigateSection('home')}
                className="flex items-center gap-2.5 text-left group"
              >
                <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center text-white shadow-md relative overflow-hidden group-hover:scale-105 transition-transform">
                  <div className="absolute inset-0 opacity-20 bg-gradient-to-br from-red-600 via-yellow-400 to-emerald-600" />
                  <Store className="w-5 h-5 text-yellow-400 relative z-10" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-lg font-black text-red-500 tracking-tight">GUINÉE</span>
                    <span className="text-lg font-black text-yellow-400">BOUTIQUES</span>
                  </div>
                  <p className="text-[10px] text-emerald-400 font-bold -mt-1 tracking-wider uppercase flex items-center gap-1">
                    <span>●</span> Commerce & Marchés de Guinée
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
              className="hidden md:flex items-center gap-2 bg-slate-900/90 hover:bg-slate-850 border border-slate-800 hover:border-emerald-500/50 rounded-xl px-3 py-2 text-xs text-left transition-all shrink-0 group"
              title="Changer votre localisation"
            >
              <div className="w-7 h-7 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-all">
                <MapPin className="w-3.5 h-3.5" />
              </div>
              <div className="pr-1">
                <p className="text-[10px] text-slate-400 font-medium uppercase leading-tight">Votre Ville</p>
                <p className="text-xs font-bold text-white group-hover:text-emerald-400 transition-colors flex items-center gap-1">
                  {currentCity} {currentCity === 'Conakry' && currentCommune ? `(${currentCommune})` : ''}
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </p>
              </div>
            </button>

            {/* Global Search Bar */}
            <div className="flex-1 max-w-xl">
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  onSearchSubmit();
                }}
                className="relative flex items-center"
              >
                <div className="absolute left-3.5 text-slate-400 pointer-events-none">
                  <Search className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder="Que recherchez-vous ? Téléphone, vêtements, ordinateur, ciment..."
                  className="w-full bg-slate-900 text-slate-100 placeholder-slate-400 text-xs sm:text-sm pl-10 pr-24 py-2.5 rounded-xl border border-slate-700/80 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 focus:outline-none transition-all shadow-inner"
                />
                {/* Red Search Button (Action Principale) */}
                <button
                  type="submit"
                  className="absolute right-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold px-3.5 py-1.5 rounded-lg transition-all shadow-sm flex items-center gap-1"
                >
                  <span>Chercher</span>
                </button>
              </form>
            </div>

            {/* Right Action Icons & Buttons */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              
              {/* Wishlist */}
              <button
                onClick={onOpenWishlist}
                className="relative p-2.5 rounded-xl text-slate-300 hover:text-red-400 hover:bg-slate-850 transition-all"
                title="Mes Favoris"
              >
                <Heart className="w-5 h-5" />
                {wishlistCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-red-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                    {wishlistCount}
                  </span>
                )}
              </button>

              {/* Cart */}
              <button
                onClick={onOpenCart}
                className="relative p-2.5 rounded-xl text-slate-300 hover:text-white hover:bg-slate-850 transition-all flex items-center gap-1.5"
                title="Mon Panier"
              >
                <div className="relative">
                  <ShoppingBag className="w-5 h-5" />
                  {cartCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 text-slate-950 font-black text-[10px] rounded-full flex items-center justify-center shadow-sm">
                      {cartCount}
                    </span>
                  )}
                </div>
                <span className="hidden xl:inline text-xs font-bold text-slate-200">Panier</span>
              </button>

              {/* Login Button */}
              <button
                onClick={onOpenLogin}
                className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-200 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-700 transition-all"
              >
                <User className="w-4 h-4 text-emerald-400" />
                <span>Se connecter</span>
              </button>

              {/* Create Store Prominent Button (Rouge / Or) */}
              <button
                onClick={onOpenRegisterStore}
                className="flex items-center gap-1.5 bg-red-600 hover:bg-red-500 text-white font-black text-xs px-3.5 py-2 rounded-xl shadow-md shadow-red-600/30 hover:scale-[1.02] transition-all border border-red-500/50"
              >
                <PlusCircle className="w-4 h-4 text-yellow-300" />
                <span className="hidden md:inline">Créer ma boutique</span>
                <span className="md:hidden">Vendre</span>
              </button>

              {/* Mobile Hamburger Toggle */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="lg:hidden p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl"
              >
                {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1 py-2 border-t border-slate-800/60 text-xs font-semibold">
            <button
              onClick={() => onNavigateSection('home')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                activeNavSection === 'home'
                  ? 'bg-red-600/20 text-red-400 font-bold border border-red-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-850'
              }`}
            >
              <Store className="w-3.5 h-3.5" />
              Accueil Marketplace
            </button>

            <button
              onClick={() => onNavigateSection('categories')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                activeNavSection === 'categories'
                  ? 'bg-yellow-500/20 text-yellow-400 font-bold border border-yellow-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-850'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Toutes les Catégories
            </button>

            <button
              onClick={() => onNavigateSection('stores')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                activeNavSection === 'stores'
                  ? 'bg-emerald-600/20 text-emerald-400 font-bold border border-emerald-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-850'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Boutiques Vérifiées
            </button>

            <button
              onClick={() => onNavigateSection('how-it-works')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                activeNavSection === 'how-it-works'
                  ? 'bg-yellow-500/20 text-yellow-400 font-bold border border-yellow-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-850'
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5 text-yellow-400" />
              Comment ça marche ?
            </button>

            <button
              onClick={() => onNavigateSection('contact')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                activeNavSection === 'contact'
                  ? 'bg-emerald-600/20 text-emerald-400 font-bold border border-emerald-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-850'
              }`}
            >
              <PhoneCall className="w-3.5 h-3.5 text-emerald-400" />
              Aide & Contact
            </button>

            {/* Current city reminder pill */}
            <div className="ml-auto flex items-center gap-2 text-[11px] text-slate-400">
              <span className="text-emerald-400">📍 Ville active :</span>
              <span className="font-bold text-slate-200 bg-slate-900 px-2 py-0.5 rounded-md border border-slate-800">
                {currentCity} {currentCity === 'Conakry' && currentCommune ? `• ${currentCommune}` : ''}
              </span>
            </div>
          </nav>
        </div>

        {/* Mobile Navigation Drawer */}
        {isMobileMenuOpen && (
          <div className="lg:hidden bg-slate-900 border-b border-slate-800 p-4 space-y-3 animate-in slide-in-from-top duration-200">
            {/* Mobile City Selector Button */}
            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                setIsLocationModalOpen(true);
              }}
              className="w-full flex items-center justify-between p-3 bg-slate-850 rounded-xl border border-slate-700 text-left"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-semibold">Votre localisation</p>
                  <p className="text-xs font-bold text-white">
                    {currentCity} {currentCity === 'Conakry' && currentCommune ? `(${currentCommune})` : ''}
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold text-yellow-400">Modifier</span>
            </button>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={() => {
                  onNavigateSection('home');
                  setIsMobileMenuOpen(false);
                }}
                className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-200 text-xs font-semibold flex items-center gap-2"
              >
                <Store className="w-4 h-4 text-red-400" />
                Accueil
              </button>
              <button
                onClick={() => {
                  onNavigateSection('categories');
                  setIsMobileMenuOpen(false);
                }}
                className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-200 text-xs font-semibold flex items-center gap-2"
              >
                <Layers className="w-4 h-4 text-yellow-400" />
                Catégories
              </button>
              <button
                onClick={() => {
                  onNavigateSection('stores');
                  setIsMobileMenuOpen(false);
                }}
                className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-200 text-xs font-semibold flex items-center gap-2"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Boutiques
              </button>
              <button
                onClick={() => {
                  onNavigateSection('how-it-works');
                  setIsMobileMenuOpen(false);
                }}
                className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-200 text-xs font-semibold flex items-center gap-2"
              >
                <HelpCircle className="w-4 h-4 text-yellow-400" />
                Comment faire ?
              </button>
            </div>

            <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
              <button
                onClick={() => {
                  onOpenLogin();
                  setIsMobileMenuOpen(false);
                }}
                className="flex-1 py-2.5 px-3 rounded-xl bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-2 border border-slate-700"
              >
                <User className="w-4 h-4 text-emerald-400" />
                Se connecter
              </button>
              <button
                onClick={() => {
                  onOpenRegisterStore();
                  setIsMobileMenuOpen(false);
                }}
                className="flex-1 py-2.5 px-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs flex items-center justify-center gap-2 shadow-md"
              >
                <PlusCircle className="w-4 h-4 text-yellow-300" />
                Créer boutique
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Location Selector Modal */}
      {isLocationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl space-y-4 p-6">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Choisir votre ville en Guinée</h3>
                  <p className="text-xs text-slate-400">Priorisez les boutiques et produits proches de chez vous</p>
                </div>
              </div>
              <button 
                onClick={() => setIsLocationModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              <p className="text-xs font-bold text-slate-300 uppercase tracking-wider">Principales Villes</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {GUINEAN_CITIES.map((city) => (
                  <button
                    key={city}
                    type="button"
                    onClick={() => {
                      setSelectedCityInModal(city);
                      if (city !== 'Conakry') {
                        setSelectedCommuneInModal(undefined);
                      }
                    }}
                    className={`p-2.5 rounded-xl text-xs font-bold text-left transition-all flex items-center justify-between border ${
                      selectedCityInModal === city
                        ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-600/30'
                        : 'bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-800 border-slate-700/60'
                    }`}
                  >
                    <span>📍 {city}</span>
                    {selectedCityInModal === city && <Check className="w-3.5 h-3.5" />}
                  </button>
                ))}
              </div>

              {/* Commune selector for Conakry */}
              {selectedCityInModal === 'Conakry' && (
                <div className="pt-3 border-t border-slate-800 space-y-2">
                  <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                    <span>Commune de Conakry (Optionnel)</span>
                  </p>
                  <div className="grid grid-cols-3 gap-1.5">
                    {CONAKRY_COMMUNES.map((commune) => (
                      <button
                        key={commune}
                        type="button"
                        onClick={() => {
                          setSelectedCommuneInModal(
                            selectedCommuneInModal === commune ? undefined : commune
                          );
                        }}
                        className={`p-2 rounded-lg text-[11px] font-semibold text-center transition-all border ${
                          selectedCommuneInModal === commune
                            ? 'bg-emerald-600 text-white border-emerald-500 font-bold'
                            : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 border-slate-700/50'
                        }`}
                      >
                        {commune}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-800 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  setSelectedCityInModal('Conakry');
                  setSelectedCommuneInModal(undefined);
                  onSelectLocation('Conakry', undefined);
                  setIsLocationModalOpen(false);
                }}
                className="text-xs font-semibold text-slate-400 hover:text-slate-200"
              >
                Réinitialiser (Conakry)
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsLocationModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-300 hover:bg-slate-800"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleApplyLocation}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30 flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  Appliquer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
