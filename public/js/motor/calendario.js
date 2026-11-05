/* ===================================================================
   MOTOR — CALENDÁRIO (Fase 12, etapa 2, 05/11)
   -------------------------------------------------------------------
   Turno e returno de pontos corridos pelo método do círculo — o mesmo
   generateAllRounds de js/data.js, que continua existindo para o site
   do Brasileirão (decisão de 05/11: o site não muda nesta etapa).
   Devolve { 1: [{home, away}, ...], ..., 2(n-1): [...] }.
=================================================================== */
export function generateAllRounds(teamIds) {
  const teams = [...teamIds];
  if (teams.length % 2 !== 0) teams.push(null);
  const n = teams.length;
  const roundsPerLeg = n - 1;
  const half = n / 2;
  const turno = [];
  let arr = [...teams];
  for (let r = 0; r < roundsPerLeg; r++) {
    const roundMatches = [];
    for (let i = 0; i < half; i++) {
      const home = arr[i];
      const away = arr[n - 1 - i];
      if (home !== null && away !== null) {
        if (r % 2 === 0) roundMatches.push({ home, away });
        else roundMatches.push({ home: away, away: home });
      }
    }
    turno.push(roundMatches);
    const fixed = arr[0];
    const rest = arr.slice(1);
    rest.unshift(rest.pop());
    arr = [fixed, ...rest];
  }
  const returno = turno.map((round) => round.map((m) => ({ home: m.away, away: m.home })));
  const allRounds = {};
  turno.forEach((round, i) => { allRounds[i + 1] = round; });
  returno.forEach((round, i) => { allRounds[roundsPerLeg + i + 1] = round; });
  return allRounds;
}
