import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { dbStore } from '../../server/db/mockStore';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { GLOBAL_MARKETPLACE_CATEGORIES } from '../marketplace/MarketplaceCategoriesData';
import { 
  Tag, Plus, Trash2, CheckCircle2, Store, 
  Sparkles, Layers, Info, Search, AlertCircle
} from 'lucide-react';

export const BoutiqueCategoriesManager: React.FC = () => {
  const { currentTenant } = useAuth();
  const { showToast } = useNotification();
  const currentBoutiqueId = currentTenant?.id || 't-001';

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [customCategoryName, setCustomCategoryName] = useState('');

  // Fetch current store's active categories
  const activeTenant = dbStore.getState().tenants.find(t => t.id === currentBoutiqueId);
  const selectedCategories: string[] = activeTenant?.selectedCategories || ['Papeterie', 'Informatique & Bureautique'];

  // Categories available in central catalog not yet added
  const availableCatalogCategories = useMemo(() => {
    return GLOBAL_MARKETPLACE_CATEGORIES.filter(cat => {
      const alreadySelected = selectedCategories.some(
        sel => sel.toLowerCase() === cat.name.toLowerCase() || sel.toLowerCase() === cat.code.toLowerCase()
      );
      if (alreadySelected) return false;
      if (!catalogSearch.trim()) return true;
      const q = catalogSearch.toLowerCase();
      return cat.name.toLowerCase().includes(q) || cat.description.toLowerCase().includes(q);
    });
  }, [selectedCategories, catalogSearch]);

  const handleAddCategory = (categoryName: string) => {
    const trimmed = categoryName.trim();
    if (!trimmed) return;

    if (selectedCategories.some(c => c.toLowerCase() === trimmed.toLowerCase())) {
      showToast('Déjà active', `La catégorie "${trimmed}" est déjà activée pour votre boutique.`, 'INFO');
      return;
    }

    const updated = [...selectedCategories, trimmed];
    const res = dbStore.updateBoutiqueCategories(currentBoutiqueId, updated);
    if (res.success) {
      showToast('Catégorie ajoutée', `La catégorie "${trimmed}" a été ajoutée à votre boutique.`, 'SUCCESS');
      setCustomCategoryName('');
    } else {
      showToast('Erreur', res.message, 'DANGER');
    }
  };

  const handleRemoveCategory = (categoryName: string) => {
    const updated = selectedCategories.filter(c => c.toLowerCase() !== categoryName.toLowerCase());
    const res = dbStore.updateBoutiqueCategories(currentBoutiqueId, updated);
    if (res.success) {
      showToast('Catégorie retirée', `La catégorie "${categoryName}" a été retirée de votre boutique.`, 'INFO');
    } else {
      showToast('Erreur', res.message, 'DANGER');
    }
  };

  return (
    <Card className="p-6 space-y-5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-2xl shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-700">
        <div>
          <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <Tag className="w-5 h-5 text-brand-500" />
            Catégories de ma boutique
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Gérez les rayons et catégories du catalogue central dans lesquels votre boutique peut publier des articles sur le Marketplace.
          </p>
        </div>

        <Button
          variant="primary"
          icon={Plus}
          size="sm"
          onClick={() => setIsAddModalOpen(true)}
        >
          + Ajouter une catégorie
        </Button>
      </div>

      {/* Active categories badge grid */}
      <div className="space-y-3">
        <p className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
          Rayons actifs ({selectedCategories.length})
        </p>

        {selectedCategories.length === 0 ? (
          <div className="p-6 text-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl text-slate-400 text-xs">
            <Layers className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
            Aucune catégorie activée. Cliquez sur <strong>"+ Ajouter une catégorie"</strong> pour en sélectionner dans le catalogue central.
          </div>
        ) : (
          <div className="flex flex-wrap gap-2.5">
            {selectedCategories.map((catName) => {
              const matchedCatalog = GLOBAL_MARKETPLACE_CATEGORIES.find(
                c => c.name.toLowerCase() === catName.toLowerCase() || c.code.toLowerCase() === catName.toLowerCase()
              );
              const icon = matchedCatalog?.icon || '🏷️';

              return (
                <div
                  key={catName}
                  className="group flex items-center gap-2 px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xs transition-all hover:border-brand-500"
                >
                  <span className="text-base">{icon}</span>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {catName}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveCategory(catName)}
                    className="text-slate-400 hover:text-rose-500 p-0.5 transition-colors ml-1"
                    title="Retirer cette catégorie de la boutique"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Info notice */}
      <div className="flex items-start gap-2.5 p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-[11px] text-blue-700 dark:text-blue-300">
        <Info className="w-4 h-4 shrink-0 mt-0.5" />
        <div>
          <strong>Catalogue Central Commun :</strong> Les catégories sélectionnées ici n'apparaissent sur le Marketplace public que lorsque vous y publiez au moins un produit actif avec du stock.
        </div>
      </div>

      {/* Modal: Add Category from Central Catalog */}
      {isAddModalOpen && (
        <Modal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          title="Ajouter une Catégorie à ma Boutique"
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Sélectionnez une catégorie issue du <strong>Catalogue Central Marketplace</strong> ou saisissez un nouveau rayon.
            </p>

            {/* Catalog search */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                placeholder="Rechercher dans le catalogue central (ex: Papeterie, Informatique...)"
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            {/* Catalog List */}
            <div className="max-h-60 overflow-y-auto space-y-2 pr-1 divide-y divide-slate-100 dark:divide-slate-800">
              {availableCatalogCategories.length === 0 ? (
                <p className="p-4 text-center text-xs text-slate-400">
                  Toutes les catégories du catalogue correspondant à votre recherche sont déjà activées.
                </p>
              ) : (
                availableCatalogCategories.map(cat => (
                  <div
                    key={cat.id}
                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{cat.icon}</span>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white">{cat.name}</h4>
                        <p className="text-[10px] text-slate-400 truncate max-w-xs">{cat.description}</p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAddCategory(cat.name)}
                    >
                      Activer
                    </Button>
                  </div>
                ))
              )}
            </div>

            {/* Custom Category Input */}
            <div className="pt-3 border-t border-slate-200 dark:border-slate-700 space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                Ou ajouter un rayon personnalisé :
              </label>
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Ex : Matériel d'imprimerie offset"
                  value={customCategoryName}
                  onChange={(e) => setCustomCategoryName(e.target.value)}
                  className="text-xs"
                />
                <Button
                  variant="primary"
                  size="sm"
                  disabled={!customCategoryName.trim()}
                  onClick={() => {
                    handleAddCategory(customCategoryName);
                  }}
                >
                  Ajouter
                </Button>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="outline" size="sm" onClick={() => setIsAddModalOpen(false)}>
                Fermer
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </Card>
  );
};
