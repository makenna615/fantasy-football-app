"use client";

import { useMemo, useState } from "react";
import { addProviderWaiverCandidate } from "./actions";

export type ProviderPlayerOption = {
  playerId: string;
  name: string;
  team: string;
  position: string;
  projectedPoints: number;
  provider: string;
};
const searchable = (value: string) =>
  value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
export function filterProviderPlayers(
  players: ProviderPlayerOption[],
  query: string,
) {
  const terms = searchable(query).split(/\s+/).filter(Boolean);
  if (!terms.length) return [];
  return players
    .filter((player) => {
      const value = searchable(
        `${player.name} ${player.team} ${player.position}`,
      );
      return terms.every((term) => value.includes(term));
    })
    .slice(0, 8);
}

export function ProviderPlayerPicker({
  teamId,
  players,
}: {
  teamId: string;
  players: ProviderPlayerOption[];
}) {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const selected = players.find((player) => player.playerId === selectedId);
  const matches = useMemo(
    () => filterProviderPlayers(players, query),
    [players, query],
  );
  return (
    <form action={addProviderWaiverCandidate} className="space-y-3">
      <input type="hidden" name="teamId" value={teamId} />
      <input type="hidden" name="playerId" value={selectedId} />
      <label className="field relative">
        Player name
        <input
          autoComplete="off"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={Boolean(query && !selected)}
          aria-controls="provider-player-suggestions"
          placeholder="Start typing a player name…"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setSelectedId("");
          }}
        />
        {query && !selected && (
          <div
            id="provider-player-suggestions"
            role="listbox"
            className="absolute left-0 right-0 top-full z-20 mt-1 max-h-72 overflow-y-auto rounded-xl border border-[#344154] bg-[#111824] p-1 shadow-xl"
          >
            {matches.map((player) => (
              <button
                type="button"
                role="option"
                aria-selected="false"
                className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-[#202a38]"
                key={player.playerId}
                onClick={() => {
                  setSelectedId(player.playerId);
                  setQuery(player.name);
                }}
              >
                <b>{player.name}</b>
                <small className="ml-2 muted">
                  {player.position} · {player.team} ·{" "}
                  {player.projectedPoints.toFixed(1)} pts
                </small>
              </button>
            ))}
            {!matches.length && (
              <p className="px-3 py-2 text-sm muted">
                No current Tank01 projection matches that search.
              </p>
            )}
          </div>
        )}
      </label>
      {selected && (
        <p className="text-xs text-emerald-300">
          Selected {selected.name} · {selected.provider} ·{" "}
          {selected.projectedPoints.toFixed(1)} projected
        </p>
      )}
      <button
        className="button-primary w-full"
        disabled={!selectedId}
        type="submit"
      >
        Add available player
      </button>
      <p className="text-xs muted">
        Search covers all {players.length} available players with stored
        projections.
      </p>
    </form>
  );
}
