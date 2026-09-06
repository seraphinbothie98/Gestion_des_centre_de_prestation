import React, { useState, useMemo } from 'react';
import { Modal } from '../ui/Modal';
import { dbStore } from '../../server/db/mockStore';
import { Search, ShoppingBag, GraduationCap, Users, Receipt, FileText, ArrowRight } from 'lucide-react';
import { formatCurrency, formatDate } from '../../lib/utils';
import { NavSection } from '../layout/Sidebar';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (section: NavSection) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  onNavigate,
}) => {
  const [query, setQuery] = useState('');
  const state = dbStore.getState();

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();

    const matchedOrders = state.orders
      .filter(o => o.orderNumber.toLowerCase().includes(q) || o.personName.toLowerCase().includes(q))
      .map(o => ({
        type: 'Commande',
        id: o.id,
        title: `${o.orderNumber} — ${o.personName}`,
        subtitle: `${formatCurrency(o.totalAmount)} • Statut: ${o.status}`,
        section: 'orders' as NavSection,
        icon: ShoppingBag,
      }));

    const matchedPersons = state.persons
      .filter(p => `${p.firstName} ${p.lastName}`.toLowerCase().includes(q) || p.phone?.includes(q) || p.email?.toLowerCase().includes(q))
      .map(p => ({
        type: 'Personne / Client',
        id: p.id,
        title: `${p.firstName} ${p.lastName}`,
        subtitle: `Tél: ${p.phone || '-'} • Rôles: ${p.types.join(', ')}`,
        section: 'persons' as NavSection,
        icon: Users,
      }));

    const matchedTrainings = state.trainings
      .filter(t => t.title.toLowerCase().includes(q) || t.code.toLowerCase().includes(q))
      .map(t => ({
        type: 'Formation',
        id: t.id,
        title: `${t.code} : ${t.title}`,
        subtitle: `${t.durationHours}h • ${formatCurrency(t.price)}`,
        section: 'training' as NavSection,
        icon: GraduationCap,
      }));

    const matchedInvoices = state.invoices
      .filter(i => i.documentNumber.toLowerCase().includes(q) || i.personName.toLowerCase().includes(q))
      .map(i => ({
        type: 'Facture',
        id: i.id,
        title: `${i.documentNumber} — ${i.personName}`,
        subtitle: `${formatCurrency(i.totalAmount)} • Émise le ${formatDate(i.issueDate)}`,
        section: 'billing' as NavSection,
        icon: Receipt,
      }));

    const matchedCerts = state.certificates
      .filter(c => c.certificateCode.toLowerCase().includes(q) || c.learnerName.toLowerCase().includes(q))
      .map(c => ({
        type: 'Certificat',
        id: c.id,
        title: `${c.certificateCode} — ${c.learnerName}`,
        subtitle: `Formation: ${c.trainingTitle} • Mention: ${c.mention}`,
        section: 'training' as NavSection,
        icon: FileText,
      }));

    return [...matchedOrders, ...matchedPersons, ...matchedTrainings, ...matchedInvoices, ...matchedCerts].slice(0, 8);
  }, [query, state]);

  const handleSelect = (section: NavSection) => {
    onNavigate(section);
    onClose();
    setQuery('');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="xl">
      <div className="space-y-4">
        <div className="relative">
          <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher un client, commande (CMD-...), formation, facture, certificat..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-slate-900 dark:text-white"
          />
        </div>

        {results.length > 0 ? (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/60 max-h-96 overflow-y-auto">
            {results.map((res) => {
              const Icon = res.icon;
              return (
                <button
                  key={`${res.type}-${res.id}`}
                  onClick={() => handleSelect(res.section)}
                  className="w-full p-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl transition-colors text-left group"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-lg bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-brand-600 transition-colors">
                          {res.title}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded">
                          {res.type}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{res.subtitle}</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              );
            })}
          </div>
        ) : query.trim() ? (
          <div className="text-center py-8 text-slate-500 dark:text-slate-400 text-xs">
            Aucun résultat trouvé pour "{query}".
          </div>
        ) : (
          <div className="text-center py-6 text-slate-400 dark:text-slate-500 text-xs">
            Tapez un mot-clé ou un identifiant (ex: CMD-2026, Kourouma, Web, CERT-2026)...
          </div>
        )}
      </div>
    </Modal>
  );
};
