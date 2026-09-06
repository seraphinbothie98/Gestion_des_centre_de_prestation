import React from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { SupportContactConfig } from '../../types';
import { Phone, Mail, MessageSquare, MapPin, Building, ShieldCheck, ExternalLink } from 'lucide-react';

interface ContactSupportModalProps {
  isOpen: boolean;
  onClose: () => void;
  supportContact: SupportContactConfig;
  tenantName?: string;
  onOpenActivationRequest?: () => void;
}

export const ContactSupportModal: React.FC<ContactSupportModalProps> = ({
  isOpen,
  onClose,
  supportContact,
  tenantName,
  onOpenActivationRequest,
}) => {
  const cleanPhone = supportContact.phone.replace(/[^0-9+]/g, '');
  const cleanWhatsapp = (supportContact.whatsapp || supportContact.phone).replace(/[^0-9]/g, '');

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Contacter l'Administration & Support"
      maxWidth="md"
    >
      <div className="space-y-5 pt-1 text-slate-800 dark:text-slate-200">
        <div className="p-4 bg-brand-50 dark:bg-brand-950/50 rounded-2xl border border-brand-200/80 dark:border-brand-900/60 flex items-start gap-3">
          <div className="p-2 bg-brand-500 text-white rounded-xl shadow-sm shrink-0">
            <Building className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-extrabold text-brand-950 dark:text-brand-200">
              {supportContact.name}
            </h4>
            {tenantName && (
              <p className="text-xs text-brand-700 dark:text-brand-400 mt-0.5">
                Pour le compte de : <strong>{tenantName}</strong>
              </p>
            )}
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
              {supportContact.customMessage}
            </p>
          </div>
        </div>

        {/* Contact Methods Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Phone */}
          <a
            href={`tel:${cleanPhone}`}
            className="p-3.5 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-brand-500 hover:bg-brand-50/50 dark:hover:bg-brand-950/30 transition-all flex items-center gap-3 group"
          >
            <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400">
              <Phone className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Téléphone / Appel</span>
              <strong className="text-xs text-slate-900 dark:text-white font-mono group-hover:text-brand-600">
                {supportContact.phone}
              </strong>
            </div>
          </a>

          {/* WhatsApp */}
          <a
            href={`https://wa.me/${cleanWhatsapp}?text=${encodeURIComponent(`Bonjour, je vous contacte concernant l'activation de licence Centre Management System pour : ${tenantName || 'notre centre'}.`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="p-3.5 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/30 transition-all flex items-center gap-3 group"
          >
            <div className="p-2 rounded-lg bg-emerald-500 text-white shadow-sm">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">WhatsApp Direct</span>
              <strong className="text-xs text-slate-900 dark:text-white font-mono group-hover:text-emerald-600">
                {supportContact.whatsapp || supportContact.phone}
              </strong>
            </div>
          </a>

          {/* Email */}
          <a
            href={`mailto:${supportContact.email}?subject=${encodeURIComponent(`Demande d'activation licence - ${tenantName || 'Centre'}`)}`}
            className="p-3.5 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-brand-500 hover:bg-brand-50/50 dark:hover:bg-brand-950/30 transition-all flex items-center gap-3 group"
          >
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400">
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Email Professionnel</span>
              <strong className="text-xs text-slate-900 dark:text-white font-mono group-hover:text-brand-600 truncate max-w-[150px] block">
                {supportContact.email}
              </strong>
            </div>
          </a>

          {/* Address */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Siège & Bureau</span>
              <span className="text-xs text-slate-900 dark:text-white font-medium block truncate max-w-[150px]">
                {supportContact.address}
              </span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <Button variant="outline" onClick={onClose}>
            Fermer
          </Button>

          {onOpenActivationRequest && (
            <Button
              variant="primary"
              icon={ShieldCheck}
              onClick={() => {
                onClose();
                onOpenActivationRequest();
              }}
              className="font-bold"
            >
              Envoyer une Demande d'Activation
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};
