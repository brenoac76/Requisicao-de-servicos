
import React, { useState, useEffect } from 'react';
import type { Servico, Entrega, FileData, RequisicaoData } from './types';
import { SubmissionStatus } from './types';
import { submitToGoogleScript } from './api';

// --- Helper Icon Components ---
const SpinnerIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const PlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" /></svg>;
const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>;

const getTodayDateString = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
};

// --- Main App Component ---
function App() {
  // State for form fields
  const [dataRequisicao, setDataRequisicao] = useState(getTodayDateString);
  const [cliente, setCliente] = useState('');
  const [montador, setMontador] = useState('');
  const [ambiente, setAmbiente] = useState('');
  const [ordemCompra, setOrdemCompra] = useState('');
  const [responsavel, setResponsavel] = useState('');

  // State for dynamic lists
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [entregas, setEntregas] = useState<Entrega[]>([]);
  const [files, setFiles] = useState<FileData[]>([]);
  
  // State for submission
  const [status, setStatus] = useState<SubmissionStatus>(SubmissionStatus.IDLE);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // --- Dynamic List Handlers ---
  const addItem = <T extends { id: string }>(setter: React.Dispatch<React.SetStateAction<T[]>>, newItem: T) => {
    setter(prev => [...prev, newItem]);
  };
  
  const removeItem = <T extends { id: string }>(setter: React.Dispatch<React.SetStateAction<T[]>>, id: string) => {
    setter(prev => prev.filter(item => item.id !== id));
  };
  
  const updateItem = <T extends { id: string }, K extends keyof T>(
    setter: React.Dispatch<React.SetStateAction<T[]>>, 
    id: string, 
    field: K, 
    value: T[K]
  ) => {
    setter(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  };
  
  const addServico = () => addItem(setServicos, { id: Date.now().toString(), quantidade: '', especificacao: '', descricao: '', volume: '' });
  const addEntrega = () => addItem(setEntregas, { id: Date.now().toString(), quantidade: '', descricao: '', cor: '', fornecedor: '', entregaOk: 'Sim' });

  // Add one of each on initial load
  useEffect(() => {
    addServico();
    addEntrega();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (!selectedFiles.length) return;

    selectedFiles.forEach((file: File) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64String = event.target?.result as string;
        const newFile: FileData = {
          id: `${file.name}-${file.lastModified}`,
          name: file.name,
          mimeType: file.type,
          data: base64String,
        };
        setFiles(prev => [...prev, newFile]);
      };
      reader.readAsDataURL(file);
    });
  };
  
  const removeFile = (id: string) => {
      setFiles(prev => prev.filter(file => file.id !== id));
  }

  const resetForm = () => {
      setDataRequisicao(getTodayDateString());
      setCliente('');
      setMontador('');
      setAmbiente('');
      setOrdemCompra('');
      setResponsavel('');
      setServicos([]);
      setEntregas([]);
      setFiles([]);
      // Add initial items back
      addItem(setServicos, { id: Date.now().toString(), quantidade: '', especificacao: '', descricao: '', volume: '' });
      addItem(setEntregas, { id: Date.now().toString(), quantidade: '', descricao: '', cor: '', fornecedor: '', entregaOk: 'Sim' });
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!dataRequisicao || !cliente || !montador) {
        setStatus(SubmissionStatus.ERROR);
        setFeedbackMessage("Por favor, preencha a Data, o Cliente e o Montador.");
        setTimeout(() => setStatus(SubmissionStatus.IDLE), 4000);
        return;
    }

    setStatus(SubmissionStatus.LOADING);
    setFeedbackMessage(null);

    const payload: RequisicaoData = {
      data: dataRequisicao,
      cliente,
      montador,
      ambiente,
      ordemCompra,
      responsavel,
      servicos: servicos.map(({ id, ...rest }) => rest),
      entregas: entregas.map(({ id, ...rest }) => rest),
      filesData: files.map(({ id, ...rest }) => rest),
      numServicos: servicos.length,
      numEntregas: entregas.length,
    };

    try {
      const result = await (submitToGoogleScript as any)(payload);
      
      setStatus(SubmissionStatus.SUCCESS);
      setFeedbackMessage(result.message || "Requisição enviada com sucesso!");
      resetForm();
      setTimeout(() => setStatus(SubmissionStatus.IDLE), 4000);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ocorreu um erro desconhecido.';
      setFeedbackMessage(`Falha ao enviar: ${errorMessage}`);
      setStatus(SubmissionStatus.ERROR);
      console.error(err);
      setTimeout(() => setStatus(SubmissionStatus.IDLE), 4000);
    }
  };
  
  const inputBaseClasses = "w-full px-4 py-2 rounded-lg focus:ring-2 focus:border-blue-500 outline-none transition";
  const mainInputClasses = `${inputBaseClasses} bg-blue-50 border border-blue-200 focus:ring-blue-500`;
  const subInputClasses = `${inputBaseClasses} text-sm bg-white border border-slate-300 focus:ring-1 focus:ring-blue-500`;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800">
      <div className="container mx-auto px-4 py-8 md:py-12">
        
        <header className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-sky-600">
            Requisição de Serviços
          </h1>
          <p className="mt-2 text-slate-600">Todeschini Ipatinga</p>
        </header>

        <main className="w-full max-w-5xl mx-auto">
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 md:p-10 space-y-8">
            
            {/* --- General Info Section --- */}
            <section className="border-b border-slate-200 pb-8">
                <div className="grid grid-cols-1 md:grid-cols-6 gap-6 items-end">
                    <div className="md:col-span-1">
                        <label htmlFor="dataRequisicao" className="block text-sm font-medium text-slate-700 mb-1">Data</label>
                        <input type="date" name="dataRequisicao" id="dataRequisicao" required value={dataRequisicao} onChange={e => setDataRequisicao(e.target.value)} className={mainInputClasses} />
                    </div>
                    <div className="md:col-span-3">
                        <label htmlFor="clienteRequisicao" className="block text-sm font-medium text-slate-700 mb-1">Cliente</label>
                        <input type="text" name="clienteRequisicao" id="clienteRequisicao" required value={cliente} onChange={e => setCliente(e.target.value)} className={mainInputClasses} />
                    </div>
                     <div className="md:col-span-2">
                        <label htmlFor="montador" className="block text-sm font-medium text-slate-700 mb-1">Montador</label>
                        <select name="montador" id="montador" required value={montador} onChange={e => setMontador(e.target.value)} className={`${mainInputClasses} appearance-none bg-no-repeat bg-right pr-8`} style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.5rem center', backgroundSize: '1.5em 1.5em' }}>
                            <option value="" disabled>Selecione</option>
                            <option value="Artur">Artur</option><option value="Carlos">Carlos</option><option value="Eder">Eder</option><option value="Gleisson">Gleisson</option><option value="Henrique">Henrique</option><option value="Marcio">Marcio</option><option value="Mateus">Mateus</option><option value="Natanael">Natanael</option><option value="Rafael">Rafael</option><option value="Kelvin">Kelvin</option>
                        </select>
                    </div>
                    <div className="md:col-span-2">
                        <label htmlFor="ambienteRequisicao" className="block text-sm font-medium text-slate-700 mb-1">Ambiente</label>
                        <input type="text" name="ambienteRequisicao" id="ambienteRequisicao" required value={ambiente} onChange={e => setAmbiente(e.target.value)} className={mainInputClasses} />
                    </div>
                     <div className="md:col-span-2">
                        <label htmlFor="ordemCompra" className="block text-sm font-medium text-slate-700 mb-1">Ordem de Compra</label>
                        <input type="text" name="ordemCompra" id="ordemCompra" required value={ordemCompra} onChange={e => setOrdemCompra(e.target.value)} className={mainInputClasses} />
                    </div>
                    <div className="md:col-span-2">
                        <label htmlFor="responsavel" className="block text-sm font-medium text-slate-700 mb-1">Responsável</label>
                        <input type="text" name="responsavel" id="responsavel" required value={responsavel} onChange={e => setResponsavel(e.target.value)} className={mainInputClasses} />
                    </div>
                </div>
            </section>
            
            {/* --- Servicos Section --- */}
            <section>
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Serviços para Execução</h2>
                <div className="space-y-4">
                    {servicos.map((servico, index) => (
                        <div key={servico.id} className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="font-semibold text-slate-600">Serviço #{index + 1}</h3>
                                <button type="button" onClick={() => removeItem(setServicos, servico.id)} className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-100 transition"><TrashIcon /></button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                                <div className="md:col-span-2"><label className="block text-xs font-medium text-gray-600">Qtd</label><input type="text" value={servico.quantidade} onChange={e => updateItem<Servico, 'quantidade'>(setServicos, servico.id, 'quantidade', e.target.value)} className={subInputClasses} /></div>
                                <div className="md:col-span-4"><label className="block text-xs font-medium text-gray-600">Especificação</label><input type="text" value={servico.especificacao} onChange={e => updateItem<Servico, 'especificacao'>(setServicos, servico.id, 'especificacao', e.target.value)} className={subInputClasses} /></div>
                                <div className="md:col-span-4"><label className="block text-xs font-medium text-gray-600">Descrição</label><input type="text" value={servico.descricao} onChange={e => updateItem<Servico, 'descricao'>(setServicos, servico.id, 'descricao', e.target.value)} className={subInputClasses} /></div>
                                <div className="md:col-span-2"><label className="block text-xs font-medium text-gray-600">Volume</label><input type="text" value={servico.volume} onChange={e => updateItem<Servico, 'volume'>(setServicos, servico.id, 'volume', e.target.value)} className={subInputClasses} /></div>
                            </div>
                        </div>
                    ))}
                </div>
                <button type="button" onClick={addServico} className="mt-4 flex items-center justify-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-800 transition"><PlusIcon /> Adicionar Serviço</button>
            </section>
            
            {/* --- Entregas Section --- */}
            <section>
                 <h2 className="text-xl font-semibold text-gray-800 mb-4">Itens para Entrega</h2>
                 <div className="space-y-4">
                    {entregas.map((entrega, index) => (
                         <div key={entrega.id} className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="font-semibold text-slate-600">Entrega #{index + 1}</h3>
                                <button type="button" onClick={() => removeItem(setEntregas, entrega.id)} className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-100 transition"><TrashIcon /></button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                                <div className="md:col-span-2"><label className="block text-xs font-medium text-gray-600">Qtd</label><input type="text" value={entrega.quantidade} onChange={e => updateItem<Entrega, 'quantidade'>(setEntregas, entrega.id, 'quantidade', e.target.value)} className={subInputClasses} /></div>
                                <div className="md:col-span-3"><label className="block text-xs font-medium text-gray-600">Descrição</label><input type="text" value={entrega.descricao} onChange={e => updateItem<Entrega, 'descricao'>(setEntregas, entrega.id, 'descricao', e.target.value)} className={subInputClasses} /></div>
                                <div className="md:col-span-2"><label className="block text-xs font-medium text-gray-600">Cor</label><input type="text" value={entrega.cor} onChange={e => updateItem<Entrega, 'cor'>(setEntregas, entrega.id, 'cor', e.target.value)} className={subInputClasses} /></div>
                                <div className="md:col-span-3"><label className="block text-xs font-medium text-gray-600">Fornecedor</label><input type="text" value={entrega.fornecedor} onChange={e => updateItem<Entrega, 'fornecedor'>(setEntregas, entrega.id, 'fornecedor', e.target.value)} className={subInputClasses} /></div>
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-medium text-gray-600">Entrega OK?</label>
                                    <select value={entrega.entregaOk} onChange={e => updateItem<Entrega, 'entregaOk'>(setEntregas, entrega.id, 'entregaOk', e.target.value as Entrega['entregaOk'])} className={`${subInputClasses} appearance-none bg-no-repeat bg-right pr-8`} style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.5rem center', backgroundSize: '1.5em 1.5em' }}>
                                        <option value="Sim">Sim</option>
                                        <option value="Nao">Não</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    ))}
                 </div>
                 <button type="button" onClick={addEntrega} className="mt-4 flex items-center justify-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-800 transition"><PlusIcon /> Adicionar Entrega</button>
            </section>
            
            {/* --- File Upload Section --- */}
            <section>
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Anexar Imagens</h2>
                <label htmlFor="fotos" className="relative cursor-pointer w-full flex flex-col items-center justify-center p-6 border-2 border-slate-300 border-dashed rounded-lg bg-slate-50 hover:bg-slate-100 transition">
                  <div className="text-center">
                     <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                    <p className="mt-2 text-sm text-slate-600"><span className="font-semibold">Clique para carregar</span></p>
                    <p className="text-xs text-slate-500">PNG, JPG, etc.</p>
                  </div>
                </label>
                <input type="file" id="fotos" name="fotos" multiple accept="image/*" onChange={handleFileChange} className="sr-only" />
                
                {files.length > 0 && (
                    <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {files.map(file => (
                            <div key={file.id} className="relative group w-full h-24">
                                <img src={file.data} alt={file.name} className="w-full h-full object-cover rounded-md shadow-md" />
                                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 flex items-center justify-center transition-all rounded-md">
                                    <button type="button" onClick={() => removeFile(file.id)} className="w-8 h-8 bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" title="Remover imagem">
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>
            
            {/* --- Submission Area --- */}
            <div className="pt-6 border-t border-slate-200">
                <div className="mb-6 h-10 transition-all duration-300 flex items-center justify-center">
                  {status === SubmissionStatus.SUCCESS && (
                    <div className="w-full bg-green-100 border border-green-300 text-green-800 p-3 rounded-md text-center" role="alert">{feedbackMessage}</div>
                  )}
                  {status === SubmissionStatus.ERROR && (
                    <div className="w-full bg-red-100 border border-red-300 text-red-800 p-3 rounded-md text-center" role="alert">{feedbackMessage}</div>
                  )}
                </div>
                <button 
                  type="submit"
                  disabled={status === SubmissionStatus.LOADING}
                  className="w-full flex justify-center items-center gap-2 px-6 py-3 text-lg font-semibold text-white bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 rounded-lg shadow-lg focus:outline-none focus:ring-4 focus:ring-green-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                >
                  {status === SubmissionStatus.LOADING ? (
                    <>
                      <SpinnerIcon className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />
                      Enviando...
                    </>
                  ) : 'Enviar Requisição'}
                </button>
            </div>
          </form>
        </main>
        
      </div>
    </div>
  );
}

// No longer need to inject styles as they are applied directly or are straightforward.

export default App;
