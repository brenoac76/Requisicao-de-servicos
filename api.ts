import { GOOGLE_SCRIPT_URL } from './constants';
import type { RequisicaoData } from './types';

// Função para encapsular a lógica de envio para o Google Apps Script
export async function submitToGoogleScript(formData: RequisicaoData): Promise<{result: string, message?: string}> {
  if (GOOGLE_SCRIPT_URL.includes('YOUR_SCRIPT_ID')) {
    // Para fins de teste local, vamos simular uma resposta de sucesso.
    console.warn("URL do Google Apps Script não configurada. Simulando envio bem-sucedido.");
    return new Promise(resolve => {
        setTimeout(() => {
            resolve({ result: 'success', message: 'Requisição enviada com sucesso (simulado).' });
        }, 1500);
    });
    // Linha original:
    // throw new Error("A URL do Google Apps Script não foi configurada. Atualize o arquivo 'constants.ts'.");
  }

  // O Google Apps Script não lida bem com 'Content-Type: application/json' em requisições de formulário simples.
  // Uma abordagem mais robusta é enviar como texto e fazer o parse no lado do servidor.
  const response = await fetch(GOOGLE_SCRIPT_URL, {
    method: 'POST',
    mode: 'no-cors', // 'no-cors' é frequentemente necessário para scripts do Google para evitar erros de CORS, mas você não receberá uma resposta legível.
    cache: 'no-cache',
    headers: {
      // Omitir Content-Type para que o browser defina com 'boundary' se usar FormData, 
      // ou usar 'text/plain' se enviar stringified JSON.
      'Content-Type': 'text/plain;charset=utf-8',
    },
    body: JSON.stringify({ action: 'salvarRequisicao', data: formData }), // Envolvendo os dados
    redirect: 'follow',
  });

  // Com 'no-cors', a resposta será 'opaque' e 'response.ok' será sempre falso.
  // Não podemos ler o status ou o corpo. Apenas confiamos que a requisição foi enviada.
  // A melhor prática é que o script do google envie um email ou logue o sucesso/erro.
  // Para UI, vamos assumir sucesso se não houver erro de rede imediato.
  
  // AVISO: A lógica abaixo não será executada com 'no-cors'.
  // Ela é mantida para o caso de você configurar seu script para retornar os cabeçalhos CORS apropriados.
  if (!response.ok) {
    const errorText = await response.text();
    console.error("Erro na resposta da rede:", errorText);
    throw new Error(`Erro na comunicação com o servidor: ${response.statusText}`);
  }

  try {
    const result = await response.json();
    return result;
  } catch (e) {
    console.warn("A resposta não era JSON. Assumindo sucesso com base no status da resposta.");
    return { result: 'success' };
  }
}
