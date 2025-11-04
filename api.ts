import { GOOGLE_SCRIPT_URL } from './constants';
import type { RequisicaoData } from './types';

// Função para encapsular a lógica de envio para o Google Apps Script
export async function submitToGoogleScript(formData: RequisicaoData): Promise<{result: string, message?: string}> {
  if (GOOGLE_SCRIPT_URL.includes('YOUR_SCRIPT_ID')) {
     throw new Error("A URL do Google Apps Script não foi configurada. Atualize o arquivo 'constants.ts'.");
  }

  try {
    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      cache: 'no-cache',
      headers: {
        // Mudar para 'text/plain' evita a requisição 'preflight' do CORS, que é a causa comum do erro "Failed to fetch" com Google Apps Script.
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify({ action: 'salvarRequisicao', data: formData }),
    });

    if (!response.ok) {
        // Se a resposta HTTP não for bem-sucedida (ex: 404, 500), lança um erro.
        throw new Error(`Erro do servidor: ${response.status} ${response.statusText}`);
    }

    // Agora podemos ler a resposta JSON enviada pelo Google Apps Script.
    const result = await response.json();
    
    if (result.result === 'error') {
        // Se o script retornou um erro de lógica interna.
        throw new Error(result.message || 'Ocorreu um erro no servidor do Google Script.');
    }

    // Se tudo deu certo, retornamos a resposta do servidor.
    return result;

  } catch (err) {
    // Este bloco 'catch' irá capturar erros de rede e erros lançados acima.
    console.error("Erro ao tentar enviar ou processar a resposta:", err);
    if (err instanceof Error) {
        throw new Error(`Falha na comunicação: ${err.message}`);
    }
    throw new Error("Ocorreu um erro de rede ou de processamento desconhecido.");
  }
}
