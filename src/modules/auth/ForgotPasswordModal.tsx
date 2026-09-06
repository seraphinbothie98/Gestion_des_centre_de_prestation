import React, { useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useAuth } from '../../context/AuthContext';
import { KeyRound, ShieldCheck, Mail, ArrowRight, Lock, CheckCircle2 } from 'lucide-react';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { requestPasswordReset, resetPasswordWithCode } = useAuth();

  const [step, setStep] = useState<'REQUEST' | 'VERIFY' | 'SUCCESS'>('REQUEST');
  const [identifier, setIdentifier] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [generatedDemoCode, setGeneratedDemoCode] = useState<string | null>(null);

  const handleRequest = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!identifier.trim()) {
      setErrorMsg("Veuillez saisir votre login ou adresse email.");
      return;
    }

    const res = requestPasswordReset(identifier);
    if (res.success) {
      if (res.code) {
        setGeneratedDemoCode(res.code);
        setCode(res.code); // Pre-fill for convenience in demo
      }
      setStep('VERIFY');
    } else {
      setErrorMsg(res.message);
    }
  };

  const handleReset = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!code.trim()) {
      setErrorMsg("Veuillez renseigner le code de vérification à 6 chiffres.");
      return;
    }

    if (newPassword.length < 6) {
      setErrorMsg("Le mot de passe doit comporter au moins 6 caractères.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg("Les deux mots de passe ne correspondent pas.");
      return;
    }

    const res = resetPasswordWithCode(identifier, code, newPassword);
    if (res.success) {
      setStep('SUCCESS');
    } else {
      setErrorMsg(res.message);
    }
  };

  const handleFinish = () => {
    onClose();
    onSuccess();
    setStep('REQUEST');
    setIdentifier('');
    setCode('');
    setNewPassword('');
    setConfirmPassword('');
    setErrorMsg(null);
    setGeneratedDemoCode(null);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2 text-slate-900 dark:text-white">
          <KeyRound className="w-5 h-5 text-brand-600" />
          <span>Réinitialisation Sécurisée du Mot de Passe</span>
        </div>
      }
      maxWidth="md"
    >
      <div className="space-y-4 pt-2">
        {step === 'REQUEST' && (
          <form onSubmit={handleRequest} className="space-y-4">
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Saisissez votre <strong>login</strong> ou votre <strong>adresse email</strong> professionnelle. Un code temporaire à 6 chiffres vous sera généré pour redéfinir votre mot de passe.
            </p>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                {errorMsg}
              </div>
            )}

            <Input
              label="Login ou Email du compte"
              placeholder="ex: admin ou directeur@cpep.com"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Annuler
              </Button>
              <Button type="submit" variant="primary" icon={ArrowRight}>
                Envoyer le Code
              </Button>
            </div>
          </form>
        )}

        {step === 'VERIFY' && (
          <form onSubmit={handleReset} className="space-y-4">
            {generatedDemoCode && (
              <div className="p-3 bg-brand-50 dark:bg-brand-950/50 border border-brand-200 dark:border-brand-800 rounded-xl text-xs">
                <span className="font-bold text-brand-700 dark:text-brand-300 block mb-1 flex items-center gap-1">
                  <ShieldCheck className="w-4 h-4" /> Code de sécurité temporaire généré :
                </span>
                <span className="font-mono text-base font-extrabold text-brand-600 bg-white dark:bg-slate-900 px-3 py-1 rounded-lg border border-brand-300 inline-block tracking-widest">
                  {generatedDemoCode}
                </span>
                <p className="text-[10px] text-slate-500 mt-1">Valable 15 minutes à usage unique.</p>
              </div>
            )}

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                {errorMsg}
              </div>
            )}

            <Input
              label="Code de vérification (6 chiffres)"
              placeholder="123456"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
            />

            <Input
              label="Nouveau mot de passe"
              type="password"
              placeholder="Min. 6 caractères"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />

            <Input
              label="Confirmer le nouveau mot de passe"
              type="password"
              placeholder="Répétez le mot de passe"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />

            <div className="flex justify-between items-center pt-2">
              <Button type="button" variant="outline" onClick={() => setStep('REQUEST')}>
                Retour
              </Button>
              <Button type="submit" variant="primary" icon={Lock}>
                Valider & Modifier
              </Button>
            </div>
          </form>
        )}

        {step === 'SUCCESS' && (
          <div className="text-center py-4 space-y-4">
            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                Mot de Passe Modifié avec Succès !
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Votre nouveau mot de passe a été enregistré. Vous pouvez maintenant vous connecter à votre compte.
              </p>
            </div>
            <Button variant="primary" onClick={handleFinish} className="w-full">
              Retour à la Connexion
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
};
