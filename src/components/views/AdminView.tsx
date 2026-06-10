import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType, firebaseConfig } from '../../firebase';
import { collection, query, getDocs, updateDoc, doc, deleteDoc, setDoc } from 'firebase/firestore';
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { UserDoc } from '../../types';
import { Shield, CheckCircle, Clock, Trash2, Plus } from 'lucide-react';

interface UserRecord extends UserDoc {
  id: string;
}

export function AdminView() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal States
  const [userToApprove, setUserToApprove] = useState<UserRecord | null>(null);
  
  const [userToRevoke, setUserToRevoke] = useState<UserRecord | null>(null);
  const [userToDelete, setUserToDelete] = useState<UserRecord | null>(null);
  
  // Create User States
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newIgreja, setNewIgreja] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const loadUsers = async () => {
    try {
      const q = query(collection(db, 'users'));
      const snapshot = await getDocs(q);
      const res = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as UserRecord));
      setUsers(res);
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, 'users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || !newPassword || !newIgreja) return alert("Preencha todos os campos.");
    setIsCreating(true);

    try {
      // 1. Create a secondary app instance so it doesn't log the admin out of the primary instance
      const secondaryApp = initializeApp(firebaseConfig, "SecondaryApp" + Date.now());
      const secondaryAuth = getAuth(secondaryApp);
      
      const cred = await createUserWithEmailAndPassword(secondaryAuth, newEmail, newPassword);
      await signOut(secondaryAuth); // Sign out of the secondary instance immediately

      // 2. Create the user document in Firestore directly as 'ativo'
      await setDoc(doc(db, 'users', cred.user.uid), {
        email: cred.user.email,
        role: 'user',
        status: 'ativo',
        igreja_vinculada: newIgreja
      });

      alert("Usuário criado e aprovado com sucesso!");
      setIsCreatingUser(false);
      setNewEmail('');
      setNewPassword('');
      setNewIgreja('');
      loadUsers();
    } catch (error: any) {
      alert(`Erro ao criar usuário: ${error.message}`);
    } finally {
      setIsCreating(false);
    }
  };

  const handleApproveClick = (u: UserRecord) => {
    setUserToApprove(u);
  };

  const executeApprove = async () => {
    if (!userToApprove) return;

    try {
      await updateDoc(doc(db, 'users', userToApprove.id), {
        status: 'ativo'
        // We no longer overwrite igreja_vinculada here. 
        // It stays whatever they selected during signup.
      });
      setUserToApprove(null);
      loadUsers();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userToApprove.id}`);
    }
  };
  
  const executeRevoke = async () => {
    if (!userToRevoke) return;
    try {
      await updateDoc(doc(db, 'users', userToRevoke.id), {
        status: 'pendente'
      });
      setUserToRevoke(null);
      loadUsers();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userToRevoke.id}`);
    }
  }

  const executeDelete = async () => {
    if (!userToDelete) return;
    try {
      await deleteDoc(doc(db, 'users', userToDelete.id));
      setUserToDelete(null);
      loadUsers();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${userToDelete.id}`);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h2 className="text-lg font-medium text-gray-900 flex items-center">
          <Shield className="w-5 h-5 mr-2 text-red-600" />
          Painel de Aprovação de Usuários
        </h2>
        <button 
          onClick={() => setIsCreatingUser(true)}
          className="flex items-center px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Voluntário
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Igreja Vinculada</th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr><td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">Buscando contas...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">Nenhum usuário.</td></tr>
            ) : 
            users.map((u) => (
              <tr key={u.id} className={u.role === 'admin' ? "bg-red-50/50" : ""}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{u.email}</div>
                      <div className="text-xs text-gray-500">{u.role === 'admin' ? 'Super Admin' : 'Recepcionista'}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {u.status === 'ativo' ? (
                    <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      <CheckCircle className="w-3 h-3" />
                      <span>Ativo</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      <Clock className="w-3 h-3" />
                      <span>Pendente</span>
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {u.igreja_vinculada || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end space-x-3">
                    {u.status === 'pendente' ? (
                      <button 
                        onClick={() => handleApproveClick(u)}
                        className="text-green-600 hover:text-green-900 bg-green-50 px-3 py-1 rounded"
                      >
                        Aprovar
                      </button>
                    ) : u.role !== 'admin' && ( // Prevent demoting super admin from UI simply
                      <button 
                        onClick={() => setUserToRevoke(u)}
                        className="text-orange-600 hover:text-orange-900 bg-orange-50 px-3 py-1 rounded"
                      >
                        Bloquear
                      </button>
                    )}
                    {u.role !== 'admin' && (
                      <button 
                        onClick={() => setUserToDelete(u)}
                        className="text-gray-400 hover:text-red-600 transition-colors"
                        title="Apagar usuário"
                      >
                         <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {userToApprove && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold mb-4 text-green-600">Aprovar Usuário</h3>
            <p className="text-sm text-gray-600 mb-6">
              Deseja aprovar o acesso de <strong>{userToApprove.email}</strong> para a igreja <strong>{userToApprove.igreja_vinculada || 'Nenhuma'}</strong>?
            </p>
            <div className="flex justify-end space-x-3">
              <button 
                onClick={() => setUserToApprove(null)}
                className="px-4 py-2 border rounded text-gray-600"
              >
                Cancelar
              </button>
              <button 
                onClick={executeApprove}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Sim, Aprovar
              </button>
            </div>
          </div>
        </div>
      )}

      {userToRevoke && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-orange-600 mb-4">Bloquear Usuário</h3>
            <p className="text-sm text-gray-600 mb-6">Bloquear o acesso de {userToRevoke.email}? Ele voltará para o status pendente.</p>
            <div className="flex justify-end space-x-3">
              <button 
                onClick={() => setUserToRevoke(null)}
                className="px-4 py-2 border rounded text-gray-600"
              >
                Cancelar
              </button>
              <button 
                onClick={executeRevoke}
                className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
              >
                Sim, Bloquear
              </button>
            </div>
          </div>
        </div>
      )}

      {userToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-red-600 mb-4">Excluir Usuário</h3>
            <p className="text-sm text-gray-600 mb-6">Tem certeza que deseja APAGAR COMPLETAMENTE a conta de {userToDelete.email}? Esta ação não pode ser desfeita.</p>
            <div className="flex justify-end space-x-3">
              <button 
                onClick={() => setUserToDelete(null)}
                className="px-4 py-2 border rounded text-gray-600"
              >
                Cancelar
              </button>
              <button 
                onClick={executeDelete}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Excluir Definitivamente
              </button>
            </div>
          </div>
        </div>
      )}

      {isCreatingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold mb-4">Adicionar Voluntário/Recepcionista</h3>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
                <input 
                  type="email" required value={newEmail} onChange={e => setNewEmail(e.target.value)}
                  className="w-full border border-gray-300 rounded p-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
                <input 
                  type="password" required minLength={6} value={newPassword} onChange={e => setNewPassword(e.target.value)}
                  className="w-full border border-gray-300 rounded p-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Congregação</label>
                <select 
                  required value={newIgreja} onChange={e => setNewIgreja(e.target.value)}
                  className="w-full border border-gray-300 rounded p-2"
                >
                  <option value="">Selecione uma igreja</option>
                  <option value="Guajiru">Guajiru</option>
                  <option value="Jardim Petrópolis">Jardim Petrópolis</option>
                  <option value="Parque dos Coqueiros 1">Parque dos Coqueiros 1</option>
                  <option value="Parque dos Coqueiros 2">Parque dos Coqueiros 2</option>
                  <option value="Vale Dourado 1">Vale Dourado 1</option>
                  <option value="Vale Dourado 2">Vale Dourado 2</option>
                </select>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button 
                  type="button"
                  onClick={() => setIsCreatingUser(false)}
                  className="px-4 py-2 border rounded text-gray-600"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={isCreating}
                  className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-50"
                >
                  {isCreating ? 'Criando...' : 'Criar Voluntário'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
