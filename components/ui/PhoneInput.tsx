"use client";

import React, { useState, useEffect } from "react";
import { CheckCircle, XCircle } from "lucide-react";
import { motion } from "framer-motion";

interface PhoneInputProps {
  value: string;
  onChange: (phone: string) => void;
  onValidationChange?: (isValid: boolean) => void;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

const PhoneInput: React.FC<PhoneInputProps> = ({
  value,
  onChange,
  onValidationChange,
  required = true,
  disabled = false,
  placeholder = "Phone Number * (e.g., +1 234 567 8900, +44 7911 123456)",
  className = "",
}) => {
  const [validation, setValidation] = useState<{
    isValid: boolean;
    message: string;
  }>({ isValid: true, message: "" });
  
  const [isFocused, setIsFocused] = useState(false);

  // Lenient real-time validation for better UX
  const validatePhoneInRealTime = (phone: string): void => {
    const phoneWithoutSpaces = phone.trim();
    
    if (!phoneWithoutSpaces) {
      if (required) {
        setValidation({ isValid: false, message: "Phone number is required" });
      } else {
        setValidation({ isValid: true, message: "" });
      }
      return;
    }
    
    const cleanedPhone = phoneWithoutSpaces.replace(/[^\d+]/g, '');
    
    // Very lenient validation while typing
    if (cleanedPhone.length === 0) {
      if (required) {
        setValidation({ isValid: false, message: "Phone number is required" });
      }
    } else if (cleanedPhone.length < 3) {
      setValidation({ isValid: true, message: "" }); // No message while typing
    } else if (cleanedPhone.length > 20) {
      setValidation({ isValid: false, message: "Number too long" });
    } else if (!/^[\d+]/.test(cleanedPhone)) {
      setValidation({ isValid: false, message: "Must start with + or digit" });
    } else {
      // Provide helpful hints instead of errors
      if (!cleanedPhone.includes('+') && cleanedPhone.length >= 10) {
        setValidation({ 
          isValid: true, 
          message: "Remember to include country code (e.g., +1, +44)" 
        });
      } else {
        setValidation({ isValid: true, message: "" });
      }
    }
  };

  // Comprehensive validation for submission
  const validatePhoneForSubmission = (phone: string): { isValid: boolean; message: string; normalized?: string } => {
    const phoneWithoutSpaces = phone.trim();
    
    if (!phoneWithoutSpaces && required) {
      return { isValid: false, message: "Phone number is required" };
    }
    
    if (!phoneWithoutSpaces && !required) {
      return { isValid: true, message: "", normalized: "" };
    }
    
    const cleanedPhone = phoneWithoutSpaces.replace(/[^\d+]/g, '');
    
    // Basic validation for submission
    if (cleanedPhone.length < 7) {
      return { isValid: false, message: "Phone number is too short" };
    }
    
    if (cleanedPhone.length > 15) {
      return { isValid: false, message: "Phone number is too long" };
    }
    
    // Must start with digit or +
    if (!/^[\d+]/.test(cleanedPhone)) {
      return { isValid: false, message: "Invalid phone number format" };
    }
    
    // Check for E.164 format (international standard)
    const e164Regex = /^\+?[1-9]\d{1,14}$/;
    
    if (!e164Regex.test(cleanedPhone)) {
      // Still allow submission with warning
      console.warn("Phone number doesn't strictly follow E.164 format");
    }
    
    const normalized = normalizePhoneNumber(phone);
    
    // Show helpful suggestions without blocking submission
    let suggestion = "";
    if (!normalized.startsWith('+') && normalized.length >= 10) {
      suggestion = "Tip: Include country code for international calls";
    }
    
    return {
      isValid: true,
      message: suggestion || "Valid phone number",
      normalized
    };
  };

  // Phone number normalization
  const normalizePhoneNumber = (phone: string): string => {
    const cleanedPhone = phone.trim().replace(/[^\d+]/g, '');
    
    // If it already starts with +, keep it as is
    if (cleanedPhone.startsWith('+')) {
      return cleanedPhone;
    }
    
    // Common country codes for auto-normalization
    const countryCodePatterns = [
      { regex: /^1\d{10}$/, code: '1' }, // USA/Canada
      { regex: /^44\d{10}$/, code: '44' }, // UK
      { regex: /^91\d{10}$/, code: '91' }, // India
      { regex: /^86\d{11}$/, code: '86' }, // China
      { regex: /^81\d{9,10}$/, code: '81' }, // Japan
      { regex: /^49\d{10,11}$/, code: '49' }, // Germany
      { regex: /^33\d{9}$/, code: '33' }, // France
      { regex: /^61\d{9}$/, code: '61' }, // Australia
      { regex: /^27\d{9}$/, code: '27' }, // South Africa
      { regex: /^254\d{9}$/, code: '254' }, // Kenya
      { regex: /^234\d{10}$/, code: '234' }, // Nigeria
      { regex: /^255\d{9}$/, code: '255' }, // Tanzania
    ];
    
    // Try to match country codes
    for (const pattern of countryCodePatterns) {
      if (pattern.regex.test(cleanedPhone)) {
        return `+${cleanedPhone}`;
      }
    }
    
    return cleanedPhone;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    validatePhoneInRealTime(newValue);
  };

  // Notify parent about validation changes
  useEffect(() => {
    if (onValidationChange) {
      onValidationChange(validation.isValid);
    }
  }, [validation.isValid, onValidationChange]);

  // Validate initial value
  useEffect(() => {
    validatePhoneInRealTime(value);
  }, []);

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlur = () => {
    setIsFocused(false);
    // Re-validate on blur
    validatePhoneInRealTime(value);
  };

  // Format phone number for display (adds spaces for readability)
  const formatPhoneDisplay = (phone: string): string => {
    if (!phone) return "";
    
    // Remove all non-digit and non-plus characters
    const cleaned = phone.replace(/[^\d+]/g, '');
    
    if (cleaned.startsWith('+')) {
      // Format international numbers with spaces
      const countryCode = cleaned.match(/^\+\d{1,3}/)?.[0] || '';
      const rest = cleaned.slice(countryCode.length);
      
      // Add spaces every 3-4 digits for readability
      const formattedRest = rest.replace(/(\d{3,4})(?=\d)/g, '$1 ');
      
      return `${countryCode} ${formattedRest}`.trim();
    }
    
    // Format local numbers
    return cleaned.replace(/(\d{3,4})(?=\d)/g, '$1 ');
  };

  return (
    <div className="relative">
      <input
        type="tel"
        value={value}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        disabled={disabled}
        className={`w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all pr-10 ${
          value && !isFocused
            ? validation.isValid 
              ? 'border-green-500 focus:ring-green-500' 
              : 'border-red-500 focus:ring-red-500'
            : 'border-gray-300 dark:border-gray-600'
        } ${disabled ? 'opacity-60 cursor-not-allowed' : ''} ${className}`}
        required={required}
      />
      
      {value && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute right-3 top-1/2 transform -translate-y-1/2"
        >
          {validation.isValid ? (
            <CheckCircle className="text-green-500" size={20} />
          ) : (
            <XCircle className="text-red-500" size={20} />
          )}
        </motion.div>
      )}
      
      {validation.message && value.length > 2 && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className={`text-sm mt-1 ml-1 flex items-center gap-1 ${
            validation.isValid ? 'text-green-600' : 'text-red-600'
          }`}
        >
          {validation.isValid && (
            <CheckCircle size={14} />
          )}
          {!validation.isValid && (
            <XCircle size={14} />
          )}
          {validation.message}
        </motion.div>
      )}
      
      {/* Format hint */}
      {isFocused && !validation.message && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-xs text-gray-500 mt-1 ml-1"
        >
          Format: +[country code][number] (e.g., +1 234 567 8900)
        </motion.div>
      )}
    </div>
  );
};

// Export validation functions for use in parent components
export const validatePhoneForSubmission = (phone: string, required: boolean = true): { 
  isValid: boolean; 
  message: string; 
  normalized?: string 
} => {
  const phoneWithoutSpaces = phone.trim();
  
  if (!phoneWithoutSpaces && required) {
    return { isValid: false, message: "Phone number is required" };
  }
  
  if (!phoneWithoutSpaces && !required) {
    return { isValid: true, message: "", normalized: "" };
  }
  
  const cleanedPhone = phoneWithoutSpaces.replace(/[^\d+]/g, '');
  
  if (cleanedPhone.length < 7) {
    return { isValid: false, message: "Phone number is too short" };
  }
  
  if (cleanedPhone.length > 15) {
    return { isValid: false, message: "Phone number is too long" };
  }
  
  if (!/^[\d+]/.test(cleanedPhone)) {
    return { isValid: false, message: "Invalid phone number format" };
  }
  
  const e164Regex = /^\+?[1-9]\d{1,14}$/;
  
  if (!e164Regex.test(cleanedPhone)) {
    console.warn("Phone number doesn't strictly follow E.164 format");
  }
  
  const normalizePhoneNumber = (phone: string): string => {
    const cleanedPhone = phone.trim().replace(/[^\d+]/g, '');
    
    if (cleanedPhone.startsWith('+')) {
      return cleanedPhone;
    }
    
    const countryCodePatterns = [
      { regex: /^1\d{10}$/, code: '1' },
      { regex: /^44\d{10}$/, code: '44' },
      { regex: /^91\d{10}$/, code: '91' },
      { regex: /^86\d{11}$/, code: '86' },
      { regex: /^81\d{9,10}$/, code: '81' },
      { regex: /^49\d{10,11}$/, code: '49' },
      { regex: /^33\d{9}$/, code: '33' },
      { regex: /^61\d{9}$/, code: '61' },
      { regex: /^27\d{9}$/, code: '27' },
      { regex: /^254\d{9}$/, code: '254' },
    ];
    
    for (const pattern of countryCodePatterns) {
      if (pattern.regex.test(cleanedPhone)) {
        return `+${cleanedPhone}`;
      }
    }
    
    return cleanedPhone;
  };
  
  return {
    isValid: true,
    message: "",
    normalized: normalizePhoneNumber(phone)
  };
};

export default PhoneInput;