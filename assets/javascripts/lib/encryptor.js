import crypto from 'crypto-js/core';
import 'crypto-js/enc-base64';
import 'crypto-js/enc-utf8';
import 'crypto-js/lib-typedarrays';
import 'crypto-js/pbkdf2';
import 'crypto-js/sha1';
import 'crypto-js/sha256';
import 'crypto-js/aes';
import 'crypto-js/mode-ctr';
import 'crypto-js/pad-nopadding';

import Constants from './constants';

function encodeBase64(content) {
  return content.toString(crypto.enc.Base64);
}

function decodeBase64(content) {
  return crypto.enc.Base64.parse(content);
}

function decodeUint8(wordArray) {
  wordArray.clamp()
  var length = wordArray.words.length;
  var buffer = new Uint8Array(length << 2);
  var offset = 0;

  for (var i = 0; i < length; i++) {
    var word = wordArray.words[i];
    buffer[offset++] = word >> 24;
    buffer[offset++] = (word >> 16) & 0xff;
    buffer[offset++] = (word >> 8) & 0xff;
    buffer[offset++] = word & 0xff;
  }

  return buffer
}

function encodeUint8(array) {
  return crypto.lib.WordArray.create(array);
}

function generateKey(input, options = {}) {
  if (!options.salt) {
    throw "`options.salt` is required for 'generateKey()'";
  }

  const key = crypto.PBKDF2(input, options.salt, {
    keySize: (options.keySize || Constants.KEY_SIZE) / 32,
    iterations: options.keyIterations || Constants.KEY_ITERATIONS,
    hasher: options.hasher || crypto.algo.SHA256
  });

  return options.encoding === 'base64' ? encodeBase64(key) : key;
}

function generateIv() {
  return crypto.lib.WordArray.random(128 / 8);
}

function encrypt(contents, options = {}) {
  if (!options.key && !(options.passcode && options.salt)) {
    throw("Either `key` or (`passcode` and `salt`) are required for 'decrypt'")
  }

  const generateKeyOptions = {
    salt: options.salt,
    keyIterations: options.keyIterations,
    keySize: options.keySize,
    hasher: options.hasher
  };
  const key = options.key || generateKey(options.passcode, generateKeyOptions);
  const iv = options.iv || generateIv();

  const cryptoOptions = {
    iv: iv,
    mode: crypto.mode.CTR,
    padding: crypto.pad.NoPadding
  };

  if (contents instanceof ArrayBuffer) {
    contents = crypto.lib.WordArray.create(contents);
  }

  const encrypted = crypto.AES.encrypt(contents, key, cryptoOptions);

  const result = {};
  result.iv = iv;
  result.passcode = key;
  result.payload = encrypted.ciphertext;

  if (options.encoding === 'base64') {
    result.iv = encodeBase64(encrypted.iv);
    result.passcode = encodeBase64(encrypted.key);
    result.payload = encodeBase64(encrypted.ciphertext);
  }
  else if (options.encoding === 'uint8-buffer') {
    result.payload = decodeUint8(encrypted.ciphertext).buffer;
  }

  return result;
}

function decrypt(encrypted, options = {}) {
  if (!options.iv) {
    throw("iv is required for 'decrypt'");
  }

  if (!options.key && !(options.passcode && options.salt)) {
    throw("Either `key` or (`passcode` and `salt`)) are required for 'decrypt");
  }

  const generatekeyoptions = {
    salt: options.salt,
    keyIterations: options.keyIterations,
    keySize: options.keySize,
    hasher: options.hasher
  };
  const key = options.key || generateKey(options.passcode, generatekeyoptions);

  const cryptoOptions = {
    iv: options.iv,
    mode: crypto.mode.CTR,
    padding: crypto.pad.NoPadding,
    // format: crypto.enc.Utf8
  };

  if (encrypted instanceof ArrayBuffer) {
    const encryptedWordArray = crypto.lib.WordArray.create(encrypted);
    encrypted = { ciphertext: encryptedWordArray };
  }

  const decrypted = crypto.AES.decrypt(encrypted, key, cryptoOptions);

  if (options.encoding === 'utf8') {
    return crypto.enc.Utf8.stringify(decrypted);
  }
  else if (options.encoding === 'uint8') {
    return decodeUint8(decrypted);
  }
  else if (options.encoding === 'uint8-buffer') {
    return decodeUint8(decrypted).buffer;
  }
  else if (options.encoding === 'base64') {
    return encodeBase64(decrypted);
  }
  else {
    return decrypted;
  }
}

const Encryptor = {
  decrypt: decrypt,
  encrypt: encrypt,
  utils: {
    decodeBase64,
    encodeBase64,
    decodeUint8,
    encodeUint8,
    generateKey,
    generateIv
  },
  hashers: {
    SHA1: crypto.algo.SHA1,
    SHA256: crypto.algo.SHA256
  }
};

export default Encryptor;

// const formatter = {
//   stringify: function (cipherParams) {
//     const encrypted = {
//       iv: encodeBase64(cipherParams.iv),
//       passcode: encodeBase64(cipherParams.key),
//       payload: encodeBase64(cipherParams.ciphertext)
//     };
//
//     return JSON.stringify(encrypted);
//   },
//   parse: function (json) {
//   //   // const encrypted = JSON.parse(json);
//   //   //
//   //   // const cipherParams = crypto.lib.CipherParams.create({
//   //   //   ciphertext: crypto.enc.Base64.parse(encrypted.payload),
//   //   //   iv: crypto.enc.Base64.parse(encrypted.iv)
//   //   // });
//   //   //
//   //   // return cipherParams;
//   }
// }
