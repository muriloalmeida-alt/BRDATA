// Esboço de fronteiras, NÃO contratos reais da API. Conferir no código antes de implementar.
export type CareerId = string;
export interface SessionGateway {
  getCurrentUser(): Promise<unknown>;
}
export interface CareerGateway {
  listSaves(): Promise<unknown[]>;
  loadSave(id: CareerId): Promise<unknown>;
  // saveCareer: definir assinatura após mapear versão/conflitos no backend.
}
export interface GameEnginePort {
  // Contratos reais de tática/partida serão extraídos do legado com testes.
}
