import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Logo } from './Logo';
import { RecebimentoView } from './views/RecebimentoView';
import { ComunicacaoView } from './views/ComunicacaoView';
import { AdminView } from './views/AdminView';
import { LogOut, Users, MessageCircle, Shield } from 'lucide-react';
import { BirthdaysNotification } from './BirthdaysNotification';

export function Dashboard() {
  const { userDoc, logout } = useAuth();
  const isAdmin = userDoc?.role === 'admin';
  const [activeTab, setActiveTab] = useState<'recepcao' | 'comunicacao' | 'admin'>('recepcao');

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-3">
              <Logo className="w-10 h-10" />
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">Ministério da Recepção</h1>
            </div>
            <div className="flex items-center space-x-2">
              <BirthdaysNotification />
              <button 
                onClick={logout}
                className="text-gray-500 hover:text-red-600 transition-colors flex items-center space-x-1 p-2"
                title="Sair"
              >
                <LogOut className="w-5 h-5" />
                <span className="hidden sm:inline text-sm font-medium">Sair</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 mt-6">
        <div className="flex space-x-2 sm:space-x-4 mb-6 border-b border-gray-200 overflow-x-auto whitespace-nowrap pb-1">
          <button
            onClick={() => setActiveTab('recepcao')}
            className={`pb-3 px-2 text-sm font-medium flex items-center space-x-2 border-b-2 transition-colors shrink-0 ${
              activeTab === 'recepcao' ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">Recepção e Check-in</span>
            <span className="sm:hidden">Recepção</span>
          </button>
          <button
            onClick={() => setActiveTab('comunicacao')}
            className={`pb-3 px-2 text-sm font-medium flex items-center space-x-2 border-b-2 transition-colors shrink-0 ${
              activeTab === 'comunicacao' ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <MessageCircle className="w-4 h-4" />
            <span>Comunicação</span>
          </button>
          {isAdmin && (
            <button
              onClick={() => setActiveTab('admin')}
              className={`pb-3 px-2 text-sm font-medium flex items-center space-x-2 border-b-2 transition-colors shrink-0 ${
                activeTab === 'admin' ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Shield className="w-4 h-4" />
              <span>Admin</span>
            </button>
          )}
        </div>

        <main className="pb-12">
          {activeTab === 'recepcao' && <RecebimentoView />}
          {activeTab === 'comunicacao' && <ComunicacaoView />}
          {activeTab === 'admin' && isAdmin && <AdminView />}
        </main>
      </div>
    </div>
  );
}
