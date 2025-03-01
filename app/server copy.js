const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');

const app = express();
const port = 3000;

// Configurar pastas
const uploadDir = path.join(__dirname, 'uploads');
const outputDir = path.join(__dirname, 'outputs');

if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${Math.random().toString(36).substring(7)}.mp4`),
});
const upload = multer({ storage });

app.use('/uploads', express.static(uploadDir));
app.use('/outputs', express.static(outputDir));
app.use(express.json());

app.post('/upload', upload.single('video'), (req, res) => {
  res.json({ filename: req.file.filename, path: `/uploads/${req.file.filename}` });
});

app.post('/cut-video', (req, res) => {
  const { startTime, endTime, filename, fastCut } = req.body;
  const inputPath = path.join(uploadDir, filename);
  const outputFilename = `${Date.now()}_cut.mp4`;
  const outputPath = path.join(outputDir, outputFilename);

  const duration = endTime - startTime;

  const command = ffmpeg(inputPath)
    .setStartTime(startTime)
    .setDuration(duration)
    .output(outputPath)
    .on('end', () => {
      res.json({ url: `/outputs/${outputFilename}` });
    })
    .on('error', (err) => {
      console.error('Erro ao cortar vídeo:', err.message);
      res.status(500).json({ error: 'Erro ao cortar o vídeo', details: err.message });
    });

  if (fastCut) {
    command.outputOptions('-c', 'copy'); // Corte rápido (sem re-encode)
  }

  command.run();
});

app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});

// Servir o index.html na raiz
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});
