const { generateImages } = require('./higgsfield-images');
const prompts = [
  "Buraco negro supermassivo no centro de uma galaxia, disco de acrecao brilhante laranja e dourado, lente gravitacional curvando a luz, campo de estrelas ao fundo, cinematografico, ultra realista, 8k, estetica de telescopio espacial",
  "Nebulosa gigante onde nascem estrelas, pilares de gas e poeira em roxo, azul e rosa, novas estrelas brilhando dentro das nuvens, telescopio James Webb, ultra detalhado, cinematografico, cores vibrantes",
  "O Sol se transformando em gigante vermelha no fim da vida, esfera vermelha imensa dominando o ceu de um planeta arido, atmosfera dramatica laranja, epico, cinematografico, ultra realista"
];
generateImages(prompts, 'exports/_carrossel-teste', (i, total, ok) => {
  console.log(`  imagem ${i}/${total}: ${ok ? 'OK' : 'falhou'}`);
}).then(r => console.log('FIM:', JSON.stringify(r))).catch(e => console.error('ERRO:', e.message));
