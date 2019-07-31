import Encryptor from './encryptor';
import ProgressRegister from './progress_register';
import Record from './records/record';
import Workers from './workers';

class BaseDocumentDownloader {
  constructor(doc) {
    this.doc = doc;
    this.progress = new ProgressRegister(doc.size);
    this.encryptor = new Workers.Encryptor({ restartEvery: 10 });
  }

  async download() {
    throw '.download() must be implemented by subclasses';
  }

  onProgress(callback) {
    this.progress.onChange(callback);
  }

  async downloadRawFile(url, options = {}) {
    const getOptions = { username: this.doc.username, decrypt: false, verify: false };
    const contents = await Record.getSession().getFile(url, getOptions);

    if (this.doc.version < 2) {
      return contents;
    }

    const encryption = this.doc.getEncryption().toEncryptor();

    const key = this.getEncryptionKey(encryption);
    const iv = this.doc.part_ivs[options.partNumber];

    let decrypted = null;

    if (this.doc.num_parts > 1 && window.Worker) {
      const response = await this.encryptor.perform(
        {
          ...encryption,
          contents,
          iv,
          key,
          encoding: 'uint8-buffer',
          type: 'decrypt'
        },
        [contents]
      );
      decrypted = response.data.buffer;
    }
    else {
      decrypted = Encryptor.decrypt(contents, {
        key: Encryptor.utils.decodeBase64(key),
        iv: Encryptor.utils.decodeBase64(iv),
        encoding: 'uint8-buffer'
      });
    }

    return decrypted;
  }

  createBlob(contents) {
    const blobOptions = { name: this.doc.name, type: this.doc.getMimeType() };
    const blobContents = contents.length ? contents : [contents];
    return new Blob(blobContents, blobOptions);
  }

  revokeLater(objectUrl) {
    window.addEventListener('focus', function handler() {
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
      window.removeEventListener('focus', handler);
    });
  }

  getEncryptionKey(encryption) {
    if (this._encryptionKey) { return this._encryptionKey; }

    const key = Encryptor.utils.generateKey(
      encryption.passcode,
      {...encryption, encoding: 'base64' }
    );

    return this._encryptionKey = key;
  }
}

export default BaseDocumentDownloader;
