import React, { useState, useEffect, useRef } from 'react';
import { Bell, Gift, BookOpen, MessageCircle } from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { RecepcaoDoc } from '../types';

export function BirthdaysNotification() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [birthdays, setBirthdays] = useState<RecepcaoDoc[]>([]);
  const [studyCandidates, setStudyCandidates] = useState<RecepcaoDoc[]>([]);
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchAlerts = async () => {
      const now = new Date();
      const monthStr = String(now.getMonth() + 1).padStart(2, '0');
      const dayStr = String(now.getDate()).padStart(2, '0');
      const postfix = `-${monthStr}-${dayStr}`;

      try {
        const recepcaoRef = collection(db, 'recepcao');
        const snapshot = await getDocs(recepcaoRef);
        const visitors: RecepcaoDoc[] = [];
        snapshot.forEach(doc => {
          visitors.push({ id: doc.id, ...doc.data() } as RecepcaoDoc);
        });

        const todayBirthdays = visitors.filter(v => 
          v.data_nascimento && v.data_nascimento.endsWith(postfix)
        );
        setBirthdays(todayBirthdays);

        const candidates = visitors.filter(v => v.presencasCount === 3);
        setStudyCandidates(candidates);
      } catch (err) {
        console.error("Error fetching alerts", err);
      }
    };

    fetchAlerts();
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const toggleOpen = () => {
    setIsOpen(!isOpen);
  };

  const totalAlerts = birthdays.length + studyCandidates.length;

  return (
    <div className="relative" ref={popupRef}>
      <button 
        onClick={toggleOpen}
        className="text-gray-500 hover:text-orange-600 transition-colors flex items-center space-x-1 p-2 relative outline-none"
        title="Notificações e Alertas"
      >
        <Bell className="w-5 h-5" />
        {totalAlerts > 0 && !isOpen && (
          <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white">
            {totalAlerts}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-100 z-50 overflow-hidden text-sm">
          {/* Birthdays Section */}
          <div className="px-4 py-3 border-b border-gray-50 bg-gray-50 text-gray-800 font-semibold flex items-center gap-2">
            <Gift className="w-4 h-4 text-orange-500" />
            Aniversariantes de Hoje
          </div>
          <div className="max-h-48 overflow-y-auto p-2 border-b border-gray-100">
            {birthdays.length === 0 ? (
              <p className="text-gray-500 p-2 text-center text-xs">Nenhum aniversariante hoje.</p>
            ) : (
              birthdays.map(b => (
                <div key={b.id} className="p-2 border-b border-gray-50 last:border-0 hover:bg-gray-50 rounded transition-colors flex justify-between items-center">
                  <div>
                    <div className="font-medium text-gray-900">{b.nome}</div>
                    {b.whatsapp && <div className="text-xs text-gray-500 mt-0.5">{b.whatsapp}</div>}
                  </div>
                  {b.whatsapp && (
                    <button 
                      onClick={() => window.open(`https://wa.me/${b.whatsapp.replace(/\D/g, '')}`, '_blank')}
                      className="text-green-600 hover:bg-green-50 p-1.5 rounded-full"
                      title="Dar os parabéns"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Study Candidates Section */}
          <div className="px-4 py-3 border-b border-gray-50 bg-gray-50 text-gray-800 font-semibold flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-blue-500" />
            Oferecer - visita/estudo (3 presenças seguidas)
          </div>
          <div className="max-h-48 overflow-y-auto p-2">
            {studyCandidates.length === 0 ? (
              <p className="text-gray-500 p-2 text-center text-xs">Nenhum candidato pendente.</p>
            ) : (
              studyCandidates.map(c => (
                <div key={c.id} className="p-2 border-b border-gray-50 last:border-0 hover:bg-gray-50 rounded transition-colors">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium text-gray-900">{c.nome}</div>
                      <div className="text-xs text-gray-500 mt-0.5">Veio 3 vezes! Proponha uma visita ou estudo bíblico.</div>
                    </div>
                    {c.whatsapp && (
                      <button 
                        onClick={() => {
                          const msg = encodeURIComponent(`Olá ${c.nome}! Que alegria ter você conosco nessas últimas vezes. Gostaríamos de te fazer um convite muito especial: aceitaria receber uma visita nossa em sua casa ou realizarmos um estudo bíblico juntos?`);
                          window.open(`https://wa.me/${c.whatsapp.replace(/\D/g, '')}?text=${msg}`, '_blank');
                        }}
                        className="text-blue-600 hover:bg-blue-50 p-1.5 rounded-full flex-shrink-0"
                        title="Enviar Convite"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
