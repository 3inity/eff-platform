"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { BUNDLED_COUNTRIES, BundledCountry } from "@/lib/teams";
import { CountryFlag } from "./CountryFlag";
import { Search, X, Check, Globe } from "lucide-react";

interface SearchableCountrySelectProps {
  value?: string | null; // 2-letter ISO or FIFA code or name
  onChange: (country: BundledCountry | null) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
}

export function SearchableCountrySelect({
  value,
  onChange,
  placeholder = "Search country by name or code (e.g. Nigeria, NG, Spain)...",
  required = false,
  disabled = false,
}: SearchableCountrySelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  // Current selected country object
  const selectedCountry = useMemo(() => {
    if (!value) return null;
    const v = value.trim().toLowerCase();
    return (
      BUNDLED_COUNTRIES.find(
        (c) =>
          c.code.toLowerCase() === v ||
          c.fifa.toLowerCase() === v ||
          c.name.toLowerCase() === v
      ) || null
    );
  }, [value]);

  useEffect(() => {
    if (selectedCountry) {
      setQuery(`${selectedCountry.name} (${selectedCountry.code})`);
    } else if (!value) {
      setQuery("");
    }
  }, [selectedCountry, value]);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        if (selectedCountry) {
          setQuery(`${selectedCountry.name} (${selectedCountry.code})`);
        } else {
          setQuery("");
        }
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [selectedCountry]);

  const filteredCountries = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return BUNDLED_COUNTRIES;

    return BUNDLED_COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.fifa.toLowerCase().includes(q)
    );
  }, [query]);

  const handleSelect = (country: BundledCountry) => {
    onChange(country);
    setQuery(`${country.name} (${country.code})`);
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange(null);
    setQuery("");
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div
        className={`flex items-center gap-2 border rounded-xl px-3.5 py-2.5 bg-white transition shadow-sm ${
          isOpen ? "border-blue-500 ring-2 ring-blue-100" : "border-gray-300 hover:border-gray-400"
        } ${disabled ? "opacity-60 cursor-not-allowed bg-gray-50" : ""}`}
      >
        <Search className="w-4 h-4 text-gray-400 shrink-0" />

        {selectedCountry ? (
          <CountryFlag countryCode={selectedCountry.code} className="w-4 h-4 shrink-0 rounded-full" />
        ) : (
          <Globe className="w-4 h-4 text-gray-300 shrink-0" />
        )}

        <input
          type="text"
          value={query}
          disabled={disabled}
          required={required && !selectedCountry}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            if (selectedCountry && !e.target.value.includes(selectedCountry.name)) {
              onChange(null);
            }
          }}
          onFocus={() => {
            if (!disabled) setIsOpen(true);
          }}
          placeholder={placeholder}
          className="w-full text-xs font-bold text-gray-800 placeholder-gray-400 focus:outline-none bg-transparent"
        />

        {selectedCountry ? (
          <button
            type="button"
            onClick={handleClear}
            disabled={disabled}
            className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
            title="Clear country"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : query ? (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setIsOpen(true);
            }}
            className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : null}
      </div>

      <input
        type="hidden"
        required={required}
        value={selectedCountry ? selectedCountry.code : ""}
      />

      {isOpen && !disabled && (
        <div className="absolute top-full left-0 right-0 mt-1.5 max-h-56 overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-2xl z-50 p-1 divide-y divide-gray-50">
          {filteredCountries.length === 0 ? (
            <div className="p-3 text-center text-xs text-gray-500 font-bold">
              No matching FIFA member association found
            </div>
          ) : (
            filteredCountries.map((c) => {
              const isSelected = selectedCountry?.code === c.code;

              return (
                <div
                  key={c.code}
                  onClick={() => handleSelect(c)}
                  className={`flex items-center justify-between p-2.5 rounded-lg text-xs cursor-pointer transition ${
                    isSelected
                      ? "bg-blue-50 text-blue-900 font-bold"
                      : "hover:bg-gray-50 text-gray-800"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <CountryFlag countryCode={c.code} className="w-4 h-4 shrink-0 rounded-full" />
                    <span className="font-bold">{c.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-gray-400 font-bold bg-gray-100 px-1.5 py-0.5 rounded">
                      {c.code}
                    </span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-blue-600" />}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
