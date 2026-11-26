// Rivalidades cadastradas (PC-003). Cadastro editorial por ID do catálogo
// 2026.11-1, só com clássicos conhecidos. Sem cadastro, o motor não cria o
// evento de clássico (usa um evento compatível com os fatos disponíveis).
const PARES: ReadonlyArray<readonly [string, string, string]> = [
  // Brasil
  ["303", "3422", "Derby Paulista"], ["303", "3496", "Majestoso"], ["303", "3684", "Clássico Alvinegro"],
  ["3422", "3496", "Choque-Rei"], ["3422", "3684", "Clássico da Saudade"], ["3496", "3684", "San-São"],
  ["1024", "1095", "Fla-Flu"], ["1024", "696", "Clássico dos Milhões"], ["1024", "2864", "Clássico da Rivalidade"],
  ["1095", "696", "Clássico dos Gigantes"], ["1095", "2864", "Clássico Vovô"], ["696", "2864", "Clássico da Amizade"],
  ["2925", "2696", "Grenal"], ["3427", "3371", "Clássico Mineiro"], ["692", "3440", "Ba-Vi"],
  ["3432", "6285", "Atletiba"], ["2352", "12157", "Clássico dos Clássicos"], ["12220", "3621", "Clássico-Rei"],
  ["11550", "3478", "Re-Pa"], ["3931", "3672", "Dérbi Campineiro"], ["9323", "11941", "Clássico do Centro-Oeste"],
  ["6468", "9804", "Clássico de Florianópolis"],
  // Espanha
  ["800000086", "800000083", "El Clásico"], ["800000086", "800001068", "Derbi madrileño"], ["800000243", "800000244", "Gran Derbi"],
  ["800000093", "800000089", "Derbi vasco"], ["800000083", "800000088", "Derbi barceloní"], ["800000094", "800001538", "Derbi valenciano"],
  // Inglaterra
  ["800000359", "800000367", "North London Derby"], ["800000360", "800000382", "Manchester Derby"], ["800000364", "800000368", "Merseyside Derby"],
  ["800000361", "800000366", "Tyne-Wear Derby"],
  // Itália
  ["800000110", "800000103", "Derby della Madonnina"], ["800000104", "800000112", "Derby della Capitale"], ["800000111", "800000239", "Derby della Mole"],
  // Alemanha e França
  ["800000124", "800000133", "Revierderby"], ["800000160", "800000176", "Le Classique"], ["800000167", "800000178", "Derby du Rhône"],
  // América do Sul
  ["847030102", "860060490", "Superclásico"], ["827647538", "859002191", "Clásico de Avellaneda"], ["868469816", "865776762", "Clásico de Boedo"],
  ["859885645", "823732002", "Clásico rosarino"], ["835323834", "853661271", "Clásico del fútbol uruguayo"],
  ["823632378", "859499136", "Superclásico chileno"], ["823632378", "855793277", "Clásico Colo-Colo × Católica"],
  ["868286842", "858551682", "Clásico capitalino"], ["860451521", "865333349", "Clásico paisa"], ["865276996", "822321210", "Clásico vallecaucano"],
  ["826449565", "837139375", "Clásico del Astillero"],
];

const MAPA = new Map<string, string>();
for (const [a, b, nome] of PARES) { MAPA.set(`${a}|${b}`, nome); MAPA.set(`${b}|${a}`, nome); }

/** Nome do clássico entre dois clubes, ou null se não houver cadastro. */
export function classico(a: string, b: string): string | null {
  return MAPA.get(`${a}|${b}`) ?? null;
}
