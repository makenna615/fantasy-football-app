import type { Player, Position } from "@prisma/client";
import { db } from "@/lib/db";

export type IdentityCandidate = Pick<
  Player,
  "id" | "fullName" | "nflTeam" | "position"
> & {
  externalIds: Array<{ provider: { key: string }; externalId: string }>;
};

export type IdentityInput = {
  providerKey: string;
  externalId: string;
  stableIds?: Record<string, string | undefined>;
  name: string;
  team: string;
  position: Position;
};

export type IdentityResolution =
  | {
      status: "MATCHED";
      player: IdentityCandidate;
      method: "STABLE_ID" | "CONTROLLED_FALLBACK";
      confidence: number;
      evidence: string;
    }
  | { status: "AMBIGUOUS"; candidates: IdentityCandidate[]; evidence: string }
  | { status: "UNMATCHED"; evidence: string };

const suffixes = new Set(["jr", "sr", "ii", "iii", "iv", "v"]);

export function normalizePlayerName(value: string) {
  const tokens = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("en-US")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  while (tokens.length > 1 && suffixes.has(tokens[tokens.length - 1]))
    tokens.pop();
  return tokens.join("");
}

const normalizedTeam = (value: string) => {
  const team = value.toUpperCase();
  return (
    (
      {
        ARZ: "ARI",
        JAC: "JAX",
        LA: "LAR",
        OAK: "LV",
        SD: "LAC",
        STL: "LAR",
      } as Record<string, string>
    )[team] ?? team
  );
};

export class PlayerIdentityResolver {
  constructor(private readonly candidates: IdentityCandidate[]) {}

  resolve(input: IdentityInput): IdentityResolution {
    const stableIds = {
      [input.providerKey]: input.externalId,
      ...input.stableIds,
    };
    const stableMatches = new Map<string, IdentityCandidate>();
    for (const [providerKey, externalId] of Object.entries(stableIds)) {
      if (!externalId) continue;
      for (const candidate of this.candidates) {
        if (
          candidate.externalIds.some(
            (mapping) =>
              mapping.provider.key === providerKey &&
              mapping.externalId === externalId,
          )
        ) {
          stableMatches.set(candidate.id, candidate);
        }
      }
    }
    if (stableMatches.size === 1) {
      return {
        status: "MATCHED",
        player: [...stableMatches.values()][0],
        method: "STABLE_ID",
        confidence: 1,
        evidence: "provider ID crosswalk",
      };
    }
    if (stableMatches.size > 1) {
      return {
        status: "AMBIGUOUS",
        candidates: [...stableMatches.values()],
        evidence: "stable IDs resolve to different canonical players",
      };
    }

    if (input.position === "DST") {
      const defenses = this.candidates.filter(
        (candidate) =>
          candidate.position === "DST" &&
          normalizedTeam(candidate.nflTeam) === normalizedTeam(input.team),
      );
      if (defenses.length === 1)
        return {
          status: "MATCHED",
          player: defenses[0],
          method: "CONTROLLED_FALLBACK",
          confidence: 0.95,
          evidence: "defense team and position",
        };
      if (defenses.length > 1)
        return {
          status: "AMBIGUOUS",
          candidates: defenses,
          evidence: "multiple defense records for team",
        };
      return { status: "UNMATCHED", evidence: "no canonical defense for team" };
    }

    const name = normalizePlayerName(input.name);
    const sameNameAndPosition = this.candidates.filter(
      (candidate) =>
        candidate.position === input.position &&
        normalizePlayerName(candidate.fullName) === name,
    );
    if (sameNameAndPosition.length === 1) {
      const teamMatches =
        normalizedTeam(sameNameAndPosition[0].nflTeam) ===
        normalizedTeam(input.team);
      return {
        status: "MATCHED",
        player: sameNameAndPosition[0],
        method: "CONTROLLED_FALLBACK",
        confidence: teamMatches ? 0.9 : 0.75,
        evidence: teamMatches
          ? "normalized name, team, and position"
          : "unique normalized name and position; team changed",
      };
    }
    const sameTeam = sameNameAndPosition.filter(
      (candidate) =>
        normalizedTeam(candidate.nflTeam) === normalizedTeam(input.team),
    );
    if (sameTeam.length === 1)
      return {
        status: "MATCHED",
        player: sameTeam[0],
        method: "CONTROLLED_FALLBACK",
        confidence: 0.85,
        evidence: "normalized name, team, and position disambiguation",
      };
    if (sameNameAndPosition.length > 1)
      return {
        status: "AMBIGUOUS",
        candidates: sameNameAndPosition,
        evidence:
          "multiple canonical players share normalized name and position",
      };
    return {
      status: "UNMATCHED",
      evidence: "no stable ID or controlled name-position match",
    };
  }
}

export async function loadPlayerIdentityResolver() {
  const candidates = await db.player.findMany({
    include: {
      externalIds: { include: { provider: { select: { key: true } } } },
    },
  });
  return new PlayerIdentityResolver(candidates);
}

export async function persistProviderCrosswalk(args: {
  playerId: string;
  providerId: string;
  externalId: string;
  method: "STABLE_ID" | "CONTROLLED_FALLBACK";
  confidence: number;
}) {
  return db.playerExternalId.upsert({
    where: {
      playerId_providerId: {
        playerId: args.playerId,
        providerId: args.providerId,
      },
    },
    update: {
      externalId: args.externalId,
      matchMethod: args.method,
      confidence: args.confidence,
      verifiedAt: new Date(),
    },
    create: {
      playerId: args.playerId,
      providerId: args.providerId,
      externalId: args.externalId,
      matchMethod: args.method,
      confidence: args.confidence,
      verifiedAt: new Date(),
    },
  });
}
