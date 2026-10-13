"use client";

import { useState, useMemo } from "react";
import { Tournament, TournamentStats, Court } from "@/lib/types";
import { PlayerStanding } from "@/lib/standings";
import { RoundMatchCard } from "@/components/RoundMatchCard";
import { StandingsTable } from "@/components/StandingsTable";
import { StatsMatrices } from "@/components/StatsMatrices";
import { PlayerWorkloadDashboard } from "@/components/PlayerWorkloadDashboard";

type Tab = "partite" | "classifica" | "giocatori" | "dashboard" | "statistiche";

const TABS: Array<{ id: Tab; label: string }> = [
  { id: "partite", label: "Partite" },
  { id: "classifica", label: "Classifica" },
  { id: "giocatori", label: "Giocatori" },
  { id: "dashboard", label: "Dashboard" },
  { id: "statistiche", label: "Statistiche" },
];

export function TournamentTabs({
  tournament,
  standings,
  stats,
  numberToName,
  isAdmin = false,
  courts = [],
}: {
  tournament: Tournament;
  standings: PlayerStanding[];
  stats: TournamentStats;
  numberToName: Map<number, string>;
  isAdmin?: boolean;
  courts?: Court[];
}) {
  const [activeTab, setActiveTab] = useState<Tab>("partite");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPlayerNumber, setSelectedPlayerNumber] = useState<number | null>(null);

  const clearFilter = () => {
    setSearchQuery("");
    setSelectedPlayerNumber(null);
  };

  const activeFilteredPlayers = useMemo(() => {
    if (selectedPlayerNumber !== null) {
      const p = tournament.players.find((pl) => pl.number === selectedPlayerNumber);
      return p ? [p] : [];
    }
    const q = searchQuery.trim().toLowerCase();
    if (q.length > 0) {
      return tournament.players.filter((p) =>
        p.player.name.toLowerCase().includes(q)
      );
    }
    return null;
  }, [selectedPlayerNumber, searchQuery, tournament.players]);

  const filterPlayerNumbers = useMemo(() => {
    if (!activeFilteredPlayers) return null;
    return new Set(activeFilteredPlayers.map((p) => p.number));
  }, [activeFilteredPlayers]);

  const sortedRounds = useMemo(() => {
    return tournament.rounds.slice().sort((a, b) => a.roundNumber - b.roundNumber);
  }, [tournament.rounds]);

  const filteredRounds = useMemo(() => {
    if (!filterPlayerNumbers) return sortedRounds;

    return sortedRounds.filter((round) => {
      if (!round.match) return false;
      const t1 = round.match.team1Numbers;
      const t2 = round.match.team2Numbers;
      return (
        filterPlayerNumbers.has(t1[0]) ||
        filterPlayerNumbers.has(t1[1]) ||
        filterPlayerNumbers.has(t2[0]) ||
        filterPlayerNumbers.has(t2[1])
      );
    });
  }, [sortedRounds, filterPlayerNumbers]);

  const singlePlayer = activeFilteredPlayers?.length === 1 ? activeFilteredPlayers[0] : null;
  const restingRounds = useMemo(() => {
    if (!singlePlayer) return [];
    return sortedRounds.filter((r) => r.restingNumbers.includes(singlePlayer.number));
  }, [sortedRounds, singlePlayer]);

  const availableTabs = TABS.filter((t) => t.id !== "statistiche" || isAdmin);

  return (
    <div className="space-y-6">
      <div className="flex overflow-x-auto max-w-full bg-white rounded-xl shadow-sm p-1 gap-1">
        {availableTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`shrink-0 whitespace-nowrap px-4 sm:px-6 py-2 text-sm rounded-lg font-semibold transition-colors cursor-pointer ${
              activeTab === tab.id
                ? "bg-primary text-white"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "partite" && (
        <div className="space-y-4">
          {/* Barra di ricerca e filtro giocatore */}
          <div className="bg-white rounded-xl shadow-sm p-3.5 border border-slate-100 space-y-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Cerca giocatore per nome..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setSelectedPlayerNumber(null);
                  }}
                  className="w-full pl-9 pr-8 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                    aria-label="Cancella ricerca"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                )}
              </div>

              <select
                value={selectedPlayerNumber ?? ""}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "") {
                    setSelectedPlayerNumber(null);
                  } else {
                    setSelectedPlayerNumber(Number(val));
                    setSearchQuery("");
                  }
                }}
                className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary cursor-pointer"
              >
                <option value="">Tutti i giocatori</option>
                {tournament.players
                  .slice()
                  .sort((a, b) => a.number - b.number)
                  .map((p) => (
                    <option key={p.id} value={p.number}>
                      #{p.number} {p.player.name}
                    </option>
                  ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              <span className="text-slate-400 shrink-0 font-medium mr-1">Filtro rapido:</span>
              <button
                type="button"
                onClick={clearFilter}
                className={`px-2.5 py-1 rounded-full shrink-0 font-medium transition-colors cursor-pointer ${
                  !filterPlayerNumbers
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Tutti
              </button>
              {tournament.players
                .slice()
                .sort((a, b) => a.number - b.number)
                .map((p) => {
                  const isSelected =
                    selectedPlayerNumber === p.number ||
                    (activeFilteredPlayers?.length === 1 && activeFilteredPlayers[0].number === p.number);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        if (isSelected) {
                          clearFilter();
                        } else {
                          setSelectedPlayerNumber(p.number);
                          setSearchQuery("");
                        }
                      }}
                      className={`px-2.5 py-1 rounded-full shrink-0 font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                        isSelected
                          ? "bg-primary text-white"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      <span className={isSelected ? "text-white/80" : "text-primary font-bold"}>
                        #{p.number}
                      </span>
                      <span>{p.player.name}</span>
                    </button>
                  );
                })}
            </div>
          </div>

          {/* Banner di stato filtro */}
          {activeFilteredPlayers !== null && (
            <>
              {singlePlayer ? (
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-sm">
                  <div>
                    <span className="font-semibold text-slate-900">
                      Partite di {singlePlayer.player.name} (#{singlePlayer.number}):
                    </span>{" "}
                    <span className="text-slate-600 font-medium">
                      {filteredRounds.length} {filteredRounds.length === 1 ? "partita trovata" : "partite trovate"}
                    </span>
                    {restingRounds.length > 0 && (
                      <span className="text-xs text-slate-500 block sm:inline sm:ml-2">
                        &middot; Riposa nei turni: {restingRounds.map((r) => r.roundNumber).join(", ")}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={clearFilter}
                    className="text-xs font-semibold text-primary hover:underline cursor-pointer"
                  >
                    Mostra tutte le partite
                  </button>
                </div>
              ) : activeFilteredPlayers.length > 1 ? (
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-sm">
                  <div>
                    <span className="font-semibold text-slate-900">
                      Giocatori trovati ({activeFilteredPlayers.length}):
                    </span>{" "}
                    <span className="text-slate-600 font-medium">
                      {filteredRounds.length} {filteredRounds.length === 1 ? "partita trovata" : "partite trovate"}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={clearFilter}
                    className="text-xs font-semibold text-primary hover:underline cursor-pointer"
                  >
                    Mostra tutte le partite
                  </button>
                </div>
              ) : (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center text-sm space-y-2">
                  <p className="font-medium text-amber-800">
                    Nessun giocatore trovato con &ldquo;{searchQuery}&rdquo;.
                  </p>
                  <button
                    type="button"
                    onClick={clearFilter}
                    className="text-xs font-semibold bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    Mostra tutte le partite
                  </button>
                </div>
              )}
            </>
          )}

          {/* Lista partite */}
          {filteredRounds.length === 0 && activeFilteredPlayers && activeFilteredPlayers.length > 0 ? (
            <div className="bg-white border border-slate-100 rounded-xl p-8 text-center text-sm text-slate-500 space-y-2">
              <p>Nessuna partita al momento per questo giocatore.</p>
              <button
                type="button"
                onClick={clearFilter}
                className="text-xs font-semibold text-primary hover:underline cursor-pointer"
              >
                Torna a tutte le partite
              </button>
            </div>
          ) : (
            filteredRounds.map((round) => (
              <RoundMatchCard
                key={round.id}
                round={round}
                numberToName={numberToName}
                courts={courts}
                highlightPlayerNumbers={filterPlayerNumbers ?? undefined}
              />
            ))
          )}
        </div>
      )}

      {activeTab === "classifica" && <StandingsTable standings={standings} />}

      {activeTab === "giocatori" && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {tournament.players
            .slice()
            .sort((a, b) => a.number - b.number)
            .map((p) => (
              <div key={p.id} className="bg-white rounded-xl shadow-sm px-4 py-3 text-sm flex items-center gap-2">
                <span className="font-bold text-primary">#{p.number}</span>
                <span className="font-medium text-slate-900">{p.player.name}</span>
              </div>
            ))}
        </div>
      )}

      {activeTab === "dashboard" && (
        <PlayerWorkloadDashboard players={tournament.players} rounds={tournament.rounds} />
      )}

      {activeTab === "statistiche" && (
        <StatsMatrices
          players={tournament.players.map((p) => p.number)}
          stats={stats}
          numberToName={numberToName}
          rounds={tournament.rounds}
        />
      )}
    </div>
  );
}
