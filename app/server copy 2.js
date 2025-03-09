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

// Rota para upload de vídeo
app.post('/upload', upload.single('video'), (req, res) => {
  res.json({ filename: req.file.filename, path: `/uploads/${req.file.filename}` });
});

// Rota para processar vídeo (corte e/ou recorte)
app.post('/process-video', (req, res) => {
  const { startTime, endTime, filename, fastCut, x, y, width, height, removeAfterProcessing } = req.body;
  const inputPath = path.join(uploadDir, filename);
  const outputFilename = `${Date.now()}_processed.mp4`;
  const outputPath = path.join(outputDir, outputFilename);

  const command = ffmpeg(inputPath);

  // Aplica o corte, se necessário
  if (startTime !== undefined && endTime !== undefined) {
    const duration = endTime - startTime;
    command.setStartTime(startTime).setDuration(duration);
  }

  // Aplica o recorte, se necessário
  if (width && height) {
    command.videoFilter(`crop=${width}:${height}:${x}:${y}`);
  }

  // Aplica o corte rápido, se necessário
  if (fastCut) {
    command.outputOptions('-c', 'copy');
  }

  command
    .output(outputPath)
    .on('end', () => {
      // Remove o vídeo original, se a opção estiver marcada
      if (removeAfterProcessing) {
        fs.unlinkSync(inputPath); // Remove o vídeo original
      }

      // Retorna o URL do vídeo processado
      res.json({ url: `/outputs/${outputFilename}`, removeAfterProcessing });
    })
    .on('error', (err) => {
      console.error('Erro ao processar vídeo:', err.message);
      res.status(500).json({ error: 'Erro ao processar o vídeo', details: err.message });
    })
    .run();
});

// Rota para baixar o vídeo processado
app.get('/download-processed', (req, res) => {
  const { filename, removeAfterDownload } = req.query;
  const filePath = path.join(outputDir, filename);

  // Verifica se o arquivo existe
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Arquivo não encontrado' });
  }

  // Envia o arquivo para o cliente
  res.download(filePath, (err) => {
    if (err) {
      console.error('Erro ao enviar o arquivo:', err.message);
      return res.status(500).json({ error: 'Erro ao enviar o arquivo' });
    }

    // Remove o vídeo processado após o download, se a opção estiver marcada
    if (removeAfterDownload === 'true') {
      fs.unlinkSync(filePath);
    }
  });
});

// Servir o index.html na raiz
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});
