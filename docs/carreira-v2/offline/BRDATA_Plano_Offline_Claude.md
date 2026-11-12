# BRDATA — Plano de execução para o Modo Carreira offline

## Mandato para o Claude

Implemente a carreira individual completa em modo avião após a preparação inicial da PWA. Preserve as regras, o balanceamento, o visual mobile e os saves existentes. Execute em etapas, com commits revisáveis. Use homologação para validar; não publique em produção sem autorização. Não use Railway Agent.

O ícone do Treinador deve abrir o jogo e permitir criar, jogar, fechar, retomar e avançar temporadas sem login ou rede. Amigos, ranking global, compras e saldo da conta são serviços conectados. Qualquer efeito desses serviços sobre a progressão individual deve ter uma política explícita antes da implementação. Sincronização automática entre dispositivos fica fora desta entrega.

## 0. Conferir a base e mapear dependências

- Atualize a leitura do repositório e identifique a branch, o SHA e o deploy de homologação. Leia CLAUDE.md, docs/README.md e docs/HANDOFF_CLAUDE.md.
- A auditoria de 11/11 partiu do SHA 16f63b09bd805cc5bdbd4d5de567ee3d674327e2. A rota oficial era /carreira, com React em carreira-v2/ e motor modular em public/js/motor/. A ponte antiga já tinha saído da execução da v2.
- Inventarie os acessos a rede da UI e do motor. Comece por App.tsx, adapters/gateways.ts, adapters/engine.ts, public/js/motor/v2.js, public/js/motor/carga.js, public/sw.js e public/manifest-treinador.json. Cruze cada requisição com a ação do jogador, o dado lido, a gravação realizada e a substituição offline prevista. Inclua chamadas indiretas, fontes, imagens e chunks carregados sob demanda.
- Execute a suíte existente e reproduza a abertura a frio e o salvamento com a rede cortada. Registre resultados com SHA, ambiente e dispositivo. A auditoria anterior foi estática e não comprovou o fluxo em iPhone.
- **Aceite:** inventário e linha de base reproduzíveis. Documente diferenças em relação ao SHA auditado antes de alterar o código.

## 1. Entregar o primeiro fluxo jogável de ponta a ponta

- Defina uma interface de repositório de carreira compartilhada pela UI e pelo motor. Implemente IndexedDB com esquema versionado, ID do save, revisão, versão do pacote e identificação da última operação confirmada. Garanta que falha de armazenamento aparece na UI e que o último estado confirmado segue disponível.
- Comece com um save de teste compatível com o formato atual. Ligue abertura, edição da escalação, partida e pós-jogo ao repositório local. Na abertura offline, use perfil de treinador local sem consultar autenticação remota.
- Faça o fechamento da partida confirmar resultado, classificação, finanças e avanço da rodada em uma transação local. Use ID estável de partida e revisão esperada. Teste dois toques, duas abas e interrupção antes e depois do commit. A tentativa de gravar de novo deve reutilizar o resultado já calculado.
- Defina retomada durante a partida. Persista os checkpoints necessários para recuperar o mesmo estado e as decisões já confirmadas, incluindo a aleatoriedade quando necessária para reproduzir a simulação. Explique na interface de onde o jogo retomou.
- **Aceite:** com rede bloqueada, abrir → escalar → jogar → salvar → fechar → reabrir. A rodada e seus efeitos aparecem uma única vez, sem chamadas de API necessárias ao fluxo.

## 2. Preparar a PWA e ampliar para toda a carreira

- Aponte a abertura do Treinador para /carreira/. Garanta fallback do shell para subrotas da carreira e mantenha o comportamento do portal. Substitua a dependência de GETs autenticados em cache pela leitura local. Revise o cache de respostas privadas e teste troca de conta no mesmo aparelho.
- Gere no build um inventário versionado dos arquivos necessários para jogar. Inclua motor, UI, chunks, fontes, imagens e catálogo completo das competições suportadas, com clubes, elencos e os dados iniciais necessários. Meça tamanho e tempo de preparação. Use os dados de demonstração para testes e valide a cobertura do pacote de produção separadamente.
- Baixe e valide a nova versão antes de ativá-la. Mantenha a versão jogável anterior durante download, falha ou falta de espaço. Garanta compatibilidade entre shell, motor, catálogo e esquema do save. Ofereça progresso, repetição da preparação e estado “Pronto para jogar offline”.
- Use os mesmos gateways locais na criação da carreira, treino, elenco, contratos, mercado, comissão técnica, base, finanças, calendário, Copa, demissão, troca de clube e virada de temporada. Valide promoção e rebaixamento. Preserve as regras de cada fluxo.
- Trate conta, amigos, ranking e compras na UI quando a conexão cair. Determine o tratamento da recompensa diária e de itens que afetam a economia. Preserve as compras já adquiridas conforme os direitos disponíveis e mantenha qualquer saldo de conta separado do progresso local.
- **Aceite:** depois da preparação, uma instalação com zero saves cria uma carreira em modo avião. Todos os fluxos individuais do inventário funcionam sem rede, incluindo duas temporadas consecutivas e transição de divisão.

## 3. Migrar e recuperar saves existentes

- Importe o save ativo do servidor enquanto autenticado. Valide o conteúdo, execute as migrações necessárias, confirme a gravação local e mantenha a cópia original no servidor. Repetir a importação deve reconhecer a cópia anterior; preserve o progresso local se ele tiver avançado.
- Crie exportação e importação pelo app, com versão de formato, verificação de integridade e validação de compatibilidade. Importe como cópia quando houver conflito de ID. Teste arquivos inválidos, versões antigas, save de outro clube, falta de espaço e interrupção durante a migração.
- Solicite armazenamento persistente onde disponível e registre o resultado. Mantenha a exportação acessível para restaurar após limpeza dos dados do navegador ou troca de aparelho.
- **Aceite:** importar um save representativo do servidor, avançar offline, exportar e restaurar em outro perfil/dispositivo. Comparar rodada, elenco, finanças e histórico. Nenhum save anterior pode ser perdido por uma importação ou atualização interrompida.

## 4. Homologar e preparar a publicação

| Cenário | Evidência esperada |
|---|---|
| iPhone real, PWA na tela inicial, Wi-Fi e dados móveis desligados | Abrir a frio, criar e retomar carreiras, inclusive via subrota |
| Rede bloqueada antes de uma rodada ou cortada durante a partida | Escalação, jogo e resultado persistem; API indisponível não trava a carreira |
| App encerrado antes e depois do apito final | Checkpoint recuperável e efeitos da rodada gravados uma única vez |
| Temporada completa em modo avião | Liga, Copa, classificação, transição de divisão e nova temporada consistentes |
| Download de versão interrompido e atualização com save antigo | Versão anterior abre; atualização completa preserva o save e passa no teste a frio |
| Quota excedida, cache limpo ou backup corrompido | Erro explícito e recuperação pelo último save íntegro ou por importação |
| Conexão restabelecida | Serviços conectados voltam; reabrir a conta não substitui o progresso local |

- Automatize os casos críticos no runner já adotado pelo repo. Bloqueie as requisições externas na automação e registre as chamadas observadas. Use dispositivo real para validar a instalação, o modo avião e a recuperação de arquivos. Identifique qualquer item pendente por falta de aparelho.
- Antes da liberação, registre o SHA testado, os testes executados, os resultados por cenário e o plano de reversão. Valide que a versão de rollback consegue abrir os saves migrados ou ofereça restauração compatível previamente testada.
- **Entrega do Claude:** PRs por etapa ou commits revisáveis, matriz de dependências atualizada, testes e instruções de homologação. Só declare a carreira 100% offline quando a matriz passar com a rede desligada no iPhone.

## Referências de partida

- [Commit auditado em 11/11](https://github.com/muriloalmeida-alt/BRDATA/tree/16f63b09bd805cc5bdbd4d5de567ee3d674327e2)
- [Entrega da remoção da página escondida](https://github.com/muriloalmeida-alt/BRDATA/blob/16f63b09bd805cc5bdbd4d5de567ee3d674327e2/docs/carreira-v2/ENTREGA_SEM_TELA_G2D.md)
