import React, { useState, useEffect } from 'react';
import { Settings, Database, Eye, Unlock, Save, Download, AlertTriangle, CheckCircle, XCircle, Play, Pause } from 'lucide-react';

// Types 
interface EncodingFormula {
  id: string;
  name: string;
  type: 'caesar' | 'reverse' | 'position' | 'custom';
  parameters: Record<string, any>;
  createdAt: string;
}

interface DatabaseConfig {
  type: 'mysql' | 'mongodb' | 'postgresql' | 'sqlite';
  connectionString: string;
  tableName: string;
}

interface FirestoreConfig {
  customToken: string;
  collectionName: string;
}

interface ColumnMapping {
  source: string;
  destination: string;
  encode: boolean;
}

interface Configuration {
  id: string;
  sourceDb: DatabaseConfig;
  destFirestore: FirestoreConfig;
  encodingFormulaId: string;
  columnMappings: ColumnMapping[];
  processingInterval: number;
  timestampColumn: string;
  createdAt: string;
}

interface FailedRow {
  id: string;
  data: Record<string, any>;
  error: string;
  attempts: number;
  lastAttempt: string;
}

interface TableStats {
  count: number;
  first10: Record<string, any>[];
  last10: Record<string, any>[];
}

// Encoding algorithms
const encodingAlgorithms = {
  caesar: (value: string, shift: number) => {
    return value.split('').map(char => {
      if (/[a-zA-Z]/.test(char)) {
        const base = char <= 'Z' ? 65 : 97;
        return String.fromCharCode(((char.charCodeAt(0) - base + shift) % 26) + base);
      } else if (/[0-9]/.test(char)) {
        return String.fromCharCode(((char.charCodeAt(0) - 48 + shift) % 10) + 48);
      }
      return char;
    }).join('');
  },
  reverse: (value: string) => {
    return value.split('').reverse().join('');
  },
  position: (value: string, positions: number[]) => {
    const chars = value.split('');
    return positions.map(pos => chars[pos] || '').join('');
  },
  custom: (value: string, mapping: Record<string, string>) => {
    return value.split('').map(char => mapping[char] || char).join('');
  }
};

// Decoding algorithms (reverse of encoding)
const decodingAlgorithms = {
  caesar: (value: string, shift: number) => encodingAlgorithms.caesar(value, -shift),
  reverse: (value: string) => encodingAlgorithms.reverse(value),
  position: (value: string, positions: number[]) => {
    const chars = value.split('');
    const result = new Array(positions.length);
    positions.forEach((pos, i) => {
      result[pos] = chars[i];
    });
    return result.join('');
  },
  custom: (value: string, mapping: Record<string, string>) => {
    const reverseMapping = Object.fromEntries(
      Object.entries(mapping).map(([k, v]) => [v, k])
    );
    return value.split('').map(char => reverseMapping[char] || char).join('');
  }
};

// Main App Component
const EncoderDecoderApp: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentPage, setCurrentPage] = useState<'config' | 'dashboard' | 'decode'>('config');
  const [passkey, setPasskey] = useState('');
  const [storedPasskey, setStoredPasskey] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Configuration state
  const [configuration, setConfiguration] = useState<Configuration | null>(null);
  const [encodingFormulas, setEncodingFormulas] = useState<EncodingFormula[]>([]);
  const [configHistory, setConfigHistory] = useState<Configuration[]>([]);
  const [columnMappings, setColumnMappings] = useState<ColumnMapping[]>([
    { source: 'account_no', destination: 'accountNo', encode: true },
    { source: 'timestamp', destination: 'timestamp', encode: false },
    { source: 'amount', destination: 'amount', encode: false }
  ]);
  
  // Processing state
  const [lastProcessedTimestamp, setLastProcessedTimestamp] = useState<string>('');
  const [failedRows, setFailedRows] = useState<FailedRow[]>([]);
  const [processingStats, setProcessingStats] = useState({ processed: 0, failed: 0 });
  
  // Table data
  const [sourceTableStats, setSourceTableStats] = useState<TableStats | null>(null);
  const [destTableStats, setDestTableStats] = useState<TableStats | null>(null);

  // Load data from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('encoderApp');
    if (stored) {
      const data = JSON.parse(stored);
      setStoredPasskey(data.passkey || '');
      setConfiguration(data.configuration || null);
      setEncodingFormulas(data.encodingFormulas || getDefaultFormulas());
      setConfigHistory(data.configHistory || []);
      setFailedRows(data.failedRows || []);
      setLastProcessedTimestamp(data.lastProcessedTimestamp || '');
    } else {
      // Initialize with default formulas if no stored data
      setEncodingFormulas(getDefaultFormulas());
    }
  }, []);

  // Default encoding formulas
  const getDefaultFormulas = (): EncodingFormula[] => [
    {
      id: 'caesar-3',
      name: 'Caesar Cipher (Shift 3)',
      type: 'caesar',
      parameters: { shift: 3 },
      createdAt: new Date().toISOString()
    },
    {
      id: 'caesar-5',
      name: 'Caesar Cipher (Shift 5)',
      type: 'caesar',
      parameters: { shift: 5 },
      createdAt: new Date().toISOString()
    },
    {
      id: 'reverse-basic',
      name: 'Simple Reverse',
      type: 'reverse',
      parameters: {},
      createdAt: new Date().toISOString()
    },
    {
      id: 'position-shuffle',
      name: 'Position Shuffle',
      type: 'position',
      parameters: { positions: [3, 1, 4, 0, 2] },
      createdAt: new Date().toISOString()
    }
  ];

  // Column mapping functions
  const addColumnMapping = () => {
    const newMapping: ColumnMapping = {
      source: '',
      destination: '',
      encode: false
    };
    setColumnMappings([...columnMappings, newMapping]);
  };

  const updateColumnMapping = (index: number, field: keyof ColumnMapping, value: any) => {
    const updated = [...columnMappings];
    updated[index] = { ...updated[index], [field]: value };
    setColumnMappings(updated);
  };

  const removeColumnMapping = (index: number) => {
    setColumnMappings(columnMappings.filter((_, i) => i !== index));
  };
  const createEncodingFormula = (name: string, type: EncodingFormula['type'], parameters: Record<string, any>) => {
    const newFormula: EncodingFormula = {
      id: `${type}-${Date.now()}`,
      name,
      type,
      parameters,
      createdAt: new Date().toISOString()
    };
    
    const updatedFormulas = [...encodingFormulas, newFormula];
    setEncodingFormulas(updatedFormulas);
    saveToStorage({ encodingFormulas: updatedFormulas });
    return newFormula.id;
  };

  // Save data to localStorage
  const saveToStorage = (data: any) => {
    const current = JSON.parse(localStorage.getItem('encoderApp') || '{}');
    const updated = { ...current, ...data };
    localStorage.setItem('encoderApp', JSON.stringify(updated));
  };

  // Authentication
  const handleLogin = (inputPasskey: string) => {
    if (!storedPasskey) {
      setStoredPasskey(inputPasskey);
      saveToStorage({ passkey: inputPasskey });
      setIsAuthenticated(true);
    } else if (inputPasskey === storedPasskey) {
      setIsAuthenticated(true);
    } else {
      alert('Invalid passkey');
    }
  };

  const changePasskey = (newPasskey: string) => {
    setStoredPasskey(newPasskey);
    saveToStorage({ passkey: newPasskey });
    alert('Passkey changed successfully');
  };

  // Processing logic
  const startProcessing = async () => {
    if (!configuration) return;
    
    setIsProcessing(true);
    
    const processInterval = setInterval(async () => {
      try {
        await processBatch();
      } catch (error) {
        console.error('Processing error:', error);
      }
    }, configuration.processingInterval * 1000);

    return () => clearInterval(processInterval);
  };

  const processBatch = async () => {
    if (!configuration) return;

    try {
      // Simulate fetching new rows from source database
      const newRows = await fetchNewRows();
      
      for (const row of newRows) {
        try {
          const encodedRow = await encodeRow(row);
          await saveToFirestore(encodedRow);
          setProcessingStats(prev => ({ ...prev, processed: prev.processed + 1 }));
        } catch (error) {
          handleRowFailure(row, error as Error);
        }
      }
      
      setLastProcessedTimestamp(new Date().toISOString());
      saveToStorage({ lastProcessedTimestamp: new Date().toISOString() });
    } catch (error) {
      console.error('Batch processing error:', error);
    }
  };

  const fetchNewRows = async (): Promise<Record<string, any>[]> => {
    // Simulate API call to source database
    // In real implementation, this would query the database for rows newer than lastProcessedTimestamp
    return [];
  };

  const encodeRow = async (row: Record<string, any>): Promise<Record<string, any>> => {
    if (!configuration) throw new Error('No configuration');
    
    const formula = encodingFormulas.find(f => f.id === configuration.encodingFormulaId);
    if (!formula) throw new Error('Encoding formula not found');

    const encodedRow: Record<string, any> = {};
    
    configuration.columnMappings.forEach(mapping => {
      const value = row[mapping.source];
      if (mapping.encode && value) {
        encodedRow[mapping.destination] = applyEncoding(value, formula);
      } else {
        encodedRow[mapping.destination] = value;
      }
    });

    return encodedRow;
  };

  const applyEncoding = (value: string, formula: EncodingFormula): string => {
    switch (formula.type) {
      case 'caesar':
        return encodingAlgorithms.caesar(value, formula.parameters.shift);
      case 'reverse':
        return encodingAlgorithms.reverse(value);
      case 'position':
        return encodingAlgorithms.position(value, formula.parameters.positions);
      case 'custom':
        return encodingAlgorithms.custom(value, formula.parameters.mapping);
      default:
        return value;
    }
  };

  const saveToFirestore = async (row: Record<string, any>): Promise<void> => {
    // Simulate Firestore save with custom token
    // In real implementation, this would use Firebase SDK with custom token
    console.log('Saving to Firestore:', row);
  };

  const handleRowFailure = (row: Record<string, any>, error: Error) => {
    const existing = failedRows.find(f => f.id === row.id);
    if (existing) {
      existing.attempts += 1;
      existing.lastAttempt = new Date().toISOString();
      existing.error = error.message;
      
      if (existing.attempts >= 5) {
        alert(`Row ${row.id} failed 5 times. Skipping further attempts.`);
      }
    } else {
      const newFailedRow: FailedRow = {
        id: row.id,
        data: row,
        error: error.message,
        attempts: 1,
        lastAttempt: new Date().toISOString()
      };
      setFailedRows(prev => [...prev, newFailedRow]);
    }
    
    setProcessingStats(prev => ({ ...prev, failed: prev.failed + 1 }));
    saveToStorage({ failedRows });
  };

  // Components
  const LoginPage = () => (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md w-96">
        <div className="flex items-center mb-6">
          <Unlock className="w-8 h-8 text-blue-600 mr-2" />
          <h1 className="text-2xl font-bold">Welcome to VIGIL</h1>
        </div>
        <div className="space-y-4">
          <input
            type="password"
            value={passkey}
            onChange={(e) => setPasskey(e.target.value)}
            placeholder="Enter passkey"
            className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={() => handleLogin(passkey)}
            className="w-full bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700"
          >
            {storedPasskey ? 'Login' : 'Set Passkey'}
          </button>
        </div>
      </div>
    </div>
  );

  const ConfigurationPage = () => (
    <div className="p-6 space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">Database Configuration</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Source Database Type</label>
            <select className="w-full p-2 border rounded-lg">
              <option value="mysql">MySQL</option>
              <option value="mongodb">MongoDB</option>
              <option value="postgresql">PostgreSQL</option>
              <option value="sqlite">SQLite</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Connection String</label>
            <input
              type="text"
              placeholder="Database connection string"
              className="w-full p-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Table Name</label>
            <input
              type="text"
              placeholder="tableL"
              className="w-full p-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Timestamp Column</label>
            <input
              type="text"
              placeholder="timestamp"
              className="w-full p-2 border rounded-lg"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">Firestore Configuration</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Custom Token</label>
            <input
              type="text"
              placeholder="Firebase custom token"
              className="w-full p-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Collection Name</label>
            <input
              type="text"
              placeholder="tableD"
              className="w-full p-2 border rounded-lg"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">Encoding Configuration</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Processing Interval (seconds)</label>
            <input
              type="number"
              defaultValue={120}
              min={1}
              className="w-full p-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Encoding Formula</label>
            <select className="w-full p-2 border rounded-lg">
              <option value="">Select encoding formula</option>
              {encodingFormulas.map(formula => (
                <option key={formula.id} value={formula.id}>
                  {formula.name} ({formula.type})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">Create Custom Formula</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Formula Name</label>
            <input
              type="text"
              placeholder="My Custom Formula"
              className="w-full p-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Formula Type</label>
            <select className="w-full p-2 border rounded-lg">
              <option value="caesar">Caesar Cipher</option>
              <option value="reverse">Reverse</option>
              <option value="position">Position Shuffle</option>
              <option value="custom">Custom Mapping</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Shift Value (Caesar)</label>
            <input
              type="number"
              placeholder="3"
              className="w-full p-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Position Array (Position)</label>
            <input
              type="text"
              placeholder="3,1,4,0,2"
              className="w-full p-2 border rounded-lg"
            />
          </div>
        </div>
        <button className="mt-4 bg-purple-600 text-white px-4 py-2 rounded-lg">
          Create Formula
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">Column Mapping</h2>
        <div className="space-y-2">
          <div className="grid grid-cols-4 gap-2 font-medium">
            <span>Source Column</span>
            <span>Destination Field</span>
            <span>Encode</span>
            <span>Actions</span>
          </div>
          {columnMappings.map((mapping, index) => (
            <div key={index} className="grid grid-cols-4 gap-2">
              <input 
                type="text" 
                value={mapping.source}
                onChange={(e) => updateColumnMapping(index, 'source', e.target.value)}
                placeholder="source_column" 
                className="p-2 border rounded" 
              />
              <input 
                type="text" 
                value={mapping.destination}
                onChange={(e) => updateColumnMapping(index, 'destination', e.target.value)}
                placeholder="destinationField" 
                className="p-2 border rounded" 
              />
              <input 
                type="checkbox" 
                checked={mapping.encode}
                onChange={(e) => updateColumnMapping(index, 'encode', e.target.checked)}
                className="p-2" 
              />
              <button 
                onClick={() => removeColumnMapping(index)}
                className="bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
        <button 
          onClick={addColumnMapping}
          className="mt-4 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          Add Mapping
        </button>
      </div>

      <div className="flex space-x-4">
        <button className="bg-blue-600 text-white px-6 py-2 rounded-lg flex items-center">
          <Save className="w-4 h-4 mr-2" />
          Save Configuration
        </button>
        <button className="bg-gray-600 text-white px-6 py-2 rounded-lg">
          Test Connection
        </button>
      </div>
    </div>
  );

  const DashboardPage = () => (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Processing Status</h3>
            {isProcessing ? (
              <div className="flex items-center text-green-600">
                <Play className="w-4 h-4 mr-1" />
                Running
              </div>
            ) : (
              <div className="flex items-center text-gray-600">
                <Pause className="w-4 h-4 mr-1" />
                Stopped
              </div>
            )}
          </div>
          <div className="mt-4 space-y-2">
            <div className="flex justify-between">
              <span>Processed:</span>
              <span className="font-medium">{processingStats.processed}</span>
            </div>
            <div className="flex justify-between">
              <span>Failed:</span>
              <span className="font-medium text-red-600">{processingStats.failed}</span>
            </div>
          </div>
          <button
            onClick={isProcessing ? () => setIsProcessing(false) : startProcessing}
            className={`w-full mt-4 px-4 py-2 rounded-lg ${
              isProcessing ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'
            } text-white`}
          >
            {isProcessing ? 'Stop Processing' : 'Start Processing'}
          </button>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Source Table (tableL)</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Total Rows:</span>
              <span className="font-medium">{sourceTableStats?.count || 0}</span>
            </div>
            <div className="text-sm text-gray-600">
              Last updated: {lastProcessedTimestamp || 'Never'}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Destination Collection</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Total Documents:</span>
              <span className="font-medium">{destTableStats?.count || 0}</span>
            </div>
            <div className="text-sm text-gray-600">
              Collection: {configuration?.destFirestore.collectionName || 'Not set'}
            </div>
          </div>
        </div>
      </div>

      {failedRows.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
            <h3 className="text-lg font-semibold">Failed Rows ({failedRows.length})</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Row ID</th>
                  <th className="text-left p-2">Error</th>
                  <th className="text-left p-2">Attempts</th>
                  <th className="text-left p-2">Last Attempt</th>
                </tr>
              </thead>
              <tbody>
                {failedRows.slice(0, 10).map(row => (
                  <tr key={row.id} className="border-b">
                    <td className="p-2">{row.id}</td>
                    <td className="p-2 text-red-600">{row.error}</td>
                    <td className="p-2">{row.attempts}</td>
                    <td className="p-2">{new Date(row.lastAttempt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Configuration History</h3>
        <div className="space-y-2">
          {configHistory.slice(0, 5).map(config => (
            <div key={config.id} className="flex justify-between items-center p-2 border rounded">
              <span className="text-sm">
                {config.sourceDb.tableName} → {config.destFirestore.collectionName}
              </span>
              <span className="text-xs text-gray-500">
                {new Date(config.createdAt).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
        <button className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center">
          <Download className="w-4 h-4 mr-2" />
          Download History
        </button>
      </div>
    </div>
  );

  const DecodePage = () => (
    <div className="p-6 space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">Decode Configuration</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Collection Name</label>
            <input
              type="text"
              placeholder="Collection to decode"
              className="w-full p-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Field to Decode</label>
            <input
              type="text"
              placeholder="accountNo"
              className="w-full p-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Custom Token</label>
            <input
              type="text"
              placeholder="Firebase custom token"
              className="w-full p-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Encoding Formula</label>
            <select className="w-full p-2 border rounded-lg">
              <option value="">Select formula</option>
              {encodingFormulas.map(formula => (
                <option key={formula.id} value={formula.id}>
                  {formula.name} ({formula.type})
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-6 flex space-x-4">
          <button className="bg-blue-600 text-white px-6 py-2 rounded-lg">
            Preview Decode
          </button>
          <button className="bg-green-600 text-white px-6 py-2 rounded-lg flex items-center">
            <Download className="w-4 h-4 mr-2" />
            Download CSV
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Upload CSV for Decoding</h3>
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
          <input
            type="file"
            accept=".csv"
            className="hidden"
            id="csvUpload"
          />
          <label
            htmlFor="csvUpload"
            className="cursor-pointer flex flex-col items-center"
          >
            <Database className="w-12 h-12 text-gray-400 mb-2" />
            <span className="text-gray-600">Click to upload CSV file</span>
          </label>
        </div>
      </div>
    </div>
  );

  const Navigation = () => (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-4">
            <Database className="w-8 h-8 text-blue-600" />
            <h1 className="text-xl font-bold">VIGIL Encoder-Decoder</h1>
          </div>
          <div className="flex space-x-4">
            <button
              onClick={() => setCurrentPage('config')}
              className={`px-4 py-2 rounded-lg flex items-center ${
                currentPage === 'config' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Settings className="w-4 h-4 mr-2" />
              Configuration
            </button>
            <button
              onClick={() => setCurrentPage('dashboard')}
              className={`px-4 py-2 rounded-lg flex items-center ${
                currentPage === 'dashboard' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Eye className="w-4 h-4 mr-2" />
              Dashboard
            </button>
            <button
              onClick={() => setCurrentPage('decode')}
              className={`px-4 py-2 rounded-lg flex items-center ${
                currentPage === 'decode' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Unlock className="w-4 h-4 mr-2" />
              Decode
            </button>
            <button
              onClick={() => setIsAuthenticated(false)}
              className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <main className="max-w-7xl mx-auto">
        {currentPage === 'config' && <ConfigurationPage />}
        {currentPage === 'dashboard' && <DashboardPage />}
        {currentPage === 'decode' && <DecodePage />}
      </main>
    </div>
  );
};

export default EncoderDecoderApp;