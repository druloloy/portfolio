require('dotenv').config()
const crypto = require('crypto')
const fs = require('fs')

const algorithm = 'aes-256-ctr'
let key = Buffer.from(process.env.KEY_FILE_SECRET, 'utf8')
key = crypto.createHash('sha256').update(key).digest('base64').substring(0, 32)

function encrypt(text) {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(algorithm, key, iv)
  const result = Buffer.concat([iv, cipher.update(text), cipher.final()])
  return result
}

function decrypt(encryptedFileContent) {
  const iv = encryptedFileContent.slice(0, 16)
  const content = encryptedFileContent.slice(16)
  const decipher = crypto.createDecipheriv(algorithm, key, iv)
  const result = Buffer.concat([decipher.update(content), decipher.final()])
  return result
}

;(async () => {
  const command = process.argv[2]
  if (command === '-e') {
    if (!process.argv[3]) {
      console.log('Usage: node init_key.js -e <path_to_file>')
      return
    }

    const content = fs.readFileSync(process.argv[3])
    const encrypted = encrypt(content)

    fs.writeFileSync(`${process.argv[3]}.enc`, encrypted)
    console.log(`Finished encrypting ${process.argv[3]}`)
  }

  if (command === '-d') {
    if (!process.argv[3]) {
      console.log('Usage: node init_key.js -d <path_to_file>')
      return
    }

    const content = fs.readFileSync(process.argv[3])
    const decrypted = decrypt(content)

    const newFileName = process.argv[3].replace('.enc', '') // remove .enc

    fs.writeFileSync(newFileName, decrypted)
    console.log(`Finished decrypting ${process.argv[3]}`)
  }
})()
