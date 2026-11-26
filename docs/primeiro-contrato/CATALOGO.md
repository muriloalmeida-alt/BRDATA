# Catálogo mundial de ligas e clubes

## Escopo e cobertura

O objetivo é oferecer clubes de todas as regiões, incluindo divisões inferiores. Para desenvolvimento, considerar o futebol masculino de clubes em atividade, em ligas seniores federadas. Registrar a temporada de referência de cada liga. Tratar futebol feminino, base, clubes extintos e torneios avulsos como conjuntos de dados próprios. Esta delimitação dá um inventário verificável e pode ser ampliada por versão.

O seed tem 795 clubes únicos e 34 ligas/divisões. Cobre Brasil, Argentina, Chile, Colômbia, Equador, Uruguai, Alemanha, Espanha, França, Inglaterra e Itália. Inclui a Série D brasileira conforme o catálogo do Touchline e as terceiras divisões internacionais presentes na base mundial. Copas continentais ligam clubes a competições paralelas e não duplicam inscrições de liga.

## Fontes e precedência

1. O snapshot inicial foi extraído de `server/frozen-catalog/mundo/mundo.json` e da constante `CATALOGO_SERIE_D` em `public/js/data.js` no BRDATA. Para produção, importar por revisão fixa e guardar chave de origem. O arquivo normalizado deste pacote é uma fixture, com indicadores de ataque e defesa do jogo.
2. Candidato para expansão em massa: API-Football. Inventariar ligas e temporadas disponíveis, buscar clubes por liga/temporada e conferir a cobertura efetiva da assinatura e os direitos de reutilização e distribuição antes de publicar.
3. Usar federações e ligas para fechar lacunas ou validar inscrições. Wikidata pode fornecer identificadores e nomes alternativos, sujeitos à conferência de completude. Prever importação editorial por CSV quando não houver feed.
4. Permissões de dados e de mídia são registradas separadamente. A fixture distribui nomes, IDs, parâmetros de jogo e um índice de escudos em arquivo separado. O app deve carregar os escudos originais existentes e autorizados. Quando faltar mídia disponível ou autorizada, usar iniciais do clube e cores do catálogo.

## Contrato de dados

| Entidade | Campos mínimos |
|---|---|
| País | id, nome, região/continente, confederação, aliases |
| Liga | id interno, país, nome, divisão, categoria, aliases e modo de simulação |
| Temporada da liga | id, liga, período ou edição, formato verificado quando conhecido, fonte, data de atualização, estado de cobertura |
| Clube | id interno, nome, sigla, país, tipo, clube-pai opcional, aliases, vínculos com IDs externos |
| Inscrição | clube, temporada da liga, elegibilidade, origem, confiança |
| Perfil de jogo | clube, força de ataque/defesa, força de elenco opcional, unidade e origem de cada estimativa |

A fixture é um array plano. `id` preserva a identidade Touchline e pode ser numérico ou textual. `code`, `league`, `country` e `tier` identificam a inscrição. `rounds` é uma referência opcional, removida quando o recorte não oferece um valor verificado. A lista de clubes de um catálogo de acesso ou renovação pode ser parcial em relação à composição oficial de uma liga. Preservar esse status até haver validação independente.

## Importação e publicação

1. Montar uma matriz com países e territórios por confederação e inventariar as divisões do escopo. Para cada liga, registrar a federação, edição, clubes esperados, fonte e data.
2. Buscar lotes fora da jornada de jogo. Guardar versões de entrada, controlar cotas do provedor e repetir lotes de forma idempotente.
3. Unificar IDs por correspondência de origem ou vínculo revisado. Similaridade de nome sugere revisão. Evitar unir clube principal e reserva ou usar nomes como chave.
4. Validar país, divisão, número de membros, datas, duplicatas, colisões e inscrições órfãs. Enviar divergências a revisão editorial. Gerar cobertura por país, divisão e temporada, com motivos de ausência.
5. Publicar versão imutável e atualizar o ponteiro da versão ativa após validação. Conservar a anterior para rollback e retomada de saves. Expor fonte e data do catálogo ao jogador.
6. Para ligas com clubes verificados e formato indisponível, permitir **temporada simplificada**, identificada na interface. Usar métricas por atleta e um calendário simulado explícito. Resultados de classificação, promoção e títulos oficiais exigem formato confirmado para o modo completo.

## Aceite de cobertura

- Para cada país e divisão inventariados, classificar como verificado completo, parcial ou pendente. Um país aparece como coberto por inteiro somente quando as ligas do escopo e as inscrições de suas temporadas estão completas.
- Qualquer clube com inscrição confirmada fica acessível na escolha inicial. Pendente ou parcial permanece visível no relatório de cobertura, com data e fonte.
- Incluir África, Ásia, América do Norte/Central, Caribe e Oceania no inventário e na primeira entrega da integração mundial. Revisar lacunas da Europa e América do Sul com o mesmo critério.
- O marco de cobertura integral só é atingido depois de confirmar todos os clubes das ligas no inventário. Se houver países ou divisões sem fonte publicável, publicar o número exato de ligas verificadas e a lista das lacunas.

## Referências

- [Repositório BRDATA](https://github.com/muriloalmeida-alt/BRDATA)
- [API-Football — cobertura](https://www.api-football.com/coverage)
- [API-Football — documentação](https://www.api-football.com/documentation-v3)
- [Wikidata — política de licenciamento](https://www.wikidata.org/wiki/Wikidata:Licensing)
- [Copero — referência competitiva](https://copero.net/)

## Resolução de identidade visual

O mapa `catalogo/escudos-touchline.json` associa a chave de cada clube à referência de imagem original. Trate caminhos relativos como caminhos do snapshot de origem do BRDATA. Empacote os ativos locais autorizados junto do catálogo publicado e resolva URLs externas autorizadas com estratégia de cache. Nome de clube e liga vêm dos registros de inscrição e seguem a temporada do save. Quando houver imagem de liga no catálogo publicado, resolva-a pelo ID da competição.
