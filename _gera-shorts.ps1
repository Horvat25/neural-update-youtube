# Gera as imagens dos 21 Shorts de 14 a 20/ago, uma pasta por vez.
# Sequencial de proposito: a Higgsfield devolve 502 quando a gente paraleliza,
# e 502 aqui significa credito gasto sem imagem.
$slugs = @(
  'nw-beta-pictoris-d','vsl17-materia-escura','v40-mais-perto-do-espaco',
  'nw-arco-gravitacional','pl17-escada-cosmica-2','v41-nunca-tocou-em-nada',
  'nw-lua-nova-urano','vsl18-luz-que-nunca-chega','v42-neutrinos-atravessando',
  'nw-buraco-negro-errante-2026','pl18-universo-em-expansao','v43-mais-rapido-que-astronauta',
  'nw-gaia-bh3','vsl19-chiado-do-big-bang','v44-bacterias-vs-estrelas',
  'nw-quinteto-jwst','pl19-idade-do-universo','v45-centro-do-universo',
  'nw-terra-teve-aneis','vsl20-estrelas-mortas-mentira','v46-toneladas-de-ar'
)
foreach ($s in $slugs) {
  Write-Host "##### $s #####"
  & "$PSScriptRoot\gen-imgs.ps1" -dir "exports\$s" -ratio 9:16
}
Write-Host "##### LOTE COMPLETO #####"
