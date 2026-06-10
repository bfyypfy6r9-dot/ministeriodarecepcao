import React, { useState } from 'react';
import { Logo } from './Logo';
import { doc, setDoc } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedIgreja, setSelectedIgreja] = useState('Guajiru');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegister) {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        // Garante que o documento seja criado ou atualizado com a igreja vinculada
        await setDoc(doc(db, 'users', cred.user.uid), {
          email: cred.user.email || '',
          role: cred.user.email === 'prps2013araujo@gmail.com' ? 'admin' : 'user',
          status: cred.user.email === 'prps2013araujo@gmail.com' ? 'ativo' : 'pendente',
          igreja_vinculada: selectedIgreja
        }, { merge: true });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      console.error(err);
      let errorMessage = 'Erro ao autenticar.';
      if (err.code === 'auth/email-already-in-use') {
        errorMessage = 'Este e-mail já está em uso. Por favor, faça login.';
      } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
        errorMessage = 'E-mail ou senha incorretos.';
      } else if (err.code === 'auth/user-not-found') {
        errorMessage = 'Usuário não encontrado.';
      } else if (err.code === 'auth/weak-password') {
        errorMessage = 'A senha deve ter pelo menos 6 caracteres.';
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 space-y-8">
        <div className="text-center">
          <Logo className="w-24 h-24 mx-auto" />
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 mt-4">Ministério da Recepção</h1>
          <p className="text-gray-500 mt-2">
            {isRegister ? 'Crie sua conta.' : 'Faça login para acessar o painel.'}
          </p>
        </div>
        
        {error && (
          <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
            <input 
              type="email" 
              required 
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-orange-500 bg-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
            <input 
              type="password" 
              required 
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-orange-500 bg-white"
            />
          </div>

          {isRegister && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Distrito</label>
                <input 
                  type="text" 
                  readOnly 
                  value="Parque dos Coqueiros"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none bg-gray-100 text-gray-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Igreja</label>
                <select 
                  value={selectedIgreja}
                  onChange={e => setSelectedIgreja(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-orange-500 bg-white"
                >
                  <option value="Guajiru">Guajiru</option>
                  <option value="Jardim Petrópolis">Jardim Petrópolis</option>
                  <option value="Parque dos Coqueiros 1">Parque dos Coqueiros 1</option>
                  <option value="Parque dos Coqueiros 2">Parque dos Coqueiros 2</option>
                  <option value="Vale Dourado 1">Vale Dourado 1</option>
                  <option value="Vale Dourado 2">Vale Dourado 2</option>
                </select>
              </div>
            </>
          )}

          <button 
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center px-4 py-3 border border-transparent text-sm font-medium rounded-lg text-white bg-orange-600 hover:bg-orange-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Aguarde...' : (isRegister ? 'Criar Conta' : 'Entrar')}
          </button>
        </form>

        <div className="text-center text-sm space-y-3">
          <button 
            onClick={() => { setIsRegister(!isRegister); setError(''); }}
            className="text-orange-600 hover:text-orange-700 font-medium block w-full"
          >
            {isRegister ? 'Já tenho uma conta. Entrar' : 'Não tem conta? Registre-se'}
          </button>
          
          {!isRegister && (
            <button
              onClick={async () => {
                if (!email) {
                  setError('Por favor, informe seu e-mail acima para redefinir a senha.');
                  return;
                }
                try {
                  const { sendPasswordResetEmail } = await import('firebase/auth');
                  await sendPasswordResetEmail(auth, email);
                  setError('E-mail de redefinição de senha enviado! Verifique sua caixa de entrada.');
                } catch (err: any) {
                  setError('Erro ao enviar e-mail de redefinição. Verifique se o e-mail está correto.');
                }
              }}
              className="text-gray-500 hover:text-gray-700 block w-full"
            >
              Esqueci minha senha
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
