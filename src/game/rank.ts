export interface Rank {
  title: string;
  /** Cash needed to earn this rank. */
  cash: number;
}

export const RANKS: readonly Rank[] = [
  { title: "Learner's Permit", cash: 0 },
  { title: 'Rookie Cabbie', cash: 400 },
  { title: 'Street Smart', cash: 1000 },
  { title: 'Meter Master', cash: 1800 },
  { title: 'Rush Hour Hero', cash: 2800 },
  { title: 'City Legend', cash: 4000 },
];

/** The best rank a final cash total earns. */
export function rankFor(cash: number): Rank {
  let earned = RANKS[0]!;
  for (const rank of RANKS) {
    if (cash >= rank.cash) earned = rank;
  }
  return earned;
}

/** The next rank to aim for, or null at the top. */
export function nextRank(cash: number): Rank | null {
  return RANKS.find((rank) => rank.cash > cash) ?? null;
}
