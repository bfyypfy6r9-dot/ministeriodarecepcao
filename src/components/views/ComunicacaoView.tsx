import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { RecepcaoDoc, PresencaDoc } from '../../types';
import { Send, Download, Users, MessageCircle, Filter, Trash2 } from 'lucide-react';
import Papa from 'papaparse';

export function ComunicacaoView() {
  const { userDoc } = useAuth();
  const isAdmin = userDoc?.role === 'admin';
  const myIgreja = userDoc?.igreja_vinculada || '';

  const [allVisitors, setAllVisitors] = useState<RecepcaoDoc[]>([]);
  const [displayedVisitors, setDisplayedVisitors] = useState<RecepcaoDoc[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [filterIgreja, setFilterIgreja] = useState('');
  const [filterEvento, setFilterEvento] = useState('todos');
  const [filterStatus, setFilterStatus] = useState('presentes');
  const [filterDataInicio, setFilterDataInicio] = useState('');
  const [filterDataFim, setFilterDataFim] = useState('');
  const [presencesMap, setPresencesMap] = useState<Record<string, PresencaDoc[]>>({});
  
  const [csvExportOption, setCsvExportOption] = useState<string>('completa');
  const [dispatchMode, setDispatchMode] = useState<'web' | 'app' | 'auto'>('auto');
  
  const [message, setMessage] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  const [visitorToDelete, setVisitorToDelete] = useState<{id: string, nome: string} | null>(null);
  const [confirmWhatsApp, setConfirmWhatsApp] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const recepcaoRef = collection(db, 'recepcao');
      let q = query(recepcaoRef);
      if (!isAdmin) {
        q = query(recepcaoRef, where('igreja', '==', myIgreja));
      }
      const snapshot = await getDocs(q);
      const results = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as RecepcaoDoc));
      results.sort((a, b) => a.nome.localeCompare(b.nome));
      
      setAllVisitors(results);
      
      // Load presences for history filtering
      const presMap: Record<string, PresencaDoc[]> = {};
      await Promise.all(results.map(async (v) => {
        if (!v.id) return;
        try {
          const pSnap = await getDocs(collection(db, 'recepcao', v.id, 'presencas'));
          presMap[v.id!] = pSnap.docs.map(doc => doc.data() as PresencaDoc);
        } catch(e) {}
      }));
      setPresencesMap(presMap);
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, 'recepcao');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [isAdmin, myIgreja]);

  useEffect(() => {
    let filtered = allVisitors;
    
    if (isAdmin && filterIgreja) {
      filtered = filtered.filter(v => v.igreja === filterIgreja);
    }
    
    if (filterEvento !== 'todos' || filterDataInicio || filterDataFim) {
      filtered = filtered.filter(v => {
        let vPresences = presencesMap[v.id!] || [];
        
        if (filterDataInicio) {
          vPresences = vPresences.filter(p => p.dataStr >= filterDataInicio);
        }
        if (filterDataFim) {
          vPresences = vPresences.filter(p => p.dataStr <= filterDataFim);
        }

        let inPresences = false;
        if (filterEvento !== 'todos') {
          inPresences = vPresences.some(p => p.culto?.toLowerCase().includes(filterEvento.toLowerCase()));
        } else {
          // If no specific event is selected, any presence in the date range counts
          inPresences = vPresences.length > 0;
        }

        let inOrigem = false;
        if (filterEvento !== 'todos') {
          inOrigem = v.origem?.toLowerCase().includes(filterEvento.toLowerCase()) ?? false;
        } else {
          inOrigem = true; // when no event filter
        }

        let isPresent = false;
        if (filterDataInicio || filterDataFim) {
          isPresent = inPresences; // Strictly rely on presences if date is specified
        } else {
          isPresent = inPresences || inOrigem;
        }
        
        if (filterStatus === 'presentes') return isPresent;
        return !isPresent;
      });
    }

    setDisplayedVisitors(filtered);
    // adjust selected
    const nextSelected = new Set<string>();
    filtered.forEach(v => {
      if (selectedIds.has(v.id!)) nextSelected.add(v.id!);
    });
    setSelectedIds(nextSelected);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allVisitors, filterIgreja, filterEvento, filterStatus, filterDataInicio, filterDataFim, presencesMap, isAdmin]);

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const toggleAll = () => {
    if (selectedIds.size === displayedVisitors.length && displayedVisitors.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(displayedVisitors.map(v => v.id!)));
    }
  };

  const handleExportCSV = () => {
    let toExport = allVisitors;
    if (isAdmin && filterIgreja) {
      toExport = toExport.filter(v => v.igreja === filterIgreja);
    }

    if (csvExportOption === '3_presencas') {
      toExport = toExport.filter(v => v.presencasCount && v.presencasCount >= 3);
    } else if (csvExportOption !== 'completa') {
      toExport = toExport.filter(v => {
        const vPresences = presencesMap[v.id!] || [];
        const inPresences = vPresences.some(p => p.culto?.toLowerCase().includes(csvExportOption.toLowerCase()));
        const inOrigem = v.origem?.toLowerCase().includes(csvExportOption.toLowerCase());
        return inPresences || inOrigem;
      });
    }

    if (toExport.length === 0) return alert('Nenhum dado para exportar com a opção selecionada.');
    
    const data = toExport.map(v => ({
      Igreja: v.igreja,
      Origem: v.origem,
      Nome: v.nome,
      WhatsApp: v.whatsapp,
      'Data de Cadastro': new Date(v.createdAt).toLocaleDateString()
    }));
    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `lista_amigos_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSendWhatsAppSync = async () => {
    const selected = displayedVisitors.filter(v => selectedIds.has(v.id!));
    if (selected.length === 0) return alert('Selecione ao menos um contato.');
    if (!message.trim()) return alert('Digite uma mensagem.');

    if (selected.length > 5 && !confirmWhatsApp) {
      setConfirmWhatsApp(true);
      return;
    }

    const encodedMsg = encodeURIComponent(message);
    setConfirmWhatsApp(false); // Reset confirmation state
    
    for (let i = 0; i < selected.length; i++) {
      const v = selected[i];
      const number = v.whatsapp.replace(/\D/g, ''); // keep only digits
      setTimeout(() => {
        if (dispatchMode === 'app') {
          window.open(`whatsapp://send?phone=${number}&text=${encodedMsg}`, '_top');
        } else if (dispatchMode === 'web') {
          window.open(`https://web.whatsapp.com/send?phone=${number}&text=${encodedMsg}`, '_blank');
        } else {
          // auto
          window.open(`https://api.whatsapp.com/send?phone=${number}&text=${encodedMsg}`, '_blank');
        }
      }, i * (dispatchMode === 'app' ? 1200 : 800));
    }
  };

  const executeDeleteVisitor = async () => {
    if (!visitorToDelete) return;
    try {
      await deleteDoc(doc(db, 'recepcao', visitorToDelete.id));
      alert('Registro removido com sucesso.');
      setVisitorToDelete(null);
      loadData();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'recepcao');
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h2 className="text-lg font-medium text-gray-900 flex items-center">
          <Users className="w-5 h-5 mr-2 text-orange-500" />
          Amigos
        </h2>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <select
            value={csvExportOption}
            onChange={e => setCsvExportOption(e.target.value)}
            className="rounded-lg border-gray-300 sm:text-sm p-2 border focus:border-orange-500 focus:ring-orange-500 bg-white"
          >
            <option value="completa">Lista Completa</option>
            <option value="3_presencas">3 Presenças Seguidas</option>
            <option value="Domingo">Domingo</option>
            <option value="Quarta">Quarta</option>
            <option value="PG">PG</option>
            <option value="Ação social">Ação Social</option>
            <option value="Evangelismo">Evangelismo</option>
            <option value="Impacto Esperança">Impacto Esperança</option>
            <option value="Quebrando o Silêncio">Quebrando o Silêncio</option>
          </select>
          <button 
            onClick={handleExportCSV}
            className="flex items-center space-x-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Baixar CSV</span>
          </button>
        </div>
      </div>

      <div className="bg-gray-50 rounded-lg p-4 mb-6 border border-gray-100 flex flex-col sm:flex-row flex-wrap items-center gap-4">
        <div className="flex items-center text-sm font-medium text-gray-700">
          <Filter className="w-4 h-4 mr-2" /> Filtros:
        </div>
        {isAdmin && (
          <select 
            value={filterIgreja} 
            onChange={e => setFilterIgreja(e.target.value)}
            className="rounded-md border-gray-300 shadow-sm sm:text-sm p-2 border focus:border-orange-500 focus:ring-orange-500 w-full sm:w-auto"
          >
            <option value="">Todas as Igrejas</option>
            <option value="Guajiru">Guajiru</option>
            <option value="Jardim Petrópolis">Jardim Petrópolis</option>
            <option value="Parque dos Coqueiros 1">Parque dos Coqueiros 1</option>
            <option value="Parque dos Coqueiros 2">Parque dos Coqueiros 2</option>
            <option value="Vale Dourado 1">Vale Dourado 1</option>
            <option value="Vale Dourado 2">Vale Dourado 2</option>
          </select>
        )}
        
        <select 
          value={filterEvento} 
          onChange={e => setFilterEvento(e.target.value)}
          className="rounded-md border-gray-300 shadow-sm sm:text-sm p-2 border focus:border-orange-500 focus:ring-orange-500 w-full sm:w-auto"
        >
            <option value="todos">Todos Eventos/Dias</option>
            <option value="Domingo">Domingo</option>
            <option value="Sábado">Sábado</option>
            <option value="Quarta">Quarta</option>
            <option value="Impacto Esperança">Impacto Esperança</option>
            <option value="Quebrando o Silêncio">Quebrando o Silêncio</option>
            <option value="Ação Social">Ação Social</option>
            <option value="PG">PG</option>
            <option value="Evangelismo">Evangelismo</option>
          </select>

          {filterEvento !== 'todos' && (
            <select 
              value={filterStatus} 
              onChange={e => setFilterStatus(e.target.value)}
              className="rounded-md border-gray-300 shadow-sm sm:text-sm p-2 border focus:border-orange-500 focus:ring-orange-500 w-full sm:w-auto"
            >
              <option value="presentes">Presentes ({filterEvento})</option>
              <option value="faltosos">Faltosos ({filterEvento})</option>
            </select>
          )}

          <div className="flex items-center space-x-2">
            <input
              type="date"
              value={filterDataInicio}
              onChange={e => setFilterDataInicio(e.target.value)}
              className="rounded-md border-gray-300 shadow-sm sm:text-sm p-2 border focus:border-orange-500 focus:ring-orange-500"
              title="Data de Início"
            />
            <span className="text-gray-500">até</span>
            <input
              type="date"
              value={filterDataFim}
              onChange={e => setFilterDataFim(e.target.value)}
              className="rounded-md border-gray-300 shadow-sm sm:text-sm p-2 border focus:border-orange-500 focus:ring-orange-500"
              title="Data Final"
            />
          </div>
        </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 order-2 lg:order-1">
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b flex justify-between items-center">
              <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 cursor-pointer">
                <input 
                  type="checkbox" 
                  className="rounded text-orange-600 focus:ring-orange-500"
                  checked={selectedIds.size === displayedVisitors.length && displayedVisitors.length > 0}
                  onChange={toggleAll}
                />
                <span>Selecionar Todos ({selectedIds.size})</span>
              </label>
              <span className="text-xs text-gray-500">{displayedVisitors.length} Registros</span>
            </div>
            <ul className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
              {loading ? (
                 <li className="p-4 text-center text-sm text-gray-500">Carregando dados...</li>
              ) : displayedVisitors.length === 0 ? (
                 <li className="p-4 text-center text-sm text-gray-500">Nenhum registro encontrado.</li>
              ) : displayedVisitors.map(v => (
                <li key={v.id} className="p-4 flex items-center hover:bg-gray-50">
                  <input 
                    type="checkbox" 
                    className="rounded text-orange-600 focus:ring-orange-500 mr-4"
                    checked={selectedIds.has(v.id!)}
                    onChange={() => toggleSelect(v.id!)}
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{v.nome}</p>
                    <p className="text-xs text-gray-500">{v.origem} • {v.whatsapp}</p>
                  </div>
                  {isAdmin && <span className="text-xs font-medium bg-orange-100 text-orange-800 px-2 py-1 rounded-full">{v.igreja}</span>}
                  
                  <button 
                    onClick={() => window.open(`https://wa.me/${v.whatsapp.replace(/\D/g, '')}`, '_blank')}
                    className="ml-4 p-2 text-green-600 bg-green-50 hover:bg-green-100 rounded-full transition-colors"
                    title="Conversar no WhatsApp"
                  >
                    <MessageCircle className="w-4 h-4" />
                  </button>
                  <button 
                     onClick={() => setVisitorToDelete({ id: v.id!, nome: v.nome })}
                     className="ml-2 p-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-full transition-colors"
                     title="Remover Registro"
                   >
                     <Trash2 className="w-4 h-4" />
                   </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="order-1 lg:order-2">
          <div className="bg-orange-50 rounded-lg p-5 border border-orange-100">
            <h3 className="text-sm font-medium text-orange-900 mb-3 flex items-center">
              <MessageCircle className="w-4 h-4 mr-2" />
              Disparo de WhatsApp
            </h3>
            <textarea 
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Olá, como você está? Seja bem-vindo à nossa Igreja!"
              className="w-full text-sm rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 p-3 mb-4 min-h-[120px]"
            />
            <div className="mb-4">
              <label className="block text-xs font-medium text-orange-800 mb-1">Método de Disparo</label>
              <select
                value={dispatchMode}
                onChange={e => setDispatchMode(e.target.value as 'web' | 'app' | 'auto')}
                className="w-full text-sm rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 p-2"
              >
                <option value="auto">Preferência App (Automático)</option>
                <option value="web">Forçar WhatsApp Web (Navegador)</option>
                <option value="app">Forçar App WhatsApp (Celular/Desktop)</option>
              </select>
            </div>
            <button 
              onClick={handleSendWhatsAppSync}
              disabled={selectedIds.size === 0 || !message.trim()}
              className="w-full flex items-center justify-center space-x-2 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-md shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
              <span>Disparar para {selectedIds.size}</span>
            </button>
            <p className="text-xs text-orange-700 mt-4 leading-relaxed">
              {dispatchMode === 'auto' 
                ? 'Tentará abrir pelo app do WhatsApp. Caso não tenha, oferecerá a opção web.'
                : dispatchMode === 'web' 
                ? 'O sistema abrirá o WhatsApp Web em novas abas automaticamente para os selecionados. Confirme permissões de pop-up no navegador se aplicável.'
                : 'O sistema tentará abrir o aplicativo do WhatsApp do seu dispositivo diretamente.'}
            </p>
          </div>
        </div>
      </div>

      {visitorToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-red-600 mb-4">Remover Registro</h3>
            <p className="text-sm text-gray-600 mb-6">Tem certeza que deseja remover o registro de {visitorToDelete.nome}? Esta ação não poderá ser desfeita.</p>
            <div className="flex justify-end space-x-3">
              <button 
                onClick={() => setVisitorToDelete(null)}
                className="px-4 py-2 border rounded text-gray-600"
              >
                Cancelar
              </button>
              <button 
                onClick={executeDeleteVisitor}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Remover Registro
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmWhatsApp && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-orange-600 mb-4">Atenção com Abas do Navegador</h3>
            <p className="text-sm text-gray-600 mb-6">Você selecionou mais de 5 contatos. O navegador irá abrir várias abas em sequência, o que pode ser bloqueado pelos mecanismos de segurança (pop-up blocker). Deseja continuar?</p>
            <div className="flex justify-end space-x-3">
              <button 
                onClick={() => setConfirmWhatsApp(false)}
                className="px-4 py-2 border rounded text-gray-600"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSendWhatsAppSync}
                className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
              >
                Sim, Enviar Mensagens
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
