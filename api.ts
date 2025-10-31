import { GOOGLE_SCRIPT_URL } from './constants';
import type { RequisicaoData } from './types';

// Função para encapsular a lógica de envio para o Google Apps Script
export async function submitToGoogleScript(formData: RequisicaoData): Promise<{result: string, message?: string}> {
  if (GOOGLE_SCRIPT_URL.includes('YOUR_SCRIPT_ID')) {
     throw new Error("A URL do Google Apps Script não foi configurada. Atualize o arquivo 'constants.ts'.");
  }

  const response = await fetch(GOOGLE_SCRIPT_URL, {
    method: 'POST',
    cache: 'no-cache',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action: 'salvarRequisicao', data: formData }),
    redirect: 'follow',
  });

  if (!response.ok) {
    let errorText = "Erro desconhecido";
    try {
        errorText = await response.text();
    } catch (e) {
        // ignore if can't read text
    }
    console.error("Erro na resposta da rede:", errorText);
    throw new Error(`Erro na comunicação com o servidor: ${response.statusText} (${response.status})`);
  }

  try {
    const result = await response.json();
    if (result.result === 'error') {
        throw new Error(result.message || 'O script retornou um erro.');
    }
    return result;
  } catch (e) {
    console.error("A resposta não era JSON ou falhou no parse:", e);
    throw new Error("Não foi possível processar a resposta do servidor.");
  }
}
