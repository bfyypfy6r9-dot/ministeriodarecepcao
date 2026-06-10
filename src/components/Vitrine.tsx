import React from 'react';
import { Logo } from './Logo';
import { useAuth } from '../context/AuthContext';

export function Vitrine() {
  const { logout, userDoc } = useAuth();
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden p-8 text-center space-y-8">
        <Logo className="w-40 h-40 mx-auto" />
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Ministério da Recepção</h1>
        
        {userDoc?.status === 'pendente' && (
          <div className="space-y-4">
            <div className="inline-flex items-center justify-center p-3 bg-orange-100 rounded-full">
              <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <h2 className="text-xl font-medium text-gray-800">Sua conta está em análise!</h2>
            <p className="text-gray-500">
              Agradecemos seu cadastro. No momento, o seu acesso está pendente de aprovação por um administrador.
              Por favor, aguarde a liberação.
            </p>
          </div>
        )}

        <button 
          onClick={logout}
          className="text-sm font-medium text-red-600 hover:text-red-500 flex items-center justify-center mx-auto space-x-1"
        >
          <span>Sair da conta</span>
        </button>
      </div>
    </div>
  );
}
