const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const path = require('path');
const fs = require('fs');
ffmpeg.setFfmpegPath(ffmpegPath);

/**
 * Normalização Nível SaaS: OGG/Opus 16kHz
 * Usa um passo intermediário em WAV para limpar qualquer inconsistência de timing
 * vindo do navegador (WebM/Opus).
 */
async function normalizeAudio(inputPath) {
  const baseDir = path.dirname(inputPath);
  const tempWav = path.join(baseDir, `temp_${Date.now()}.wav`);
  const finalOgg = inputPath.replace(path.extname(inputPath), '_norm.ogg');

  try {
    // Passo 1: Limpeza Total -> Converte para WAV Bruto 16kHz Mono
    console.log('[mediaService] Passo 1: Limpando áudio via WAV...');
    await new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .inputOptions(['-analyzeduration', '10M', '-probesize', '10M'])
        .outputOptions([
          '-ar 16000',
          '-ac 1',
          '-vn',
          '-map_metadata -1',
          '-fflags +genpts',
          '-avoid_negative_ts make_zero'
        ])
        .toFormat('wav')
        .on('end', resolve)
        .on('error', reject)
        .save(tempWav);
    });

    // Passo 2: Codificação Final -> OGG/Opus 16kHz
    console.log('[mediaService] Passo 2: Gerando OGG/Opus final (Forçando 16kHz)...');
    await new Promise((resolve, reject) => {
      ffmpeg(tempWav)
        .audioCodec('libopus')
        .audioBitrate('32k')
        .outputOptions([
          '-ar 16000',              // Força o sample rate na saída (base de voz)
          '-ac 1',                  // Mono
          '-application voip',      // Otimiza para voz
          '-frame_duration 20',     // Quadros estáveis
          '-fflags +genpts',        // Gera novos PTS
          '-avoid_negative_ts make_zero',
          '-reset_timestamps 1',    // RESETA os timestamps para evitar slow motion por timing
          '-muxdelay 0',            // Elimina atraso de multiplexação
          '-muxpreload 0'           // Elimina pré-carregamento de buffer
        ])
        .toFormat('ogg')
        .on('end', resolve)
        .on('error', reject)
        .save(finalOgg);
    });

    // Limpeza de temporários
    try {
      if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
      if (fs.existsSync(tempWav)) fs.unlinkSync(tempWav);
    } catch (e) {}

    return finalOgg;
  } catch (err) {
    console.error('[mediaService] erro fatal na normalização:', err.message);
    // Em caso de erro, tenta ao menos limpar o temporário
    try { if (fs.existsSync(tempWav)) fs.unlinkSync(tempWav); } catch (e) {}
    throw err;
  }
}

module.exports = { normalizeAudio };
