require('dotenv').config()

const fs = require('fs')
const path = require('path')
const exec = require('child_process').exec
const express = require('express')
const multer = require('multer')
const cors = require('cors')
const fetch = require('node-fetch')
const fileType = require('file-type')
const yauzl = require('yauzl')
const archiver = require('archiver')
const rimraf = require('rimraf')
const app = express()

const storage = multer.memoryStorage()
const limits = { fileSize: 2 * 1024 * 1024 }
const upload = multer({ storage, limits })

const port = process.env.API_PORT || 3000
const headers = process.env.GH_TOKEN
  ? { 'Authorization': `token ${process.env.GH_TOKEN}` }
  : {}
const currentFile = path.join(__dirname, 'current.txt')
const uploadsDir = path.join(__dirname, 'uploads')
const songeConverterFile = (() => {
  switch (process.platform) {
    case 'win32':
      return path.join(__dirname, 'songe-converter.exe')
    case 'darwin':
      return path.join(__dirname, 'songe-converter-mac')
    default:
      return path.join(__dirname, 'songe-converter')
  }
})()
let current = '0.0.0'
let latest = '0.0.0'

function writeCurrent (value) {
  return new Promise((resolve, reject) => {
    fs.writeFile(currentFile, value, err => {
      if (err) reject(err)
      else {
        resolve(value)
        current = value
      }
    })
  })
}

function readCurrent () {
  return new Promise((resolve, reject) => {
    fs.readFile(currentFile, 'utf-8', (err, data) => {
      if (err && err.code === 'ENOENT') {
        writeCurrent(current)
          .then(resolve)
          .catch(reject)
      } else if (err) reject(err)
      else {
        current = data
        resolve(current)
      }
    })
  })
}

function checkUploadsDir () {
  return new Promise((resolve, reject) => {
    fs.access(uploadsDir, err => {
      if (err) {
        fs.mkdir(uploadsDir, err => {
          if (err) reject(err)
          else resolve()
        })
      } else resolve()
    })
  })
}

function downloadSongeConverter () {
  return fetch('https://api.github.com/repos/lolPants/songe-converter/releases', { headers })
    .then(res => res.json())
    .then(json => {
      const version = json[0]['tag_name'].substring(1)
      const assets = json[0].assets
      const downloadURL = assets.find(asset =>
        asset.name === path.basename(songeConverterFile)
      )['browser_download_url']

      writeCurrent(version).catch(err => { throw err })

      return fetch(downloadURL)
    })
    .then(res => {
      return new Promise((resolve, reject) => {
        const dest = fs.createWriteStream(songeConverterFile)
        res.body.pipe(dest)

        dest.on('close', () => {
          fs.chmod(songeConverterFile, 0o755, err => {
            if (err) reject(err)
            else resolve(songeConverterFile)
          })
        })
      })
    })
}

function checkSongeConverter () {
  return new Promise((resolve, reject) => {
    fs.access(songeConverterFile, fs.constants.X_OK, err => {
      if (err) downloadSongeConverter().catch(reject)
      else resolve()
    })
  })
}

function unzip (buffer) {
  const dir = path.join(uploadsDir, Date.now().toString(36))

  return new Promise((resolve, reject) => {
    fs.mkdir(dir, err => {
      if (err) reject(err)
      else {
        yauzl.fromBuffer(buffer, { lazyEntries: true }, (err, zipfile) => {
          if (err) reject(err)
          zipfile.readEntry()
          zipfile.on('entry', entry => {
            const destFileName = path.join(dir, entry.fileName)

            if (/\/$/.test(entry.fileName)) {
              fs.mkdir(destFileName, err => {
                if (err) reject(err)
                else zipfile.readEntry()
              })
            } else if (path.extname(destFileName) === '.json') {
              fs.access(path.dirname(destFileName), err => {
                if (err) {
                  fs.mkdir(path.dirname(destFileName), err => {
                    if (err) reject(err)
                    else {
                      zipfile.openReadStream(entry, (err, readStream) => {
                        if (err) reject(err)
                        readStream.on('end', () => zipfile.readEntry())
                        readStream.pipe(fs.createWriteStream(destFileName))
                      })
                    }
                  })
                } else {
                  zipfile.openReadStream(entry, (err, readStream) => {
                    if (err) reject(err)
                    readStream.on('end', () => zipfile.readEntry())
                    readStream.pipe(fs.createWriteStream(destFileName))
                  })
                }
              })
            } else zipfile.readEntry()
          })
          zipfile.on('end', () => resolve(dir))
        })
      }
    })
  })
}

function convert (dir) {
  return new Promise((resolve, reject) => {
    exec(`${songeConverterFile} -g **/info.json ${dir}`, err => {
      if (err) reject(err)
      else resolve(dir)
    })
  })
}

function zip (dir) {
  return new Promise((resolve, reject) => {
    const outputFile = `${dir}.zip`
    const output = fs.createWriteStream(outputFile)
    const archive = archiver('zip')

    output.on('close', () => {
      rimraf(dir, err => {
        if (err) throw err
      })
      resolve(outputFile)
    })
    archive.on('error', reject)

    archive.pipe(output)
    archive.directory(dir, false)
    archive.finalize()
  })
}

function start () {
  return readCurrent()
    .then(checkUploadsDir)
    .then(checkSongeConverter)
}

start().catch(err => { throw err })

app.use(cors())
app.use('/downloads', express.static(uploadsDir))

app.get('/', (req, res) => {
  return fetch('https://api.github.com/repos/lolPants/songe-converter/releases', { headers })
    .then(response => response.json())
    .then(json => {
      latest = json[0]['tag_name'].substring(1)
      return res.json({ current, latest })
    })
    .catch(() => res.json({ current, latest }))
})

app.post('/upload', upload.single('zip'), (req, res) => {
  if (fileType(req.file.buffer).mime !== 'application/zip') {
    res.json({ error: 'The selected file is not in a valid format.', url: false })
  } else {
    unzip(req.file.buffer)
      .then(convert)
      .then(zip)
      .then(file => {
        setTimeout(() => {
          fs.unlink(file, err => {
            if (err) throw err
          })
        }, 120000)
        return res.json({ error: false, url: `downloads/${path.basename(file)}` })
      })
      .catch(() => res.json({ error: 'An error occurred while treating your file.', url: false }))
  }
})

app.listen(port, () => console.log(`Server listening on port ${port}.`))
