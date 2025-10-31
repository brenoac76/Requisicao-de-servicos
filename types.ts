export interface Servico {
  id: string;
  quantidade: string;
  especificacao: string;
  descricao: string;
  volume: string;
}

export interface Entrega {
  id: string;
  quantidade: string;
  descricao: string;
  cor: string;
  fornecedor: string;
  entregaOk: 'Sim' | 'Nao';
}

export interface FileData {
  id: string;
  name: string;
  mimeType: string;
  data: string; // base64
}

// Estrutura de dados que será enviada para o Google Apps Script
export interface RequisicaoData {
  data: string;
  cliente: string;
  montador: string;
  ambiente: string;
  ordemCompra: string;
  responsavel: string;
  servicos: Omit<Servico, 'id'>[];
  entregas: Omit<Entrega, 'id'>[];
  filesData: Omit<FileData, 'id'>[];
  numServicos: number;
  numEntregas: number;
}

export enum SubmissionStatus {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
}
