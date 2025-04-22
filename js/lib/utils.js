import * as contentTypes from '../assets/content-types.js';

/**
 * @param {number} [ms=1000] 
 * @param {string} [result='anything'] 
 * @returns {Promise<result>}
 */
export function wait(ms = 1000, result = 'anything') {
  return new Promise((resolve) => {
    setTimeout(() => resolve(result), ms);
  });
}

/**
 * Change cases
 * @param {string} value 
 * @param {''|'.'|'-'|'_'} [sep]
 * @param {boolean} [firstUpper=false] 
 * @returns {string}
 */
export function cases(value, sep, firstUpper = false) {
  if (typeof value === 'string') {
    sep = sep || '';
    return value
      .replace(/([a-z1-9])([A-Z])/g, '$1 $2')
      .replace(/[\.\-_]/g, ' ')
      .replace(/(?:^| )([\S])/g, (x) => x.toLocaleUpperCase())
      .split(/[\s]+/).map((x, i) => {
        if (!firstUpper && (sep.length || (!sep.length && i == 0))) {
          return x.toLocaleLowerCase();
        }
        return x;
      }).join(sep);
  }
  return value;
}

/**
 * @param {string | URL} url 
 * @param {File|HTMLFormElement|Object.<string, any>} params 
 * @param {(percent: Number, e: ProgressEvent<XMLHttpRequestEventTarget>) => void} onProgress 
 * @returns {Promise<{status: number, body: string}>}
 */
export function uploadFile(url, params, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.upload.addEventListener('progress', e => onProgress?.(Math.round(e.loaded / e.total * 100 | 0), e));

    xhr.addEventListener('load', () => resolve({ status: xhr.status, body: xhr.responseText }));
    xhr.addEventListener('error', () => reject(new Error('File upload failed')));
    xhr.addEventListener('abort', () => reject(new Error('File upload aborted')));
    xhr.open('POST', url, true);

    let formData = new FormData();
    if (params instanceof File) {
      formData.append('file', params);

    } else if (params instanceof HTMLFormElement) {
      formData = new FormData(params);

    } else {
      Object.keys(params).forEach((k) => {
        formData.append(k, params[k]);
      });
    }

    xhr.send(formData);
  });
}

/**
 * @param {string} contentType 
 * @param {string} [extension] 
 * @returns {string}
 */
export function contentTypeToIcon(contentType, extension) {
  if (extension) {
    const ext = extension.toLocaleLowerCase();
    if (contentType == 'application/zip' && extension == 'apk') {
      return 'apk';
    }
  }

  const keys = Object.keys(contentTypes);
  for(const k of keys) {
    if (contentTypes[k].includes(contentType)) {
      return k;
    }
  }

  return (contentType || '').split('/').filter(Boolean).reduce((t, x, i) => {
    if (i == 0) {
      switch(x) {
        case 'application': t = 'application'; break;
        case 'audio': t = 'audio'; break;
        case 'font': t = 'font'; break;
        case 'image': t = 'image'; break;
        case 'message': t = 'event'; break;
        case 'model': t = 'contact'; break;
        case 'multipart': t = 'form'; break;
        case 'text': t = 'text'; break;
        case 'video': t = 'video'; break;
        // case 'x-conference': t = ''; break;
        case 'x-shader': t = 'draw'; break;
        default: t = 'generic'; break;
      }
    }
    return t;
  }, 'generic');
}

/**
 * @param {number} unixTimestamp 
 * @returns {string}
 */
export function formatTimestamp(unixTimestamp) {
  const m = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const d = new Date(unixTimestamp * 1000);
  return [m[d.getMonth()], ' ', d.getDate(), ', ', d.getFullYear(), " ",
  (d.getHours() % 12 || 12), ":", (d.getMinutes() < 10 ? '0' : '') + d.getMinutes(),
    " ", d.getHours() >= 12 ? 'PM' : 'AM'].join('');
}

/**
 * @param {number} bytes 
 * @returns {string}
 */
export function formatFileSize(bytes) {
  const s = ['bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB'];
  let pos = 0;
  for (; bytes >= 1000; pos++, bytes /= 1024);
  const d = Math.round(bytes * 10);
  return pos ? [parseInt(d / 10), ".", d % 10, " ", s[pos]].join('') : bytes + ' bytes';
}

/**
 * @param {"name"|"type"|"size"|"mtime"|"date"} sort 
 * @returns {(a: object, b: object) => -1|0|1}
 */
export function filelistComparator(sort) {
  return (a, b) => {
    if (a.isDir && !b.isDir) {
      return -1;
      
    } else if(!a.isDir && b.isDir) {
      return 1;

    } else {
      if ('name' == sort) {
        return a.name.localeCompare(b.name);
  
      } else if ('type' == sort) {
        return a.contentType.localeCompare(b.contentType);
  
      } else if (['size', 'mtime', 'date'].includes(sort)) {
        const key = sort == 'date' ? 'mtime' : sort;
        return Number(a[key]) - Number(b[key]);
      }
    }

    return 0;
  }
}