"use client";

import { useState } from "react";
import { Tournament } from "@/lib/types";
import { PlayerStanding } from "@/lib/standings";
import { TournamentStats } from "@/lib/types";
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
}: {
  tournament: Tournament;
  standings: PlayerStanding[];
  stats: TournamentStats;
  numberToName: Map<number, string>;
}) {
  const [activeTab, setActiveTab] = useState<Tab>("partite");

  return (
    <div className="space-y-6">
      <div className="inline-flex bg-white rounded-xl shadow-sm p-1 gap-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-6 py-2 text-sm rounded-lg font-semibold transition-colors cursor-pointer ${
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
          {tournament.rounds
            .slice()
            .sort((a, b) => a.roundNumber - b.roundNumber)
            .map((round) => (
              <RoundMatchCard
                key={round.id}
                round={round}
                numberToName={numberToName}
                isActive={round.roundNumber === tournament.currentRoundNumber}
              />
            ))}
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
        />
      )}
    </div>
  );
}
