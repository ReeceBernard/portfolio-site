
import React, { useState, useEffect, useRef } from 'react';

interface CurrencyInputProps {
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
  className?: string;
  label?: string;
  disabled?: boolean;
}

export const CurrencyInput: React.FC<CurrencyInputProps> = ({
  value,
  onChange,
  placeholder = "0",
  className = "",
  label,
  disabled = false
}) => {
  const [displayValue, setDisplayValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Format number with commas but no currency symbol
  const formatNumber = (amount: number): string => {
    if (amount === 0) return '';
    return amount.toLocaleString('en-US');
  };

  // Parse formatted string to number
  const parseNumber = (value: string): number => {
    const cleanValue = value.replace(/[^\d]/g, '');
    const parsed = parseInt(cleanValue, 10);
    return isNaN(parsed) ? 0 : parsed;
  };

  // Update display value when prop value changes
  useEffect(() => {
    setDisplayValue(formatNumber(value));
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const allowedKeys = [
      'Backspace', 'Delete', 'Tab', 'Escape', 'Enter',
      'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
      'Home', 'End', 'Meta', 'Control'
    ];

    // Allow Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X, Ctrl+Z
    if (e.ctrlKey || e.metaKey) {
      return;
    }

    // Allow numbers
    if (e.key >= '0' && e.key <= '9') {
      return;
    }

    // Allow specific keys
    if (allowedKeys.includes(e.key)) {
      return;
    }

    // Prevent all other keys
    e.preventDefault();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    const cursorPosition = e.target.selectionStart || 0;
    
    // Parse the numeric value
    const numericValue = parseNumber(inputValue);
    
    // Format the new value
    const formattedValue = formatNumber(numericValue);
    
    // Check if cursor was at the very end of the input
    const wasAtEnd = cursorPosition >= displayValue.length;
    
    // Count digits before cursor in old value
    const oldDigitsBeforeCursor = displayValue.slice(0, cursorPosition).replace(/[^\d]/g, '').length;
    
    setDisplayValue(formattedValue);
    onChange(numericValue);

    // Restore cursor position
    setTimeout(() => {
      if (inputRef.current) {
        if (wasAtEnd) {
          // If cursor was at the end, keep it at the end
          inputRef.current.setSelectionRange(formattedValue.length, formattedValue.length);
        } else {
          // Otherwise, find the position after the same number of digits
          let digitCount = 0;
          let newCursorPos = 0;
          
          for (let i = 0; i < formattedValue.length; i++) {
            if (/\d/.test(formattedValue[i])) {
              digitCount++;
              if (digitCount >= oldDigitsBeforeCursor) {
                newCursorPos = i + 1;
                break;
              }
            }
          }
          
          // If we didn't find enough digits, place cursor at the end
          if (digitCount < oldDigitsBeforeCursor) {
            newCursorPos = formattedValue.length;
          }
          
          inputRef.current.setSelectionRange(newCursorPos, newCursorPos);
        }
      }
    }, 0);
  };

  const handleKeyUp = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Handle backspace and delete to be more intelligent
    if (e.key === 'Backspace' || e.key === 'Delete') {
      const input = e.target as HTMLInputElement;
      const cursorPos = input.selectionStart || 0;
      const currentValue = input.value;
      
      // If cursor is after a comma, move it past the comma
      if (e.key === 'Backspace' && cursorPos > 0 && currentValue[cursorPos - 1] === ',') {
        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.setSelectionRange(cursorPos - 1, cursorPos - 1);
          }
        }, 0);
      } else if (e.key === 'Delete' && cursorPos < currentValue.length && currentValue[cursorPos] === ',') {
        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.setSelectionRange(cursorPos + 1, cursorPos + 1);
          }
        }, 0);
      }
    }
  };

  const inputClasses = `
    w-full px-3 py-2 border border-gray-300 rounded-md 
    focus:outline-none focus:ring-2 focus:ring-green-500 
    text-gray-900 bg-white
    ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}
    ${className}
  `.trim();

  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <div className="relative">
        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 pointer-events-none">
          $
        </span>
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={displayValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onKeyUp={handleKeyUp}
          placeholder={placeholder}
          disabled={disabled}
          className={`${inputClasses} pl-7`}
        />
      </div>
    </div>
  );
};