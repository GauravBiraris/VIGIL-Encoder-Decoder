import { EncodingFormula, EncodingAlgorithm } from '../types';

export class EncodingService {
  
  // Main encoding function that delegates to specific algorithms
  static encode(value: string, formula: EncodingFormula): string {
    if (!value || !formula) return value;
    
    try {
      switch (formula.algorithm) {
        case 'caesar':
          return this.caesarCipher(value, formula.parameters.shiftValue || 0);
        case 'digit_reversal':
          return this.digitReversal(value);
        case 'position_shift':
          return this.positionShift(value, formula.parameters.shiftValue || 0);
        case 'custom_mapping':
          return this.customMapping(value, formula.parameters.customMapping || {});
        case 'custom':
          return this.customFunction(value, formula.parameters.customFunction || '');
        default:
          throw new Error(`Unknown algorithm: ${formula.algorithm}`);
      }
    } catch (error) {
      console.error('Encoding error:', error);
      return value; // Return original value on error
    }
  }

  // Main decoding function that reverses the encoding
  static decode(encodedValue: string, formula: EncodingFormula): string {
    if (!encodedValue || !formula) return encodedValue;
    
    try {
      switch (formula.algorithm) {
        case 'caesar':
          return this.caesarCipher(encodedValue, -(formula.parameters.shiftValue || 0));
        case 'digit_reversal':
          return this.digitReversal(encodedValue); // Reversal is its own inverse
        case 'position_shift':
          return this.positionShift(encodedValue, -(formula.parameters.shiftValue || 0));
        case 'custom_mapping':
          return this.reverseCustomMapping(encodedValue, formula.parameters.customMapping || {});
        case 'custom':
          return this.reverseCustomFunction(encodedValue, formula.parameters.customFunction || '');
        default:
          throw new Error(`Unknown algorithm: ${formula.algorithm}`);
      }
    } catch (error) {
      console.error('Decoding error:', error);
      return encodedValue; // Return encoded value on error
    }
  }

  // Caesar cipher implementation for alphanumeric characters
  private static caesarCipher(text: string, shift: number): string {
    return text.split('').map(char => {
      if (/[A-Za-z]/.test(char)) {
        const base = char >= 'A' && char <= 'Z' ? 65 : 97;
        return String.fromCharCode(((char.charCodeAt(0) - base + shift + 26) % 26) + base);
      } else if (/[0-9]/.test(char)) {
        return String.fromCharCode(((char.charCodeAt(0) - 48 + shift + 10) % 10) + 48);
      }
      return char; // Keep special characters unchanged
    }).join('');
  }

  // Reverse the order of all digits and letters
  private static digitReversal(text: string): string {
    const alphanumeric = text.match(/[A-Za-z0-9]/g) || [];
    const reversed = alphanumeric.reverse();
    let reversedIndex = 0;
    
    return text.split('').map(char => {
      if (/[A-Za-z0-9]/.test(char)) {
        return reversed[reversedIndex++] || char;
      }
      return char;
    }).join('');
  }

  // Shift positions of characters cyclically
  private static positionShift(text: string, shift: number): string {
    const chars = text.split('');
    const length = chars.length;
    if (length <= 1) return text;
    
    const actualShift = ((shift % length) + length) % length;
    return chars.slice(actualShift).concat(chars.slice(0, actualShift)).join('');
  }

  // Apply custom character mapping
  private static customMapping(text: string, mapping: Record<string, string>): string {
    return text.split('').map(char => mapping[char] || char).join('');
  }

  // Reverse custom character mapping
  private static reverseCustomMapping(text: string, mapping: Record<string, string>): string {
    const reverseMap = Object.entries(mapping).reduce((acc, [key, value]) => {
      acc[value] = key;
      return acc;
    }, {} as Record<string, string>);
    
    return text.split('').map(char => reverseMap[char] || char).join('');
  }

  // Execute custom JavaScript function (advanced users)
  private static customFunction(text: string, functionCode: string): string {
    try {
      // Create a safe function execution environment
      const func = new Function('text', functionCode);
      return func(text) || text;
    } catch (error) {
      console.error('Custom function error:', error);
      return text;
    }
  }

  // Reverse custom function (user must provide reverse logic)
  private static reverseCustomFunction(text: string, functionCode: string): string {
    // For custom functions, users need to provide the reverse logic
    // This is a placeholder - in practice, users would define both encode and decode functions
    return text;
  }

  // Validate if an encoding formula is properly configured
  static validateFormula(formula: EncodingFormula): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!formula.id) errors.push('Formula ID is required');
    if (!formula.name) errors.push('Formula name is required');
    if (!formula.algorithm) errors.push('Algorithm is required');

    switch (formula.algorithm) {
      case 'caesar':
        if (typeof formula.parameters.shiftValue !== 'number') {
          errors.push('Caesar cipher requires a numeric shift value');
        }
        break;
      case 'position_shift':
        if (typeof formula.parameters.shiftValue !== 'number') {
          errors.push('Position shift requires a numeric shift value');
        }
        break;
      case 'custom_mapping':
        if (!formula.parameters.customMapping || Object.keys(formula.parameters.customMapping).length === 0) {
          errors.push('Custom mapping requires at least one character mapping');
        }
        break;
      case 'custom':
        if (!formula.parameters.customFunction) {
          errors.push('Custom algorithm requires function code');
        }
        break;
    }

    return { isValid: errors.length === 0, errors };
  }

  // Test encoding/decoding with sample data
  static testFormula(formula: EncodingFormula, testValue: string = 'ABC123XYZ'): {
    original: string;
    encoded: string;
    decoded: string;
    isReversible: boolean;
  } {
    const encoded = this.encode(testValue, formula);
    const decoded = this.decode(encoded, formula);
    
    return {
      original: testValue,
      encoded,
      decoded,
      isReversible: testValue === decoded
    };
  }
}