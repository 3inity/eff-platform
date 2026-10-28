"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  Trophy,
  Plus,
  Calendar,
  Users,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Play,
  Lock,
  Upload,
  X,
  ExternalLink,
  Shield,
  Trash2,
  Edit,
  Clock,
  Info,
  ChevronDown,
  ChevronUp,
  Search,
} from "lucide-react";
import { CountryFlag, SUPPORTED_COUNTRIES } from "@/components/CountryFlag";
import { SearchableTeamSelect } from "@/components/SearchableTeamSelect";
import { SearchableCountrySelect } from "@/components/SearchableCountrySelect";
import { getCanonicalTeamId } from "@/lib/teams";

interface TeamItem {
  id: string;
  name: string;
  logoUrl: string | null;
}

interface Competition {
  id: string;
  name: string;
  description: string | null;
  additionalInfo: any;
  matchdayDurationHours: number;
  matchdayEndsAt: string | null;
  type: "LEAGUE" | "CUP" | "CUSTOM";
  format: "ROUND_ROBIN" | "KNOCKOUT" | "GROUP_STAGE";
  season: string;
  status: "DRAFT" | "REGISTRATION_OPEN" | "REGISTRATION_CLOSED" | "IN_PROGRESS" | "COMPLETED";
  badgeKey: string | null;
  registrationOpenAt: string | null;
  registrationCloseAt: string | null;
  maxParticipants: number | null;
  startDate: string | null;
  currentMatchday: number | null;
  roundRobinLegs: number;
  knockoutLegs: number;
  groupCount: number | null;
  teamsPerGroup: number | null;
  qualifiersPerGroup: number | null;
  requiresApproval: boolean;
  registeredCount?: number;
  matchCount?: number;
}

interface Participant {
  id: string;
  playerId: string;
  teamId: string | null;
  teamName: string | null;
  teamLogoUrl: string | null;
  team?: TeamItem | null;
  status: "PENDING" | "APPROVED" | "REJECTED" | "WITHDRAWN";
  groupName?: string | null;
  knockoutSeed?: number | null;
  player: {
    id: string;
    username: string;
    teamName: string;
    avatarUrl: string | null;
    nationality?: string | null;
  };
}

interface PlayerOption {
  id: string;
  username: string;
  teamName: string;
  avatarUrl: string | null;
  nationality?: string | null;
}

export default function AdminCompetitionsPage() {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [selectedComp, setSelectedComp] = useState<Competition | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [teams, setTeams] = useState<TeamItem[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [allPlayers, setAllPlayers] = useState<PlayerOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);

  // Result entry modal state
  const [resultModalOpen, setResultModalOpen] = useState(false);
  const [selectedMatchForResult, setSelectedMatchForResult] = useState<any | null>(null);
  const [scoreHome, setScoreHome] = useState("");
  const [scoreAway, setScoreAway] = useState("");
  const [penHome, setPenHome] = useState("");
  const [penAway, setPenAway] = useState("");

  // Create modal state
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [linkPlayerOpen, setLinkPlayerOpen] = useState(false);
  const [createTeamOpen, setCreateTeamOpen] = useState(false);

  // Form states (Create / Edit)
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formAdditionalInfo, setFormAdditionalInfo] = useState("");
  const [formMatchdayDuration, setFormMatchdayDuration] = useState("24");
  const [formMatchdayEndsAt, setFormMatchdayEndsAt] = useState("");
  const [formType, setFormType] = useState<"LEAGUE" | "CUP" | "CUSTOM">("LEAGUE");
  const [formFormat, setFormFormat] = useState<"ROUND_ROBIN" | "KNOCKOUT" | "GROUP_STAGE">("ROUND_ROBIN");
  const [formSeason, setFormSeason] = useState("Season 1");
  const [formStatus, setFormStatus] = useState<Competition["status"]>("REGISTRATION_OPEN");
  const [formStartDate, setFormStartDate] = useState("");
  const [formRoundRobinLegs, setFormRoundRobinLegs] = useState("1");
  const [formKnockoutLegs, setFormKnockoutLegs] = useState("1");
  const [formGroupCount, setFormGroupCount] = useState("2");
  const [formTeamsPerGroup, setFormTeamsPerGroup] = useState("4");
  const [formQualifiersPerGroup, setFormQualifiersPerGroup] = useState("2");
  const [formRegOpenAt, setFormRegOpenAt] = useState(new Date().toISOString().slice(0, 16));
  const [formRegCloseAt, setFormRegCloseAt] = useState("");
  const [formMaxParticipants, setFormMaxParticipants] = useState("10");
  const [formRequiresApproval, setFormRequiresApproval] = useState(false);
  const [badgeUrl, setBadgeUrl] = useState("");

  // Link Player form state
  const [linkPlayerSearch, setLinkPlayerSearch] = useState("");
  const [linkSelectedPlayerId, setLinkSelectedPlayerId] = useState("");
  const [linkSelectedTeamId, setLinkSelectedTeamId] = useState<string | null>(null);
  const [linkTeamName, setLinkTeamName] = useState("");
  const [linkTeamSearch, setLinkTeamSearch] = useState("");
  const [linkTeamLogoUrl, setLinkTeamLogoUrl] = useState("");
  const [linkIsCustomTeam, setLinkIsCustomTeam] = useState(false);
  const [linkAdminOverride, setLinkAdminOverride] = useState(false);
  const [linkNationality, setLinkNationality] = useState("");
  const [linkNationSearch, setLinkNationSearch] = useState("");
  const [teamDropdownOpen, setTeamDropdownOpen] = useState(false);
  const [nationDropdownOpen, setNationDropdownOpen] = useState(false);

  // Create Team form state
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamLogoUrl, setNewTeamLogoUrl] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Slugs of clubs already taken in the currently selected competition
  const takenSlugsInAdminComp = useMemo(() => {
    const slugs: string[] = [];
    for (const p of participants) {
      if (p.status === "APPROVED" || p.status === "PENDING") {
        if (p.playerId !== linkSelectedPlayerId) {
          const teamIdentifier = p.teamId || p.teamName || p.team?.name;
          const canonical = getCanonicalTeamId(teamIdentifier);
          if (canonical) slugs.push(canonical);
        }
      }
    }
    return slugs;
  }, [participants, linkSelectedPlayerId]);

  const loadCompetitions = async () => {
    try {
      const res = await fetch("/api/competitions", { cache: "no-store" });
      const data = await res.json();
      const list: Competition[] = data.competitions || [];
      setCompetitions(list);
      if (list.length > 0) {
        if (!selectedComp) {
          selectCompetition(list[0]);
        } else {
          const fresh = list.find((c) => c.id === selectedComp.id);
          if (fresh) {
            setSelectedComp(fresh);
          }
        }
      }
    } catch (err) {
      console.error("Failed to load competitions:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadAllPlayers = async () => {
    try {
      const res = await fetch("/api/admin/players", { cache: "no-store" });
      const data = await res.json();
      setAllPlayers(data.players || []);
    } catch (err) {
      console.error("Failed to load players list:", err);
    }
  };

  const selectCompetition = async (comp: Competition) => {
    setSelectedComp(comp);
    setDetailLoading(true);
    try {
      const [compRes, partRes] = await Promise.all([
        fetch(`/api/competitions/${comp.id}`, { cache: "no-store" }),
        fetch(`/api/admin/competitions/${comp.id}/participants`, { cache: "no-store" }),
      ]);
      const compData = await compRes.json();
      const partData = await partRes.json();

      setSelectedComp(compData.competition || comp);
      setParticipants(partData.participants || compData.participants || []);
      setTeams(partData.teams || []);
      setMatches(compData.matches || compData.competition?.matches || []);
    } catch (err) {
      console.error("Error loading competition details:", err);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleGenerateFixtures = async () => {
    if (!selectedComp) return;
    if (!confirm(`Generate fixtures for ${selectedComp.name}?`)) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/competitions/${selectedComp.id}/generate-fixtures`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate fixtures.");
      alert(`Successfully generated ${data.matchesCount} fixtures across ${data.rounds} matchdays!`);
      await selectCompetition(selectedComp);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to generate fixtures.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleGenerateKnockout = async () => {
    if (!selectedComp) return;
    if (!confirm(`Generate knockout bracket for ${selectedComp.name}?`)) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/competitions/${selectedComp.id}/generate-knockout`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate knockout bracket.");
      alert(`Successfully generated knockout bracket with ${data.matchesCount} matches!`);
      await selectCompetition(selectedComp);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to generate knockout bracket.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDrawGroups = async () => {
    if (!selectedComp) return;
    const gCount = selectedComp.groupCount || 2;
    const tPerGroup = selectedComp.teamsPerGroup || 4;
    if (!confirm(`Draw groups with ${gCount} groups and ${tPerGroup} teams per group?`)) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/competitions/${selectedComp.id}/draw-groups`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupCount: gCount, teamsPerGroup: tPerGroup }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to draw groups.");
      alert(`Successfully drew ${data.groupCount} groups and generated ${data.matchesCount} group stage fixtures!`);
      await selectCompetition(selectedComp);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to draw groups.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleQualifyKnockout = async () => {
    if (!selectedComp) return;
    const qCount = selectedComp.qualifiersPerGroup || 2;
    if (!confirm(`Advance top ${qCount} teams from each group to the knockout bracket?`)) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/competitions/${selectedComp.id}/qualify-knockout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qualifiersPerGroup: qCount }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to qualify teams.");
      alert(`Successfully advanced ${data.qualifiedCount} teams and created ${data.matchesCount} knockout matches!`);
      await selectCompetition(selectedComp);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to qualify teams to knockout.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAllFixtures = async () => {
    if (!selectedComp) return;
    if (
      !confirm(
        `Are you sure you want to delete ALL fixtures for "${selectedComp.name}"?\n\nThis will remove all generated matches and reset tournament bracket progress. This action cannot be undone.`
      )
    ) {
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/competitions/${selectedComp.id}/fixtures`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete fixtures.");
      alert(data.message || "All fixtures deleted successfully.");
      await selectCompetition(selectedComp);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to delete fixtures.");
    } finally {
      setSubmitting(false);
    }
  };

  const openResultModal = (match: any) => {
    setSelectedMatchForResult(match);
    setScoreHome(match.homeScore !== null && match.homeScore !== undefined ? String(match.homeScore) : "");
    setScoreAway(match.awayScore !== null && match.awayScore !== undefined ? String(match.awayScore) : "");
    setPenHome(match.homePenalty !== null && match.homePenalty !== undefined ? String(match.homePenalty) : "");
    setPenAway(match.awayPenalty !== null && match.awayPenalty !== undefined ? String(match.awayPenalty) : "");
    setResultModalOpen(true);
  };

  const handleSaveResult = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMatchForResult || !selectedComp) return;
    if (scoreHome === "" || scoreAway === "") {
      alert("Please enter both home and away scores.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/matches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchId: selectedMatchForResult.id,
          competitionId: selectedComp.id,
          homeScore: parseInt(scoreHome, 10),
          awayScore: parseInt(scoreAway, 10),
          homePenalty: penHome !== "" ? parseInt(penHome, 10) : null,
          awayPenalty: penAway !== "" ? parseInt(penAway, 10) : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to record match result.");

      setResultModalOpen(false);
      setSelectedMatchForResult(null);
      await selectCompetition(selectedComp);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to save match result.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCompetition = async () => {
    if (!selectedComp) return;
    if (
      !confirm(
        `Are you sure you want to permanently delete tournament "${selectedComp.name}"?\n\nThis will remove the competition along with all enrolled participants, matches, and team records.`
      )
    ) {
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/competitions/${selectedComp.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete competition.");

      alert(data.message || "Competition deleted successfully.");
      setSelectedComp(null);
      await loadCompetitions();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to delete competition.");
    } finally {
      setSubmitting(false);
    }
  };

  const openLinkPlayerModal = () => {
    setLinkSelectedPlayerId("");
    setLinkSelectedTeamId(null);
    setLinkTeamName("");
    setLinkTeamSearch("");
    setLinkTeamLogoUrl("");
    setLinkNationality("");
    setLinkNationSearch("");
    setLinkIsCustomTeam(false);
    setLinkAdminOverride(false);
    setTeamDropdownOpen(false);
    setNationDropdownOpen(false);
    setLinkPlayerOpen(true);
  };

  useEffect(() => {
    loadCompetitions();
    loadAllPlayers();
  }, []);

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    folder: string,
    onSuccess: (url: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fd = new FormData();
    fd.append("file", file);
    fd.append("folder", folder);

    try {
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onSuccess(data.url);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Upload failed.");
    }
  };

  const openCreateModal = () => {
    setFormName("");
    setFormDescription("");
    setFormAdditionalInfo("");
    setFormMatchdayDuration("24");
    setFormMatchdayEndsAt("");
    setFormType("LEAGUE");
    setFormFormat("ROUND_ROBIN");
    setFormSeason("Season 1");
    setFormStatus("REGISTRATION_OPEN");
    setFormStartDate(new Date().toISOString().slice(0, 16));
    setFormRoundRobinLegs("1");
    setFormKnockoutLegs("1");
    setFormGroupCount("2");
    setFormTeamsPerGroup("4");
    setFormQualifiersPerGroup("2");
    setFormRegOpenAt(new Date().toISOString().slice(0, 16));
    setFormRegCloseAt("");
    setFormMaxParticipants("10");
    setFormRequiresApproval(false);
    setBadgeUrl("");
    setErrorMsg(null);
    setCreateOpen(true);
  };

  const openEditModal = (comp: Competition) => {
    setFormName(comp.name);
    setFormDescription(comp.description || "");
    setFormAdditionalInfo(
      comp.additionalInfo ? (typeof comp.additionalInfo === "string" ? comp.additionalInfo : JSON.stringify(comp.additionalInfo, null, 2)) : ""
    );
    setFormMatchdayDuration(String(comp.matchdayDurationHours || 24));
    setFormMatchdayEndsAt(
      comp.matchdayEndsAt ? new Date(comp.matchdayEndsAt).toISOString().slice(0, 16) : ""
    );
    setFormType(comp.type);
    setFormFormat(comp.format);
    setFormSeason(comp.season);
    setFormStatus(comp.status);
    setFormStartDate(
      comp.startDate ? new Date(comp.startDate).toISOString().slice(0, 16) : ""
    );
    setFormRoundRobinLegs(String(comp.roundRobinLegs || 1));
    setFormKnockoutLegs(String(comp.knockoutLegs || 1));
    setFormGroupCount(String(comp.groupCount || 2));
    setFormTeamsPerGroup(String(comp.teamsPerGroup || 4));
    setFormQualifiersPerGroup(String(comp.qualifiersPerGroup || 2));
    setFormRegOpenAt(
      comp.registrationOpenAt ? new Date(comp.registrationOpenAt).toISOString().slice(0, 16) : ""
    );
    setFormRegCloseAt(
      comp.registrationCloseAt ? new Date(comp.registrationCloseAt).toISOString().slice(0, 16) : ""
    );
    setFormMaxParticipants(String(comp.maxParticipants || 10));
    setFormRequiresApproval(comp.requiresApproval);
    setBadgeUrl(comp.badgeKey || "");
    setErrorMsg(null);
    setEditOpen(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);

    let parsedAdditional: any = null;
    if (formAdditionalInfo.trim()) {
      try {
        parsedAdditional = JSON.parse(formAdditionalInfo);
      } catch {
        parsedAdditional = { notes: formAdditionalInfo.trim() };
      }
    }

    try {
      const res = await fetch("/api/admin/competitions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName,
          description: formDescription || null,
          additionalInfo: parsedAdditional,
          matchdayDurationHours: parseInt(formMatchdayDuration, 10) || 24,
          matchdayEndsAt: formMatchdayEndsAt ? new Date(formMatchdayEndsAt).toISOString() : null,
          type: formType,
          format: formFormat,
          season: formSeason,
          status: formStatus,
          startDate: formStartDate ? new Date(formStartDate).toISOString() : null,
          roundRobinLegs: parseInt(formRoundRobinLegs, 10) || 1,
          knockoutLegs: parseInt(formKnockoutLegs, 10) || 1,
          groupCount: formFormat === "GROUP_STAGE" ? parseInt(formGroupCount, 10) || null : null,
          teamsPerGroup: formFormat === "GROUP_STAGE" ? parseInt(formTeamsPerGroup, 10) || null : null,
          qualifiersPerGroup: formFormat === "GROUP_STAGE" ? parseInt(formQualifiersPerGroup, 10) || null : null,
          registrationOpenAt: formRegOpenAt ? new Date(formRegOpenAt).toISOString() : null,
          registrationCloseAt: formRegCloseAt ? new Date(formRegCloseAt).toISOString() : null,
          maxParticipants: formMaxParticipants ? parseInt(formMaxParticipants, 10) : null,
          requiresApproval: formRequiresApproval,
          badgeKey: badgeUrl || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create competition.");

      setCreateOpen(false);
      loadCompetitions();
      selectCompetition(data.competition);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Error creating tournament.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComp) return;
    setSubmitting(true);
    setErrorMsg(null);

    let parsedAdditional: any = null;
    if (formAdditionalInfo.trim()) {
      try {
        parsedAdditional = JSON.parse(formAdditionalInfo);
      } catch {
        parsedAdditional = { notes: formAdditionalInfo.trim() };
      }
    }

    try {
      const res = await fetch(`/api/admin/competitions/${selectedComp.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName,
          description: formDescription || null,
          additionalInfo: parsedAdditional,
          matchdayDurationHours: parseInt(formMatchdayDuration, 10) || 24,
          matchdayEndsAt: formMatchdayEndsAt ? new Date(formMatchdayEndsAt).toISOString() : null,
          type: formType,
          format: formFormat,
          season: formSeason,
          status: formStatus,
          startDate: formStartDate ? new Date(formStartDate).toISOString() : null,
          roundRobinLegs: parseInt(formRoundRobinLegs, 10) || 1,
          knockoutLegs: parseInt(formKnockoutLegs, 10) || 1,
          groupCount: formFormat === "GROUP_STAGE" ? parseInt(formGroupCount, 10) || null : null,
          teamsPerGroup: formFormat === "GROUP_STAGE" ? parseInt(formTeamsPerGroup, 10) || null : null,
          qualifiersPerGroup: formFormat === "GROUP_STAGE" ? parseInt(formQualifiersPerGroup, 10) || null : null,
          registrationOpenAt: formRegOpenAt ? new Date(formRegOpenAt).toISOString() : null,
          registrationCloseAt: formRegCloseAt ? new Date(formRegCloseAt).toISOString() : null,
          maxParticipants: formMaxParticipants ? parseInt(formMaxParticipants, 10) : null,
          requiresApproval: formRequiresApproval,
          badgeKey: badgeUrl || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update competition.");

      setEditOpen(false);
      loadCompetitions();
      selectCompetition(data.competition);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Error updating tournament.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseRegistration = async () => {
    if (!selectedComp) return;
    if (!confirm("Are you sure you want to close registration for this competition?")) return;

    try {
      const res = await fetch(`/api/admin/competitions/${selectedComp.id}/close-registration`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      selectCompetition(data.competition);
      loadCompetitions();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to close registration.");
    }
  };

  const handleStartCompetition = async () => {
    if (!selectedComp) return;
    try {
      const res = await fetch(`/api/admin/competitions/${selectedComp.id}/start`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      selectCompetition(data.competition);
      loadCompetitions();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to start competition.");
    }
  };

  const handleParticipantStatus = async (participantId: string, action: "approve" | "reject") => {
    if (!selectedComp) return;
    try {
      const res = await fetch(
        `/api/admin/competitions/${selectedComp.id}/participants/${participantId}/${action}`,
        { method: "POST" }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      selectCompetition(selectedComp);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : `Failed to ${action} participant.`);
    }
  };

  const handleRemoveParticipant = async (participantId: string, username: string) => {
    if (!selectedComp) return;
    if (!confirm(`Are you sure you want to remove @${username} from ${selectedComp.name}?`)) return;

    try {
      const res = await fetch(
        `/api/admin/competitions/${selectedComp.id}/participants/${participantId}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      selectCompetition(selectedComp);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to remove participant.");
    }
  };

  const handleLinkPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComp || !linkSelectedPlayerId) return;

    // Check if team is taken and override is off
    if (linkTeamName && !linkAdminOverride) {
      const taken = participants.find(
        (p) =>
          (p.status === "APPROVED" || p.status === "PENDING") &&
          p.playerId !== linkSelectedPlayerId &&
          ((linkSelectedTeamId && p.teamId === linkSelectedTeamId) ||
            (p.teamName && p.teamName.trim().toLowerCase() === linkTeamName.trim().toLowerCase()))
      );
      if (taken) {
        alert(
          `Team "${linkTeamName}" is already taken by @${taken.player.username}. Check "Admin Override" to assign it anyway.`
        );
        return;
      }
    }

    setSubmitting(true);

    try {
      const res = await fetch(`/api/admin/competitions/${selectedComp.id}/participants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId: linkSelectedPlayerId,
          teamId: linkSelectedTeamId || undefined,
          teamName: linkTeamName || null,
          teamLogoUrl: linkTeamLogoUrl || null,
          nationality: linkNationality || undefined,
          force: linkAdminOverride,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to link player.");

      setLinkPlayerOpen(false);
      setLinkSelectedPlayerId("");
      setLinkSelectedTeamId(null);
      setLinkTeamName("");
      setLinkTeamSearch("");
      setLinkTeamLogoUrl("");
      setLinkNationality("");
      setLinkNationSearch("");
      setLinkIsCustomTeam(false);
      setLinkAdminOverride(false);
      selectCompetition(selectedComp);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to link player.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComp || !newTeamName) return;
    setSubmitting(true);

    try {
      const res = await fetch(`/api/admin/competitions/${selectedComp.id}/teams`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newTeamName,
          logoUrl: newTeamLogoUrl || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create team.");

      setCreateTeamOpen(false);
      setNewTeamName("");
      setNewTeamLogoUrl("");
      selectCompetition(selectedComp);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to create team.");
    } finally {
      setSubmitting(false);
    }
  };

  const pendingParticipantsCount = participants.filter((p) => p.status === "PENDING").length;

  const filteredPlayersForLink = allPlayers.filter(
    (p) =>
      p.username.toLowerCase().includes(linkPlayerSearch.toLowerCase()) ||
      p.teamName.toLowerCase().includes(linkPlayerSearch.toLowerCase())
  );

  const getStatusBadge = (st: Competition["status"]) => {
    switch (st) {
      case "DRAFT":
        return <span className="px-2.5 py-1 bg-gray-600 text-white font-black text-[10px] rounded-full uppercase tracking-wider">Draft</span>;
      case "REGISTRATION_OPEN":
        return <span className="px-2.5 py-1 bg-[#00c853] text-[#070b1a] font-black text-[10px] rounded-full uppercase tracking-wider">Registration Open</span>;
      case "REGISTRATION_CLOSED":
        return <span className="px-2.5 py-1 bg-amber-500 text-gray-900 font-black text-[10px] rounded-full uppercase tracking-wider">Registration Closed</span>;
      case "IN_PROGRESS":
        return <span className="px-2.5 py-1 bg-[#00b4ff] text-[#0a1128] font-black text-[10px] rounded-full uppercase tracking-wider">In Progress</span>;
      case "COMPLETED":
        return <span className="px-2.5 py-1 bg-blue-600 text-white font-black text-[10px] rounded-full uppercase tracking-wider">Completed</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight text-white">
            Competitions Management
          </h1>
          <p className="text-xs text-gray-400 font-semibold mt-0.5">
            Configure leagues, matchday deadlines, participants, teams, and tournament progression.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-5 py-3 bg-[#e90052] text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg hover:bg-[#ff2882] transition"
        >
          <Plus className="w-4 h-4" /> Create New Tournament
        </button>
      </div>

      {/* Grid: Competition selector (left) & Competition detail (right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Tournament Cards List (4 cols) */}
        <div className="lg:col-span-4 space-y-3">
          <h2 className="text-xs font-black uppercase text-gray-400 tracking-wider">
            All Competitions ({competitions.length})
          </h2>

          {loading ? (
            <p className="text-xs text-gray-500 py-4">Loading tournaments...</p>
          ) : competitions.length === 0 ? (
            <div className="p-6 bg-[#0d163a] border border-blue-900/40 rounded-2xl text-center text-xs text-gray-400">
              No competitions created yet.
            </div>
          ) : (
            competitions.map((comp) => {
              const isSelected = selectedComp?.id === comp.id;
              return (
                <div
                  key={comp.id}
                  onClick={() => selectCompetition(comp)}
                  className={`p-4 rounded-2xl cursor-pointer border transition text-left relative overflow-hidden ${
                    isSelected
                      ? "bg-white text-gray-900 border-[#00b4ff] shadow-xl"
                      : "bg-[#0d163a] text-white border-blue-900/40 hover:bg-[#101c4e]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">
                      {comp.type} • {comp.season}
                    </span>
                    {getStatusBadge(comp.status)}
                  </div>

                  <h3 className="font-black text-base uppercase tracking-tight leading-tight">
                    {comp.name}
                  </h3>

                  {comp.description && (
                    <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                      {comp.description}
                    </p>
                  )}

                  <div className="flex items-center gap-3 mt-3 text-xs opacity-80">
                    <span className="flex items-center gap-1 font-bold">
                      <Users className="w-3.5 h-3.5" />
                      {comp.registeredCount || 0}
                      {comp.maxParticipants ? ` / ${comp.maxParticipants}` : ""}
                    </span>
                    <span className="font-bold">
                      Format: {comp.format.replace("_", " ")}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right: Competition Detail & Participants Review (8 cols) */}
        <div className="lg:col-span-8">
          {selectedComp ? (
            <div className="bg-white text-gray-900 rounded-2xl shadow-xl overflow-hidden border border-blue-900/20">
              {/* Competition Banner Card */}
              <div className="relative bg-gradient-to-r from-[#0a1128] via-[#101c4e] to-[#1a237e] text-white p-6 md:p-8 overflow-hidden">
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-black/40 border-2 border-[#e5b53e] p-2 flex items-center justify-center shrink-0 shadow-lg">
                      {selectedComp.badgeKey ? (
                        <img
                          src={selectedComp.badgeKey}
                          alt="Badge"
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <Trophy className="w-8 h-8 text-[#e5b53e]" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-black uppercase text-[#e5b53e] tracking-widest">
                          {selectedComp.type} • {selectedComp.season}
                        </span>
                        {getStatusBadge(selectedComp.status)}
                      </div>
                      <h2 className="text-2xl font-black uppercase tracking-tight text-white">
                        {selectedComp.name}
                      </h2>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => openEditModal(selectedComp)}
                      className="flex items-center gap-1 px-3 py-2 bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition"
                    >
                      <Edit className="w-3.5 h-3.5" /> Edit
                    </button>

                    <button
                      onClick={handleDeleteCompetition}
                      disabled={submitting}
                      className="flex items-center gap-1 px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-200 hover:text-white font-bold text-xs uppercase tracking-wider rounded-xl transition border border-red-500/30 disabled:opacity-50"
                      title="Delete competition"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>

                    {selectedComp.status === "REGISTRATION_OPEN" && (
                      <button
                        onClick={handleCloseRegistration}
                        className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-gray-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition"
                      >
                        <Lock className="w-3.5 h-3.5" /> Close Reg
                      </button>
                    )}

                    {selectedComp.status === "REGISTRATION_CLOSED" && (
                      <div className="flex flex-col items-end">
                        <button
                          onClick={handleStartCompetition}
                          disabled={pendingParticipantsCount > 0}
                          title={
                            pendingParticipantsCount > 0
                              ? "Cannot start competition while pending registrations exist."
                              : "Launch competition"
                          }
                          className="flex items-center gap-1.5 px-5 py-2.5 bg-[#00c853] hover:bg-emerald-400 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <Play className="w-4 h-4 fill-current" /> Start Competition
                        </button>
                        {pendingParticipantsCount > 0 && (
                          <span className="text-[10px] text-red-300 font-bold mt-1">
                            ⚠️ {pendingParticipantsCount} pending approvals left
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Tournament Description & Specs */}
              <div className="p-6 bg-slate-50 border-b border-gray-200 space-y-4">
                {selectedComp.description && (
                  <div>
                    <span className="text-gray-500 font-bold block uppercase text-[10px] mb-1">
                      Description
                    </span>
                    <p className="text-xs text-gray-700 leading-relaxed font-medium">
                      {selectedComp.description}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs pt-2 border-t border-gray-200">
                  <div>
                    <span className="text-gray-500 font-bold block uppercase text-[10px]">
                      Format
                    </span>
                    <span className="font-black text-gray-900">
                      {selectedComp.format.replace("_", " ")}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 font-bold block uppercase text-[10px]">
                      Matchday Duration
                    </span>
                    <span className="font-black text-gray-900 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-[#00b4ff]" />
                      {selectedComp.matchdayDurationHours || 24} Hours
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 font-bold block uppercase text-[10px]">
                      Max Capacity
                    </span>
                    <span className="font-black text-gray-900">
                      {selectedComp.maxParticipants || "Unlimited"}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 font-bold block uppercase text-[10px]">
                      Matchday Ends At
                    </span>
                    <span className="font-black text-gray-900">
                      {selectedComp.matchdayEndsAt
                        ? new Date(selectedComp.matchdayEndsAt).toLocaleString()
                        : "Not set"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Participants & Teams Section */}
              <div className="p-6 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="font-black text-sm uppercase tracking-wider text-gray-900">
                      Participants & Teams ({participants.length})
                    </h3>
                    <p className="text-xs text-gray-500">
                      Assign players to specific club teams for this competition.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCreateTeamOpen(true)}
                      className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-xs font-bold transition flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> New Team
                    </button>
                    <button
                      onClick={openLinkPlayerModal}
                      className="px-3.5 py-1.5 bg-[#00b4ff] hover:bg-[#009bdc] text-[#0a1128] rounded-lg text-xs font-black uppercase tracking-wider transition flex items-center gap-1 shadow-sm"
                    >
                      <Plus className="w-3.5 h-3.5" /> Link Player
                    </button>
                  </div>
                </div>

                {detailLoading ? (
                  <p className="text-xs text-gray-500 py-4">Loading roster...</p>
                ) : participants.length === 0 ? (
                  <div className="p-8 text-center text-gray-400 bg-gray-50 rounded-2xl border border-dashed border-gray-300">
                    <Users className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-xs font-bold text-gray-600">No participants registered yet.</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      Use the &quot;Link Player&quot; button above to manually add competitors and their teams.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100 border rounded-xl overflow-hidden shadow-xs">
                    {participants.map((part) => {
                      const displayTeam = part.teamName || part.team?.name || part.player.teamName;
                      const displayLogo = part.teamLogoUrl || part.team?.logoUrl || part.player.avatarUrl;

                      return (
                        <div
                          key={part.id}
                          className="p-3.5 flex items-center justify-between text-xs hover:bg-blue-50/40 transition"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-gray-100 border overflow-hidden flex items-center justify-center shrink-0">
                              {part.player.avatarUrl ? (
                                <img
                                  src={part.player.avatarUrl}
                                  alt="avatar"
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <Users className="w-4 h-4 text-gray-400" />
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-black text-gray-900 block">
                                  @{part.player.username}
                                </span>
                                {part.player.nationality && (
                                  <span className="text-[10px] text-gray-400 font-mono uppercase">
                                    [{part.player.nationality}]
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                {displayLogo && (
                                  <img
                                    src={displayLogo}
                                    alt="crest"
                                    className="w-4 h-4 object-contain"
                                  />
                                )}
                                <span className="text-xs text-blue-900 font-bold">
                                  {displayTeam}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            {part.status === "PENDING" && (
                              <span className="px-2.5 py-0.5 bg-amber-100 text-amber-800 font-black text-[10px] rounded-full uppercase">
                                Pending
                              </span>
                            )}
                            {part.status === "APPROVED" && (
                              <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 font-black text-[10px] rounded-full uppercase">
                                Approved
                              </span>
                            )}
                            {part.status === "REJECTED" && (
                              <span className="px-2.5 py-0.5 bg-red-100 text-red-800 font-black text-[10px] rounded-full uppercase">
                                Rejected
                              </span>
                            )}
                            {part.status === "WITHDRAWN" && (
                              <span className="px-2.5 py-0.5 bg-gray-100 text-gray-600 font-black text-[10px] rounded-full uppercase">
                                Withdrawn
                              </span>
                            )}

                            {/* Actions */}
                            <div className="flex items-center gap-1.5">
                              {part.status !== "APPROVED" && (
                                <button
                                  onClick={() => handleParticipantStatus(part.id, "approve")}
                                  className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg transition"
                                  title="Approve Registration"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </button>
                              )}
                              {part.status !== "REJECTED" && (
                                <button
                                  onClick={() => handleParticipantStatus(part.id, "reject")}
                                  className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg transition"
                                  title="Reject Registration"
                                >
                                  <XCircle className="w-4 h-4" />
                                </button>
                              )}
                              <button
                                onClick={() => handleRemoveParticipant(part.id, part.player.username)}
                                className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition"
                                title="Remove Participant"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Fixtures & Tournament Bracket Section */}
              <div className="p-6 bg-slate-50 border-t border-gray-200 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-black text-sm uppercase tracking-wider text-gray-900">
                        Fixtures & Match Schedule ({matches.length})
                      </h3>
                      {selectedComp.currentMatchday && (
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-900 font-black text-[10px] rounded-full uppercase">
                          Matchday {selectedComp.currentMatchday}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">
                      Manage kickoff schedules, automated brackets, and record official results.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {matches.length === 0 && selectedComp.status === "IN_PROGRESS" && (
                      <>
                        {selectedComp.format === "ROUND_ROBIN" && (
                          <button
                            onClick={handleGenerateFixtures}
                            disabled={submitting}
                            className="px-3.5 py-1.5 bg-[#00c853] hover:bg-emerald-400 text-white rounded-lg text-xs font-black uppercase tracking-wider transition flex items-center gap-1 shadow-sm disabled:opacity-50"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" /> Generate Fixtures
                          </button>
                        )}
                        {selectedComp.format === "KNOCKOUT" && (
                          <button
                            onClick={handleGenerateKnockout}
                            disabled={submitting}
                            className="px-3.5 py-1.5 bg-[#00c853] hover:bg-emerald-400 text-white rounded-lg text-xs font-black uppercase tracking-wider transition flex items-center gap-1 shadow-sm disabled:opacity-50"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" /> Generate Bracket
                          </button>
                        )}
                        {selectedComp.format === "GROUP_STAGE" && (
                          <button
                            onClick={handleDrawGroups}
                            disabled={submitting}
                            className="px-3.5 py-1.5 bg-[#00c853] hover:bg-emerald-400 text-white rounded-lg text-xs font-black uppercase tracking-wider transition flex items-center gap-1 shadow-sm disabled:opacity-50"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" /> Draw Groups & Fixtures
                          </button>
                        )}
                      </>
                    )}

                    {matches.length > 0 && selectedComp.format === "GROUP_STAGE" && (
                      <button
                        onClick={handleQualifyKnockout}
                        disabled={submitting}
                        className="px-3.5 py-1.5 bg-[#00b4ff] hover:bg-sky-400 text-[#0a1128] rounded-lg text-xs font-black uppercase tracking-wider transition flex items-center gap-1 shadow-sm disabled:opacity-50"
                      >
                        <Trophy className="w-3.5 h-3.5" /> Qualify to Knockout
                      </button>
                    )}

                    {matches.length > 0 && (
                      <button
                        onClick={handleDeleteAllFixtures}
                        disabled={submitting}
                        className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-xs font-bold transition flex items-center gap-1 disabled:opacity-50"
                        title="Delete all generated matches"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Reset Fixtures
                      </button>
                    )}
                  </div>
                </div>

                {matches.length === 0 ? (
                  <div className="p-8 text-center text-gray-400 bg-white rounded-2xl border border-dashed border-gray-300">
                    <Calendar className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-xs font-bold text-gray-600">No fixtures generated yet.</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      {selectedComp.status === "IN_PROGRESS"
                        ? "Click the button above to generate the tournament fixtures and matchdays."
                        : "Tournament must be IN_PROGRESS with approved participants before generating fixtures."}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Render matches grouped by matchday or stage */}
                    {Array.from(
                      new Set(
                        matches.map((m) =>
                          m.stage ? m.stage : m.matchday ? `Matchday ${m.matchday}` : "Other Matches"
                        )
                      )
                    ).map((groupTitle) => {
                      const groupMatches = matches.filter(
                        (m) =>
                          (m.stage ? m.stage : m.matchday ? `Matchday ${m.matchday}` : "Other Matches") ===
                          groupTitle
                      );

                      return (
                        <div key={groupTitle} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-xs">
                          <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                            <span className="font-black text-xs uppercase tracking-wider text-gray-800">
                              {groupTitle.replace("_", " ")}
                            </span>
                            <span className="text-[10px] text-gray-400 font-bold">
                              {groupMatches.length} {groupMatches.length === 1 ? "fixture" : "fixtures"}
                            </span>
                          </div>

                          <div className="divide-y divide-gray-100">
                            {groupMatches.map((m) => {
                              const homeName = m.homePlayer?.username ? `@${m.homePlayer.username}` : "TBD";
                              const awayName = m.awayPlayer?.username ? `@${m.awayPlayer.username}` : "TBD";
                              const homeClub = m.homePlayer?.teamName || "Club TBD";
                              const awayClub = m.awayPlayer?.teamName || "Club TBD";
                              const isPlayed = m.isCompleted;

                              return (
                                <div
                                  key={m.id}
                                  className="p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-blue-50/20 transition"
                                >
                                  {/* Match Details */}
                                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-12 items-center gap-2">
                                    {/* Home Team */}
                                    <div className="sm:col-span-5 flex items-center justify-start sm:justify-end gap-2 text-right">
                                      <div>
                                        <span className={`text-xs block font-bold ${isPlayed && m.homeScore > m.awayScore ? "text-emerald-700 font-black" : "text-gray-900"}`}>
                                          {homeName}
                                        </span>
                                        <span className="text-[10px] text-gray-400 font-semibold block">
                                          {homeClub}
                                        </span>
                                      </div>
                                    </div>

                                    {/* Score / VS Display */}
                                    <div className="sm:col-span-2 text-center py-1 sm:py-0">
                                      {isPlayed ? (
                                        <div className="inline-flex flex-col items-center">
                                          <div className="px-3 py-1 bg-gray-900 text-white rounded-lg font-black text-xs tracking-widest shadow-xs">
                                            {m.homeScore} - {m.awayScore}
                                          </div>
                                          {m.homePenalty !== null && m.awayPenalty !== null && (
                                            <span className="text-[9px] text-amber-700 font-black mt-0.5">
                                              (Pen: {m.homePenalty} - {m.awayPenalty})
                                            </span>
                                          )}
                                        </div>
                                      ) : (
                                        <span className="px-2.5 py-1 bg-gray-100 text-gray-500 rounded-md font-black text-[11px] uppercase tracking-wider">
                                          VS
                                        </span>
                                      )}
                                    </div>

                                    {/* Away Team */}
                                    <div className="sm:col-span-5 flex items-center justify-start gap-2 text-left">
                                      <div>
                                        <span className={`text-xs block font-bold ${isPlayed && m.awayScore > m.homeScore ? "text-emerald-700 font-black" : "text-gray-900"}`}>
                                          {awayName}
                                        </span>
                                        <span className="text-[10px] text-gray-400 font-semibold block">
                                          {awayClub}
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Schedule & Action */}
                                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-0 border-gray-100">
                                    <div className="text-left sm:text-right">
                                      <span className="text-[10px] font-bold text-gray-500 block">
                                        {m.scheduledAt
                                          ? new Date(m.scheduledAt).toLocaleString([], {
                                              month: "short",
                                              day: "numeric",
                                              hour: "2-digit",
                                              minute: "2-digit",
                                            })
                                          : "Scheduled date TBD"}
                                      </span>
                                      {m.legNumber && (
                                        <span className="text-[9px] font-black uppercase text-blue-600 block">
                                          Leg {m.legNumber}
                                        </span>
                                      )}
                                    </div>

                                    <button
                                      onClick={() => openResultModal(m)}
                                      disabled={!m.homePlayerId || !m.awayPlayerId}
                                      className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition ${
                                        isPlayed
                                          ? "bg-gray-100 hover:bg-gray-200 text-gray-700"
                                          : "bg-[#00b4ff] hover:bg-[#009bdc] text-[#0a1128] shadow-xs"
                                      } disabled:opacity-30 disabled:cursor-not-allowed`}
                                    >
                                      {isPlayed ? "Edit Score" : "Enter Result"}
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-gray-400 bg-[#0d163a] rounded-2xl border border-blue-900/40">
              Select a tournament on the left to review details and participants.
            </div>
          )}
        </div>
      </div>

      {/* CREATE COMPETITION MODAL */}
      {createOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white text-gray-900 rounded-2xl max-w-xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <h3 className="font-black text-lg uppercase tracking-tight text-gray-900">
                Create New Tournament
              </h3>
              <button onClick={() => setCreateOpen(false)} className="text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="mt-4 p-3 bg-red-50 text-red-700 text-xs rounded-xl">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-4 mt-4 text-xs font-semibold">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Tournament Name *</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. EFF Premier League"
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Season Identifier *</label>
                  <input
                    type="text"
                    required
                    value={formSeason}
                    onChange={(e) => setFormSeason(e.target.value)}
                    placeholder="e.g. Season 1 (2026)"
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">Competition Description</label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Overview, rules summary, and prize structure..."
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">Additional Info (Collapsible Accordion / JSON)</label>
                <textarea
                  rows={2}
                  value={formAdditionalInfo}
                  onChange={(e) => setFormAdditionalInfo(e.target.value)}
                  placeholder="Optional details, match schedule guidelines, platform requirements..."
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Type</label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as any)}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="LEAGUE">League</option>
                    <option value="CUP">Cup</option>
                    <option value="CUSTOM">Custom</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Format</label>
                  <select
                    value={formFormat}
                    onChange={(e) => setFormFormat(e.target.value as any)}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="ROUND_ROBIN">Round Robin</option>
                    <option value="KNOCKOUT">Knockout</option>
                    <option value="GROUP_STAGE">Group Stage</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Initial Status</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    className="w-full px-3 py-2 border rounded-lg font-bold"
                  >
                    <option value="REGISTRATION_OPEN">Registration Open</option>
                    <option value="DRAFT">Draft</option>
                    <option value="REGISTRATION_CLOSED">Registration Closed</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Competition Start Date</label>
                  <input
                    type="datetime-local"
                    value={formStartDate}
                    onChange={(e) => setFormStartDate(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Matchday Duration (Hours)</label>
                  <input
                    type="number"
                    value={formMatchdayDuration}
                    onChange={(e) => setFormMatchdayDuration(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>

              {/* Legs Configuration */}
              <div className="grid grid-cols-2 gap-4 p-3 bg-gray-50 border rounded-xl">
                <div>
                  <label className="block text-gray-700 font-bold mb-1">
                    Round-Robin Legs
                  </label>
                  <select
                    value={formRoundRobinLegs}
                    onChange={(e) => setFormRoundRobinLegs(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg bg-white"
                  >
                    <option value="1">Single Round-Robin (1 Leg)</option>
                    <option value="2">Double Round-Robin (2 Legs - Home & Away)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-700 font-bold mb-1">
                    Knockout Ties
                  </label>
                  <select
                    value={formKnockoutLegs}
                    onChange={(e) => setFormKnockoutLegs(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg bg-white"
                  >
                    <option value="1">Single-Leg Ties</option>
                    <option value="2">Two-Leg Ties (Aggregate & Away Goals)</option>
                  </select>
                </div>
              </div>

              {/* Group Stage Setup (Conditional) */}
              {formFormat === "GROUP_STAGE" && (
                <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-xl space-y-2">
                  <span className="block text-[11px] font-black uppercase text-blue-900 tracking-wider">
                    Group Stage Configuration
                  </span>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-gray-700 font-bold mb-1">Group Count</label>
                      <input
                        type="number"
                        min="2"
                        value={formGroupCount}
                        onChange={(e) => setFormGroupCount(e.target.value)}
                        className="w-full px-3 py-1.5 border rounded-lg bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-700 font-bold mb-1">Teams Per Group</label>
                      <input
                        type="number"
                        min="2"
                        value={formTeamsPerGroup}
                        onChange={(e) => setFormTeamsPerGroup(e.target.value)}
                        className="w-full px-3 py-1.5 border rounded-lg bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-700 font-bold mb-1">Qualifiers / Group</label>
                      <input
                        type="number"
                        min="1"
                        value={formQualifiersPerGroup}
                        onChange={(e) => setFormQualifiersPerGroup(e.target.value)}
                        className="w-full px-3 py-1.5 border rounded-lg bg-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Registration Opens At</label>
                  <input
                    type="datetime-local"
                    value={formRegOpenAt}
                    onChange={(e) => setFormRegOpenAt(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Registration Closes At (Countdown)</label>
                  <input
                    type="datetime-local"
                    value={formRegCloseAt}
                    onChange={(e) => setFormRegCloseAt(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Max Participants</label>
                  <input
                    type="number"
                    value={formMaxParticipants}
                    onChange={(e) => setFormMaxParticipants(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="reqApp"
                    checked={formRequiresApproval}
                    onChange={(e) => setFormRequiresApproval(e.target.checked)}
                    className="w-4 h-4 text-[#e90052] rounded"
                  />
                  <label htmlFor="reqApp" className="text-gray-700 font-bold cursor-pointer">
                    Require Admin Approval
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">Competition Badge (Upload to eff-assets)</label>
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, "badges", (url) => setBadgeUrl(url))}
                    className="text-xs"
                  />
                  {badgeUrl && (
                    <img src={badgeUrl} alt="Badge" className="w-8 h-8 object-contain border rounded" />
                  )}
                </div>
              </div>

              <div className="pt-4 border-t flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCreateOpen(false)}
                  className="px-4 py-2 border rounded-lg text-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-[#e90052] text-white font-bold rounded-lg hover:bg-[#ff2882] transition disabled:opacity-50"
                >
                  {submitting ? "Creating..." : "Create Competition"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT COMPETITION MODAL */}
      {editOpen && selectedComp && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white text-gray-900 rounded-2xl max-w-xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <h3 className="font-black text-lg uppercase tracking-tight text-gray-900">
                Edit Tournament: {selectedComp.name}
              </h3>
              <button onClick={() => setEditOpen(false)} className="text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="mt-4 p-3 bg-red-50 text-red-700 text-xs rounded-xl">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleEdit} className="space-y-4 mt-4 text-xs font-semibold">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Tournament Name *</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Season Identifier *</label>
                  <input
                    type="text"
                    required
                    value={formSeason}
                    onChange={(e) => setFormSeason(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">Description</label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">Additional Info</label>
                <textarea
                  rows={2}
                  value={formAdditionalInfo}
                  onChange={(e) => setFormAdditionalInfo(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Competition Start Date</label>
                  <input
                    type="datetime-local"
                    value={formStartDate}
                    onChange={(e) => setFormStartDate(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Matchday Duration (Hours)</label>
                  <input
                    type="number"
                    value={formMatchdayDuration}
                    onChange={(e) => setFormMatchdayDuration(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>

              {/* Legs Configuration */}
              <div className="grid grid-cols-2 gap-4 p-3 bg-gray-50 border rounded-xl">
                <div>
                  <label className="block text-gray-700 font-bold mb-1">
                    Round-Robin Legs
                  </label>
                  <select
                    value={formRoundRobinLegs}
                    onChange={(e) => setFormRoundRobinLegs(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg bg-white"
                  >
                    <option value="1">Single Round-Robin (1 Leg)</option>
                    <option value="2">Double Round-Robin (2 Legs - Home & Away)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-700 font-bold mb-1">
                    Knockout Ties
                  </label>
                  <select
                    value={formKnockoutLegs}
                    onChange={(e) => setFormKnockoutLegs(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg bg-white"
                  >
                    <option value="1">Single-Leg Ties</option>
                    <option value="2">Two-Leg Ties (Aggregate & Away Goals)</option>
                  </select>
                </div>
              </div>

              {/* Group Stage Setup (Conditional) */}
              {formFormat === "GROUP_STAGE" && (
                <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-xl space-y-2">
                  <span className="block text-[11px] font-black uppercase text-blue-900 tracking-wider">
                    Group Stage Configuration
                  </span>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-gray-700 font-bold mb-1">Group Count</label>
                      <input
                        type="number"
                        min="2"
                        value={formGroupCount}
                        onChange={(e) => setFormGroupCount(e.target.value)}
                        className="w-full px-3 py-1.5 border rounded-lg bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-700 font-bold mb-1">Teams Per Group</label>
                      <input
                        type="number"
                        min="2"
                        value={formTeamsPerGroup}
                        onChange={(e) => setFormTeamsPerGroup(e.target.value)}
                        className="w-full px-3 py-1.5 border rounded-lg bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-700 font-bold mb-1">Qualifiers / Group</label>
                      <input
                        type="number"
                        min="1"
                        value={formQualifiersPerGroup}
                        onChange={(e) => setFormQualifiersPerGroup(e.target.value)}
                        className="w-full px-3 py-1.5 border rounded-lg bg-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Status</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    className="w-full px-3 py-2 border rounded-lg font-bold"
                  >
                    <option value="DRAFT">Draft</option>
                    <option value="REGISTRATION_OPEN">Registration Open</option>
                    <option value="REGISTRATION_CLOSED">Registration Closed</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="COMPLETED">Completed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Registration Closes At</label>
                  <input
                    type="datetime-local"
                    value={formRegCloseAt}
                    onChange={(e) => setFormRegCloseAt(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>

              <div className="pt-4 border-t flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditOpen(false)}
                  className="px-4 py-2 border rounded-lg text-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-[#00b4ff] text-[#0a1128] font-black rounded-lg hover:bg-[#009bdc] transition disabled:opacity-50"
                >
                  {submitting ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LINK PLAYER MODAL */}
      {linkPlayerOpen && selectedComp && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white text-gray-900 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b">
              <h3 className="font-black text-base uppercase tracking-tight text-gray-900">
                Link Player to {selectedComp.name}
              </h3>
              <button onClick={() => setLinkPlayerOpen(false)} className="text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleLinkPlayer} className="space-y-4 mt-4 text-xs font-semibold">
              {/* Select Player */}
              <div>
                <label className="block text-gray-700 font-bold mb-1">Select Player *</label>
                <input
                  type="text"
                  placeholder="Filter players by username..."
                  value={linkPlayerSearch}
                  onChange={(e) => setLinkPlayerSearch(e.target.value)}
                  className="w-full px-3 py-1.5 border rounded-lg mb-2 text-xs"
                />
                <select
                  required
                  value={linkSelectedPlayerId}
                  onChange={(e) => {
                    const pid = e.target.value;
                    setLinkSelectedPlayerId(pid);
                    const selected = allPlayers.find((p) => p.id === pid);
                    if (selected) {
                      if (selected.nationality) {
                        setLinkNationality(selected.nationality);
                        setLinkNationSearch(`${selected.nationality}`);
                      }
                      if (!linkTeamName && !linkSelectedTeamId) {
                        setLinkTeamName(selected.teamName);
                        setLinkTeamSearch(selected.teamName);
                      }
                    }
                  }}
                  className="w-full px-3 py-2 border rounded-lg font-bold"
                >
                  <option value="">-- Choose Player --</option>
                  {filteredPlayersForLink.map((p) => (
                    <option key={p.id} value={p.id}>
                      @{p.username} ({p.teamName})
                    </option>
                  ))}
                </select>
              </div>

              {/* Tournament Club Selection */}
              <div>
                <label className="block text-gray-700 font-bold mb-1">
                  Tournament Club <span className="text-red-500">*</span>
                </label>

                <SearchableTeamSelect
                  value={linkTeamName}
                  takenTeamSlugs={takenSlugsInAdminComp}
                  allowOverride={linkAdminOverride}
                  onChange={(team) => {
                    if (team) {
                      setLinkTeamName(team.name);
                      setLinkSelectedTeamId(team.id);
                    } else {
                      setLinkTeamName("");
                      setLinkSelectedTeamId(null);
                    }
                  }}
                  placeholder="Search club by name or alias (e.g. Man City, Arsenal, Enyimba)..."
                  required
                />

                {/* Admin Override Checkbox */}
                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="checkbox"
                    id="linkAdminOverride"
                    checked={linkAdminOverride}
                    onChange={(e) => setLinkAdminOverride(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label
                    htmlFor="linkAdminOverride"
                    className="text-[11px] font-bold text-gray-600 cursor-pointer select-none"
                  >
                    Force assign (allow assigning taken teams)
                  </label>
                </div>
              </div>

              {/* Nationality Searchable Dropdown */}
              <div>
                <label className="block text-gray-700 font-bold mb-1">
                  Player Nationality (FIFA / ISO)
                </label>
                <SearchableCountrySelect
                  value={linkNationality}
                  onChange={(country) => {
                    if (country) {
                      setLinkNationality(country.code);
                    } else {
                      setLinkNationality("");
                    }
                  }}
                  placeholder="Search nation by name or code (e.g. Nigeria, NG, Spain)..."
                />
              </div>

              {/* Team Crest Logo */}
              <div>
                <label className="block text-gray-700 font-bold mb-1">
                  Team Crest Logo (Upload)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      handleFileUpload(e, "team-logos", (url) => setLinkTeamLogoUrl(url))
                    }
                    className="text-xs"
                  />
                  {linkTeamLogoUrl && (
                    <img
                      src={linkTeamLogoUrl}
                      alt="Team Logo"
                      className="w-7 h-7 object-contain border rounded"
                    />
                  )}
                </div>
              </div>

              <div className="pt-3 border-t flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setLinkPlayerOpen(false)}
                  className="px-4 py-2 border rounded-lg text-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !linkSelectedPlayerId}
                  className="px-5 py-2 bg-[#00b4ff] text-[#0a1128] font-bold rounded-lg hover:bg-[#009bdc] transition disabled:opacity-50"
                >
                  {submitting ? "Linking..." : "Confirm & Enroll"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE TEAM MODAL */}
      {createTeamOpen && selectedComp && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white text-gray-900 rounded-2xl max-w-sm w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b">
              <h3 className="font-black text-base uppercase tracking-tight text-gray-900">
                Add Team to {selectedComp.name}
              </h3>
              <button onClick={() => setCreateTeamOpen(false)} className="text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTeam} className="space-y-4 mt-4 text-xs font-semibold">
              <div>
                <label className="block text-gray-700 font-bold mb-1">Team Name *</label>
                <input
                  type="text"
                  required
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  placeholder="e.g. Manchester City"
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">Team Crest Logo (Upload)</label>
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, "team-logos", (url) => setNewTeamLogoUrl(url))}
                    className="text-xs"
                  />
                  {newTeamLogoUrl && (
                    <img src={newTeamLogoUrl} alt="Team Crest" className="w-7 h-7 object-contain border" />
                  )}
                </div>
              </div>

              <div className="pt-3 border-t flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCreateTeamOpen(false)}
                  className="px-4 py-2 border rounded-lg text-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !newTeamName}
                  className="px-5 py-2 bg-[#0a1128] text-white font-bold rounded-lg hover:bg-[#1a237e] transition disabled:opacity-50"
                >
                  {submitting ? "Saving..." : "Create Team"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ENTER MATCH RESULT MODAL */}
      {resultModalOpen && selectedMatchForResult && selectedComp && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white text-gray-900 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b">
              <div>
                <h3 className="font-black text-base uppercase tracking-tight text-gray-900">
                  Record Match Result
                </h3>
                <span className="text-[11px] text-gray-500 font-bold">
                  {selectedMatchForResult.stage
                    ? selectedMatchForResult.stage.replace("_", " ")
                    : selectedMatchForResult.matchday
                    ? `Matchday ${selectedMatchForResult.matchday}`
                    : "Fixture"}
                  {selectedMatchForResult.legNumber ? ` • Leg ${selectedMatchForResult.legNumber}` : ""}
                </span>
              </div>
              <button onClick={() => setResultModalOpen(false)} className="text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveResult} className="space-y-5 mt-4 text-xs font-semibold">
              {/* Matchup Header */}
              <div className="p-4 bg-slate-50 border rounded-xl flex items-center justify-between text-center">
                <div className="flex-1">
                  <span className="text-xs font-black block text-gray-900">
                    @{selectedMatchForResult.homePlayer?.username || "TBD"}
                  </span>
                  <span className="text-[10px] text-gray-400 block font-semibold">
                    {selectedMatchForResult.homePlayer?.teamName || "Club"}
                  </span>
                </div>
                <span className="px-2 py-1 bg-gray-200 text-gray-600 rounded text-[10px] font-black uppercase">
                  VS
                </span>
                <div className="flex-1">
                  <span className="text-xs font-black block text-gray-900">
                    @{selectedMatchForResult.awayPlayer?.username || "TBD"}
                  </span>
                  <span className="text-[10px] text-gray-400 block font-semibold">
                    {selectedMatchForResult.awayPlayer?.teamName || "Club"}
                  </span>
                </div>
              </div>

              {/* Score Inputs */}
              <div>
                <label className="block text-gray-700 font-bold mb-2 text-center uppercase tracking-wider text-[11px]">
                  Final Score (Normal / Extra Time)
                </label>
                <div className="grid grid-cols-2 gap-4 items-center">
                  <div>
                    <label className="block text-gray-500 font-bold text-[10px] mb-1">
                      {selectedMatchForResult.homePlayer?.username || "Home"} Score *
                    </label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={scoreHome}
                      onChange={(e) => setScoreHome(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-center text-lg font-black"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-500 font-bold text-[10px] mb-1">
                      {selectedMatchForResult.awayPlayer?.username || "Away"} Score *
                    </label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={scoreAway}
                      onChange={(e) => setScoreAway(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-center text-lg font-black"
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>

              {/* Penalty Shootout Inputs (Optional / Knockout) */}
              {(selectedComp.format === "KNOCKOUT" || selectedMatchForResult.stage) && (
                <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl space-y-2">
                  <span className="block text-[11px] font-black uppercase text-amber-900 tracking-wider">
                    Penalty Shootout (If Tied on Aggregate)
                  </span>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-600 font-bold text-[10px] mb-1">
                        Home Penalties
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={penHome}
                        onChange={(e) => setPenHome(e.target.value)}
                        className="w-full px-3 py-1.5 border rounded-lg text-center font-bold bg-white"
                        placeholder="Optional"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-600 font-bold text-[10px] mb-1">
                        Away Penalties
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={penAway}
                        onChange={(e) => setPenAway(e.target.value)}
                        className="w-full px-3 py-1.5 border rounded-lg text-center font-bold bg-white"
                        placeholder="Optional"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-3 border-t flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setResultModalOpen(false)}
                  className="px-4 py-2 border rounded-lg text-gray-600 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-[#00c853] hover:bg-emerald-500 text-white font-black uppercase tracking-wider rounded-lg transition disabled:opacity-50 shadow-md"
                >
                  {submitting ? "Saving..." : "Confirm & Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
