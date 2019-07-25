import Encryptor from './encryptor';
import Record from './records/record';
import ProgressRegister from './progress_register';
import Workers from '../lib/workers';

const publicFileOptions = { encrypt: false, verify: false };
function putPublicFile(name, contents) {
  return Record.getSession().putFile(name, contents, publicFileOptions);
}

class BaseDocumentUploader {
  constructor(doc, options = {}) {
    this.doc = doc;
    this.progress = new ProgressRegister(doc.size);
    this.encryption = options.encryption;
  }

  upload(_file) {
    return Promise.reject('.upload must be implemented in subclasses');
  }

  onProgress(callback) {
    this.progress.onChange(callback);
  }

  async uploadRawFile(path, contents, options = {}) {
    const key = this.getEncryptionKey();
    const iv = this.encryption.ivs[options.partNumber];

    let encrypted = null;

    if (window.Worker) {
      this.encryptor = this.encryptor || new Workers.Encryptor();

      const response = await this.encryptor.perform(
        {
          ...this.encryption,
          contents,
          iv,
          key,
          encoding: 'uint8-buffer'
        },
        [contents]
      );
      encrypted = response.data.buffer;
    }
    else {
      const result = Encryptor.encrypt(contents, {
        key: Encryptor.utils.decodeBase64(key),
        iv: Encryptor.utils.decodeBase64(iv),
        encoding: 'uint8-buffer'
      });
      encrypted = result.payload;
    }

    contents = null;

    const uploadOptions = { contentType: 'application/octet-stream' };
    let putFile = putPublicFile(path, encrypted, uploadOptions);
    encrypted = null;
    return putFile;
  }

  getEncryptionKey() {
    if (this._encryptionKey) { return this._encryptionKey; }

    const keyOptions = {
      salt: this.encryption.salt,
      keyIterations: this.encryption.keyIterations,
      keySize: this.encryption.keySize
    };
    const key = Encryptor.utils.generateKey(
      this.encryption.passcode,
      keyOptions
    );

    return this._encryptionKey = Encryptor.utils.encodeBase64(key);
  }
}

export default BaseDocumentUploader;
