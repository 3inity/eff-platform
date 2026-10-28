"use client";

import React from "react";
import { FlagNg } from "@sankyu/react-circle-flags/flags/ng";
import { FlagGb } from "@sankyu/react-circle-flags/flags/gb";
import { FlagGh } from "@sankyu/react-circle-flags/flags/gh";
import { FlagZa } from "@sankyu/react-circle-flags/flags/za";
import { FlagBr } from "@sankyu/react-circle-flags/flags/br";
import { FlagFr } from "@sankyu/react-circle-flags/flags/fr";
import { FlagEs } from "@sankyu/react-circle-flags/flags/es";
import { FlagDe } from "@sankyu/react-circle-flags/flags/de";
import { FlagIt } from "@sankyu/react-circle-flags/flags/it";
import { FlagPt } from "@sankyu/react-circle-flags/flags/pt";
import { FlagAr } from "@sankyu/react-circle-flags/flags/ar";
import { FlagUs } from "@sankyu/react-circle-flags/flags/us";
import { FlagNl } from "@sankyu/react-circle-flags/flags/nl";
import { FlagCi } from "@sankyu/react-circle-flags/flags/ci";
import { FlagCm } from "@sankyu/react-circle-flags/flags/cm";
import { FlagEg } from "@sankyu/react-circle-flags/flags/eg";
import { FlagMa } from "@sankyu/react-circle-flags/flags/ma";
import { FlagJp } from "@sankyu/react-circle-flags/flags/jp";

export interface SupportedCountry {
  code: string;
  name: string;
}

export const SUPPORTED_COUNTRIES: SupportedCountry[] = [
  { code: "NG", name: "Nigeria" },
  { code: "GB", name: "United Kingdom" },
  { code: "GH", name: "Ghana" },
  { code: "ZA", name: "South Africa" },
  { code: "BR", name: "Brazil" },
  { code: "FR", name: "France" },
  { code: "ES", name: "Spain" },
  { code: "DE", name: "Germany" },
  { code: "IT", name: "Italy" },
  { code: "PT", name: "Portugal" },
  { code: "AR", name: "Argentina" },
  { code: "US", name: "United States" },
  { code: "NL", name: "Netherlands" },
  { code: "CI", name: "Côte d'Ivoire" },
  { code: "CM", name: "Cameroon" },
  { code: "EG", name: "Egypt" },
  { code: "MA", name: "Morocco" },
  { code: "JP", name: "Japan" },
];

const flagMap: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  NG: FlagNg,
  GB: FlagGb,
  UK: FlagGb,
  GH: FlagGh,
  ZA: FlagZa,
  BR: FlagBr,
  FR: FlagFr,
  ES: FlagEs,
  DE: FlagDe,
  IT: FlagIt,
  PT: FlagPt,
  AR: FlagAr,
  US: FlagUs,
  NL: FlagNl,
  CI: FlagCi,
  CM: FlagCm,
  EG: FlagEg,
  MA: FlagMa,
  JP: FlagJp,
};

interface CountryFlagProps {
  countryCode?: string | null;
  className?: string;
  size?: number;
}

export function CountryFlag({ countryCode, className = "w-4 h-4 inline-block", size }: CountryFlagProps) {
  if (!countryCode) return null;
  const upper = countryCode.toUpperCase();
  const FlagComponent = flagMap[upper];

  if (!FlagComponent) {
    return <span className="text-[10px] font-bold uppercase">{upper}</span>;
  }

  const style = size ? { width: `${size}px`, height: `${size}px` } : undefined;
  return <FlagComponent className={className} style={style} />;
}
