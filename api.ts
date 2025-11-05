import { GOOGLE_SCRIPT_URL } from './constants';
import type { RequisicaoData } from './types';

// Função para encapsular a lógica de envio para o Google Apps Script
export async function submitToGoogleScript(formData: RequisicaoData): Promise<{result: string, message?: string}> {
  if (GOOGLE_SCRIPT_URL.includes('YOUR_SCRIPT_ID')) {
     throw new Error("A URL do Google Apps Script não foi configurada. Atualize o arquivo 'constants.ts'.");
  }

  try {
    // CORREÇÃO: Agrupa os dados do formulário dentro de uma propriedade 'data'
    // para corresponder à estrutura esperada pelo script do Google (e.postData.contents.data).
    const payload = {
      action: 'salvarRequisicao',
      data: formData
    };
    
    // A abordagem 'text/plain' envia o payload JSON como uma única string.
    // Isso evita o pre-flight do CORS e é simples para o Google Apps Script processar
    // usando `JSON.parse(e.postData.contents)`.
    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      mode: 'cors',
      cache: 'no-cache',
      headers: {
        'Content-Type': 'text/plain;charset=UTF-8',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const errorBody = await response.text();
        console.error("Server response (error):", errorBody);
        throw new Error(`Erro do servidor: ${response.status} ${response.statusText}. Verifique o console para a resposta do servidor.`);
    }

    const responseText = await response.text();
    
    try {
      const result = JSON.parse(responseText);
      // O script do Google agora retorna 'result: "error"' em caso de falha.
      if (result.result === 'error') {
          // A mensagem de erro agora vem diretamente do servidor.
          throw new Error(`Erro no servidor: ${result.message}`);
      }
      return result;
    } catch (e) {
      console.error("A resposta do servidor não era um JSON válido:", responseText);
      throw new Error("A resposta do servidor não pôde ser processada. Isso geralmente ocorre quando o Google Script encontra um erro e retorna uma página de erro em HTML.");
    }

  } catch (err) {
    console.error("Erro ao tentar enviar ou processar a resposta:", err);
    if (err instanceof TypeError && err.message === 'Failed to fetch') {
      const debugMessage = `Falha na comunicação (Failed to fetch). Este erro geralmente significa que o script no servidor falhou e retornou um erro, o que é bloqueado pelo CORS.

Para depurar, modifique sua função \`doPost\` no Google Apps Script para usar \`e.postData.contents\` e envolva-a com um bloco try...catch:

\`\`\`javascript
// No seu arquivo .gs no Google Apps Script
function doPost(e) {
  try {
    // 1. Acesse o payload enviado pelo formulário.
    const dados = JSON.parse(e.postData.contents);

    // --- SEU CÓDIGO ATUAL PARA SALVAR OS DADOS AQUI ---
    // Exemplo:
    // salvarDadosNaPlanilha(dados); 
    // --- FIM DO SEU CÓDIGO ---

    return ContentService
      .createTextOutput(JSON.stringify({ result: "success", message: "Requisição recebida com sucesso!" }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    // Se ocorrer um erro, ele será capturado e retornado como JSON.
    // Isso permitirá que o formulário exiba o erro real.
    return ContentService
      .createTextOutput(JSON.stringify({ result: "error", message: "Erro no script: " + err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
\`\`\`
`;
      throw new Error(debugMessage);
    }

    if (err instanceof Error) {
        throw err;
    }
    
    throw new Error("Ocorreu um erro de rede ou de processamento desconhecido.");
  }
}
