export interface UserDoc {
  email: string;
  role: 'admin' | 'user';
  status: 'pendente' | 'ativo';
  igreja_vinculada?: string;
}

export interface RecepcaoDoc {
  id?: string;
  igreja: string;
  nome: string;
  data_nascimento?: string;
  whatsapp: string;
  origem: string;
  createdAt: string;
  criadoPor: string;
  presencasCount?: number;
}

export interface PresencaDoc {
  id?: string;
  culto: 'Sábado' | 'Domingo' | 'Quarta-feira' | 'Escola Sabatina';
  dataStr: string;
  createdAt: string;
  registradoPor: string;
}
