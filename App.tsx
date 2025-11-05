
import React, { useState, useEffect, useRef } from 'react';
import type { Servico, Entrega, FileData, RequisicaoData } from './types';
import { SubmissionStatus } from './types';
import { submitToGoogleScript } from './api';

// --- Helper Function to read a file as a Promise ---
const readFileAsPromise = (file: File): Promise<FileData> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        resolve({
          id: `${file.name}-${file.lastModified}-${Math.random()}`,
          name: file.name,
          mimeType: file.type || 'image/jpeg',
          data: result,
        });
      } else {
        reject(new Error(`Falha ao ler o arquivo: ${file.name}`));
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
};


// --- Helper Icon Components ---
const SpinnerIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);
const SuccessIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const ErrorIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const PlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" /></svg>;
const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>;
const SunIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>;
const MoonIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>;


const getTodayDateString = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
};

// --- Toast Component ---
const Toast: React.FC<{ message: string; status: 'SUCCESS' | 'ERROR'; onDismiss: () => void }> = ({ message, status, onDismiss }) => {
    const isError = status === 'ERROR';
    const baseClasses = "fixed top-5 right-5 max-w-md w-[90%] p-4 rounded-lg shadow-2xl flex items-start gap-3 z-50 animate-fade-in-right";
    const colorClasses = isError
      ? "bg-red-100 dark:bg-red-900 border border-red-300 dark:border-red-700 text-red-800 dark:text-red-100"
      : "bg-green-100 dark:bg-green-900 border border-green-300 dark:border-green-700 text-green-800 dark:text-green-100";

    return (
        <div className={`${baseClasses} ${colorClasses}`} role="alert">
            <div className="flex-shrink-0">{isError ? <ErrorIcon /> : <SuccessIcon />}</div>
            <div className="flex-1 whitespace-pre-wrap text-sm">{message}</div>
            <button onClick={onDismiss} className="p-1 -m-1 rounded-full hover:bg-black/10 transition-colors" aria-label="Dismiss">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
        </div>
    );
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
  
  // State for submission & UI
  const [status, setStatus] = useState<SubmissionStatus>(SubmissionStatus.IDLE);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [showStickyFooter, setShowStickyFooter] = useState(false);
  const formActionsRef = useRef<HTMLDivElement>(null);


  // --- Theme Management ---
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialTheme = savedTheme || (systemPrefersDark ? 'dark' : 'light');
    setTheme(initialTheme);
  }, []);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [theme]);

  // --- Sticky Footer Logic ---
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        // Show sticky footer when the original form actions are NOT visible
        setShowStickyFooter(!entry.isIntersecting);
      },
      { rootMargin: "0px 0px -100px 0px" } // Trigger when the element is 100px from the bottom
    );

    const currentRef = formActionsRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, []);


  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  };


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

  // --- File Handling Logic (Refactored for Reusability) ---
  const processFiles = async (filesToProcess: File[]) => {
    if (!filesToProcess.length) return;

    try {
      const newFiles = await Promise.all(filesToProcess.map(readFileAsPromise));
      setFiles(prev => [...prev, ...newFiles]);
    } catch (error) {
      console.error("Erro ao ler arquivos:", error);
      setFeedbackMessage("Falha ao carregar uma ou mais imagens.");
      setStatus(SubmissionStatus.ERROR);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    processFiles(Array.from(e.target.files || []));
    // Clear the input value to allow the user to select the same file again if needed
    e.target.value = '';
  };
  
  const removeFile = (id: string) => {
      setFiles(prev => prev.filter(file => file.id !== id));
  }

  // --- Drag and Drop Handlers ---
  const handleDragEnter = (e: React.DragEvent<HTMLElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent<HTMLElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); };
  const handleDragOver = (e: React.DragEvent<HTMLElement>) => { e.preventDefault(); e.stopPropagation(); }; // Necessary to allow drop
  const handleDrop = (e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    processFiles(Array.from(e.dataTransfer.files || []));
    e.dataTransfer.clearData();
  };

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
    
    // Reset status from previous submission attempt
    setStatus(SubmissionStatus.LOADING);
    setFeedbackMessage(null);

    if (!dataRequisicao || !cliente.trim() || !montador) {
        setStatus(SubmissionStatus.ERROR);
        setFeedbackMessage("Por favor, preencha a Data, o Cliente e o Montador.");
        return;
    }
    
    // Helper function to sanitize strings for use as file/folder names in Google Drive.
    // Replaces invalid characters with an underscore.
    const sanitizeForDrive = (str: string) => str.trim().replace(/[\/\\:]/g, '_');

    const payload: RequisicaoData = {
      data: dataRequisicao,
      cliente: sanitizeForDrive(cliente),
      montador,
      ambiente: sanitizeForDrive(ambiente),
      ordemCompra: sanitizeForDrive(ordemCompra),
      responsavel: sanitizeForDrive(responsavel),
      servicos: servicos.map(({ id, ...rest }) => rest),
      entregas: entregas.map(({ id, ...rest }) => rest),
      filesData: files.map(({ id, name, mimeType, data }) => {
        // O script do backend (codigo.gs) espera receber a string de dados
        // em um formato que contenha uma vírgula, para então dividi-la (split)
        // e pegar a segunda parte como os dados base64.
        // A string original do FileReader (Data URL) já está nesse formato
        // (ex: "data:image/jpeg;base64,iVBOR...").
        // A versão anterior estava removendo o prefixo, causando a falha.
        // Agora, enviamos a string de dados original como está para manter a compatibilidade.
        const sanitizedName = name.replace(/[^a-zA-Z0-9._-]/g, '_');
        return { name: sanitizedName, mimeType, data: data };
      }),
      numServicos: servicos.length,
      numEntregas: entregas.length,
    };

    // --- Payload Size Validation ---
    const payloadString = JSON.stringify(payload);
    const sizeInMB = new TextEncoder().encode(payloadString).length / 1024 / 1024;
    
    if (sizeInMB > 45) { // 45MB limit to be safe, Google's limit is around 50MB
        setStatus(SubmissionStatus.ERROR);
        setFeedbackMessage(`Envio muito grande (${sizeInMB.toFixed(1)} MB). O limite é 45 MB. Remova algumas imagens ou reduza a qualidade.`);
        return;
    }

    try {
      const result = await submitToGoogleScript(payload);
      
      setStatus(SubmissionStatus.SUCCESS);
      setFeedbackMessage(result.message || "Requisição enviada com sucesso!");
      resetForm();
      setTimeout(() => {
        if (status !== SubmissionStatus.ERROR) { // Avoid hiding an error that occurred after success
          setFeedbackMessage(null);
          setStatus(SubmissionStatus.IDLE);
        }
      }, 5000);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ocorreu um erro desconhecido.';
      setFeedbackMessage(errorMessage); // Use the detailed message from api.ts
      setStatus(SubmissionStatus.ERROR);
      console.error(err);
    }
  };
  
  const handleDismissToast = () => {
    setFeedbackMessage(null);
    if (status !== SubmissionStatus.LOADING) {
      setStatus(SubmissionStatus.IDLE);
    }
  };

  const inputBaseClasses = "w-full px-4 py-2 rounded-lg focus:ring-2 focus:border-blue-500 outline-none transition duration-200 dark:text-slate-200 dark:focus:ring-blue-400";
  const mainInputClasses = `${inputBaseClasses} bg-blue-50 dark:bg-slate-800 border border-blue-200 dark:border-slate-700 focus:ring-blue-500`;
  const subInputClasses = `${inputBaseClasses} text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 focus:ring-1 focus:ring-blue-500`;
  const validationPattern = { pattern: ".*\\S.*", title: "Este campo não pode conter apenas espaços." };

  const renderActionButtons = () => (
    <>
      <button 
        type="submit"
        disabled={status === SubmissionStatus.LOADING}
        className="w-full sm:w-auto flex-grow flex justify-center items-center gap-2 px-6 py-3 text-lg font-semibold text-white bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-700 hover:to-sky-700 rounded-lg shadow-lg focus:outline-none focus:ring-4 focus:ring-blue-300 dark:focus:ring-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
      >
        {status === SubmissionStatus.LOADING ? (
          <>
            <SpinnerIcon className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />
            Enviando...
          </>
        ) : 'Enviar Requisição'}
      </button>
      <button 
        type="button"
        onClick={resetForm}
        disabled={status === SubmissionStatus.LOADING}
        className="w-full sm:w-auto px-6 py-3 text-lg font-semibold text-slate-700 dark:text-slate-300 bg-transparent hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-4 focus:ring-slate-300 dark:focus:ring-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
      >
        Limpar
      </button>
    </>
  );


  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200 transition-colors duration-300">
      
      {feedbackMessage && (status === 'SUCCESS' || status === 'ERROR') && (
        <Toast message={feedbackMessage} status={status} onDismiss={handleDismissToast} />
      )}

      <div className="container mx-auto px-4 py-8 md:py-12">
        <header className="text-center mb-8 relative">
          <h1 className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-sky-600 dark:from-blue-500 dark:to-sky-400">
            Requisição de Serviços
          </h1>
          <p className="mt-2 text-slate-600 dark:text-slate-400">Todeschini Ipatinga</p>
          <button 
            onClick={toggleTheme}
            className="absolute top-0 right-0 p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
            aria-label="Toggle theme"
          >
            {theme === 'light' ? <MoonIcon /> : <SunIcon />}
          </button>
        </header>

        <main className="w-full max-w-5xl mx-auto pb-24"> {/* Added padding-bottom for sticky footer */}
          <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800/50 rounded-2xl shadow-xl p-6 sm:p-8 md:p-10 space-y-8">
            
            {/* --- General Info Section --- */}
            <section className="border-b border-slate-200 dark:border-slate-700 pb-8">
                <div className="grid grid-cols-1 md:grid-cols-6 gap-6 items-end">
                    <div className="md:col-span-1">
                        <label htmlFor="dataRequisicao" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Data <span className="text-red-500">*</span></label>
                        <input type="date" name="dataRequisicao" id="dataRequisicao" required value={dataRequisicao} onChange={e => setDataRequisicao(e.target.value)} className={mainInputClasses} />
                    </div>
                    <div className="md:col-span-3">
                        <label htmlFor="clienteRequisicao" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Cliente <span className="text-red-500">*</span></label>
                        <input type="text" name="clienteRequisicao" id="clienteRequisicao" required value={cliente} onChange={e => setCliente(e.target.value)} className={mainInputClasses} {...validationPattern} />
                    </div>
                     <div className="md:col-span-2">
                        <label htmlFor="montador" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Montador <span className="text-red-500">*</span></label>
                        <select name="montador" id="montador" required value={montador} onChange={e => setMontador(e.target.value)} className={`${mainInputClasses} appearance-none bg-no-repeat bg-right pr-8`} style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.5rem center', backgroundSize: '1.5em 1.5em' }}>
                            <option value="" disabled>Selecione</option>
                            <option value="Artur">Artur</option><option value="Carlos">Carlos</option><option value="Eder">Eder</option><option value="Gleisson">Gleisson</option><option value="Henrique">Henrique</option><option value="Marcio">Marcio</option><option value="Mateus">Mateus</option><option value="Natanael">Natanael</option><option value="Rafael">Rafael</option><option value="Kelvin">Kelvin</option>
                        </select>
                    </div>
                    <div className="md:col-span-2">
                        <label htmlFor="ambienteRequisicao" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Ambiente</label>
                        <input type="text" name="ambienteRequisicao" id="ambienteRequisicao" value={ambiente} onChange={e => setAmbiente(e.target.value)} className={mainInputClasses} {...validationPattern} />
                    </div>
                     <div className="md:col-span-2">
                        <label htmlFor="ordemCompra" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Ordem de Compra</label>
                        <input type="text" name="ordemCompra" id="ordemCompra" value={ordemCompra} onChange={e => setOrdemCompra(e.target.value)} className={mainInputClasses} {...validationPattern} />
                    </div>
                    <div className="md:col-span-2">
                        <label htmlFor="responsavel" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Responsável</label>
                        <input type="text" name="responsavel" id="responsavel" value={responsavel} onChange={e => setResponsavel(e.target.value)} className={mainInputClasses} {...validationPattern} />
                    </div>
                </div>
            </section>
            
            {/* --- Servicos Section --- */}
            <section>
                <h2 className="text-xl font-semibold text-gray-800 dark:text-slate-200 mb-4">Serviços para Execução</h2>
                <div className="space-y-4">
                    {servicos.map((servico, index) => (
                        <div key={servico.id} className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="font-semibold text-slate-600 dark:text-slate-400">Serviço #{index + 1}</h3>
                                {servicos.length > 1 && (
                                    <button type="button" onClick={() => removeItem(setServicos, servico.id)} className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-100 dark:hover:bg-red-900/50 transition"><TrashIcon /></button>
                                )}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                                <div className="md:col-span-2"><label className="block text-xs font-medium text-gray-600 dark:text-slate-400">Qtd</label><input type="text" value={servico.quantidade} onChange={e => updateItem<Servico, 'quantidade'>(setServicos, servico.id, 'quantidade', e.target.value)} className={subInputClasses} /></div>
                                <div className="md:col-span-4"><label className="block text-xs font-medium text-gray-600 dark:text-slate-400">Especificação</label><input type="text" value={servico.especificacao} onChange={e => updateItem<Servico, 'especificacao'>(setServicos, servico.id, 'especificacao', e.target.value)} className={subInputClasses} /></div>
                                <div className="md:col-span-4"><label className="block text-xs font-medium text-gray-600 dark:text-slate-400">Descrição</label><input type="text" value={servico.descricao} onChange={e => updateItem<Servico, 'descricao'>(setServicos, servico.id, 'descricao', e.target.value)} className={subInputClasses} /></div>
                                <div className="md:col-span-2"><label className="block text-xs font-medium text-gray-600 dark:text-slate-400">Volume</label><input type="text" value={servico.volume} onChange={e => updateItem<Servico, 'volume'>(setServicos, servico.id, 'volume', e.target.value)} className={subInputClasses} /></div>
                            </div>
                        </div>
                    ))}
                </div>
                <button type="button" onClick={addServico} className="mt-4 flex items-center justify-center gap-2 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition"><PlusIcon /> Adicionar Serviço</button>
            </section>
            
            {/* --- Entregas Section --- */}
            <section>
                 <h2 className="text-xl font-semibold text-gray-800 dark:text-slate-200 mb-4">Itens para Entrega</h2>
                 <div className="space-y-4">
                    {entregas.map((entrega, index) => (
                         <div key={entrega.id} className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="font-semibold text-slate-600 dark:text-slate-400">Entrega #{index + 1}</h3>
                                {entregas.length > 1 && (
                                    <button type="button" onClick={() => removeItem(setEntregas, entrega.id)} className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-100 dark:hover:bg-red-900/50 transition"><TrashIcon /></button>
                                )}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                                <div className="md:col-span-2"><label className="block text-xs font-medium text-gray-600 dark:text-slate-400">Qtd</label><input type="text" value={entrega.quantidade} onChange={e => updateItem<Entrega, 'quantidade'>(setEntregas, entrega.id, 'quantidade', e.target.value)} className={subInputClasses} /></div>
                                <div className="md:col-span-3"><label className="block text-xs font-medium text-gray-600 dark:text-slate-400">Descrição</label><input type="text" value={entrega.descricao} onChange={e => updateItem<Entrega, 'descricao'>(setEntregas, entrega.id, 'descricao', e.target.value)} className={subInputClasses} /></div>
                                <div className="md:col-span-2"><label className="block text-xs font-medium text-gray-600 dark:text-slate-400">Cor</label><input type="text" value={entrega.cor} onChange={e => updateItem<Entrega, 'cor'>(setEntregas, entrega.id, 'cor', e.target.value)} className={subInputClasses} /></div>
                                <div className="md:col-span-3"><label className="block text-xs font-medium text-gray-600 dark:text-slate-400">Fornecedor</label><input type="text" value={entrega.fornecedor} onChange={e => updateItem<Entrega, 'fornecedor'>(setEntregas, entrega.id, 'fornecedor', e.target.value)} className={subInputClasses} /></div>
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-medium text-gray-600 dark:text-slate-400">Entrega OK?</label>
                                    <select value={entrega.entregaOk} onChange={e => updateItem<Entrega, 'entregaOk'>(setEntregas, entrega.id, 'entregaOk', e.target.value as Entrega['entregaOk'])} className={`${subInputClasses} appearance-none bg-no-repeat bg-right pr-8`} style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.5rem center', backgroundSize: '1.5em 1.5em' }}>
                                        <option value="Sim">Sim</option>
                                        <option value="Nao">Não</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    ))}
                 </div>
                 <button type="button" onClick={addEntrega} className="mt-4 flex items-center justify-center gap-2 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition"><PlusIcon /> Adicionar Entrega</button>
            </section>
            
            {/* --- File Upload Section --- */}
            <section>
                <h2 className="text-xl font-semibold text-gray-800 dark:text-slate-200 mb-4">Anexar Imagens</h2>
                <label 
                  htmlFor="fotos"
                  onDragEnter={handleDragEnter}
                  onDragLeave={handleDragLeave}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  className={`relative cursor-pointer w-full flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg transition-all duration-300 ${isDragging ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 ring-2 ring-blue-200' : 'border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                >
                  <div className="text-center">
                     <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-400"><span className="font-semibold text-blue-600 dark:text-blue-400">Clique para carregar</span> ou arraste e solte</p>
                    <p className="text-xs text-slate-500 dark:text-slate-500">PNG, JPG, etc. (Limite ~45MB)</p>
                  </div>
                </label>
                <input type="file" id="fotos" name="fotos" multiple accept="image/*" onChange={handleFileChange} className="sr-only" />
                
                {files.length > 0 && (
                    <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {files.map(file => (
                            <div key={file.id} className="relative group w-full">
                                <div className="relative w-full h-24">
                                    <img src={file.data} alt={file.name} className="w-full h-full object-cover rounded-md shadow-md" />
                                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 flex items-center justify-center transition-all rounded-md">
                                        <button type="button" onClick={() => removeFile(file.id)} className="w-8 h-8 bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" title="Remover imagem">
                                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                        </button>
                                    </div>
                                </div>
                                <p className="text-xs text-center text-slate-600 dark:text-slate-400 mt-1 truncate px-1" title={file.name}>{file.name}</p>
                            </div>
                        ))}
                    </div>
                )}
            </section>
            
            {/* --- Submission Area --- */}
            <div ref={formActionsRef} className="pt-6 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row-reverse gap-4">
              {renderActionButtons()}
            </div>
          </form>
        </main>
        
        {/* --- Sticky Footer Action Bar --- */}
        {showStickyFooter && (
          <footer className="fixed bottom-0 left-0 right-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-t border-slate-200 dark:border-slate-700 p-4 shadow-[0_-5px_15px_-5px_rgba(0,0,0,0.1)] transition-transform duration-300 animate-fade-in-up">
            <div className="container mx-auto max-w-5xl flex flex-col sm:flex-row-reverse gap-4">
              {renderActionButtons()}
            </div>
          </footer>
        )}
        
      </div>
    </div>
  );
}

export default App;
