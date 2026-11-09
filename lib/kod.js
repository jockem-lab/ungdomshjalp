// Jämför familjekoden förlåtande: mellanslag och stora/små bokstäver spelar ingen roll.
export function kodStammer(kod) {
  const ratt = String(process.env.FAMILJEKOD || "").trim().toLowerCase();
  return ratt.length > 0 && String(kod || "").trim().toLowerCase() === ratt;
}
