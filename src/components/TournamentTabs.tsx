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
  const [selectedPlayerNumber, setSelectedPlayerNumber] = useState<number[]>([]);

  const clearFilter = () => {
    setSearchQuery("");
    setSelectedPlayerNumber([]);
  };

  const activeFilteredPlayers = useMemo(() => {
    if (selectedPlayerNumber.length > 0) {
      return tournament.players.filter((pl) => selectedPlayerNumber.includes(pl.number));
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
      if (filterPlayerNumbers.size > 4) {
        const pairSelected = (t: number[]) =>
          filterPlayerNumbers.has(t[0]) && filterPlayerNumbers.has(t[1]);
        return pairSelected(t1) || pairSelected(t2);
      }
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
          {/* Barra di ricerca e filtro rapido giocatore */}
          <div className="bg-white rounded-2xl shadow-sm p-3.5 sm:p-4 border border-slate-100 space-y-3">
            <div className="relative flex items-center">
              <div className="absolute left-3.5 flex items-center pointer-events-none text-slate-400">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
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
                  setSelectedPlayerNumber([]);
                }}
                className="w-full pl-10 pr-10 py-2 sm:py-2.5 text-sm bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 p-1 text-slate-400 hover:text-slate-600 rounded-full cursor-pointer"
                  aria-label="Cancella ricerca"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 pt-0.5 text-xs">
              <button
                type="button"
                onClick={clearFilter}
                className={`px-3 py-1.5 rounded-full shrink-0 font-semibold transition cursor-pointer text-xs ${
                  !filterPlayerNumbers
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Tutti ({tournament.players.length})
              </button>
              {tournament.players
                .slice()
                .sort((a, b) => a.number - b.number)
                .map((p) => {
                  const isSelected = selectedPlayerNumber.includes(p.number);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setSearchQuery("");
                        setSelectedPlayerNumber((prev) =>
                          prev.includes(p.number)
                            ? prev.filter((n) => n !== p.number)
                            : [...prev, p.number]
                        );
                      }}
                      className={`px-3 py-1.5 rounded-full shrink-0 font-medium transition cursor-pointer inline-flex items-center gap-1.5 text-xs ${
                        isSelected
                          ? "bg-primary text-white shadow-xs ring-2 ring-primary/20"
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
                <div className="bg-white border border-primary/20 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-bold">
                        #{singlePlayer.number} {singlePlayer.player.name}
                      </span>
                      <span className="text-sm font-bold text-slate-900">
                        {filteredRounds.length} {filteredRounds.length === 1 ? "partita programmata" : "partite in programma"}
                      </span>
                    </div>
                    {restingRounds.length > 0 && (
                      <p className="text-xs text-slate-500">
                        Riposa nei turni:{" "}
                        <span className="font-semibold text-slate-700">
                          {restingRounds.map((r) => r.roundNumber).join(", ")}
                        </span>
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={clearFilter}
                    className="self-start sm:self-center shrink-0 px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition cursor-pointer"
                  >
                    Mostra tutte le partite
                  </button>
                </div>
              ) : activeFilteredPlayers.length > 1 ? (
                <div className="bg-white border border-primary/20 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                  <div>
                    <span className="font-semibold text-slate-900 text-sm">
                      Giocatori ({activeFilteredPlayers.length}):
                    </span>{" "}
                    <span className="text-slate-600 font-medium text-sm">
                      {filteredRounds.length} {filteredRounds.length === 1 ? "partita trovata" : "partite trovate"}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={clearFilter}
                    className="self-start sm:self-center shrink-0 px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition cursor-pointer"
                  >
                    Mostra tutte le partite
                  </button>
                </div>
              ) : (
                <div className="bg-white border border-slate-100 rounded-2xl p-8 text-center text-sm space-y-3 shadow-sm">
                  <div className="w-10 h-10 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <p className="text-slate-700 font-medium">
                    Nessun giocatore trovato con &ldquo;{searchQuery}&rdquo;.
                  </p>
                  <button
                    type="button"
                    onClick={clearFilter}
                    className="inline-block px-4 py-2 text-xs font-semibold bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
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
