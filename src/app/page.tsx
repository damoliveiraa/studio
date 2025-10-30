'use client';

import { useState, useRef, useEffect, ChangeEvent } from 'react';
import { 
  syncVtexToSheets, 
  getVtexOrdersAsCsv, 
  getSyncHistory,
  HistoryEntry
} from './actions';

export default function Home() {
  const [isLoadingSheets, setIsLoadingSheets] = useState(false);
  const [isLoadingCsv, setIsLoadingCsv] = useState(false);
  const [isAutomationRunning, setIsAutomationRunning] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [nextSyncTime, setNextSyncTime] = useState<Date | null>(null); // State for next sync
  const [syncHistory, setSyncHistory] = useState<HistoryEntry[]>([]);
  const [intervalValue, setIntervalValue] = useState<number>(1);
  const [intervalUnit, setIntervalUnit] = useState('hours');
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    async function loadInitialData() {
      const historyData = await getSyncHistory();
      setSyncHistory(historyData);
      
      if (historyData.length > 0) {
        const lastSuccessfulSync = historyData.find(h => h.success || h.results.some(r => r.status === 'success'));
        if (lastSuccessfulSync) {
          setLastSyncTime(new Date(lastSuccessfulSync.timestamp));
        }
      }
    }
    loadInitialData();
  }, []);

  const handleIntervalChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const parsedValue = parseInt(value, 10);
    setIntervalValue(isNaN(parsedValue) ? 0 : parsedValue);
  };

  const handleSyncToSheets = async () => {
    setIsLoadingSheets(true);
    setFeedbackMessage(null);
    
    const result = await syncVtexToSheets();
    const newHistoryEntry = { ...result, timestamp: new Date() };

    setSyncHistory(prevHistory => [newHistoryEntry, ...prevHistory].slice(0, 50));

    if (!result.success && result.results.length === 0) {
        setFeedbackMessage({ type: 'error', text: result.message });
    }

    if (result.success || result.results.some(r => r.status === 'success')) {
      setLastSyncTime(new Date());
    }
    setIsLoadingSheets(false);
  };
  
  const runAutomatedSync = async () => {
    await handleSyncToSheets();
    const multiplier = intervalUnit === 'minutes' ? 60 * 1000 : 60 * 60 * 1000;
    const intervalMs = intervalValue * multiplier;
    setNextSyncTime(new Date(Date.now() + intervalMs));
  };

  const handleDownloadCsv = async () => {
    setIsLoadingCsv(true);
    const result = await getVtexOrdersAsCsv();
    if (result.success && result.csvContent) {
      const blob = new Blob([result.csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', result.fileName || 'vtex-orders.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
    if(result.message && !result.success) {
      setFeedbackMessage({ type: 'error', text: result.message });
    }
    setIsLoadingCsv(false);
  };

  const handleStartAutomation = () => {
    setFeedbackMessage(null);
    if (intervalValue < 1) {
      setFeedbackMessage({ type: 'error', text: 'O intervalo deve ser de pelo menos 1.' });
      return;
    }

    setIsAutomationRunning(true);
    handleSyncToSheets(); // Run immediately on start

    const multiplier = intervalUnit === 'minutes' ? 60 * 1000 : 60 * 60 * 1000;
    const intervalMs = intervalValue * multiplier;
    setNextSyncTime(new Date(Date.now() + intervalMs)); // Set time for the *next* run

    intervalRef.current = setInterval(runAutomatedSync, intervalMs);
  };

  const handlePauseAutomation = () => {
    setIsAutomationRunning(false);
    setNextSyncTime(null); // Clear the next sync time
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };
  
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-background font-sans text-gray-900">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <h1 className="text-2xl font-semibold text-gray-900">Painel de Sincronização</h1>
          <p className="text-sm text-gray-600">Gerencie e monitore a extração de dados da VTEX para o Google Sheets.</p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          <div className="lg:col-span-1 flex flex-col gap-6">
             <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h2 className="text-lg font-medium text-gray-800 mb-4">Status</h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Automação</span>
                  <span className={`font-semibold ${isAutomationRunning ? 'text-green-600' : 'text-red-600'}`}>
                    {isAutomationRunning ? 'Ativa' : 'Pausada'}
                  </span>
                </div>
                 {isAutomationRunning && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Frequência</span>
                    <span className="font-semibold text-gray-800">
                      A cada {intervalValue} {intervalUnit === 'minutes' ? `minuto${intervalValue > 1 ? 's' : ''}` : `hora${intervalValue > 1 ? 's' : ''}`}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Última Sincronização</span>
                  <span className="font-semibold">
                    {lastSyncTime ? lastSyncTime.toLocaleString() : 'Nenhuma'}
                  </span>
                </div>
                 {isAutomationRunning && nextSyncTime && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Próxima Sincronização</span>
                    <span className="font-semibold text-gray-800">
                      {nextSyncTime.toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h2 className="text-lg font-medium text-gray-800 mb-4">Controles de Automação</h2>
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2">
                    <input 
                        type="number" 
                        value={intervalValue === 0 ? '' : intervalValue} 
                        onChange={handleIntervalChange} 
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50" 
                        min="1" 
                        placeholder="Ex: 10"
                    />
                    <select 
                        value={intervalUnit} 
                        onChange={(e) => setIntervalUnit(e.target.value)} 
                        className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                    >
                        <option value="minutes">Minutos</option>
                        <option value="hours">Horas</option>
                    </select>
                </div>
                
                {feedbackMessage && (
                    <p className={`text-sm font-medium text-center ${feedbackMessage.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                        {feedbackMessage.text}
                    </p>
                )}

                <button 
                  onClick={isAutomationRunning ? handlePauseAutomation : handleStartAutomation}
                  disabled={isLoadingSheets}
                  className={`w-full px-4 py-2 font-semibold text-white rounded-md transition-colors duration-200 ${isAutomationRunning ? 'bg-red-500 hover:bg-red-600' : 'bg-primary hover:bg-primary/90'} disabled:opacity-50`}>
                  {isAutomationRunning ? 'Pausar Automação' : 'Iniciar Automação'}
                </button>
                <button 
                  onClick={handleSyncToSheets}
                  disabled={isLoadingSheets}
                  className="w-full px-4 py-2 font-semibold text-white bg-accent hover:bg-accent/90 rounded-md transition-colors duration-200 disabled:opacity-50">
                  {isLoadingSheets ? 'Sincronizando...' : 'Forçar Sincronização'}
                </button>
                 <button 
                  onClick={handleDownloadCsv}
                  disabled={isLoadingCsv || isLoadingSheets}
                  className="w-full px-4 py-2 font-semibold text-gray-800 bg-gray-200 hover:bg-gray-300 rounded-md transition-colors duration-200 disabled:opacity-50">
                  {isLoadingCsv ? 'Gerando...' : 'Baixar CSV'}
                </button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h2 className="text-lg font-medium text-gray-800 mb-4">Histórico de Execuções</h2>
              <div className="overflow-x-auto border border-gray-200 rounded-md">
                {syncHistory.length === 0 ? (
                  <p className="text-center text-gray-500 py-10">Nenhuma execução registrada.</p>
                ) : (
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Cliente</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Novos Pedidos</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Detalhes</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Horário</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {syncHistory.flatMap(entry => 
                        entry.results.map((result, index) => (
                          <tr key={`${new Date(entry.timestamp).toISOString()}-${result.clientName}`}>
                            <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{result.clientName}</td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm">
                              <span className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${result.status === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                {result.status === 'success' ? 'Sucesso' : 'Falha'}
                              </span>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700 font-semibold text-center">{result.newOrdersAdded}</td>
                            <td className="px-4 py-4 whitespace-normal text-xs text-red-600 max-w-xs break-words">{result.error || '-'}</td>
                            {index === 0 && (
                              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 align-top" rowSpan={entry.results.length}>
                                {new Date(entry.timestamp).toLocaleTimeString()}
                              </td>
                            )}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
