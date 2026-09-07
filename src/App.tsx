import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { AppLayout } from './components/layout/AppLayout';
import { LoginView } from './modules/auth/LoginView';
import { CertificateVerificationView } from './modules/certificates/CertificateVerificationView';
import { MarketplaceHomeView } from './modules/marketplace/MarketplaceHomeView';
import { dbStore, DatabaseState } from './server/db/mockStore';
import { Tenant } from './types';
import { ArrowLeft, Sparkles, LayoutDashboard } from 'lucide-react';

const MainAppRouter: React.FC<{
  onOpenCertificateVerification: (code?: string) => void;
}> = ({ onOpenCertificateVerification }) => {
  const { isAuthenticated, allTenants, currentUser } = useAuth();
  const [dbState, setDbState] = useState<DatabaseState>(() => dbStore.getState());
  const [showLogin, setShowLogin] = useState<boolean>(() => {
    return window.location.pathname === '/login' || window.location.hash === '#login';
  });
  const [showMarketplacePreview, setShowMarketplacePreview] = useState<boolean>(false);

  useEffect(() => {
    return dbStore.subscribe(() => {
      setDbState({ ...dbStore.getState() });
    });
  }, []);

  // Sync with browser back/forward or hash changes
  useEffect(() => {
    const handleHashOrPop = () => {
      if (window.location.pathname === '/login' || window.location.hash === '#login') {
        setShowLogin(true);
      } else if (window.location.pathname === '/marketplace' || window.location.hash === '#marketplace') {
        setShowMarketplacePreview(true);
        setShowLogin(false);
      }
    };
    window.addEventListener('popstate', handleHashOrPop);
    window.addEventListener('hashchange', handleHashOrPop);
    return () => {
      window.removeEventListener('popstate', handleHashOrPop);
      window.removeEventListener('hashchange', handleHashOrPop);
    };
  }, []);

  const handleRegisterStoreSuccess = (newTenant: Tenant) => {
    // Tenant is registered, offer to log in or update store list
    dbStore.updateState(draft => {
      const exists = draft.tenants.some(t => t.id === newTenant.id);
      if (!exists) {
        draft.tenants.push(newTenant);
      }
    });
  };

  // Case 1: Authenticated user is previewing the public marketplace
  if (isAuthenticated && showMarketplacePreview) {
    return (
      <div className="relative">
        {/* Floating Quick Return Bar for Authenticated Users */}
        <div className="sticky top-0 z-50 bg-slate-900/95 border-b border-brand-500/30 backdrop-blur-md px-4 py-2.5 flex items-center justify-between text-xs text-slate-200 shadow-xl">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-bold text-white">Mode Aperçu Marketplace Publique</span>
            <span className="hidden sm:inline text-slate-400">
              (Connecté en tant que <strong className="text-brand-400">{currentUser?.firstName} {currentUser?.lastName}</strong>)
            </span>
          </div>

          <button
            onClick={() => setShowMarketplacePreview(false)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-black transition-all shadow-md"
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>← Retour à mon Espace de Gestion</span>
          </button>
        </div>

        <MarketplaceHomeView
          tenants={dbState.tenants}
          products={dbState.products}
          onOpenLogin={() => setShowLogin(true)}
          onRegisterStoreSuccess={handleRegisterStoreSuccess}
        />
      </div>
    );
  }

  // Case 2: Authenticated user in the standard administration & business management layout
  if (isAuthenticated) {
    return (
      <AppLayout
        onOpenCertificateVerification={onOpenCertificateVerification}
        onOpenMarketplace={() => setShowMarketplacePreview(true)}
      />
    );
  }

  // Case 3: Unauthenticated user navigated to Login View
  if (showLogin) {
    return (
      <LoginView
        onBackToMarketplace={() => {
          setShowLogin(false);
          if (window.location.hash === '#login') {
            window.location.hash = '';
          }
        }}
      />
    );
  }

  // Case 4: Default public landing page for visitors & clients (Marketplace Boutiques)
  return (
    <MarketplaceHomeView
      tenants={dbState.tenants}
      products={dbState.products}
      onOpenLogin={() => setShowLogin(true)}
      onRegisterStoreSuccess={handleRegisterStoreSuccess}
    />
  );
};

export const App: React.FC = () => {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [verifyCertCode, setVerifyCertCode] = useState<string>('CERT-2026-000001');

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Check if public certificate verification route is requested
  const isVerifyRoute = currentPath.startsWith('/verify/certificate') || currentPath === '/verify';

  if (isVerifyRoute) {
    const codeFromPath = currentPath.split('/verify/certificate/')[1] || verifyCertCode;
    return (
      <CertificateVerificationView
        initialCode={codeFromPath}
        onBackToApp={() => {
          window.history.pushState({}, '', '/');
          setCurrentPath('/');
        }}
      />
    );
  }

  return (
    <AuthProvider>
      <NotificationProvider>
        <MainAppRouter
          onOpenCertificateVerification={(code) => {
            setVerifyCertCode(code || 'CERT-2026-000001');
            window.history.pushState({}, '', `/verify/certificate/${code || 'CERT-2026-000001'}`);
            setCurrentPath(`/verify/certificate/${code || 'CERT-2026-000001'}`);
          }}
        />
      </NotificationProvider>
    </AuthProvider>
  );
};

export default App;

