import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  AppConfiguration, 
  ConfigurationHistory, 
  EncodingFormula, 
  ValidationResult,
  ConnectionTestResult,
  DatabaseType,
  EncodingAlgorithm 
} from '../types';

// Context interface defining all configuration-related operations
interface ConfigurationContextType {
  currentConfig: AppConfiguration | null;
  configHistory: ConfigurationHistory[];
  savedFormulas: EncodingFormula[];
  isLoading: boolean;
  
  // Configuration management functions
  saveConfiguration: (config: AppConfiguration) => Promise<void>;
  loadConfiguration: (configId: string) => Promise<AppConfiguration | null>;
  validateConfiguration: (config: AppConfiguration) => Promise<ValidationResult>;
  testDatabaseConnection: (config: any) => Promise<ConnectionTestResult>;
  
  // Encoding formula management
  saveEncodingFormula: (formula: EncodingFormula) => void;
  deleteEncodingFormula: (formulaId: string) => void;
  getEncodingFormula: (formulaId: string) => EncodingFormula | null;
  
  // History management
  getConfigurationHistory: () => ConfigurationHistory[];
  downloadConfigurationHistory: () => void;
  
  // Utility functions
  generateConfigurationId: () => string;
  resetConfiguration: () => void;
}

const ConfigurationContext = createContext<ConfigurationContextType | undefined>(undefined);

// Custom hook to use configuration context with proper error handling
export const useConfiguration = () => {
  const context = useContext(ConfigurationContext);
  if (context === undefined) {
    throw new Error('useConfiguration must be used within a ConfigurationProvider');
  }
  return context;
};

interface ConfigurationProviderProps {
  children: ReactNode;
}

export const ConfigurationProvider: React.FC<ConfigurationProviderProps> = ({ children }) => {
  const [currentConfig, setCurrentConfig] = useState<AppConfiguration | null>(null);
  const [configHistory, setConfigHistory] = useState<ConfigurationHistory[]>([]);
  const [savedFormulas, setSavedFormulas] = useState<EncodingFormula[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load saved data from localStorage on component mount
  useEffect(() => {
    loadSavedData();
  }, []);

  // Load all saved configurations, formulas, and history from localStorage
  const loadSavedData = () => {
    try {
      // Load current configuration
      const savedConfig = localStorage.getItem('encoder_current_config');
      if (savedConfig) {
        const parsedConfig = JSON.parse(savedConfig);
        // Convert date strings back to Date objects
        parsedConfig.createdAt = new Date(parsedConfig.createdAt);
        parsedConfig.lastModified = new Date(parsedConfig.lastModified);
        setCurrentConfig(parsedConfig);
      }

      // Load configuration history (limit to last 10 entries)
      const savedHistory = localStorage.getItem('encoder_config_history');
      if (savedHistory) {
        const parsedHistory: ConfigurationHistory[] = JSON.parse(savedHistory);
        // Convert timestamp strings back to Date objects
        const processedHistory = parsedHistory.map(entry => ({
          ...entry,
          timestamp: new Date(entry.timestamp),
          configuration: {
            ...entry.configuration,
            createdAt: new Date(entry.configuration.createdAt),
            lastModified: new Date(entry.configuration.lastModified)
          }
        }));
        setConfigHistory(processedHistory.slice(-10)); // Keep only last 10
      }

      // Load saved encoding formulas
      const savedFormulasData = localStorage.getItem('encoder_saved_formulas');
      if (savedFormulasData) {
        const parsedFormulas: EncodingFormula[] = JSON.parse(savedFormulasData);
        // Convert date strings back to Date objects
        const processedFormulas = parsedFormulas.map(formula => ({
          ...formula,
          createdAt: new Date(formula.createdAt)
        }));
        setSavedFormulas(processedFormulas);
      } else {
        // Initialize with built-in encoding algorithms if no saved formulas exist
        initializeBuiltInFormulas();
      }
    } catch (error) {
      console.error('Error loading saved data:', error);
      // Initialize with built-in formulas as fallback
      initializeBuiltInFormulas();
    }
  };

  // Initialize built-in encoding formulas that come pre-configured with the app
  const initializeBuiltInFormulas = () => {
    const builtInFormulas: EncodingFormula[] = [
      {
        id: 'caesar_shift_3',
        name: 'Caesar Cipher (Shift by 3)',
        algorithm: 'caesar',
        parameters: { shiftValue: 3 },
        createdAt: new Date(),
        description: 'Shifts each character by 3 positions in the alphabet'
      },
      {
        id: 'caesar_shift_5',
        name: 'Caesar Cipher (Shift by 5)',
        algorithm: 'caesar',
        parameters: { shiftValue: 5 },
        createdAt: new Date(),
        description: 'Shifts each character by 5 positions in the alphabet'
      },
      {
        id: 'digit_reversal',
        name: 'Digit Reversal',
        algorithm: 'digit_reversal',
        parameters: { reverseOrder: true },
        createdAt: new Date(),
        description: 'Reverses the order of all digits in the account number'
      },
      {
        id: 'position_shift_2',
        name: 'Position Shift (2 places)',
        algorithm: 'position_shift',
        parameters: { shiftValue: 2 },
        createdAt: new Date(),
        description: 'Shifts each digit 2 positions forward cyclically'
      }
    ];
    
    setSavedFormulas(builtInFormulas);
    localStorage.setItem('encoder_saved_formulas', JSON.stringify(builtInFormulas));
  };

  // Save configuration with validation and history tracking
  const saveConfiguration = async (config: AppConfiguration): Promise<void> => {
    try {
      setIsLoading(true);
      
      // Validate configuration before saving
      const validation = await validateConfiguration(config);
      if (!validation.isValid) {
        throw new Error(`Configuration invalid: ${validation.errors.join(', ')}`);
      }

      // Add timestamps if this is a new configuration
      if (!config.id) {
        config.id = generateConfigurationId();
        config.createdAt = new Date();
      }
      config.lastModified = new Date();

      // Save as current configuration
      setCurrentConfig(config);
      localStorage.setItem('encoder_current_config', JSON.stringify(config));

      // Add to history with change description
      const historyEntry: ConfigurationHistory = {
        id: `history_${Date.now()}`,
        configuration: { ...config },
        timestamp: new Date(),
        changeDescription: currentConfig ? 'Configuration updated' : 'Initial configuration created'
      };

      const updatedHistory = [...configHistory, historyEntry].slice(-10); // Keep only last 10
      setConfigHistory(updatedHistory);
      localStorage.setItem('encoder_config_history', JSON.stringify(updatedHistory));

    } catch (error) {
      console.error('Error saving configuration:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Load a specific configuration by ID from history
  const loadConfiguration = async (configId: string): Promise<AppConfiguration | null> => {
    try {
      const historyEntry = configHistory.find(entry => entry.configuration.id === configId);
      if (historyEntry) {
        setCurrentConfig(historyEntry.configuration);
        return historyEntry.configuration;
      }
      return null;
    } catch (error) {
      console.error('Error loading configuration:', error);
      return null;
    }
  };

  // Comprehensive validation of configuration settings
  const validateConfiguration = async (config: AppConfiguration): Promise<ValidationResult> => {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Validate basic configuration fields
      if (!config.name?.trim()) {
        errors.push('Configuration name is required');
      }

      if (!config.sourceDatabase?.connectionString?.trim()) {
        errors.push('Source database connection string is required');
      }

      if (!config.sourceDatabase?.tableName?.trim()) {
        errors.push('Source table name is required');
      }

      if (!config.destinationFirestore?.collectionName?.trim()) {
        errors.push('Destination collection name is required');
      }

      if (!config.destinationFirestore?.customToken?.trim()) {
        errors.push('Firestore custom token is required');
      }

      if (!config.encodingFormula?.id) {
        errors.push('Encoding formula must be selected');
      }

      if (!config.columnMappings || config.columnMappings.length === 0) {
        errors.push('At least one column mapping is required');
      }

      if (config.processingInterval < 30) {
        warnings.push('Processing interval less than 30 seconds may impact performance');
      }

      // Validate column mappings
      config.columnMappings?.forEach((mapping, index) => {
        if (!mapping.sourceColumn?.trim()) {
          errors.push(`Column mapping ${index + 1}: Source column is required`);
        }
        if (!mapping.destinationField?.trim()) {
          errors.push(`Column mapping ${index + 1}: Destination field is required`);
        }
      });

      // Check if at least one column is marked for encoding
      const hasEncodedColumn = config.columnMappings?.some(mapping => mapping.shouldEncode);
      if (!hasEncodedColumn) {
        warnings.push('No columns are marked for encoding - data will only be copied');
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings
      };

    } catch (error) {
      return {
        isValid: false,
        errors: ['Validation failed due to unexpected error'],
        warnings: []
      };
    }
  };

  // Test database connection with the provided configuration
  const testDatabaseConnection = async (config: any): Promise<ConnectionTestResult> => {
    try {
      // This is a mock implementation - in a real app, you'd make an API call
      // to test the actual database connection
      setIsLoading(true);
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock validation logic based on database type and connection string format
      if (!config.connectionString || !config.tableName) {
        return {
          success: false,
          message: 'Connection string and table name are required'
        };
      }

      // Basic connection string validation based on database type
      const isValidConnectionString = validateConnectionString(config.type, config.connectionString);
      if (!isValidConnectionString) {
        return {
          success: false,
          message: `Invalid connection string format for ${config.type} database`
        };
      }

      // Mock successful connection with sample column information
      return {
        success: true,
        message: 'Connection successful',
        tableExists: true,
        columnsFound: ['account_no', 'timestamp', 'transaction_desc', 'transaction_type', 'amount', 'balance', 'utr']
      };

    } catch (error) {
      return {
        success: false,
        message: `Connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    } finally {
      setIsLoading(false);
    }
  };

  // Validate connection string format based on database type
  const validateConnectionString = (dbType: DatabaseType, connectionString: string): boolean => {
    switch (dbType) {
      case 'mysql':
        return connectionString.includes('mysql://') || connectionString.includes('jdbc:mysql://');
      case 'postgresql':
        return connectionString.includes('postgresql://') || connectionString.includes('postgres://');
      case 'mongodb':
        return connectionString.includes('mongodb://') || connectionString.includes('mongodb+srv://');
      case 'sqlite':
        return connectionString.includes('.db') || connectionString.includes('.sqlite');
      case 'oracle':
        return connectionString.includes('oracle') || connectionString.includes('thin:@');
      default:
        return true; // Allow unknown types for flexibility
    }
  };

  // Save a new encoding formula to the collection
  const saveEncodingFormula = (formula: EncodingFormula) => {
    const updatedFormulas = [...savedFormulas, formula];
    setSavedFormulas(updatedFormulas);
    localStorage.setItem('encoder_saved_formulas', JSON.stringify(updatedFormulas));
  };

  // Delete an encoding formula by ID
  const deleteEncodingFormula = (formulaId: string) => {
    const updatedFormulas = savedFormulas.filter(formula => formula.id !== formulaId);
    setSavedFormulas(updatedFormulas);
    localStorage.setItem('encoder_saved_formulas', JSON.stringify(updatedFormulas));
  };

  // Retrieve a specific encoding formula by ID
  const getEncodingFormula = (formulaId: string): EncodingFormula | null => {
    return savedFormulas.find(formula => formula.id === formulaId) || null;
  };

  // Get configuration history sorted by timestamp (newest first)
  const getConfigurationHistory = (): ConfigurationHistory[] => {
    return [...configHistory].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  };

  // Download configuration history as JSON file
  const downloadConfigurationHistory = () => {
    try {
      const historyData = {
        exportDate: new Date().toISOString(),
        configurations: getConfigurationHistory()
      };
      
      const dataStr = JSON.stringify(historyData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      
      const link = document.createElement('a');
      link.href = URL.createObjectURL(dataBlob);
      link.download = `encoder_config_history_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading configuration history:', error);
    }
  };

  // Generate unique configuration ID
  const generateConfigurationId = (): string => {
    return `config_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  };

  // Reset all configuration data
  const resetConfiguration = () => {
    setCurrentConfig(null);
    localStorage.removeItem('encoder_current_config');
  };

  const contextValue: ConfigurationContextType = {
    currentConfig,
    configHistory,
    savedFormulas,
    isLoading,
    saveConfiguration,
    loadConfiguration,
    validateConfiguration,
    testDatabaseConnection,
    saveEncodingFormula,
    deleteEncodingFormula,
    getEncodingFormula,
    getConfigurationHistory,
    downloadConfigurationHistory,
    generateConfigurationId,
    resetConfiguration
  };

  return (
    <ConfigurationContext.Provider value={contextValue}>
      {children}
    </ConfigurationContext.Provider>
  );
};