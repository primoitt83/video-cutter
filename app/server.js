const express = require('express');
const multer = require('multer');
const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');

const app = express();
const port = 3000;

const uploadDir = path.join(__dirname, 'uploads');
const outputDir = path.join(__dirname, 'outputs');

if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});

const upload = multer({ storage });
app.use(express.static('public'));
app.use(express.json());

app.post('/upload', upload.single('video'), (req, res) => {
  res.json({ filename: req.file.filename });
});

app.post('/cut-video', (req, res) => {
  const { startTime, endTime, filename, fastCut, hwEncoder } = req.body;
  const inputPath = path.join(uploadDir, filename);
  const outputFilename = `${Date.now()}_cut.mp4`;
  const outputPath = path.join(outputDir, outputFilename);
  const duration = endTime - startTime;

  const command = ffmpeg(inputPath)
    .setStartTime(startTime)
    .setDuration(duration)
    .output(outputPath)
    .on('end', () => res.json({ url: `/outputs/${outputFilename}` }))
    .on('error', (err) => {
      console.error('Erro ao cortar vídeo:', err.message);
      res.status(500).json({ error: 'Erro ao cortar o vídeo', details: err.message });
    });

  if (fastCut) {
    command.outputOptions('-c', 'copy');
  } else if (hwEncoder) {
    command.outputOptions([
      '-hwaccel', 'drm',
      '-hwaccel_device', '/dev/dri/renderD128',
      '-c:v', hwEncoder, // 'h264_rkmpp_encoder' ou 'hevc_rkmpp_encoder'
      '-c:a', 'copy',
    ]);
  }

  command.run();
});

app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});


// Servir o index.html na raiz
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});
