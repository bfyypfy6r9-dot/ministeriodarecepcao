import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db, handleFirestoreError, OperationType, auth } from '../../firebase';
import { collection, query, where, getDocs, addDoc, onSnapshot, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { RecepcaoDoc, PresencaDoc } from '../../types';
import { Search, Plus, Check, Trash2, Pencil } from 'lucide-react';

export function RecebimentoView() {
  const { userDoc } = useAuth();
  const isAdmin = userDoc?.role === 'admin';
  const myIgreja = userDoc?.igreja_vinculada || '';

  const [searchTerm, setSearchTerm] = useState('');
  const [visitors, setVisitors] = useState<RecepcaoDoc[]>([]);
  const [allVisitors, setAllVisitors] = useState<RecepcaoDoc[]>([]);
  const [loading, setLoading] = useState(false);

  // Form State
  const [nome, setNome] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [origem, setOrigem] = useState<string>('Culto de domingo');
  const [igrejaText, setIgrejaText] = useState(myIgreja);
  
  useEffect(() => {
    if (myIgreja && !isAdmin) {
      setIgrejaText(myIgreja);
    }
  }, [myIgreja, isAdmin]);

  const [editingId, setEditingId] = useState<string | null>(null);

  // Checkin state
  const [selectedVisitor, setSelectedVisitor] = useState<RecepcaoDoc | null>(null);
  const [selectedCulto, setSelectedCulto] = useState<string>('Sábado');
  const [checkinDate, setCheckinDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [visitorToDelete, setVisitorToDelete] = useState<{id: string, nome: string} | null>(null);

  // Load all visitors using onSnapshot for real-time updates and sort alphabetically
  useEffect(() => {
    if (!isAdmin && !myIgreja) return;

    setLoading(true);
    const recepcaoRef = collection(db, 'recepcao');
    let q = query(recepcaoRef);
    if (!isAdmin) {
      q = query(recepcaoRef, where('igreja', '==', myIgreja));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const results = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as RecepcaoDoc));
      results.sort((a, b) => a.nome.localeCompare(b.nome));
      setAllVisitors(results);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'recepcao');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isAdmin, myIgreja]);

  // Filter visitors client-side
  useEffect(() => {
    if (!searchTerm.trim()) {
      setVisitors(allVisitors);
    } else {
      setVisitors(allVisitors.filter(r => 
        r.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
        r.whatsapp.includes(searchTerm)
      ));
    }
  }, [searchTerm, allVisitors]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !whatsapp.trim() || !igrejaText.trim()) return;

    try {
      const docData: any = {
        igreja: igrejaText.trim(),
        nome: nome.trim(),
        whatsapp: whatsapp.trim(),
        origem,
        createdAt: new Date().toISOString(),
        criadoPor: auth.currentUser?.uid || ''
      };
      
      if (dataNascimento) {
        docData.data_nascimento = dataNascimento;
      }
      
      if (editingId) {
        // preserve createdAt and criadoPor by omitting them or removing them 
        // to not overwrite if they already exist, but for simplicity let's just update
        delete docData.createdAt;
        delete docData.criadoPor;
        await updateDoc(doc(db, 'recepcao', editingId), docData);
        alert('Cadastro atualizado com sucesso!');
        setEditingId(null);
      } else {
        await addDoc(collection(db, 'recepcao'), docData);
        alert('Cadastro realizado com sucesso!');
      }

      setNome('');
      setWhatsapp('');
      setDataNascimento('');
      setOrigem('Culto de domingo');
    } catch (error) {
      handleFirestoreError(error, editingId ? OperationType.UPDATE : OperationType.CREATE, 'recepcao');
    }
  };

  const startEditing = (visitor: RecepcaoDoc) => {
    setEditingId(visitor.id!);
    setNome(visitor.nome);
    setWhatsapp(visitor.whatsapp);
    setDataNascimento(visitor.data_nascimento || '');
    setOrigem(visitor.origem || 'Culto de domingo');
    setIgrejaText(visitor.igreja || myIgreja);
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setNome('');
    setWhatsapp('');
    setDataNascimento('');
    setOrigem('Culto de domingo');
    setIgrejaText(myIgreja);
  };

  const handleCheckIn = async () => {
    if (!selectedVisitor || !selectedVisitor.id) return;
    if (!selectedCulto) return alert('Selecione um culto ou atividade.');
    
    try {
      const presenca: Omit<PresencaDoc, 'id'> = {
        culto: selectedCulto as any,
        dataStr: checkinDate,
        createdAt: new Date().toISOString(),
        registradoPor: auth.currentUser?.uid || ''
      };
      await addDoc(collection(db, `recepcao/${selectedVisitor.id}/presencas`), presenca);
      
      const vRef = doc(db, 'recepcao', selectedVisitor.id);
      await updateDoc(vRef, {
        presencasCount: (selectedVisitor.presencasCount || 0) + 1
      });
      
      setSelectedVisitor(null);
      alert('Presença registrada com sucesso!');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `recepcao/${selectedVisitor.id}/presencas`);
    }
  };

  const executeDeleteVisitor = async () => {
    if (!visitorToDelete) return;
    try {
      await deleteDoc(doc(db, 'recepcao', visitorToDelete.id));
      alert('Registro removido com sucesso.');
      setVisitorToDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'recepcao');
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      {/* Cadastro Form */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium text-gray-900 flex items-center">
            {editingId ? <Pencil className="w-5 h-5 mr-2 text-orange-500" /> : <Plus className="w-5 h-5 mr-2 text-orange-500" />}
            {editingId ? 'Editar Cadastro' : 'Novo Cadastro'}
          </h2>
          {editingId && (
            <button type="button" onClick={cancelEdit} className="text-sm text-gray-500 hover:text-gray-700 font-medium">Cancelar edição</button>
          )}
        </div>
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Distrito</label>
            <input 
              type="text" readOnly value="Parque dos Coqueiros"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm p-2 border bg-gray-100 text-gray-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Igreja</label>
            {isAdmin ? (
              <select 
                value={igrejaText} 
                onChange={e => setIgrejaText(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm p-2 border focus:border-orange-500 focus:ring-orange-500 bg-white"
              >
                <option value="">Selecione uma igreja</option>
                <option value="Guajiru">Guajiru</option>
                <option value="Jardim Petrópolis">Jardim Petrópolis</option>
                <option value="Parque dos Coqueiros 1">Parque dos Coqueiros 1</option>
                <option value="Parque dos Coqueiros 2">Parque dos Coqueiros 2</option>
                <option value="Vale Dourado 1">Vale Dourado 1</option>
                <option value="Vale Dourado 2">Vale Dourado 2</option>
              </select>
            ) : (
              <input 
                type="text" readOnly required value={igrejaText}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm p-2 border bg-gray-100 text-gray-500"
              />
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Nome</label>
            <input 
              type="text" required value={nome} onChange={e => setNome(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm p-2 border"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">WhatsApp (com DDI e DDD)</label>
            <input 
              type="text" required value={whatsapp} onChange={e => setWhatsapp(e.target.value)}
              placeholder="Ex: 5511999999999"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm p-2 border"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Data de Nascimento (Opcional)</label>
            <input 
              type="date" value={dataNascimento} onChange={e => setDataNascimento(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm p-2 border bg-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Origem</label>
            <select 
              value={origem} onChange={e => setOrigem(e.target.value)}
              className="mt-1 block w-full bg-white rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm p-2 border"
            >
              <option value="Culto de domingo">Culto de domingo</option>
              <option value="Culto de quarta">Culto de quarta</option>
              <option value="Culto de sábado">Culto de sábado</option>
              <option value="Escola sabatina">Escola sabatina</option>
              <option value="PG">PG</option>
              <option value="Evangelismo">Evangelismo</option>
              <option value="Quebrando o Silêncio">Quebrando o Silêncio</option>
              <option value="Impacto Esperança">Impacto Esperança</option>
              <option value="Ação Social">Ação Social</option>
            </select>
          </div>
          <button type="submit" className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none">
            {editingId ? 'Atualizar Cadastro' : 'Cadastrar'}
          </button>
        </form>
      </div>

      {/* Busca e Check-in */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col">
        <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          <Search className="w-5 h-5 mr-2 text-orange-500" />
          Busca e Check-in
        </h2>
        <div className="mb-4">
          <input 
            type="text" 
            placeholder="Buscar por nome ou WhatsApp..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm p-3 border bg-gray-50"
          />
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <p className="text-sm text-gray-500 text-center animate-pulse">Buscando...</p>
          ) : visitors.length > 0 ? (
            <ul className="space-y-3">
              {visitors.map(v => (
                <li key={v.id} className="p-4 border rounded-md shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-gray-900">{v.nome}</p>
                    <p className="text-xs text-gray-500">{v.whatsapp}</p>
                    {isAdmin && <p className="text-xs text-orange-600 font-medium mt-1">{v.igreja}</p>}
                  </div>
                  {selectedVisitor?.id === v.id ? (
                    <div className="flex flex-col gap-2 bg-orange-50 p-3 rounded-md border border-orange-100">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {['Sábado', 'Domingo', 'Quarta-feira', 'Escola Sabatina', 'PG', 'Evangelismo'].map((op) => (
                          <label key={op} className="flex items-center space-x-2 text-sm text-gray-700">
                            <input
                              type="radio"
                              name={`checkin_${v.id}`}
                              className="focus:ring-orange-500 h-4 w-4 text-orange-600 border-gray-300"
                              checked={selectedCulto === op}
                              onChange={() => setSelectedCulto(op)}
                            />
                            <span>{op}</span>
                          </label>
                        ))}
                      </div>
                      <div className="mt-2">
                        <label className="block text-xs font-medium text-gray-700 mb-1">Data da Presença</label>
                        <input
                          type="date"
                          value={checkinDate}
                          onChange={(e) => setCheckinDate(e.target.value)}
                          className="block w-full sm:w-auto rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm p-1.5 border bg-white"
                        />
                      </div>
                      <div className="flex gap-2 mt-2">
                        <button onClick={handleCheckIn} className="flex-1 bg-green-600 text-white text-xs px-2 py-1.5 rounded flex items-center justify-center font-medium hover:bg-green-700">
                          <Check className="w-3 h-3 mr-1" /> Salvar
                        </button>
                        <button onClick={() => setSelectedVisitor(null)} className="flex-1 bg-gray-200 text-gray-700 text-xs px-2 py-1.5 rounded font-medium hover:bg-gray-300">
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                     <button 
                       onClick={() => setSelectedVisitor(v)}
                       className="text-sm bg-orange-100 text-orange-700 hover:bg-orange-200 px-3 py-1.5 rounded-md font-medium whitespace-nowrap"
                     >
                       Marcar Presença
                     </button>
                     <button 
                       onClick={() => startEditing(v)}
                       className="text-sm bg-blue-100 text-blue-700 hover:bg-blue-200 px-3 py-1.5 rounded-md font-medium flex items-center justify-center"
                       title="Editar Registro"
                     >
                       <Pencil className="w-4 h-4" />
                     </button>
                     <button 
                       onClick={() => setVisitorToDelete({ id: v.id!, nome: v.nome })}
                       className="text-sm bg-red-100 text-red-700 hover:bg-red-200 px-3 py-1.5 rounded-md font-medium flex items-center justify-center"
                       title="Remover Registro"
                     >
                       <Trash2 className="w-4 h-4" />
                     </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500 text-center py-4">Nenhum resultado encontrado.</p>
          )}
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
    </div>
  );
}
