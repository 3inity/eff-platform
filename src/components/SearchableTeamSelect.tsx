"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { BUNDLED_TEAMS, BundledTeam, findBundledTeam } from "@/lib/teams";
import { CountryFlag } from "./CountryFlag";
import { Search, X, Check, Shield } from "lucide-react";

interface SearchableTeamSelectProps {
  value?: string | null; // team name or slug
  onChange: (team: BundledTeam | null) => void;
  takenTeamSlugs?: string[] | Set<string>;
  allowOverride?: boolean;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
}

export function SearchableTeamSelect({
  value,
  onChange,
  takenTeamSlugs,
  allowOverride = false,
  placeholder = "Search and select a club (e.g. Manchester City, Arsenal, Enyimba)...",
  required = false,
  disabled = false,
}: SearchableTeamSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  // Set of taken slugs
  const takenSet = useMemo(() => {
    if (!takenTeamSlugs) return new Set<string>();
    if (takenTeamSlugs instanceof Set) return takenTeamSlugs;
    return new Set(takenTeamSlugs.map((s) => s.toLowerCase()));
  }, [takenTeamSlugs]);

  // Current selected team object
  const selectedTeam = useMemo(() => {
    return findBundledTeam(value);
  }, [value]);

  // Sync query when value changes externally
  useEffect(() => {
    if (selectedTeam) {
      setQuery(selectedTeam.name);
    } else if (!value) {
      setQuery("");
    }
  }, [selectedTeam, value]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        // If query was typed but no team selected, reset to current selection
        if (selectedTeam) {
          setQuery(selectedTeam.name);
        } else {
          setQuery("");
        }
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [selectedTeam]);

  // Filtered teams based on query
  const filteredTeams = useMemo(() => {
    const q = query.trim().toLowerCase();

    return BUNDLED_TEAMS.filter((team) => {
      const isTaken = takenSet.has(team.id.toLowerCase());
      if (isTaken && !allowOverride) {
        return false;
      }

      if (!q) return true;

      if (team.name.toLowerCase().includes(q)) return true;
      if (team.id.toLowerCase().includes(q)) return true;
      if (team.aliases?.some((a) => a.toLowerCase().includes(q))) return true;
      if (team.country.toLowerCase() === q) return true;

      return false;
    });
  }, [query, takenSet, allowOverride]);

  const handleSelect = (team: BundledTeam) => {
    onChange(team);
    setQuery(team.name);
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
        
        {selectedTeam && (
          <CountryFlag countryCode={selectedTeam.country} className="w-4 h-4 shrink-0 rounded-full" />
        )}

        <input
          type="text"
          value={query}
          disabled={disabled}
          required={required && !selectedTeam}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            // If the user clears the input or starts typing something different, deselect
            if (selectedTeam && e.target.value !== selectedTeam.name) {
              onChange(null);
            }
          }}
          onFocus={() => {
            if (!disabled) setIsOpen(true);
          }}
          placeholder={placeholder}
          className="w-full text-xs font-bold text-gray-800 placeholder-gray-400 focus:outline-none bg-transparent"
        />

        {selectedTeam ? (
          <button
            type="button"
            onClick={handleClear}
            disabled={disabled}
            className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
            title="Clear selected team"
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

      {/* Hidden input to ensure native form validation passes only when a valid team is selected */}
      <input
        type="hidden"
        required={required}
        value={selectedTeam ? selectedTeam.name : ""}
      />

      {isOpen && !disabled && (
        <div className="absolute top-full left-0 right-0 mt-1.5 max-h-60 overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-2xl z-50 p-1 divide-y divide-gray-50">
          {filteredTeams.length === 0 ? (
            <div className="p-4 text-center">
              <Shield className="w-5 h-5 text-gray-300 mx-auto mb-1.5" />
              <p className="text-xs font-bold text-gray-600">No matching available teams</p>
              <p className="text-[10px] text-gray-400 mt-0.5">
                {takenSet.size > 0 && query
                  ? "Teams may already be taken in this tournament or not in the bundled database."
                  : "Only verified clubs from the official roster can be registered."}
              </p>
            </div>
          ) : (
            filteredTeams.slice(0, 50).map((team) => {
              const isTaken = takenSet.has(team.id.toLowerCase());
              const isSelected = selectedTeam?.id === team.id;
              const matchedAlias = team.aliases?.find((a) =>
                query.trim() && a.toLowerCase().includes(query.trim().toLowerCase())
              );

              return (
                <div
                  key={team.id}
                  onClick={() => handleSelect(team)}
                  className={`flex items-center justify-between p-2.5 rounded-lg text-xs cursor-pointer transition ${
                    isSelected
                      ? "bg-blue-50 text-blue-900 font-bold"
                      : isTaken
                      ? "bg-amber-50/50 hover:bg-amber-50 text-gray-700"
                      : "hover:bg-gray-50 text-gray-800"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <CountryFlag countryCode={team.country} className="w-4 h-4 shrink-0 rounded-full" />
                    <div className="truncate">
                      <span className="font-bold">{team.name}</span>
                      {matchedAlias && matchedAlias.toLowerCase() !== team.name.toLowerCase() && (
                        <span className="text-[10px] text-gray-400 font-normal ml-1.5">
                          (matches &ldquo;{matchedAlias}&rdquo;)
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    <span className="text-[9px] font-mono text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                      {team.country}
                    </span>
                    {isTaken && (
                      <span className="text-[9px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded border border-amber-200">
                        Taken {allowOverride && "(Override)"}
                      </span>
                    )}
                    {isSelected && <Check className="w-4 h-4 text-blue-600" />}
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
