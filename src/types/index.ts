// Database types supported for source data
export type DatabaseType = 'mysql' | 'mongodb' | 'postgresql' | 'sqlite' | 'oracle';

// Encoding algorithm types
export type EncodingAlgorithm = 'caesar' | 'digit_reversal' | 'position_shift' | 'custom_mapping' | 'custom';

// Configuration for database connection
export interface DatabaseConfig {
  type: DatabaseType;
  connectionString: string;
  tableName: string;
  credentials?: {
    username?: string;
    password?: string;
    host?: string;
    port?: number;
    database?: string;
  };
}

// Firestore configuration
export interface FirestoreConfig {
  collectionName: string;
  customToken: string;
  projectId?: string;
}

// Encoding formula configuration
export interface EncodingFormula {
  id: string;
  name: string;
  algorithm: EncodingAlgorithm;
  parameters: {
    shiftValue?: number;
    customMapping?: Record<string, string>;
    digitShufflePattern?: number[];
    reverseOrder?: boolean;
    customFunction?: string;
  };
  createdAt: Date;
  description?: string;
}

// Column mapping configuration
export interface ColumnMapping {
  sourceColumn: string;
  destinationField: string;
  shouldEncode: boolean;
  dataType: 'string' | 'number' | 'date' | 'boolean';
}

// Main application configuration
export interface AppConfiguration {
  id: string;
  name: string;
  sourceDatabase: DatabaseConfig;
  destinationFirestore: FirestoreConfig;
  encodingFormula: EncodingFormula;
  columnMappings: ColumnMapping[];
  processingInterval: number; // in seconds
  batchSize: number;
  timestampColumn: string;
  isActive: boolean;
  createdAt: Date;
  lastModified: Date;
}

// Processing status and statistics
export interface ProcessingStats {
  totalProcessed: number;
  successfulProcessed: number;
  failedProcessed: number;
  lastProcessedTimestamp: Date | null;
  currentBatchStartTime: Date | null;
  isProcessing: boolean;
  consecutiveFailures: number;
}

// Failed row information
export interface FailedRow {
  id: string;
  sourceData: Record<string, any>;
  error: string;
  timestamp: Date;
  retryCount: number;
  maxRetries: number;
}

// Table/Collection information for views
export interface TableInfo {
  name: string;
  rowCount: number;
  lastUpdated: Date | null;
  columns: string[];
  sampleData: Record<string, any>[];
}

// Decoding request configuration
export interface DecodingRequest {
  collectionName: string;
  fieldToDecodeColumn: string;
  encodingFormulaId: string;
  customToken: string;
  outputFileName?: string;
}

// Authentication configuration
export interface AuthConfig {
  passkey: string;
  lastChanged: Date;
}

// Configuration history entry
export interface ConfigurationHistory {
  id: string;
  configuration: AppConfiguration;
  timestamp: Date;
  changeDescription: string;
}

// Processing context state
export interface ProcessingState {
  isRunning: boolean;
  stats: ProcessingStats;
  failedRows: FailedRow[];
  lastError: string | null;
  alerts: ProcessingAlert[];
}

// Alert types for processing issues
export interface ProcessingAlert {
  id: string;
  type: 'error' | 'warning' | 'info';
  message: string;
  timestamp: Date;
  persistent: boolean;
  acknowledged: boolean;
}

// Validation result for configuration
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// Database connection test result
export interface ConnectionTestResult {
  success: boolean;
  message: string;
  tableExists?: boolean;
  columnsFound?: string[];
}

// Export types for CSV download
export interface ExportConfig {
  includeHeaders: boolean;
  dateFormat: string;
  delimiter: string;
  encoding: string;
}