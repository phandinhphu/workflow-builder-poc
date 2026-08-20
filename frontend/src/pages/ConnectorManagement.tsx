import { useState, useEffect } from 'react';
import { useConnectorStore, useCredentialStore } from '../stores';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

export default function ConnectorManagementPage() {
  const {
    connectors, loading, error, loadConnectors,
  } = useConnectorStore();

  const {
    credentials, loading: credLoading, loadCredentials,
    testCredential,
  } = useCredentialStore();

  const [selectedConnector, setSelectedConnector] = useState<any>(null);
  const [testResult, setTestResult] = useState<{ id: string; success: boolean; message: string } | null>(null);

  useEffect(() => {
    loadConnectors();
    loadCredentials();
  }, []);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Connector & API Management</h1>
          <p className="text-sm text-gray-500 mt-1">Quản lý connectors, actions và credentials</p>
        </div>
      </div>

      {loading && (
        <div className="flex items-center gap-2 p-4 bg-blue-50 rounded-lg">
          <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
          <span className="text-sm text-blue-700">Loading connectors...</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 rounded-lg text-red-700 text-sm">{error}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {connectors.map((conn: any) => (
          <div
            key={conn.id}
            className={`border rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${
              selectedConnector?.id === conn.id ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'
            }`}
            onClick={() => setSelectedConnector(conn)}
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">{conn.name}</h3>
                <p className="text-xs text-gray-500 mt-1">{conn.description}</p>
              </div>
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                conn.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
              }`}>
                {conn.enabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
              <span className="px-2 py-0.5 bg-gray-100 rounded">{conn.type}</span>
              <span>{conn.actions?.length || 0} actions</span>
            </div>
          </div>
        ))}
      </div>

      {selectedConnector && (
        <div className="border rounded-lg p-6 bg-gray-50 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">{selectedConnector.name}</h2>
            <button onClick={() => setSelectedConnector(null)} className="text-gray-400 hover:text-gray-600">Close</button>
          </div>
          <p className="text-sm text-gray-600 mb-4">{selectedConnector.description}</p>

          <h3 className="font-semibold mb-2">Actions ({selectedConnector.actions?.length || 0})</h3>
          <div className="space-y-2">
            {selectedConnector.actions?.map((action: any) => (
              <div key={action.id} className="bg-white border rounded p-3 flex items-center justify-between">
                <div>
                  <span className="font-medium text-sm">{action.name}</span>
                  <span className="ml-2 px-2 py-0.5 bg-gray-100 rounded text-xs">{action.actionKey}</span>
                  <span className={`ml-2 px-2 py-0.5 rounded text-xs ${
                    action.sideEffects === 'READ_ONLY' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
                  }`}>
                    {action.sideEffects}
                  </span>
                </div>
                <div className="flex gap-1">
                  {action.retryable && <span className="text-xs text-green-600">Retryable</span>}
                  {action.idempotent && <span className="text-xs text-blue-600">Idempotent</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Credentials</h2>
        </div>

        {credLoading && (
          <div className="flex items-center gap-2 p-3 bg-blue-50 rounded text-sm text-blue-700">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading credentials...
          </div>
        )}

        <div className="space-y-2">
          {credentials.map((cred: any) => (
            <div key={cred.id} className="border rounded p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  cred.type === 'API_KEY' ? 'bg-yellow-100 text-yellow-600'
                  : cred.type === 'BASIC_AUTH' ? 'bg-blue-100 text-blue-600'
                  : 'bg-green-100 text-green-600'
                }`}>
                  {cred.type === 'API_KEY' ? 'K' : cred.type === 'BASIC_AUTH' ? 'B' : 'O'}
                </div>
                <div>
                  <h4 className="font-medium text-sm">{cred.name}</h4>
                  <p className="text-xs text-gray-500">{cred.type} | {cred.scope}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    const result = await testCredential(cred.id);
                    setTestResult({ id: cred.id, ...result });
                    setTimeout(() => setTestResult(null), 3000);
                  }}
                  className="px-3 py-1 border rounded text-xs hover:bg-gray-50"
                >
                  Test
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {testResult && (
        <div className={`fixed bottom-4 right-4 p-4 rounded-lg shadow-lg text-sm ${
          testResult.success ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {testResult.success ? <CheckCircle className="w-4 h-4 inline mr-2" /> : <XCircle className="w-4 h-4 inline mr-2" />}
          {testResult.message}
        </div>
      )}
    </div>
  );
}
