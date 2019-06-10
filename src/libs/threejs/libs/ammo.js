// This is ammo.js, a port of Bullet Physics to JavaScript. zlib licensed.
var AmmoLib = function(Module) {
  Module = Module || {};

  var Module;
  if (!Module) Module = (typeof AmmoLib !== 'undefined' ? AmmoLib : null) || {};
  var moduleOverrides = {};
  for (var key in Module) {
    if (Module.hasOwnProperty(key)) {
      moduleOverrides[key] = Module[key];
    }
  }
  var ENVIRONMENT_IS_WEB = false;
  var ENVIRONMENT_IS_WORKER = false;
  var ENVIRONMENT_IS_NODE = false;
  var ENVIRONMENT_IS_SHELL = false;
  if (Module['ENVIRONMENT']) {
    if (Module['ENVIRONMENT'] === 'WEB') {
      ENVIRONMENT_IS_WEB = true;
    } else if (Module['ENVIRONMENT'] === 'WORKER') {
      ENVIRONMENT_IS_WORKER = true;
    } else if (Module['ENVIRONMENT'] === 'NODE') {
      ENVIRONMENT_IS_NODE = true;
    } else if (Module['ENVIRONMENT'] === 'SHELL') {
      ENVIRONMENT_IS_SHELL = true;
    } else {
      throw new Error(
        "The provided Module['ENVIRONMENT'] value is not valid. It must be one of: WEB|WORKER|NODE|SHELL."
      );
    }
  } else {
    ENVIRONMENT_IS_WEB = typeof window === 'object';
    ENVIRONMENT_IS_WORKER = typeof importScripts === 'function';
    ENVIRONMENT_IS_NODE =
      typeof process === 'object' &&
      typeof require === 'function' &&
      !ENVIRONMENT_IS_WEB &&
      !ENVIRONMENT_IS_WORKER;
    ENVIRONMENT_IS_SHELL =
      !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_NODE && !ENVIRONMENT_IS_WORKER;
  }
  if (ENVIRONMENT_IS_NODE) {
    if (!Module['print']) Module['print'] = console.log;
    if (!Module['printErr']) Module['printErr'] = console.warn;
    var nodeFS;
    var nodePath;
    Module['read'] = function read(filename, binary) {
      if (!nodeFS) nodeFS = require('fs');
      if (!nodePath) nodePath = require('path');
      filename = nodePath['normalize'](filename);
      var ret = nodeFS['readFileSync'](filename);
      if (!ret && filename != nodePath['resolve'](filename)) {
        filename = path.join(__dirname, '..', 'src', filename);
        ret = nodeFS['readFileSync'](filename);
      }
      if (ret && !binary) ret = ret.toString();
      return ret;
    };
    Module['readBinary'] = function readBinary(filename) {
      var ret = Module['read'](filename, true);
      if (!ret.buffer) {
        ret = new Uint8Array(ret);
      }
      assert(ret.buffer);
      return ret;
    };
    Module['load'] = function load(f) {
      globalEval(read(f));
    };
    if (!Module['thisProgram']) {
      if (process['argv'].length > 1) {
        Module['thisProgram'] = process['argv'][1].replace(/\\/g, '/');
      } else {
        Module['thisProgram'] = 'unknown-program';
      }
    }
    Module['arguments'] = process['argv'].slice(2);
    if (typeof module !== 'undefined') {
      module['exports'] = Module;
    }
    process['on']('uncaughtException', function(ex) {
      if (!(ex instanceof ExitStatus)) {
        throw ex;
      }
    });
    Module['inspect'] = function() {
      return '[Emscripten Module object]';
    };
  } else if (ENVIRONMENT_IS_SHELL) {
    if (!Module['print']) Module['print'] = print;
    if (typeof printErr != 'undefined') Module['printErr'] = printErr;
    if (typeof read != 'undefined') {
      Module['read'] = read;
    } else {
      Module['read'] = function read() {
        throw 'no read() available (jsc?)';
      };
    }
    Module['readBinary'] = function readBinary(f) {
      if (typeof readbuffer === 'function') {
        return new Uint8Array(readbuffer(f));
      }
      var data = read(f, 'binary');
      assert(typeof data === 'object');
      return data;
    };
    if (typeof scriptArgs != 'undefined') {
      Module['arguments'] = scriptArgs;
    } else if (typeof arguments != 'undefined') {
      Module['arguments'] = arguments;
    }
  } else if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
    Module['read'] = function read(url) {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', url, false);
      xhr.send(null);
      return xhr.responseText;
    };
    Module['readAsync'] = function readAsync(url, onload, onerror) {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', url, true);
      xhr.responseType = 'arraybuffer';
      xhr.onload = function xhr_onload() {
        if (xhr.status == 200 || (xhr.status == 0 && xhr.response)) {
          onload(xhr.response);
        } else {
          onerror();
        }
      };
      xhr.onerror = onerror;
      xhr.send(null);
    };
    if (typeof arguments != 'undefined') {
      Module['arguments'] = arguments;
    }
    if (typeof console !== 'undefined') {
      if (!Module['print'])
        Module['print'] = function print(x) {
          console.log(x);
        };
      if (!Module['printErr'])
        Module['printErr'] = function printErr(x) {
          console.warn(x);
        };
    } else {
      var TRY_USE_DUMP = false;
      if (!Module['print'])
        Module['print'] =
          TRY_USE_DUMP && typeof dump !== 'undefined'
            ? function(x) {
                dump(x);
              }
            : function(x) {};
    }
    if (ENVIRONMENT_IS_WORKER) {
      Module['load'] = importScripts;
    }
    if (typeof Module['setWindowTitle'] === 'undefined') {
      Module['setWindowTitle'] = function(title) {
        document.title = title;
      };
    }
  } else {
    throw 'Unknown runtime environment. Where are we?';
  }
  function globalEval(x) {
    abort('NO_DYNAMIC_EXECUTION=1 was set, cannot eval');
  }
  if (!Module['load'] && Module['read']) {
    Module['load'] = function load(f) {
      globalEval(Module['read'](f));
    };
  }
  if (!Module['print']) {
    Module['print'] = function() {};
  }
  if (!Module['printErr']) {
    Module['printErr'] = Module['print'];
  }
  if (!Module['arguments']) {
    Module['arguments'] = [];
  }
  if (!Module['thisProgram']) {
    Module['thisProgram'] = './this.program';
  }
  Module.print = Module['print'];
  Module.printErr = Module['printErr'];
  Module['preRun'] = [];
  Module['postRun'] = [];
  for (var key in moduleOverrides) {
    if (moduleOverrides.hasOwnProperty(key)) {
      Module[key] = moduleOverrides[key];
    }
  }
  moduleOverrides = undefined;
  var Runtime = {
    setTempRet0: function(value) {
      tempRet0 = value;
    },
    getTempRet0: function() {
      return tempRet0;
    },
    stackSave: function() {
      return STACKTOP;
    },
    stackRestore: function(stackTop) {
      STACKTOP = stackTop;
    },
    getNativeTypeSize: function(type) {
      switch (type) {
        case 'i1':
        case 'i8':
          return 1;
        case 'i16':
          return 2;
        case 'i32':
          return 4;
        case 'i64':
          return 8;
        case 'float':
          return 4;
        case 'double':
          return 8;
        default: {
          if (type[type.length - 1] === '*') {
            return Runtime.QUANTUM_SIZE;
          } else if (type[0] === 'i') {
            var bits = parseInt(type.substr(1));
            assert(bits % 8 === 0);
            return bits / 8;
          } else {
            return 0;
          }
        }
      }
    },
    getNativeFieldSize: function(type) {
      return Math.max(Runtime.getNativeTypeSize(type), Runtime.QUANTUM_SIZE);
    },
    STACK_ALIGN: 16,
    prepVararg: function(ptr, type) {
      if (type === 'double' || type === 'i64') {
        if (ptr & 7) {
          assert((ptr & 7) === 4);
          ptr += 4;
        }
      } else {
        assert((ptr & 3) === 0);
      }
      return ptr;
    },
    getAlignSize: function(type, size, vararg) {
      if (!vararg && (type == 'i64' || type == 'double')) return 8;
      if (!type) return Math.min(size, 8);
      return Math.min(
        size || (type ? Runtime.getNativeFieldSize(type) : 0),
        Runtime.QUANTUM_SIZE
      );
    },
    dynCall: function(sig, ptr, args) {
      if (args && args.length) {
        if (!args.splice) args = Array.prototype.slice.call(args);
        args.splice(0, 0, ptr);
        return Module['dynCall_' + sig].apply(null, args);
      } else {
        return Module['dynCall_' + sig].call(null, ptr);
      }
    },
    functionPointers: [],
    addFunction: function(func) {
      for (var i = 0; i < Runtime.functionPointers.length; i++) {
        if (!Runtime.functionPointers[i]) {
          Runtime.functionPointers[i] = func;
          return 2 * (1 + i);
        }
      }
      throw 'Finished up all reserved function pointers. Use a higher value for RESERVED_FUNCTION_POINTERS.';
    },
    removeFunction: function(index) {
      Runtime.functionPointers[(index - 2) / 2] = null;
    },
    warnOnce: function(text) {
      if (!Runtime.warnOnce.shown) Runtime.warnOnce.shown = {};
      if (!Runtime.warnOnce.shown[text]) {
        Runtime.warnOnce.shown[text] = 1;
        Module.printErr(text);
      }
    },
    funcWrappers: {},
    getFuncWrapper: function(func, sig) {
      assert(sig);
      if (!Runtime.funcWrappers[sig]) {
        Runtime.funcWrappers[sig] = {};
      }
      var sigCache = Runtime.funcWrappers[sig];
      if (!sigCache[func]) {
        sigCache[func] = function dynCall_wrapper() {
          return Runtime.dynCall(sig, func, arguments);
        };
      }
      return sigCache[func];
    },
    getCompilerSetting: function(name) {
      throw 'You must build with -s RETAIN_COMPILER_SETTINGS=1 for Runtime.getCompilerSetting or emscripten_get_compiler_setting to work';
    },
    stackAlloc: function(size) {
      var ret = STACKTOP;
      STACKTOP = (STACKTOP + size) | 0;
      STACKTOP = (STACKTOP + 15) & -16;
      return ret;
    },
    staticAlloc: function(size) {
      var ret = STATICTOP;
      STATICTOP = (STATICTOP + size) | 0;
      STATICTOP = (STATICTOP + 15) & -16;
      return ret;
    },
    dynamicAlloc: function(size) {
      var ret = DYNAMICTOP;
      DYNAMICTOP = (DYNAMICTOP + size) | 0;
      DYNAMICTOP = (DYNAMICTOP + 15) & -16;
      if (DYNAMICTOP >= TOTAL_MEMORY) {
        var success = enlargeMemory();
        if (!success) {
          DYNAMICTOP = ret;
          return 0;
        }
      }
      return ret;
    },
    alignMemory: function(size, quantum) {
      var ret = (size =
        Math.ceil(size / (quantum ? quantum : 16)) * (quantum ? quantum : 16));
      return ret;
    },
    makeBigInt: function(low, high, unsigned) {
      var ret = unsigned
        ? +(low >>> 0) + +(high >>> 0) * +4294967296
        : +(low >>> 0) + +(high | 0) * +4294967296;
      return ret;
    },
    GLOBAL_BASE: 8,
    QUANTUM_SIZE: 4,
    __dummy__: 0,
  };
  var ABORT = false;
  var EXITSTATUS = 0;
  function assert(condition, text) {
    if (!condition) {
      abort('Assertion failed: ' + text);
    }
  }
  function getCFunc(ident) {
    var func = Module['_' + ident];
    if (!func) {
      abort('NO_DYNAMIC_EXECUTION=1 was set, cannot eval');
    }
    assert(
      func,
      'Cannot call unknown function ' +
        ident +
        ' (perhaps LLVM optimizations or closure removed it?)'
    );
    return func;
  }
  var ccall;
  (function() {
    var JSfuncs = {
      stackSave: function() {
        Runtime.stackSave();
      },
      stackRestore: function() {
        Runtime.stackRestore();
      },
      arrayToC: function(arr) {
        var ret = Runtime.stackAlloc(arr.length);
        writeArrayToMemory(arr, ret);
        return ret;
      },
      stringToC: function(str) {
        var ret = 0;
        if (str !== null && str !== undefined && str !== 0) {
          ret = Runtime.stackAlloc((str.length << 2) + 1);
          writeStringToMemory(str, ret);
        }
        return ret;
      },
    };
    var toC = { string: JSfuncs['stringToC'], array: JSfuncs['arrayToC'] };
    ccall = function ccallFunc(ident, returnType, argTypes, args, opts) {
      var func = getCFunc(ident);
      var cArgs = [];
      var stack = 0;
      if (args) {
        for (var i = 0; i < args.length; i++) {
          var converter = toC[argTypes[i]];
          if (converter) {
            if (stack === 0) stack = Runtime.stackSave();
            cArgs[i] = converter(args[i]);
          } else {
            cArgs[i] = args[i];
          }
        }
      }
      var ret = func.apply(null, cArgs);
      if (returnType === 'string') ret = Pointer_stringify(ret);
      if (stack !== 0) {
        if (opts && opts.async) {
          EmterpreterAsync.asyncFinalizers.push(function() {
            Runtime.stackRestore(stack);
          });
          return;
        }
        Runtime.stackRestore(stack);
      }
      return ret;
    };
    cwrap = function cwrap(ident, returnType, argTypes) {
      return function() {
        return ccall(ident, returnType, argTypes, arguments);
      };
    };
  })();
  function setValue(ptr, value, type, noSafe) {
    type = type || 'i8';
    if (type.charAt(type.length - 1) === '*') type = 'i32';
    switch (type) {
      case 'i1':
        HEAP8[ptr >> 0] = value;
        break;
      case 'i8':
        HEAP8[ptr >> 0] = value;
        break;
      case 'i16':
        HEAP16[ptr >> 1] = value;
        break;
      case 'i32':
        HEAP32[ptr >> 2] = value;
        break;
      case 'i64':
        (tempI64 = [
          value >>> 0,
          ((tempDouble = value),
          +Math_abs(tempDouble) >= +1
            ? tempDouble > +0
              ? (Math_min(+Math_floor(tempDouble / +4294967296), +4294967295) |
                  0) >>>
                0
              : ~~+Math_ceil(
                  (tempDouble - +(~~tempDouble >>> 0)) / +4294967296
                ) >>> 0
            : 0),
        ]),
          (HEAP32[ptr >> 2] = tempI64[0]),
          (HEAP32[(ptr + 4) >> 2] = tempI64[1]);
        break;
      case 'float':
        HEAPF32[ptr >> 2] = value;
        break;
      case 'double':
        HEAPF64[ptr >> 3] = value;
        break;
      default:
        abort('invalid type for setValue: ' + type);
    }
  }
  function getValue(ptr, type, noSafe) {
    type = type || 'i8';
    if (type.charAt(type.length - 1) === '*') type = 'i32';
    switch (type) {
      case 'i1':
        return HEAP8[ptr >> 0];
      case 'i8':
        return HEAP8[ptr >> 0];
      case 'i16':
        return HEAP16[ptr >> 1];
      case 'i32':
        return HEAP32[ptr >> 2];
      case 'i64':
        return HEAP32[ptr >> 2];
      case 'float':
        return HEAPF32[ptr >> 2];
      case 'double':
        return HEAPF64[ptr >> 3];
      default:
        abort('invalid type for setValue: ' + type);
    }
    return null;
  }
  var ALLOC_NORMAL = 0;
  var ALLOC_STATIC = 2;
  var ALLOC_DYNAMIC = 3;
  var ALLOC_NONE = 4;
  function allocate(slab, types, allocator, ptr) {
    var zeroinit, size;
    if (typeof slab === 'number') {
      zeroinit = true;
      size = slab;
    } else {
      zeroinit = false;
      size = slab.length;
    }
    var singleType = typeof types === 'string' ? types : null;
    var ret;
    if (allocator == ALLOC_NONE) {
      ret = ptr;
    } else {
      ret = [
        typeof _malloc === 'function' ? _malloc : Runtime.staticAlloc,
        Runtime.stackAlloc,
        Runtime.staticAlloc,
        Runtime.dynamicAlloc,
      ][allocator === undefined ? ALLOC_STATIC : allocator](
        Math.max(size, singleType ? 1 : types.length)
      );
    }
    if (zeroinit) {
      var ptr = ret,
        stop;
      assert((ret & 3) == 0);
      stop = ret + (size & ~3);
      for (; ptr < stop; ptr += 4) {
        HEAP32[ptr >> 2] = 0;
      }
      stop = ret + size;
      while (ptr < stop) {
        HEAP8[ptr++ >> 0] = 0;
      }
      return ret;
    }
    if (singleType === 'i8') {
      if (slab.subarray || slab.slice) {
        HEAPU8.set(slab, ret);
      } else {
        HEAPU8.set(new Uint8Array(slab), ret);
      }
      return ret;
    }
    var i = 0,
      type,
      typeSize,
      previousType;
    while (i < size) {
      var curr = slab[i];
      if (typeof curr === 'function') {
        curr = Runtime.getFunctionIndex(curr);
      }
      type = singleType || types[i];
      if (type === 0) {
        i++;
        continue;
      }
      if (type == 'i64') type = 'i32';
      setValue(ret + i, curr, type);
      if (previousType !== type) {
        typeSize = Runtime.getNativeTypeSize(type);
        previousType = type;
      }
      i += typeSize;
    }
    return ret;
  }
  function Pointer_stringify(ptr, length) {
    if (length === 0 || !ptr) return '';
    var hasUtf = 0;
    var t;
    var i = 0;
    while (1) {
      t = HEAPU8[(ptr + i) >> 0];
      hasUtf |= t;
      if (t == 0 && !length) break;
      i++;
      if (length && i == length) break;
    }
    if (!length) length = i;
    var ret = '';
    if (hasUtf < 128) {
      var MAX_CHUNK = 1024;
      var curr;
      while (length > 0) {
        curr = String.fromCharCode.apply(
          String,
          HEAPU8.subarray(ptr, ptr + Math.min(length, MAX_CHUNK))
        );
        ret = ret ? ret + curr : curr;
        ptr += MAX_CHUNK;
        length -= MAX_CHUNK;
      }
      return ret;
    }
    return Module['UTF8ToString'](ptr);
  }
  function UTF8ArrayToString(u8Array, idx) {
    var u0, u1, u2, u3, u4, u5;
    var str = '';
    while (1) {
      u0 = u8Array[idx++];
      if (!u0) return str;
      if (!(u0 & 128)) {
        str += String.fromCharCode(u0);
        continue;
      }
      u1 = u8Array[idx++] & 63;
      if ((u0 & 224) == 192) {
        str += String.fromCharCode(((u0 & 31) << 6) | u1);
        continue;
      }
      u2 = u8Array[idx++] & 63;
      if ((u0 & 240) == 224) {
        u0 = ((u0 & 15) << 12) | (u1 << 6) | u2;
      } else {
        u3 = u8Array[idx++] & 63;
        if ((u0 & 248) == 240) {
          u0 = ((u0 & 7) << 18) | (u1 << 12) | (u2 << 6) | u3;
        } else {
          u4 = u8Array[idx++] & 63;
          if ((u0 & 252) == 248) {
            u0 = ((u0 & 3) << 24) | (u1 << 18) | (u2 << 12) | (u3 << 6) | u4;
          } else {
            u5 = u8Array[idx++] & 63;
            u0 =
              ((u0 & 1) << 30) |
              (u1 << 24) |
              (u2 << 18) |
              (u3 << 12) |
              (u4 << 6) |
              u5;
          }
        }
      }
      if (u0 < 65536) {
        str += String.fromCharCode(u0);
      } else {
        var ch = u0 - 65536;
        str += String.fromCharCode(55296 | (ch >> 10), 56320 | (ch & 1023));
      }
    }
  }
  function stringToUTF8Array(str, outU8Array, outIdx, maxBytesToWrite) {
    if (!(maxBytesToWrite > 0)) return 0;
    var startIdx = outIdx;
    var endIdx = outIdx + maxBytesToWrite - 1;
    for (var i = 0; i < str.length; ++i) {
      var u = str.charCodeAt(i);
      if (u >= 55296 && u <= 57343)
        u = (65536 + ((u & 1023) << 10)) | (str.charCodeAt(++i) & 1023);
      if (u <= 127) {
        if (outIdx >= endIdx) break;
        outU8Array[outIdx++] = u;
      } else if (u <= 2047) {
        if (outIdx + 1 >= endIdx) break;
        outU8Array[outIdx++] = 192 | (u >> 6);
        outU8Array[outIdx++] = 128 | (u & 63);
      } else if (u <= 65535) {
        if (outIdx + 2 >= endIdx) break;
        outU8Array[outIdx++] = 224 | (u >> 12);
        outU8Array[outIdx++] = 128 | ((u >> 6) & 63);
        outU8Array[outIdx++] = 128 | (u & 63);
      } else if (u <= 2097151) {
        if (outIdx + 3 >= endIdx) break;
        outU8Array[outIdx++] = 240 | (u >> 18);
        outU8Array[outIdx++] = 128 | ((u >> 12) & 63);
        outU8Array[outIdx++] = 128 | ((u >> 6) & 63);
        outU8Array[outIdx++] = 128 | (u & 63);
      } else if (u <= 67108863) {
        if (outIdx + 4 >= endIdx) break;
        outU8Array[outIdx++] = 248 | (u >> 24);
        outU8Array[outIdx++] = 128 | ((u >> 18) & 63);
        outU8Array[outIdx++] = 128 | ((u >> 12) & 63);
        outU8Array[outIdx++] = 128 | ((u >> 6) & 63);
        outU8Array[outIdx++] = 128 | (u & 63);
      } else {
        if (outIdx + 5 >= endIdx) break;
        outU8Array[outIdx++] = 252 | (u >> 30);
        outU8Array[outIdx++] = 128 | ((u >> 24) & 63);
        outU8Array[outIdx++] = 128 | ((u >> 18) & 63);
        outU8Array[outIdx++] = 128 | ((u >> 12) & 63);
        outU8Array[outIdx++] = 128 | ((u >> 6) & 63);
        outU8Array[outIdx++] = 128 | (u & 63);
      }
    }
    outU8Array[outIdx] = 0;
    return outIdx - startIdx;
  }
  function lengthBytesUTF8(str) {
    var len = 0;
    for (var i = 0; i < str.length; ++i) {
      var u = str.charCodeAt(i);
      if (u >= 55296 && u <= 57343)
        u = (65536 + ((u & 1023) << 10)) | (str.charCodeAt(++i) & 1023);
      if (u <= 127) {
        ++len;
      } else if (u <= 2047) {
        len += 2;
      } else if (u <= 65535) {
        len += 3;
      } else if (u <= 2097151) {
        len += 4;
      } else if (u <= 67108863) {
        len += 5;
      } else {
        len += 6;
      }
    }
    return len;
  }
  function demangle(func) {
    var hasLibcxxabi = !!Module['___cxa_demangle'];
    if (hasLibcxxabi) {
      try {
        var buf = _malloc(func.length);
        writeStringToMemory(func.substr(1), buf);
        var status = _malloc(4);
        var ret = Module['___cxa_demangle'](buf, 0, 0, status);
        if (getValue(status, 'i32') === 0 && ret) {
          return Pointer_stringify(ret);
        }
      } catch (e) {
        return func;
      } finally {
        if (buf) _free(buf);
        if (status) _free(status);
        if (ret) _free(ret);
      }
    }
    Runtime.warnOnce(
      'warning: build with  -s DEMANGLE_SUPPORT=1  to link in libcxxabi demangling'
    );
    return func;
  }
  function demangleAll(text) {
    return text.replace(/__Z[\w\d_]+/g, function(x) {
      var y = demangle(x);
      return x === y ? x : x + ' [' + y + ']';
    });
  }
  function jsStackTrace() {
    var err = new Error();
    if (!err.stack) {
      try {
        throw new Error(0);
      } catch (e) {
        err = e;
      }
      if (!err.stack) {
        return '(no stack trace available)';
      }
    }
    return err.stack.toString();
  }
  function stackTrace() {
    return demangleAll(jsStackTrace());
  }
  var PAGE_SIZE = 4096;
  function alignMemoryPage(x) {
    if (x % 4096 > 0) {
      x += 4096 - (x % 4096);
    }
    return x;
  }
  var HEAP;
  var buffer;
  var HEAP8, HEAPU8, HEAP16, HEAPU16, HEAP32, HEAPU32, HEAPF32, HEAPF64;
  function updateGlobalBufferViews() {
    Module['HEAP8'] = HEAP8 = new Int8Array(buffer);
    Module['HEAP16'] = HEAP16 = new Int16Array(buffer);
    Module['HEAP32'] = HEAP32 = new Int32Array(buffer);
    Module['HEAPU8'] = HEAPU8 = new Uint8Array(buffer);
    Module['HEAPU16'] = HEAPU16 = new Uint16Array(buffer);
    Module['HEAPU32'] = HEAPU32 = new Uint32Array(buffer);
    Module['HEAPF32'] = HEAPF32 = new Float32Array(buffer);
    Module['HEAPF64'] = HEAPF64 = new Float64Array(buffer);
  }
  var STATIC_BASE = 0,
    STATICTOP = 0,
    staticSealed = false;
  var STACK_BASE = 0,
    STACKTOP = 0,
    STACK_MAX = 0;
  var DYNAMIC_BASE = 0,
    DYNAMICTOP = 0;
  function abortOnCannotGrowMemory() {
    abort(
      'Cannot enlarge memory arrays. Either (1) compile with  -s TOTAL_MEMORY=X  with X higher than the current value ' +
        TOTAL_MEMORY +
        ', (2) compile with  -s ALLOW_MEMORY_GROWTH=1  which adjusts the size at runtime but prevents some optimizations, (3) set Module.TOTAL_MEMORY to a higher value before the program runs, or if you want malloc to return NULL (0) instead of this abort, compile with  -s ABORTING_MALLOC=0 '
    );
  }
  function enlargeMemory() {
    abortOnCannotGrowMemory();
  }
  var TOTAL_STACK = Module['TOTAL_STACK'] || 5242880;
  var TOTAL_MEMORY = Module['TOTAL_MEMORY'] || 67108864;
  var totalMemory = 64 * 1024;
  while (totalMemory < TOTAL_MEMORY || totalMemory < 2 * TOTAL_STACK) {
    if (totalMemory < 16 * 1024 * 1024) {
      totalMemory *= 2;
    } else {
      totalMemory += 16 * 1024 * 1024;
    }
  }
  if (totalMemory !== TOTAL_MEMORY) {
    TOTAL_MEMORY = totalMemory;
  }
  if (Module['buffer']) {
    buffer = Module['buffer'];
  } else {
    buffer = new ArrayBuffer(TOTAL_MEMORY);
  }
  updateGlobalBufferViews();
  HEAP32[0] = 255;
  if (HEAPU8[0] !== 255 || HEAPU8[3] !== 0)
    throw 'Typed arrays 2 must be run on a little-endian system';
  Module['HEAP'] = HEAP;
  Module['buffer'] = buffer;
  Module['HEAP8'] = HEAP8;
  Module['HEAP16'] = HEAP16;
  Module['HEAP32'] = HEAP32;
  Module['HEAPU8'] = HEAPU8;
  Module['HEAPU16'] = HEAPU16;
  Module['HEAPU32'] = HEAPU32;
  Module['HEAPF32'] = HEAPF32;
  Module['HEAPF64'] = HEAPF64;
  function callRuntimeCallbacks(callbacks) {
    while (callbacks.length > 0) {
      var callback = callbacks.shift();
      if (typeof callback == 'function') {
        callback();
        continue;
      }
      var func = callback.func;
      if (typeof func === 'number') {
        if (callback.arg === undefined) {
          Runtime.dynCall('v', func);
        } else {
          Runtime.dynCall('vi', func, [callback.arg]);
        }
      } else {
        func(callback.arg === undefined ? null : callback.arg);
      }
    }
  }
  var __ATPRERUN__ = [];
  var __ATINIT__ = [];
  var __ATMAIN__ = [];
  var __ATEXIT__ = [];
  var __ATPOSTRUN__ = [];
  var runtimeInitialized = false;
  var runtimeExited = false;
  function preRun() {
    if (Module['preRun']) {
      if (typeof Module['preRun'] == 'function')
        Module['preRun'] = [Module['preRun']];
      while (Module['preRun'].length) {
        addOnPreRun(Module['preRun'].shift());
      }
    }
    callRuntimeCallbacks(__ATPRERUN__);
  }
  function ensureInitRuntime() {
    if (runtimeInitialized) return;
    runtimeInitialized = true;
    callRuntimeCallbacks(__ATINIT__);
  }
  function preMain() {
    callRuntimeCallbacks(__ATMAIN__);
  }
  function exitRuntime() {
    callRuntimeCallbacks(__ATEXIT__);
    runtimeExited = true;
  }
  function postRun() {
    if (Module['postRun']) {
      if (typeof Module['postRun'] == 'function')
        Module['postRun'] = [Module['postRun']];
      while (Module['postRun'].length) {
        addOnPostRun(Module['postRun'].shift());
      }
    }
    callRuntimeCallbacks(__ATPOSTRUN__);
  }
  function addOnPreRun(cb) {
    __ATPRERUN__.unshift(cb);
  }
  function addOnPreMain(cb) {
    __ATMAIN__.unshift(cb);
  }
  function addOnPostRun(cb) {
    __ATPOSTRUN__.unshift(cb);
  }
  function intArrayFromString(stringy, dontAddNull, length) {
    var len = length > 0 ? length : lengthBytesUTF8(stringy) + 1;
    var u8array = new Array(len);
    var numBytesWritten = stringToUTF8Array(
      stringy,
      u8array,
      0,
      u8array.length
    );
    if (dontAddNull) u8array.length = numBytesWritten;
    return u8array;
  }
  function writeStringToMemory(string, buffer, dontAddNull) {
    var array = intArrayFromString(string, dontAddNull);
    var i = 0;
    while (i < array.length) {
      var chr = array[i];
      HEAP8[(buffer + i) >> 0] = chr;
      i = i + 1;
    }
  }
  function writeArrayToMemory(array, buffer) {
    for (var i = 0; i < array.length; i++) {
      HEAP8[buffer++ >> 0] = array[i];
    }
  }
  function writeAsciiToMemory(str, buffer, dontAddNull) {
    for (var i = 0; i < str.length; ++i) {
      HEAP8[buffer++ >> 0] = str.charCodeAt(i);
    }
    if (!dontAddNull) HEAP8[buffer >> 0] = 0;
  }
  if (!Math['imul'] || Math['imul'](4294967295, 5) !== -5)
    Math['imul'] = function imul(a, b) {
      var ah = a >>> 16;
      var al = a & 65535;
      var bh = b >>> 16;
      var bl = b & 65535;
      return (al * bl + ((ah * bl + al * bh) << 16)) | 0;
    };
  Math.imul = Math['imul'];
  if (!Math['clz32'])
    Math['clz32'] = function(x) {
      x = x >>> 0;
      for (var i = 0; i < 32; i++) {
        if (x & (1 << (31 - i))) return i;
      }
      return 32;
    };
  Math.clz32 = Math['clz32'];
  var Math_abs = Math.abs;
  var Math_cos = Math.cos;
  var Math_sin = Math.sin;
  var Math_tan = Math.tan;
  var Math_acos = Math.acos;
  var Math_asin = Math.asin;
  var Math_atan = Math.atan;
  var Math_atan2 = Math.atan2;
  var Math_exp = Math.exp;
  var Math_log = Math.log;
  var Math_sqrt = Math.sqrt;
  var Math_ceil = Math.ceil;
  var Math_floor = Math.floor;
  var Math_pow = Math.pow;
  var Math_imul = Math.imul;
  var Math_fround = Math.fround;
  var Math_min = Math.min;
  var Math_clz32 = Math.clz32;
  var runDependencies = 0;
  var runDependencyWatcher = null;
  var dependenciesFulfilled = null;
  Module['preloadedImages'] = {};
  Module['preloadedAudios'] = {};
  var ASM_CONSTS = [
    function($0, $1, $2, $3, $4, $5, $6, $7) {
      {
        var self = Module['getCache'](Module['ConcreteContactResultCallback'])[
          $0
        ];
        if (!self.hasOwnProperty('addSingleResult'))
          throw 'a JSImplementation must implement all functions, you forgot ConcreteContactResultCallback::addSingleResult.';
        return self['addSingleResult']($1, $2, $3, $4, $5, $6, $7);
      }
    },
  ];
  function _emscripten_asm_const_diiiiiiii(
    code,
    a0,
    a1,
    a2,
    a3,
    a4,
    a5,
    a6,
    a7
  ) {
    return ASM_CONSTS[code](a0, a1, a2, a3, a4, a5, a6, a7);
  }
  STATIC_BASE = 8;
  STATICTOP = STATIC_BASE + 26272;
  __ATINIT__.push({
    func: function() {
      __GLOBAL__sub_I_btQuickprof_cpp();
    },
  });
  allocate(
    [
      88,
      37,
      0,
      0,
      220,
      37,
      0,
      0,
      128,
      37,
      0,
      0,
      7,
      38,
      0,
      0,
      8,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      88,
      37,
      0,
      0,
      57,
      38,
      0,
      0,
      88,
      37,
      0,
      0,
      78,
      38,
      0,
      0,
      128,
      37,
      0,
      0,
      94,
      38,
      0,
      0,
      40,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      88,
      37,
      0,
      0,
      117,
      38,
      0,
      0,
      128,
      37,
      0,
      0,
      145,
      38,
      0,
      0,
      64,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      88,
      37,
      0,
      0,
      167,
      38,
      0,
      0,
      128,
      37,
      0,
      0,
      207,
      38,
      0,
      0,
      88,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      88,
      37,
      0,
      0,
      254,
      38,
      0,
      0,
      128,
      37,
      0,
      0,
      42,
      39,
      0,
      0,
      112,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      128,
      37,
      0,
      0,
      114,
      40,
      0,
      0,
      152,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      88,
      37,
      0,
      0,
      140,
      40,
      0,
      0,
      128,
      37,
      0,
      0,
      159,
      40,
      0,
      0,
      0,
      4,
      0,
      0,
      0,
      0,
      0,
      0,
      128,
      37,
      0,
      0,
      203,
      40,
      0,
      0,
      192,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      88,
      37,
      0,
      0,
      248,
      40,
      0,
      0,
      128,
      37,
      0,
      0,
      25,
      41,
      0,
      0,
      192,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      128,
      37,
      0,
      0,
      71,
      41,
      0,
      0,
      192,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      128,
      37,
      0,
      0,
      123,
      41,
      0,
      0,
      192,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      128,
      37,
      0,
      0,
      182,
      41,
      0,
      0,
      176,
      3,
      0,
      0,
      0,
      0,
      0,
      0,
      128,
      37,
      0,
      0,
      136,
      42,
      0,
      0,
      24,
      1,
      0,
      0,
      0,
      0,
      0,
      0,
      88,
      37,
      0,
      0,
      168,
      42,
      0,
      0,
      88,
      37,
      0,
      0,
      187,
      42,
      0,
      0,
      128,
      37,
      0,
      0,
      208,
      42,
      0,
      0,
      32,
      1,
      0,
      0,
      0,
      0,
      0,
      0,
      128,
      37,
      0,
      0,
      230,
      42,
      0,
      0,
      48,
      8,
      0,
      0,
      0,
      0,
      0,
      0,
      128,
      37,
      0,
      0,
      60,
      43,
      0,
      0,
      24,
      1,
      0,
      0,
      0,
      0,
      0,
      0,
      128,
      37,
      0,
      0,
      95,
      43,
      0,
      0,
      104,
      1,
      0,
      0,
      0,
      0,
      0,
      0,
      128,
      37,
      0,
      0,
      129,
      43,
      0,
      0,
      24,
      1,
      0,
      0,
      0,
      0,
      0,
      0,
      128,
      37,
      0,
      0,
      162,
      43,
      0,
      0,
      176,
      7,
      0,
      0,
      0,
      0,
      0,
      0,
      128,
      37,
      0,
      0,
      230,
      43,
      0,
      0,
      104,
      1,
      0,
      0,
      0,
      0,
      0,
      0,
      128,
      37,
      0,
      0,
      8,
      44,
      0,
      0,
      24,
      1,
      0,
      0,
      0,
      0,
      0,
      0,
      128,
      37,
      0,
      0,
      42,
      44,
      0,
      0,
      184,
      1,
      0,
      0,
      0,
      0,
      0,
      0,
      88,
      37,
      0,
      0,
      74,
      44,
      0,
      0,
      128,
      37,
      0,
      0,
      97,
      44,
      0,
      0,
      184,
      1,
      0,
      0,
      0,
      0,
      0,
      0,
      128,
      37,
      0,
      0,
      135,
      44,
      0,
      0,
      208,
      7,
      0,
      0,
      0,
      0,
      0,
      0,
      128,
      37,
      0,
      0,
      164,
      44,
      0,
      0,
      208,
      7,
      0,
      0,
      0,
      0,
      0,
      0,
      88,
      37,
      0,
      0,
      68,
      45,
      0,
      0,
      128,
      37,
      0,
      0,
      97,
      45,
      0,
      0,
      120,
      7,
      0,
      0,
      0,
      0,
      0,
      0,
      128,
      37,
      0,
      0,
      124,
      45,
      0,
      0,
      96,
      2,
      0,
      0,
      0,
      0,
      0,
      0,
      128,
      37,
      0,
      0,
      159,
      45,
      0,
      0,
      40,
      2,
      0,
      0,
      0,
      0,
      0,
      0,
      128,
      37,
      0,
      0,
      185,
      45,
      0,
      0,
      56,
      2,
      0,
      0,
      0,
      0,
      0,
      0,
      88,
      37,
      0,
      0,
      211,
      45,
      0,
      0,
      128,
      37,
      0,
      0,
      37,
      46,
      0,
      0,
      184,
      1,
      0,
      0,
      0,
      0,
      0,
      0,
      128,
      37,
      0,
      0,
      68,
      46,
      0,
      0,
      176,
      3,
      0,
      0,
      0,
      0,
      0,
      0,
      128,
      37,
      0,
      0,
      103,
      46,
      0,
      0,
      112,
      2,
      0,
      0,
      0,
      0,
      0,
      0,
      128,
      37,
      0,
      0,
      129,
      46,
      0,
      0,
      40,
      5,
      0,
      0,
      0,
      0,
      0,
      0,
      128,
      37,
      0,
      0,
      36,
      47,
      0,
      0,
      16,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      128,
      37,
      0,
      0,
      53,
      48,
      0,
      0,
      160,
      2,
      0,
      0,
      0,
      0,
      0,
      0,
      88,
      37,
      0,
      0,
      83,
      48,
      0,
      0,
      128,
      37,
      0,
      0,
      129,
      48,
      0,
      0,
      184,
      2,
      0,
      0,
      0,
      0,
      0,
      0,
      188,
      37,
      0,
      0,
      155,
      48,
      0,
      0,
      0,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      208,
      2,
      0,
      0,
      2,
      4,
      0,
      0,
      88,
      37,
      0,
      0,
      175,
      48,
      0,
      0,
      128,
      37,
      0,
      0,
      219,
      48,
      0,
      0,
      168,
      2,
      0,
      0,
      0,
      0,
      0,
      0,
      128,
      37,
      0,
      0,
      29,
      49,
      0,
      0,
      184,
      2,
      0,
      0,
      0,
      0,
      0,
      0,
      128,
      37,
      0,
      0,
      115,
      49,
      0,
      0,
      184,
      2,
      0,
      0,
      0,
      0,
      0,
      0,
      128,
      37,
      0,
      0,
      159,
      49,
      0,
      0,
      184,
      2,
      0,
      0,
      0,
      0,
      0,
      0,
      128,
      37,
      0,
      0,
      209,
      49,
      0,
      0,
      184,
      2,
      0,
      0,
      0,
      0,
      0,
      0,
      128,
      37,
      0,
      0,
      0,
      50,
      0,
      0,
      56,
      3,
      0,
      0,
      0,
      0,
      0,
      0,
      88,
      37,
      0,
      0,
      38,
      50,
      0,
      0,
      128,
      37,
      0,
      0,
      133,
      50,
      0,
      0,
      80,
      3,
      0,
      0,
      0,
      0,
      0,
      0,
      88,
      37,
      0,
      0,
      152,
      50,
      0,
      0,
      128,
      37,
      0,
      0,
      172,
      50,
      0,
      0,
      32,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      128,
      37,
      0,
      0,
      200,
      50,
      0,
      0,
      120,
      3,
      0,
      0,
      0,
      0,
      0,
      0,
      128,
      37,
      0,
      0,
      233,
      50,
      0,
      0,
      80,
      3,
      0,
      0,
      0,
      0,
      0,
      0,
      128,
      37,
      0,
      0,
      10,
      51,
      0,
      0,
      16,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      128,
      37,
      0,
      0,
      56,
      51,
      0,
      0,
      168,
      3,
      0,
      0,
      0,
      0,
      0,
      0,
      88,
      37,
      0,
      0,
      81,
      51,
      0,
      0,
      88,
      37,
      0,
      0,
      96,
      51,
      0,
      0,
      128,
      37,
      0,
      0,
      143,
      51,
      0,
      0,
      176,
      3,
      0,
      0,
      0,
      0,
      0,
      0,
      128,
      37,
      0,
      0,
      159,
      51,
      0,
      0,
      184,
      3,
      0,
      0,
      0,
      0,
      0,
      0,
      128,
      37,
      0,
      0,
      186,
      51,
      0,
      0,
      136,
      9,
      0,
      0,
      0,
      0,
      0,
      0,
      128,
      37,
      0,
      0,
      210,
      51,
      0,
      0,
      248,
      3,
      0,
      0,
      0,
      0,
      0,
      0,
      88,
      37,
      0,
      0,
      236,
      51,
      0,
      0,
      128,
      37,
      0,
      0,
      0,
      52,
      0,
      0,
      16,
      4,
      0,
      0,
      0,
      0,
      0,
      0,
      88,
      37,
      0,
      0,
      34,
      52,
      0,
      0,
      128,
      37,
      0,
      0,
      61,
      52,
      0,
      0,
      192,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      128,
      37,
      0,
      0,
      111,
      52,
      0,
      0,
      192,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      128,
      37,
      0,
      0,
      168,
      52,
      0,
      0,
      192,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      128,
      37,
      0,
      0,
      213,
      52,
      0,
      0,
      192,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      128,
      37,
      0,
      0,
      10,
      53,
      0,
      0,
      192,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      128,
      37,
      0,
      0,
      62,
      53,
      0,
      0,
      192,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      128,
      37,
      0,
      0,
      95,
      53,
      0,
      0,
      192,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      128,
      37,
      0,
      0,
      144,
      53,
      0,
      0,
      192,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      128,
      37,
      0,
      0,
      195,
      53,
      0,
      0,
      192,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      128,
      37,
      0,
      0,
      238,
      53,
      0,
      0,
      192,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      88,
      37,
      0,
      0,
      30,
      54,
      0,
      0,
      128,
      37,
      0,
      0,
      101,
      54,
      0,
      0,
      184,
      1,
      0,
      0,
      0,
      0,
      0,
      0,
      128,
      37,
      0,
      0,
      135,
      54,
      0,
      0,
      56,
      10,
      0,
      0,
      0,
      0,
      0,
      0,
      128,
      37,
      0,
      0,
      171,
      54,
      0,
      0,
      208,
      7,
      0,
      0,
      0,
      0,
      0,
      0,
      128,
      37,
      0,
      0,
      198,
      54,
      0,
      0,
      208,
      7,
      0,
      0,
      0,
      0,
      0,
      0,
      128,
      37,
      0,
      0,
      100,
      55,
      0,
      0,
      56,
      10,
      0,
      0,
      0,
      0,
      0,
      0,
      128,
      37,
      0,
      0,
      129,
      55,
      0,
      0,
      32,
      5,
      0,
      0,
      0,
      0,
      0,
      0,
      88,
      37,
      0,
      0,
      148,
      55,
      0,
      0,
      88,
      37,
      0,
      0,
      196,
      55,
      0,
      0,
      188,
      37,
      0,
      0,
      189,
      56,
      0,
      0,
      0,
      0,
      0,
      0,
      2,
      0,
      0,
      0,
      208,
      7,
      0,
      0,
      2,
      0,
      0,
      0,
      216,
      7,
      0,
      0,
      2,
      4,
      0,
      0,
      128,
      37,
      0,
      0,
      209,
      56,
      0,
      0,
      40,
      2,
      0,
      0,
      0,
      0,
      0,
      0,
      128,
      37,
      0,
      0,
      231,
      56,
      0,
      0,
      152,
      9,
      0,
      0,
      0,
      0,
      0,
      0,
      128,
      37,
      0,
      0,
      122,
      57,
      0,
      0,
      152,
      9,
      0,
      0,
      0,
      0,
      0,
      0,
      128,
      37,
      0,
      0,
      15,
      58,
      0,
      0,
      24,
      1,
      0,
      0,
      0,
      0,
      0,
      0,
      128,
      37,
      0,
      0,
      141,
      58,
      0,
      0,
      88,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      128,
      37,
      0,
      0,
      78,
      59,
      0,
      0,
      168,
      9,
      0,
      0,
      0,
      0,
      0,
      0,
      128,
      37,
      0,
      0,
      253,
      59,
      0,
      0,
      168,
      9,
      0,
      0,
      0,
      0,
      0,
      0,
      128,
      37,
      0,
      0,
      194,
      60,
      0,
      0,
      8,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      128,
      37,
      0,
      0,
      111,
      61,
      0,
      0,
      40,
      2,
      0,
      0,
      0,
      0,
      0,
      0,
      128,
      37,
      0,
      0,
      135,
      61,
      0,
      0,
      56,
      2,
      0,
      0,
      0,
      0,
      0,
      0,
      128,
      37,
      0,
      0,
      161,
      61,
      0,
      0,
      16,
      5,
      0,
      0,
      0,
      0,
      0,
      0,
      128,
      37,
      0,
      0,
      187,
      61,
      0,
      0,
      56,
      10,
      0,
      0,
      0,
      0,
      0,
      0,
      128,
      37,
      0,
      0,
      224,
      61,
      0,
      0,
      192,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      128,
      37,
      0,
      0,
      8,
      62,
      0,
      0,
      56,
      10,
      0,
      0,
      0,
      0,
      0,
      0,
      128,
      37,
      0,
      0,
      34,
      62,
      0,
      0,
      32,
      5,
      0,
      0,
      0,
      0,
      0,
      0,
      128,
      37,
      0,
      0,
      167,
      62,
      0,
      0,
      32,
      5,
      0,
      0,
      0,
      0,
      0,
      0,
      128,
      37,
      0,
      0,
      52,
      63,
      0,
      0,
      16,
      5,
      0,
      0,
      0,
      0,
      0,
      0,
      128,
      37,
      0,
      0,
      79,
      63,
      0,
      0,
      56,
      10,
      0,
      0,
      0,
      0,
      0,
      0,
      128,
      37,
      0,
      0,
      110,
      63,
      0,
      0,
      24,
      1,
      0,
      0,
      0,
      0,
      0,
      0,
      128,
      37,
      0,
      0,
      135,
      63,
      0,
      0,
      56,
      10,
      0,
      0,
      0,
      0,
      0,
      0,
      128,
      37,
      0,
      0,
      174,
      63,
      0,
      0,
      24,
      1,
      0,
      0,
      0,
      0,
      0,
      0,
      128,
      37,
      0,
      0,
      207,
      63,
      0,
      0,
      152,
      7,
      0,
      0,
      0,
      0,
      0,
      0,
      128,
      37,
      0,
      0,
      23,
      64,
      0,
      0,
      176,
      7,
      0,
      0,
      0,
      0,
      0,
      0,
      128,
      37,
      0,
      0,
      58,
      64,
      0,
      0,
      176,
      6,
      0,
      0,
      0,
      0,
      0,
      0,
      128,
      37,
      0,
      0,
      79,
      64,
      0,
      0,
      176,
      6,
      0,
      0,
      0,
      0,
      0,
      0,
      128,
      37,
      0,
      0,
      100,
      64,
      0,
      0,
      176,
      7,
      0,
      0,
      0,
      0,
      0,
      0,
      128,
      37,
      0,
      0,
      123,
      64,
      0,
      0,
      56,
      7,
      0,
      0,
      0,
      0,
      0,
      0,
      128,
      37,
      0,
      0,
      188,
      64,
      0,
      0,
      16,
      7,
      0,
      0,
      0,
      0,
      0,
      0,
      88,
      37,
      0,
      0,
      42,
      65,
      0,
      0,
      128,
      37,
      0,
      0,
      66,
      65,
      0,
      0,
      16,
      7,
      0,
      0,
      0,
      0,
      0,
      0,
      128,
      37,
      0,
      0,
      170,
      65,
      0,
      0,
      16,
      7,
      0,
      0,
      0,
      0,
      0,
      0,
      128,
      37,
      0,
      0,
      27,
      66,
      0,
      0,
      48,
      8,
      0,
      0,
      0,
      0,
      0,
      0,
      128,
      37,
      0,
      0,
      62,
      66,
      0,
      0,
      216,
      7,
      0,
      0,
      0,
      0,
      0,
      0,
      128,
      37,
      0,
      0,
      164,
      66,
      0,
      0,
      208,
      7,
      0,
      0,
      0,
      0,
      0,
      0,
      128,
      37,
      0,
      0,
      188,
      66,
      0,
      0,
      48,
      8,
      0,
      0,
      0,
      0,
      0,
      0,
      128,
      37,
      0,
      0,
      244,
      66,
      0,
      0,
      176,
      7,
      0,
      0,
      0,
      0,
      0,
      0,
      128,
      37,
      0,
      0,
      14,
      67,
      0,
      0,
      120,
      7,
      0,
      0,
      0,
      0,
      0,
      0,
      88,
      37,
      0,
      0,
      51,
      67,
      0,
      0,
      128,
      37,
      0,
      0,
      91,
      67,
      0,
      0,
      152,
      7,
      0,
      0,
      0,
      0,
      0,
      0,
      128,
      37,
      0,
      0,
      107,
      67,
      0,
      0,
      160,
      7,
      0,
      0,
      0,
      0,
      0,
      0,
      128,
      37,
      0,
      0,
      131,
      67,
      0,
      0,
      136,
      7,
      0,
      0,
      0,
      0,
      0,
      0,
      88,
      37,
      0,
      0,
      180,
      67,
      0,
      0,
      88,
      37,
      0,
      0,
      201,
      67,
      0,
      0,
      128,
      37,
      0,
      0,
      235,
      67,
      0,
      0,
      176,
      7,
      0,
      0,
      0,
      0,
      0,
      0,
      128,
      37,
      0,
      0,
      28,
      68,
      0,
      0,
      224,
      7,
      0,
      0,
      0,
      0,
      0,
      0,
      128,
      37,
      0,
      0,
      55,
      68,
      0,
      0,
      224,
      7,
      0,
      0,
      0,
      0,
      0,
      0,
      128,
      37,
      0,
      0,
      82,
      68,
      0,
      0,
      136,
      7,
      0,
      0,
      0,
      0,
      0,
      0,
      128,
      37,
      0,
      0,
      124,
      68,
      0,
      0,
      216,
      7,
      0,
      0,
      0,
      0,
      0,
      0,
      128,
      37,
      0,
      0,
      153,
      68,
      0,
      0,
      152,
      7,
      0,
      0,
      0,
      0,
      0,
      0,
      128,
      37,
      0,
      0,
      170,
      68,
      0,
      0,
      120,
      7,
      0,
      0,
      0,
      0,
      0,
      0,
      128,
      37,
      0,
      0,
      187,
      68,
      0,
      0,
      144,
      9,
      0,
      0,
      0,
      0,
      0,
      0,
      128,
      37,
      0,
      0,
      204,
      68,
      0,
      0,
      216,
      7,
      0,
      0,
      0,
      0,
      0,
      0,
      128,
      37,
      0,
      0,
      48,
      69,
      0,
      0,
      216,
      7,
      0,
      0,
      0,
      0,
      0,
      0,
      128,
      37,
      0,
      0,
      139,
      69,
      0,
      0,
      48,
      8,
      0,
      0,
      0,
      0,
      0,
      0,
      128,
      37,
      0,
      0,
      179,
      69,
      0,
      0,
      176,
      7,
      0,
      0,
      0,
      0,
      0,
      0,
      128,
      37,
      0,
      0,
      227,
      69,
      0,
      0,
      144,
      8,
      0,
      0,
      0,
      0,
      0,
      0,
      128,
      37,
      0,
      0,
      0,
      70,
      0,
      0,
      144,
      8,
      0,
      0,
      0,
      0,
      0,
      0,
      128,
      37,
      0,
      0,
      29,
      70,
      0,
      0,
      152,
      10,
      0,
      0,
      0,
      0,
      0,
      0,
      128,
      37,
      0,
      0,
      46,
      70,
      0,
      0,
      224,
      8,
      0,
      0,
      0,
      0,
      0,
      0,
      88,
      37,
      0,
      0,
      72,
      70,
      0,
      0,
      128,
      37,
      0,
      0,
      96,
      70,
      0,
      0,
      248,
      8,
      0,
      0,
      0,
      0,
      0,
      0,
      128,
      37,
      0,
      0,
      114,
      70,
      0,
      0,
      64,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      128,
      37,
      0,
      0,
      139,
      70,
      0,
      0,
      208,
      8,
      0,
      0,
      0,
      0,
      0,
      0,
      128,
      37,
      0,
      0,
      154,
      70,
      0,
      0,
      248,
      8,
      0,
      0,
      0,
      0,
      0,
      0,
      128,
      37,
      0,
      0,
      185,
      70,
      0,
      0,
      248,
      3,
      0,
      0,
      0,
      0,
      0,
      0,
      128,
      37,
      0,
      0,
      58,
      71,
      0,
      0,
      248,
      3,
      0,
      0,
      0,
      0,
      0,
      0,
      128,
      37,
      0,
      0,
      168,
      71,
      0,
      0,
      224,
      8,
      0,
      0,
      0,
      0,
      0,
      0,
      128,
      37,
      0,
      0,
      187,
      71,
      0,
      0,
      24,
      1,
      0,
      0,
      0,
      0,
      0,
      0,
      128,
      37,
      0,
      0,
      208,
      71,
      0,
      0,
      24,
      1,
      0,
      0,
      0,
      0,
      0,
      0,
      128,
      37,
      0,
      0,
      230,
      71,
      0,
      0,
      24,
      1,
      0,
      0,
      0,
      0,
      0,
      0,
      88,
      37,
      0,
      0,
      253,
      71,
      0,
      0,
      88,
      37,
      0,
      0,
      12,
      72,
      0,
      0,
      128,
      37,
      0,
      0,
      120,
      72,
      0,
      0,
      208,
      7,
      0,
      0,
      0,
      0,
      0,
      0,
      128,
      37,
      0,
      0,
      148,
      72,
      0,
      0,
      208,
      7,
      0,
      0,
      0,
      0,
      0,
      0,
      128,
      37,
      0,
      0,
      179,
      72,
      0,
      0,
      200,
      9,
      0,
      0,
      0,
      0,
      0,
      0,
      88,
      37,
      0,
      0,
      215,
      72,
      0,
      0,
      128,
      37,
      0,
      0,
      248,
      72,
      0,
      0,
      32,
      5,
      0,
      0,
      0,
      0,
      0,
      0,
      128,
      37,
      0,
      0,
      163,
      73,
      0,
      0,
      200,
      9,
      0,
      0,
      0,
      0,
      0,
      0,
      128,
      37,
      0,
      0,
      196,
      73,
      0,
      0,
      168,
      3,
      0,
      0,
      0,
      0,
      0,
      0,
      128,
      37,
      0,
      0,
      214,
      73,
      0,
      0,
      32,
      5,
      0,
      0,
      0,
      0,
      0,
      0,
      128,
      37,
      0,
      0,
      233,
      73,
      0,
      0,
      168,
      3,
      0,
      0,
      0,
      0,
      0,
      0,
      128,
      37,
      0,
      0,
      7,
      74,
      0,
      0,
      48,
      10,
      0,
      0,
      0,
      0,
      0,
      0,
      88,
      37,
      0,
      0,
      27,
      74,
      0,
      0,
      128,
      37,
      0,
      0,
      66,
      74,
      0,
      0,
      184,
      1,
      0,
      0,
      0,
      0,
      0,
      0,
      128,
      37,
      0,
      0,
      99,
      74,
      0,
      0,
      184,
      1,
      0,
      0,
      0,
      0,
      0,
      0,
      128,
      37,
      0,
      0,
      118,
      74,
      0,
      0,
      56,
      10,
      0,
      0,
      0,
      0,
      0,
      0,
      128,
      37,
      0,
      0,
      153,
      74,
      0,
      0,
      48,
      10,
      0,
      0,
      0,
      0,
      0,
      0,
      128,
      37,
      0,
      0,
      172,
      74,
      0,
      0,
      48,
      10,
      0,
      0,
      0,
      0,
      0,
      0,
      88,
      37,
      0,
      0,
      197,
      74,
      0,
      0,
      88,
      37,
      0,
      0,
      223,
      74,
      0,
      0,
      128,
      37,
      0,
      0,
      244,
      74,
      0,
      0,
      168,
      10,
      0,
      0,
      0,
      0,
      0,
      0,
      88,
      37,
      0,
      0,
      17,
      75,
      0,
      0,
      88,
      37,
      0,
      0,
      74,
      86,
      0,
      0,
      128,
      37,
      0,
      0,
      40,
      86,
      0,
      0,
      216,
      10,
      0,
      0,
      0,
      0,
      0,
      0,
      128,
      37,
      0,
      0,
      213,
      85,
      0,
      0,
      184,
      10,
      0,
      0,
      0,
      0,
      0,
      0,
      128,
      37,
      0,
      0,
      250,
      85,
      0,
      0,
      232,
      10,
      0,
      0,
      0,
      0,
      0,
      0,
      88,
      37,
      0,
      0,
      27,
      86,
      0,
      0,
      128,
      37,
      0,
      0,
      16,
      87,
      0,
      0,
      176,
      10,
      0,
      0,
      0,
      0,
      0,
      0,
      128,
      37,
      0,
      0,
      80,
      87,
      0,
      0,
      216,
      10,
      0,
      0,
      0,
      0,
      0,
      0,
      128,
      37,
      0,
      0,
      44,
      87,
      0,
      0,
      0,
      11,
      0,
      0,
      0,
      0,
      0,
      0,
      128,
      37,
      0,
      0,
      114,
      87,
      0,
      0,
      184,
      10,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      16,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      2,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      48,
      0,
      0,
      0,
      3,
      0,
      0,
      0,
      4,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      2,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      72,
      0,
      0,
      0,
      5,
      0,
      0,
      0,
      6,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      96,
      0,
      0,
      0,
      7,
      0,
      0,
      0,
      8,
      0,
      0,
      0,
      2,
      0,
      0,
      0,
      2,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      120,
      0,
      0,
      0,
      9,
      0,
      0,
      0,
      10,
      0,
      0,
      0,
      3,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      136,
      0,
      0,
      0,
      11,
      0,
      0,
      0,
      12,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      2,
      0,
      0,
      0,
      2,
      0,
      0,
      0,
      3,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      2,
      0,
      0,
      0,
      13,
      0,
      0,
      0,
      3,
      0,
      0,
      0,
      4,
      0,
      0,
      0,
      4,
      0,
      0,
      0,
      3,
      0,
      0,
      0,
      5,
      0,
      0,
      0,
      4,
      0,
      0,
      0,
      5,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      160,
      0,
      0,
      0,
      14,
      0,
      0,
      0,
      15,
      0,
      0,
      0,
      5,
      0,
      0,
      0,
      6,
      0,
      0,
      0,
      2,
      0,
      0,
      0,
      7,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      176,
      0,
      0,
      0,
      16,
      0,
      0,
      0,
      17,
      0,
      0,
      0,
      2,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      200,
      0,
      0,
      0,
      16,
      0,
      0,
      0,
      18,
      0,
      0,
      0,
      3,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      216,
      0,
      0,
      0,
      16,
      0,
      0,
      0,
      19,
      0,
      0,
      0,
      4,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      232,
      0,
      0,
      0,
      16,
      0,
      0,
      0,
      20,
      0,
      0,
      0,
      5,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      248,
      0,
      0,
      0,
      4,
      0,
      0,
      0,
      21,
      0,
      0,
      0,
      22,
      0,
      0,
      0,
      6,
      0,
      0,
      0,
      8,
      0,
      0,
      0,
      3,
      0,
      0,
      0,
      7,
      0,
      0,
      0,
      6,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      8,
      1,
      0,
      0,
      23,
      0,
      0,
      0,
      24,
      0,
      0,
      0,
      7,
      0,
      0,
      0,
      8,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      5,
      0,
      0,
      0,
      6,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      40,
      1,
      0,
      0,
      25,
      0,
      0,
      0,
      26,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      3,
      0,
      0,
      0,
      9,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      56,
      1,
      0,
      0,
      27,
      0,
      0,
      0,
      28,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      8,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      9,
      0,
      0,
      0,
      10,
      0,
      0,
      0,
      2,
      0,
      0,
      0,
      11,
      0,
      0,
      0,
      10,
      0,
      0,
      0,
      4,
      0,
      0,
      0,
      2,
      0,
      0,
      0,
      12,
      0,
      0,
      0,
      4,
      0,
      0,
      0,
      11,
      0,
      0,
      0,
      2,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      72,
      1,
      0,
      0,
      23,
      0,
      0,
      0,
      29,
      0,
      0,
      0,
      7,
      0,
      0,
      0,
      12,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      5,
      0,
      0,
      0,
      6,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      88,
      1,
      0,
      0,
      23,
      0,
      0,
      0,
      30,
      0,
      0,
      0,
      7,
      0,
      0,
      0,
      13,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      5,
      0,
      0,
      0,
      6,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      120,
      1,
      0,
      0,
      31,
      0,
      0,
      0,
      32,
      0,
      0,
      0,
      3,
      0,
      0,
      0,
      8,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      14,
      0,
      0,
      0,
      13,
      0,
      0,
      0,
      3,
      0,
      0,
      0,
      14,
      0,
      0,
      0,
      10,
      0,
      0,
      0,
      5,
      0,
      0,
      0,
      3,
      0,
      0,
      0,
      15,
      0,
      0,
      0,
      5,
      0,
      0,
      0,
      11,
      0,
      0,
      0,
      9,
      0,
      0,
      0,
      10,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      4,
      0,
      0,
      0,
      5,
      0,
      0,
      0,
      16,
      0,
      0,
      0,
      11,
      0,
      0,
      0,
      17,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      136,
      1,
      0,
      0,
      23,
      0,
      0,
      0,
      33,
      0,
      0,
      0,
      12,
      0,
      0,
      0,
      15,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      5,
      0,
      0,
      0,
      6,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      152,
      1,
      0,
      0,
      23,
      0,
      0,
      0,
      34,
      0,
      0,
      0,
      13,
      0,
      0,
      0,
      15,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      5,
      0,
      0,
      0,
      6,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      168,
      1,
      0,
      0,
      35,
      0,
      0,
      0,
      36,
      0,
      0,
      0,
      2,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      16,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      192,
      1,
      0,
      0,
      37,
      0,
      0,
      0,
      38,
      0,
      0,
      0,
      3,
      0,
      0,
      0,
      2,
      0,
      0,
      0,
      17,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      208,
      1,
      0,
      0,
      39,
      0,
      0,
      0,
      40,
      0,
      0,
      0,
      6,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      224,
      1,
      0,
      0,
      41,
      0,
      0,
      0,
      42,
      0,
      0,
      0,
      7,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      240,
      1,
      0,
      0,
      6,
      0,
      0,
      0,
      18,
      0,
      0,
      0,
      14,
      0,
      0,
      0,
      43,
      0,
      0,
      0,
      44,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      248,
      1,
      0,
      0,
      45,
      0,
      0,
      0,
      46,
      0,
      0,
      0,
      8,
      0,
      0,
      0,
      8,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      14,
      0,
      0,
      0,
      13,
      0,
      0,
      0,
      4,
      0,
      0,
      0,
      18,
      0,
      0,
      0,
      10,
      0,
      0,
      0,
      7,
      0,
      0,
      0,
      4,
      0,
      0,
      0,
      15,
      0,
      0,
      0,
      5,
      0,
      0,
      0,
      11,
      0,
      0,
      0,
      15,
      0,
      0,
      0,
      16,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      9,
      0,
      0,
      0,
      5,
      0,
      0,
      0,
      19,
      0,
      0,
      0,
      17,
      0,
      0,
      0,
      7,
      0,
      0,
      0,
      20,
      0,
      0,
      0,
      21,
      0,
      0,
      0,
      10,
      0,
      0,
      0,
      18,
      0,
      0,
      0,
      22,
      0,
      0,
      0,
      11,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      12,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      8,
      2,
      0,
      0,
      47,
      0,
      0,
      0,
      48,
      0,
      0,
      0,
      49,
      0,
      0,
      0,
      50,
      0,
      0,
      0,
      19,
      0,
      0,
      0,
      23,
      0,
      0,
      0,
      51,
      0,
      0,
      0,
      13,
      0,
      0,
      0,
      14,
      0,
      0,
      0,
      15,
      0,
      0,
      0,
      20,
      0,
      0,
      0,
      52,
      0,
      0,
      0,
      21,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      19,
      0,
      0,
      0,
      22,
      0,
      0,
      0,
      23,
      0,
      0,
      0,
      24,
      0,
      0,
      0,
      25,
      0,
      0,
      0,
      26,
      0,
      0,
      0,
      53,
      0,
      0,
      0,
      27,
      0,
      0,
      0,
      16,
      0,
      0,
      0,
      28,
      0,
      0,
      0,
      29,
      0,
      0,
      0,
      24,
      0,
      0,
      0,
      25,
      0,
      0,
      0,
      8,
      0,
      0,
      0,
      9,
      0,
      0,
      0,
      26,
      0,
      0,
      0,
      54,
      0,
      0,
      0,
      30,
      0,
      0,
      0,
      31,
      0,
      0,
      0,
      32,
      0,
      0,
      0,
      33,
      0,
      0,
      0,
      8,
      0,
      0,
      0,
      9,
      0,
      0,
      0,
      55,
      0,
      0,
      0,
      34,
      0,
      0,
      0,
      10,
      0,
      0,
      0,
      11,
      0,
      0,
      0,
      12,
      0,
      0,
      0,
      56,
      0,
      0,
      0,
      35,
      0,
      0,
      0,
      13,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      24,
      2,
      0,
      0,
      57,
      0,
      0,
      0,
      58,
      0,
      0,
      0,
      10,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      64,
      2,
      0,
      0,
      59,
      0,
      0,
      0,
      60,
      0,
      0,
      0,
      4,
      0,
      0,
      0,
      3,
      0,
      0,
      0,
      36,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      80,
      2,
      0,
      0,
      11,
      0,
      0,
      0,
      61,
      0,
      0,
      0,
      62,
      0,
      0,
      0,
      37,
      0,
      0,
      0,
      27,
      0,
      0,
      0,
      6,
      0,
      0,
      0,
      38,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      96,
      2,
      0,
      0,
      63,
      0,
      0,
      0,
      64,
      0,
      0,
      0,
      49,
      0,
      0,
      0,
      50,
      0,
      0,
      0,
      19,
      0,
      0,
      0,
      23,
      0,
      0,
      0,
      65,
      0,
      0,
      0,
      13,
      0,
      0,
      0,
      17,
      0,
      0,
      0,
      15,
      0,
      0,
      0,
      39,
      0,
      0,
      0,
      52,
      0,
      0,
      0,
      40,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      19,
      0,
      0,
      0,
      22,
      0,
      0,
      0,
      23,
      0,
      0,
      0,
      24,
      0,
      0,
      0,
      25,
      0,
      0,
      0,
      26,
      0,
      0,
      0,
      53,
      0,
      0,
      0,
      27,
      0,
      0,
      0,
      16,
      0,
      0,
      0,
      28,
      0,
      0,
      0,
      29,
      0,
      0,
      0,
      24,
      0,
      0,
      0,
      25,
      0,
      0,
      0,
      8,
      0,
      0,
      0,
      9,
      0,
      0,
      0,
      28,
      0,
      0,
      0,
      54,
      0,
      0,
      0,
      30,
      0,
      0,
      0,
      31,
      0,
      0,
      0,
      32,
      0,
      0,
      0,
      33,
      0,
      0,
      0,
      14,
      0,
      0,
      0,
      9,
      0,
      0,
      0,
      55,
      0,
      0,
      0,
      34,
      0,
      0,
      0,
      10,
      0,
      0,
      0,
      15,
      0,
      0,
      0,
      12,
      0,
      0,
      0,
      56,
      0,
      0,
      0,
      35,
      0,
      0,
      0,
      13,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      128,
      2,
      0,
      0,
      66,
      0,
      0,
      0,
      67,
      0,
      0,
      0,
      12,
      0,
      0,
      0,
      3,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      144,
      2,
      0,
      0,
      68,
      0,
      0,
      0,
      69,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      168,
      2,
      0,
      0,
      70,
      0,
      0,
      0,
      71,
      0,
      0,
      0,
      72,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      41,
      0,
      0,
      0,
      42,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      4,
      0,
      0,
      0,
      29,
      0,
      0,
      0,
      7,
      0,
      0,
      0,
      73,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      184,
      2,
      0,
      0,
      70,
      0,
      0,
      0,
      74,
      0,
      0,
      0,
      75,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      30,
      0,
      0,
      0,
      8,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      216,
      2,
      0,
      0,
      70,
      0,
      0,
      0,
      76,
      0,
      0,
      0,
      72,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      41,
      0,
      0,
      0,
      43,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      4,
      0,
      0,
      0,
      31,
      0,
      0,
      0,
      9,
      0,
      0,
      0,
      73,
      0,
      0,
      0,
      20,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      232,
      2,
      0,
      0,
      70,
      0,
      0,
      0,
      77,
      0,
      0,
      0,
      78,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      44,
      0,
      0,
      0,
      45,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      2,
      0,
      0,
      0,
      5,
      0,
      0,
      0,
      32,
      0,
      0,
      0,
      10,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      248,
      2,
      0,
      0,
      70,
      0,
      0,
      0,
      79,
      0,
      0,
      0,
      75,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      46,
      0,
      0,
      0,
      47,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      3,
      0,
      0,
      0,
      6,
      0,
      0,
      0,
      33,
      0,
      0,
      0,
      11,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      8,
      3,
      0,
      0,
      70,
      0,
      0,
      0,
      80,
      0,
      0,
      0,
      81,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      48,
      0,
      0,
      0,
      49,
      0,
      0,
      0,
      2,
      0,
      0,
      0,
      4,
      0,
      0,
      0,
      7,
      0,
      0,
      0,
      34,
      0,
      0,
      0,
      12,
      0,
      0,
      0,
      21,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      24,
      3,
      0,
      0,
      70,
      0,
      0,
      0,
      82,
      0,
      0,
      0,
      83,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      50,
      0,
      0,
      0,
      51,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      5,
      0,
      0,
      0,
      8,
      0,
      0,
      0,
      35,
      0,
      0,
      0,
      13,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      40,
      3,
      0,
      0,
      84,
      0,
      0,
      0,
      85,
      0,
      0,
      0,
      22,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      23,
      0,
      0,
      0,
      86,
      0,
      0,
      0,
      36,
      0,
      0,
      0,
      18,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      2,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      2,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      64,
      3,
      0,
      0,
      87,
      0,
      0,
      0,
      88,
      0,
      0,
      0,
      2,
      0,
      0,
      0,
      52,
      0,
      0,
      0,
      16,
      0,
      0,
      0,
      17,
      0,
      0,
      0,
      19,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      88,
      3,
      0,
      0,
      89,
      0,
      0,
      0,
      90,
      0,
      0,
      0,
      6,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      104,
      3,
      0,
      0,
      91,
      0,
      0,
      0,
      92,
      0,
      0,
      0,
      3,
      0,
      0,
      0,
      53,
      0,
      0,
      0,
      54,
      0,
      0,
      0,
      4,
      0,
      0,
      0,
      55,
      0,
      0,
      0,
      56,
      0,
      0,
      0,
      57,
      0,
      0,
      0,
      5,
      0,
      0,
      0,
      37,
      0,
      0,
      0,
      93,
      0,
      0,
      0,
      38,
      0,
      0,
      0,
      58,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      136,
      3,
      0,
      0,
      66,
      0,
      0,
      0,
      94,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      9,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      152,
      3,
      0,
      0,
      95,
      0,
      0,
      0,
      96,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      10,
      215,
      163,
      60,
      1,
      0,
      0,
      0,
      2,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      2,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      176,
      3,
      0,
      0,
      4,
      0,
      0,
      0,
      97,
      0,
      0,
      0,
      98,
      0,
      0,
      0,
      37,
      0,
      0,
      0,
      39,
      0,
      0,
      0,
      14,
      0,
      0,
      0,
      7,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      184,
      3,
      0,
      0,
      4,
      0,
      0,
      0,
      99,
      0,
      0,
      0,
      100,
      0,
      0,
      0,
      37,
      0,
      0,
      0,
      39,
      0,
      0,
      0,
      14,
      0,
      0,
      0,
      7,
      0,
      0,
      0,
      24,
      0,
      0,
      0,
      20,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      200,
      3,
      0,
      0,
      4,
      0,
      0,
      0,
      101,
      0,
      0,
      0,
      102,
      0,
      0,
      0,
      37,
      0,
      0,
      0,
      39,
      0,
      0,
      0,
      14,
      0,
      0,
      0,
      7,
      0,
      0,
      0,
      25,
      0,
      0,
      0,
      21,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      216,
      3,
      0,
      0,
      103,
      0,
      0,
      0,
      104,
      0,
      0,
      0,
      7,
      0,
      0,
      0,
      15,
      0,
      0,
      0,
      59,
      0,
      0,
      0,
      60,
      0,
      0,
      0,
      16,
      0,
      0,
      0,
      17,
      0,
      0,
      0,
      22,
      0,
      0,
      0,
      40,
      0,
      0,
      0,
      13,
      0,
      0,
      0,
      41,
      0,
      0,
      0,
      42,
      0,
      0,
      0,
      43,
      0,
      0,
      0,
      14,
      0,
      0,
      0,
      61,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      232,
      3,
      0,
      0,
      105,
      0,
      0,
      0,
      106,
      0,
      0,
      0,
      15,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      4,
      0,
      0,
      107,
      0,
      0,
      0,
      108,
      0,
      0,
      0,
      5,
      0,
      0,
      0,
      6,
      0,
      0,
      0,
      18,
      0,
      0,
      0,
      7,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      24,
      4,
      0,
      0,
      16,
      0,
      0,
      0,
      109,
      0,
      0,
      0,
      8,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      40,
      4,
      0,
      0,
      16,
      0,
      0,
      0,
      110,
      0,
      0,
      0,
      9,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      56,
      4,
      0,
      0,
      16,
      0,
      0,
      0,
      111,
      0,
      0,
      0,
      10,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      72,
      4,
      0,
      0,
      16,
      0,
      0,
      0,
      112,
      0,
      0,
      0,
      11,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      88,
      4,
      0,
      0,
      16,
      0,
      0,
      0,
      113,
      0,
      0,
      0,
      12,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      104,
      4,
      0,
      0,
      16,
      0,
      0,
      0,
      114,
      0,
      0,
      0,
      13,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      120,
      4,
      0,
      0,
      16,
      0,
      0,
      0,
      115,
      0,
      0,
      0,
      14,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      136,
      4,
      0,
      0,
      16,
      0,
      0,
      0,
      116,
      0,
      0,
      0,
      15,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      152,
      4,
      0,
      0,
      16,
      0,
      0,
      0,
      117,
      0,
      0,
      0,
      16,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      168,
      4,
      0,
      0,
      16,
      0,
      0,
      0,
      118,
      0,
      0,
      0,
      17,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      184,
      4,
      0,
      0,
      119,
      0,
      0,
      0,
      120,
      0,
      0,
      0,
      26,
      0,
      0,
      0,
      62,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      192,
      4,
      0,
      0,
      121,
      0,
      0,
      0,
      122,
      0,
      0,
      0,
      5,
      0,
      0,
      0,
      4,
      0,
      0,
      0,
      63,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      208,
      4,
      0,
      0,
      123,
      0,
      0,
      0,
      124,
      0,
      0,
      0,
      6,
      0,
      0,
      0,
      5,
      0,
      0,
      0,
      64,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      224,
      4,
      0,
      0,
      125,
      0,
      0,
      0,
      126,
      0,
      0,
      0,
      23,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      240,
      4,
      0,
      0,
      41,
      0,
      0,
      0,
      127,
      0,
      0,
      0,
      24,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      5,
      0,
      0,
      128,
      0,
      0,
      0,
      129,
      0,
      0,
      0,
      7,
      0,
      0,
      0,
      6,
      0,
      0,
      0,
      65,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      16,
      5,
      0,
      0,
      130,
      0,
      0,
      0,
      131,
      0,
      0,
      0,
      27,
      0,
      0,
      0,
      28,
      0,
      0,
      0,
      3,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      40,
      5,
      0,
      0,
      132,
      0,
      0,
      0,
      133,
      0,
      0,
      0,
      49,
      0,
      0,
      0,
      50,
      0,
      0,
      0,
      19,
      0,
      0,
      0,
      23,
      0,
      0,
      0,
      134,
      0,
      0,
      0,
      13,
      0,
      0,
      0,
      17,
      0,
      0,
      0,
      25,
      0,
      0,
      0,
      66,
      0,
      0,
      0,
      52,
      0,
      0,
      0,
      67,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      48,
      5,
      0,
      0,
      135,
      0,
      0,
      0,
      136,
      0,
      0,
      0,
      26,
      0,
      0,
      0,
      27,
      0,
      0,
      0,
      252,
      255,
      255,
      255,
      48,
      5,
      0,
      0,
      137,
      0,
      0,
      0,
      138,
      0,
      0,
      0,
      28,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      80,
      5,
      0,
      0,
      57,
      0,
      0,
      0,
      139,
      0,
      0,
      0,
      16,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      96,
      5,
      0,
      0,
      41,
      0,
      0,
      0,
      140,
      0,
      0,
      0,
      29,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      112,
      5,
      0,
      0,
      41,
      0,
      0,
      0,
      141,
      0,
      0,
      0,
      29,
      0,
      0,
      0,
      2,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      128,
      5,
      0,
      0,
      23,
      0,
      0,
      0,
      142,
      0,
      0,
      0,
      7,
      0,
      0,
      0,
      68,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      5,
      0,
      0,
      0,
      6,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      144,
      5,
      0,
      0,
      143,
      0,
      0,
      0,
      144,
      0,
      0,
      0,
      17,
      0,
      0,
      0,
      10,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      160,
      5,
      0,
      0,
      41,
      0,
      0,
      0,
      145,
      0,
      0,
      0,
      30,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      176,
      5,
      0,
      0,
      41,
      0,
      0,
      0,
      146,
      0,
      0,
      0,
      30,
      0,
      0,
      0,
      2,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      192,
      5,
      0,
      0,
      66,
      0,
      0,
      0,
      147,
      0,
      0,
      0,
      18,
      0,
      0,
      0,
      11,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      208,
      5,
      0,
      0,
      57,
      0,
      0,
      0,
      148,
      0,
      0,
      0,
      19,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      224,
      5,
      0,
      0,
      57,
      0,
      0,
      0,
      149,
      0,
      0,
      0,
      20,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      240,
      5,
      0,
      0,
      130,
      0,
      0,
      0,
      150,
      0,
      0,
      0,
      27,
      0,
      0,
      0,
      28,
      0,
      0,
      0,
      4,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      6,
      0,
      0,
      151,
      0,
      0,
      0,
      152,
      0,
      0,
      0,
      8,
      0,
      0,
      0,
      7,
      0,
      0,
      0,
      69,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      16,
      6,
      0,
      0,
      153,
      0,
      0,
      0,
      154,
      0,
      0,
      0,
      18,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      32,
      6,
      0,
      0,
      155,
      0,
      0,
      0,
      156,
      0,
      0,
      0,
      9,
      0,
      0,
      0,
      8,
      0,
      0,
      0,
      70,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      48,
      6,
      0,
      0,
      130,
      0,
      0,
      0,
      157,
      0,
      0,
      0,
      29,
      0,
      0,
      0,
      30,
      0,
      0,
      0,
      5,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      64,
      6,
      0,
      0,
      130,
      0,
      0,
      0,
      158,
      0,
      0,
      0,
      31,
      0,
      0,
      0,
      32,
      0,
      0,
      0,
      6,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      80,
      6,
      0,
      0,
      130,
      0,
      0,
      0,
      159,
      0,
      0,
      0,
      27,
      0,
      0,
      0,
      28,
      0,
      0,
      0,
      7,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      96,
      6,
      0,
      0,
      160,
      0,
      0,
      0,
      161,
      0,
      0,
      0,
      10,
      0,
      0,
      0,
      9,
      0,
      0,
      0,
      71,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      112,
      6,
      0,
      0,
      23,
      0,
      0,
      0,
      162,
      0,
      0,
      0,
      7,
      0,
      0,
      0,
      72,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      5,
      0,
      0,
      0,
      6,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      128,
      6,
      0,
      0,
      163,
      0,
      0,
      0,
      164,
      0,
      0,
      0,
      11,
      0,
      0,
      0,
      10,
      0,
      0,
      0,
      73,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      144,
      6,
      0,
      0,
      23,
      0,
      0,
      0,
      165,
      0,
      0,
      0,
      33,
      0,
      0,
      0,
      15,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      5,
      0,
      0,
      0,
      6,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      160,
      6,
      0,
      0,
      166,
      0,
      0,
      0,
      167,
      0,
      0,
      0,
      31,
      0,
      0,
      0,
      8,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      74,
      0,
      0,
      0,
      44,
      0,
      0,
      0,
      5,
      0,
      0,
      0,
      45,
      0,
      0,
      0,
      10,
      0,
      0,
      0,
      18,
      0,
      0,
      0,
      5,
      0,
      0,
      0,
      46,
      0,
      0,
      0,
      19,
      0,
      0,
      0,
      11,
      0,
      0,
      0,
      75,
      0,
      0,
      0,
      168,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      176,
      6,
      0,
      0,
      31,
      0,
      0,
      0,
      169,
      0,
      0,
      0,
      32,
      0,
      0,
      0,
      8,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      76,
      0,
      0,
      0,
      13,
      0,
      0,
      0,
      6,
      0,
      0,
      0,
      47,
      0,
      0,
      0,
      77,
      0,
      0,
      0,
      7,
      0,
      0,
      0,
      4,
      0,
      0,
      0,
      48,
      0,
      0,
      0,
      20,
      0,
      0,
      0,
      11,
      0,
      0,
      0,
      34,
      0,
      0,
      0,
      35,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      33,
      0,
      0,
      0,
      5,
      0,
      0,
      0,
      16,
      0,
      0,
      0,
      11,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      192,
      6,
      0,
      0,
      31,
      0,
      0,
      0,
      170,
      0,
      0,
      0,
      32,
      0,
      0,
      0,
      8,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      76,
      0,
      0,
      0,
      13,
      0,
      0,
      0,
      6,
      0,
      0,
      0,
      49,
      0,
      0,
      0,
      78,
      0,
      0,
      0,
      7,
      0,
      0,
      0,
      4,
      0,
      0,
      0,
      48,
      0,
      0,
      0,
      20,
      0,
      0,
      0,
      11,
      0,
      0,
      0,
      34,
      0,
      0,
      0,
      35,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      33,
      0,
      0,
      0,
      5,
      0,
      0,
      0,
      16,
      0,
      0,
      0,
      11,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      208,
      6,
      0,
      0,
      31,
      0,
      0,
      0,
      171,
      0,
      0,
      0,
      32,
      0,
      0,
      0,
      8,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      76,
      0,
      0,
      0,
      13,
      0,
      0,
      0,
      6,
      0,
      0,
      0,
      50,
      0,
      0,
      0,
      79,
      0,
      0,
      0,
      7,
      0,
      0,
      0,
      4,
      0,
      0,
      0,
      48,
      0,
      0,
      0,
      20,
      0,
      0,
      0,
      11,
      0,
      0,
      0,
      34,
      0,
      0,
      0,
      35,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      33,
      0,
      0,
      0,
      5,
      0,
      0,
      0,
      16,
      0,
      0,
      0,
      11,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      224,
      6,
      0,
      0,
      31,
      0,
      0,
      0,
      172,
      0,
      0,
      0,
      34,
      0,
      0,
      0,
      8,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      14,
      0,
      0,
      0,
      13,
      0,
      0,
      0,
      7,
      0,
      0,
      0,
      51,
      0,
      0,
      0,
      10,
      0,
      0,
      0,
      19,
      0,
      0,
      0,
      6,
      0,
      0,
      0,
      15,
      0,
      0,
      0,
      5,
      0,
      0,
      0,
      11,
      0,
      0,
      0,
      36,
      0,
      0,
      0,
      37,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      35,
      0,
      0,
      0,
      5,
      0,
      0,
      0,
      16,
      0,
      0,
      0,
      11,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      240,
      6,
      0,
      0,
      173,
      0,
      0,
      0,
      174,
      0,
      0,
      0,
      36,
      0,
      0,
      0,
      8,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      80,
      0,
      0,
      0,
      52,
      0,
      0,
      0,
      8,
      0,
      0,
      0,
      53,
      0,
      0,
      0,
      10,
      0,
      0,
      0,
      4,
      0,
      0,
      0,
      2,
      0,
      0,
      0,
      54,
      0,
      0,
      0,
      21,
      0,
      0,
      0,
      11,
      0,
      0,
      0,
      37,
      0,
      0,
      0,
      38,
      0,
      0,
      0,
      39,
      0,
      0,
      0,
      81,
      0,
      0,
      0,
      82,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      7,
      0,
      0,
      175,
      0,
      0,
      0,
      176,
      0,
      0,
      0,
      40,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      24,
      7,
      0,
      0,
      175,
      0,
      0,
      0,
      177,
      0,
      0,
      0,
      41,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      40,
      7,
      0,
      0,
      175,
      0,
      0,
      0,
      178,
      0,
      0,
      0,
      42,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      56,
      7,
      0,
      0,
      179,
      0,
      0,
      0,
      180,
      0,
      0,
      0,
      36,
      0,
      0,
      0,
      8,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      83,
      0,
      0,
      0,
      52,
      0,
      0,
      0,
      8,
      0,
      0,
      0,
      55,
      0,
      0,
      0,
      10,
      0,
      0,
      0,
      4,
      0,
      0,
      0,
      2,
      0,
      0,
      0,
      12,
      0,
      0,
      0,
      4,
      0,
      0,
      0,
      11,
      0,
      0,
      0,
      38,
      0,
      0,
      0,
      38,
      0,
      0,
      0,
      39,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      72,
      7,
      0,
      0,
      181,
      0,
      0,
      0,
      182,
      0,
      0,
      0,
      39,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      88,
      7,
      0,
      0,
      41,
      0,
      0,
      0,
      183,
      0,
      0,
      0,
      40,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      104,
      7,
      0,
      0,
      184,
      0,
      0,
      0,
      185,
      0,
      0,
      0,
      41,
      0,
      0,
      0,
      8,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      84,
      0,
      0,
      0,
      56,
      0,
      0,
      0,
      9,
      0,
      0,
      0,
      57,
      0,
      0,
      0,
      10,
      0,
      0,
      0,
      4,
      0,
      0,
      0,
      2,
      0,
      0,
      0,
      58,
      0,
      0,
      0,
      22,
      0,
      0,
      0,
      11,
      0,
      0,
      0,
      42,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      120,
      7,
      0,
      0,
      45,
      0,
      0,
      0,
      186,
      0,
      0,
      0,
      32,
      0,
      0,
      0,
      8,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      14,
      0,
      0,
      0,
      13,
      0,
      0,
      0,
      10,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      10,
      0,
      0,
      0,
      7,
      0,
      0,
      0,
      4,
      0,
      0,
      0,
      15,
      0,
      0,
      0,
      5,
      0,
      0,
      0,
      11,
      0,
      0,
      0,
      15,
      0,
      0,
      0,
      43,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      43,
      0,
      0,
      0,
      5,
      0,
      0,
      0,
      16,
      0,
      0,
      0,
      11,
      0,
      0,
      0,
      7,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      192,
      7,
      0,
      0,
      187,
      0,
      0,
      0,
      188,
      0,
      0,
      0,
      44,
      0,
      0,
      0,
      8,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      85,
      0,
      0,
      0,
      13,
      0,
      0,
      0,
      10,
      0,
      0,
      0,
      59,
      0,
      0,
      0,
      10,
      0,
      0,
      0,
      7,
      0,
      0,
      0,
      4,
      0,
      0,
      0,
      60,
      0,
      0,
      0,
      23,
      0,
      0,
      0,
      11,
      0,
      0,
      0,
      44,
      0,
      0,
      0,
      45,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      45,
      0,
      0,
      0,
      5,
      0,
      0,
      0,
      16,
      0,
      0,
      0,
      11,
      0,
      0,
      0,
      7,
      0,
      0,
      0,
      61,
      0,
      0,
      0,
      62,
      0,
      0,
      0,
      46,
      0,
      0,
      0,
      46,
      0,
      0,
      0,
      63,
      0,
      0,
      0,
      47,
      0,
      0,
      0,
      2,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      224,
      7,
      0,
      0,
      31,
      0,
      0,
      0,
      189,
      0,
      0,
      0,
      48,
      0,
      0,
      0,
      8,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      86,
      0,
      0,
      0,
      13,
      0,
      0,
      0,
      11,
      0,
      0,
      0,
      64,
      0,
      0,
      0,
      87,
      0,
      0,
      0,
      20,
      0,
      0,
      0,
      4,
      0,
      0,
      0,
      65,
      0,
      0,
      0,
      24,
      0,
      0,
      0,
      11,
      0,
      0,
      0,
      15,
      0,
      0,
      0,
      47,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      49,
      0,
      0,
      0,
      5,
      0,
      0,
      0,
      16,
      0,
      0,
      0,
      11,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      240,
      7,
      0,
      0,
      31,
      0,
      0,
      0,
      190,
      0,
      0,
      0,
      48,
      0,
      0,
      0,
      8,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      86,
      0,
      0,
      0,
      13,
      0,
      0,
      0,
      11,
      0,
      0,
      0,
      66,
      0,
      0,
      0,
      87,
      0,
      0,
      0,
      20,
      0,
      0,
      0,
      4,
      0,
      0,
      0,
      65,
      0,
      0,
      0,
      24,
      0,
      0,
      0,
      11,
      0,
      0,
      0,
      15,
      0,
      0,
      0,
      47,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      49,
      0,
      0,
      0,
      5,
      0,
      0,
      0,
      16,
      0,
      0,
      0,
      11,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      8,
      0,
      0,
      31,
      0,
      0,
      0,
      191,
      0,
      0,
      0,
      48,
      0,
      0,
      0,
      8,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      86,
      0,
      0,
      0,
      13,
      0,
      0,
      0,
      11,
      0,
      0,
      0,
      67,
      0,
      0,
      0,
      87,
      0,
      0,
      0,
      20,
      0,
      0,
      0,
      4,
      0,
      0,
      0,
      65,
      0,
      0,
      0,
      24,
      0,
      0,
      0,
      11,
      0,
      0,
      0,
      15,
      0,
      0,
      0,
      47,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      49,
      0,
      0,
      0,
      5,
      0,
      0,
      0,
      16,
      0,
      0,
      0,
      11,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      16,
      8,
      0,
      0,
      45,
      0,
      0,
      0,
      192,
      0,
      0,
      0,
      44,
      0,
      0,
      0,
      8,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      88,
      0,
      0,
      0,
      68,
      0,
      0,
      0,
      10,
      0,
      0,
      0,
      69,
      0,
      0,
      0,
      10,
      0,
      0,
      0,
      7,
      0,
      0,
      0,
      4,
      0,
      0,
      0,
      15,
      0,
      0,
      0,
      5,
      0,
      0,
      0,
      11,
      0,
      0,
      0,
      48,
      0,
      0,
      0,
      49,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      50,
      0,
      0,
      0,
      5,
      0,
      0,
      0,
      16,
      0,
      0,
      0,
      11,
      0,
      0,
      0,
      7,
      0,
      0,
      0,
      70,
      0,
      0,
      0,
      71,
      0,
      0,
      0,
      51,
      0,
      0,
      0,
      50,
      0,
      0,
      0,
      72,
      0,
      0,
      0,
      52,
      0,
      0,
      0,
      3,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      32,
      8,
      0,
      0,
      181,
      0,
      0,
      0,
      193,
      0,
      0,
      0,
      53,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      64,
      8,
      0,
      0,
      45,
      0,
      0,
      0,
      194,
      0,
      0,
      0,
      54,
      0,
      0,
      0,
      8,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      89,
      0,
      0,
      0,
      13,
      0,
      0,
      0,
      12,
      0,
      0,
      0,
      73,
      0,
      0,
      0,
      10,
      0,
      0,
      0,
      21,
      0,
      0,
      0,
      4,
      0,
      0,
      0,
      15,
      0,
      0,
      0,
      5,
      0,
      0,
      0,
      11,
      0,
      0,
      0,
      51,
      0,
      0,
      0,
      52,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      55,
      0,
      0,
      0,
      5,
      0,
      0,
      0,
      74,
      0,
      0,
      0,
      53,
      0,
      0,
      0,
      7,
      0,
      0,
      0,
      75,
      0,
      0,
      0,
      76,
      0,
      0,
      0,
      56,
      0,
      0,
      0,
      54,
      0,
      0,
      0,
      77,
      0,
      0,
      0,
      57,
      0,
      0,
      0,
      4,
      0,
      0,
      0,
      55,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      80,
      8,
      0,
      0,
      195,
      0,
      0,
      0,
      196,
      0,
      0,
      0,
      19,
      0,
      0,
      0,
      78,
      0,
      0,
      0,
      25,
      0,
      0,
      0,
      90,
      0,
      0,
      0,
      91,
      0,
      0,
      0,
      20,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      96,
      8,
      0,
      0,
      181,
      0,
      0,
      0,
      197,
      0,
      0,
      0,
      58,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      112,
      8,
      0,
      0,
      181,
      0,
      0,
      0,
      198,
      0,
      0,
      0,
      59,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      128,
      8,
      0,
      0,
      199,
      0,
      0,
      0,
      200,
      0,
      0,
      0,
      60,
      0,
      0,
      0,
      8,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      92,
      0,
      0,
      0,
      79,
      0,
      0,
      0,
      13,
      0,
      0,
      0,
      80,
      0,
      0,
      0,
      10,
      0,
      0,
      0,
      4,
      0,
      0,
      0,
      2,
      0,
      0,
      0,
      12,
      0,
      0,
      0,
      4,
      0,
      0,
      0,
      11,
      0,
      0,
      0,
      61,
      0,
      0,
      0,
      12,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      144,
      8,
      0,
      0,
      31,
      0,
      0,
      0,
      201,
      0,
      0,
      0,
      62,
      0,
      0,
      0,
      8,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      93,
      0,
      0,
      0,
      13,
      0,
      0,
      0,
      14,
      0,
      0,
      0,
      81,
      0,
      0,
      0,
      94,
      0,
      0,
      0,
      22,
      0,
      0,
      0,
      4,
      0,
      0,
      0,
      82,
      0,
      0,
      0,
      26,
      0,
      0,
      0,
      11,
      0,
      0,
      0,
      56,
      0,
      0,
      0,
      57,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      63,
      0,
      0,
      0,
      5,
      0,
      0,
      0,
      16,
      0,
      0,
      0,
      11,
      0,
      0,
      0,
      7,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      160,
      8,
      0,
      0,
      31,
      0,
      0,
      0,
      202,
      0,
      0,
      0,
      62,
      0,
      0,
      0,
      8,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      93,
      0,
      0,
      0,
      13,
      0,
      0,
      0,
      14,
      0,
      0,
      0,
      83,
      0,
      0,
      0,
      94,
      0,
      0,
      0,
      22,
      0,
      0,
      0,
      4,
      0,
      0,
      0,
      82,
      0,
      0,
      0,
      26,
      0,
      0,
      0,
      11,
      0,
      0,
      0,
      56,
      0,
      0,
      0,
      58,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      64,
      0,
      0,
      0,
      5,
      0,
      0,
      0,
      16,
      0,
      0,
      0,
      11,
      0,
      0,
      0,
      8,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      176,
      8,
      0,
      0,
      31,
      0,
      0,
      0,
      203,
      0,
      0,
      0,
      62,
      0,
      0,
      0,
      8,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      93,
      0,
      0,
      0,
      13,
      0,
      0,
      0,
      14,
      0,
      0,
      0,
      84,
      0,
      0,
      0,
      94,
      0,
      0,
      0,
      22,
      0,
      0,
      0,
      4,
      0,
      0,
      0,
      82,
      0,
      0,
      0,
      26,
      0,
      0,
      0,
      11,
      0,
      0,
      0,
      56,
      0,
      0,
      0,
      59,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      65,
      0,
      0,
      0,
      5,
      0,
      0,
      0,
      16,
      0,
      0,
      0,
      11,
      0,
      0,
      0,
      9,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      192,
      8,
      0,
      0,
      204,
      0,
      0,
      0,
      205,
      0,
      0,
      0,
      66,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      2,
      0,
      0,
      0,
      95,
      0,
      0,
      0,
      96,
      0,
      0,
      0,
      85,
      0,
      0,
      0,
      97,
      0,
      0,
      0,
      98,
      0,
      0,
      0,
      86,
      0,
      0,
      0,
      60,
      0,
      0,
      0,
      61,
      0,
      0,
      0,
      87,
      0,
      0,
      0,
      27,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      208,
      8,
      0,
      0,
      206,
      0,
      0,
      0,
      207,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      62,
      0,
      0,
      0,
      12,
      0,
      0,
      0,
      67,
      0,
      0,
      0,
      2,
      0,
      0,
      0,
      68,
      0,
      0,
      0,
      99,
      0,
      0,
      0,
      88,
      0,
      0,
      0,
      89,
      0,
      0,
      0,
      63,
      0,
      0,
      0,
      100,
      0,
      0,
      0,
      208,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      232,
      8,
      0,
      0,
      209,
      0,
      0,
      0,
      210,
      0,
      0,
      0,
      28,
      0,
      0,
      0,
      21,
      0,
      0,
      0,
      64,
      0,
      0,
      0,
      90,
      0,
      0,
      0,
      91,
      0,
      0,
      0,
      92,
      0,
      0,
      0,
      65,
      0,
      0,
      0,
      93,
      0,
      0,
      0,
      66,
      0,
      0,
      0,
      101,
      0,
      0,
      0,
      67,
      0,
      0,
      0,
      29,
      0,
      0,
      0,
      94,
      0,
      0,
      0,
      102,
      0,
      0,
      0,
      103,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      8,
      9,
      0,
      0,
      206,
      0,
      0,
      0,
      211,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      62,
      0,
      0,
      0,
      12,
      0,
      0,
      0,
      67,
      0,
      0,
      0,
      2,
      0,
      0,
      0,
      68,
      0,
      0,
      0,
      99,
      0,
      0,
      0,
      88,
      0,
      0,
      0,
      89,
      0,
      0,
      0,
      63,
      0,
      0,
      0,
      100,
      0,
      0,
      0,
      208,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      24,
      9,
      0,
      0,
      212,
      0,
      0,
      0,
      213,
      0,
      0,
      0,
      30,
      0,
      0,
      0,
      22,
      0,
      0,
      0,
      68,
      0,
      0,
      0,
      95,
      0,
      0,
      0,
      96,
      0,
      0,
      0,
      97,
      0,
      0,
      0,
      69,
      0,
      0,
      0,
      98,
      0,
      0,
      0,
      70,
      0,
      0,
      0,
      104,
      0,
      0,
      0,
      71,
      0,
      0,
      0,
      31,
      0,
      0,
      0,
      99,
      0,
      0,
      0,
      105,
      0,
      0,
      0,
      106,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      40,
      9,
      0,
      0,
      105,
      0,
      0,
      0,
      214,
      0,
      0,
      0,
      21,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      56,
      9,
      0,
      0,
      105,
      0,
      0,
      0,
      215,
      0,
      0,
      0,
      22,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      72,
      9,
      0,
      0,
      216,
      0,
      0,
      0,
      217,
      0,
      0,
      0,
      2,
      0,
      0,
      0,
      72,
      0,
      0,
      0,
      13,
      0,
      0,
      0,
      69,
      0,
      0,
      0,
      3,
      0,
      0,
      0,
      70,
      0,
      0,
      0,
      107,
      0,
      0,
      0,
      100,
      0,
      0,
      0,
      101,
      0,
      0,
      0,
      73,
      0,
      0,
      0,
      108,
      0,
      0,
      0,
      218,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      88,
      9,
      0,
      0,
      23,
      0,
      0,
      0,
      219,
      0,
      0,
      0,
      74,
      0,
      0,
      0,
      109,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      5,
      0,
      0,
      0,
      6,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      104,
      9,
      0,
      0,
      23,
      0,
      0,
      0,
      220,
      0,
      0,
      0,
      7,
      0,
      0,
      0,
      110,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      5,
      0,
      0,
      0,
      6,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      120,
      9,
      0,
      0,
      23,
      0,
      0,
      0,
      221,
      0,
      0,
      0,
      7,
      0,
      0,
      0,
      111,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      5,
      0,
      0,
      0,
      6,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      144,
      9,
      0,
      0,
      222,
      0,
      0,
      0,
      223,
      0,
      0,
      0,
      19,
      0,
      0,
      0,
      78,
      0,
      0,
      0,
      25,
      0,
      0,
      0,
      90,
      0,
      0,
      0,
      91,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      168,
      9,
      0,
      0,
      41,
      0,
      0,
      0,
      224,
      0,
      0,
      0,
      30,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      184,
      9,
      0,
      0,
      225,
      0,
      0,
      0,
      226,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      208,
      9,
      0,
      0,
      130,
      0,
      0,
      0,
      227,
      0,
      0,
      0,
      75,
      0,
      0,
      0,
      76,
      0,
      0,
      0,
      8,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      224,
      9,
      0,
      0,
      225,
      0,
      0,
      0,
      228,
      0,
      0,
      0,
      2,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      240,
      9,
      0,
      0,
      95,
      0,
      0,
      0,
      229,
      0,
      0,
      0,
      2,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      10,
      0,
      0,
      130,
      0,
      0,
      0,
      230,
      0,
      0,
      0,
      77,
      0,
      0,
      0,
      78,
      0,
      0,
      0,
      9,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      16,
      10,
      0,
      0,
      95,
      0,
      0,
      0,
      231,
      0,
      0,
      0,
      3,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      32,
      10,
      0,
      0,
      232,
      0,
      0,
      0,
      233,
      0,
      0,
      0,
      14,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      72,
      10,
      0,
      0,
      234,
      0,
      0,
      0,
      235,
      0,
      0,
      0,
      15,
      0,
      0,
      0,
      11,
      0,
      0,
      0,
      112,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      88,
      10,
      0,
      0,
      236,
      0,
      0,
      0,
      237,
      0,
      0,
      0,
      16,
      0,
      0,
      0,
      12,
      0,
      0,
      0,
      113,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      104,
      10,
      0,
      0,
      232,
      0,
      0,
      0,
      238,
      0,
      0,
      0,
      17,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      120,
      10,
      0,
      0,
      232,
      0,
      0,
      0,
      239,
      0,
      0,
      0,
      18,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      136,
      10,
      0,
      0,
      240,
      0,
      0,
      0,
      241,
      0,
      0,
      0,
      32,
      0,
      0,
      0,
      33,
      0,
      0,
      0,
      102,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      144,
      10,
      0,
      0,
      242,
      0,
      0,
      0,
      243,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      152,
      10,
      0,
      0,
      244,
      0,
      0,
      0,
      245,
      0,
      0,
      0,
      66,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      2,
      0,
      0,
      0,
      95,
      0,
      0,
      0,
      96,
      0,
      0,
      0,
      85,
      0,
      0,
      0,
      114,
      0,
      0,
      0,
      115,
      0,
      0,
      0,
      86,
      0,
      0,
      0,
      60,
      0,
      0,
      0,
      61,
      0,
      0,
      0,
      87,
      0,
      0,
      0,
      27,
      0,
      0,
      0,
      96,
      100,
      0,
      0,
      255,
      255,
      255,
      255,
      5,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      103,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      34,
      0,
      0,
      0,
      35,
      0,
      0,
      0,
      157,
      102,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      2,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      255,
      255,
      255,
      255,
      255,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      2,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      184,
      10,
      0,
      0,
      246,
      0,
      0,
      0,
      247,
      0,
      0,
      0,
      248,
      0,
      0,
      0,
      249,
      0,
      0,
      0,
      36,
      0,
      0,
      0,
      4,
      0,
      0,
      0,
      19,
      0,
      0,
      0,
      71,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      200,
      10,
      0,
      0,
      246,
      0,
      0,
      0,
      250,
      0,
      0,
      0,
      248,
      0,
      0,
      0,
      249,
      0,
      0,
      0,
      36,
      0,
      0,
      0,
      5,
      0,
      0,
      0,
      20,
      0,
      0,
      0,
      72,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      240,
      10,
      0,
      0,
      251,
      0,
      0,
      0,
      252,
      0,
      0,
      0,
      104,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      32,
      11,
      0,
      0,
      246,
      0,
      0,
      0,
      253,
      0,
      0,
      0,
      248,
      0,
      0,
      0,
      249,
      0,
      0,
      0,
      36,
      0,
      0,
      0,
      6,
      0,
      0,
      0,
      21,
      0,
      0,
      0,
      73,
      0,
      0,
      0,
      78,
      49,
      54,
      98,
      116,
      67,
      111,
      108,
      108,
      105,
      115,
      105,
      111,
      110,
      87,
      111,
      114,
      108,
      100,
      50,
      48,
      67,
      111,
      110,
      118,
      101,
      120,
      82,
      101,
      115,
      117,
      108,
      116,
      67,
      97,
      108,
      108,
      98,
      97,
      99,
      107,
      69,
      0,
      78,
      49,
      54,
      98,
      116,
      67,
      111,
      108,
      108,
      105,
      115,
      105,
      111,
      110,
      87,
      111,
      114,
      108,
      100,
      50,
      55,
      67,
      108,
      111,
      115,
      101,
      115,
      116,
      67,
      111,
      110,
      118,
      101,
      120,
      82,
      101,
      115,
      117,
      108,
      116,
      67,
      97,
      108,
      108,
      98,
      97,
      99,
      107,
      69,
      0,
      49,
      56,
      98,
      116,
      86,
      101,
      104,
      105,
      99,
      108,
      101,
      82,
      97,
      121,
      99,
      97,
      115,
      116,
      101,
      114,
      0,
      49,
      51,
      98,
      116,
      77,
      111,
      116,
      105,
      111,
      110,
      83,
      116,
      97,
      116,
      101,
      0,
      50,
      48,
      98,
      116,
      68,
      101,
      102,
      97,
      117,
      108,
      116,
      77,
      111,
      116,
      105,
      111,
      110,
      83,
      116,
      97,
      116,
      101,
      0,
      50,
      53,
      98,
      116,
      79,
      118,
      101,
      114,
      108,
      97,
      112,
      112,
      105,
      110,
      103,
      80,
      97,
      105,
      114,
      67,
      97,
      108,
      108,
      98,
      97,
      99,
      107,
      0,
      49,
      57,
      98,
      116,
      71,
      104,
      111,
      115,
      116,
      80,
      97,
      105,
      114,
      67,
      97,
      108,
      108,
      98,
      97,
      99,
      107,
      0,
      78,
      49,
      54,
      98,
      116,
      67,
      111,
      108,
      108,
      105,
      115,
      105,
      111,
      110,
      87,
      111,
      114,
      108,
      100,
      49,
      55,
      82,
      97,
      121,
      82,
      101,
      115,
      117,
      108,
      116,
      67,
      97,
      108,
      108,
      98,
      97,
      99,
      107,
      69,
      0,
      78,
      49,
      54,
      98,
      116,
      67,
      111,
      108,
      108,
      105,
      115,
      105,
      111,
      110,
      87,
      111,
      114,
      108,
      100,
      50,
      52,
      67,
      108,
      111,
      115,
      101,
      115,
      116,
      82,
      97,
      121,
      82,
      101,
      115,
      117,
      108,
      116,
      67,
      97,
      108,
      108,
      98,
      97,
      99,
      107,
      69,
      0,
      78,
      49,
      54,
      98,
      116,
      67,
      111,
      108,
      108,
      105,
      115,
      105,
      111,
      110,
      87,
      111,
      114,
      108,
      100,
      50,
      49,
      67,
      111,
      110,
      116,
      97,
      99,
      116,
      82,
      101,
      115,
      117,
      108,
      116,
      67,
      97,
      108,
      108,
      98,
      97,
      99,
      107,
      69,
      0,
      50,
      57,
      67,
      111,
      110,
      99,
      114,
      101,
      116,
      101,
      67,
      111,
      110,
      116,
      97,
      99,
      116,
      82,
      101,
      115,
      117,
      108,
      116,
      67,
      97,
      108,
      108,
      98,
      97,
      99,
      107,
      0,
      123,
      32,
      118,
      97,
      114,
      32,
      115,
      101,
      108,
      102,
      32,
      61,
      32,
      77,
      111,
      100,
      117,
      108,
      101,
      91,
      39,
      103,
      101,
      116,
      67,
      97,
      99,
      104,
      101,
      39,
      93,
      40,
      77,
      111,
      100,
      117,
      108,
      101,
      91,
      39,
      67,
      111,
      110,
      99,
      114,
      101,
      116,
      101,
      67,
      111,
      110,
      116,
      97,
      99,
      116,
      82,
      101,
      115,
      117,
      108,
      116,
      67,
      97,
      108,
      108,
      98,
      97,
      99,
      107,
      39,
      93,
      41,
      91,
      36,
      48,
      93,
      59,
      32,
      105,
      102,
      32,
      40,
      33,
      115,
      101,
      108,
      102,
      46,
      104,
      97,
      115,
      79,
      119,
      110,
      80,
      114,
      111,
      112,
      101,
      114,
      116,
      121,
      40,
      39,
      97,
      100,
      100,
      83,
      105,
      110,
      103,
      108,
      101,
      82,
      101,
      115,
      117,
      108,
      116,
      39,
      41,
      41,
      32,
      116,
      104,
      114,
      111,
      119,
      32,
      39,
      97,
      32,
      74,
      83,
      73,
      109,
      112,
      108,
      101,
      109,
      101,
      110,
      116,
      97,
      116,
      105,
      111,
      110,
      32,
      109,
      117,
      115,
      116,
      32,
      105,
      109,
      112,
      108,
      101,
      109,
      101,
      110,
      116,
      32,
      97,
      108,
      108,
      32,
      102,
      117,
      110,
      99,
      116,
      105,
      111,
      110,
      115,
      44,
      32,
      121,
      111,
      117,
      32,
      102,
      111,
      114,
      103,
      111,
      116,
      32,
    ],
    'i8',
    ALLOC_NONE,
    Runtime.GLOBAL_BASE
  );
  allocate(
    [
      67,
      111,
      110,
      99,
      114,
      101,
      116,
      101,
      67,
      111,
      110,
      116,
      97,
      99,
      116,
      82,
      101,
      115,
      117,
      108,
      116,
      67,
      97,
      108,
      108,
      98,
      97,
      99,
      107,
      58,
      58,
      97,
      100,
      100,
      83,
      105,
      110,
      103,
      108,
      101,
      82,
      101,
      115,
      117,
      108,
      116,
      46,
      39,
      59,
      32,
      114,
      101,
      116,
      117,
      114,
      110,
      32,
      115,
      101,
      108,
      102,
      91,
      39,
      97,
      100,
      100,
      83,
      105,
      110,
      103,
      108,
      101,
      82,
      101,
      115,
      117,
      108,
      116,
      39,
      93,
      40,
      36,
      49,
      44,
      36,
      50,
      44,
      36,
      51,
      44,
      36,
      52,
      44,
      36,
      53,
      44,
      36,
      54,
      44,
      36,
      55,
      41,
      59,
      32,
      125,
      0,
      50,
      51,
      98,
      116,
      68,
      101,
      102,
      97,
      117,
      108,
      116,
      83,
      111,
      102,
      116,
      66,
      111,
      100,
      121,
      83,
      111,
      108,
      118,
      101,
      114,
      0,
      49,
      54,
      98,
      116,
      83,
      111,
      102,
      116,
      66,
      111,
      100,
      121,
      83,
      111,
      108,
      118,
      101,
      114,
      0,
      52,
      49,
      98,
      116,
      83,
      111,
      102,
      116,
      66,
      111,
      100,
      121,
      82,
      105,
      103,
      105,
      100,
      66,
      111,
      100,
      121,
      67,
      111,
      108,
      108,
      105,
      115,
      105,
      111,
      110,
      67,
      111,
      110,
      102,
      105,
      103,
      117,
      114,
      97,
      116,
      105,
      111,
      110,
      0,
      78,
      50,
      56,
      98,
      116,
      83,
      111,
      102,
      116,
      83,
      111,
      102,
      116,
      67,
      111,
      108,
      108,
      105,
      115,
      105,
      111,
      110,
      65,
      108,
      103,
      111,
      114,
      105,
      116,
      104,
      109,
      49,
      48,
      67,
      114,
      101,
      97,
      116,
      101,
      70,
      117,
      110,
      99,
      69,
      0,
      51,
      48,
      98,
      116,
      67,
      111,
      108,
      108,
      105,
      115,
      105,
      111,
      110,
      65,
      108,
      103,
      111,
      114,
      105,
      116,
      104,
      109,
      67,
      114,
      101,
      97,
      116,
      101,
      70,
      117,
      110,
      99,
      0,
      78,
      50,
      57,
      98,
      116,
      83,
      111,
      102,
      116,
      82,
      105,
      103,
      105,
      100,
      67,
      111,
      108,
      108,
      105,
      115,
      105,
      111,
      110,
      65,
      108,
      103,
      111,
      114,
      105,
      116,
      104,
      109,
      49,
      48,
      67,
      114,
      101,
      97,
      116,
      101,
      70,
      117,
      110,
      99,
      69,
      0,
      78,
      51,
      53,
      98,
      116,
      83,
      111,
      102,
      116,
      66,
      111,
      100,
      121,
      67,
      111,
      110,
      99,
      97,
      118,
      101,
      67,
      111,
      108,
      108,
      105,
      115,
      105,
      111,
      110,
      65,
      108,
      103,
      111,
      114,
      105,
      116,
      104,
      109,
      49,
      48,
      67,
      114,
      101,
      97,
      116,
      101,
      70,
      117,
      110,
      99,
      69,
      0,
      78,
      51,
      53,
      98,
      116,
      83,
      111,
      102,
      116,
      66,
      111,
      100,
      121,
      67,
      111,
      110,
      99,
      97,
      118,
      101,
      67,
      111,
      108,
      108,
      105,
      115,
      105,
      111,
      110,
      65,
      108,
      103,
      111,
      114,
      105,
      116,
      104,
      109,
      49,
      55,
      83,
      119,
      97,
      112,
      112,
      101,
      100,
      67,
      114,
      101,
      97,
      116,
      101,
      70,
      117,
      110,
      99,
      69,
      0,
      49,
      48,
      98,
      116,
      83,
      111,
      102,
      116,
      66,
      111,
      100,
      121,
      0,
      83,
      111,
      102,
      116,
      66,
      111,
      100,
      121,
      77,
      97,
      116,
      101,
      114,
      105,
      97,
      108,
      68,
      97,
      116,
      97,
      0,
      83,
      111,
      102,
      116,
      66,
      111,
      100,
      121,
      78,
      111,
      100,
      101,
      68,
      97,
      116,
      97,
      0,
      83,
      111,
      102,
      116,
      66,
      111,
      100,
      121,
      76,
      105,
      110,
      107,
      68,
      97,
      116,
      97,
      0,
      83,
      111,
      102,
      116,
      66,
      111,
      100,
      121,
      70,
      97,
      99,
      101,
      68,
      97,
      116,
      97,
      0,
      83,
      111,
      102,
      116,
      66,
      111,
      100,
      121,
      84,
      101,
      116,
      114,
      97,
      68,
      97,
      116,
      97,
      0,
      83,
      111,
      102,
      116,
      82,
      105,
      103,
      105,
      100,
      65,
      110,
      99,
      104,
      111,
      114,
      68,
      97,
      116,
      97,
      0,
      102,
      108,
      111,
      97,
      116,
      0,
      83,
      111,
      102,
      116,
      66,
      111,
      100,
      121,
      80,
      111,
      115,
      101,
      68,
      97,
      116,
      97,
      0,
      83,
      111,
      102,
      116,
      66,
      111,
      100,
      121,
      67,
      108,
      117,
      115,
      116,
      101,
      114,
      68,
      97,
      116,
      97,
      0,
      105,
      110,
      116,
      0,
      98,
      116,
      83,
      111,
      102,
      116,
      66,
      111,
      100,
      121,
      74,
      111,
      105,
      110,
      116,
      68,
      97,
      116,
      97,
      0,
      98,
      116,
      83,
      111,
      102,
      116,
      66,
      111,
      100,
      121,
      70,
      108,
      111,
      97,
      116,
      68,
      97,
      116,
      97,
      0,
      78,
      49,
      48,
      98,
      116,
      83,
      111,
      102,
      116,
      66,
      111,
      100,
      121,
      49,
      53,
      82,
      97,
      121,
      70,
      114,
      111,
      109,
      84,
      111,
      67,
      97,
      115,
      116,
      101,
      114,
      69,
      0,
      78,
      54,
      98,
      116,
      68,
      98,
      118,
      116,
      56,
      73,
      67,
      111,
      108,
      108,
      105,
      100,
      101,
      69,
      0,
      78,
      49,
      48,
      98,
      116,
      83,
      111,
      102,
      116,
      66,
      111,
      100,
      121,
      53,
      74,
      111,
      105,
      110,
      116,
      69,
      0,
      78,
      49,
      48,
      98,
      116,
      83,
      111,
      102,
      116,
      66,
      111,
      100,
      121,
      54,
      67,
      74,
      111,
      105,
      110,
      116,
      69,
      0,
      50,
      52,
      98,
      116,
      83,
      111,
      102,
      116,
      66,
      111,
      100,
      121,
      67,
      111,
      108,
      108,
      105,
      115,
      105,
      111,
      110,
      83,
      104,
      97,
      112,
      101,
      0,
      83,
      111,
      102,
      116,
      66,
      111,
      100,
      121,
      0,
      85,
      112,
      100,
      97,
      116,
      101,
      67,
      108,
      117,
      115,
      116,
      101,
      114,
      115,
      0,
      83,
      111,
      102,
      116,
      66,
      111,
      100,
      121,
      32,
      97,
      112,
      112,
      108,
      121,
      70,
      111,
      114,
      99,
      101,
      115,
      0,
      65,
      112,
      112,
      108,
      121,
      67,
      108,
      117,
      115,
      116,
      101,
      114,
      115,
      0,
      78,
      49,
      53,
      98,
      116,
      83,
      111,
      102,
      116,
      67,
      111,
      108,
      108,
      105,
      100,
      101,
      114,
      115,
      49,
      51,
      67,
      111,
      108,
      108,
      105,
      100,
      101,
      83,
      68,
      70,
      95,
      82,
      83,
      69,
      0,
      78,
      49,
      53,
      98,
      116,
      83,
      111,
      102,
      116,
      67,
      111,
      108,
      108,
      105,
      100,
      101,
      114,
      115,
      49,
      50,
      67,
      111,
      108,
      108,
      105,
      100,
      101,
      67,
      76,
      95,
      82,
      83,
      69,
      0,
      78,
      49,
      53,
      98,
      116,
      83,
      111,
      102,
      116,
      67,
      111,
      108,
      108,
      105,
      100,
      101,
      114,
      115,
      49,
      49,
      67,
      108,
      117,
      115,
      116,
      101,
      114,
      66,
      97,
      115,
      101,
      69,
      0,
      50,
      55,
      98,
      116,
      83,
      111,
      102,
      116,
      67,
      108,
      117,
      115,
      116,
      101,
      114,
      67,
      111,
      108,
      108,
      105,
      115,
      105,
      111,
      110,
      83,
      104,
      97,
      112,
      101,
      0,
      83,
      79,
      70,
      84,
      67,
      76,
      85,
      83,
      84,
      69,
      82,
      0,
      98,
      116,
      67,
      111,
      110,
      118,
      101,
      120,
      73,
      110,
      116,
      101,
      114,
      110,
      97,
      108,
      83,
      104,
      97,
      112,
      101,
      68,
      97,
      116,
      97,
      0,
      78,
      49,
      53,
      98,
      116,
      83,
      111,
      102,
      116,
      67,
      111,
      108,
      108,
      105,
      100,
      101,
      114,
      115,
      49,
      50,
      67,
      111,
      108,
      108,
      105,
      100,
      101,
      67,
      76,
      95,
      83,
      83,
      69,
      0,
      78,
      49,
      53,
      98,
      116,
      83,
      111,
      102,
      116,
      67,
      111,
      108,
      108,
      105,
      100,
      101,
      114,
      115,
      49,
      50,
      67,
      111,
      108,
      108,
      105,
      100,
      101,
      86,
      70,
      95,
      83,
      83,
      69,
      0,
      50,
      57,
      98,
      116,
      83,
      111,
      102,
      116,
      82,
      105,
      103,
      105,
      100,
      67,
      111,
      108,
      108,
      105,
      115,
      105,
      111,
      110,
      65,
      108,
      103,
      111,
      114,
      105,
      116,
      104,
      109,
      0,
      50,
      48,
      98,
      116,
      67,
      111,
      108,
      108,
      105,
      115,
      105,
      111,
      110,
      65,
      108,
      103,
      111,
      114,
      105,
      116,
      104,
      109,
      0,
      51,
      53,
      98,
      116,
      83,
      111,
      102,
      116,
      66,
      111,
      100,
      121,
      67,
      111,
      110,
      99,
      97,
      118,
      101,
      67,
      111,
      108,
      108,
      105,
      115,
      105,
      111,
      110,
      65,
      108,
      103,
      111,
      114,
      105,
      116,
      104,
      109,
      0,
      50,
      54,
      98,
      116,
      83,
      111,
      102,
      116,
      66,
      111,
      100,
      121,
      84,
      114,
      105,
      97,
      110,
      103,
      108,
      101,
      67,
      97,
      108,
      108,
      98,
      97,
      99,
      107,
      0,
      90,
      78,
      51,
      53,
      98,
      116,
      83,
      111,
      102,
      116,
      66,
      111,
      100,
      121,
      67,
      111,
      110,
      99,
      97,
      118,
      101,
      67,
      111,
      108,
      108,
      105,
      115,
      105,
      111,
      110,
      65,
      108,
      103,
      111,
      114,
      105,
      116,
      104,
      109,
      50,
      49,
      99,
      97,
      108,
      99,
      117,
      108,
      97,
      116,
      101,
      84,
      105,
      109,
      101,
      79,
      102,
      73,
      109,
      112,
      97,
      99,
      116,
      69,
      80,
      49,
      55,
      98,
      116,
      67,
      111,
      108,
      108,
      105,
      115,
      105,
      111,
      110,
      79,
      98,
      106,
      101,
      99,
      116,
      83,
      49,
      95,
      82,
      75,
      49,
      54,
      98,
      116,
      68,
      105,
      115,
      112,
      97,
      116,
      99,
      104,
      101,
      114,
      73,
      110,
      102,
      111,
      80,
      49,
      54,
      98,
      116,
      77,
      97,
      110,
      105,
      102,
      111,
      108,
      100,
      82,
      101,
      115,
      117,
      108,
      116,
      69,
      51,
      49,
      76,
      111,
      99,
      97,
      108,
      84,
      114,
      105,
      97,
      110,
      103,
      108,
      101,
      83,
      112,
      104,
      101,
      114,
      101,
      67,
      97,
      115,
      116,
      67,
      97,
      108,
      108,
      98,
      97,
      99,
      107,
      0,
      78,
      49,
      50,
      98,
      116,
      67,
      111,
      110,
      118,
      101,
      120,
      67,
      97,
      115,
      116,
      49,
      48,
      67,
      97,
      115,
      116,
      82,
      101,
      115,
      117,
      108,
      116,
      69,
      0,
      49,
      53,
      98,
      116,
      84,
      114,
      105,
      97,
      110,
      103,
      108,
      101,
      83,
      104,
      97,
      112,
      101,
      0,
      84,
      114,
      105,
      97,
      110,
      103,
      108,
      101,
      0,
      50,
      52,
      98,
      116,
      83,
      111,
      102,
      116,
      82,
      105,
      103,
      105,
      100,
      68,
      121,
      110,
      97,
      109,
      105,
      99,
      115,
      87,
      111,
      114,
      108,
      100,
      0,
      114,
      97,
      121,
      84,
      101,
      115,
      116,
      0,
      50,
      51,
      98,
      116,
      83,
      111,
      102,
      116,
      83,
      105,
      110,
      103,
      108,
      101,
      82,
      97,
      121,
      67,
      97,
      108,
      108,
      98,
      97,
      99,
      107,
      0,
      50,
      51,
      98,
      116,
      66,
      114,
      111,
      97,
      100,
      112,
      104,
      97,
      115,
      101,
      82,
      97,
      121,
      67,
      97,
      108,
      108,
      98,
      97,
      99,
      107,
      0,
      50,
      52,
      98,
      116,
      66,
      114,
      111,
      97,
      100,
      112,
      104,
      97,
      115,
      101,
      65,
      97,
      98,
      98,
      67,
      97,
      108,
      108,
      98,
      97,
      99,
      107,
      0,
      112,
      114,
      101,
      100,
      105,
      99,
      116,
      85,
      110,
      99,
      111,
      110,
      115,
      116,
      114,
      97,
      105,
      110,
      116,
      77,
      111,
      116,
      105,
      111,
      110,
      83,
      111,
      102,
      116,
      66,
      111,
      100,
      121,
      0,
      115,
      111,
      108,
      118,
      101,
      83,
      111,
      102,
      116,
      67,
      111,
      110,
      115,
      116,
      114,
      97,
      105,
      110,
      116,
      115,
      0,
      50,
      56,
      98,
      116,
      83,
      111,
      102,
      116,
      83,
      111,
      102,
      116,
      67,
      111,
      108,
      108,
      105,
      115,
      105,
      111,
      110,
      65,
      108,
      103,
      111,
      114,
      105,
      116,
      104,
      109,
      0,
      49,
      49,
      98,
      116,
      82,
      105,
      103,
      105,
      100,
      66,
      111,
      100,
      121,
      0,
      98,
      116,
      82,
      105,
      103,
      105,
      100,
      66,
      111,
      100,
      121,
      70,
      108,
      111,
      97,
      116,
      68,
      97,
      116,
      97,
      0,
      50,
      51,
      98,
      116,
      68,
      105,
      115,
      99,
      114,
      101,
      116,
      101,
      68,
      121,
      110,
      97,
      109,
      105,
      99,
      115,
      87,
      111,
      114,
      108,
      100,
      0,
      49,
      53,
      98,
      116,
      68,
      121,
      110,
      97,
      109,
      105,
      99,
      115,
      87,
      111,
      114,
      108,
      100,
      0,
      100,
      101,
      98,
      117,
      103,
      68,
      114,
      97,
      119,
      87,
      111,
      114,
      108,
      100,
      0,
      98,
      116,
      68,
      121,
      110,
      97,
      109,
      105,
      99,
      115,
      87,
      111,
      114,
      108,
      100,
      70,
      108,
      111,
      97,
      116,
      68,
      97,
      116,
      97,
      0,
      115,
      116,
      101,
      112,
      83,
      105,
      109,
      117,
      108,
      97,
      116,
      105,
      111,
      110,
      0,
      115,
      121,
      110,
      99,
      104,
      114,
      111,
      110,
      105,
      122,
      101,
      77,
      111,
      116,
      105,
      111,
      110,
      83,
      116,
      97,
      116,
      101,
      115,
      0,
      112,
      114,
      101,
      100,
      105,
      99,
      116,
      85,
      110,
      99,
      111,
      110,
      115,
      116,
      114,
      97,
      105,
      110,
      116,
      77,
      111,
      116,
      105,
      111,
      110,
      0,
      105,
      110,
      116,
      101,
      103,
      114,
      97,
      116,
      101,
      84,
      114,
      97,
      110,
      115,
      102,
      111,
      114,
      109,
      115,
      0,
      67,
      67,
      68,
      32,
      109,
      111,
      116,
      105,
      111,
      110,
      32,
      99,
      108,
      97,
      109,
      112,
      105,
      110,
      103,
      0,
      51,
      52,
      98,
      116,
      67,
      108,
      111,
      115,
      101,
      115,
      116,
      78,
      111,
      116,
      77,
      101,
      67,
      111,
      110,
      118,
      101,
      120,
      82,
      101,
      115,
      117,
      108,
      116,
      67,
      97,
      108,
      108,
      98,
      97,
      99,
      107,
      0,
      97,
      112,
      112,
      108,
      121,
      32,
      115,
      112,
      101,
      99,
      117,
      108,
      97,
      116,
      105,
      118,
      101,
      32,
      99,
      111,
      110,
      116,
      97,
      99,
      116,
      32,
      114,
      101,
      115,
      116,
      105,
      116,
      117,
      116,
      105,
      111,
      110,
      0,
      99,
      97,
      108,
      99,
      117,
      108,
      97,
      116,
      101,
      83,
      105,
      109,
      117,
      108,
      97,
      116,
      105,
      111,
      110,
      73,
      115,
      108,
      97,
      110,
      100,
      115,
      0,
      115,
      111,
      108,
      118,
      101,
      67,
      111,
      110,
      115,
      116,
      114,
      97,
      105,
      110,
      116,
      115,
      0,
      117,
      112,
      100,
      97,
      116,
      101,
      65,
      99,
      116,
      105,
      118,
      97,
      116,
      105,
      111,
      110,
      83,
      116,
      97,
      116,
      101,
      0,
      105,
      110,
      116,
      101,
      114,
      110,
      97,
      108,
      83,
      105,
      110,
      103,
      108,
      101,
      83,
      116,
      101,
      112,
      83,
      105,
      109,
      117,
      108,
      97,
      116,
      105,
      111,
      110,
      0,
      99,
      114,
      101,
      97,
      116,
      101,
      80,
      114,
      101,
      100,
      105,
      99,
      116,
      105,
      118,
      101,
      67,
      111,
      110,
      116,
      97,
      99,
      116,
      115,
      0,
      114,
      101,
      108,
      101,
      97,
      115,
      101,
      32,
      112,
      114,
      101,
      100,
      105,
      99,
      116,
      105,
      118,
      101,
      32,
      99,
      111,
      110,
      116,
      97,
      99,
      116,
      32,
      109,
      97,
      110,
      105,
      102,
      111,
      108,
      100,
      115,
      0,
      112,
      114,
      101,
      100,
      105,
      99,
      116,
      105,
      118,
      101,
      32,
      99,
      111,
      110,
      118,
      101,
      120,
      83,
      119,
      101,
      101,
      112,
      84,
      101,
      115,
      116,
      0,
      117,
      112,
      100,
      97,
      116,
      101,
      65,
      99,
      116,
      105,
      111,
      110,
      115,
      0,
      50,
      55,
      73,
      110,
      112,
      108,
      97,
      99,
      101,
      83,
      111,
      108,
      118,
      101,
      114,
      73,
      115,
      108,
      97,
      110,
      100,
      67,
      97,
      108,
      108,
      98,
      97,
      99,
      107,
      0,
      78,
      50,
      53,
      98,
      116,
      83,
      105,
      109,
      117,
      108,
      97,
      116,
      105,
      111,
      110,
      73,
      115,
      108,
      97,
      110,
      100,
      77,
      97,
      110,
      97,
      103,
      101,
      114,
      49,
      52,
      73,
      115,
      108,
      97,
      110,
      100,
      67,
      97,
      108,
      108,
      98,
      97,
      99,
      107,
      69,
      0,
      50,
      51,
      98,
      116,
      71,
      101,
      110,
      101,
      114,
      105,
      99,
      54,
      68,
      111,
      102,
      67,
      111,
      110,
      115,
      116,
      114,
      97,
      105,
      110,
      116,
      0,
      49,
      55,
      98,
      116,
      84,
      121,
      112,
      101,
      100,
      67,
      111,
      110,
      115,
      116,
      114,
      97,
      105,
      110,
      116,
      0,
      49,
      51,
      98,
      116,
      84,
      121,
      112,
      101,
      100,
      79,
      98,
      106,
      101,
      99,
      116,
      0,
      98,
      116,
      71,
      101,
      110,
      101,
      114,
      105,
      99,
      54,
      68,
      111,
      102,
      67,
      111,
      110,
      115,
      116,
      114,
      97,
      105,
      110,
      116,
      68,
      97,
      116,
      97,
      0,
      50,
      57,
      98,
      116,
      71,
      101,
      110,
      101,
      114,
      105,
      99,
      54,
      68,
      111,
      102,
      83,
      112,
      114,
      105,
      110,
      103,
      67,
      111,
      110,
      115,
      116,
      114,
      97,
      105,
      110,
      116,
      0,
      98,
      116,
      71,
      101,
      110,
      101,
      114,
      105,
      99,
      54,
      68,
      111,
      102,
      83,
      112,
      114,
      105,
      110,
      103,
      67,
      111,
      110,
      115,
      116,
      114,
      97,
      105,
      110,
      116,
      68,
      97,
      116,
      97,
      0,
      50,
      51,
      98,
      116,
      80,
      111,
      105,
      110,
      116,
      50,
      80,
      111,
      105,
      110,
      116,
      67,
      111,
      110,
      115,
      116,
      114,
      97,
      105,
      110,
      116,
      0,
      98,
      116,
      80,
      111,
      105,
      110,
      116,
      50,
      80,
      111,
      105,
      110,
      116,
      67,
      111,
      110,
      115,
      116,
      114,
      97,
      105,
      110,
      116,
      70,
      108,
      111,
      97,
      116,
      68,
      97,
      116,
      97,
      0,
      98,
      116,
      84,
      121,
      112,
      101,
      100,
      67,
      111,
      110,
      115,
      116,
      114,
      97,
      105,
      110,
      116,
      70,
      108,
      111,
      97,
      116,
      68,
      97,
      116,
      97,
      0,
      49,
      56,
      98,
      116,
      83,
      108,
      105,
      100,
      101,
      114,
      67,
      111,
      110,
      115,
      116,
      114,
      97,
      105,
      110,
      116,
      0,
      98,
      116,
      83,
      108,
      105,
      100,
      101,
      114,
      67,
      111,
      110,
      115,
      116,
      114,
      97,
      105,
      110,
      116,
      68,
      97,
      116,
      97,
      0,
      50,
      49,
      98,
      116,
      67,
      111,
      110,
      101,
      84,
      119,
      105,
      115,
      116,
      67,
      111,
      110,
      115,
      116,
      114,
      97,
      105,
      110,
      116,
      0,
      98,
      116,
      67,
      111,
      110,
      101,
      84,
      119,
      105,
      115,
      116,
      67,
      111,
      110,
      115,
      116,
      114,
      97,
      105,
      110,
      116,
      68,
      97,
      116,
      97,
      0,
      49,
      55,
      98,
      116,
      72,
      105,
      110,
      103,
      101,
      67,
      111,
      110,
      115,
      116,
      114,
      97,
      105,
      110,
      116,
      0,
      98,
      116,
      72,
      105,
      110,
      103,
      101,
      67,
      111,
      110,
      115,
      116,
      114,
      97,
      105,
      110,
      116,
      70,
      108,
      111,
      97,
      116,
      68,
      97,
      116,
      97,
      0,
      51,
      53,
      98,
      116,
      83,
      101,
      113,
      117,
      101,
      110,
      116,
      105,
      97,
      108,
      73,
      109,
      112,
      117,
      108,
      115,
      101,
      67,
      111,
      110,
      115,
      116,
      114,
      97,
      105,
      110,
      116,
      83,
      111,
      108,
      118,
      101,
      114,
      0,
      49,
      56,
      98,
      116,
      67,
      111,
      110,
      115,
      116,
      114,
      97,
      105,
      110,
      116,
      83,
      111,
      108,
      118,
      101,
      114,
      0,
      115,
      111,
      108,
      118,
      101,
      71,
      114,
      111,
      117,
      112,
      0,
      115,
      111,
      108,
      118,
      101,
      71,
      114,
      111,
      117,
      112,
      67,
      97,
      99,
      104,
      101,
      70,
      114,
      105,
      101,
      110,
      100,
      108,
      121,
      83,
      101,
      116,
      117,
      112,
      0,
      115,
      111,
      108,
      118,
      101,
      71,
      114,
      111,
      117,
      112,
      67,
      97,
      99,
      104,
      101,
      70,
      114,
      105,
      101,
      110,
      100,
      108,
      121,
      73,
      116,
      101,
      114,
      97,
      116,
      105,
      111,
      110,
      115,
      0,
      49,
      54,
      98,
      116,
      82,
      97,
      121,
      99,
      97,
      115,
      116,
      86,
      101,
      104,
      105,
      99,
      108,
      101,
      0,
      49,
      55,
      98,
      116,
      65,
      99,
      116,
      105,
      111,
      110,
      73,
      110,
      116,
      101,
      114,
      102,
      97,
      99,
      101,
      0,
      50,
      53,
      98,
      116,
      68,
      101,
      102,
      97,
      117,
      108,
      116,
      86,
      101,
      104,
      105,
      99,
      108,
      101,
      82,
      97,
      121,
      99,
      97,
      115,
      116,
      101,
      114,
      0,
      51,
      48,
      98,
      116,
      75,
      105,
      110,
      101,
      109,
      97,
      116,
      105,
      99,
      67,
      104,
      97,
      114,
      97,
      99,
      116,
      101,
      114,
      67,
      111,
      110,
      116,
      114,
      111,
      108,
      108,
      101,
      114,
      0,
      51,
      48,
      98,
      116,
      67,
      104,
      97,
      114,
      97,
      99,
      116,
      101,
      114,
      67,
      111,
      110,
      116,
      114,
      111,
      108,
      108,
      101,
      114,
      73,
      110,
      116,
      101,
      114,
      102,
      97,
      99,
      101,
      0,
      52,
      51,
      98,
      116,
      75,
      105,
      110,
      101,
      109,
      97,
      116,
      105,
      99,
      67,
      108,
      111,
      115,
      101,
      115,
      116,
      78,
      111,
      116,
      77,
      101,
      67,
      111,
      110,
      118,
      101,
      120,
      82,
      101,
      115,
      117,
      108,
      116,
      67,
      97,
      108,
      108,
      98,
      97,
      99,
      107,
      0,
      50,
      50,
      98,
      116,
      83,
      117,
      98,
      115,
      105,
      109,
      112,
      108,
      101,
      120,
      67,
      111,
      110,
      118,
      101,
      120,
      67,
      97,
      115,
      116,
      0,
      49,
      50,
      98,
      116,
      67,
      111,
      110,
      118,
      101,
      120,
      67,
      97,
      115,
      116,
      0,
      49,
      55,
      98,
      116,
      67,
      111,
      108,
      108,
      105,
      115,
      105,
      111,
      110,
      79,
      98,
      106,
      101,
      99,
      116,
      0,
      98,
      116,
      67,
      111,
      108,
      108,
      105,
      115,
      105,
      111,
      110,
      79,
      98,
      106,
      101,
      99,
      116,
      70,
      108,
      111,
      97,
      116,
      68,
      97,
      116,
      97,
      0,
      49,
      51,
      98,
      116,
      71,
      104,
      111,
      115,
      116,
      79,
      98,
      106,
      101,
      99,
      116,
      0,
      50,
      52,
      98,
      116,
      80,
      97,
      105,
      114,
      67,
      97,
      99,
      104,
      105,
      110,
      103,
      71,
      104,
      111,
      115,
      116,
      79,
      98,
      106,
      101,
      99,
      116,
      0,
      50,
      49,
      98,
      116,
      67,
      111,
      108,
      108,
      105,
      115,
      105,
      111,
      110,
      68,
      105,
      115,
      112,
      97,
      116,
      99,
      104,
      101,
      114,
      0,
      50,
      51,
      98,
      116,
      67,
      111,
      108,
      108,
      105,
      115,
      105,
      111,
      110,
      80,
      97,
      105,
      114,
      67,
      97,
      108,
      108,
      98,
      97,
      99,
      107,
      0,
      49,
      55,
      98,
      116,
      79,
      118,
      101,
      114,
      108,
      97,
      112,
      67,
      97,
      108,
      108,
      98,
      97,
      99,
      107,
      0,
      51,
      49,
      98,
      116,
      68,
      101,
      102,
      97,
      117,
      108,
      116,
      67,
      111,
      108,
      108,
      105,
      115,
      105,
      111,
      110,
      67,
      111,
      110,
      102,
      105,
      103,
      117,
      114,
      97,
      116,
      105,
      111,
      110,
      0,
      50,
      52,
      98,
      116,
      67,
      111,
      108,
      108,
      105,
      115,
      105,
      111,
      110,
      67,
      111,
      110,
      102,
      105,
      103,
      117,
      114,
      97,
      116,
      105,
      111,
      110,
      0,
      78,
      51,
      51,
      98,
      116,
      67,
      111,
      110,
      118,
      101,
      120,
      67,
      111,
      110,
      99,
      97,
      118,
      101,
      67,
      111,
      108,
      108,
      105,
      115,
      105,
      111,
      110,
      65,
      108,
      103,
      111,
      114,
      105,
      116,
      104,
      109,
      49,
      48,
      67,
      114,
      101,
      97,
      116,
      101,
      70,
      117,
      110,
      99,
      69,
      0,
      78,
      51,
      51,
      98,
      116,
      67,
      111,
      110,
      118,
      101,
      120,
      67,
      111,
      110,
      99,
      97,
      118,
      101,
      67,
      111,
      108,
      108,
      105,
      115,
      105,
      111,
      110,
      65,
      108,
      103,
      111,
      114,
      105,
      116,
      104,
      109,
      49,
      55,
      83,
      119,
      97,
      112,
      112,
      101,
      100,
      67,
      114,
      101,
      97,
      116,
      101,
      70,
      117,
      110,
      99,
      69,
      0,
      78,
      50,
      56,
      98,
      116,
      67,
      111,
      109,
      112,
      111,
      117,
      110,
      100,
      67,
      111,
      108,
      108,
      105,
      115,
      105,
      111,
      110,
      65,
      108,
      103,
      111,
      114,
      105,
      116,
      104,
      109,
      49,
      48,
      67,
      114,
      101,
      97,
      116,
      101,
      70,
      117,
      110,
      99,
      69,
      0,
      78,
      51,
      54,
      98,
      116,
      67,
      111,
      109,
      112,
      111,
      117,
      110,
      100,
      67,
      111,
      109,
      112,
      111,
      117,
      110,
      100,
      67,
      111,
      108,
      108,
      105,
      115,
      105,
      111,
      110,
      65,
      108,
      103,
      111,
      114,
      105,
      116,
      104,
      109,
      49,
      48,
      67,
      114,
      101,
      97,
      116,
      101,
      70,
      117,
      110,
      99,
      69,
      0,
      78,
      50,
      56,
      98,
      116,
      67,
      111,
      109,
      112,
      111,
      117,
      110,
      100,
      67,
      111,
      108,
      108,
      105,
      115,
      105,
      111,
      110,
      65,
      108,
      103,
      111,
      114,
      105,
      116,
      104,
      109,
      49,
      55,
      83,
      119,
      97,
      112,
      112,
      101,
      100,
      67,
      114,
      101,
      97,
      116,
      101,
      70,
      117,
      110,
      99,
      69,
      0,
      78,
      49,
      54,
      98,
      116,
      69,
      109,
      112,
      116,
      121,
      65,
      108,
      103,
      111,
      114,
      105,
      116,
      104,
      109,
      49,
      48,
      67,
      114,
      101,
      97,
      116,
      101,
      70,
      117,
      110,
      99,
      69,
      0,
      78,
      51,
      50,
      98,
      116,
      83,
      112,
      104,
      101,
      114,
      101,
      83,
      112,
      104,
      101,
      114,
      101,
      67,
      111,
      108,
      108,
      105,
      115,
      105,
      111,
      110,
      65,
      108,
      103,
      111,
      114,
      105,
      116,
      104,
      109,
      49,
      48,
      67,
      114,
      101,
      97,
      116,
      101,
      70,
      117,
      110,
      99,
      69,
      0,
      78,
      51,
      52,
      98,
      116,
      83,
      112,
      104,
      101,
      114,
      101,
      84,
      114,
      105,
      97,
      110,
      103,
      108,
      101,
      67,
      111,
      108,
      108,
      105,
      115,
      105,
      111,
      110,
      65,
      108,
      103,
      111,
      114,
      105,
      116,
      104,
      109,
      49,
      48,
      67,
      114,
      101,
      97,
      116,
      101,
      70,
      117,
      110,
      99,
      69,
      0,
      78,
      50,
      54,
      98,
      116,
      66,
      111,
      120,
      66,
      111,
      120,
      67,
      111,
      108,
      108,
      105,
      115,
      105,
      111,
      110,
      65,
      108,
      103,
      111,
      114,
      105,
      116,
      104,
      109,
      49,
      48,
      67,
      114,
      101,
      97,
      116,
      101,
      70,
      117,
      110,
      99,
      69,
      0,
      78,
      51,
      49,
      98,
      116,
      67,
      111,
      110,
      118,
      101,
      120,
      80,
      108,
      97,
      110,
      101,
      67,
      111,
      108,
      108,
      105,
      115,
      105,
      111,
      110,
      65,
      108,
      103,
      111,
      114,
      105,
      116,
      104,
      109,
      49,
      48,
      67,
      114,
      101,
      97,
      116,
      101,
      70,
      117,
      110,
      99,
      69,
      0,
      50,
      53,
      98,
      116,
      83,
      105,
      109,
      117,
      108,
      97,
      116,
      105,
      111,
      110,
      73,
      115,
      108,
      97,
      110,
      100,
      77,
      97,
      110,
      97,
      103,
      101,
      114,
      0,
      105,
      115,
      108,
      97,
      110,
      100,
      85,
      110,
      105,
      111,
      110,
      70,
      105,
      110,
      100,
      65,
      110,
      100,
      81,
      117,
      105,
      99,
      107,
      83,
      111,
      114,
      116,
      0,
      112,
      114,
      111,
      99,
      101,
      115,
      115,
      73,
      115,
      108,
      97,
      110,
      100,
      115,
      0,
      51,
      49,
      98,
      116,
      67,
      111,
      110,
      118,
      101,
      120,
      80,
      108,
      97,
      110,
      101,
      67,
      111,
      108,
      108,
      105,
      115,
      105,
      111,
      110,
      65,
      108,
      103,
      111,
      114,
      105,
      116,
      104,
      109,
      0,
      51,
      51,
      98,
      116,
      67,
      111,
      110,
      118,
      101,
      120,
      67,
      111,
      110,
      99,
      97,
      118,
      101,
      67,
      111,
      108,
      108,
      105,
      115,
      105,
      111,
      110,
      65,
      108,
      103,
      111,
      114,
      105,
      116,
      104,
      109,
      0,
      50,
      52,
      98,
      116,
      67,
      111,
      110,
      118,
      101,
      120,
      84,
      114,
      105,
      97,
      110,
      103,
      108,
      101,
      67,
      97,
      108,
      108,
      98,
      97,
      99,
      107,
      0,
      90,
      78,
      51,
      51,
      98,
      116,
      67,
      111,
      110,
      118,
      101,
      120,
      67,
      111,
      110,
      99,
      97,
      118,
      101,
      67,
      111,
      108,
      108,
      105,
      115,
      105,
      111,
      110,
      65,
      108,
      103,
      111,
      114,
      105,
      116,
      104,
      109,
      50,
      49,
      99,
      97,
      108,
      99,
      117,
      108,
      97,
      116,
      101,
      84,
      105,
      109,
      101,
      79,
      102,
      73,
      109,
      112,
      97,
      99,
      116,
      69,
      80,
      49,
      55,
      98,
      116,
      67,
      111,
      108,
      108,
      105,
      115,
      105,
      111,
      110,
      79,
      98,
      106,
      101,
      99,
      116,
      83,
      49,
      95,
      82,
      75,
      49,
      54,
      98,
      116,
      68,
      105,
      115,
      112,
      97,
      116,
      99,
      104,
      101,
      114,
      73,
      110,
      102,
      111,
      80,
      49,
      54,
      98,
      116,
      77,
      97,
      110,
      105,
      102,
      111,
      108,
      100,
      82,
      101,
      115,
      117,
      108,
      116,
      69,
      51,
      49,
      76,
      111,
      99,
      97,
      108,
      84,
      114,
      105,
      97,
      110,
      103,
      108,
      101,
      83,
      112,
      104,
      101,
      114,
      101,
      67,
      97,
      115,
      116,
      67,
      97,
      108,
      108,
      98,
      97,
      99,
      107,
      0,
      50,
      54,
      98,
      116,
      66,
      111,
      120,
      66,
      111,
      120,
      67,
      111,
      108,
      108,
      105,
      115,
      105,
      111,
      110,
      65,
      108,
      103,
      111,
      114,
      105,
      116,
      104,
      109,
      0,
      49,
      54,
      98,
      116,
      77,
      97,
      110,
      105,
      102,
      111,
      108,
      100,
      82,
      101,
      115,
      117,
      108,
      116,
      0,
      78,
      51,
      54,
      98,
      116,
      68,
      105,
      115,
      99,
      114,
      101,
      116,
      101,
      67,
      111,
      108,
      108,
      105,
      115,
      105,
      111,
      110,
      68,
      101,
      116,
      101,
      99,
      116,
      111,
      114,
      73,
      110,
      116,
      101,
      114,
      102,
      97,
      99,
      101,
      54,
      82,
      101,
      115,
      117,
      108,
      116,
      69,
      0,
      49,
      54,
      98,
      116,
      67,
      111,
      108,
      108,
      105,
      115,
      105,
      111,
      110,
      87,
      111,
      114,
      108,
      100,
      0,
      117,
      112,
      100,
      97,
      116,
      101,
      65,
      97,
      98,
      98,
      115,
      0,
      1,
      79,
      118,
      101,
      114,
      102,
      108,
      111,
      119,
      32,
      105,
      110,
      32,
      65,
      65,
      66,
      66,
      44,
      32,
      111,
      98,
      106,
      101,
      99,
      116,
      32,
      114,
      101,
      109,
      111,
      118,
      101,
      100,
      32,
      102,
      114,
      111,
      109,
      32,
      115,
      105,
      109,
      117,
      108,
      97,
      116,
      105,
      111,
      110,
      0,
      73,
      102,
      32,
      121,
      111,
      117,
      32,
      99,
      97,
      110,
      32,
      114,
      101,
      112,
      114,
      111,
      100,
      117,
      99,
      101,
      32,
      116,
      104,
      105,
      115,
      44,
      32,
      112,
      108,
      101,
      97,
      115,
      101,
      32,
      101,
      109,
      97,
      105,
      108,
      32,
      98,
      117,
      103,
      115,
      64,
      99,
      111,
      110,
      116,
      105,
      110,
      117,
      111,
      117,
      115,
      112,
      104,
      121,
      115,
      105,
      99,
      115,
      46,
      99,
      111,
      109,
      10,
      0,
      80,
      108,
      101,
      97,
      115,
      101,
      32,
      105,
      110,
      99,
      108,
      117,
      100,
      101,
      32,
      97,
      98,
      111,
      118,
      101,
      32,
      105,
      110,
      102,
      111,
      114,
      109,
      97,
      116,
      105,
      111,
      110,
      44,
      32,
      121,
      111,
      117,
      114,
      32,
      80,
      108,
      97,
      116,
      102,
      111,
      114,
      109,
      44,
      32,
      118,
      101,
      114,
      115,
      105,
      111,
      110,
      32,
      111,
      102,
      32,
      79,
      83,
      46,
      10,
      0,
      84,
      104,
      97,
      110,
      107,
      115,
      46,
      10,
      0,
      99,
      97,
      108,
      99,
      117,
      108,
      97,
      116,
      101,
      79,
      118,
      101,
      114,
      108,
      97,
      112,
      112,
      105,
      110,
      103,
      80,
      97,
      105,
      114,
      115,
      0,
      49,
      55,
      68,
      101,
      98,
      117,
      103,
      68,
      114,
      97,
      119,
      99,
      97,
      108,
      108,
      98,
      97,
      99,
      107,
      0,
      49,
      57,
      98,
      116,
      83,
      105,
      110,
      103,
      108,
      101,
      82,
      97,
      121,
      67,
      97,
      108,
      108,
      98,
      97,
      99,
      107,
      0,
      90,
      78,
      49,
      54,
      98,
      116,
      67,
      111,
      108,
      108,
      105,
      115,
      105,
      111,
      110,
      87,
      111,
      114,
      108,
      100,
      50,
      49,
      114,
      97,
      121,
      84,
      101,
      115,
      116,
      83,
      105,
      110,
      103,
      108,
      101,
      73,
      110,
      116,
      101,
      114,
      110,
      97,
      108,
      69,
      82,
      75,
      49,
      49,
      98,
      116,
      84,
      114,
      97,
      110,
      115,
      102,
      111,
      114,
      109,
      83,
      50,
      95,
      80,
      75,
      50,
      52,
      98,
      116,
      67,
      111,
      108,
      108,
      105,
      115,
      105,
      111,
      110,
      79,
      98,
      106,
      101,
      99,
      116,
      87,
      114,
      97,
      112,
      112,
      101,
      114,
      82,
      78,
      83,
      95,
      49,
      55,
      82,
      97,
      121,
      82,
      101,
      115,
      117,
      108,
      116,
      67,
      97,
      108,
      108,
      98,
      97,
      99,
      107,
      69,
      69,
      50,
      57,
      66,
      114,
      105,
      100,
      103,
      101,
      84,
      114,
      105,
      97,
      110,
      103,
      108,
      101,
      82,
      97,
      121,
      99,
      97,
      115,
      116,
      67,
      97,
      108,
      108,
      98,
      97,
      99,
      107,
      0,
      90,
      78,
      49,
      54,
      98,
      116,
      67,
      111,
      108,
      108,
      105,
      115,
      105,
      111,
      110,
      87,
      111,
      114,
      108,
      100,
      50,
      49,
      114,
      97,
      121,
      84,
      101,
      115,
      116,
      83,
      105,
      110,
      103,
      108,
      101,
      73,
      110,
      116,
      101,
      114,
      110,
      97,
      108,
      69,
      82,
      75,
      49,
      49,
      98,
      116,
      84,
      114,
      97,
      110,
      115,
      102,
      111,
      114,
      109,
      83,
      50,
      95,
      80,
      75,
      50,
      52,
      98,
      116,
      67,
      111,
      108,
      108,
      105,
      115,
      105,
      111,
      110,
      79,
      98,
      106,
      101,
      99,
      116,
      87,
      114,
      97,
      112,
      112,
      101,
      114,
      82,
      78,
      83,
      95,
      49,
      55,
      82,
      97,
      121,
      82,
      101,
      115,
      117,
      108,
      116,
      67,
      97,
      108,
      108,
      98,
      97,
      99,
      107,
      69,
      69,
      50,
      57,
      66,
      114,
      105,
      100,
      103,
      101,
      84,
      114,
      105,
      97,
      110,
      103,
      108,
      101,
      82,
      97,
      121,
      99,
      97,
      115,
      116,
      67,
      97,
      108,
      108,
      98,
      97,
      99,
      107,
      95,
      48,
      0,
      90,
      78,
      49,
      54,
      98,
      116,
      67,
      111,
      108,
      108,
      105,
      115,
      105,
      111,
      110,
      87,
      111,
      114,
      108,
      100,
      50,
      49,
      114,
      97,
      121,
      84,
      101,
      115,
      116,
      83,
      105,
      110,
      103,
      108,
      101,
      73,
      110,
      116,
      101,
      114,
      110,
      97,
      108,
      69,
      82,
      75,
      49,
      49,
      98,
      116,
      84,
      114,
      97,
      110,
      115,
      102,
      111,
      114,
      109,
      83,
      50,
      95,
      80,
      75,
      50,
      52,
      98,
      116,
      67,
      111,
      108,
      108,
      105,
      115,
      105,
      111,
      110,
      79,
      98,
      106,
      101,
      99,
      116,
      87,
      114,
      97,
      112,
      112,
      101,
      114,
      82,
      78,
      83,
      95,
      49,
      55,
      82,
      97,
      121,
      82,
      101,
      115,
      117,
      108,
      116,
      67,
      97,
      108,
      108,
      98,
      97,
      99,
      107,
      69,
      69,
      57,
      82,
      97,
      121,
      84,
      101,
      115,
      116,
      101,
      114,
      0,
      90,
      78,
      49,
      54,
      98,
      116,
      67,
      111,
      108,
      108,
      105,
      115,
      105,
      111,
      110,
      87,
      111,
      114,
      108,
      100,
      50,
      49,
      114,
      97,
      121,
      84,
      101,
      115,
      116,
      83,
      105,
      110,
      103,
      108,
      101,
      73,
      110,
      116,
      101,
      114,
      110,
      97,
      108,
      69,
      82,
      75,
      49,
      49,
      98,
      116,
      84,
      114,
      97,
      110,
      115,
      102,
      111,
      114,
      109,
      83,
      50,
      95,
      80,
      75,
      50,
      52,
      98,
      116,
      67,
      111,
      108,
      108,
      105,
      115,
      105,
      111,
      110,
      79,
      98,
      106,
      101,
      99,
      116,
      87,
      114,
      97,
      112,
      112,
      101,
      114,
      82,
      78,
      83,
      95,
      49,
      55,
      82,
      97,
      121,
      82,
      101,
      115,
      117,
      108,
      116,
      67,
      97,
      108,
      108,
      98,
      97,
      99,
      107,
      69,
      69,
      49,
      53,
      76,
      111,
      99,
      97,
      108,
      73,
      110,
      102,
      111,
      65,
      100,
      100,
      101,
      114,
      50,
      0,
      112,
      101,
      114,
      102,
      111,
      114,
      109,
      68,
      105,
      115,
      99,
      114,
      101,
      116,
      101,
      67,
      111,
      108,
      108,
      105,
      115,
      105,
      111,
      110,
      68,
      101,
      116,
      101,
      99,
      116,
      105,
      111,
      110,
      0,
      100,
      105,
      115,
      112,
      97,
      116,
      99,
      104,
      65,
      108,
      108,
      67,
      111,
      108,
      108,
      105,
      115,
      105,
      111,
      110,
      80,
      97,
      105,
      114,
      115,
      0,
      90,
      78,
      49,
      54,
      98,
      116,
      67,
      111,
      108,
      108,
      105,
      115,
      105,
      111,
      110,
      87,
      111,
      114,
      108,
      100,
      50,
      53,
      111,
      98,
      106,
      101,
      99,
      116,
      81,
      117,
      101,
      114,
      121,
      83,
      105,
      110,
      103,
      108,
      101,
      73,
      110,
      116,
      101,
      114,
      110,
      97,
      108,
      69,
      80,
      75,
      49,
      51,
      98,
      116,
      67,
      111,
      110,
      118,
      101,
      120,
      83,
      104,
      97,
      112,
      101,
      82,
      75,
      49,
      49,
      98,
      116,
      84,
      114,
      97,
      110,
      115,
      102,
      111,
      114,
      109,
      83,
      53,
      95,
      80,
      75,
      50,
      52,
      98,
      116,
      67,
      111,
      108,
      108,
      105,
      115,
      105,
      111,
      110,
      79,
      98,
      106,
      101,
      99,
      116,
      87,
      114,
      97,
      112,
      112,
      101,
      114,
      82,
      78,
      83,
      95,
      50,
      48,
      67,
      111,
      110,
      118,
      101,
      120,
      82,
      101,
      115,
      117,
      108,
      116,
      67,
      97,
      108,
      108,
      98,
      97,
      99,
      107,
      69,
      102,
      69,
      51,
      50,
      66,
      114,
      105,
      100,
      103,
      101,
      84,
      114,
      105,
      97,
      110,
      103,
      108,
      101,
      67,
      111,
      110,
      118,
      101,
      120,
      99,
      97,
      115,
      116,
      67,
      97,
      108,
      108,
      98,
      97,
      99,
      107,
      0,
      90,
      78,
      49,
      54,
      98,
      116,
      67,
      111,
      108,
      108,
      105,
      115,
      105,
      111,
      110,
      87,
      111,
      114,
      108,
      100,
      50,
      53,
      111,
      98,
      106,
      101,
      99,
      116,
      81,
      117,
      101,
      114,
      121,
      83,
      105,
      110,
      103,
      108,
      101,
      73,
      110,
      116,
      101,
      114,
      110,
      97,
      108,
      69,
      80,
      75,
      49,
      51,
      98,
      116,
      67,
      111,
      110,
      118,
      101,
      120,
      83,
      104,
      97,
      112,
      101,
      82,
      75,
      49,
      49,
      98,
      116,
      84,
      114,
      97,
      110,
      115,
      102,
      111,
      114,
      109,
      83,
      53,
      95,
      80,
      75,
      50,
      52,
      98,
      116,
      67,
      111,
      108,
      108,
      105,
      115,
      105,
      111,
      110,
      79,
      98,
      106,
      101,
      99,
      116,
      87,
      114,
      97,
      112,
      112,
      101,
      114,
      82,
      78,
      83,
      95,
      50,
      48,
      67,
      111,
      110,
      118,
      101,
      120,
      82,
      101,
      115,
      117,
      108,
      116,
      67,
      97,
      108,
      108,
      98,
      97,
      99,
      107,
      69,
      102,
      69,
      51,
      50,
      66,
      114,
      105,
      100,
      103,
      101,
      84,
      114,
      105,
      97,
      110,
      103,
      108,
      101,
      67,
      111,
      110,
      118,
      101,
      120,
      99,
      97,
      115,
      116,
      67,
      97,
      108,
      108,
      98,
      97,
      99,
      107,
      95,
      48,
      0,
      99,
      111,
      110,
      118,
      101,
      120,
      83,
      119,
      101,
      101,
      112,
      67,
      111,
      109,
      112,
      111,
      117,
      110,
      100,
      0,
      90,
      78,
      49,
      54,
      98,
      116,
      67,
      111,
      108,
      108,
      105,
      115,
      105,
      111,
      110,
      87,
      111,
      114,
      108,
      100,
      50,
      53,
      111,
      98,
      106,
      101,
      99,
      116,
      81,
      117,
      101,
      114,
      121,
      83,
      105,
      110,
      103,
      108,
      101,
      73,
      110,
      116,
      101,
      114,
      110,
      97,
      108,
      69,
      80,
      75,
      49,
      51,
      98,
      116,
      67,
      111,
      110,
      118,
      101,
      120,
      83,
      104,
      97,
      112,
      101,
      82,
      75,
      49,
      49,
      98,
      116,
      84,
      114,
      97,
      110,
      115,
      102,
      111,
      114,
      109,
      83,
      53,
      95,
      80,
      75,
      50,
      52,
      98,
      116,
      67,
      111,
      108,
      108,
      105,
      115,
      105,
      111,
      110,
      79,
      98,
      106,
      101,
      99,
      116,
      87,
      114,
      97,
      112,
      112,
      101,
      114,
      82,
      78,
      83,
      95,
      50,
      48,
      67,
      111,
      110,
      118,
      101,
      120,
      82,
      101,
      115,
      117,
      108,
      116,
      67,
      97,
      108,
      108,
      98,
      97,
      99,
      107,
      69,
      102,
      69,
      49,
      52,
      76,
      111,
      99,
      97,
      108,
      73,
      110,
      102,
      111,
      65,
      100,
      100,
      101,
      114,
      0,
      99,
      111,
      110,
      118,
      101,
      120,
      83,
      119,
      101,
      101,
      112,
      84,
      101,
      115,
      116,
      0,
      50,
      49,
      98,
      116,
      83,
      105,
      110,
      103,
      108,
      101,
      83,
      119,
      101,
      101,
      112,
      67,
      97,
      108,
      108,
      98,
      97,
      99,
      107,
      0,
      50,
      51,
      98,
      116,
      83,
      105,
      110,
      103,
      108,
      101,
      67,
      111,
      110,
      116,
      97,
      99,
      116,
      67,
      97,
      108,
      108,
      98,
      97,
      99,
      107,
      0,
      50,
      51,
      98,
      116,
      66,
      114,
      105,
      100,
      103,
      101,
      100,
      77,
      97,
      110,
      105,
      102,
      111,
      108,
      100,
      82,
      101,
      115,
      117,
      108,
      116,
      0,
      51,
      52,
      98,
      116,
      83,
      112,
      104,
      101,
      114,
      101,
      84,
      114,
      105,
      97,
      110,
      103,
      108,
      101,
      67,
      111,
      108,
      108,
      105,
      115,
      105,
      111,
      110,
      65,
      108,
      103,
      111,
      114,
      105,
      116,
      104,
      109,
      0,
      78,
      50,
      51,
      98,
      116,
      67,
      111,
      110,
      118,
      101,
      120,
      67,
      111,
      110,
      118,
      101,
      120,
      65,
      108,
      103,
      111,
      114,
      105,
      116,
      104,
      109,
      49,
      48,
      67,
      114,
      101,
      97,
      116,
      101,
      70,
      117,
      110,
      99,
      69,
      0,
      50,
      51,
      98,
      116,
      67,
      111,
      110,
      118,
      101,
      120,
      67,
      111,
      110,
      118,
      101,
      120,
      65,
      108,
      103,
      111,
      114,
      105,
      116,
      104,
      109,
      0,
      90,
      78,
      50,
      51,
      98,
      116,
      67,
      111,
      110,
      118,
      101,
      120,
      67,
      111,
      110,
      118,
      101,
      120,
      65,
      108,
      103,
      111,
      114,
      105,
      116,
      104,
      109,
      49,
      54,
      112,
      114,
      111,
      99,
      101,
      115,
      115,
      67,
      111,
      108,
      108,
      105,
      115,
      105,
      111,
      110,
      69,
      80,
      75,
      50,
      52,
      98,
      116,
      67,
      111,
      108,
      108,
      105,
      115,
      105,
      111,
      110,
      79,
      98,
      106,
      101,
      99,
      116,
      87,
      114,
      97,
      112,
      112,
      101,
      114,
      83,
      50,
      95,
      82,
      75,
      49,
      54,
      98,
      116,
      68,
      105,
      115,
      112,
      97,
      116,
      99,
      104,
      101,
      114,
      73,
      110,
      102,
      111,
      80,
      49,
      54,
      98,
      116,
      77,
      97,
      110,
      105,
      102,
      111,
      108,
      100,
      82,
      101,
      115,
      117,
      108,
      116,
      69,
      49,
      51,
      98,
      116,
      68,
      117,
      109,
      109,
      121,
      82,
      101,
      115,
      117,
      108,
      116,
      0,
      90,
      78,
      50,
      51,
      98,
      116,
      67,
      111,
      110,
      118,
      101,
      120,
      67,
      111,
      110,
      118,
      101,
      120,
      65,
      108,
      103,
      111,
      114,
      105,
      116,
      104,
      109,
      49,
      54,
      112,
      114,
      111,
      99,
      101,
      115,
      115,
      67,
      111,
      108,
      108,
      105,
      115,
      105,
      111,
      110,
      69,
      80,
      75,
      50,
      52,
      98,
      116,
      67,
      111,
      108,
      108,
      105,
      115,
      105,
      111,
      110,
      79,
      98,
      106,
      101,
      99,
      116,
      87,
      114,
      97,
      112,
      112,
      101,
      114,
      83,
      50,
      95,
      82,
      75,
      49,
      54,
      98,
      116,
      68,
      105,
      115,
      112,
      97,
      116,
      99,
      104,
      101,
      114,
      73,
      110,
      102,
      111,
      80,
      49,
      54,
      98,
      116,
      77,
      97,
      110,
      105,
      102,
      111,
      108,
      100,
      82,
      101,
      115,
      117,
      108,
      116,
      69,
      50,
      49,
      98,
      116,
      87,
      105,
      116,
      104,
      111,
      117,
      116,
      77,
      97,
      114,
      103,
      105,
      110,
      82,
      101,
      115,
      117,
      108,
      116,
      0,
      50,
      52,
      98,
      116,
      80,
      101,
      114,
      116,
      117,
      114,
      98,
      101,
      100,
      67,
      111,
      110,
      116,
      97,
      99,
      116,
      82,
      101,
      115,
      117,
      108,
      116,
      0,
      50,
      56,
      98,
      116,
      67,
      111,
      109,
      112,
      111,
      117,
      110,
      100,
      67,
      111,
      108,
      108,
      105,
      115,
      105,
      111,
      110,
      65,
      108,
      103,
      111,
      114,
      105,
      116,
      104,
      109,
      0,
      50,
      50,
      98,
      116,
      67,
      111,
      109,
      112,
      111,
      117,
      110,
      100,
      76,
      101,
      97,
      102,
      67,
      97,
      108,
      108,
      98,
      97,
      99,
      107,
      0,
      51,
      54,
      98,
      116,
      67,
      111,
      109,
      112,
      111,
      117,
      110,
      100,
      67,
      111,
      109,
      112,
      111,
      117,
      110,
      100,
      67,
      111,
      108,
      108,
      105,
      115,
      105,
      111,
      110,
      65,
      108,
      103,
      111,
      114,
      105,
      116,
      104,
      109,
      0,
      51,
      48,
      98,
      116,
      67,
      111,
      109,
      112,
      111,
      117,
      110,
      100,
      67,
      111,
      109,
      112,
      111,
      117,
      110,
      100,
      76,
      101,
      97,
      102,
      67,
      97,
      108,
      108,
      98,
      97,
      99,
      107,
      0,
      49,
      53,
      98,
      116,
      67,
      111,
      109,
      112,
      111,
      117,
      110,
      100,
      83,
      104,
      97,
      112,
      101,
      0,
      67,
      111,
      109,
      112,
      111,
      117,
      110,
      100,
      0,
      98,
      116,
      67,
      111,
      109,
      112,
      111,
      117,
      110,
      100,
      83,
      104,
      97,
      112,
      101,
      67,
      104,
      105,
      108,
      100,
      68,
      97,
      116,
      97,
      0,
      98,
      116,
      67,
      111,
      109,
      112,
      111,
      117,
      110,
      100,
      83,
      104,
      97,
      112,
      101,
      68,
      97,
      116,
      97,
      0,
      49,
      49,
      98,
      116,
      67,
      111,
      110,
      101,
      83,
      104,
      97,
      112,
      101,
      0,
      67,
      111,
      110,
      101,
      0,
      98,
      116,
      67,
      111,
      110,
      101,
      83,
      104,
      97,
      112,
      101,
      68,
      97,
      116,
      97,
      0,
      49,
      50,
      98,
      116,
      67,
      111,
      110,
      101,
      83,
      104,
      97,
      112,
      101,
      90,
      0,
      67,
      111,
      110,
      101,
      90,
      0,
      49,
      50,
      98,
      116,
      67,
      111,
      110,
      101,
      83,
      104,
      97,
      112,
      101,
      88,
      0,
      67,
      111,
      110,
      101,
      88,
      0,
      49,
      51,
      98,
      116,
      83,
      112,
      104,
      101,
      114,
      101,
      83,
      104,
      97,
      112,
      101,
      0,
      83,
      80,
      72,
      69,
      82,
      69,
      0,
      50,
      50,
      98,
      116,
      66,
      118,
      104,
      84,
      114,
      105,
      97,
      110,
      103,
      108,
      101,
      77,
      101,
      115,
      104,
      83,
      104,
      97,
      112,
      101,
      0,
      66,
      86,
      72,
      84,
      82,
      73,
      65,
      78,
      71,
      76,
      69,
      77,
      69,
      83,
      72,
      0,
      98,
      116,
      84,
      114,
      105,
      97,
      110,
      103,
      108,
      101,
      77,
      101,
      115,
      104,
      83,
      104,
      97,
      112,
      101,
      68,
      97,
      116,
      97,
      0,
      90,
      78,
      75,
      50,
      50,
      98,
      116,
      66,
      118,
      104,
      84,
      114,
      105,
      97,
      110,
      103,
      108,
      101,
      77,
      101,
      115,
      104,
      83,
      104,
      97,
      112,
      101,
      49,
      57,
      112,
      114,
      111,
      99,
      101,
      115,
      115,
      65,
      108,
      108,
      84,
      114,
      105,
      97,
      110,
      103,
      108,
      101,
      115,
      69,
      80,
      49,
      56,
      98,
      116,
      84,
      114,
      105,
      97,
      110,
      103,
      108,
      101,
      67,
      97,
      108,
      108,
      98,
      97,
      99,
      107,
      82,
      75,
      57,
      98,
      116,
      86,
      101,
      99,
      116,
      111,
      114,
      51,
      83,
      52,
      95,
      69,
      50,
      49,
      77,
      121,
      78,
      111,
      100,
      101,
      79,
      118,
      101,
      114,
      108,
      97,
      112,
      67,
      97,
      108,
      108,
      98,
      97,
      99,
      107,
      0,
      50,
      49,
      98,
      116,
      78,
      111,
      100,
      101,
      79,
      118,
      101,
      114,
      108,
      97,
      112,
      67,
      97,
      108,
      108,
      98,
      97,
      99,
      107,
      0,
      90,
      78,
      50,
      50,
      98,
      116,
      66,
      118,
      104,
      84,
      114,
      105,
      97,
      110,
      103,
      108,
      101,
      77,
      101,
      115,
      104,
      83,
      104,
      97,
      112,
      101,
      49,
      52,
      112,
      101,
      114,
      102,
      111,
      114,
      109,
      82,
      97,
      121,
      99,
      97,
      115,
      116,
      69,
      80,
      49,
      56,
      98,
      116,
      84,
      114,
      105,
      97,
      110,
      103,
      108,
      101,
      67,
      97,
      108,
      108,
      98,
      97,
      99,
      107,
      82,
      75,
      57,
      98,
      116,
      86,
      101,
      99,
      116,
      111,
      114,
      51,
      83,
      52,
      95,
      69,
      50,
      49,
      77,
      121,
      78,
      111,
      100,
      101,
      79,
      118,
      101,
      114,
      108,
      97,
      112,
      67,
      97,
      108,
      108,
      98,
      97,
      99,
      107,
      0,
      90,
      78,
      50,
      50,
      98,
      116,
      66,
      118,
      104,
      84,
      114,
      105,
      97,
      110,
      103,
      108,
      101,
      77,
      101,
      115,
      104,
      83,
      104,
      97,
      112,
      101,
      49,
      55,
      112,
      101,
      114,
      102,
      111,
      114,
      109,
      67,
      111,
      110,
      118,
      101,
      120,
      99,
      97,
      115,
      116,
      69,
      80,
      49,
      56,
      98,
      116,
      84,
      114,
      105,
      97,
      110,
      103,
      108,
      101,
      67,
      97,
      108,
      108,
      98,
      97,
      99,
      107,
      82,
      75,
      57,
      98,
      116,
      86,
      101,
      99,
      116,
      111,
      114,
      51,
      83,
      52,
      95,
      83,
      52,
      95,
      83,
      52,
      95,
      69,
      50,
      49,
      77,
      121,
      78,
      111,
      100,
      101,
      79,
      118,
      101,
      114,
      108,
      97,
      112,
      67,
      97,
      108,
      108,
      98,
      97,
      99,
      107,
      0,
      49,
      57,
      98,
      116,
      84,
      114,
      105,
      97,
      110,
      103,
      108,
      101,
      77,
      101,
      115,
      104,
      83,
      104,
      97,
      112,
      101,
      0,
      84,
      82,
      73,
      65,
      78,
      71,
      76,
      69,
      77,
      69,
      83,
      72,
      0,
      90,
      78,
      75,
      49,
      57,
      98,
      116,
      84,
      114,
      105,
      97,
      110,
      103,
      108,
      101,
      77,
      101,
      115,
      104,
      83,
      104,
      97,
      112,
      101,
      49,
      57,
      112,
      114,
      111,
      99,
      101,
      115,
      115,
      65,
      108,
      108,
      84,
      114,
      105,
      97,
      110,
      103,
      108,
      101,
      115,
      69,
      80,
      49,
      56,
      98,
      116,
      84,
      114,
      105,
      97,
      110,
      103,
      108,
      101,
      67,
      97,
      108,
      108,
      98,
      97,
      99,
      107,
      82,
      75,
      57,
      98,
      116,
      86,
      101,
      99,
      116,
      111,
      114,
      51,
      83,
      52,
      95,
      69,
      49,
      54,
      70,
      105,
      108,
      116,
      101,
      114,
      101,
      100,
      67,
      97,
      108,
      108,
      98,
      97,
      99,
      107,
      0,
      50,
      49,
      83,
      117,
      112,
      112,
      111,
      114,
      116,
      86,
      101,
      114,
      116,
      101,
      120,
      67,
      97,
      108,
      108,
      98,
      97,
      99,
      107,
      0,
      49,
      56,
      98,
      116,
      83,
      116,
      97,
      116,
      105,
      99,
      80,
      108,
      97,
      110,
      101,
      83,
      104,
      97,
      112,
      101,
      0,
      83,
      84,
      65,
      84,
      73,
      67,
      80,
      76,
      65,
      78,
      69,
      0,
      98,
      116,
      83,
      116,
      97,
      116,
      105,
      99,
      80,
      108,
      97,
      110,
      101,
      83,
      104,
      97,
      112,
      101,
      68,
      97,
      116,
      97,
      0,
      50,
      51,
      98,
      116,
      80,
      111,
      108,
      121,
      104,
      101,
      100,
      114,
      97,
      108,
      67,
      111,
      110,
      118,
      101,
      120,
      83,
      104,
      97,
      112,
      101,
      0,
      51,
      52,
      98,
      116,
      80,
      111,
      108,
      121,
      104,
      101,
      100,
      114,
      97,
      108,
      67,
      111,
      110,
      118,
      101,
      120,
      65,
      97,
      98,
      98,
      67,
      97,
      99,
      104,
      105,
      110,
      103,
      83,
      104,
      97,
      112,
      101,
      0,
      49,
      54,
      98,
      116,
      67,
      111,
      108,
      108,
      105,
      115,
      105,
      111,
      110,
      83,
      104,
      97,
      112,
      101,
      0,
      98,
      116,
      67,
      111,
      108,
      108,
      105,
      115,
      105,
      111,
      110,
      83,
      104,
      97,
      112,
      101,
      68,
      97,
      116,
      97,
      0,
      49,
      51,
      98,
      116,
      67,
      111,
      110,
      118,
      101,
      120,
      83,
      104,
      97,
      112,
      101,
      0,
      50,
      49,
      98,
      116,
      67,
      111,
      110,
      118,
      101,
      120,
      73,
      110,
      116,
      101,
      114,
      110,
      97,
      108,
      83,
      104,
      97,
      112,
      101,
      0,
      49,
      55,
      98,
      116,
      67,
      111,
      110,
      118,
      101,
      120,
      72,
      117,
      108,
      108,
      83,
      104,
      97,
      112,
      101,
      0,
      67,
      111,
      110,
      118,
      101,
      120,
      0,
      98,
      116,
      67,
      111,
      110,
      118,
      101,
      120,
      72,
      117,
      108,
      108,
      83,
      104,
      97,
      112,
      101,
      68,
      97,
      116,
      97,
      0,
      49,
      56,
      98,
      116,
      84,
      114,
      105,
      97,
      110,
      103,
      108,
      101,
      67,
      97,
      108,
      108,
      98,
      97,
      99,
      107,
      0,
      51,
      49,
      98,
      116,
      73,
      110,
      116,
      101,
      114,
      110,
      97,
      108,
      84,
      114,
      105,
      97,
      110,
      103,
      108,
      101,
      73,
      110,
      100,
      101,
      120,
      67,
      97,
      108,
      108,
      98,
      97,
      99,
      107,
      0,
      49,
      52,
      98,
      116,
      67,
      97,
      112,
      115,
      117,
      108,
      101,
      83,
      104,
      97,
      112,
      101,
      0,
      67,
      97,
      112,
      115,
      117,
      108,
      101,
      83,
      104,
      97,
      112,
      101,
      0,
      98,
      116,
      67,
      97,
      112,
      115,
      117,
      108,
      101,
      83,
      104,
      97,
      112,
      101,
      68,
      97,
      116,
      97,
      0,
      49,
      53,
      98,
      116,
      67,
      97,
      112,
      115,
      117,
      108,
      101,
      83,
      104,
      97,
      112,
      101,
      88,
      0,
      67,
      97,
      112,
      115,
      117,
      108,
      101,
      88,
      0,
      49,
      53,
      98,
      116,
      67,
      97,
      112,
      115,
      117,
      108,
      101,
      83,
      104,
      97,
      112,
      101,
      90,
      0,
      67,
      97,
      112,
      115,
      117,
      108,
      101,
      90,
      0,
      50,
      53,
      98,
      116,
      67,
      111,
      110,
      118,
      101,
      120,
      84,
      114,
      105,
      97,
      110,
      103,
      108,
      101,
      77,
      101,
      115,
      104,
      83,
      104,
      97,
      112,
      101,
      0,
      67,
      111,
      110,
      118,
      101,
      120,
      84,
      114,
      105,
      109,
      101,
      115,
      104,
      0,
      50,
      54,
      76,
      111,
      99,
      97,
      108,
      83,
      117,
      112,
      112,
      111,
      114,
      116,
      86,
      101,
      114,
      116,
      101,
      120,
      67,
      97,
      108,
      108,
      98,
      97,
      99,
      107,
      0,
      49,
      52,
      98,
      116,
      67,
      111,
      110,
      99,
      97,
      118,
      101,
      83,
      104,
      97,
      112,
      101,
      0,
      49,
      48,
      98,
      116,
      66,
      111,
      120,
      83,
      104,
      97,
      112,
      101,
      0,
      66,
      111,
      120,
      0,
      49,
      52,
      98,
      116,
      79,
      112,
      116,
      105,
      109,
      105,
      122,
      101,
      100,
      66,
      118,
      104,
      0,
      90,
      78,
      49,
      52,
      98,
      116,
      79,
      112,
      116,
      105,
      109,
      105,
      122,
      101,
      100,
      66,
      118,
      104,
      53,
      98,
      117,
      105,
      108,
      100,
      69,
      80,
      50,
      51,
      98,
      116,
      83,
      116,
      114,
      105,
      100,
      105,
      110,
      103,
      77,
      101,
      115,
      104,
      73,
      110,
      116,
      101,
      114,
      102,
      97,
      99,
      101,
      98,
      82,
      75,
      57,
      98,
      116,
      86,
      101,
      99,
      116,
      111,
      114,
      51,
      83,
      52,
      95,
      69,
      50,
      57,
      81,
      117,
      97,
      110,
      116,
      105,
      122,
      101,
      100,
      78,
      111,
      100,
      101,
      84,
      114,
      105,
      97,
      110,
      103,
      108,
      101,
      67,
      97,
      108,
      108,
      98,
      97,
      99,
      107,
      0,
      90,
      78,
      49,
      52,
      98,
      116,
      79,
      112,
      116,
      105,
      109,
      105,
      122,
      101,
      100,
      66,
      118,
      104,
      53,
      98,
      117,
      105,
      108,
      100,
      69,
      80,
      50,
      51,
      98,
      116,
      83,
      116,
      114,
      105,
      100,
      105,
      110,
      103,
      77,
      101,
      115,
      104,
      73,
      110,
      116,
      101,
      114,
      102,
      97,
      99,
      101,
      98,
      82,
      75,
      57,
      98,
      116,
      86,
      101,
      99,
      116,
      111,
      114,
      51,
      83,
      52,
      95,
      69,
      50,
      48,
      78,
      111,
      100,
      101,
      84,
      114,
      105,
      97,
      110,
      103,
      108,
      101,
      67,
      97,
      108,
      108,
      98,
      97,
      99,
      107,
      0,
      50,
      53,
      98,
      116,
      72,
      101,
      105,
      103,
      104,
      116,
      102,
      105,
      101,
      108,
      100,
      84,
      101,
      114,
      114,
      97,
      105,
      110,
      83,
      104,
      97,
      112,
      101,
      0,
      72,
      69,
      73,
      71,
      72,
      84,
      70,
      73,
      69,
      76,
      68,
      0,
      49,
      53,
      98,
      116,
      67,
      121,
      108,
      105,
      110,
      100,
      101,
      114,
      83,
      104,
      97,
      112,
      101,
      0,
      67,
      121,
      108,
      105,
      110,
      100,
      101,
      114,
      89,
      0,
      98,
      116,
      67,
      121,
      108,
      105,
      110,
      100,
      101,
      114,
      83,
      104,
      97,
      112,
      101,
      68,
      97,
      116,
      97,
      0,
      49,
      54,
      98,
      116,
      67,
      121,
      108,
      105,
      110,
      100,
      101,
      114,
      83,
      104,
      97,
      112,
      101,
      88,
      0,
      67,
      121,
      108,
      105,
      110,
      100,
      101,
      114,
      88,
      0,
      49,
      54,
      98,
      116,
      67,
      121,
      108,
      105,
      110,
      100,
      101,
      114,
      83,
      104,
      97,
      112,
      101,
      90,
      0,
      67,
      121,
      108,
      105,
      110,
      100,
      101,
      114,
      90,
      0,
      49,
      52,
      98,
      116,
      84,
      114,
      105,
      97,
      110,
      103,
      108,
      101,
      77,
      101,
      115,
      104,
      0,
      50,
      48,
      98,
      116,
      65,
      120,
      105,
      115,
      83,
      119,
      101,
      101,
      112,
      51,
      73,
      110,
      116,
      101,
      114,
      110,
      97,
      108,
      73,
      116,
      69,
      0,
      50,
      49,
      98,
      116,
      66,
      114,
      111,
      97,
      100,
      112,
      104,
      97,
      115,
      101,
      73,
      110,
      116,
      101,
      114,
      102,
      97,
      99,
      101,
      0,
      49,
      53,
      98,
      116,
      78,
      117,
      108,
      108,
      80,
      97,
      105,
      114,
      67,
      97,
      99,
      104,
      101,
      0,
      50,
      50,
      98,
      116,
      79,
      118,
      101,
      114,
      108,
      97,
      112,
      112,
      105,
      110,
      103,
      80,
      97,
      105,
      114,
      67,
      97,
      99,
      104,
      101,
      0,
      49,
      50,
      98,
      116,
      65,
      120,
      105,
      115,
      83,
      119,
      101,
      101,
      112,
      51,
      0,
      50,
      56,
      98,
      116,
      72,
      97,
      115,
      104,
      101,
      100,
      79,
      118,
      101,
      114,
      108,
      97,
      112,
      112,
      105,
      110,
      103,
      80,
      97,
      105,
      114,
      67,
      97,
      99,
      104,
      101,
      0,
      90,
      78,
      50,
      56,
      98,
      116,
      72,
      97,
      115,
      104,
      101,
      100,
      79,
      118,
      101,
      114,
      108,
      97,
      112,
      112,
      105,
      110,
      103,
      80,
      97,
      105,
      114,
      67,
      97,
      99,
      104,
      101,
      51,
      55,
      114,
      101,
      109,
      111,
      118,
      101,
      79,
      118,
      101,
      114,
      108,
      97,
      112,
      112,
      105,
      110,
      103,
      80,
      97,
      105,
      114,
      115,
      67,
      111,
      110,
      116,
      97,
      105,
      110,
      105,
      110,
      103,
      80,
      114,
      111,
      120,
      121,
      69,
      80,
      49,
      55,
      98,
      116,
      66,
      114,
      111,
      97,
      100,
      112,
      104,
      97,
      115,
      101,
      80,
      114,
      111,
      120,
      121,
      80,
      49,
      50,
      98,
      116,
      68,
      105,
      115,
      112,
      97,
      116,
      99,
      104,
      101,
      114,
      69,
      49,
      56,
      82,
      101,
      109,
      111,
      118,
      101,
      80,
      97,
      105,
      114,
      67,
      97,
      108,
      108,
      98,
      97,
      99,
      107,
      0,
      90,
      78,
      50,
      56,
      98,
      116,
      72,
      97,
      115,
      104,
      101,
      100,
      79,
      118,
      101,
      114,
      108,
      97,
      112,
      112,
      105,
      110,
      103,
      80,
      97,
      105,
      114,
      67,
      97,
      99,
      104,
      101,
      49,
      57,
      99,
      108,
      101,
      97,
      110,
      80,
      114,
      111,
      120,
      121,
      70,
      114,
      111,
      109,
      80,
      97,
      105,
      114,
      115,
      69,
      80,
      49,
      55,
      98,
      116,
      66,
      114,
      111,
      97,
      100,
      112,
      104,
      97,
      115,
      101,
      80,
      114,
      111,
      120,
      121,
      80,
      49,
      50,
      98,
      116,
      68,
      105,
      115,
      112,
      97,
      116,
      99,
      104,
      101,
      114,
      69,
      49,
      55,
      67,
      108,
      101,
      97,
      110,
      80,
      97,
      105,
      114,
      67,
      97,
      108,
      108,
      98,
      97,
      99,
      107,
      0,
      49,
      54,
      98,
      116,
      68,
      98,
      118,
      116,
      66,
      114,
      111,
      97,
      100,
      112,
      104,
      97,
      115,
      101,
      0,
      49,
      56,
      98,
      116,
      68,
      98,
      118,
      116,
      84,
      114,
      101,
      101,
      67,
      111,
      108,
      108,
      105,
      100,
      101,
      114,
      0,
      49,
      57,
      66,
      114,
      111,
      97,
      100,
      112,
      104,
      97,
      115,
      101,
      82,
      97,
      121,
      84,
      101,
      115,
      116,
      101,
      114,
      0,
      50,
      48,
      66,
      114,
      111,
      97,
      100,
      112,
      104,
      97,
      115,
      101,
      65,
      97,
      98,
      98,
      84,
      101,
      115,
      116,
      101,
      114,
      0,
      49,
      50,
      98,
      116,
      68,
      105,
      115,
      112,
      97,
      116,
      99,
      104,
      101,
      114,
      0,
      49,
      52,
      98,
      116,
      81,
      117,
      97,
      110,
      116,
      105,
      122,
      101,
      100,
      66,
      118,
      104,
      0,
      98,
      116,
      79,
      112,
      116,
      105,
      109,
      105,
      122,
      101,
      100,
      66,
      118,
      104,
      78,
      111,
      100,
      101,
      68,
      97,
      116,
      97,
      0,
      98,
      116,
      81,
      117,
      97,
      110,
      116,
      105,
      122,
      101,
      100,
      66,
      118,
      104,
      78,
      111,
      100,
      101,
      68,
      97,
      116,
      97,
      0,
      98,
      116,
      66,
      118,
      104,
      83,
      117,
      98,
      116,
      114,
      101,
      101,
      73,
      110,
      102,
      111,
      68,
      97,
      116,
      97,
      0,
      98,
      116,
      81,
      117,
      97,
      110,
      116,
      105,
      122,
      101,
      100,
      66,
      118,
      104,
      70,
      108,
      111,
      97,
      116,
      68,
      97,
      116,
      97,
      0,
      50,
      53,
      98,
      116,
      84,
      114,
      105,
      97,
      110,
      103,
      108,
      101,
      82,
      97,
      121,
      99,
      97,
      115,
      116,
      67,
      97,
      108,
      108,
      98,
      97,
      99,
      107,
      0,
      50,
      56,
      98,
      116,
      84,
      114,
      105,
      97,
      110,
      103,
      108,
      101,
      67,
      111,
      110,
      118,
      101,
      120,
      99,
      97,
      115,
      116,
      67,
      97,
      108,
      108,
      98,
      97,
      99,
      107,
      0,
      51,
      51,
      98,
      116,
      77,
      105,
      110,
      107,
      111,
      119,
      115,
      107,
      105,
      80,
      101,
      110,
      101,
      116,
      114,
      97,
      116,
      105,
      111,
      110,
      68,
      101,
      112,
      116,
      104,
      83,
      111,
      108,
      118,
      101,
      114,
      0,
      51,
      48,
      98,
      116,
      67,
      111,
      110,
      118,
      101,
      120,
      80,
      101,
      110,
      101,
      116,
      114,
      97,
      116,
      105,
      111,
      110,
      68,
      101,
      112,
      116,
      104,
      83,
      111,
      108,
      118,
      101,
      114,
      0,
      90,
      78,
      51,
      51,
      98,
      116,
      77,
      105,
      110,
      107,
      111,
      119,
      115,
      107,
      105,
      80,
      101,
      110,
      101,
      116,
      114,
      97,
      116,
      105,
      111,
      110,
      68,
      101,
      112,
      116,
      104,
      83,
      111,
      108,
      118,
      101,
      114,
      49,
      50,
      99,
      97,
      108,
      99,
      80,
      101,
      110,
      68,
      101,
      112,
      116,
      104,
      69,
      82,
      50,
      50,
      98,
      116,
      86,
      111,
      114,
      111,
      110,
      111,
      105,
      83,
      105,
      109,
      112,
      108,
      101,
      120,
      83,
      111,
      108,
      118,
      101,
      114,
      80,
      75,
      49,
      51,
      98,
      116,
      67,
      111,
      110,
      118,
      101,
      120,
      83,
      104,
      97,
      112,
      101,
      83,
      52,
      95,
      82,
      75,
      49,
      49,
      98,
      116,
      84,
      114,
      97,
      110,
      115,
      102,
      111,
      114,
      109,
      83,
      55,
      95,
      82,
      57,
      98,
      116,
      86,
      101,
      99,
      116,
      111,
      114,
      51,
      83,
      57,
      95,
      83,
      57,
      95,
      80,
      49,
      50,
      98,
      116,
      73,
      68,
      101,
      98,
      117,
      103,
      68,
      114,
      97,
      119,
      69,
      50,
      48,
      98,
      116,
      73,
      110,
      116,
      101,
      114,
      109,
      101,
      100,
      105,
      97,
      116,
      101,
      82,
      101,
      115,
      117,
      108,
      116,
      0,
      51,
      48,
      98,
      116,
      71,
      106,
      107,
      69,
      112,
      97,
      80,
      101,
      110,
      101,
      116,
      114,
      97,
      116,
      105,
      111,
      110,
      68,
      101,
      112,
      116,
      104,
      83,
      111,
      108,
      118,
      101,
      114,
      0,
      49,
      53,
      98,
      116,
      71,
      106,
      107,
      67,
      111,
      110,
      118,
      101,
      120,
      67,
      97,
      115,
      116,
      0,
      49,
      54,
      98,
      116,
      80,
      111,
      105,
      110,
      116,
      67,
      111,
      108,
      108,
      101,
      99,
      116,
      111,
      114,
      0,
      50,
      55,
      98,
      116,
      67,
      111,
      110,
      116,
      105,
      110,
      117,
      111,
      117,
      115,
      67,
      111,
      110,
      118,
      101,
      120,
      67,
      111,
      108,
      108,
      105,
      115,
      105,
      111,
      110,
      0,
      49,
      55,
      98,
      116,
      71,
      106,
      107,
      80,
      97,
      105,
      114,
      68,
      101,
      116,
      101,
      99,
      116,
      111,
      114,
      0,
      51,
      54,
      98,
      116,
      68,
      105,
      115,
      99,
      114,
      101,
      116,
      101,
      67,
      111,
      108,
      108,
      105,
      115,
      105,
      111,
      110,
      68,
      101,
      116,
      101,
      99,
      116,
      111,
      114,
      73,
      110,
      116,
      101,
      114,
      102,
      97,
      99,
      101,
      0,
      51,
      48,
      98,
      116,
      65,
      99,
      116,
      105,
      118,
      97,
      116,
      105,
      110,
      103,
      67,
      111,
      108,
      108,
      105,
      115,
      105,
      111,
      110,
      65,
      108,
      103,
      111,
      114,
      105,
      116,
      104,
      109,
      0,
      49,
      54,
      98,
      116,
      69,
      109,
      112,
      116,
      121,
      65,
      108,
      103,
      111,
      114,
      105,
      116,
      104,
      109,
      0,
      51,
      50,
      98,
      116,
      83,
      112,
      104,
      101,
      114,
      101,
      83,
      112,
      104,
      101,
      114,
      101,
      67,
      111,
      108,
      108,
      105,
      115,
      105,
      111,
      110,
      65,
      108,
      103,
      111,
      114,
      105,
      116,
      104,
      109,
      0,
      49,
      54,
      98,
      116,
      66,
      111,
      120,
      66,
      111,
      120,
      68,
      101,
      116,
      101,
      99,
      116,
      111,
      114,
      0,
      50,
      50,
      83,
      112,
      104,
      101,
      114,
      101,
      84,
      114,
      105,
      97,
      110,
      103,
      108,
      101,
      68,
      101,
      116,
      101,
      99,
      116,
      111,
      114,
      0,
      50,
      51,
      98,
      116,
      72,
      97,
      115,
      104,
      101,
      100,
      83,
      105,
      109,
      112,
      108,
      101,
      80,
      97,
      105,
      114,
      67,
      97,
      99,
      104,
      101,
      0,
      49,
      56,
      98,
      116,
      67,
      111,
      110,
      118,
      101,
      120,
      80,
      111,
      108,
      121,
      104,
      101,
      100,
      114,
      111,
      110,
      0,
      50,
      54,
      98,
      116,
      84,
      114,
      105,
      97,
      110,
      103,
      108,
      101,
      73,
      110,
      100,
      101,
      120,
      86,
      101,
      114,
      116,
      101,
      120,
      65,
      114,
      114,
      97,
      121,
      0,
      50,
      51,
      98,
      116,
      83,
      116,
      114,
      105,
      100,
      105,
      110,
      103,
      77,
      101,
      115,
      104,
      73,
      110,
      116,
      101,
      114,
      102,
      97,
      99,
      101,
      0,
      98,
      116,
      73,
      110,
      116,
      73,
      110,
      100,
      101,
      120,
      68,
      97,
      116,
      97,
      0,
      98,
      116,
      83,
      104,
      111,
      114,
      116,
      73,
      110,
      116,
      73,
      110,
      100,
      101,
      120,
      84,
      114,
      105,
      112,
      108,
      101,
      116,
      68,
      97,
      116,
      97,
      0,
      98,
      116,
      67,
      104,
      97,
      114,
      73,
      110,
      100,
      101,
      120,
      84,
      114,
      105,
      112,
      108,
      101,
      116,
      68,
      97,
      116,
      97,
      0,
      98,
      116,
      86,
      101,
      99,
      116,
      111,
      114,
      51,
      70,
      108,
      111,
      97,
      116,
      68,
      97,
      116,
      97,
      0,
      98,
      116,
      86,
      101,
      99,
      116,
      111,
      114,
      51,
      68,
      111,
      117,
      98,
      108,
      101,
      68,
      97,
      116,
      97,
      0,
      98,
      116,
      77,
      101,
      115,
      104,
      80,
      97,
      114,
      116,
      68,
      97,
      116,
      97,
      0,
      98,
      116,
      83,
      116,
      114,
      105,
      100,
      105,
      110,
      103,
      77,
      101,
      115,
      104,
      73,
      110,
      116,
      101,
      114,
      102,
      97,
      99,
      101,
      68,
      97,
      116,
      97,
      0,
      82,
      111,
      111,
      116,
      0,
      17,
      0,
      10,
      0,
      17,
      17,
      17,
      0,
      0,
      0,
      0,
      5,
      0,
      0,
      0,
      0,
      0,
      0,
      9,
      0,
      0,
      0,
      0,
      11,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      17,
      0,
      15,
      10,
      17,
      17,
      17,
      3,
      10,
      7,
      0,
      1,
      19,
      9,
      11,
      11,
      0,
      0,
      9,
      6,
      11,
      0,
      0,
      11,
      0,
      6,
      17,
      0,
      0,
      0,
      17,
      17,
      17,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      11,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      17,
      0,
      10,
      10,
      17,
      17,
      17,
      0,
      10,
      0,
      0,
      2,
      0,
      9,
      11,
      0,
      0,
      0,
      9,
      0,
      11,
      0,
      0,
      11,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      12,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      12,
      0,
      0,
      0,
      0,
      12,
      0,
      0,
      0,
      0,
      9,
      12,
      0,
      0,
      0,
      0,
      0,
      12,
      0,
      0,
      12,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      14,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      13,
      0,
      0,
      0,
      4,
      13,
      0,
      0,
      0,
      0,
      9,
      14,
      0,
      0,
      0,
      0,
      0,
      14,
      0,
      0,
      14,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      16,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      15,
      0,
      0,
      0,
      0,
      15,
      0,
      0,
      0,
      0,
      9,
      16,
      0,
      0,
      0,
      0,
      0,
      16,
      0,
      0,
      16,
      0,
      0,
      18,
      0,
      0,
      0,
      18,
      18,
      18,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      18,
      0,
      0,
      0,
      18,
      18,
      18,
      0,
      0,
      0,
      0,
      0,
      0,
      9,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      11,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      10,
      0,
      0,
      0,
      0,
      10,
      0,
      0,
      0,
      0,
      9,
      11,
      0,
      0,
      0,
      0,
      0,
      11,
      0,
      0,
      11,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      12,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      12,
      0,
      0,
      0,
      0,
      12,
      0,
      0,
      0,
      0,
      9,
      12,
      0,
      0,
      0,
      0,
      0,
      12,
      0,
      0,
      12,
      0,
      0,
      48,
      49,
      50,
      51,
      52,
      53,
      54,
      55,
      56,
      57,
      65,
      66,
      67,
      68,
      69,
      70,
      45,
      43,
      32,
      32,
      32,
      48,
      88,
      48,
      120,
      0,
      84,
      33,
      34,
      25,
      13,
      1,
      2,
      3,
      17,
      75,
      28,
      12,
      16,
      4,
      11,
      29,
      18,
      30,
      39,
      104,
      110,
      111,
      112,
      113,
      98,
      32,
      5,
      6,
      15,
      19,
      20,
      21,
      26,
      8,
      22,
      7,
      40,
      36,
      23,
      24,
      9,
      10,
      14,
      27,
      31,
      37,
      35,
      131,
      130,
      125,
      38,
      42,
      43,
      60,
      61,
      62,
      63,
      67,
      71,
      74,
      77,
      88,
      89,
      90,
      91,
      92,
      93,
      94,
      95,
      96,
      97,
      99,
      100,
      101,
      102,
      103,
      105,
      106,
      107,
      108,
      114,
      115,
      116,
      121,
      122,
      123,
      124,
      0,
      73,
      108,
      108,
      101,
      103,
      97,
      108,
      32,
      98,
      121,
      116,
      101,
      32,
      115,
      101,
      113,
      117,
      101,
      110,
      99,
      101,
      0,
      68,
      111,
      109,
      97,
      105,
      110,
      32,
      101,
      114,
      114,
      111,
      114,
      0,
      82,
      101,
      115,
      117,
      108,
      116,
      32,
      110,
      111,
      116,
      32,
      114,
      101,
      112,
      114,
      101,
      115,
      101,
      110,
      116,
      97,
      98,
      108,
      101,
      0,
      78,
      111,
      116,
      32,
      97,
      32,
      116,
      116,
      121,
      0,
      80,
      101,
      114,
      109,
      105,
      115,
      115,
      105,
      111,
      110,
      32,
      100,
      101,
      110,
      105,
      101,
      100,
      0,
      79,
      112,
      101,
      114,
      97,
      116,
      105,
      111,
      110,
      32,
      110,
      111,
      116,
      32,
      112,
      101,
      114,
      109,
      105,
      116,
      116,
      101,
      100,
      0,
      78,
      111,
      32,
      115,
      117,
      99,
      104,
      32,
      102,
      105,
      108,
      101,
      32,
      111,
      114,
      32,
      100,
      105,
      114,
      101,
      99,
      116,
      111,
      114,
      121,
      0,
      78,
      111,
      32,
      115,
      117,
      99,
      104,
      32,
      112,
      114,
      111,
      99,
      101,
      115,
      115,
      0,
      70,
      105,
      108,
      101,
      32,
      101,
      120,
      105,
      115,
      116,
      115,
      0,
      86,
      97,
      108,
      117,
      101,
      32,
      116,
      111,
      111,
      32,
      108,
      97,
      114,
      103,
      101,
      32,
      102,
      111,
      114,
      32,
      100,
      97,
      116,
      97,
      32,
      116,
      121,
      112,
      101,
      0,
      78,
      111,
      32,
      115,
      112,
      97,
      99,
      101,
      32,
      108,
      101,
      102,
      116,
      32,
      111,
      110,
      32,
      100,
      101,
      118,
      105,
      99,
      101,
      0,
      79,
      117,
      116,
      32,
      111,
      102,
      32,
      109,
      101,
      109,
      111,
      114,
      121,
      0,
      82,
      101,
      115,
      111,
      117,
      114,
      99,
      101,
      32,
      98,
      117,
      115,
      121,
      0,
      73,
      110,
      116,
      101,
      114,
      114,
      117,
      112,
      116,
      101,
      100,
      32,
      115,
      121,
      115,
      116,
      101,
      109,
      32,
      99,
      97,
      108,
      108,
      0,
      82,
      101,
      115,
      111,
      117,
      114,
      99,
      101,
      32,
      116,
      101,
      109,
      112,
      111,
      114,
      97,
      114,
      105,
      108,
      121,
      32,
      117,
      110,
      97,
      118,
      97,
      105,
      108,
      97,
      98,
      108,
      101,
      0,
      73,
      110,
      118,
      97,
      108,
      105,
      100,
      32,
      115,
      101,
      101,
      107,
      0,
      67,
      114,
      111,
      115,
      115,
      45,
      100,
      101,
      118,
      105,
      99,
      101,
      32,
      108,
      105,
      110,
      107,
      0,
      82,
      101,
      97,
      100,
      45,
      111,
      110,
      108,
      121,
      32,
      102,
      105,
      108,
      101,
      32,
      115,
      121,
      115,
      116,
      101,
      109,
      0,
      68,
      105,
      114,
      101,
      99,
      116,
      111,
      114,
      121,
      32,
      110,
      111,
      116,
      32,
      101,
      109,
      112,
      116,
      121,
      0,
      67,
      111,
      110,
      110,
      101,
      99,
      116,
      105,
      111,
      110,
      32,
      114,
      101,
      115,
      101,
      116,
      32,
      98,
      121,
      32,
      112,
      101,
      101,
      114,
      0,
      79,
      112,
      101,
      114,
      97,
      116,
      105,
      111,
      110,
      32,
      116,
      105,
      109,
      101,
      100,
      32,
      111,
      117,
      116,
      0,
      67,
      111,
      110,
      110,
      101,
      99,
      116,
      105,
      111,
      110,
      32,
      114,
      101,
      102,
      117,
      115,
      101,
      100,
      0,
      72,
      111,
      115,
      116,
      32,
      105,
      115,
      32,
      100,
      111,
      119,
      110,
      0,
      72,
      111,
      115,
      116,
      32,
      105,
      115,
      32,
      117,
      110,
      114,
      101,
      97,
      99,
      104,
      97,
      98,
      108,
      101,
      0,
      65,
      100,
      100,
      114,
      101,
      115,
      115,
      32,
      105,
      110,
      32,
      117,
      115,
      101,
      0,
      66,
      114,
      111,
      107,
      101,
      110,
      32,
      112,
      105,
      112,
      101,
      0,
      73,
      47,
      79,
      32,
      101,
      114,
      114,
      111,
      114,
      0,
      78,
      111,
      32,
    ],
    'i8',
    ALLOC_NONE,
    Runtime.GLOBAL_BASE + 10240
  );
  allocate(
    [
      115,
      117,
      99,
      104,
      32,
      100,
      101,
      118,
      105,
      99,
      101,
      32,
      111,
      114,
      32,
      97,
      100,
      100,
      114,
      101,
      115,
      115,
      0,
      66,
      108,
      111,
      99,
      107,
      32,
      100,
      101,
      118,
      105,
      99,
      101,
      32,
      114,
      101,
      113,
      117,
      105,
      114,
      101,
      100,
      0,
      78,
      111,
      32,
      115,
      117,
      99,
      104,
      32,
      100,
      101,
      118,
      105,
      99,
      101,
      0,
      78,
      111,
      116,
      32,
      97,
      32,
      100,
      105,
      114,
      101,
      99,
      116,
      111,
      114,
      121,
      0,
      73,
      115,
      32,
      97,
      32,
      100,
      105,
      114,
      101,
      99,
      116,
      111,
      114,
      121,
      0,
      84,
      101,
      120,
      116,
      32,
      102,
      105,
      108,
      101,
      32,
      98,
      117,
      115,
      121,
      0,
      69,
      120,
      101,
      99,
      32,
      102,
      111,
      114,
      109,
      97,
      116,
      32,
      101,
      114,
      114,
      111,
      114,
      0,
      73,
      110,
      118,
      97,
      108,
      105,
      100,
      32,
      97,
      114,
      103,
      117,
      109,
      101,
      110,
      116,
      0,
      65,
      114,
      103,
      117,
      109,
      101,
      110,
      116,
      32,
      108,
      105,
      115,
      116,
      32,
      116,
      111,
      111,
      32,
      108,
      111,
      110,
      103,
      0,
      83,
      121,
      109,
      98,
      111,
      108,
      105,
      99,
      32,
      108,
      105,
      110,
      107,
      32,
      108,
      111,
      111,
      112,
      0,
      70,
      105,
      108,
      101,
      110,
      97,
      109,
      101,
      32,
      116,
      111,
      111,
      32,
      108,
      111,
      110,
      103,
      0,
      84,
      111,
      111,
      32,
      109,
      97,
      110,
      121,
      32,
      111,
      112,
      101,
      110,
      32,
      102,
      105,
      108,
      101,
      115,
      32,
      105,
      110,
      32,
      115,
      121,
      115,
      116,
      101,
      109,
      0,
      78,
      111,
      32,
      102,
      105,
      108,
      101,
      32,
      100,
      101,
      115,
      99,
      114,
      105,
      112,
      116,
      111,
      114,
      115,
      32,
      97,
      118,
      97,
      105,
      108,
      97,
      98,
      108,
      101,
      0,
      66,
      97,
      100,
      32,
      102,
      105,
      108,
      101,
      32,
      100,
      101,
      115,
      99,
      114,
      105,
      112,
      116,
      111,
      114,
      0,
      78,
      111,
      32,
      99,
      104,
      105,
      108,
      100,
      32,
      112,
      114,
      111,
      99,
      101,
      115,
      115,
      0,
      66,
      97,
      100,
      32,
      97,
      100,
      100,
      114,
      101,
      115,
      115,
      0,
      70,
      105,
      108,
      101,
      32,
      116,
      111,
      111,
      32,
      108,
      97,
      114,
      103,
      101,
      0,
      84,
      111,
      111,
      32,
      109,
      97,
      110,
      121,
      32,
      108,
      105,
      110,
      107,
      115,
      0,
      78,
      111,
      32,
      108,
      111,
      99,
      107,
      115,
      32,
      97,
      118,
      97,
      105,
      108,
      97,
      98,
      108,
      101,
      0,
      82,
      101,
      115,
      111,
      117,
      114,
      99,
      101,
      32,
      100,
      101,
      97,
      100,
      108,
      111,
      99,
      107,
      32,
      119,
      111,
      117,
      108,
      100,
      32,
      111,
      99,
      99,
      117,
      114,
      0,
      83,
      116,
      97,
      116,
      101,
      32,
      110,
      111,
      116,
      32,
      114,
      101,
      99,
      111,
      118,
      101,
      114,
      97,
      98,
      108,
      101,
      0,
      80,
      114,
      101,
      118,
      105,
      111,
      117,
      115,
      32,
      111,
      119,
      110,
      101,
      114,
      32,
      100,
      105,
      101,
      100,
      0,
      79,
      112,
      101,
      114,
      97,
      116,
      105,
      111,
      110,
      32,
      99,
      97,
      110,
      99,
      101,
      108,
      101,
      100,
      0,
      70,
      117,
      110,
      99,
      116,
      105,
      111,
      110,
      32,
      110,
      111,
      116,
      32,
      105,
      109,
      112,
      108,
      101,
      109,
      101,
      110,
      116,
      101,
      100,
      0,
      78,
      111,
      32,
      109,
      101,
      115,
      115,
      97,
      103,
      101,
      32,
      111,
      102,
      32,
      100,
      101,
      115,
      105,
      114,
      101,
      100,
      32,
      116,
      121,
      112,
      101,
      0,
      73,
      100,
      101,
      110,
      116,
      105,
      102,
      105,
      101,
      114,
      32,
      114,
      101,
      109,
      111,
      118,
      101,
      100,
      0,
      68,
      101,
      118,
      105,
      99,
      101,
      32,
      110,
      111,
      116,
      32,
      97,
      32,
      115,
      116,
      114,
      101,
      97,
      109,
      0,
      78,
      111,
      32,
      100,
      97,
      116,
      97,
      32,
      97,
      118,
      97,
      105,
      108,
      97,
      98,
      108,
      101,
      0,
      68,
      101,
      118,
      105,
      99,
      101,
      32,
      116,
      105,
      109,
      101,
      111,
      117,
      116,
      0,
      79,
      117,
      116,
      32,
      111,
      102,
      32,
      115,
      116,
      114,
      101,
      97,
      109,
      115,
      32,
      114,
      101,
      115,
      111,
      117,
      114,
      99,
      101,
      115,
      0,
      76,
      105,
      110,
      107,
      32,
      104,
      97,
      115,
      32,
      98,
      101,
      101,
      110,
      32,
      115,
      101,
      118,
      101,
      114,
      101,
      100,
      0,
      80,
      114,
      111,
      116,
      111,
      99,
      111,
      108,
      32,
      101,
      114,
      114,
      111,
      114,
      0,
      66,
      97,
      100,
      32,
      109,
      101,
      115,
      115,
      97,
      103,
      101,
      0,
      70,
      105,
      108,
      101,
      32,
      100,
      101,
      115,
      99,
      114,
      105,
      112,
      116,
      111,
      114,
      32,
      105,
      110,
      32,
      98,
      97,
      100,
      32,
      115,
      116,
      97,
      116,
      101,
      0,
      78,
      111,
      116,
      32,
      97,
      32,
      115,
      111,
      99,
      107,
      101,
      116,
      0,
      68,
      101,
      115,
      116,
      105,
      110,
      97,
      116,
      105,
      111,
      110,
      32,
      97,
      100,
      100,
      114,
      101,
      115,
      115,
      32,
      114,
      101,
      113,
      117,
      105,
      114,
      101,
      100,
      0,
      77,
      101,
      115,
      115,
      97,
      103,
      101,
      32,
      116,
      111,
      111,
      32,
      108,
      97,
      114,
      103,
      101,
      0,
      80,
      114,
      111,
      116,
      111,
      99,
      111,
      108,
      32,
      119,
      114,
      111,
      110,
      103,
      32,
      116,
      121,
      112,
      101,
      32,
      102,
      111,
      114,
      32,
      115,
      111,
      99,
      107,
      101,
      116,
      0,
      80,
      114,
      111,
      116,
      111,
      99,
      111,
      108,
      32,
      110,
      111,
      116,
      32,
      97,
      118,
      97,
      105,
      108,
      97,
      98,
      108,
      101,
      0,
      80,
      114,
      111,
      116,
      111,
      99,
      111,
      108,
      32,
      110,
      111,
      116,
      32,
      115,
      117,
      112,
      112,
      111,
      114,
      116,
      101,
      100,
      0,
      83,
      111,
      99,
      107,
      101,
      116,
      32,
      116,
      121,
      112,
      101,
      32,
      110,
      111,
      116,
      32,
      115,
      117,
      112,
      112,
      111,
      114,
      116,
      101,
      100,
      0,
      78,
      111,
      116,
      32,
      115,
      117,
      112,
      112,
      111,
      114,
      116,
      101,
      100,
      0,
      80,
      114,
      111,
      116,
      111,
      99,
      111,
      108,
      32,
      102,
      97,
      109,
      105,
      108,
      121,
      32,
      110,
      111,
      116,
      32,
      115,
      117,
      112,
      112,
      111,
      114,
      116,
      101,
      100,
      0,
      65,
      100,
      100,
      114,
      101,
      115,
      115,
      32,
      102,
      97,
      109,
      105,
      108,
      121,
      32,
      110,
      111,
      116,
      32,
      115,
      117,
      112,
      112,
      111,
      114,
      116,
      101,
      100,
      32,
      98,
      121,
      32,
      112,
      114,
      111,
      116,
      111,
      99,
      111,
      108,
      0,
      65,
      100,
      100,
      114,
      101,
      115,
      115,
      32,
      110,
      111,
      116,
      32,
      97,
      118,
      97,
      105,
      108,
      97,
      98,
      108,
      101,
      0,
      78,
      101,
      116,
      119,
      111,
      114,
      107,
      32,
      105,
      115,
      32,
      100,
      111,
      119,
      110,
      0,
      78,
      101,
      116,
      119,
      111,
      114,
      107,
      32,
      117,
      110,
      114,
      101,
      97,
      99,
      104,
      97,
      98,
      108,
      101,
      0,
      67,
      111,
      110,
      110,
      101,
      99,
      116,
      105,
      111,
      110,
      32,
      114,
      101,
      115,
      101,
      116,
      32,
      98,
      121,
      32,
      110,
      101,
      116,
      119,
      111,
      114,
      107,
      0,
      67,
      111,
      110,
      110,
      101,
      99,
      116,
      105,
      111,
      110,
      32,
      97,
      98,
      111,
      114,
      116,
      101,
      100,
      0,
      78,
      111,
      32,
      98,
      117,
      102,
      102,
      101,
      114,
      32,
      115,
      112,
      97,
      99,
      101,
      32,
      97,
      118,
      97,
      105,
      108,
      97,
      98,
      108,
      101,
      0,
      83,
      111,
      99,
      107,
      101,
      116,
      32,
      105,
      115,
      32,
      99,
      111,
      110,
      110,
      101,
      99,
      116,
      101,
      100,
      0,
      83,
      111,
      99,
      107,
      101,
      116,
      32,
      110,
      111,
      116,
      32,
      99,
      111,
      110,
      110,
      101,
      99,
      116,
      101,
      100,
      0,
      67,
      97,
      110,
      110,
      111,
      116,
      32,
      115,
      101,
      110,
      100,
      32,
      97,
      102,
      116,
      101,
      114,
      32,
      115,
      111,
      99,
      107,
      101,
      116,
      32,
      115,
      104,
      117,
      116,
      100,
      111,
      119,
      110,
      0,
      79,
      112,
      101,
      114,
      97,
      116,
      105,
      111,
      110,
      32,
      97,
      108,
      114,
      101,
      97,
      100,
      121,
      32,
      105,
      110,
      32,
      112,
      114,
      111,
      103,
      114,
      101,
      115,
      115,
      0,
      79,
      112,
      101,
      114,
      97,
      116,
      105,
      111,
      110,
      32,
      105,
      110,
      32,
      112,
      114,
      111,
      103,
      114,
      101,
      115,
      115,
      0,
      83,
      116,
      97,
      108,
      101,
      32,
      102,
      105,
      108,
      101,
      32,
      104,
      97,
      110,
      100,
      108,
      101,
      0,
      82,
      101,
      109,
      111,
      116,
      101,
      32,
      73,
      47,
      79,
      32,
      101,
      114,
      114,
      111,
      114,
      0,
      81,
      117,
      111,
      116,
      97,
      32,
      101,
      120,
      99,
      101,
      101,
      100,
      101,
      100,
      0,
      78,
      111,
      32,
      109,
      101,
      100,
      105,
      117,
      109,
      32,
      102,
      111,
      117,
      110,
      100,
      0,
      87,
      114,
      111,
      110,
      103,
      32,
      109,
      101,
      100,
      105,
      117,
      109,
      32,
      116,
      121,
      112,
      101,
      0,
      78,
      111,
      32,
      101,
      114,
      114,
      111,
      114,
      32,
      105,
      110,
      102,
      111,
      114,
      109,
      97,
      116,
      105,
      111,
      110,
      0,
      0,
      40,
      110,
      117,
      108,
      108,
      41,
      0,
      45,
      48,
      88,
      43,
      48,
      88,
      32,
      48,
      88,
      45,
      48,
      120,
      43,
      48,
      120,
      32,
      48,
      120,
      0,
      105,
      110,
      102,
      0,
      73,
      78,
      70,
      0,
      110,
      97,
      110,
      0,
      78,
      65,
      78,
      0,
      46,
      0,
      99,
      97,
      110,
      110,
      111,
      116,
      32,
      122,
      101,
      114,
      111,
      32,
      111,
      117,
      116,
      32,
      116,
      104,
      114,
      101,
      97,
      100,
      32,
      118,
      97,
      108,
      117,
      101,
      32,
      102,
      111,
      114,
      32,
      95,
      95,
      99,
      120,
      97,
      95,
      103,
      101,
      116,
      95,
      103,
      108,
      111,
      98,
      97,
      108,
      115,
      40,
      41,
      0,
      99,
      97,
      110,
      110,
      111,
      116,
      32,
      99,
      114,
      101,
      97,
      116,
      101,
      32,
      112,
      116,
      104,
      114,
      101,
      97,
      100,
      32,
      107,
      101,
      121,
      32,
      102,
      111,
      114,
      32,
      95,
      95,
      99,
      120,
      97,
      95,
      103,
      101,
      116,
      95,
      103,
      108,
      111,
      98,
      97,
      108,
      115,
      40,
      41,
      0,
      112,
      116,
      104,
      114,
      101,
      97,
      100,
      95,
      111,
      110,
      99,
      101,
      32,
      102,
      97,
      105,
      108,
      117,
      114,
      101,
      32,
      105,
      110,
      32,
      95,
      95,
      99,
      120,
      97,
      95,
      103,
      101,
      116,
      95,
      103,
      108,
      111,
      98,
      97,
      108,
      115,
      95,
      102,
      97,
      115,
      116,
      40,
      41,
      0,
      78,
      49,
      48,
      95,
      95,
      99,
      120,
      120,
      97,
      98,
      105,
      118,
      49,
      50,
      48,
      95,
      95,
      115,
      105,
      95,
      99,
      108,
      97,
      115,
      115,
      95,
      116,
      121,
      112,
      101,
      95,
      105,
      110,
      102,
      111,
      69,
      0,
      78,
      49,
      48,
      95,
      95,
      99,
      120,
      120,
      97,
      98,
      105,
      118,
      49,
      49,
      54,
      95,
      95,
      115,
      104,
      105,
      109,
      95,
      116,
      121,
      112,
      101,
      95,
      105,
      110,
      102,
      111,
      69,
      0,
      83,
      116,
      57,
      116,
      121,
      112,
      101,
      95,
      105,
      110,
      102,
      111,
      0,
      78,
      49,
      48,
      95,
      95,
      99,
      120,
      120,
      97,
      98,
      105,
      118,
      49,
      49,
      55,
      95,
      95,
      99,
      108,
      97,
      115,
      115,
      95,
      116,
      121,
      112,
      101,
      95,
      105,
      110,
      102,
      111,
      69,
      0,
      83,
      116,
      57,
      101,
      120,
      99,
      101,
      112,
      116,
      105,
      111,
      110,
      0,
      117,
      110,
      99,
      97,
      117,
      103,
      104,
      116,
      0,
      116,
      101,
      114,
      109,
      105,
      110,
      97,
      116,
      105,
      110,
      103,
      32,
      119,
      105,
      116,
      104,
      32,
      37,
      115,
      32,
      101,
      120,
      99,
      101,
      112,
      116,
      105,
      111,
      110,
      32,
      111,
      102,
      32,
      116,
      121,
      112,
      101,
      32,
      37,
      115,
      58,
      32,
      37,
      115,
      0,
      116,
      101,
      114,
      109,
      105,
      110,
      97,
      116,
      105,
      110,
      103,
      32,
      119,
      105,
      116,
      104,
      32,
      37,
      115,
      32,
      101,
      120,
      99,
      101,
      112,
      116,
      105,
      111,
      110,
      32,
      111,
      102,
      32,
      116,
      121,
      112,
      101,
      32,
      37,
      115,
      0,
      116,
      101,
      114,
      109,
      105,
      110,
      97,
      116,
      105,
      110,
      103,
      32,
      119,
      105,
      116,
      104,
      32,
      37,
      115,
      32,
      102,
      111,
      114,
      101,
      105,
      103,
      110,
      32,
      101,
      120,
      99,
      101,
      112,
      116,
      105,
      111,
      110,
      0,
      116,
      101,
      114,
      109,
      105,
      110,
      97,
      116,
      105,
      110,
      103,
      0,
      116,
      101,
      114,
      109,
      105,
      110,
      97,
      116,
      101,
      95,
      104,
      97,
      110,
      100,
      108,
      101,
      114,
      32,
      117,
      110,
      101,
      120,
      112,
      101,
      99,
      116,
      101,
      100,
      108,
      121,
      32,
      114,
      101,
      116,
      117,
      114,
      110,
      101,
      100,
      0,
      83,
      116,
      57,
      98,
      97,
      100,
      95,
      97,
      108,
      108,
      111,
      99,
      0,
      115,
      116,
      100,
      58,
      58,
      98,
      97,
      100,
      95,
      97,
      108,
      108,
      111,
      99,
      0,
      78,
      49,
      48,
      95,
      95,
      99,
      120,
      120,
      97,
      98,
      105,
      118,
      49,
      49,
      57,
      95,
      95,
      112,
      111,
      105,
      110,
      116,
      101,
      114,
      95,
      116,
      121,
      112,
      101,
      95,
      105,
      110,
      102,
      111,
      69,
      0,
      78,
      49,
      48,
      95,
      95,
      99,
      120,
      120,
      97,
      98,
      105,
      118,
      49,
      49,
      55,
      95,
      95,
      112,
      98,
      97,
      115,
      101,
      95,
      116,
      121,
      112,
      101,
      95,
      105,
      110,
      102,
      111,
      69,
      0,
      78,
      49,
      48,
      95,
      95,
      99,
      120,
      120,
      97,
      98,
      105,
      118,
      49,
      50,
      49,
      95,
      95,
      118,
      109,
      105,
      95,
      99,
      108,
      97,
      115,
      115,
      95,
      116,
      121,
      112,
      101,
      95,
      105,
      110,
      102,
      111,
      69,
      0,
    ],
    'i8',
    ALLOC_NONE,
    Runtime.GLOBAL_BASE + 20480
  );
  var tempDoublePtr = STATICTOP;
  STATICTOP += 16;
  Module['_i64Subtract'] = _i64Subtract;
  function ___setErrNo(value) {
    if (Module['___errno_location'])
      HEAP32[Module['___errno_location']() >> 2] = value;
    return value;
  }
  var ERRNO_CODES = {
    EPERM: 1,
    ENOENT: 2,
    ESRCH: 3,
    EINTR: 4,
    EIO: 5,
    ENXIO: 6,
    E2BIG: 7,
    ENOEXEC: 8,
    EBADF: 9,
    ECHILD: 10,
    EAGAIN: 11,
    EWOULDBLOCK: 11,
    ENOMEM: 12,
    EACCES: 13,
    EFAULT: 14,
    ENOTBLK: 15,
    EBUSY: 16,
    EEXIST: 17,
    EXDEV: 18,
    ENODEV: 19,
    ENOTDIR: 20,
    EISDIR: 21,
    EINVAL: 22,
    ENFILE: 23,
    EMFILE: 24,
    ENOTTY: 25,
    ETXTBSY: 26,
    EFBIG: 27,
    ENOSPC: 28,
    ESPIPE: 29,
    EROFS: 30,
    EMLINK: 31,
    EPIPE: 32,
    EDOM: 33,
    ERANGE: 34,
    ENOMSG: 42,
    EIDRM: 43,
    ECHRNG: 44,
    EL2NSYNC: 45,
    EL3HLT: 46,
    EL3RST: 47,
    ELNRNG: 48,
    EUNATCH: 49,
    ENOCSI: 50,
    EL2HLT: 51,
    EDEADLK: 35,
    ENOLCK: 37,
    EBADE: 52,
    EBADR: 53,
    EXFULL: 54,
    ENOANO: 55,
    EBADRQC: 56,
    EBADSLT: 57,
    EDEADLOCK: 35,
    EBFONT: 59,
    ENOSTR: 60,
    ENODATA: 61,
    ETIME: 62,
    ENOSR: 63,
    ENONET: 64,
    ENOPKG: 65,
    EREMOTE: 66,
    ENOLINK: 67,
    EADV: 68,
    ESRMNT: 69,
    ECOMM: 70,
    EPROTO: 71,
    EMULTIHOP: 72,
    EDOTDOT: 73,
    EBADMSG: 74,
    ENOTUNIQ: 76,
    EBADFD: 77,
    EREMCHG: 78,
    ELIBACC: 79,
    ELIBBAD: 80,
    ELIBSCN: 81,
    ELIBMAX: 82,
    ELIBEXEC: 83,
    ENOSYS: 38,
    ENOTEMPTY: 39,
    ENAMETOOLONG: 36,
    ELOOP: 40,
    EOPNOTSUPP: 95,
    EPFNOSUPPORT: 96,
    ECONNRESET: 104,
    ENOBUFS: 105,
    EAFNOSUPPORT: 97,
    EPROTOTYPE: 91,
    ENOTSOCK: 88,
    ENOPROTOOPT: 92,
    ESHUTDOWN: 108,
    ECONNREFUSED: 111,
    EADDRINUSE: 98,
    ECONNABORTED: 103,
    ENETUNREACH: 101,
    ENETDOWN: 100,
    ETIMEDOUT: 110,
    EHOSTDOWN: 112,
    EHOSTUNREACH: 113,
    EINPROGRESS: 115,
    EALREADY: 114,
    EDESTADDRREQ: 89,
    EMSGSIZE: 90,
    EPROTONOSUPPORT: 93,
    ESOCKTNOSUPPORT: 94,
    EADDRNOTAVAIL: 99,
    ENETRESET: 102,
    EISCONN: 106,
    ENOTCONN: 107,
    ETOOMANYREFS: 109,
    EUSERS: 87,
    EDQUOT: 122,
    ESTALE: 116,
    ENOTSUP: 95,
    ENOMEDIUM: 123,
    EILSEQ: 84,
    EOVERFLOW: 75,
    ECANCELED: 125,
    ENOTRECOVERABLE: 131,
    EOWNERDEAD: 130,
    ESTRPIPE: 86,
  };
  function _sysconf(name) {
    switch (name) {
      case 30:
        return PAGE_SIZE;
      case 85:
        return totalMemory / PAGE_SIZE;
      case 132:
      case 133:
      case 12:
      case 137:
      case 138:
      case 15:
      case 235:
      case 16:
      case 17:
      case 18:
      case 19:
      case 20:
      case 149:
      case 13:
      case 10:
      case 236:
      case 153:
      case 9:
      case 21:
      case 22:
      case 159:
      case 154:
      case 14:
      case 77:
      case 78:
      case 139:
      case 80:
      case 81:
      case 82:
      case 68:
      case 67:
      case 164:
      case 11:
      case 29:
      case 47:
      case 48:
      case 95:
      case 52:
      case 51:
      case 46:
        return 200809;
      case 79:
        return 0;
      case 27:
      case 246:
      case 127:
      case 128:
      case 23:
      case 24:
      case 160:
      case 161:
      case 181:
      case 182:
      case 242:
      case 183:
      case 184:
      case 243:
      case 244:
      case 245:
      case 165:
      case 178:
      case 179:
      case 49:
      case 50:
      case 168:
      case 169:
      case 175:
      case 170:
      case 171:
      case 172:
      case 97:
      case 76:
      case 32:
      case 173:
      case 35:
        return -1;
      case 176:
      case 177:
      case 7:
      case 155:
      case 8:
      case 157:
      case 125:
      case 126:
      case 92:
      case 93:
      case 129:
      case 130:
      case 131:
      case 94:
      case 91:
        return 1;
      case 74:
      case 60:
      case 69:
      case 70:
      case 4:
        return 1024;
      case 31:
      case 42:
      case 72:
        return 32;
      case 87:
      case 26:
      case 33:
        return 2147483647;
      case 34:
      case 1:
        return 47839;
      case 38:
      case 36:
        return 99;
      case 43:
      case 37:
        return 2048;
      case 0:
        return 2097152;
      case 3:
        return 65536;
      case 28:
        return 32768;
      case 44:
        return 32767;
      case 75:
        return 16384;
      case 39:
        return 1e3;
      case 89:
        return 700;
      case 71:
        return 256;
      case 40:
        return 255;
      case 2:
        return 100;
      case 180:
        return 64;
      case 25:
        return 20;
      case 5:
        return 16;
      case 6:
        return 6;
      case 73:
        return 4;
      case 84: {
        if (typeof navigator === 'object')
          return navigator['hardwareConcurrency'] || 1;
        return 1;
      }
    }
    ___setErrNo(ERRNO_CODES.EINVAL);
    return -1;
  }
  function __ZSt18uncaught_exceptionv() {
    return !!__ZSt18uncaught_exceptionv.uncaught_exception;
  }
  var EXCEPTIONS = {
    last: 0,
    caught: [],
    infos: {},
    deAdjust: function(adjusted) {
      if (!adjusted || EXCEPTIONS.infos[adjusted]) return adjusted;
      for (var ptr in EXCEPTIONS.infos) {
        var info = EXCEPTIONS.infos[ptr];
        if (info.adjusted === adjusted) {
          return ptr;
        }
      }
      return adjusted;
    },
    addRef: function(ptr) {
      if (!ptr) return;
      var info = EXCEPTIONS.infos[ptr];
      info.refcount++;
    },
    decRef: function(ptr) {
      if (!ptr) return;
      var info = EXCEPTIONS.infos[ptr];
      assert(info.refcount > 0);
      info.refcount--;
      if (info.refcount === 0) {
        if (info.destructor) {
          Runtime.dynCall('vi', info.destructor, [ptr]);
        }
        delete EXCEPTIONS.infos[ptr];
        ___cxa_free_exception(ptr);
      }
    },
    clearRef: function(ptr) {
      if (!ptr) return;
      var info = EXCEPTIONS.infos[ptr];
      info.refcount = 0;
    },
  };
  function ___resumeException(ptr) {
    if (!EXCEPTIONS.last) {
      EXCEPTIONS.last = ptr;
    }
    EXCEPTIONS.clearRef(EXCEPTIONS.deAdjust(ptr));
    throw ptr +
      ' - Exception catching is disabled, this exception cannot be caught. Compile with -s DISABLE_EXCEPTION_CATCHING=0 or DISABLE_EXCEPTION_CATCHING=2 to catch.';
  }
  function ___cxa_find_matching_catch() {
    var thrown = EXCEPTIONS.last;
    if (!thrown) {
      return (asm['setTempRet0'](0), 0) | 0;
    }
    var info = EXCEPTIONS.infos[thrown];
    var throwntype = info.type;
    if (!throwntype) {
      return (asm['setTempRet0'](0), thrown) | 0;
    }
    var typeArray = Array.prototype.slice.call(arguments);
    var pointer = Module['___cxa_is_pointer_type'](throwntype);
    if (!___cxa_find_matching_catch.buffer)
      ___cxa_find_matching_catch.buffer = _malloc(4);
    HEAP32[___cxa_find_matching_catch.buffer >> 2] = thrown;
    thrown = ___cxa_find_matching_catch.buffer;
    for (var i = 0; i < typeArray.length; i++) {
      if (
        typeArray[i] &&
        Module['___cxa_can_catch'](typeArray[i], throwntype, thrown)
      ) {
        thrown = HEAP32[thrown >> 2];
        info.adjusted = thrown;
        return (asm['setTempRet0'](typeArray[i]), thrown) | 0;
      }
    }
    thrown = HEAP32[thrown >> 2];
    return (asm['setTempRet0'](throwntype), thrown) | 0;
  }
  function ___cxa_throw(ptr, type, destructor) {
    EXCEPTIONS.infos[ptr] = {
      ptr: ptr,
      adjusted: ptr,
      type: type,
      destructor: destructor,
      refcount: 0,
    };
    EXCEPTIONS.last = ptr;
    if (!('uncaught_exception' in __ZSt18uncaught_exceptionv)) {
      __ZSt18uncaught_exceptionv.uncaught_exception = 1;
    } else {
      __ZSt18uncaught_exceptionv.uncaught_exception++;
    }
    throw ptr +
      ' - Exception catching is disabled, this exception cannot be caught. Compile with -s DISABLE_EXCEPTION_CATCHING=0 or DISABLE_EXCEPTION_CATCHING=2 to catch.';
  }
  Module['_memset'] = _memset;
  function ___gxx_personality_v0() {}
  Module['_bitshift64Shl'] = _bitshift64Shl;
  function _abort() {
    Module['abort']();
  }
  function _pthread_once(ptr, func) {
    if (!_pthread_once.seen) _pthread_once.seen = {};
    if (ptr in _pthread_once.seen) return;
    Runtime.dynCall('v', func);
    _pthread_once.seen[ptr] = 1;
  }
  var PTHREAD_SPECIFIC = {};
  function _pthread_getspecific(key) {
    return PTHREAD_SPECIFIC[key] || 0;
  }
  Module['_i64Add'] = _i64Add;
  var PTHREAD_SPECIFIC_NEXT_KEY = 1;
  function _pthread_key_create(key, destructor) {
    if (key == 0) {
      return ERRNO_CODES.EINVAL;
    }
    HEAP32[key >> 2] = PTHREAD_SPECIFIC_NEXT_KEY;
    PTHREAD_SPECIFIC[PTHREAD_SPECIFIC_NEXT_KEY] = 0;
    PTHREAD_SPECIFIC_NEXT_KEY++;
    return 0;
  }
  var _llvm_pow_f32 = Math_pow;
  function _pthread_setspecific(key, value) {
    if (!(key in PTHREAD_SPECIFIC)) {
      return ERRNO_CODES.EINVAL;
    }
    PTHREAD_SPECIFIC[key] = value;
    return 0;
  }
  function _malloc(bytes) {
    var ptr = Runtime.dynamicAlloc(bytes + 8);
    return (ptr + 8) & 4294967288;
  }
  Module['_malloc'] = _malloc;
  function ___cxa_allocate_exception(size) {
    return _malloc(size);
  }
  Module['_bitshift64Ashr'] = _bitshift64Ashr;
  Module['_bitshift64Lshr'] = _bitshift64Lshr;
  function ___cxa_pure_virtual() {
    ABORT = true;
    throw 'Pure virtual function called!';
  }
  function _time(ptr) {
    var ret = (Date.now() / 1e3) | 0;
    if (ptr) {
      HEAP32[ptr >> 2] = ret;
    }
    return ret;
  }
  function _pthread_cleanup_push(routine, arg) {
    __ATEXIT__.push(function() {
      Runtime.dynCall('vi', routine, [arg]);
    });
    _pthread_cleanup_push.level = __ATEXIT__.length;
  }
  function ___cxa_guard_acquire(variable) {
    if (!HEAP8[variable >> 0]) {
      HEAP8[variable >> 0] = 1;
      return 1;
    }
    return 0;
  }
  function _pthread_cleanup_pop() {
    assert(
      _pthread_cleanup_push.level == __ATEXIT__.length,
      'cannot pop if something else added meanwhile!'
    );
    __ATEXIT__.pop();
    _pthread_cleanup_push.level = __ATEXIT__.length;
  }
  function ___cxa_begin_catch(ptr) {
    __ZSt18uncaught_exceptionv.uncaught_exception--;
    EXCEPTIONS.caught.push(ptr);
    EXCEPTIONS.addRef(EXCEPTIONS.deAdjust(ptr));
    return ptr;
  }
  function _emscripten_memcpy_big(dest, src, num) {
    HEAPU8.set(HEAPU8.subarray(src, src + num), dest);
    return dest;
  }
  Module['_memcpy'] = _memcpy;
  var SYSCALLS = {
    varargs: 0,
    get: function(varargs) {
      SYSCALLS.varargs += 4;
      var ret = HEAP32[(SYSCALLS.varargs - 4) >> 2];
      return ret;
    },
    getStr: function() {
      var ret = Pointer_stringify(SYSCALLS.get());
      return ret;
    },
    get64: function() {
      var low = SYSCALLS.get(),
        high = SYSCALLS.get();
      if (low >= 0) assert(high === 0);
      else assert(high === -1);
      return low;
    },
    getZero: function() {
      assert(SYSCALLS.get() === 0);
    },
  };
  function ___syscall6(which, varargs) {
    SYSCALLS.varargs = varargs;
    try {
      var stream = SYSCALLS.getStreamFromFD();
      FS.close(stream);
      return 0;
    } catch (e) {
      if (typeof FS === 'undefined' || !(e instanceof FS.ErrnoError)) abort(e);
      return -e.errno;
    }
  }
  function _sbrk(bytes) {
    var self = _sbrk;
    if (!self.called) {
      DYNAMICTOP = alignMemoryPage(DYNAMICTOP);
      self.called = true;
      assert(Runtime.dynamicAlloc);
      self.alloc = Runtime.dynamicAlloc;
      Runtime.dynamicAlloc = function() {
        abort('cannot dynamically allocate, sbrk now has control');
      };
    }
    var ret = DYNAMICTOP;
    if (bytes != 0) {
      var success = self.alloc(bytes);
      if (!success) return -1 >>> 0;
    }
    return ret;
  }
  Module['_memmove'] = _memmove;
  function _gettimeofday(ptr) {
    var now = Date.now();
    HEAP32[ptr >> 2] = (now / 1e3) | 0;
    HEAP32[(ptr + 4) >> 2] = ((now % 1e3) * 1e3) | 0;
    return 0;
  }
  var _llvm_fabs_f32 = Math_abs;
  Module['_llvm_bswap_i32'] = _llvm_bswap_i32;
  function _llvm_trap() {
    abort('trap!');
  }
  function ___cxa_guard_release() {}
  function _pthread_self() {
    return 0;
  }
  function ___syscall140(which, varargs) {
    SYSCALLS.varargs = varargs;
    try {
      var stream = SYSCALLS.getStreamFromFD(),
        offset_high = SYSCALLS.get(),
        offset_low = SYSCALLS.get(),
        result = SYSCALLS.get(),
        whence = SYSCALLS.get();
      var offset = offset_low;
      assert(offset_high === 0);
      FS.llseek(stream, offset, whence);
      HEAP32[result >> 2] = stream.position;
      if (stream.getdents && offset === 0 && whence === 0)
        stream.getdents = null;
      return 0;
    } catch (e) {
      if (typeof FS === 'undefined' || !(e instanceof FS.ErrnoError)) abort(e);
      return -e.errno;
    }
  }
  function ___syscall146(which, varargs) {
    SYSCALLS.varargs = varargs;
    try {
      var stream = SYSCALLS.get(),
        iov = SYSCALLS.get(),
        iovcnt = SYSCALLS.get();
      var ret = 0;
      if (!___syscall146.buffer) {
        ___syscall146.buffers = [null, [], []];
        ___syscall146.printChar = function(stream, curr) {
          var buffer = ___syscall146.buffers[stream];
          assert(buffer);
          if (curr === 0 || curr === 10) {
            (stream === 1 ? Module['print'] : Module['printErr'])(
              UTF8ArrayToString(buffer, 0)
            );
            buffer.length = 0;
          } else {
            buffer.push(curr);
          }
        };
      }
      for (var i = 0; i < iovcnt; i++) {
        var ptr = HEAP32[(iov + i * 8) >> 2];
        var len = HEAP32[(iov + (i * 8 + 4)) >> 2];
        for (var j = 0; j < len; j++) {
          ___syscall146.printChar(stream, HEAPU8[ptr + j]);
        }
        ret += len;
      }
      return ret;
    } catch (e) {
      if (typeof FS === 'undefined' || !(e instanceof FS.ErrnoError)) abort(e);
      return -e.errno;
    }
  }
  __ATEXIT__.push(function() {
    var fflush = Module['_fflush'];
    if (fflush) fflush(0);
    var printChar = ___syscall146.printChar;
    if (!printChar) return;
    var buffers = ___syscall146.buffers;
    if (buffers[1].length) printChar(1, 10);
    if (buffers[2].length) printChar(2, 10);
  });
  STACK_BASE = STACKTOP = Runtime.alignMemory(STATICTOP);
  staticSealed = true;
  STACK_MAX = STACK_BASE + TOTAL_STACK;
  DYNAMIC_BASE = DYNAMICTOP = Runtime.alignMemory(STACK_MAX);
  var cttz_i8 = allocate(
    [
      8,
      0,
      1,
      0,
      2,
      0,
      1,
      0,
      3,
      0,
      1,
      0,
      2,
      0,
      1,
      0,
      4,
      0,
      1,
      0,
      2,
      0,
      1,
      0,
      3,
      0,
      1,
      0,
      2,
      0,
      1,
      0,
      5,
      0,
      1,
      0,
      2,
      0,
      1,
      0,
      3,
      0,
      1,
      0,
      2,
      0,
      1,
      0,
      4,
      0,
      1,
      0,
      2,
      0,
      1,
      0,
      3,
      0,
      1,
      0,
      2,
      0,
      1,
      0,
      6,
      0,
      1,
      0,
      2,
      0,
      1,
      0,
      3,
      0,
      1,
      0,
      2,
      0,
      1,
      0,
      4,
      0,
      1,
      0,
      2,
      0,
      1,
      0,
      3,
      0,
      1,
      0,
      2,
      0,
      1,
      0,
      5,
      0,
      1,
      0,
      2,
      0,
      1,
      0,
      3,
      0,
      1,
      0,
      2,
      0,
      1,
      0,
      4,
      0,
      1,
      0,
      2,
      0,
      1,
      0,
      3,
      0,
      1,
      0,
      2,
      0,
      1,
      0,
      7,
      0,
      1,
      0,
      2,
      0,
      1,
      0,
      3,
      0,
      1,
      0,
      2,
      0,
      1,
      0,
      4,
      0,
      1,
      0,
      2,
      0,
      1,
      0,
      3,
      0,
      1,
      0,
      2,
      0,
      1,
      0,
      5,
      0,
      1,
      0,
      2,
      0,
      1,
      0,
      3,
      0,
      1,
      0,
      2,
      0,
      1,
      0,
      4,
      0,
      1,
      0,
      2,
      0,
      1,
      0,
      3,
      0,
      1,
      0,
      2,
      0,
      1,
      0,
      6,
      0,
      1,
      0,
      2,
      0,
      1,
      0,
      3,
      0,
      1,
      0,
      2,
      0,
      1,
      0,
      4,
      0,
      1,
      0,
      2,
      0,
      1,
      0,
      3,
      0,
      1,
      0,
      2,
      0,
      1,
      0,
      5,
      0,
      1,
      0,
      2,
      0,
      1,
      0,
      3,
      0,
      1,
      0,
      2,
      0,
      1,
      0,
      4,
      0,
      1,
      0,
      2,
      0,
      1,
      0,
      3,
      0,
      1,
      0,
      2,
      0,
      1,
      0,
    ],
    'i8',
    ALLOC_DYNAMIC
  );
  function invoke_viiiii(index, a1, a2, a3, a4, a5) {
    try {
      Module['dynCall_viiiii'](index, a1, a2, a3, a4, a5);
    } catch (e) {
      if (typeof e !== 'number' && e !== 'longjmp') throw e;
      asm['setThrew'](1, 0);
    }
  }
  function invoke_vid(index, a1, a2) {
    try {
      Module['dynCall_vid'](index, a1, a2);
    } catch (e) {
      if (typeof e !== 'number' && e !== 'longjmp') throw e;
      asm['setThrew'](1, 0);
    }
  }
  function invoke_vi(index, a1) {
    try {
      Module['dynCall_vi'](index, a1);
    } catch (e) {
      if (typeof e !== 'number' && e !== 'longjmp') throw e;
      asm['setThrew'](1, 0);
    }
  }
  function invoke_viiidii(index, a1, a2, a3, a4, a5, a6) {
    try {
      Module['dynCall_viiidii'](index, a1, a2, a3, a4, a5, a6);
    } catch (e) {
      if (typeof e !== 'number' && e !== 'longjmp') throw e;
      asm['setThrew'](1, 0);
    }
  }
  function invoke_vii(index, a1, a2) {
    try {
      Module['dynCall_vii'](index, a1, a2);
    } catch (e) {
      if (typeof e !== 'number' && e !== 'longjmp') throw e;
      asm['setThrew'](1, 0);
    }
  }
  function invoke_iiiiiiiiiii(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10) {
    try {
      return Module['dynCall_iiiiiiiiiii'](
        index,
        a1,
        a2,
        a3,
        a4,
        a5,
        a6,
        a7,
        a8,
        a9,
        a10
      );
    } catch (e) {
      if (typeof e !== 'number' && e !== 'longjmp') throw e;
      asm['setThrew'](1, 0);
    }
  }
  function invoke_ii(index, a1) {
    try {
      return Module['dynCall_ii'](index, a1);
    } catch (e) {
      if (typeof e !== 'number' && e !== 'longjmp') throw e;
      asm['setThrew'](1, 0);
    }
  }
  function invoke_viidi(index, a1, a2, a3, a4) {
    try {
      Module['dynCall_viidi'](index, a1, a2, a3, a4);
    } catch (e) {
      if (typeof e !== 'number' && e !== 'longjmp') throw e;
      asm['setThrew'](1, 0);
    }
  }
  function invoke_viddiii(index, a1, a2, a3, a4, a5, a6) {
    try {
      Module['dynCall_viddiii'](index, a1, a2, a3, a4, a5, a6);
    } catch (e) {
      if (typeof e !== 'number' && e !== 'longjmp') throw e;
      asm['setThrew'](1, 0);
    }
  }
  function invoke_vidii(index, a1, a2, a3, a4) {
    try {
      Module['dynCall_vidii'](index, a1, a2, a3, a4);
    } catch (e) {
      if (typeof e !== 'number' && e !== 'longjmp') throw e;
      asm['setThrew'](1, 0);
    }
  }
  function invoke_iiiii(index, a1, a2, a3, a4) {
    try {
      return Module['dynCall_iiiii'](index, a1, a2, a3, a4);
    } catch (e) {
      if (typeof e !== 'number' && e !== 'longjmp') throw e;
      asm['setThrew'](1, 0);
    }
  }
  function invoke_vidi(index, a1, a2, a3) {
    try {
      Module['dynCall_vidi'](index, a1, a2, a3);
    } catch (e) {
      if (typeof e !== 'number' && e !== 'longjmp') throw e;
      asm['setThrew'](1, 0);
    }
  }
  function invoke_diiiiiiii(index, a1, a2, a3, a4, a5, a6, a7, a8) {
    try {
      return Module['dynCall_diiiiiiii'](index, a1, a2, a3, a4, a5, a6, a7, a8);
    } catch (e) {
      if (typeof e !== 'number' && e !== 'longjmp') throw e;
      asm['setThrew'](1, 0);
    }
  }
  function invoke_viiiiddddiid(
    index,
    a1,
    a2,
    a3,
    a4,
    a5,
    a6,
    a7,
    a8,
    a9,
    a10,
    a11
  ) {
    try {
      Module['dynCall_viiiiddddiid'](
        index,
        a1,
        a2,
        a3,
        a4,
        a5,
        a6,
        a7,
        a8,
        a9,
        a10,
        a11
      );
    } catch (e) {
      if (typeof e !== 'number' && e !== 'longjmp') throw e;
      asm['setThrew'](1, 0);
    }
  }
  function invoke_diiiii(index, a1, a2, a3, a4, a5) {
    try {
      return Module['dynCall_diiiii'](index, a1, a2, a3, a4, a5);
    } catch (e) {
      if (typeof e !== 'number' && e !== 'longjmp') throw e;
      asm['setThrew'](1, 0);
    }
  }
  function invoke_vidd(index, a1, a2, a3) {
    try {
      Module['dynCall_vidd'](index, a1, a2, a3);
    } catch (e) {
      if (typeof e !== 'number' && e !== 'longjmp') throw e;
      asm['setThrew'](1, 0);
    }
  }
  function invoke_iiii(index, a1, a2, a3) {
    try {
      return Module['dynCall_iiii'](index, a1, a2, a3);
    } catch (e) {
      if (typeof e !== 'number' && e !== 'longjmp') throw e;
      asm['setThrew'](1, 0);
    }
  }
  function invoke_viiiiid(index, a1, a2, a3, a4, a5, a6) {
    try {
      Module['dynCall_viiiiid'](index, a1, a2, a3, a4, a5, a6);
    } catch (e) {
      if (typeof e !== 'number' && e !== 'longjmp') throw e;
      asm['setThrew'](1, 0);
    }
  }
  function invoke_viiiiii(index, a1, a2, a3, a4, a5, a6) {
    try {
      Module['dynCall_viiiiii'](index, a1, a2, a3, a4, a5, a6);
    } catch (e) {
      if (typeof e !== 'number' && e !== 'longjmp') throw e;
      asm['setThrew'](1, 0);
    }
  }
  function invoke_iiid(index, a1, a2, a3) {
    try {
      return Module['dynCall_iiid'](index, a1, a2, a3);
    } catch (e) {
      if (typeof e !== 'number' && e !== 'longjmp') throw e;
      asm['setThrew'](1, 0);
    }
  }
  function invoke_di(index, a1) {
    try {
      return Module['dynCall_di'](index, a1);
    } catch (e) {
      if (typeof e !== 'number' && e !== 'longjmp') throw e;
      asm['setThrew'](1, 0);
    }
  }
  function invoke_iiiiiii(index, a1, a2, a3, a4, a5, a6) {
    try {
      return Module['dynCall_iiiiiii'](index, a1, a2, a3, a4, a5, a6);
    } catch (e) {
      if (typeof e !== 'number' && e !== 'longjmp') throw e;
      asm['setThrew'](1, 0);
    }
  }
  function invoke_diiidii(index, a1, a2, a3, a4, a5, a6) {
    try {
      return Module['dynCall_diiidii'](index, a1, a2, a3, a4, a5, a6);
    } catch (e) {
      if (typeof e !== 'number' && e !== 'longjmp') throw e;
      asm['setThrew'](1, 0);
    }
  }
  function invoke_viidii(index, a1, a2, a3, a4, a5) {
    try {
      Module['dynCall_viidii'](index, a1, a2, a3, a4, a5);
    } catch (e) {
      if (typeof e !== 'number' && e !== 'longjmp') throw e;
      asm['setThrew'](1, 0);
    }
  }
  function invoke_viiiiiii(index, a1, a2, a3, a4, a5, a6, a7) {
    try {
      Module['dynCall_viiiiiii'](index, a1, a2, a3, a4, a5, a6, a7);
    } catch (e) {
      if (typeof e !== 'number' && e !== 'longjmp') throw e;
      asm['setThrew'](1, 0);
    }
  }
  function invoke_viiiiiiiii(index, a1, a2, a3, a4, a5, a6, a7, a8, a9) {
    try {
      Module['dynCall_viiiiiiiii'](index, a1, a2, a3, a4, a5, a6, a7, a8, a9);
    } catch (e) {
      if (typeof e !== 'number' && e !== 'longjmp') throw e;
      asm['setThrew'](1, 0);
    }
  }
  function invoke_viiiiiiiiii(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10) {
    try {
      Module['dynCall_viiiiiiiiii'](
        index,
        a1,
        a2,
        a3,
        a4,
        a5,
        a6,
        a7,
        a8,
        a9,
        a10
      );
    } catch (e) {
      if (typeof e !== 'number' && e !== 'longjmp') throw e;
      asm['setThrew'](1, 0);
    }
  }
  function invoke_iii(index, a1, a2) {
    try {
      return Module['dynCall_iii'](index, a1, a2);
    } catch (e) {
      if (typeof e !== 'number' && e !== 'longjmp') throw e;
      asm['setThrew'](1, 0);
    }
  }
  function invoke_diii(index, a1, a2, a3) {
    try {
      return Module['dynCall_diii'](index, a1, a2, a3);
    } catch (e) {
      if (typeof e !== 'number' && e !== 'longjmp') throw e;
      asm['setThrew'](1, 0);
    }
  }
  function invoke_diiiiiiiiii(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10) {
    try {
      return Module['dynCall_diiiiiiiiii'](
        index,
        a1,
        a2,
        a3,
        a4,
        a5,
        a6,
        a7,
        a8,
        a9,
        a10
      );
    } catch (e) {
      if (typeof e !== 'number' && e !== 'longjmp') throw e;
      asm['setThrew'](1, 0);
    }
  }
  function invoke_viiiid(index, a1, a2, a3, a4, a5) {
    try {
      Module['dynCall_viiiid'](index, a1, a2, a3, a4, a5);
    } catch (e) {
      if (typeof e !== 'number' && e !== 'longjmp') throw e;
      asm['setThrew'](1, 0);
    }
  }
  function invoke_diiiiiiiii(index, a1, a2, a3, a4, a5, a6, a7, a8, a9) {
    try {
      return Module['dynCall_diiiiiiiii'](
        index,
        a1,
        a2,
        a3,
        a4,
        a5,
        a6,
        a7,
        a8,
        a9
      );
    } catch (e) {
      if (typeof e !== 'number' && e !== 'longjmp') throw e;
      asm['setThrew'](1, 0);
    }
  }
  function invoke_did(index, a1, a2) {
    try {
      return Module['dynCall_did'](index, a1, a2);
    } catch (e) {
      if (typeof e !== 'number' && e !== 'longjmp') throw e;
      asm['setThrew'](1, 0);
    }
  }
  function invoke_viiiidddddidi(
    index,
    a1,
    a2,
    a3,
    a4,
    a5,
    a6,
    a7,
    a8,
    a9,
    a10,
    a11,
    a12
  ) {
    try {
      Module['dynCall_viiiidddddidi'](
        index,
        a1,
        a2,
        a3,
        a4,
        a5,
        a6,
        a7,
        a8,
        a9,
        a10,
        a11,
        a12
      );
    } catch (e) {
      if (typeof e !== 'number' && e !== 'longjmp') throw e;
      asm['setThrew'](1, 0);
    }
  }
  function invoke_diidii(index, a1, a2, a3, a4, a5) {
    try {
      return Module['dynCall_diidii'](index, a1, a2, a3, a4, a5);
    } catch (e) {
      if (typeof e !== 'number' && e !== 'longjmp') throw e;
      asm['setThrew'](1, 0);
    }
  }
  function invoke_diiii(index, a1, a2, a3, a4) {
    try {
      return Module['dynCall_diiii'](index, a1, a2, a3, a4);
    } catch (e) {
      if (typeof e !== 'number' && e !== 'longjmp') throw e;
      asm['setThrew'](1, 0);
    }
  }
  function invoke_iiiiiiiiii(index, a1, a2, a3, a4, a5, a6, a7, a8, a9) {
    try {
      return Module['dynCall_iiiiiiiiii'](
        index,
        a1,
        a2,
        a3,
        a4,
        a5,
        a6,
        a7,
        a8,
        a9
      );
    } catch (e) {
      if (typeof e !== 'number' && e !== 'longjmp') throw e;
      asm['setThrew'](1, 0);
    }
  }
  function invoke_viiid(index, a1, a2, a3, a4) {
    try {
      Module['dynCall_viiid'](index, a1, a2, a3, a4);
    } catch (e) {
      if (typeof e !== 'number' && e !== 'longjmp') throw e;
      asm['setThrew'](1, 0);
    }
  }
  function invoke_viii(index, a1, a2, a3) {
    try {
      Module['dynCall_viii'](index, a1, a2, a3);
    } catch (e) {
      if (typeof e !== 'number' && e !== 'longjmp') throw e;
      asm['setThrew'](1, 0);
    }
  }
  function invoke_v(index) {
    try {
      Module['dynCall_v'](index);
    } catch (e) {
      if (typeof e !== 'number' && e !== 'longjmp') throw e;
      asm['setThrew'](1, 0);
    }
  }
  function invoke_viid(index, a1, a2, a3) {
    try {
      Module['dynCall_viid'](index, a1, a2, a3);
    } catch (e) {
      if (typeof e !== 'number' && e !== 'longjmp') throw e;
      asm['setThrew'](1, 0);
    }
  }
  function invoke_iidid(index, a1, a2, a3, a4) {
    try {
      return Module['dynCall_iidid'](index, a1, a2, a3, a4);
    } catch (e) {
      if (typeof e !== 'number' && e !== 'longjmp') throw e;
      asm['setThrew'](1, 0);
    }
  }
  function invoke_viiii(index, a1, a2, a3, a4) {
    try {
      Module['dynCall_viiii'](index, a1, a2, a3, a4);
    } catch (e) {
      if (typeof e !== 'number' && e !== 'longjmp') throw e;
      asm['setThrew'](1, 0);
    }
  }
  Module.asmGlobalArg = {
    Math: Math,
    Int8Array: Int8Array,
    Int16Array: Int16Array,
    Int32Array: Int32Array,
    Uint8Array: Uint8Array,
    Uint16Array: Uint16Array,
    Uint32Array: Uint32Array,
    Float32Array: Float32Array,
    Float64Array: Float64Array,
    NaN: NaN,
    Infinity: Infinity,
  };
  Module.asmLibraryArg = {
    abort: abort,
    assert: assert,
    invoke_viiiii: invoke_viiiii,
    invoke_vid: invoke_vid,
    invoke_vi: invoke_vi,
    invoke_viiidii: invoke_viiidii,
    invoke_vii: invoke_vii,
    invoke_iiiiiiiiiii: invoke_iiiiiiiiiii,
    invoke_ii: invoke_ii,
    invoke_viidi: invoke_viidi,
    invoke_viddiii: invoke_viddiii,
    invoke_vidii: invoke_vidii,
    invoke_iiiii: invoke_iiiii,
    invoke_vidi: invoke_vidi,
    invoke_diiiiiiii: invoke_diiiiiiii,
    invoke_viiiiddddiid: invoke_viiiiddddiid,
    invoke_diiiii: invoke_diiiii,
    invoke_vidd: invoke_vidd,
    invoke_iiii: invoke_iiii,
    invoke_viiiiid: invoke_viiiiid,
    invoke_viiiiii: invoke_viiiiii,
    invoke_iiid: invoke_iiid,
    invoke_di: invoke_di,
    invoke_iiiiiii: invoke_iiiiiii,
    invoke_diiidii: invoke_diiidii,
    invoke_viidii: invoke_viidii,
    invoke_viiiiiii: invoke_viiiiiii,
    invoke_viiiiiiiii: invoke_viiiiiiiii,
    invoke_viiiiiiiiii: invoke_viiiiiiiiii,
    invoke_iii: invoke_iii,
    invoke_diii: invoke_diii,
    invoke_diiiiiiiiii: invoke_diiiiiiiiii,
    invoke_viiiid: invoke_viiiid,
    invoke_diiiiiiiii: invoke_diiiiiiiii,
    invoke_did: invoke_did,
    invoke_viiiidddddidi: invoke_viiiidddddidi,
    invoke_diidii: invoke_diidii,
    invoke_diiii: invoke_diiii,
    invoke_iiiiiiiiii: invoke_iiiiiiiiii,
    invoke_viiid: invoke_viiid,
    invoke_viii: invoke_viii,
    invoke_v: invoke_v,
    invoke_viid: invoke_viid,
    invoke_iidid: invoke_iidid,
    invoke_viiii: invoke_viiii,
    _pthread_cleanup_pop: _pthread_cleanup_pop,
    _abort: _abort,
    ___cxa_guard_acquire: ___cxa_guard_acquire,
    ___gxx_personality_v0: ___gxx_personality_v0,
    ___cxa_allocate_exception: ___cxa_allocate_exception,
    __ZSt18uncaught_exceptionv: __ZSt18uncaught_exceptionv,
    ___cxa_guard_release: ___cxa_guard_release,
    ___setErrNo: ___setErrNo,
    _sbrk: _sbrk,
    _llvm_pow_f32: _llvm_pow_f32,
    ___cxa_begin_catch: ___cxa_begin_catch,
    _emscripten_memcpy_big: _emscripten_memcpy_big,
    ___resumeException: ___resumeException,
    ___cxa_find_matching_catch: ___cxa_find_matching_catch,
    _sysconf: _sysconf,
    _pthread_getspecific: _pthread_getspecific,
    _pthread_self: _pthread_self,
    _llvm_fabs_f32: _llvm_fabs_f32,
    _pthread_once: _pthread_once,
    _llvm_trap: _llvm_trap,
    _pthread_key_create: _pthread_key_create,
    _emscripten_asm_const_diiiiiiii: _emscripten_asm_const_diiiiiiii,
    _pthread_setspecific: _pthread_setspecific,
    ___cxa_throw: ___cxa_throw,
    ___syscall6: ___syscall6,
    _pthread_cleanup_push: _pthread_cleanup_push,
    _time: _time,
    _gettimeofday: _gettimeofday,
    ___syscall140: ___syscall140,
    ___cxa_pure_virtual: ___cxa_pure_virtual,
    ___syscall146: ___syscall146,
    STACKTOP: STACKTOP,
    STACK_MAX: STACK_MAX,
    tempDoublePtr: tempDoublePtr,
    ABORT: ABORT,
    cttz_i8: cttz_i8,
  }; // EMSCRIPTEN_START_ASM
  var asm = (function(global, env, buffer) {
    'use asm';
    var a = new global.Int8Array(buffer);
    var b = new global.Int16Array(buffer);
    var c = new global.Int32Array(buffer);
    var d = new global.Uint8Array(buffer);
    var e = new global.Uint16Array(buffer);
    var f = new global.Uint32Array(buffer);
    var g = new global.Float32Array(buffer);
    var h = new global.Float64Array(buffer);
    var i = env.STACKTOP | 0;
    var j = env.STACK_MAX | 0;
    var k = env.tempDoublePtr | 0;
    var l = env.ABORT | 0;
    var m = env.cttz_i8 | 0;
    var n = 0;
    var o = 0;
    var p = 0;
    var q = 0;
    var r = global.NaN,
      s = global.Infinity;
    var t = 0,
      u = 0,
      v = 0,
      w = 0,
      x = 0,
      y = 0,
      z = 0,
      A = 0,
      B = 0;
    var C = 0;
    var D = 0;
    var E = 0;
    var F = 0;
    var G = 0;
    var H = 0;
    var I = 0;
    var J = 0;
    var K = 0;
    var L = 0;
    var M = global.Math.floor;
    var N = global.Math.abs;
    var O = global.Math.sqrt;
    var P = global.Math.pow;
    var Q = global.Math.cos;
    var R = global.Math.sin;
    var S = global.Math.tan;
    var T = global.Math.acos;
    var U = global.Math.asin;
    var V = global.Math.atan;
    var W = global.Math.atan2;
    var X = global.Math.exp;
    var Y = global.Math.log;
    var Z = global.Math.ceil;
    var _ = global.Math.imul;
    var $ = global.Math.min;
    var aa = global.Math.clz32;
    var ba = env.abort;
    var ca = env.assert;
    var da = env.invoke_viiiii;
    var ea = env.invoke_vid;
    var fa = env.invoke_vi;
    var ga = env.invoke_viiidii;
    var ha = env.invoke_vii;
    var ia = env.invoke_iiiiiiiiiii;
    var ja = env.invoke_ii;
    var ka = env.invoke_viidi;
    var la = env.invoke_viddiii;
    var ma = env.invoke_vidii;
    var na = env.invoke_iiiii;
    var oa = env.invoke_vidi;
    var pa = env.invoke_diiiiiiii;
    var qa = env.invoke_viiiiddddiid;
    var ra = env.invoke_diiiii;
    var sa = env.invoke_vidd;
    var ta = env.invoke_iiii;
    var ua = env.invoke_viiiiid;
    var va = env.invoke_viiiiii;
    var wa = env.invoke_iiid;
    var xa = env.invoke_di;
    var ya = env.invoke_iiiiiii;
    var za = env.invoke_diiidii;
    var Aa = env.invoke_viidii;
    var Ba = env.invoke_viiiiiii;
    var Ca = env.invoke_viiiiiiiii;
    var Da = env.invoke_viiiiiiiiii;
    var Ea = env.invoke_iii;
    var Fa = env.invoke_diii;
    var Ga = env.invoke_diiiiiiiiii;
    var Ha = env.invoke_viiiid;
    var Ia = env.invoke_diiiiiiiii;
    var Ja = env.invoke_did;
    var Ka = env.invoke_viiiidddddidi;
    var La = env.invoke_diidii;
    var Ma = env.invoke_diiii;
    var Na = env.invoke_iiiiiiiiii;
    var Oa = env.invoke_viiid;
    var Pa = env.invoke_viii;
    var Qa = env.invoke_v;
    var Ra = env.invoke_viid;
    var Sa = env.invoke_iidid;
    var Ta = env.invoke_viiii;
    var Ua = env._pthread_cleanup_pop;
    var Va = env._abort;
    var Wa = env.___cxa_guard_acquire;
    var Xa = env.___gxx_personality_v0;
    var Ya = env.___cxa_allocate_exception;
    var Za = env.__ZSt18uncaught_exceptionv;
    var _a = env.___cxa_guard_release;
    var $a = env.___setErrNo;
    var ab = env._sbrk;
    var bb = env._llvm_pow_f32;
    var cb = env.___cxa_begin_catch;
    var db = env._emscripten_memcpy_big;
    var eb = env.___resumeException;
    var fb = env.___cxa_find_matching_catch;
    var gb = env._sysconf;
    var hb = env._pthread_getspecific;
    var ib = env._pthread_self;
    var jb = env._llvm_fabs_f32;
    var kb = env._pthread_once;
    var lb = env._llvm_trap;
    var mb = env._pthread_key_create;
    var nb = env._emscripten_asm_const_diiiiiiii;
    var ob = env._pthread_setspecific;
    var pb = env.___cxa_throw;
    var qb = env.___syscall6;
    var rb = env._pthread_cleanup_push;
    var sb = env._time;
    var tb = env._gettimeofday;
    var ub = env.___syscall140;
    var vb = env.___cxa_pure_virtual;
    var wb = env.___syscall146;
    var xb = 0;
    // EMSCRIPTEN_START_FUNCS
    function Df(a, b) {
      a = a | 0;
      b = b | 0;
      var d = 0,
        e = 0.0,
        f = 0.0,
        h = 0.0,
        j = 0,
        l = 0,
        m = 0,
        n = 0.0,
        o = 0,
        p = 0.0,
        q = 0,
        r = 0,
        s = 0,
        t = 0,
        u = 0,
        v = 0,
        w = 0;
      d = i;
      i = (i + 176) | 0;
      q = c[(a + 68) >> 2] | 0;
      c[(d + 128) >> 2] = q;
      o = c[(a + 84) >> 2] | 0;
      c[(d + 128 + 4) >> 2] = o;
      m = c[(a + 100) >> 2] | 0;
      c[(d + 128 + 8) >> 2] = m;
      g[(d + 128 + 12) >> 2] = 0.0;
      l = (d + 128 + 16) | 0;
      t = c[(a + 72) >> 2] | 0;
      c[l >> 2] = t;
      s = c[(a + 88) >> 2] | 0;
      c[(d + 128 + 20) >> 2] = s;
      r = c[(a + 104) >> 2] | 0;
      c[(d + 128 + 24) >> 2] = r;
      g[(d + 128 + 28) >> 2] = 0.0;
      j = (d + 128 + 32) | 0;
      w = c[(a + 76) >> 2] | 0;
      c[j >> 2] = w;
      v = c[(a + 92) >> 2] | 0;
      c[(d + 128 + 36) >> 2] = v;
      u = c[(a + 108) >> 2] | 0;
      c[(d + 128 + 40) >> 2] = u;
      g[(d + 128 + 44) >> 2] = 0.0;
      p = -+g[(a + 116) >> 2];
      n = -+g[(a + 120) >> 2];
      h = -+g[(a + 124) >> 2];
      e = ((c[k >> 2] = w), +g[k >> 2]) * p;
      e = e + ((c[k >> 2] = v), +g[k >> 2]) * n;
      e = e + ((c[k >> 2] = u), +g[k >> 2]) * h;
      f = ((c[k >> 2] = t), +g[k >> 2]) * p;
      f = f + ((c[k >> 2] = s), +g[k >> 2]) * n;
      f = f + ((c[k >> 2] = r), +g[k >> 2]) * h;
      p = ((c[k >> 2] = q), +g[k >> 2]) * p;
      n = p + ((c[k >> 2] = o), +g[k >> 2]) * n;
      h = n + ((c[k >> 2] = m), +g[k >> 2]) * h;
      c[d >> 2] = c[(d + 128) >> 2];
      c[(d + 4) >> 2] = c[(d + 128 + 4) >> 2];
      c[(d + 8) >> 2] = c[(d + 128 + 8) >> 2];
      c[(d + 12) >> 2] = c[(d + 128 + 12) >> 2];
      c[(d + 16) >> 2] = c[l >> 2];
      c[(d + 16 + 4) >> 2] = c[(l + 4) >> 2];
      c[(d + 16 + 8) >> 2] = c[(l + 8) >> 2];
      c[(d + 16 + 12) >> 2] = c[(l + 12) >> 2];
      c[(d + 32) >> 2] = c[j >> 2];
      c[(d + 32 + 4) >> 2] = c[(j + 4) >> 2];
      c[(d + 32 + 8) >> 2] = c[(j + 8) >> 2];
      c[(d + 32 + 12) >> 2] = c[(j + 12) >> 2];
      g[(d + 48) >> 2] = h;
      g[(d + 52) >> 2] = f;
      g[(d + 56) >> 2] = e;
      g[(d + 60) >> 2] = 0.0;
      dh((d + 64) | 0, d, (a + 4) | 0);
      c[b >> 2] = c[(d + 64) >> 2];
      c[(b + 4) >> 2] = c[(d + 64 + 4) >> 2];
      c[(b + 8) >> 2] = c[(d + 64 + 8) >> 2];
      c[(b + 12) >> 2] = c[(d + 64 + 12) >> 2];
      c[(b + 16) >> 2] = c[(d + 64 + 16) >> 2];
      c[(b + 16 + 4) >> 2] = c[(d + 64 + 16 + 4) >> 2];
      c[(b + 16 + 8) >> 2] = c[(d + 64 + 16 + 8) >> 2];
      c[(b + 16 + 12) >> 2] = c[(d + 64 + 16 + 12) >> 2];
      c[(b + 32) >> 2] = c[(d + 64 + 32) >> 2];
      c[(b + 32 + 4) >> 2] = c[(d + 64 + 32 + 4) >> 2];
      c[(b + 32 + 8) >> 2] = c[(d + 64 + 32 + 8) >> 2];
      c[(b + 32 + 12) >> 2] = c[(d + 64 + 32 + 12) >> 2];
      c[(b + 48) >> 2] = c[(d + 64 + 48) >> 2];
      c[(b + 48 + 4) >> 2] = c[(d + 64 + 48 + 4) >> 2];
      c[(b + 48 + 8) >> 2] = c[(d + 64 + 48 + 8) >> 2];
      c[(b + 48 + 12) >> 2] = c[(d + 64 + 48 + 12) >> 2];
      i = d;
      return;
    }
    function Ef(a, e, f) {
      a = a | 0;
      e = e | 0;
      f = f | 0;
      var h = 0.0,
        i = 0.0,
        j = 0.0,
        k = 0;
      si(a, e, f) | 0;
      c[(e + 52) >> 2] = c[(a + 552) >> 2];
      c[(e + 56) >> 2] = c[(a + 556) >> 2];
      c[(e + 60) >> 2] = c[(a + 560) >> 2];
      c[(e + 64) >> 2] = c[(a + 564) >> 2];
      c[(e + 68) >> 2] = c[(a + 568) >> 2];
      c[(e + 72) >> 2] = c[(a + 572) >> 2];
      c[(e + 76) >> 2] = c[(a + 576) >> 2];
      c[(e + 80) >> 2] = c[(a + 580) >> 2];
      c[(e + 84) >> 2] = c[(a + 584) >> 2];
      c[(e + 88) >> 2] = c[(a + 588) >> 2];
      c[(e + 92) >> 2] = c[(a + 592) >> 2];
      c[(e + 96) >> 2] = c[(a + 596) >> 2];
      c[(e + 100) >> 2] = c[(a + 600) >> 2];
      c[(e + 104) >> 2] = c[(a + 604) >> 2];
      c[(e + 108) >> 2] = c[(a + 608) >> 2];
      c[(e + 112) >> 2] = c[(a + 612) >> 2];
      c[(e + 116) >> 2] = c[(a + 616) >> 2];
      c[(e + 120) >> 2] = c[(a + 620) >> 2];
      c[(e + 124) >> 2] = c[(a + 624) >> 2];
      c[(e + 128) >> 2] = c[(a + 628) >> 2];
      c[(e + 132) >> 2] = c[(a + 632) >> 2];
      c[(e + 136) >> 2] = c[(a + 636) >> 2];
      c[(e + 140) >> 2] = c[(a + 640) >> 2];
      c[(e + 144) >> 2] = c[(a + 644) >> 2];
      c[(e + 148) >> 2] = c[(a + 648) >> 2];
      c[(e + 152) >> 2] = c[(a + 652) >> 2];
      c[(e + 156) >> 2] = c[(a + 656) >> 2];
      c[(e + 160) >> 2] = c[(a + 660) >> 2];
      c[(e + 164) >> 2] = c[(a + 664) >> 2];
      c[(e + 168) >> 2] = c[(a + 668) >> 2];
      c[(e + 172) >> 2] = c[(a + 672) >> 2];
      c[(e + 176) >> 2] = c[(a + 676) >> 2];
      f = b[(a + 736) >> 1] | 0;
      c[(e + 184) >> 2] = f & 255;
      c[(e + 188) >> 2] = ((f & 65535) >>> 8) & 65535;
      c[(e + 196) >> 2] = c[(a + 684) >> 2];
      c[(e + 192) >> 2] = c[(a + 680) >> 2];
      c[(e + 180) >> 2] = d[(a + 740) >> 0];
      i = +g[(a + 688) >> 2];
      j = +g[(a + 692) >> 2];
      h = +eh(i - j, 6.2831854820251465);
      if (!(h < -3.1415927410125732)) {
        if (h > 3.1415927410125732) h = h + -6.2831854820251465;
      } else h = h + 6.2831854820251465;
      g[(e + 200) >> 2] = h;
      h = +eh(i + j, 6.2831854820251465);
      if (h < -3.1415927410125732) {
        j = h + 6.2831854820251465;
        f = (e + 204) | 0;
        g[f >> 2] = j;
        f = (a + 696) | 0;
        f = c[f >> 2] | 0;
        k = (e + 208) | 0;
        c[k >> 2] = f;
        k = (a + 700) | 0;
        k = c[k >> 2] | 0;
        f = (e + 212) | 0;
        c[f >> 2] = k;
        f = (a + 704) | 0;
        f = c[f >> 2] | 0;
        a = (e + 216) | 0;
        c[a >> 2] = f;
        return 12773;
      }
      if (!(h > 3.1415927410125732)) {
        j = h;
        k = (e + 204) | 0;
        g[k >> 2] = j;
        k = (a + 696) | 0;
        k = c[k >> 2] | 0;
        f = (e + 208) | 0;
        c[f >> 2] = k;
        f = (a + 700) | 0;
        f = c[f >> 2] | 0;
        k = (e + 212) | 0;
        c[k >> 2] = f;
        a = (a + 704) | 0;
        a = c[a >> 2] | 0;
        k = (e + 216) | 0;
        c[k >> 2] = a;
        return 12773;
      }
      j = h + -6.2831854820251465;
      k = (e + 204) | 0;
      g[k >> 2] = j;
      k = (a + 696) | 0;
      k = c[k >> 2] | 0;
      f = (e + 208) | 0;
      c[f >> 2] = k;
      f = (a + 700) | 0;
      f = c[f >> 2] | 0;
      k = (e + 212) | 0;
      c[k >> 2] = f;
      a = (a + 704) | 0;
      a = c[a >> 2] | 0;
      k = (e + 216) | 0;
      c[k >> 2] = a;
      return 12773;
    }
    function Ff(b, d) {
      b = b | 0;
      d = d | 0;
      var e = 0,
        f = 0,
        g = 0,
        h = 0,
        i = 0,
        j = 0,
        k = 0,
        l = 0;
      i = c[(b + 4) >> 2] | 0;
      if (
        (i | 0) == (c[(b + 8) >> 2] | 0)
          ? ((h = i | 0 ? i << 1 : 1), (i | 0) < (h | 0))
          : 0
      ) {
        if (!h) {
          e = 0;
          f = i;
        } else {
          c[6435] = (c[6435] | 0) + 1;
          e = yc((((h * 244) | 3) + 16) | 0) | 0;
          if (!e) e = 0;
          else {
            c[(((e + 4 + 15) & -16) + -4) >> 2] = e;
            e = (e + 4 + 15) & -16;
          }
          f = c[(b + 4) >> 2] | 0;
        }
        if ((f | 0) > 0) {
          g = 0;
          do {
            k = (e + ((g * 244) | 0)) | 0;
            j = c[(b + 12) >> 2] | 0;
            l = (j + ((g * 244) | 0)) | 0;
            c[k >> 2] = c[l >> 2];
            c[(k + 4) >> 2] = c[(l + 4) >> 2];
            c[(k + 8) >> 2] = c[(l + 8) >> 2];
            c[(k + 12) >> 2] = c[(l + 12) >> 2];
            k = (e + ((g * 244) | 0) + 16) | 0;
            l = (j + ((g * 244) | 0) + 16) | 0;
            c[k >> 2] = c[l >> 2];
            c[(k + 4) >> 2] = c[(l + 4) >> 2];
            c[(k + 8) >> 2] = c[(l + 8) >> 2];
            c[(k + 12) >> 2] = c[(l + 12) >> 2];
            k = (e + ((g * 244) | 0) + 32) | 0;
            l = (j + ((g * 244) | 0) + 32) | 0;
            c[k >> 2] = c[l >> 2];
            c[(k + 4) >> 2] = c[(l + 4) >> 2];
            c[(k + 8) >> 2] = c[(l + 8) >> 2];
            c[(k + 12) >> 2] = c[(l + 12) >> 2];
            k = (e + ((g * 244) | 0) + 48) | 0;
            l = (j + ((g * 244) | 0) + 48) | 0;
            c[k >> 2] = c[l >> 2];
            c[(k + 4) >> 2] = c[(l + 4) >> 2];
            c[(k + 8) >> 2] = c[(l + 8) >> 2];
            c[(k + 12) >> 2] = c[(l + 12) >> 2];
            _m(
              (e + ((g * 244) | 0) + 64) | 0,
              (j + ((g * 244) | 0) + 64) | 0,
              180
            ) | 0;
            g = (g + 1) | 0;
          } while ((g | 0) != (f | 0));
        }
        f = c[(b + 12) >> 2] | 0;
        if (f | 0) {
          if (a[(b + 16) >> 0] | 0) {
            c[6436] = (c[6436] | 0) + 1;
            hd(c[(f + -4) >> 2] | 0);
          }
          c[(b + 12) >> 2] = 0;
        }
        a[(b + 16) >> 0] = 1;
        c[(b + 12) >> 2] = e;
        c[(b + 8) >> 2] = h;
        e = c[(b + 4) >> 2] | 0;
      } else e = i;
      c[(b + 4) >> 2] = e + 1;
      l = c[(b + 12) >> 2] | 0;
      c[(l + ((i * 244) | 0)) >> 2] = c[d >> 2];
      c[(l + ((i * 244) | 0) + 4) >> 2] = c[(d + 4) >> 2];
      c[(l + ((i * 244) | 0) + 8) >> 2] = c[(d + 8) >> 2];
      c[(l + ((i * 244) | 0) + 12) >> 2] = c[(d + 12) >> 2];
      c[(l + ((i * 244) | 0) + 16) >> 2] = c[(d + 16) >> 2];
      c[(l + ((i * 244) | 0) + 16 + 4) >> 2] = c[(d + 16 + 4) >> 2];
      c[(l + ((i * 244) | 0) + 16 + 8) >> 2] = c[(d + 16 + 8) >> 2];
      c[(l + ((i * 244) | 0) + 16 + 12) >> 2] = c[(d + 16 + 12) >> 2];
      c[(l + ((i * 244) | 0) + 32) >> 2] = c[(d + 32) >> 2];
      c[(l + ((i * 244) | 0) + 32 + 4) >> 2] = c[(d + 32 + 4) >> 2];
      c[(l + ((i * 244) | 0) + 32 + 8) >> 2] = c[(d + 32 + 8) >> 2];
      c[(l + ((i * 244) | 0) + 32 + 12) >> 2] = c[(d + 32 + 12) >> 2];
      c[(l + ((i * 244) | 0) + 48) >> 2] = c[(d + 48) >> 2];
      c[(l + ((i * 244) | 0) + 48 + 4) >> 2] = c[(d + 48 + 4) >> 2];
      c[(l + ((i * 244) | 0) + 48 + 8) >> 2] = c[(d + 48 + 8) >> 2];
      c[(l + ((i * 244) | 0) + 48 + 12) >> 2] = c[(d + 48 + 12) >> 2];
      _m((l + ((i * 244) | 0) + 64) | 0, (d + 64) | 0, 180) | 0;
      return ((c[(b + 12) >> 2] | 0) + ((i * 244) | 0)) | 0;
    }
    function Gf(a, b, d, e) {
      a = a | 0;
      b = b | 0;
      d = d | 0;
      e = e | 0;
      var f = 0.0,
        h = 0.0,
        j = 0.0,
        k = 0.0,
        l = 0,
        m = 0.0,
        n = 0.0,
        o = 0.0,
        p = 0.0,
        q = 0.0,
        r = 0.0,
        s = 0.0,
        t = 0.0,
        u = 0.0,
        v = 0.0,
        w = 0.0,
        x = 0.0,
        y = 0.0,
        z = 0.0,
        A = 0.0;
      l = i;
      i = (i + 64) | 0;
      n = +g[(a + 20) >> 2];
      u = +g[(a + 40) >> 2];
      p = +g[(a + 24) >> 2];
      s = +g[(a + 36) >> 2];
      t = +g[(a + 32) >> 2];
      m = +g[(a + 16) >> 2];
      k = +g[a >> 2];
      j = +g[(a + 4) >> 2];
      q = +g[(a + 8) >> 2];
      h =
        1.0 / ((n * u - p * s) * k + j * (p * t - u * m) + (s * m - n * t) * q);
      z = +g[b >> 2];
      y = +g[(b + 4) >> 2];
      A = +g[(b + 8) >> 2];
      x = +g[(b + 16) >> 2];
      w = +g[(b + 20) >> 2];
      v = +g[(b + 24) >> 2];
      r = +g[(b + 32) >> 2];
      o = +g[(b + 36) >> 2];
      f = +g[(b + 40) >> 2];
      g[(l + 16) >> 2] =
        A * (s * m - n * t) * h +
        (z * (n * u - p * s) * h + y * (p * t - u * m) * h);
      g[(l + 16 + 4) >> 2] =
        A * (t * j - s * k) * h +
        (z * (s * q - u * j) * h + y * (u * k - t * q) * h);
      g[(l + 16 + 8) >> 2] =
        A * (n * k - m * j) * h +
        (z * (p * j - n * q) * h + y * (m * q - p * k) * h);
      g[(l + 16 + 12) >> 2] = 0.0;
      g[(l + 16 + 16) >> 2] =
        (n * u - p * s) * h * x +
        (p * t - u * m) * h * w +
        (s * m - n * t) * h * v;
      g[(l + 16 + 20) >> 2] =
        (s * q - u * j) * h * x +
        (u * k - t * q) * h * w +
        (t * j - s * k) * h * v;
      g[(l + 16 + 24) >> 2] =
        (p * j - n * q) * h * x +
        (m * q - p * k) * h * w +
        (n * k - m * j) * h * v;
      g[(l + 16 + 28) >> 2] = 0.0;
      g[(l + 16 + 32) >> 2] =
        (n * u - p * s) * h * r +
        (p * t - u * m) * h * o +
        (s * m - n * t) * h * f;
      g[(l + 16 + 36) >> 2] =
        (s * q - u * j) * h * r +
        (u * k - t * q) * h * o +
        (t * j - s * k) * h * f;
      g[(l + 16 + 40) >> 2] =
        (p * j - n * q) * h * r +
        (m * q - p * k) * h * o +
        (n * k - m * j) * h * f;
      g[(l + 16 + 44) >> 2] = 0.0;
      Wg((l + 16) | 0, l);
      f = +g[l >> 2];
      h = +g[(l + 4) >> 2];
      j = +g[(l + 8) >> 2];
      m = +g[(l + 12) >> 2];
      k = 1.0 / +O(+(f * f + h * h + j * j + m * m));
      g[l >> 2] = f * k;
      g[(l + 4) >> 2] = h * k;
      g[(l + 8) >> 2] = j * k;
      g[(l + 12) >> 2] = m * k;
      m = m * k < -1.0 ? -1.0 : m * k;
      g[e >> 2] = +T(+(m > 1.0 ? 1.0 : m)) * 2.0;
      g[d >> 2] = f * k;
      g[(d + 4) >> 2] = h * k;
      g[(d + 8) >> 2] = j * k;
      g[(d + 12) >> 2] = 0.0;
      if (
        f * k * f * k + h * k * h * k + j * k * j * k <
        1.4210854715202004e-14
      ) {
        c[d >> 2] = 1065353216;
        c[(d + 4) >> 2] = 0;
        c[(d + 8) >> 2] = 0;
        g[(d + 12) >> 2] = 0.0;
        i = l;
        return;
      } else {
        A = 1.0 / +O(+(f * k * f * k + h * k * h * k + j * k * j * k));
        g[d >> 2] = f * k * A;
        g[(d + 4) >> 2] = A * h * k;
        g[(d + 8) >> 2] = A * j * k;
        i = l;
        return;
      }
    }
    function Hf(b) {
      b = b | 0;
      var d = 0,
        e = 0,
        f = 0,
        g = 0,
        h = 0,
        i = 0,
        j = 0;
      i = c[(b + 12) >> 2] | 0;
      j = c[(b + 36) >> 2] | 0;
      if ((i | 0) <= (j | 0)) return;
      if ((i | 0) >= (j | 0)) {
        do
          if ((c[(b + 40) >> 2] | 0) < (i | 0)) {
            if (!i) {
              d = 0;
              e = j;
            } else {
              c[6435] = (c[6435] | 0) + 1;
              d = yc((((i << 2) | 3) + 16) | 0) | 0;
              if (!d) d = 0;
              else {
                c[(((d + 4 + 15) & -16) + -4) >> 2] = d;
                d = (d + 4 + 15) & -16;
              }
              e = c[(b + 36) >> 2] | 0;
            }
            f = c[(b + 44) >> 2] | 0;
            if ((e | 0) <= 0) {
              if (!f) {
                a[(b + 48) >> 0] = 1;
                c[(b + 44) >> 2] = d;
                c[(b + 40) >> 2] = i;
                break;
              }
            } else {
              g = 0;
              do {
                c[(d + (g << 2)) >> 2] = c[(f + (g << 2)) >> 2];
                g = (g + 1) | 0;
              } while ((g | 0) != (e | 0));
            }
            if (a[(b + 48) >> 0] | 0) {
              c[6436] = (c[6436] | 0) + 1;
              hd(c[(f + -4) >> 2] | 0);
            }
            a[(b + 48) >> 0] = 1;
            c[(b + 44) >> 2] = d;
            c[(b + 40) >> 2] = i;
          } else d = c[(b + 44) >> 2] | 0;
        while (0);
        Qn((d + (j << 2)) | 0, 0, ((i - j) << 2) | 0) | 0;
      }
      c[(b + 36) >> 2] = i;
      h = c[(b + 56) >> 2] | 0;
      if ((i | 0) > (h | 0)) {
        do
          if ((c[(b + 60) >> 2] | 0) < (i | 0)) {
            if (!i) {
              d = 0;
              e = h;
            } else {
              c[6435] = (c[6435] | 0) + 1;
              d = yc((((i << 2) | 3) + 16) | 0) | 0;
              if (!d) d = 0;
              else {
                c[(((d + 4 + 15) & -16) + -4) >> 2] = d;
                d = (d + 4 + 15) & -16;
              }
              e = c[(b + 56) >> 2] | 0;
            }
            f = c[(b + 64) >> 2] | 0;
            if ((e | 0) <= 0) {
              if (!f) {
                a[(b + 68) >> 0] = 1;
                c[(b + 64) >> 2] = d;
                c[(b + 60) >> 2] = i;
                break;
              }
            } else {
              g = 0;
              do {
                c[(d + (g << 2)) >> 2] = c[(f + (g << 2)) >> 2];
                g = (g + 1) | 0;
              } while ((g | 0) != (e | 0));
            }
            if (a[(b + 68) >> 0] | 0) {
              c[6436] = (c[6436] | 0) + 1;
              hd(c[(f + -4) >> 2] | 0);
            }
            a[(b + 68) >> 0] = 1;
            c[(b + 64) >> 2] = d;
            c[(b + 60) >> 2] = i;
          } else d = c[(b + 64) >> 2] | 0;
        while (0);
        Qn((d + (h << 2)) | 0, 0, ((i - h) << 2) | 0) | 0;
      }
      c[(b + 56) >> 2] = i;
      if ((i | 0) > 0) {
        Qn(c[(b + 44) >> 2] | 0, -1, (i << 2) | 0) | 0;
        Qn(c[(b + 64) >> 2] | 0, -1, (i << 2) | 0) | 0;
      }
      if ((j | 0) <= 0) return;
      d = c[(b + 16) >> 2] | 0;
      e = c[(b + 44) >> 2] | 0;
      f = c[(b + 64) >> 2] | 0;
      g = 0;
      do {
        i =
          (c[((c[(d + (g << 4) + 4) >> 2] | 0) + 12) >> 2] << 16) |
          c[((c[(d + (g << 4)) >> 2] | 0) + 12) >> 2];
        i = ((((i + ~(i << 15)) >> 10) ^ (i + ~(i << 15))) * 9) | 0;
        i =
          (e +
            (((((((i >> 6) ^ i) + ~(((i >> 6) ^ i) << 11)) >> 16) ^
              (((i >> 6) ^ i) + ~(((i >> 6) ^ i) << 11))) &
              ((c[(b + 12) >> 2] | 0) + -1)) <<
              2)) |
          0;
        c[(f + (g << 2)) >> 2] = c[i >> 2];
        c[i >> 2] = g;
        g = (g + 1) | 0;
      } while ((g | 0) != (j | 0));
      return;
    }
    function If(b, d) {
      b = b | 0;
      d = d | 0;
      var e = 0,
        f = 0,
        g = 0,
        h = 0,
        i = 0,
        j = 0,
        k = 0,
        l = 0,
        m = 0,
        n = 0,
        o = 0;
      if ((c[(b + 8) >> 2] | 0) >= (d | 0)) return;
      if (
        (d | 0) != 0
          ? ((c[6435] = (c[6435] | 0) + 1),
            (e = yc((((d * 36) | 3) + 16) | 0) | 0),
            (e | 0) != 0)
          : 0
      ) {
        c[(((e + 4 + 15) & -16) + -4) >> 2] = e;
        o = (e + 4 + 15) & -16;
      } else o = 0;
      i = c[(b + 4) >> 2] | 0;
      if ((i | 0) > 0) {
        m = 0;
        do {
          j = (o + ((m * 36) | 0)) | 0;
          k = c[(b + 12) >> 2] | 0;
          a[(j + 16) >> 0] = 1;
          c[(j + 12) >> 2] = 0;
          c[(j + 4) >> 2] = 0;
          c[(j + 8) >> 2] = 0;
          l = c[(k + ((m * 36) | 0) + 4) >> 2] | 0;
          if ((l | 0) > 0) {
            c[6435] = (c[6435] | 0) + 1;
            e = yc((((l << 2) | 3) + 16) | 0) | 0;
            if (!e) h = 0;
            else {
              c[(((e + 4 + 15) & -16) + -4) >> 2] = e;
              h = (e + 4 + 15) & -16;
            }
            g = c[(j + 4) >> 2] | 0;
            f = c[(j + 12) >> 2] | 0;
            if ((g | 0) <= 0)
              if (!f) {
                a[(j + 16) >> 0] = 1;
                c[(j + 12) >> 2] = h;
                c[(j + 8) >> 2] = l;
                Qn(h | 0, 0, (l << 2) | 0) | 0;
              } else n = 14;
            else {
              e = 0;
              do {
                c[(h + (e << 2)) >> 2] = c[(f + (e << 2)) >> 2];
                e = (e + 1) | 0;
              } while ((e | 0) != (g | 0));
              n = 14;
            }
            if ((n | 0) == 14) {
              n = 0;
              if (a[(j + 16) >> 0] | 0) {
                c[6436] = (c[6436] | 0) + 1;
                hd(c[(f + -4) >> 2] | 0);
              }
              a[(j + 16) >> 0] = 1;
              c[(j + 12) >> 2] = h;
              c[(j + 8) >> 2] = l;
              Qn(h | 0, 0, (l << 2) | 0) | 0;
            }
            e = c[(j + 12) >> 2] | 0;
            c[(j + 4) >> 2] = l;
            f = c[(k + ((m * 36) | 0) + 12) >> 2] | 0;
            g = 0;
            do {
              c[(e + (g << 2)) >> 2] = c[(f + (g << 2)) >> 2];
              g = (g + 1) | 0;
            } while ((g | 0) != (l | 0));
          } else c[(j + 4) >> 2] = l;
          l = (k + ((m * 36) | 0) + 20) | 0;
          c[(j + 20) >> 2] = c[l >> 2];
          c[(j + 20 + 4) >> 2] = c[(l + 4) >> 2];
          c[(j + 20 + 8) >> 2] = c[(l + 8) >> 2];
          c[(j + 20 + 12) >> 2] = c[(l + 12) >> 2];
          m = (m + 1) | 0;
        } while ((m | 0) != (i | 0));
        e = c[(b + 4) >> 2] | 0;
        if ((e | 0) > 0) {
          k = 0;
          do {
            g = c[(b + 12) >> 2] | 0;
            h = (g + ((k * 36) | 0) + 4) | 0;
            i = (g + ((k * 36) | 0) + 12) | 0;
            j = c[i >> 2] | 0;
            f = (g + ((k * 36) | 0) + 16) | 0;
            if (j | 0) {
              if (a[f >> 0] | 0) {
                c[6436] = (c[6436] | 0) + 1;
                hd(c[(j + -4) >> 2] | 0);
              }
              c[i >> 2] = 0;
            }
            a[f >> 0] = 1;
            c[i >> 2] = 0;
            c[h >> 2] = 0;
            c[(g + ((k * 36) | 0) + 8) >> 2] = 0;
            k = (k + 1) | 0;
          } while ((k | 0) != (e | 0));
        }
      }
      e = c[(b + 12) >> 2] | 0;
      if (e | 0) {
        if (a[(b + 16) >> 0] | 0) {
          c[6436] = (c[6436] | 0) + 1;
          hd(c[(e + -4) >> 2] | 0);
        }
        c[(b + 12) >> 2] = 0;
      }
      a[(b + 16) >> 0] = 1;
      c[(b + 12) >> 2] = o;
      c[(b + 8) >> 2] = d;
      return;
    }
    function Jf(b, d, e, f) {
      b = b | 0;
      d = d | 0;
      e = e | 0;
      f = f | 0;
      var h = 0.0,
        i = 0.0,
        j = 0.0,
        k = 0.0,
        l = 0.0;
      c[(b + 4) >> 2] = 4;
      c[b >> 2] = 4432;
      c[(b + 8) >> 2] = -1;
      c[(b + 12) >> 2] = -1;
      g[(b + 16) >> 2] = 3402823466385288598117041.0e14;
      a[(b + 20) >> 0] = 1;
      a[(b + 21) >> 0] = 0;
      c[(b + 24) >> 2] = -1;
      c[(b + 28) >> 2] = d;
      Il();
      c[(b + 32) >> 2] = 23268;
      g[(b + 36) >> 2] = 0.0;
      g[(b + 40) >> 2] = 0.30000001192092896;
      c[(b + 44) >> 2] = 0;
      c[b >> 2] = 4704;
      c[(b + 552) >> 2] = c[e >> 2];
      c[(b + 552 + 4) >> 2] = c[(e + 4) >> 2];
      c[(b + 552 + 8) >> 2] = c[(e + 8) >> 2];
      c[(b + 552 + 12) >> 2] = c[(e + 12) >> 2];
      c[(b + 568) >> 2] = c[(e + 16) >> 2];
      c[(b + 568 + 4) >> 2] = c[(e + 16 + 4) >> 2];
      c[(b + 568 + 8) >> 2] = c[(e + 16 + 8) >> 2];
      c[(b + 568 + 12) >> 2] = c[(e + 16 + 12) >> 2];
      c[(b + 584) >> 2] = c[(e + 32) >> 2];
      c[(b + 584 + 4) >> 2] = c[(e + 32 + 4) >> 2];
      c[(b + 584 + 8) >> 2] = c[(e + 32 + 8) >> 2];
      c[(b + 584 + 12) >> 2] = c[(e + 32 + 12) >> 2];
      c[(b + 600) >> 2] = c[(e + 48) >> 2];
      c[(b + 600 + 4) >> 2] = c[(e + 48 + 4) >> 2];
      c[(b + 600 + 8) >> 2] = c[(e + 48 + 8) >> 2];
      c[(b + 600 + 12) >> 2] = c[(e + 48 + 12) >> 2];
      c[(b + 616) >> 2] = c[e >> 2];
      c[(b + 616 + 4) >> 2] = c[(e + 4) >> 2];
      c[(b + 616 + 8) >> 2] = c[(e + 8) >> 2];
      c[(b + 616 + 12) >> 2] = c[(e + 12) >> 2];
      c[(b + 632) >> 2] = c[(e + 16) >> 2];
      c[(b + 632 + 4) >> 2] = c[(e + 16 + 4) >> 2];
      c[(b + 632 + 8) >> 2] = c[(e + 16 + 8) >> 2];
      c[(b + 632 + 12) >> 2] = c[(e + 16 + 12) >> 2];
      c[(b + 648) >> 2] = c[(e + 32) >> 2];
      c[(b + 648 + 4) >> 2] = c[(e + 32 + 4) >> 2];
      c[(b + 648 + 8) >> 2] = c[(e + 32 + 8) >> 2];
      c[(b + 648 + 12) >> 2] = c[(e + 32 + 12) >> 2];
      c[(b + 664) >> 2] = c[(e + 48) >> 2];
      c[(b + 664 + 4) >> 2] = c[(e + 48 + 4) >> 2];
      c[(b + 664 + 8) >> 2] = c[(e + 48 + 8) >> 2];
      c[(b + 664 + 12) >> 2] = c[(e + 48 + 12) >> 2];
      g[(b + 688) >> 2] = 0.0;
      g[(b + 692) >> 2] = -1.0;
      g[(b + 696) >> 2] = 0.8999999761581421;
      g[(b + 700) >> 2] = 0.30000001192092896;
      g[(b + 704) >> 2] = 1.0;
      g[(b + 708) >> 2] = 0.0;
      g[(b + 712) >> 2] = 0.0;
      a[(b + 716) >> 0] = 0;
      a[(b + 736) >> 0] = 0;
      a[(b + 737) >> 0] = 0;
      a[(b + 738) >> 0] = 0;
      a[(b + 739) >> 0] = 1;
      a[(b + 740) >> 0] = f & 1;
      c[(b + 748) >> 2] = 0;
      e = c[(b + 28) >> 2] | 0;
      l = +g[(b + 600) >> 2];
      k = +g[(b + 604) >> 2];
      j = +g[(b + 608) >> 2];
      i =
        l * +g[(e + 20) >> 2] +
        k * +g[(e + 24) >> 2] +
        j * +g[(e + 28) >> 2] +
        +g[(e + 56) >> 2];
      h =
        l * +g[(e + 36) >> 2] +
        k * +g[(e + 40) >> 2] +
        j * +g[(e + 44) >> 2] +
        +g[(e + 60) >> 2];
      g[(b + 664) >> 2] =
        l * +g[(e + 4) >> 2] +
        k * +g[(e + 8) >> 2] +
        j * +g[(e + 12) >> 2] +
        +g[(e + 52) >> 2];
      g[(b + 668) >> 2] = i;
      g[(b + 672) >> 2] = h;
      g[(b + 676) >> 2] = 0.0;
      g[(b + 732) >> 2] = f ? -1.0 : 1.0;
      return;
    }
    function Kf(b) {
      b = b | 0;
      var d = 0,
        e = 0,
        f = 0,
        g = 0,
        h = 0,
        i = 0,
        j = 0;
      i = c[(b + 12) >> 2] | 0;
      j = c[(b + 32) >> 2] | 0;
      if ((i | 0) <= (j | 0)) return;
      if ((i | 0) >= (j | 0)) {
        do
          if ((c[(b + 36) >> 2] | 0) < (i | 0)) {
            if (!i) {
              d = 0;
              e = j;
            } else {
              c[6435] = (c[6435] | 0) + 1;
              d = yc((((i << 2) | 3) + 16) | 0) | 0;
              if (!d) d = 0;
              else {
                c[(((d + 4 + 15) & -16) + -4) >> 2] = d;
                d = (d + 4 + 15) & -16;
              }
              e = c[(b + 32) >> 2] | 0;
            }
            f = c[(b + 40) >> 2] | 0;
            if ((e | 0) <= 0) {
              if (!f) {
                a[(b + 44) >> 0] = 1;
                c[(b + 40) >> 2] = d;
                c[(b + 36) >> 2] = i;
                break;
              }
            } else {
              g = 0;
              do {
                c[(d + (g << 2)) >> 2] = c[(f + (g << 2)) >> 2];
                g = (g + 1) | 0;
              } while ((g | 0) != (e | 0));
            }
            if (a[(b + 44) >> 0] | 0) {
              c[6436] = (c[6436] | 0) + 1;
              hd(c[(f + -4) >> 2] | 0);
            }
            a[(b + 44) >> 0] = 1;
            c[(b + 40) >> 2] = d;
            c[(b + 36) >> 2] = i;
          } else d = c[(b + 40) >> 2] | 0;
        while (0);
        Qn((d + (j << 2)) | 0, 0, ((i - j) << 2) | 0) | 0;
      }
      c[(b + 32) >> 2] = i;
      h = c[(b + 52) >> 2] | 0;
      if ((i | 0) > (h | 0)) {
        do
          if ((c[(b + 56) >> 2] | 0) < (i | 0)) {
            if (!i) {
              d = 0;
              e = h;
            } else {
              c[6435] = (c[6435] | 0) + 1;
              d = yc((((i << 2) | 3) + 16) | 0) | 0;
              if (!d) d = 0;
              else {
                c[(((d + 4 + 15) & -16) + -4) >> 2] = d;
                d = (d + 4 + 15) & -16;
              }
              e = c[(b + 52) >> 2] | 0;
            }
            f = c[(b + 60) >> 2] | 0;
            if ((e | 0) <= 0) {
              if (!f) {
                a[(b + 64) >> 0] = 1;
                c[(b + 60) >> 2] = d;
                c[(b + 56) >> 2] = i;
                break;
              }
            } else {
              g = 0;
              do {
                c[(d + (g << 2)) >> 2] = c[(f + (g << 2)) >> 2];
                g = (g + 1) | 0;
              } while ((g | 0) != (e | 0));
            }
            if (a[(b + 64) >> 0] | 0) {
              c[6436] = (c[6436] | 0) + 1;
              hd(c[(f + -4) >> 2] | 0);
            }
            a[(b + 64) >> 0] = 1;
            c[(b + 60) >> 2] = d;
            c[(b + 56) >> 2] = i;
          } else d = c[(b + 60) >> 2] | 0;
        while (0);
        Qn((d + (h << 2)) | 0, 0, ((i - h) << 2) | 0) | 0;
      }
      c[(b + 52) >> 2] = i;
      if ((i | 0) > 0) {
        Qn(c[(b + 40) >> 2] | 0, -1, (i << 2) | 0) | 0;
        Qn(c[(b + 60) >> 2] | 0, -1, (i << 2) | 0) | 0;
      }
      if ((j | 0) <= 0) return;
      d = c[(b + 16) >> 2] | 0;
      e = c[(b + 40) >> 2] | 0;
      f = c[(b + 60) >> 2] | 0;
      g = 0;
      do {
        i =
          (c[(d + ((g * 12) | 0) + 4) >> 2] << 16) |
          c[(d + ((g * 12) | 0)) >> 2];
        i = ((((i + ~(i << 15)) >> 10) ^ (i + ~(i << 15))) * 9) | 0;
        i =
          (e +
            (((((((i >> 6) ^ i) + ~(((i >> 6) ^ i) << 11)) >> 16) ^
              (((i >> 6) ^ i) + ~(((i >> 6) ^ i) << 11))) &
              ((c[(b + 12) >> 2] | 0) + -1)) <<
              2)) |
          0;
        c[(f + (g << 2)) >> 2] = c[i >> 2];
        c[i >> 2] = g;
        g = (g + 1) | 0;
      } while ((g | 0) != (j | 0));
      return;
    }
    function Lf(a, b, d) {
      a = a | 0;
      b = b | 0;
      d = d | 0;
      var e = 0,
        f = 0,
        g = 0,
        h = 0,
        i = 0;
      e = Zb[c[((c[d >> 2] | 0) + 40) >> 2] & 31](d, a) | 0;
      g = Zb[c[((c[d >> 2] | 0) + 28) >> 2] & 31](d, e) | 0;
      c[b >> 2] = g;
      if (g | 0) Cb[c[((c[d >> 2] | 0) + 48) >> 2] & 127](d, e);
      c[(b + 4) >> 2] = c[(a + 4) >> 2];
      c[(b + 20) >> 2] = c[(a + 72) >> 2];
      e = c[(a + 16) >> 2] | 0;
      c[(b + 16) >> 2] = e;
      c[(b + 12) >> 2] = 0;
      if (!e) return 16387;
      g = Ob[c[((c[d >> 2] | 0) + 16) >> 2] & 63](d, 76, e) | 0;
      e = c[(g + 8) >> 2] | 0;
      c[(b + 12) >> 2] = Zb[c[((c[d >> 2] | 0) + 28) >> 2] & 31](d, e) | 0;
      if ((c[(b + 16) >> 2] | 0) > 0) {
        f = 0;
        while (1) {
          h = c[(a + 24) >> 2] | 0;
          c[(e + 72) >> 2] = c[(h + ((f * 80) | 0) + 72) >> 2];
          c[(e + 64) >> 2] =
            Zb[c[((c[d >> 2] | 0) + 28) >> 2] & 31](
              d,
              c[(h + ((f * 80) | 0) + 64) >> 2] | 0
            ) | 0;
          if (
            !(
              Zb[c[((c[d >> 2] | 0) + 24) >> 2] & 31](
                d,
                c[((c[(a + 24) >> 2] | 0) + ((f * 80) | 0) + 64) >> 2] | 0
              ) | 0
            )
          ) {
            h = c[((c[d >> 2] | 0) + 16) >> 2] | 0;
            i = c[((c[(a + 24) >> 2] | 0) + ((f * 80) | 0) + 64) >> 2] | 0;
            i = Eb[c[((c[i >> 2] | 0) + 52) >> 2] & 127](i) | 0;
            i = Ob[h & 63](d, i, 1) | 0;
            h = c[((c[(a + 24) >> 2] | 0) + ((f * 80) | 0) + 64) >> 2] | 0;
            h =
              Ob[c[((c[h >> 2] | 0) + 56) >> 2] & 63](
                h,
                c[(i + 8) >> 2] | 0,
                d
              ) | 0;
            yb[c[((c[d >> 2] | 0) + 20) >> 2] & 31](
              d,
              i,
              h,
              1346455635,
              c[((c[(a + 24) >> 2] | 0) + ((f * 80) | 0) + 64) >> 2] | 0
            );
          }
          i = c[(a + 24) >> 2] | 0;
          c[(e + 68) >> 2] = c[(i + ((f * 80) | 0) + 68) >> 2];
          c[e >> 2] = c[(i + ((f * 80) | 0)) >> 2];
          c[(e + 4) >> 2] = c[(i + ((f * 80) | 0) + 4) >> 2];
          c[(e + 8) >> 2] = c[(i + ((f * 80) | 0) + 8) >> 2];
          c[(e + 12) >> 2] = c[(i + ((f * 80) | 0) + 12) >> 2];
          c[(e + 16) >> 2] = c[(i + ((f * 80) | 0) + 16) >> 2];
          c[(e + 20) >> 2] = c[(i + ((f * 80) | 0) + 20) >> 2];
          c[(e + 24) >> 2] = c[(i + ((f * 80) | 0) + 24) >> 2];
          c[(e + 28) >> 2] = c[(i + ((f * 80) | 0) + 28) >> 2];
          c[(e + 32) >> 2] = c[(i + ((f * 80) | 0) + 32) >> 2];
          c[(e + 36) >> 2] = c[(i + ((f * 80) | 0) + 36) >> 2];
          c[(e + 40) >> 2] = c[(i + ((f * 80) | 0) + 40) >> 2];
          c[(e + 44) >> 2] = c[(i + ((f * 80) | 0) + 44) >> 2];
          c[(e + 48) >> 2] = c[(i + ((f * 80) | 0) + 48) >> 2];
          c[(e + 52) >> 2] = c[(i + ((f * 80) | 0) + 52) >> 2];
          c[(e + 56) >> 2] = c[(i + ((f * 80) | 0) + 56) >> 2];
          c[(e + 60) >> 2] = c[(i + ((f * 80) | 0) + 60) >> 2];
          f = (f + 1) | 0;
          if ((f | 0) >= (c[(b + 16) >> 2] | 0)) {
            e = d;
            break;
          } else e = (e + 76) | 0;
        }
      } else e = d;
      yb[c[((c[e >> 2] | 0) + 20) >> 2] & 31](
        d,
        g,
        16362,
        1497453121,
        c[(g + 8) >> 2] | 0
      );
      return 16387;
    }
    function Mf(a, b, d, e) {
      a = a | 0;
      b = b | 0;
      d = d | 0;
      e = e | 0;
      var f = 0,
        h = 0.0,
        j = 0.0,
        k = 0.0,
        l = 0,
        m = 0,
        n = 0.0,
        o = 0.0,
        p = 0.0,
        q = 0.0;
      f = i;
      i = (i + 256) | 0;
      c[(f + 32) >> 2] = 5736;
      l = (f + 32 + 36) | 0;
      c[l >> 2] = c[b >> 2];
      c[(l + 4) >> 2] = c[(b + 4) >> 2];
      c[(l + 8) >> 2] = c[(b + 8) >> 2];
      c[(l + 12) >> 2] = c[(b + 12) >> 2];
      m = (f + 32 + 52) | 0;
      c[m >> 2] = c[d >> 2];
      c[(m + 4) >> 2] = c[(d + 4) >> 2];
      c[(m + 8) >> 2] = c[(d + 8) >> 2];
      c[(m + 12) >> 2] = c[(d + 12) >> 2];
      c[(f + 32 + 212) >> 2] = a;
      c[(f + 32 + 216) >> 2] = e;
      c[(f + 32 + 68) >> 2] = 1065353216;
      c[(f + 32 + 72) >> 2] = 0;
      c[(f + 32 + 72 + 4) >> 2] = 0;
      c[(f + 32 + 72 + 8) >> 2] = 0;
      c[(f + 32 + 72 + 12) >> 2] = 0;
      c[(f + 32 + 88) >> 2] = 1065353216;
      c[(f + 32 + 92) >> 2] = 0;
      c[(f + 32 + 92 + 4) >> 2] = 0;
      c[(f + 32 + 92 + 8) >> 2] = 0;
      c[(f + 32 + 92 + 12) >> 2] = 0;
      c[(f + 32 + 108) >> 2] = 1065353216;
      c[(f + 32 + 112) >> 2] = 0;
      c[(f + 32 + 116) >> 2] = c[l >> 2];
      c[(f + 32 + 116 + 4) >> 2] = c[(l + 4) >> 2];
      c[(f + 32 + 116 + 8) >> 2] = c[(l + 8) >> 2];
      c[(f + 32 + 116 + 12) >> 2] = c[(l + 12) >> 2];
      c[(f + 32 + 132) >> 2] = 1065353216;
      c[(f + 32 + 136) >> 2] = 0;
      c[(f + 32 + 136 + 4) >> 2] = 0;
      c[(f + 32 + 136 + 8) >> 2] = 0;
      c[(f + 32 + 136 + 12) >> 2] = 0;
      c[(f + 32 + 152) >> 2] = 1065353216;
      c[(f + 32 + 156) >> 2] = 0;
      c[(f + 32 + 156 + 4) >> 2] = 0;
      c[(f + 32 + 156 + 8) >> 2] = 0;
      c[(f + 32 + 156 + 12) >> 2] = 0;
      c[(f + 32 + 172) >> 2] = 1065353216;
      c[(f + 32 + 176) >> 2] = 0;
      c[(f + 32 + 180) >> 2] = c[d >> 2];
      c[(f + 32 + 180 + 4) >> 2] = c[(d + 4) >> 2];
      c[(f + 32 + 180 + 8) >> 2] = c[(d + 8) >> 2];
      c[(f + 32 + 180 + 12) >> 2] = c[(d + 12) >> 2];
      n = +g[d >> 2] - +g[b >> 2];
      k = +g[(d + 4) >> 2] - +g[(b + 4) >> 2];
      j = +g[(d + 8) >> 2] - +g[(b + 8) >> 2];
      h = 1.0 / +O(+(n * n + k * k + j * j));
      q = n * h == 0.0 ? 999999984306749440.0 : 1.0 / (n * h);
      g[(f + 32 + 4) >> 2] = q;
      p = k * h == 0.0 ? 999999984306749440.0 : 1.0 / (k * h);
      g[(f + 32 + 8) >> 2] = p;
      o = j * h == 0.0 ? 999999984306749440.0 : 1.0 / (j * h);
      g[(f + 32 + 12) >> 2] = o;
      c[(f + 32 + 20) >> 2] = (q < 0.0) & 1;
      c[(f + 32 + 24) >> 2] = (p < 0.0) & 1;
      c[(f + 32 + 28) >> 2] = (o < 0.0) & 1;
      g[(f + 32 + 32) >> 2] =
        n * h * (+g[m >> 2] - +g[l >> 2]) +
        k * h * (+g[(f + 32 + 56) >> 2] - +g[(f + 32 + 40) >> 2]) +
        j * h * (+g[(f + 32 + 60) >> 2] - +g[(f + 32 + 44) >> 2]);
      a = c[(a + 68) >> 2] | 0;
      e = c[((c[a >> 2] | 0) + 24) >> 2] | 0;
      c[(f + 16) >> 2] = 0;
      c[(f + 16 + 4) >> 2] = 0;
      c[(f + 16 + 8) >> 2] = 0;
      c[(f + 16 + 12) >> 2] = 0;
      c[f >> 2] = 0;
      c[(f + 4) >> 2] = 0;
      c[(f + 8) >> 2] = 0;
      c[(f + 12) >> 2] = 0;
      Qb[e & 7](a, b, d, (f + 32) | 0, (f + 16) | 0, f);
      i = f;
      return;
    }
    function Nf(b, d, e, f, h, j, k, l, m) {
      b = b | 0;
      d = d | 0;
      e = e | 0;
      f = f | 0;
      h = h | 0;
      j = j | 0;
      k = k | 0;
      l = l | 0;
      m = m | 0;
      var n = 0,
        o = 0,
        p = 0,
        q = 0;
      q = i;
      i = (i + 80) | 0;
      g[(q + 16 + 60) >> 2] = 0.0;
      g[(q + 16 + 8) >> 2] = 0.0;
      g[(q + 16 + 12) >> 2] = 0.10000000149011612;
      g[(q + 16 + 16) >> 2] = 300.0;
      g[(q + 16) >> 2] = 1.0;
      g[(q + 16 + 4) >> 2] = -1.0;
      g[(q + 16 + 28) >> 2] = 0.0;
      g[(q + 16 + 32) >> 2] = 0.20000000298023224;
      g[(q + 16 + 36) >> 2] = 0.0;
      g[(q + 16 + 40) >> 2] = 0.0;
      g[(q + 16 + 20) >> 2] = 1.0;
      g[(q + 16 + 24) >> 2] = 0.5;
      c[(q + 16 + 56) >> 2] = 0;
      g[(q + 16 + 48) >> 2] = 0.0;
      a[(q + 16 + 44) >> 0] = 0;
      p = 0;
      do {
        n = c[(b + 856 + (p << 2)) >> 2] | 0;
        o = a[(b + 788 + p) >> 0] | 0;
        if (!(((n | 0) == 0) & ((o << 24) >> 24 == 0))) {
          g[(q + 16 + 40) >> 2] = 0.0;
          c[(q + 16 + 56) >> 2] = n;
          c[(q + 16 + 52) >> 2] = c[(b + 840 + (p << 2)) >> 2];
          c[(q + 16 + 48) >> 2] = c[(b + 824 + (p << 2)) >> 2];
          c[(q + 16 + 20) >> 2] = c[(b + 732) >> 2];
          a[(q + 16 + 44) >> 0] = o;
          c[(q + 16 + 4) >> 2] = c[(b + 696 + (p << 2)) >> 2];
          c[(q + 16 + 24) >> 2] = c[(b + 728) >> 2];
          c[(q + 16) >> 2] = c[(b + 680 + (p << 2)) >> 2];
          g[(q + 16 + 16) >> 2] = 0.0;
          c[(q + 16 + 12) >> 2] = c[(b + 808 + (p << 2)) >> 2];
          c[(q + 16 + 8) >> 2] = c[(b + 792 + (p << 2)) >> 2];
          c[q >> 2] = c[(b + 1064 + (p << 2)) >> 2];
          c[(q + 4) >> 2] = c[(b + 1080 + (p << 2)) >> 2];
          c[(q + 8) >> 2] = c[(b + 1096 + (p << 2)) >> 2];
          g[(q + 12) >> 2] = 0.0;
          o = c[(b + 1304) >> 2] >> (p * 3);
          if (!(o & 1)) n = c[(d + 32) >> 2] | 0;
          else n = (b + 740 + (p << 2)) | 0;
          c[(q + 16 + 28) >> 2] = c[n >> 2];
          if (!(o & 2)) n = c[(d + 32) >> 2] | 0;
          else n = (b + 772 + (p << 2)) | 0;
          c[(q + 16 + 36) >> 2] = c[n >> 2];
          c[(q + 16 + 32) >> 2] =
            c[
              (((o & 4) | 0) == 0 ? (d + 4) | 0 : (b + 756 + (p << 2)) | 0) >> 2
            ];
          if (!(a[(b + 1301) >> 0] | 0))
            n = Dd(b, (q + 16) | 0, f, h, j, k, l, m, d, e, q, 0, 0) | 0;
          else {
            o = (p + 1) | 0;
            if (!(c[(b + 868 + (((o | 0) == 3 ? 0 : o) << 6) + 56) >> 2] | 0))
              n = 1;
            else
              n =
                ((c[(b + 868 + ((((p + 2) | 0) % 3 | 0) << 6) + 56) >> 2] |
                  0) ==
                  0) &
                1;
            n = Dd(b, (q + 16) | 0, f, h, j, k, l, m, d, e, q, 0, n) | 0;
          }
          e = (n + e) | 0;
        }
        p = (p + 1) | 0;
      } while ((p | 0) != 3);
      i = q;
      return e | 0;
    }
    function Of(a, b, d, e, f) {
      a = a | 0;
      b = b | 0;
      d = d | 0;
      e = e | 0;
      f = f | 0;
      var h = 0,
        j = 0.0,
        k = 0.0,
        l = 0.0,
        m = 0.0,
        n = 0.0,
        o = 0.0,
        p = 0.0,
        q = 0.0,
        r = 0.0;
      h = i;
      i = (i + 128) | 0;
      if (!b) {
        i = h;
        return;
      }
      if (c[(b + 40) >> 2] | 0) {
        Of(a, c[(b + 36) >> 2] | 0, (d + 1) | 0, e, f);
        Of(a, c[(b + 40) >> 2] | 0, (d + 1) | 0, e, f);
      }
      if ((d | 0) < 0) {
        i = h;
        return;
      }
      m = +g[b >> 2];
      r = +g[(b + 16) >> 2];
      k = +g[(b + 4) >> 2];
      q = +g[(b + 20) >> 2];
      j = +g[(b + 8) >> 2];
      p = +g[(b + 24) >> 2];
      l = (m + r) * 0.5 - (r - m) * 0.5;
      n = (k + q) * 0.5 - (q - k) * 0.5;
      o = (j + p) * 0.5 - (p - j) * 0.5;
      m = (m + r) * 0.5 + (r - m) * 0.5;
      k = (k + q) * 0.5 + (q - k) * 0.5;
      j = (j + p) * 0.5 + (p - j) * 0.5;
      b = (c[(b + 40) >> 2] | 0) == 0 ? f : e;
      g[h >> 2] = l;
      g[(h + 4) >> 2] = n;
      g[(h + 8) >> 2] = o;
      g[(h + 12) >> 2] = 0.0;
      g[(h + 16) >> 2] = m;
      g[(h + 20) >> 2] = n;
      g[(h + 24) >> 2] = o;
      g[(h + 28) >> 2] = 0.0;
      g[(h + 32) >> 2] = m;
      g[(h + 36) >> 2] = k;
      g[(h + 40) >> 2] = o;
      g[(h + 44) >> 2] = 0.0;
      g[(h + 48) >> 2] = l;
      g[(h + 52) >> 2] = k;
      g[(h + 56) >> 2] = o;
      g[(h + 60) >> 2] = 0.0;
      g[(h + 64) >> 2] = l;
      g[(h + 68) >> 2] = n;
      g[(h + 72) >> 2] = j;
      g[(h + 76) >> 2] = 0.0;
      g[(h + 80) >> 2] = m;
      g[(h + 84) >> 2] = n;
      g[(h + 88) >> 2] = j;
      g[(h + 92) >> 2] = 0.0;
      g[(h + 96) >> 2] = m;
      g[(h + 100) >> 2] = k;
      g[(h + 104) >> 2] = j;
      g[(h + 108) >> 2] = 0.0;
      g[(h + 112) >> 2] = l;
      g[(h + 116) >> 2] = k;
      g[(h + 120) >> 2] = j;
      g[(h + 124) >> 2] = 0.0;
      mc[c[((c[a >> 2] | 0) + 8) >> 2] & 127](a, h, (h + 16) | 0, b);
      mc[c[((c[a >> 2] | 0) + 8) >> 2] & 127](a, (h + 16) | 0, (h + 32) | 0, b);
      mc[c[((c[a >> 2] | 0) + 8) >> 2] & 127](a, (h + 32) | 0, (h + 48) | 0, b);
      mc[c[((c[a >> 2] | 0) + 8) >> 2] & 127](a, (h + 48) | 0, h, b);
      mc[c[((c[a >> 2] | 0) + 8) >> 2] & 127](a, (h + 64) | 0, (h + 80) | 0, b);
      mc[c[((c[a >> 2] | 0) + 8) >> 2] & 127](a, (h + 80) | 0, (h + 96) | 0, b);
      mc[c[((c[a >> 2] | 0) + 8) >> 2] & 127](
        a,
        (h + 96) | 0,
        (h + 112) | 0,
        b
      );
      mc[c[((c[a >> 2] | 0) + 8) >> 2] & 127](
        a,
        (h + 112) | 0,
        (h + 64) | 0,
        b
      );
      mc[c[((c[a >> 2] | 0) + 8) >> 2] & 127](a, h, (h + 64) | 0, b);
      mc[c[((c[a >> 2] | 0) + 8) >> 2] & 127](a, (h + 16) | 0, (h + 80) | 0, b);
      mc[c[((c[a >> 2] | 0) + 8) >> 2] & 127](a, (h + 32) | 0, (h + 96) | 0, b);
      mc[c[((c[a >> 2] | 0) + 8) >> 2] & 127](
        a,
        (h + 48) | 0,
        (h + 112) | 0,
        b
      );
      i = h;
      return;
    }
    function Pf(a, b, c, d, e, f, h, i) {
      a = a | 0;
      b = +b;
      c = +c;
      d = +d;
      e = e | 0;
      f = +f;
      h = +h;
      i = +i;
      var j = 0.0,
        k = 0.0,
        l = 0.0,
        m = 0.0,
        n = 0.0,
        o = 0.0,
        p = 0.0,
        q = 0.0,
        r = 0.0,
        s = 0.0,
        t = 0.0,
        u = 0.0,
        v = 0.0,
        w = 0.0,
        x = 0.0,
        y = 0.0,
        z = 0.0;
      z = +g[e >> 2];
      y = +g[(e + 16) >> 2];
      x = +g[(e + 32) >> 2];
      w = +g[(e + 4) >> 2];
      v = +g[(e + 20) >> 2];
      u = +g[(e + 36) >> 2];
      t = +g[(e + 8) >> 2];
      s = +g[(e + 24) >> 2];
      r = +g[(e + 40) >> 2];
      j =
        d -
        ((z * 0.0 + y * -i + x * h) * 0.0 +
          (w * 0.0 + v * -i + u * h) * i +
          (t * 0.0 + s * -i + r * h) * -h) +
        c;
      o =
        0.0 -
        ((z * 0.0 + y * -i + x * h) * -i +
          (w * 0.0 + v * -i + u * h) * 0.0 +
          (t * 0.0 + s * -i + r * h) * f) +
        0.0;
      l =
        0.0 -
        ((z * 0.0 + y * -i + x * h) * h +
          (w * 0.0 + v * -i + u * h) * -f +
          (t * 0.0 + s * -i + r * h) * 0.0) +
        0.0;
      m =
        0.0 -
        ((z * i + y * 0.0 + x * -f) * 0.0 +
          (w * i + v * 0.0 + u * -f) * i +
          (t * i + s * 0.0 + r * -f) * -h) +
        0.0;
      n =
        d -
        ((z * i + y * 0.0 + x * -f) * -i +
          (w * i + v * 0.0 + u * -f) * 0.0 +
          (t * i + s * 0.0 + r * -f) * f) +
        c;
      k =
        0.0 -
        ((z * i + y * 0.0 + x * -f) * h +
          (w * i + v * 0.0 + u * -f) * -f +
          (t * i + s * 0.0 + r * -f) * 0.0) +
        0.0;
      p =
        0.0 -
        ((z * -h + y * f + x * 0.0) * 0.0 +
          (w * -h + v * f + u * 0.0) * i +
          (t * -h + s * f + r * 0.0) * -h) +
        0.0;
      q =
        0.0 -
        ((z * -h + y * f + x * 0.0) * -i +
          (w * -h + v * f + u * 0.0) * 0.0 +
          (t * -h + s * f + r * 0.0) * f) +
        0.0;
      h =
        d -
        ((z * -h + y * f + x * 0.0) * h +
          (w * -h + v * f + u * 0.0) * -f +
          (t * -h + s * f + r * 0.0) * 0.0) +
        c;
      i =
        1.0 /
        (l * (q * m - n * p) + (j * (n * h - k * q) + o * (k * p - h * m)));
      g[a >> 2] =
        (q * m - n * p) * i * 0.0 +
        ((1.0 / b) * (n * h - k * q) * i + (k * p - h * m) * i * 0.0);
      g[(a + 4) >> 2] =
        (p * o - q * j) * i * 0.0 +
        ((1.0 / b) * (q * l - h * o) * i + (h * j - p * l) * i * 0.0);
      g[(a + 8) >> 2] =
        (n * j - m * o) * i * 0.0 +
        ((1.0 / b) * (k * o - n * l) * i + (m * l - k * j) * i * 0.0);
      g[(a + 12) >> 2] = 0.0;
      g[(a + 16) >> 2] =
        (q * m - n * p) * i * 0.0 +
        ((n * h - k * q) * i * 0.0 + (1.0 / b) * (k * p - h * m) * i);
      g[(a + 20) >> 2] =
        (p * o - q * j) * i * 0.0 +
        ((q * l - h * o) * i * 0.0 + (1.0 / b) * (h * j - p * l) * i);
      g[(a + 24) >> 2] =
        (n * j - m * o) * i * 0.0 +
        ((k * o - n * l) * i * 0.0 + (1.0 / b) * (m * l - k * j) * i);
      g[(a + 28) >> 2] = 0.0;
      g[(a + 32) >> 2] =
        (1.0 / b) * (q * m - n * p) * i +
        ((n * h - k * q) * i * 0.0 + (k * p - h * m) * i * 0.0);
      g[(a + 36) >> 2] =
        (1.0 / b) * (p * o - q * j) * i +
        ((q * l - h * o) * i * 0.0 + (h * j - p * l) * i * 0.0);
      g[(a + 40) >> 2] =
        (1.0 / b) * (n * j - m * o) * i +
        ((k * o - n * l) * i * 0.0 + (m * l - k * j) * i * 0.0);
      g[(a + 44) >> 2] = 0.0;
      return;
    }
    function Qf(b, d, e, f, h, j) {
      b = b | 0;
      d = d | 0;
      e = e | 0;
      f = f | 0;
      h = h | 0;
      j = j | 0;
      var k = 0,
        l = 0,
        m = 0,
        n = 0,
        o = 0,
        p = 0,
        q = 0,
        r = 0,
        s = 0.0,
        t = 0.0,
        u = 0.0,
        v = 0.0,
        w = 0.0,
        x = 0.0,
        y = 0.0,
        z = 0.0,
        A = 0.0;
      r = i;
      i = (i + 96) | 0;
      m = r;
      n = (m + 96) | 0;
      do {
        c[m >> 2] = 0;
        m = (m + 4) | 0;
      } while ((m | 0) < (n | 0));
      if (!j) q = c[c[(b + 880) >> 2] >> 2] | 0;
      else q = j;
      j = c[(b + 772) >> 2] | 0;
      if (
        (j | 0) == (c[(b + 776) >> 2] | 0)
          ? ((p = j | 0 ? j << 1 : 1), (j | 0) < (p | 0))
          : 0
      ) {
        if (!p) o = 0;
        else {
          c[6435] = (c[6435] | 0) + 1;
          j = yc((((p * 104) | 3) + 16) | 0) | 0;
          if (!j) j = 0;
          else {
            c[(((j + 4 + 15) & -16) + -4) >> 2] = j;
            j = (j + 4 + 15) & -16;
          }
          o = j;
          j = c[(b + 772) >> 2] | 0;
        }
        if ((j | 0) > 0) {
          k = 0;
          do {
            m = (o + ((k * 104) | 0)) | 0;
            l = ((c[(b + 780) >> 2] | 0) + ((k * 104) | 0)) | 0;
            n = (m + 104) | 0;
            do {
              c[m >> 2] = c[l >> 2];
              m = (m + 4) | 0;
              l = (l + 4) | 0;
            } while ((m | 0) < (n | 0));
            k = (k + 1) | 0;
          } while ((k | 0) != (j | 0));
        }
        j = c[(b + 780) >> 2] | 0;
        if (j | 0) {
          if (a[(b + 784) >> 0] | 0) {
            c[6436] = (c[6436] | 0) + 1;
            hd(c[(j + -4) >> 2] | 0);
          }
          c[(b + 780) >> 2] = 0;
        }
        a[(b + 784) >> 0] = 1;
        c[(b + 780) >> 2] = o;
        c[(b + 776) >> 2] = p;
        j = c[(b + 772) >> 2] | 0;
      }
      m = c[(b + 780) >> 2] | 0;
      c[(m + ((j * 104) | 0)) >> 2] = 0;
      c[(m + ((j * 104) | 0) + 4) >> 2] = q;
      m = (m + ((j * 104) | 0) + 8) | 0;
      l = r;
      n = (m + 96) | 0;
      do {
        c[m >> 2] = c[l >> 2];
        m = (m + 4) | 0;
        l = (l + 4) | 0;
      } while ((m | 0) < (n | 0));
      q = c[(b + 772) >> 2] | 0;
      c[(b + 772) >> 2] = q + 1;
      p = c[(b + 780) >> 2] | 0;
      l = c[(b + 720) >> 2] | 0;
      c[(p + ((q * 104) | 0) + 8) >> 2] = l + ((d * 104) | 0);
      o = c[(b + 720) >> 2] | 0;
      c[(p + ((q * 104) | 0) + 12) >> 2] = o + ((e * 104) | 0);
      m = c[(b + 720) >> 2] | 0;
      c[(p + ((q * 104) | 0) + 16) >> 2] = m + ((f * 104) | 0);
      n = c[(b + 720) >> 2] | 0;
      c[(p + ((q * 104) | 0) + 20) >> 2] = n + ((h * 104) | 0);
      z = +g[(l + ((d * 104) | 0) + 8) >> 2];
      w = +g[(l + ((d * 104) | 0) + 12) >> 2];
      A = +g[(l + ((d * 104) | 0) + 16) >> 2];
      t = +g[(m + ((f * 104) | 0) + 8) >> 2] - z;
      y = +g[(m + ((f * 104) | 0) + 12) >> 2] - w;
      v = +g[(m + ((f * 104) | 0) + 16) >> 2] - A;
      u = +g[(n + ((h * 104) | 0) + 8) >> 2] - z;
      x = +g[(n + ((h * 104) | 0) + 12) >> 2] - w;
      s = +g[(n + ((h * 104) | 0) + 16) >> 2] - A;
      g[(p + ((q * 104) | 0) + 24) >> 2] =
        (+g[(o + ((e * 104) | 0) + 16) >> 2] - A) * (t * x - y * u) +
        ((+g[(o + ((e * 104) | 0) + 8) >> 2] - z) * (y * s - v * x) +
          (+g[(o + ((e * 104) | 0) + 12) >> 2] - w) * (v * u - t * s));
      a[(b + 924) >> 0] = 1;
      i = r;
      return;
    }
    function Rf(b, d, e, f, h) {
      b = b | 0;
      d = d | 0;
      e = e | 0;
      f = f | 0;
      h = h | 0;
      var j = 0,
        k = 0,
        l = 0,
        m = 0,
        n = 0,
        o = 0,
        p = 0,
        q = 0,
        r = 0.0,
        s = 0.0,
        t = 0.0;
      q = i;
      i = (i + 48) | 0;
      p = c[(b + 720) >> 2] | 0;
      a: do
        if (h ? ((l = c[(b + 732) >> 2] | 0), (l | 0) > 0) : 0) {
          j = c[(b + 740) >> 2] | 0;
          k = 0;
          while (1) {
            h = c[(j + ((k * 52) | 0) + 8) >> 2] | 0;
            if (
              (h | 0) == ((p + ((d * 104) | 0)) | 0)
                ? (c[(j + ((k * 52) | 0) + 12) >> 2] | 0) ==
                  ((p + ((e * 104) | 0)) | 0)
                : 0
            ) {
              h = 25;
              break;
            }
            if (
              (h | 0) == ((p + ((e * 104) | 0)) | 0)
                ? (c[(j + ((k * 52) | 0) + 12) >> 2] | 0) ==
                  ((p + ((d * 104) | 0)) | 0)
                : 0
            ) {
              h = 25;
              break;
            }
            k = (k + 1) | 0;
            if ((k | 0) >= (l | 0)) break a;
          }
          if ((h | 0) == 25) {
            i = q;
            return;
          }
        }
      while (0);
      l = q;
      m = (l + 44) | 0;
      do {
        c[l >> 2] = 0;
        l = (l + 4) | 0;
      } while ((l | 0) < (m | 0));
      if (!f) n = c[c[(b + 880) >> 2] >> 2] | 0;
      else n = f;
      h = c[(b + 732) >> 2] | 0;
      if (
        (h | 0) == (c[(b + 736) >> 2] | 0)
          ? ((o = h | 0 ? h << 1 : 1), (h | 0) < (o | 0))
          : 0
      ) {
        if (!o) f = 0;
        else {
          c[6435] = (c[6435] | 0) + 1;
          h = yc((((o * 52) | 3) + 16) | 0) | 0;
          if (!h) h = 0;
          else {
            c[(((h + 4 + 15) & -16) + -4) >> 2] = h;
            h = (h + 4 + 15) & -16;
          }
          f = h;
          h = c[(b + 732) >> 2] | 0;
        }
        if ((h | 0) > 0) {
          j = 0;
          do {
            l = (f + ((j * 52) | 0)) | 0;
            k = ((c[(b + 740) >> 2] | 0) + ((j * 52) | 0)) | 0;
            m = (l + 52) | 0;
            do {
              c[l >> 2] = c[k >> 2];
              l = (l + 4) | 0;
              k = (k + 4) | 0;
            } while ((l | 0) < (m | 0));
            j = (j + 1) | 0;
          } while ((j | 0) != (h | 0));
        }
        h = c[(b + 740) >> 2] | 0;
        if (h | 0) {
          if (a[(b + 744) >> 0] | 0) {
            c[6436] = (c[6436] | 0) + 1;
            hd(c[(h + -4) >> 2] | 0);
          }
          c[(b + 740) >> 2] = 0;
        }
        a[(b + 744) >> 0] = 1;
        c[(b + 740) >> 2] = f;
        c[(b + 736) >> 2] = o;
        h = c[(b + 732) >> 2] | 0;
      }
      l = c[(b + 740) >> 2] | 0;
      c[(l + ((h * 52) | 0)) >> 2] = 0;
      c[(l + ((h * 52) | 0) + 4) >> 2] = n;
      l = (l + ((h * 52) | 0) + 8) | 0;
      k = q;
      m = (l + 44) | 0;
      do {
        c[l >> 2] = c[k >> 2];
        l = (l + 4) | 0;
        k = (k + 4) | 0;
      } while ((l | 0) < (m | 0));
      o = c[(b + 732) >> 2] | 0;
      c[(b + 732) >> 2] = o + 1;
      n = c[(b + 740) >> 2] | 0;
      c[(n + ((o * 52) | 0) + 8) >> 2] = p + ((d * 104) | 0);
      c[(n + ((o * 52) | 0) + 12) >> 2] = p + ((e * 104) | 0);
      t =
        +g[(p + ((d * 104) | 0) + 8) >> 2] - +g[(p + ((e * 104) | 0) + 8) >> 2];
      s =
        +g[(p + ((d * 104) | 0) + 12) >> 2] -
        +g[(p + ((e * 104) | 0) + 12) >> 2];
      r =
        +g[(p + ((d * 104) | 0) + 16) >> 2] -
        +g[(p + ((e * 104) | 0) + 16) >> 2];
      g[(n + ((o * 52) | 0) + 16) >> 2] = +O(+(t * t + s * s + r * r));
      a[(b + 924) >> 0] = 1;
      i = q;
      return;
    }
    function Sf(b, d, e, f) {
      b = b | 0;
      d = d | 0;
      e = e | 0;
      f = f | 0;
      var h = 0.0;
      f = i;
      i = (i + 784) | 0;
      c[(f + 712) >> 2] = 1065353216;
      c[(f + 712 + 4) >> 2] = 0;
      c[(f + 712 + 4 + 4) >> 2] = 0;
      c[(f + 712 + 4 + 8) >> 2] = 0;
      c[(f + 712 + 4 + 12) >> 2] = 0;
      c[(f + 712 + 20) >> 2] = 1065353216;
      c[(f + 712 + 24) >> 2] = 0;
      c[(f + 712 + 24 + 4) >> 2] = 0;
      c[(f + 712 + 24 + 8) >> 2] = 0;
      c[(f + 712 + 24 + 12) >> 2] = 0;
      c[(f + 712 + 40) >> 2] = 1065353216;
      e = (f + 712 + 44) | 0;
      c[e >> 2] = 0;
      c[(e + 4) >> 2] = 0;
      c[(e + 8) >> 2] = 0;
      c[(e + 12) >> 2] = 0;
      c[(e + 16) >> 2] = 0;
      c[(f + 536) >> 2] = 3708;
      c[(f + 536 + 168) >> 2] = 0;
      g[(f + 536 + 172) >> 2] = 0.0;
      c[(f + 536 + 164) >> 2] = c[(b + 200) >> 2];
      e = c[(b + 196) >> 2] | 0;
      c[(f + 480 + 8) >> 2] = 0;
      c[(f + 480 + 12) >> 2] = 1065353216;
      c[(f + 480 + 16) >> 2] = 1065353216;
      c[(f + 480 + 20) >> 2] = 1065353216;
      g[(f + 480 + 24) >> 2] = 0.0;
      c[(f + 480) >> 2] = 6672;
      c[(f + 480 + 4) >> 2] = 8;
      c[(f + 480 + 28) >> 2] = e;
      c[(f + 480 + 44) >> 2] = e;
      c[(f + 376 + 8) >> 2] = 0;
      c[(f + 376 + 12) >> 2] = 1065353216;
      c[(f + 376 + 16) >> 2] = 1065353216;
      c[(f + 376 + 20) >> 2] = 1065353216;
      g[(f + 376 + 24) >> 2] = 0.0;
      g[(f + 376 + 44) >> 2] = 0.03999999910593033;
      c[(f + 376 + 52) >> 2] = 0;
      c[(f + 376) >> 2] = 3736;
      c[(f + 376 + 4) >> 2] = 1;
      c[(f + 376 + 56) >> 2] = c[d >> 2];
      c[(f + 376 + 56 + 4) >> 2] = c[(d + 4) >> 2];
      c[(f + 376 + 56 + 8) >> 2] = c[(d + 8) >> 2];
      c[(f + 376 + 56 + 12) >> 2] = c[(d + 12) >> 2];
      c[(f + 376 + 72) >> 2] = c[(d + 16) >> 2];
      c[(f + 376 + 72 + 4) >> 2] = c[(d + 16 + 4) >> 2];
      c[(f + 376 + 72 + 8) >> 2] = c[(d + 16 + 8) >> 2];
      c[(f + 376 + 72 + 12) >> 2] = c[(d + 16 + 12) >> 2];
      c[(f + 376 + 88) >> 2] = c[(d + 32) >> 2];
      c[(f + 376 + 88 + 4) >> 2] = c[(d + 32 + 4) >> 2];
      c[(f + 376 + 88 + 8) >> 2] = c[(d + 32 + 8) >> 2];
      c[(f + 376 + 88 + 12) >> 2] = c[(d + 32 + 12) >> 2];
      g[(f + 16 + 308) >> 2] = 9.999999747378752e-5;
      a[(f + 16 + 332) >> 0] = 0;
      c[f >> 2] = 4960;
      c[(f + 4) >> 2] = f + 16;
      c[(f + 8) >> 2] = f + 480;
      c[(f + 12) >> 2] = f + 376;
      if (
        od(
          f,
          (b + 4) | 0,
          (b + 68) | 0,
          (f + 712) | 0,
          (f + 712) | 0,
          (f + 536) | 0
        ) | 0
          ? ((h = +g[(f + 536 + 164) >> 2]), +g[(b + 200) >> 2] > h)
          : 0
      )
        g[(b + 200) >> 2] = h;
      c[(f + 376) >> 2] = 7124;
      e = c[(f + 376 + 52) >> 2] | 0;
      if (!e) {
        i = f;
        return;
      }
      Ab[c[c[e >> 2] >> 2] & 255](e);
      e = c[(f + 376 + 52) >> 2] | 0;
      if (!e) {
        i = f;
        return;
      }
      c[6436] = (c[6436] | 0) + 1;
      hd(c[(e + -4) >> 2] | 0);
      i = f;
      return;
    }
    function Tf(d, e, f, g, h, j, k, l, m) {
      d = d | 0;
      e = e | 0;
      f = f | 0;
      g = g | 0;
      h = h | 0;
      j = j | 0;
      k = k | 0;
      l = l | 0;
      m = m | 0;
      var n = 0,
        o = 0;
      o = i;
      i = (i + 48) | 0;
      c[6435] = (c[6435] | 0) + 1;
      g = yc(83) | 0;
      if (!g) n = 0;
      else {
        c[(((g + 4 + 15) & -16) + -4) >> 2] = g;
        n = (g + 4 + 15) & -16;
      }
      c[n >> 2] = h;
      b[(n + 4) >> 1] = j;
      b[(n + 6) >> 1] = k;
      j = (n + 16) | 0;
      c[j >> 2] = c[e >> 2];
      c[(j + 4) >> 2] = c[(e + 4) >> 2];
      c[(j + 8) >> 2] = c[(e + 8) >> 2];
      c[(j + 12) >> 2] = c[(e + 12) >> 2];
      j = (n + 32) | 0;
      c[j >> 2] = c[f >> 2];
      c[(j + 4) >> 2] = c[(f + 4) >> 2];
      c[(j + 8) >> 2] = c[(f + 8) >> 2];
      c[(j + 12) >> 2] = c[(f + 12) >> 2];
      c[(n + 8) >> 2] = 0;
      j = (n + 56) | 0;
      c[j >> 2] = 0;
      k = (n + 52) | 0;
      c[k >> 2] = 0;
      c[(o + 16) >> 2] = c[e >> 2];
      c[(o + 16 + 4) >> 2] = c[(e + 4) >> 2];
      c[(o + 16 + 8) >> 2] = c[(e + 8) >> 2];
      c[(o + 16 + 12) >> 2] = c[(e + 12) >> 2];
      c[(o + 16 + 16) >> 2] = c[f >> 2];
      c[(o + 16 + 16 + 4) >> 2] = c[(f + 4) >> 2];
      c[(o + 16 + 16 + 8) >> 2] = c[(f + 8) >> 2];
      c[(o + 16 + 16 + 12) >> 2] = c[(f + 12) >> 2];
      c[(n + 60) >> 2] = c[(d + 144) >> 2];
      g = ((c[(d + 188) >> 2] | 0) + 1) | 0;
      c[(d + 188) >> 2] = g;
      c[(n + 12) >> 2] = g;
      g = c[(d + 8) >> 2] | 0;
      if (!g) {
        c[6435] = (c[6435] | 0) + 1;
        g = yc(63) | 0;
        if (!g) g = 0;
        else {
          c[(((g + 4 + 15) & -16) + -4) >> 2] = g;
          g = (g + 4 + 15) & -16;
        }
        l = g;
        m = (l + 44) | 0;
        do {
          c[l >> 2] = 0;
          l = (l + 4) | 0;
        } while ((l | 0) < (m | 0));
      } else c[(d + 8) >> 2] = 0;
      c[(g + 32) >> 2] = 0;
      c[(g + 36) >> 2] = n;
      c[(g + 40) >> 2] = 0;
      c[g >> 2] = c[(o + 16) >> 2];
      c[(g + 4) >> 2] = c[(o + 16 + 4) >> 2];
      c[(g + 8) >> 2] = c[(o + 16 + 8) >> 2];
      c[(g + 12) >> 2] = c[(o + 16 + 12) >> 2];
      c[(g + 16) >> 2] = c[(o + 16 + 16) >> 2];
      c[(g + 20) >> 2] = c[(o + 16 + 20) >> 2];
      c[(g + 24) >> 2] = c[(o + 16 + 24) >> 2];
      c[(g + 28) >> 2] = c[(o + 16 + 28) >> 2];
      lf((d + 4) | 0, c[(d + 4) >> 2] | 0, g);
      c[(d + 16) >> 2] = (c[(d + 16) >> 2] | 0) + 1;
      c[(n + 48) >> 2] = g;
      l = (d + 124 + (c[(d + 144) >> 2] << 2)) | 0;
      c[k >> 2] = 0;
      c[j >> 2] = c[l >> 2];
      g = c[l >> 2] | 0;
      if (g | 0) c[(g + 52) >> 2] = n;
      c[l >> 2] = n;
      if (a[(d + 193) >> 0] | 0) {
        i = o;
        return n | 0;
      }
      c[o >> 2] = 8904;
      c[(o + 4) >> 2] = d;
      c[(o + 8) >> 2] = n;
      bg(c[(d + 4) >> 2] | 0, (o + 16) | 0, o);
      bg(c[(d + 64) >> 2] | 0, (o + 16) | 0, o);
      i = o;
      return n | 0;
    }
    function Uf(b, d, e, f, h) {
      b = b | 0;
      d = d | 0;
      e = e | 0;
      f = f | 0;
      h = h | 0;
      var j = 0.0,
        k = 0.0,
        l = 0.0,
        m = 0.0,
        n = 0.0,
        o = 0.0,
        p = 0.0;
      f = i;
      i = (i + 608) | 0;
      p = +g[(d + 116) >> 2] - +g[(d + 52) >> 2];
      o = +g[(d + 120) >> 2] - +g[(d + 56) >> 2];
      n = +g[(d + 124) >> 2] - +g[(d + 60) >> 2];
      j = +g[(e + 116) >> 2] - +g[(e + 52) >> 2];
      k = +g[(e + 120) >> 2] - +g[(e + 56) >> 2];
      l = +g[(e + 124) >> 2] - +g[(e + 60) >> 2];
      m = +g[(d + 252) >> 2];
      if (
        p * p + o * o + n * n < m * m
          ? ((p = +g[(e + 252) >> 2]), j * j + k * k + l * l < p * p)
          : 0
      ) {
        p = 1.0;
        i = f;
        return +p;
      }
      b = c[(d + 192) >> 2] | 0;
      h = c[(e + 248) >> 2] | 0;
      c[(f + 552 + 8) >> 2] = 0;
      c[(f + 552 + 12) >> 2] = 1065353216;
      c[(f + 552 + 16) >> 2] = 1065353216;
      c[(f + 552 + 20) >> 2] = 1065353216;
      g[(f + 552 + 24) >> 2] = 0.0;
      c[(f + 552) >> 2] = 6672;
      c[(f + 552 + 4) >> 2] = 8;
      c[(f + 552 + 28) >> 2] = h;
      c[(f + 552 + 44) >> 2] = h;
      c[(f + 376) >> 2] = 3708;
      g[(f + 376 + 164) >> 2] = 999999984306749440.0;
      c[(f + 376 + 168) >> 2] = 0;
      g[(f + 376 + 172) >> 2] = 0.0;
      g[(f + 16 + 308) >> 2] = 9.999999747378752e-5;
      a[(f + 16 + 332) >> 0] = 0;
      c[f >> 2] = 9140;
      c[(f + 4) >> 2] = f + 16;
      c[(f + 8) >> 2] = b;
      c[(f + 12) >> 2] = f + 552;
      if (
        Ed(
          f,
          (d + 4) | 0,
          (d + 68) | 0,
          (e + 4) | 0,
          (e + 68) | 0,
          (f + 376) | 0
        ) | 0
      ) {
        j = +g[(f + 376 + 164) >> 2];
        if (+g[(d + 244) >> 2] > j) g[(d + 244) >> 2] = j;
        if (+g[(e + 244) >> 2] > j) g[(e + 244) >> 2] = j;
        if (j < 1.0) k = j;
        else k = 1.0;
      } else k = 1.0;
      b = c[(e + 192) >> 2] | 0;
      h = c[(d + 248) >> 2] | 0;
      c[(f + 552 + 8) >> 2] = 0;
      c[(f + 552 + 12) >> 2] = 1065353216;
      c[(f + 552 + 16) >> 2] = 1065353216;
      c[(f + 552 + 20) >> 2] = 1065353216;
      g[(f + 552 + 24) >> 2] = 0.0;
      c[(f + 552) >> 2] = 6672;
      c[(f + 552 + 4) >> 2] = 8;
      c[(f + 552 + 28) >> 2] = h;
      c[(f + 552 + 44) >> 2] = h;
      c[(f + 376) >> 2] = 3708;
      g[(f + 376 + 164) >> 2] = 999999984306749440.0;
      c[(f + 376 + 168) >> 2] = 0;
      g[(f + 376 + 172) >> 2] = 0.0;
      g[(f + 16 + 308) >> 2] = 9.999999747378752e-5;
      a[(f + 16 + 332) >> 0] = 0;
      c[f >> 2] = 9140;
      c[(f + 4) >> 2] = f + 16;
      c[(f + 8) >> 2] = f + 552;
      c[(f + 12) >> 2] = b;
      if (
        Ed(
          f,
          (d + 4) | 0,
          (d + 68) | 0,
          (e + 4) | 0,
          (e + 68) | 0,
          (f + 376) | 0
        ) | 0
      ) {
        j = +g[(f + 376 + 164) >> 2];
        if (+g[(d + 244) >> 2] > j) g[(d + 244) >> 2] = j;
        if (+g[(e + 244) >> 2] > j) g[(e + 244) >> 2] = j;
        if (!(k > j)) j = k;
      } else j = k;
      p = j;
      i = f;
      return +p;
    }
    function Vf(a, d) {
      a = a | 0;
      d = d | 0;
      var e = 0,
        f = 0,
        h = 0,
        j = 0.0,
        k = 0.0,
        l = 0.0,
        m = 0.0,
        n = 0.0,
        o = 0.0,
        p = 0.0,
        q = 0.0,
        r = 0.0,
        s = 0.0,
        t = 0.0,
        u = 0.0,
        v = 0.0,
        w = 0.0,
        x = 0.0,
        y = 0.0,
        z = 0.0,
        A = 0.0,
        B = 0.0,
        C = 0.0,
        D = 0.0,
        E = 0.0,
        F = 0.0,
        G = 0;
      e = i;
      i = (i + 128) | 0;
      G = c[((c[(a + 8) >> 2] | 0) + 24) >> 2] | 0;
      h = c[(G + ((d * 80) | 0) + 64) >> 2] | 0;
      f = c[(a + 12) >> 2] | 0;
      x = +g[(G + ((d * 80) | 0)) >> 2];
      D = +g[f >> 2];
      w = +g[(G + ((d * 80) | 0) + 16) >> 2];
      C = +g[(f + 4) >> 2];
      v = +g[(G + ((d * 80) | 0) + 32) >> 2];
      B = +g[(f + 8) >> 2];
      u = +g[(G + ((d * 80) | 0) + 4) >> 2];
      t = +g[(G + ((d * 80) | 0) + 20) >> 2];
      s = +g[(G + ((d * 80) | 0) + 36) >> 2];
      r = +g[(G + ((d * 80) | 0) + 8) >> 2];
      p = +g[(G + ((d * 80) | 0) + 24) >> 2];
      n = +g[(G + ((d * 80) | 0) + 40) >> 2];
      A = +g[(f + 16) >> 2];
      z = +g[(f + 20) >> 2];
      y = +g[(f + 24) >> 2];
      q = +g[(f + 32) >> 2];
      o = +g[(f + 36) >> 2];
      m = +g[(f + 40) >> 2];
      F = +g[(G + ((d * 80) | 0) + 48) >> 2];
      E = +g[(G + ((d * 80) | 0) + 52) >> 2];
      j = +g[(G + ((d * 80) | 0) + 56) >> 2];
      l = +g[(f + 48) >> 2] + (D * F + C * E + B * j);
      k = A * F + z * E + y * j + +g[(f + 52) >> 2];
      j = q * F + o * E + m * j + +g[(f + 56) >> 2];
      g[(e + 56) >> 2] = x * D + w * C + v * B;
      g[(e + 56 + 4) >> 2] = D * u + C * t + B * s;
      g[(e + 56 + 8) >> 2] = D * r + C * p + B * n;
      g[(e + 56 + 12) >> 2] = 0.0;
      g[(e + 56 + 16) >> 2] = x * A + w * z + v * y;
      g[(e + 56 + 20) >> 2] = u * A + t * z + s * y;
      g[(e + 56 + 24) >> 2] = r * A + p * z + n * y;
      g[(e + 56 + 28) >> 2] = 0.0;
      g[(e + 56 + 32) >> 2] = x * q + w * o + v * m;
      g[(e + 56 + 36) >> 2] = u * q + t * o + s * m;
      g[(e + 56 + 40) >> 2] = r * q + p * o + n * m;
      g[(e + 56 + 44) >> 2] = 0.0;
      g[(e + 56 + 48) >> 2] = l;
      g[(e + 56 + 52) >> 2] = k;
      g[(e + 56 + 56) >> 2] = j;
      g[(e + 56 + 60) >> 2] = 0.0;
      f = c[(a + 4) >> 2] | 0;
      c[(e + 32) >> 2] = 0;
      c[(e + 32 + 4) >> 2] = h;
      c[(e + 32 + 8) >> 2] = f;
      c[(e + 32 + 12) >> 2] = e + 56;
      c[(e + 32 + 16) >> 2] = -1;
      c[(e + 32 + 20) >> 2] = d;
      f = c[(a + 24) >> 2] | 0;
      g[(e + 4) >> 2] = 1.0;
      c[(e + 8) >> 2] = 0;
      b[(e + 12) >> 1] = 1;
      b[(e + 14) >> 1] = -1;
      c[(e + 16) >> 2] = 0;
      c[e >> 2] = 5840;
      c[(e + 20) >> 2] = f;
      c[(e + 24) >> 2] = d;
      c[(e + 4) >> 2] = c[(f + 4) >> 2];
      c[(e + 16) >> 2] = c[(f + 16) >> 2];
      bd(c[(a + 16) >> 2] | 0, c[(a + 20) >> 2] | 0, (e + 32) | 0, e);
      i = e;
      return;
    }
    function Wf(a, b, d, e) {
      a = a | 0;
      b = b | 0;
      d = d | 0;
      e = e | 0;
      var f = 0.0,
        h = 0,
        j = 0,
        k = 0,
        l = 0.0,
        m = 0.0,
        n = 0.0,
        o = 0.0,
        p = 0.0,
        q = 0;
      j = i;
      i = (i + 96) | 0;
      f = +Sb[c[((c[a >> 2] | 0) + 48) >> 2] & 15](a);
      h = 0;
      do {
        q = (j + 80 + (h << 2)) | 0;
        c[(j + 80) >> 2] = 0;
        c[(j + 80 + 4) >> 2] = 0;
        c[(j + 80 + 8) >> 2] = 0;
        c[(j + 80 + 12) >> 2] = 0;
        g[q >> 2] = 1.0;
        k = c[((c[a >> 2] | 0) + 64) >> 2] | 0;
        l = +g[(j + 80) >> 2];
        m = +g[(j + 80 + 4) >> 2];
        n = +g[(j + 80 + 8) >> 2];
        o =
          l * +g[(b + 4) >> 2] + m * +g[(b + 20) >> 2] + n * +g[(b + 36) >> 2];
        p =
          l * +g[(b + 8) >> 2] + m * +g[(b + 24) >> 2] + n * +g[(b + 40) >> 2];
        g[(j + 32) >> 2] =
          +g[b >> 2] * l + +g[(b + 16) >> 2] * m + +g[(b + 32) >> 2] * n;
        g[(j + 32 + 4) >> 2] = o;
        g[(j + 32 + 8) >> 2] = p;
        g[(j + 32 + 12) >> 2] = 0.0;
        ic[k & 127]((j + 64) | 0, a, (j + 32) | 0);
        p = +g[(j + 64) >> 2];
        o = +g[(j + 64 + 4) >> 2];
        n = +g[(j + 64 + 8) >> 2];
        m =
          p * +g[(b + 16) >> 2] +
          o * +g[(b + 20) >> 2] +
          n * +g[(b + 24) >> 2] +
          +g[(b + 52) >> 2];
        l =
          p * +g[(b + 32) >> 2] +
          o * +g[(b + 36) >> 2] +
          n * +g[(b + 40) >> 2] +
          +g[(b + 56) >> 2];
        g[(j + 48) >> 2] =
          p * +g[b >> 2] +
          o * +g[(b + 4) >> 2] +
          n * +g[(b + 8) >> 2] +
          +g[(b + 48) >> 2];
        g[(j + 48 + 4) >> 2] = m;
        g[(j + 48 + 8) >> 2] = l;
        g[(j + 48 + 12) >> 2] = 0.0;
        k = (j + 48 + (h << 2)) | 0;
        g[(e + (h << 2)) >> 2] = f + +g[k >> 2];
        g[q >> 2] = -1.0;
        q = c[((c[a >> 2] | 0) + 64) >> 2] | 0;
        l = +g[(j + 80) >> 2];
        m = +g[(j + 80 + 4) >> 2];
        n = +g[(j + 80 + 8) >> 2];
        o =
          l * +g[(b + 4) >> 2] + m * +g[(b + 20) >> 2] + n * +g[(b + 36) >> 2];
        p =
          l * +g[(b + 8) >> 2] + m * +g[(b + 24) >> 2] + n * +g[(b + 40) >> 2];
        g[j >> 2] =
          +g[b >> 2] * l + +g[(b + 16) >> 2] * m + +g[(b + 32) >> 2] * n;
        g[(j + 4) >> 2] = o;
        g[(j + 8) >> 2] = p;
        g[(j + 12) >> 2] = 0.0;
        ic[q & 127]((j + 16) | 0, a, j);
        p = +g[(j + 16) >> 2];
        o = +g[(j + 16 + 4) >> 2];
        n = +g[(j + 16 + 8) >> 2];
        m =
          p * +g[(b + 16) >> 2] +
          o * +g[(b + 20) >> 2] +
          n * +g[(b + 24) >> 2] +
          +g[(b + 52) >> 2];
        l =
          p * +g[(b + 32) >> 2] +
          o * +g[(b + 36) >> 2] +
          n * +g[(b + 40) >> 2] +
          +g[(b + 56) >> 2];
        g[(j + 48) >> 2] =
          p * +g[b >> 2] +
          o * +g[(b + 4) >> 2] +
          n * +g[(b + 8) >> 2] +
          +g[(b + 48) >> 2];
        g[(j + 48 + 4) >> 2] = m;
        g[(j + 48 + 8) >> 2] = l;
        g[(j + 48 + 12) >> 2] = 0.0;
        g[(d + (h << 2)) >> 2] = +g[k >> 2] - f;
        h = (h + 1) | 0;
      } while ((h | 0) != 3);
      i = j;
      return;
    }
    function Xf(b, d, e, f, h) {
      b = b | 0;
      d = d | 0;
      e = e | 0;
      f = f | 0;
      h = h | 0;
      var j = 0,
        k = 0,
        l = 0,
        m = 0,
        n = 0,
        o = 0,
        p = 0;
      l = i;
      i = (i + 160) | 0;
      j = c[(b + 12) >> 2] | 0;
      if (!j) {
        i = l;
        return;
      }
      m = (a[(b + 16) >> 0] | 0) != 0;
      n = m ? e : d;
      e = m ? d : e;
      p = c[(n + 4) >> 2] | 0;
      o = c[(e + 4) >> 2] | 0;
      c[(h + 4) >> 2] = j;
      d = c[(j + 752) >> 2] | 0;
      c[(l + 136) >> 2] = 9304;
      c[(l + 136 + 4) >> 2] = p;
      c[(l + 136 + 8) >> 2] = o;
      c[(l + 136 + 12) >> 2] = d;
      g[(l + 128) >> 2] = 999999984306749440.0;
      d = c[(n + 12) >> 2] | 0;
      c[l >> 2] = c[d >> 2];
      c[(l + 4) >> 2] = c[(d + 4) >> 2];
      c[(l + 8) >> 2] = c[(d + 8) >> 2];
      c[(l + 12) >> 2] = c[(d + 12) >> 2];
      c[(l + 16) >> 2] = c[(d + 16) >> 2];
      c[(l + 16 + 4) >> 2] = c[(d + 16 + 4) >> 2];
      c[(l + 16 + 8) >> 2] = c[(d + 16 + 8) >> 2];
      c[(l + 16 + 12) >> 2] = c[(d + 16 + 12) >> 2];
      c[(l + 32) >> 2] = c[(d + 32) >> 2];
      c[(l + 32 + 4) >> 2] = c[(d + 32 + 4) >> 2];
      c[(l + 32 + 8) >> 2] = c[(d + 32 + 8) >> 2];
      c[(l + 32 + 12) >> 2] = c[(d + 32 + 12) >> 2];
      c[(l + 48) >> 2] = c[(d + 48) >> 2];
      c[(l + 48 + 4) >> 2] = c[(d + 48 + 4) >> 2];
      c[(l + 48 + 8) >> 2] = c[(d + 48 + 8) >> 2];
      c[(l + 48 + 12) >> 2] = c[(d + 48 + 12) >> 2];
      e = c[(e + 12) >> 2] | 0;
      c[(l + 64) >> 2] = c[e >> 2];
      c[(l + 64 + 4) >> 2] = c[(e + 4) >> 2];
      c[(l + 64 + 8) >> 2] = c[(e + 8) >> 2];
      c[(l + 64 + 12) >> 2] = c[(e + 12) >> 2];
      c[(l + 80) >> 2] = c[(e + 16) >> 2];
      c[(l + 80 + 4) >> 2] = c[(e + 16 + 4) >> 2];
      c[(l + 80 + 8) >> 2] = c[(e + 16 + 8) >> 2];
      c[(l + 80 + 12) >> 2] = c[(e + 16 + 12) >> 2];
      c[(l + 96) >> 2] = c[(e + 32) >> 2];
      c[(l + 96 + 4) >> 2] = c[(e + 32 + 4) >> 2];
      c[(l + 96 + 8) >> 2] = c[(e + 32 + 8) >> 2];
      c[(l + 96 + 12) >> 2] = c[(e + 32 + 12) >> 2];
      c[(l + 112) >> 2] = c[(e + 48) >> 2];
      c[(l + 112 + 4) >> 2] = c[(e + 48 + 4) >> 2];
      c[(l + 112 + 8) >> 2] = c[(e + 48 + 8) >> 2];
      c[(l + 112 + 12) >> 2] = c[(e + 48 + 12) >> 2];
      $d((l + 136) | 0, l, h, c[(f + 20) >> 2] | 0, m);
      do
        if (
          a[(b + 8) >> 0] | 0
            ? ((k = c[(h + 4) >> 2] | 0), c[(k + 748) >> 2] | 0)
            : 0
        ) {
          d = c[(k + 740) >> 2] | 0;
          e = c[((c[(h + 8) >> 2] | 0) + 8) >> 2] | 0;
          j = c[((c[(h + 12) >> 2] | 0) + 8) >> 2] | 0;
          if ((d | 0) == (e | 0)) {
            ef(k, (d + 4) | 0, (j + 4) | 0);
            break;
          } else {
            ef(k, (j + 4) | 0, (e + 4) | 0);
            break;
          }
        }
      while (0);
      i = l;
      return;
    }
    function Yf(d, e, f) {
      d = d | 0;
      e = e | 0;
      f = f | 0;
      var h = 0,
        i = 0,
        j = 0;
      c[(d + 4) >> 2] = 1065353216;
      c[(d + 8) >> 2] = 1065353216;
      c[(d + 12) >> 2] = 1065353216;
      g[(d + 16) >> 2] = 0.0;
      a[(d + 36) >> 0] = 1;
      c[(d + 32) >> 2] = 0;
      c[(d + 24) >> 2] = 0;
      c[(d + 28) >> 2] = 0;
      c[(d + 48) >> 2] = 0;
      c[d >> 2] = 8452;
      a[(d + 100) >> 0] = 1;
      c[(d + 96) >> 2] = 0;
      c[(d + 88) >> 2] = 0;
      c[(d + 92) >> 2] = 0;
      a[(d + 120) >> 0] = 1;
      c[(d + 116) >> 2] = 0;
      c[(d + 108) >> 2] = 0;
      c[(d + 112) >> 2] = 0;
      a[(d + 140) >> 0] = 1;
      c[(d + 136) >> 2] = 0;
      c[(d + 128) >> 2] = 0;
      c[(d + 132) >> 2] = 0;
      a[(d + 160) >> 0] = 1;
      c[(d + 156) >> 2] = 0;
      c[(d + 148) >> 2] = 0;
      c[(d + 152) >> 2] = 0;
      a[(d + 164) >> 0] = e & 1;
      a[(d + 165) >> 0] = f & 1;
      g[(d + 168) >> 2] = 0.0;
      c[6435] = (c[6435] | 0) + 1;
      e = yc(51) | 0;
      if (!e) h = 0;
      else {
        c[(((e + 4 + 15) & -16) + -4) >> 2] = e;
        h = (e + 4 + 15) & -16;
      }
      e = c[(d + 24) >> 2] | 0;
      if ((e | 0) > 0) {
        f = 0;
        do {
          i = (h + (f << 5)) | 0;
          j = ((c[(d + 32) >> 2] | 0) + (f << 5)) | 0;
          c[i >> 2] = c[j >> 2];
          c[(i + 4) >> 2] = c[(j + 4) >> 2];
          c[(i + 8) >> 2] = c[(j + 8) >> 2];
          c[(i + 12) >> 2] = c[(j + 12) >> 2];
          c[(i + 16) >> 2] = c[(j + 16) >> 2];
          c[(i + 20) >> 2] = c[(j + 20) >> 2];
          c[(i + 24) >> 2] = c[(j + 24) >> 2];
          c[(i + 28) >> 2] = c[(j + 28) >> 2];
          f = (f + 1) | 0;
        } while ((f | 0) != (e | 0));
      }
      e = c[(d + 32) >> 2] | 0;
      if (e | 0) {
        if (a[(d + 36) >> 0] | 0) {
          c[6436] = (c[6436] | 0) + 1;
          hd(c[(e + -4) >> 2] | 0);
        }
        c[(d + 32) >> 2] = 0;
      }
      a[(d + 36) >> 0] = 1;
      c[(d + 32) >> 2] = h;
      c[(d + 28) >> 2] = 1;
      e = c[(d + 24) >> 2] | 0;
      c[(h + (e << 5)) >> 2] = 0;
      c[(h + (e << 5) + 4) >> 2] = 0;
      c[(h + (e << 5) + 8) >> 2] = 12;
      c[(h + (e << 5) + 12) >> 2] = 0;
      c[(h + (e << 5) + 16) >> 2] = 0;
      c[(h + (e << 5) + 20) >> 2] = 16;
      c[(h + (e << 5) + 24) >> 2] = 2;
      c[(h + (e << 5) + 28) >> 2] = 0;
      c[(d + 24) >> 2] = (c[(d + 24) >> 2] | 0) + 1;
      e = b[(d + 164) >> 1] | 0;
      if (!(((e & 255) << 24) >> 24)) {
        f = c[(d + 32) >> 2] | 0;
        c[f >> 2] = ((c[(d + 148) >> 2] | 0) / 3) | 0;
        c[(f + 4) >> 2] = 0;
        c[(f + 24) >> 2] = 3;
        c[(f + 8) >> 2] = 6;
      } else {
        f = c[(d + 32) >> 2] | 0;
        c[f >> 2] = ((c[(d + 128) >> 2] | 0) / 3) | 0;
        c[(f + 4) >> 2] = 0;
        c[(f + 24) >> 2] = 2;
        c[(f + 8) >> 2] = 12;
      }
      if ((e & 65535) < 256) {
        i = 12;
        d = ((c[(d + 108) >> 2] | 0) / 3) | 0;
        j = (f + 12) | 0;
        c[j >> 2] = d;
        j = (f + 16) | 0;
        c[j >> 2] = 0;
        j = (f + 20) | 0;
        c[j >> 2] = i;
        return;
      } else {
        i = 16;
        d = c[(d + 88) >> 2] | 0;
        j = (f + 12) | 0;
        c[j >> 2] = d;
        j = (f + 16) | 0;
        c[j >> 2] = 0;
        j = (f + 20) | 0;
        c[j >> 2] = i;
        return;
      }
    }
    function Zf(b, d, e, f, h) {
      b = b | 0;
      d = d | 0;
      e = e | 0;
      f = f | 0;
      h = h | 0;
      var j = 0,
        k = 0,
        l = 0,
        m = 0,
        n = 0,
        o = 0,
        p = 0,
        q = 0,
        r = 0.0,
        s = 0.0,
        t = 0.0,
        u = 0.0,
        v = 0.0,
        w = 0.0;
      q = i;
      i = (i + 48) | 0;
      if (
        ((f | 0) == (d | 0)) |
        (((d | 0) == (e | 0)) | ((e | 0) == (f | 0)))
      ) {
        i = q;
        return;
      }
      l = q;
      m = (l + 36) | 0;
      do {
        c[l >> 2] = 0;
        l = (l + 4) | 0;
      } while ((l | 0) < (m | 0));
      if (!h) p = c[c[(b + 880) >> 2] >> 2] | 0;
      else p = h;
      h = c[(b + 752) >> 2] | 0;
      if (
        (h | 0) == (c[(b + 756) >> 2] | 0)
          ? ((o = h | 0 ? h << 1 : 1), (h | 0) < (o | 0))
          : 0
      ) {
        if (!o) n = 0;
        else {
          c[6435] = (c[6435] | 0) + 1;
          h = yc((((o * 44) | 3) + 16) | 0) | 0;
          if (!h) h = 0;
          else {
            c[(((h + 4 + 15) & -16) + -4) >> 2] = h;
            h = (h + 4 + 15) & -16;
          }
          n = h;
          h = c[(b + 752) >> 2] | 0;
        }
        if ((h | 0) > 0) {
          j = 0;
          do {
            l = (n + ((j * 44) | 0)) | 0;
            k = ((c[(b + 760) >> 2] | 0) + ((j * 44) | 0)) | 0;
            m = (l + 44) | 0;
            do {
              c[l >> 2] = c[k >> 2];
              l = (l + 4) | 0;
              k = (k + 4) | 0;
            } while ((l | 0) < (m | 0));
            j = (j + 1) | 0;
          } while ((j | 0) != (h | 0));
        }
        h = c[(b + 760) >> 2] | 0;
        if (h | 0) {
          if (a[(b + 764) >> 0] | 0) {
            c[6436] = (c[6436] | 0) + 1;
            hd(c[(h + -4) >> 2] | 0);
          }
          c[(b + 760) >> 2] = 0;
        }
        a[(b + 764) >> 0] = 1;
        c[(b + 760) >> 2] = n;
        c[(b + 756) >> 2] = o;
        h = c[(b + 752) >> 2] | 0;
      }
      l = c[(b + 760) >> 2] | 0;
      c[(l + ((h * 44) | 0)) >> 2] = 0;
      c[(l + ((h * 44) | 0) + 4) >> 2] = p;
      l = (l + ((h * 44) | 0) + 8) | 0;
      k = q;
      m = (l + 36) | 0;
      do {
        c[l >> 2] = c[k >> 2];
        l = (l + 4) | 0;
        k = (k + 4) | 0;
      } while ((l | 0) < (m | 0));
      p = c[(b + 752) >> 2] | 0;
      c[(b + 752) >> 2] = p + 1;
      o = c[(b + 760) >> 2] | 0;
      l = c[(b + 720) >> 2] | 0;
      c[(o + ((p * 44) | 0) + 8) >> 2] = l + ((d * 104) | 0);
      m = c[(b + 720) >> 2] | 0;
      c[(o + ((p * 44) | 0) + 12) >> 2] = m + ((e * 104) | 0);
      n = c[(b + 720) >> 2] | 0;
      c[(o + ((p * 44) | 0) + 16) >> 2] = n + ((f * 104) | 0);
      t = +g[(l + ((d * 104) | 0) + 8) >> 2];
      v = +g[(l + ((d * 104) | 0) + 12) >> 2];
      r = +g[(l + ((d * 104) | 0) + 16) >> 2];
      s = +g[(m + ((e * 104) | 0) + 8) >> 2] - t;
      w = +g[(m + ((e * 104) | 0) + 12) >> 2] - v;
      u = +g[(m + ((e * 104) | 0) + 16) >> 2] - r;
      t = +g[(n + ((f * 104) | 0) + 8) >> 2] - t;
      v = +g[(n + ((f * 104) | 0) + 12) >> 2] - v;
      r = +g[(n + ((f * 104) | 0) + 16) >> 2] - r;
      g[(o + ((p * 44) | 0) + 36) >> 2] = +O(
        +(
          (s * v - w * t) * (s * v - w * t) +
          ((w * r - u * v) * (w * r - u * v) +
            (u * t - s * r) * (u * t - s * r))
        )
      );
      a[(b + 924) >> 0] = 1;
      i = q;
      return;
    }
    function _f(b, d) {
      b = b | 0;
      d = +d;
      var e = 0,
        f = 0,
        h = 0,
        j = 0,
        k = 0,
        l = 0,
        m = 0,
        n = 0.0,
        o = 0.0,
        p = 0.0,
        q = 0.0;
      m = i;
      i = (i + 16) | 0;
      li(12187);
      e = c[(b + 232) >> 2] | 0;
      if ((e | 0) > 0) {
        l = (a[26260] | 0) == 0;
        k = 0;
        do {
          j = c[((c[(b + 240) >> 2] | 0) + (k << 2)) >> 2] | 0;
          a: do
            if (j) {
              f = c[(j + 216) >> 2] | 0;
              b: do
                switch (f | 0) {
                  case 4:
                  case 2: {
                    if ((f | 0) == 4) break a;
                    break;
                  }
                  default: {
                    q = +g[(j + 312) >> 2];
                    p = +g[(j + 316) >> 2];
                    o = +g[(j + 320) >> 2];
                    n = +g[(j + 472) >> 2];
                    if (
                      q * q + p * p + o * o < n * n
                        ? ((n = +g[(j + 328) >> 2]),
                          (o = +g[(j + 332) >> 2]),
                          (p = +g[(j + 336) >> 2]),
                          (q = +g[(j + 476) >> 2]),
                          n * n + o * o + p * p < q * q)
                        : 0
                    ) {
                      g[(j + 220) >> 2] = +g[(j + 220) >> 2] + d;
                      break b;
                    }
                    g[(j + 220) >> 2] = 0.0;
                    if (((f & -2) | 0) != 4) {
                      c[(j + 216) >> 2] = 0;
                      f = 0;
                    }
                  }
                }
              while (0);
              h = f & -2;
              do
                if (l) {
                  if ((h | 0) != 2 ? !(+g[(j + 220) >> 2] > 2.0) : 0) break;
                  if ((c[(j + 204) >> 2] & 3) | 0) {
                    if ((h | 0) == 4) break a;
                    c[(j + 216) >> 2] = 2;
                    break a;
                  }
                  if ((f | 0) == 1) {
                    if ((h | 0) == 4) break a;
                    c[(j + 216) >> 2] = 3;
                    break a;
                  } else {
                    if ((f | 0) != 2) break a;
                    e = ((c[(j + 260) >> 2] | 0) + 2) | 0;
                    c[(j + 328) >> 2] = 0;
                    c[(j + 328 + 4) >> 2] = 0;
                    c[(j + 328 + 8) >> 2] = 0;
                    c[(j + 328 + 12) >> 2] = 0;
                    c[(j + 260) >> 2] = e;
                    c[(j + 312) >> 2] = 0;
                    c[(j + 312 + 4) >> 2] = 0;
                    c[(j + 312 + 8) >> 2] = 0;
                    c[(j + 312 + 12) >> 2] = 0;
                    e = c[(b + 232) >> 2] | 0;
                    break a;
                  }
                }
              while (0);
              if ((h | 0) != 4) c[(j + 216) >> 2] = 1;
            }
          while (0);
          k = (k + 1) | 0;
        } while ((k | 0) < (e | 0));
      }
      e = c[2357] | 0;
      b = ((c[(e + 16) >> 2] | 0) + -1) | 0;
      c[(e + 16) >> 2] = b;
      if (b | 0) {
        i = m;
        return;
      }
      do
        if (c[(e + 4) >> 2] | 0) {
          tb(m | 0, 0) | 0;
          b = c[6434] | 0;
          g[(e + 8) >> 2] =
            +g[(e + 8) >> 2] +
            +(
              (((c[(m + 4) >> 2] | 0) -
                (c[(b + 4) >> 2] | 0) +
                (((((c[m >> 2] | 0) - (c[b >> 2] | 0)) | 0) * 1e6) | 0) -
                (c[(e + 12) >> 2] | 0)) |
                0) >>>
              0
            ) /
              1.0e3;
          if (!(c[(e + 16) >> 2] | 0)) {
            e = c[2357] | 0;
            break;
          } else {
            i = m;
            return;
          }
        }
      while (0);
      c[2357] = c[(e + 20) >> 2];
      i = m;
      return;
    }
    function $f(a, b, d, e) {
      a = a | 0;
      b = b | 0;
      d = d | 0;
      e = e | 0;
      var f = 0.0,
        h = 0.0,
        j = 0.0,
        k = 0.0,
        l = 0.0,
        m = 0.0,
        n = 0.0,
        o = 0.0,
        p = 0.0,
        q = 0.0,
        r = 0.0,
        s = 0.0,
        t = 0.0,
        u = 0.0,
        v = 0.0,
        w = 0.0,
        x = 0.0,
        y = 0.0,
        z = 0.0,
        A = 0.0,
        B = 0.0,
        C = 0.0,
        D = 0.0,
        E = 0.0,
        F = 0,
        G = 0.0,
        H = 0;
      H = i;
      i = (i + 32) | 0;
      k = +g[(b + 16) >> 2];
      f = +g[b >> 2];
      l = +g[(b + 20) >> 2];
      h = +g[(b + 4) >> 2];
      n = +g[(b + 24) >> 2];
      j = +g[(b + 8) >> 2];
      r = +g[(b + 32) >> 2];
      v = +g[(b + 36) >> 2];
      w = +g[(b + 40) >> 2];
      B = (l - h) * (w - j) - (n - j) * (v - h);
      C = (n - j) * (r - f) - (k - f) * (w - j);
      D = (k - f) * (v - h) - (l - h) * (r - f);
      g[(H + 16) >> 2] = B;
      g[(H + 16 + 4) >> 2] = C;
      g[(H + 16 + 8) >> 2] = D;
      g[(H + 16 + 12) >> 2] = 0.0;
      o = +g[(a + 4) >> 2];
      s = +g[(a + 8) >> 2];
      x = +g[(a + 12) >> 2];
      E = B * o + C * s + D * x - (f * B + h * C + j * D);
      p = +g[(a + 20) >> 2];
      t = +g[(a + 24) >> 2];
      y = +g[(a + 28) >> 2];
      if (E * (B * p + C * t + D * y - (f * B + h * C + j * D)) >= 0.0) {
        i = H;
        return;
      }
      F = c[(a + 36) >> 2] | 0;
      if ((E <= 0.0) & (((F & 1) | 0) != 0)) {
        i = H;
        return;
      }
      G = E / (E - (B * p + C * t + D * y - (f * B + h * C + j * D)));
      if (!(G < +g[(a + 40) >> 2])) {
        i = H;
        return;
      }
      A = (B * B + C * C + D * D) * -9.999999747378752e-5;
      z = f - (p * G + o * (1.0 - G));
      u = h - (t * G + s * (1.0 - G));
      q = j - (y * G + x * (1.0 - G));
      m = k - (p * G + o * (1.0 - G));
      l = l - (t * G + s * (1.0 - G));
      k = n - (y * G + x * (1.0 - G));
      if (
        !(
          D * (z * l - u * m) + (B * (u * k - q * l) + C * (q * m - z * k)) >=
          A
        )
      ) {
        i = H;
        return;
      }
      j = r - (p * G + o * (1.0 - G));
      h = v - (t * G + s * (1.0 - G));
      f = w - (y * G + x * (1.0 - G));
      if (
        !(
          D * (m * h - l * j) + (B * (l * f - k * h) + C * (k * j - m * f)) >=
          A
        )
      ) {
        i = H;
        return;
      }
      if (
        !(
          D * (u * j - z * h) + (B * (q * h - u * f) + C * (z * f - q * j)) >=
          A
        )
      ) {
        i = H;
        return;
      }
      f = 1.0 / +O(+(B * B + C * C + D * D));
      g[(H + 16) >> 2] = B * f;
      g[(H + 16 + 4) >> 2] = C * f;
      g[(H + 16 + 8) >> 2] = D * f;
      b = c[((c[a >> 2] | 0) + 12) >> 2] | 0;
      if ((E <= 0.0) & (((F & 2) | 0) == 0)) {
        g[H >> 2] = -(B * f);
        g[(H + 4) >> 2] = -(C * f);
        g[(H + 8) >> 2] = -(D * f);
        g[(H + 12) >> 2] = 0.0;
        g[(a + 40) >> 2] = +ec[b & 3](a, H, G, d, e);
        i = H;
        return;
      } else {
        g[(a + 40) >> 2] = +ec[b & 3](a, (H + 16) | 0, G, d, e);
        i = H;
        return;
      }
    }
    function ag(b, d, e, f, h) {
      b = b | 0;
      d = d | 0;
      e = e | 0;
      f = f | 0;
      h = h | 0;
      var j = 0,
        k = 0,
        l = 0,
        m = 0,
        n = 0;
      l = i;
      i = (i + 144) | 0;
      j = c[(b + 12) >> 2] | 0;
      if (!j) {
        i = l;
        return;
      }
      n = c[(d + 4) >> 2] | 0;
      m = c[(e + 4) >> 2] | 0;
      c[(h + 4) >> 2] = j;
      g[(l + 12 + 128) >> 2] = 999999984306749440.0;
      d = c[(d + 12) >> 2] | 0;
      c[(l + 12) >> 2] = c[d >> 2];
      c[(l + 12 + 4) >> 2] = c[(d + 4) >> 2];
      c[(l + 12 + 8) >> 2] = c[(d + 8) >> 2];
      c[(l + 12 + 12) >> 2] = c[(d + 12) >> 2];
      c[(l + 12 + 16) >> 2] = c[(d + 16) >> 2];
      c[(l + 12 + 16 + 4) >> 2] = c[(d + 16 + 4) >> 2];
      c[(l + 12 + 16 + 8) >> 2] = c[(d + 16 + 8) >> 2];
      c[(l + 12 + 16 + 12) >> 2] = c[(d + 16 + 12) >> 2];
      c[(l + 12 + 32) >> 2] = c[(d + 32) >> 2];
      c[(l + 12 + 32 + 4) >> 2] = c[(d + 32 + 4) >> 2];
      c[(l + 12 + 32 + 8) >> 2] = c[(d + 32 + 8) >> 2];
      c[(l + 12 + 32 + 12) >> 2] = c[(d + 32 + 12) >> 2];
      c[(l + 12 + 48) >> 2] = c[(d + 48) >> 2];
      c[(l + 12 + 48 + 4) >> 2] = c[(d + 48 + 4) >> 2];
      c[(l + 12 + 48 + 8) >> 2] = c[(d + 48 + 8) >> 2];
      c[(l + 12 + 48 + 12) >> 2] = c[(d + 48 + 12) >> 2];
      e = c[(e + 12) >> 2] | 0;
      c[(l + 12 + 64) >> 2] = c[e >> 2];
      c[(l + 12 + 64 + 4) >> 2] = c[(e + 4) >> 2];
      c[(l + 12 + 64 + 8) >> 2] = c[(e + 8) >> 2];
      c[(l + 12 + 64 + 12) >> 2] = c[(e + 12) >> 2];
      c[(l + 12 + 80) >> 2] = c[(e + 16) >> 2];
      c[(l + 12 + 80 + 4) >> 2] = c[(e + 16 + 4) >> 2];
      c[(l + 12 + 80 + 8) >> 2] = c[(e + 16 + 8) >> 2];
      c[(l + 12 + 80 + 12) >> 2] = c[(e + 16 + 12) >> 2];
      c[(l + 12 + 96) >> 2] = c[(e + 32) >> 2];
      c[(l + 12 + 96 + 4) >> 2] = c[(e + 32 + 4) >> 2];
      c[(l + 12 + 96 + 8) >> 2] = c[(e + 32 + 8) >> 2];
      c[(l + 12 + 96 + 12) >> 2] = c[(e + 32 + 12) >> 2];
      c[(l + 12 + 112) >> 2] = c[(e + 48) >> 2];
      c[(l + 12 + 112 + 4) >> 2] = c[(e + 48 + 4) >> 2];
      c[(l + 12 + 112 + 8) >> 2] = c[(e + 48 + 8) >> 2];
      c[(l + 12 + 112 + 12) >> 2] = c[(e + 48 + 12) >> 2];
      c[l >> 2] = 9284;
      c[(l + 4) >> 2] = n;
      c[(l + 8) >> 2] = m;
      xc(l, (l + 12) | 0, h, c[(f + 20) >> 2] | 0, 0);
      do
        if (
          a[(b + 8) >> 0] | 0
            ? ((k = c[(h + 4) >> 2] | 0), c[(k + 748) >> 2] | 0)
            : 0
        ) {
          d = c[(k + 740) >> 2] | 0;
          e = c[((c[(h + 8) >> 2] | 0) + 8) >> 2] | 0;
          j = c[((c[(h + 12) >> 2] | 0) + 8) >> 2] | 0;
          if ((d | 0) == (e | 0)) {
            ef(k, (d + 4) | 0, (j + 4) | 0);
            break;
          } else {
            ef(k, (j + 4) | 0, (e + 4) | 0);
            break;
          }
        }
      while (0);
      i = l;
      return;
    }
    function bg(a, b, d) {
      a = a | 0;
      b = b | 0;
      d = d | 0;
      var e = 0,
        f = 0,
        h = 0,
        i = 0,
        j = 0,
        k = 0,
        l = 0.0,
        m = 0.0,
        n = 0.0,
        o = 0.0,
        p = 0,
        q = 0.0,
        r = 0,
        s = 0.0,
        t = 0;
      if (!a) return;
      n = +g[b >> 2];
      o = +g[(b + 4) >> 2];
      q = +g[(b + 8) >> 2];
      s = +g[(b + 16) >> 2];
      m = +g[(b + 20) >> 2];
      l = +g[(b + 24) >> 2];
      c[6435] = (c[6435] | 0) + 1;
      b = yc(275) | 0;
      c[(((b + 4 + 15) & -16) + -4) >> 2] = b;
      c[((b + 4 + 15) & -16) >> 2] = a;
      k = 1;
      a = 64;
      b = (b + 4 + 15) & -16;
      while (1) {
        e = (k + -1) | 0;
        i = c[(b + (e << 2)) >> 2] | 0;
        do
          if (
            ((((+g[i >> 2] <= s
            ? +g[(i + 16) >> 2] >= n
            : 0)
            ? +g[(i + 4) >> 2] <= m
            : 0)
            ? +g[(i + 20) >> 2] >= o
            : 0)
            ? +g[(i + 8) >> 2] <= l
            : 0)
              ? +g[(i + 24) >> 2] >= q
              : 0
          ) {
            if (!(c[(i + 40) >> 2] | 0)) {
              Cb[c[((c[d >> 2] | 0) + 12) >> 2] & 127](d, i);
              break;
            }
            j = c[(i + 36) >> 2] | 0;
            do
              if (
                (e | 0) == (a | 0)
                  ? ((p = a | 0 ? a << 1 : 1), (k | 0) <= (p | 0))
                  : 0
              ) {
                if (
                  (p | 0) != 0
                    ? ((c[6435] = (c[6435] | 0) + 1),
                      (r = yc((((p << 2) | 3) + 16) | 0) | 0),
                      (r | 0) != 0)
                    : 0
                ) {
                  c[(((r + 4 + 15) & -16) + -4) >> 2] = r;
                  h = (r + 4 + 15) & -16;
                } else h = 0;
                if ((k | 0) <= 1) {
                  if (!b) {
                    a = p;
                    b = h;
                    break;
                  }
                } else {
                  f = 0;
                  do {
                    c[(h + (f << 2)) >> 2] = c[(b + (f << 2)) >> 2];
                    f = (f + 1) | 0;
                  } while ((f | 0) != (a | 0));
                }
                c[6436] = (c[6436] | 0) + 1;
                hd(c[(b + -4) >> 2] | 0);
                a = p;
                b = h;
              }
            while (0);
            c[(b + (e << 2)) >> 2] = j;
            h = c[(i + 40) >> 2] | 0;
            do
              if ((k | 0) == (a | 0)) {
                a = k | 0 ? k << 1 : 1;
                if ((k | 0) < (a | 0)) {
                  if (
                    (a | 0) != 0
                      ? ((c[6435] = (c[6435] | 0) + 1),
                        (t = yc((((a << 2) | 3) + 16) | 0) | 0),
                        (t | 0) != 0)
                      : 0
                  ) {
                    c[(((t + 4 + 15) & -16) + -4) >> 2] = t;
                    f = (t + 4 + 15) & -16;
                  } else f = 0;
                  if ((k | 0) <= 0) {
                    if (!b) {
                      b = f;
                      break;
                    }
                  } else {
                    e = 0;
                    do {
                      c[(f + (e << 2)) >> 2] = c[(b + (e << 2)) >> 2];
                      e = (e + 1) | 0;
                    } while ((e | 0) != (k | 0));
                  }
                  c[6436] = (c[6436] | 0) + 1;
                  hd(c[(b + -4) >> 2] | 0);
                  b = f;
                } else a = k;
              }
            while (0);
            c[(b + (k << 2)) >> 2] = h;
            e = (k + 1) | 0;
          }
        while (0);
        if ((e | 0) > 0) k = e;
        else break;
      }
      if (!b) return;
      c[6436] = (c[6436] | 0) + 1;
      hd(c[(b + -4) >> 2] | 0);
      return;
    }
    function cg(b) {
      b = b | 0;
      var d = 0,
        e = 0,
        f = 0,
        g = 0,
        h = 0,
        i = 0,
        j = 0,
        k = 0,
        l = 0;
      if ((c[(b + 104) >> 2] | 0) > 0) {
        l = 0;
        do {
          h = c[((c[(b + 4) >> 2] | 0) + 684) >> 2] | 0;
          i = ((c[(b + 112) >> 2] | 0) + (l << 3) + 4) | 0;
          d = c[i >> 2] | 0;
          if ((c[(h + 60) >> 2] | 0) > 0) {
            k = 0;
            do {
              j = ((c[(h + 68) >> 2] | 0) + (k << 2)) | 0;
              e = c[j >> 2] | 0;
              a: do
                if (e | 0) {
                  f = 0;
                  do {
                    g = (f + 280) | 0;
                    b: do
                      if (!f)
                        while (1) {
                          f = e;
                          e = c[(e + 280) >> 2] | 0;
                          if ((c[(f + 276) >> 2] | 0) != (d | 0)) break b;
                          c[j >> 2] = e;
                          hd(f);
                          if (!e) break a;
                        }
                      else
                        while (1) {
                          f = e;
                          e = c[(e + 280) >> 2] | 0;
                          if ((c[(f + 276) >> 2] | 0) != (d | 0)) break b;
                          c[g >> 2] = e;
                          hd(f);
                          if (!e) break a;
                        }
                    while (0);
                  } while ((e | 0) != 0);
                }
              while (0);
              k = (k + 1) | 0;
            } while ((k | 0) < (c[(h + 60) >> 2] | 0));
            d = c[i >> 2] | 0;
          }
          if (d | 0) Ab[c[((c[d >> 2] | 0) + 4) >> 2] & 255](d);
          l = (l + 1) | 0;
        } while ((l | 0) < (c[(b + 104) >> 2] | 0));
      }
      d = c[(b + 72) >> 2] | 0;
      if (d | 0) {
        if (a[(b + 76) >> 0] | 0) {
          c[6436] = (c[6436] | 0) + 1;
          hd(c[(d + -4) >> 2] | 0);
        }
        c[(b + 72) >> 2] = 0;
      }
      a[(b + 76) >> 0] = 1;
      c[(b + 72) >> 2] = 0;
      c[(b + 64) >> 2] = 0;
      c[(b + 68) >> 2] = 0;
      d = c[(b + 92) >> 2] | 0;
      if (d | 0) {
        if (a[(b + 96) >> 0] | 0) {
          c[6436] = (c[6436] | 0) + 1;
          hd(c[(d + -4) >> 2] | 0);
        }
        c[(b + 92) >> 2] = 0;
      }
      a[(b + 96) >> 0] = 1;
      c[(b + 92) >> 2] = 0;
      c[(b + 84) >> 2] = 0;
      c[(b + 88) >> 2] = 0;
      d = c[(b + 112) >> 2] | 0;
      if (d | 0) {
        if (a[(b + 116) >> 0] | 0) {
          c[6436] = (c[6436] | 0) + 1;
          hd(c[(d + -4) >> 2] | 0);
        }
        c[(b + 112) >> 2] = 0;
      }
      a[(b + 116) >> 0] = 1;
      c[(b + 112) >> 2] = 0;
      c[(b + 104) >> 2] = 0;
      c[(b + 108) >> 2] = 0;
      d = c[(b + 132) >> 2] | 0;
      if (!d) {
        a[(b + 136) >> 0] = 1;
        c[(b + 132) >> 2] = 0;
        c[(b + 124) >> 2] = 0;
        b = (b + 128) | 0;
        c[b >> 2] = 0;
        return;
      }
      if (a[(b + 136) >> 0] | 0) {
        c[6436] = (c[6436] | 0) + 1;
        hd(c[(d + -4) >> 2] | 0);
      }
      c[(b + 132) >> 2] = 0;
      a[(b + 136) >> 0] = 1;
      c[(b + 132) >> 2] = 0;
      c[(b + 124) >> 2] = 0;
      b = (b + 128) | 0;
      c[b >> 2] = 0;
      return;
    }
    function dg(a, b, d) {
      a = a | 0;
      b = b | 0;
      d = d | 0;
      var e = 0,
        f = 0,
        g = 0,
        h = 0,
        i = 0,
        j = 0;
      e = c[(a + 56) >> 2] | 0;
      if (!e) {
        e = c[(a + 52) >> 2] | 0;
        if (!e) {
          c[6435] = (c[6435] | 0) + 1;
          e = yc(31) | 0;
          if (!e) e = 0;
          else {
            c[(((e + 4 + 15) & -16) + -4) >> 2] = e;
            e = (e + 4 + 15) & -16;
          }
          f = c[(a + 60) >> 2] | 0;
          c[(e + 4) >> 2] = f;
          g = (e + 8) | 0;
          c[g >> 2] = 0;
          c[6435] = (c[6435] | 0) + 1;
          f = yc((((f * 24) | 3) + 16) | 0) | 0;
          if (!f) f = 0;
          else {
            c[(((f + 4 + 15) & -16) + -4) >> 2] = f;
            f = (f + 4 + 15) & -16;
          }
          c[e >> 2] = f;
          c[g >> 2] = c[(a + 48) >> 2];
          c[(a + 48) >> 2] = e;
        } else c[(a + 52) >> 2] = c[(e + 8) >> 2];
        h = c[(e + 4) >> 2] | 0;
        e = c[e >> 2] | 0;
        if ((h | 0) > 0) {
          f = 0;
          g = e;
          do {
            f = (f + 1) | 0;
            i = g;
            g = (g + 24) | 0;
            c[i >> 2] = (f | 0) < (h | 0) ? g : 0;
          } while ((f | 0) != (h | 0));
          i = e;
        } else i = e;
      } else i = e;
      c[(a + 56) >> 2] = c[i >> 2];
      c[i >> 2] = 0;
      c[(i + 4) >> 2] = 0;
      c[(i + 8) >> 2] = 0;
      c[(i + 12) >> 2] = 0;
      c[(i + 16) >> 2] = 0;
      c[(i + 20) >> 2] = 0;
      e = c[(a + 56) >> 2] | 0;
      if (!e) {
        e = c[(a + 52) >> 2] | 0;
        if (!e) {
          c[6435] = (c[6435] | 0) + 1;
          e = yc(31) | 0;
          if (!e) e = 0;
          else {
            c[(((e + 4 + 15) & -16) + -4) >> 2] = e;
            e = (e + 4 + 15) & -16;
          }
          f = c[(a + 60) >> 2] | 0;
          c[(e + 4) >> 2] = f;
          g = (e + 8) | 0;
          c[g >> 2] = 0;
          c[6435] = (c[6435] | 0) + 1;
          f = yc((((f * 24) | 3) + 16) | 0) | 0;
          if (!f) f = 0;
          else {
            c[(((f + 4 + 15) & -16) + -4) >> 2] = f;
            f = (f + 4 + 15) & -16;
          }
          c[e >> 2] = f;
          c[g >> 2] = c[(a + 48) >> 2];
          c[(a + 48) >> 2] = e;
        } else c[(a + 52) >> 2] = c[(e + 8) >> 2];
        h = c[(e + 4) >> 2] | 0;
        e = c[e >> 2] | 0;
        if ((h | 0) > 0) {
          f = 0;
          g = e;
          do {
            f = (f + 1) | 0;
            j = g;
            g = (g + 24) | 0;
            c[j >> 2] = (f | 0) < (h | 0) ? g : 0;
          } while ((f | 0) != (h | 0));
        }
      }
      c[(a + 56) >> 2] = c[e >> 2];
      c[e >> 2] = 0;
      c[(e + 4) >> 2] = 0;
      c[(e + 8) >> 2] = 0;
      c[(i + 8) >> 2] = e;
      c[(e + 8) >> 2] = i;
      j = c[(a + 100) >> 2] | 0;
      c[(i + 20) >> 2] = j;
      c[(e + 20) >> 2] = j;
      c[(i + 12) >> 2] = d;
      c[(e + 12) >> 2] = b;
      c[(i + 16) >> 2] = 0;
      c[(e + 16) >> 2] = 0;
      e = c[(a + 116) >> 2] | 0;
      c[(a + 116) >> 2] = e + 1;
      if ((e | 0) < (c[(a + 120) >> 2] | 0)) return i | 0;
      c[(a + 120) >> 2] = e + 1;
      return i | 0;
    }
    function eg(a) {
      a = a | 0;
      var b = 0,
        d = 0,
        e = 0,
        f = 0,
        h = 0,
        i = 0.0,
        j = 0.0,
        k = 0.0,
        l = 0.0,
        m = 0.0,
        n = 0.0,
        o = 0,
        p = 0;
      b = c[(a + 752) >> 2] | 0;
      if ((b | 0) > 0) {
        d = c[(a + 760) >> 2] | 0;
        e = 0;
        do {
          o = c[(d + ((e * 44) | 0) + 8) >> 2] | 0;
          f = c[(d + ((e * 44) | 0) + 12) >> 2] | 0;
          h = c[(d + ((e * 44) | 0) + 16) >> 2] | 0;
          k = +g[(o + 8) >> 2];
          m = +g[(o + 12) >> 2];
          i = +g[(o + 16) >> 2];
          j = +g[(f + 8) >> 2] - k;
          n = +g[(f + 12) >> 2] - m;
          l = +g[(f + 16) >> 2] - i;
          k = +g[(h + 8) >> 2] - k;
          m = +g[(h + 12) >> 2] - m;
          i = +g[(h + 16) >> 2] - i;
          g[(d + ((e * 44) | 0) + 36) >> 2] = +O(
            +(
              (j * m - n * k) * (j * m - n * k) +
              ((n * i - l * m) * (n * i - l * m) +
                (l * k - j * i) * (l * k - j * i))
            )
          );
          e = (e + 1) | 0;
        } while ((e | 0) != (b | 0));
      }
      d = c[(a + 712) >> 2] | 0;
      if ((d | 0) > 0) {
        c[6435] = (c[6435] | 0) + 1;
        b = yc((((d << 2) | 3) + 16) | 0) | 0;
        if (!b) f = 0;
        else {
          c[(((b + 4 + 15) & -16) + -4) >> 2] = b;
          f = (b + 4 + 15) & -16;
        }
        Qn(f | 0, 0, (d << 2) | 0) | 0;
        d = c[(a + 712) >> 2] | 0;
        if ((d | 0) > 0) {
          b = c[(a + 720) >> 2] | 0;
          e = 0;
          do {
            g[(b + ((e * 104) | 0) + 92) >> 2] = 0.0;
            e = (e + 1) | 0;
          } while ((e | 0) != (d | 0));
          h = f;
        } else h = f;
      } else h = 0;
      f = c[(a + 752) >> 2] | 0;
      if ((f | 0) > 0) {
        b = c[(a + 760) >> 2] | 0;
        d = c[(a + 720) >> 2] | 0;
        e = 0;
        do {
          n = +N(+(+g[(b + ((e * 44) | 0) + 36) >> 2]));
          o = c[(b + ((e * 44) | 0) + 8) >> 2] | 0;
          p = (h + (((((o - d) | 0) / 104) | 0) << 2)) | 0;
          c[p >> 2] = (c[p >> 2] | 0) + 1;
          g[(o + 92) >> 2] = n + +g[(o + 92) >> 2];
          o = c[(b + ((e * 44) | 0) + 12) >> 2] | 0;
          p = (h + (((((o - d) | 0) / 104) | 0) << 2)) | 0;
          c[p >> 2] = (c[p >> 2] | 0) + 1;
          g[(o + 92) >> 2] = n + +g[(o + 92) >> 2];
          o = c[(b + ((e * 44) | 0) + 16) >> 2] | 0;
          p = (h + (((((o - d) | 0) / 104) | 0) << 2)) | 0;
          c[p >> 2] = (c[p >> 2] | 0) + 1;
          g[(o + 92) >> 2] = n + +g[(o + 92) >> 2];
          e = (e + 1) | 0;
        } while ((e | 0) != (f | 0));
        d = c[(a + 712) >> 2] | 0;
      }
      if ((d | 0) <= 0) {
        if (!h) return;
      } else {
        e = 0;
        do {
          b = c[(h + (e << 2)) >> 2] | 0;
          if ((b | 0) > 0) {
            p = ((c[(a + 720) >> 2] | 0) + ((e * 104) | 0) + 92) | 0;
            g[p >> 2] = +g[p >> 2] / +(b | 0);
          } else g[((c[(a + 720) >> 2] | 0) + ((e * 104) | 0) + 92) >> 2] = 0.0;
          e = (e + 1) | 0;
        } while ((e | 0) != (d | 0));
      }
      c[6436] = (c[6436] | 0) + 1;
      hd(c[(h + -4) >> 2] | 0);
      return;
    }
    function fg(b, d) {
      b = b | 0;
      d = d | 0;
      var e = 0,
        f = 0,
        g = 0,
        h = 0,
        j = 0,
        k = 0,
        l = 0;
      l = i;
      i = (i + 16) | 0;
      j = c[(b + 28) >> 2] | 0;
      k = c[(b + 32) >> 2] | 0;
      if (!(a[(b + 1301) >> 0] | 0)) {
        h = 0;
        e =
          Nf(
            b,
            d,
            0,
            (j + 4) | 0,
            (k + 4) | 0,
            (j + 312) | 0,
            (k + 312) | 0,
            (j + 328) | 0,
            (k + 328) | 0
          ) | 0;
        do {
          f = (b + 868 + (h << 6)) | 0;
          if (
            !((c[(b + 868 + (h << 6) + 56) >> 2] | 0) == 0
              ? (a[(b + 868 + (h << 6) + 44) >> 0] | 0) == 0
              : 0)
          ) {
            g = (b + 1208 + (h << 4)) | 0;
            c[l >> 2] = c[g >> 2];
            c[(l + 4) >> 2] = c[(g + 4) >> 2];
            c[(l + 8) >> 2] = c[(g + 8) >> 2];
            c[(l + 12) >> 2] = c[(g + 12) >> 2];
            g = c[(b + 1304) >> 2] >> (((h * 3) | 0) + 9);
            if (!(g & 1))
              c[(b + 868 + (h << 6) + 28) >> 2] = c[c[(d + 32) >> 2] >> 2];
            if (!(g & 2))
              c[(b + 868 + (h << 6) + 36) >> 2] = c[c[(d + 32) >> 2] >> 2];
            if (!(g & 4)) c[(b + 868 + (h << 6) + 32) >> 2] = c[(d + 4) >> 2];
            e =
              ((Dd(
                b,
                f,
                (j + 4) | 0,
                (k + 4) | 0,
                (j + 312) | 0,
                (k + 312) | 0,
                (j + 328) | 0,
                (k + 328) | 0,
                d,
                e,
                l,
                1,
                0
              ) |
                0) +
                e) |
              0;
          }
          h = (h + 1) | 0;
        } while ((h | 0) != 3);
        i = l;
        return;
      }
      h = 0;
      e = 0;
      do {
        f = (b + 868 + (h << 6)) | 0;
        if (
          !((c[(b + 868 + (h << 6) + 56) >> 2] | 0) == 0
            ? (a[(b + 868 + (h << 6) + 44) >> 0] | 0) == 0
            : 0)
        ) {
          g = (b + 1208 + (h << 4)) | 0;
          c[l >> 2] = c[g >> 2];
          c[(l + 4) >> 2] = c[(g + 4) >> 2];
          c[(l + 8) >> 2] = c[(g + 8) >> 2];
          c[(l + 12) >> 2] = c[(g + 12) >> 2];
          g = c[(b + 1304) >> 2] >> (((h * 3) | 0) + 9);
          if (!(g & 1))
            c[(b + 868 + (h << 6) + 28) >> 2] = c[c[(d + 32) >> 2] >> 2];
          if (!(g & 2))
            c[(b + 868 + (h << 6) + 36) >> 2] = c[c[(d + 32) >> 2] >> 2];
          if (!(g & 4)) c[(b + 868 + (h << 6) + 32) >> 2] = c[(d + 4) >> 2];
          e =
            ((Dd(
              b,
              f,
              (j + 4) | 0,
              (k + 4) | 0,
              (j + 312) | 0,
              (k + 312) | 0,
              (j + 328) | 0,
              (k + 328) | 0,
              d,
              e,
              l,
              1,
              0
            ) |
              0) +
              e) |
            0;
        }
        h = (h + 1) | 0;
      } while ((h | 0) != 3);
      Nf(
        b,
        d,
        e,
        (j + 4) | 0,
        (k + 4) | 0,
        (j + 312) | 0,
        (k + 312) | 0,
        (j + 328) | 0,
        (k + 328) | 0
      ) | 0;
      i = l;
      return;
    }
    function gg(b) {
      b = b | 0;
      var d = 0,
        e = 0,
        f = 0,
        h = 0.0,
        i = 0.0,
        j = 0,
        k = 0,
        l = 0.0,
        m = 0.0,
        n = 0.0,
        o = 0.0,
        p = 0.0,
        q = 0.0,
        r = 0,
        s = 0.0,
        t = 0.0,
        u = 0.0,
        v = 0.0;
      d = c[(b + 988) >> 2] | 0;
      if (d | 0) xn((b + 988) | 0, d);
      d = c[(b + 992) >> 2] | 0;
      if (d | 0) {
        c[6436] = (c[6436] | 0) + 1;
        hd(c[(d + -4) >> 2] | 0);
      }
      c[(b + 992) >> 2] = 0;
      c[(b + 996) >> 2] = -1;
      d = c[(b + 1020) >> 2] | 0;
      if (d | 0) {
        if (a[(b + 1024) >> 0] | 0) {
          c[6436] = (c[6436] | 0) + 1;
          hd(c[(d + -4) >> 2] | 0);
        }
        c[(b + 1020) >> 2] = 0;
      }
      a[(b + 1024) >> 0] = 1;
      c[(b + 1020) >> 2] = 0;
      c[(b + 1012) >> 2] = 0;
      c[(b + 1016) >> 2] = 0;
      c[(b + 1004) >> 2] = 0;
      if ((c[(b + 752) >> 2] | 0) <= 0) return;
      r = 0;
      do {
        j = c[(b + 760) >> 2] | 0;
        k = (j + ((r * 44) | 0)) | 0;
        e = c[(j + ((r * 44) | 0) + 8) >> 2] | 0;
        f = c[(j + ((r * 44) | 0) + 12) >> 2] | 0;
        d = c[(j + ((r * 44) | 0) + 16) >> 2] | 0;
        o = +g[(e + 8) >> 2];
        p = +g[(e + 12) >> 2];
        q = +g[(e + 16) >> 2];
        i = +g[(e + 20) >> 2];
        v = +g[(f + 8) >> 2];
        l = v < o ? v : o;
        s = +g[(f + 12) >> 2];
        m = s < p ? s : p;
        t = +g[(f + 16) >> 2];
        n = t < q ? t : q;
        u = +g[(f + 20) >> 2];
        h = u < i ? u : i;
        o = o < v ? v : o;
        p = p < s ? s : p;
        q = q < t ? t : q;
        i = i < u ? u : i;
        u = +g[(d + 8) >> 2];
        l = u < l ? u : l;
        t = +g[(d + 12) >> 2];
        m = t < m ? t : m;
        s = +g[(d + 16) >> 2];
        n = s < n ? s : n;
        v = +g[(d + 20) >> 2];
        h = v < h ? v : h;
        i = i < v ? v : i;
        o = (o < u ? u : o) + 0.0;
        p = (p < t ? t : p) + 0.0;
        q = (q < s ? s : q) + 0.0;
        d = c[(b + 992) >> 2] | 0;
        if (!d) {
          c[6435] = (c[6435] | 0) + 1;
          d = yc(63) | 0;
          if (!d) d = 0;
          else {
            c[(((d + 4 + 15) & -16) + -4) >> 2] = d;
            d = (d + 4 + 15) & -16;
          }
          e = d;
          f = (e + 44) | 0;
          do {
            c[e >> 2] = 0;
            e = (e + 4) | 0;
          } while ((e | 0) < (f | 0));
        } else c[(b + 992) >> 2] = 0;
        c[(d + 32) >> 2] = 0;
        c[(d + 36) >> 2] = k;
        c[(d + 40) >> 2] = 0;
        g[d >> 2] = l;
        g[(d + 4) >> 2] = m;
        g[(d + 8) >> 2] = n;
        g[(d + 12) >> 2] = h;
        g[(d + 16) >> 2] = o;
        g[(d + 20) >> 2] = p;
        g[(d + 24) >> 2] = q;
        g[(d + 28) >> 2] = i;
        lf((b + 988) | 0, c[(b + 988) >> 2] | 0, d);
        c[(b + 1e3) >> 2] = (c[(b + 1e3) >> 2] | 0) + 1;
        c[(j + ((r * 44) | 0) + 40) >> 2] = d;
        r = (r + 1) | 0;
      } while ((r | 0) < (c[(b + 752) >> 2] | 0));
      return;
    }
    function hg(b) {
      b = b | 0;
      var d = 0,
        e = 0.0,
        f = 0,
        h = 0,
        j = 0.0,
        k = 0.0,
        l = 0;
      l = i;
      i = (i + 64) | 0;
      li(11978);
      a: do
        if (!(a[(b + 274) >> 0] | 0)) {
          d = c[(b + 232) >> 2] | 0;
          if ((d | 0) > 0) {
            h = 0;
            while (1) {
              f = c[((c[(b + 240) >> 2] | 0) + (h << 2)) >> 2] | 0;
              switch (c[(f + 216) >> 2] | 0) {
                case 2:
                case 5:
                  break;
                default:
                  if (
                    (c[(f + 480) >> 2] | 0) != 0
                      ? ((c[(f + 204) >> 2] & 3) | 0) == 0
                      : 0
                  ) {
                    if (
                      (a[(b + 300) >> 0] | 0) != 0
                        ? ((k = +g[(b + 268) >> 2]), k != 0.0)
                        : 0
                    )
                      e = +g[(b + 264) >> 2] - k;
                    else e = +g[(b + 264) >> 2] * +g[(f + 244) >> 2];
                    Zg(
                      (f + 68) | 0,
                      +g[(f + 132) >> 2],
                      +g[(f + 136) >> 2],
                      +g[(f + 140) >> 2],
                      (f + 148) | 0,
                      e,
                      l
                    );
                    d = c[(f + 480) >> 2] | 0;
                    Cb[c[((c[d >> 2] | 0) + 12) >> 2] & 127](d, l);
                    d = c[(b + 232) >> 2] | 0;
                  }
              }
              h = (h + 1) | 0;
              if ((h | 0) >= (d | 0)) break a;
            }
          }
        } else {
          d = c[(b + 8) >> 2] | 0;
          if ((d | 0) > 0) {
            h = 0;
            do {
              f = c[((c[(b + 16) >> 2] | 0) + (h << 2)) >> 2] | 0;
              if (
                (!((f | 0) == 0 ? 1 : ((c[(f + 236) >> 2] & 2) | 0) == 0)
                ? (c[(f + 480) >> 2] | 0) != 0
                : 0)
                  ? ((c[(f + 204) >> 2] & 3) | 0) == 0
                  : 0
              ) {
                if (
                  (a[(b + 300) >> 0] | 0) != 0
                    ? ((j = +g[(b + 268) >> 2]), j != 0.0)
                    : 0
                )
                  e = +g[(b + 264) >> 2] - j;
                else e = +g[(b + 264) >> 2] * +g[(f + 244) >> 2];
                Zg(
                  (f + 68) | 0,
                  +g[(f + 132) >> 2],
                  +g[(f + 136) >> 2],
                  +g[(f + 140) >> 2],
                  (f + 148) | 0,
                  e,
                  l
                );
                d = c[(f + 480) >> 2] | 0;
                Cb[c[((c[d >> 2] | 0) + 12) >> 2] & 127](d, l);
                d = c[(b + 8) >> 2] | 0;
              }
              h = (h + 1) | 0;
            } while ((h | 0) < (d | 0));
          }
        }
      while (0);
      d = c[2357] | 0;
      b = ((c[(d + 16) >> 2] | 0) + -1) | 0;
      c[(d + 16) >> 2] = b;
      if (b | 0) {
        i = l;
        return;
      }
      do
        if (c[(d + 4) >> 2] | 0) {
          tb(l | 0, 0) | 0;
          b = c[6434] | 0;
          g[(d + 8) >> 2] =
            +g[(d + 8) >> 2] +
            +(
              (((c[(l + 4) >> 2] | 0) -
                (c[(b + 4) >> 2] | 0) +
                (((((c[l >> 2] | 0) - (c[b >> 2] | 0)) | 0) * 1e6) | 0) -
                (c[(d + 12) >> 2] | 0)) |
                0) >>>
              0
            ) /
              1.0e3;
          if (!(c[(d + 16) >> 2] | 0)) {
            d = c[2357] | 0;
            break;
          } else {
            i = l;
            return;
          }
        }
      while (0);
      c[2357] = c[(d + 20) >> 2];
      i = l;
      return;
    }
    function ig(a, b) {
      a = a | 0;
      b = b | 0;
      var d = 0,
        e = 0,
        f = 0,
        g = 0,
        h = 0,
        j = 0,
        k = 0,
        l = 0,
        m = 0,
        n = 0;
      n = i;
      i = (i + 32) | 0;
      if ((b | 0) < 0) b = c[(a + 12) >> 2] | 0;
      d = c[a >> 2] | 0;
      if (!(((b | 0) > 0) & ((d | 0) != 0))) {
        i = n;
        return;
      }
      while (1) {
        e = (d + 40) | 0;
        if (c[e >> 2] | 0) {
          m = 0;
          while (1) {
            l = ((c[(a + 16) >> 2] | 0) >>> m) & 1;
            f = (d + 32) | 0;
            g = c[f >> 2] | 0;
            if (g >>> 0 > d >>> 0) {
              h = ((c[(g + 40) >> 2] | 0) == (d | 0)) & 1;
              j = c[(g + 36 + ((h ^ 1) << 2)) >> 2] | 0;
              k = c[(g + 32) >> 2] | 0;
              if (!k) c[a >> 2] = d;
              else
                c[
                  (k + 36 + ((((c[(k + 40) >> 2] | 0) == (g | 0)) & 1) << 2)) >>
                    2
                ] = d;
              c[(j + 32) >> 2] = d;
              c[(g + 32) >> 2] = d;
              c[f >> 2] = k;
              k = (d + 36) | 0;
              c[(g + 36) >> 2] = c[k >> 2];
              c[(g + 40) >> 2] = c[e >> 2];
              c[((c[k >> 2] | 0) + 32) >> 2] = g;
              c[((c[e >> 2] | 0) + 32) >> 2] = g;
              c[(d + 36 + (h << 2)) >> 2] = g;
              c[(d + 36 + ((h ^ 1) << 2)) >> 2] = j;
              c[n >> 2] = c[g >> 2];
              c[(n + 4) >> 2] = c[(g + 4) >> 2];
              c[(n + 8) >> 2] = c[(g + 8) >> 2];
              c[(n + 12) >> 2] = c[(g + 12) >> 2];
              c[(n + 16) >> 2] = c[(g + 16) >> 2];
              c[(n + 20) >> 2] = c[(g + 20) >> 2];
              c[(n + 24) >> 2] = c[(g + 24) >> 2];
              c[(n + 28) >> 2] = c[(g + 28) >> 2];
              c[g >> 2] = c[d >> 2];
              c[(g + 4) >> 2] = c[(d + 4) >> 2];
              c[(g + 8) >> 2] = c[(d + 8) >> 2];
              c[(g + 12) >> 2] = c[(d + 12) >> 2];
              c[(g + 16) >> 2] = c[(d + 16) >> 2];
              c[(g + 20) >> 2] = c[(d + 20) >> 2];
              c[(g + 24) >> 2] = c[(d + 24) >> 2];
              c[(g + 28) >> 2] = c[(d + 28) >> 2];
              c[d >> 2] = c[n >> 2];
              c[(d + 4) >> 2] = c[(n + 4) >> 2];
              c[(d + 8) >> 2] = c[(n + 8) >> 2];
              c[(d + 12) >> 2] = c[(n + 12) >> 2];
              c[(d + 16) >> 2] = c[(n + 16) >> 2];
              c[(d + 20) >> 2] = c[(n + 20) >> 2];
              c[(d + 24) >> 2] = c[(n + 24) >> 2];
              c[(d + 28) >> 2] = c[(n + 28) >> 2];
              d = g;
            }
            d = c[(d + 36 + (l << 2)) >> 2] | 0;
            e = (d + 40) | 0;
            if (!(c[e >> 2] | 0)) break;
            else m = (m + 1) & 31;
          }
        }
        if (!(hh(a, d) | 0)) e = 0;
        else e = c[a >> 2] | 0;
        lf(a, e, d);
        c[(a + 16) >> 2] = (c[(a + 16) >> 2] | 0) + 1;
        b = (b + -1) | 0;
        if (!b) break;
        d = c[a >> 2] | 0;
      }
      i = n;
      return;
    }
    function jg(b, d, e, f, h) {
      b = b | 0;
      d = d | 0;
      e = e | 0;
      f = f | 0;
      h = h | 0;
      var j = 0,
        k = 0.0,
        l = 0.0,
        m = 0.0,
        n = 0.0,
        o = 0.0,
        p = 0.0,
        q = 0.0,
        r = 0.0,
        s = 0.0,
        t = 0.0,
        u = 0.0,
        v = 0.0,
        w = 0.0,
        x = 0.0,
        y = 0.0,
        z = 0.0,
        A = 0.0,
        B = 0.0,
        C = 0.0,
        D = 0.0;
      j = i;
      i = (i + 32) | 0;
      d = a[(b + 8) >> 0] | 0 ? d : e;
      if ((((c[((c[(d + 4) >> 2] | 0) + 4) >> 2] | 0) + -21) | 0) >>> 0 >= 9) {
        i = j;
        return;
      }
      e = c[((c[(d + 8) >> 2] | 0) + 192) >> 2] | 0;
      y = +Sb[c[((c[e >> 2] | 0) + 48) >> 2] & 15](e);
      c[(b + 64) >> 2] = f;
      g[(b + 68) >> 2] = y + 0.05999999865889549;
      c[(b + 56) >> 2] = h;
      h = c[(b + 16) >> 2] | 0;
      ic[c[((c[h >> 2] | 0) + 28) >> 2] & 127](h, (j + 16) | 0, j);
      y = +g[j >> 2];
      x = +g[(j + 16) >> 2];
      w = +g[(j + 4) >> 2];
      v = +g[(j + 16 + 4) >> 2];
      u = +g[(j + 8) >> 2];
      t = +g[(j + 16 + 8) >> 2];
      h = c[(d + 12) >> 2] | 0;
      B = +g[h >> 2];
      o = +g[(h + 16) >> 2];
      C = +g[(h + 32) >> 2];
      z = +g[(h + 4) >> 2];
      m = +g[(h + 20) >> 2];
      A = +g[(h + 36) >> 2];
      q = +g[(h + 8) >> 2];
      k = +g[(h + 24) >> 2];
      r = +g[(h + 40) >> 2];
      D = -+g[(h + 48) >> 2];
      s = -+g[(h + 52) >> 2];
      l = -+g[(h + 56) >> 2];
      p =
        (y + x) * 0.5 * B +
        (w + v) * 0.5 * o +
        (u + t) * 0.5 * C +
        (B * D + o * s + C * l);
      n =
        (y + x) * 0.5 * z +
        (w + v) * 0.5 * m +
        (u + t) * 0.5 * A +
        (z * D + m * s + A * l);
      l =
        (y + x) * 0.5 * q +
        (w + v) * 0.5 * k +
        (u + t) * 0.5 * r +
        (q * D + k * s + r * l);
      s = +g[(b + 68) >> 2];
      o =
        ((y - x) * 0.5 + s) * +N(+(B + o * 0.0 + C * 0.0)) +
        ((w - v) * 0.5 + s) * +N(+(B * 0.0 + o + C * 0.0)) +
        ((u - t) * 0.5 + s) * +N(+(C + (B * 0.0 + o * 0.0)));
      m =
        ((y - x) * 0.5 + s) * +N(+(z + m * 0.0 + A * 0.0)) +
        ((w - v) * 0.5 + s) * +N(+(z * 0.0 + m + A * 0.0)) +
        ((u - t) * 0.5 + s) * +N(+(A + (z * 0.0 + m * 0.0)));
      k =
        ((y - x) * 0.5 + s) * +N(+(q + k * 0.0 + r * 0.0)) +
        ((w - v) * 0.5 + s) * +N(+(q * 0.0 + k + r * 0.0)) +
        ((u - t) * 0.5 + s) * +N(+(r + (q * 0.0 + k * 0.0)));
      g[(b + 24) >> 2] = p - o;
      g[(b + 28) >> 2] = n - m;
      g[(b + 32) >> 2] = l - k;
      g[(b + 36) >> 2] = 0.0;
      g[(b + 40) >> 2] = p + o;
      g[(b + 44) >> 2] = n + m;
      g[(b + 48) >> 2] = l + k;
      g[(b + 52) >> 2] = 0.0;
      mc[c[((c[e >> 2] | 0) + 64) >> 2] & 127](
        e,
        (b + 12) | 0,
        (b + 24) | 0,
        (b + 40) | 0
      );
      i = j;
      return;
    }
    function kg(b, d, e, f) {
      b = b | 0;
      d = d | 0;
      e = e | 0;
      f = f | 0;
      var h = 0,
        j = 0,
        k = 0,
        l = 0,
        m = 0,
        n = 0;
      l = i;
      i = (i + 16) | 0;
      c[(b + 8) >> 2] = 0;
      c[(b + 12) >> 2] = 1065353216;
      c[(b + 16) >> 2] = 1065353216;
      c[(b + 20) >> 2] = 1065353216;
      g[(b + 24) >> 2] = 0.0;
      g[(b + 44) >> 2] = 0.03999999910593033;
      c[(b + 52) >> 2] = 0;
      c[(b + 56) >> 2] = 1065353216;
      c[(b + 60) >> 2] = 1065353216;
      c[(b + 64) >> 2] = 1065353216;
      g[(b + 68) >> 2] = 0.0;
      c[(b + 72) >> 2] = -1082130432;
      c[(b + 76) >> 2] = -1082130432;
      c[(b + 80) >> 2] = -1082130432;
      g[(b + 84) >> 2] = 0.0;
      a[(b + 88) >> 0] = 0;
      c[b >> 2] = 7256;
      a[(b + 108) >> 0] = 1;
      c[(b + 104) >> 2] = 0;
      c[(b + 96) >> 2] = 0;
      c[(b + 100) >> 2] = 0;
      c[(b + 4) >> 2] = 4;
      if ((e | 0) <= 0) {
        c[(b + 96) >> 2] = e;
        vj(b);
        i = l;
        return;
      }
      c[6435] = (c[6435] | 0) + 1;
      h = yc((((e << 4) | 3) + 16) | 0) | 0;
      if (!h) k = 0;
      else {
        c[(((h + 4 + 15) & -16) + -4) >> 2] = h;
        k = (h + 4 + 15) & -16;
      }
      h = c[(b + 96) >> 2] | 0;
      if ((h | 0) > 0) {
        j = 0;
        do {
          m = (k + (j << 4)) | 0;
          n = ((c[(b + 104) >> 2] | 0) + (j << 4)) | 0;
          c[m >> 2] = c[n >> 2];
          c[(m + 4) >> 2] = c[(n + 4) >> 2];
          c[(m + 8) >> 2] = c[(n + 8) >> 2];
          c[(m + 12) >> 2] = c[(n + 12) >> 2];
          j = (j + 1) | 0;
        } while ((j | 0) != (h | 0));
      }
      h = c[(b + 104) >> 2] | 0;
      if (h | 0) {
        if (a[(b + 108) >> 0] | 0) {
          c[6436] = (c[6436] | 0) + 1;
          hd(c[(h + -4) >> 2] | 0);
        }
        c[(b + 104) >> 2] = 0;
      }
      a[(b + 108) >> 0] = 1;
      c[(b + 104) >> 2] = k;
      c[(b + 100) >> 2] = e;
      c[k >> 2] = c[l >> 2];
      c[(k + 4) >> 2] = c[(l + 4) >> 2];
      c[(k + 8) >> 2] = c[(l + 8) >> 2];
      c[(k + 12) >> 2] = c[(l + 12) >> 2];
      if ((e | 0) != 1) {
        h = 1;
        do {
          n = ((c[(b + 104) >> 2] | 0) + (h << 4)) | 0;
          c[n >> 2] = c[l >> 2];
          c[(n + 4) >> 2] = c[(l + 4) >> 2];
          c[(n + 8) >> 2] = c[(l + 8) >> 2];
          c[(n + 12) >> 2] = c[(l + 12) >> 2];
          h = (h + 1) | 0;
        } while ((h | 0) != (e | 0));
      }
      c[(b + 96) >> 2] = e;
      j = 0;
      h = d;
      while (1) {
        n = c[(b + 104) >> 2] | 0;
        d = c[(h + 4) >> 2] | 0;
        m = c[(h + 8) >> 2] | 0;
        c[(n + (j << 4)) >> 2] = c[h >> 2];
        c[(n + (j << 4) + 4) >> 2] = d;
        c[(n + (j << 4) + 8) >> 2] = m;
        g[(n + (j << 4) + 12) >> 2] = 0.0;
        j = (j + 1) | 0;
        if ((j | 0) == (e | 0)) break;
        else h = (h + f) | 0;
      }
      vj(b);
      i = l;
      return;
    }
    function lg(b) {
      b = b | 0;
      var d = 0;
      c[b >> 2] = 4756;
      d = c[(b + 176) >> 2] | 0;
      if (d | 0) {
        if (a[(b + 180) >> 0] | 0) {
          c[6436] = (c[6436] | 0) + 1;
          hd(c[(d + -4) >> 2] | 0);
        }
        c[(b + 176) >> 2] = 0;
      }
      a[(b + 180) >> 0] = 1;
      c[(b + 176) >> 2] = 0;
      c[(b + 168) >> 2] = 0;
      c[(b + 172) >> 2] = 0;
      d = c[(b + 156) >> 2] | 0;
      if (d | 0) {
        if (a[(b + 160) >> 0] | 0) {
          c[6436] = (c[6436] | 0) + 1;
          hd(c[(d + -4) >> 2] | 0);
        }
        c[(b + 156) >> 2] = 0;
      }
      a[(b + 160) >> 0] = 1;
      c[(b + 156) >> 2] = 0;
      c[(b + 148) >> 2] = 0;
      c[(b + 152) >> 2] = 0;
      d = c[(b + 136) >> 2] | 0;
      if (d | 0) {
        if (a[(b + 140) >> 0] | 0) {
          c[6436] = (c[6436] | 0) + 1;
          hd(c[(d + -4) >> 2] | 0);
        }
        c[(b + 136) >> 2] = 0;
      }
      a[(b + 140) >> 0] = 1;
      c[(b + 136) >> 2] = 0;
      c[(b + 128) >> 2] = 0;
      c[(b + 132) >> 2] = 0;
      d = c[(b + 116) >> 2] | 0;
      if (d | 0) {
        if (a[(b + 120) >> 0] | 0) {
          c[6436] = (c[6436] | 0) + 1;
          hd(c[(d + -4) >> 2] | 0);
        }
        c[(b + 116) >> 2] = 0;
      }
      a[(b + 120) >> 0] = 1;
      c[(b + 116) >> 2] = 0;
      c[(b + 108) >> 2] = 0;
      c[(b + 112) >> 2] = 0;
      d = c[(b + 96) >> 2] | 0;
      if (d | 0) {
        if (a[(b + 100) >> 0] | 0) {
          c[6436] = (c[6436] | 0) + 1;
          hd(c[(d + -4) >> 2] | 0);
        }
        c[(b + 96) >> 2] = 0;
      }
      a[(b + 100) >> 0] = 1;
      c[(b + 96) >> 2] = 0;
      c[(b + 88) >> 2] = 0;
      c[(b + 92) >> 2] = 0;
      d = c[(b + 76) >> 2] | 0;
      if (d | 0) {
        if (a[(b + 80) >> 0] | 0) {
          c[6436] = (c[6436] | 0) + 1;
          hd(c[(d + -4) >> 2] | 0);
        }
        c[(b + 76) >> 2] = 0;
      }
      a[(b + 80) >> 0] = 1;
      c[(b + 76) >> 2] = 0;
      c[(b + 68) >> 2] = 0;
      c[(b + 72) >> 2] = 0;
      d = c[(b + 56) >> 2] | 0;
      if (d | 0) {
        if (a[(b + 60) >> 0] | 0) {
          c[6436] = (c[6436] | 0) + 1;
          hd(c[(d + -4) >> 2] | 0);
        }
        c[(b + 56) >> 2] = 0;
      }
      a[(b + 60) >> 0] = 1;
      c[(b + 56) >> 2] = 0;
      c[(b + 48) >> 2] = 0;
      c[(b + 52) >> 2] = 0;
      d = c[(b + 36) >> 2] | 0;
      if (d | 0) {
        if (a[(b + 40) >> 0] | 0) {
          c[6436] = (c[6436] | 0) + 1;
          hd(c[(d + -4) >> 2] | 0);
        }
        c[(b + 36) >> 2] = 0;
      }
      a[(b + 40) >> 0] = 1;
      c[(b + 36) >> 2] = 0;
      c[(b + 28) >> 2] = 0;
      c[(b + 32) >> 2] = 0;
      d = c[(b + 16) >> 2] | 0;
      if (!d) {
        a[(b + 20) >> 0] = 1;
        c[(b + 16) >> 2] = 0;
        c[(b + 8) >> 2] = 0;
        b = (b + 12) | 0;
        c[b >> 2] = 0;
        return;
      }
      if (a[(b + 20) >> 0] | 0) {
        c[6436] = (c[6436] | 0) + 1;
        hd(c[(d + -4) >> 2] | 0);
      }
      c[(b + 16) >> 2] = 0;
      a[(b + 20) >> 0] = 1;
      c[(b + 16) >> 2] = 0;
      c[(b + 8) >> 2] = 0;
      b = (b + 12) | 0;
      c[b >> 2] = 0;
      return;
    }
    function mg(a, b, d, e) {
      a = a | 0;
      b = b | 0;
      d = d | 0;
      e = e | 0;
      var f = 0.0,
        h = 0.0,
        j = 0.0,
        k = 0.0,
        l = 0.0,
        m = 0.0,
        n = 0.0,
        o = 0.0,
        p = 0.0,
        q = 0.0,
        r = 0.0,
        s = 0.0,
        t = 0.0,
        u = 0.0,
        v = 0.0,
        w = 0.0,
        x = 0,
        y = 0.0;
      x = i;
      i = (i + 48) | 0;
      t = +g[e >> 2];
      u = +g[d >> 2];
      v = +g[(e + 4) >> 2];
      w = +g[(d + 4) >> 2];
      s = +g[(e + 8) >> 2];
      h = +g[(d + 8) >> 2];
      j = +O(
        +(
          (t - u) * 0.5 * (t - u) * 0.5 +
          (v - w) * 0.5 * (v - w) * 0.5 +
          (s - h) * 0.5 * (s - h) * 0.5
        )
      );
      k = +g[(a + 56) >> 2];
      d = +N(+k) > 0.7071067690849304;
      l = +g[(a + 52) >> 2];
      if (d) {
        r = 1.0 / +O(+(k * k + l * l));
        y = +g[(a + 48) >> 2];
        f = y * -(k * r);
        m = y;
        n = 0.0;
        o = -(k * r);
        p = l * r;
        q = (k * k + l * l) * r;
        r = -(y * l * r);
      } else {
        q = +g[(a + 48) >> 2];
        r = 1.0 / +O(+(q * q + l * l));
        f = (q * q + l * l) * r;
        m = q;
        n = -(l * r);
        o = q * r;
        p = 0.0;
        q = -(k * q * r);
        r = k * -(l * r);
      }
      y =
        (t + u) * 0.5 * m +
        (v + w) * 0.5 * l +
        (s + h) * 0.5 * k -
        +g[(a + 64) >> 2];
      m = (t + u) * 0.5 - m * y;
      n = j * n;
      o = j * o;
      u = j * p;
      q = j * q;
      r = j * r;
      t = j * f;
      g[x >> 2] = q + (n + m);
      g[(x + 4) >> 2] = r + (o + ((v + w) * 0.5 - l * y));
      g[(x + 8) >> 2] = t + (u + ((s + h) * 0.5 - k * y));
      g[(x + 12) >> 2] = 0.0;
      g[(x + 16) >> 2] = n + m - q;
      g[(x + 20) >> 2] = o + ((v + w) * 0.5 - l * y) - r;
      g[(x + 24) >> 2] = u + ((s + h) * 0.5 - k * y) - t;
      g[(x + 28) >> 2] = 0.0;
      g[(x + 32) >> 2] = m - n - q;
      g[(x + 36) >> 2] = (v + w) * 0.5 - l * y - o - r;
      g[(x + 40) >> 2] = (s + h) * 0.5 - k * y - u - t;
      g[(x + 44) >> 2] = 0.0;
      mc[c[((c[b >> 2] | 0) + 8) >> 2] & 127](b, x, 0, 0);
      g[x >> 2] = m - n - q;
      g[(x + 4) >> 2] = (v + w) * 0.5 - l * y - o - r;
      g[(x + 8) >> 2] = (s + h) * 0.5 - k * y - u - t;
      g[(x + 12) >> 2] = 0.0;
      g[(x + 16) >> 2] = q + (m - n);
      g[(x + 20) >> 2] = r + ((v + w) * 0.5 - l * y - o);
      g[(x + 24) >> 2] = t + ((s + h) * 0.5 - k * y - u);
      g[(x + 28) >> 2] = 0.0;
      g[(x + 32) >> 2] = q + (n + m);
      g[(x + 36) >> 2] = r + (o + ((v + w) * 0.5 - l * y));
      g[(x + 40) >> 2] = t + (u + ((s + h) * 0.5 - k * y));
      g[(x + 44) >> 2] = 0.0;
      mc[c[((c[b >> 2] | 0) + 8) >> 2] & 127](b, x, 0, 1);
      i = x;
      return;
    }
    function ng(a, b, e) {
      a = a | 0;
      b = b | 0;
      e = e | 0;
      mf(a, b, e) | 0;
      c[(b + 256) >> 2] = c[(a + 264) >> 2];
      c[(b + 260) >> 2] = c[(a + 268) >> 2];
      c[(b + 264) >> 2] = c[(a + 272) >> 2];
      c[(b + 268) >> 2] = c[(a + 276) >> 2];
      c[(b + 272) >> 2] = c[(a + 280) >> 2];
      c[(b + 276) >> 2] = c[(a + 284) >> 2];
      c[(b + 280) >> 2] = c[(a + 288) >> 2];
      c[(b + 284) >> 2] = c[(a + 292) >> 2];
      c[(b + 288) >> 2] = c[(a + 296) >> 2];
      c[(b + 292) >> 2] = c[(a + 300) >> 2];
      c[(b + 296) >> 2] = c[(a + 304) >> 2];
      c[(b + 300) >> 2] = c[(a + 308) >> 2];
      c[(b + 304) >> 2] = c[(a + 312) >> 2];
      c[(b + 308) >> 2] = c[(a + 316) >> 2];
      c[(b + 312) >> 2] = c[(a + 320) >> 2];
      c[(b + 316) >> 2] = c[(a + 324) >> 2];
      c[(b + 320) >> 2] = c[(a + 328) >> 2];
      c[(b + 324) >> 2] = c[(a + 332) >> 2];
      c[(b + 328) >> 2] = c[(a + 336) >> 2];
      c[(b + 332) >> 2] = c[(a + 340) >> 2];
      c[(b + 448) >> 2] = c[(a + 344) >> 2];
      c[(b + 336) >> 2] = c[(a + 544) >> 2];
      c[(b + 340) >> 2] = c[(a + 548) >> 2];
      c[(b + 344) >> 2] = c[(a + 552) >> 2];
      c[(b + 348) >> 2] = c[(a + 556) >> 2];
      c[(b + 352) >> 2] = c[(a + 348) >> 2];
      c[(b + 356) >> 2] = c[(a + 352) >> 2];
      c[(b + 360) >> 2] = c[(a + 356) >> 2];
      c[(b + 364) >> 2] = c[(a + 360) >> 2];
      c[(b + 368) >> 2] = c[(a + 364) >> 2];
      c[(b + 372) >> 2] = c[(a + 368) >> 2];
      c[(b + 376) >> 2] = c[(a + 372) >> 2];
      c[(b + 380) >> 2] = c[(a + 376) >> 2];
      c[(b + 384) >> 2] = c[(a + 380) >> 2];
      c[(b + 388) >> 2] = c[(a + 384) >> 2];
      c[(b + 392) >> 2] = c[(a + 388) >> 2];
      c[(b + 396) >> 2] = c[(a + 392) >> 2];
      c[(b + 400) >> 2] = c[(a + 396) >> 2];
      c[(b + 404) >> 2] = c[(a + 400) >> 2];
      c[(b + 408) >> 2] = c[(a + 404) >> 2];
      c[(b + 412) >> 2] = c[(a + 408) >> 2];
      c[(b + 416) >> 2] = c[(a + 412) >> 2];
      c[(b + 420) >> 2] = c[(a + 416) >> 2];
      c[(b + 424) >> 2] = c[(a + 420) >> 2];
      c[(b + 428) >> 2] = c[(a + 424) >> 2];
      c[(b + 432) >> 2] = c[(a + 428) >> 2];
      c[(b + 436) >> 2] = c[(a + 432) >> 2];
      c[(b + 440) >> 2] = c[(a + 436) >> 2];
      c[(b + 444) >> 2] = c[(a + 440) >> 2];
      c[(b + 452) >> 2] = c[(a + 444) >> 2];
      c[(b + 456) >> 2] = c[(a + 448) >> 2];
      c[(b + 484) >> 2] = d[(a + 452) >> 0];
      c[(b + 460) >> 2] = c[(a + 456) >> 2];
      c[(b + 464) >> 2] = c[(a + 460) >> 2];
      c[(b + 468) >> 2] = c[(a + 464) >> 2];
      c[(b + 472) >> 2] = c[(a + 468) >> 2];
      c[(b + 476) >> 2] = c[(a + 472) >> 2];
      c[(b + 480) >> 2] = c[(a + 476) >> 2];
      return 11858;
    }
    function og(b, d, e, f, h) {
      b = b | 0;
      d = +d;
      e = e | 0;
      f = f | 0;
      h = h | 0;
      var j = 0;
      j = i;
      i = (i + 144) | 0;
      c[(b + 164) >> 2] = 1065353216;
      c[(b + 168) >> 2] = 1065353216;
      c[(b + 172) >> 2] = 1065353216;
      g[(b + 176) >> 2] = 0.0;
      c[(b + 180) >> 2] = 0;
      g[(b + 184) >> 2] = 999999984306749440.0;
      c[(b + 188) >> 2] = 0;
      c[(b + 188 + 4) >> 2] = 0;
      c[(b + 188 + 8) >> 2] = 0;
      c[(b + 188 + 12) >> 2] = 0;
      c[(b + 204) >> 2] = 1;
      c[(b + 208) >> 2] = -1;
      c[(b + 212) >> 2] = -1;
      c[(b + 216) >> 2] = 1;
      g[(b + 220) >> 2] = 0.0;
      g[(b + 224) >> 2] = 0.5;
      g[(b + 228) >> 2] = 0.0;
      g[(b + 232) >> 2] = 0.0;
      c[(b + 236) >> 2] = 1;
      c[(b + 240) >> 2] = 0;
      g[(b + 244) >> 2] = 1.0;
      c[(b + 248) >> 2] = 0;
      c[(b + 248 + 4) >> 2] = 0;
      c[(b + 248 + 8) >> 2] = 0;
      c[(b + 248 + 12) >> 2] = 0;
      c[(b + 4) >> 2] = 1065353216;
      c[(b + 8) >> 2] = 0;
      c[(b + 8 + 4) >> 2] = 0;
      c[(b + 8 + 8) >> 2] = 0;
      c[(b + 8 + 12) >> 2] = 0;
      c[(b + 24) >> 2] = 1065353216;
      c[(b + 28) >> 2] = 0;
      c[(b + 28 + 4) >> 2] = 0;
      c[(b + 28 + 8) >> 2] = 0;
      c[(b + 28 + 12) >> 2] = 0;
      c[(b + 44) >> 2] = 1065353216;
      c[(b + 48) >> 2] = 0;
      c[(b + 48 + 4) >> 2] = 0;
      c[(b + 48 + 8) >> 2] = 0;
      c[(b + 48 + 12) >> 2] = 0;
      c[(b + 48 + 16) >> 2] = 0;
      c[b >> 2] = 4108;
      a[(b + 500) >> 0] = 1;
      c[(b + 496) >> 2] = 0;
      c[(b + 488) >> 2] = 0;
      c[(b + 492) >> 2] = 0;
      g[j >> 2] = d;
      c[(j + 4) >> 2] = e;
      c[(j + 72) >> 2] = f;
      c[(j + 76) >> 2] = c[h >> 2];
      c[(j + 76 + 4) >> 2] = c[(h + 4) >> 2];
      c[(j + 76 + 8) >> 2] = c[(h + 8) >> 2];
      c[(j + 76 + 12) >> 2] = c[(h + 12) >> 2];
      g[(j + 92) >> 2] = 0.0;
      g[(j + 96) >> 2] = 0.0;
      g[(j + 100) >> 2] = 0.5;
      g[(j + 104) >> 2] = 0.0;
      g[(j + 108) >> 2] = 0.0;
      g[(j + 112) >> 2] = 0.800000011920929;
      g[(j + 116) >> 2] = 1.0;
      a[(j + 120) >> 0] = 0;
      g[(j + 124) >> 2] = 0.004999999888241291;
      g[(j + 128) >> 2] = 0.009999999776482582;
      g[(j + 132) >> 2] = 0.009999999776482582;
      g[(j + 136) >> 2] = 0.009999999776482582;
      c[(j + 8) >> 2] = 1065353216;
      c[(j + 12) >> 2] = 0;
      c[(j + 12 + 4) >> 2] = 0;
      c[(j + 12 + 8) >> 2] = 0;
      c[(j + 12 + 12) >> 2] = 0;
      c[(j + 28) >> 2] = 1065353216;
      c[(j + 32) >> 2] = 0;
      c[(j + 32 + 4) >> 2] = 0;
      c[(j + 32 + 8) >> 2] = 0;
      c[(j + 32 + 12) >> 2] = 0;
      c[(j + 48) >> 2] = 1065353216;
      c[(j + 52) >> 2] = 0;
      c[(j + 52 + 4) >> 2] = 0;
      c[(j + 52 + 8) >> 2] = 0;
      c[(j + 52 + 12) >> 2] = 0;
      c[(j + 52 + 16) >> 2] = 0;
      Od(b, j);
      i = j;
      return;
    }
    function pg(b, d) {
      b = b | 0;
      d = d | 0;
      var e = 0,
        f = 0,
        h = 0,
        i = 0;
      c[6435] = (c[6435] | 0) + 1;
      e = yc(627) | 0;
      if (!e) e = 0;
      else {
        c[(((e + 4 + 15) & -16) + -4) >> 2] = e;
        e = (e + 4 + 15) & -16;
      }
      c[(e + 4) >> 2] = 5;
      c[e >> 2] = 4432;
      c[(e + 8) >> 2] = -1;
      c[(e + 12) >> 2] = -1;
      g[(e + 16) >> 2] = 3402823466385288598117041.0e14;
      a[(e + 20) >> 0] = 1;
      a[(e + 21) >> 0] = 0;
      c[(e + 24) >> 2] = -1;
      c[(e + 28) >> 2] = b;
      Il();
      c[(e + 32) >> 2] = 23268;
      g[(e + 36) >> 2] = 0.0;
      g[(e + 40) >> 2] = 0.30000001192092896;
      c[(e + 44) >> 2] = 0;
      c[e >> 2] = 4648;
      h = (e + 300) | 0;
      c[h >> 2] = c[d >> 2];
      c[(h + 4) >> 2] = c[(d + 4) >> 2];
      c[(h + 8) >> 2] = c[(d + 8) >> 2];
      c[(h + 12) >> 2] = c[(d + 12) >> 2];
      f = (e + 316) | 0;
      c[f >> 2] = c[(d + 16) >> 2];
      c[(f + 4) >> 2] = c[(d + 16 + 4) >> 2];
      c[(f + 8) >> 2] = c[(d + 16 + 8) >> 2];
      c[(f + 12) >> 2] = c[(d + 16 + 12) >> 2];
      b = (e + 332) | 0;
      c[b >> 2] = c[(d + 32) >> 2];
      c[(b + 4) >> 2] = c[(d + 32 + 4) >> 2];
      c[(b + 8) >> 2] = c[(d + 32 + 8) >> 2];
      c[(b + 12) >> 2] = c[(d + 32 + 12) >> 2];
      i = (e + 348) | 0;
      c[i >> 2] = c[(d + 48) >> 2];
      c[(i + 4) >> 2] = c[(d + 48 + 4) >> 2];
      c[(i + 8) >> 2] = c[(d + 48 + 8) >> 2];
      c[(i + 12) >> 2] = c[(d + 48 + 12) >> 2];
      d = (e + 364) | 0;
      a[(e + 527) >> 0] = 0;
      c[d >> 2] = c[h >> 2];
      c[(d + 4) >> 2] = c[(h + 4) >> 2];
      c[(d + 8) >> 2] = c[(h + 8) >> 2];
      c[(d + 12) >> 2] = c[(h + 12) >> 2];
      d = (e + 380) | 0;
      c[d >> 2] = c[f >> 2];
      c[(d + 4) >> 2] = c[(f + 4) >> 2];
      c[(d + 8) >> 2] = c[(f + 8) >> 2];
      c[(d + 12) >> 2] = c[(f + 12) >> 2];
      d = (e + 396) | 0;
      c[d >> 2] = c[b >> 2];
      c[(d + 4) >> 2] = c[(b + 4) >> 2];
      c[(d + 8) >> 2] = c[(b + 8) >> 2];
      c[(d + 12) >> 2] = c[(b + 12) >> 2];
      d = (e + 412) | 0;
      a[(e + 524) >> 0] = 0;
      a[(e + 525) >> 0] = 0;
      a[(e + 526) >> 0] = 0;
      a[(e + 552) >> 0] = 0;
      c[d >> 2] = 0;
      c[(d + 4) >> 2] = 0;
      c[(d + 8) >> 2] = 0;
      c[(d + 12) >> 2] = 0;
      g[(e + 572) >> 2] = -1.0;
      g[(e + 444) >> 2] = 999999984306749440.0;
      g[(e + 448) >> 2] = 999999984306749440.0;
      g[(e + 452) >> 2] = 999999984306749440.0;
      g[(e + 428) >> 2] = 1.0;
      g[(e + 432) >> 2] = 0.30000001192092896;
      g[(e + 436) >> 2] = 1.0;
      g[(e + 440) >> 2] = 0.009999999776482582;
      g[(e + 456) >> 2] = 0.05000000074505806;
      c[(e + 592) >> 2] = 0;
      g[(e + 596) >> 2] = 0.0;
      g[(e + 600) >> 2] = 0.699999988079071;
      g[(e + 604) >> 2] = 0.0;
      return e | 0;
    }
    function qg(b, d) {
      b = b | 0;
      d = d | 0;
      var e = 0,
        f = 0,
        g = 0,
        h = 0,
        i = 0,
        j = 0;
      Zd(b, d);
      c[b >> 2] = 3068;
      c[6435] = (c[6435] | 0) + 1;
      e = yc(27) | 0;
      i = (e + 4 + 15) & -16;
      c[(i + -4) >> 2] = e;
      a[(i + 4) >> 0] = 0;
      c[((e + 4 + 15) & -16) >> 2] = 3100;
      c[(b + 92) >> 2] = i;
      c[6435] = (c[6435] | 0) + 1;
      i = yc(27) | 0;
      e = (i + 4 + 15) & -16;
      c[(e + -4) >> 2] = i;
      a[(e + 4) >> 0] = 0;
      c[((i + 4 + 15) & -16) >> 2] = 3120;
      c[(b + 96) >> 2] = e;
      c[6435] = (c[6435] | 0) + 1;
      e = yc(27) | 0;
      if (!e) e = 0;
      else {
        c[(((e + 4 + 15) & -16) + -4) >> 2] = e;
        e = (e + 4 + 15) & -16;
      }
      c[e >> 2] = 3120;
      c[(b + 100) >> 2] = e;
      a[(e + 4) >> 0] = 1;
      c[6435] = (c[6435] | 0) + 1;
      i = yc(27) | 0;
      e = (i + 4 + 15) & -16;
      c[(e + -4) >> 2] = i;
      a[(e + 4) >> 0] = 0;
      c[((i + 4 + 15) & -16) >> 2] = 3140;
      c[(b + 104) >> 2] = e;
      c[6435] = (c[6435] | 0) + 1;
      e = yc(27) | 0;
      if (!e) e = 0;
      else {
        c[(((e + 4 + 15) & -16) + -4) >> 2] = e;
        e = (e + 4 + 15) & -16;
      }
      c[e >> 2] = 3160;
      c[(b + 108) >> 2] = e;
      a[(e + 4) >> 0] = 1;
      if (!(a[(b + 20) >> 0] | 0)) return;
      e = c[(b + 16) >> 2] | 0;
      if (!e) return;
      if ((c[e >> 2] | 0) >= 156) return;
      f = c[(e + 16) >> 2] | 0;
      if (f) {
        c[6436] = (c[6436] | 0) + 1;
        hd(c[(f + -4) >> 2] | 0);
        e = c[(b + 16) >> 2] | 0;
        if (!e) i = (b + 16) | 0;
        else {
          f = (b + 16) | 0;
          g = 11;
        }
      } else {
        f = (b + 16) | 0;
        g = 11;
      }
      if ((g | 0) == 11) {
        c[6436] = (c[6436] | 0) + 1;
        hd(c[(e + -4) >> 2] | 0);
        i = f;
      }
      c[6435] = (c[6435] | 0) + 1;
      e = yc(39) | 0;
      if (!e) h = 0;
      else {
        c[(((e + 4 + 15) & -16) + -4) >> 2] = e;
        h = (e + 4 + 15) & -16;
      }
      e = c[(d + 12) >> 2] | 0;
      c[h >> 2] = 156;
      f = (h + 4) | 0;
      c[f >> 2] = e;
      c[6435] = (c[6435] | 0) + 1;
      e = yc((((e * 156) | 3) + 16) | 0) | 0;
      if (!e) e = 0;
      else {
        c[(((e + 4 + 15) & -16) + -4) >> 2] = e;
        e = (e + 4 + 15) & -16;
      }
      c[(h + 16) >> 2] = e;
      c[(h + 12) >> 2] = e;
      f = c[f >> 2] | 0;
      c[(h + 8) >> 2] = f;
      if ((f + -1) | 0) {
        b = c[h >> 2] | 0;
        g = (f + -1) | 0;
        d = e;
        do {
          j = d;
          d = (d + b) | 0;
          c[j >> 2] = d;
          g = (g + -1) | 0;
        } while ((g | 0) != 0);
        e = (e + (_(b, (f + -1) | 0) | 0)) | 0;
      }
      c[e >> 2] = 0;
      c[i >> 2] = h;
      return;
    }
    function rg(b, d, e, f) {
      b = b | 0;
      d = d | 0;
      e = e | 0;
      f = f | 0;
      var h = 0;
      c[6435] = (c[6435] | 0) + 1;
      h = yc(627) | 0;
      if (!h) h = 0;
      else {
        c[(((h + 4 + 15) & -16) + -4) >> 2] = h;
        h = (h + 4 + 15) & -16;
      }
      c[(h + 4) >> 2] = 5;
      c[(h + 8) >> 2] = -1;
      c[(h + 12) >> 2] = -1;
      g[(h + 16) >> 2] = 3402823466385288598117041.0e14;
      a[(h + 20) >> 0] = 1;
      a[(h + 21) >> 0] = 0;
      c[(h + 24) >> 2] = -1;
      c[(h + 28) >> 2] = b;
      c[(h + 32) >> 2] = d;
      g[(h + 36) >> 2] = 0.0;
      g[(h + 40) >> 2] = 0.30000001192092896;
      c[(h + 44) >> 2] = 0;
      c[h >> 2] = 4648;
      d = (h + 300) | 0;
      c[d >> 2] = c[e >> 2];
      c[(d + 4) >> 2] = c[(e + 4) >> 2];
      c[(d + 8) >> 2] = c[(e + 8) >> 2];
      c[(d + 12) >> 2] = c[(e + 12) >> 2];
      d = (h + 316) | 0;
      c[d >> 2] = c[(e + 16) >> 2];
      c[(d + 4) >> 2] = c[(e + 16 + 4) >> 2];
      c[(d + 8) >> 2] = c[(e + 16 + 8) >> 2];
      c[(d + 12) >> 2] = c[(e + 16 + 12) >> 2];
      d = (h + 332) | 0;
      c[d >> 2] = c[(e + 32) >> 2];
      c[(d + 4) >> 2] = c[(e + 32 + 4) >> 2];
      c[(d + 8) >> 2] = c[(e + 32 + 8) >> 2];
      c[(d + 12) >> 2] = c[(e + 32 + 12) >> 2];
      d = (h + 348) | 0;
      c[d >> 2] = c[(e + 48) >> 2];
      c[(d + 4) >> 2] = c[(e + 48 + 4) >> 2];
      c[(d + 8) >> 2] = c[(e + 48 + 8) >> 2];
      c[(d + 12) >> 2] = c[(e + 48 + 12) >> 2];
      e = (h + 364) | 0;
      c[e >> 2] = c[f >> 2];
      c[(e + 4) >> 2] = c[(f + 4) >> 2];
      c[(e + 8) >> 2] = c[(f + 8) >> 2];
      c[(e + 12) >> 2] = c[(f + 12) >> 2];
      e = (h + 380) | 0;
      c[e >> 2] = c[(f + 16) >> 2];
      c[(e + 4) >> 2] = c[(f + 16 + 4) >> 2];
      c[(e + 8) >> 2] = c[(f + 16 + 8) >> 2];
      c[(e + 12) >> 2] = c[(f + 16 + 12) >> 2];
      e = (h + 396) | 0;
      c[e >> 2] = c[(f + 32) >> 2];
      c[(e + 4) >> 2] = c[(f + 32 + 4) >> 2];
      c[(e + 8) >> 2] = c[(f + 32 + 8) >> 2];
      c[(e + 12) >> 2] = c[(f + 32 + 12) >> 2];
      e = (h + 412) | 0;
      c[e >> 2] = c[(f + 48) >> 2];
      c[(e + 4) >> 2] = c[(f + 48 + 4) >> 2];
      c[(e + 8) >> 2] = c[(f + 48 + 8) >> 2];
      c[(e + 12) >> 2] = c[(f + 48 + 12) >> 2];
      a[(h + 552) >> 0] = 0;
      c[(h + 524) >> 2] = 0;
      g[(h + 572) >> 2] = -1.0;
      g[(h + 444) >> 2] = 999999984306749440.0;
      g[(h + 448) >> 2] = 999999984306749440.0;
      g[(h + 452) >> 2] = 999999984306749440.0;
      g[(h + 428) >> 2] = 1.0;
      g[(h + 432) >> 2] = 0.30000001192092896;
      g[(h + 436) >> 2] = 1.0;
      g[(h + 440) >> 2] = 0.009999999776482582;
      g[(h + 456) >> 2] = 0.05000000074505806;
      c[(h + 592) >> 2] = 0;
      g[(h + 596) >> 2] = 0.0;
      g[(h + 600) >> 2] = 0.699999988079071;
      g[(h + 604) >> 2] = 0.0;
      return h | 0;
    }
    function sg(b, d, e, f) {
      b = b | 0;
      d = d | 0;
      e = e | 0;
      f = f | 0;
      var g = 0,
        h = 0,
        i = 0,
        j = 0,
        k = 0,
        l = 0,
        m = 0,
        n = 0;
      l = c[d >> 2] | 0;
      l = Zb[c[((c[l >> 2] | 0) + 56) >> 2] & 31](l, 48) | 0;
      c[(l + 4) >> 2] = c[d >> 2];
      c[l >> 2] = 6228;
      a[(l + 28) >> 0] = 1;
      c[(l + 24) >> 2] = 0;
      c[(l + 16) >> 2] = 0;
      c[(l + 20) >> 2] = 0;
      c[(l + 32) >> 2] = c[(d + 4) >> 2];
      a[(l + 36) >> 0] = 0;
      c[6435] = (c[6435] | 0) + 1;
      b = yc(87) | 0;
      if (!b) k = 0;
      else {
        c[(((b + 4 + 15) & -16) + -4) >> 2] = b;
        k = (b + 4 + 15) & -16;
      }
      c[k >> 2] = 9324;
      h = (k + 20) | 0;
      a[h >> 0] = 1;
      i = (k + 16) | 0;
      c[i >> 2] = 0;
      d = (k + 8) | 0;
      c[d >> 2] = 0;
      j = (k + 12) | 0;
      c[j >> 2] = 0;
      a[(k + 24) >> 0] = 0;
      a[(k + 44) >> 0] = 1;
      c[(k + 40) >> 2] = 0;
      c[(k + 32) >> 2] = 0;
      c[(k + 36) >> 2] = 0;
      a[(k + 64) >> 0] = 1;
      c[(k + 60) >> 2] = 0;
      c[(k + 52) >> 2] = 0;
      c[(k + 56) >> 2] = 0;
      c[6435] = (c[6435] | 0) + 1;
      b = yc(43) | 0;
      if (!b) g = 0;
      else {
        c[(((b + 4 + 15) & -16) + -4) >> 2] = b;
        g = (b + 4 + 15) & -16;
      }
      b = c[d >> 2] | 0;
      if ((b | 0) > 0) {
        d = 0;
        do {
          m = (g + ((d * 12) | 0)) | 0;
          n = ((c[i >> 2] | 0) + ((d * 12) | 0)) | 0;
          c[m >> 2] = c[n >> 2];
          c[(m + 4) >> 2] = c[(n + 4) >> 2];
          c[(m + 8) >> 2] = c[(n + 8) >> 2];
          d = (d + 1) | 0;
        } while ((d | 0) != (b | 0));
      }
      b = c[i >> 2] | 0;
      if (!b) {
        a[h >> 0] = 1;
        c[i >> 2] = g;
        c[j >> 2] = 2;
        Kf(k);
        n = (l + 8) | 0;
        c[n >> 2] = k;
        n = (e + 4) | 0;
        n = c[n >> 2] | 0;
        n = (n + 68) | 0;
        n = c[n >> 2] | 0;
        m = (l + 40) | 0;
        c[m >> 2] = n;
        m = (f + 4) | 0;
        m = c[m >> 2] | 0;
        m = (m + 68) | 0;
        m = c[m >> 2] | 0;
        n = (l + 44) | 0;
        c[n >> 2] = m;
        return l | 0;
      }
      if (a[h >> 0] | 0) {
        c[6436] = (c[6436] | 0) + 1;
        hd(c[(b + -4) >> 2] | 0);
      }
      c[i >> 2] = 0;
      a[h >> 0] = 1;
      c[i >> 2] = g;
      c[j >> 2] = 2;
      Kf(k);
      n = (l + 8) | 0;
      c[n >> 2] = k;
      n = (e + 4) | 0;
      n = c[n >> 2] | 0;
      n = (n + 68) | 0;
      n = c[n >> 2] | 0;
      m = (l + 40) | 0;
      c[m >> 2] = n;
      m = (f + 4) | 0;
      m = c[m >> 2] | 0;
      m = (m + 68) | 0;
      m = c[m >> 2] | 0;
      n = (l + 44) | 0;
      c[n >> 2] = m;
      return l | 0;
    }
    function tg(a, b) {
      a = a | 0;
      b = b | 0;
      var d = 0,
        e = 0,
        f = 0,
        g = 0;
      Ab[c[((c[b >> 2] | 0) + 32) >> 2] & 255](b);
      d = Ob[c[((c[b >> 2] | 0) + 16) >> 2] & 63](b, 104, 1) | 0;
      e = c[(d + 8) >> 2] | 0;
      f = e;
      g = (f + 104) | 0;
      do {
        c[f >> 2] = 0;
        f = (f + 4) | 0;
      } while ((f | 0) < (g | 0));
      c[(e + 88) >> 2] = c[(a + 248) >> 2];
      c[(e + 92) >> 2] = c[(a + 252) >> 2];
      c[(e + 96) >> 2] = c[(a + 256) >> 2];
      c[(e + 100) >> 2] = c[(a + 260) >> 2];
      c[e >> 2] = c[(a + 92) >> 2];
      c[(e + 4) >> 2] = c[(a + 96) >> 2];
      c[(e + 8) >> 2] = c[(a + 100) >> 2];
      c[(e + 12) >> 2] = c[(a + 104) >> 2];
      c[(e + 16) >> 2] = c[(a + 108) >> 2];
      c[(e + 20) >> 2] = c[(a + 116) >> 2];
      c[(e + 24) >> 2] = c[(a + 120) >> 2];
      c[(e + 28) >> 2] = c[(a + 124) >> 2];
      c[(e + 32) >> 2] = c[(a + 128) >> 2];
      c[(e + 36) >> 2] = c[(a + 132) >> 2];
      c[(e + 40) >> 2] = c[(a + 140) >> 2];
      c[(e + 44) >> 2] = c[(a + 144) >> 2];
      c[(e + 48) >> 2] = c[(a + 148) >> 2];
      c[(e + 52) >> 2] = c[(a + 152) >> 2];
      c[(e + 56) >> 2] = c[(a + 168) >> 2];
      c[(e + 60) >> 2] = c[(a + 172) >> 2];
      c[(e + 64) >> 2] = c[(a + 112) >> 2];
      c[(e + 68) >> 2] = c[(a + 156) >> 2];
      c[(e + 72) >> 2] = c[(a + 160) >> 2];
      c[(e + 76) >> 2] = c[(a + 164) >> 2];
      c[(e + 80) >> 2] = c[(a + 136) >> 2];
      yb[c[((c[b >> 2] | 0) + 20) >> 2] & 31](b, d, 11938, 1145853764, e);
      d = c[(a + 8) >> 2] | 0;
      if ((d | 0) <= 0) {
        mj(a, b);
        td(a, b);
        a = c[b >> 2] | 0;
        a = (a + 36) | 0;
        a = c[a >> 2] | 0;
        Ab[a & 255](b);
        return;
      }
      f = 0;
      do {
        e = c[((c[(a + 16) >> 2] | 0) + (f << 2)) >> 2] | 0;
        if (c[(e + 236) >> 2] & 8) {
          g = Eb[c[((c[e >> 2] | 0) + 16) >> 2] & 127](e) | 0;
          g = Ob[c[((c[b >> 2] | 0) + 16) >> 2] & 63](b, g, 1) | 0;
          d =
            Ob[c[((c[e >> 2] | 0) + 20) >> 2] & 63](e, c[(g + 8) >> 2] | 0, b) |
            0;
          yb[c[((c[b >> 2] | 0) + 20) >> 2] & 31](b, g, d, 1497645651, e);
          d = c[(a + 8) >> 2] | 0;
        }
        f = (f + 1) | 0;
      } while ((f | 0) < (d | 0));
      mj(a, b);
      td(a, b);
      a = c[b >> 2] | 0;
      a = (a + 36) | 0;
      a = c[a >> 2] | 0;
      Ab[a & 255](b);
      return;
    }
    function ug(a, b) {
      a = a | 0;
      b = +b;
      var d = 0,
        e = 0,
        f = 0,
        h = 0,
        j = 0.0,
        k = 0.0,
        l = 0.0;
      h = i;
      i = (i + 32) | 0;
      d = c[(a + 8) >> 2] | 0;
      if ((d | 0) <= 0) {
        i = h;
        return;
      }
      f = 0;
      do {
        e = c[((c[(a + 16) >> 2] | 0) + (f << 2)) >> 2] | 0;
        if (
          (!((e | 0) == 0 ? 1 : ((c[(e + 236) >> 2] & 2) | 0) == 0)
          ? (c[(e + 216) >> 2] | 0) != 2
          : 0)
            ? !(b == 0.0 ? 1 : ((c[(e + 204) >> 2] & 2) | 0) == 0)
            : 0
        ) {
          d = c[(e + 480) >> 2] | 0;
          if (!d) d = (e + 4) | 0;
          else {
            Cb[c[((c[d >> 2] | 0) + 8) >> 2] & 127](d, (e + 4) | 0);
            d = (e + 4) | 0;
          }
          k = (1.0 / b) * (+g[(e + 56) >> 2] - +g[(e + 120) >> 2]);
          l = (1.0 / b) * (+g[(e + 60) >> 2] - +g[(e + 124) >> 2]);
          g[(e + 312) >> 2] =
            (1.0 / b) * (+g[(e + 52) >> 2] - +g[(e + 116) >> 2]);
          g[(e + 316) >> 2] = k;
          g[(e + 320) >> 2] = l;
          g[(e + 324) >> 2] = 0.0;
          Gf((e + 68) | 0, d, (h + 8) | 0, h);
          l = +g[h >> 2];
          k = (1.0 / b) * l * +g[(h + 8 + 4) >> 2];
          j = (1.0 / b) * l * +g[(h + 8 + 8) >> 2];
          g[(e + 328) >> 2] = (1.0 / b) * +g[(h + 8) >> 2] * l;
          g[(e + 332) >> 2] = k;
          g[(e + 336) >> 2] = j;
          g[(e + 340) >> 2] = 0.0;
          c[(e + 132) >> 2] = c[(e + 312) >> 2];
          c[(e + 132 + 4) >> 2] = c[(e + 312 + 4) >> 2];
          c[(e + 132 + 8) >> 2] = c[(e + 312 + 8) >> 2];
          c[(e + 132 + 12) >> 2] = c[(e + 312 + 12) >> 2];
          c[(e + 148) >> 2] = c[(e + 328) >> 2];
          c[(e + 148 + 4) >> 2] = c[(e + 328 + 4) >> 2];
          c[(e + 148 + 8) >> 2] = c[(e + 328 + 8) >> 2];
          c[(e + 148 + 12) >> 2] = c[(e + 328 + 12) >> 2];
          c[(e + 68) >> 2] = c[d >> 2];
          c[(e + 68 + 4) >> 2] = c[(d + 4) >> 2];
          c[(e + 68 + 8) >> 2] = c[(d + 8) >> 2];
          c[(e + 68 + 12) >> 2] = c[(d + 12) >> 2];
          c[(e + 84) >> 2] = c[(e + 20) >> 2];
          c[(e + 84 + 4) >> 2] = c[(e + 20 + 4) >> 2];
          c[(e + 84 + 8) >> 2] = c[(e + 20 + 8) >> 2];
          c[(e + 84 + 12) >> 2] = c[(e + 20 + 12) >> 2];
          c[(e + 100) >> 2] = c[(e + 36) >> 2];
          c[(e + 100 + 4) >> 2] = c[(e + 36 + 4) >> 2];
          c[(e + 100 + 8) >> 2] = c[(e + 36 + 8) >> 2];
          c[(e + 100 + 12) >> 2] = c[(e + 36 + 12) >> 2];
          c[(e + 116) >> 2] = c[(e + 52) >> 2];
          c[(e + 116 + 4) >> 2] = c[(e + 52 + 4) >> 2];
          c[(e + 116 + 8) >> 2] = c[(e + 52 + 8) >> 2];
          c[(e + 116 + 12) >> 2] = c[(e + 52 + 12) >> 2];
          d = c[(a + 8) >> 2] | 0;
        }
        f = (f + 1) | 0;
      } while ((f | 0) < (d | 0));
      i = h;
      return;
    }
    function vg(a, b, d) {
      a = a | 0;
      b = b | 0;
      d = d | 0;
      var e = 0,
        f = 0,
        g = 0,
        h = 0,
        i = 0,
        j = 0,
        k = 0,
        l = 0,
        m = 0,
        n = 0;
      c[6421] = (c[6421] | 0) + 1;
      g =
        ((((((d << 16) | b) + ~(((d << 16) | b) << 15)) >> 10) ^
          (((d << 16) | b) + ~(((d << 16) | b) << 15))) *
          9) |
        0;
      l = c[(a + 40) >> 2] | 0;
      g =
        (l +
          ((((c[(a + 12) >> 2] | 0) + -1) &
            (((((g >> 6) ^ g) + ~(((g >> 6) ^ g) << 11)) >> 16) ^
              (((g >> 6) ^ g) + ~(((g >> 6) ^ g) << 11)))) <<
            2)) |
        0;
      f = c[g >> 2] | 0;
      if ((f | 0) == -1) {
        n = 0;
        return n | 0;
      }
      m = c[(a + 16) >> 2] | 0;
      e = f;
      while (1) {
        k = (m + ((e * 12) | 0)) | 0;
        if (
          (c[k >> 2] | 0) == (b | 0)
            ? (c[(m + ((e * 12) | 0) + 4) >> 2] | 0) == (d | 0)
            : 0
        )
          break;
        e = c[((c[(a + 60) >> 2] | 0) + (e << 2)) >> 2] | 0;
        if ((e | 0) == -1) {
          e = 0;
          n = 21;
          break;
        }
      }
      if ((n | 0) == 21) return e | 0;
      if (!k) {
        n = 0;
        return n | 0;
      }
      j = c[(m + ((e * 12) | 0) + 8) >> 2] | 0;
      i = (((e * 12) | 0) / 12) | 0;
      b = c[(a + 60) >> 2] | 0;
      if ((f | 0) != (i | 0)) {
        while (1) {
          d = (b + (f << 2)) | 0;
          e = c[d >> 2] | 0;
          if ((e | 0) == (i | 0)) break;
          else f = e;
        }
        e = c[(b + (i << 2)) >> 2] | 0;
        if ((f | 0) == -1) n = 11;
        else c[d >> 2] = e;
      } else {
        e = c[(b + (f << 2)) >> 2] | 0;
        n = 11;
      }
      if ((n | 0) == 11) c[g >> 2] = e;
      g = ((c[(a + 8) >> 2] | 0) + -1) | 0;
      if ((g | 0) == (i | 0)) {
        c[(a + 8) >> 2] = i;
        n = j;
        return n | 0;
      }
      h =
        (c[(m + ((g * 12) | 0) + 4) >> 2] << 16) | c[(m + ((g * 12) | 0)) >> 2];
      h = ((((h + ~(h << 15)) >> 10) ^ (h + ~(h << 15))) * 9) | 0;
      h =
        (((((h >> 6) ^ h) + ~(((h >> 6) ^ h) << 11)) >> 16) ^
          (((h >> 6) ^ h) + ~(((h >> 6) ^ h) << 11))) &
        ((c[(a + 12) >> 2] | 0) + -1);
      e = c[(l + (h << 2)) >> 2] | 0;
      b = c[(a + 60) >> 2] | 0;
      if ((e | 0) != (g | 0)) {
        f = e;
        while (1) {
          d = (b + (f << 2)) | 0;
          e = c[d >> 2] | 0;
          if ((e | 0) == (g | 0)) break;
          else f = e;
        }
        e = c[(b + (g << 2)) >> 2] | 0;
        if ((f | 0) == -1) n = 19;
        else c[d >> 2] = e;
      } else {
        e = c[(b + (g << 2)) >> 2] | 0;
        n = 19;
      }
      if ((n | 0) == 19) c[(l + (h << 2)) >> 2] = e;
      c[k >> 2] = c[(m + ((g * 12) | 0)) >> 2];
      c[(k + 4) >> 2] = c[(m + ((g * 12) | 0) + 4) >> 2];
      c[(k + 8) >> 2] = c[(m + ((g * 12) | 0) + 8) >> 2];
      n = ((c[(a + 40) >> 2] | 0) + (h << 2)) | 0;
      c[((c[(a + 60) >> 2] | 0) + (i << 2)) >> 2] = c[n >> 2];
      c[n >> 2] = i;
      c[(a + 8) >> 2] = (c[(a + 8) >> 2] | 0) + -1;
      n = j;
      return n | 0;
    }
    function wg(a, b) {
      a = a | 0;
      b = b | 0;
      var d = 0,
        e = 0,
        f = 0,
        g = 0,
        h = 0,
        i = 0;
      d = c[(b + 236) >> 2] | 0;
      if (((b | 0) == 0) | ((d | 0) != 8)) {
        if (!(((b | 0) == 0) | (((d & 2) | 0) == 0))) {
          Cb[c[((c[a >> 2] | 0) + 92) >> 2] & 127](a, b);
          return;
        }
        d = c[(b + 188) >> 2] | 0;
        if (d | 0) {
          h = c[(a + 68) >> 2] | 0;
          h = Eb[c[((c[h >> 2] | 0) + 36) >> 2] & 127](h) | 0;
          ic[c[((c[h >> 2] | 0) + 40) >> 2] & 127](h, d, c[(a + 24) >> 2] | 0);
          h = c[(a + 68) >> 2] | 0;
          ic[c[((c[h >> 2] | 0) + 12) >> 2] & 127](h, d, c[(a + 24) >> 2] | 0);
          c[(b + 188) >> 2] = 0;
        }
        d = c[(a + 8) >> 2] | 0;
        if ((d | 0) <= 0) return;
        e = c[(a + 16) >> 2] | 0;
        h = 0;
        while (1) {
          f = (e + (h << 2)) | 0;
          if ((c[f >> 2] | 0) == (b | 0)) break;
          g = (h + 1) | 0;
          if ((g | 0) < (d | 0)) h = g;
          else {
            i = 26;
            break;
          }
        }
        if ((i | 0) == 26) return;
        if ((h | 0) >= (d | 0)) return;
        c[f >> 2] = c[(e + ((d + -1) << 2)) >> 2];
        c[((c[(a + 16) >> 2] | 0) + ((d + -1) << 2)) >> 2] = b;
        c[(a + 8) >> 2] = d + -1;
        return;
      }
      f = c[(a + 328) >> 2] | 0;
      a: do
        if ((f | 0) > 0) {
          g = c[(a + 336) >> 2] | 0;
          d = 0;
          while (1) {
            e = (g + (d << 2)) | 0;
            if ((c[e >> 2] | 0) == (b | 0)) break;
            d = (d + 1) | 0;
            if ((d | 0) >= (f | 0)) break a;
          }
          if ((d | 0) < (f | 0)) {
            c[e >> 2] = c[(g + ((f + -1) << 2)) >> 2];
            c[((c[(a + 336) >> 2] | 0) + ((f + -1) << 2)) >> 2] = b;
            c[(a + 328) >> 2] = f + -1;
          }
        }
      while (0);
      d = c[(b + 188) >> 2] | 0;
      if (d | 0) {
        h = c[(a + 68) >> 2] | 0;
        h = Eb[c[((c[h >> 2] | 0) + 36) >> 2] & 127](h) | 0;
        ic[c[((c[h >> 2] | 0) + 40) >> 2] & 127](h, d, c[(a + 24) >> 2] | 0);
        h = c[(a + 68) >> 2] | 0;
        ic[c[((c[h >> 2] | 0) + 12) >> 2] & 127](h, d, c[(a + 24) >> 2] | 0);
        c[(b + 188) >> 2] = 0;
      }
      d = c[(a + 8) >> 2] | 0;
      if ((d | 0) <= 0) return;
      e = c[(a + 16) >> 2] | 0;
      h = 0;
      while (1) {
        f = (e + (h << 2)) | 0;
        if ((c[f >> 2] | 0) == (b | 0)) break;
        g = (h + 1) | 0;
        if ((g | 0) < (d | 0)) h = g;
        else {
          i = 26;
          break;
        }
      }
      if ((i | 0) == 26) return;
      if ((h | 0) >= (d | 0)) return;
      c[f >> 2] = c[(e + ((d + -1) << 2)) >> 2];
      c[((c[(a + 16) >> 2] | 0) + ((d + -1) << 2)) >> 2] = b;
      c[(a + 8) >> 2] = d + -1;
      return;
    }
    function xg(b, d, e, f, h) {
      b = b | 0;
      d = d | 0;
      e = e | 0;
      f = f | 0;
      h = h | 0;
      var i = 0;
      c[6435] = (c[6435] | 0) + 1;
      i = yc(783) | 0;
      if (!i) i = 0;
      else {
        c[(((i + 4 + 15) & -16) + -4) >> 2] = i;
        i = (i + 4 + 15) & -16;
      }
      c[(i + 4) >> 2] = 4;
      c[(i + 8) >> 2] = -1;
      c[(i + 12) >> 2] = -1;
      g[(i + 16) >> 2] = 3402823466385288598117041.0e14;
      a[(i + 20) >> 0] = 1;
      a[(i + 21) >> 0] = 0;
      c[(i + 24) >> 2] = -1;
      c[(i + 28) >> 2] = b;
      c[(i + 32) >> 2] = d;
      g[(i + 36) >> 2] = 0.0;
      g[(i + 40) >> 2] = 0.30000001192092896;
      c[(i + 44) >> 2] = 0;
      c[i >> 2] = 4704;
      d = (i + 552) | 0;
      c[d >> 2] = c[e >> 2];
      c[(d + 4) >> 2] = c[(e + 4) >> 2];
      c[(d + 8) >> 2] = c[(e + 8) >> 2];
      c[(d + 12) >> 2] = c[(e + 12) >> 2];
      d = (i + 568) | 0;
      c[d >> 2] = c[(e + 16) >> 2];
      c[(d + 4) >> 2] = c[(e + 16 + 4) >> 2];
      c[(d + 8) >> 2] = c[(e + 16 + 8) >> 2];
      c[(d + 12) >> 2] = c[(e + 16 + 12) >> 2];
      d = (i + 584) | 0;
      c[d >> 2] = c[(e + 32) >> 2];
      c[(d + 4) >> 2] = c[(e + 32 + 4) >> 2];
      c[(d + 8) >> 2] = c[(e + 32 + 8) >> 2];
      c[(d + 12) >> 2] = c[(e + 32 + 12) >> 2];
      d = (i + 600) | 0;
      c[d >> 2] = c[(e + 48) >> 2];
      c[(d + 4) >> 2] = c[(e + 48 + 4) >> 2];
      c[(d + 8) >> 2] = c[(e + 48 + 8) >> 2];
      c[(d + 12) >> 2] = c[(e + 48 + 12) >> 2];
      e = (i + 616) | 0;
      c[e >> 2] = c[f >> 2];
      c[(e + 4) >> 2] = c[(f + 4) >> 2];
      c[(e + 8) >> 2] = c[(f + 8) >> 2];
      c[(e + 12) >> 2] = c[(f + 12) >> 2];
      e = (i + 632) | 0;
      c[e >> 2] = c[(f + 16) >> 2];
      c[(e + 4) >> 2] = c[(f + 16 + 4) >> 2];
      c[(e + 8) >> 2] = c[(f + 16 + 8) >> 2];
      c[(e + 12) >> 2] = c[(f + 16 + 12) >> 2];
      e = (i + 648) | 0;
      c[e >> 2] = c[(f + 32) >> 2];
      c[(e + 4) >> 2] = c[(f + 32 + 4) >> 2];
      c[(e + 8) >> 2] = c[(f + 32 + 8) >> 2];
      c[(e + 12) >> 2] = c[(f + 32 + 12) >> 2];
      e = (i + 664) | 0;
      c[e >> 2] = c[(f + 48) >> 2];
      c[(e + 4) >> 2] = c[(f + 48 + 4) >> 2];
      c[(e + 8) >> 2] = c[(f + 48 + 8) >> 2];
      c[(e + 12) >> 2] = c[(f + 48 + 12) >> 2];
      g[(i + 688) >> 2] = 0.0;
      g[(i + 692) >> 2] = -1.0;
      g[(i + 696) >> 2] = 0.8999999761581421;
      g[(i + 700) >> 2] = 0.30000001192092896;
      g[(i + 704) >> 2] = 1.0;
      g[(i + 708) >> 2] = 0.0;
      g[(i + 712) >> 2] = 0.0;
      a[(i + 716) >> 0] = 0;
      a[(i + 736) >> 0] = 0;
      a[(i + 737) >> 0] = 0;
      a[(i + 738) >> 0] = 0;
      a[(i + 739) >> 0] = 1;
      a[(i + 740) >> 0] = h & 1;
      c[(i + 748) >> 2] = 0;
      g[(i + 732) >> 2] = h ? -1.0 : 1.0;
      return i | 0;
    }
    function yg(a, b, d) {
      a = a | 0;
      b = +b;
      d = +d;
      var e = 0,
        f = 0,
        h = 0,
        j = 0,
        k = 0,
        l = 0.0,
        m = 0.0,
        n = 0.0,
        o = 0,
        p = 0.0,
        q = 0.0,
        r = 0.0,
        s = 0.0,
        t = 0,
        u = 0.0,
        v = 0.0,
        w = 0,
        x = 0.0,
        y = 0.0,
        z = 0.0,
        A = 0.0;
      h = i;
      i = (i + 16) | 0;
      d = +g[(a + 336) >> 2] * b;
      b = +g[(a + 452) >> 2];
      e = c[(a + 792) >> 2] | 0;
      if ((e | 0) <= 0) {
        i = h;
        return;
      }
      f = 0;
      do {
        t = c[(a + 800) >> 2] | 0;
        k = (t + ((f * 96) | 0) + 20) | 0;
        w = c[k >> 2] | 0;
        o = c[(t + ((f * 96) | 0)) >> 2] | 0;
        z = +g[(t + ((f * 96) | 0) + 4) >> 2];
        y = +g[(t + ((f * 96) | 0) + 8) >> 2];
        x = +g[(t + ((f * 96) | 0) + 12) >> 2];
        j = (t + ((f * 96) | 0) + 76) | 0;
        v = +g[(w + 332) >> 2];
        q = +g[(t + ((f * 96) | 0) + 84) >> 2];
        A = +g[(w + 336) >> 2];
        m = +g[(t + ((f * 96) | 0) + 80) >> 2];
        l = +g[j >> 2];
        n = +g[(w + 328) >> 2];
        s = +g[(o + 8) >> 2];
        r = +g[(o + 12) >> 2];
        p = +g[(o + 16) >> 2];
        u =
          d *
            (z * +g[(w + 4) >> 2] +
              y * +g[(w + 8) >> 2] +
              x * +g[(w + 12) >> 2] +
              +g[(w + 52) >> 2] -
              s) +
          (b * (v * q - A * m + +g[(w + 312) >> 2]) - (s - +g[(o + 24) >> 2]));
        q =
          d *
            (z * +g[(w + 20) >> 2] +
              y * +g[(w + 24) >> 2] +
              x * +g[(w + 28) >> 2] +
              +g[(w + 56) >> 2] -
              r) +
          (b * (+g[(w + 316) >> 2] + (A * l - q * n)) -
            (r - +g[(o + 28) >> 2]));
        l =
          d *
            (z * +g[(w + 36) >> 2] +
              y * +g[(w + 40) >> 2] +
              x * +g[(w + 44) >> 2] +
              +g[(w + 60) >> 2] -
              p) +
          (b * (m * n - v * l + +g[(w + 320) >> 2]) - (p - +g[(o + 32) >> 2]));
        v = +g[(t + ((f * 96) | 0) + 24) >> 2];
        n =
          (u * +g[(t + ((f * 96) | 0) + 28) >> 2] +
            q * +g[(t + ((f * 96) | 0) + 32) >> 2] +
            +g[(t + ((f * 96) | 0) + 36) >> 2] * l) *
          v;
        m =
          (u * +g[(t + ((f * 96) | 0) + 44) >> 2] +
            q * +g[(t + ((f * 96) | 0) + 48) >> 2] +
            l * +g[(t + ((f * 96) | 0) + 52) >> 2]) *
          v;
        l =
          v *
          (u * +g[(t + ((f * 96) | 0) + 60) >> 2] +
            q * +g[(t + ((f * 96) | 0) + 64) >> 2] +
            l * +g[(t + ((f * 96) | 0) + 68) >> 2]);
        q = +g[(t + ((f * 96) | 0) + 92) >> 2];
        g[(o + 8) >> 2] = s + n * q;
        g[(o + 12) >> 2] = q * m + r;
        g[(o + 16) >> 2] = q * l + p;
        k = c[k >> 2] | 0;
        g[h >> 2] = -n;
        g[(h + 4) >> 2] = -m;
        g[(h + 8) >> 2] = -l;
        g[(h + 12) >> 2] = 0.0;
        gj(k, h, j);
        f = (f + 1) | 0;
      } while ((f | 0) != (e | 0));
      i = h;
      return;
    }
    function zg(a, b, d) {
      a = a | 0;
      b = b | 0;
      d = d | 0;
      var e = 0.0,
        f = 0.0,
        h = 0.0,
        i = 0.0,
        j = 0.0,
        k = 0.0;
      h = +g[(d + 100) >> 2];
      k = +g[(d + 16) >> 2];
      i = +g[(d + 20) >> 2];
      j = +g[(d + 24) >> 2];
      e = +g[(d + 108) >> 2];
      e =
        +g[(d + 112) >> 2] -
        h * +g[(d + 116) >> 2] -
        (k * +g[(a + 64) >> 2] +
          i * +g[(a + 68) >> 2] +
          j * +g[(a + 72) >> 2] +
          (+g[d >> 2] * +g[(a + 80) >> 2] +
            +g[(d + 4) >> 2] * +g[(a + 84) >> 2] +
            +g[(d + 8) >> 2] * +g[(a + 88) >> 2])) *
          e -
        e *
          (+g[(d + 48) >> 2] * +g[(b + 64) >> 2] +
            +g[(d + 52) >> 2] * +g[(b + 68) >> 2] +
            +g[(d + 56) >> 2] * +g[(b + 72) >> 2] +
            (+g[(d + 32) >> 2] * +g[(b + 80) >> 2] +
              +g[(d + 36) >> 2] * +g[(b + 84) >> 2] +
              +g[(d + 40) >> 2] * +g[(b + 88) >> 2]));
      f = +g[(d + 120) >> 2];
      do
        if (!(h + e < f)) {
          f = +g[(d + 124) >> 2];
          if (h + e > f) {
            g[(d + 100) >> 2] = f;
            e = f - h;
            break;
          } else {
            g[(d + 100) >> 2] = h + e;
            break;
          }
        } else {
          g[(d + 100) >> 2] = f;
          e = f - h;
        }
      while (0);
      if (c[(a + 240) >> 2] | 0) {
        i = e * i * +g[(a + 132) >> 2] * +g[(a + 116) >> 2];
        j = e * j * +g[(a + 136) >> 2] * +g[(a + 120) >> 2];
        g[(a + 64) >> 2] =
          +g[(a + 112) >> 2] * e * k * +g[(a + 128) >> 2] + +g[(a + 64) >> 2];
        g[(a + 68) >> 2] = i + +g[(a + 68) >> 2];
        g[(a + 72) >> 2] = j + +g[(a + 72) >> 2];
        j = e * +g[(a + 100) >> 2] * +g[(d + 68) >> 2];
        k = e * +g[(a + 104) >> 2] * +g[(d + 72) >> 2];
        g[(a + 80) >> 2] =
          e * +g[(a + 96) >> 2] * +g[(d + 64) >> 2] + +g[(a + 80) >> 2];
        g[(a + 84) >> 2] = j + +g[(a + 84) >> 2];
        g[(a + 88) >> 2] = k + +g[(a + 88) >> 2];
      }
      if (!(c[(b + 240) >> 2] | 0)) return;
      k = e * +g[(d + 52) >> 2] * +g[(b + 132) >> 2] * +g[(b + 116) >> 2];
      j = e * +g[(d + 56) >> 2] * +g[(b + 136) >> 2] * +g[(b + 120) >> 2];
      g[(b + 64) >> 2] =
        +g[(b + 112) >> 2] * e * +g[(d + 48) >> 2] * +g[(b + 128) >> 2] +
        +g[(b + 64) >> 2];
      g[(b + 68) >> 2] = k + +g[(b + 68) >> 2];
      g[(b + 72) >> 2] = j + +g[(b + 72) >> 2];
      j = e * +g[(b + 100) >> 2] * +g[(d + 84) >> 2];
      k = e * +g[(b + 104) >> 2] * +g[(d + 88) >> 2];
      g[(b + 80) >> 2] =
        e * +g[(b + 96) >> 2] * +g[(d + 80) >> 2] + +g[(b + 80) >> 2];
      g[(b + 84) >> 2] = j + +g[(b + 84) >> 2];
      g[(b + 88) >> 2] = k + +g[(b + 88) >> 2];
      return;
    }
    function Ag(a, b) {
      a = a | 0;
      b = b | 0;
      var d = 0,
        f = 0,
        g = 0,
        h = 0,
        j = 0,
        k = 0,
        l = 0,
        m = 0,
        n = 0,
        o = 0,
        p = 0,
        q = 0;
      p = i;
      i = (i + 32) | 0;
      o = c[(a + 92) >> 2] | 0;
      if (!(Eb[c[((c[o >> 2] | 0) + 56) >> 2] & 127](o) | 0)) {
        i = p;
        return;
      }
      o = c[(a + 92) >> 2] | 0;
      o = Eb[c[((c[o >> 2] | 0) + 28) >> 2] & 127](o) | 0;
      d = c[(o + 4) >> 2] | 0;
      if ((d | 0) > 1) {
        Vd(o, 0, (d + -1) | 0);
        d = c[(o + 4) >> 2] | 0;
      }
      d = (d - (c[(a + 104) >> 2] | 0)) | 0;
      c[(p + 16) >> 2] = 0;
      c[(p + 16 + 4) >> 2] = 0;
      c[(p + 16 + 8) >> 2] = 0;
      c[(p + 16 + 12) >> 2] = 0;
      yi(o, d, (p + 16) | 0);
      c[(a + 104) >> 2] = 0;
      d = c[(o + 4) >> 2] | 0;
      if ((d | 0) > 0) {
        f = 0;
        l = 0;
        m = 0;
        h = 0;
        while (1) {
          k = c[(o + 12) >> 2] | 0;
          j = (k + (l << 4)) | 0;
          q = m;
          m = c[j >> 2] | 0;
          k = (k + (l << 4) + 4) | 0;
          g = c[k >> 2] | 0;
          if (!(((m | 0) == (q | 0)) & ((g | 0) == (h | 0)))) {
            q = (m + 54) | 0;
            h = (m + 48) | 0;
            if (
              !((((((e[q >> 1] | 0) >= (e[(g + 48) >> 1] | 0)
              ? (e[(g + 54) >> 1] | 0) >= (e[h >> 1] | 0)
              : 0)
              ? (e[(q + 2) >> 1] | 0) >= (e[(g + 48 + 2) >> 1] | 0)
              : 0)
              ? (e[(g + 54 + 2) >> 1] | 0) >= (e[(h + 2) >> 1] | 0)
              : 0)
              ? (e[(q + 4) >> 1] | 0) >= (e[(g + 52) >> 1] | 0)
              : 0)
                ? (e[(g + 54 + 4) >> 1] | 0) >= (e[(m + 52) >> 1] | 0)
                : 0)
            )
              n = 13;
          } else {
            g = h;
            n = 13;
          }
          if ((n | 0) == 13) {
            n = 0;
            f = c[(a + 92) >> 2] | 0;
            ic[c[((c[f >> 2] | 0) + 32) >> 2] & 127](f, j, b);
            c[j >> 2] = 0;
            c[k >> 2] = 0;
            f = ((c[(a + 104) >> 2] | 0) + 1) | 0;
            c[(a + 104) >> 2] = f;
            c[6163] = (c[6163] | 0) + -1;
            d = c[(o + 4) >> 2] | 0;
          }
          l = (l + 1) | 0;
          if ((l | 0) >= (d | 0)) break;
          else h = g;
        }
        if ((d | 0) > 1) {
          Vd(o, 0, (d + -1) | 0);
          f = c[(a + 104) >> 2] | 0;
          d = c[(o + 4) >> 2] | 0;
        }
      } else f = 0;
      c[p >> 2] = 0;
      c[(p + 4) >> 2] = 0;
      c[(p + 8) >> 2] = 0;
      c[(p + 12) >> 2] = 0;
      yi(o, (d - f) | 0, p);
      c[(a + 104) >> 2] = 0;
      i = p;
      return;
    }
    function Bg(a) {
      a = a | 0;
      var b = 0,
        d = 0,
        e = 0.0,
        f = 0.0,
        h = 0.0,
        i = 0,
        j = 0.0,
        k = 0,
        l = 0,
        m = 0.0,
        n = 0.0,
        o = 0,
        p = 0.0;
      b = c[(a + 712) >> 2] | 0;
      if ((b | 0) > 0) {
        d = 0;
        do {
          l = ((c[(a + 720) >> 2] | 0) + ((d * 104) | 0) + 72) | 0;
          d = (d + 1) | 0;
          c[l >> 2] = 0;
          c[(l + 4) >> 2] = 0;
          c[(l + 8) >> 2] = 0;
          c[(l + 12) >> 2] = 0;
        } while ((d | 0) != (b | 0));
      }
      b = c[(a + 752) >> 2] | 0;
      if ((b | 0) > 0) {
        d = 0;
        do {
          o = c[(a + 760) >> 2] | 0;
          k = c[(o + ((d * 44) | 0) + 12) >> 2] | 0;
          i = c[(o + ((d * 44) | 0) + 8) >> 2] | 0;
          j = +g[(i + 8) >> 2];
          e = +g[(k + 8) >> 2] - j;
          f = +g[(i + 12) >> 2];
          h = +g[(k + 12) >> 2] - f;
          m = +g[(i + 16) >> 2];
          n = +g[(k + 16) >> 2] - m;
          l = c[(o + ((d * 44) | 0) + 16) >> 2] | 0;
          j = +g[(l + 8) >> 2] - j;
          f = +g[(l + 12) >> 2] - f;
          m = +g[(l + 16) >> 2] - m;
          p =
            1.0 /
            +O(
              +(
                (e * f - h * j) * (e * f - h * j) +
                ((h * m - n * f) * (h * m - n * f) +
                  (n * j - e * m) * (n * j - e * m))
              )
            );
          g[(o + ((d * 44) | 0) + 20) >> 2] = p * (h * m - n * f);
          g[(o + ((d * 44) | 0) + 24) >> 2] = p * (n * j - e * m);
          g[(o + ((d * 44) | 0) + 28) >> 2] = (e * f - h * j) * p;
          c[(o + ((d * 44) | 0) + 32) >> 2] = 0;
          g[(i + 72) >> 2] = h * m - n * f + +g[(i + 72) >> 2];
          g[(i + 76) >> 2] = n * j - e * m + +g[(i + 76) >> 2];
          g[(i + 80) >> 2] = e * f - h * j + +g[(i + 80) >> 2];
          g[(k + 72) >> 2] = h * m - n * f + +g[(k + 72) >> 2];
          g[(k + 76) >> 2] = n * j - e * m + +g[(k + 76) >> 2];
          g[(k + 80) >> 2] = e * f - h * j + +g[(k + 80) >> 2];
          g[(l + 72) >> 2] = h * m - n * f + +g[(l + 72) >> 2];
          g[(l + 76) >> 2] = n * j - e * m + +g[(l + 76) >> 2];
          g[(l + 80) >> 2] = e * f - h * j + +g[(l + 80) >> 2];
          d = (d + 1) | 0;
        } while ((d | 0) != (b | 0));
      }
      l = c[(a + 712) >> 2] | 0;
      if ((l | 0) <= 0) return;
      a = c[(a + 720) >> 2] | 0;
      k = 0;
      do {
        i = (a + ((k * 104) | 0) + 72) | 0;
        j = +g[i >> 2];
        b = (a + ((k * 104) | 0) + 76) | 0;
        e = +g[b >> 2];
        d = (a + ((k * 104) | 0) + 80) | 0;
        f = +g[d >> 2];
        h = +O(+(j * j + e * e + f * f));
        if (h > 1.1920928955078125e-7) {
          g[i >> 2] = j * (1.0 / h);
          g[b >> 2] = (1.0 / h) * e;
          g[d >> 2] = (1.0 / h) * f;
        }
        k = (k + 1) | 0;
      } while ((k | 0) != (l | 0));
      return;
    }
    function Cg(b, d, e, f) {
      b = b | 0;
      d = +d;
      e = e | 0;
      f = +f;
      var h = 0,
        j = 0.0,
        k = 0,
        l = 0;
      l = i;
      i = (i + 16) | 0;
      tb(c[6434] | 0, 0) | 0;
      Vq(25696);
      c[6425] = (c[6425] | 0) + 1;
      k = c[6428] | 0;
      c[6428] = k + 1;
      if (!k) {
        tb(l | 0, 0) | 0;
        k = c[6434] | 0;
        c[6427] =
          (c[(l + 4) >> 2] | 0) -
          (c[(k + 4) >> 2] | 0) +
          (((((c[l >> 2] | 0) - (c[k >> 2] | 0)) | 0) * 1e6) | 0);
      }
      c[6433] = 0;
      tb(l | 0, 0) | 0;
      li(11963);
      if (e) {
        g[(b + 268) >> 2] = f;
        j = +g[(b + 264) >> 2] + d;
        g[(b + 264) >> 2] = j;
        if (!(j >= f)) {
          d = f;
          k = 0;
        } else {
          g[(b + 264) >> 2] = j - +(~~(j / f) | 0) * f;
          d = f;
          k = ~~(j / f);
        }
      } else {
        g[(b + 264) >> 2] = a[(b + 300) >> 0] | 0 ? 0.0 : d;
        g[(b + 268) >> 2] = 0.0;
        k = !(+N(+d) < 1.1920928955078125e-7) & 1;
        e = k;
      }
      if (Eb[c[((c[b >> 2] | 0) + 20) >> 2] & 127](b) | 0) {
        h = Eb[c[((c[b >> 2] | 0) + 20) >> 2] & 127](b) | 0;
        a[26260] =
          ((Eb[c[((c[h >> 2] | 0) + 48) >> 2] & 127](h) | 0) >>> 4) & 1;
      }
      if (k) {
        e = (k | 0) > (e | 0) ? e : k;
        zb[c[((c[b >> 2] | 0) + 164) >> 2] & 31](b, d * +(e | 0));
        Ab[c[((c[b >> 2] | 0) + 168) >> 2] & 255](b);
        if ((e | 0) > 0) {
          h = 0;
          do {
            zb[c[((c[b >> 2] | 0) + 160) >> 2] & 31](b, d);
            Ab[c[((c[b >> 2] | 0) + 80) >> 2] & 255](b);
            h = (h + 1) | 0;
          } while ((h | 0) < (e | 0));
          e = b;
        } else e = b;
      } else {
        Ab[c[((c[b >> 2] | 0) + 80) >> 2] & 255](b);
        e = b;
      }
      Ab[c[((c[e >> 2] | 0) + 120) >> 2] & 255](b);
      c[6433] = (c[6433] | 0) + 1;
      e = c[2357] | 0;
      b = ((c[(e + 16) >> 2] | 0) + -1) | 0;
      c[(e + 16) >> 2] = b;
      if (b | 0) {
        i = l;
        return k | 0;
      }
      do
        if (c[(e + 4) >> 2] | 0) {
          tb(l | 0, 0) | 0;
          b = c[6434] | 0;
          g[(e + 8) >> 2] =
            +g[(e + 8) >> 2] +
            +(
              (((c[(l + 4) >> 2] | 0) -
                (c[(b + 4) >> 2] | 0) +
                (((((c[l >> 2] | 0) - (c[b >> 2] | 0)) | 0) * 1e6) | 0) -
                (c[(e + 12) >> 2] | 0)) |
                0) >>>
              0
            ) /
              1.0e3;
          if (!(c[(e + 16) >> 2] | 0)) {
            e = c[2357] | 0;
            break;
          } else {
            i = l;
            return k | 0;
          }
        }
      while (0);
      c[2357] = c[(e + 20) >> 2];
      i = l;
      return k | 0;
    }
    function Dg(b, d, e, f) {
      b = b | 0;
      d = d | 0;
      e = e | 0;
      f = f | 0;
      var h = 0;
      c[6435] = (c[6435] | 0) + 1;
      h = yc(783) | 0;
      if (!h) h = 0;
      else {
        c[(((h + 4 + 15) & -16) + -4) >> 2] = h;
        h = (h + 4 + 15) & -16;
      }
      c[(h + 4) >> 2] = 4;
      c[(h + 8) >> 2] = -1;
      c[(h + 12) >> 2] = -1;
      g[(h + 16) >> 2] = 3402823466385288598117041.0e14;
      a[(h + 20) >> 0] = 1;
      a[(h + 21) >> 0] = 0;
      c[(h + 24) >> 2] = -1;
      c[(h + 28) >> 2] = b;
      c[(h + 32) >> 2] = d;
      g[(h + 36) >> 2] = 0.0;
      g[(h + 40) >> 2] = 0.30000001192092896;
      c[(h + 44) >> 2] = 0;
      c[h >> 2] = 4704;
      d = (h + 552) | 0;
      c[d >> 2] = c[e >> 2];
      c[(d + 4) >> 2] = c[(e + 4) >> 2];
      c[(d + 8) >> 2] = c[(e + 8) >> 2];
      c[(d + 12) >> 2] = c[(e + 12) >> 2];
      d = (h + 568) | 0;
      c[d >> 2] = c[(e + 16) >> 2];
      c[(d + 4) >> 2] = c[(e + 16 + 4) >> 2];
      c[(d + 8) >> 2] = c[(e + 16 + 8) >> 2];
      c[(d + 12) >> 2] = c[(e + 16 + 12) >> 2];
      d = (h + 584) | 0;
      c[d >> 2] = c[(e + 32) >> 2];
      c[(d + 4) >> 2] = c[(e + 32 + 4) >> 2];
      c[(d + 8) >> 2] = c[(e + 32 + 8) >> 2];
      c[(d + 12) >> 2] = c[(e + 32 + 12) >> 2];
      d = (h + 600) | 0;
      c[d >> 2] = c[(e + 48) >> 2];
      c[(d + 4) >> 2] = c[(e + 48 + 4) >> 2];
      c[(d + 8) >> 2] = c[(e + 48 + 8) >> 2];
      c[(d + 12) >> 2] = c[(e + 48 + 12) >> 2];
      e = (h + 616) | 0;
      c[e >> 2] = c[f >> 2];
      c[(e + 4) >> 2] = c[(f + 4) >> 2];
      c[(e + 8) >> 2] = c[(f + 8) >> 2];
      c[(e + 12) >> 2] = c[(f + 12) >> 2];
      e = (h + 632) | 0;
      c[e >> 2] = c[(f + 16) >> 2];
      c[(e + 4) >> 2] = c[(f + 16 + 4) >> 2];
      c[(e + 8) >> 2] = c[(f + 16 + 8) >> 2];
      c[(e + 12) >> 2] = c[(f + 16 + 12) >> 2];
      e = (h + 648) | 0;
      c[e >> 2] = c[(f + 32) >> 2];
      c[(e + 4) >> 2] = c[(f + 32 + 4) >> 2];
      c[(e + 8) >> 2] = c[(f + 32 + 8) >> 2];
      c[(e + 12) >> 2] = c[(f + 32 + 12) >> 2];
      e = (h + 664) | 0;
      c[e >> 2] = c[(f + 48) >> 2];
      c[(e + 4) >> 2] = c[(f + 48 + 4) >> 2];
      c[(e + 8) >> 2] = c[(f + 48 + 8) >> 2];
      c[(e + 12) >> 2] = c[(f + 48 + 12) >> 2];
      g[(h + 688) >> 2] = 0.0;
      g[(h + 692) >> 2] = -1.0;
      g[(h + 696) >> 2] = 0.8999999761581421;
      g[(h + 700) >> 2] = 0.30000001192092896;
      g[(h + 704) >> 2] = 1.0;
      g[(h + 708) >> 2] = 0.0;
      g[(h + 712) >> 2] = 0.0;
      a[(h + 716) >> 0] = 0;
      a[(h + 736) >> 0] = 0;
      a[(h + 737) >> 0] = 0;
      a[(h + 738) >> 0] = 0;
      a[(h + 739) >> 0] = 1;
      a[(h + 740) >> 0] = 0;
      c[(h + 748) >> 2] = 0;
      g[(h + 732) >> 2] = 1.0;
      return h | 0;
    }
    function Eg(b, d, e, f) {
      b = b | 0;
      d = d | 0;
      e = e | 0;
      f = f | 0;
      var h = 0.0,
        j = 0.0,
        k = 0.0,
        l = 0.0,
        m = 0,
        n = 0.0;
      m = i;
      i = (i + 672) | 0;
      c[(m + 568 + 8) >> 2] = 0;
      c[(m + 568 + 12) >> 2] = 1065353216;
      c[(m + 568 + 16) >> 2] = 1065353216;
      c[(m + 568 + 20) >> 2] = 1065353216;
      g[(m + 568 + 24) >> 2] = 0.0;
      c[(m + 568 + 52) >> 2] = 0;
      c[(m + 568) >> 2] = 3736;
      c[(m + 568 + 4) >> 2] = 1;
      c[(m + 568 + 56) >> 2] = c[d >> 2];
      c[(m + 568 + 56 + 4) >> 2] = c[(d + 4) >> 2];
      c[(m + 568 + 56 + 8) >> 2] = c[(d + 8) >> 2];
      c[(m + 568 + 56 + 12) >> 2] = c[(d + 12) >> 2];
      c[(m + 568 + 72) >> 2] = c[(d + 16) >> 2];
      c[(m + 568 + 72 + 4) >> 2] = c[(d + 16 + 4) >> 2];
      c[(m + 568 + 72 + 8) >> 2] = c[(d + 16 + 8) >> 2];
      c[(m + 568 + 72 + 12) >> 2] = c[(d + 16 + 12) >> 2];
      c[(m + 568 + 88) >> 2] = c[(d + 32) >> 2];
      c[(m + 568 + 88 + 4) >> 2] = c[(d + 32 + 4) >> 2];
      c[(m + 568 + 88 + 8) >> 2] = c[(d + 32 + 8) >> 2];
      c[(m + 568 + 88 + 12) >> 2] = c[(d + 32 + 12) >> 2];
      c[(m + 568 + 44) >> 2] = c[(b + 204) >> 2];
      g[(m + 208 + 308) >> 2] = 9.999999747378752e-5;
      a[(m + 208 + 332) >> 0] = 0;
      c[(m + 200) >> 2] = 9120;
      d = c[(b + 4) >> 2] | 0;
      c[(m + 176) >> 2] = 9188;
      c[(m + 176 + 4) >> 2] = m + 208;
      c[(m + 176 + 8) >> 2] = m + 200;
      c[(m + 176 + 12) >> 2] = d;
      c[(m + 176 + 16) >> 2] = m + 568;
      c[(m + 176 + 20) >> 2] = 0;
      c[m >> 2] = 3708;
      c[(m + 168) >> 2] = 0;
      g[(m + 164) >> 2] = 1.0;
      c[(m + 172) >> 2] = c[(b + 208) >> 2];
      if (
        (Xd(
          (m + 176) | 0,
          (b + 8) | 0,
          (b + 72) | 0,
          (b + 136) | 0,
          (b + 136) | 0,
          m
        ) | 0
        ? ((h = +g[(m + 132) >> 2]),
          (j = +g[(m + 136) >> 2]),
          (k = +g[(m + 140) >> 2]),
          h * h + j * j + k * k > 9.999999747378752e-5)
        : 0)
          ? ((l = +g[(m + 164) >> 2]), l < +g[(b + 200) >> 2])
          : 0
      ) {
        n = 1.0 / +O(+(h * h + j * j + k * k));
        g[(m + 132) >> 2] = h * n;
        g[(m + 136) >> 2] = j * n;
        g[(m + 140) >> 2] = k * n;
        +Ub[c[((c[b >> 2] | 0) + 12) >> 2] & 3](
          b,
          (m + 132) | 0,
          (m + 148) | 0,
          l,
          e,
          f
        );
      }
      c[(m + 568) >> 2] = 7124;
      e = c[(m + 568 + 52) >> 2] | 0;
      if (!e) {
        i = m;
        return;
      }
      Ab[c[c[e >> 2] >> 2] & 255](e);
      e = c[(m + 568 + 52) >> 2] | 0;
      if (!e) {
        i = m;
        return;
      }
      c[6436] = (c[6436] | 0) + 1;
      hd(c[(e + -4) >> 2] | 0);
      i = m;
      return;
    }
    function Fg(a, b, d, e, f) {
      a = a | 0;
      b = b | 0;
      d = d | 0;
      e = e | 0;
      f = f | 0;
      var h = 0.0,
        j = 0.0,
        k = 0.0,
        l = 0.0,
        m = 0.0,
        n = 0.0,
        o = 0.0,
        p = 0,
        q = 0,
        r = 0;
      q = i;
      i = (i + 32) | 0;
      p = c[(a + 12) >> 2] | 0;
      if (!p) {
        i = q;
        return;
      }
      c[(f + 4) >> 2] = p;
      a = c[(b + 4) >> 2] | 0;
      r = c[(d + 4) >> 2] | 0;
      b = c[(b + 12) >> 2] | 0;
      e = c[(d + 12) >> 2] | 0;
      h = +g[(b + 48) >> 2] - +g[(e + 48) >> 2];
      j = +g[(b + 52) >> 2] - +g[(e + 52) >> 2];
      l = +g[(b + 56) >> 2] - +g[(e + 56) >> 2];
      m = +O(+(h * h + j * j + l * l));
      n = +g[(r + 28) >> 2] * +g[(r + 12) >> 2];
      o = +g[(a + 28) >> 2] * +g[(a + 12) >> 2] + n;
      if (m > o) {
        if (!(c[(p + 748) >> 2] | 0)) {
          i = q;
          return;
        }
        a = c[(p + 740) >> 2] | 0;
        b = c[((c[(f + 8) >> 2] | 0) + 8) >> 2] | 0;
        e = c[((c[(f + 12) >> 2] | 0) + 8) >> 2] | 0;
        if ((a | 0) == (b | 0)) {
          ef(p, (a + 4) | 0, (e + 4) | 0);
          i = q;
          return;
        } else {
          ef(p, (e + 4) | 0, (b + 4) | 0);
          i = q;
          return;
        }
      }
      c[(q + 16) >> 2] = 1065353216;
      c[(q + 16 + 4) >> 2] = 0;
      c[(q + 16 + 8) >> 2] = 0;
      g[(q + 16 + 12) >> 2] = 0.0;
      if (m > 1.1920928955078125e-7) {
        g[(q + 16) >> 2] = h * (1.0 / m);
        g[(q + 16 + 4) >> 2] = j * (1.0 / m);
        g[(q + 16 + 8) >> 2] = l * (1.0 / m);
        g[(q + 16 + 12) >> 2] = 0.0;
        k = h * (1.0 / m);
        j = j * (1.0 / m);
        h = l * (1.0 / m);
      } else {
        k = 1.0;
        j = 0.0;
        h = 0.0;
      }
      j = n * j + +g[(e + 52) >> 2];
      l = n * h + +g[(e + 56) >> 2];
      g[q >> 2] = n * k + +g[(e + 48) >> 2];
      g[(q + 4) >> 2] = j;
      g[(q + 8) >> 2] = l;
      g[(q + 12) >> 2] = 0.0;
      hc[c[((c[f >> 2] | 0) + 16) >> 2] & 15](f, (q + 16) | 0, q, m - o);
      a = c[(f + 4) >> 2] | 0;
      do
        if (c[(a + 748) >> 2] | 0) {
          b = c[(a + 740) >> 2] | 0;
          d = c[((c[(f + 8) >> 2] | 0) + 8) >> 2] | 0;
          e = c[((c[(f + 12) >> 2] | 0) + 8) >> 2] | 0;
          if ((b | 0) == (d | 0)) {
            ef(a, (b + 4) | 0, (e + 4) | 0);
            break;
          } else {
            ef(a, (e + 4) | 0, (d + 4) | 0);
            break;
          }
        }
      while (0);
      i = q;
      return;
    }
    function Gg(a, b) {
      a = a | 0;
      b = b | 0;
      var d = 0,
        e = 0;
      c[6435] = (c[6435] | 0) + 1;
      d = yc(219) | 0;
      if (!d) d = 0;
      else {
        c[(((d + 4 + 15) & -16) + -4) >> 2] = d;
        d = (d + 4 + 15) & -16;
      }
      c[d >> 2] = 2896;
      e = (d + 4) | 0;
      c[e >> 2] = c[a >> 2];
      c[(e + 4) >> 2] = c[(a + 4) >> 2];
      c[(e + 8) >> 2] = c[(a + 8) >> 2];
      c[(e + 12) >> 2] = c[(a + 12) >> 2];
      e = (d + 20) | 0;
      c[e >> 2] = c[(a + 16) >> 2];
      c[(e + 4) >> 2] = c[(a + 16 + 4) >> 2];
      c[(e + 8) >> 2] = c[(a + 16 + 8) >> 2];
      c[(e + 12) >> 2] = c[(a + 16 + 12) >> 2];
      e = (d + 36) | 0;
      c[e >> 2] = c[(a + 32) >> 2];
      c[(e + 4) >> 2] = c[(a + 32 + 4) >> 2];
      c[(e + 8) >> 2] = c[(a + 32 + 8) >> 2];
      c[(e + 12) >> 2] = c[(a + 32 + 12) >> 2];
      e = (d + 52) | 0;
      c[e >> 2] = c[(a + 48) >> 2];
      c[(e + 4) >> 2] = c[(a + 48 + 4) >> 2];
      c[(e + 8) >> 2] = c[(a + 48 + 8) >> 2];
      c[(e + 12) >> 2] = c[(a + 48 + 12) >> 2];
      e = (d + 68) | 0;
      c[e >> 2] = c[b >> 2];
      c[(e + 4) >> 2] = c[(b + 4) >> 2];
      c[(e + 8) >> 2] = c[(b + 8) >> 2];
      c[(e + 12) >> 2] = c[(b + 12) >> 2];
      e = (d + 84) | 0;
      c[e >> 2] = c[(b + 16) >> 2];
      c[(e + 4) >> 2] = c[(b + 16 + 4) >> 2];
      c[(e + 8) >> 2] = c[(b + 16 + 8) >> 2];
      c[(e + 12) >> 2] = c[(b + 16 + 12) >> 2];
      e = (d + 100) | 0;
      c[e >> 2] = c[(b + 32) >> 2];
      c[(e + 4) >> 2] = c[(b + 32 + 4) >> 2];
      c[(e + 8) >> 2] = c[(b + 32 + 8) >> 2];
      c[(e + 12) >> 2] = c[(b + 32 + 12) >> 2];
      e = (d + 116) | 0;
      c[e >> 2] = c[(b + 48) >> 2];
      c[(e + 4) >> 2] = c[(b + 48 + 4) >> 2];
      c[(e + 8) >> 2] = c[(b + 48 + 8) >> 2];
      c[(e + 12) >> 2] = c[(b + 48 + 12) >> 2];
      b = (d + 132) | 0;
      c[b >> 2] = c[a >> 2];
      c[(b + 4) >> 2] = c[(a + 4) >> 2];
      c[(b + 8) >> 2] = c[(a + 8) >> 2];
      c[(b + 12) >> 2] = c[(a + 12) >> 2];
      b = (d + 148) | 0;
      c[b >> 2] = c[(a + 16) >> 2];
      c[(b + 4) >> 2] = c[(a + 16 + 4) >> 2];
      c[(b + 8) >> 2] = c[(a + 16 + 8) >> 2];
      c[(b + 12) >> 2] = c[(a + 16 + 12) >> 2];
      b = (d + 164) | 0;
      c[b >> 2] = c[(a + 32) >> 2];
      c[(b + 4) >> 2] = c[(a + 32 + 4) >> 2];
      c[(b + 8) >> 2] = c[(a + 32 + 8) >> 2];
      c[(b + 12) >> 2] = c[(a + 32 + 12) >> 2];
      b = (d + 180) | 0;
      c[b >> 2] = c[(a + 48) >> 2];
      c[(b + 4) >> 2] = c[(a + 48 + 4) >> 2];
      c[(b + 8) >> 2] = c[(a + 48 + 8) >> 2];
      c[(b + 12) >> 2] = c[(a + 48 + 12) >> 2];
      c[(d + 196) >> 2] = 0;
      return d | 0;
    }
    function Hg(d, e) {
      d = d | 0;
      e = e | 0;
      var f = 0,
        g = 0,
        h = 0,
        i = 0,
        j = 0,
        k = 0;
      if (!(a[(d + 164) >> 0] | 0)) {
        f = c[(d + 148) >> 2] | 0;
        if (
          (f | 0) == (c[(d + 152) >> 2] | 0)
            ? ((k = f | 0 ? f << 1 : 1), (f | 0) < (k | 0))
            : 0
        ) {
          if (!k) i = 0;
          else {
            c[6435] = (c[6435] | 0) + 1;
            f = yc(((k << 1) + 19) | 0) | 0;
            if (!f) f = 0;
            else {
              c[(((f + 4 + 15) & -16) + -4) >> 2] = f;
              f = (f + 4 + 15) & -16;
            }
            i = f;
            f = c[(d + 148) >> 2] | 0;
          }
          h = c[(d + 156) >> 2] | 0;
          if ((f | 0) <= 0)
            if (!h) f = (d + 160) | 0;
            else g = 27;
          else {
            g = 0;
            do {
              b[(i + (g << 1)) >> 1] = b[(h + (g << 1)) >> 1] | 0;
              g = (g + 1) | 0;
            } while ((g | 0) != (f | 0));
            g = 27;
          }
          if ((g | 0) == 27) {
            if (a[(d + 160) >> 0] | 0) {
              c[6436] = (c[6436] | 0) + 1;
              hd(c[(h + -4) >> 2] | 0);
            }
            c[(d + 156) >> 2] = 0;
            f = (d + 160) | 0;
          }
          a[f >> 0] = 1;
          c[(d + 156) >> 2] = i;
          c[(d + 152) >> 2] = k;
          f = c[(d + 148) >> 2] | 0;
        }
        k = c[(d + 156) >> 2] | 0;
        b[(k + (f << 1)) >> 1] = e;
        c[(d + 148) >> 2] = f + 1;
        c[((c[(d + 32) >> 2] | 0) + 4) >> 2] = k;
        return;
      } else {
        f = c[(d + 128) >> 2] | 0;
        if (
          (f | 0) == (c[(d + 132) >> 2] | 0)
            ? ((j = f | 0 ? f << 1 : 1), (f | 0) < (j | 0))
            : 0
        ) {
          if (!j) i = 0;
          else {
            c[6435] = (c[6435] | 0) + 1;
            f = yc((((j << 2) | 3) + 16) | 0) | 0;
            if (!f) f = 0;
            else {
              c[(((f + 4 + 15) & -16) + -4) >> 2] = f;
              f = (f + 4 + 15) & -16;
            }
            i = f;
            f = c[(d + 128) >> 2] | 0;
          }
          h = c[(d + 136) >> 2] | 0;
          if ((f | 0) <= 0)
            if (!h) f = (d + 140) | 0;
            else g = 12;
          else {
            g = 0;
            do {
              c[(i + (g << 2)) >> 2] = c[(h + (g << 2)) >> 2];
              g = (g + 1) | 0;
            } while ((g | 0) != (f | 0));
            g = 12;
          }
          if ((g | 0) == 12) {
            if (a[(d + 140) >> 0] | 0) {
              c[6436] = (c[6436] | 0) + 1;
              hd(c[(h + -4) >> 2] | 0);
            }
            c[(d + 136) >> 2] = 0;
            f = (d + 140) | 0;
          }
          a[f >> 0] = 1;
          c[(d + 136) >> 2] = i;
          c[(d + 132) >> 2] = j;
          f = c[(d + 128) >> 2] | 0;
        }
        k = c[(d + 136) >> 2] | 0;
        c[(k + (f << 2)) >> 2] = e;
        c[(d + 128) >> 2] = (c[(d + 128) >> 2] | 0) + 1;
        c[((c[(d + 32) >> 2] | 0) + 4) >> 2] = k;
        return;
      }
    }
    function Ig(a, b, d) {
      a = a | 0;
      b = b | 0;
      d = d | 0;
      var e = 0.0,
        f = 0.0,
        h = 0.0,
        i = 0.0,
        j = 0.0,
        k = 0.0,
        l = 0.0;
      e = +g[(d + 128) >> 2];
      if (!(e != 0.0)) return;
      c[5971] = (c[5971] | 0) + 1;
      k = +g[(d + 96) >> 2];
      f = +g[(d + 16) >> 2];
      h = +g[(d + 20) >> 2];
      i = +g[(d + 24) >> 2];
      j = +g[(d + 108) >> 2];
      j =
        e -
        k * +g[(d + 116) >> 2] -
        (f * +g[(a + 144) >> 2] +
          h * +g[(a + 148) >> 2] +
          i * +g[(a + 152) >> 2] +
          (+g[d >> 2] * +g[(a + 160) >> 2] +
            +g[(d + 4) >> 2] * +g[(a + 164) >> 2] +
            +g[(d + 8) >> 2] * +g[(a + 168) >> 2])) *
          j -
        j *
          (+g[(d + 48) >> 2] * +g[(b + 144) >> 2] +
            +g[(d + 52) >> 2] * +g[(b + 148) >> 2] +
            +g[(d + 56) >> 2] * +g[(b + 152) >> 2] +
            (+g[(d + 32) >> 2] * +g[(b + 160) >> 2] +
              +g[(d + 36) >> 2] * +g[(b + 164) >> 2] +
              +g[(d + 40) >> 2] * +g[(b + 168) >> 2]));
      l = +g[(d + 120) >> 2];
      e = k + j < l ? l - k : j;
      g[(d + 96) >> 2] = k + j < l ? l : k + j;
      if (c[(a + 240) >> 2] | 0) {
        l = e * h * +g[(a + 132) >> 2] * +g[(a + 116) >> 2];
        k = e * i * +g[(a + 136) >> 2] * +g[(a + 120) >> 2];
        g[(a + 144) >> 2] =
          +g[(a + 112) >> 2] * e * f * +g[(a + 128) >> 2] + +g[(a + 144) >> 2];
        g[(a + 148) >> 2] = l + +g[(a + 148) >> 2];
        g[(a + 152) >> 2] = k + +g[(a + 152) >> 2];
        k = e * +g[(a + 100) >> 2] * +g[(d + 68) >> 2];
        l = e * +g[(a + 104) >> 2] * +g[(d + 72) >> 2];
        g[(a + 160) >> 2] =
          e * +g[(a + 96) >> 2] * +g[(d + 64) >> 2] + +g[(a + 160) >> 2];
        g[(a + 164) >> 2] = k + +g[(a + 164) >> 2];
        g[(a + 168) >> 2] = l + +g[(a + 168) >> 2];
      }
      if (!(c[(b + 240) >> 2] | 0)) return;
      l = e * +g[(d + 52) >> 2] * +g[(b + 132) >> 2] * +g[(b + 116) >> 2];
      k = e * +g[(d + 56) >> 2] * +g[(b + 136) >> 2] * +g[(b + 120) >> 2];
      g[(b + 144) >> 2] =
        +g[(b + 112) >> 2] * e * +g[(d + 48) >> 2] * +g[(b + 128) >> 2] +
        +g[(b + 144) >> 2];
      g[(b + 148) >> 2] = l + +g[(b + 148) >> 2];
      g[(b + 152) >> 2] = k + +g[(b + 152) >> 2];
      k = e * +g[(b + 100) >> 2] * +g[(d + 84) >> 2];
      l = e * +g[(b + 104) >> 2] * +g[(d + 88) >> 2];
      g[(b + 160) >> 2] =
        e * +g[(b + 96) >> 2] * +g[(d + 80) >> 2] + +g[(b + 160) >> 2];
      g[(b + 164) >> 2] = k + +g[(b + 164) >> 2];
      g[(b + 168) >> 2] = l + +g[(b + 168) >> 2];
      return;
    }
    function Jg(a, b, d) {
      a = a | 0;
      b = b | 0;
      d = d | 0;
      var e = 0,
        f = 0,
        g = 0;
      e = Zb[c[((c[d >> 2] | 0) + 40) >> 2] & 31](d, a) | 0;
      g = Zb[c[((c[d >> 2] | 0) + 28) >> 2] & 31](d, e) | 0;
      c[b >> 2] = g;
      if (g | 0) Cb[c[((c[d >> 2] | 0) + 48) >> 2] & 127](d, e);
      c[(b + 4) >> 2] = c[(a + 4) >> 2];
      g = c[(a + 48) >> 2] | 0;
      Ob[c[((c[g >> 2] | 0) + 56) >> 2] & 63](g, (b + 12) | 0, d) | 0;
      c[(b + 52) >> 2] = c[(a + 12) >> 2];
      do
        if (
          (c[(a + 52) >> 2] | 0) != 0
            ? (((Eb[c[((c[d >> 2] | 0) + 52) >> 2] & 127](d) | 0) & 1) | 0) == 0
            : 0
        ) {
          e =
            Zb[c[((c[d >> 2] | 0) + 24) >> 2] & 31](d, c[(a + 52) >> 2] | 0) |
            0;
          if (!e) {
            c[(b + 40) >> 2] =
              Zb[c[((c[d >> 2] | 0) + 28) >> 2] & 31](d, c[(a + 52) >> 2] | 0) |
              0;
            c[(b + 44) >> 2] = 0;
            e = c[(a + 52) >> 2] | 0;
            e = Eb[c[((c[e >> 2] | 0) + 12) >> 2] & 127](e) | 0;
            e = Ob[c[((c[d >> 2] | 0) + 16) >> 2] & 63](d, e, 1) | 0;
            g = c[(a + 52) >> 2] | 0;
            g =
              Ob[c[((c[g >> 2] | 0) + 16) >> 2] & 63](
                g,
                c[(e + 8) >> 2] | 0,
                d
              ) | 0;
            yb[c[((c[d >> 2] | 0) + 20) >> 2] & 31](
              d,
              e,
              g,
              1213612625,
              c[(a + 52) >> 2] | 0
            );
            break;
          } else {
            c[(b + 40) >> 2] = e;
            c[(b + 44) >> 2] = 0;
            break;
          }
        } else f = 8;
      while (0);
      if ((f | 0) == 8) {
        c[(b + 40) >> 2] = 0;
        c[(b + 44) >> 2] = 0;
      }
      if (
        c[(a + 56) >> 2] | 0
          ? (((Eb[c[((c[d >> 2] | 0) + 52) >> 2] & 127](d) | 0) & 2) | 0) == 0
          : 0
      ) {
        e =
          Zb[c[((c[d >> 2] | 0) + 24) >> 2] & 31](d, c[(a + 56) >> 2] | 0) | 0;
        if (!e) {
          c[(b + 48) >> 2] =
            Zb[c[((c[d >> 2] | 0) + 28) >> 2] & 31](d, c[(a + 56) >> 2] | 0) |
            0;
          b = c[(a + 56) >> 2] | 0;
          b = Eb[c[((c[b >> 2] | 0) + 8) >> 2] & 127](b) | 0;
          b = Ob[c[((c[d >> 2] | 0) + 16) >> 2] & 63](d, b, 1) | 0;
          g = c[(a + 56) >> 2] | 0;
          g =
            Ob[c[((c[g >> 2] | 0) + 12) >> 2] & 63](g, c[(b + 8) >> 2] | 0, d) |
            0;
          yb[c[((c[d >> 2] | 0) + 20) >> 2] & 31](
            d,
            b,
            g,
            1346456916,
            c[(a + 56) >> 2] | 0
          );
          return 16548;
        } else {
          c[(b + 48) >> 2] = e;
          return 16548;
        }
      }
      c[(b + 48) >> 2] = 0;
      return 16548;
    }
    function Kg(b, d, e) {
      b = b | 0;
      d = d | 0;
      e = e | 0;
      var f = 0,
        g = 0,
        h = 0,
        i = 0,
        j = 0,
        k = 0,
        l = 0,
        m = 0,
        n = 0;
      c[6422] = (c[6422] | 0) + 1;
      k =
        ((((((e << 16) | d) + ~(((e << 16) | d) << 15)) >> 10) ^
          (((e << 16) | d) + ~(((e << 16) | d) << 15))) *
          9) |
        0;
      k =
        ((((k >> 6) ^ k) + ~(((k >> 6) ^ k) << 11)) >> 16) ^
        (((k >> 6) ^ k) + ~(((k >> 6) ^ k) << 11));
      l = c[(b + 12) >> 2] | 0;
      f = c[((c[(b + 40) >> 2] | 0) + (((l + -1) & k) << 2)) >> 2] | 0;
      a: do
        if ((f | 0) != -1) {
          h = c[(b + 16) >> 2] | 0;
          while (1) {
            g = (h + ((f * 12) | 0)) | 0;
            if (
              (c[g >> 2] | 0) == (d | 0)
                ? (c[(h + ((f * 12) | 0) + 4) >> 2] | 0) == (e | 0)
                : 0
            )
              break;
            f = c[((c[(b + 60) >> 2] | 0) + (f << 2)) >> 2] | 0;
            if ((f | 0) == -1) break a;
          }
          if (g | 0) {
            b = g;
            return b | 0;
          }
        }
      while (0);
      j = c[(b + 8) >> 2] | 0;
      if ((j | 0) == (l | 0)) {
        h = l | 0 ? l << 1 : 1;
        if ((l | 0) < (h | 0)) {
          if (!h) {
            f = 0;
            g = l;
          } else {
            c[6435] = (c[6435] | 0) + 1;
            f = yc((((h * 12) | 3) + 16) | 0) | 0;
            if (!f) f = 0;
            else {
              c[(((f + 4 + 15) & -16) + -4) >> 2] = f;
              f = (f + 4 + 15) & -16;
            }
            g = c[(b + 8) >> 2] | 0;
          }
          if ((g | 0) > 0) {
            i = 0;
            do {
              m = (f + ((i * 12) | 0)) | 0;
              n = ((c[(b + 16) >> 2] | 0) + ((i * 12) | 0)) | 0;
              c[m >> 2] = c[n >> 2];
              c[(m + 4) >> 2] = c[(n + 4) >> 2];
              c[(m + 8) >> 2] = c[(n + 8) >> 2];
              i = (i + 1) | 0;
            } while ((i | 0) != (g | 0));
          }
          g = c[(b + 16) >> 2] | 0;
          if (g | 0) {
            if (a[(b + 20) >> 0] | 0) {
              c[6436] = (c[6436] | 0) + 1;
              hd(c[(g + -4) >> 2] | 0);
            }
            c[(b + 16) >> 2] = 0;
          }
          a[(b + 20) >> 0] = 1;
          c[(b + 16) >> 2] = f;
          c[(b + 12) >> 2] = h;
          f = c[(b + 8) >> 2] | 0;
        } else {
          f = l;
          h = l;
        }
      } else {
        f = j;
        h = l;
      }
      c[(b + 8) >> 2] = f + 1;
      g = c[(b + 16) >> 2] | 0;
      if ((l | 0) < (h | 0)) {
        Kf(b);
        f = ((c[(b + 12) >> 2] | 0) + -1) & k;
      } else f = (l + -1) & k;
      c[(g + ((j * 12) | 0)) >> 2] = d;
      c[(g + ((j * 12) | 0) + 4) >> 2] = e;
      c[(g + ((j * 12) | 0) + 8) >> 2] = 0;
      n = ((c[(b + 40) >> 2] | 0) + (f << 2)) | 0;
      c[((c[(b + 60) >> 2] | 0) + (j << 2)) >> 2] = c[n >> 2];
      c[n >> 2] = j;
      n = (g + ((j * 12) | 0)) | 0;
      return n | 0;
    }
    function Lg(a) {
      a = a | 0;
      var b = 0,
        d = 0,
        e = 0;
      c[6435] = (c[6435] | 0) + 1;
      b = yc(219) | 0;
      if (!b) b = 0;
      else {
        c[(((b + 4 + 15) & -16) + -4) >> 2] = b;
        b = (b + 4 + 15) & -16;
      }
      ml();
      c[b >> 2] = 2896;
      d = (b + 52) | 0;
      e = (b + 4) | 0;
      c[e >> 2] = c[a >> 2];
      c[(e + 4) >> 2] = c[(a + 4) >> 2];
      c[(e + 8) >> 2] = c[(a + 8) >> 2];
      c[(e + 12) >> 2] = c[(a + 12) >> 2];
      e = (b + 20) | 0;
      c[e >> 2] = c[(a + 16) >> 2];
      c[(e + 4) >> 2] = c[(a + 16 + 4) >> 2];
      c[(e + 8) >> 2] = c[(a + 16 + 8) >> 2];
      c[(e + 12) >> 2] = c[(a + 16 + 12) >> 2];
      e = (b + 36) | 0;
      c[e >> 2] = c[(a + 32) >> 2];
      c[(e + 4) >> 2] = c[(a + 32 + 4) >> 2];
      c[(e + 8) >> 2] = c[(a + 32 + 8) >> 2];
      c[(e + 12) >> 2] = c[(a + 32 + 12) >> 2];
      c[d >> 2] = c[(a + 48) >> 2];
      c[(d + 4) >> 2] = c[(a + 48 + 4) >> 2];
      c[(d + 8) >> 2] = c[(a + 48 + 8) >> 2];
      c[(d + 12) >> 2] = c[(a + 48 + 12) >> 2];
      d = (b + 116) | 0;
      e = (b + 68) | 0;
      c[e >> 2] = c[5710];
      c[(e + 4) >> 2] = c[5711];
      c[(e + 8) >> 2] = c[5712];
      c[(e + 12) >> 2] = c[5713];
      e = (b + 84) | 0;
      c[e >> 2] = c[5714];
      c[(e + 4) >> 2] = c[5715];
      c[(e + 8) >> 2] = c[5716];
      c[(e + 12) >> 2] = c[5717];
      e = (b + 100) | 0;
      c[e >> 2] = c[5718];
      c[(e + 4) >> 2] = c[5719];
      c[(e + 8) >> 2] = c[5720];
      c[(e + 12) >> 2] = c[5721];
      c[d >> 2] = c[5722];
      c[(d + 4) >> 2] = c[5723];
      c[(d + 8) >> 2] = c[5724];
      c[(d + 12) >> 2] = c[5725];
      d = (b + 180) | 0;
      e = (b + 132) | 0;
      c[e >> 2] = c[a >> 2];
      c[(e + 4) >> 2] = c[(a + 4) >> 2];
      c[(e + 8) >> 2] = c[(a + 8) >> 2];
      c[(e + 12) >> 2] = c[(a + 12) >> 2];
      e = (b + 148) | 0;
      c[e >> 2] = c[(a + 16) >> 2];
      c[(e + 4) >> 2] = c[(a + 16 + 4) >> 2];
      c[(e + 8) >> 2] = c[(a + 16 + 8) >> 2];
      c[(e + 12) >> 2] = c[(a + 16 + 12) >> 2];
      e = (b + 164) | 0;
      c[e >> 2] = c[(a + 32) >> 2];
      c[(e + 4) >> 2] = c[(a + 32 + 4) >> 2];
      c[(e + 8) >> 2] = c[(a + 32 + 8) >> 2];
      c[(e + 12) >> 2] = c[(a + 32 + 12) >> 2];
      c[d >> 2] = c[(a + 48) >> 2];
      c[(d + 4) >> 2] = c[(a + 48 + 4) >> 2];
      c[(d + 8) >> 2] = c[(a + 48 + 8) >> 2];
      c[(d + 12) >> 2] = c[(a + 48 + 12) >> 2];
      c[(b + 196) >> 2] = 0;
      return b | 0;
    }
    function Mg(a, b, d) {
      a = a | 0;
      b = b | 0;
      d = d | 0;
      var e = 0.0,
        f = 0.0,
        h = 0.0,
        i = 0.0,
        j = 0.0,
        k = 0.0,
        l = 0.0;
      k = +g[(d + 100) >> 2];
      h = +g[(d + 16) >> 2];
      e = +g[(d + 20) >> 2];
      f = +g[(d + 24) >> 2];
      j = +g[(d + 108) >> 2];
      j =
        +g[(d + 112) >> 2] -
        k * +g[(d + 116) >> 2] -
        (h * +g[(a + 64) >> 2] +
          e * +g[(a + 68) >> 2] +
          f * +g[(a + 72) >> 2] +
          (+g[d >> 2] * +g[(a + 80) >> 2] +
            +g[(d + 4) >> 2] * +g[(a + 84) >> 2] +
            +g[(d + 8) >> 2] * +g[(a + 88) >> 2])) *
          j -
        j *
          (+g[(d + 48) >> 2] * +g[(b + 64) >> 2] +
            +g[(d + 52) >> 2] * +g[(b + 68) >> 2] +
            +g[(d + 56) >> 2] * +g[(b + 72) >> 2] +
            (+g[(d + 32) >> 2] * +g[(b + 80) >> 2] +
              +g[(d + 36) >> 2] * +g[(b + 84) >> 2] +
              +g[(d + 40) >> 2] * +g[(b + 88) >> 2]));
      l = +g[(d + 120) >> 2];
      i = k + j < l ? l - k : j;
      g[(d + 100) >> 2] = k + j < l ? l : k + j;
      if (c[(a + 240) >> 2] | 0) {
        l = i * e * +g[(a + 132) >> 2] * +g[(a + 116) >> 2];
        k = i * f * +g[(a + 136) >> 2] * +g[(a + 120) >> 2];
        g[(a + 64) >> 2] =
          +g[(a + 112) >> 2] * i * h * +g[(a + 128) >> 2] + +g[(a + 64) >> 2];
        g[(a + 68) >> 2] = l + +g[(a + 68) >> 2];
        g[(a + 72) >> 2] = k + +g[(a + 72) >> 2];
        k = i * +g[(a + 100) >> 2] * +g[(d + 68) >> 2];
        l = i * +g[(a + 104) >> 2] * +g[(d + 72) >> 2];
        g[(a + 80) >> 2] =
          i * +g[(a + 96) >> 2] * +g[(d + 64) >> 2] + +g[(a + 80) >> 2];
        g[(a + 84) >> 2] = k + +g[(a + 84) >> 2];
        g[(a + 88) >> 2] = l + +g[(a + 88) >> 2];
      }
      if (!(c[(b + 240) >> 2] | 0)) return;
      l = i * +g[(d + 52) >> 2] * +g[(b + 132) >> 2] * +g[(b + 116) >> 2];
      k = i * +g[(d + 56) >> 2] * +g[(b + 136) >> 2] * +g[(b + 120) >> 2];
      g[(b + 64) >> 2] =
        +g[(b + 112) >> 2] * i * +g[(d + 48) >> 2] * +g[(b + 128) >> 2] +
        +g[(b + 64) >> 2];
      g[(b + 68) >> 2] = l + +g[(b + 68) >> 2];
      g[(b + 72) >> 2] = k + +g[(b + 72) >> 2];
      k = i * +g[(b + 100) >> 2] * +g[(d + 84) >> 2];
      l = i * +g[(b + 104) >> 2] * +g[(d + 88) >> 2];
      g[(b + 80) >> 2] =
        i * +g[(b + 96) >> 2] * +g[(d + 80) >> 2] + +g[(b + 80) >> 2];
      g[(b + 84) >> 2] = k + +g[(b + 84) >> 2];
      g[(b + 88) >> 2] = l + +g[(b + 88) >> 2];
      return;
    }
    function Ng(b, d, e, f, h, i, j, k, l) {
      b = b | 0;
      d = d | 0;
      e = e | 0;
      f = +f;
      h = +h;
      i = +i;
      j = j | 0;
      k = k | 0;
      l = l | 0;
      var m = 0,
        n = 0.0,
        o = 0.0,
        p = 0.0;
      c[6435] = (c[6435] | 0) + 1;
      m = yc(143) | 0;
      if (!m) m = 0;
      else {
        c[(((m + 4 + 15) & -16) + -4) >> 2] = m;
        m = (m + 4 + 15) & -16;
      }
      c[(m + 8) >> 2] = 0;
      g[(m + 12) >> 2] = 0.0;
      c[m >> 2] = 8060;
      c[(m + 4) >> 2] = 24;
      c[(m + 64) >> 2] = b;
      c[(m + 68) >> 2] = d;
      g[(m + 72) >> 2] = h;
      g[(m + 76) >> 2] = i;
      g[(m + 80) >> 2] = +((b + -1) | 0);
      g[(m + 84) >> 2] = +((d + -1) | 0);
      g[(m + 88) >> 2] = f;
      c[(m + 92) >> 2] = e;
      c[(m + 96) >> 2] = k;
      a[(m + 100) >> 0] = l & 1;
      a[(m + 101) >> 0] = 0;
      a[(m + 102) >> 0] = 0;
      c[(m + 104) >> 2] = j;
      c[(m + 108) >> 2] = 1065353216;
      c[(m + 112) >> 2] = 1065353216;
      c[(m + 116) >> 2] = 1065353216;
      g[(m + 120) >> 2] = 0.0;
      switch (j | 0) {
        case 0: {
          g[(m + 16) >> 2] = h;
          c[(m + 20) >> 2] = 0;
          c[(m + 24) >> 2] = 0;
          g[(m + 28) >> 2] = 0.0;
          g[(m + 32) >> 2] = i;
          g[(m + 36) >> 2] = +((b + -1) | 0);
          g[(m + 40) >> 2] = +((d + -1) | 0);
          g[(m + 44) >> 2] = 0.0;
          o = i;
          p = h;
          f = +((b + -1) | 0);
          n = 0.0;
          i = +((d + -1) | 0);
          h = 0.0;
          break;
        }
        case 1: {
          c[(m + 16) >> 2] = 0;
          g[(m + 20) >> 2] = h;
          c[(m + 24) >> 2] = 0;
          g[(m + 28) >> 2] = 0.0;
          g[(m + 32) >> 2] = +((b + -1) | 0);
          g[(m + 36) >> 2] = i;
          g[(m + 40) >> 2] = +((d + -1) | 0);
          g[(m + 44) >> 2] = 0.0;
          o = +((b + -1) | 0);
          p = 0.0;
          f = i;
          n = h;
          i = +((d + -1) | 0);
          h = 0.0;
          break;
        }
        case 2: {
          c[(m + 16) >> 2] = 0;
          c[(m + 20) >> 2] = 0;
          g[(m + 24) >> 2] = h;
          g[(m + 28) >> 2] = 0.0;
          g[(m + 32) >> 2] = +((b + -1) | 0);
          g[(m + 36) >> 2] = +((d + -1) | 0);
          g[(m + 40) >> 2] = i;
          g[(m + 44) >> 2] = 0.0;
          o = +((b + -1) | 0);
          p = 0.0;
          f = +((d + -1) | 0);
          n = 0.0;
          break;
        }
        default: {
          o = +g[(m + 32) >> 2];
          p = +g[(m + 16) >> 2];
          f = +g[(m + 36) >> 2];
          n = +g[(m + 20) >> 2];
          i = +g[(m + 40) >> 2];
          h = +g[(m + 24) >> 2];
        }
      }
      g[(m + 48) >> 2] = (p + o) * 0.5;
      g[(m + 52) >> 2] = (n + f) * 0.5;
      g[(m + 56) >> 2] = (h + i) * 0.5;
      g[(m + 60) >> 2] = 0.0;
      return m | 0;
    }
    function Og(b, d) {
      b = b | 0;
      d = d | 0;
      var e = 0,
        f = 0,
        h = 0,
        i = 0.0,
        j = 0.0,
        k = 0.0,
        l = 0;
      if (a[(b + 1308) >> 0] | 0) {
        c[d >> 2] = 0;
        c[(d + 4) >> 2] = 0;
        return;
      }
      sd(b, ((c[(b + 28) >> 2] | 0) + 4) | 0, ((c[(b + 32) >> 2] | 0) + 4) | 0);
      c[d >> 2] = 0;
      c[(d + 4) >> 2] = 6;
      if ((c[(b + 856) >> 2] | 0) == 0 ? (a[(b + 788) >> 0] | 0) == 0 : 0) {
        e = 0;
        f = 6;
      } else {
        c[d >> 2] = 1;
        c[(d + 4) >> 2] = 5;
        e = 1;
        f = 5;
      }
      if (!((c[(b + 860) >> 2] | 0) == 0 ? (a[(b + 789) >> 0] | 0) == 0 : 0)) {
        e = (e + 1) | 0;
        c[d >> 2] = e;
        f = (f + -1) | 0;
        c[(d + 4) >> 2] = f;
      }
      if ((c[(b + 864) >> 2] | 0) == 0 ? (a[(b + 790) >> 0] | 0) == 0 : 0)
        l = 0;
      else {
        e = (e + 1) | 0;
        c[d >> 2] = e;
        f = (f + -1) | 0;
        c[(d + 4) >> 2] = f;
        l = 0;
      }
      do {
        i = +g[(b + 868 + (l << 6)) >> 2];
        j = +g[(b + 868 + (l << 6) + 4) >> 2];
        k = +ik(+g[(b + 1192 + (l << 2)) >> 2], i, j);
        g[(b + 868 + (l << 6) + 52) >> 2] = k;
        do
          if (!(i > j)) {
            if (i > k) {
              c[(b + 868 + (l << 6) + 56) >> 2] = 1;
              h = (b + 868 + (l << 6) + 48) | 0;
              g[h >> 2] = k - i;
              if (k - i > 3.1415927410125732) {
                g[h >> 2] = k - i + -6.2831854820251465;
                h = 21;
                break;
              }
              if (!(k - i < -3.1415927410125732)) {
                h = 21;
                break;
              }
              g[h >> 2] = k - i + 6.2831854820251465;
              h = 21;
              break;
            }
            h = (b + 868 + (l << 6) + 56) | 0;
            if (!(j < k)) {
              c[h >> 2] = 0;
              h = 20;
              break;
            }
            c[h >> 2] = 2;
            h = (b + 868 + (l << 6) + 48) | 0;
            g[h >> 2] = k - j;
            if (k - j > 3.1415927410125732) {
              g[h >> 2] = k - j + -6.2831854820251465;
              h = 21;
              break;
            }
            if (k - j < -3.1415927410125732) {
              g[h >> 2] = k - j + 6.2831854820251465;
              h = 21;
            } else h = 21;
          } else {
            c[(b + 868 + (l << 6) + 56) >> 2] = 0;
            h = 20;
          }
        while (0);
        if ((h | 0) == 20) {
          h = 0;
          if (a[(b + 868 + (l << 6) + 44) >> 0] | 0) h = 21;
        }
        if ((h | 0) == 21) {
          e = (e + 1) | 0;
          c[d >> 2] = e;
          f = (f + -1) | 0;
          c[(d + 4) >> 2] = f;
        }
        l = (l + 1) | 0;
      } while ((l | 0) != 3);
      return;
    }
    function Pg(b, d, e, f) {
      b = b | 0;
      d = d | 0;
      e = e | 0;
      f = f | 0;
      var g = 0,
        h = 0,
        j = 0,
        k = 0,
        l = 0;
      l = i;
      i = (i + 96) | 0;
      g = c[(b + 8) >> 2] | 0;
      if (
        (g | 0) == (c[(b + 12) >> 2] | 0)
          ? ((k = g | 0 ? g << 1 : 1), (g | 0) < (k | 0))
          : 0
      ) {
        if (!k) j = 0;
        else {
          c[6435] = (c[6435] | 0) + 1;
          g = yc((((k << 2) | 3) + 16) | 0) | 0;
          if (!g) g = 0;
          else {
            c[(((g + 4 + 15) & -16) + -4) >> 2] = g;
            g = (g + 4 + 15) & -16;
          }
          j = g;
          g = c[(b + 8) >> 2] | 0;
        }
        if ((g | 0) > 0) {
          h = 0;
          do {
            c[(j + (h << 2)) >> 2] =
              c[((c[(b + 16) >> 2] | 0) + (h << 2)) >> 2];
            h = (h + 1) | 0;
          } while ((h | 0) != (g | 0));
        }
        h = c[(b + 16) >> 2] | 0;
        if (h) {
          if (a[(b + 20) >> 0] | 0) {
            c[6436] = (c[6436] | 0) + 1;
            hd(c[(h + -4) >> 2] | 0);
            g = c[(b + 8) >> 2] | 0;
          }
          c[(b + 16) >> 2] = 0;
        }
        a[(b + 20) >> 0] = 1;
        c[(b + 16) >> 2] = j;
        c[(b + 12) >> 2] = k;
      }
      c[((c[(b + 16) >> 2] | 0) + (g << 2)) >> 2] = d;
      c[(b + 8) >> 2] = g + 1;
      c[(l + 32) >> 2] = c[(d + 4) >> 2];
      c[(l + 32 + 4) >> 2] = c[(d + 4 + 4) >> 2];
      c[(l + 32 + 8) >> 2] = c[(d + 4 + 8) >> 2];
      c[(l + 32 + 12) >> 2] = c[(d + 4 + 12) >> 2];
      c[(l + 32 + 16) >> 2] = c[(d + 20) >> 2];
      c[(l + 32 + 16 + 4) >> 2] = c[(d + 20 + 4) >> 2];
      c[(l + 32 + 16 + 8) >> 2] = c[(d + 20 + 8) >> 2];
      c[(l + 32 + 16 + 12) >> 2] = c[(d + 20 + 12) >> 2];
      c[(l + 32 + 32) >> 2] = c[(d + 36) >> 2];
      c[(l + 32 + 32 + 4) >> 2] = c[(d + 36 + 4) >> 2];
      c[(l + 32 + 32 + 8) >> 2] = c[(d + 36 + 8) >> 2];
      c[(l + 32 + 32 + 12) >> 2] = c[(d + 36 + 12) >> 2];
      c[(l + 32 + 48) >> 2] = c[(d + 52) >> 2];
      c[(l + 32 + 48 + 4) >> 2] = c[(d + 52 + 4) >> 2];
      c[(l + 32 + 48 + 8) >> 2] = c[(d + 52 + 8) >> 2];
      c[(l + 32 + 48 + 12) >> 2] = c[(d + 52 + 12) >> 2];
      k = c[(d + 192) >> 2] | 0;
      mc[c[((c[k >> 2] | 0) + 8) >> 2] & 127](k, (l + 32) | 0, (l + 16) | 0, l);
      k = c[(b + 68) >> 2] | 0;
      c[(d + 188) >> 2] =
        gc[c[((c[k >> 2] | 0) + 8) >> 2] & 3](
          k,
          (l + 16) | 0,
          l,
          c[((c[(d + 192) >> 2] | 0) + 4) >> 2] | 0,
          d,
          e,
          f,
          c[(b + 24) >> 2] | 0,
          0
        ) | 0;
      i = l;
      return;
    }
    function Qg(a, b, d, e) {
      a = a | 0;
      b = b | 0;
      d = d | 0;
      e = e | 0;
      var f = 0,
        h = 0,
        j = 0.0,
        k = 0.0,
        l = 0.0,
        m = 0.0,
        n = 0.0,
        o = 0.0,
        p = 0.0,
        q = 0.0,
        r = 0.0,
        s = 0.0,
        t = 0.0,
        u = 0,
        v = 0,
        w = 0.0,
        x = 0,
        y = 0;
      x = i;
      i = (i + 16) | 0;
      f = c[(a + 52) >> 2] | 0;
      w = +g[(a + 28 + ((((f + 2) | 0) % 3 | 0) << 2)) >> 2];
      if ((e | 0) <= 0) {
        i = x;
        return;
      }
      h = 0;
      while (1) {
        c[x >> 2] = 0;
        c[(x + 4) >> 2] = 0;
        c[(x + 8) >> 2] = 0;
        c[(x + 12) >> 2] = 0;
        c[(x + (f << 2)) >> 2] = c[(a + 28 + (f << 2)) >> 2];
        f = (b + (h << 4)) | 0;
        u = (b + (h << 4) + 4) | 0;
        v = (b + (h << 4) + 8) | 0;
        j = w * +g[f >> 2] + +g[x >> 2];
        k = w * +g[u >> 2] + +g[(x + 4) >> 2];
        l = w * +g[v >> 2] + +g[(x + 8) >> 2];
        m = +Sb[c[((c[a >> 2] | 0) + 48) >> 2] & 15](a);
        n = +g[f >> 2];
        o = +g[u >> 2];
        p = +g[v >> 2];
        if (
          n * (j - m * n) + o * (k - m * o) + p * (l - m * p) >
          -999999984306749440.0
        ) {
          g[(d + (h << 4)) >> 2] = j - m * n;
          g[(d + (h << 4) + 4) >> 2] = k - m * o;
          g[(d + (h << 4) + 8) >> 2] = l - m * p;
          g[(d + (h << 4) + 12) >> 2] = 0.0;
          q = +g[f >> 2];
          s = +g[u >> 2];
          t = +g[v >> 2];
          r = n * (j - m * n) + o * (k - m * o) + p * (l - m * p);
        } else {
          q = n;
          s = o;
          t = p;
          r = -999999984306749440.0;
        }
        c[x >> 2] = 0;
        c[(x + 4) >> 2] = 0;
        c[(x + 8) >> 2] = 0;
        c[(x + 12) >> 2] = 0;
        y = c[(a + 52) >> 2] | 0;
        g[(x + (y << 2)) >> 2] = -+g[(a + 28 + (y << 2)) >> 2];
        p = w * q + +g[x >> 2];
        o = w * s + +g[(x + 4) >> 2];
        m = w * t + +g[(x + 8) >> 2];
        n = +Sb[c[((c[a >> 2] | 0) + 48) >> 2] & 15](a);
        l = +g[f >> 2];
        k = +g[u >> 2];
        j = +g[v >> 2];
        if (l * (p - n * l) + k * (o - n * k) + j * (m - n * j) > r) {
          g[(d + (h << 4)) >> 2] = p - n * l;
          g[(d + (h << 4) + 4) >> 2] = o - n * k;
          g[(d + (h << 4) + 8) >> 2] = m - n * j;
          g[(d + (h << 4) + 12) >> 2] = 0.0;
        }
        h = (h + 1) | 0;
        if ((h | 0) == (e | 0)) break;
        f = c[(a + 52) >> 2] | 0;
      }
      i = x;
      return;
    }
    function Rg(a, b, d, e, f, h, i, j, k, l) {
      a = a | 0;
      b = b | 0;
      d = d | 0;
      e = e | 0;
      f = f | 0;
      h = h | 0;
      i = i | 0;
      j = +j;
      k = k | 0;
      l = +l;
      var m = 0.0,
        n = 0.0,
        o = 0.0,
        p = 0.0,
        q = 0.0,
        r = 0.0,
        s = 0.0,
        t = 0.0,
        u = 0.0,
        v = 0.0,
        w = 0.0;
      c[a >> 2] = c[h >> 2];
      c[(a + 4) >> 2] = c[(h + 4) >> 2];
      c[(a + 8) >> 2] = c[(h + 8) >> 2];
      c[(a + 12) >> 2] = c[(h + 12) >> 2];
      s = +g[(e + 4) >> 2];
      v = +g[(a + 8) >> 2];
      w = +g[(e + 8) >> 2];
      p = +g[(a + 4) >> 2];
      m = +g[a >> 2];
      r = +g[e >> 2];
      u =
        (s * v - w * p) * +g[b >> 2] +
        +g[(b + 4) >> 2] * (w * m - v * r) +
        (p * r - s * m) * +g[(b + 8) >> 2];
      t =
        (s * v - w * p) * +g[(b + 16) >> 2] +
        (w * m - v * r) * +g[(b + 20) >> 2] +
        (p * r - s * m) * +g[(b + 24) >> 2];
      s =
        (s * v - w * p) * +g[(b + 32) >> 2] +
        (w * m - v * r) * +g[(b + 36) >> 2] +
        (p * r - s * m) * +g[(b + 40) >> 2];
      g[(a + 16) >> 2] = u;
      g[(a + 20) >> 2] = t;
      g[(a + 24) >> 2] = s;
      g[(a + 28) >> 2] = 0.0;
      r = +g[(f + 4) >> 2];
      w = +g[(f + 8) >> 2];
      n = +g[f >> 2];
      q =
        +g[d >> 2] * (r * -v - w * -p) +
        +g[(d + 4) >> 2] * (w * -m - n * -v) +
        (n * -p - r * -m) * +g[(d + 8) >> 2];
      o =
        (r * -v - w * -p) * +g[(d + 16) >> 2] +
        (w * -m - n * -v) * +g[(d + 20) >> 2] +
        (n * -p - r * -m) * +g[(d + 24) >> 2];
      m =
        (r * -v - w * -p) * +g[(d + 32) >> 2] +
        (w * -m - n * -v) * +g[(d + 36) >> 2] +
        (n * -p - r * -m) * +g[(d + 40) >> 2];
      g[(a + 32) >> 2] = q;
      g[(a + 36) >> 2] = o;
      g[(a + 40) >> 2] = m;
      g[(a + 44) >> 2] = 0.0;
      u = +g[i >> 2] * u;
      t = +g[(i + 4) >> 2] * t;
      s = +g[(i + 8) >> 2] * s;
      g[(a + 48) >> 2] = u;
      g[(a + 52) >> 2] = t;
      g[(a + 56) >> 2] = s;
      g[(a + 60) >> 2] = 0.0;
      r = +g[k >> 2] * q;
      p = +g[(k + 4) >> 2] * o;
      n = +g[(k + 8) >> 2] * m;
      g[(a + 64) >> 2] = r;
      g[(a + 68) >> 2] = p;
      g[(a + 72) >> 2] = n;
      g[(a + 76) >> 2] = 0.0;
      g[(a + 80) >> 2] =
        u * +g[(a + 16) >> 2] +
        t * +g[(a + 20) >> 2] +
        s * +g[(a + 24) >> 2] +
        j +
        l +
        (r * q + p * o + n * m);
      return;
    }
    function Sg(b) {
      b = b | 0;
      var d = 0,
        e = 0,
        f = 0;
      c[b >> 2] = 4144;
      if (
        a[(b + 272) >> 0] | 0
          ? ((d = c[(b + 204) >> 2] | 0),
            Ab[c[c[d >> 2] >> 2] & 255](d),
            (d = c[(b + 204) >> 2] | 0),
            d | 0)
          : 0
      ) {
        c[6436] = (c[6436] | 0) + 1;
        hd(c[(d + -4) >> 2] | 0);
      }
      d = c[(b + 196) >> 2] | 0;
      if (
        d | 0
          ? (Ab[c[c[d >> 2] >> 2] & 255](d), (e = c[(b + 196) >> 2] | 0), e | 0)
          : 0
      ) {
        c[6436] = (c[6436] | 0) + 1;
        hd(c[(e + -4) >> 2] | 0);
      }
      if (
        a[(b + 273) >> 0] | 0
          ? ((f = c[(b + 200) >> 2] | 0),
            Ab[c[c[f >> 2] >> 2] & 255](f),
            (f = c[(b + 200) >> 2] | 0),
            f | 0)
          : 0
      ) {
        c[6436] = (c[6436] | 0) + 1;
        hd(c[(f + -4) >> 2] | 0);
      }
      d = c[(b + 316) >> 2] | 0;
      if (d | 0) {
        if (a[(b + 320) >> 0] | 0) {
          c[6436] = (c[6436] | 0) + 1;
          hd(c[(d + -4) >> 2] | 0);
        }
        c[(b + 316) >> 2] = 0;
      }
      a[(b + 320) >> 0] = 1;
      c[(b + 316) >> 2] = 0;
      c[(b + 308) >> 2] = 0;
      c[(b + 312) >> 2] = 0;
      d = c[(b + 288) >> 2] | 0;
      if (d | 0) {
        if (a[(b + 292) >> 0] | 0) {
          c[6436] = (c[6436] | 0) + 1;
          hd(c[(d + -4) >> 2] | 0);
        }
        c[(b + 288) >> 2] = 0;
      }
      a[(b + 292) >> 0] = 1;
      c[(b + 288) >> 2] = 0;
      c[(b + 280) >> 2] = 0;
      c[(b + 284) >> 2] = 0;
      d = c[(b + 240) >> 2] | 0;
      if (d | 0) {
        if (a[(b + 244) >> 0] | 0) {
          c[6436] = (c[6436] | 0) + 1;
          hd(c[(d + -4) >> 2] | 0);
        }
        c[(b + 240) >> 2] = 0;
      }
      a[(b + 244) >> 0] = 1;
      c[(b + 240) >> 2] = 0;
      c[(b + 232) >> 2] = 0;
      c[(b + 236) >> 2] = 0;
      d = c[(b + 220) >> 2] | 0;
      if (d | 0) {
        if (a[(b + 224) >> 0] | 0) {
          c[6436] = (c[6436] | 0) + 1;
          hd(c[(d + -4) >> 2] | 0);
        }
        c[(b + 220) >> 2] = 0;
      }
      a[(b + 224) >> 0] = 1;
      c[(b + 220) >> 2] = 0;
      c[(b + 212) >> 2] = 0;
      c[(b + 216) >> 2] = 0;
      d = c[(b + 188) >> 2] | 0;
      if (!d) {
        a[(b + 192) >> 0] = 1;
        c[(b + 188) >> 2] = 0;
        c[(b + 180) >> 2] = 0;
        f = (b + 184) | 0;
        c[f >> 2] = 0;
        _j(b);
        return;
      }
      if (a[(b + 192) >> 0] | 0) {
        c[6436] = (c[6436] | 0) + 1;
        hd(c[(d + -4) >> 2] | 0);
      }
      c[(b + 188) >> 2] = 0;
      a[(b + 192) >> 0] = 1;
      c[(b + 188) >> 2] = 0;
      c[(b + 180) >> 2] = 0;
      f = (b + 184) | 0;
      c[f >> 2] = 0;
      _j(b);
      return;
    }
    function Tg(b, d, e) {
      b = b | 0;
      d = d | 0;
      e = e | 0;
      var f = 0,
        h = 0,
        j = 0.0,
        k = 0.0,
        l = 0.0,
        m = 0.0,
        n = 0.0,
        o = 0.0,
        p = 0.0,
        q = 0.0,
        r = 0.0,
        s = 0.0,
        t = 0.0,
        u = 0.0,
        v = 0.0,
        w = 0.0;
      h = i;
      i = (i + 64) | 0;
      a[(d + 84) >> 0] = 0;
      c[h >> 2] = c[(b + 4) >> 2];
      c[(h + 4) >> 2] = c[(b + 4 + 4) >> 2];
      c[(h + 8) >> 2] = c[(b + 4 + 8) >> 2];
      c[(h + 12) >> 2] = c[(b + 4 + 12) >> 2];
      c[(h + 16) >> 2] = c[(b + 20) >> 2];
      c[(h + 16 + 4) >> 2] = c[(b + 20 + 4) >> 2];
      c[(h + 16 + 8) >> 2] = c[(b + 20 + 8) >> 2];
      c[(h + 16 + 12) >> 2] = c[(b + 20 + 12) >> 2];
      c[(h + 32) >> 2] = c[(b + 36) >> 2];
      c[(h + 32 + 4) >> 2] = c[(b + 36 + 4) >> 2];
      c[(h + 32 + 8) >> 2] = c[(b + 36 + 8) >> 2];
      c[(h + 32 + 12) >> 2] = c[(b + 36 + 12) >> 2];
      c[(h + 48) >> 2] = c[(b + 52) >> 2];
      c[(h + 48 + 4) >> 2] = c[(b + 52 + 4) >> 2];
      c[(h + 48 + 8) >> 2] = c[(b + 52 + 8) >> 2];
      c[(h + 48 + 12) >> 2] = c[(b + 52 + 12) >> 2];
      if (e ? ((f = c[(b + 480) >> 2] | 0), f | 0) : 0)
        Cb[c[((c[f >> 2] | 0) + 8) >> 2] & 127](f, h);
      w = +g[(d + 156) >> 2];
      u = +g[h >> 2];
      v = +g[(d + 160) >> 2];
      t = +g[(h + 4) >> 2];
      o = +g[(d + 164) >> 2];
      s = +g[(h + 8) >> 2];
      r = +g[(h + 16) >> 2];
      q = +g[(h + 20) >> 2];
      p = +g[(h + 24) >> 2];
      n = +g[(h + 32) >> 2];
      l = +g[(h + 36) >> 2];
      j = +g[(h + 40) >> 2];
      m = w * r + v * q + o * p + +g[(h + 52) >> 2];
      k = w * n + v * l + o * j + +g[(h + 56) >> 2];
      g[(d + 36) >> 2] = w * u + v * t + o * s + +g[(h + 48) >> 2];
      g[(d + 40) >> 2] = m;
      g[(d + 44) >> 2] = k;
      g[(d + 48) >> 2] = 0.0;
      k = +g[(d + 172) >> 2];
      m = +g[(d + 176) >> 2];
      o = +g[(d + 180) >> 2];
      g[(d + 52) >> 2] = u * k + t * m + s * o;
      g[(d + 56) >> 2] = k * r + m * q + o * p;
      g[(d + 60) >> 2] = k * n + m * l + o * j;
      g[(d + 64) >> 2] = 0.0;
      o = +g[(d + 188) >> 2];
      m = +g[(d + 192) >> 2];
      k = +g[(d + 196) >> 2];
      g[(d + 68) >> 2] = u * o + t * m + s * k;
      g[(d + 72) >> 2] = o * r + m * q + k * p;
      g[(d + 76) >> 2] = o * n + m * l + k * j;
      g[(d + 80) >> 2] = 0.0;
      i = h;
      return;
    }
    function Ug(a, b, d) {
      a = a | 0;
      b = b | 0;
      d = d | 0;
      var e = 0,
        f = 0,
        g = 0.0;
      a: do
        if (b >>> 0 <= 20)
          do
            switch (b | 0) {
              case 9: {
                e = ((c[d >> 2] | 0) + (4 - 1)) & ~(4 - 1);
                b = c[e >> 2] | 0;
                c[d >> 2] = e + 4;
                c[a >> 2] = b;
                break a;
              }
              case 10: {
                b = ((c[d >> 2] | 0) + (4 - 1)) & ~(4 - 1);
                e = c[b >> 2] | 0;
                c[d >> 2] = b + 4;
                c[a >> 2] = e;
                c[(a + 4) >> 2] = (((e | 0) < 0) << 31) >> 31;
                break a;
              }
              case 11: {
                b = ((c[d >> 2] | 0) + (4 - 1)) & ~(4 - 1);
                e = c[b >> 2] | 0;
                c[d >> 2] = b + 4;
                c[a >> 2] = e;
                c[(a + 4) >> 2] = 0;
                break a;
              }
              case 12: {
                f = ((c[d >> 2] | 0) + (8 - 1)) & ~(8 - 1);
                b = c[f >> 2] | 0;
                e = c[(f + 4) >> 2] | 0;
                c[d >> 2] = f + 8;
                c[a >> 2] = b;
                c[(a + 4) >> 2] = e;
                break a;
              }
              case 13: {
                e = ((c[d >> 2] | 0) + (4 - 1)) & ~(4 - 1);
                f = c[e >> 2] | 0;
                c[d >> 2] = e + 4;
                c[a >> 2] = ((f & 65535) << 16) >> 16;
                c[(a + 4) >> 2] =
                  ((((((f & 65535) << 16) >> 16) | 0) < 0) << 31) >> 31;
                break a;
              }
              case 14: {
                e = ((c[d >> 2] | 0) + (4 - 1)) & ~(4 - 1);
                f = c[e >> 2] | 0;
                c[d >> 2] = e + 4;
                c[a >> 2] = f & 65535;
                c[(a + 4) >> 2] = 0;
                break a;
              }
              case 15: {
                e = ((c[d >> 2] | 0) + (4 - 1)) & ~(4 - 1);
                f = c[e >> 2] | 0;
                c[d >> 2] = e + 4;
                c[a >> 2] = ((f & 255) << 24) >> 24;
                c[(a + 4) >> 2] =
                  ((((((f & 255) << 24) >> 24) | 0) < 0) << 31) >> 31;
                break a;
              }
              case 16: {
                e = ((c[d >> 2] | 0) + (4 - 1)) & ~(4 - 1);
                f = c[e >> 2] | 0;
                c[d >> 2] = e + 4;
                c[a >> 2] = f & 255;
                c[(a + 4) >> 2] = 0;
                break a;
              }
              case 17: {
                f = ((c[d >> 2] | 0) + (8 - 1)) & ~(8 - 1);
                g = +h[f >> 3];
                c[d >> 2] = f + 8;
                h[a >> 3] = g;
                break a;
              }
              case 18: {
                f = ((c[d >> 2] | 0) + (8 - 1)) & ~(8 - 1);
                g = +h[f >> 3];
                c[d >> 2] = f + 8;
                h[a >> 3] = g;
                break a;
              }
              default:
                break a;
            }
          while (0);
      while (0);
      return;
    }
    function Vg(a, b, d, e) {
      a = a | 0;
      b = b | 0;
      d = d | 0;
      e = e | 0;
      var f = 0,
        h = 0,
        j = 0.0,
        k = 0.0,
        l = 0.0,
        m = 0.0,
        n = 0,
        o = 0,
        p = 0,
        q = 0,
        r = 0,
        s = 0,
        t = 0,
        u = 0,
        v = 0,
        w = 0,
        x = 0.0,
        y = 0;
      w = i;
      i = (i + 2048) | 0;
      if ((e | 0) > 0) f = 0;
      else {
        i = w;
        return;
      }
      do {
        g[(d + (f << 4) + 12) >> 2] = -999999984306749440.0;
        f = (f + 1) | 0;
      } while ((f | 0) != (e | 0));
      t = 0;
      do {
        if ((Eb[c[((c[a >> 2] | 0) + 96) >> 2] & 127](a) | 0) > 0) {
          r = (b + (t << 4)) | 0;
          s = (b + (t << 4) + 4) | 0;
          o = (b + (t << 4) + 8) | 0;
          p = (d + (t << 4) + 12) | 0;
          q = (d + (t << 4)) | 0;
          u = 0;
          do {
            if (
              (((Eb[c[((c[a >> 2] | 0) + 96) >> 2] & 127](a) | 0) - u) | 0) <
              128
            ) {
              f = ((Eb[c[((c[a >> 2] | 0) + 96) >> 2] & 127](a) | 0) - u) | 0;
              if ((f | 0) > 0) v = 10;
              else {
                j = -3402823466385288598117041.0e14;
                f = -1;
              }
            } else {
              f = 128;
              v = 10;
            }
            if ((v | 0) == 10) {
              v = 0;
              h = 0;
              do {
                ic[c[((c[a >> 2] | 0) + 108) >> 2] & 127](
                  a,
                  h,
                  (w + (h << 4)) | 0
                );
                h = (h + 1) | 0;
              } while ((h | 0) != (f | 0));
              k = +g[r >> 2];
              l = +g[s >> 2];
              m = +g[o >> 2];
              n = 0;
              j = -3402823466385288598117041.0e14;
              h = -1;
              do {
                x =
                  k * +g[(w + (n << 4)) >> 2] +
                  l * +g[(w + (n << 4) + 4) >> 2] +
                  m * +g[(w + (n << 4) + 8) >> 2];
                y = x > j;
                h = y ? n : h;
                j = y ? x : j;
                n = (n + 1) | 0;
              } while ((n | 0) != (f | 0));
              f = h;
            }
            if (j > +g[p >> 2]) {
              y = (w + (f << 4)) | 0;
              c[q >> 2] = c[y >> 2];
              c[(q + 4) >> 2] = c[(y + 4) >> 2];
              c[(q + 8) >> 2] = c[(y + 8) >> 2];
              c[(q + 12) >> 2] = c[(y + 12) >> 2];
              g[p >> 2] = j;
            }
            u = (u + 128) | 0;
          } while ((u | 0) < (Eb[c[((c[a >> 2] | 0) + 96) >> 2] & 127](a) | 0));
        }
        t = (t + 1) | 0;
      } while ((t | 0) != (e | 0));
      i = w;
      return;
    }
    function Wg(a, b) {
      a = a | 0;
      b = b | 0;
      var d = 0.0,
        e = 0.0,
        f = 0.0,
        h = 0,
        j = 0,
        l = 0,
        m = 0,
        n = 0.0;
      h = i;
      i = (i + 16) | 0;
      d = +g[a >> 2];
      e = +g[(a + 20) >> 2];
      f = +g[(a + 40) >> 2];
      if (d + e + f > 0.0) {
        f = +O(+(d + e + f + 1.0));
        g[(h + 12) >> 2] = f * 0.5;
        n = (+g[(a + 36) >> 2] - +g[(a + 24) >> 2]) * (0.5 / f);
        g[h >> 2] = n;
        d = (+g[(a + 8) >> 2] - +g[(a + 32) >> 2]) * (0.5 / f);
        g[(h + 4) >> 2] = d;
        e = (+g[(a + 16) >> 2] - +g[(a + 4) >> 2]) * (0.5 / f);
        g[(h + 8) >> 2] = e;
        a = ((g[k >> 2] = n), c[k >> 2] | 0);
        m = ((g[k >> 2] = d), c[k >> 2] | 0);
        l = ((g[k >> 2] = e), c[k >> 2] | 0);
        j = ((g[k >> 2] = f * 0.5), c[k >> 2] | 0);
        c[b >> 2] = a;
        a = (b + 4) | 0;
        c[a >> 2] = m;
        a = (b + 8) | 0;
        c[a >> 2] = l;
        a = (b + 12) | 0;
        c[a >> 2] = j;
        i = h;
        return;
      } else {
        m = d < e ? (e < f ? 2 : 1) : d < f ? 2 : 0;
        n = +O(
          +(
            +g[(a + (m << 4) + (m << 2)) >> 2] -
            +g[
              (a +
                (((((m + 1) | 0) >>> 0) % 3 | 0) << 4) +
                (((((m + 1) | 0) >>> 0) % 3 | 0) << 2)) >>
                2
            ] -
            +g[
              (a +
                (((((m + 2) | 0) >>> 0) % 3 | 0) << 4) +
                (((((m + 2) | 0) >>> 0) % 3 | 0) << 2)) >>
                2
            ] +
            1.0
          )
        );
        g[(h + (m << 2)) >> 2] = n * 0.5;
        g[(h + 12) >> 2] =
          (+g[
            (a +
              (((((m + 2) | 0) >>> 0) % 3 | 0) << 4) +
              (((((m + 1) | 0) >>> 0) % 3 | 0) << 2)) >>
              2
          ] -
            +g[
              (a +
                (((((m + 1) | 0) >>> 0) % 3 | 0) << 4) +
                (((((m + 2) | 0) >>> 0) % 3 | 0) << 2)) >>
                2
            ]) *
          (0.5 / n);
        g[(h + (((((m + 1) | 0) >>> 0) % 3 | 0) << 2)) >> 2] =
          (+g[(a + (((((m + 1) | 0) >>> 0) % 3 | 0) << 4) + (m << 2)) >> 2] +
            +g[(a + (m << 4) + (((((m + 1) | 0) >>> 0) % 3 | 0) << 2)) >> 2]) *
          (0.5 / n);
        g[(h + (((((m + 2) | 0) >>> 0) % 3 | 0) << 2)) >> 2] =
          (+g[(a + (((((m + 2) | 0) >>> 0) % 3 | 0) << 4) + (m << 2)) >> 2] +
            +g[(a + (m << 4) + (((((m + 2) | 0) >>> 0) % 3 | 0) << 2)) >> 2]) *
          (0.5 / n);
        m = c[h >> 2] | 0;
        a = c[(h + 4) >> 2] | 0;
        j = c[(h + 8) >> 2] | 0;
        l = c[(h + 12) >> 2] | 0;
        c[b >> 2] = m;
        m = (b + 4) | 0;
        c[m >> 2] = a;
        m = (b + 8) | 0;
        c[m >> 2] = j;
        m = (b + 12) | 0;
        c[m >> 2] = l;
        i = h;
        return;
      }
    }
    function Xg(a, b) {
      a = a | 0;
      b = b | 0;
      var d = 0,
        e = 0;
      d = i;
      i = (i + 48) | 0;
      e = ((c[(a + 48) >> 2] | 0) + 4) | 0;
      c[e >> 2] = c[b >> 2];
      c[(e + 4) >> 2] = c[(b + 4) >> 2];
      c[(e + 8) >> 2] = c[(b + 8) >> 2];
      c[(e + 12) >> 2] = c[(b + 12) >> 2];
      c[(d + 32) >> 2] = 0;
      c[(d + 32 + 4) >> 2] = 0;
      c[(d + 32 + 8) >> 2] = 0;
      c[(d + 32 + 12) >> 2] = 0;
      g[(d + 32) >> 2] = 1.0;
      ic[c[((c[a >> 2] | 0) + 68) >> 2] & 127]((d + 16) | 0, a, (d + 32) | 0);
      g[(a + 32) >> 2] = +g[(d + 16) >> 2] + +g[(a + 12) >> 2];
      g[(d + 32) >> 2] = -1.0;
      ic[c[((c[a >> 2] | 0) + 68) >> 2] & 127](d, a, (d + 32) | 0);
      c[(d + 16) >> 2] = c[d >> 2];
      c[(d + 16 + 4) >> 2] = c[(d + 4) >> 2];
      c[(d + 16 + 8) >> 2] = c[(d + 8) >> 2];
      c[(d + 16 + 12) >> 2] = c[(d + 12) >> 2];
      g[(a + 16) >> 2] = +g[(d + 16) >> 2] - +g[(a + 12) >> 2];
      c[(d + 32) >> 2] = 0;
      c[(d + 32 + 4) >> 2] = 0;
      c[(d + 32 + 8) >> 2] = 0;
      c[(d + 32 + 12) >> 2] = 0;
      g[(d + 32 + 4) >> 2] = 1.0;
      ic[c[((c[a >> 2] | 0) + 68) >> 2] & 127]((d + 16) | 0, a, (d + 32) | 0);
      g[(a + 36) >> 2] = +g[(d + 16 + 4) >> 2] + +g[(a + 12) >> 2];
      g[(d + 32 + 4) >> 2] = -1.0;
      ic[c[((c[a >> 2] | 0) + 68) >> 2] & 127](d, a, (d + 32) | 0);
      c[(d + 16) >> 2] = c[d >> 2];
      c[(d + 16 + 4) >> 2] = c[(d + 4) >> 2];
      c[(d + 16 + 8) >> 2] = c[(d + 8) >> 2];
      c[(d + 16 + 12) >> 2] = c[(d + 12) >> 2];
      g[(a + 20) >> 2] = +g[(d + 16 + 4) >> 2] - +g[(a + 12) >> 2];
      c[(d + 32) >> 2] = 0;
      c[(d + 32 + 4) >> 2] = 0;
      c[(d + 32 + 8) >> 2] = 0;
      c[(d + 32 + 12) >> 2] = 0;
      g[(d + 32 + 8) >> 2] = 1.0;
      ic[c[((c[a >> 2] | 0) + 68) >> 2] & 127]((d + 16) | 0, a, (d + 32) | 0);
      g[(a + 40) >> 2] = +g[(d + 16 + 8) >> 2] + +g[(a + 12) >> 2];
      g[(d + 32 + 8) >> 2] = -1.0;
      ic[c[((c[a >> 2] | 0) + 68) >> 2] & 127](d, a, (d + 32) | 0);
      c[(d + 16) >> 2] = c[d >> 2];
      c[(d + 16 + 4) >> 2] = c[(d + 4) >> 2];
      c[(d + 16 + 8) >> 2] = c[(d + 8) >> 2];
      c[(d + 16 + 12) >> 2] = c[(d + 12) >> 2];
      g[(a + 24) >> 2] = +g[(d + 16 + 8) >> 2] - +g[(a + 12) >> 2];
      i = d;
      return;
    }
    function Yg(a, b, d, e, f, h, j) {
      a = a | 0;
      b = b | 0;
      d = d | 0;
      e = e | 0;
      f = f | 0;
      h = h | 0;
      j = j | 0;
      var l = 0.0,
        m = 0.0,
        n = 0,
        o = 0.0,
        p = 0.0,
        q = 0,
        r = 0,
        s = 0.0,
        t = 0;
      r = i;
      i = (i + 16) | 0;
      g[e >> 2] = 3402823466385288598117041.0e14;
      g[f >> 2] = -3402823466385288598117041.0e14;
      n = c[(a + 96) >> 2] | 0;
      if ((n | 0) > 0) {
        q = 0;
        do {
          t = c[(a + 104) >> 2] | 0;
          s = +g[(t + (q << 4)) >> 2] * +g[(a + 12) >> 2];
          p = +g[(t + (q << 4) + 4) >> 2] * +g[(a + 16) >> 2];
          o = +g[(t + (q << 4) + 8) >> 2] * +g[(a + 20) >> 2];
          l =
            s * +g[b >> 2] +
            p * +g[(b + 4) >> 2] +
            o * +g[(b + 8) >> 2] +
            +g[(b + 48) >> 2];
          m =
            s * +g[(b + 16) >> 2] +
            p * +g[(b + 20) >> 2] +
            o * +g[(b + 24) >> 2] +
            +g[(b + 52) >> 2];
          o =
            s * +g[(b + 32) >> 2] +
            p * +g[(b + 36) >> 2] +
            o * +g[(b + 40) >> 2] +
            +g[(b + 56) >> 2];
          p = l * +g[d >> 2] + m * +g[(d + 4) >> 2] + o * +g[(d + 8) >> 2];
          if (p < +g[e >> 2]) {
            g[e >> 2] = p;
            g[h >> 2] = l;
            g[(h + 4) >> 2] = m;
            g[(h + 8) >> 2] = o;
            g[(h + 12) >> 2] = 0.0;
          }
          if (p > +g[f >> 2]) {
            g[f >> 2] = p;
            g[j >> 2] = l;
            g[(j + 4) >> 2] = m;
            g[(j + 8) >> 2] = o;
            g[(j + 12) >> 2] = 0.0;
          }
          q = (q + 1) | 0;
        } while ((q | 0) != (n | 0));
        s = +g[f >> 2];
        m = s;
        n = ((g[k >> 2] = s), c[k >> 2] | 0);
      } else {
        m = -3402823466385288598117041.0e14;
        n = -8388609;
      }
      l = +g[e >> 2];
      if (!(l > m)) {
        i = r;
        return;
      }
      c[e >> 2] = n;
      g[f >> 2] = l;
      c[r >> 2] = c[h >> 2];
      c[(r + 4) >> 2] = c[(h + 4) >> 2];
      c[(r + 8) >> 2] = c[(h + 8) >> 2];
      c[(r + 12) >> 2] = c[(h + 12) >> 2];
      c[h >> 2] = c[j >> 2];
      c[(h + 4) >> 2] = c[(j + 4) >> 2];
      c[(h + 8) >> 2] = c[(j + 8) >> 2];
      c[(h + 12) >> 2] = c[(j + 12) >> 2];
      c[j >> 2] = c[r >> 2];
      c[(j + 4) >> 2] = c[(r + 4) >> 2];
      c[(j + 8) >> 2] = c[(r + 8) >> 2];
      c[(j + 12) >> 2] = c[(r + 12) >> 2];
      i = r;
      return;
    }
    function Zg(a, b, c, d, e, f, h) {
      a = a | 0;
      b = +b;
      c = +c;
      d = +d;
      e = e | 0;
      f = +f;
      h = h | 0;
      var j = 0.0,
        k = 0.0,
        l = 0,
        m = 0.0,
        n = 0.0,
        o = 0.0,
        p = 0.0,
        q = 0.0,
        r = 0.0;
      l = i;
      i = (i + 16) | 0;
      k = c * f + +g[(a + 52) >> 2];
      j = d * f + +g[(a + 56) >> 2];
      g[(h + 48) >> 2] = b * f + +g[(a + 48) >> 2];
      g[(h + 52) >> 2] = k;
      g[(h + 56) >> 2] = j;
      g[(h + 60) >> 2] = 0.0;
      j = +g[e >> 2];
      k = +g[(e + 4) >> 2];
      c = +g[(e + 8) >> 2];
      d = +O(+(j * j + k * k + c * c));
      d = d * f > 0.7853981852531433 ? 0.7853981852531433 / f : d;
      if (d < 1.0000000474974513e-3)
        b = f * 0.5 - d * f * f * f * 0.02083333395421505 * d;
      else b = +R(+(d * 0.5 * f)) / d;
      o = j * b;
      n = k * b;
      j = c * b;
      q = +Q(+(d * f * 0.5));
      Wg(a, l);
      b = +g[l >> 2];
      p = +g[(l + 12) >> 2];
      c = +g[(l + 8) >> 2];
      f = +g[(l + 4) >> 2];
      r =
        1.0 /
        +O(
          +(
            (q * p - o * b - n * f - j * c) * (q * p - o * b - n * f - j * c) +
            ((j * p + q * c + o * f - n * b) * (j * p + q * c + o * f - n * b) +
              ((q * b + o * p + n * c - j * f) *
                (q * b + o * p + n * c - j * f) +
                (j * b + (n * p + q * f) - o * c) *
                  (j * b + (n * p + q * f) - o * c)))
          )
        );
      d = (q * b + o * p + n * c - j * f) * r;
      k = r * (j * b + (n * p + q * f) - o * c);
      m = r * (j * p + q * c + o * f - n * b);
      c = r * (q * p - o * b - n * f - j * c);
      j = d * (2.0 / (c * c + (m * m + (d * d + k * k))));
      f = k * (2.0 / (c * c + (m * m + (d * d + k * k))));
      b = m * (2.0 / (c * c + (m * m + (d * d + k * k))));
      g[h >> 2] = 1.0 - (k * f + m * b);
      g[(h + 4) >> 2] = d * f - c * b;
      g[(h + 8) >> 2] = d * b + c * f;
      g[(h + 12) >> 2] = 0.0;
      g[(h + 16) >> 2] = d * f + c * b;
      g[(h + 20) >> 2] = 1.0 - (d * j + m * b);
      g[(h + 24) >> 2] = k * b - c * j;
      g[(h + 28) >> 2] = 0.0;
      g[(h + 32) >> 2] = d * b - c * f;
      g[(h + 36) >> 2] = k * b + c * j;
      g[(h + 40) >> 2] = 1.0 - (d * j + k * f);
      g[(h + 44) >> 2] = 0.0;
      i = l;
      return;
    }
    function _g(b, d, e) {
      b = b | 0;
      d = +d;
      e = e | 0;
      var f = 0,
        h = 0.0,
        i = 0.0,
        j = 0.0,
        k = 0.0,
        l = 0.0;
      f = c[(b + 8) >> 2] | 0;
      if (f | 0 ? ((c[(f + 204) >> 2] & 3) | 0) == 0 : 0) {
        if (((c[(f + 216) >> 2] & -2) | 0) != 4) c[(f + 216) >> 2] = 1;
        g[(f + 220) >> 2] = 0.0;
      }
      f = c[(b + 12) >> 2] | 0;
      if (f | 0 ? ((c[(f + 204) >> 2] & 3) | 0) == 0 : 0) {
        if (((c[(f + 216) >> 2] & -2) | 0) != 4) c[(f + 216) >> 2] = 1;
        g[(f + 220) >> 2] = 0.0;
      }
      f = c[(b + 20) >> 2] | 0;
      if (f | 0 ? ((c[(f + 204) >> 2] & 3) | 0) == 0 : 0) {
        if (((c[(f + 216) >> 2] & -2) | 0) != 4) c[(f + 216) >> 2] = 1;
        g[(f + 220) >> 2] = 0.0;
      }
      f = c[(b + 24) >> 2] | 0;
      if (f | 0 ? ((c[(f + 204) >> 2] & 3) | 0) == 0 : 0) {
        if (((c[(f + 216) >> 2] & -2) | 0) != 4) c[(f + 216) >> 2] = 1;
        g[(f + 220) >> 2] = 0.0;
      }
      f = c[(b + 156) >> 2] | 0;
      c[(b + 156) >> 2] = f + 1;
      a[(b + 152) >> 0] = ((f | 0) >= (c[(b + 160) >> 2] | 0)) & 1;
      if (f | 0) {
        c[(b + 72) >> 2] = 0;
        c[(b + 72 + 4) >> 2] = 0;
        c[(b + 72 + 8) >> 2] = 0;
        c[(b + 72 + 12) >> 2] = 0;
        c[(b + 72 + 16) >> 2] = 0;
        c[(b + 72 + 20) >> 2] = 0;
        c[(b + 72 + 24) >> 2] = 0;
        c[(b + 72 + 28) >> 2] = 0;
        return;
      }
      j = +g[(b + 64) >> 2];
      i = (1.0 / d) * +g[(b + 72) >> 2] * j;
      h = (1.0 / d) * j * +g[(b + 76) >> 2];
      d = (1.0 / d) * j * +g[(b + 80) >> 2];
      g[(b + 72) >> 2] = i;
      g[(b + 76) >> 2] = h;
      g[(b + 80) >> 2] = d;
      g[(b + 84) >> 2] = 0.0;
      j = +g[(b + 68) >> 2];
      if (j > 0.0) {
        l =
          j * i * +g[(b + 120) >> 2] +
          j * h * +g[(b + 124) >> 2] +
          j * d * +g[(b + 128) >> 2];
        k =
          j * i * +g[(b + 136) >> 2] +
          j * h * +g[(b + 140) >> 2] +
          j * d * +g[(b + 144) >> 2];
        g[(b + 88) >> 2] =
          j * i * +g[(b + 104) >> 2] +
          j * h * +g[(b + 108) >> 2] +
          j * d * +g[(b + 112) >> 2];
        g[(b + 92) >> 2] = l;
        g[(b + 96) >> 2] = k;
        g[(b + 100) >> 2] = 0.0;
        g[(b + 72) >> 2] = (1.0 - j) * i;
        g[(b + 76) >> 2] = (1.0 - j) * h;
        g[(b + 80) >> 2] = (1.0 - j) * d;
        i = (1.0 - j) * i;
        h = (1.0 - j) * h;
        d = (1.0 - j) * d;
      }
      g[(b + 72) >> 2] = (1.0 / +(e | 0)) * i;
      g[(b + 76) >> 2] = (1.0 / +(e | 0)) * h;
      g[(b + 80) >> 2] = (1.0 / +(e | 0)) * d;
      return;
    }
    function $g(a, b, d) {
      a = a | 0;
      b = b | 0;
      d = d | 0;
      var e = 0,
        f = 0,
        g = 0,
        h = 0,
        i = 0,
        j = 0,
        k = 0,
        l = 0;
      while (1) {
        k = c[(a + 12) >> 2] | 0;
        l = c[(k + (((((b + d) | 0) / 2) | 0) << 2)) >> 2] | 0;
        e = b;
        f = d;
        while (1) {
          j = c[((c[(l + 740) >> 2] | 0) + 208) >> 2] | 0;
          if ((j | 0) > -1)
            while (1) {
              h = c[(k + (e << 2)) >> 2] | 0;
              g = c[((c[(h + 740) >> 2] | 0) + 208) >> 2] | 0;
              if ((g | 0) <= -1)
                g = c[((c[(h + 744) >> 2] | 0) + 208) >> 2] | 0;
              if ((g | 0) < (j | 0)) e = (e + 1) | 0;
              else break;
            }
          else {
            i = c[((c[(l + 744) >> 2] | 0) + 208) >> 2] | 0;
            while (1) {
              h = c[(k + (e << 2)) >> 2] | 0;
              g = c[((c[(h + 740) >> 2] | 0) + 208) >> 2] | 0;
              if ((g | 0) <= -1)
                g = c[((c[(h + 744) >> 2] | 0) + 208) >> 2] | 0;
              if ((g | 0) < (i | 0)) e = (e + 1) | 0;
              else break;
            }
          }
          if ((j | 0) > -1)
            while (1) {
              h = c[(k + (f << 2)) >> 2] | 0;
              g = c[((c[(h + 740) >> 2] | 0) + 208) >> 2] | 0;
              if ((g | 0) <= -1)
                g = c[((c[(h + 744) >> 2] | 0) + 208) >> 2] | 0;
              if ((j | 0) < (g | 0)) f = (f + -1) | 0;
              else break;
            }
          else {
            i = c[((c[(l + 744) >> 2] | 0) + 208) >> 2] | 0;
            while (1) {
              h = c[(k + (f << 2)) >> 2] | 0;
              g = c[((c[(h + 740) >> 2] | 0) + 208) >> 2] | 0;
              if ((g | 0) <= -1)
                g = c[((c[(h + 744) >> 2] | 0) + 208) >> 2] | 0;
              if ((i | 0) < (g | 0)) f = (f + -1) | 0;
              else break;
            }
          }
          if ((e | 0) <= (f | 0)) {
            i = (k + (e << 2)) | 0;
            j = c[i >> 2] | 0;
            c[i >> 2] = c[(k + (f << 2)) >> 2];
            c[((c[(a + 12) >> 2] | 0) + (f << 2)) >> 2] = j;
            e = (e + 1) | 0;
            f = (f + -1) | 0;
          }
          if ((e | 0) > (f | 0)) break;
          k = c[(a + 12) >> 2] | 0;
        }
        if ((f | 0) > (b | 0)) $g(a, b, f);
        if ((e | 0) < (d | 0)) b = e;
        else break;
      }
      return;
    }
    function ah(a, b, d, e, f) {
      a = a | 0;
      b = b | 0;
      d = d | 0;
      e = e | 0;
      f = f | 0;
      var h = 0.0,
        j = 0.0,
        k = 0,
        l = 0.0,
        m = 0.0,
        n = 0.0,
        o = 0.0,
        p = 0.0,
        q = 0.0,
        r = 0;
      k = i;
      i = (i + 64) | 0;
      n = +g[d >> 2];
      o = +g[(d + 4) >> 2];
      m = +g[(d + 8) >> 2];
      p = n * +g[(b + 4) >> 2] + o * +g[(b + 20) >> 2] + m * +g[(b + 36) >> 2];
      q = n * +g[(b + 8) >> 2] + o * +g[(b + 24) >> 2] + m * +g[(b + 40) >> 2];
      g[(k + 48) >> 2] =
        +g[b >> 2] * n + +g[(b + 16) >> 2] * o + +g[(b + 32) >> 2] * m;
      g[(k + 48 + 4) >> 2] = p;
      g[(k + 48 + 8) >> 2] = q;
      g[(k + 48 + 12) >> 2] = 0.0;
      ic[c[((c[a >> 2] | 0) + 64) >> 2] & 127]((k + 32) | 0, a, (k + 48) | 0);
      q = +g[(k + 32) >> 2];
      p = +g[(k + 32 + 4) >> 2];
      m = +g[(k + 32 + 8) >> 2];
      o =
        q * +g[b >> 2] +
        p * +g[(b + 4) >> 2] +
        m * +g[(b + 8) >> 2] +
        +g[(b + 48) >> 2];
      n =
        q * +g[(b + 16) >> 2] +
        p * +g[(b + 20) >> 2] +
        m * +g[(b + 24) >> 2] +
        +g[(b + 52) >> 2];
      m =
        q * +g[(b + 32) >> 2] +
        p * +g[(b + 36) >> 2] +
        m * +g[(b + 40) >> 2] +
        +g[(b + 56) >> 2];
      r = c[((c[a >> 2] | 0) + 64) >> 2] | 0;
      p = -+g[(k + 48 + 4) >> 2];
      q = -+g[(k + 48 + 8) >> 2];
      g[k >> 2] = -+g[(k + 48) >> 2];
      g[(k + 4) >> 2] = p;
      g[(k + 8) >> 2] = q;
      g[(k + 12) >> 2] = 0.0;
      ic[r & 127]((k + 16) | 0, a, k);
      q = +g[(k + 16) >> 2];
      p = +g[(k + 16 + 4) >> 2];
      h = +g[(k + 16 + 8) >> 2];
      l =
        q * +g[b >> 2] +
        p * +g[(b + 4) >> 2] +
        h * +g[(b + 8) >> 2] +
        +g[(b + 48) >> 2];
      j =
        q * +g[(b + 16) >> 2] +
        p * +g[(b + 20) >> 2] +
        h * +g[(b + 24) >> 2] +
        +g[(b + 52) >> 2];
      h =
        q * +g[(b + 32) >> 2] +
        p * +g[(b + 36) >> 2] +
        h * +g[(b + 40) >> 2] +
        +g[(b + 56) >> 2];
      g[e >> 2] = o * +g[d >> 2] + n * +g[(d + 4) >> 2] + m * +g[(d + 8) >> 2];
      h = l * +g[d >> 2] + j * +g[(d + 4) >> 2] + h * +g[(d + 8) >> 2];
      g[f >> 2] = h;
      j = +g[e >> 2];
      if (!(j > h)) {
        i = k;
        return;
      }
      g[e >> 2] = h;
      g[f >> 2] = j;
      i = k;
      return;
    }
    function bh(a, b, d) {
      a = a | 0;
      b = b | 0;
      d = d | 0;
      var e = 0,
        f = 0,
        g = 0,
        h = 0,
        i = 0,
        j = 0,
        k = 0,
        l = 0;
      while (1) {
        k = c[(a + 12) >> 2] | 0;
        l = c[(k + (((((b + d) | 0) / 2) | 0) << 2)) >> 2] | 0;
        e = b;
        f = d;
        while (1) {
          j = c[((c[(l + 28) >> 2] | 0) + 208) >> 2] | 0;
          if ((j | 0) > -1)
            while (1) {
              h = c[(k + (e << 2)) >> 2] | 0;
              g = c[((c[(h + 28) >> 2] | 0) + 208) >> 2] | 0;
              if ((g | 0) <= -1) g = c[((c[(h + 32) >> 2] | 0) + 208) >> 2] | 0;
              if ((g | 0) < (j | 0)) e = (e + 1) | 0;
              else break;
            }
          else {
            i = c[((c[(l + 32) >> 2] | 0) + 208) >> 2] | 0;
            while (1) {
              h = c[(k + (e << 2)) >> 2] | 0;
              g = c[((c[(h + 28) >> 2] | 0) + 208) >> 2] | 0;
              if ((g | 0) <= -1) g = c[((c[(h + 32) >> 2] | 0) + 208) >> 2] | 0;
              if ((g | 0) < (i | 0)) e = (e + 1) | 0;
              else break;
            }
          }
          if ((j | 0) > -1)
            while (1) {
              h = c[(k + (f << 2)) >> 2] | 0;
              g = c[((c[(h + 28) >> 2] | 0) + 208) >> 2] | 0;
              if ((g | 0) <= -1) g = c[((c[(h + 32) >> 2] | 0) + 208) >> 2] | 0;
              if ((j | 0) < (g | 0)) f = (f + -1) | 0;
              else break;
            }
          else {
            i = c[((c[(l + 32) >> 2] | 0) + 208) >> 2] | 0;
            while (1) {
              h = c[(k + (f << 2)) >> 2] | 0;
              g = c[((c[(h + 28) >> 2] | 0) + 208) >> 2] | 0;
              if ((g | 0) <= -1) g = c[((c[(h + 32) >> 2] | 0) + 208) >> 2] | 0;
              if ((i | 0) < (g | 0)) f = (f + -1) | 0;
              else break;
            }
          }
          if ((e | 0) <= (f | 0)) {
            i = (k + (e << 2)) | 0;
            j = c[i >> 2] | 0;
            c[i >> 2] = c[(k + (f << 2)) >> 2];
            c[((c[(a + 12) >> 2] | 0) + (f << 2)) >> 2] = j;
            e = (e + 1) | 0;
            f = (f + -1) | 0;
          }
          if ((e | 0) > (f | 0)) break;
          k = c[(a + 12) >> 2] | 0;
        }
        if ((f | 0) > (b | 0)) bh(a, b, f);
        if ((e | 0) < (d | 0)) b = e;
        else break;
      }
      return;
    }
    function ch(a, b, d) {
      a = a | 0;
      b = b | 0;
      d = d | 0;
      var e = 0,
        f = 0,
        g = 0,
        h = 0,
        j = 0,
        k = 0,
        l = 0,
        m = 0;
      m = i;
      i = (i + 16) | 0;
      h = c[(a + 12) >> 2] | 0;
      j = c[(h + (((((d + b) | 0) / 2) | 0) << 4)) >> 2] | 0;
      k = c[(h + (((((d + b) | 0) / 2) | 0) << 4) + 4) >> 2] | 0;
      l = c[(h + (((((d + b) | 0) / 2) | 0) << 4) + 8) >> 2] | 0;
      e = b;
      f = d;
      while (1) {
        g = e;
        while (1) {
          e = c[(h + (g << 4) + 4) >> 2] | 0;
          if ((e | 0) >= (k | 0)) {
            if ((e | 0) != (k | 0)) break;
            e = c[(h + (g << 4)) >> 2] | 0;
            if ((e | 0) >= (j | 0)) {
              if ((e | 0) != (j | 0)) break;
              if ((c[(h + (g << 4) + 8) >> 2] | 0) >= (l | 0)) break;
            }
          }
          g = (g + 1) | 0;
        }
        while (1) {
          e = c[(h + (f << 4) + 4) >> 2] | 0;
          if ((k | 0) >= (e | 0)) {
            if ((k | 0) != (e | 0)) break;
            e = c[(h + (f << 4)) >> 2] | 0;
            if ((j | 0) >= (e | 0)) {
              if ((j | 0) != (e | 0)) break;
              if ((l | 0) >= (c[(h + (f << 4) + 8) >> 2] | 0)) break;
            }
          }
          f = (f + -1) | 0;
        }
        if ((g | 0) > (f | 0)) e = g;
        else {
          e = (h + (g << 4)) | 0;
          c[m >> 2] = c[e >> 2];
          c[(m + 4) >> 2] = c[(e + 4) >> 2];
          c[(m + 8) >> 2] = c[(e + 8) >> 2];
          c[(m + 12) >> 2] = c[(e + 12) >> 2];
          h = (h + (f << 4)) | 0;
          c[e >> 2] = c[h >> 2];
          c[(e + 4) >> 2] = c[(h + 4) >> 2];
          c[(e + 8) >> 2] = c[(h + 8) >> 2];
          c[(e + 12) >> 2] = c[(h + 12) >> 2];
          e = ((c[(a + 12) >> 2] | 0) + (f << 4)) | 0;
          c[e >> 2] = c[m >> 2];
          c[(e + 4) >> 2] = c[(m + 4) >> 2];
          c[(e + 8) >> 2] = c[(m + 8) >> 2];
          c[(e + 12) >> 2] = c[(m + 12) >> 2];
          e = (g + 1) | 0;
          f = (f + -1) | 0;
        }
        if ((e | 0) > (f | 0)) break;
        h = c[(a + 12) >> 2] | 0;
      }
      if ((f | 0) > (b | 0)) ch(a, b, f);
      if ((e | 0) >= (d | 0)) {
        i = m;
        return;
      }
      ch(a, e, d);
      i = m;
      return;
    }
    function dh(a, b, d) {
      a = a | 0;
      b = b | 0;
      d = d | 0;
      var e = 0,
        f = 0.0,
        h = 0.0,
        j = 0.0,
        k = 0.0,
        l = 0.0,
        m = 0.0,
        n = 0.0,
        o = 0.0,
        p = 0.0,
        q = 0.0,
        r = 0.0,
        s = 0.0,
        t = 0.0,
        u = 0.0,
        v = 0.0,
        w = 0.0,
        x = 0.0,
        y = 0.0;
      e = i;
      i = (i + 48) | 0;
      y = +g[d >> 2];
      n = +g[b >> 2];
      x = +g[(d + 16) >> 2];
      l = +g[(b + 4) >> 2];
      w = +g[(d + 32) >> 2];
      j = +g[(b + 8) >> 2];
      v = +g[(d + 4) >> 2];
      u = +g[(d + 20) >> 2];
      t = +g[(d + 36) >> 2];
      k = +g[(d + 8) >> 2];
      m = +g[(d + 24) >> 2];
      o = +g[(d + 40) >> 2];
      q = +g[(b + 16) >> 2];
      p = +g[(b + 20) >> 2];
      h = +g[(b + 24) >> 2];
      s = +g[(b + 32) >> 2];
      r = +g[(b + 36) >> 2];
      f = +g[(b + 40) >> 2];
      g[e >> 2] = y * n + x * l + w * j;
      g[(e + 4) >> 2] = v * n + u * l + t * j;
      g[(e + 8) >> 2] = k * n + m * l + o * j;
      g[(e + 12) >> 2] = 0.0;
      g[(e + 16) >> 2] = y * q + x * p + w * h;
      g[(e + 20) >> 2] = v * q + u * p + t * h;
      g[(e + 24) >> 2] = k * q + m * p + o * h;
      g[(e + 28) >> 2] = 0.0;
      g[(e + 32) >> 2] = y * s + x * r + w * f;
      g[(e + 36) >> 2] = v * s + u * r + t * f;
      g[(e + 40) >> 2] = k * s + m * r + o * f;
      g[(e + 44) >> 2] = 0.0;
      o = +g[(d + 48) >> 2];
      m = +g[(d + 52) >> 2];
      k = +g[(d + 56) >> 2];
      f = o * s + m * r + k * f + +g[(b + 56) >> 2];
      h = o * q + m * p + k * h + +g[(b + 52) >> 2];
      j = o * n + m * l + k * j + +g[(b + 48) >> 2];
      c[a >> 2] = c[e >> 2];
      c[(a + 4) >> 2] = c[(e + 4) >> 2];
      c[(a + 8) >> 2] = c[(e + 8) >> 2];
      c[(a + 12) >> 2] = c[(e + 12) >> 2];
      c[(a + 16) >> 2] = c[(e + 16) >> 2];
      c[(a + 16 + 4) >> 2] = c[(e + 16 + 4) >> 2];
      c[(a + 16 + 8) >> 2] = c[(e + 16 + 8) >> 2];
      c[(a + 16 + 12) >> 2] = c[(e + 16 + 12) >> 2];
      c[(a + 32) >> 2] = c[(e + 32) >> 2];
      c[(a + 32 + 4) >> 2] = c[(e + 32 + 4) >> 2];
      c[(a + 32 + 8) >> 2] = c[(e + 32 + 8) >> 2];
      c[(a + 32 + 12) >> 2] = c[(e + 32 + 12) >> 2];
      g[(a + 48) >> 2] = j;
      g[(a + 52) >> 2] = h;
      g[(a + 56) >> 2] = f;
      g[(a + 60) >> 2] = 0.0;
      i = e;
      return;
    }
    function eh(a, b) {
      a = +a;
      b = +b;
      var d = 0,
        e = 0,
        f = 0,
        h = 0,
        i = 0,
        j = 0,
        l = 0,
        m = 0,
        n = 0,
        o = 0.0;
      m = ((g[k >> 2] = a), c[k >> 2] | 0);
      i = ((g[k >> 2] = b), c[k >> 2] | 0);
      a: do
        if (
          ((i << 1) | 0) != 0
            ? ((o = +N(+b)),
              !(
                (((g[k >> 2] = o), c[k >> 2] | 0) >>> 0 > 2139095040) |
                ((((m >>> 23) & 255) | 0) == 255)
              ))
            : 0
        ) {
          if ((m << 1) >>> 0 <= (i << 1) >>> 0)
            return +(((m << 1) | 0) == ((i << 1) | 0) ? a * 0.0 : a);
          if (!((m >>> 23) & 255)) {
            if (((m << 9) | 0) > -1) {
              d = 0;
              e = m << 9;
              do {
                d = (d + -1) | 0;
                e = e << 1;
              } while ((e | 0) > -1);
              e = d;
            } else e = 0;
            d = e;
            f = m << (1 - e);
          } else {
            d = (m >>> 23) & 255;
            f = (m & 8388607) | 8388608;
          }
          if (!((i >>> 23) & 255)) {
            if (((i << 9) | 0) > -1) {
              e = 0;
              h = i << 9;
              do {
                e = (e + -1) | 0;
                h = h << 1;
              } while ((h | 0) > -1);
            } else e = 0;
            j = e;
            l = i << (1 - e);
          } else {
            j = (i >>> 23) & 255;
            l = (i & 8388607) | 8388608;
          }
          h = (f - l) | 0;
          b: do
            if ((d | 0) > (j | 0)) {
              i = (h | 0) > -1;
              e = h;
              while (1) {
                if (i) {
                  if ((f | 0) == (l | 0)) break;
                } else e = f;
                f = e << 1;
                d = (d + -1) | 0;
                h = (f - l) | 0;
                if ((d | 0) > (j | 0)) {
                  i = (h | 0) > -1;
                  e = h;
                } else {
                  e = h;
                  h = (h | 0) > -1;
                  break b;
                }
              }
              b = a * 0.0;
              break a;
            } else {
              e = h;
              h = (h | 0) > -1;
            }
          while (0);
          if (h) {
            if ((f | 0) == (l | 0)) {
              b = a * 0.0;
              break;
            }
          } else e = f;
          if (e >>> 0 < 8388608)
            do {
              e = e << 1;
              d = (d + -1) | 0;
            } while (e >>> 0 < 8388608);
          if ((d | 0) > 0) d = (e + -8388608) | (d << 23);
          else d = e >>> ((1 - d) | 0);
          b = ((c[k >> 2] = d | (m & -2147483648)), +g[k >> 2]);
        } else n = 3;
      while (0);
      if ((n | 0) == 3) b = (a * b) / (a * b);
      return +b;
    }
    function fh(a, b, d, e, f) {
      a = a | 0;
      b = b | 0;
      d = d | 0;
      e = e | 0;
      f = f | 0;
      var h = 0,
        j = 0.0,
        k = 0.0,
        l = 0,
        m = 0,
        n = 0,
        o = 0.0,
        p = 0.0,
        q = 0;
      n = i;
      i = (i + 16) | 0;
      if (((f | 0) > -3) & (((f + 3) | 0) > -1)) {
        if (
          ((f + 3) | 0) != 0
            ? ((c[6435] = (c[6435] | 0) + 1),
              (h = yc(((((f + 3) << 4) | 3) + 16) | 0) | 0),
              (h | 0) != 0)
            : 0
        ) {
          c[(((h + 4 + 15) & -16) + -4) >> 2] = h;
          a = (h + 4 + 15) & -16;
        } else a = 0;
        h = 0;
        do {
          m = (a + (h << 4)) | 0;
          c[m >> 2] = c[n >> 2];
          c[(m + 4) >> 2] = c[(n + 4) >> 2];
          c[(m + 8) >> 2] = c[(n + 8) >> 2];
          c[(m + 12) >> 2] = c[(n + 12) >> 2];
          h = (h + 1) | 0;
        } while ((h | 0) != ((f + 3) | 0));
        m = a;
      } else m = 0;
      if ((f | 0) > -3) {
        h = m;
        l = 0;
        while (1) {
          if (!l) j = 0.0;
          else {
            a = l;
            k = 0.5;
            j = 0.0;
            while (1) {
              j = ((a & 1) | 0) == 0 ? j : j + k;
              a = a >> 1;
              if (!a) break;
              else k = k * 0.5;
            }
          }
          k = j * 2.0 + -1.0;
          o =
            (+((l << 1) | 0) * 3.1415927410125732 + 3.1415927410125732) /
            +((f + 3) | 0);
          p = +O(+(1.0 - k * k));
          j = p * +R(+o);
          g[h >> 2] = p * +Q(+o);
          g[(h + 4) >> 2] = j;
          g[(h + 8) >> 2] = k;
          g[(h + 12) >> 2] = 0.0;
          l = (l + 1) | 0;
          if ((l | 0) == ((f + 3) | 0)) break;
          else h = (h + 16) | 0;
        }
        a = 0;
        do {
          q = (m + (a << 4)) | 0;
          h = (m + (a << 4) + 4) | 0;
          l = (m + (a << 4) + 8) | 0;
          o = +g[h >> 2] * +g[(e + 4) >> 2] + +g[(d + 4) >> 2];
          p = +g[l >> 2] * +g[(e + 8) >> 2] + +g[(d + 8) >> 2];
          g[q >> 2] = +g[q >> 2] * +g[e >> 2] + +g[d >> 2];
          g[h >> 2] = o;
          g[l >> 2] = p;
          g[(m + (a << 4) + 12) >> 2] = 0.0;
          a = (a + 1) | 0;
        } while ((a | 0) < ((f + 3) | 0));
      }
      a = rc(b, m, (f + 3) | 0, 1) | 0;
      if (!m) {
        i = n;
        return a | 0;
      }
      c[6436] = (c[6436] | 0) + 1;
      hd(c[(m + -4) >> 2] | 0);
      i = n;
      return a | 0;
    }
    function gh(a, b, d, e, f, h, j) {
      a = a | 0;
      b = b | 0;
      d = d | 0;
      e = e | 0;
      f = f | 0;
      h = h | 0;
      j = j | 0;
      var l = 0.0,
        m = 0.0,
        n = 0,
        o = 0.0,
        p = 0.0,
        q = 0,
        r = 0,
        s = 0.0,
        t = 0;
      r = i;
      i = (i + 16) | 0;
      g[e >> 2] = 3402823466385288598117041.0e14;
      g[f >> 2] = -3402823466385288598117041.0e14;
      n = c[(a + 8) >> 2] | 0;
      if ((n | 0) > 0) {
        q = 0;
        do {
          t = c[(a + 16) >> 2] | 0;
          s = +g[(t + (q << 4)) >> 2];
          p = +g[(t + (q << 4) + 4) >> 2];
          o = +g[(t + (q << 4) + 8) >> 2];
          l =
            s * +g[b >> 2] +
            p * +g[(b + 4) >> 2] +
            o * +g[(b + 8) >> 2] +
            +g[(b + 48) >> 2];
          m =
            s * +g[(b + 16) >> 2] +
            p * +g[(b + 20) >> 2] +
            o * +g[(b + 24) >> 2] +
            +g[(b + 52) >> 2];
          o =
            s * +g[(b + 32) >> 2] +
            p * +g[(b + 36) >> 2] +
            o * +g[(b + 40) >> 2] +
            +g[(b + 56) >> 2];
          p = l * +g[d >> 2] + m * +g[(d + 4) >> 2] + o * +g[(d + 8) >> 2];
          if (p < +g[e >> 2]) {
            g[e >> 2] = p;
            g[h >> 2] = l;
            g[(h + 4) >> 2] = m;
            g[(h + 8) >> 2] = o;
            g[(h + 12) >> 2] = 0.0;
          }
          if (p > +g[f >> 2]) {
            g[f >> 2] = p;
            g[j >> 2] = l;
            g[(j + 4) >> 2] = m;
            g[(j + 8) >> 2] = o;
            g[(j + 12) >> 2] = 0.0;
          }
          q = (q + 1) | 0;
        } while ((q | 0) != (n | 0));
        s = +g[f >> 2];
        m = s;
        n = ((g[k >> 2] = s), c[k >> 2] | 0);
      } else {
        m = -3402823466385288598117041.0e14;
        n = -8388609;
      }
      l = +g[e >> 2];
      if (!(l > m)) {
        i = r;
        return;
      }
      c[e >> 2] = n;
      g[f >> 2] = l;
      c[r >> 2] = c[h >> 2];
      c[(r + 4) >> 2] = c[(h + 4) >> 2];
      c[(r + 8) >> 2] = c[(h + 8) >> 2];
      c[(r + 12) >> 2] = c[(h + 12) >> 2];
      c[h >> 2] = c[j >> 2];
      c[(h + 4) >> 2] = c[(j + 4) >> 2];
      c[(h + 8) >> 2] = c[(j + 8) >> 2];
      c[(h + 12) >> 2] = c[(j + 12) >> 2];
      c[j >> 2] = c[r >> 2];
      c[(j + 4) >> 2] = c[(r + 4) >> 2];
      c[(j + 8) >> 2] = c[(r + 8) >> 2];
      c[(j + 12) >> 2] = c[(r + 12) >> 2];
      i = r;
      return;
    }
    function hh(a, b) {
      a = a | 0;
      b = b | 0;
      var d = 0,
        e = 0,
        f = 0,
        h = 0.0,
        i = 0.0,
        j = 0.0,
        k = 0.0,
        l = 0.0,
        m = 0.0,
        n = 0.0,
        o = 0.0,
        p = 0.0,
        q = 0.0,
        r = 0.0,
        s = 0.0,
        t = 0.0,
        u = 0,
        v = 0,
        w = 0,
        x = 0,
        y = 0;
      if ((c[a >> 2] | 0) == (b | 0)) {
        c[a >> 2] = 0;
        a = 0;
        return a | 0;
      }
      e = c[(b + 32) >> 2] | 0;
      d = c[(e + 32) >> 2] | 0;
      b =
        c[(e + 36 + ((((c[(e + 40) >> 2] | 0) != (b | 0)) & 1) << 2)) >> 2] | 0;
      if (!d) {
        c[a >> 2] = b;
        c[(b + 32) >> 2] = 0;
        d = c[(a + 4) >> 2] | 0;
        if (!d) d = b;
        else {
          c[6436] = (c[6436] | 0) + 1;
          hd(c[(d + -4) >> 2] | 0);
          d = c[a >> 2] | 0;
        }
        c[(a + 4) >> 2] = e;
        a = d;
        return a | 0;
      }
      c[(d + 36 + ((((c[(d + 40) >> 2] | 0) == (e | 0)) & 1) << 2)) >> 2] = b;
      c[(b + 32) >> 2] = d;
      b = c[(a + 4) >> 2] | 0;
      if (b | 0) {
        c[6436] = (c[6436] | 0) + 1;
        hd(c[(b + -4) >> 2] | 0);
      }
      c[(a + 4) >> 2] = e;
      do {
        s = +g[d >> 2];
        x = (d + 4) | 0;
        q = +g[x >> 2];
        v = (d + 8) | 0;
        o = +g[v >> 2];
        y = (d + 16) | 0;
        m = +g[y >> 2];
        w = (d + 20) | 0;
        i = +g[w >> 2];
        e = (d + 24) | 0;
        k = +g[e >> 2];
        u = c[(d + 36) >> 2] | 0;
        b = c[(d + 40) >> 2] | 0;
        t = +g[u >> 2];
        r = +g[b >> 2];
        r = t < r ? t : r;
        g[d >> 2] = r;
        t = +g[(u + 16) >> 2];
        l = +g[(b + 16) >> 2];
        l = t > l ? t : l;
        g[y >> 2] = l;
        t = +g[(u + 4) >> 2];
        p = +g[(b + 4) >> 2];
        p = t < p ? t : p;
        g[x >> 2] = p;
        t = +g[(u + 20) >> 2];
        h = +g[(b + 20) >> 2];
        h = t > h ? t : h;
        g[w >> 2] = h;
        t = +g[(u + 8) >> 2];
        n = +g[(b + 8) >> 2];
        n = t < n ? t : n;
        g[v >> 2] = n;
        t = +g[(u + 24) >> 2];
        j = +g[(b + 24) >> 2];
        j = t > j ? t : j;
        g[e >> 2] = j;
        if (
          !((s != r) | (q != p) | (o != n) | (m != l))
            ? !((k != j) | (i != h))
            : 0
        ) {
          f = 14;
          break;
        }
        d = c[(d + 32) >> 2] | 0;
      } while ((d | 0) != 0);
      if ((f | 0) == 14) return d | 0;
      y = c[a >> 2] | 0;
      return y | 0;
    }
    function ih(a) {
      a = a | 0;
      var b = 0,
        d = 0,
        e = 0.0,
        f = 0.0,
        h = 0.0,
        i = 0,
        j = 0;
      i = c[(a + 28) >> 2] | 0;
      e = 0.0;
      f = 0.0;
      h = 0.0;
      j = 0;
      a: while (1) {
        switch (j | 0) {
          case 0: {
            e = +g[(a + 80) >> 2] + +g[(a + 64) >> 2];
            f = +g[(a + 84) >> 2] + +g[(a + 68) >> 2];
            h = +g[(a + 88) >> 2] + +g[(a + 72) >> 2];
            break;
          }
          case 1: {
            e = +g[(a + 80) >> 2] + +g[(a + 64) >> 2];
            f = +g[(a + 84) >> 2] + +g[(a + 68) >> 2];
            h = +g[(a + 72) >> 2] - +g[(a + 88) >> 2];
            break;
          }
          case 2: {
            e = +g[(a + 80) >> 2] + +g[(a + 64) >> 2];
            f = +g[(a + 68) >> 2] - +g[(a + 84) >> 2];
            h = +g[(a + 88) >> 2] + +g[(a + 72) >> 2];
            break;
          }
          case 3: {
            e = +g[(a + 80) >> 2] + +g[(a + 64) >> 2];
            f = +g[(a + 68) >> 2] - +g[(a + 84) >> 2];
            h = +g[(a + 72) >> 2] - +g[(a + 88) >> 2];
            break;
          }
          case 4: {
            e = +g[(a + 64) >> 2] - +g[(a + 80) >> 2];
            f = +g[(a + 84) >> 2] + +g[(a + 68) >> 2];
            h = +g[(a + 88) >> 2] + +g[(a + 72) >> 2];
            break;
          }
          case 5: {
            e = +g[(a + 64) >> 2] - +g[(a + 80) >> 2];
            f = +g[(a + 84) >> 2] + +g[(a + 68) >> 2];
            h = +g[(a + 72) >> 2] - +g[(a + 88) >> 2];
            break;
          }
          case 6: {
            e = +g[(a + 64) >> 2] - +g[(a + 80) >> 2];
            f = +g[(a + 68) >> 2] - +g[(a + 84) >> 2];
            h = +g[(a + 88) >> 2] + +g[(a + 72) >> 2];
            break;
          }
          case 7: {
            e = +g[(a + 64) >> 2] - +g[(a + 80) >> 2];
            f = +g[(a + 68) >> 2] - +g[(a + 84) >> 2];
            h = +g[(a + 72) >> 2] - +g[(a + 88) >> 2];
            break;
          }
          default: {
          }
        }
        if ((i | 0) > 0) {
          b = c[(a + 36) >> 2] | 0;
          d = 0;
          do {
            if (
              +g[(b + ((d * 36) | 0) + 32) >> 2] +
                (e * +g[(b + ((d * 36) | 0) + 20) >> 2] +
                  f * +g[(b + ((d * 36) | 0) + 24) >> 2] +
                  h * +g[(b + ((d * 36) | 0) + 28) >> 2]) >
              0.0
            ) {
              b = 0;
              d = 16;
              break a;
            }
            d = (d + 1) | 0;
          } while ((d | 0) < (i | 0));
        }
        j = (j + 1) | 0;
        if ((j | 0) >= 8) {
          b = 1;
          d = 16;
          break;
        }
      }
      if ((d | 0) == 16) return b | 0;
      return 0;
    }
    function jh(a, b, d, e, f) {
      a = a | 0;
      b = b | 0;
      d = d | 0;
      e = e | 0;
      f = +f;
      var h = 0,
        i = 0.0,
        j = 0,
        k = 0,
        l = 0.0,
        m = 0.0,
        n = 0.0,
        o = 0.0,
        p = 0.0,
        q = 0.0;
      o = +g[d >> 2];
      if (+g[b >> 2] <= o) {
        i = +g[(d + 4) >> 2];
        if (
          (((+g[(b + 4) >> 2] <= i
          ? +g[(b + 8) >> 2] <= +g[(d + 8) >> 2]
          : 0)
          ? +g[(b + 16) >> 2] >= +g[(d + 16) >> 2]
          : 0)
          ? +g[(b + 20) >> 2] >= +g[(d + 20) >> 2]
          : 0)
            ? +g[(b + 24) >> 2] >= +g[(d + 24) >> 2]
            : 0
        ) {
          d = 0;
          return d | 0;
        } else h = (d + 4) | 0;
      } else {
        h = (d + 4) | 0;
        i = +g[(d + 4) >> 2];
      }
      g[d >> 2] = o - f;
      m = i - f;
      g[h >> 2] = m;
      p = +g[(d + 8) >> 2] - f;
      g[(d + 8) >> 2] = p;
      i = +g[(d + 16) >> 2] + f;
      g[(d + 16) >> 2] = i;
      n = +g[(d + 20) >> 2] + f;
      g[(d + 20) >> 2] = n;
      q = +g[(d + 24) >> 2] + f;
      g[(d + 24) >> 2] = q;
      l = +g[e >> 2];
      if (l > 0.0) g[(d + 16) >> 2] = l + i;
      else g[d >> 2] = l + (o - f);
      i = +g[(e + 4) >> 2];
      if (i > 0.0) g[(d + 20) >> 2] = i + n;
      else g[h >> 2] = i + m;
      i = +g[(e + 8) >> 2];
      if (i > 0.0) g[(d + 24) >> 2] = i + q;
      else g[(d + 8) >> 2] = i + p;
      h = hh(a, b) | 0;
      a: do
        if (h) {
          j = c[(a + 8) >> 2] | 0;
          if ((j | 0) <= -1) {
            h = c[a >> 2] | 0;
            break;
          }
          if ((j | 0) > 0) {
            k = 0;
            while (1) {
              e = c[(h + 32) >> 2] | 0;
              k = (k + 1) | 0;
              if (!e) break a;
              if ((k | 0) >= (j | 0)) {
                h = e;
                break;
              } else h = e;
            }
          }
        } else h = 0;
      while (0);
      c[b >> 2] = c[d >> 2];
      c[(b + 4) >> 2] = c[(d + 4) >> 2];
      c[(b + 8) >> 2] = c[(d + 8) >> 2];
      c[(b + 12) >> 2] = c[(d + 12) >> 2];
      c[(b + 16) >> 2] = c[(d + 16) >> 2];
      c[(b + 20) >> 2] = c[(d + 20) >> 2];
      c[(b + 24) >> 2] = c[(d + 24) >> 2];
      c[(b + 28) >> 2] = c[(d + 28) >> 2];
      lf(a, h, b);
      d = 1;
      return d | 0;
    }
    function kh(a, d, e) {
      a = a | 0;
      d = d | 0;
      e = e | 0;
      si(a, d, e) | 0;
      c[(d + 52) >> 2] = c[(a + 48) >> 2];
      c[(d + 56) >> 2] = c[(a + 52) >> 2];
      c[(d + 60) >> 2] = c[(a + 56) >> 2];
      c[(d + 64) >> 2] = c[(a + 60) >> 2];
      c[(d + 68) >> 2] = c[(a + 64) >> 2];
      c[(d + 72) >> 2] = c[(a + 68) >> 2];
      c[(d + 76) >> 2] = c[(a + 72) >> 2];
      c[(d + 80) >> 2] = c[(a + 76) >> 2];
      c[(d + 84) >> 2] = c[(a + 80) >> 2];
      c[(d + 88) >> 2] = c[(a + 84) >> 2];
      c[(d + 92) >> 2] = c[(a + 88) >> 2];
      c[(d + 96) >> 2] = c[(a + 92) >> 2];
      c[(d + 100) >> 2] = c[(a + 96) >> 2];
      c[(d + 104) >> 2] = c[(a + 100) >> 2];
      c[(d + 108) >> 2] = c[(a + 104) >> 2];
      c[(d + 112) >> 2] = c[(a + 108) >> 2];
      c[(d + 116) >> 2] = c[(a + 112) >> 2];
      c[(d + 120) >> 2] = c[(a + 116) >> 2];
      c[(d + 124) >> 2] = c[(a + 120) >> 2];
      c[(d + 128) >> 2] = c[(a + 124) >> 2];
      c[(d + 132) >> 2] = c[(a + 128) >> 2];
      c[(d + 136) >> 2] = c[(a + 132) >> 2];
      c[(d + 140) >> 2] = c[(a + 136) >> 2];
      c[(d + 144) >> 2] = c[(a + 140) >> 2];
      c[(d + 148) >> 2] = c[(a + 144) >> 2];
      c[(d + 152) >> 2] = c[(a + 148) >> 2];
      c[(d + 156) >> 2] = c[(a + 152) >> 2];
      c[(d + 160) >> 2] = c[(a + 156) >> 2];
      c[(d + 164) >> 2] = c[(a + 160) >> 2];
      c[(d + 168) >> 2] = c[(a + 164) >> 2];
      c[(d + 172) >> 2] = c[(a + 168) >> 2];
      c[(d + 176) >> 2] = c[(a + 172) >> 2];
      c[(d + 228) >> 2] = c[(a + 868) >> 2];
      c[(d + 212) >> 2] = c[(a + 872) >> 2];
      c[(d + 196) >> 2] = c[(a + 680) >> 2];
      c[(d + 180) >> 2] = c[(a + 696) >> 2];
      c[(d + 232) >> 2] = c[(a + 932) >> 2];
      c[(d + 216) >> 2] = c[(a + 936) >> 2];
      c[(d + 200) >> 2] = c[(a + 684) >> 2];
      c[(d + 184) >> 2] = c[(a + 700) >> 2];
      c[(d + 236) >> 2] = c[(a + 996) >> 2];
      c[(d + 220) >> 2] = c[(a + 1e3) >> 2];
      c[(d + 204) >> 2] = c[(a + 688) >> 2];
      c[(d + 188) >> 2] = c[(a + 704) >> 2];
      a = b[(a + 1300) >> 1] | 0;
      c[(d + 244) >> 2] = a & 255;
      c[(d + 248) >> 2] = ((a & 65535) >>> 8) & 65535;
      return 12479;
    }
    function lh(b, d, e) {
      b = b | 0;
      d = d | 0;
      e = e | 0;
      var f = 0,
        g = 0,
        h = 0,
        j = 0,
        k = 0,
        l = 0,
        m = 0;
      m = i;
      i = (i + 32) | 0;
      h = (a[(b + 28) >> 0] | 0) != 0;
      l = h ? e : d;
      h = h ? d : e;
      j = c[(l + 4) >> 2] | 0;
      k = c[(j + 16) >> 2] | 0;
      g = c[(b + 12) >> 2] | 0;
      if ((g | 0) < (k | 0)) {
        if ((c[(b + 16) >> 2] | 0) < (k | 0)) {
          if (!k) {
            d = 0;
            e = g;
          } else {
            c[6435] = (c[6435] | 0) + 1;
            d = yc((((k << 2) | 3) + 16) | 0) | 0;
            if (!d) d = 0;
            else {
              c[(((d + 4 + 15) & -16) + -4) >> 2] = d;
              d = (d + 4 + 15) & -16;
            }
            e = c[(b + 12) >> 2] | 0;
          }
          if ((e | 0) > 0) {
            f = 0;
            do {
              c[(d + (f << 2)) >> 2] =
                c[((c[(b + 20) >> 2] | 0) + (f << 2)) >> 2];
              f = (f + 1) | 0;
            } while ((f | 0) != (e | 0));
          }
          e = c[(b + 20) >> 2] | 0;
          if (e | 0) {
            if (a[(b + 24) >> 0] | 0) {
              c[6436] = (c[6436] | 0) + 1;
              hd(c[(e + -4) >> 2] | 0);
            }
            c[(b + 20) >> 2] = 0;
          }
          a[(b + 24) >> 0] = 1;
          c[(b + 20) >> 2] = d;
          c[(b + 16) >> 2] = k;
          e = (b + 20) | 0;
        } else e = (b + 20) | 0;
        d = g;
        do {
          c[((c[e >> 2] | 0) + (d << 2)) >> 2] = 0;
          d = (d + 1) | 0;
        } while ((d | 0) != (k | 0));
      }
      c[(b + 12) >> 2] = k;
      if ((k | 0) <= 0) {
        i = m;
        return;
      }
      d = 0;
      do {
        if (!(c[(j + 64) >> 2] | 0)) {
          e = c[((c[(j + 24) >> 2] | 0) + ((d * 80) | 0) + 64) >> 2] | 0;
          f = c[(l + 8) >> 2] | 0;
          g = c[(l + 12) >> 2] | 0;
          c[m >> 2] = l;
          c[(m + 4) >> 2] = e;
          c[(m + 8) >> 2] = f;
          c[(m + 12) >> 2] = g;
          c[(m + 16) >> 2] = -1;
          c[(m + 20) >> 2] = d;
          g = c[(b + 4) >> 2] | 0;
          g =
            Ib[c[((c[g >> 2] | 0) + 8) >> 2] & 31](
              g,
              m,
              h,
              c[(b + 32) >> 2] | 0
            ) | 0;
          c[((c[(b + 20) >> 2] | 0) + (d << 2)) >> 2] = g;
        } else c[((c[(b + 20) >> 2] | 0) + (d << 2)) >> 2] = 0;
        d = (d + 1) | 0;
      } while ((d | 0) != (k | 0));
      i = m;
      return;
    }
    function mh() {
      var a = 0,
        b = 0,
        d = 0;
      c[6435] = (c[6435] | 0) + 1;
      a = yc(219) | 0;
      if (!a) a = 0;
      else {
        c[(((a + 4 + 15) & -16) + -4) >> 2] = a;
        a = (a + 4 + 15) & -16;
      }
      ml();
      ml();
      c[a >> 2] = 2896;
      b = (a + 52) | 0;
      d = (a + 4) | 0;
      c[d >> 2] = c[5710];
      c[(d + 4) >> 2] = c[5711];
      c[(d + 8) >> 2] = c[5712];
      c[(d + 12) >> 2] = c[5713];
      d = (a + 20) | 0;
      c[d >> 2] = c[5714];
      c[(d + 4) >> 2] = c[5715];
      c[(d + 8) >> 2] = c[5716];
      c[(d + 12) >> 2] = c[5717];
      d = (a + 36) | 0;
      c[d >> 2] = c[5718];
      c[(d + 4) >> 2] = c[5719];
      c[(d + 8) >> 2] = c[5720];
      c[(d + 12) >> 2] = c[5721];
      c[b >> 2] = c[5722];
      c[(b + 4) >> 2] = c[5723];
      c[(b + 8) >> 2] = c[5724];
      c[(b + 12) >> 2] = c[5725];
      b = (a + 116) | 0;
      d = (a + 68) | 0;
      c[d >> 2] = c[5710];
      c[(d + 4) >> 2] = c[5711];
      c[(d + 8) >> 2] = c[5712];
      c[(d + 12) >> 2] = c[5713];
      d = (a + 84) | 0;
      c[d >> 2] = c[5714];
      c[(d + 4) >> 2] = c[5715];
      c[(d + 8) >> 2] = c[5716];
      c[(d + 12) >> 2] = c[5717];
      d = (a + 100) | 0;
      c[d >> 2] = c[5718];
      c[(d + 4) >> 2] = c[5719];
      c[(d + 8) >> 2] = c[5720];
      c[(d + 12) >> 2] = c[5721];
      c[b >> 2] = c[5722];
      c[(b + 4) >> 2] = c[5723];
      c[(b + 8) >> 2] = c[5724];
      c[(b + 12) >> 2] = c[5725];
      b = (a + 180) | 0;
      d = (a + 132) | 0;
      c[d >> 2] = c[5710];
      c[(d + 4) >> 2] = c[5711];
      c[(d + 8) >> 2] = c[5712];
      c[(d + 12) >> 2] = c[5713];
      d = (a + 148) | 0;
      c[d >> 2] = c[5714];
      c[(d + 4) >> 2] = c[5715];
      c[(d + 8) >> 2] = c[5716];
      c[(d + 12) >> 2] = c[5717];
      d = (a + 164) | 0;
      c[d >> 2] = c[5718];
      c[(d + 4) >> 2] = c[5719];
      c[(d + 8) >> 2] = c[5720];
      c[(d + 12) >> 2] = c[5721];
      c[b >> 2] = c[5722];
      c[(b + 4) >> 2] = c[5723];
      c[(b + 8) >> 2] = c[5724];
      c[(b + 12) >> 2] = c[5725];
      c[(a + 196) >> 2] = 0;
      return a | 0;
    }
    function nh(b) {
      b = b | 0;
      var d = 0,
        e = 0,
        f = 0,
        g = 0,
        h = 0,
        i = 0,
        j = 0;
      d = c[(b + 32) >> 2] | 0;
      if (!d) f = 0;
      else f = c[(b + 40) >> 2] | 0;
      i = c[(b + 52) >> 2] | 0;
      if (!i) g = 0;
      else g = c[(b + 60) >> 2] | 0;
      e = c[(b + 72) >> 2] | 0;
      if (!e) h = 0;
      else h = c[(b + 80) >> 2] | 0;
      j = c[(b + 8) >> 2] | 0;
      +$b[c[((c[j >> 2] | 0) + 12) >> 2] & 3](
        j,
        f,
        d,
        g,
        i,
        h,
        e,
        c[(b + 4) >> 2] | 0,
        c[(b + 20) >> 2] | 0,
        c[(b + 24) >> 2] | 0
      );
      d = c[(b + 32) >> 2] | 0;
      if ((d | 0) < 0) {
        if ((c[(b + 36) >> 2] | 0) < 0) {
          e = c[(b + 40) >> 2] | 0;
          if (e | 0) {
            if (a[(b + 44) >> 0] | 0) {
              c[6436] = (c[6436] | 0) + 1;
              hd(c[(e + -4) >> 2] | 0);
            }
            c[(b + 40) >> 2] = 0;
          }
          a[(b + 44) >> 0] = 1;
          c[(b + 40) >> 2] = 0;
          c[(b + 36) >> 2] = 0;
        }
        do {
          c[((c[(b + 40) >> 2] | 0) + (d << 2)) >> 2] = 0;
          d = (d + 1) | 0;
        } while ((d | 0) != 0);
      }
      c[(b + 32) >> 2] = 0;
      d = c[(b + 52) >> 2] | 0;
      if ((d | 0) < 0) {
        if ((c[(b + 56) >> 2] | 0) < 0) {
          e = c[(b + 60) >> 2] | 0;
          if (e | 0) {
            if (a[(b + 64) >> 0] | 0) {
              c[6436] = (c[6436] | 0) + 1;
              hd(c[(e + -4) >> 2] | 0);
            }
            c[(b + 60) >> 2] = 0;
          }
          a[(b + 64) >> 0] = 1;
          c[(b + 60) >> 2] = 0;
          c[(b + 56) >> 2] = 0;
        }
        do {
          c[((c[(b + 60) >> 2] | 0) + (d << 2)) >> 2] = 0;
          d = (d + 1) | 0;
        } while ((d | 0) != 0);
      }
      c[(b + 52) >> 2] = 0;
      d = c[(b + 72) >> 2] | 0;
      if ((d | 0) >= 0) {
        c[(b + 72) >> 2] = 0;
        return;
      }
      if ((c[(b + 76) >> 2] | 0) < 0) {
        e = c[(b + 80) >> 2] | 0;
        if (e | 0) {
          if (a[(b + 84) >> 0] | 0) {
            c[6436] = (c[6436] | 0) + 1;
            hd(c[(e + -4) >> 2] | 0);
          }
          c[(b + 80) >> 2] = 0;
        }
        a[(b + 84) >> 0] = 1;
        c[(b + 80) >> 2] = 0;
        c[(b + 76) >> 2] = 0;
      }
      do {
        c[((c[(b + 80) >> 2] | 0) + (d << 2)) >> 2] = 0;
        d = (d + 1) | 0;
      } while ((d | 0) != 0);
      c[(b + 72) >> 2] = 0;
      return;
    }
    function oh(b, d, e) {
      b = b | 0;
      d = +d;
      e = e | 0;
      var f = 0.0,
        h = 0,
        i = 0,
        j = 0,
        k = 0,
        l = 0,
        m = 0,
        n = 0.0,
        o = 0.0,
        p = 0.0,
        q = 0.0,
        r = 0.0;
      j = c[(b + 712) >> 2] | 0;
      if (e) {
        if ((j | 0) > 0) {
          e = c[(b + 720) >> 2] | 0;
          h = 0;
          do {
            g[(e + ((h * 104) | 0) + 88) >> 2] = 0.0;
            h = (h + 1) | 0;
          } while ((h | 0) != (j | 0));
        }
        e = c[(b + 752) >> 2] | 0;
        if ((e | 0) > 0) {
          h = c[(b + 760) >> 2] | 0;
          i = 0;
          do {
            m = c[(h + ((i * 44) | 0) + 8) >> 2] | 0;
            l = c[(h + ((i * 44) | 0) + 12) >> 2] | 0;
            k = c[(h + ((i * 44) | 0) + 16) >> 2] | 0;
            o = +g[(m + 8) >> 2];
            q = +g[(m + 12) >> 2];
            f = +g[(m + 16) >> 2];
            n = +g[(l + 8) >> 2] - o;
            r = +g[(l + 12) >> 2] - q;
            p = +g[(l + 16) >> 2] - f;
            o = +g[(k + 8) >> 2] - o;
            q = +g[(k + 12) >> 2] - q;
            f = +g[(k + 16) >> 2] - f;
            f = +O(
              +(
                (n * q - r * o) * (n * q - r * o) +
                ((r * f - p * q) * (r * f - p * q) +
                  (p * o - n * f) * (p * o - n * f))
              )
            );
            g[(m + 88) >> 2] = f + +g[(m + 88) >> 2];
            g[(l + 88) >> 2] = f + +g[(l + 88) >> 2];
            g[(k + 88) >> 2] = f + +g[(k + 88) >> 2];
            i = (i + 1) | 0;
          } while ((i | 0) != (e | 0));
        }
        if ((j | 0) <= 0) {
          m = (b + 924) | 0;
          a[m >> 0] = 1;
          return;
        }
        e = c[(b + 720) >> 2] | 0;
        h = 0;
        do {
          m = (e + ((h * 104) | 0) + 88) | 0;
          g[m >> 2] = 1.0 / +g[m >> 2];
          h = (h + 1) | 0;
        } while ((h | 0) != (j | 0));
      }
      if ((j | 0) <= 0) {
        m = (b + 924) | 0;
        a[m >> 0] = 1;
        return;
      }
      i = c[(b + 720) >> 2] | 0;
      e = 0;
      f = 0.0;
      do {
        r = +g[(i + ((e * 104) | 0) + 88) >> 2];
        f = f + (r > 0.0 ? 1.0 / r : 0.0);
        e = (e + 1) | 0;
      } while ((e | 0) != (j | 0));
      f = (1.0 / f) * d;
      e = c[(b + 712) >> 2] | 0;
      h = 0;
      do {
        m = (i + ((h * 104) | 0) + 88) | 0;
        g[m >> 2] = +g[m >> 2] / f;
        h = (h + 1) | 0;
      } while ((h | 0) < (e | 0));
      m = (b + 924) | 0;
      a[m >> 0] = 1;
      return;
    }
    function ph(b) {
      b = b | 0;
      var d = 0,
        e = 0,
        f = 0,
        g = 0,
        h = 0,
        i = 0;
      c[6435] = (c[6435] | 0) + 1;
      d = yc(39) | 0;
      if (!d) i = 0;
      else {
        c[(((d + 4 + 15) & -16) + -4) >> 2] = d;
        i = (d + 4 + 15) & -16;
      }
      g = i;
      c[i >> 2] = 0;
      c[(i + 4) >> 2] = 0;
      c[(i + 8) >> 2] = 0;
      c[(i + 12) >> 2] = 0;
      c[(i + 16) >> 2] = 0;
      if ((c[(b + 872) >> 2] | 0) > 0) {
        h = c[c[(b + 880) >> 2] >> 2] | 0;
        c[i >> 2] = c[h >> 2];
        c[(i + 4) >> 2] = c[(h + 4) >> 2];
        c[(i + 8) >> 2] = c[(h + 8) >> 2];
        c[(i + 12) >> 2] = c[(h + 12) >> 2];
        c[(i + 16) >> 2] = c[(h + 16) >> 2];
      } else {
        c[i >> 2] = 0;
        c[(i + 4) >> 2] = 0;
        c[(i + 8) >> 2] = 0;
        c[(i + 12) >> 2] = 0;
        c[(i + 16) >> 2] = 0;
      }
      e = c[(b + 872) >> 2] | 0;
      if ((e | 0) != (c[(b + 876) >> 2] | 0)) {
        h = e;
        f = (b + 880) | 0;
        f = c[f >> 2] | 0;
        f = (f + (h << 2)) | 0;
        c[f >> 2] = g;
        h = (h + 1) | 0;
        c[(b + 872) >> 2] = h;
        return i | 0;
      }
      h = e | 0 ? e << 1 : 1;
      if ((e | 0) >= (h | 0)) {
        h = e;
        f = (b + 880) | 0;
        f = c[f >> 2] | 0;
        f = (f + (h << 2)) | 0;
        c[f >> 2] = g;
        h = (h + 1) | 0;
        c[(b + 872) >> 2] = h;
        return i | 0;
      }
      if (!h) d = 0;
      else {
        c[6435] = (c[6435] | 0) + 1;
        d = yc((((h << 2) | 3) + 16) | 0) | 0;
        if (!d) d = 0;
        else {
          c[(((d + 4 + 15) & -16) + -4) >> 2] = d;
          d = (d + 4 + 15) & -16;
        }
        e = c[(b + 872) >> 2] | 0;
      }
      if ((e | 0) > 0) {
        f = 0;
        do {
          c[(d + (f << 2)) >> 2] = c[((c[(b + 880) >> 2] | 0) + (f << 2)) >> 2];
          f = (f + 1) | 0;
        } while ((f | 0) != (e | 0));
      }
      f = c[(b + 880) >> 2] | 0;
      if (f) {
        if (a[(b + 884) >> 0] | 0) {
          c[6436] = (c[6436] | 0) + 1;
          hd(c[(f + -4) >> 2] | 0);
          e = c[(b + 872) >> 2] | 0;
        }
        c[(b + 880) >> 2] = 0;
      }
      a[(b + 884) >> 0] = 1;
      c[(b + 880) >> 2] = d;
      c[(b + 876) >> 2] = h;
      h = e;
      f = (b + 880) | 0;
      f = c[f >> 2] | 0;
      f = (f + (h << 2)) | 0;
      c[f >> 2] = g;
      h = (h + 1) | 0;
      c[(b + 872) >> 2] = h;
      return i | 0;
    }
    function qh(b, d, e, f, h, i) {
      b = b | 0;
      d = d | 0;
      e = e | 0;
      f = f | 0;
      h = h | 0;
      i = i | 0;
      var j = 0,
        k = 0,
        l = 0,
        m = 0,
        n = 0.0,
        o = 0.0,
        p = 0.0,
        q = 0.0;
      c[6435] = (c[6435] | 0) + 1;
      b =
        yc(
          ((h + 2) | 0) >>> 0 > 268435455 ? 18 : ((((h + 2) << 4) | 3) + 16) | 0
        ) | 0;
      if (!b) m = 0;
      else {
        c[(((b + 4 + 15) & -16) + -4) >> 2] = b;
        m = (b + 4 + 15) & -16;
      }
      j = ((h + 2) | 0) >>> 0 > 1073741823 ? -1 : (h + 2) << 2;
      j = (j | 0) == 0 ? 1 : j;
      while (1) {
        k = yc(j) | 0;
        if (k | 0) break;
        b = c[6564] | 0;
        c[6564] = b + 0;
        if (!b) {
          l = 7;
          break;
        }
        jc[b & 3]();
      }
      if ((l | 0) == 7) {
        h = Ya(4) | 0;
        c[h >> 2] = 9640;
        pb(h | 0, 2800, 251);
      }
      if ((h | 0) > -2) {
        b = 0;
        do {
          q = +(b | 0) / +((h + 1) | 0);
          p = +g[e >> 2];
          o = +g[(e + 4) >> 2];
          o = o + q * (+g[(f + 4) >> 2] - o);
          n = +g[(e + 8) >> 2];
          n = n + q * (+g[(f + 8) >> 2] - n);
          g[(m + (b << 4)) >> 2] = p + q * (+g[f >> 2] - p);
          g[(m + (b << 4) + 4) >> 2] = o;
          g[(m + (b << 4) + 8) >> 2] = n;
          g[(m + (b << 4) + 12) >> 2] = 0.0;
          g[(k + (b << 2)) >> 2] = 1.0;
          b = (b + 1) | 0;
        } while ((b | 0) < ((h + 2) | 0));
      }
      c[6435] = (c[6435] | 0) + 1;
      b = yc(1271) | 0;
      if (!b) j = 0;
      else {
        c[(((b + 4 + 15) & -16) + -4) >> 2] = b;
        j = (b + 4 + 15) & -16;
      }
      Kc(j, d, (h + 2) | 0, m, k);
      if ((i & 1) | 0) {
        g[((c[(j + 720) >> 2] | 0) + 88) >> 2] = 0.0;
        a[(j + 924) >> 0] = 1;
      }
      if ((i & 2) | 0) {
        g[
          ((c[(j + 720) >> 2] | 0) + ((((h + 1) | 0) * 104) | 0) + 88) >> 2
        ] = 0.0;
        a[(j + 924) >> 0] = 1;
      }
      if (m | 0) {
        c[6436] = (c[6436] | 0) + 1;
        hd(c[(m + -4) >> 2] | 0);
      }
      hd(k);
      if (((h + 2) | 0) > 1) b = 1;
      else return j | 0;
      do {
        Rf(j, (b + -1) | 0, b, 0, 0);
        b = (b + 1) | 0;
      } while ((b | 0) != ((h + 2) | 0));
      return j | 0;
    }
    function rh(a, b, d, e, f, h) {
      a = a | 0;
      b = b | 0;
      d = d | 0;
      e = e | 0;
      f = f | 0;
      h = h | 0;
      var i = 0,
        j = 0,
        l = 0,
        m = 0.0,
        n = 0,
        o = 0,
        p = 0.0,
        q = 0.0;
      mc[c[((c[a >> 2] | 0) + 8) >> 2] & 127](a, b, f, h);
      l = c[h >> 2] | 0;
      o = c[(h + 4) >> 2] | 0;
      i = c[(h + 8) >> 2] | 0;
      n = c[f >> 2] | 0;
      j = c[(f + 4) >> 2] | 0;
      b = c[(f + 8) >> 2] | 0;
      m = +g[d >> 2];
      p = +g[(d + 4) >> 2];
      q = +g[(d + 8) >> 2];
      if (m > 0.0)
        l = ((g[k >> 2] = ((c[k >> 2] = l), +g[k >> 2]) + m), c[k >> 2] | 0);
      else n = ((g[k >> 2] = ((c[k >> 2] = n), +g[k >> 2]) + m), c[k >> 2] | 0);
      if (p > 0.0)
        d = ((g[k >> 2] = ((c[k >> 2] = o), +g[k >> 2]) + p), c[k >> 2] | 0);
      else {
        d = o;
        j = ((g[k >> 2] = ((c[k >> 2] = j), +g[k >> 2]) + p), c[k >> 2] | 0);
      }
      if (q > 0.0)
        i = ((g[k >> 2] = ((c[k >> 2] = i), +g[k >> 2]) + q), c[k >> 2] | 0);
      else b = ((g[k >> 2] = ((c[k >> 2] = b), +g[k >> 2]) + q), c[k >> 2] | 0);
      m = +g[e >> 2];
      p = +g[(e + 4) >> 2];
      q = +g[(e + 8) >> 2];
      q = +O(+(m * m + p * p + q * q));
      q = q * +Sb[c[((c[a >> 2] | 0) + 16) >> 2] & 15](a);
      c[f >> 2] = n;
      c[(f + 4) >> 2] = j;
      c[(f + 8) >> 2] = b;
      g[(f + 12) >> 2] = 0.0;
      c[h >> 2] = l;
      c[(h + 4) >> 2] = d;
      c[(h + 8) >> 2] = i;
      g[(h + 12) >> 2] = 0.0;
      g[f >> 2] = +g[f >> 2] - q;
      g[(f + 4) >> 2] = +g[(f + 4) >> 2] - q;
      g[(f + 8) >> 2] = +g[(f + 8) >> 2] - q;
      g[h >> 2] = q + +g[h >> 2];
      g[(h + 4) >> 2] = q + +g[(h + 4) >> 2];
      g[(h + 8) >> 2] = q + +g[(h + 8) >> 2];
      return;
    }
    function sh(b, d) {
      b = b | 0;
      d = d | 0;
      var e = 0,
        f = 0,
        g = 0,
        h = 0,
        j = 0,
        k = 0,
        l = 0,
        m = 0,
        n = 0;
      n = i;
      i = (i + 112) | 0;
      m = c[(d + 4) >> 2] | 0;
      k = n;
      l = (k + 100) | 0;
      do {
        c[k >> 2] = 0;
        k = (k + 4) | 0;
      } while ((k | 0) < (l | 0));
      h = c[(b + 712) >> 2] | 0;
      a: do
        if ((h | 0) > (m | 0)) e = (b + 720) | 0;
        else {
          if ((h | 0) < (m | 0) ? (c[(b + 716) >> 2] | 0) < (m | 0) : 0) {
            if (
              (m | 0) != 0
                ? ((c[6435] = (c[6435] | 0) + 1),
                  (e = yc((((m * 104) | 3) + 16) | 0) | 0),
                  (e | 0) != 0)
                : 0
            ) {
              c[(((e + 4 + 15) & -16) + -4) >> 2] = e;
              g = (e + 4 + 15) & -16;
            } else g = 0;
            e = c[(b + 712) >> 2] | 0;
            f = 0;
            while (1) {
              if ((f | 0) >= (e | 0)) break;
              k = (g + ((f * 104) | 0)) | 0;
              j = ((c[(b + 720) >> 2] | 0) + ((f * 104) | 0)) | 0;
              l = (k + 104) | 0;
              do {
                c[k >> 2] = c[j >> 2];
                k = (k + 4) | 0;
                j = (j + 4) | 0;
              } while ((k | 0) < (l | 0));
              f = (f + 1) | 0;
            }
            e = c[(b + 720) >> 2] | 0;
            if (e | 0) {
              if (!(((a[(b + 724) >> 0] & 1) == 0) | ((e | 0) == 0))) {
                c[6436] = (c[6436] | 0) + 1;
                hd(c[(e + -4) >> 2] | 0);
              }
              c[(b + 720) >> 2] = 0;
            }
            a[(b + 724) >> 0] = 1;
            c[(b + 720) >> 2] = g;
            c[(b + 716) >> 2] = m;
          }
          e = h;
          while (1) {
            if ((e | 0) >= (m | 0)) {
              e = (b + 720) | 0;
              break a;
            }
            k = c[(b + 720) >> 2] | 0;
            c[(k + ((e * 104) | 0)) >> 2] = 0;
            k = (k + ((e * 104) | 0) + 4) | 0;
            j = n;
            l = (k + 100) | 0;
            do {
              c[k >> 2] = c[j >> 2];
              k = (k + 4) | 0;
              j = (j + 4) | 0;
            } while ((k | 0) < (l | 0));
            e = (e + 1) | 0;
          }
        }
      while (0);
      c[(b + 712) >> 2] = m;
      e = c[e >> 2] | 0;
      f = 0;
      while (1) {
        if ((f | 0) >= (m | 0)) break;
        k = (e + ((f * 104) | 0)) | 0;
        j = ((c[(d + 12) >> 2] | 0) + ((f * 104) | 0)) | 0;
        l = (k + 104) | 0;
        do {
          c[k >> 2] = c[j >> 2];
          k = (k + 4) | 0;
          j = (j + 4) | 0;
        } while ((k | 0) < (l | 0));
        f = (f + 1) | 0;
      }
      i = n;
      return;
    }
    function th(b, d) {
      b = b | 0;
      d = d | 0;
      var e = 0,
        f = 0,
        g = 0,
        h = 0,
        i = 0,
        j = 0,
        k = 0;
      e = c[(b + 4) >> 2] | 0;
      if ((e | 0) == (c[(b + 8) >> 2] | 0)) {
        If(b, e | 0 ? e << 1 : 1);
        e = c[(b + 4) >> 2] | 0;
      }
      j = ((c[(b + 12) >> 2] | 0) + ((e * 36) | 0)) | 0;
      a[(j + 16) >> 0] = 1;
      c[(j + 12) >> 2] = 0;
      c[(j + 4) >> 2] = 0;
      c[(j + 8) >> 2] = 0;
      k = c[(d + 4) >> 2] | 0;
      if ((k | 0) <= 0) {
        c[(j + 4) >> 2] = k;
        k = (j + 20) | 0;
        d = (d + 20) | 0;
        c[k >> 2] = c[d >> 2];
        c[(k + 4) >> 2] = c[(d + 4) >> 2];
        c[(k + 8) >> 2] = c[(d + 8) >> 2];
        c[(k + 12) >> 2] = c[(d + 12) >> 2];
        d = c[(b + 4) >> 2] | 0;
        d = (d + 1) | 0;
        c[(b + 4) >> 2] = d;
        return;
      }
      c[6435] = (c[6435] | 0) + 1;
      e = yc((((k << 2) | 3) + 16) | 0) | 0;
      if (!e) h = 0;
      else {
        c[(((e + 4 + 15) & -16) + -4) >> 2] = e;
        h = (e + 4 + 15) & -16;
      }
      g = c[(j + 4) >> 2] | 0;
      f = c[(j + 12) >> 2] | 0;
      if ((g | 0) <= 0)
        if (!f) {
          a[(j + 16) >> 0] = 1;
          c[(j + 12) >> 2] = h;
          c[(j + 8) >> 2] = k;
          Qn(h | 0, 0, (k << 2) | 0) | 0;
        } else i = 11;
      else {
        e = 0;
        do {
          c[(h + (e << 2)) >> 2] = c[(f + (e << 2)) >> 2];
          e = (e + 1) | 0;
        } while ((e | 0) != (g | 0));
        i = 11;
      }
      if ((i | 0) == 11) {
        if (a[(j + 16) >> 0] | 0) {
          c[6436] = (c[6436] | 0) + 1;
          hd(c[(f + -4) >> 2] | 0);
        }
        a[(j + 16) >> 0] = 1;
        c[(j + 12) >> 2] = h;
        c[(j + 8) >> 2] = k;
        Qn(h | 0, 0, (k << 2) | 0) | 0;
      }
      e = c[(j + 12) >> 2] | 0;
      c[(j + 4) >> 2] = k;
      f = c[(d + 12) >> 2] | 0;
      g = 0;
      do {
        c[(e + (g << 2)) >> 2] = c[(f + (g << 2)) >> 2];
        g = (g + 1) | 0;
      } while ((g | 0) != (k | 0));
      k = (j + 20) | 0;
      d = (d + 20) | 0;
      c[k >> 2] = c[d >> 2];
      c[(k + 4) >> 2] = c[(d + 4) >> 2];
      c[(k + 8) >> 2] = c[(d + 8) >> 2];
      c[(k + 12) >> 2] = c[(d + 12) >> 2];
      d = c[(b + 4) >> 2] | 0;
      d = (d + 1) | 0;
      c[(b + 4) >> 2] = d;
      return;
    }
    function uh(a, d, f, g) {
      a = a | 0;
      d = d | 0;
      f = f | 0;
      g = g | 0;
      var h = 0,
        i = 0,
        j = 0,
        k = 0,
        l = 0,
        m = 0,
        n = 0,
        o = 0;
      i = c[(a + 68 + (d << 2)) >> 2] | 0;
      h = b[(i + ((f & 65535) << 2) + -4) >> 1] | 0;
      if ((e[(i + ((f & 65535) << 2)) >> 1] | 0) >= (h & 65535)) return;
      k = c[(a + 60) >> 2] | 0;
      l =
        (k +
          ((e[(i + ((f & 65535) << 2) + 2) >> 1] | 0) << 6) +
          54 +
          (d << 1)) |
        0;
      j = (i + ((f & 65535) << 2)) | 0;
      f = (i + ((f & 65535) << 2) + -4) | 0;
      while (1) {
        i = e[(j + -2) >> 1] | 0;
        if (!(h & 1)) {
          h = e[(j + 2) >> 1] | 0;
          if (
            ((((e[(k + (h << 6) + 54 + (((1 << d) & 3) << 1)) >> 1] | 0) >=
            (e[(k + (i << 6) + 48 + (((1 << d) & 3) << 1)) >> 1] | 0)
            ? (e[(k + (i << 6) + 54 + (((1 << d) & 3) << 1)) >> 1] | 0) >=
              (e[(k + (h << 6) + 48 + (((1 << d) & 3) << 1)) >> 1] | 0)
            : 0)
            ? (e[
                (k + (h << 6) + 54 + (((1 << ((1 << d) & 3)) & 3) << 1)) >> 1
              ] |
                0) >=
              (e[
                (k + (i << 6) + 48 + (((1 << ((1 << d) & 3)) & 3) << 1)) >> 1
              ] |
                0)
            : 0)
            ? (e[
                (k + (i << 6) + 54 + (((1 << ((1 << d) & 3)) & 3) << 1)) >> 1
              ] |
                0) >=
              (e[
                (k + (h << 6) + 48 + (((1 << ((1 << d) & 3)) & 3) << 1)) >> 1
              ] |
                0)
            : 0)
              ? ((o = c[(a + 92) >> 2] | 0),
                (m = (k + (h << 6)) | 0),
                (n = (k + (i << 6)) | 0),
                Ib[c[((c[o >> 2] | 0) + 12) >> 2] & 31](o, m, n, g) | 0,
                (o = c[(a + 96) >> 2] | 0),
                o | 0)
              : 0
          )
            Ib[c[((c[o >> 2] | 0) + 12) >> 2] & 31](o, m, n, g) | 0;
          k = (k + (i << 6) + 48 + (d << 1)) | 0;
          b[k >> 1] = (((b[k >> 1] | 0) + 1) << 16) >> 16;
        } else {
          k = (k + (i << 6) + 54 + (d << 1)) | 0;
          b[k >> 1] = (((b[k >> 1] | 0) + 1) << 16) >> 16;
        }
        b[l >> 1] = (((b[l >> 1] | 0) + -1) << 16) >> 16;
        i = e[j >> 1] | (e[(j + 2) >> 1] << 16);
        h = e[f >> 1] | (e[(f + 2) >> 1] << 16);
        b[j >> 1] = h;
        b[(j + 2) >> 1] = h >>> 16;
        b[f >> 1] = i;
        b[(f + 2) >> 1] = i >>> 16;
        i = (j + -4) | 0;
        f = (f + -4) | 0;
        h = b[f >> 1] | 0;
        if ((e[i >> 1] | 0) >= (h & 65535)) break;
        k = c[(a + 60) >> 2] | 0;
        j = i;
      }
      return;
    }
    function vh(a, b, d) {
      a = a | 0;
      b = b | 0;
      d = d | 0;
      var e = 0,
        f = 0,
        g = 0,
        h = 0,
        j = 0,
        k = 0;
      k = i;
      i = (i + 48) | 0;
      g = c[(a + 28) >> 2] | 0;
      c[(k + 32) >> 2] = g;
      g = ((c[(a + 20) >> 2] | 0) - g) | 0;
      c[(k + 32 + 4) >> 2] = g;
      c[(k + 32 + 8) >> 2] = b;
      c[(k + 32 + 12) >> 2] = d;
      j = (k + 32) | 0;
      f = 2;
      g = (g + d) | 0;
      while (1) {
        if (!0) {
          c[(k + 16) >> 2] = c[(a + 60) >> 2];
          c[(k + 16 + 4) >> 2] = j;
          c[(k + 16 + 8) >> 2] = f;
          b = wb(146, (k + 16) | 0) | 0;
          if (b >>> 0 > 4294963200) {
            if (!0) e = 25748;
            else e = c[((ib() | 0) + 64) >> 2] | 0;
            c[e >> 2] = 0 - b;
            b = -1;
          }
        } else {
          rb(254, a | 0);
          c[k >> 2] = c[(a + 60) >> 2];
          c[(k + 4) >> 2] = j;
          c[(k + 8) >> 2] = f;
          b = wb(146, k | 0) | 0;
          if (b >>> 0 > 4294963200) {
            if (!0) e = 25748;
            else e = c[((ib() | 0) + 64) >> 2] | 0;
            c[e >> 2] = 0 - b;
            b = -1;
          }
          Ua(0);
        }
        if ((g | 0) == (b | 0)) {
          b = 13;
          break;
        }
        if ((b | 0) < 0) {
          b = 15;
          break;
        }
        g = (g - b) | 0;
        e = c[(j + 4) >> 2] | 0;
        if (b >>> 0 <= e >>> 0)
          if ((f | 0) == 2) {
            c[(a + 28) >> 2] = (c[(a + 28) >> 2] | 0) + b;
            h = e;
            e = j;
            f = 2;
          } else {
            h = e;
            e = j;
          }
        else {
          h = c[(a + 44) >> 2] | 0;
          c[(a + 28) >> 2] = h;
          c[(a + 20) >> 2] = h;
          h = c[(j + 12) >> 2] | 0;
          b = (b - e) | 0;
          e = (j + 8) | 0;
          f = (f + -1) | 0;
        }
        c[e >> 2] = (c[e >> 2] | 0) + b;
        c[(e + 4) >> 2] = h - b;
        j = e;
      }
      if ((b | 0) == 13) {
        j = c[(a + 44) >> 2] | 0;
        c[(a + 16) >> 2] = j + (c[(a + 48) >> 2] | 0);
        c[(a + 28) >> 2] = j;
        c[(a + 20) >> 2] = j;
      } else if ((b | 0) == 15) {
        c[(a + 16) >> 2] = 0;
        c[(a + 28) >> 2] = 0;
        c[(a + 20) >> 2] = 0;
        c[a >> 2] = c[a >> 2] | 32;
        if ((f | 0) == 2) d = 0;
        else d = (d - (c[(j + 4) >> 2] | 0)) | 0;
      }
      i = k;
      return d | 0;
    }
    function wh(a, d, f) {
      a = a | 0;
      d = d | 0;
      f = f | 0;
      var g = 0,
        h = 0,
        i = 0,
        j = 0,
        k = 0,
        l = 0,
        m = 0,
        n = 0;
      h = c[(a + 68 + (d << 2)) >> 2] | 0;
      m = c[(a + 60) >> 2] | 0;
      n = e[(h + ((f & 65535) << 2) + 2) >> 1] | 0;
      g = b[(h + ((f & 65535) << 2) + -4) >> 1] | 0;
      if ((e[(h + ((f & 65535) << 2)) >> 1] | 0) >= (g & 65535)) return;
      j = m;
      i = (h + ((f & 65535) << 2)) | 0;
      f = (h + ((f & 65535) << 2) + -4) | 0;
      while (1) {
        h = e[(i + -2) >> 1] | 0;
        if (!(g & 1)) {
          j = (j + (h << 6) + 48 + (d << 1)) | 0;
          b[j >> 1] = (((b[j >> 1] | 0) + 1) << 16) >> 16;
        } else {
          if (
            ((((e[(m + (n << 6) + 54 + (((1 << d) & 3) << 1)) >> 1] | 0) >=
            (e[(j + (h << 6) + 48 + (((1 << d) & 3) << 1)) >> 1] | 0)
            ? (e[(j + (h << 6) + 54 + (((1 << d) & 3) << 1)) >> 1] | 0) >=
              (e[(m + (n << 6) + 48 + (((1 << d) & 3) << 1)) >> 1] | 0)
            : 0)
            ? (e[
                (m + (n << 6) + 54 + (((1 << ((1 << d) & 3)) & 3) << 1)) >> 1
              ] |
                0) >=
              (e[
                (j + (h << 6) + 48 + (((1 << ((1 << d) & 3)) & 3) << 1)) >> 1
              ] |
                0)
            : 0)
            ? (e[
                (j + (h << 6) + 54 + (((1 << ((1 << d) & 3)) & 3) << 1)) >> 1
              ] |
                0) >=
              (e[
                (m + (n << 6) + 48 + (((1 << ((1 << d) & 3)) & 3) << 1)) >> 1
              ] |
                0)
            : 0)
              ? ((l = c[(a + 92) >> 2] | 0),
                (k = (j + (h << 6)) | 0),
                Ob[c[((c[l >> 2] | 0) + 8) >> 2] & 63](
                  l,
                  (m + (n << 6)) | 0,
                  k
                ) | 0,
                (l = c[(a + 96) >> 2] | 0),
                l | 0)
              : 0
          )
            Ob[c[((c[l >> 2] | 0) + 8) >> 2] & 63](l, (m + (n << 6)) | 0, k) |
              0;
          j = (j + (h << 6) + 54 + (d << 1)) | 0;
          b[j >> 1] = (((b[j >> 1] | 0) + 1) << 16) >> 16;
        }
        b[(m + (n << 6) + 48 + (d << 1)) >> 1] =
          (((b[(m + (n << 6) + 48 + (d << 1)) >> 1] | 0) + -1) << 16) >> 16;
        h = e[i >> 1] | (e[(i + 2) >> 1] << 16);
        g = e[f >> 1] | (e[(f + 2) >> 1] << 16);
        b[i >> 1] = g;
        b[(i + 2) >> 1] = g >>> 16;
        b[f >> 1] = h;
        b[(f + 2) >> 1] = h >>> 16;
        h = (i + -4) | 0;
        f = (f + -4) | 0;
        g = b[f >> 1] | 0;
        if ((e[h >> 1] | 0) >= (g & 65535)) break;
        j = c[(a + 60) >> 2] | 0;
        i = h;
      }
      return;
    }
    function xh(a, b, d, e, f, h, j, k, l, m) {
      a = a | 0;
      b = b | 0;
      d = d | 0;
      e = e | 0;
      f = f | 0;
      h = h | 0;
      j = j | 0;
      k = k | 0;
      l = l | 0;
      m = m | 0;
      var n = 0.0,
        o = 0.0;
      m = i;
      i = (i + 80) | 0;
      o = +g[(h + 52) >> 2] - +g[(f + 52) >> 2];
      n = +g[(h + 56) >> 2] - +g[(f + 56) >> 2];
      g[(m + 56) >> 2] = +g[(h + 48) >> 2] - +g[(f + 48) >> 2];
      g[(m + 56 + 4) >> 2] = o;
      g[(m + 56 + 8) >> 2] = n;
      g[(m + 56 + 12) >> 2] = 0.0;
      if (Pc(d, f, e, h, (m + 56) | 0, m, 1) | 0) {
        c[k >> 2] = c[(m + 4) >> 2];
        c[(k + 4) >> 2] = c[(m + 4 + 4) >> 2];
        c[(k + 8) >> 2] = c[(m + 4 + 8) >> 2];
        c[(k + 12) >> 2] = c[(m + 4 + 12) >> 2];
        c[l >> 2] = c[(m + 20) >> 2];
        c[(l + 4) >> 2] = c[(m + 20 + 4) >> 2];
        c[(l + 8) >> 2] = c[(m + 20 + 8) >> 2];
        c[(l + 12) >> 2] = c[(m + 20 + 12) >> 2];
        c[j >> 2] = c[(m + 36) >> 2];
        c[(j + 4) >> 2] = c[(m + 36 + 4) >> 2];
        c[(j + 8) >> 2] = c[(m + 36 + 8) >> 2];
        c[(j + 12) >> 2] = c[(m + 36 + 12) >> 2];
        l = 1;
        i = m;
        return l | 0;
      }
      if (!(Jd(d, f, e, h, (m + 56) | 0, m) | 0)) {
        l = 0;
        i = m;
        return l | 0;
      }
      c[k >> 2] = c[(m + 4) >> 2];
      c[(k + 4) >> 2] = c[(m + 4 + 4) >> 2];
      c[(k + 8) >> 2] = c[(m + 4 + 8) >> 2];
      c[(k + 12) >> 2] = c[(m + 4 + 12) >> 2];
      c[l >> 2] = c[(m + 20) >> 2];
      c[(l + 4) >> 2] = c[(m + 20 + 4) >> 2];
      c[(l + 8) >> 2] = c[(m + 20 + 8) >> 2];
      c[(l + 12) >> 2] = c[(m + 20 + 12) >> 2];
      c[j >> 2] = c[(m + 36) >> 2];
      c[(j + 4) >> 2] = c[(m + 36 + 4) >> 2];
      c[(j + 8) >> 2] = c[(m + 36 + 8) >> 2];
      c[(j + 12) >> 2] = c[(m + 36 + 12) >> 2];
      l = 0;
      i = m;
      return l | 0;
    }
    function yh(a, b, d) {
      a = a | 0;
      b = b | 0;
      d = d | 0;
      var e = 0.0,
        f = 0.0,
        h = 0.0,
        j = 0,
        k = 0,
        l = 0,
        m = 0.0,
        n = 0.0,
        o = 0,
        p = 0,
        q = 0.0,
        r = 0;
      p = i;
      i = (i + 2048) | 0;
      c[a >> 2] = 0;
      c[(a + 4) >> 2] = 0;
      c[(a + 8) >> 2] = 0;
      c[(a + 12) >> 2] = 0;
      e = +g[d >> 2];
      h = +g[(d + 4) >> 2];
      f = +g[(d + 8) >> 2];
      if (e * e + h * h + f * f < 9.999999747378752e-5) {
        n = 1.0;
        m = 0.0;
        h = 0.0;
      } else {
        q = 1.0 / +O(+(e * e + h * h + f * f));
        n = e * q;
        m = f * q;
        h = h * q;
      }
      if ((Eb[c[((c[b >> 2] | 0) + 96) >> 2] & 127](b) | 0) <= 0) {
        i = p;
        return;
      }
      l = 0;
      f = -999999984306749440.0;
      while (1) {
        if (
          (((Eb[c[((c[b >> 2] | 0) + 96) >> 2] & 127](b) | 0) - l) | 0) <
          128
        ) {
          d = ((Eb[c[((c[b >> 2] | 0) + 96) >> 2] & 127](b) | 0) - l) | 0;
          if ((d | 0) > 0) o = 8;
          else {
            e = -3402823466385288598117041.0e14;
            d = -1;
          }
        } else {
          d = 128;
          o = 8;
        }
        if ((o | 0) == 8) {
          o = 0;
          j = 0;
          do {
            ic[c[((c[b >> 2] | 0) + 108) >> 2] & 127](b, j, (p + (j << 4)) | 0);
            j = (j + 1) | 0;
          } while ((j | 0) != (d | 0));
          k = 0;
          e = -3402823466385288598117041.0e14;
          j = -1;
          do {
            q =
              n * +g[(p + (k << 4)) >> 2] +
              h * +g[(p + (k << 4) + 4) >> 2] +
              m * +g[(p + (k << 4) + 8) >> 2];
            r = q > e;
            j = r ? k : j;
            e = r ? q : e;
            k = (k + 1) | 0;
          } while ((k | 0) != (d | 0));
          d = j;
        }
        if (e > f) {
          r = (p + (d << 4)) | 0;
          c[a >> 2] = c[r >> 2];
          c[(a + 4) >> 2] = c[(r + 4) >> 2];
          c[(a + 8) >> 2] = c[(r + 8) >> 2];
          c[(a + 12) >> 2] = c[(r + 12) >> 2];
        } else e = f;
        l = (l + 128) | 0;
        if ((l | 0) >= (Eb[c[((c[b >> 2] | 0) + 96) >> 2] & 127](b) | 0)) break;
        else f = e;
      }
      i = p;
      return;
    }
    function zh(b, e, f, h, i, j) {
      b = b | 0;
      e = e | 0;
      f = f | 0;
      h = h | 0;
      i = i | 0;
      j = j | 0;
      var k = 0;
      if ((d[(h + 55) >> 0] | 0 | 0) == (e | 0)) {
        h = 0;
        return h | 0;
      }
      k = c[(4976 + (i << 2)) >> 2] | 0;
      if (
        +g[h >> 2] * +g[(f + 16) >> 2] +
          +g[(h + 4) >> 2] * +g[(f + 20) >> 2] +
          +g[(h + 8) >> 2] * +g[(f + 24) >> 2] -
          +g[(h + 16) >> 2] <
        -9.999999747378752e-6
      ) {
        k =
          nf(
            b,
            c[(h + 20 + (k << 2)) >> 2] | 0,
            c[(h + 20 + (i << 2)) >> 2] | 0,
            f,
            0
          ) | 0;
        if (!k) {
          h = 0;
          return h | 0;
        }
        a[(k + 52) >> 0] = i;
        c[(k + 32) >> 2] = h;
        a[(h + 52 + i) >> 0] = 0;
        c[(h + 32 + (i << 2)) >> 2] = k;
        i = c[j >> 2] | 0;
        if (!i) c[(j + 4) >> 2] = k;
        else {
          a[(i + 53) >> 0] = 2;
          c[(i + 36) >> 2] = k;
          a[(k + 54) >> 0] = 1;
          c[(k + 40) >> 2] = i;
        }
        c[j >> 2] = k;
        c[(j + 8) >> 2] = (c[(j + 8) >> 2] | 0) + 1;
        h = 1;
        return h | 0;
      }
      i = c[(4988 + (i << 2)) >> 2] | 0;
      a[(h + 55) >> 0] = e;
      if (
        !(
          zh(
            b,
            e,
            f,
            c[(h + 32 + (k << 2)) >> 2] | 0,
            d[(h + 52 + k) >> 0] | 0,
            j
          ) | 0
        )
      ) {
        h = 0;
        return h | 0;
      }
      if (
        !(
          zh(
            b,
            e,
            f,
            c[(h + 32 + (i << 2)) >> 2] | 0,
            d[(h + 52 + i) >> 0] | 0,
            j
          ) | 0
        )
      ) {
        h = 0;
        return h | 0;
      }
      i = c[(h + 48) >> 2] | 0;
      if (i | 0) c[(i + 44) >> 2] = c[(h + 44) >> 2];
      i = c[(h + 44) >> 2] | 0;
      if (i | 0) c[(i + 48) >> 2] = c[(h + 48) >> 2];
      if ((c[(b + 9280) >> 2] | 0) == (h | 0))
        c[(b + 9280) >> 2] = c[(h + 48) >> 2];
      c[(b + 9284) >> 2] = (c[(b + 9284) >> 2] | 0) + -1;
      c[(h + 44) >> 2] = 0;
      c[(h + 48) >> 2] = c[(b + 9288) >> 2];
      i = c[(b + 9288) >> 2] | 0;
      if (i | 0) c[(i + 44) >> 2] = h;
      c[(b + 9288) >> 2] = h;
      c[(b + 9292) >> 2] = (c[(b + 9292) >> 2] | 0) + 1;
      h = 1;
      return h | 0;
    }
    function Ah(b, d) {
      b = b | 0;
      d = d | 0;
      var e = 0,
        f = 0,
        h = 0.0,
        i = 0,
        j = 0,
        k = 0.0,
        l = 0.0;
      e = c[(d + 204) >> 2] | 0;
      if (((e & 3) | 0) == 0 ? ((c[(d + 504) >> 2] & 1) | 0) == 0 : 0) {
        h = +g[(d + 344) >> 2];
        if (h != 0.0) {
          l = (1.0 / h) * +g[(b + 252) >> 2];
          k = (1.0 / h) * +g[(b + 256) >> 2];
          g[(d + 364) >> 2] = (1.0 / h) * +g[(b + 248) >> 2];
          g[(d + 368) >> 2] = l;
          g[(d + 372) >> 2] = k;
          g[(d + 376) >> 2] = 0.0;
        }
        c[(d + 380) >> 2] = c[(b + 248) >> 2];
        c[(d + 380 + 4) >> 2] = c[(b + 248 + 4) >> 2];
        c[(d + 380 + 8) >> 2] = c[(b + 248 + 8) >> 2];
        c[(d + 380 + 12) >> 2] = c[(b + 248 + 12) >> 2];
      }
      if (!(c[(d + 192) >> 2] | 0)) return;
      if (e & 1) {
        if (((c[(d + 216) >> 2] & -2) | 0) != 4) c[(d + 216) >> 2] = 2;
      } else {
        f = c[(b + 232) >> 2] | 0;
        if (
          (f | 0) == (c[(b + 236) >> 2] | 0)
            ? ((j = f | 0 ? f << 1 : 1), (f | 0) < (j | 0))
            : 0
        ) {
          if (!j) e = 0;
          else {
            c[6435] = (c[6435] | 0) + 1;
            e = yc((((j << 2) | 3) + 16) | 0) | 0;
            if (!e) e = 0;
            else {
              c[(((e + 4 + 15) & -16) + -4) >> 2] = e;
              e = (e + 4 + 15) & -16;
            }
            f = c[(b + 232) >> 2] | 0;
          }
          if ((f | 0) > 0) {
            i = 0;
            do {
              c[(e + (i << 2)) >> 2] =
                c[((c[(b + 240) >> 2] | 0) + (i << 2)) >> 2];
              i = (i + 1) | 0;
            } while ((i | 0) != (f | 0));
          }
          i = c[(b + 240) >> 2] | 0;
          if (i) {
            if (a[(b + 244) >> 0] | 0) {
              c[6436] = (c[6436] | 0) + 1;
              hd(c[(i + -4) >> 2] | 0);
              f = c[(b + 232) >> 2] | 0;
            }
            c[(b + 240) >> 2] = 0;
          }
          a[(b + 244) >> 0] = 1;
          c[(b + 240) >> 2] = e;
          c[(b + 236) >> 2] = j;
          e = c[(d + 204) >> 2] | 0;
        }
        c[((c[(b + 240) >> 2] | 0) + (f << 2)) >> 2] = d;
        c[(b + 232) >> 2] = f + 1;
      }
      j = ((e & 3) | 0) == 0;
      mc[c[((c[b >> 2] | 0) + 36) >> 2] & 127](b, d, j ? 1 : 2, j ? -1 : -3);
      return;
    }
    function Bh(b, d, e, f) {
      b = b | 0;
      d = d | 0;
      e = e | 0;
      f = f | 0;
      var h = 0,
        i = 0.0,
        j = 0,
        k = 0,
        l = 0,
        m = 0.0,
        n = 0.0;
      h = c[(d + 204) >> 2] | 0;
      if (((h & 3) | 0) == 0 ? ((c[(d + 504) >> 2] & 1) | 0) == 0 : 0) {
        i = +g[(d + 344) >> 2];
        if (i != 0.0) {
          n = (1.0 / i) * +g[(b + 252) >> 2];
          m = (1.0 / i) * +g[(b + 256) >> 2];
          g[(d + 364) >> 2] = (1.0 / i) * +g[(b + 248) >> 2];
          g[(d + 368) >> 2] = n;
          g[(d + 372) >> 2] = m;
          g[(d + 376) >> 2] = 0.0;
        }
        c[(d + 380) >> 2] = c[(b + 248) >> 2];
        c[(d + 380 + 4) >> 2] = c[(b + 248 + 4) >> 2];
        c[(d + 380 + 8) >> 2] = c[(b + 248 + 8) >> 2];
        c[(d + 380 + 12) >> 2] = c[(b + 248 + 12) >> 2];
      }
      if (!(c[(d + 192) >> 2] | 0)) return;
      if (h & 1) {
        if (((c[(d + 216) >> 2] & -2) | 0) != 4) c[(d + 216) >> 2] = 2;
      } else {
        h = c[(b + 232) >> 2] | 0;
        if (
          (h | 0) == (c[(b + 236) >> 2] | 0)
            ? ((l = h | 0 ? h << 1 : 1), (h | 0) < (l | 0))
            : 0
        ) {
          if (!l) k = 0;
          else {
            c[6435] = (c[6435] | 0) + 1;
            h = yc((((l << 2) | 3) + 16) | 0) | 0;
            if (!h) h = 0;
            else {
              c[(((h + 4 + 15) & -16) + -4) >> 2] = h;
              h = (h + 4 + 15) & -16;
            }
            k = h;
            h = c[(b + 232) >> 2] | 0;
          }
          if ((h | 0) > 0) {
            j = 0;
            do {
              c[(k + (j << 2)) >> 2] =
                c[((c[(b + 240) >> 2] | 0) + (j << 2)) >> 2];
              j = (j + 1) | 0;
            } while ((j | 0) != (h | 0));
          }
          j = c[(b + 240) >> 2] | 0;
          if (j) {
            if (a[(b + 244) >> 0] | 0) {
              c[6436] = (c[6436] | 0) + 1;
              hd(c[(j + -4) >> 2] | 0);
              h = c[(b + 232) >> 2] | 0;
            }
            c[(b + 240) >> 2] = 0;
          }
          a[(b + 244) >> 0] = 1;
          c[(b + 240) >> 2] = k;
          c[(b + 236) >> 2] = l;
        }
        c[((c[(b + 240) >> 2] | 0) + (h << 2)) >> 2] = d;
        c[(b + 232) >> 2] = h + 1;
      }
      mc[c[((c[b >> 2] | 0) + 36) >> 2] & 127](b, d, e, f);
      return;
    }
    function Ch(a, b, d, e) {
      a = a | 0;
      b = b | 0;
      d = d | 0;
      e = e | 0;
      var f = 0.0,
        h = 0.0,
        i = 0.0,
        j = 0.0,
        k = 0.0,
        l = 0.0,
        m = 0.0,
        n = 0.0,
        o = 0.0,
        p = 0.0,
        q = 0.0,
        r = 0.0,
        s = 0.0,
        t = 0.0,
        u = 0.0,
        v = 0.0,
        w = 0.0,
        x = 0.0,
        y = 0.0,
        z = 0.0,
        A = 0.0,
        B = 0.0,
        C = 0.0,
        D = 0.0,
        E = 0.0,
        F = 0.0;
      o = (+g[(a + 32) >> 2] - +g[(a + 16) >> 2]) * 0.5;
      l = (+g[(a + 36) >> 2] - +g[(a + 20) >> 2]) * 0.5;
      i = (+g[(a + 40) >> 2] - +g[(a + 24) >> 2]) * 0.5;
      n = +Sb[c[((c[a >> 2] | 0) + 48) >> 2] & 15](a);
      k = +Sb[c[((c[a >> 2] | 0) + 48) >> 2] & 15](a);
      i = i + +Sb[c[((c[a >> 2] | 0) + 48) >> 2] & 15](a);
      B = (+g[(a + 32) >> 2] + +g[(a + 16) >> 2]) * 0.5;
      z = (+g[(a + 36) >> 2] + +g[(a + 20) >> 2]) * 0.5;
      x = (+g[(a + 40) >> 2] + +g[(a + 24) >> 2]) * 0.5;
      F = +g[b >> 2];
      w = +N(+F);
      E = +g[(b + 4) >> 2];
      v = +N(+E);
      t = +g[(b + 8) >> 2];
      u = +N(+t);
      D = +g[(b + 16) >> 2];
      s = +N(+D);
      C = +g[(b + 20) >> 2];
      r = +N(+C);
      p = +g[(b + 24) >> 2];
      q = +N(+p);
      A = +g[(b + 32) >> 2];
      m = +N(+A);
      y = +g[(b + 36) >> 2];
      j = +N(+y);
      f = +g[(b + 40) >> 2];
      h = +N(+f);
      t = B * F + z * E + x * t + +g[(b + 48) >> 2];
      p = B * D + z * C + x * p + +g[(b + 52) >> 2];
      f = B * A + z * y + x * f + +g[(b + 56) >> 2];
      g[d >> 2] = t - ((o + n) * w + (l + k) * v + i * u);
      g[(d + 4) >> 2] = p - ((o + n) * s + (l + k) * r + i * q);
      g[(d + 8) >> 2] = f - ((o + n) * m + (l + k) * j + i * h);
      g[(d + 12) >> 2] = 0.0;
      g[e >> 2] = (o + n) * w + (l + k) * v + i * u + t;
      g[(e + 4) >> 2] = (o + n) * s + (l + k) * r + i * q + p;
      g[(e + 8) >> 2] = (o + n) * m + (l + k) * j + i * h + f;
      g[(e + 12) >> 2] = 0.0;
      return;
    }
    function Dh(a, b, d, e) {
      a = a | 0;
      b = b | 0;
      d = d | 0;
      e = e | 0;
      var f = 0.0,
        h = 0.0,
        i = 0.0,
        j = 0.0,
        k = 0.0,
        l = 0.0,
        m = 0.0,
        n = 0.0,
        o = 0.0,
        p = 0.0,
        q = 0.0,
        r = 0.0,
        s = 0.0,
        t = 0.0,
        u = 0.0,
        v = 0.0,
        w = 0.0,
        x = 0.0,
        y = 0.0,
        z = 0.0,
        A = 0.0,
        B = 0.0,
        C = 0.0,
        D = 0.0,
        E = 0.0,
        F = 0,
        G = 0.0,
        H = 0.0;
      H = +g[(a + 48) >> 2];
      z = +g[(a + 32) >> 2];
      G = +g[(a + 52) >> 2];
      x = +g[(a + 36) >> 2];
      E = +g[(a + 56) >> 2];
      v = +g[(a + 40) >> 2];
      F = (c[(a + 16) >> 2] | 0) == 0;
      m = +Sb[c[((c[a >> 2] | 0) + 48) >> 2] & 15](a);
      k = +Sb[c[((c[a >> 2] | 0) + 48) >> 2] & 15](a);
      i = +Sb[c[((c[a >> 2] | 0) + 48) >> 2] & 15](a);
      m = (F ? 0.0 : (H - z) * 0.5) + m;
      k = (F ? 0.0 : (G - x) * 0.5) + k;
      i = (F ? 0.0 : (E - v) * 0.5) + i;
      D = +g[b >> 2];
      u = +N(+D);
      C = +g[(b + 4) >> 2];
      t = +N(+C);
      r = +g[(b + 8) >> 2];
      s = +N(+r);
      B = +g[(b + 16) >> 2];
      q = +N(+B);
      A = +g[(b + 20) >> 2];
      p = +N(+A);
      n = +g[(b + 24) >> 2];
      o = +N(+n);
      y = +g[(b + 32) >> 2];
      l = +N(+y);
      w = +g[(b + 36) >> 2];
      j = +N(+w);
      f = +g[(b + 40) >> 2];
      h = +N(+f);
      z = F ? 0.0 : (H + z) * 0.5;
      x = F ? 0.0 : (G + x) * 0.5;
      v = F ? 0.0 : (E + v) * 0.5;
      r = z * D + x * C + v * r + +g[(b + 48) >> 2];
      n = z * B + x * A + v * n + +g[(b + 52) >> 2];
      f = z * y + x * w + v * f + +g[(b + 56) >> 2];
      g[d >> 2] = r - (m * u + k * t + i * s);
      g[(d + 4) >> 2] = n - (m * q + k * p + i * o);
      g[(d + 8) >> 2] = f - (m * l + k * j + i * h);
      g[(d + 12) >> 2] = 0.0;
      g[e >> 2] = m * u + k * t + i * s + r;
      g[(e + 4) >> 2] = m * q + k * p + i * o + n;
      g[(e + 8) >> 2] = m * l + k * j + i * h + f;
      g[(e + 12) >> 2] = 0.0;
      return;
    }
    function Eh(b, d) {
      b = b | 0;
      d = d | 0;
      var e = 0,
        f = 0.0,
        h = 0.0,
        i = 0.0,
        j = 0,
        l = 0.0,
        m = 0.0;
      if (a[(b + 48) >> 0] | 0) {
        c[d >> 2] = 0;
        c[(d + 4) >> 2] = 0;
        return;
      }
      c[d >> 2] = 4;
      c[(d + 4) >> 2] = 2;
      kd(b, ((c[(b + 28) >> 2] | 0) + 4) | 0, ((c[(b + 32) >> 2] | 0) + 4) | 0);
      g[(b + 1088) >> 2] = 0.0;
      a[(b + 297) >> 0] = 0;
      f = +g[(b + 192) >> 2];
      h = +g[(b + 196) >> 2];
      do
        if (f <= h) {
          m = +g[(b + 892) >> 2];
          l = +g[(b + 908) >> 2];
          i = +g[(b + 924) >> 2];
          i = +ik(
            +W(
              +(
                +g[(b + 832) >> 2] * m +
                +g[(b + 848) >> 2] * l +
                +g[(b + 864) >> 2] * i
              ),
              +(
                +g[(b + 828) >> 2] * m +
                +g[(b + 844) >> 2] * l +
                +g[(b + 860) >> 2] * i
              )
            ),
            f,
            h
          );
          g[(b + 1084) >> 2] = i;
          if (i < f) {
            g[(b + 1088) >> 2] = i - f;
            a[(b + 297) >> 0] = 1;
            j = 1;
            break;
          }
          if (i > h) {
            g[(b + 1088) >> 2] = i - h;
            a[(b + 297) >> 0] = 1;
            j = 1;
          } else j = 0;
        } else j = 0;
      while (0);
      a[(b + 296) >> 0] = 0;
      e = c[(b + 1032) >> 2] | 0;
      c[(b + 1080) >> 2] = e;
      f = +g[(b + 184) >> 2];
      h = +g[(b + 188) >> 2];
      i = ((c[k >> 2] = e), +g[k >> 2]);
      do
        if (f <= h) {
          if (i > h) {
            g[(b + 1032) >> 2] = i - h;
            a[(b + 296) >> 0] = 1;
            e = 14;
            break;
          }
          if (i < f) {
            g[(b + 1032) >> 2] = i - f;
            a[(b + 296) >> 0] = 1;
            e = 14;
          } else e = 13;
        } else e = 13;
      while (0);
      if (
        (e | 0) == 13 ? ((g[(b + 1032) >> 2] = 0.0), a[(b + 1096) >> 0] | 0) : 0
      )
        e = 14;
      if ((e | 0) == 14) {
        c[d >> 2] = (c[d >> 2] | 0) + 1;
        c[(d + 4) >> 2] = (c[(d + 4) >> 2] | 0) + -1;
      }
      if ((j << 24) >> 24 == 0 ? (a[(b + 1112) >> 0] | 0) == 0 : 0) return;
      c[d >> 2] = (c[d >> 2] | 0) + 1;
      c[(d + 4) >> 2] = (c[(d + 4) >> 2] | 0) + -1;
      return;
    }
    function Fh(a) {
      a = a | 0;
      var b = 0,
        d = 0.0,
        e = 0,
        f = 0,
        h = 0,
        i = 0,
        j = 0.0,
        k = 0.0,
        l = 0,
        m = 0,
        n = 0.0,
        o = 0,
        p = 0.0;
      c[6435] = (c[6435] | 0) + 1;
      b = yc(75) | 0;
      if (!b) i = 0;
      else {
        c[(((b + 4 + 15) & -16) + -4) >> 2] = b;
        i = (b + 4 + 15) & -16;
      }
      c[(i + 8) >> 2] = 0;
      e = (i + 12) | 0;
      c[e >> 2] = 1065353216;
      f = (i + 16) | 0;
      c[f >> 2] = 1065353216;
      h = (i + 20) | 0;
      c[h >> 2] = 1065353216;
      g[(i + 24) >> 2] = 0.0;
      b = (i + 44) | 0;
      g[b >> 2] = 0.03999999910593033;
      c[(i + 52) >> 2] = 0;
      c[i >> 2] = 7844;
      c[(i + 4) >> 2] = 0;
      k = +g[a >> 2];
      j = +g[(a + 4) >> 2];
      d = +g[(a + 8) >> 2];
      d =
        +g[(a + ((k < j ? (k < d ? 0 : 2) : j < d ? 1 : 2) << 2)) >> 2] *
        0.10000000149011612;
      if (d < 0.03999999910593033) {
        p = +xz(i);
        n = +Sb[c[((c[i >> 2] | 0) + 48) >> 2] & 15](i);
        k = +Sb[c[((c[i >> 2] | 0) + 48) >> 2] & 15](i);
        o = (i + 28) | 0;
        p = p + +g[o >> 2];
        m = (i + 32) | 0;
        n = n + +g[m >> 2];
        l = (i + 36) | 0;
        k = k + +g[l >> 2];
        g[b >> 2] = d;
        d = +Sb[c[((c[i >> 2] | 0) + 48) >> 2] & 15](i);
        j = +Sb[c[((c[i >> 2] | 0) + 48) >> 2] & 15](i);
        k = k - +Sb[c[((c[i >> 2] | 0) + 48) >> 2] & 15](i);
        g[o >> 2] = p - d;
        g[m >> 2] = n - j;
        g[l >> 2] = k;
        g[(i + 40) >> 2] = 0.0;
        b = c[i >> 2] | 0;
      } else b = 7844;
      k = +Sb[c[(b + 48) >> 2] & 15](i);
      n = +Sb[c[((c[i >> 2] | 0) + 48) >> 2] & 15](i);
      p = +Sb[c[((c[i >> 2] | 0) + 48) >> 2] & 15](i);
      n = +g[(a + 4) >> 2] * +g[f >> 2] - n;
      p = +g[(a + 8) >> 2] * +g[h >> 2] - p;
      g[(i + 28) >> 2] = +g[a >> 2] * +g[e >> 2] - k;
      g[(i + 32) >> 2] = n;
      g[(i + 36) >> 2] = p;
      g[(i + 40) >> 2] = 0.0;
      return i | 0;
    }
    function Gh(a, b) {
      a = a | 0;
      b = b | 0;
      var d = 0,
        e = 0,
        f = 0,
        g = 0,
        h = 0;
      f = c[(a + 212) >> 2] | 0;
      a: do
        if ((f | 0) > 0) {
          g = c[(a + 220) >> 2] | 0;
          d = 0;
          while (1) {
            e = (g + (d << 2)) | 0;
            if ((c[e >> 2] | 0) == (b | 0)) break;
            d = (d + 1) | 0;
            if ((d | 0) >= (f | 0)) break a;
          }
          if ((d | 0) < (f | 0)) {
            c[e >> 2] = c[(g + ((f + -1) << 2)) >> 2];
            c[((c[(a + 220) >> 2] | 0) + ((f + -1) << 2)) >> 2] = b;
            c[(a + 212) >> 2] = f + -1;
          }
        }
      while (0);
      a = c[(b + 28) >> 2] | 0;
      d = c[(a + 488) >> 2] | 0;
      b: do
        if ((d | 0) > 0) {
          g = c[(a + 496) >> 2] | 0;
          e = 0;
          while (1) {
            f = (g + (e << 2)) | 0;
            if ((c[f >> 2] | 0) == (b | 0)) break;
            e = (e + 1) | 0;
            if ((e | 0) >= (d | 0)) break b;
          }
          if ((e | 0) < (d | 0)) {
            c[f >> 2] = c[(g + ((d + -1) << 2)) >> 2];
            c[((c[(a + 496) >> 2] | 0) + ((d + -1) << 2)) >> 2] = b;
            c[(a + 488) >> 2] = d + -1;
            d = (d + -1) | 0;
          }
        }
      while (0);
      c[(a + 256) >> 2] = ((d | 0) > 0) & 1;
      a = c[(b + 32) >> 2] | 0;
      d = c[(a + 488) >> 2] | 0;
      if ((d | 0) <= 0) {
        b = d;
        b = (b | 0) > 0;
        b = b & 1;
        h = (a + 256) | 0;
        c[h >> 2] = b;
        return;
      }
      g = c[(a + 496) >> 2] | 0;
      e = 0;
      while (1) {
        f = (g + (e << 2)) | 0;
        if ((c[f >> 2] | 0) == (b | 0)) break;
        e = (e + 1) | 0;
        if ((e | 0) >= (d | 0)) {
          h = 19;
          break;
        }
      }
      if ((h | 0) == 19) {
        b = (d | 0) > 0;
        b = b & 1;
        h = (a + 256) | 0;
        c[h >> 2] = b;
        return;
      }
      if ((e | 0) >= (d | 0)) {
        b = d;
        b = (b | 0) > 0;
        b = b & 1;
        h = (a + 256) | 0;
        c[h >> 2] = b;
        return;
      }
      c[f >> 2] = c[(g + ((d + -1) << 2)) >> 2];
      c[((c[(a + 496) >> 2] | 0) + ((d + -1) << 2)) >> 2] = b;
      c[(a + 488) >> 2] = d + -1;
      b = (d + -1) | 0;
      b = (b | 0) > 0;
      b = b & 1;
      h = (a + 256) | 0;
      c[h >> 2] = b;
      return;
    }
    function Hh(b, d) {
      b = b | 0;
      d = d | 0;
      var e = 0,
        f = 0.0,
        h = 0.0,
        i = 0.0,
        j = 0;
      j = Eb[c[((c[b >> 2] | 0) + 28) >> 2] & 127](b) | 0;
      i = +g[j >> 2] - +g[d >> 2];
      h = +g[(j + 4) >> 2] - +g[(d + 4) >> 2];
      f = +g[(j + 8) >> 2] - +g[(d + 8) >> 2];
      if (!(i * i + h * h + f * f > 1.1920928955078125e-7)) return;
      Xg(b, d);
      if (
        (a[(b + 61) >> 0] | 0) != 0
          ? ((e = c[(b + 52) >> 2] | 0),
            Ab[c[c[e >> 2] >> 2] & 255](e),
            (e = c[(b + 52) >> 2] | 0),
            (e | 0) != 0)
          : 0
      ) {
        c[6436] = (c[6436] | 0) + 1;
        hd(c[(e + -4) >> 2] | 0);
        d = (b + 52) | 0;
      } else d = (b + 52) | 0;
      c[6435] = (c[6435] | 0) + 1;
      e = yc(191) | 0;
      if (!e) e = 0;
      else {
        c[(((e + 4 + 15) & -16) + -4) >> 2] = e;
        e = (e + 4 + 15) & -16;
      }
      c[(e + 52) >> 2] = 282;
      a[(e + 60) >> 0] = 0;
      a[(e + 80) >> 0] = 1;
      c[(e + 76) >> 2] = 0;
      c[(e + 68) >> 2] = 0;
      c[(e + 72) >> 2] = 0;
      a[(e + 100) >> 0] = 1;
      c[(e + 96) >> 2] = 0;
      c[(e + 88) >> 2] = 0;
      c[(e + 92) >> 2] = 0;
      a[(e + 120) >> 0] = 1;
      c[(e + 116) >> 2] = 0;
      c[(e + 108) >> 2] = 0;
      c[(e + 112) >> 2] = 0;
      a[(e + 140) >> 0] = 1;
      c[(e + 136) >> 2] = 0;
      c[(e + 128) >> 2] = 0;
      c[(e + 132) >> 2] = 0;
      c[(e + 144) >> 2] = 0;
      a[(e + 164) >> 0] = 1;
      c[(e + 160) >> 2] = 0;
      c[(e + 152) >> 2] = 0;
      c[(e + 156) >> 2] = 0;
      c[(e + 168) >> 2] = 0;
      c[(e + 4) >> 2] = -8388609;
      c[(e + 8) >> 2] = -8388609;
      c[(e + 12) >> 2] = -8388609;
      g[(e + 16) >> 2] = 0.0;
      c[(e + 20) >> 2] = 2139095039;
      c[(e + 24) >> 2] = 2139095039;
      c[(e + 28) >> 2] = 2139095039;
      g[(e + 32) >> 2] = 0.0;
      c[e >> 2] = 7980;
      c[d >> 2] = e;
      pd(
        e,
        c[(b + 48) >> 2] | 0,
        (a[(b + 60) >> 0] | 0) != 0,
        (b + 16) | 0,
        (b + 32) | 0
      );
      a[(b + 61) >> 0] = 1;
      return;
    }
    function Ih(b, d) {
      b = b | 0;
      d = d | 0;
      var e = 0.0,
        f = 0.0;
      if (a[(b + 1309) >> 0] | 0) {
        e = (+g[(b + 1256) >> 2] - +g[(b + 1316) >> 2]) * +g[(b + 1340) >> 2];
        g[(b + 792) >> 2] =
          e * ((+g[d >> 2] * +g[(b + 1364) >> 2]) / +(c[(d + 48) >> 2] | 0));
        e = +N(+e);
        g[(b + 808) >> 2] = e / +g[d >> 2];
      }
      if (a[(b + 1310) >> 0] | 0) {
        e = (+g[(b + 1260) >> 2] - +g[(b + 1320) >> 2]) * +g[(b + 1344) >> 2];
        g[(b + 796) >> 2] =
          e * ((+g[d >> 2] * +g[(b + 1368) >> 2]) / +(c[(d + 48) >> 2] | 0));
        e = +N(+e);
        g[(b + 812) >> 2] = e / +g[d >> 2];
      }
      if (a[(b + 1311) >> 0] | 0) {
        e = (+g[(b + 1264) >> 2] - +g[(b + 1324) >> 2]) * +g[(b + 1348) >> 2];
        g[(b + 800) >> 2] =
          e * ((+g[d >> 2] * +g[(b + 1372) >> 2]) / +(c[(d + 48) >> 2] | 0));
        e = +N(+e);
        g[(b + 816) >> 2] = e / +g[d >> 2];
      }
      if (a[(b + 1312) >> 0] | 0) {
        f = -(
          (+g[(b + 1192) >> 2] - +g[(b + 1328) >> 2]) *
          +g[(b + 1352) >> 2]
        );
        e = +g[d >> 2];
        g[(b + 876) >> 2] =
          ((e * +g[(b + 1376) >> 2]) / +(c[(d + 48) >> 2] | 0)) * f;
        g[(b + 880) >> 2] = +N(+f) / e;
      }
      if (a[(b + 1313) >> 0] | 0) {
        e = -(
          (+g[(b + 1196) >> 2] - +g[(b + 1332) >> 2]) *
          +g[(b + 1356) >> 2]
        );
        f = +g[d >> 2];
        g[(b + 940) >> 2] =
          ((f * +g[(b + 1380) >> 2]) / +(c[(d + 48) >> 2] | 0)) * e;
        g[(b + 944) >> 2] = +N(+e) / f;
      }
      if (!(a[(b + 1314) >> 0] | 0)) {
        fg(b, d);
        return;
      }
      e = -((+g[(b + 1200) >> 2] - +g[(b + 1336) >> 2]) * +g[(b + 1360) >> 2]);
      f = +g[d >> 2];
      g[(b + 1004) >> 2] =
        ((f * +g[(b + 1384) >> 2]) / +(c[(d + 48) >> 2] | 0)) * e;
      g[(b + 1008) >> 2] = +N(+e) / f;
      fg(b, d);
      return;
    }
    function Jh(a, b, d) {
      a = a | 0;
      b = b | 0;
      d = d | 0;
      var e = 0,
        f = 0,
        h = 0.0,
        j = 0.0,
        k = 0.0;
      e = i;
      i = (i + 160) | 0;
      c[(e + 136) >> 2] = 0;
      c[(e + 136 + 4) >> 2] = 0;
      c[(e + 136 + 8) >> 2] = 0;
      c[(e + 136 + 12) >> 2] = 0;
      c[(e + 136 + 16) >> 2] = 0;
      c[(e + 32) >> 2] = 7028;
      f = (e + 32 + 4) | 0;
      c[f >> 2] = 0;
      c[(f + 4) >> 2] = 0;
      c[(f + 8) >> 2] = 0;
      c[(f + 12) >> 2] = 0;
      c[(e + 32 + 20) >> 2] = 1065353216;
      c[(e + 32 + 24) >> 2] = 0;
      c[(e + 32 + 24 + 4) >> 2] = 0;
      c[(e + 32 + 24 + 8) >> 2] = 0;
      c[(e + 32 + 24 + 12) >> 2] = 0;
      c[(e + 32 + 40) >> 2] = 1065353216;
      c[(e + 32 + 44) >> 2] = 0;
      c[(e + 32 + 44 + 4) >> 2] = 0;
      c[(e + 32 + 44 + 8) >> 2] = 0;
      c[(e + 32 + 44 + 12) >> 2] = 0;
      c[(e + 32 + 60) >> 2] = 1065353216;
      c[(e + 32 + 64) >> 2] = 0;
      c[(e + 32 + 68) >> 2] = c[(e + 136 + 4) >> 2];
      c[(e + 32 + 68 + 4) >> 2] = c[(e + 136 + 4 + 4) >> 2];
      c[(e + 32 + 68 + 8) >> 2] = c[(e + 136 + 4 + 8) >> 2];
      c[(e + 32 + 68 + 12) >> 2] = c[(e + 136 + 4 + 12) >> 2];
      g[(e + 32 + 84) >> 2] = -999999984306749440.0;
      k = +g[d >> 2];
      j = +g[(d + 4) >> 2];
      h = +g[(d + 8) >> 2];
      g[(e + 32 + 88) >> 2] = k + j * 0.0 + h * 0.0;
      g[(e + 32 + 92) >> 2] = k * 0.0 + j + h * 0.0;
      g[(e + 32 + 96) >> 2] = k * 0.0 + j * 0.0 + h;
      g[(e + 32 + 100) >> 2] = 0.0;
      c[(e + 16) >> 2] = 1566444395;
      c[(e + 16 + 4) >> 2] = 1566444395;
      c[(e + 16 + 8) >> 2] = 1566444395;
      g[(e + 16 + 12) >> 2] = 0.0;
      d = c[((c[b >> 2] | 0) + 64) >> 2] | 0;
      g[e >> 2] = -999999984306749440.0;
      g[(e + 4) >> 2] = -999999984306749440.0;
      g[(e + 8) >> 2] = -999999984306749440.0;
      g[(e + 12) >> 2] = 0.0;
      mc[d & 127](b, (e + 32) | 0, e, (e + 16) | 0);
      c[a >> 2] = c[f >> 2];
      c[(a + 4) >> 2] = c[(f + 4) >> 2];
      c[(a + 8) >> 2] = c[(f + 8) >> 2];
      c[(a + 12) >> 2] = c[(f + 12) >> 2];
      i = e;
      return;
    }
    function Kh(a, b, d) {
      a = a | 0;
      b = b | 0;
      d = d | 0;
      var e = 0.0,
        f = 0.0,
        h = 0.0,
        j = 0.0,
        k = 0.0,
        l = 0.0,
        m = 0.0,
        n = 0.0,
        o = 0.0,
        p = 0.0,
        q = 0;
      q = i;
      i = (i + 16) | 0;
      c[a >> 2] = 0;
      c[(a + 4) >> 2] = 0;
      c[(a + 8) >> 2] = 0;
      c[(a + 12) >> 2] = 0;
      e = +g[d >> 2];
      f = +g[(d + 4) >> 2];
      h = +g[(d + 8) >> 2];
      if (e * e + f * f + h * h < 9.999999747378752e-5) {
        p = 1.0;
        o = 0.0;
        n = 0.0;
      } else {
        n = 1.0 / +O(+(e * e + f * f + h * h));
        p = e * n;
        o = f * n;
        n = h * n;
      }
      d = c[(b + 52) >> 2] | 0;
      m = +g[(b + 28 + ((((d + 2) | 0) % 3 | 0) << 2)) >> 2];
      c[q >> 2] = 0;
      c[(q + 4) >> 2] = 0;
      c[(q + 8) >> 2] = 0;
      c[(q + 12) >> 2] = 0;
      c[(q + (d << 2)) >> 2] = c[(b + 28 + (d << 2)) >> 2];
      k = p * m;
      l = o * m;
      m = n * m;
      e = k + +g[q >> 2];
      f = l + +g[(q + 4) >> 2];
      j = m + +g[(q + 8) >> 2];
      h = +Sb[c[((c[b >> 2] | 0) + 48) >> 2] & 15](b);
      e = e - p * h;
      f = f - o * h;
      h = j - n * h;
      j = n * h + (p * e + o * f);
      if (j > -999999984306749440.0) {
        g[a >> 2] = e;
        g[(a + 4) >> 2] = f;
        g[(a + 8) >> 2] = h;
        g[(a + 12) >> 2] = 0.0;
      } else j = -999999984306749440.0;
      c[q >> 2] = 0;
      c[(q + 4) >> 2] = 0;
      c[(q + 8) >> 2] = 0;
      c[(q + 12) >> 2] = 0;
      d = c[(b + 52) >> 2] | 0;
      g[(q + (d << 2)) >> 2] = -+g[(b + 28 + (d << 2)) >> 2];
      e = k + +g[q >> 2];
      f = l + +g[(q + 4) >> 2];
      m = m + +g[(q + 8) >> 2];
      h = +Sb[c[((c[b >> 2] | 0) + 48) >> 2] & 15](b);
      e = e - p * h;
      f = f - o * h;
      h = m - n * h;
      if (!(n * h + (p * e + o * f) > j)) {
        i = q;
        return;
      }
      g[a >> 2] = e;
      g[(a + 4) >> 2] = f;
      g[(a + 8) >> 2] = h;
      g[(a + 12) >> 2] = 0.0;
      i = q;
      return;
    }
    function Lh(a, b, d, e, f, h, j, k, l, m) {
      a = a | 0;
      b = b | 0;
      d = d | 0;
      e = e | 0;
      f = +f;
      h = +h;
      j = +j;
      k = +k;
      l = +l;
      m = +m;
      var n = 0;
      n = i;
      i = (i + 128) | 0;
      c[(n + 80) >> 2] = c[(a + 4) >> 2];
      c[(n + 80 + 4) >> 2] = c[(a + 20) >> 2];
      c[(n + 80 + 8) >> 2] = c[(a + 36) >> 2];
      g[(n + 80 + 12) >> 2] = 0.0;
      c[(n + 80 + 16) >> 2] = c[(a + 8) >> 2];
      c[(n + 80 + 20) >> 2] = c[(a + 24) >> 2];
      c[(n + 80 + 24) >> 2] = c[(a + 40) >> 2];
      g[(n + 80 + 28) >> 2] = 0.0;
      c[(n + 80 + 32) >> 2] = c[(a + 12) >> 2];
      c[(n + 80 + 36) >> 2] = c[(a + 28) >> 2];
      c[(n + 80 + 40) >> 2] = c[(a + 44) >> 2];
      g[(n + 80 + 44) >> 2] = 0.0;
      c[(n + 32) >> 2] = c[(b + 4) >> 2];
      c[(n + 32 + 4) >> 2] = c[(b + 20) >> 2];
      c[(n + 32 + 8) >> 2] = c[(b + 36) >> 2];
      g[(n + 32 + 12) >> 2] = 0.0;
      c[(n + 32 + 16) >> 2] = c[(b + 8) >> 2];
      c[(n + 32 + 20) >> 2] = c[(b + 24) >> 2];
      c[(n + 32 + 24) >> 2] = c[(b + 40) >> 2];
      g[(n + 32 + 28) >> 2] = 0.0;
      c[(n + 32 + 32) >> 2] = c[(b + 12) >> 2];
      c[(n + 32 + 36) >> 2] = c[(b + 28) >> 2];
      c[(n + 32 + 40) >> 2] = c[(b + 44) >> 2];
      g[(n + 32 + 44) >> 2] = 0.0;
      h = h - +g[(a + 56) >> 2];
      j = j - +g[(a + 60) >> 2];
      g[(n + 16) >> 2] = f - +g[(a + 52) >> 2];
      g[(n + 16 + 4) >> 2] = h;
      g[(n + 16 + 8) >> 2] = j;
      g[(n + 16 + 12) >> 2] = 0.0;
      l = l - +g[(b + 56) >> 2];
      m = m - +g[(b + 60) >> 2];
      g[n >> 2] = k - +g[(b + 52) >> 2];
      g[(n + 4) >> 2] = l;
      g[(n + 8) >> 2] = m;
      g[(n + 12) >> 2] = 0.0;
      Rg(
        d,
        (n + 80) | 0,
        (n + 32) | 0,
        (n + 16) | 0,
        n,
        e,
        (a + 396) | 0,
        +g[(a + 344) >> 2],
        (b + 396) | 0,
        +g[(b + 344) >> 2]
      );
      i = n;
      return;
    }
    function Mh(a, b, c, d, e, f, h, i, j, k, l, m, n, o) {
      a = a | 0;
      b = +b;
      c = +c;
      d = +d;
      e = +e;
      f = +f;
      h = +h;
      i = +i;
      j = +j;
      k = +k;
      l = +l;
      m = +m;
      n = +n;
      o = +o;
      var p = 0.0,
        q = 0.0,
        r = 0.0,
        s = 0.0,
        t = 0.0,
        u = 0.0,
        v = 0.0;
      s = (j - f) * (n - h) - (k - h) * (m - f);
      q = (k - h) * (l - e) - (i - e) * (n - h);
      r = (i - e) * (m - f) - (j - f) * (l - e);
      if (+N(+(r * d + (s * b + q * c))) < 1.1920928955078125e-7) {
        d = -1.0;
        return +d;
      }
      t = +g[a >> 2];
      v = +g[(a + 4) >> 2];
      u = +g[(a + 8) >> 2];
      p =
        -(s * t + q * v + r * u - (r * h + (s * e + q * f))) /
        (r * d + (s * b + q * c));
      if (
        (((p > 1.1920928955078125e-6) & (p < o)
        ? r *
            ((j - (v + p * c)) * (e - (t + p * b)) -
              (f - (v + p * c)) * (i - (t + p * b))) +
            (s *
              ((f - (v + p * c)) * (k - (u + p * d)) -
                (h - (u + p * d)) * (j - (v + p * c))) +
              q *
                ((h - (u + p * d)) * (i - (t + p * b)) -
                  (k - (u + p * d)) * (e - (t + p * b)))) >
          -1.1920928955078125e-6
        : 0)
        ? r *
            ((m - (v + p * c)) * (i - (t + p * b)) -
              (j - (v + p * c)) * (l - (t + p * b))) +
            (s *
              ((j - (v + p * c)) * (n - (u + p * d)) -
                (k - (u + p * d)) * (m - (v + p * c))) +
              q *
                ((k - (u + p * d)) * (l - (t + p * b)) -
                  (n - (u + p * d)) * (i - (t + p * b)))) >
          -1.1920928955078125e-6
        : 0)
          ? r *
              ((f - (v + p * c)) * (l - (t + p * b)) -
                (m - (v + p * c)) * (e - (t + p * b))) +
              (s *
                ((m - (v + p * c)) * (h - (u + p * d)) -
                  (n - (u + p * d)) * (f - (v + p * c))) +
                q *
                  ((n - (u + p * d)) * (e - (t + p * b)) -
                    (h - (u + p * d)) * (l - (t + p * b)))) >
            -1.1920928955078125e-6
          : 0
      ) {
        v = p;
        return +v;
      }
      v = -1.0;
      return +v;
    }
    function Nh(a, b, d, e, f) {
      a = a | 0;
      b = +b;
      d = +d;
      e = +e;
      f = f | 0;
      var h = 0,
        j = 0,
        k = 0,
        l = 0,
        m = 0.0,
        n = 0.0;
      k = i;
      i = (i + 48) | 0;
      m = 1.0 / +O(+(b * b + d * d + e * e));
      g[f >> 2] = m * b;
      g[(f + 4) >> 2] = m * d;
      g[(f + 8) >> 2] = m * e;
      g[(f + 12) >> 2] = 0.0;
      h = c[(a + 120) >> 2] | 0;
      l = c[(a + 124) >> 2] | 0;
      j = ((c[a >> 2] | 0) + (l >> 1)) | 0;
      if (l & 1) h = c[((c[j >> 2] | 0) + h) >> 2] | 0;
      ic[h & 127](k, j, f);
      b = -+g[f >> 2];
      d = -+g[(f + 4) >> 2];
      e = -+g[(f + 8) >> 2];
      h = c[(a + 120) >> 2] | 0;
      l = c[(a + 124) >> 2] | 0;
      j = ((c[(a + 4) >> 2] | 0) + (l >> 1)) | 0;
      if (l & 1) h = c[((c[j >> 2] | 0) + h) >> 2] | 0;
      m = +g[(a + 24) >> 2] * b + +g[(a + 28) >> 2] * d + +g[(a + 32) >> 2] * e;
      n = +g[(a + 40) >> 2] * b + +g[(a + 44) >> 2] * d + +g[(a + 48) >> 2] * e;
      g[(k + 16) >> 2] =
        +g[(a + 8) >> 2] * b + +g[(a + 12) >> 2] * d + +g[(a + 16) >> 2] * e;
      g[(k + 16 + 4) >> 2] = m;
      g[(k + 16 + 8) >> 2] = n;
      g[(k + 16 + 12) >> 2] = 0.0;
      ic[h & 127]((k + 32) | 0, j, (k + 16) | 0);
      n = +g[(k + 32) >> 2];
      b = +g[(k + 32 + 4) >> 2];
      d = +g[(k + 32 + 8) >> 2];
      e =
        +g[(k + 4) >> 2] -
        (n * +g[(a + 72) >> 2] +
          b * +g[(a + 76) >> 2] +
          d * +g[(a + 80) >> 2] +
          +g[(a + 108) >> 2]);
      m =
        +g[(k + 8) >> 2] -
        (n * +g[(a + 88) >> 2] +
          b * +g[(a + 92) >> 2] +
          d * +g[(a + 96) >> 2] +
          +g[(a + 112) >> 2]);
      g[(f + 16) >> 2] =
        +g[k >> 2] -
        (n * +g[(a + 56) >> 2] +
          b * +g[(a + 60) >> 2] +
          d * +g[(a + 64) >> 2] +
          +g[(a + 104) >> 2]);
      g[(f + 20) >> 2] = e;
      g[(f + 24) >> 2] = m;
      g[(f + 28) >> 2] = 0.0;
      i = k;
      return;
    }
    function Oh(b, d) {
      b = b | 0;
      d = d | 0;
      var e = 0,
        f = 0,
        g = 0,
        h = 0,
        i = 0;
      if (a[(b + 165) >> 0] | 0) {
        if ((c[(b + 92) >> 2] | 0) >= (d | 0)) return;
        if (
          (d | 0) != 0
            ? ((c[6435] = (c[6435] | 0) + 1),
              (e = yc((((d << 4) | 3) + 16) | 0) | 0),
              (e | 0) != 0)
            : 0
        ) {
          c[(((e + 4 + 15) & -16) + -4) >> 2] = e;
          g = (e + 4 + 15) & -16;
        } else g = 0;
        e = c[(b + 88) >> 2] | 0;
        if ((e | 0) > 0) {
          f = 0;
          do {
            i = (g + (f << 4)) | 0;
            h = ((c[(b + 96) >> 2] | 0) + (f << 4)) | 0;
            c[i >> 2] = c[h >> 2];
            c[(i + 4) >> 2] = c[(h + 4) >> 2];
            c[(i + 8) >> 2] = c[(h + 8) >> 2];
            c[(i + 12) >> 2] = c[(h + 12) >> 2];
            f = (f + 1) | 0;
          } while ((f | 0) != (e | 0));
        }
        e = c[(b + 96) >> 2] | 0;
        if (e | 0) {
          if (a[(b + 100) >> 0] | 0) {
            c[6436] = (c[6436] | 0) + 1;
            hd(c[(e + -4) >> 2] | 0);
          }
          c[(b + 96) >> 2] = 0;
        }
        a[(b + 100) >> 0] = 1;
        c[(b + 96) >> 2] = g;
        c[(b + 92) >> 2] = d;
        return;
      }
      if ((c[(b + 112) >> 2] | 0) >= (d | 0)) return;
      if (
        (d | 0) != 0
          ? ((c[6435] = (c[6435] | 0) + 1),
            (f = yc((((d << 2) | 3) + 16) | 0) | 0),
            (f | 0) != 0)
          : 0
      ) {
        c[(((f + 4 + 15) & -16) + -4) >> 2] = f;
        h = (f + 4 + 15) & -16;
      } else h = 0;
      f = c[(b + 108) >> 2] | 0;
      g = c[(b + 116) >> 2] | 0;
      if ((f | 0) <= 0)
        if (!g) e = (b + 120) | 0;
        else i = 21;
      else {
        e = 0;
        do {
          c[(h + (e << 2)) >> 2] = c[(g + (e << 2)) >> 2];
          e = (e + 1) | 0;
        } while ((e | 0) != (f | 0));
        i = 21;
      }
      if ((i | 0) == 21) {
        if (a[(b + 120) >> 0] | 0) {
          c[6436] = (c[6436] | 0) + 1;
          hd(c[(g + -4) >> 2] | 0);
        }
        c[(b + 116) >> 2] = 0;
        e = (b + 120) | 0;
      }
      a[e >> 0] = 1;
      c[(b + 116) >> 2] = h;
      c[(b + 112) >> 2] = d;
      return;
    }
    function Ph() {
      var b = 0,
        d = 0,
        e = 0;
      c[6435] = (c[6435] | 0) + 1;
      b = yc(307) | 0;
      if (!b) d = 0;
      else {
        c[(((b + 4 + 15) & -16) + -4) >> 2] = b;
        d = (b + 4 + 15) & -16;
      }
      c[(d + 164) >> 2] = 1065353216;
      c[(d + 168) >> 2] = 1065353216;
      c[(d + 172) >> 2] = 1065353216;
      g[(d + 176) >> 2] = 0.0;
      c[(d + 180) >> 2] = 0;
      g[(d + 184) >> 2] = 999999984306749440.0;
      b = (d + 188) | 0;
      c[b >> 2] = 0;
      c[(b + 4) >> 2] = 0;
      c[(b + 8) >> 2] = 0;
      c[(b + 12) >> 2] = 0;
      c[(d + 204) >> 2] = 1;
      c[(d + 208) >> 2] = -1;
      c[(d + 212) >> 2] = -1;
      c[(d + 216) >> 2] = 1;
      g[(d + 220) >> 2] = 0.0;
      g[(d + 224) >> 2] = 0.5;
      g[(d + 228) >> 2] = 0.0;
      g[(d + 232) >> 2] = 0.0;
      c[(d + 240) >> 2] = 0;
      g[(d + 244) >> 2] = 1.0;
      b = (d + 248) | 0;
      c[b >> 2] = 0;
      c[(b + 4) >> 2] = 0;
      c[(b + 8) >> 2] = 0;
      c[(b + 12) >> 2] = 0;
      c[(d + 4) >> 2] = 1065353216;
      b = (d + 8) | 0;
      c[b >> 2] = 0;
      c[(b + 4) >> 2] = 0;
      c[(b + 8) >> 2] = 0;
      c[(b + 12) >> 2] = 0;
      c[(d + 24) >> 2] = 1065353216;
      b = (d + 28) | 0;
      c[b >> 2] = 0;
      c[(b + 4) >> 2] = 0;
      c[(b + 8) >> 2] = 0;
      c[(b + 12) >> 2] = 0;
      c[(d + 44) >> 2] = 1065353216;
      b = (d + 48) | 0;
      c[b >> 2] = 0;
      c[(b + 4) >> 2] = 0;
      c[(b + 8) >> 2] = 0;
      c[(b + 12) >> 2] = 0;
      c[(b + 16) >> 2] = 0;
      a[(d + 280) >> 0] = 1;
      c[(d + 276) >> 2] = 0;
      c[(d + 268) >> 2] = 0;
      c[(d + 272) >> 2] = 0;
      c[(d + 236) >> 2] = 4;
      c[d >> 2] = 5088;
      c[6435] = (c[6435] | 0) + 1;
      b = yc(95) | 0;
      if (!b) {
        e = 0;
        Ri(e);
        b = (d + 284) | 0;
        c[b >> 2] = e;
        return d | 0;
      }
      c[(((b + 4 + 15) & -16) + -4) >> 2] = b;
      b = (b + 4 + 15) & -16;
      Ri(b);
      e = (d + 284) | 0;
      c[e >> 2] = b;
      return d | 0;
    }
    function Qh(a, b, d, e, f, g, h, i, j) {
      a = a | 0;
      b = b | 0;
      d = d | 0;
      e = e | 0;
      f = f | 0;
      g = g | 0;
      h = h | 0;
      i = i | 0;
      j = j | 0;
      if (!(c[(i + 44) >> 2] | 0)) return;
      b = c[(i + 20) >> 2] | 0;
      if (!(c[(i + 64) >> 2] & 256)) {
        if ((b | 0) <= 0) return;
        j = 0;
        do {
          g = c[(a + 28) >> 2] | 0;
          if ((g | 0) > 0) {
            b = 0;
            do {
              f = c[((c[(a + 116) >> 2] | 0) + (b << 2)) >> 2] | 0;
              h = c[(a + 36) >> 2] | 0;
              d = c[(a + 16) >> 2] | 0;
              Ig(
                (d + (((c[(h + ((f * 152) | 0) + 144) >> 2] | 0) * 244) | 0)) |
                  0,
                (d + (((c[(h + ((f * 152) | 0) + 148) >> 2] | 0) * 244) | 0)) |
                  0,
                (h + ((f * 152) | 0)) | 0
              );
              b = (b + 1) | 0;
            } while ((b | 0) != (g | 0));
            b = c[(i + 20) >> 2] | 0;
          }
          j = (j + 1) | 0;
        } while ((j | 0) < (b | 0));
        return;
      } else {
        if ((b | 0) <= 0) return;
        j = 0;
        do {
          g = c[(a + 28) >> 2] | 0;
          if ((g | 0) > 0) {
            b = 0;
            do {
              f = c[((c[(a + 116) >> 2] | 0) + (b << 2)) >> 2] | 0;
              h = c[(a + 36) >> 2] | 0;
              d = c[(a + 16) >> 2] | 0;
              Ig(
                (d + (((c[(h + ((f * 152) | 0) + 144) >> 2] | 0) * 244) | 0)) |
                  0,
                (d + (((c[(h + ((f * 152) | 0) + 148) >> 2] | 0) * 244) | 0)) |
                  0,
                (h + ((f * 152) | 0)) | 0
              );
              b = (b + 1) | 0;
            } while ((b | 0) != (g | 0));
            b = c[(i + 20) >> 2] | 0;
          }
          j = (j + 1) | 0;
        } while ((j | 0) < (b | 0));
        return;
      }
    }
    function Rh(d, e) {
      d = d | 0;
      e = e | 0;
      var f = 0,
        g = 0,
        h = 0,
        i = 0,
        j = 0;
      if (!(a[(d + 164) >> 0] | 0)) {
        if ((c[(d + 152) >> 2] | 0) >= (e | 0)) return;
        if (
          (e | 0) != 0
            ? ((c[6435] = (c[6435] | 0) + 1),
              (g = yc(((e << 1) + 19) | 0) | 0),
              (g | 0) != 0)
            : 0
        ) {
          c[(((g + 4 + 15) & -16) + -4) >> 2] = g;
          i = (g + 4 + 15) & -16;
        } else i = 0;
        g = c[(d + 148) >> 2] | 0;
        h = c[(d + 156) >> 2] | 0;
        if ((g | 0) <= 0)
          if (!h) f = (d + 160) | 0;
          else j = 22;
        else {
          f = 0;
          do {
            b[(i + (f << 1)) >> 1] = b[(h + (f << 1)) >> 1] | 0;
            f = (f + 1) | 0;
          } while ((f | 0) != (g | 0));
          j = 22;
        }
        if ((j | 0) == 22) {
          if (a[(d + 160) >> 0] | 0) {
            c[6436] = (c[6436] | 0) + 1;
            hd(c[(h + -4) >> 2] | 0);
          }
          c[(d + 156) >> 2] = 0;
          f = (d + 160) | 0;
        }
        a[f >> 0] = 1;
        c[(d + 156) >> 2] = i;
        c[(d + 152) >> 2] = e;
        return;
      } else {
        if ((c[(d + 132) >> 2] | 0) >= (e | 0)) return;
        if (
          (e | 0) != 0
            ? ((c[6435] = (c[6435] | 0) + 1),
              (f = yc((((e << 2) | 3) + 16) | 0) | 0),
              (f | 0) != 0)
            : 0
        ) {
          c[(((f + 4 + 15) & -16) + -4) >> 2] = f;
          i = (f + 4 + 15) & -16;
        } else i = 0;
        g = c[(d + 128) >> 2] | 0;
        h = c[(d + 136) >> 2] | 0;
        if ((g | 0) <= 0)
          if (!h) f = (d + 140) | 0;
          else j = 10;
        else {
          f = 0;
          do {
            c[(i + (f << 2)) >> 2] = c[(h + (f << 2)) >> 2];
            f = (f + 1) | 0;
          } while ((f | 0) != (g | 0));
          j = 10;
        }
        if ((j | 0) == 10) {
          if (a[(d + 140) >> 0] | 0) {
            c[6436] = (c[6436] | 0) + 1;
            hd(c[(h + -4) >> 2] | 0);
          }
          c[(d + 136) >> 2] = 0;
          f = (d + 140) | 0;
        }
        a[f >> 0] = 1;
        c[(d + 136) >> 2] = i;
        c[(d + 132) >> 2] = e;
        return;
      }
    }
    function Sh(a, b, d) {
      a = a | 0;
      b = b | 0;
      d = d | 0;
      si(a, b, d) | 0;
      c[(b + 52) >> 2] = c[(a + 300) >> 2];
      c[(b + 56) >> 2] = c[(a + 304) >> 2];
      c[(b + 60) >> 2] = c[(a + 308) >> 2];
      c[(b + 64) >> 2] = c[(a + 312) >> 2];
      c[(b + 68) >> 2] = c[(a + 316) >> 2];
      c[(b + 72) >> 2] = c[(a + 320) >> 2];
      c[(b + 76) >> 2] = c[(a + 324) >> 2];
      c[(b + 80) >> 2] = c[(a + 328) >> 2];
      c[(b + 84) >> 2] = c[(a + 332) >> 2];
      c[(b + 88) >> 2] = c[(a + 336) >> 2];
      c[(b + 92) >> 2] = c[(a + 340) >> 2];
      c[(b + 96) >> 2] = c[(a + 344) >> 2];
      c[(b + 100) >> 2] = c[(a + 348) >> 2];
      c[(b + 104) >> 2] = c[(a + 352) >> 2];
      c[(b + 108) >> 2] = c[(a + 356) >> 2];
      c[(b + 112) >> 2] = c[(a + 360) >> 2];
      c[(b + 116) >> 2] = c[(a + 364) >> 2];
      c[(b + 120) >> 2] = c[(a + 368) >> 2];
      c[(b + 124) >> 2] = c[(a + 372) >> 2];
      c[(b + 128) >> 2] = c[(a + 376) >> 2];
      c[(b + 132) >> 2] = c[(a + 380) >> 2];
      c[(b + 136) >> 2] = c[(a + 384) >> 2];
      c[(b + 140) >> 2] = c[(a + 388) >> 2];
      c[(b + 144) >> 2] = c[(a + 392) >> 2];
      c[(b + 148) >> 2] = c[(a + 396) >> 2];
      c[(b + 152) >> 2] = c[(a + 400) >> 2];
      c[(b + 156) >> 2] = c[(a + 404) >> 2];
      c[(b + 160) >> 2] = c[(a + 408) >> 2];
      c[(b + 164) >> 2] = c[(a + 412) >> 2];
      c[(b + 168) >> 2] = c[(a + 416) >> 2];
      c[(b + 172) >> 2] = c[(a + 420) >> 2];
      c[(b + 176) >> 2] = c[(a + 424) >> 2];
      c[(b + 180) >> 2] = c[(a + 444) >> 2];
      c[(b + 184) >> 2] = c[(a + 448) >> 2];
      c[(b + 188) >> 2] = c[(a + 452) >> 2];
      c[(b + 192) >> 2] = c[(a + 428) >> 2];
      c[(b + 196) >> 2] = c[(a + 432) >> 2];
      c[(b + 200) >> 2] = c[(a + 436) >> 2];
      c[(b + 204) >> 2] = c[(a + 440) >> 2];
      return 12727;
    }
    function Th(a, b, d) {
      a = a | 0;
      b = b | 0;
      d = +d;
      var e = 0,
        f = 0.0,
        h = 0.0,
        j = 0.0,
        k = 0,
        l = 0.0,
        m = 0.0,
        n = 0.0,
        o = 0.0,
        p = 0.0,
        q = 0.0,
        r = 0.0,
        s = 0.0;
      k = i;
      i = (i + 32) | 0;
      n = +g[(a + 56) >> 2];
      r = +g[(a + 72) >> 2] - n;
      m = +g[(a + 60) >> 2];
      p = +g[(a + 76) >> 2] - m;
      l = +g[(a + 64) >> 2];
      s = +g[(a + 80) >> 2] - l;
      o = +g[(a + 88) >> 2] - n;
      q = +g[(a + 92) >> 2] - m;
      h = +g[(a + 96) >> 2] - l;
      j =
        1.0 /
        +O(
          +(
            (r * q - p * o) * (r * q - p * o) +
            ((p * h - s * q) * (p * h - s * q) +
              (s * o - r * h) * (s * o - r * h))
          )
        );
      f = j * (p * h - s * q);
      h = j * (s * o - r * h);
      j = (r * q - p * o) * j;
      l =
        j * +g[(b + 8) >> 2] +
        (+g[b >> 2] * f + +g[(b + 4) >> 2] * h) -
        (f * n + h * m + j * l);
      if (!(l >= -d) | !(l <= d)) {
        a = 0;
        i = k;
        return a | 0;
      }
      e = 0;
      while (1) {
        mc[c[((c[a >> 2] | 0) + 104) >> 2] & 127](a, e, (k + 16) | 0, k);
        n = +g[(k + 16) >> 2];
        s = +g[k >> 2] - n;
        p = +g[(k + 16 + 4) >> 2];
        o = +g[(k + 4) >> 2] - p;
        m = +g[(k + 16 + 8) >> 2];
        r = +g[(k + 8) >> 2] - m;
        q =
          1.0 /
          +O(
            +(
              (h * s - f * o) * (h * s - f * o) +
              ((j * o - h * r) * (j * o - h * r) +
                (f * r - j * s) * (f * r - j * s))
            )
          );
        e = (e + 1) | 0;
        if (
          (h * s - f * o) * q * +g[(b + 8) >> 2] +
            (+g[b >> 2] * q * (j * o - h * r) +
              +g[(b + 4) >> 2] * q * (f * r - j * s)) -
            (m * (h * s - f * o) * q +
              (n * q * (j * o - h * r) + p * q * (f * r - j * s))) <
          -d
        ) {
          e = 0;
          b = 5;
          break;
        }
        if ((e | 0) >= 3) {
          e = 1;
          b = 5;
          break;
        }
      }
      if ((b | 0) == 5) {
        i = k;
        return e | 0;
      }
      return 0;
    }
    function Uh(b, d, e, f) {
      b = b | 0;
      d = d | 0;
      e = e | 0;
      f = f | 0;
      var h = 0,
        i = 0,
        j = 0;
      c[6435] = (c[6435] | 0) + 1;
      h = yc(55) | 0;
      if (!h) j = 0;
      else {
        c[(((h + 4 + 15) & -16) + -4) >> 2] = h;
        j = (h + 4 + 15) & -16;
      }
      c[j >> 2] = d;
      c[(j + 4) >> 2] = e;
      c[(j + 8) >> 2] = f;
      c[(j + 12) >> 2] = -1;
      c[(j + 16) >> 2] = -1;
      c[(j + 20) >> 2] = -1;
      c[(j + 28) >> 2] = -1;
      g[(j + 32) >> 2] = 0.0;
      f = j;
      d = c[(b + 4) >> 2] | 0;
      c[(j + 24) >> 2] = d;
      if ((d | 0) != (c[(b + 8) >> 2] | 0)) {
        i = d;
        e = (b + 12) | 0;
        e = c[e >> 2] | 0;
        e = (e + (i << 2)) | 0;
        c[e >> 2] = f;
        i = (i + 1) | 0;
        c[(b + 4) >> 2] = i;
        return j | 0;
      }
      i = d | 0 ? d << 1 : 1;
      if ((d | 0) >= (i | 0)) {
        i = d;
        e = (b + 12) | 0;
        e = c[e >> 2] | 0;
        e = (e + (i << 2)) | 0;
        c[e >> 2] = f;
        i = (i + 1) | 0;
        c[(b + 4) >> 2] = i;
        return j | 0;
      }
      if (!i) h = 0;
      else {
        c[6435] = (c[6435] | 0) + 1;
        h = yc((((i << 2) | 3) + 16) | 0) | 0;
        if (!h) h = 0;
        else {
          c[(((h + 4 + 15) & -16) + -4) >> 2] = h;
          h = (h + 4 + 15) & -16;
        }
        d = c[(b + 4) >> 2] | 0;
      }
      if ((d | 0) > 0) {
        e = 0;
        do {
          c[(h + (e << 2)) >> 2] = c[((c[(b + 12) >> 2] | 0) + (e << 2)) >> 2];
          e = (e + 1) | 0;
        } while ((e | 0) != (d | 0));
      }
      e = c[(b + 12) >> 2] | 0;
      if (e) {
        if (a[(b + 16) >> 0] | 0) {
          c[6436] = (c[6436] | 0) + 1;
          hd(c[(e + -4) >> 2] | 0);
          d = c[(b + 4) >> 2] | 0;
        }
        c[(b + 12) >> 2] = 0;
      }
      a[(b + 16) >> 0] = 1;
      c[(b + 12) >> 2] = h;
      c[(b + 8) >> 2] = i;
      i = d;
      e = (b + 12) | 0;
      e = c[e >> 2] | 0;
      e = (e + (i << 2)) | 0;
      c[e >> 2] = f;
      i = (i + 1) | 0;
      c[(b + 4) >> 2] = i;
      return j | 0;
    }
    function Vh(a, b, d, e) {
      a = a | 0;
      b = b | 0;
      d = d | 0;
      e = e | 0;
      var f = 0.0,
        h = 0.0,
        i = 0.0,
        j = 0.0,
        k = 0.0,
        l = 0.0,
        m = 0.0,
        n = 0.0,
        o = 0.0,
        p = 0.0,
        q = 0.0,
        r = 0.0,
        s = 0.0,
        t = 0.0,
        u = 0.0,
        v = 0.0,
        w = 0.0,
        x = 0.0,
        y = 0.0,
        z = 0.0,
        A = 0.0,
        B = 0.0,
        C = 0.0,
        D = 0.0,
        E = 0.0;
      o = +Sb[c[((c[a >> 2] | 0) + 48) >> 2] & 15](a);
      u = +g[(a + 72) >> 2];
      t = +g[(a + 56) >> 2];
      r = +g[(a + 76) >> 2];
      q = +g[(a + 60) >> 2];
      n = +g[(a + 80) >> 2];
      m = +g[(a + 64) >> 2];
      E = +g[b >> 2];
      y = +N(+E);
      D = +g[(b + 4) >> 2];
      x = +N(+D);
      k = +g[(b + 8) >> 2];
      l = +N(+k);
      C = +g[(b + 16) >> 2];
      w = +N(+C);
      B = +g[(b + 20) >> 2];
      v = +N(+B);
      i = +g[(b + 24) >> 2];
      j = +N(+i);
      A = +g[(b + 32) >> 2];
      s = +N(+A);
      z = +g[(b + 36) >> 2];
      p = +N(+z);
      f = +g[(b + 40) >> 2];
      h = +N(+f);
      k =
        (u + t) * 0.5 * E +
        (r + q) * 0.5 * D +
        (n + m) * 0.5 * k +
        +g[(b + 48) >> 2];
      i =
        (u + t) * 0.5 * C +
        (r + q) * 0.5 * B +
        (n + m) * 0.5 * i +
        +g[(b + 52) >> 2];
      f =
        (u + t) * 0.5 * A +
        (r + q) * 0.5 * z +
        (n + m) * 0.5 * f +
        +g[(b + 56) >> 2];
      l =
        (o + (u - t) * 0.5) * y +
        (o + (r - q) * 0.5) * x +
        (o + (n - m) * 0.5) * l;
      j =
        (o + (u - t) * 0.5) * w +
        (o + (r - q) * 0.5) * v +
        (o + (n - m) * 0.5) * j;
      h =
        (o + (u - t) * 0.5) * s +
        (o + (r - q) * 0.5) * p +
        (o + (n - m) * 0.5) * h;
      g[d >> 2] = k - l;
      g[(d + 4) >> 2] = i - j;
      g[(d + 8) >> 2] = f - h;
      g[(d + 12) >> 2] = 0.0;
      g[e >> 2] = l + k;
      g[(e + 4) >> 2] = j + i;
      g[(e + 8) >> 2] = h + f;
      g[(e + 12) >> 2] = 0.0;
      return;
    }
    function Wh(a, b, d, e) {
      a = a | 0;
      b = b | 0;
      d = d | 0;
      e = e | 0;
      var f = 0,
        h = 0.0,
        j = 0.0,
        l = 0.0,
        m = 0.0,
        n = 0.0,
        o = 0.0,
        p = 0.0,
        q = 0.0,
        r = 0.0,
        s = 0.0,
        t = 0.0,
        u = 0.0,
        v = 0.0,
        w = 0.0,
        x = 0.0,
        y = 0,
        z = 0;
      f = i;
      i = (i + 16) | 0;
      y = c[(a + 52) >> 2] | 0;
      z = c[(a + 28 + ((((y + 2) | 0) % 3 | 0) << 2)) >> 2] | 0;
      c[f >> 2] = z;
      c[(f + 4) >> 2] = z;
      c[(f + 8) >> 2] = z;
      g[(f + 12) >> 2] = 0.0;
      g[(f + (y << 2)) >> 2] =
        ((c[k >> 2] = z), +g[k >> 2]) + +g[(a + 28 + (y << 2)) >> 2];
      l = +Sb[c[((c[a >> 2] | 0) + 48) >> 2] & 15](a);
      h = +Sb[c[((c[a >> 2] | 0) + 48) >> 2] & 15](a);
      o = +Sb[c[((c[a >> 2] | 0) + 48) >> 2] & 15](a);
      l = l + +g[f >> 2];
      g[f >> 2] = l;
      h = h + +g[(f + 4) >> 2];
      g[(f + 4) >> 2] = h;
      o = o + +g[(f + 8) >> 2];
      v = +N(+(+g[b >> 2]));
      u = +N(+(+g[(b + 4) >> 2]));
      w = +N(+(+g[(b + 8) >> 2]));
      r = +N(+(+g[(b + 16) >> 2]));
      q = +N(+(+g[(b + 20) >> 2]));
      s = +N(+(+g[(b + 24) >> 2]));
      m = +N(+(+g[(b + 32) >> 2]));
      j = +N(+(+g[(b + 36) >> 2]));
      n = +N(+(+g[(b + 40) >> 2]));
      x = +g[(b + 48) >> 2];
      t = +g[(b + 52) >> 2];
      p = +g[(b + 56) >> 2];
      g[d >> 2] = x - (o * w + (v * l + u * h));
      g[(d + 4) >> 2] = t - (o * s + (r * l + q * h));
      g[(d + 8) >> 2] = p - (o * n + (m * l + j * h));
      g[(d + 12) >> 2] = 0.0;
      g[e >> 2] = x + (o * w + (v * l + u * h));
      g[(e + 4) >> 2] = t + (o * s + (r * l + q * h));
      g[(e + 8) >> 2] = p + (o * n + (m * l + j * h));
      g[(e + 12) >> 2] = 0.0;
      i = f;
      return;
    }
    function Xh(b, d, e) {
      b = b | 0;
      d = d | 0;
      e = e | 0;
      var f = 0,
        h = 0.0,
        i = 0.0,
        j = 0.0,
        k = 0.0,
        l = 0.0,
        m = 0.0,
        n = 0.0,
        o = 0.0,
        p = 0.0;
      if (a[(d + 32) >> 0] & 1) {
        f = c[(b + 4) >> 2] | 0;
        if (f | 0) gj(f, d, e);
        f = c[b >> 2] | 0;
        if (f | 0) {
          n = +g[d >> 2];
          l = +g[(f + 128) >> 2];
          m = +g[(d + 4) >> 2];
          k = +g[(d + 8) >> 2];
          h = +g[(e + 4) >> 2];
          p = +g[(e + 8) >> 2];
          o = +g[e >> 2];
          j =
            +g[(f + 180) >> 2] * (k * h - m * p) +
            +g[(f + 184) >> 2] * (n * p - k * o) +
            (m * o - n * h) * +g[(f + 188) >> 2];
          i =
            (k * h - m * p) * +g[(f + 196) >> 2] +
            (n * p - k * o) * +g[(f + 200) >> 2] +
            (m * o - n * h) * +g[(f + 204) >> 2];
          h =
            (k * h - m * p) * +g[(f + 212) >> 2] +
            (n * p - k * o) * +g[(f + 216) >> 2] +
            (m * o - n * h) * +g[(f + 220) >> 2];
          g[(f + 244) >> 2] = n * l + +g[(f + 244) >> 2];
          g[(f + 248) >> 2] = l * m + +g[(f + 248) >> 2];
          g[(f + 252) >> 2] = l * k + +g[(f + 252) >> 2];
          g[(f + 316) >> 2] = n * l + +g[(f + 316) >> 2];
          g[(f + 320) >> 2] = l * m + +g[(f + 320) >> 2];
          g[(f + 324) >> 2] = l * k + +g[(f + 324) >> 2];
          g[(f + 260) >> 2] = j + +g[(f + 260) >> 2];
          g[(f + 264) >> 2] = i + +g[(f + 264) >> 2];
          g[(f + 268) >> 2] = h + +g[(f + 268) >> 2];
          g[(f + 332) >> 2] = j + +g[(f + 332) >> 2];
          g[(f + 336) >> 2] = i + +g[(f + 336) >> 2];
          g[(f + 340) >> 2] = h + +g[(f + 340) >> 2];
          c[(f + 308) >> 2] = (c[(f + 308) >> 2] | 0) + 1;
        }
      }
      if (!(a[(d + 32) >> 0] & 2)) return;
      jj(b, (d + 16) | 0, e);
      return;
    }
    function Yh(a) {
      a = a | 0;
      var b = 0,
        d = 0,
        e = 0,
        f = 0;
      d = i;
      i = (i + 16) | 0;
      li(15122);
      Ab[c[((c[a >> 2] | 0) + 8) >> 2] & 255](a);
      Ab[c[((c[a >> 2] | 0) + 12) >> 2] & 255](a);
      b = c[(a + 24) >> 2] | 0;
      li(15156);
      if (b | 0) {
        f = c[((c[b >> 2] | 0) + 32) >> 2] | 0;
        e = c[(a + 68) >> 2] | 0;
        e = Eb[c[((c[e >> 2] | 0) + 36) >> 2] & 127](e) | 0;
        mc[f & 127](b, e, (a + 28) | 0, c[(a + 24) >> 2] | 0);
      }
      a = c[2357] | 0;
      f = ((c[(a + 16) >> 2] | 0) + -1) | 0;
      c[(a + 16) >> 2] = f;
      do
        if (!f) {
          if (c[(a + 4) >> 2] | 0) {
            tb(d | 0, 0) | 0;
            b = c[6434] | 0;
            g[(a + 8) >> 2] =
              +g[(a + 8) >> 2] +
              +(
                (((c[(d + 4) >> 2] | 0) -
                  (c[(b + 4) >> 2] | 0) +
                  (((((c[d >> 2] | 0) - (c[b >> 2] | 0)) | 0) * 1e6) | 0) -
                  (c[(a + 12) >> 2] | 0)) |
                  0) >>>
                0
              ) /
                1.0e3;
            b = c[2357] | 0;
            if (c[(a + 16) >> 2] | 0) break;
          } else b = a;
          b = c[(b + 20) >> 2] | 0;
          c[2357] = b;
        } else b = a;
      while (0);
      a = (b + 16) | 0;
      f = ((c[a >> 2] | 0) + -1) | 0;
      c[a >> 2] = f;
      if (f | 0) {
        i = d;
        return;
      }
      do
        if (c[(b + 4) >> 2] | 0) {
          tb(d | 0, 0) | 0;
          e = c[6434] | 0;
          f = (b + 8) | 0;
          g[f >> 2] =
            +g[f >> 2] +
            +(
              (((c[(d + 4) >> 2] | 0) -
                (c[(e + 4) >> 2] | 0) +
                (((((c[d >> 2] | 0) - (c[e >> 2] | 0)) | 0) * 1e6) | 0) -
                (c[(b + 12) >> 2] | 0)) |
                0) >>>
              0
            ) /
              1.0e3;
          if (!(c[a >> 2] | 0)) {
            b = c[2357] | 0;
            break;
          } else {
            i = d;
            return;
          }
        }
      while (0);
      c[2357] = c[(b + 20) >> 2];
      i = d;
      return;
    }
    function Zh(b, d) {
      b = b | 0;
      d = d | 0;
      var e = 0;
      c[b >> 2] = 8840;
      a[(b + 40) >> 0] = 1;
      c[(b + 36) >> 2] = 0;
      c[(b + 28) >> 2] = 0;
      c[(b + 32) >> 2] = 0;
      a[(b + 60) >> 0] = 1;
      c[(b + 56) >> 2] = 0;
      c[(b + 48) >> 2] = 0;
      c[(b + 52) >> 2] = 0;
      c[(b + 4) >> 2] = 0;
      c[(b + 8) >> 2] = 0;
      c[(b + 12) >> 2] = -1;
      c[(b + 16) >> 2] = 0;
      c[(b + 20) >> 2] = 0;
      a[(b + 100) >> 0] = 1;
      c[(b + 96) >> 2] = 0;
      c[(b + 88) >> 2] = 0;
      c[(b + 92) >> 2] = 0;
      a[(b + 120) >> 0] = 1;
      c[(b + 116) >> 2] = 0;
      c[(b + 108) >> 2] = 0;
      c[(b + 112) >> 2] = 0;
      c[(b + 64) >> 2] = 0;
      c[(b + 68) >> 2] = 0;
      c[(b + 72) >> 2] = -1;
      c[(b + 76) >> 2] = 0;
      c[(b + 80) >> 2] = 0;
      a[(b + 193) >> 0] = 0;
      a[(b + 194) >> 0] = 1;
      a[(b + 192) >> 0] = ((d | 0) != 0) ^ 1;
      g[(b + 140) >> 2] = 0.0;
      c[(b + 144) >> 2] = 0;
      c[(b + 164) >> 2] = 0;
      c[(b + 148) >> 2] = 1;
      c[(b + 152) >> 2] = 0;
      c[(b + 156) >> 2] = 10;
      c[(b + 160) >> 2] = 1;
      c[(b + 168) >> 2] = 0;
      c[(b + 172) >> 2] = 0;
      g[(b + 176) >> 2] = 0.0;
      if (d | 0) {
        e = d;
        d = (b + 136) | 0;
        c[d >> 2] = e;
        d = (b + 188) | 0;
        c[d >> 2] = 0;
        d = (b + 180) | 0;
        c[d >> 2] = 0;
        d = (b + 184) | 0;
        c[d >> 2] = 0;
        b = (b + 124) | 0;
        c[b >> 2] = 0;
        c[(b + 4) >> 2] = 0;
        c[(b + 8) >> 2] = 0;
        return;
      }
      c[6435] = (c[6435] | 0) + 1;
      d = yc(95) | 0;
      if (!d) d = 0;
      else {
        c[(((d + 4 + 15) & -16) + -4) >> 2] = d;
        d = (d + 4 + 15) & -16;
      }
      Ri(d);
      e = (b + 136) | 0;
      c[e >> 2] = d;
      e = (b + 188) | 0;
      c[e >> 2] = 0;
      e = (b + 180) | 0;
      c[e >> 2] = 0;
      e = (b + 184) | 0;
      c[e >> 2] = 0;
      e = (b + 124) | 0;
      c[e >> 2] = 0;
      c[(e + 4) >> 2] = 0;
      c[(e + 8) >> 2] = 0;
      return;
    }
    function _h(a, b, d) {
      a = a | 0;
      b = b | 0;
      d = d | 0;
      var e = 0.0,
        f = 0.0,
        h = 0.0,
        i = 0,
        j = 0.0,
        k = 0.0;
      i = c[b >> 2] | 0;
      if ((i | 0) == (c[(a + 80) >> 2] | 0)) {
        k = 1.0;
        return +k;
      }
      if ((c[(i + 204) >> 2] & 4) | 0) {
        k = 1.0;
        return +k;
      }
      h = +g[(b + 8) >> 2];
      f = +g[(b + 12) >> 2];
      e = +g[(b + 16) >> 2];
      if (d) {
        j = h;
        k = f;
      } else {
        j = +g[(i + 4) >> 2] * h + +g[(i + 8) >> 2] * f + +g[(i + 12) >> 2] * e;
        k =
          h * +g[(i + 20) >> 2] + f * +g[(i + 24) >> 2] + e * +g[(i + 28) >> 2];
        e =
          h * +g[(i + 36) >> 2] + f * +g[(i + 40) >> 2] + e * +g[(i + 44) >> 2];
      }
      if (
        j * +g[(a + 84) >> 2] + k * +g[(a + 88) >> 2] + e * +g[(a + 92) >> 2] <
        +g[(a + 100) >> 2]
      ) {
        k = 1.0;
        return +k;
      }
      c[(a + 4) >> 2] = c[(b + 40) >> 2];
      c[(a + 76) >> 2] = i;
      if (d) {
        c[(a + 44) >> 2] = c[(b + 8) >> 2];
        c[(a + 44 + 4) >> 2] = c[(b + 8 + 4) >> 2];
        c[(a + 44 + 8) >> 2] = c[(b + 8 + 8) >> 2];
        c[(a + 44 + 12) >> 2] = c[(b + 8 + 12) >> 2];
      } else {
        e = +g[(b + 8) >> 2];
        f = +g[(b + 12) >> 2];
        h = +g[(b + 16) >> 2];
        j =
          e * +g[(i + 20) >> 2] + f * +g[(i + 24) >> 2] + h * +g[(i + 28) >> 2];
        k =
          e * +g[(i + 36) >> 2] + f * +g[(i + 40) >> 2] + h * +g[(i + 44) >> 2];
        g[(a + 44) >> 2] =
          +g[(i + 4) >> 2] * e + +g[(i + 8) >> 2] * f + +g[(i + 12) >> 2] * h;
        g[(a + 48) >> 2] = j;
        g[(a + 52) >> 2] = k;
        g[(a + 56) >> 2] = 0.0;
      }
      c[(a + 60) >> 2] = c[(b + 24) >> 2];
      c[(a + 60 + 4) >> 2] = c[(b + 24 + 4) >> 2];
      c[(a + 60 + 8) >> 2] = c[(b + 24 + 8) >> 2];
      c[(a + 60 + 12) >> 2] = c[(b + 24 + 12) >> 2];
      k = +g[(b + 40) >> 2];
      return +k;
    }
    function $h(b) {
      b = b | 0;
      var d = 0,
        e = 0,
        f = 0,
        g = 0,
        h = 0;
      d = c[(b + 16) >> 2] | 0;
      if (d | 0) {
        if (a[(b + 20) >> 0] | 0) {
          c[6436] = (c[6436] | 0) + 1;
          hd(c[(d + -4) >> 2] | 0);
        }
        c[(b + 16) >> 2] = 0;
      }
      a[(b + 20) >> 0] = 1;
      c[(b + 16) >> 2] = 0;
      c[(b + 8) >> 2] = 0;
      c[(b + 12) >> 2] = 0;
      d = c[(b + 40) >> 2] | 0;
      if (d | 0) {
        if (a[(b + 44) >> 0] | 0) {
          c[6436] = (c[6436] | 0) + 1;
          hd(c[(d + -4) >> 2] | 0);
        }
        c[(b + 40) >> 2] = 0;
      }
      a[(b + 44) >> 0] = 1;
      c[(b + 40) >> 2] = 0;
      c[(b + 32) >> 2] = 0;
      c[(b + 36) >> 2] = 0;
      d = c[(b + 60) >> 2] | 0;
      if (d | 0) {
        if (a[(b + 64) >> 0] | 0) {
          c[6436] = (c[6436] | 0) + 1;
          hd(c[(d + -4) >> 2] | 0);
        }
        c[(b + 60) >> 2] = 0;
      }
      a[(b + 64) >> 0] = 1;
      c[(b + 60) >> 2] = 0;
      c[(b + 52) >> 2] = 0;
      c[(b + 56) >> 2] = 0;
      if ((c[(b + 12) >> 2] | 0) >= 2) {
        Kf(b);
        return;
      }
      c[6435] = (c[6435] | 0) + 1;
      d = yc(43) | 0;
      if (!d) f = 0;
      else {
        c[(((d + 4 + 15) & -16) + -4) >> 2] = d;
        f = (d + 4 + 15) & -16;
      }
      d = c[(b + 8) >> 2] | 0;
      if ((d | 0) > 0) {
        e = 0;
        do {
          g = (f + ((e * 12) | 0)) | 0;
          h = ((c[(b + 16) >> 2] | 0) + ((e * 12) | 0)) | 0;
          c[g >> 2] = c[h >> 2];
          c[(g + 4) >> 2] = c[(h + 4) >> 2];
          c[(g + 8) >> 2] = c[(h + 8) >> 2];
          e = (e + 1) | 0;
        } while ((e | 0) != (d | 0));
      }
      d = c[(b + 16) >> 2] | 0;
      if (d | 0) {
        if (a[(b + 20) >> 0] | 0) {
          c[6436] = (c[6436] | 0) + 1;
          hd(c[(d + -4) >> 2] | 0);
        }
        c[(b + 16) >> 2] = 0;
      }
      a[(b + 20) >> 0] = 1;
      c[(b + 16) >> 2] = f;
      c[(b + 12) >> 2] = 2;
      Kf(b);
      return;
    }
    function ai(a, b, e) {
      a = a | 0;
      b = b | 0;
      e = e | 0;
      si(a, b, e) | 0;
      c[(b + 52) >> 2] = c[(a + 52) >> 2];
      c[(b + 56) >> 2] = c[(a + 56) >> 2];
      c[(b + 60) >> 2] = c[(a + 60) >> 2];
      c[(b + 64) >> 2] = c[(a + 64) >> 2];
      c[(b + 68) >> 2] = c[(a + 68) >> 2];
      c[(b + 72) >> 2] = c[(a + 72) >> 2];
      c[(b + 76) >> 2] = c[(a + 76) >> 2];
      c[(b + 80) >> 2] = c[(a + 80) >> 2];
      c[(b + 84) >> 2] = c[(a + 84) >> 2];
      c[(b + 88) >> 2] = c[(a + 88) >> 2];
      c[(b + 92) >> 2] = c[(a + 92) >> 2];
      c[(b + 96) >> 2] = c[(a + 96) >> 2];
      c[(b + 100) >> 2] = c[(a + 100) >> 2];
      c[(b + 104) >> 2] = c[(a + 104) >> 2];
      c[(b + 108) >> 2] = c[(a + 108) >> 2];
      c[(b + 112) >> 2] = c[(a + 112) >> 2];
      c[(b + 116) >> 2] = c[(a + 116) >> 2];
      c[(b + 120) >> 2] = c[(a + 120) >> 2];
      c[(b + 124) >> 2] = c[(a + 124) >> 2];
      c[(b + 128) >> 2] = c[(a + 128) >> 2];
      c[(b + 132) >> 2] = c[(a + 132) >> 2];
      c[(b + 136) >> 2] = c[(a + 136) >> 2];
      c[(b + 140) >> 2] = c[(a + 140) >> 2];
      c[(b + 144) >> 2] = c[(a + 144) >> 2];
      c[(b + 148) >> 2] = c[(a + 148) >> 2];
      c[(b + 152) >> 2] = c[(a + 152) >> 2];
      c[(b + 156) >> 2] = c[(a + 156) >> 2];
      c[(b + 160) >> 2] = c[(a + 160) >> 2];
      c[(b + 164) >> 2] = c[(a + 164) >> 2];
      c[(b + 168) >> 2] = c[(a + 168) >> 2];
      c[(b + 172) >> 2] = c[(a + 172) >> 2];
      c[(b + 176) >> 2] = c[(a + 176) >> 2];
      c[(b + 180) >> 2] = c[(a + 188) >> 2];
      c[(b + 184) >> 2] = c[(a + 184) >> 2];
      c[(b + 188) >> 2] = c[(a + 196) >> 2];
      c[(b + 192) >> 2] = c[(a + 192) >> 2];
      c[(b + 196) >> 2] = d[(a + 180) >> 0];
      c[(b + 200) >> 2] = d[(a + 49) >> 0];
      return 12680;
    }
    function bi(a, b) {
      a = a | 0;
      b = b | 0;
      var d = 0,
        e = 0,
        f = 0.0;
      e = i;
      i = (i + 32) | 0;
      d = c[(b + 388) >> 2] | 0;
      switch ((c[(a + 388) >> 2] & 48 & d) | 0) {
        case 32: {
          if (((a | 0) == (b | 0)) & (((d & 64) | 0) == 0)) {
            i = e;
            return;
          }
          g[(e + 4) >> 2] = 1.0;
          c[(e + 8) >> 2] = 0;
          c[(e + 8 + 4) >> 2] = 0;
          c[(e + 8 + 8) >> 2] = 0;
          c[(e + 8 + 12) >> 2] = 0;
          c[e >> 2] = 3540;
          c[(e + 8) >> 2] = c[(a + 456) >> 2];
          d = c[(a + 192) >> 2] | 0;
          f = +Sb[c[((c[d >> 2] | 0) + 48) >> 2] & 15](d);
          d = c[(b + 192) >> 2] | 0;
          g[(e + 12) >> 2] = f + +Sb[c[((c[d >> 2] | 0) + 48) >> 2] & 15](d);
          c[(e + 16) >> 2] =
            c[
              (+g[(a + 316) >> 2] < +g[(b + 316) >> 2]
                ? (a + 316) | 0
                : (b + 316) | 0) >> 2
            ];
          c[(e + 24) >> 2] = a;
          c[(e + 28) >> 2] = b;
          We(c[(a + 1048) >> 2] | 0, c[(b + 1048) >> 2] | 0, e);
          i = e;
          return;
        }
        case 16: {
          if ((a | 0) == (b | 0)) {
            i = e;
            return;
          }
          c[e >> 2] = 3576;
          d = c[(a + 192) >> 2] | 0;
          f = +Sb[c[((c[d >> 2] | 0) + 48) >> 2] & 15](d);
          d = c[(b + 192) >> 2] | 0;
          g[(e + 12) >> 2] = f + +Sb[c[((c[d >> 2] | 0) + 48) >> 2] & 15](d);
          c[(e + 4) >> 2] = a;
          c[(e + 8) >> 2] = b;
          We(c[(a + 928) >> 2] | 0, c[(b + 988) >> 2] | 0, e);
          c[(e + 4) >> 2] = b;
          c[(e + 8) >> 2] = a;
          We(c[(b + 928) >> 2] | 0, c[(a + 988) >> 2] | 0, e);
          i = e;
          return;
        }
        default: {
          i = e;
          return;
        }
      }
    }
    function ci(a, d, e, f) {
      a = a | 0;
      d = d | 0;
      e = e | 0;
      f = f | 0;
      var h = 0,
        j = 0.0,
        k = 0.0,
        l = 0.0,
        m = 0.0;
      h = i;
      i = (i + 96) | 0;
      g[(h + 4) >> 2] = 1.0;
      c[(h + 8) >> 2] = 0;
      b[(h + 12) >> 1] = 1;
      b[(h + 14) >> 1] = -1;
      c[(h + 16) >> 2] = 0;
      c[h >> 2] = 2948;
      c[(h + 20) >> 2] = c[d >> 2];
      c[(h + 20 + 4) >> 2] = c[(d + 4) >> 2];
      c[(h + 20 + 8) >> 2] = c[(d + 8) >> 2];
      c[(h + 20 + 12) >> 2] = c[(d + 12) >> 2];
      c[(h + 36) >> 2] = c[e >> 2];
      c[(h + 36 + 4) >> 2] = c[(e + 4) >> 2];
      c[(h + 36 + 8) >> 2] = c[(e + 8) >> 2];
      c[(h + 36 + 12) >> 2] = c[(e + 12) >> 2];
      a = c[(a + 4) >> 2] | 0;
      mc[c[((c[a >> 2] | 0) + 32) >> 2] & 127](a, d, e, h);
      d = c[(h + 8) >> 2] | 0;
      if (!d) {
        f = 0;
        i = h;
        return f | 0;
      }
      if (!(c[(d + 236) >> 2] & 2)) {
        f = 0;
        i = h;
        return f | 0;
      }
      if ((c[(d + 204) >> 2] & 4) | 0) {
        f = 0;
        i = h;
        return f | 0;
      }
      c[f >> 2] = c[(h + 68) >> 2];
      c[(f + 4) >> 2] = c[(h + 68 + 4) >> 2];
      c[(f + 8) >> 2] = c[(h + 68 + 8) >> 2];
      c[(f + 12) >> 2] = c[(h + 68 + 12) >> 2];
      c[(f + 16) >> 2] = c[(h + 52) >> 2];
      c[(f + 16 + 4) >> 2] = c[(h + 52 + 4) >> 2];
      c[(f + 16 + 8) >> 2] = c[(h + 52 + 8) >> 2];
      c[(f + 16 + 12) >> 2] = c[(h + 52 + 12) >> 2];
      m = +g[(f + 16) >> 2];
      l = +g[(f + 20) >> 2];
      k = +g[(f + 24) >> 2];
      j = 1.0 / +O(+(m * m + l * l + k * k));
      g[(f + 16) >> 2] = m * j;
      g[(f + 20) >> 2] = l * j;
      g[(f + 24) >> 2] = k * j;
      c[(f + 32) >> 2] = c[(h + 4) >> 2];
      f = d;
      i = h;
      return f | 0;
    }
    function di(b, d) {
      b = b | 0;
      d = d | 0;
      var e = 0,
        f = 0,
        g = 0,
        h = 0,
        i = 0;
      e = (b + 288) | 0;
      f = d;
      g = (e + 104) | 0;
      do {
        c[e >> 2] = c[f >> 2];
        e = (e + 4) | 0;
        f = (f + 4) | 0;
      } while ((e | 0) < (g | 0));
      i = c[(d + 108) >> 2] | 0;
      e = c[(b + 396) >> 2] | 0;
      a: do
        if ((e | 0) > (i | 0)) e = (b + 404) | 0;
        else {
          if ((e | 0) < (i | 0) ? (c[(b + 400) >> 2] | 0) < (i | 0) : 0) {
            if (
              (i | 0) != 0
                ? ((c[6435] = (c[6435] | 0) + 1),
                  (h = yc((((i << 2) | 3) + 16) | 0) | 0),
                  (h | 0) != 0)
                : 0
            ) {
              c[(((h + 4 + 15) & -16) + -4) >> 2] = h;
              h = (h + 4 + 15) & -16;
            } else h = 0;
            f = c[(b + 396) >> 2] | 0;
            g = 0;
            while (1) {
              if ((g | 0) >= (f | 0)) break;
              c[(h + (g << 2)) >> 2] =
                c[((c[(b + 404) >> 2] | 0) + (g << 2)) >> 2];
              g = (g + 1) | 0;
            }
            f = c[(b + 404) >> 2] | 0;
            if (f | 0) {
              if (!(((a[(b + 408) >> 0] & 1) == 0) | ((f | 0) == 0))) {
                c[6436] = (c[6436] | 0) + 1;
                hd(c[(f + -4) >> 2] | 0);
              }
              c[(b + 404) >> 2] = 0;
            }
            a[(b + 408) >> 0] = 1;
            c[(b + 404) >> 2] = h;
            c[(b + 400) >> 2] = i;
          }
          while (1) {
            if ((e | 0) >= (i | 0)) {
              e = (b + 404) | 0;
              break a;
            }
            c[((c[(b + 404) >> 2] | 0) + (e << 2)) >> 2] = 0;
            e = (e + 1) | 0;
          }
        }
      while (0);
      c[(b + 396) >> 2] = i;
      e = c[e >> 2] | 0;
      f = 0;
      while (1) {
        if ((f | 0) >= (i | 0)) break;
        c[(e + (f << 2)) >> 2] = c[((c[(d + 116) >> 2] | 0) + (f << 2)) >> 2];
        f = (f + 1) | 0;
      }
      Yi((b + 412) | 0, (d + 124) | 0);
      Yi((b + 432) | 0, (d + 144) | 0);
      return;
    }
    function ei(a, b) {
      a = a | 0;
      b = b | 0;
      var d = 0,
        e = 0,
        f = 0,
        g = 0;
      Ab[c[((c[b >> 2] | 0) + 32) >> 2] & 255](b);
      d = Ob[c[((c[b >> 2] | 0) + 16) >> 2] & 63](b, 104, 1) | 0;
      e = c[(d + 8) >> 2] | 0;
      f = e;
      g = (f + 104) | 0;
      do {
        c[f >> 2] = 0;
        f = (f + 4) | 0;
      } while ((f | 0) < (g | 0));
      c[(e + 88) >> 2] = c[(a + 248) >> 2];
      c[(e + 92) >> 2] = c[(a + 252) >> 2];
      c[(e + 96) >> 2] = c[(a + 256) >> 2];
      c[(e + 100) >> 2] = c[(a + 260) >> 2];
      c[e >> 2] = c[(a + 92) >> 2];
      c[(e + 4) >> 2] = c[(a + 96) >> 2];
      c[(e + 8) >> 2] = c[(a + 100) >> 2];
      c[(e + 12) >> 2] = c[(a + 104) >> 2];
      c[(e + 16) >> 2] = c[(a + 108) >> 2];
      c[(e + 20) >> 2] = c[(a + 116) >> 2];
      c[(e + 24) >> 2] = c[(a + 120) >> 2];
      c[(e + 28) >> 2] = c[(a + 124) >> 2];
      c[(e + 32) >> 2] = c[(a + 128) >> 2];
      c[(e + 36) >> 2] = c[(a + 132) >> 2];
      c[(e + 40) >> 2] = c[(a + 140) >> 2];
      c[(e + 44) >> 2] = c[(a + 144) >> 2];
      c[(e + 48) >> 2] = c[(a + 148) >> 2];
      c[(e + 52) >> 2] = c[(a + 152) >> 2];
      c[(e + 56) >> 2] = c[(a + 168) >> 2];
      c[(e + 60) >> 2] = c[(a + 172) >> 2];
      c[(e + 64) >> 2] = c[(a + 112) >> 2];
      c[(e + 68) >> 2] = c[(a + 156) >> 2];
      c[(e + 72) >> 2] = c[(a + 160) >> 2];
      c[(e + 76) >> 2] = c[(a + 164) >> 2];
      c[(e + 80) >> 2] = c[(a + 136) >> 2];
      yb[c[((c[b >> 2] | 0) + 20) >> 2] & 31](b, d, 11938, 1145853764, e);
      mj(a, b);
      td(a, b);
      Ab[c[((c[b >> 2] | 0) + 36) >> 2] & 255](b);
      return;
    }
    function fi(b, d) {
      b = b | 0;
      d = d | 0;
      if ((c[(b + 16) >> 2] | 0) != ((0 - (c[(b + 76) >> 2] | 0)) | 0)) return;
      d = c[(b + 4) >> 2] | 0;
      if (d | 0) xn((b + 4) | 0, d);
      d = c[(b + 8) >> 2] | 0;
      if (d | 0) {
        c[6436] = (c[6436] | 0) + 1;
        hd(c[(d + -4) >> 2] | 0);
      }
      c[(b + 8) >> 2] = 0;
      c[(b + 12) >> 2] = -1;
      d = c[(b + 36) >> 2] | 0;
      if (d | 0) {
        if (a[(b + 40) >> 0] | 0) {
          c[6436] = (c[6436] | 0) + 1;
          hd(c[(d + -4) >> 2] | 0);
        }
        c[(b + 36) >> 2] = 0;
      }
      a[(b + 40) >> 0] = 1;
      c[(b + 36) >> 2] = 0;
      c[(b + 28) >> 2] = 0;
      c[(b + 32) >> 2] = 0;
      c[(b + 20) >> 2] = 0;
      d = c[(b + 64) >> 2] | 0;
      if (d | 0) xn((b + 64) | 0, d);
      d = c[(b + 68) >> 2] | 0;
      if (d | 0) {
        c[6436] = (c[6436] | 0) + 1;
        hd(c[(d + -4) >> 2] | 0);
      }
      c[(b + 68) >> 2] = 0;
      c[(b + 72) >> 2] = -1;
      d = c[(b + 96) >> 2] | 0;
      if (d | 0) {
        if (a[(b + 100) >> 0] | 0) {
          c[6436] = (c[6436] | 0) + 1;
          hd(c[(d + -4) >> 2] | 0);
        }
        c[(b + 96) >> 2] = 0;
      }
      a[(b + 100) >> 0] = 1;
      c[(b + 96) >> 2] = 0;
      c[(b + 88) >> 2] = 0;
      c[(b + 92) >> 2] = 0;
      c[(b + 80) >> 2] = 0;
      a[(b + 193) >> 0] = 0;
      a[(b + 194) >> 0] = 1;
      c[(b + 144) >> 2] = 0;
      c[(b + 164) >> 2] = 0;
      c[(b + 148) >> 2] = 1;
      c[(b + 152) >> 2] = 0;
      c[(b + 156) >> 2] = 10;
      c[(b + 160) >> 2] = 1;
      c[(b + 124) >> 2] = 0;
      c[(b + 124 + 4) >> 2] = 0;
      c[(b + 124 + 8) >> 2] = 0;
      c[(b + 168) >> 2] = 0;
      c[(b + 168 + 4) >> 2] = 0;
      c[(b + 168 + 8) >> 2] = 0;
      c[(b + 168 + 12) >> 2] = 0;
      c[(b + 168 + 16) >> 2] = 0;
      c[(b + 168 + 20) >> 2] = 0;
      return;
    }
    function gi(a, b, d) {
      a = a | 0;
      b = b | 0;
      d = d | 0;
      var e = 0.0,
        f = 0.0,
        h = 0.0,
        j = 0,
        k = 0.0;
      j = i;
      i = (i + 32) | 0;
      c[(j + 16) >> 2] = c[d >> 2];
      c[(j + 16 + 4) >> 2] = c[(d + 4) >> 2];
      c[(j + 16 + 8) >> 2] = c[(d + 8) >> 2];
      c[(j + 16 + 12) >> 2] = c[(d + 12) >> 2];
      e = +g[(j + 16) >> 2];
      h = +g[(j + 16 + 4) >> 2];
      f = +g[(j + 16 + 8) >> 2];
      if (e * e + h * h + f * f < 1.4210854715202004e-14) {
        c[(j + 16) >> 2] = -1082130432;
        c[(j + 16 + 4) >> 2] = -1082130432;
        c[(j + 16 + 8) >> 2] = -1082130432;
        g[(j + 16 + 12) >> 2] = 0.0;
        e = -1.0;
        h = -1.0;
        f = -1.0;
      }
      k = 1.0 / +O(+(e * e + h * h + f * f));
      g[(j + 16) >> 2] = e * k;
      g[(j + 16 + 4) >> 2] = h * k;
      g[(j + 16 + 8) >> 2] = f * k;
      Gd(j, b, (j + 16) | 0);
      switch (c[(b + 4) >> 2] | 0) {
        case 8: {
          e = +g[(b + 28) >> 2] * +g[(b + 12) >> 2];
          break;
        }
        case 0: {
          e = +g[(b + 44) >> 2];
          break;
        }
        case 1: {
          e = +g[(b + 44) >> 2];
          break;
        }
        case 13: {
          e = +g[(b + 44) >> 2];
          break;
        }
        case 11: {
          e = +g[(b + 44) >> 2];
          break;
        }
        case 10: {
          e = +g[(b + 44) >> 2];
          break;
        }
        case 4:
        case 5: {
          e = +g[(b + 44) >> 2];
          break;
        }
        default:
          e = +Sb[c[((c[b >> 2] | 0) + 48) >> 2] & 15](b);
      }
      h = e * +g[(j + 16 + 4) >> 2] + +g[(j + 4) >> 2];
      k = e * +g[(j + 16 + 8) >> 2] + +g[(j + 8) >> 2];
      g[a >> 2] = e * +g[(j + 16) >> 2] + +g[j >> 2];
      g[(a + 4) >> 2] = h;
      g[(a + 8) >> 2] = k;
      g[(a + 12) >> 2] = 0.0;
      i = j;
      return;
    }
    function hi(a, b) {
      a = a | 0;
      b = b | 0;
      var d = 0.0,
        e = 0,
        f = 0.0,
        h = 0.0,
        i = 0.0,
        j = 0.0;
      c[(a + 4) >> 2] = 35;
      c[(a + 8) >> 2] = 0;
      c[(a + 12) >> 2] = 1065353216;
      c[(a + 16) >> 2] = 1065353216;
      c[(a + 20) >> 2] = 1065353216;
      g[(a + 24) >> 2] = 0.0;
      g[(a + 44) >> 2] = 0.03999999910593033;
      c[a >> 2] = 8140;
      c[(a + 52) >> 2] = 1;
      h = +g[b >> 2];
      f = +g[(b + 4) >> 2];
      d = +g[(b + 8) >> 2];
      d =
        +g[(b + ((h < f ? (h < d ? 0 : 2) : f < d ? 1 : 2) << 2)) >> 2] *
        0.10000000149011612;
      if (d < 0.03999999910593033) {
        j = +xz(a);
        i = +Sb[c[((c[a >> 2] | 0) + 48) >> 2] & 15](a);
        h = +Sb[c[((c[a >> 2] | 0) + 48) >> 2] & 15](a);
        j = j + +g[(a + 28) >> 2];
        i = i + +g[(a + 32) >> 2];
        h = h + +g[(a + 36) >> 2];
        g[(a + 44) >> 2] = d;
        d = +Sb[c[((c[a >> 2] | 0) + 48) >> 2] & 15](a);
        f = +Sb[c[((c[a >> 2] | 0) + 48) >> 2] & 15](a);
        h = h - +Sb[c[((c[a >> 2] | 0) + 48) >> 2] & 15](a);
        g[(a + 28) >> 2] = j - d;
        g[(a + 32) >> 2] = i - f;
        g[(a + 36) >> 2] = h;
        g[(a + 40) >> 2] = 0.0;
        e = c[a >> 2] | 0;
      } else e = 8140;
      h = +Sb[c[(e + 48) >> 2] & 15](a);
      i = +Sb[c[((c[a >> 2] | 0) + 48) >> 2] & 15](a);
      j = +Sb[c[((c[a >> 2] | 0) + 48) >> 2] & 15](a);
      i = +g[(b + 4) >> 2] * +g[(a + 16) >> 2] - i;
      j = +g[(b + 8) >> 2] * +g[(a + 20) >> 2] - j;
      g[(a + 28) >> 2] = +g[b >> 2] * +g[(a + 12) >> 2] - h;
      g[(a + 32) >> 2] = i;
      g[(a + 36) >> 2] = j;
      g[(a + 40) >> 2] = 0.0;
      c[(a + 4) >> 2] = 13;
      return;
    }
    function ii(a, b, d) {
      a = a | 0;
      b = b | 0;
      d = d | 0;
      var e = 0.0,
        f = 0.0,
        h = 0.0,
        j = 0,
        l = 0,
        m = 0,
        n = 0,
        o = 0.0;
      m = i;
      i = (i + 80) | 0;
      c[a >> 2] = 0;
      c[(a + 4) >> 2] = 0;
      c[(a + 8) >> 2] = 0;
      c[(a + 12) >> 2] = 0;
      e = +g[d >> 2];
      f = +g[(d + 4) >> 2];
      h = +g[(d + 8) >> 2];
      if (e * e + f * f + h * h < 9.999999747378752e-5) {
        l = 1065353216;
        j = 0;
        e = 0.0;
        d = 0;
      } else {
        o = 1.0 / +O(+(e * e + f * f + h * h));
        l = ((g[k >> 2] = e * o), c[k >> 2] | 0);
        n = ((g[k >> 2] = f * o), c[k >> 2] | 0);
        j = ((g[k >> 2] = h * o), c[k >> 2] | 0);
        e = +g[(d + 12) >> 2];
        d = n;
      }
      c[(m + 32) >> 2] = 7824;
      n = (m + 32 + 4) | 0;
      c[n >> 2] = 0;
      c[(n + 4) >> 2] = 0;
      c[(n + 8) >> 2] = 0;
      c[(n + 12) >> 2] = 0;
      g[(m + 32 + 20) >> 2] = -999999984306749440.0;
      c[(m + 32 + 24) >> 2] = l;
      c[(m + 32 + 28) >> 2] = d;
      c[(m + 32 + 32) >> 2] = j;
      g[(m + 32 + 36) >> 2] = e;
      c[(m + 16) >> 2] = 1566444395;
      c[(m + 16 + 4) >> 2] = 1566444395;
      c[(m + 16 + 8) >> 2] = 1566444395;
      g[(m + 16 + 12) >> 2] = 0.0;
      b = c[(b + 92) >> 2] | 0;
      l = c[((c[b >> 2] | 0) + 8) >> 2] | 0;
      g[m >> 2] = -999999984306749440.0;
      g[(m + 4) >> 2] = -999999984306749440.0;
      g[(m + 8) >> 2] = -999999984306749440.0;
      g[(m + 12) >> 2] = 0.0;
      mc[l & 127](b, (m + 32) | 0, m, (m + 16) | 0);
      c[a >> 2] = c[n >> 2];
      c[(a + 4) >> 2] = c[(n + 4) >> 2];
      c[(a + 8) >> 2] = c[(n + 8) >> 2];
      c[(a + 12) >> 2] = c[(n + 12) >> 2];
      i = m;
      return;
    }
    function ji(a, b, d) {
      a = a | 0;
      b = b | 0;
      d = d | 0;
      var e = 0.0,
        f = 0,
        h = 0.0,
        i = 0,
        j = 0.0,
        k = 0.0,
        l = 0,
        m = 0.0;
      e = +g[(b + 60) >> 2] * 0.5;
      l = c[(b + 68) >> 2] | 0;
      h = +g[d >> 2];
      j = +g[(d + 4) >> 2];
      k = +g[(d + 8) >> 2];
      k = +O(+(h * h + j * j + k * k));
      f = c[(b + 64) >> 2] | 0;
      do
        if (!(+g[(d + (l << 2)) >> 2] > k * +g[(b + 52) >> 2])) {
          h = +g[(d + (f << 2)) >> 2];
          i = c[(b + 72) >> 2] | 0;
          j = +g[(d + (i << 2)) >> 2];
          k = +O(+(h * h + j * j));
          if (k > 1.1920928955078125e-7) {
            k = +g[(b + 56) >> 2] / k;
            g[(a + (f << 2)) >> 2] = h * k;
            g[(a + (l << 2)) >> 2] = -e;
            g[(a + (i << 2)) >> 2] = j * k;
            break;
          } else {
            g[(a + (f << 2)) >> 2] = 0.0;
            g[(a + (l << 2)) >> 2] = -e;
            g[(a + (i << 2)) >> 2] = 0.0;
            break;
          }
        } else {
          g[(a + (f << 2)) >> 2] = 0.0;
          g[(a + (l << 2)) >> 2] = e;
          g[(a + (c[(b + 72) >> 2] << 2)) >> 2] = 0.0;
        }
      while (0);
      if (!(+Sb[c[((c[b >> 2] | 0) + 48) >> 2] & 15](b) != 0.0)) return;
      h = +g[d >> 2];
      j = +g[(d + 4) >> 2];
      k = +g[(d + 8) >> 2];
      m = h * h + j * j + k * k < 1.4210854715202004e-14 ? -1.0 : h;
      e = h * h + j * j + k * k < 1.4210854715202004e-14 ? -1.0 : j;
      k = h * h + j * j + k * k < 1.4210854715202004e-14 ? -1.0 : k;
      j = 1.0 / +O(+(k * k + (m * m + e * e)));
      h = +Sb[c[((c[b >> 2] | 0) + 48) >> 2] & 15](b);
      g[a >> 2] = +g[a >> 2] + h * j * m;
      g[(a + 4) >> 2] = h * j * e + +g[(a + 4) >> 2];
      g[(a + 8) >> 2] = h * j * k + +g[(a + 8) >> 2];
      return;
    }
    function ki(a, b, d) {
      a = a | 0;
      b = b | 0;
      d = d | 0;
      var e = 0,
        f = 0,
        g = 0;
      e = Zb[c[((c[d >> 2] | 0) + 40) >> 2] & 31](d, a) | 0;
      g = Zb[c[((c[d >> 2] | 0) + 28) >> 2] & 31](d, e) | 0;
      c[b >> 2] = g;
      if (g | 0) Cb[c[((c[d >> 2] | 0) + 48) >> 2] & 127](d, e);
      c[(b + 4) >> 2] = c[(a + 4) >> 2];
      c[(b + 28) >> 2] = c[(a + 28) >> 2];
      c[(b + 32) >> 2] = c[(a + 32) >> 2];
      c[(b + 36) >> 2] = c[(a + 36) >> 2];
      c[(b + 40) >> 2] = c[(a + 40) >> 2];
      c[(b + 12) >> 2] = c[(a + 12) >> 2];
      c[(b + 16) >> 2] = c[(a + 16) >> 2];
      c[(b + 20) >> 2] = c[(a + 20) >> 2];
      c[(b + 24) >> 2] = c[(a + 24) >> 2];
      c[(b + 44) >> 2] = c[(a + 44) >> 2];
      f = c[(a + 96) >> 2] | 0;
      c[(b + 60) >> 2] = f;
      if (!f) {
        c[(b + 52) >> 2] = 0;
        c[(b + 56) >> 2] = 0;
        return 17310;
      }
      c[(b + 52) >> 2] =
        Zb[c[((c[d >> 2] | 0) + 28) >> 2] & 31](d, c[(a + 104) >> 2] | 0) | 0;
      c[(b + 56) >> 2] = 0;
      g = Ob[c[((c[d >> 2] | 0) + 16) >> 2] & 63](d, 16, f) | 0;
      if ((f | 0) > 0) {
        e = c[(a + 104) >> 2] | 0;
        b = 0;
        a = c[(g + 8) >> 2] | 0;
        while (1) {
          c[a >> 2] = c[(e + (b << 4)) >> 2];
          c[(a + 4) >> 2] = c[(e + (b << 4) + 4) >> 2];
          c[(a + 8) >> 2] = c[(e + (b << 4) + 8) >> 2];
          c[(a + 12) >> 2] = c[(e + (b << 4) + 12) >> 2];
          b = (b + 1) | 0;
          if ((b | 0) == (f | 0)) break;
          else a = (a + 16) | 0;
        }
      } else e = c[(a + 104) >> 2] | 0;
      yb[c[((c[d >> 2] | 0) + 20) >> 2] & 31](d, g, 19308, 1497453121, e);
      return 17310;
    }
    function li(a) {
      a = a | 0;
      var b = 0,
        d = 0,
        e = 0,
        f = 0;
      f = i;
      i = (i + 16) | 0;
      d = c[2357] | 0;
      if ((c[d >> 2] | 0) == (a | 0)) b = d;
      else {
        b = c[(d + 24) >> 2] | 0;
        a: do
          if (!b) e = 5;
          else
            while (1) {
              if ((c[b >> 2] | 0) == (a | 0)) break a;
              b = c[(b + 28) >> 2] | 0;
              if (!b) {
                e = 5;
                break;
              }
            }
        while (0);
        do
          if ((e | 0) == 5) {
            while (1) {
              b = yc(36) | 0;
              if (b | 0) {
                e = 9;
                break;
              }
              b = c[6564] | 0;
              c[6564] = b + 0;
              if (!b) {
                e = 8;
                break;
              }
              jc[b & 3]();
              e = 5;
            }
            if ((e | 0) == 8) {
              f = Ya(4) | 0;
              c[f >> 2] = 9640;
              pb(f | 0, 2800, 251);
            } else if ((e | 0) == 9) {
              c[b >> 2] = a;
              c[(b + 4) >> 2] = 0;
              c[(b + 4 + 4) >> 2] = 0;
              c[(b + 4 + 8) >> 2] = 0;
              c[(b + 4 + 12) >> 2] = 0;
              c[(b + 20) >> 2] = d;
              c[(b + 24) >> 2] = 0;
              c[(b + 28) >> 2] = 0;
              c[(b + 32) >> 2] = 0;
              Vq(b);
              c[(b + 28) >> 2] = c[(d + 24) >> 2];
              c[(d + 24) >> 2] = b;
              break;
            }
          }
        while (0);
        c[2357] = b;
      }
      a = (b + 4) | 0;
      c[a >> 2] = (c[a >> 2] | 0) + 1;
      a = (b + 16) | 0;
      e = c[a >> 2] | 0;
      c[a >> 2] = e + 1;
      if (e | 0) {
        i = f;
        return;
      }
      tb(f | 0, 0) | 0;
      e = c[6434] | 0;
      c[(b + 12) >> 2] =
        (c[(f + 4) >> 2] | 0) -
        (c[(e + 4) >> 2] | 0) +
        (((((c[f >> 2] | 0) - (c[e >> 2] | 0)) | 0) * 1e6) | 0);
      i = f;
      return;
    }
    function mi(a, b, d) {
      a = a | 0;
      b = b | 0;
      d = d | 0;
      c[(a + 300) >> 2] = c[b >> 2];
      c[(a + 300 + 4) >> 2] = c[(b + 4) >> 2];
      c[(a + 300 + 8) >> 2] = c[(b + 8) >> 2];
      c[(a + 300 + 12) >> 2] = c[(b + 12) >> 2];
      c[(a + 316) >> 2] = c[(b + 16) >> 2];
      c[(a + 316 + 4) >> 2] = c[(b + 16 + 4) >> 2];
      c[(a + 316 + 8) >> 2] = c[(b + 16 + 8) >> 2];
      c[(a + 316 + 12) >> 2] = c[(b + 16 + 12) >> 2];
      c[(a + 332) >> 2] = c[(b + 32) >> 2];
      c[(a + 332 + 4) >> 2] = c[(b + 32 + 4) >> 2];
      c[(a + 332 + 8) >> 2] = c[(b + 32 + 8) >> 2];
      c[(a + 332 + 12) >> 2] = c[(b + 32 + 12) >> 2];
      c[(a + 348) >> 2] = c[(b + 48) >> 2];
      c[(a + 348 + 4) >> 2] = c[(b + 48 + 4) >> 2];
      c[(a + 348 + 8) >> 2] = c[(b + 48 + 8) >> 2];
      c[(a + 348 + 12) >> 2] = c[(b + 48 + 12) >> 2];
      c[(a + 364) >> 2] = c[d >> 2];
      c[(a + 364 + 4) >> 2] = c[(d + 4) >> 2];
      c[(a + 364 + 8) >> 2] = c[(d + 8) >> 2];
      c[(a + 364 + 12) >> 2] = c[(d + 12) >> 2];
      c[(a + 380) >> 2] = c[(d + 16) >> 2];
      c[(a + 380 + 4) >> 2] = c[(d + 16 + 4) >> 2];
      c[(a + 380 + 8) >> 2] = c[(d + 16 + 8) >> 2];
      c[(a + 380 + 12) >> 2] = c[(d + 16 + 12) >> 2];
      c[(a + 396) >> 2] = c[(d + 32) >> 2];
      c[(a + 396 + 4) >> 2] = c[(d + 32 + 4) >> 2];
      c[(a + 396 + 8) >> 2] = c[(d + 32 + 8) >> 2];
      c[(a + 396 + 12) >> 2] = c[(d + 32 + 12) >> 2];
      c[(a + 412) >> 2] = c[(d + 48) >> 2];
      c[(a + 412 + 4) >> 2] = c[(d + 48 + 4) >> 2];
      c[(a + 412 + 8) >> 2] = c[(d + 48 + 8) >> 2];
      c[(a + 412 + 12) >> 2] = c[(d + 48 + 12) >> 2];
      Ab[c[((c[a >> 2] | 0) + 8) >> 2] & 255](a);
      return;
    }
    function ni(a, b, d) {
      a = a | 0;
      b = b | 0;
      d = d | 0;
      var e = 0.0,
        f = 0.0,
        h = 0.0,
        i = 0.0,
        j = 0.0,
        k = 0.0,
        l = 0.0,
        m = 0,
        n = 0.0;
      m = c[(a + 4) >> 2] | 0;
      a = c[(a + 64) >> 2] | 0;
      do
        if (!m)
          if (!a) {
            e = 0.0;
            n = 0.0;
            j = 0.0;
            l = 0.0;
            h = 0.0;
            k = 0.0;
            i = 0.0;
            f = 0.0;
          } else {
            e = +g[a >> 2];
            n = +g[(a + 12) >> 2];
            j = +g[(a + 16) >> 2];
            l = +g[(a + 20) >> 2];
            h = +g[(a + 24) >> 2];
            k = +g[(a + 28) >> 2];
            i = +g[(a + 4) >> 2];
            f = +g[(a + 8) >> 2];
          }
        else {
          e = +g[m >> 2];
          if (!a) {
            n = +g[(m + 12) >> 2];
            j = +g[(m + 16) >> 2];
            l = +g[(m + 20) >> 2];
            h = +g[(m + 24) >> 2];
            k = +g[(m + 28) >> 2];
            i = +g[(m + 4) >> 2];
            f = +g[(m + 8) >> 2];
            break;
          }
          k = +g[a >> 2];
          e = e < k ? e : k;
          k = +g[(m + 16) >> 2];
          j = +g[(a + 16) >> 2];
          j = k > j ? k : j;
          k = +g[(m + 4) >> 2];
          i = +g[(a + 4) >> 2];
          i = k < i ? k : i;
          k = +g[(m + 20) >> 2];
          l = +g[(a + 20) >> 2];
          l = k > l ? k : l;
          k = +g[(m + 8) >> 2];
          f = +g[(a + 8) >> 2];
          f = k < f ? k : f;
          k = +g[(m + 24) >> 2];
          h = +g[(a + 24) >> 2];
          if (k > h) {
            n = 0.0;
            h = k;
            k = 0.0;
          } else {
            n = 0.0;
            k = 0.0;
          }
        }
      while (0);
      g[b >> 2] = e;
      g[(b + 4) >> 2] = i;
      g[(b + 8) >> 2] = f;
      g[(b + 12) >> 2] = n;
      g[d >> 2] = j;
      g[(d + 4) >> 2] = l;
      g[(d + 8) >> 2] = h;
      g[(d + 12) >> 2] = k;
      return;
    }
    function oi(a, b) {
      a = a | 0;
      b = b | 0;
      var c = 0,
        d = 0.0,
        e = 0.0,
        f = 0.0,
        h = 0.0,
        j = 0.0,
        k = 0.0,
        l = 0.0,
        m = 0.0,
        n = 0.0,
        o = 0.0,
        p = 0.0,
        q = 0.0;
      c = i;
      i = (i + 48) | 0;
      Wg((a + 364) | 0, (c + 16) | 0);
      h = -+g[(c + 16) >> 2];
      e = -+g[(c + 16 + 4) >> 2];
      m = -+g[(c + 16 + 8) >> 2];
      l = +g[(c + 16 + 12) >> 2];
      f = +g[b >> 2];
      n = +g[(b + 12) >> 2];
      k = +g[(b + 8) >> 2];
      j = +g[(b + 4) >> 2];
      Wg((a + 300) | 0, c);
      p = +g[c >> 2];
      q = +g[(c + 12) >> 2];
      d = +g[(c + 8) >> 2];
      o = +g[(c + 4) >> 2];
      g[(c + 32) >> 2] =
        p * (l * n - f * h - j * e - k * m) +
        (l * f + n * h + k * e - j * m) * q +
        (f * m + (n * e + l * j) - k * h) * d -
        (n * m + l * k + j * h - f * e) * o;
      g[(c + 32 + 4) >> 2] =
        p * (n * m + l * k + j * h - f * e) +
        (q * (f * m + (n * e + l * j) - k * h) +
          (l * n - f * h - j * e - k * m) * o) -
        (l * f + n * h + k * e - j * m) * d;
      g[(c + 32 + 8) >> 2] =
        q * (n * m + l * k + j * h - f * e) +
        (l * n - f * h - j * e - k * m) * d +
        (l * f + n * h + k * e - j * m) * o -
        p * (f * m + (n * e + l * j) - k * h);
      g[(c + 32 + 12) >> 2] =
        (l * n - f * h - j * e - k * m) * q -
        p * (l * f + n * h + k * e - j * m) -
        (f * m + (n * e + l * j) - k * h) * o -
        (n * m + l * k + j * h - f * e) * d;
      Yd(a, (c + 32) | 0);
      i = c;
      return;
    }
    function pi(b) {
      b = b | 0;
      var d = 0;
      d = c[b >> 2] | 0;
      if (d | 0) xn(b, d);
      d = c[(b + 4) >> 2] | 0;
      if (d | 0) {
        c[6436] = (c[6436] | 0) + 1;
        hd(c[(d + -4) >> 2] | 0);
      }
      c[(b + 4) >> 2] = 0;
      c[(b + 8) >> 2] = -1;
      d = c[(b + 32) >> 2] | 0;
      if (d | 0) {
        if (a[(b + 36) >> 0] | 0) {
          c[6436] = (c[6436] | 0) + 1;
          hd(c[(d + -4) >> 2] | 0);
        }
        c[(b + 32) >> 2] = 0;
      }
      a[(b + 36) >> 0] = 1;
      c[(b + 32) >> 2] = 0;
      c[(b + 24) >> 2] = 0;
      c[(b + 28) >> 2] = 0;
      c[(b + 16) >> 2] = 0;
      d = c[(b + 52) >> 2] | 0;
      if (!d) {
        a[(b + 56) >> 0] = 1;
        c[(b + 52) >> 2] = 0;
        c[(b + 44) >> 2] = 0;
        c[(b + 48) >> 2] = 0;
        a[(b + 36) >> 0] = 1;
        c[(b + 32) >> 2] = 0;
        c[(b + 24) >> 2] = 0;
        c[(b + 28) >> 2] = 0;
        return;
      }
      if (!(a[(b + 56) >> 0] | 0)) {
        a[(b + 56) >> 0] = 1;
        c[(b + 52) >> 2] = 0;
        c[(b + 44) >> 2] = 0;
        c[(b + 48) >> 2] = 0;
        a[(b + 36) >> 0] = 1;
        c[(b + 32) >> 2] = 0;
        c[(b + 24) >> 2] = 0;
        c[(b + 28) >> 2] = 0;
        return;
      }
      c[6436] = (c[6436] | 0) + 1;
      hd(c[(d + -4) >> 2] | 0);
      d = c[(b + 32) >> 2] | 0;
      a[(b + 56) >> 0] = 1;
      c[(b + 52) >> 2] = 0;
      c[(b + 44) >> 2] = 0;
      c[(b + 48) >> 2] = 0;
      if (!d) {
        a[(b + 36) >> 0] = 1;
        c[(b + 32) >> 2] = 0;
        c[(b + 24) >> 2] = 0;
        c[(b + 28) >> 2] = 0;
        return;
      }
      if (a[(b + 36) >> 0] | 0) {
        c[6436] = (c[6436] | 0) + 1;
        hd(c[(d + -4) >> 2] | 0);
      }
      c[(b + 32) >> 2] = 0;
      a[(b + 36) >> 0] = 1;
      c[(b + 32) >> 2] = 0;
      c[(b + 24) >> 2] = 0;
      c[(b + 28) >> 2] = 0;
      return;
    }
    function qi(b, d, e) {
      b = b | 0;
      d = d | 0;
      e = e | 0;
      var f = 0,
        g = 0,
        h = 0,
        i = 0,
        j = 0;
      if (!e) e = c[(b + 188) >> 2] | 0;
      j = c[d >> 2] | 0;
      f = c[(b + 268) >> 2] | 0;
      a: do
        if ((f | 0) > 0) {
          h = c[(b + 276) >> 2] | 0;
          g = 0;
          while (1) {
            if ((c[(h + (g << 2)) >> 2] | 0) == (j | 0)) break;
            g = (g + 1) | 0;
            if ((g | 0) >= (f | 0)) break a;
          }
          if ((g | 0) != (f | 0)) return;
        }
      while (0);
      if (
        (f | 0) == (c[(b + 272) >> 2] | 0)
          ? ((i = f | 0 ? f << 1 : 1), (f | 0) < (i | 0))
          : 0
      ) {
        if (!i) h = 0;
        else {
          c[6435] = (c[6435] | 0) + 1;
          f = yc((((i << 2) | 3) + 16) | 0) | 0;
          if (!f) f = 0;
          else {
            c[(((f + 4 + 15) & -16) + -4) >> 2] = f;
            f = (f + 4 + 15) & -16;
          }
          h = f;
          f = c[(b + 268) >> 2] | 0;
        }
        if ((f | 0) > 0) {
          g = 0;
          do {
            c[(h + (g << 2)) >> 2] =
              c[((c[(b + 276) >> 2] | 0) + (g << 2)) >> 2];
            g = (g + 1) | 0;
          } while ((g | 0) != (f | 0));
        }
        g = c[(b + 276) >> 2] | 0;
        if (g) {
          if (a[(b + 280) >> 0] | 0) {
            c[6436] = (c[6436] | 0) + 1;
            hd(c[(g + -4) >> 2] | 0);
            f = c[(b + 268) >> 2] | 0;
          }
          c[(b + 276) >> 2] = 0;
        }
        a[(b + 280) >> 0] = 1;
        c[(b + 276) >> 2] = h;
        c[(b + 272) >> 2] = i;
      }
      c[((c[(b + 276) >> 2] | 0) + (f << 2)) >> 2] = j;
      c[(b + 268) >> 2] = f + 1;
      b = c[(b + 284) >> 2] | 0;
      Ob[c[((c[b >> 2] | 0) + 8) >> 2] & 63](b, e, d) | 0;
      return;
    }
    function ri(b) {
      b = b | 0;
      var d = 0;
      if ((a[22496] | 0) == 0 ? Wa(22496) | 0 : 0) {
        if ((a[22456] | 0) == 0 ? Wa(22456) | 0 : 0) {
          if ((a[22464] | 0) == 0 ? Wa(22464) | 0 : 0) {
            c[5698] = 1065353216;
            c[5699] = 0;
            c[5700] = 0;
            c[5701] = 0;
            c[5702] = 0;
            c[5703] = 1065353216;
            c[5704] = 0;
            c[5705] = 0;
            c[5706] = 0;
            c[5707] = 0;
            c[5708] = 1065353216;
            g[5709] = 0.0;
            _a(22464);
          }
          c[5710] = c[5698];
          c[5711] = c[5699];
          c[5712] = c[5700];
          c[5713] = c[5701];
          c[5714] = c[5702];
          c[5715] = c[5703];
          c[5716] = c[5704];
          c[5717] = c[5705];
          c[5718] = c[5706];
          c[5719] = c[5707];
          c[5720] = c[5708];
          c[5721] = c[5709];
          c[5722] = 0;
          c[5723] = 0;
          c[5724] = 0;
          c[5725] = 0;
          _a(22456);
        }
        c[5755] = c[5710];
        c[5756] = c[5711];
        c[5757] = c[5712];
        c[5758] = c[5713];
        c[5759] = c[5714];
        c[5760] = c[5715];
        c[5761] = c[5716];
        c[5762] = c[5717];
        c[5763] = c[5718];
        c[5764] = c[5719];
        c[5765] = c[5720];
        c[5766] = c[5721];
        c[5767] = c[5722];
        c[5768] = c[5723];
        c[5769] = c[5724];
        c[5770] = c[5725];
        _a(22496);
      }
      d = c[(b + 8) >> 2] | 0;
      if (!d) {
        b = c[b >> 2] | 0;
        return ((b | 0) == 0 ? 23020 : (b + 60) | 0) | 0;
      } else return (d + 4) | 0;
      return 0;
    }
    function si(a, b, e) {
      a = a | 0;
      b = b | 0;
      e = e | 0;
      var f = 0,
        g = 0;
      c[b >> 2] =
        Zb[c[((c[e >> 2] | 0) + 28) >> 2] & 31](e, c[(a + 28) >> 2] | 0) | 0;
      c[(b + 4) >> 2] =
        Zb[c[((c[e >> 2] | 0) + 28) >> 2] & 31](e, c[(a + 32) >> 2] | 0) | 0;
      f = Zb[c[((c[e >> 2] | 0) + 40) >> 2] & 31](e, a) | 0;
      g = Zb[c[((c[e >> 2] | 0) + 28) >> 2] & 31](e, f) | 0;
      c[(b + 8) >> 2] = g;
      if (g | 0) Cb[c[((c[e >> 2] | 0) + 48) >> 2] & 127](e, f);
      c[(b + 12) >> 2] = c[(a + 4) >> 2];
      c[(b + 24) >> 2] = d[(a + 21) >> 0];
      c[(b + 40) >> 2] = c[(a + 24) >> 2];
      c[(b + 44) >> 2] = c[(a + 16) >> 2];
      c[(b + 48) >> 2] = d[(a + 20) >> 0];
      c[(b + 20) >> 2] = c[(a + 12) >> 2];
      c[(b + 16) >> 2] = c[(a + 8) >> 2];
      c[(b + 28) >> 2] = c[(a + 36) >> 2];
      c[(b + 32) >> 2] = c[(a + 40) >> 2];
      c[(b + 36) >> 2] = 0;
      f = c[(a + 28) >> 2] | 0;
      if ((c[(f + 488) >> 2] | 0) > 0) {
        e = 0;
        do {
          if ((c[((c[(f + 496) >> 2] | 0) + (e << 2)) >> 2] | 0) == (a | 0)) {
            c[(b + 36) >> 2] = 1;
            f = c[(a + 28) >> 2] | 0;
          }
          e = (e + 1) | 0;
        } while ((e | 0) < (c[(f + 488) >> 2] | 0));
      }
      f = c[(a + 32) >> 2] | 0;
      if ((c[(f + 488) >> 2] | 0) > 0) e = 0;
      else return 12632;
      do {
        if ((c[((c[(f + 496) >> 2] | 0) + (e << 2)) >> 2] | 0) == (a | 0)) {
          c[(b + 36) >> 2] = 1;
          f = c[(a + 32) >> 2] | 0;
        }
        e = (e + 1) | 0;
      } while ((e | 0) < (c[(f + 488) >> 2] | 0));
      return 12632;
    }
    function ti(b, d, e, f) {
      b = +b;
      d = d | 0;
      e = e | 0;
      f = f | 0;
      var h = 0,
        i = 0;
      while (1) {
        h = yc(140) | 0;
        if (h | 0) {
          i = 6;
          break;
        }
        h = c[6564] | 0;
        c[6564] = h + 0;
        if (!h) {
          i = 5;
          break;
        }
        jc[h & 3]();
      }
      if ((i | 0) == 5) {
        f = Ya(4) | 0;
        c[f >> 2] = 9640;
        pb(f | 0, 2800, 251);
      } else if ((i | 0) == 6) {
        g[h >> 2] = b;
        c[(h + 4) >> 2] = d;
        c[(h + 72) >> 2] = e;
        c[(h + 76) >> 2] = c[f >> 2];
        c[(h + 76 + 4) >> 2] = c[(f + 4) >> 2];
        c[(h + 76 + 8) >> 2] = c[(f + 8) >> 2];
        c[(h + 76 + 12) >> 2] = c[(f + 12) >> 2];
        g[(h + 92) >> 2] = 0.0;
        g[(h + 96) >> 2] = 0.0;
        g[(h + 100) >> 2] = 0.5;
        g[(h + 104) >> 2] = 0.0;
        g[(h + 108) >> 2] = 0.0;
        g[(h + 112) >> 2] = 0.800000011920929;
        g[(h + 116) >> 2] = 1.0;
        a[(h + 120) >> 0] = 0;
        g[(h + 124) >> 2] = 0.004999999888241291;
        g[(h + 128) >> 2] = 0.009999999776482582;
        g[(h + 132) >> 2] = 0.009999999776482582;
        g[(h + 136) >> 2] = 0.009999999776482582;
        c[(h + 8) >> 2] = 1065353216;
        c[(h + 12) >> 2] = 0;
        c[(h + 12 + 4) >> 2] = 0;
        c[(h + 12 + 8) >> 2] = 0;
        c[(h + 12 + 12) >> 2] = 0;
        c[(h + 28) >> 2] = 1065353216;
        c[(h + 32) >> 2] = 0;
        c[(h + 32 + 4) >> 2] = 0;
        c[(h + 32 + 8) >> 2] = 0;
        c[(h + 32 + 12) >> 2] = 0;
        c[(h + 48) >> 2] = 1065353216;
        c[(h + 52) >> 2] = 0;
        c[(h + 52 + 4) >> 2] = 0;
        c[(h + 52 + 8) >> 2] = 0;
        c[(h + 52 + 12) >> 2] = 0;
        c[(h + 52 + 16) >> 2] = 0;
        return h | 0;
      }
      return 0;
    }
    function ui(a, b, d) {
      a = a | 0;
      b = b | 0;
      d = d | 0;
      var e = 0,
        f = 0,
        g = 0,
        h = 0,
        i = 0,
        j = 0,
        k = 0;
      if (Eb[c[((c[d >> 2] | 0) + 16) >> 2] & 127](d) | 0) return;
      j = c[(b + 712) >> 2] | 0;
      i = Eb[c[((c[d >> 2] | 0) + 36) >> 2] & 127](d) | 0;
      if (
        Eb[c[((c[d >> 2] | 0) + 8) >> 2] & 127](d) | 0
          ? ((f = Eb[c[((c[d >> 2] | 0) + 20) >> 2] & 127](d) | 0),
            (h = Eb[c[((c[d >> 2] | 0) + 24) >> 2] & 127](d) | 0),
            (j | 0) > 0)
          : 0
      ) {
        e = c[(b + 720) >> 2] | 0;
        g = 0;
        a = (i + (f << 2)) | 0;
        while (1) {
          k = c[(e + ((g * 104) | 0) + 12) >> 2] | 0;
          f = c[(e + ((g * 104) | 0) + 16) >> 2] | 0;
          c[a >> 2] = c[(e + ((g * 104) | 0) + 8) >> 2];
          c[(a + 4) >> 2] = k;
          c[(a + 8) >> 2] = f;
          g = (g + 1) | 0;
          if ((g | 0) == (j | 0)) break;
          else a = (a + (h << 2)) | 0;
        }
      }
      if (!(Eb[c[((c[d >> 2] | 0) + 12) >> 2] & 127](d) | 0)) return;
      a = Eb[c[((c[d >> 2] | 0) + 28) >> 2] & 127](d) | 0;
      g = Eb[c[((c[d >> 2] | 0) + 32) >> 2] & 127](d) | 0;
      if ((j | 0) <= 0) return;
      f = c[(b + 720) >> 2] | 0;
      a = (i + (a << 2)) | 0;
      e = 0;
      while (1) {
        b = c[(f + ((e * 104) | 0) + 76) >> 2] | 0;
        k = c[(f + ((e * 104) | 0) + 80) >> 2] | 0;
        c[a >> 2] = c[(f + ((e * 104) | 0) + 72) >> 2];
        c[(a + 4) >> 2] = b;
        c[(a + 8) >> 2] = k;
        e = (e + 1) | 0;
        if ((e | 0) == (j | 0)) break;
        else a = (a + (g << 2)) | 0;
      }
      return;
    }
    function vi(a, b, d, e) {
      a = a | 0;
      b = b | 0;
      d = d | 0;
      e = e | 0;
      var f = 0.0,
        h = 0,
        j = 0,
        k = 0.0,
        l = 0,
        m = 0.0,
        n = 0.0,
        o = 0,
        p = 0,
        q = 0;
      q = i;
      i = (i + 16) | 0;
      if ((e | 0) <= 0) {
        i = q;
        return;
      }
      p = 0;
      do {
        o = (d + (p << 4)) | 0;
        f = +g[(a + 60) >> 2] * 0.5;
        h = c[(a + 68) >> 2] | 0;
        k = +g[(b + (p << 4)) >> 2];
        m = +g[(b + (p << 4) + 4) >> 2];
        n = +g[(b + (p << 4) + 8) >> 2];
        n = +O(+(k * k + m * m + n * n));
        j = c[(a + 64) >> 2] | 0;
        do
          if (!(+g[(b + (p << 4) + (h << 2)) >> 2] > n * +g[(a + 52) >> 2])) {
            k = +g[(b + (p << 4) + (j << 2)) >> 2];
            l = c[(a + 72) >> 2] | 0;
            m = +g[(b + (p << 4) + (l << 2)) >> 2];
            n = +O(+(k * k + m * m));
            if (n > 1.1920928955078125e-7) {
              n = +g[(a + 56) >> 2] / n;
              g[(q + (j << 2)) >> 2] = k * n;
              g[(q + (h << 2)) >> 2] = -f;
              g[(q + (l << 2)) >> 2] = m * n;
              break;
            } else {
              g[(q + (j << 2)) >> 2] = 0.0;
              g[(q + (h << 2)) >> 2] = -f;
              g[(q + (l << 2)) >> 2] = 0.0;
              break;
            }
          } else {
            g[(q + (j << 2)) >> 2] = 0.0;
            g[(q + (h << 2)) >> 2] = f;
            g[(q + (c[(a + 72) >> 2] << 2)) >> 2] = 0.0;
          }
        while (0);
        c[o >> 2] = c[q >> 2];
        c[(o + 4) >> 2] = c[(q + 4) >> 2];
        c[(o + 8) >> 2] = c[(q + 8) >> 2];
        c[(o + 12) >> 2] = c[(q + 12) >> 2];
        p = (p + 1) | 0;
      } while ((p | 0) != (e | 0));
      i = q;
      return;
    }
    function wi(b) {
      b = b | 0;
      var d = 0,
        e = 0,
        f = 0,
        g = 0,
        h = 0,
        i = 0,
        j = 0;
      c[b >> 2] = 9352;
      d = c[(b + 56) >> 2] | 0;
      if (d | 0) {
        if (a[(b + 60) >> 0] | 0) {
          c[6436] = (c[6436] | 0) + 1;
          hd(c[(d + -4) >> 2] | 0);
        }
        c[(b + 56) >> 2] = 0;
      }
      a[(b + 60) >> 0] = 1;
      c[(b + 56) >> 2] = 0;
      c[(b + 48) >> 2] = 0;
      c[(b + 52) >> 2] = 0;
      e = c[(b + 28) >> 2] | 0;
      if ((e | 0) > 0) {
        j = 0;
        do {
          f = c[(b + 36) >> 2] | 0;
          g = (f + ((j * 36) | 0) + 4) | 0;
          h = (f + ((j * 36) | 0) + 12) | 0;
          i = c[h >> 2] | 0;
          d = (f + ((j * 36) | 0) + 16) | 0;
          if (i | 0) {
            if (a[d >> 0] | 0) {
              c[6436] = (c[6436] | 0) + 1;
              hd(c[(i + -4) >> 2] | 0);
            }
            c[h >> 2] = 0;
          }
          a[d >> 0] = 1;
          c[h >> 2] = 0;
          c[g >> 2] = 0;
          c[(f + ((j * 36) | 0) + 8) >> 2] = 0;
          j = (j + 1) | 0;
        } while ((j | 0) != (e | 0));
      }
      d = c[(b + 36) >> 2] | 0;
      if (d | 0) {
        if (a[(b + 40) >> 0] | 0) {
          c[6436] = (c[6436] | 0) + 1;
          hd(c[(d + -4) >> 2] | 0);
        }
        c[(b + 36) >> 2] = 0;
      }
      a[(b + 40) >> 0] = 1;
      c[(b + 36) >> 2] = 0;
      c[(b + 28) >> 2] = 0;
      c[(b + 32) >> 2] = 0;
      d = c[(b + 16) >> 2] | 0;
      if (!d) {
        a[(b + 20) >> 0] = 1;
        c[(b + 16) >> 2] = 0;
        c[(b + 8) >> 2] = 0;
        b = (b + 12) | 0;
        c[b >> 2] = 0;
        return;
      }
      if (a[(b + 20) >> 0] | 0) {
        c[6436] = (c[6436] | 0) + 1;
        hd(c[(d + -4) >> 2] | 0);
      }
      c[(b + 16) >> 2] = 0;
      a[(b + 20) >> 0] = 1;
      c[(b + 16) >> 2] = 0;
      c[(b + 8) >> 2] = 0;
      b = (b + 12) | 0;
      c[b >> 2] = 0;
      return;
    }
    function xi(b) {
      b = b | 0;
      var d = 0;
      c[b >> 2] = 8452;
      d = c[(b + 156) >> 2] | 0;
      if (d | 0) {
        if (a[(b + 160) >> 0] | 0) {
          c[6436] = (c[6436] | 0) + 1;
          hd(c[(d + -4) >> 2] | 0);
        }
        c[(b + 156) >> 2] = 0;
      }
      a[(b + 160) >> 0] = 1;
      c[(b + 156) >> 2] = 0;
      c[(b + 148) >> 2] = 0;
      c[(b + 152) >> 2] = 0;
      d = c[(b + 136) >> 2] | 0;
      if (d | 0) {
        if (a[(b + 140) >> 0] | 0) {
          c[6436] = (c[6436] | 0) + 1;
          hd(c[(d + -4) >> 2] | 0);
        }
        c[(b + 136) >> 2] = 0;
      }
      a[(b + 140) >> 0] = 1;
      c[(b + 136) >> 2] = 0;
      c[(b + 128) >> 2] = 0;
      c[(b + 132) >> 2] = 0;
      d = c[(b + 116) >> 2] | 0;
      if (d | 0) {
        if (a[(b + 120) >> 0] | 0) {
          c[6436] = (c[6436] | 0) + 1;
          hd(c[(d + -4) >> 2] | 0);
        }
        c[(b + 116) >> 2] = 0;
      }
      a[(b + 120) >> 0] = 1;
      c[(b + 116) >> 2] = 0;
      c[(b + 108) >> 2] = 0;
      c[(b + 112) >> 2] = 0;
      d = c[(b + 96) >> 2] | 0;
      if (d | 0) {
        if (a[(b + 100) >> 0] | 0) {
          c[6436] = (c[6436] | 0) + 1;
          hd(c[(d + -4) >> 2] | 0);
        }
        c[(b + 96) >> 2] = 0;
      }
      a[(b + 100) >> 0] = 1;
      c[(b + 96) >> 2] = 0;
      c[(b + 88) >> 2] = 0;
      c[(b + 92) >> 2] = 0;
      c[b >> 2] = 9368;
      d = c[(b + 32) >> 2] | 0;
      if (!d) {
        a[(b + 36) >> 0] = 1;
        c[(b + 32) >> 2] = 0;
        c[(b + 24) >> 2] = 0;
        b = (b + 28) | 0;
        c[b >> 2] = 0;
        return;
      }
      if (a[(b + 36) >> 0] | 0) {
        c[6436] = (c[6436] | 0) + 1;
        hd(c[(d + -4) >> 2] | 0);
      }
      c[(b + 32) >> 2] = 0;
      a[(b + 36) >> 0] = 1;
      c[(b + 32) >> 2] = 0;
      c[(b + 24) >> 2] = 0;
      b = (b + 28) | 0;
      c[b >> 2] = 0;
      return;
    }
    function yi(b, d, e) {
      b = b | 0;
      d = d | 0;
      e = e | 0;
      var f = 0,
        g = 0,
        h = 0,
        i = 0,
        j = 0;
      i = c[(b + 4) >> 2] | 0;
      if ((i | 0) >= (d | 0)) {
        c[(b + 4) >> 2] = d;
        return;
      }
      if ((c[(b + 8) >> 2] | 0) < (d | 0)) {
        if (!d) {
          f = 0;
          g = i;
        } else {
          c[6435] = (c[6435] | 0) + 1;
          f = yc((((d << 4) | 3) + 16) | 0) | 0;
          if (!f) f = 0;
          else {
            c[(((f + 4 + 15) & -16) + -4) >> 2] = f;
            f = (f + 4 + 15) & -16;
          }
          g = c[(b + 4) >> 2] | 0;
        }
        if ((g | 0) > 0) {
          h = 0;
          do {
            j = c[(b + 12) >> 2] | 0;
            c[(f + (h << 4)) >> 2] = c[(j + (h << 4)) >> 2];
            c[(f + (h << 4) + 4) >> 2] = c[(j + (h << 4) + 4) >> 2];
            c[(f + (h << 4) + 8) >> 2] = c[(j + (h << 4) + 8) >> 2];
            c[(f + (h << 4) + 12) >> 2] = c[(j + (h << 4) + 12) >> 2];
            h = (h + 1) | 0;
          } while ((h | 0) != (g | 0));
        }
        g = c[(b + 12) >> 2] | 0;
        if (g | 0) {
          if (a[(b + 16) >> 0] | 0) {
            c[6436] = (c[6436] | 0) + 1;
            hd(c[(g + -4) >> 2] | 0);
          }
          c[(b + 12) >> 2] = 0;
        }
        a[(b + 16) >> 0] = 1;
        c[(b + 12) >> 2] = f;
        c[(b + 8) >> 2] = d;
        g = (b + 12) | 0;
      } else g = (b + 12) | 0;
      f = i;
      do {
        j = c[g >> 2] | 0;
        c[(j + (f << 4)) >> 2] = c[e >> 2];
        c[(j + (f << 4) + 4) >> 2] = c[(e + 4) >> 2];
        c[(j + (f << 4) + 8) >> 2] = c[(e + 8) >> 2];
        c[(j + (f << 4) + 12) >> 2] = c[(e + 12) >> 2];
        f = (f + 1) | 0;
      } while ((f | 0) != (d | 0));
      c[(b + 4) >> 2] = d;
      return;
    }
    function zi(b) {
      b = b | 0;
      var d = 0,
        e = 0;
      c[6435] = (c[6435] | 0) + 1;
      d = yc(635) | 0;
      if (!d) d = 0;
      else {
        c[(((d + 4 + 15) & -16) + -4) >> 2] = d;
        d = (d + 4 + 15) & -16;
      }
      c[(d + 164) >> 2] = 1065353216;
      c[(d + 168) >> 2] = 1065353216;
      c[(d + 172) >> 2] = 1065353216;
      g[(d + 176) >> 2] = 0.0;
      c[(d + 180) >> 2] = 0;
      g[(d + 184) >> 2] = 999999984306749440.0;
      e = (d + 188) | 0;
      c[e >> 2] = 0;
      c[(e + 4) >> 2] = 0;
      c[(e + 8) >> 2] = 0;
      c[(e + 12) >> 2] = 0;
      c[(d + 204) >> 2] = 1;
      c[(d + 208) >> 2] = -1;
      c[(d + 212) >> 2] = -1;
      c[(d + 216) >> 2] = 1;
      g[(d + 220) >> 2] = 0.0;
      g[(d + 224) >> 2] = 0.5;
      g[(d + 228) >> 2] = 0.0;
      g[(d + 232) >> 2] = 0.0;
      c[(d + 236) >> 2] = 1;
      c[(d + 240) >> 2] = 0;
      g[(d + 244) >> 2] = 1.0;
      e = (d + 248) | 0;
      c[e >> 2] = 0;
      c[(e + 4) >> 2] = 0;
      c[(e + 8) >> 2] = 0;
      c[(e + 12) >> 2] = 0;
      c[(d + 4) >> 2] = 1065353216;
      e = (d + 8) | 0;
      c[e >> 2] = 0;
      c[(e + 4) >> 2] = 0;
      c[(e + 8) >> 2] = 0;
      c[(e + 12) >> 2] = 0;
      c[(d + 24) >> 2] = 1065353216;
      e = (d + 28) | 0;
      c[e >> 2] = 0;
      c[(e + 4) >> 2] = 0;
      c[(e + 8) >> 2] = 0;
      c[(e + 12) >> 2] = 0;
      c[(d + 44) >> 2] = 1065353216;
      e = (d + 48) | 0;
      c[e >> 2] = 0;
      c[(e + 4) >> 2] = 0;
      c[(e + 8) >> 2] = 0;
      c[(e + 12) >> 2] = 0;
      c[(e + 16) >> 2] = 0;
      c[d >> 2] = 4108;
      a[(d + 500) >> 0] = 1;
      c[(d + 496) >> 2] = 0;
      c[(d + 488) >> 2] = 0;
      c[(d + 492) >> 2] = 0;
      Od(d, b);
      return d | 0;
    }
    function Ai(b) {
      b = b | 0;
      var d = 0;
      c[b >> 2] = 9012;
      d = c[(b + 160) >> 2] | 0;
      if (d | 0) {
        if (a[(b + 164) >> 0] | 0) {
          c[6436] = (c[6436] | 0) + 1;
          hd(c[(d + -4) >> 2] | 0);
        }
        c[(b + 160) >> 2] = 0;
      }
      a[(b + 164) >> 0] = 1;
      c[(b + 160) >> 2] = 0;
      c[(b + 152) >> 2] = 0;
      c[(b + 156) >> 2] = 0;
      d = c[(b + 136) >> 2] | 0;
      if (d | 0) {
        if (a[(b + 140) >> 0] | 0) {
          c[6436] = (c[6436] | 0) + 1;
          hd(c[(d + -4) >> 2] | 0);
        }
        c[(b + 136) >> 2] = 0;
      }
      a[(b + 140) >> 0] = 1;
      c[(b + 136) >> 2] = 0;
      c[(b + 128) >> 2] = 0;
      c[(b + 132) >> 2] = 0;
      d = c[(b + 116) >> 2] | 0;
      if (d | 0) {
        if (a[(b + 120) >> 0] | 0) {
          c[6436] = (c[6436] | 0) + 1;
          hd(c[(d + -4) >> 2] | 0);
        }
        c[(b + 116) >> 2] = 0;
      }
      a[(b + 120) >> 0] = 1;
      c[(b + 116) >> 2] = 0;
      c[(b + 108) >> 2] = 0;
      c[(b + 112) >> 2] = 0;
      d = c[(b + 96) >> 2] | 0;
      if (d | 0) {
        if (a[(b + 100) >> 0] | 0) {
          c[6436] = (c[6436] | 0) + 1;
          hd(c[(d + -4) >> 2] | 0);
        }
        c[(b + 96) >> 2] = 0;
      }
      a[(b + 100) >> 0] = 1;
      c[(b + 96) >> 2] = 0;
      c[(b + 88) >> 2] = 0;
      c[(b + 92) >> 2] = 0;
      d = c[(b + 76) >> 2] | 0;
      if (!d) {
        a[(b + 80) >> 0] = 1;
        c[(b + 76) >> 2] = 0;
        c[(b + 68) >> 2] = 0;
        b = (b + 72) | 0;
        c[b >> 2] = 0;
        return;
      }
      if (a[(b + 80) >> 0] | 0) {
        c[6436] = (c[6436] | 0) + 1;
        hd(c[(d + -4) >> 2] | 0);
      }
      c[(b + 76) >> 2] = 0;
      a[(b + 80) >> 0] = 1;
      c[(b + 76) >> 2] = 0;
      c[(b + 68) >> 2] = 0;
      b = (b + 72) | 0;
      c[b >> 2] = 0;
      return;
    }
    function Bi(b, d, e, f, g) {
      b = b | 0;
      d = d | 0;
      e = e | 0;
      f = f | 0;
      g = g | 0;
      do
        if ((b | 0) == (c[(d + 8) >> 2] | 0)) {
          if (
            (c[(d + 4) >> 2] | 0) == (e | 0) ? (c[(d + 28) >> 2] | 0) != 1 : 0
          )
            c[(d + 28) >> 2] = f;
        } else {
          if ((b | 0) != (c[d >> 2] | 0)) {
            b = c[(b + 8) >> 2] | 0;
            yb[c[((c[b >> 2] | 0) + 24) >> 2] & 31](b, d, e, f, g);
            break;
          }
          if (
            (c[(d + 16) >> 2] | 0) != (e | 0)
              ? (c[(d + 20) >> 2] | 0) != (e | 0)
              : 0
          ) {
            c[(d + 32) >> 2] = f;
            if ((c[(d + 44) >> 2] | 0) == 4) break;
            a[(d + 52) >> 0] = 0;
            a[(d + 53) >> 0] = 0;
            b = c[(b + 8) >> 2] | 0;
            Qb[c[((c[b >> 2] | 0) + 20) >> 2] & 7](b, d, e, e, 1, g);
            if (a[(d + 53) >> 0] | 0)
              if (!(a[(d + 52) >> 0] | 0)) {
                f = 1;
                b = 13;
              } else b = 17;
            else {
              f = 0;
              b = 13;
            }
            do
              if ((b | 0) == 13) {
                c[(d + 20) >> 2] = e;
                c[(d + 40) >> 2] = (c[(d + 40) >> 2] | 0) + 1;
                if (
                  (c[(d + 36) >> 2] | 0) == 1 ? (c[(d + 24) >> 2] | 0) == 2 : 0
                ) {
                  a[(d + 54) >> 0] = 1;
                  if (f) {
                    b = 17;
                    break;
                  } else {
                    f = 4;
                    break;
                  }
                }
                if (f) b = 17;
                else f = 4;
              }
            while (0);
            if ((b | 0) == 17) f = 3;
            c[(d + 44) >> 2] = f;
            break;
          }
          if ((f | 0) == 1) c[(d + 32) >> 2] = 1;
        }
      while (0);
      return;
    }
    function Ci(b) {
      b = b | 0;
      var d = 0;
      c[b >> 2] = 4816;
      d = c[(b + 144) >> 2] | 0;
      if (d | 0) {
        if (a[(b + 148) >> 0] | 0) {
          c[6436] = (c[6436] | 0) + 1;
          hd(c[(d + -4) >> 2] | 0);
        }
        c[(b + 144) >> 2] = 0;
      }
      a[(b + 148) >> 0] = 1;
      c[(b + 144) >> 2] = 0;
      c[(b + 136) >> 2] = 0;
      c[(b + 140) >> 2] = 0;
      d = c[(b + 76) >> 2] | 0;
      if (d | 0) {
        if (a[(b + 80) >> 0] | 0) {
          c[6436] = (c[6436] | 0) + 1;
          hd(c[(d + -4) >> 2] | 0);
        }
        c[(b + 76) >> 2] = 0;
      }
      a[(b + 80) >> 0] = 1;
      c[(b + 76) >> 2] = 0;
      c[(b + 68) >> 2] = 0;
      c[(b + 72) >> 2] = 0;
      d = c[(b + 56) >> 2] | 0;
      if (d | 0) {
        if (a[(b + 60) >> 0] | 0) {
          c[6436] = (c[6436] | 0) + 1;
          hd(c[(d + -4) >> 2] | 0);
        }
        c[(b + 56) >> 2] = 0;
      }
      a[(b + 60) >> 0] = 1;
      c[(b + 56) >> 2] = 0;
      c[(b + 48) >> 2] = 0;
      c[(b + 52) >> 2] = 0;
      d = c[(b + 36) >> 2] | 0;
      if (d | 0) {
        if (a[(b + 40) >> 0] | 0) {
          c[6436] = (c[6436] | 0) + 1;
          hd(c[(d + -4) >> 2] | 0);
        }
        c[(b + 36) >> 2] = 0;
      }
      a[(b + 40) >> 0] = 1;
      c[(b + 36) >> 2] = 0;
      c[(b + 28) >> 2] = 0;
      c[(b + 32) >> 2] = 0;
      d = c[(b + 16) >> 2] | 0;
      if (!d) {
        a[(b + 20) >> 0] = 1;
        c[(b + 16) >> 2] = 0;
        c[(b + 8) >> 2] = 0;
        b = (b + 12) | 0;
        c[b >> 2] = 0;
        return;
      }
      if (a[(b + 20) >> 0] | 0) {
        c[6436] = (c[6436] | 0) + 1;
        hd(c[(d + -4) >> 2] | 0);
      }
      c[(b + 16) >> 2] = 0;
      a[(b + 20) >> 0] = 1;
      c[(b + 16) >> 2] = 0;
      c[(b + 8) >> 2] = 0;
      b = (b + 12) | 0;
      c[b >> 2] = 0;
      return;
    }
    function Di(a, b, d, e) {
      a = a | 0;
      b = b | 0;
      d = d | 0;
      e = e | 0;
      var f = 0.0,
        h = 0.0,
        i = 0.0,
        j = 0.0,
        k = 0.0,
        l = 0.0,
        m = 0.0,
        n = 0.0,
        o = 0.0,
        p = 0.0,
        q = 0.0,
        r = 0.0,
        s = 0.0,
        t = 0.0,
        u = 0.0,
        v = 0.0,
        w = 0.0;
      o = (+g[(a + 32) >> 2] - +g[(a + 16) >> 2]) * +g[(a + 108) >> 2] * 0.5;
      m = (+g[(a + 36) >> 2] - +g[(a + 20) >> 2]) * +g[(a + 112) >> 2] * 0.5;
      k = (+g[(a + 40) >> 2] - +g[(a + 24) >> 2]) * +g[(a + 116) >> 2] * 0.5;
      t = +N(+(+g[b >> 2]));
      s = +N(+(+g[(b + 4) >> 2]));
      r = +N(+(+g[(b + 8) >> 2]));
      n = +N(+(+g[(b + 16) >> 2]));
      l = +N(+(+g[(b + 20) >> 2]));
      j = +N(+(+g[(b + 24) >> 2]));
      w = +N(+(+g[(b + 32) >> 2]));
      v = +N(+(+g[(b + 36) >> 2]));
      f = +N(+(+g[(b + 40) >> 2]));
      u = +g[(b + 48) >> 2];
      p = +g[(b + 52) >> 2];
      h = +g[(b + 56) >> 2];
      q = +Sb[c[((c[a >> 2] | 0) + 48) >> 2] & 15](a);
      i = +Sb[c[((c[a >> 2] | 0) + 48) >> 2] & 15](a);
      f = o * w + m * v + k * f + +Sb[c[((c[a >> 2] | 0) + 48) >> 2] & 15](a);
      g[d >> 2] = u - (o * t + m * s + k * r + q);
      g[(d + 4) >> 2] = p - (o * n + m * l + k * j + i);
      g[(d + 8) >> 2] = h - f;
      g[(d + 12) >> 2] = 0.0;
      g[e >> 2] = u + (o * t + m * s + k * r + q);
      g[(e + 4) >> 2] = p + (o * n + m * l + k * j + i);
      g[(e + 8) >> 2] = h + f;
      g[(e + 12) >> 2] = 0.0;
      return;
    }
    function Ei(b, d) {
      b = b | 0;
      d = d | 0;
      var e = 0,
        f = 0.0,
        h = 0.0,
        i = 0.0,
        j = 0.0,
        k = 0.0,
        l = 0;
      c[6435] = (c[6435] | 0) + 1;
      e = yc(379) | 0;
      if (!e) e = 0;
      else {
        c[(((e + 4 + 15) & -16) + -4) >> 2] = e;
        e = (e + 4 + 15) & -16;
      }
      c[(e + 4) >> 2] = 3;
      c[e >> 2] = 4432;
      c[(e + 8) >> 2] = -1;
      c[(e + 12) >> 2] = -1;
      g[(e + 16) >> 2] = 3402823466385288598117041.0e14;
      a[(e + 20) >> 0] = 1;
      a[(e + 21) >> 0] = 0;
      c[(e + 24) >> 2] = -1;
      c[(e + 28) >> 2] = b;
      Il();
      c[(e + 32) >> 2] = 23268;
      g[(e + 36) >> 2] = 0.0;
      g[(e + 40) >> 2] = 0.30000001192092896;
      c[(e + 44) >> 2] = 0;
      c[e >> 2] = 4544;
      l = (e + 300) | 0;
      c[l >> 2] = c[d >> 2];
      c[(l + 4) >> 2] = c[(d + 4) >> 2];
      c[(l + 8) >> 2] = c[(d + 8) >> 2];
      c[(l + 12) >> 2] = c[(d + 12) >> 2];
      k = +g[d >> 2];
      j = +g[(d + 4) >> 2];
      i = +g[(d + 8) >> 2];
      h =
        k * +g[(b + 20) >> 2] +
        j * +g[(b + 24) >> 2] +
        i * +g[(b + 28) >> 2] +
        +g[(b + 56) >> 2];
      f =
        k * +g[(b + 36) >> 2] +
        j * +g[(b + 40) >> 2] +
        i * +g[(b + 44) >> 2] +
        +g[(b + 60) >> 2];
      g[(e + 316) >> 2] =
        k * +g[(b + 4) >> 2] +
        j * +g[(b + 8) >> 2] +
        i * +g[(b + 12) >> 2] +
        +g[(b + 52) >> 2];
      g[(e + 320) >> 2] = h;
      g[(e + 324) >> 2] = f;
      g[(e + 328) >> 2] = 0.0;
      c[(e + 332) >> 2] = 0;
      a[(e + 344) >> 0] = 0;
      g[(e + 348) >> 2] = 0.30000001192092896;
      g[(e + 352) >> 2] = 1.0;
      g[(e + 356) >> 2] = 0.0;
      return e | 0;
    }
    function Fi(b, d, e) {
      b = +b;
      d = d | 0;
      e = e | 0;
      var f = 0,
        h = 0;
      while (1) {
        f = yc(140) | 0;
        if (f | 0) {
          h = 6;
          break;
        }
        f = c[6564] | 0;
        c[6564] = f + 0;
        if (!f) {
          h = 5;
          break;
        }
        jc[f & 3]();
      }
      if ((h | 0) == 5) {
        e = Ya(4) | 0;
        c[e >> 2] = 9640;
        pb(e | 0, 2800, 251);
      } else if ((h | 0) == 6) {
        g[f >> 2] = b;
        c[(f + 4) >> 2] = d;
        c[(f + 72) >> 2] = e;
        c[(f + 76) >> 2] = 0;
        c[(f + 76 + 4) >> 2] = 0;
        c[(f + 76 + 8) >> 2] = 0;
        c[(f + 76 + 12) >> 2] = 0;
        c[(f + 76 + 16) >> 2] = 0;
        c[(f + 76 + 20) >> 2] = 0;
        g[(f + 100) >> 2] = 0.5;
        g[(f + 104) >> 2] = 0.0;
        g[(f + 108) >> 2] = 0.0;
        g[(f + 112) >> 2] = 0.800000011920929;
        g[(f + 116) >> 2] = 1.0;
        a[(f + 120) >> 0] = 0;
        g[(f + 124) >> 2] = 0.004999999888241291;
        g[(f + 128) >> 2] = 0.009999999776482582;
        g[(f + 132) >> 2] = 0.009999999776482582;
        g[(f + 136) >> 2] = 0.009999999776482582;
        c[(f + 8) >> 2] = 1065353216;
        c[(f + 12) >> 2] = 0;
        c[(f + 12 + 4) >> 2] = 0;
        c[(f + 12 + 8) >> 2] = 0;
        c[(f + 12 + 12) >> 2] = 0;
        c[(f + 28) >> 2] = 1065353216;
        c[(f + 32) >> 2] = 0;
        c[(f + 32 + 4) >> 2] = 0;
        c[(f + 32 + 8) >> 2] = 0;
        c[(f + 32 + 12) >> 2] = 0;
        c[(f + 48) >> 2] = 1065353216;
        c[(f + 52) >> 2] = 0;
        c[(f + 52 + 4) >> 2] = 0;
        c[(f + 52 + 8) >> 2] = 0;
        c[(f + 52 + 12) >> 2] = 0;
        c[(f + 52 + 16) >> 2] = 0;
        return f | 0;
      }
      return 0;
    }
    function Gi(a, b, d) {
      a = a | 0;
      b = b | 0;
      d = d | 0;
      var e = 0,
        f = 0.0,
        h = 0.0,
        i = 0.0,
        j = 0.0,
        k = 0.0;
      e = c[b >> 2] | 0;
      if ((e | 0) == (c[(a + 80) >> 2] | 0)) {
        f = 1.0;
        return +f;
      }
      if ((c[(e + 204) >> 2] & 4) | 0) {
        f = 1.0;
        return +f;
      }
      if (
        (+g[(a + 28) >> 2] - +g[(a + 12) >> 2]) * +g[(b + 8) >> 2] +
          (+g[(a + 32) >> 2] - +g[(a + 16) >> 2]) * +g[(b + 12) >> 2] +
          (+g[(a + 36) >> 2] - +g[(a + 20) >> 2]) * +g[(b + 16) >> 2] >=
        -+g[(a + 84) >> 2]
      ) {
        f = 1.0;
        return +f;
      }
      c[(a + 4) >> 2] = c[(b + 40) >> 2];
      c[(a + 76) >> 2] = e;
      if (d) {
        c[(a + 44) >> 2] = c[(b + 8) >> 2];
        c[(a + 44 + 4) >> 2] = c[(b + 8 + 4) >> 2];
        c[(a + 44 + 8) >> 2] = c[(b + 8 + 8) >> 2];
        c[(a + 44 + 12) >> 2] = c[(b + 8 + 12) >> 2];
      } else {
        k = +g[(b + 8) >> 2];
        j = +g[(b + 12) >> 2];
        i = +g[(b + 16) >> 2];
        h =
          k * +g[(e + 20) >> 2] + j * +g[(e + 24) >> 2] + i * +g[(e + 28) >> 2];
        f =
          k * +g[(e + 36) >> 2] + j * +g[(e + 40) >> 2] + i * +g[(e + 44) >> 2];
        g[(a + 44) >> 2] =
          +g[(e + 4) >> 2] * k + +g[(e + 8) >> 2] * j + +g[(e + 12) >> 2] * i;
        g[(a + 48) >> 2] = h;
        g[(a + 52) >> 2] = f;
        g[(a + 56) >> 2] = 0.0;
      }
      c[(a + 60) >> 2] = c[(b + 24) >> 2];
      c[(a + 60 + 4) >> 2] = c[(b + 24 + 4) >> 2];
      c[(a + 60 + 8) >> 2] = c[(b + 24 + 8) >> 2];
      c[(a + 60 + 12) >> 2] = c[(b + 24 + 12) >> 2];
      k = +g[(b + 40) >> 2];
      return +k;
    }
    function Hi(a, b, d, e) {
      a = a | 0;
      b = b | 0;
      d = d | 0;
      e = e | 0;
      var f = 0,
        h = 0,
        j = 0,
        k = 0,
        l = 0;
      j = i;
      i = (i + 80) | 0;
      if ((e | 0) > 0) f = 0;
      else {
        i = j;
        return;
      }
      do {
        g[(d + (f << 4) + 12) >> 2] = -999999984306749440.0;
        f = (f + 1) | 0;
      } while ((f | 0) != (e | 0));
      f = (j + 32 + 4) | 0;
      h = 0;
      do {
        k = (b + (h << 4)) | 0;
        c[(j + 32) >> 2] = 7824;
        c[f >> 2] = 0;
        c[(f + 4) >> 2] = 0;
        c[(f + 8) >> 2] = 0;
        c[(f + 12) >> 2] = 0;
        g[(j + 32 + 20) >> 2] = -999999984306749440.0;
        c[(j + 32 + 24) >> 2] = c[k >> 2];
        c[(j + 32 + 24 + 4) >> 2] = c[(k + 4) >> 2];
        c[(j + 32 + 24 + 8) >> 2] = c[(k + 8) >> 2];
        c[(j + 32 + 24 + 12) >> 2] = c[(k + 12) >> 2];
        c[(j + 16) >> 2] = 1566444395;
        c[(j + 16 + 4) >> 2] = 1566444395;
        c[(j + 16 + 8) >> 2] = 1566444395;
        g[(j + 16 + 12) >> 2] = 0.0;
        k = c[(a + 92) >> 2] | 0;
        l = c[((c[k >> 2] | 0) + 8) >> 2] | 0;
        g[j >> 2] = -999999984306749440.0;
        g[(j + 4) >> 2] = -999999984306749440.0;
        g[(j + 8) >> 2] = -999999984306749440.0;
        g[(j + 12) >> 2] = 0.0;
        mc[l & 127](k, (j + 32) | 0, j, (j + 16) | 0);
        k = (d + (h << 4)) | 0;
        c[k >> 2] = c[f >> 2];
        c[(k + 4) >> 2] = c[(f + 4) >> 2];
        c[(k + 8) >> 2] = c[(f + 8) >> 2];
        c[(k + 12) >> 2] = c[(f + 12) >> 2];
        h = (h + 1) | 0;
      } while ((h | 0) < (e | 0));
      i = j;
      return;
    }
    function Ii(b, d, e) {
      b = b | 0;
      d = d | 0;
      e = e | 0;
      var f = 0,
        g = 0,
        h = 0,
        i = 0,
        j = 0,
        k = 0;
      f = c[(b + 96) >> 2] | 0;
      if (
        (f | 0) == (c[(b + 100) >> 2] | 0)
          ? ((i = f | 0 ? f << 1 : 1), (f | 0) < (i | 0))
          : 0
      ) {
        if (!i) h = 0;
        else {
          c[6435] = (c[6435] | 0) + 1;
          f = yc((((i << 4) | 3) + 16) | 0) | 0;
          if (!f) f = 0;
          else {
            c[(((f + 4 + 15) & -16) + -4) >> 2] = f;
            f = (f + 4 + 15) & -16;
          }
          h = f;
          f = c[(b + 96) >> 2] | 0;
        }
        if ((f | 0) > 0) {
          g = 0;
          do {
            j = (h + (g << 4)) | 0;
            k = ((c[(b + 104) >> 2] | 0) + (g << 4)) | 0;
            c[j >> 2] = c[k >> 2];
            c[(j + 4) >> 2] = c[(k + 4) >> 2];
            c[(j + 8) >> 2] = c[(k + 8) >> 2];
            c[(j + 12) >> 2] = c[(k + 12) >> 2];
            g = (g + 1) | 0;
          } while ((g | 0) != (f | 0));
        }
        f = c[(b + 104) >> 2] | 0;
        if (f | 0) {
          if (a[(b + 108) >> 0] | 0) {
            c[6436] = (c[6436] | 0) + 1;
            hd(c[(f + -4) >> 2] | 0);
          }
          c[(b + 104) >> 2] = 0;
        }
        a[(b + 108) >> 0] = 1;
        c[(b + 104) >> 2] = h;
        c[(b + 100) >> 2] = i;
        f = c[(b + 96) >> 2] | 0;
      }
      k = ((c[(b + 104) >> 2] | 0) + (f << 4)) | 0;
      c[k >> 2] = c[d >> 2];
      c[(k + 4) >> 2] = c[(d + 4) >> 2];
      c[(k + 8) >> 2] = c[(d + 8) >> 2];
      c[(k + 12) >> 2] = c[(d + 12) >> 2];
      c[(b + 96) >> 2] = (c[(b + 96) >> 2] | 0) + 1;
      if (!e) return;
      vj(b);
      return;
    }
    function Ji(b) {
      b = b | 0;
      var d = 0,
        e = 0,
        f = 0,
        h = 0;
      c[(b + 32) >> 2] = 262144;
      h = c[(b + 4) >> 2] | 0;
      if ((h | 0) < 2383) {
        if ((c[(b + 8) >> 2] | 0) < 2383) {
          c[6435] = (c[6435] | 0) + 1;
          d = yc(9551) | 0;
          if (!d) f = 0;
          else {
            c[(((d + 4 + 15) & -16) + -4) >> 2] = d;
            f = (d + 4 + 15) & -16;
          }
          d = c[(b + 4) >> 2] | 0;
          if ((d | 0) > 0) {
            e = 0;
            do {
              c[(f + (e << 2)) >> 2] =
                c[((c[(b + 12) >> 2] | 0) + (e << 2)) >> 2];
              e = (e + 1) | 0;
            } while ((e | 0) != (d | 0));
          }
          d = c[(b + 12) >> 2] | 0;
          if (d | 0) {
            if (a[(b + 16) >> 0] | 0) {
              c[6436] = (c[6436] | 0) + 1;
              hd(c[(d + -4) >> 2] | 0);
            }
            c[(b + 12) >> 2] = 0;
          }
          a[(b + 16) >> 0] = 1;
          c[(b + 12) >> 2] = f;
          c[(b + 8) >> 2] = 2383;
          e = (b + 12) | 0;
        } else e = (b + 12) | 0;
        d = h;
        do {
          c[((c[e >> 2] | 0) + (d << 2)) >> 2] = 0;
          d = (d + 1) | 0;
        } while ((d | 0) != 2383);
      }
      c[(b + 4) >> 2] = 2383;
      e = 0;
      do {
        h = ((c[(b + 12) >> 2] | 0) + (e << 2)) | 0;
        d = c[h >> 2] | 0;
        c[h >> 2] = 0;
        if (d | 0)
          do {
            h = d;
            d = c[(d + 280) >> 2] | 0;
            hd(h);
          } while ((d | 0) != 0);
        e = (e + 1) | 0;
      } while ((e | 0) != 2383);
      g[(b + 20) >> 2] = 0.25;
      c[(b + 24) >> 2] = 0;
      c[(b + 28) >> 2] = 0;
      c[(b + 36) >> 2] = 1;
      c[(b + 40) >> 2] = 1;
      return;
    }
    function Ki() {
      var b = 0,
        d = 0;
      c[6435] = (c[6435] | 0) + 1;
      b = yc(303) | 0;
      if (!b) b = 0;
      else {
        c[(((b + 4 + 15) & -16) + -4) >> 2] = b;
        b = (b + 4 + 15) & -16;
      }
      c[(b + 164) >> 2] = 1065353216;
      c[(b + 168) >> 2] = 1065353216;
      c[(b + 172) >> 2] = 1065353216;
      g[(b + 176) >> 2] = 0.0;
      c[(b + 180) >> 2] = 0;
      g[(b + 184) >> 2] = 999999984306749440.0;
      d = (b + 188) | 0;
      c[d >> 2] = 0;
      c[(d + 4) >> 2] = 0;
      c[(d + 8) >> 2] = 0;
      c[(d + 12) >> 2] = 0;
      c[(b + 204) >> 2] = 1;
      c[(b + 208) >> 2] = -1;
      c[(b + 212) >> 2] = -1;
      c[(b + 216) >> 2] = 1;
      g[(b + 220) >> 2] = 0.0;
      g[(b + 224) >> 2] = 0.5;
      g[(b + 228) >> 2] = 0.0;
      g[(b + 232) >> 2] = 0.0;
      c[(b + 240) >> 2] = 0;
      g[(b + 244) >> 2] = 1.0;
      d = (b + 248) | 0;
      c[d >> 2] = 0;
      c[(d + 4) >> 2] = 0;
      c[(d + 8) >> 2] = 0;
      c[(d + 12) >> 2] = 0;
      c[(b + 4) >> 2] = 1065353216;
      d = (b + 8) | 0;
      c[d >> 2] = 0;
      c[(d + 4) >> 2] = 0;
      c[(d + 8) >> 2] = 0;
      c[(d + 12) >> 2] = 0;
      c[(b + 24) >> 2] = 1065353216;
      d = (b + 28) | 0;
      c[d >> 2] = 0;
      c[(d + 4) >> 2] = 0;
      c[(d + 8) >> 2] = 0;
      c[(d + 12) >> 2] = 0;
      c[(b + 44) >> 2] = 1065353216;
      d = (b + 48) | 0;
      c[d >> 2] = 0;
      c[(d + 4) >> 2] = 0;
      c[(d + 8) >> 2] = 0;
      c[(d + 12) >> 2] = 0;
      c[(d + 16) >> 2] = 0;
      c[b >> 2] = 5044;
      a[(b + 280) >> 0] = 1;
      c[(b + 276) >> 2] = 0;
      c[(b + 268) >> 2] = 0;
      c[(b + 272) >> 2] = 0;
      c[(b + 236) >> 2] = 4;
      return b | 0;
    }
    function Li(a, b, d, e) {
      a = a | 0;
      b = b | 0;
      d = d | 0;
      e = e | 0;
      var f = 0,
        h = 0.0,
        i = 0.0,
        j = 0.0,
        k = 0.0,
        l = 0.0,
        m = 0.0,
        n = 0,
        o = 0,
        p = 0,
        q = 0.0,
        r = 0,
        s = 0.0,
        t = 0;
      if ((e | 0) > 0) f = 0;
      else return;
      do {
        g[(d + (f << 4) + 12) >> 2] = -999999984306749440.0;
        f = (f + 1) | 0;
      } while ((f | 0) != (e | 0));
      p = 0;
      do {
        h = +g[(a + 12) >> 2];
        i = +g[(b + (p << 4)) >> 2] * h;
        j = +g[(a + 16) >> 2];
        k = +g[(b + (p << 4) + 4) >> 2] * j;
        l = +g[(a + 20) >> 2];
        m = +g[(b + (p << 4) + 8) >> 2] * l;
        f = c[(a + 96) >> 2] | 0;
        if ((f | 0) > 0) {
          n = c[(a + 104) >> 2] | 0;
          o = 0;
          q = -3402823466385288598117041.0e14;
          r = -1;
          do {
            s =
              i * +g[(n + (o << 4)) >> 2] +
              k * +g[(n + (o << 4) + 4) >> 2] +
              m * +g[(n + (o << 4) + 8) >> 2];
            t = s > q;
            r = t ? o : r;
            q = t ? s : q;
            o = (o + 1) | 0;
          } while ((o | 0) != (f | 0));
          m = +g[(n + (r << 4) + 4) >> 2] * j;
          s = +g[(n + (r << 4) + 8) >> 2] * l;
          g[(d + (p << 4)) >> 2] = +g[(n + (r << 4)) >> 2] * h;
          g[(d + (p << 4) + 4) >> 2] = m;
          g[(d + (p << 4) + 8) >> 2] = s;
          g[(d + (p << 4) + 12) >> 2] = q;
        } else g[(d + (p << 4) + 12) >> 2] = -999999984306749440.0;
        p = (p + 1) | 0;
      } while ((p | 0) != (e | 0));
      return;
    }
    function Mi(a, b) {
      a = a | 0;
      b = b | 0;
      var d = 0,
        e = 0,
        f = 0;
      d = i;
      i = (i + 96) | 0;
      b = c[b >> 2] | 0;
      if ((b | 0) == (c[(a + 4) >> 2] | 0)) {
        i = d;
        return 1;
      }
      e = c[(a + 12) >> 2] | 0;
      if (
        !(Zb[c[((c[e >> 2] | 0) + 8) >> 2] & 31](e, c[(b + 188) >> 2] | 0) | 0)
      ) {
        i = d;
        return 1;
      }
      e = c[(a + 4) >> 2] | 0;
      f = c[(e + 192) >> 2] | 0;
      c[(d + 64) >> 2] = 0;
      c[(d + 64 + 4) >> 2] = f;
      c[(d + 64 + 8) >> 2] = e;
      c[(d + 64 + 12) >> 2] = e + 4;
      c[(d + 64 + 16) >> 2] = -1;
      c[(d + 64 + 20) >> 2] = -1;
      e = c[(b + 192) >> 2] | 0;
      c[(d + 40) >> 2] = 0;
      c[(d + 40 + 4) >> 2] = e;
      c[(d + 40 + 8) >> 2] = b;
      c[(d + 40 + 12) >> 2] = b + 4;
      c[(d + 40 + 16) >> 2] = -1;
      c[(d + 40 + 20) >> 2] = -1;
      b = c[((c[(a + 8) >> 2] | 0) + 24) >> 2] | 0;
      b =
        Ib[c[((c[b >> 2] | 0) + 8) >> 2] & 31](
          b,
          (d + 64) | 0,
          (d + 40) | 0,
          0
        ) | 0;
      if (b | 0) {
        f = c[(a + 12) >> 2] | 0;
        c[(d + 4) >> 2] = 0;
        c[(d + 8) >> 2] = d + 64;
        c[(d + 12) >> 2] = d + 40;
        c[d >> 2] = 5976;
        c[(d + 32) >> 2] = f;
        yb[c[((c[b >> 2] | 0) + 8) >> 2] & 31](
          b,
          (d + 64) | 0,
          (d + 40) | 0,
          ((c[(a + 8) >> 2] | 0) + 28) | 0,
          d
        );
        Ab[c[c[b >> 2] >> 2] & 255](b);
        f = c[((c[(a + 8) >> 2] | 0) + 24) >> 2] | 0;
        Cb[c[((c[f >> 2] | 0) + 60) >> 2] & 127](f, b);
      }
      i = d;
      return 1;
    }
    function Ni(a, b, d) {
      a = a | 0;
      b = b | 0;
      d = d | 0;
      var e = 0.0,
        f = 0,
        h = 0,
        j = 0,
        k = 0,
        l = 0;
      l = i;
      i = (i + 80) | 0;
      h = c[c[a >> 2] >> 2] | 0;
      j = c[c[(a + 4) >> 2] >> 2] | 0;
      if (!(Ob[c[((c[b >> 2] | 0) + 24) >> 2] & 63](b, h, j) | 0)) {
        i = l;
        return;
      }
      f = c[(h + 192) >> 2] | 0;
      c[(l + 56) >> 2] = 0;
      c[(l + 56 + 4) >> 2] = f;
      c[(l + 56 + 8) >> 2] = h;
      c[(l + 56 + 12) >> 2] = h + 4;
      c[(l + 56 + 16) >> 2] = -1;
      c[(l + 56 + 20) >> 2] = -1;
      f = c[(j + 192) >> 2] | 0;
      c[(l + 32) >> 2] = 0;
      c[(l + 32 + 4) >> 2] = f;
      c[(l + 32 + 8) >> 2] = j;
      c[(l + 32 + 12) >> 2] = j + 4;
      c[(l + 32 + 16) >> 2] = -1;
      c[(l + 32 + 20) >> 2] = -1;
      f = c[(a + 8) >> 2] | 0;
      if (!f) {
        f =
          Ib[c[((c[b >> 2] | 0) + 8) >> 2] & 31](
            b,
            (l + 56) | 0,
            (l + 32) | 0,
            0
          ) | 0;
        c[(a + 8) >> 2] = f;
        if (f | 0) k = 4;
      } else k = 4;
      if ((k | 0) == 4) {
        c[l >> 2] = 5604;
        c[(l + 4) >> 2] = 0;
        c[(l + 8) >> 2] = l + 56;
        c[(l + 12) >> 2] = l + 32;
        if ((c[(d + 8) >> 2] | 0) != 1) {
          e = +Mb[c[((c[f >> 2] | 0) + 12) >> 2] & 15](f, h, j, d, l);
          if (+g[(d + 12) >> 2] > e) g[(d + 12) >> 2] = e;
        } else
          yb[c[((c[f >> 2] | 0) + 8) >> 2] & 31](
            f,
            (l + 56) | 0,
            (l + 32) | 0,
            d,
            l
          );
      }
      i = l;
      return;
    }
    function Oi(b, d, e) {
      b = b | 0;
      d = d | 0;
      e = e | 0;
      var f = 0,
        g = 0,
        h = 0,
        i = 0;
      i = c[(d + 4) >> 2] | 0;
      f = c[(b + 24) >> 2] | 0;
      if ((f | 0) < (i | 0)) {
        if ((c[(b + 28) >> 2] | 0) < (i | 0)) {
          if (!i) {
            e = 0;
            g = f;
          } else {
            c[6435] = (c[6435] | 0) + 1;
            e = yc((((i << 2) | 3) + 16) | 0) | 0;
            if (!e) e = 0;
            else {
              c[(((e + 4 + 15) & -16) + -4) >> 2] = e;
              e = (e + 4 + 15) & -16;
            }
            g = c[(b + 24) >> 2] | 0;
          }
          if ((g | 0) > 0) {
            h = 0;
            do {
              c[(e + (h << 2)) >> 2] =
                c[((c[(b + 32) >> 2] | 0) + (h << 2)) >> 2];
              h = (h + 1) | 0;
            } while ((h | 0) != (g | 0));
          }
          g = c[(b + 32) >> 2] | 0;
          if (g | 0) {
            if (a[(b + 36) >> 0] | 0) {
              c[6436] = (c[6436] | 0) + 1;
              hd(c[(g + -4) >> 2] | 0);
            }
            c[(b + 32) >> 2] = 0;
          }
          a[(b + 36) >> 0] = 1;
          c[(b + 32) >> 2] = e;
          c[(b + 28) >> 2] = i;
          e = (b + 32) | 0;
        } else e = (b + 32) | 0;
        do {
          c[((c[e >> 2] | 0) + (f << 2)) >> 2] = 0;
          f = (f + 1) | 0;
        } while ((f | 0) != (i | 0));
      } else e = (b + 32) | 0;
      c[(b + 24) >> 2] = i;
      e = c[e >> 2] | 0;
      if ((i | 0) <= 0) return;
      f = 0;
      do {
        c[(e + (f << 2)) >> 2] = c[((c[(d + 12) >> 2] | 0) + (f << 2)) >> 2];
        f = (f + 1) | 0;
      } while ((f | 0) != (i | 0));
      return;
    }
    function Pi(b, d) {
      b = b | 0;
      d = d | 0;
      var e = 0,
        f = 0,
        g = 0,
        h = 0;
      e = c[(b + 488) >> 2] | 0;
      a: do
        if ((e | 0) > 0) {
          g = c[(b + 496) >> 2] | 0;
          f = 0;
          while (1) {
            if ((c[(g + (f << 2)) >> 2] | 0) == (d | 0)) break;
            f = (f + 1) | 0;
            if ((f | 0) >= (e | 0)) break a;
          }
          if ((f | 0) != (e | 0)) {
            b = (b + 256) | 0;
            c[b >> 2] = 1;
            return;
          }
        }
      while (0);
      if (
        (e | 0) == (c[(b + 492) >> 2] | 0)
          ? ((h = e | 0 ? e << 1 : 1), (e | 0) < (h | 0))
          : 0
      ) {
        if (!h) g = 0;
        else {
          c[6435] = (c[6435] | 0) + 1;
          e = yc((((h << 2) | 3) + 16) | 0) | 0;
          if (!e) e = 0;
          else {
            c[(((e + 4 + 15) & -16) + -4) >> 2] = e;
            e = (e + 4 + 15) & -16;
          }
          g = e;
          e = c[(b + 488) >> 2] | 0;
        }
        if ((e | 0) > 0) {
          f = 0;
          do {
            c[(g + (f << 2)) >> 2] =
              c[((c[(b + 496) >> 2] | 0) + (f << 2)) >> 2];
            f = (f + 1) | 0;
          } while ((f | 0) != (e | 0));
        }
        f = c[(b + 496) >> 2] | 0;
        if (f) {
          if (a[(b + 500) >> 0] | 0) {
            c[6436] = (c[6436] | 0) + 1;
            hd(c[(f + -4) >> 2] | 0);
            e = c[(b + 488) >> 2] | 0;
          }
          c[(b + 496) >> 2] = 0;
        }
        a[(b + 500) >> 0] = 1;
        c[(b + 496) >> 2] = g;
        c[(b + 492) >> 2] = h;
      }
      c[((c[(b + 496) >> 2] | 0) + (e << 2)) >> 2] = d;
      c[(b + 488) >> 2] = e + 1;
      b = (b + 256) | 0;
      c[b >> 2] = 1;
      return;
    }
    function Qi(a, b, c, d, e, f, h, i, j, k, l) {
      a = a | 0;
      b = b | 0;
      c = +c;
      d = +d;
      e = +e;
      f = +f;
      h = +h;
      i = +i;
      j = j | 0;
      k = k | 0;
      l = +l;
      var m = 0.0,
        n = 0.0,
        o = 0.0,
        p = 0.0,
        q = 0.0,
        r = 0.0,
        s = 0.0,
        t = 0.0,
        u = 0.0,
        v = 0.0,
        w = 0.0,
        x = 0.0;
      x = +g[a >> 2] * f + +g[(a + 16) >> 2] * h + +g[(a + 32) >> 2] * i;
      v = +g[(a + 4) >> 2] * f + +g[(a + 20) >> 2] * h + +g[(a + 36) >> 2] * i;
      t = +g[(a + 8) >> 2] * f + +g[(a + 24) >> 2] * h + +g[(a + 40) >> 2] * i;
      s = +g[b >> 2] * f + +g[(b + 16) >> 2] * h + +g[(b + 32) >> 2] * i;
      q = +g[(b + 4) >> 2] * f + +g[(b + 20) >> 2] * h + +g[(b + 36) >> 2] * i;
      o = +g[(b + 8) >> 2] * f + +g[(b + 24) >> 2] * h + +g[(b + 40) >> 2] * i;
      w = +g[(j + 80) >> 2];
      u = +g[(j + 84) >> 2];
      p = +g[(j + 88) >> 2];
      r = +g[(k + 80) >> 2];
      m = +g[(k + 84) >> 2];
      n = +g[(k + 88) >> 2];
      p =
        x * (x < 0.0 ? -w : w) +
        v * (v < 0.0 ? -u : u) +
        t * (t < 0.0 ? -p : p);
      n =
        s * (s < 0.0 ? -r : r) +
        q * (q < 0.0 ? -m : m) +
        o * (o < 0.0 ? -n : n);
      o = +g[(j + 96) >> 2];
      m = +g[(k + 96) >> 2];
      m = (p > o ? p : o) + (n > m ? n : m);
      return (
        !(
          (c * f + d * h + e * i + m < m - (c * f + d * h + e * i)
            ? c * f + d * h + e * i + m
            : m - (c * f + d * h + e * i)) > l
        ) | 0
      );
    }
    function Ri(b) {
      b = b | 0;
      var d = 0,
        e = 0,
        f = 0,
        g = 0;
      c[b >> 2] = 8724;
      a[(b + 20) >> 0] = 1;
      c[(b + 16) >> 2] = 0;
      c[(b + 8) >> 2] = 0;
      c[(b + 12) >> 2] = 0;
      c[(b + 24) >> 2] = 0;
      a[(b + 28) >> 0] = 0;
      a[(b + 48) >> 0] = 1;
      c[(b + 44) >> 2] = 0;
      c[(b + 36) >> 2] = 0;
      c[(b + 40) >> 2] = 0;
      a[(b + 68) >> 0] = 1;
      c[(b + 64) >> 2] = 0;
      c[(b + 56) >> 2] = 0;
      c[(b + 60) >> 2] = 0;
      c[(b + 72) >> 2] = 0;
      c[6435] = (c[6435] | 0) + 1;
      d = yc(51) | 0;
      if (!d) f = 0;
      else {
        c[(((d + 4 + 15) & -16) + -4) >> 2] = d;
        f = (d + 4 + 15) & -16;
      }
      d = c[(b + 8) >> 2] | 0;
      if ((d | 0) > 0) {
        e = 0;
        do {
          g = c[(b + 16) >> 2] | 0;
          c[(f + (e << 4)) >> 2] = c[(g + (e << 4)) >> 2];
          c[(f + (e << 4) + 4) >> 2] = c[(g + (e << 4) + 4) >> 2];
          c[(f + (e << 4) + 8) >> 2] = c[(g + (e << 4) + 8) >> 2];
          c[(f + (e << 4) + 12) >> 2] = c[(g + (e << 4) + 12) >> 2];
          e = (e + 1) | 0;
        } while ((e | 0) != (d | 0));
      }
      d = c[(b + 16) >> 2] | 0;
      if (!d) {
        a[(b + 20) >> 0] = 1;
        c[(b + 16) >> 2] = f;
        c[(b + 12) >> 2] = 2;
        Hf(b);
        return;
      }
      if (a[(b + 20) >> 0] | 0) {
        c[6436] = (c[6436] | 0) + 1;
        hd(c[(d + -4) >> 2] | 0);
      }
      c[(b + 16) >> 2] = 0;
      a[(b + 20) >> 0] = 1;
      c[(b + 16) >> 2] = f;
      c[(b + 12) >> 2] = 2;
      Hf(b);
      return;
    }
    function Si(a, b, d) {
      a = a | 0;
      b = b | 0;
      d = d | 0;
      do
        if (!(((b | 0) == 32) & ((d | 0) == 32))) {
          if ((b | 0) == 32) {
            if ((d | 0) < 20) {
              b = (a + 96) | 0;
              break;
            }
            if (((d + -21) | 0) >>> 0 < 9) {
              b = (a + 104) | 0;
              break;
            }
          } else {
            if (((b | 0) < 20) & ((d | 0) == 32)) {
              b = (a + 100) | 0;
              break;
            }
            if ((((b + -21) | 0) >>> 0 < 9) & ((d | 0) == 32)) {
              b = (a + 108) | 0;
              break;
            }
            if (((b | 0) == 8) & ((d | 0) == 8)) {
              b = (a + 60) | 0;
              break;
            }
            if (((b | 0) == 8) & ((d | 0) == 1)) {
              b = (a + 76) | 0;
              break;
            }
            if (((b | 0) == 1) & ((d | 0) == 8)) {
              b = (a + 80) | 0;
              break;
            }
          }
          if (!(d | b)) {
            b = (a + 72) | 0;
            break;
          }
          if (((b | 0) < 20) & ((d | 0) == 28)) {
            b = (a + 88) | 0;
            break;
          }
          if (((b | 0) == 28) & ((d | 0) < 20)) {
            b = (a + 84) | 0;
            break;
          }
          if ((b | 0) < 20) {
            if ((d | 0) < 20) {
              b = (a + 32) | 0;
              break;
            }
            if (((d + -21) | 0) >>> 0 < 9) {
              b = (a + 36) | 0;
              break;
            }
          } else {
            if (((d | 0) < 20) & (((b + -21) | 0) >>> 0 < 9)) {
              b = (a + 40) | 0;
              break;
            }
            if ((b | 0) == 31)
              if ((d | 0) == 31) {
                b = (a + 48) | 0;
                break;
              } else {
                b = (a + 44) | 0;
                break;
              }
          }
          if ((d | 0) == 31) {
            b = (a + 52) | 0;
            break;
          } else {
            b = (a + 56) | 0;
            break;
          }
        } else b = (a + 92) | 0;
      while (0);
      return c[b >> 2] | 0;
    }
    function Ti(a, b, d, e, f, h, j, k, l) {
      a = a | 0;
      b = b | 0;
      d = d | 0;
      e = e | 0;
      f = f | 0;
      h = h | 0;
      j = j | 0;
      k = k | 0;
      l = l | 0;
      var m = 0,
        n = 0,
        o = 0;
      o = i;
      i = (i + 16) | 0;
      li(12899);
      Xb[c[((c[a >> 2] | 0) + 32) >> 2] & 1](a, b, d, e, f, h, j, k, l);
      n = c[(a + 184) >> 2] | 0;
      m = c[(k + 20) >> 2] | 0;
      m = (n | 0) > (m | 0) ? n : m;
      if ((m | 0) > 0) {
        n = 0;
        do {
          +$b[c[((c[a >> 2] | 0) + 40) >> 2] & 3](a, n, b, d, e, f, h, j, k, l);
          n = (n + 1) | 0;
        } while ((n | 0) < (m | 0));
      }
      m = c[2357] | 0;
      a = ((c[(m + 16) >> 2] | 0) + -1) | 0;
      c[(m + 16) >> 2] = a;
      if (a | 0) {
        i = o;
        return 0.0;
      }
      do
        if (c[(m + 4) >> 2] | 0) {
          tb(o | 0, 0) | 0;
          a = c[6434] | 0;
          g[(m + 8) >> 2] =
            +g[(m + 8) >> 2] +
            +(
              (((c[(o + 4) >> 2] | 0) -
                (c[(a + 4) >> 2] | 0) +
                (((((c[o >> 2] | 0) - (c[a >> 2] | 0)) | 0) * 1e6) | 0) -
                (c[(m + 12) >> 2] | 0)) |
                0) >>>
              0
            ) /
              1.0e3;
          if (!(c[(m + 16) >> 2] | 0)) {
            m = c[2357] | 0;
            break;
          } else {
            i = o;
            return 0.0;
          }
        }
      while (0);
      c[2357] = c[(m + 20) >> 2];
      i = o;
      return 0.0;
    }
    function Ui(b, d, e) {
      b = b | 0;
      d = d | 0;
      e = e | 0;
      var f = 0,
        g = 0,
        h = 0;
      g = c[d >> 2] | 0;
      d = c[(b + 268) >> 2] | 0;
      a: do
        if ((d | 0) > 0) {
          f = c[(b + 276) >> 2] | 0;
          e = 0;
          while (1) {
            if ((c[(f + (e << 2)) >> 2] | 0) == (g | 0)) break;
            e = (e + 1) | 0;
            if ((e | 0) >= (d | 0)) break a;
          }
          if ((e | 0) != (d | 0)) return;
        }
      while (0);
      if (
        (d | 0) == (c[(b + 272) >> 2] | 0)
          ? ((h = d | 0 ? d << 1 : 1), (d | 0) < (h | 0))
          : 0
      ) {
        if (!h) f = 0;
        else {
          c[6435] = (c[6435] | 0) + 1;
          d = yc((((h << 2) | 3) + 16) | 0) | 0;
          if (!d) d = 0;
          else {
            c[(((d + 4 + 15) & -16) + -4) >> 2] = d;
            d = (d + 4 + 15) & -16;
          }
          f = d;
          d = c[(b + 268) >> 2] | 0;
        }
        if ((d | 0) > 0) {
          e = 0;
          do {
            c[(f + (e << 2)) >> 2] =
              c[((c[(b + 276) >> 2] | 0) + (e << 2)) >> 2];
            e = (e + 1) | 0;
          } while ((e | 0) != (d | 0));
        }
        e = c[(b + 276) >> 2] | 0;
        if (e) {
          if (a[(b + 280) >> 0] | 0) {
            c[6436] = (c[6436] | 0) + 1;
            hd(c[(e + -4) >> 2] | 0);
            d = c[(b + 268) >> 2] | 0;
          }
          c[(b + 276) >> 2] = 0;
        }
        a[(b + 280) >> 0] = 1;
        c[(b + 276) >> 2] = f;
        c[(b + 272) >> 2] = h;
      }
      c[((c[(b + 276) >> 2] | 0) + (d << 2)) >> 2] = g;
      c[(b + 268) >> 2] = d + 1;
      return;
    }
    function Vi(a, b) {
      a = a | 0;
      b = b | 0;
      var d = 0,
        e = 0,
        f = 0,
        g = 0,
        h = 0;
      f = c[(a + 232) >> 2] | 0;
      a: do
        if ((f | 0) > 0) {
          g = c[(a + 240) >> 2] | 0;
          d = 0;
          while (1) {
            e = (g + (d << 2)) | 0;
            if ((c[e >> 2] | 0) == (b | 0)) break;
            d = (d + 1) | 0;
            if ((d | 0) >= (f | 0)) break a;
          }
          if ((d | 0) < (f | 0)) {
            c[e >> 2] = c[(g + ((f + -1) << 2)) >> 2];
            c[((c[(a + 240) >> 2] | 0) + ((f + -1) << 2)) >> 2] = b;
            c[(a + 232) >> 2] = f + -1;
          }
        }
      while (0);
      d = c[(b + 188) >> 2] | 0;
      if (d | 0) {
        g = c[(a + 68) >> 2] | 0;
        g = Eb[c[((c[g >> 2] | 0) + 36) >> 2] & 127](g) | 0;
        ic[c[((c[g >> 2] | 0) + 40) >> 2] & 127](g, d, c[(a + 24) >> 2] | 0);
        g = c[(a + 68) >> 2] | 0;
        ic[c[((c[g >> 2] | 0) + 12) >> 2] & 127](g, d, c[(a + 24) >> 2] | 0);
        c[(b + 188) >> 2] = 0;
      }
      f = c[(a + 8) >> 2] | 0;
      if ((f | 0) <= 0) return;
      g = c[(a + 16) >> 2] | 0;
      d = 0;
      while (1) {
        e = (g + (d << 2)) | 0;
        if ((c[e >> 2] | 0) == (b | 0)) break;
        d = (d + 1) | 0;
        if ((d | 0) >= (f | 0)) {
          h = 15;
          break;
        }
      }
      if ((h | 0) == 15) return;
      if ((d | 0) >= (f | 0)) return;
      c[e >> 2] = c[(g + ((f + -1) << 2)) >> 2];
      c[((c[(a + 16) >> 2] | 0) + ((f + -1) << 2)) >> 2] = b;
      c[(a + 8) >> 2] = f + -1;
      return;
    }
    function Wi(a, b) {
      a = a | 0;
      b = b | 0;
      var d = 0,
        e = 0,
        f = 0,
        g = 0,
        h = 0;
      f = c[(a + 328) >> 2] | 0;
      a: do
        if ((f | 0) > 0) {
          g = c[(a + 336) >> 2] | 0;
          d = 0;
          while (1) {
            e = (g + (d << 2)) | 0;
            if ((c[e >> 2] | 0) == (b | 0)) break;
            d = (d + 1) | 0;
            if ((d | 0) >= (f | 0)) break a;
          }
          if ((d | 0) < (f | 0)) {
            c[e >> 2] = c[(g + ((f + -1) << 2)) >> 2];
            c[((c[(a + 336) >> 2] | 0) + ((f + -1) << 2)) >> 2] = b;
            c[(a + 328) >> 2] = f + -1;
          }
        }
      while (0);
      d = c[(b + 188) >> 2] | 0;
      if (d | 0) {
        g = c[(a + 68) >> 2] | 0;
        g = Eb[c[((c[g >> 2] | 0) + 36) >> 2] & 127](g) | 0;
        ic[c[((c[g >> 2] | 0) + 40) >> 2] & 127](g, d, c[(a + 24) >> 2] | 0);
        g = c[(a + 68) >> 2] | 0;
        ic[c[((c[g >> 2] | 0) + 12) >> 2] & 127](g, d, c[(a + 24) >> 2] | 0);
        c[(b + 188) >> 2] = 0;
      }
      f = c[(a + 8) >> 2] | 0;
      if ((f | 0) <= 0) return;
      g = c[(a + 16) >> 2] | 0;
      d = 0;
      while (1) {
        e = (g + (d << 2)) | 0;
        if ((c[e >> 2] | 0) == (b | 0)) break;
        d = (d + 1) | 0;
        if ((d | 0) >= (f | 0)) {
          h = 15;
          break;
        }
      }
      if ((h | 0) == 15) return;
      if ((d | 0) >= (f | 0)) return;
      c[e >> 2] = c[(g + ((f + -1) << 2)) >> 2];
      c[((c[(a + 16) >> 2] | 0) + ((f + -1) << 2)) >> 2] = b;
      c[(a + 8) >> 2] = f + -1;
      return;
    }
    function Xi(b, d) {
      b = b | 0;
      d = d | 0;
      var e = 0,
        f = 0,
        g = 0,
        h = 0,
        i = 0;
      i = c[(d + 4) >> 2] | 0;
      e = c[(b + 872) >> 2] | 0;
      a: do
        if ((e | 0) > (i | 0)) e = (b + 880) | 0;
        else {
          if ((e | 0) < (i | 0) ? (c[(b + 876) >> 2] | 0) < (i | 0) : 0) {
            if (
              (i | 0) != 0
                ? ((c[6435] = (c[6435] | 0) + 1),
                  (f = yc((((i << 2) | 3) + 16) | 0) | 0),
                  (f | 0) != 0)
                : 0
            ) {
              c[(((f + 4 + 15) & -16) + -4) >> 2] = f;
              h = (f + 4 + 15) & -16;
            } else h = 0;
            f = c[(b + 872) >> 2] | 0;
            g = 0;
            while (1) {
              if ((g | 0) >= (f | 0)) break;
              c[(h + (g << 2)) >> 2] =
                c[((c[(b + 880) >> 2] | 0) + (g << 2)) >> 2];
              g = (g + 1) | 0;
            }
            f = c[(b + 880) >> 2] | 0;
            if (f | 0) {
              if (!(((a[(b + 884) >> 0] & 1) == 0) | ((f | 0) == 0))) {
                c[6436] = (c[6436] | 0) + 1;
                hd(c[(f + -4) >> 2] | 0);
              }
              c[(b + 880) >> 2] = 0;
            }
            a[(b + 884) >> 0] = 1;
            c[(b + 880) >> 2] = h;
            c[(b + 876) >> 2] = i;
          }
          while (1) {
            if ((e | 0) >= (i | 0)) {
              e = (b + 880) | 0;
              break a;
            }
            c[((c[(b + 880) >> 2] | 0) + (e << 2)) >> 2] = 0;
            e = (e + 1) | 0;
          }
        }
      while (0);
      c[(b + 872) >> 2] = i;
      e = c[e >> 2] | 0;
      f = 0;
      while (1) {
        if ((f | 0) >= (i | 0)) break;
        c[(e + (f << 2)) >> 2] = c[((c[(d + 12) >> 2] | 0) + (f << 2)) >> 2];
        f = (f + 1) | 0;
      }
      return;
    }
    function Yi(b, d) {
      b = b | 0;
      d = d | 0;
      var e = 0,
        f = 0,
        g = 0,
        h = 0,
        i = 0;
      i = c[(d + 4) >> 2] | 0;
      e = c[(b + 4) >> 2] | 0;
      a: do
        if ((e | 0) > (i | 0)) e = (b + 12) | 0;
        else {
          if ((e | 0) < (i | 0) ? (c[(b + 8) >> 2] | 0) < (i | 0) : 0) {
            if (
              (i | 0) != 0
                ? ((c[6435] = (c[6435] | 0) + 1),
                  (f = yc((((i << 2) | 3) + 16) | 0) | 0),
                  (f | 0) != 0)
                : 0
            ) {
              c[(((f + 4 + 15) & -16) + -4) >> 2] = f;
              h = (f + 4 + 15) & -16;
            } else h = 0;
            f = c[(b + 4) >> 2] | 0;
            g = 0;
            while (1) {
              if ((g | 0) >= (f | 0)) break;
              c[(h + (g << 2)) >> 2] =
                c[((c[(b + 12) >> 2] | 0) + (g << 2)) >> 2];
              g = (g + 1) | 0;
            }
            f = c[(b + 12) >> 2] | 0;
            if (f | 0) {
              if (!(((a[(b + 16) >> 0] & 1) == 0) | ((f | 0) == 0))) {
                c[6436] = (c[6436] | 0) + 1;
                hd(c[(f + -4) >> 2] | 0);
              }
              c[(b + 12) >> 2] = 0;
            }
            a[(b + 16) >> 0] = 1;
            c[(b + 12) >> 2] = h;
            c[(b + 8) >> 2] = i;
          }
          while (1) {
            if ((e | 0) >= (i | 0)) {
              e = (b + 12) | 0;
              break a;
            }
            c[((c[(b + 12) >> 2] | 0) + (e << 2)) >> 2] = 0;
            e = (e + 1) | 0;
          }
        }
      while (0);
      c[(b + 4) >> 2] = i;
      e = c[e >> 2] | 0;
      f = 0;
      while (1) {
        if ((f | 0) >= (i | 0)) break;
        c[(e + (f << 2)) >> 2] = c[((c[(d + 12) >> 2] | 0) + (f << 2)) >> 2];
        f = (f + 1) | 0;
      }
      return;
    }
    function Zi(b) {
      b = b | 0;
      var d = 0,
        e = 0;
      d = c[(b + 92) >> 2] | 0;
      if (d | 0) {
        if (a[(b + 96) >> 0] | 0) {
          c[6436] = (c[6436] | 0) + 1;
          hd(c[(d + -4) >> 2] | 0);
        }
        c[(b + 92) >> 2] = 0;
      }
      a[(b + 96) >> 0] = 1;
      c[(b + 92) >> 2] = 0;
      c[(b + 84) >> 2] = 0;
      c[(b + 88) >> 2] = 0;
      d = c[(b + 64) >> 2] | 0;
      if (d | 0)
        do {
          c[(b + 64) >> 2] = c[(d + 8) >> 2];
          e = c[d >> 2] | 0;
          if (e | 0) {
            c[6436] = (c[6436] | 0) + 1;
            hd(c[(e + -4) >> 2] | 0);
          }
          c[6436] = (c[6436] | 0) + 1;
          hd(c[(d + -4) >> 2] | 0);
          d = c[(b + 64) >> 2] | 0;
        } while ((d | 0) != 0);
      d = c[(b + 48) >> 2] | 0;
      if (d | 0)
        do {
          c[(b + 48) >> 2] = c[(d + 8) >> 2];
          e = c[d >> 2] | 0;
          if (e | 0) {
            c[6436] = (c[6436] | 0) + 1;
            hd(c[(e + -4) >> 2] | 0);
          }
          c[6436] = (c[6436] | 0) + 1;
          hd(c[(d + -4) >> 2] | 0);
          d = c[(b + 48) >> 2] | 0;
        } while ((d | 0) != 0);
      d = c[(b + 32) >> 2] | 0;
      if (!d) return;
      do {
        c[(b + 32) >> 2] = c[(d + 8) >> 2];
        e = c[d >> 2] | 0;
        if (e | 0) {
          c[6436] = (c[6436] | 0) + 1;
          hd(c[(e + -4) >> 2] | 0);
        }
        c[6436] = (c[6436] | 0) + 1;
        hd(c[(d + -4) >> 2] | 0);
        d = c[(b + 32) >> 2] | 0;
      } while ((d | 0) != 0);
      return;
    }
    function _i(b, d, e, f) {
      b = b | 0;
      d = d | 0;
      e = e | 0;
      f = f | 0;
      var g = 0,
        h = 0,
        i = 0,
        j = 0;
      h = c[d >> 2] | 0;
      h = Zb[c[((c[h >> 2] | 0) + 56) >> 2] & 31](h, 28) | 0;
      j = (a[(b + 4) >> 0] | 0) == 0;
      i = c[(b + 8) >> 2] | 0;
      g = c[(b + 12) >> 2] | 0;
      b = c[d >> 2] | 0;
      c[(h + 4) >> 2] = b;
      c[h >> 2] = 5480;
      a[(h + 8) >> 0] = 0;
      c[(h + 12) >> 2] = 0;
      if (j) {
        a[(h + 16) >> 0] = 0;
        c[(h + 20) >> 2] = i;
        c[(h + 24) >> 2] = g;
        if (
          !(
            Ob[c[((c[b >> 2] | 0) + 24) >> 2] & 63](
              b,
              c[(e + 8) >> 2] | 0,
              c[(f + 8) >> 2] | 0
            ) | 0
          )
        )
          return h | 0;
        j = c[(h + 4) >> 2] | 0;
        c[(h + 12) >> 2] =
          Ob[c[((c[j >> 2] | 0) + 12) >> 2] & 63](
            j,
            c[(e + 8) >> 2] | 0,
            c[(f + 8) >> 2] | 0
          ) | 0;
        a[(h + 8) >> 0] = 1;
        return h | 0;
      } else {
        a[(h + 16) >> 0] = 1;
        c[(h + 20) >> 2] = i;
        c[(h + 24) >> 2] = g;
        if (
          !(
            Ob[c[((c[b >> 2] | 0) + 24) >> 2] & 63](
              b,
              c[(f + 8) >> 2] | 0,
              c[(e + 8) >> 2] | 0
            ) | 0
          )
        )
          return h | 0;
        j = c[(h + 4) >> 2] | 0;
        c[(h + 12) >> 2] =
          Ob[c[((c[j >> 2] | 0) + 12) >> 2] & 63](
            j,
            c[(f + 8) >> 2] | 0,
            c[(e + 8) >> 2] | 0
          ) | 0;
        a[(h + 8) >> 0] = 1;
        return h | 0;
      }
      return 0;
    }
    function $i(a, b, d) {
      a = a | 0;
      b = b | 0;
      d = d | 0;
      var e = 0,
        f = 0.0,
        h = 0.0,
        i = 0.0,
        j = 0.0,
        k = 0.0;
      c[(a + 4) >> 2] = c[(b + 40) >> 2];
      e = c[b >> 2] | 0;
      c[(a + 76) >> 2] = e;
      if (d) {
        c[(a + 44) >> 2] = c[(b + 8) >> 2];
        c[(a + 44 + 4) >> 2] = c[(b + 8 + 4) >> 2];
        c[(a + 44 + 8) >> 2] = c[(b + 8 + 8) >> 2];
        c[(a + 44 + 12) >> 2] = c[(b + 8 + 12) >> 2];
        a = (a + 60) | 0;
        d = (b + 24) | 0;
        c[a >> 2] = c[d >> 2];
        c[(a + 4) >> 2] = c[(d + 4) >> 2];
        c[(a + 8) >> 2] = c[(d + 8) >> 2];
        c[(a + 12) >> 2] = c[(d + 12) >> 2];
        f = +g[(b + 40) >> 2];
        return +f;
      } else {
        k = +g[(b + 8) >> 2];
        j = +g[(b + 12) >> 2];
        i = +g[(b + 16) >> 2];
        h =
          +g[(e + 20) >> 2] * k + +g[(e + 24) >> 2] * j + +g[(e + 28) >> 2] * i;
        f =
          +g[(e + 36) >> 2] * k + +g[(e + 40) >> 2] * j + +g[(e + 44) >> 2] * i;
        g[(a + 44) >> 2] =
          +g[(e + 4) >> 2] * k + +g[(e + 8) >> 2] * j + +g[(e + 12) >> 2] * i;
        g[(a + 48) >> 2] = h;
        g[(a + 52) >> 2] = f;
        g[(a + 56) >> 2] = 0.0;
        a = (a + 60) | 0;
        d = (b + 24) | 0;
        c[a >> 2] = c[d >> 2];
        c[(a + 4) >> 2] = c[(d + 4) >> 2];
        c[(a + 8) >> 2] = c[(d + 8) >> 2];
        c[(a + 12) >> 2] = c[(d + 12) >> 2];
        f = +g[(b + 40) >> 2];
        return +f;
      }
      return 0.0;
    }
    function aj() {
      var b = 0,
        d = 0;
      c[6435] = (c[6435] | 0) + 1;
      b = yc(791) | 0;
      if (!b) b = 0;
      else {
        c[(((b + 4 + 15) & -16) + -4) >> 2] = b;
        b = (b + 4 + 15) & -16;
      }
      c[b >> 2] = 1025;
      c[(b + 116) >> 2] = 0;
      a[(b + 120) >> 0] = 0;
      d = (b + 124) | 0;
      c[d >> 2] = 0;
      c[(d + 4) >> 2] = 0;
      c[(d + 8) >> 2] = 0;
      c[(d + 12) >> 2] = 0;
      c[(d + 16) >> 2] = 0;
      c[(d + 20) >> 2] = 0;
      c[(d + 24) >> 2] = 0;
      c[(d + 28) >> 2] = 0;
      c[(b + 300) >> 2] = 0;
      a[(b + 304) >> 0] = 0;
      d = (b + 308) | 0;
      c[d >> 2] = 0;
      c[(d + 4) >> 2] = 0;
      c[(d + 8) >> 2] = 0;
      c[(d + 12) >> 2] = 0;
      c[(d + 16) >> 2] = 0;
      c[(d + 20) >> 2] = 0;
      c[(d + 24) >> 2] = 0;
      c[(d + 28) >> 2] = 0;
      c[(b + 484) >> 2] = 0;
      a[(b + 488) >> 0] = 0;
      d = (b + 492) | 0;
      c[d >> 2] = 0;
      c[(d + 4) >> 2] = 0;
      c[(d + 8) >> 2] = 0;
      c[(d + 12) >> 2] = 0;
      c[(d + 16) >> 2] = 0;
      c[(d + 20) >> 2] = 0;
      c[(d + 24) >> 2] = 0;
      c[(d + 28) >> 2] = 0;
      c[(b + 668) >> 2] = 0;
      a[(b + 672) >> 0] = 0;
      d = (b + 676) | 0;
      c[d >> 2] = 0;
      c[(d + 4) >> 2] = 0;
      c[(d + 8) >> 2] = 0;
      c[(d + 12) >> 2] = 0;
      c[(d + 16) >> 2] = 0;
      c[(d + 20) >> 2] = 0;
      c[(d + 24) >> 2] = 0;
      c[(d + 28) >> 2] = 0;
      c[(b + 740) >> 2] = 0;
      c[(b + 744) >> 2] = 0;
      c[(b + 748) >> 2] = 0;
      c[(b + 768) >> 2] = 0;
      return b | 0;
    }
    function bj(b, d) {
      b = b | 0;
      d = d | 0;
      var e = 0,
        f = 0,
        h = 0,
        j = 0.0,
        k = 0.0,
        l = 0,
        m = 0;
      f = i;
      i = (i + 48) | 0;
      if ((c[(b + 136) >> 2] | 0) <= 0) {
        i = f;
        return;
      }
      e = 0;
      do {
        m = c[(b + 144) >> 2] | 0;
        c[(f + 32) >> 2] =
          (a[(m + ((e * 284) | 0) + 84) >> 0] | 0) == 0 ? 1065353216 : 0;
        c[(f + 32 + 4) >> 2] = 0;
        c[(f + 32 + 8) >> 2] = 1065353216;
        g[(f + 32 + 12) >> 2] = 0.0;
        l = (m + ((e * 284) | 0) + 140) | 0;
        c[(f + 16) >> 2] = c[l >> 2];
        c[(f + 16 + 4) >> 2] = c[(l + 4) >> 2];
        c[(f + 16 + 8) >> 2] = c[(l + 8) >> 2];
        c[(f + 16 + 12) >> 2] = c[(l + 12) >> 2];
        l = c[(b + 120) >> 2] | 0;
        h = c[((c[d >> 2] | 0) + 8) >> 2] | 0;
        k =
          +g[(m + ((e * 284) | 0) + 108 + (l << 2)) >> 2] +
          +g[(f + 16 + 4) >> 2];
        j =
          +g[(m + ((e * 284) | 0) + 124 + (l << 2)) >> 2] +
          +g[(f + 16 + 8) >> 2];
        g[f >> 2] =
          +g[(m + ((e * 284) | 0) + 92 + (l << 2)) >> 2] + +g[(f + 16) >> 2];
        g[(f + 4) >> 2] = k;
        g[(f + 8) >> 2] = j;
        g[(f + 12) >> 2] = 0.0;
        mc[h & 127](d, (f + 16) | 0, f, (f + 32) | 0);
        mc[c[((c[d >> 2] | 0) + 8) >> 2] & 127](
          d,
          (f + 16) | 0,
          ((c[(b + 144) >> 2] | 0) + ((e * 284) | 0) + 16) | 0,
          (f + 32) | 0
        );
        e = (e + 1) | 0;
      } while ((e | 0) < (c[(b + 136) >> 2] | 0));
      i = f;
      return;
    }
    function cj(d, e, f, g, h, i) {
      d = d | 0;
      e = e | 0;
      f = f | 0;
      g = g | 0;
      h = h | 0;
      i = i | 0;
      var j = 0,
        k = 0,
        l = 0,
        m = 0;
      if ((d | 0) == (c[(e + 8) >> 2] | 0)) zl(e, f, g, h);
      else {
        l = b[(e + 52) >> 1] | 0;
        j = c[(d + 12) >> 2] | 0;
        a[(e + 52) >> 0] = 0;
        a[(e + 53) >> 0] = 0;
        On((d + 16) | 0, e, f, g, h, i);
        a: do
          if ((j | 0) > 1) {
            m = (d + 24) | 0;
            do {
              if (a[(e + 54) >> 0] | 0) break a;
              k = b[(e + 52) >> 1] | 0;
              if (!(((k & 255) << 24) >> 24)) {
                if ((k & 65535) >= 256 ? ((c[(d + 8) >> 2] & 1) | 0) == 0 : 0)
                  break a;
              } else {
                if ((c[(e + 24) >> 2] | 0) == 1) break a;
                if (!(c[(d + 8) >> 2] & 2)) break a;
              }
              a[(e + 52) >> 0] = 0;
              a[(e + 53) >> 0] = 0;
              On(m, e, f, g, h, i);
              m = (m + 8) | 0;
            } while (m >>> 0 < ((d + 16 + (j << 3)) | 0) >>> 0);
          }
        while (0);
        a[(e + 52) >> 0] = l;
        a[(e + 53) >> 0] = (l & 65535) >>> 8;
      }
      return;
    }
    function dj(a, b, d, e) {
      a = a | 0;
      b = b | 0;
      d = +d;
      e = e | 0;
      switch (b | 0) {
        case 2: {
          if ((e | 0) < 1) {
            g[(a + 232) >> 2] = d;
            c[(a + 300) >> 2] = c[(a + 300) >> 2] | 512;
            return;
          }
          if ((e | 0) < 3) {
            g[(a + 264) >> 2] = d;
            c[(a + 300) >> 2] = c[(a + 300) >> 2] | 32;
            return;
          }
          if ((e | 0) == 3) {
            g[(a + 248) >> 2] = d;
            c[(a + 300) >> 2] = c[(a + 300) >> 2] | 2048;
            return;
          }
          if ((e | 0) >= 6) return;
          g[(a + 280) >> 2] = d;
          c[(a + 300) >> 2] = c[(a + 300) >> 2] | 128;
          return;
        }
        case 3: {
          if ((e | 0) < 1) {
            g[(a + 212) >> 2] = d;
            c[(a + 300) >> 2] = c[(a + 300) >> 2] | 1;
            return;
          }
          if ((e | 0) != 3) return;
          g[(a + 228) >> 2] = d;
          c[(a + 300) >> 2] = c[(a + 300) >> 2] | 4;
          return;
        }
        case 4: {
          if ((e | 0) < 1) {
            g[(a + 244) >> 2] = d;
            c[(a + 300) >> 2] = c[(a + 300) >> 2] | 256;
            return;
          }
          if ((e | 0) < 3) {
            g[(a + 276) >> 2] = d;
            c[(a + 300) >> 2] = c[(a + 300) >> 2] | 16;
            return;
          }
          if ((e | 0) == 3) {
            g[(a + 260) >> 2] = d;
            c[(a + 300) >> 2] = c[(a + 300) >> 2] | 1024;
            return;
          }
          if ((e | 0) >= 6) return;
          g[(a + 292) >> 2] = d;
          c[(a + 300) >> 2] = c[(a + 300) >> 2] | 64;
          return;
        }
        default:
          return;
      }
    }
    function ej(b, d) {
      b = b | 0;
      d = d | 0;
      var e = 0,
        f = 0,
        g = 0,
        h = 0;
      f = i;
      i = (i + 240) | 0;
      c[(f + 80) >> 2] = d;
      d = (f + 96) | 0;
      e = (d + 40) | 0;
      do {
        c[d >> 2] = 0;
        d = (d + 4) | 0;
      } while ((d | 0) < (e | 0));
      c[(f + 136) >> 2] = c[(f + 80) >> 2];
      if ((Bc(0, b, (f + 136) | 0, f, (f + 96) | 0) | 0) >= 0) {
        d = c[2359] | 0;
        if ((a[9510] | 0) < 1) c[2359] = d & -33;
        if (!(c[2371] | 0)) {
          e = c[2370] | 0;
          c[2370] = f + 152;
          c[2366] = f + 152;
          c[2364] = f + 152;
          c[2371] = 80;
          c[2363] = f + 152 + 80;
          Bc(9436, b, (f + 136) | 0, f, (f + 96) | 0) | 0;
          if (e | 0) {
            Ob[c[9472 >> 2] & 63](9436, 0, 0) | 0;
            c[2370] = e;
            c[2371] = 0;
            c[2363] = 0;
            c[2366] = 0;
            c[2364] = 0;
          }
        } else Bc(9436, b, (f + 136) | 0, f, (f + 96) | 0) | 0;
        c[2359] = c[2359] | (d & 32);
      }
      d = (a[9511] | 0) == 10;
      do
        if ((c[2378] | 0) < 0) {
          if (!d ? ((g = c[2364] | 0), g >>> 0 < (c[2363] | 0) >>> 0) : 0) {
            c[2364] = g + 1;
            a[g >> 0] = 10;
            break;
          }
          om(9436, 10) | 0;
        } else {
          if (!d ? ((h = c[2364] | 0), h >>> 0 < (c[2363] | 0) >>> 0) : 0) {
            c[2364] = h + 1;
            a[h >> 0] = 10;
            break;
          }
          om(9436, 10) | 0;
        }
      while (0);
      Va();
    }
    function fj(a, b, d) {
      a = a | 0;
      b = +b;
      d = d | 0;
      var e = 0,
        f = 0.0,
        h = 0.0,
        j = 0.0,
        k = 0.0,
        l = 0;
      e = i;
      i = (i + 96) | 0;
      c[(e + 32) >> 2] = 1065353216;
      c[(e + 32 + 4) >> 2] = 0;
      c[(e + 32 + 4 + 4) >> 2] = 0;
      c[(e + 32 + 4 + 8) >> 2] = 0;
      c[(e + 32 + 4 + 12) >> 2] = 0;
      c[(e + 32 + 20) >> 2] = 1065353216;
      c[(e + 32 + 24) >> 2] = 0;
      c[(e + 32 + 24 + 4) >> 2] = 0;
      c[(e + 32 + 24 + 8) >> 2] = 0;
      c[(e + 32 + 24 + 12) >> 2] = 0;
      c[(e + 32 + 40) >> 2] = 1065353216;
      l = (e + 32 + 44) | 0;
      c[l >> 2] = 0;
      c[(l + 4) >> 2] = 0;
      c[(l + 8) >> 2] = 0;
      c[(l + 12) >> 2] = 0;
      c[(l + 16) >> 2] = 0;
      mc[c[((c[a >> 2] | 0) + 8) >> 2] & 127](a, (e + 32) | 0, (e + 16) | 0, e);
      j = (+g[e >> 2] - +g[(e + 16) >> 2]) * 0.5;
      h = (+g[(e + 4) >> 2] - +g[(e + 16 + 4) >> 2]) * 0.5;
      k = (+g[(e + 8) >> 2] - +g[(e + 16 + 8) >> 2]) * 0.5;
      f = +Sb[c[((c[a >> 2] | 0) + 48) >> 2] & 15](a);
      g[d >> 2] =
        b *
        0.0833333283662796 *
        ((h + f) * 2.0 * (h + f) * 2.0 + (k + f) * 2.0 * (k + f) * 2.0);
      g[(d + 4) >> 2] =
        b *
        0.0833333283662796 *
        ((j + f) * 2.0 * (j + f) * 2.0 + (k + f) * 2.0 * (k + f) * 2.0);
      g[(d + 8) >> 2] =
        b *
        0.0833333283662796 *
        ((j + f) * 2.0 * (j + f) * 2.0 + (h + f) * 2.0 * (h + f) * 2.0);
      g[(d + 12) >> 2] = 0.0;
      i = e;
      return;
    }
    function gj(a, b, c) {
      a = a | 0;
      b = b | 0;
      c = c | 0;
      var d = 0.0,
        e = 0.0,
        f = 0.0,
        h = 0.0,
        i = 0.0,
        j = 0.0,
        k = 0.0,
        l = 0.0;
      d = +g[(a + 344) >> 2];
      if (!(d != 0.0)) return;
      f = +g[(a + 348) >> 2];
      i = +g[(a + 352) >> 2];
      k = +g[(a + 356) >> 2];
      l = +g[(b + 4) >> 2] * i * d;
      h = +g[(b + 8) >> 2] * k * d;
      g[(a + 312) >> 2] = +g[(a + 312) >> 2] + +g[b >> 2] * f * d;
      g[(a + 316) >> 2] = +g[(a + 316) >> 2] + l;
      g[(a + 320) >> 2] = +g[(a + 320) >> 2] + h;
      f = +g[b >> 2] * f;
      i = +g[(b + 4) >> 2] * i;
      k = +g[(b + 8) >> 2] * k;
      h = +g[(c + 4) >> 2];
      l = +g[(c + 8) >> 2];
      j = +g[c >> 2];
      e =
        (+g[(a + 280) >> 2] * (h * k - l * i) +
          +g[(a + 284) >> 2] * (l * f - j * k) +
          +g[(a + 288) >> 2] * (j * i - h * f)) *
        +g[(a + 548) >> 2];
      d =
        (+g[(a + 296) >> 2] * (h * k - l * i) +
          +g[(a + 300) >> 2] * (l * f - j * k) +
          +g[(a + 304) >> 2] * (j * i - h * f)) *
        +g[(a + 552) >> 2];
      g[(a + 328) >> 2] =
        +g[(a + 328) >> 2] +
        (+g[(a + 264) >> 2] * (h * k - l * i) +
          +g[(a + 268) >> 2] * (l * f - j * k) +
          +g[(a + 272) >> 2] * (j * i - h * f)) *
          +g[(a + 544) >> 2];
      g[(a + 332) >> 2] = +g[(a + 332) >> 2] + e;
      g[(a + 336) >> 2] = +g[(a + 336) >> 2] + d;
      return;
    }
    function hj(a, b, d, e, f, h, j, k, l, m) {
      a = a | 0;
      b = b | 0;
      d = d | 0;
      e = e | 0;
      f = f | 0;
      h = h | 0;
      j = j | 0;
      k = k | 0;
      l = l | 0;
      m = m | 0;
      var n = 0;
      n = i;
      i = (i + 16) | 0;
      li(12859);
      +bc[c[((c[a >> 2] | 0) + 44) >> 2] & 3](a, b, d, e, f, h, j, k, l);
      +bc[c[((c[a >> 2] | 0) + 48) >> 2] & 3](a, b, d, e, f, h, j, k, l);
      +fc[c[((c[a >> 2] | 0) + 36) >> 2] & 1](a, b, d, k);
      m = c[2357] | 0;
      a = ((c[(m + 16) >> 2] | 0) + -1) | 0;
      c[(m + 16) >> 2] = a;
      if (a | 0) {
        i = n;
        return 0.0;
      }
      do
        if (c[(m + 4) >> 2] | 0) {
          tb(n | 0, 0) | 0;
          a = c[6434] | 0;
          g[(m + 8) >> 2] =
            +g[(m + 8) >> 2] +
            +(
              (((c[(n + 4) >> 2] | 0) -
                (c[(a + 4) >> 2] | 0) +
                (((((c[n >> 2] | 0) - (c[a >> 2] | 0)) | 0) * 1e6) | 0) -
                (c[(m + 12) >> 2] | 0)) |
                0) >>>
              0
            ) /
              1.0e3;
          if (!(c[(m + 16) >> 2] | 0)) {
            m = c[2357] | 0;
            break;
          } else {
            i = n;
            return 0.0;
          }
        }
      while (0);
      c[2357] = c[(m + 20) >> 2];
      i = n;
      return 0.0;
    }
    function ij(b, d, e) {
      b = b | 0;
      d = d | 0;
      e = e | 0;
      var f = 0,
        g = 0,
        h = 0,
        i = 0;
      f = c[(b + 212) >> 2] | 0;
      if (
        (f | 0) == (c[(b + 216) >> 2] | 0)
          ? ((i = f | 0 ? f << 1 : 1), (f | 0) < (i | 0))
          : 0
      ) {
        if (!i) h = 0;
        else {
          c[6435] = (c[6435] | 0) + 1;
          f = yc((((i << 2) | 3) + 16) | 0) | 0;
          if (!f) f = 0;
          else {
            c[(((f + 4 + 15) & -16) + -4) >> 2] = f;
            f = (f + 4 + 15) & -16;
          }
          h = f;
          f = c[(b + 212) >> 2] | 0;
        }
        if ((f | 0) > 0) {
          g = 0;
          do {
            c[(h + (g << 2)) >> 2] =
              c[((c[(b + 220) >> 2] | 0) + (g << 2)) >> 2];
            g = (g + 1) | 0;
          } while ((g | 0) != (f | 0));
        }
        g = c[(b + 220) >> 2] | 0;
        if (g) {
          if (a[(b + 224) >> 0] | 0) {
            c[6436] = (c[6436] | 0) + 1;
            hd(c[(g + -4) >> 2] | 0);
            f = c[(b + 212) >> 2] | 0;
          }
          c[(b + 220) >> 2] = 0;
        }
        a[(b + 224) >> 0] = 1;
        c[(b + 220) >> 2] = h;
        c[(b + 216) >> 2] = i;
      }
      c[((c[(b + 220) >> 2] | 0) + (f << 2)) >> 2] = d;
      c[(b + 212) >> 2] = f + 1;
      if (!e) return;
      Pi(c[(d + 28) >> 2] | 0, d);
      Pi(c[(d + 32) >> 2] | 0, d);
      return;
    }
    function jj(a, b, d) {
      a = a | 0;
      b = b | 0;
      d = d | 0;
      var e = 0,
        f = 0.0,
        h = 0.0,
        i = 0.0,
        j = 0.0,
        k = 0.0,
        l = 0.0,
        m = 0.0,
        n = 0.0,
        o = 0.0;
      e = c[(a + 4) >> 2] | 0;
      if (e | 0) gj(e, b, d);
      e = c[a >> 2] | 0;
      if (!e) return;
      m = +g[b >> 2];
      k = +g[(e + 128) >> 2];
      l = +g[(b + 4) >> 2];
      j = +g[(b + 8) >> 2];
      f = +g[(d + 4) >> 2];
      o = +g[(d + 8) >> 2];
      n = +g[d >> 2];
      i =
        +g[(e + 180) >> 2] * (j * f - l * o) +
        +g[(e + 184) >> 2] * (m * o - j * n) +
        (l * n - m * f) * +g[(e + 188) >> 2];
      h =
        (j * f - l * o) * +g[(e + 196) >> 2] +
        (m * o - j * n) * +g[(e + 200) >> 2] +
        (l * n - m * f) * +g[(e + 204) >> 2];
      f =
        (j * f - l * o) * +g[(e + 212) >> 2] +
        (m * o - j * n) * +g[(e + 216) >> 2] +
        (l * n - m * f) * +g[(e + 220) >> 2];
      g[(e + 276) >> 2] = m * k + +g[(e + 276) >> 2];
      g[(e + 280) >> 2] = k * l + +g[(e + 280) >> 2];
      g[(e + 284) >> 2] = k * j + +g[(e + 284) >> 2];
      g[(e + 292) >> 2] = i + +g[(e + 292) >> 2];
      g[(e + 296) >> 2] = h + +g[(e + 296) >> 2];
      g[(e + 300) >> 2] = f + +g[(e + 300) >> 2];
      c[(e + 312) >> 2] = (c[(e + 312) >> 2] | 0) + 1;
      return;
    }
    function kj(a, b, c) {
      a = a | 0;
      b = b | 0;
      c = c | 0;
      var d = 0.0,
        e = 0.0,
        f = 0.0,
        h = 0.0,
        i = 0.0,
        j = 0.0,
        k = 0.0,
        l = 0.0,
        m = 0.0,
        n = 0.0,
        o = 0.0,
        p = 0.0,
        q = 0.0,
        r = 0.0,
        s = 0.0,
        t = 0.0,
        u = 0.0,
        v = 0.0,
        w = 0.0,
        x = 0.0;
      v = +g[(a + 552) >> 2];
      u = +g[(a + 568) >> 2];
      t = +g[(a + 584) >> 2];
      s = +g[b >> 2];
      r = +g[(b + 4) >> 2];
      q = +g[(b + 8) >> 2];
      o = +g[(b + 16) >> 2];
      n = +g[(b + 20) >> 2];
      m = +g[(b + 24) >> 2];
      k = +g[(b + 32) >> 2];
      i = +g[(b + 36) >> 2];
      f = +g[(b + 40) >> 2];
      j = +g[(a + 556) >> 2];
      h = +g[(a + 572) >> 2];
      e = +g[(a + 588) >> 2];
      x = +g[(a + 620) >> 2];
      w = +g[(a + 636) >> 2];
      d = +g[(a + 652) >> 2];
      p = x * +g[c >> 2] + w * +g[(c + 4) >> 2] + d * +g[(c + 8) >> 2];
      l = x * +g[(c + 16) >> 2] + w * +g[(c + 20) >> 2] + d * +g[(c + 24) >> 2];
      d = x * +g[(c + 32) >> 2] + w * +g[(c + 36) >> 2] + d * +g[(c + 40) >> 2];
      d = +W(
        +(
          (v * s + u * r + t * q) * p +
          (v * o + u * n + t * m) * l +
          (v * k + u * i + t * f) * d
        ),
        +(
          (s * j + r * h + q * e) * p +
          (o * j + n * h + m * e) * l +
          (k * j + i * h + f * e) * d
        )
      );
      return +(d * +g[(a + 732) >> 2]);
    }
    function lj(b, d, e) {
      b = b | 0;
      d = d | 0;
      e = e | 0;
      var f = 0,
        g = 0,
        h = 0;
      a: do
        if (((e | 0) != 0) & (((b & 3) | 0) != 0)) {
          f = e;
          while (1) {
            if ((a[b >> 0] | 0) == ((d & 255) << 24) >> 24) break a;
            b = (b + 1) | 0;
            e = (f + -1) | 0;
            if (((e | 0) != 0) & (((b & 3) | 0) != 0)) f = e;
            else {
              f = e;
              e = (e | 0) != 0;
              g = 5;
              break;
            }
          }
        } else {
          f = e;
          e = (e | 0) != 0;
          g = 5;
        }
      while (0);
      b: do
        if ((g | 0) == 5)
          if (e) {
            if ((a[b >> 0] | 0) != ((d & 255) << 24) >> 24) {
              e = _(d & 255, 16843009) | 0;
              c: do
                if (f >>> 0 > 3)
                  while (1) {
                    h = c[b >> 2] ^ e;
                    if (
                      (((h & -2139062144) ^ -2139062144) & (h + -16843009)) |
                      0
                    )
                      break;
                    b = (b + 4) | 0;
                    f = (f + -4) | 0;
                    if (f >>> 0 <= 3) {
                      g = 11;
                      break c;
                    }
                  }
                else g = 11;
              while (0);
              if ((g | 0) == 11)
                if (!f) {
                  f = 0;
                  break;
                }
              while (1) {
                if ((a[b >> 0] | 0) == ((d & 255) << 24) >> 24) break b;
                b = (b + 1) | 0;
                f = (f + -1) | 0;
                if (!f) {
                  f = 0;
                  break;
                }
              }
            }
          } else f = 0;
      while (0);
      return (f | 0 ? b : 0) | 0;
    }
    function mj(a, b) {
      a = a | 0;
      b = b | 0;
      var d = 0,
        e = 0,
        f = 0,
        g = 0;
      d = c[(a + 8) >> 2] | 0;
      if ((d | 0) > 0) {
        f = 0;
        do {
          e = c[((c[(a + 16) >> 2] | 0) + (f << 2)) >> 2] | 0;
          if (c[(e + 236) >> 2] & 2) {
            g = Eb[c[((c[e >> 2] | 0) + 16) >> 2] & 127](e) | 0;
            g = Ob[c[((c[b >> 2] | 0) + 16) >> 2] & 63](b, g, 1) | 0;
            d =
              Ob[c[((c[e >> 2] | 0) + 20) >> 2] & 63](
                e,
                c[(g + 8) >> 2] | 0,
                b
              ) | 0;
            yb[c[((c[b >> 2] | 0) + 20) >> 2] & 31](b, g, d, 1497645650, e);
            d = c[(a + 8) >> 2] | 0;
          }
          f = (f + 1) | 0;
        } while ((f | 0) < (d | 0));
      }
      if ((c[(a + 212) >> 2] | 0) <= 0) return;
      d = 0;
      do {
        g = c[((c[(a + 220) >> 2] | 0) + (d << 2)) >> 2] | 0;
        e = Eb[c[((c[g >> 2] | 0) + 36) >> 2] & 127](g) | 0;
        e = Ob[c[((c[b >> 2] | 0) + 16) >> 2] & 63](b, e, 1) | 0;
        f =
          Ob[c[((c[g >> 2] | 0) + 40) >> 2] & 63](g, c[(e + 8) >> 2] | 0, b) |
          0;
        yb[c[((c[b >> 2] | 0) + 20) >> 2] & 31](b, e, f, 1397641027, g);
        d = (d + 1) | 0;
      } while ((d | 0) < (c[(a + 212) >> 2] | 0));
      return;
    }
    function nj(a) {
      a = a | 0;
      var b = 0.0,
        d = 0,
        e = 0,
        f = 0,
        h = 0;
      e = i;
      i = (i + 32) | 0;
      c[(a + 32) >> 2] = 1566444395;
      c[(a + 36) >> 2] = 1566444395;
      c[(a + 40) >> 2] = 1566444395;
      g[(a + 44) >> 2] = 0.0;
      c[(a + 48) >> 2] = -581039253;
      c[(a + 52) >> 2] = -581039253;
      c[(a + 56) >> 2] = -581039253;
      g[(a + 60) >> 2] = 0.0;
      if ((c[(a + 16) >> 2] | 0) <= 0) {
        i = e;
        return;
      }
      d = 0;
      do {
        f = c[(a + 24) >> 2] | 0;
        h = c[(f + ((d * 80) | 0) + 64) >> 2] | 0;
        mc[c[((c[h >> 2] | 0) + 8) >> 2] & 127](
          h,
          (f + ((d * 80) | 0)) | 0,
          (e + 16) | 0,
          e
        );
        b = +g[(e + 16) >> 2];
        if (+g[(a + 32) >> 2] > b) g[(a + 32) >> 2] = b;
        b = +g[e >> 2];
        if (+g[(a + 48) >> 2] < b) g[(a + 48) >> 2] = b;
        b = +g[(e + 16 + 4) >> 2];
        if (+g[(a + 36) >> 2] > b) g[(a + 36) >> 2] = b;
        b = +g[(e + 4) >> 2];
        if (+g[(a + 52) >> 2] < b) g[(a + 52) >> 2] = b;
        b = +g[(e + 16 + 8) >> 2];
        if (+g[(a + 40) >> 2] > b) g[(a + 40) >> 2] = b;
        b = +g[(e + 8) >> 2];
        if (+g[(a + 56) >> 2] < b) g[(a + 56) >> 2] = b;
        d = (d + 1) | 0;
      } while ((d | 0) < (c[(a + 16) >> 2] | 0));
      i = e;
      return;
    }
    function oj(a, b, d) {
      a = a | 0;
      b = +b;
      d = d | 0;
      var e = 0,
        f = 0.0,
        h = 0.0,
        j = 0.0,
        k = 0;
      e = i;
      i = (i + 96) | 0;
      j = +Sb[c[((c[a >> 2] | 0) + 48) >> 2] & 15](a);
      c[(e + 32) >> 2] = 1065353216;
      c[(e + 32 + 4) >> 2] = 0;
      c[(e + 32 + 4 + 4) >> 2] = 0;
      c[(e + 32 + 4 + 8) >> 2] = 0;
      c[(e + 32 + 4 + 12) >> 2] = 0;
      c[(e + 32 + 20) >> 2] = 1065353216;
      c[(e + 32 + 24) >> 2] = 0;
      c[(e + 32 + 24 + 4) >> 2] = 0;
      c[(e + 32 + 24 + 8) >> 2] = 0;
      c[(e + 32 + 24 + 12) >> 2] = 0;
      c[(e + 32 + 40) >> 2] = 1065353216;
      k = (e + 32 + 44) | 0;
      c[k >> 2] = 0;
      c[(k + 4) >> 2] = 0;
      c[(k + 8) >> 2] = 0;
      c[(k + 12) >> 2] = 0;
      c[(k + 16) >> 2] = 0;
      mc[c[((c[a >> 2] | 0) + 8) >> 2] & 127](a, (e + 32) | 0, (e + 16) | 0, e);
      h = (j + (+g[e >> 2] - +g[(e + 16) >> 2]) * 0.5) * 2.0;
      f = (j + (+g[(e + 4) >> 2] - +g[(e + 16 + 4) >> 2]) * 0.5) * 2.0;
      j = (j + (+g[(e + 8) >> 2] - +g[(e + 16 + 8) >> 2]) * 0.5) * 2.0;
      g[d >> 2] = b * 0.0833333283662796 * (f * f + j * j);
      g[(d + 4) >> 2] = b * 0.0833333283662796 * (h * h + j * j);
      g[(d + 8) >> 2] = b * 0.0833333283662796 * (h * h + f * f);
      g[(d + 12) >> 2] = 0.0;
      i = e;
      return;
    }
    function pj(b) {
      b = b | 0;
      var d = 0;
      d = c[(b + 72) >> 2] | 0;
      if (d | 0) {
        if (a[(b + 76) >> 0] | 0) {
          c[6436] = (c[6436] | 0) + 1;
          hd(c[(d + -4) >> 2] | 0);
        }
        c[(b + 72) >> 2] = 0;
      }
      a[(b + 76) >> 0] = 1;
      c[(b + 72) >> 2] = 0;
      c[(b + 64) >> 2] = 0;
      c[(b + 68) >> 2] = 0;
      d = c[(b + 52) >> 2] | 0;
      if (d | 0) {
        if (a[(b + 56) >> 0] | 0) {
          c[6436] = (c[6436] | 0) + 1;
          hd(c[(d + -4) >> 2] | 0);
        }
        c[(b + 52) >> 2] = 0;
      }
      a[(b + 56) >> 0] = 1;
      c[(b + 52) >> 2] = 0;
      c[(b + 44) >> 2] = 0;
      c[(b + 48) >> 2] = 0;
      d = c[(b + 32) >> 2] | 0;
      if (d | 0) {
        if (a[(b + 36) >> 0] | 0) {
          c[6436] = (c[6436] | 0) + 1;
          hd(c[(d + -4) >> 2] | 0);
        }
        c[(b + 32) >> 2] = 0;
      }
      a[(b + 36) >> 0] = 1;
      c[(b + 32) >> 2] = 0;
      c[(b + 24) >> 2] = 0;
      c[(b + 28) >> 2] = 0;
      d = c[(b + 12) >> 2] | 0;
      if (!d) {
        a[(b + 16) >> 0] = 1;
        c[(b + 12) >> 2] = 0;
        c[(b + 4) >> 2] = 0;
        b = (b + 8) | 0;
        c[b >> 2] = 0;
        return;
      }
      if (a[(b + 16) >> 0] | 0) {
        c[6436] = (c[6436] | 0) + 1;
        hd(c[(d + -4) >> 2] | 0);
      }
      c[(b + 12) >> 2] = 0;
      a[(b + 16) >> 0] = 1;
      c[(b + 12) >> 2] = 0;
      c[(b + 4) >> 2] = 0;
      b = (b + 8) | 0;
      c[b >> 2] = 0;
      return;
    }
    function qj(a, b) {
      a = a | 0;
      b = +b;
      var d = 0,
        e = 0,
        f = 0,
        h = 0.0,
        i = 0.0,
        j = 0.0,
        k = 0,
        l = 0,
        m = 0,
        n = 0,
        o = 0.0,
        p = 0.0,
        q = 0.0,
        r = 0.0,
        s = 0.0;
      e = c[(a + 732) >> 2] | 0;
      if ((e | 0) <= 0) return;
      a = c[(a + 740) >> 2] | 0;
      d = 0;
      do {
        n = c[(a + ((d * 52) | 0) + 8) >> 2] | 0;
        f = c[(a + ((d * 52) | 0) + 12) >> 2] | 0;
        s = +g[(n + 40) >> 2];
        q = +g[(n + 44) >> 2];
        i = +g[(n + 48) >> 2];
        k = (a + ((d * 52) | 0) + 36) | 0;
        r = +g[k >> 2];
        m = (a + ((d * 52) | 0) + 40) | 0;
        p = +g[m >> 2];
        l = (a + ((d * 52) | 0) + 44) | 0;
        o = +g[l >> 2];
        j = -(
          +g[(a + ((d * 52) | 0) + 32) >> 2] *
          ((s - +g[(f + 40) >> 2]) * r +
            (q - +g[(f + 44) >> 2]) * p +
            (i - +g[(f + 48) >> 2]) * o) *
          b
        );
        h = +g[(n + 88) >> 2] * j;
        g[(n + 40) >> 2] = s + r * h;
        g[(n + 44) >> 2] = q + p * h;
        g[(n + 48) >> 2] = o * h + i;
        j = +g[(f + 88) >> 2] * j;
        i = j * +g[m >> 2];
        h = j * +g[l >> 2];
        g[(f + 40) >> 2] = +g[(f + 40) >> 2] - +g[k >> 2] * j;
        g[(f + 44) >> 2] = +g[(f + 44) >> 2] - i;
        g[(f + 48) >> 2] = +g[(f + 48) >> 2] - h;
        d = (d + 1) | 0;
      } while ((d | 0) != (e | 0));
      return;
    }
    function rj(b, d) {
      b = b | 0;
      d = d | 0;
      var e = 0,
        f = 0,
        g = 0,
        h = 0;
      e = c[(b + 12) >> 2] | 0;
      if (!e) return;
      if (!(a[(b + 8) >> 0] | 0)) return;
      f = c[(d + 4) >> 2] | 0;
      if (
        (f | 0) == (c[(d + 8) >> 2] | 0)
          ? ((h = f | 0 ? f << 1 : 1), (f | 0) < (h | 0))
          : 0
      ) {
        if (!h) e = 0;
        else {
          c[6435] = (c[6435] | 0) + 1;
          e = yc((((h << 2) | 3) + 16) | 0) | 0;
          if (!e) e = 0;
          else {
            c[(((e + 4 + 15) & -16) + -4) >> 2] = e;
            e = (e + 4 + 15) & -16;
          }
          f = c[(d + 4) >> 2] | 0;
        }
        if ((f | 0) > 0) {
          g = 0;
          do {
            c[(e + (g << 2)) >> 2] =
              c[((c[(d + 12) >> 2] | 0) + (g << 2)) >> 2];
            g = (g + 1) | 0;
          } while ((g | 0) != (f | 0));
        }
        g = c[(d + 12) >> 2] | 0;
        if (g) {
          if (a[(d + 16) >> 0] | 0) {
            c[6436] = (c[6436] | 0) + 1;
            hd(c[(g + -4) >> 2] | 0);
            f = c[(d + 4) >> 2] | 0;
          }
          c[(d + 12) >> 2] = 0;
        }
        a[(d + 16) >> 0] = 1;
        c[(d + 12) >> 2] = e;
        c[(d + 8) >> 2] = h;
        e = c[(b + 12) >> 2] | 0;
      }
      c[((c[(d + 12) >> 2] | 0) + (f << 2)) >> 2] = e;
      c[(d + 4) >> 2] = f + 1;
      return;
    }
    function sj(b, d, e, f) {
      b = b | 0;
      d = d | 0;
      e = e | 0;
      f = f | 0;
      var g = 0,
        h = 0,
        i = 0,
        j = 0;
      g = c[(b + 328) >> 2] | 0;
      if (
        (g | 0) == (c[(b + 332) >> 2] | 0)
          ? ((j = g | 0 ? g << 1 : 1), (g | 0) < (j | 0))
          : 0
      ) {
        if (!j) i = 0;
        else {
          c[6435] = (c[6435] | 0) + 1;
          g = yc((((j << 2) | 3) + 16) | 0) | 0;
          if (!g) g = 0;
          else {
            c[(((g + 4 + 15) & -16) + -4) >> 2] = g;
            g = (g + 4 + 15) & -16;
          }
          i = g;
          g = c[(b + 328) >> 2] | 0;
        }
        if ((g | 0) > 0) {
          h = 0;
          do {
            c[(i + (h << 2)) >> 2] =
              c[((c[(b + 336) >> 2] | 0) + (h << 2)) >> 2];
            h = (h + 1) | 0;
          } while ((h | 0) != (g | 0));
        }
        h = c[(b + 336) >> 2] | 0;
        if (h) {
          if (a[(b + 340) >> 0] | 0) {
            c[6436] = (c[6436] | 0) + 1;
            hd(c[(h + -4) >> 2] | 0);
            g = c[(b + 328) >> 2] | 0;
          }
          c[(b + 336) >> 2] = 0;
        }
        a[(b + 340) >> 0] = 1;
        c[(b + 336) >> 2] = i;
        c[(b + 332) >> 2] = j;
      }
      c[((c[(b + 336) >> 2] | 0) + (g << 2)) >> 2] = d;
      c[(b + 328) >> 2] = g + 1;
      c[(d + 284) >> 2] = c[(b + 452) >> 2];
      Pg(b, d, e, f);
      return;
    }
    function tj(b, d) {
      b = b | 0;
      d = d | 0;
      var e = 0,
        f = 0,
        g = 0,
        h = 0;
      e = c[(b + 20) >> 2] | 0;
      if (!e) return;
      if (!(a[(b + 16) >> 0] | 0)) return;
      f = c[(d + 4) >> 2] | 0;
      if (
        (f | 0) == (c[(d + 8) >> 2] | 0)
          ? ((h = f | 0 ? f << 1 : 1), (f | 0) < (h | 0))
          : 0
      ) {
        if (!h) e = 0;
        else {
          c[6435] = (c[6435] | 0) + 1;
          e = yc((((h << 2) | 3) + 16) | 0) | 0;
          if (!e) e = 0;
          else {
            c[(((e + 4 + 15) & -16) + -4) >> 2] = e;
            e = (e + 4 + 15) & -16;
          }
          f = c[(d + 4) >> 2] | 0;
        }
        if ((f | 0) > 0) {
          g = 0;
          do {
            c[(e + (g << 2)) >> 2] =
              c[((c[(d + 12) >> 2] | 0) + (g << 2)) >> 2];
            g = (g + 1) | 0;
          } while ((g | 0) != (f | 0));
        }
        g = c[(d + 12) >> 2] | 0;
        if (g) {
          if (a[(d + 16) >> 0] | 0) {
            c[6436] = (c[6436] | 0) + 1;
            hd(c[(g + -4) >> 2] | 0);
            f = c[(d + 4) >> 2] | 0;
          }
          c[(d + 12) >> 2] = 0;
        }
        a[(d + 16) >> 0] = 1;
        c[(d + 12) >> 2] = e;
        c[(d + 8) >> 2] = h;
        e = c[(b + 20) >> 2] | 0;
      }
      c[((c[(d + 12) >> 2] | 0) + (f << 2)) >> 2] = e;
      c[(d + 4) >> 2] = f + 1;
      return;
    }
    function uj(a, b, d, e) {
      a = a | 0;
      b = b | 0;
      d = d | 0;
      e = e | 0;
      var f = 0.0,
        h = 0.0,
        i = 0.0,
        j = 0.0,
        k = 0.0;
      j = +g[(a + 24) >> 2];
      k = +g[(a + 28) >> 2];
      i = +g[(a + 32) >> 2];
      f = j * +g[b >> 2] + k * +g[(b + 4) >> 2] + i * +g[(b + 8) >> 2];
      h = +g[(a + 20) >> 2];
      if (f > h) {
        g[(a + 20) >> 2] = f;
        c[(a + 4) >> 2] = c[b >> 2];
        c[(a + 4 + 4) >> 2] = c[(b + 4) >> 2];
        c[(a + 4 + 8) >> 2] = c[(b + 8) >> 2];
        c[(a + 4 + 12) >> 2] = c[(b + 12) >> 2];
      } else f = h;
      h = j * +g[(b + 16) >> 2] + k * +g[(b + 20) >> 2] + i * +g[(b + 24) >> 2];
      if (h > f) {
        g[(a + 20) >> 2] = h;
        c[(a + 4) >> 2] = c[(b + 16) >> 2];
        c[(a + 4 + 4) >> 2] = c[(b + 16 + 4) >> 2];
        c[(a + 4 + 8) >> 2] = c[(b + 16 + 8) >> 2];
        c[(a + 4 + 12) >> 2] = c[(b + 16 + 12) >> 2];
      } else h = f;
      f = j * +g[(b + 32) >> 2] + k * +g[(b + 36) >> 2] + i * +g[(b + 40) >> 2];
      if (!(f > h)) return;
      g[(a + 20) >> 2] = f;
      c[(a + 4) >> 2] = c[(b + 32) >> 2];
      c[(a + 4 + 4) >> 2] = c[(b + 32 + 4) >> 2];
      c[(a + 4 + 8) >> 2] = c[(b + 32 + 8) >> 2];
      c[(a + 4 + 12) >> 2] = c[(b + 32 + 12) >> 2];
      return;
    }
    function vj(b) {
      b = b | 0;
      var d = 0,
        e = 0,
        f = 0,
        h = 0.0;
      e = i;
      i = (i + 96) | 0;
      a[(b + 88) >> 0] = 1;
      if ((a[22568] | 0) == 0 ? Wa(22568) | 0 : 0) {
        c[6139] = 1065353216;
        c[6140] = 0;
        c[6141] = 0;
        c[6142] = 0;
        c[6143] = 0;
        c[6144] = 1065353216;
        c[6145] = 0;
        c[6146] = 0;
        c[6147] = 0;
        c[6148] = 0;
        c[6149] = 1065353216;
        g[6150] = 0.0;
        c[6151] = -1082130432;
        c[6152] = 0;
        c[6153] = 0;
        c[6154] = 0;
        c[6155] = 0;
        c[6156] = -1082130432;
        c[6157] = 0;
        c[6158] = 0;
        c[6159] = 0;
        c[6160] = 0;
        c[6161] = -1082130432;
        g[6162] = 0.0;
        _a(22568);
      }
      d = e;
      f = (d + 96) | 0;
      do {
        c[d >> 2] = 0;
        d = (d + 4) | 0;
      } while ((d | 0) < (f | 0));
      mc[c[((c[b >> 2] | 0) + 76) >> 2] & 127](b, 24556, e, 6);
      h = +g[(b + 44) >> 2];
      g[(b + 72) >> 2] = +g[e >> 2] + h;
      g[(b + 56) >> 2] = +g[(e + 48) >> 2] - h;
      g[(b + 76) >> 2] = +g[(e + 20) >> 2] + h;
      g[(b + 60) >> 2] = +g[(e + 68) >> 2] - h;
      g[(b + 80) >> 2] = +g[(e + 40) >> 2] + h;
      g[(b + 64) >> 2] = +g[(e + 88) >> 2] - h;
      i = e;
      return;
    }
    function wj(d, e) {
      d = d | 0;
      e = e | 0;
      var f = 0,
        g = 0,
        h = 0,
        j = 0;
      j = i;
      i = (i + 64) | 0;
      h = c[d >> 2] | 0;
      g = (d + (c[(h + -8) >> 2] | 0)) | 0;
      h = c[(h + -4) >> 2] | 0;
      c[j >> 2] = e;
      c[(j + 4) >> 2] = d;
      c[(j + 8) >> 2] = 2776;
      d = (j + 12) | 0;
      f = (d + 40) | 0;
      do {
        c[d >> 2] = 0;
        d = (d + 4) | 0;
      } while ((d | 0) < (f | 0));
      b[(j + 12 + 40) >> 1] = 0;
      a[(j + 12 + 42) >> 0] = 0;
      a: do
        if ((h | 0) == (e | 0)) {
          c[(j + 48) >> 2] = 1;
          Qb[c[((c[e >> 2] | 0) + 20) >> 2] & 7](e, j, g, g, 1, 0);
          d = (c[(j + 24) >> 2] | 0) == 1 ? g : 0;
        } else {
          yb[c[((c[h >> 2] | 0) + 24) >> 2] & 31](h, j, g, 1, 0);
          switch (c[(j + 36) >> 2] | 0) {
            case 0: {
              d =
                ((c[(j + 40) >> 2] | 0) == 1
                  ? (c[(j + 28) >> 2] | 0) == 1
                  : 0) &
                ((c[(j + 32) >> 2] | 0) == 1)
                  ? c[(j + 20) >> 2] | 0
                  : 0;
              break a;
            }
            case 1:
              break;
            default: {
              d = 0;
              break a;
            }
          }
          if (
            (c[(j + 24) >> 2] | 0) != 1
              ? !(
                  ((c[(j + 40) >> 2] | 0) == 0
                    ? (c[(j + 28) >> 2] | 0) == 1
                    : 0) &
                  ((c[(j + 32) >> 2] | 0) == 1)
                )
              : 0
          ) {
            d = 0;
            break;
          }
          d = c[(j + 16) >> 2] | 0;
        }
      while (0);
      i = j;
      return d | 0;
    }
    function xj(a, b, d, e) {
      a = a | 0;
      b = b | 0;
      d = d | 0;
      e = e | 0;
      var f = 0.0,
        h = 0.0,
        i = 0.0,
        j = 0.0,
        k = 0.0;
      j = +g[(a + 88) >> 2];
      k = +g[(a + 92) >> 2];
      i = +g[(a + 96) >> 2];
      f = j * +g[b >> 2] + k * +g[(b + 4) >> 2] + i * +g[(b + 8) >> 2];
      h = +g[(a + 84) >> 2];
      if (f > h) {
        g[(a + 84) >> 2] = f;
        c[(a + 4) >> 2] = c[b >> 2];
        c[(a + 4 + 4) >> 2] = c[(b + 4) >> 2];
        c[(a + 4 + 8) >> 2] = c[(b + 8) >> 2];
        c[(a + 4 + 12) >> 2] = c[(b + 12) >> 2];
      } else f = h;
      h = j * +g[(b + 16) >> 2] + k * +g[(b + 20) >> 2] + i * +g[(b + 24) >> 2];
      if (h > f) {
        g[(a + 84) >> 2] = h;
        c[(a + 4) >> 2] = c[(b + 16) >> 2];
        c[(a + 4 + 4) >> 2] = c[(b + 16 + 4) >> 2];
        c[(a + 4 + 8) >> 2] = c[(b + 16 + 8) >> 2];
        c[(a + 4 + 12) >> 2] = c[(b + 16 + 12) >> 2];
      } else h = f;
      f = j * +g[(b + 32) >> 2] + k * +g[(b + 36) >> 2] + i * +g[(b + 40) >> 2];
      if (!(f > h)) return;
      g[(a + 84) >> 2] = f;
      c[(a + 4) >> 2] = c[(b + 32) >> 2];
      c[(a + 4 + 4) >> 2] = c[(b + 32 + 4) >> 2];
      c[(a + 4 + 8) >> 2] = c[(b + 32 + 8) >> 2];
      c[(a + 4 + 12) >> 2] = c[(b + 32 + 12) >> 2];
      return;
    }
    function yj(a, b, d) {
      a = a | 0;
      b = b | 0;
      d = d | 0;
      var e = 0,
        f = 0,
        g = 0,
        h = 0,
        i = 0,
        j = 0,
        k = 0,
        l = 0,
        m = 0;
      while (1) {
        j = c[(a + 12) >> 2] | 0;
        k = c[(j + (((((b + d) | 0) / 2) | 0) << 3)) >> 2] | 0;
        e = b;
        f = d;
        while (1) {
          while (1) {
            h = (e + 1) | 0;
            if ((c[(j + (e << 3)) >> 2] | 0) < (k | 0)) e = h;
            else {
              i = f;
              break;
            }
          }
          while (1) {
            g = (j + (i << 3)) | 0;
            f = (i + -1) | 0;
            if ((k | 0) < (c[g >> 2] | 0)) i = f;
            else break;
          }
          if ((e | 0) > (i | 0)) f = i;
          else {
            e = (j + (e << 3)) | 0;
            l = c[e >> 2] | 0;
            j = c[(e + 4) >> 2] | 0;
            m = c[(g + 4) >> 2] | 0;
            c[e >> 2] = c[g >> 2];
            c[(e + 4) >> 2] = m;
            e = ((c[(a + 12) >> 2] | 0) + (i << 3)) | 0;
            c[e >> 2] = l;
            c[(e + 4) >> 2] = j;
            e = h;
          }
          if ((e | 0) > (f | 0)) break;
          j = c[(a + 12) >> 2] | 0;
        }
        if ((f | 0) > (b | 0)) yj(a, b, f);
        if ((e | 0) < (d | 0)) b = e;
        else break;
      }
      return;
    }
    function zj(a, b, e) {
      a = a | 0;
      b = b | 0;
      e = e | 0;
      kh(a, b, e) | 0;
      c[(b + 276) >> 2] = c[(a + 1316) >> 2];
      c[(b + 324) >> 2] = c[(a + 1364) >> 2];
      c[(b + 252) >> 2] = d[(a + 1309) >> 0];
      c[(b + 300) >> 2] = c[(a + 1340) >> 2];
      c[(b + 280) >> 2] = c[(a + 1320) >> 2];
      c[(b + 328) >> 2] = c[(a + 1368) >> 2];
      c[(b + 256) >> 2] = d[(a + 1310) >> 0];
      c[(b + 304) >> 2] = c[(a + 1344) >> 2];
      c[(b + 284) >> 2] = c[(a + 1324) >> 2];
      c[(b + 332) >> 2] = c[(a + 1372) >> 2];
      c[(b + 260) >> 2] = d[(a + 1311) >> 0];
      c[(b + 308) >> 2] = c[(a + 1348) >> 2];
      c[(b + 288) >> 2] = c[(a + 1328) >> 2];
      c[(b + 336) >> 2] = c[(a + 1376) >> 2];
      c[(b + 264) >> 2] = d[(a + 1312) >> 0];
      c[(b + 312) >> 2] = c[(a + 1352) >> 2];
      c[(b + 292) >> 2] = c[(a + 1332) >> 2];
      c[(b + 340) >> 2] = c[(a + 1380) >> 2];
      c[(b + 268) >> 2] = d[(a + 1313) >> 0];
      c[(b + 316) >> 2] = c[(a + 1356) >> 2];
      c[(b + 296) >> 2] = c[(a + 1336) >> 2];
      c[(b + 344) >> 2] = c[(a + 1384) >> 2];
      c[(b + 272) >> 2] = d[(a + 1314) >> 0];
      c[(b + 320) >> 2] = c[(a + 1360) >> 2];
      return 12539;
    }
    function Aj(a, b, d, e) {
      a = a | 0;
      b = b | 0;
      d = d | 0;
      e = e | 0;
      var f = 0.0,
        h = 0.0,
        i = 0.0,
        j = 0.0,
        k = 0.0,
        l = 0.0,
        m = 0.0,
        n = 0.0,
        o = 0.0,
        p = 0.0,
        q = 0.0,
        r = 0.0,
        s = 0.0,
        t = 0.0,
        u = 0.0;
      i = +Sb[c[((c[a >> 2] | 0) + 48) >> 2] & 15](a);
      m = i + +g[(a + 28) >> 2];
      k = i + +g[(a + 32) >> 2];
      i = i + +g[(a + 36) >> 2];
      u = +N(+(+g[b >> 2]));
      t = +N(+(+g[(b + 4) >> 2]));
      s = +N(+(+g[(b + 8) >> 2]));
      q = +N(+(+g[(b + 16) >> 2]));
      p = +N(+(+g[(b + 20) >> 2]));
      o = +N(+(+g[(b + 24) >> 2]));
      l = +N(+(+g[(b + 32) >> 2]));
      j = +N(+(+g[(b + 36) >> 2]));
      h = +N(+(+g[(b + 40) >> 2]));
      r = +g[(b + 48) >> 2];
      n = +g[(b + 52) >> 2];
      f = +g[(b + 56) >> 2];
      g[d >> 2] = r - (m * u + k * t + i * s);
      g[(d + 4) >> 2] = n - (m * q + k * p + i * o);
      g[(d + 8) >> 2] = f - (m * l + k * j + i * h);
      g[(d + 12) >> 2] = 0.0;
      g[e >> 2] = m * u + k * t + i * s + r;
      g[(e + 4) >> 2] = m * q + k * p + i * o + n;
      g[(e + 8) >> 2] = m * l + k * j + i * h + f;
      g[(e + 12) >> 2] = 0.0;
      return;
    }
    function Bj(a, c, d, e, f, h) {
      a = a | 0;
      c = c | 0;
      d = +d;
      e = +e;
      f = +f;
      h = h | 0;
      var i = 0,
        j = 0;
      d = (d - +g[(a + 8) >> 2]) * +g[(a + 40) >> 2];
      e = (e - +g[(a + 12) >> 2]) * +g[(a + 44) >> 2];
      f = (f - +g[(a + 16) >> 2]) * +g[(a + 48) >> 2];
      do
        if (!(d <= 0.0)) {
          i = b[(a + 6) >> 1] | 0;
          j = b[(a + 4) >> 1] | 0;
          if (!(d >= +(i & 65535))) {
            i = (j & (~~d & 65535) & 65535) | h;
            break;
          } else {
            i = (j & i & 65535) | h;
            break;
          }
        } else i = h;
      while (0);
      b[c >> 1] = i;
      do
        if (!(e <= 0.0)) {
          i = b[(a + 6) >> 1] | 0;
          j = b[(a + 4) >> 1] | 0;
          if (!(e >= +(i & 65535))) {
            i = (j & (~~e & 65535) & 65535) | h;
            break;
          } else {
            i = (j & i & 65535) | h;
            break;
          }
        } else i = h;
      while (0);
      b[(c + 2) >> 1] = i;
      if (f <= 0.0) {
        h = h & 65535;
        c = (c + 4) | 0;
        b[c >> 1] = h;
        return;
      }
      j = b[(a + 6) >> 1] | 0;
      i = b[(a + 4) >> 1] | 0;
      if (!(f >= +(j & 65535))) {
        h = (i & (~~f & 65535) & 65535) | h;
        h = h & 65535;
        c = (c + 4) | 0;
        b[c >> 1] = h;
        return;
      } else {
        h = (i & j & 65535) | h;
        h = h & 65535;
        c = (c + 4) | 0;
        b[c >> 1] = h;
        return;
      }
    }
    function Cj(b) {
      b = b | 0;
      var d = 0;
      c[b >> 2] = 8520;
      if (c[(b + 108) >> 2] | 0) {
        d = c[(b + 112) >> 2] | 0;
        Ab[c[c[d >> 2] >> 2] & 255](d);
        d = c[(b + 112) >> 2] | 0;
        if (d | 0) {
          c[6436] = (c[6436] | 0) + 1;
          hd(c[(d + -4) >> 2] | 0);
        }
        d = c[(b + 108) >> 2] | 0;
        Ab[c[c[d >> 2] >> 2] & 255](d);
        d = c[(b + 108) >> 2] | 0;
        if (d | 0) {
          c[6436] = (c[6436] | 0) + 1;
          hd(c[(d + -4) >> 2] | 0);
        }
      }
      d = c[(b + 88) >> 2] | 0;
      if (d | 0) {
        c[6436] = (c[6436] | 0) + 1;
        hd(c[(d + -4) >> 2] | 0);
      }
      d = c[(b + 84) >> 2] | 0;
      if (d | 0) {
        c[6436] = (c[6436] | 0) + 1;
        hd(c[(d + -4) >> 2] | 0);
      }
      d = c[(b + 80) >> 2] | 0;
      if (d | 0) {
        c[6436] = (c[6436] | 0) + 1;
        hd(c[(d + -4) >> 2] | 0);
      }
      d = c[(b + 60) >> 2] | 0;
      if (d | 0) {
        c[6436] = (c[6436] | 0) + 1;
        hd(c[(d + -4) >> 2] | 0);
      }
      if (!(a[(b + 100) >> 0] | 0)) return;
      d = c[(b + 92) >> 2] | 0;
      Ab[c[c[d >> 2] >> 2] & 255](d);
      d = c[(b + 92) >> 2] | 0;
      if (!d) return;
      c[6436] = (c[6436] | 0) + 1;
      hd(c[(d + -4) >> 2] | 0);
      return;
    }
    function Dj(b, d) {
      b = b | 0;
      d = d | 0;
      var e = 0,
        f = 0,
        g = 0,
        h = 0;
      e = c[(b + 76) >> 2] | 0;
      if (!e) return;
      f = c[(d + 4) >> 2] | 0;
      if (
        (f | 0) == (c[(d + 8) >> 2] | 0)
          ? ((h = f | 0 ? f << 1 : 1), (f | 0) < (h | 0))
          : 0
      ) {
        if (!h) e = 0;
        else {
          c[6435] = (c[6435] | 0) + 1;
          e = yc((((h << 2) | 3) + 16) | 0) | 0;
          if (!e) e = 0;
          else {
            c[(((e + 4 + 15) & -16) + -4) >> 2] = e;
            e = (e + 4 + 15) & -16;
          }
          f = c[(d + 4) >> 2] | 0;
        }
        if ((f | 0) > 0) {
          g = 0;
          do {
            c[(e + (g << 2)) >> 2] =
              c[((c[(d + 12) >> 2] | 0) + (g << 2)) >> 2];
            g = (g + 1) | 0;
          } while ((g | 0) != (f | 0));
        }
        g = c[(d + 12) >> 2] | 0;
        if (g) {
          if (a[(d + 16) >> 0] | 0) {
            c[6436] = (c[6436] | 0) + 1;
            hd(c[(g + -4) >> 2] | 0);
            f = c[(d + 4) >> 2] | 0;
          }
          c[(d + 12) >> 2] = 0;
        }
        a[(d + 16) >> 0] = 1;
        c[(d + 12) >> 2] = e;
        c[(d + 8) >> 2] = h;
        e = c[(b + 76) >> 2] | 0;
      }
      c[((c[(d + 12) >> 2] | 0) + (f << 2)) >> 2] = e;
      c[(d + 4) >> 2] = f + 1;
      return;
    }
    function Ej(a, b, d, e) {
      a = a | 0;
      b = b | 0;
      d = +d;
      e = +e;
      var f = 0,
        h = 0.0,
        i = 0.0,
        j = 0.0,
        l = 0,
        m = 0.0,
        n = 0.0,
        o = 0.0;
      j = +Q(+d);
      i = +R(+d);
      f = c[(b + 444) >> 2] | 0;
      l = +N(+j) > 1.1920928955078125e-7;
      d = ((c[k >> 2] = f), +g[k >> 2]);
      if (l) {
        m = +g[(b + 448) >> 2];
        m = +O(
          +(
            ((i * i) / (j * j) + 1.0) /
            (1.0 / (m * m) + (i * i) / (j * j) / (d * d))
          )
        );
        d = i * i;
        h = j * j;
        f = ((g[k >> 2] = m), c[k >> 2] | 0);
      } else {
        d = i * i;
        h = j * j;
      }
      m = +O(+(h + 0.0 + d));
      n = ((c[k >> 2] = f), +g[k >> 2]) * 0.5;
      m = +R(+n) / m;
      n = +Q(+n);
      o = n * e + j * m * 0.0 - i * m * -0.0;
      h = n * 0.0 - i * m * e - m * 0.0 * 0.0;
      d = n * 0.0 + m * 0.0 * 0.0 - j * m * e;
      e = -(m * 0.0 * e) - j * m * 0.0 - i * m * -0.0;
      g[a >> 2] = i * m * h + (n * o + e * -(m * 0.0)) - d * -(j * m);
      g[(a + 4) >> 2] = d * -(m * 0.0) + (n * h + e * -(j * m)) - i * m * o;
      g[(a + 8) >> 2] = o * -(j * m) + (i * m * e + n * d) - h * -(m * 0.0);
      g[(a + 12) >> 2] = 0.0;
      return;
    }
    function Fj(a, d, f, h) {
      a = a | 0;
      d = d | 0;
      f = f | 0;
      h = h | 0;
      var i = 0,
        j = 0,
        k = 0,
        l = 0,
        m = 0;
      i = c[(a + 108) >> 2] | 0;
      if (i | 0) {
        mc[c[((c[i >> 2] | 0) + 28) >> 2] & 127](i, d, f, h);
        return;
      }
      i = b[(a + 56) >> 1] | 0;
      if (((i & 65535) << 1) >>> 0 <= 1) return;
      k = 1;
      m = 1;
      do {
        j = c[(a + 68) >> 2] | 0;
        if (b[(j + (k << 2)) >> 1] & 1) {
          l = c[(a + 60) >> 2] | 0;
          k = e[(j + (k << 2) + 2) >> 1] | 0;
          if (
            !(+g[d >> 2] > +g[(l + (k << 6) + 32) >> 2])
              ? !(+g[f >> 2] < +g[(l + (k << 6) + 16) >> 2])
              : 0
          )
            j = 1;
          else j = 0;
          if (
            !(!(+g[(d + 8) >> 2] > +g[(l + (k << 6) + 40) >> 2])
              ? !(+g[(f + 8) >> 2] < +g[(l + (k << 6) + 24) >> 2])
              : 0)
          )
            j = 0;
          if (
            !(+g[(d + 4) >> 2] > +g[(l + (k << 6) + 36) >> 2])
              ? !((+g[(f + 4) >> 2] < +g[(l + (k << 6) + 20) >> 2]) | (j ^ 1))
              : 0
          ) {
            Zb[c[((c[h >> 2] | 0) + 8) >> 2] & 31](h, (l + (k << 6)) | 0) | 0;
            i = b[(a + 56) >> 1] | 0;
          }
        }
        m = ((m + 1) << 16) >> 16;
        k = m & 65535;
      } while (k >>> 0 < (((i & 65535) << 1) | 1) >>> 0);
      return;
    }
    function Gj(a, b, d) {
      a = a | 0;
      b = +b;
      d = +d;
      var e = 0,
        f = 0,
        h = 0,
        i = 0.0,
        j = 0.0,
        k = 0.0,
        l = 0.0,
        m = 0.0,
        n = 0.0,
        o = 0.0,
        p = 0,
        q = 0.0;
      f = c[(a + 732) >> 2] | 0;
      if ((f | 0) <= 0) return;
      a = c[(a + 740) >> 2] | 0;
      e = 0;
      do {
        d = +g[(a + ((e * 52) | 0) + 24) >> 2];
        if (
          d > 0.0
            ? ((p = c[(a + ((e * 52) | 0) + 8) >> 2] | 0),
              (h = c[(a + ((e * 52) | 0) + 12) >> 2] | 0),
              (i = +g[(p + 8) >> 2]),
              (j = +g[(h + 8) >> 2] - i),
              (k = +g[(p + 12) >> 2]),
              (l = +g[(h + 12) >> 2] - k),
              (m = +g[(p + 16) >> 2]),
              (n = +g[(h + 16) >> 2] - m),
              (o = +g[(a + ((e * 52) | 0) + 28) >> 2]),
              o + (j * j + l * l + n * n) > 1.1920928955078125e-7)
            : 0
        ) {
          d =
            ((o - (j * j + l * l + n * n)) /
              (d * (o + (j * j + l * l + n * n)))) *
            b;
          q = d * +g[(p + 88) >> 2];
          g[(p + 8) >> 2] = i - j * q;
          g[(p + 12) >> 2] = k - l * q;
          g[(p + 16) >> 2] = m - n * q;
          d = d * +g[(h + 88) >> 2];
          g[(h + 8) >> 2] = +g[(h + 8) >> 2] + j * d;
          g[(h + 12) >> 2] = l * d + +g[(h + 12) >> 2];
          g[(h + 16) >> 2] = n * d + +g[(h + 16) >> 2];
        }
        e = (e + 1) | 0;
      } while ((e | 0) != (f | 0));
      return;
    }
    function Hj(a, b, d) {
      a = a | 0;
      b = b | 0;
      d = d | 0;
      var e = 0,
        f = 0.0,
        h = 0.0,
        j = 0.0,
        k = 0.0,
        l = 0.0,
        m = 0.0,
        n = 0;
      e = i;
      i = (i + 96) | 0;
      c[(e + 32) >> 2] = 1065353216;
      c[(e + 32 + 4) >> 2] = 0;
      c[(e + 32 + 4 + 4) >> 2] = 0;
      c[(e + 32 + 4 + 8) >> 2] = 0;
      c[(e + 32 + 4 + 12) >> 2] = 0;
      c[(e + 32 + 20) >> 2] = 1065353216;
      c[(e + 32 + 24) >> 2] = 0;
      c[(e + 32 + 24 + 4) >> 2] = 0;
      c[(e + 32 + 24 + 8) >> 2] = 0;
      c[(e + 32 + 24 + 12) >> 2] = 0;
      c[(e + 32 + 40) >> 2] = 1065353216;
      n = (e + 32 + 44) | 0;
      c[n >> 2] = 0;
      c[(n + 4) >> 2] = 0;
      c[(n + 8) >> 2] = 0;
      c[(n + 12) >> 2] = 0;
      c[(n + 16) >> 2] = 0;
      mc[c[((c[a >> 2] | 0) + 8) >> 2] & 127](a, (e + 32) | 0, (e + 16) | 0, e);
      l = +g[e >> 2];
      m = +g[(e + 16) >> 2];
      j = +g[(e + 4) >> 2];
      k = +g[(e + 16 + 4) >> 2];
      f = +g[(e + 8) >> 2];
      h = +g[(e + 16 + 8) >> 2];
      g[d >> 2] =
        +O(+((l - m) * (l - m) + (j - k) * (j - k) + (f - h) * (f - h))) * 0.5;
      g[b >> 2] = (m + l) * 0.5;
      g[(b + 4) >> 2] = (k + j) * 0.5;
      g[(b + 8) >> 2] = (h + f) * 0.5;
      g[(b + 12) >> 2] = 0.0;
      i = e;
      return;
    }
    function Ij(a, b, d) {
      a = a | 0;
      b = b | 0;
      d = d | 0;
      var e = 0,
        f = 0.0,
        h = 0.0,
        i = 0.0,
        j = 0.0,
        k = 0.0;
      c[(a + 4) >> 2] = c[(b + 24) >> 2];
      e = c[b >> 2] | 0;
      c[(a + 8) >> 2] = e;
      if (d) {
        c[(a + 52) >> 2] = c[(b + 8) >> 2];
        c[(a + 52 + 4) >> 2] = c[(b + 8 + 4) >> 2];
        c[(a + 52 + 8) >> 2] = c[(b + 8 + 8) >> 2];
        c[(a + 52 + 12) >> 2] = c[(b + 8 + 12) >> 2];
      } else {
        k = +g[(b + 8) >> 2];
        j = +g[(b + 12) >> 2];
        i = +g[(b + 16) >> 2];
        h =
          +g[(e + 20) >> 2] * k + +g[(e + 24) >> 2] * j + +g[(e + 28) >> 2] * i;
        f =
          +g[(e + 36) >> 2] * k + +g[(e + 40) >> 2] * j + +g[(e + 44) >> 2] * i;
        g[(a + 52) >> 2] =
          +g[(e + 4) >> 2] * k + +g[(e + 8) >> 2] * j + +g[(e + 12) >> 2] * i;
        g[(a + 56) >> 2] = h;
        g[(a + 60) >> 2] = f;
        g[(a + 64) >> 2] = 0.0;
      }
      k = +g[(b + 24) >> 2];
      g[(a + 68) >> 2] = (1.0 - k) * +g[(a + 20) >> 2] + +g[(a + 36) >> 2] * k;
      g[(a + 72) >> 2] = (1.0 - k) * +g[(a + 24) >> 2] + +g[(a + 40) >> 2] * k;
      g[(a + 76) >> 2] = (1.0 - k) * +g[(a + 28) >> 2] + +g[(a + 44) >> 2] * k;
      return +(+g[(b + 24) >> 2]);
    }
    function Jj(a, b, d, e) {
      a = a | 0;
      b = b | 0;
      d = d | 0;
      e = e | 0;
      var f = 0.0,
        h = 0.0,
        i = 0.0,
        j = 0.0,
        k = 0;
      f = +g[b >> 2];
      h = +g[(b + 16) >> 2];
      j = f < h ? f : h;
      i = +g[(b + 32) >> 2];
      if ((j < i ? j : i) > +g[(a + 24) >> 2]) return;
      k = f > h ? b : (b + 16) | 0;
      if (+g[(+g[k >> 2] > i ? k : (b + 32) | 0) >> 2] < +g[(a + 8) >> 2])
        return;
      f = +g[(b + 8) >> 2];
      h = +g[(b + 24) >> 2];
      j = f < h ? f : h;
      i = +g[(b + 40) >> 2];
      if ((j < i ? j : i) > +g[(a + 32) >> 2]) return;
      k = f > h ? (b + 8) | 0 : (b + 24) | 0;
      if (+g[(+g[k >> 2] > i ? k : (b + 40) | 0) >> 2] < +g[(a + 16) >> 2])
        return;
      f = +g[(b + 4) >> 2];
      h = +g[(b + 20) >> 2];
      j = f < h ? f : h;
      i = +g[(b + 36) >> 2];
      if ((j < i ? j : i) > +g[(a + 28) >> 2]) return;
      k = f > h ? (b + 4) | 0 : (b + 20) | 0;
      if (+g[(+g[k >> 2] > i ? k : (b + 36) | 0) >> 2] < +g[(a + 12) >> 2])
        return;
      k = c[(a + 4) >> 2] | 0;
      mc[c[((c[k >> 2] | 0) + 8) >> 2] & 127](k, b, d, e);
      return;
    }
    function Kj(b, d, e, f) {
      b = b | 0;
      d = d | 0;
      e = e | 0;
      f = +f;
      var h = 0,
        j = 0.0,
        k = 0.0,
        l = 0.0;
      h = i;
      i = (i + 16) | 0;
      g[(b + 32) >> 2] = f;
      c[(b + 8) >> 2] = c[d >> 2];
      c[(b + 8 + 4) >> 2] = c[(d + 4) >> 2];
      c[(b + 8 + 8) >> 2] = c[(d + 8) >> 2];
      c[(b + 8 + 12) >> 2] = c[(d + 12) >> 2];
      j = +g[(b + 28) >> 2];
      l = +g[(e + 4) >> 2] - j * +g[(d + 4) >> 2];
      k = +g[(e + 8) >> 2] - j * +g[(d + 8) >> 2];
      g[h >> 2] = +g[e >> 2] - +g[d >> 2] * j;
      g[(h + 4) >> 2] = l;
      g[(h + 8) >> 2] = k;
      g[(h + 12) >> 2] = 0.0;
      f = +g[(b + 24) >> 2] + j + f;
      g[(b + 32) >> 2] = f;
      if (!(f < 0.0)) {
        b = (b + 4) | 0;
        b = c[b >> 2] | 0;
        e = c[b >> 2] | 0;
        e = (e + 16) | 0;
        e = c[e >> 2] | 0;
        hc[e & 15](b, d, h, f);
        i = h;
        return;
      }
      a[(b + 36) >> 0] = 1;
      b = (b + 4) | 0;
      b = c[b >> 2] | 0;
      e = c[b >> 2] | 0;
      e = (e + 16) | 0;
      e = c[e >> 2] | 0;
      hc[e & 15](b, d, h, f);
      i = h;
      return;
    }
    function Lj(b) {
      b = b | 0;
      var d = 0,
        e = 0,
        f = 0,
        g = 0,
        h = 0;
      c[b >> 2] = 6228;
      d = c[(b + 8) >> 2] | 0;
      e = c[(d + 8) >> 2] | 0;
      if ((e | 0) > 0) {
        g = 0;
        do {
          f = c[((c[(d + 16) >> 2] | 0) + ((g * 12) | 0) + 8) >> 2] | 0;
          if (f | 0) {
            Ab[c[c[f >> 2] >> 2] & 255](f);
            h = c[(b + 4) >> 2] | 0;
            Cb[c[((c[h >> 2] | 0) + 60) >> 2] & 127](h, f);
          }
          g = (g + 1) | 0;
        } while ((g | 0) != (e | 0));
        d = c[(b + 8) >> 2] | 0;
      }
      $h(d);
      d = c[(b + 8) >> 2] | 0;
      Ab[c[c[d >> 2] >> 2] & 255](d);
      d = c[(b + 8) >> 2] | 0;
      if (d | 0) {
        c[6436] = (c[6436] | 0) + 1;
        hd(c[(d + -4) >> 2] | 0);
      }
      d = c[(b + 24) >> 2] | 0;
      if (!d) {
        a[(b + 28) >> 0] = 1;
        c[(b + 24) >> 2] = 0;
        c[(b + 16) >> 2] = 0;
        h = (b + 20) | 0;
        c[h >> 2] = 0;
        return;
      }
      if (a[(b + 28) >> 0] | 0) {
        c[6436] = (c[6436] | 0) + 1;
        hd(c[(d + -4) >> 2] | 0);
      }
      c[(b + 24) >> 2] = 0;
      a[(b + 28) >> 0] = 1;
      c[(b + 24) >> 2] = 0;
      c[(b + 16) >> 2] = 0;
      h = (b + 20) | 0;
      c[h >> 2] = 0;
      return;
    }
    function Mj(a, b) {
      a = a | 0;
      b = b | 0;
      var d = 0,
        e = 0.0,
        f = 0.0,
        h = 0.0,
        j = 0.0,
        k = 0.0,
        l = 0.0,
        m = 0.0;
      d = i;
      i = (i + 64) | 0;
      c[(d + 4) >> 2] = 0;
      c[(d + 4 + 4) >> 2] = 0;
      c[(d + 24) >> 2] = 0;
      c[(d + 24 + 4) >> 2] = 0;
      c[(d + 44) >> 2] = 0;
      c[(d + 44 + 4) >> 2] = 0;
      c[(d + 44 + 8) >> 2] = 0;
      c[(d + 44 + 12) >> 2] = 0;
      c[(d + 44 + 16) >> 2] = 0;
      j = +g[b >> 2];
      f = +g[(b + 4) >> 2];
      m = +g[(b + 8) >> 2];
      k = +g[(b + 12) >> 2];
      h = j * (2.0 / (j * j + f * f + m * m + k * k));
      e = f * (2.0 / (j * j + f * f + m * m + k * k));
      l = m * (2.0 / (j * j + f * f + m * m + k * k));
      g[d >> 2] = 1.0 - (f * e + m * l);
      g[(d + 4) >> 2] = j * e - k * l;
      g[(d + 8) >> 2] = j * l + k * e;
      g[(d + 12) >> 2] = 0.0;
      g[(d + 16) >> 2] = j * e + k * l;
      g[(d + 20) >> 2] = 1.0 - (j * h + m * l);
      g[(d + 24) >> 2] = f * l - k * h;
      g[(d + 28) >> 2] = 0.0;
      g[(d + 32) >> 2] = j * l - k * e;
      g[(d + 36) >> 2] = f * l + k * h;
      g[(d + 40) >> 2] = 1.0 - (j * h + f * e);
      g[(d + 44) >> 2] = 0.0;
      Pd(a, d);
      i = d;
      return;
    }
    function Nj(b, d, e) {
      b = b | 0;
      d = d | 0;
      e = e | 0;
      var f = 0;
      while (1) {
        b = yc(152) | 0;
        if (b | 0) {
          f = 6;
          break;
        }
        b = c[6564] | 0;
        c[6564] = b + 0;
        if (!b) {
          f = 5;
          break;
        }
        jc[b & 3]();
      }
      if ((f | 0) == 5) {
        e = Ya(4) | 0;
        c[e >> 2] = 9640;
        pb(e | 0, 2800, 251);
      } else if ((f | 0) == 6) {
        c[b >> 2] = 4816;
        a[(b + 20) >> 0] = 1;
        c[(b + 16) >> 2] = 0;
        c[(b + 8) >> 2] = 0;
        c[(b + 12) >> 2] = 0;
        a[(b + 40) >> 0] = 1;
        c[(b + 36) >> 2] = 0;
        c[(b + 28) >> 2] = 0;
        c[(b + 32) >> 2] = 0;
        a[(b + 60) >> 0] = 1;
        c[(b + 56) >> 2] = 0;
        c[(b + 48) >> 2] = 0;
        c[(b + 52) >> 2] = 0;
        a[(b + 80) >> 0] = 1;
        c[(b + 76) >> 2] = 0;
        c[(b + 68) >> 2] = 0;
        c[(b + 72) >> 2] = 0;
        c[(b + 100) >> 2] = e;
        g[(b + 104) >> 2] = 0.0;
        a[(b + 148) >> 0] = 1;
        c[(b + 144) >> 2] = 0;
        c[(b + 136) >> 2] = 0;
        c[(b + 140) >> 2] = 0;
        c[(b + 116) >> 2] = d;
        c[(b + 120) >> 2] = 0;
        c[(b + 124) >> 2] = 2;
        c[(b + 128) >> 2] = 1;
        g[(b + 112) >> 2] = 0.0;
        g[(b + 108) >> 2] = 0.0;
        return b | 0;
      }
      return 0;
    }
    function Oj() {
      var b = 0;
      c[6435] = (c[6435] | 0) + 1;
      b = yc(215) | 0;
      if (!b) b = 0;
      else {
        c[(((b + 4 + 15) & -16) + -4) >> 2] = b;
        b = (b + 4 + 15) & -16;
      }
      c[b >> 2] = 4756;
      a[(b + 20) >> 0] = 1;
      c[(b + 16) >> 2] = 0;
      c[(b + 8) >> 2] = 0;
      c[(b + 12) >> 2] = 0;
      a[(b + 40) >> 0] = 1;
      c[(b + 36) >> 2] = 0;
      c[(b + 28) >> 2] = 0;
      c[(b + 32) >> 2] = 0;
      a[(b + 60) >> 0] = 1;
      c[(b + 56) >> 2] = 0;
      c[(b + 48) >> 2] = 0;
      c[(b + 52) >> 2] = 0;
      a[(b + 80) >> 0] = 1;
      c[(b + 76) >> 2] = 0;
      c[(b + 68) >> 2] = 0;
      c[(b + 72) >> 2] = 0;
      a[(b + 100) >> 0] = 1;
      c[(b + 96) >> 2] = 0;
      c[(b + 88) >> 2] = 0;
      c[(b + 92) >> 2] = 0;
      a[(b + 120) >> 0] = 1;
      c[(b + 116) >> 2] = 0;
      c[(b + 108) >> 2] = 0;
      c[(b + 112) >> 2] = 0;
      a[(b + 140) >> 0] = 1;
      c[(b + 136) >> 2] = 0;
      c[(b + 128) >> 2] = 0;
      c[(b + 132) >> 2] = 0;
      a[(b + 160) >> 0] = 1;
      c[(b + 156) >> 2] = 0;
      c[(b + 148) >> 2] = 0;
      c[(b + 152) >> 2] = 0;
      a[(b + 180) >> 0] = 1;
      c[(b + 176) >> 2] = 0;
      c[(b + 168) >> 2] = 0;
      c[(b + 172) >> 2] = 0;
      c[(b + 192) >> 2] = 0;
      return b | 0;
    }
    function Pj(b, d, e) {
      b = b | 0;
      d = d | 0;
      e = e | 0;
      var f = 0,
        g = 0;
      if ((c[(d + 60) >> 2] | 0) == 2) {
        f = c[(d + 48) >> 2] | 0;
        hh((b + 64) | 0, f) | 0;
        g = c[(b + 68) >> 2] | 0;
        if (g | 0) {
          c[6436] = (c[6436] | 0) + 1;
          hd(c[(g + -4) >> 2] | 0);
        }
        c[(b + 68) >> 2] = f;
        c[(b + 76) >> 2] = (c[(b + 76) >> 2] | 0) + -1;
      } else {
        f = c[(d + 48) >> 2] | 0;
        hh((b + 4) | 0, f) | 0;
        g = c[(b + 8) >> 2] | 0;
        if (g | 0) {
          c[6436] = (c[6436] | 0) + 1;
          hd(c[(g + -4) >> 2] | 0);
        }
        c[(b + 8) >> 2] = f;
        c[(b + 16) >> 2] = (c[(b + 16) >> 2] | 0) + -1;
      }
      f = c[(d + 52) >> 2] | 0;
      g = c[(d + 56) >> 2] | 0;
      if (!f) c[(b + 124 + (c[(d + 60) >> 2] << 2)) >> 2] = g;
      else c[(f + 56) >> 2] = g;
      f = c[(d + 56) >> 2] | 0;
      if (f | 0) c[(f + 52) >> 2] = c[(d + 52) >> 2];
      g = c[(b + 136) >> 2] | 0;
      ic[c[((c[g >> 2] | 0) + 16) >> 2] & 127](g, d, e);
      c[6436] = (c[6436] | 0) + 1;
      hd(c[(d + -4) >> 2] | 0);
      a[(b + 194) >> 0] = 1;
      return;
    }
    function Qj(a, b, d, e) {
      a = a | 0;
      b = b | 0;
      d = d | 0;
      e = e | 0;
      var f = 0,
        g = 0;
      f = i;
      i = (i + 96) | 0;
      g = c[(b + 192) >> 2] | 0;
      c[(f + 64) >> 2] = 0;
      c[(f + 64 + 4) >> 2] = g;
      c[(f + 64 + 8) >> 2] = b;
      c[(f + 64 + 12) >> 2] = b + 4;
      c[(f + 64 + 16) >> 2] = -1;
      c[(f + 64 + 20) >> 2] = -1;
      b = c[(d + 192) >> 2] | 0;
      c[(f + 40) >> 2] = 0;
      c[(f + 40 + 4) >> 2] = b;
      c[(f + 40 + 8) >> 2] = d;
      c[(f + 40 + 12) >> 2] = d + 4;
      c[(f + 40 + 16) >> 2] = -1;
      c[(f + 40 + 20) >> 2] = -1;
      b = c[(a + 24) >> 2] | 0;
      b =
        Ib[c[((c[b >> 2] | 0) + 8) >> 2] & 31](
          b,
          (f + 64) | 0,
          (f + 40) | 0,
          0
        ) | 0;
      if (!b) {
        i = f;
        return;
      }
      c[(f + 4) >> 2] = 0;
      c[(f + 8) >> 2] = f + 64;
      c[(f + 12) >> 2] = f + 40;
      c[f >> 2] = 5976;
      c[(f + 32) >> 2] = e;
      yb[c[((c[b >> 2] | 0) + 8) >> 2] & 31](
        b,
        (f + 64) | 0,
        (f + 40) | 0,
        (a + 28) | 0,
        f
      );
      Ab[c[c[b >> 2] >> 2] & 255](b);
      g = c[(a + 24) >> 2] | 0;
      Cb[c[((c[g >> 2] | 0) + 60) >> 2] & 127](g, b);
      i = f;
      return;
    }
    function Rj(a, b, d) {
      a = a | 0;
      b = +b;
      d = d | 0;
      var e = 0.0,
        f = 0.0,
        h = 0.0,
        i = 0.0,
        j = 0.0;
      e = +g[(a + 28) >> 2];
      i = +g[(a + 32) >> 2];
      h = +g[(a + 36) >> 2];
      j = +Sb[c[((c[a >> 2] | 0) + 48) >> 2] & 15](a);
      f = +Sb[c[((c[a >> 2] | 0) + 48) >> 2] & 15](a);
      h = +Sb[c[((c[a >> 2] | 0) + 48) >> 2] & 15](a) + h;
      switch (c[(a + 52) >> 2] | 0) {
        case 0: {
          j =
            b * 0.25 * (f + i) * (f + i) + (b / 12.0) * (j + e) * (j + e) * 4.0;
          g[d >> 2] = b * 0.5 * (f + i) * (f + i);
          g[(d + 4) >> 2] = j;
          g[(d + 8) >> 2] = j;
          g[(d + 12) >> 2] = 0.0;
          return;
        }
        case 2: {
          g[d >> 2] = b * 0.25 * (j + e) * (j + e) + (b / 12.0) * h * h * 4.0;
          g[(d + 4) >> 2] =
            b * 0.25 * (j + e) * (j + e) + (b / 12.0) * h * h * 4.0;
          g[(d + 8) >> 2] = b * 0.5 * (j + e) * (j + e);
          g[(d + 12) >> 2] = 0.0;
          return;
        }
        default: {
          i =
            b * 0.25 * (j + e) * (j + e) + (b / 12.0) * (f + i) * (f + i) * 4.0;
          g[d >> 2] = i;
          g[(d + 4) >> 2] = b * 0.5 * (j + e) * (j + e);
          g[(d + 8) >> 2] = i;
          g[(d + 12) >> 2] = 0.0;
          return;
        }
      }
    }
    function Sj(b, d) {
      b = b | 0;
      d = d | 0;
      c[(b + 8) >> 2] = 0;
      c[b >> 2] = 6292;
      a[(b + 28) >> 0] = 1;
      c[(b + 24) >> 2] = 0;
      c[(b + 16) >> 2] = 0;
      c[(b + 20) >> 2] = 0;
      c[(b + 32) >> 2] = 1566444395;
      c[(b + 36) >> 2] = 1566444395;
      c[(b + 40) >> 2] = 1566444395;
      g[(b + 44) >> 2] = 0.0;
      c[(b + 48) >> 2] = -581039253;
      c[(b + 52) >> 2] = -581039253;
      c[(b + 56) >> 2] = -581039253;
      g[(b + 60) >> 2] = 0.0;
      c[(b + 64) >> 2] = 0;
      c[(b + 68) >> 2] = 1;
      g[(b + 72) >> 2] = 0.0;
      c[(b + 76) >> 2] = 1065353216;
      c[(b + 80) >> 2] = 1065353216;
      c[(b + 84) >> 2] = 1065353216;
      g[(b + 88) >> 2] = 0.0;
      c[(b + 4) >> 2] = 31;
      if (!d) return;
      c[6435] = (c[6435] | 0) + 1;
      d = yc(79) | 0;
      if (!d) d = 0;
      else {
        c[(((d + 4 + 15) & -16) + -4) >> 2] = d;
        d = (d + 4 + 15) & -16;
      }
      a[(d + 36) >> 0] = 1;
      c[(d + 32) >> 2] = 0;
      c[(d + 24) >> 2] = 0;
      c[(d + 28) >> 2] = 0;
      a[(d + 56) >> 0] = 1;
      c[(d + 52) >> 2] = 0;
      c[(d + 44) >> 2] = 0;
      c[(d + 48) >> 2] = 0;
      c[d >> 2] = 0;
      c[(d + 4) >> 2] = 0;
      c[(d + 8) >> 2] = -1;
      c[(d + 12) >> 2] = 0;
      c[(d + 16) >> 2] = 0;
      c[(b + 64) >> 2] = d;
      return;
    }
    function Tj(a) {
      a = a | 0;
      var b = 0;
      c[a >> 2] = 3068;
      b = c[(a + 92) >> 2] | 0;
      Ab[c[c[b >> 2] >> 2] & 255](b);
      b = c[(a + 92) >> 2] | 0;
      if (b | 0) {
        c[6436] = (c[6436] | 0) + 1;
        hd(c[(b + -4) >> 2] | 0);
      }
      b = c[(a + 96) >> 2] | 0;
      Ab[c[c[b >> 2] >> 2] & 255](b);
      b = c[(a + 96) >> 2] | 0;
      if (b | 0) {
        c[6436] = (c[6436] | 0) + 1;
        hd(c[(b + -4) >> 2] | 0);
      }
      b = c[(a + 100) >> 2] | 0;
      Ab[c[c[b >> 2] >> 2] & 255](b);
      b = c[(a + 100) >> 2] | 0;
      if (b | 0) {
        c[6436] = (c[6436] | 0) + 1;
        hd(c[(b + -4) >> 2] | 0);
      }
      b = c[(a + 104) >> 2] | 0;
      Ab[c[c[b >> 2] >> 2] & 255](b);
      b = c[(a + 104) >> 2] | 0;
      if (b | 0) {
        c[6436] = (c[6436] | 0) + 1;
        hd(c[(b + -4) >> 2] | 0);
      }
      b = c[(a + 108) >> 2] | 0;
      Ab[c[c[b >> 2] >> 2] & 255](b);
      b = c[(a + 108) >> 2] | 0;
      if (!b) {
        kf(a);
        return;
      }
      c[6436] = (c[6436] | 0) + 1;
      hd(c[(b + -4) >> 2] | 0);
      kf(a);
      return;
    }
    function Uj(b, d, e, f) {
      b = b | 0;
      d = d | 0;
      e = +e;
      f = f | 0;
      var h = 0,
        i = 0;
      c[6435] = (c[6435] | 0) + 1;
      h = yc(203) | 0;
      if (!h) h = 0;
      else {
        c[(((h + 4 + 15) & -16) + -4) >> 2] = h;
        h = (h + 4 + 15) & -16;
      }
      c[h >> 2] = 4872;
      i = (h + 60) | 0;
      a[(h + 144) >> 0] = 1;
      c[(h + 140) >> 2] = 0;
      c[(h + 132) >> 2] = 0;
      c[(h + 136) >> 2] = 0;
      c[(h + 176) >> 2] = f;
      g[(h + 56) >> 2] = 0.019999999552965164;
      c[i >> 2] = 0;
      c[(i + 4) >> 2] = 0;
      c[(i + 8) >> 2] = 0;
      c[(i + 12) >> 2] = 0;
      a[(h + 170) >> 0] = 1;
      c[(h + 8) >> 2] = b;
      g[(h + 52) >> 2] = e;
      g[(h + 48) >> 2] = 0.0;
      c[(h + 12) >> 2] = d;
      a[(h + 171) >> 0] = 1;
      g[(h + 172) >> 2] = 0.0;
      g[(h + 16) >> 2] = 0.0;
      g[(h + 20) >> 2] = 0.0;
      g[(h + 44) >> 2] = 29.399999618530273;
      g[(h + 24) >> 2] = 55.0;
      g[(h + 28) >> 2] = 10.0;
      a[(h + 168) >> 0] = 0;
      a[(h + 169) >> 0] = 0;
      a[(h + 180) >> 0] = 1;
      g[(h + 36) >> 2] = 0.7853981852531433;
      g[(h + 40) >> 2] = 0.7071067690849304;
      g[(h + 108) >> 2] = 0.0;
      a[(h + 181) >> 0] = 0;
      a[(h + 182) >> 0] = 0;
      return h | 0;
    }
    function Vj(a, b, d) {
      a = a | 0;
      b = b | 0;
      d = d | 0;
      var e = 0.0,
        f = 0.0,
        h = 0,
        i = 0.0,
        j = 0.0,
        k = 0.0,
        l = 0,
        m = 0;
      m = c[(b + 52) >> 2] | 0;
      l = c[(m + 32) >> 2] | 0;
      b = c[l >> 2] | 0;
      m = c[(m + 24) >> 2] | 0;
      if ((m | 0) <= 1) {
        m = b;
        m = (m + 8) | 0;
        c[a >> 2] = c[m >> 2];
        c[(a + 4) >> 2] = c[(m + 4) >> 2];
        c[(a + 8) >> 2] = c[(m + 8) >> 2];
        c[(a + 12) >> 2] = c[(m + 12) >> 2];
        return;
      }
      j = +g[d >> 2];
      k = +g[(d + 4) >> 2];
      i = +g[(d + 8) >> 2];
      f = j * +g[(b + 8) >> 2] + k * +g[(b + 12) >> 2] + i * +g[(b + 16) >> 2];
      d = 1;
      h = 0;
      while (1) {
        b = c[(l + (d << 2)) >> 2] | 0;
        e =
          j * +g[(b + 8) >> 2] + k * +g[(b + 12) >> 2] + i * +g[(b + 16) >> 2];
        b = e > f;
        h = b ? d : h;
        d = (d + 1) | 0;
        if ((d | 0) == (m | 0)) break;
        else f = b ? e : f;
      }
      m = c[(l + (h << 2)) >> 2] | 0;
      m = (m + 8) | 0;
      c[a >> 2] = c[m >> 2];
      c[(a + 4) >> 2] = c[(m + 4) >> 2];
      c[(a + 8) >> 2] = c[(m + 8) >> 2];
      c[(a + 12) >> 2] = c[(m + 12) >> 2];
      return;
    }
    function Ld(b, d, e, f) {
      b = b | 0;
      d = d | 0;
      e = e | 0;
      f = f | 0;
      var h = 0,
        j = 0.0,
        k = 0.0,
        l = 0.0,
        m = 0.0,
        n = 0.0,
        o = 0.0,
        p = 0.0,
        q = 0.0,
        r = 0.0,
        s = 0.0,
        t = 0.0,
        u = 0.0,
        v = 0.0,
        w = 0.0,
        x = 0.0,
        y = 0.0,
        z = 0.0,
        A = 0.0,
        B = 0.0,
        C = 0.0,
        D = 0.0,
        E = 0.0,
        F = 0.0,
        G = 0.0,
        H = 0.0,
        I = 0.0,
        J = 0.0,
        K = 0,
        L = 0,
        M = 0,
        N = 0,
        O = 0;
      h = i;
      i = (i + 256) | 0;
      if (!(c[(b + 16) >> 2] | 0)) {
        K = c[(b + 12) >> 2] | 0;
        b = c[(b + 20) >> 2] | 0;
        n = +g[d >> 2];
        q = +g[(d + 4) >> 2];
        u = +g[(d + 8) >> 2];
        k = +g[(d + 16) >> 2];
        r = +g[(d + 20) >> 2];
        j = +g[(d + 24) >> 2];
        m = +g[(d + 32) >> 2];
        s = +g[(d + 36) >> 2];
        l = +g[(d + 40) >> 2];
        F = +g[(d + 48) >> 2];
        E = +g[(d + 52) >> 2];
        D = +g[(d + 56) >> 2];
        J = +g[e >> 2];
        I = +g[(e + 16) >> 2];
        y = +g[(e + 32) >> 2];
        H = +g[(e + 4) >> 2];
        G = +g[(e + 20) >> 2];
        w = +g[(e + 36) >> 2];
        v = +g[(e + 8) >> 2];
        z = +g[(e + 24) >> 2];
        x = +g[(e + 40) >> 2];
        C = -+g[(e + 48) >> 2];
        B = -+g[(e + 52) >> 2];
        p = -+g[(e + 56) >> 2];
        d = c[((c[K >> 2] | 0) + 64) >> 2] | 0;
        A = -+g[(b + 48) >> 2];
        t = -+g[(b + 52) >> 2];
        o = -+g[(b + 56) >> 2];
        g[(h + 16) >> 2] =
          (n * J + k * I + m * y) * A +
          (n * H + k * G + m * w) * t +
          (n * v + k * z + m * x) * o;
        g[(h + 16 + 4) >> 2] =
          (q * J + r * I + s * y) * A +
          (q * H + r * G + s * w) * t +
          (q * v + r * z + s * x) * o;
        g[(h + 16 + 8) >> 2] =
          (u * J + j * I + l * y) * A +
          (u * H + j * G + l * w) * t +
          (u * v + j * z + l * x) * o;
        g[(h + 16 + 12) >> 2] = 0.0;
        ic[d & 127]((h + 168) | 0, K, (h + 16) | 0);
        o = +g[(h + 168) >> 2];
        t = +g[(h + 168 + 4) >> 2];
        A = +g[(h + 168 + 8) >> 2];
        y =
          F * J +
          E * I +
          D * y +
          (J * C + I * B + y * p) +
          ((n * J + k * I + m * y) * o +
            (q * J + r * I + s * y) * t +
            (u * J + j * I + l * y) * A);
        w =
          F * H +
          E * G +
          D * w +
          (H * C + G * B + w * p) +
          ((n * H + k * G + m * w) * o +
            (q * H + r * G + s * w) * t +
            (u * H + j * G + l * w) * A);
        A =
          F * v +
          E * z +
          D * x +
          (v * C + z * B + x * p) +
          ((n * v + k * z + m * x) * o +
            (q * v + r * z + s * x) * t +
            (u * v + j * z + l * x) * A);
        x = +g[(b + 48) >> 2];
        l = +g[(b + 52) >> 2];
        z = +g[(b + 56) >> 2];
        j = z * A + (x * y + l * w) - +g[(b + 64) >> 2];
        v = +g[e >> 2];
        u = +g[(e + 4) >> 2];
        t = +g[(e + 8) >> 2];
        s = +g[(e + 16) >> 2];
        r = +g[(e + 20) >> 2];
        q = +g[(e + 24) >> 2];
        o = +g[(e + 32) >> 2];
        m = +g[(e + 36) >> 2];
        k = +g[(e + 40) >> 2];
        n =
          (y - x * j) * s +
          (w - l * j) * r +
          (A - z * j) * q +
          +g[(e + 52) >> 2];
        p =
          (y - x * j) * o +
          (w - l * j) * m +
          (A - z * j) * k +
          +g[(e + 56) >> 2];
        g[(h + 32) >> 2] =
          t * (A - z * j) +
          (v * (y - x * j) + u * (w - l * j)) +
          +g[(e + 48) >> 2];
        g[(h + 32 + 4) >> 2] = n;
        g[(h + 32 + 8) >> 2] = p;
        g[(h + 32 + 12) >> 2] = 0.0;
        p = +g[(b + 48) >> 2];
        n = +g[(b + 52) >> 2];
        l = +g[(b + 56) >> 2];
        g[h >> 2] = v * p + u * n + t * l;
        g[(h + 4) >> 2] = p * s + n * r + l * q;
        g[(h + 8) >> 2] = p * o + n * m + l * k;
        g[(h + 12) >> 2] = 0.0;
        hc[c[((c[f >> 2] | 0) + 16) >> 2] & 15](f, h, (h + 32) | 0, j);
        i = h;
        return;
      } else {
        N = c[(b + 4) >> 2] | 0;
        a[(N + 312) >> 0] = 0;
        c[N >> 2] = 0;
        a[(N + 356) >> 0] = 1;
        c[(N + 292) >> 2] = 1566444395;
        c[(N + 296) >> 2] = 1566444395;
        c[(N + 300) >> 2] = 1566444395;
        g[(N + 304) >> 2] = 0.0;
        c[(N + 336) >> 2] = 0;
        c[(N + 336 + 4) >> 2] = 0;
        c[(N + 336 + 8) >> 2] = 0;
        c[(N + 336 + 12) >> 2] = 0;
        a[(N + 336 + 16) >> 0] = 0;
        a[(N + 332) >> 0] = a[(N + 332) >> 0] & -16;
        N = c[(b + 12) >> 2] | 0;
        M = c[(b + 16) >> 2] | 0;
        L = c[(N + 4) >> 2] | 0;
        K = c[(M + 4) >> 2] | 0;
        I = +Sb[c[((c[N >> 2] | 0) + 48) >> 2] & 15](N);
        O = c[(b + 16) >> 2] | 0;
        J = +Sb[c[((c[O >> 2] | 0) + 48) >> 2] & 15](O);
        O = c[(b + 4) >> 2] | 0;
        b = c[(b + 8) >> 2] | 0;
        c[(h + 168) >> 2] = 9208;
        c[(h + 168 + 4) >> 2] = 0;
        c[(h + 168 + 8) >> 2] = 1065353216;
        c[(h + 168 + 12) >> 2] = 0;
        g[(h + 168 + 16) >> 2] = 0.0;
        c[(h + 168 + 20) >> 2] = b;
        c[(h + 168 + 24) >> 2] = O;
        c[(h + 168 + 28) >> 2] = N;
        c[(h + 168 + 32) >> 2] = M;
        c[(h + 168 + 36) >> 2] = L;
        c[(h + 168 + 40) >> 2] = K;
        g[(h + 168 + 44) >> 2] = I;
        g[(h + 168 + 48) >> 2] = J;
        a[(h + 168 + 52) >> 0] = 0;
        c[(h + 168 + 60) >> 2] = -1;
        c[(h + 168 + 72) >> 2] = 1;
        c[(h + 168 + 76) >> 2] = 1;
        g[(h + 32 + 128) >> 2] = 999999984306749440.0;
        c[(h + 32) >> 2] = c[d >> 2];
        c[(h + 32 + 4) >> 2] = c[(d + 4) >> 2];
        c[(h + 32 + 8) >> 2] = c[(d + 8) >> 2];
        c[(h + 32 + 12) >> 2] = c[(d + 12) >> 2];
        c[(h + 32 + 16) >> 2] = c[(d + 16) >> 2];
        c[(h + 32 + 16 + 4) >> 2] = c[(d + 16 + 4) >> 2];
        c[(h + 32 + 16 + 8) >> 2] = c[(d + 16 + 8) >> 2];
        c[(h + 32 + 16 + 12) >> 2] = c[(d + 16 + 12) >> 2];
        c[(h + 32 + 32) >> 2] = c[(d + 32) >> 2];
        c[(h + 32 + 32 + 4) >> 2] = c[(d + 32 + 4) >> 2];
        c[(h + 32 + 32 + 8) >> 2] = c[(d + 32 + 8) >> 2];
        c[(h + 32 + 32 + 12) >> 2] = c[(d + 32 + 12) >> 2];
        c[(h + 32 + 48) >> 2] = c[(d + 48) >> 2];
        c[(h + 32 + 48 + 4) >> 2] = c[(d + 48 + 4) >> 2];
        c[(h + 32 + 48 + 8) >> 2] = c[(d + 48 + 8) >> 2];
        c[(h + 32 + 48 + 12) >> 2] = c[(d + 48 + 12) >> 2];
        c[(h + 32 + 64) >> 2] = c[e >> 2];
        c[(h + 32 + 64 + 4) >> 2] = c[(e + 4) >> 2];
        c[(h + 32 + 64 + 8) >> 2] = c[(e + 8) >> 2];
        c[(h + 32 + 64 + 12) >> 2] = c[(e + 12) >> 2];
        c[(h + 32 + 80) >> 2] = c[(e + 16) >> 2];
        c[(h + 32 + 80 + 4) >> 2] = c[(e + 16 + 4) >> 2];
        c[(h + 32 + 80 + 8) >> 2] = c[(e + 16 + 8) >> 2];
        c[(h + 32 + 80 + 12) >> 2] = c[(e + 16 + 12) >> 2];
        c[(h + 32 + 96) >> 2] = c[(e + 32) >> 2];
        c[(h + 32 + 96 + 4) >> 2] = c[(e + 32 + 4) >> 2];
        c[(h + 32 + 96 + 8) >> 2] = c[(e + 32 + 8) >> 2];
        c[(h + 32 + 96 + 12) >> 2] = c[(e + 32 + 12) >> 2];
        c[(h + 32 + 112) >> 2] = c[(e + 48) >> 2];
        c[(h + 32 + 112 + 4) >> 2] = c[(e + 48 + 4) >> 2];
        c[(h + 32 + 112 + 8) >> 2] = c[(e + 48 + 8) >> 2];
        c[(h + 32 + 112 + 12) >> 2] = c[(e + 48 + 12) >> 2];
        Vc((h + 168) | 0, (h + 32) | 0, f, 0, 0);
        i = h;
        return;
      }
    }
    function Md(d, e, f) {
      d = d | 0;
      e = e | 0;
      f = f | 0;
      var g = 0,
        j = 0,
        k = 0,
        l = 0,
        m = 0,
        n = 0,
        o = 0,
        p = 0,
        q = 0,
        r = 0,
        s = 0,
        t = 0,
        u = 0;
      t = i;
      i = (i + 32) | 0;
      g = Eb[c[((c[d >> 2] | 0) + 28) >> 2] & 127](d) | 0;
      c[(e + 20) >> 2] = g;
      c[e >> 2] = 0;
      if (!g) {
        s = (d + 4) | 0;
        f = (e + 4) | 0;
        s = c[s >> 2] | 0;
        c[f >> 2] = s;
        f = (d + 8) | 0;
        f = c[f >> 2] | 0;
        s = (e + 8) | 0;
        c[s >> 2] = f;
        s = (d + 12) | 0;
        s = c[s >> 2] | 0;
        f = (e + 12) | 0;
        c[f >> 2] = s;
        f = (d + 16) | 0;
        f = c[f >> 2] | 0;
        d = (e + 16) | 0;
        c[d >> 2] = f;
        i = t;
        return 19362;
      }
      s = Ob[c[((c[f >> 2] | 0) + 16) >> 2] & 63](f, 32, g) | 0;
      g = c[(s + 8) >> 2] | 0;
      c[e >> 2] = Zb[c[((c[f >> 2] | 0) + 28) >> 2] & 31](f, g) | 0;
      r = Eb[c[((c[d >> 2] | 0) + 28) >> 2] & 127](d) | 0;
      a: do
        if ((r | 0) > 0) {
          q = 0;
          while (1) {
            Yb[c[((c[d >> 2] | 0) + 16) >> 2] & 3](
              d,
              (t + 28) | 0,
              (t + 4) | 0,
              (t + 16) | 0,
              (t + 8) | 0,
              (t + 24) | 0,
              (t + 20) | 0,
              t,
              (t + 12) | 0,
              q
            );
            c[(g + 24) >> 2] = c[t >> 2];
            c[(g + 28) >> 2] = c[(t + 4) >> 2];
            k = (g + 12) | 0;
            m = (g + 16) | 0;
            p = (g + 4) | 0;
            c[g >> 2] = 0;
            c[(g + 4) >> 2] = 0;
            c[(g + 8) >> 2] = 0;
            c[(g + 12) >> 2] = 0;
            c[(g + 16) >> 2] = 0;
            c[(g + 20) >> 2] = 0;
            switch (c[(t + 12) >> 2] | 0) {
              case 2: {
                j = c[t >> 2] | 0;
                if (j | 0) {
                  j =
                    Ob[c[((c[f >> 2] | 0) + 16) >> 2] & 63](f, 4, (j * 3) | 0) |
                    0;
                  k = c[(j + 8) >> 2] | 0;
                  c[(g + 8) >> 2] =
                    Zb[c[((c[f >> 2] | 0) + 28) >> 2] & 31](f, k) | 0;
                  if ((c[t >> 2] | 0) > 0) {
                    l = c[(t + 24) >> 2] | 0;
                    m = 0;
                    do {
                      n = (l + (_(c[(t + 20) >> 2] | 0, m) | 0)) | 0;
                      o = (m * 3) | 0;
                      c[(k + (o << 2)) >> 2] = c[n >> 2];
                      c[(k + ((o + 1) << 2)) >> 2] = c[(n + 4) >> 2];
                      c[(k + ((o + 2) << 2)) >> 2] = c[(n + 8) >> 2];
                      m = (m + 1) | 0;
                    } while ((m | 0) < (c[t >> 2] | 0));
                  }
                  yb[c[((c[f >> 2] | 0) + 20) >> 2] & 31](
                    f,
                    j,
                    19243,
                    1497453121,
                    c[(j + 8) >> 2] | 0
                  );
                }
                break;
              }
              case 3: {
                j = c[t >> 2] | 0;
                if (j | 0) {
                  n = Ob[c[((c[f >> 2] | 0) + 16) >> 2] & 63](f, 8, j) | 0;
                  o = c[(n + 8) >> 2] | 0;
                  c[k >> 2] = Zb[c[((c[f >> 2] | 0) + 28) >> 2] & 31](f, o) | 0;
                  j = c[t >> 2] | 0;
                  if ((j | 0) > 0) {
                    k = c[(t + 24) >> 2] | 0;
                    l = c[(t + 20) >> 2] | 0;
                    m = 0;
                    do {
                      u = (k + (_(l, m) | 0)) | 0;
                      b[(o + (m << 3)) >> 1] = b[u >> 1] | 0;
                      b[(o + (m << 3) + 2) >> 1] = b[(u + 2) >> 1] | 0;
                      b[(o + (m << 3) + 4) >> 1] = b[(u + 4) >> 1] | 0;
                      m = (m + 1) | 0;
                    } while ((m | 0) != (j | 0));
                  }
                  yb[c[((c[f >> 2] | 0) + 20) >> 2] & 31](
                    f,
                    n,
                    19258,
                    1497453121,
                    c[(n + 8) >> 2] | 0
                  );
                }
                break;
              }
              case 5: {
                j = c[t >> 2] | 0;
                if (j | 0) {
                  k = Ob[c[((c[f >> 2] | 0) + 16) >> 2] & 63](f, 4, j) | 0;
                  l = c[(k + 8) >> 2] | 0;
                  c[m >> 2] = Zb[c[((c[f >> 2] | 0) + 28) >> 2] & 31](f, l) | 0;
                  if ((c[t >> 2] | 0) > 0) {
                    j = 0;
                    do {
                      u =
                        ((c[(t + 24) >> 2] | 0) +
                          (_(c[(t + 20) >> 2] | 0, j) | 0)) |
                        0;
                      a[(l + (j << 2)) >> 0] = a[u >> 0] | 0;
                      a[(l + (j << 2) + 1) >> 0] = a[(u + 1) >> 0] | 0;
                      a[(l + (j << 2) + 2) >> 0] = a[(u + 2) >> 0] | 0;
                      j = (j + 1) | 0;
                    } while ((j | 0) < (c[t >> 2] | 0));
                  }
                  yb[c[((c[f >> 2] | 0) + 20) >> 2] & 31](
                    f,
                    k,
                    19285,
                    1497453121,
                    c[(k + 8) >> 2] | 0
                  );
                }
                break;
              }
              default: {
              }
            }
            switch (c[(t + 16) >> 2] | 0) {
              case 0: {
                j = c[(t + 4) >> 2] | 0;
                if (j | 0) {
                  j = Ob[c[((c[f >> 2] | 0) + 16) >> 2] & 63](f, 16, j) | 0;
                  k = c[(j + 8) >> 2] | 0;
                  c[g >> 2] = Zb[c[((c[f >> 2] | 0) + 28) >> 2] & 31](f, k) | 0;
                  l = c[(t + 4) >> 2] | 0;
                  if ((l | 0) > 0) {
                    m = c[(t + 28) >> 2] | 0;
                    n = c[(t + 8) >> 2] | 0;
                    o = 0;
                    do {
                      u = (m + (_(n, o) | 0)) | 0;
                      c[(k + (o << 4)) >> 2] = c[u >> 2];
                      c[(k + (o << 4) + 4) >> 2] = c[(u + 4) >> 2];
                      c[(k + (o << 4) + 8) >> 2] = c[(u + 8) >> 2];
                      o = (o + 1) | 0;
                    } while ((o | 0) != (l | 0));
                  }
                  yb[c[((c[f >> 2] | 0) + 20) >> 2] & 31](
                    f,
                    j,
                    19308,
                    1497453121,
                    c[(j + 8) >> 2] | 0
                  );
                }
                break;
              }
              case 1: {
                j = c[(t + 4) >> 2] | 0;
                if (j | 0) {
                  n = Ob[c[((c[f >> 2] | 0) + 16) >> 2] & 63](f, 32, j) | 0;
                  o = c[(n + 8) >> 2] | 0;
                  c[p >> 2] = Zb[c[((c[f >> 2] | 0) + 28) >> 2] & 31](f, o) | 0;
                  j = c[(t + 4) >> 2] | 0;
                  if ((j | 0) > 0) {
                    k = c[(t + 28) >> 2] | 0;
                    l = c[(t + 8) >> 2] | 0;
                    m = 0;
                    do {
                      u = (k + (_(l, m) | 0)) | 0;
                      h[(o + (m << 5)) >> 3] = +h[u >> 3];
                      h[(o + (m << 5) + 8) >> 3] = +h[(u + 8) >> 3];
                      h[(o + (m << 5) + 16) >> 3] = +h[(u + 16) >> 3];
                      m = (m + 1) | 0;
                    } while ((m | 0) != (j | 0));
                  }
                  yb[c[((c[f >> 2] | 0) + 20) >> 2] & 31](
                    f,
                    n,
                    19327,
                    1497453121,
                    c[(n + 8) >> 2] | 0
                  );
                }
                break;
              }
              default: {
              }
            }
            Cb[c[((c[d >> 2] | 0) + 24) >> 2] & 127](d, q);
            q = (q + 1) | 0;
            if ((q | 0) == (r | 0)) {
              g = f;
              break a;
            } else g = (g + 32) | 0;
          }
        } else g = f;
      while (0);
      yb[c[((c[g >> 2] | 0) + 20) >> 2] & 31](
        f,
        s,
        19347,
        1497453121,
        c[(s + 8) >> 2] | 0
      );
      f = (d + 4) | 0;
      u = (e + 4) | 0;
      f = c[f >> 2] | 0;
      c[u >> 2] = f;
      u = (d + 8) | 0;
      u = c[u >> 2] | 0;
      f = (e + 8) | 0;
      c[f >> 2] = u;
      f = (d + 12) | 0;
      f = c[f >> 2] | 0;
      u = (e + 12) | 0;
      c[u >> 2] = f;
      d = (d + 16) | 0;
      d = c[d >> 2] | 0;
      u = (e + 16) | 0;
      c[u >> 2] = d;
      i = t;
      return 19362;
    }
    function Nd(b, d, e, f, h, i) {
      b = b | 0;
      d = d | 0;
      e = e | 0;
      f = f | 0;
      h = h | 0;
      i = i | 0;
      var j = 0,
        l = 0,
        m = 0,
        n = 0.0,
        o = 0,
        p = 0.0,
        q = 0.0,
        r = 0.0,
        s = 0.0,
        t = 0.0,
        u = 0.0,
        v = 0.0,
        w = 0.0,
        x = 0.0,
        y = 0.0,
        z = 0.0,
        A = 0.0,
        B = 0,
        C = 0,
        D = 0;
      D = c[(b + 88) >> 2] | 0;
      if (
        (D | 0) == (c[(b + 92) >> 2] | 0)
          ? ((o = D | 0 ? D << 1 : 1), (D | 0) < (o | 0))
          : 0
      ) {
        if (!o) {
          j = 0;
          l = D;
        } else {
          c[6435] = (c[6435] | 0) + 1;
          j = yc((((o * 152) | 3) + 16) | 0) | 0;
          if (!j) j = 0;
          else {
            c[(((j + 4 + 15) & -16) + -4) >> 2] = j;
            j = (j + 4 + 15) & -16;
          }
          l = c[(b + 88) >> 2] | 0;
        }
        if ((l | 0) > 0) {
          m = 0;
          do {
            _m(
              (j + ((m * 152) | 0)) | 0,
              ((c[(b + 96) >> 2] | 0) + ((m * 152) | 0)) | 0,
              152
            ) | 0;
            m = (m + 1) | 0;
          } while ((m | 0) != (l | 0));
        }
        l = c[(b + 96) >> 2] | 0;
        if (l | 0) {
          if (a[(b + 100) >> 0] | 0) {
            c[6436] = (c[6436] | 0) + 1;
            hd(c[(l + -4) >> 2] | 0);
          }
          c[(b + 96) >> 2] = 0;
        }
        a[(b + 100) >> 0] = 1;
        c[(b + 96) >> 2] = j;
        c[(b + 92) >> 2] = o;
        j = c[(b + 88) >> 2] | 0;
      } else j = D;
      c[(b + 88) >> 2] = j + 1;
      C = c[(b + 96) >> 2] | 0;
      c[(C + ((D * 152) | 0) + 140) >> 2] = h;
      c[(C + ((D * 152) | 0) + 16) >> 2] = 0;
      c[(C + ((D * 152) | 0) + 16 + 4) >> 2] = 0;
      c[(C + ((D * 152) | 0) + 16 + 8) >> 2] = 0;
      c[(C + ((D * 152) | 0) + 16 + 12) >> 2] = 0;
      g[(C + ((D * 152) | 0) + 48) >> 2] = -0.0;
      g[(C + ((D * 152) | 0) + 52) >> 2] = -0.0;
      g[(C + ((D * 152) | 0) + 56) >> 2] = -0.0;
      g[(C + ((D * 152) | 0) + 60) >> 2] = 0.0;
      b = c[(b + 16) >> 2] | 0;
      o = c[(b + ((e * 244) | 0) + 240) >> 2] | 0;
      B = c[(b + ((f * 244) | 0) + 240) >> 2] | 0;
      c[(C + ((D * 152) | 0) + 144) >> 2] = e;
      c[(C + ((D * 152) | 0) + 148) >> 2] = f;
      h = c[(i + 88) >> 2] | 0;
      c[(C + ((D * 152) | 0) + 104) >> 2] = h;
      c[(C + ((D * 152) | 0) + 132) >> 2] = 0;
      g[(C + ((D * 152) | 0) + 100) >> 2] = 0.0;
      g[(C + ((D * 152) | 0) + 96) >> 2] = 0.0;
      x = -+g[d >> 2];
      y = -+g[(d + 4) >> 2];
      z = -+g[(d + 8) >> 2];
      g[(C + ((D * 152) | 0)) >> 2] = x;
      g[(C + ((D * 152) | 0) + 4) >> 2] = y;
      g[(C + ((D * 152) | 0) + 8) >> 2] = z;
      g[(C + ((D * 152) | 0) + 12) >> 2] = 0.0;
      A = ((c[k >> 2] = h), +g[k >> 2]);
      if (o | 0) {
        j = ((g[k >> 2] =
          (+g[(o + 264) >> 2] * x +
            +g[(o + 268) >> 2] * y +
            +g[(o + 272) >> 2] * z) *
          +g[(o + 544) >> 2]),
        c[k >> 2] | 0);
        l = ((g[k >> 2] =
          (+g[(o + 280) >> 2] * x +
            +g[(o + 284) >> 2] * y +
            +g[(o + 288) >> 2] * z) *
          +g[(o + 548) >> 2]),
        c[k >> 2] | 0);
        m = ((g[k >> 2] =
          (+g[(o + 296) >> 2] * x +
            +g[(o + 300) >> 2] * y +
            +g[(o + 304) >> 2] * z) *
          +g[(o + 552) >> 2]),
        c[k >> 2] | 0);
      } else {
        j = 0;
        l = 0;
        m = 0;
      }
      c[(C + ((D * 152) | 0) + 64) >> 2] = j;
      c[(C + ((D * 152) | 0) + 68) >> 2] = l;
      c[(C + ((D * 152) | 0) + 72) >> 2] = m;
      g[(C + ((D * 152) | 0) + 76) >> 2] = 0.0;
      u = +g[d >> 2];
      v = +g[(d + 4) >> 2];
      w = +g[(d + 8) >> 2];
      d = c[(d + 12) >> 2] | 0;
      g[(C + ((D * 152) | 0) + 32) >> 2] = u;
      g[(C + ((D * 152) | 0) + 36) >> 2] = v;
      g[(C + ((D * 152) | 0) + 40) >> 2] = w;
      c[(C + ((D * 152) | 0) + 44) >> 2] = d;
      if (B | 0) {
        j = ((g[k >> 2] =
          (u * +g[(B + 264) >> 2] +
            v * +g[(B + 268) >> 2] +
            w * +g[(B + 272) >> 2]) *
          +g[(B + 544) >> 2]),
        c[k >> 2] | 0);
        l = ((g[k >> 2] =
          (u * +g[(B + 280) >> 2] +
            v * +g[(B + 284) >> 2] +
            w * +g[(B + 288) >> 2]) *
          +g[(B + 548) >> 2]),
        c[k >> 2] | 0);
        m = ((g[k >> 2] =
          (u * +g[(B + 296) >> 2] +
            v * +g[(B + 300) >> 2] +
            w * +g[(B + 304) >> 2]) *
          +g[(B + 552) >> 2]),
        c[k >> 2] | 0);
      } else {
        j = 0;
        l = 0;
        m = 0;
      }
      c[(C + ((D * 152) | 0) + 80) >> 2] = j;
      c[(C + ((D * 152) | 0) + 84) >> 2] = l;
      c[(C + ((D * 152) | 0) + 88) >> 2] = m;
      g[(C + ((D * 152) | 0) + 92) >> 2] = 0.0;
      if (o | 0) {
        n =
          +g[(o + 264) >> 2] * x +
          +g[(o + 268) >> 2] * y +
          +g[(o + 272) >> 2] * z;
        p =
          +g[(o + 280) >> 2] * x +
          +g[(o + 284) >> 2] * y +
          +g[(o + 288) >> 2] * z;
        q =
          +g[(o + 296) >> 2] * x +
          +g[(o + 300) >> 2] * y +
          +g[(o + 304) >> 2] * z;
      } else {
        n = 0.0;
        p = 0.0;
        q = 0.0;
      }
      if (B | 0) {
        r =
          +g[(B + 264) >> 2] * u +
          +g[(B + 268) >> 2] * v +
          +g[(B + 272) >> 2] * w;
        s =
          u * +g[(B + 280) >> 2] +
          v * +g[(B + 284) >> 2] +
          w * +g[(B + 288) >> 2];
        t =
          u * +g[(B + 296) >> 2] +
          v * +g[(B + 300) >> 2] +
          w * +g[(B + 304) >> 2];
      } else {
        r = 0.0;
        s = 0.0;
        t = 0.0;
      }
      s = 1.0 / (n * x + p * y + q * z + 0.0 + (r * u + s * v + t * w));
      g[(C + ((D * 152) | 0) + 108) >> 2] = s;
      if (o | 0) {
        p = +g[(b + ((e * 244) | 0) + 192) >> 2];
        q = +g[(b + ((e * 244) | 0) + 196) >> 2];
        r = +g[(b + ((e * 244) | 0) + 200) >> 2];
        n =
          (+g[(b + ((e * 244) | 0) + 176) >> 2] +
            +g[(b + ((e * 244) | 0) + 208) >> 2]) *
            0.0 +
          (+g[(b + ((e * 244) | 0) + 180) >> 2] +
            +g[(b + ((e * 244) | 0) + 212) >> 2]) *
            0.0 +
          (+g[(b + ((e * 244) | 0) + 184) >> 2] +
            +g[(b + ((e * 244) | 0) + 216) >> 2]) *
            0.0;
      } else {
        p = 0.0;
        q = 0.0;
        r = 0.0;
        n = 0.0;
      }
      n = n + (p * x + q * y + r * z);
      if (!B) {
        t = 0.0;
        x = 0.0;
        z = 0.0;
        y = -0.0;
        u = t * u;
        x = x * v;
        x = u + x;
        z = z * w;
        z = x + z;
        z = y + z;
        z = n + z;
        z = 0.0 - z;
        z = s * z;
        f = (C + ((D * 152) | 0) + 112) | 0;
        g[f >> 2] = z;
        f = (C + ((D * 152) | 0) + 116) | 0;
        g[f >> 2] = 0.0;
        A = -A;
        f = (C + ((D * 152) | 0) + 120) | 0;
        g[f >> 2] = A;
        f = (C + ((D * 152) | 0) + 124) | 0;
        c[f >> 2] = h;
        return;
      }
      t = +g[(b + ((f * 244) | 0) + 192) >> 2];
      x = +g[(b + ((f * 244) | 0) + 196) >> 2];
      z = +g[(b + ((f * 244) | 0) + 200) >> 2];
      y =
        (+g[(b + ((f * 244) | 0) + 176) >> 2] +
          +g[(b + ((f * 244) | 0) + 208) >> 2]) *
          -0.0 +
        (+g[(b + ((f * 244) | 0) + 180) >> 2] +
          +g[(b + ((f * 244) | 0) + 212) >> 2]) *
          -0.0 +
        (+g[(b + ((f * 244) | 0) + 184) >> 2] +
          +g[(b + ((f * 244) | 0) + 216) >> 2]) *
          -0.0;
      u = t * u;
      x = x * v;
      x = u + x;
      z = z * w;
      z = x + z;
      z = y + z;
      z = n + z;
      z = 0.0 - z;
      z = s * z;
      f = (C + ((D * 152) | 0) + 112) | 0;
      g[f >> 2] = z;
      f = (C + ((D * 152) | 0) + 116) | 0;
      g[f >> 2] = 0.0;
      A = -A;
      f = (C + ((D * 152) | 0) + 120) | 0;
      g[f >> 2] = A;
      f = (C + ((D * 152) | 0) + 124) | 0;
      c[f >> 2] = h;
      return;
    }
    function Od(b, d) {
      b = b | 0;
      d = d | 0;
      var e = 0,
        f = 0.0,
        h = 0,
        j = 0,
        l = 0,
        m = 0.0,
        n = 0,
        o = 0.0,
        p = 0.0,
        q = 0.0,
        r = 0.0,
        s = 0.0,
        t = 0.0,
        u = 0.0,
        v = 0.0,
        w = 0.0,
        x = 0.0;
      n = i;
      i = (i + 32) | 0;
      c[(b + 236) >> 2] = 2;
      c[(b + 312) >> 2] = 0;
      c[(b + 312 + 4) >> 2] = 0;
      c[(b + 312 + 8) >> 2] = 0;
      c[(b + 312 + 12) >> 2] = 0;
      c[(b + 312 + 16) >> 2] = 0;
      c[(b + 312 + 20) >> 2] = 0;
      c[(b + 312 + 24) >> 2] = 0;
      c[(b + 312 + 28) >> 2] = 0;
      c[(b + 544) >> 2] = 1065353216;
      c[(b + 548) >> 2] = 1065353216;
      c[(b + 552) >> 2] = 1065353216;
      g[(b + 556) >> 2] = 0.0;
      c[(b + 348) >> 2] = 1065353216;
      c[(b + 352) >> 2] = 1065353216;
      c[(b + 356) >> 2] = 1065353216;
      e = (b + 360) | 0;
      h = (e + 36) | 0;
      do {
        c[e >> 2] = 0;
        e = (e + 4) | 0;
      } while ((e | 0) < (h | 0));
      c[(b + 412) >> 2] = 0;
      c[(b + 412 + 4) >> 2] = 0;
      c[(b + 412 + 8) >> 2] = 0;
      c[(b + 412 + 12) >> 2] = 0;
      c[(b + 412 + 16) >> 2] = 0;
      c[(b + 412 + 20) >> 2] = 0;
      c[(b + 412 + 24) >> 2] = 0;
      c[(b + 412 + 28) >> 2] = 0;
      f = +g[(d + 92) >> 2];
      m = +g[(d + 96) >> 2];
      g[(n + 20) >> 2] = f;
      g[(n + 16) >> 2] = m;
      g[(n + 12) >> 2] = 0.0;
      g[(n + 8) >> 2] = 1.0;
      c[(b + 444) >> 2] =
        c[(f < 0.0 ? (n + 12) | 0 : f > 1.0 ? (n + 8) | 0 : (n + 20) | 0) >> 2];
      g[(n + 4) >> 2] = 0.0;
      g[n >> 2] = 1.0;
      c[(b + 448) >> 2] =
        c[(m < 0.0 ? (n + 4) | 0 : m > 1.0 ? n : (n + 16) | 0) >> 2];
      c[(b + 472) >> 2] = c[(d + 112) >> 2];
      c[(b + 476) >> 2] = c[(d + 116) >> 2];
      e = c[(d + 4) >> 2] | 0;
      c[(b + 480) >> 2] = e;
      c[(b + 608) >> 2] = 0;
      c[(b + 612) >> 2] = 0;
      a[(b + 452) >> 0] = a[(d + 120) >> 0] | 0;
      c[(b + 456) >> 2] = c[(d + 124) >> 2];
      c[(b + 460) >> 2] = c[(d + 128) >> 2];
      c[(b + 464) >> 2] = c[(d + 132) >> 2];
      c[(b + 468) >> 2] = c[(d + 136) >> 2];
      if (!e) {
        c[(b + 4) >> 2] = c[(d + 8) >> 2];
        c[(b + 4 + 4) >> 2] = c[(d + 8 + 4) >> 2];
        c[(b + 4 + 8) >> 2] = c[(d + 8 + 8) >> 2];
        c[(b + 4 + 12) >> 2] = c[(d + 8 + 12) >> 2];
        c[(b + 20) >> 2] = c[(d + 24) >> 2];
        c[(b + 20 + 4) >> 2] = c[(d + 24 + 4) >> 2];
        c[(b + 20 + 8) >> 2] = c[(d + 24 + 8) >> 2];
        c[(b + 20 + 12) >> 2] = c[(d + 24 + 12) >> 2];
        c[(b + 36) >> 2] = c[(d + 40) >> 2];
        c[(b + 36 + 4) >> 2] = c[(d + 40 + 4) >> 2];
        c[(b + 36 + 8) >> 2] = c[(d + 40 + 8) >> 2];
        c[(b + 36 + 12) >> 2] = c[(d + 40 + 12) >> 2];
        c[(b + 52) >> 2] = c[(d + 56) >> 2];
        c[(b + 52 + 4) >> 2] = c[(d + 56 + 4) >> 2];
        c[(b + 52 + 8) >> 2] = c[(d + 56 + 8) >> 2];
        c[(b + 52 + 12) >> 2] = c[(d + 56 + 12) >> 2];
        e = (b + 4) | 0;
        h = (b + 20) | 0;
        j = (b + 36) | 0;
        l = (b + 52) | 0;
      } else {
        Cb[c[((c[e >> 2] | 0) + 8) >> 2] & 127](e, (b + 4) | 0);
        e = (b + 4) | 0;
        h = (b + 20) | 0;
        j = (b + 36) | 0;
        l = (b + 52) | 0;
      }
      c[(b + 68) >> 2] = c[e >> 2];
      c[(b + 68 + 4) >> 2] = c[(e + 4) >> 2];
      c[(b + 68 + 8) >> 2] = c[(e + 8) >> 2];
      c[(b + 68 + 12) >> 2] = c[(e + 12) >> 2];
      c[(b + 84) >> 2] = c[h >> 2];
      c[(b + 84 + 4) >> 2] = c[(h + 4) >> 2];
      c[(b + 84 + 8) >> 2] = c[(h + 8) >> 2];
      c[(b + 84 + 12) >> 2] = c[(h + 12) >> 2];
      c[(b + 100) >> 2] = c[j >> 2];
      c[(b + 100 + 4) >> 2] = c[(j + 4) >> 2];
      c[(b + 100 + 8) >> 2] = c[(j + 8) >> 2];
      c[(b + 100 + 12) >> 2] = c[(j + 12) >> 2];
      c[(b + 116) >> 2] = c[l >> 2];
      c[(b + 116 + 4) >> 2] = c[(l + 4) >> 2];
      c[(b + 116 + 8) >> 2] = c[(l + 8) >> 2];
      c[(b + 116 + 12) >> 2] = c[(l + 12) >> 2];
      c[(b + 132) >> 2] = 0;
      c[(b + 132 + 4) >> 2] = 0;
      c[(b + 132 + 8) >> 2] = 0;
      c[(b + 132 + 12) >> 2] = 0;
      c[(b + 132 + 16) >> 2] = 0;
      c[(b + 132 + 20) >> 2] = 0;
      c[(b + 132 + 24) >> 2] = 0;
      c[(b + 132 + 28) >> 2] = 0;
      c[(b + 224) >> 2] = c[(d + 100) >> 2];
      c[(b + 232) >> 2] = c[(d + 104) >> 2];
      c[(b + 228) >> 2] = c[(d + 108) >> 2];
      Cb[c[((c[b >> 2] | 0) + 12) >> 2] & 127](b, c[(d + 72) >> 2] | 0);
      e = c[5815] | 0;
      c[5815] = e + 1;
      c[(b + 508) >> 2] = e;
      f = +g[d >> 2];
      e = c[(b + 204) >> 2] | 0;
      if (f == 0.0) {
        c[(b + 204) >> 2] = e | 1;
        m = 0.0;
      } else {
        c[(b + 204) >> 2] = e & -2;
        m = 1.0 / f;
      }
      g[(b + 344) >> 2] = m;
      p = f * +g[(b + 384) >> 2];
      o = f * +g[(b + 388) >> 2];
      g[(b + 364) >> 2] = f * +g[(b + 380) >> 2];
      g[(b + 368) >> 2] = p;
      g[(b + 372) >> 2] = o;
      g[(b + 376) >> 2] = 0.0;
      f = +g[(d + 76) >> 2];
      h = f != 0.0 ? ((g[k >> 2] = 1.0 / f), c[k >> 2] | 0) : 0;
      f = +g[(d + 80) >> 2];
      e = f != 0.0 ? ((g[k >> 2] = 1.0 / f), c[k >> 2] | 0) : 0;
      f = +g[(d + 84) >> 2];
      d = f != 0.0 ? ((g[k >> 2] = 1.0 / f), c[k >> 2] | 0) : 0;
      c[(b + 396) >> 2] = h;
      c[(b + 400) >> 2] = e;
      c[(b + 404) >> 2] = d;
      g[(b + 408) >> 2] = 0.0;
      r = m * +g[(b + 352) >> 2];
      x = m * +g[(b + 356) >> 2];
      g[(b + 560) >> 2] = m * +g[(b + 348) >> 2];
      g[(b + 564) >> 2] = r;
      g[(b + 568) >> 2] = x;
      g[(b + 572) >> 2] = 0.0;
      x = +g[(b + 4) >> 2];
      r = ((c[k >> 2] = h), +g[k >> 2]);
      w = +g[(b + 8) >> 2];
      f = ((c[k >> 2] = e), +g[k >> 2]);
      v = +g[(b + 12) >> 2];
      o = ((c[k >> 2] = d), +g[k >> 2]);
      u = +g[(b + 20) >> 2];
      t = +g[(b + 24) >> 2];
      s = +g[(b + 28) >> 2];
      q = +g[(b + 36) >> 2];
      p = +g[(b + 40) >> 2];
      m = +g[(b + 44) >> 2];
      g[(b + 264) >> 2] = x * x * r + w * w * f + v * v * o;
      g[(b + 268) >> 2] = x * r * u + w * f * t + v * o * s;
      g[(b + 272) >> 2] = x * r * q + w * f * p + v * o * m;
      g[(b + 276) >> 2] = 0.0;
      g[(b + 280) >> 2] = x * r * u + w * f * t + v * o * s;
      g[(b + 284) >> 2] = u * r * u + t * f * t + s * o * s;
      g[(b + 288) >> 2] = r * u * q + f * t * p + o * s * m;
      g[(b + 292) >> 2] = 0.0;
      g[(b + 296) >> 2] = x * r * q + w * f * p + v * o * m;
      g[(b + 300) >> 2] = u * r * q + t * f * p + s * o * m;
      g[(b + 304) >> 2] = q * r * q + p * f * p + m * o * m;
      g[(b + 308) >> 2] = 0.0;
      c[(b + 504) >> 2] = 0;
      c[(b + 512) >> 2] = 0;
      c[(b + 512 + 4) >> 2] = 0;
      c[(b + 512 + 8) >> 2] = 0;
      c[(b + 512 + 12) >> 2] = 0;
      c[(b + 512 + 16) >> 2] = 0;
      c[(b + 512 + 20) >> 2] = 0;
      c[(b + 512 + 24) >> 2] = 0;
      c[(b + 512 + 28) >> 2] = 0;
      m = +g[(b + 344) >> 2];
      o = m * +g[(b + 352) >> 2];
      p = m * +g[(b + 356) >> 2];
      g[(b + 560) >> 2] = +g[(b + 348) >> 2] * m;
      g[(b + 564) >> 2] = o;
      g[(b + 568) >> 2] = p;
      e = (b + 572) | 0;
      h = (e + 36) | 0;
      do {
        c[e >> 2] = 0;
        e = (e + 4) | 0;
      } while ((e | 0) < (h | 0));
      i = n;
      return;
    }
    function Pd(a, b) {
      a = a | 0;
      b = b | 0;
      var d = 0,
        e = 0,
        f = 0,
        h = 0,
        i = 0.0,
        j = 0.0,
        k = 0.0,
        l = 0,
        m = 0.0,
        n = 0,
        o = 0,
        p = 0.0,
        q = 0.0,
        r = 0.0,
        s = 0.0,
        t = 0.0;
      n = c[(a + 192) >> 2] | 0;
      m = +Sb[c[((c[n >> 2] | 0) + 48) >> 2] & 15](n);
      n = c[(a + 712) >> 2] | 0;
      if ((n | 0) > 0) {
        o = 0;
        do {
          l = c[(a + 720) >> 2] | 0;
          f = (l + ((o * 104) | 0) + 8) | 0;
          q = +g[f >> 2];
          h = (l + ((o * 104) | 0) + 12) | 0;
          p = +g[h >> 2];
          d = (l + ((o * 104) | 0) + 16) | 0;
          k = +g[d >> 2];
          i =
            q * +g[b >> 2] +
            p * +g[(b + 4) >> 2] +
            k * +g[(b + 8) >> 2] +
            +g[(b + 48) >> 2];
          j =
            q * +g[(b + 16) >> 2] +
            p * +g[(b + 20) >> 2] +
            k * +g[(b + 24) >> 2] +
            +g[(b + 52) >> 2];
          k =
            q * +g[(b + 32) >> 2] +
            p * +g[(b + 36) >> 2] +
            k * +g[(b + 40) >> 2] +
            +g[(b + 56) >> 2];
          g[f >> 2] = i;
          g[h >> 2] = j;
          g[d >> 2] = k;
          g[(l + ((o * 104) | 0) + 20) >> 2] = 0.0;
          d = (l + ((o * 104) | 0) + 24) | 0;
          p = +g[d >> 2];
          h = (l + ((o * 104) | 0) + 28) | 0;
          q = +g[h >> 2];
          f = (l + ((o * 104) | 0) + 32) | 0;
          r = +g[f >> 2];
          s =
            p * +g[(b + 16) >> 2] +
            q * +g[(b + 20) >> 2] +
            r * +g[(b + 24) >> 2] +
            +g[(b + 52) >> 2];
          t =
            p * +g[(b + 32) >> 2] +
            q * +g[(b + 36) >> 2] +
            r * +g[(b + 40) >> 2] +
            +g[(b + 56) >> 2];
          g[d >> 2] =
            p * +g[b >> 2] +
            q * +g[(b + 4) >> 2] +
            r * +g[(b + 8) >> 2] +
            +g[(b + 48) >> 2];
          g[h >> 2] = s;
          g[f >> 2] = t;
          g[(l + ((o * 104) | 0) + 36) >> 2] = 0.0;
          f = (l + ((o * 104) | 0) + 72) | 0;
          t = +g[f >> 2];
          h = (l + ((o * 104) | 0) + 76) | 0;
          s = +g[h >> 2];
          d = (l + ((o * 104) | 0) + 80) | 0;
          r = +g[d >> 2];
          q =
            t * +g[(b + 16) >> 2] +
            s * +g[(b + 20) >> 2] +
            r * +g[(b + 24) >> 2];
          p =
            t * +g[(b + 32) >> 2] +
            s * +g[(b + 36) >> 2] +
            r * +g[(b + 40) >> 2];
          g[f >> 2] =
            +g[b >> 2] * t + +g[(b + 4) >> 2] * s + +g[(b + 8) >> 2] * r;
          g[h >> 2] = q;
          g[d >> 2] = p;
          g[(l + ((o * 104) | 0) + 84) >> 2] = 0.0;
          l = c[(l + ((o * 104) | 0) + 96) >> 2] | 0;
          d = hh((a + 928) | 0, l) | 0;
          a: do
            if (d) {
              f = c[(a + 936) >> 2] | 0;
              if ((f | 0) <= -1) {
                d = c[(a + 928) >> 2] | 0;
                break;
              }
              if ((f | 0) > 0) {
                h = 0;
                while (1) {
                  e = c[(d + 32) >> 2] | 0;
                  h = (h + 1) | 0;
                  if (!e) break a;
                  if ((h | 0) >= (f | 0)) {
                    d = e;
                    break;
                  } else d = e;
                }
              }
            } else d = 0;
          while (0);
          g[l >> 2] = i - m;
          g[(l + 4) >> 2] = j - m;
          g[(l + 8) >> 2] = k - m;
          g[(l + 12) >> 2] = 0.0;
          g[(l + 16) >> 2] = m + i;
          g[(l + 20) >> 2] = m + j;
          g[(l + 24) >> 2] = m + k;
          g[(l + 28) >> 2] = 0.0;
          lf((a + 928) | 0, d, l);
          o = (o + 1) | 0;
        } while ((o | 0) != (n | 0));
      }
      Bg(a);
      d = c[(a + 928) >> 2] | 0;
      if (d) {
        o = c[(a + 192) >> 2] | 0;
        r = +Sb[c[((c[o >> 2] | 0) + 48) >> 2] & 15](o);
        t = +g[(d + 4) >> 2] - r;
        s = +g[(d + 8) >> 2] - r;
        g[(a + 892) >> 2] = +g[d >> 2] - r;
        g[(a + 896) >> 2] = t;
        g[(a + 900) >> 2] = s;
        g[(a + 904) >> 2] = 0.0;
        s = r + +g[(d + 20) >> 2];
        t = r + +g[(d + 24) >> 2];
        g[(a + 908) >> 2] = r + +g[(d + 16) >> 2];
        g[(a + 912) >> 2] = s;
        g[(a + 916) >> 2] = t;
        g[(a + 920) >> 2] = 0.0;
        d = c[(a + 188) >> 2] | 0;
        if (d | 0) {
          o = c[(a + 684) >> 2] | 0;
          n = c[(o + 32) >> 2] | 0;
          yb[c[((c[n >> 2] | 0) + 16) >> 2] & 31](
            n,
            d,
            (a + 892) | 0,
            (a + 908) | 0,
            c[(o + 36) >> 2] | 0
          );
        }
      } else {
        c[(a + 892) >> 2] = 0;
        c[(a + 892 + 4) >> 2] = 0;
        c[(a + 892 + 8) >> 2] = 0;
        c[(a + 892 + 12) >> 2] = 0;
        c[(a + 892 + 16) >> 2] = 0;
        c[(a + 892 + 20) >> 2] = 0;
        c[(a + 892 + 24) >> 2] = 0;
        c[(a + 892 + 28) >> 2] = 0;
      }
      f = c[(a + 732) >> 2] | 0;
      if ((f | 0) <= 0) {
        eg(a);
        o = (a + 1148) | 0;
        c[o >> 2] = c[b >> 2];
        c[(o + 4) >> 2] = c[(b + 4) >> 2];
        c[(o + 8) >> 2] = c[(b + 8) >> 2];
        c[(o + 12) >> 2] = c[(b + 12) >> 2];
        o = (a + 1164) | 0;
        n = (b + 16) | 0;
        c[o >> 2] = c[n >> 2];
        c[(o + 4) >> 2] = c[(n + 4) >> 2];
        c[(o + 8) >> 2] = c[(n + 8) >> 2];
        c[(o + 12) >> 2] = c[(n + 12) >> 2];
        o = (a + 1180) | 0;
        n = (b + 32) | 0;
        c[o >> 2] = c[n >> 2];
        c[(o + 4) >> 2] = c[(n + 4) >> 2];
        c[(o + 8) >> 2] = c[(n + 8) >> 2];
        c[(o + 12) >> 2] = c[(n + 12) >> 2];
        a = (a + 1196) | 0;
        b = (b + 48) | 0;
        c[a >> 2] = c[b >> 2];
        c[(a + 4) >> 2] = c[(b + 4) >> 2];
        c[(a + 8) >> 2] = c[(b + 8) >> 2];
        c[(a + 12) >> 2] = c[(b + 12) >> 2];
        return;
      }
      d = c[(a + 740) >> 2] | 0;
      e = 0;
      do {
        n = c[(d + ((e * 52) | 0) + 8) >> 2] | 0;
        o = c[(d + ((e * 52) | 0) + 12) >> 2] | 0;
        r = +g[(n + 8) >> 2] - +g[(o + 8) >> 2];
        s = +g[(n + 12) >> 2] - +g[(o + 12) >> 2];
        t = +g[(n + 16) >> 2] - +g[(o + 16) >> 2];
        t = +O(+(r * r + s * s + t * t));
        g[(d + ((e * 52) | 0) + 16) >> 2] = t;
        g[(d + ((e * 52) | 0) + 28) >> 2] = t * t;
        e = (e + 1) | 0;
      } while ((e | 0) != (f | 0));
      d = c[(a + 740) >> 2] | 0;
      e = 0;
      do {
        g[(d + ((e * 52) | 0) + 24) >> 2] =
          (+g[((c[(d + ((e * 52) | 0) + 8) >> 2] | 0) + 88) >> 2] +
            +g[((c[(d + ((e * 52) | 0) + 12) >> 2] | 0) + 88) >> 2]) /
          +g[((c[(d + ((e * 52) | 0) + 4) >> 2] | 0) + 4) >> 2];
        e = (e + 1) | 0;
      } while ((e | 0) != (f | 0));
      eg(a);
      o = (a + 1148) | 0;
      c[o >> 2] = c[b >> 2];
      c[(o + 4) >> 2] = c[(b + 4) >> 2];
      c[(o + 8) >> 2] = c[(b + 8) >> 2];
      c[(o + 12) >> 2] = c[(b + 12) >> 2];
      o = (a + 1164) | 0;
      n = (b + 16) | 0;
      c[o >> 2] = c[n >> 2];
      c[(o + 4) >> 2] = c[(n + 4) >> 2];
      c[(o + 8) >> 2] = c[(n + 8) >> 2];
      c[(o + 12) >> 2] = c[(n + 12) >> 2];
      o = (a + 1180) | 0;
      n = (b + 32) | 0;
      c[o >> 2] = c[n >> 2];
      c[(o + 4) >> 2] = c[(n + 4) >> 2];
      c[(o + 8) >> 2] = c[(n + 8) >> 2];
      c[(o + 12) >> 2] = c[(n + 12) >> 2];
      a = (a + 1196) | 0;
      b = (b + 48) | 0;
      c[a >> 2] = c[b >> 2];
      c[(a + 4) >> 2] = c[(b + 4) >> 2];
      c[(a + 8) >> 2] = c[(b + 8) >> 2];
      c[(a + 12) >> 2] = c[(b + 12) >> 2];
      return;
    }
    function Qd(a, b) {
      a = a | 0;
      b = b | 0;
      var d = 0,
        e = 0.0,
        f = 0.0,
        h = 0,
        j = 0.0,
        l = 0,
        m = 0.0,
        n = 0.0,
        o = 0.0,
        p = 0,
        q = 0,
        r = 0,
        s = 0.0,
        t = 0.0,
        u = 0.0,
        v = 0.0,
        w = 0.0,
        x = 0.0,
        y = 0.0,
        z = 0.0,
        A = 0.0,
        B = 0.0,
        C = 0.0,
        D = 0,
        E = 0,
        F = 0,
        G = 0,
        H = 0,
        I = 0;
      F = i;
      i = (i + 96) | 0;
      d = c[(a + 216) >> 2] | 0;
      if (+g[(d + 4) >> 2] == 0.0) {
        E = 0;
        i = F;
        return E | 0;
      }
      E = c[b >> 2] | 0;
      if (
        !(Zb[c[((c[d >> 2] | 0) + 8) >> 2] & 31](d, c[(E + 188) >> 2] | 0) | 0)
      ) {
        E = 1;
        i = F;
        return E | 0;
      }
      b = c[(E + 192) >> 2] | 0;
      D = c[(a + 216) >> 2] | 0;
      if ((c[(b + 4) >> 2] | 0) != 32) {
        c[(F + 32) >> 2] = 0;
        c[(F + 32 + 4) >> 2] = b;
        c[(F + 32 + 8) >> 2] = E;
        c[(F + 32 + 12) >> 2] = E + 4;
        c[(F + 32 + 16) >> 2] = -1;
        c[(F + 32 + 20) >> 2] = -1;
        bd((a + 68) | 0, (a + 132) | 0, (F + 32) | 0, D);
        E = 1;
        i = F;
        return E | 0;
      }
      if ((E | 0) == 0 ? 1 : (c[(E + 236) >> 2] | 0) != 8) {
        E = 1;
        i = F;
        return E | 0;
      }
      if (c[(E + 752) >> 2] | 0 ? (c[(E + 988) >> 2] | 0) == 0 : 0) gg(E);
      A = +g[(a + 180) >> 2] - +g[(a + 116) >> 2];
      B = +g[(a + 184) >> 2] - +g[(a + 120) >> 2];
      C = +g[(a + 188) >> 2] - +g[(a + 124) >> 2];
      b = c[(E + 988) >> 2] | 0;
      if (!b) {
        q = c[(E + 752) >> 2] | 0;
        if ((q | 0) > 0) {
          p = c[(E + 760) >> 2] | 0;
          f = 1.0;
          d = 0;
          r = 0;
          b = -1;
          l = 1065353216;
          h = 0;
          do {
            I = c[(p + ((r * 44) | 0) + 8) >> 2] | 0;
            H = c[(p + ((r * 44) | 0) + 12) >> 2] | 0;
            G = c[(p + ((r * 44) | 0) + 16) >> 2] | 0;
            e = +Mh(
              (a + 116) | 0,
              A,
              B,
              C,
              +g[(I + 8) >> 2],
              +g[(I + 12) >> 2],
              +g[(I + 16) >> 2],
              +g[(H + 8) >> 2],
              +g[(H + 12) >> 2],
              +g[(H + 16) >> 2],
              +g[(G + 8) >> 2],
              +g[(G + 12) >> 2],
              +g[(G + 16) >> 2],
              f
            );
            if (e > 0.0) {
              f = e;
              d = (d + 1) | 0;
              b = r;
              l = ((g[k >> 2] = e), c[k >> 2] | 0);
              h = 3;
            }
            r = (r + 1) | 0;
          } while ((r | 0) != (q | 0));
        } else {
          d = 0;
          b = -1;
          l = 1065353216;
          h = 0;
        }
      } else {
        c[(F + 32) >> 2] = 3220;
        c[(F + 32 + 4) >> 2] = c[(a + 116) >> 2];
        c[(F + 32 + 4 + 4) >> 2] = c[(a + 116 + 4) >> 2];
        c[(F + 32 + 4 + 8) >> 2] = c[(a + 116 + 8) >> 2];
        c[(F + 32 + 4 + 12) >> 2] = c[(a + 116 + 12) >> 2];
        g[(F + 32 + 36) >> 2] = A;
        g[(F + 32 + 40) >> 2] = B;
        g[(F + 32 + 44) >> 2] = C;
        g[(F + 32 + 48) >> 2] = 0.0;
        c[(F + 32 + 20) >> 2] = c[(a + 180) >> 2];
        c[(F + 32 + 20 + 4) >> 2] = c[(a + 180 + 4) >> 2];
        c[(F + 32 + 20 + 8) >> 2] = c[(a + 180 + 8) >> 2];
        c[(F + 32 + 20 + 12) >> 2] = c[(a + 180 + 12) >> 2];
        c[(F + 32 + 52) >> 2] = 1065353216;
        c[(F + 32 + 56) >> 2] = 0;
        c[(F + 32 + 60) >> 2] = 0;
        ff(b, (a + 116) | 0, (a + 180) | 0, (F + 32) | 0);
        b = c[(F + 32 + 56) >> 2] | 0;
        if (!b) {
          d = 0;
          b = -1;
          l = 1065353216;
          h = 0;
        } else {
          d = 1;
          b = (((b - (c[(E + 760) >> 2] | 0)) | 0) / 44) | 0;
          l = c[(F + 32 + 52) >> 2] | 0;
          h = 3;
        }
      }
      r = c[(E + 772) >> 2] | 0;
      if ((r | 0) > 0) {
        q = c[(E + 780) >> 2] | 0;
        f = ((c[k >> 2] = l), +g[k >> 2]);
        p = 0;
        do {
          I = c[(q + ((p * 104) | 0) + 8) >> 2] | 0;
          x = +g[(I + 8) >> 2];
          y = +g[(I + 12) >> 2];
          z = +g[(I + 16) >> 2];
          I = c[(q + ((p * 104) | 0) + 12) >> 2] | 0;
          o = +g[(I + 8) >> 2];
          s = +g[(I + 12) >> 2];
          t = +g[(I + 16) >> 2];
          I = c[(q + ((p * 104) | 0) + 16) >> 2] | 0;
          u = +g[(I + 8) >> 2];
          v = +g[(I + 12) >> 2];
          w = +g[(I + 16) >> 2];
          e = +Mh((a + 116) | 0, A, B, C, x, y, z, o, s, t, u, v, w, f);
          if (e > 0.0) {
            f = e;
            d = (d + 1) | 0;
            b = p;
            l = ((g[k >> 2] = e), c[k >> 2] | 0);
            h = 4;
          }
          I = c[(q + ((p * 104) | 0) + 20) >> 2] | 0;
          j = +g[(I + 8) >> 2];
          m = +g[(I + 12) >> 2];
          n = +g[(I + 16) >> 2];
          e = +Mh((a + 116) | 0, A, B, C, x, y, z, o, s, t, j, m, n, f);
          if (e > 0.0) {
            f = e;
            d = (d + 1) | 0;
            b = p;
            l = ((g[k >> 2] = e), c[k >> 2] | 0);
            h = 4;
          }
          e = +Mh((a + 116) | 0, A, B, C, o, s, t, u, v, w, j, m, n, f);
          if (e > 0.0) {
            f = e;
            d = (d + 1) | 0;
            b = p;
            l = ((g[k >> 2] = e), c[k >> 2] | 0);
            h = 4;
          }
          e = +Mh((a + 116) | 0, A, B, C, x, y, z, u, v, w, j, m, n, f);
          if (e > 0.0) {
            f = e;
            d = (d + 1) | 0;
            b = p;
            l = ((g[k >> 2] = e), c[k >> 2] | 0);
            h = 4;
          }
          p = (p + 1) | 0;
        } while ((p | 0) != (r | 0));
      }
      if (!d) {
        I = 1;
        i = F;
        return I | 0;
      }
      if (!(((c[k >> 2] = l), +g[k >> 2]) <= +g[(D + 4) >> 2])) {
        I = 1;
        i = F;
        return I | 0;
      }
      c[(F + 32) >> 2] = 0;
      c[(F + 32 + 4) >> 2] = b;
      m = +g[(a + 180) >> 2] - +g[(a + 116) >> 2];
      n = +g[(a + 184) >> 2] - +g[(a + 120) >> 2];
      o = +g[(a + 188) >> 2] - +g[(a + 124) >> 2];
      e = 1.0 / +O(+(m * m + n * n + o * o));
      if ((h | 0) == 3) {
        d = c[(E + 748 + 12) >> 2] | 0;
        e = +g[(d + ((b * 44) | 0) + 20) >> 2];
        j = +g[(d + ((b * 44) | 0) + 24) >> 2];
        f = +g[(d + ((b * 44) | 0) + 28) >> 2];
        if (m * e + n * j + o * f > 0.0) {
          m = -e;
          j = -j;
          f = -f;
          e = 0.0;
        } else {
          m = e;
          e = +g[(d + ((b * 44) | 0) + 32) >> 2];
        }
      } else {
        m = -(m * e);
        j = -(n * e);
        f = -(o * e);
        e = 0.0;
      }
      c[F >> 2] = E;
      c[(F + 4) >> 2] = F + 32;
      g[(F + 8) >> 2] = m;
      g[(F + 12) >> 2] = j;
      g[(F + 16) >> 2] = f;
      g[(F + 20) >> 2] = e;
      c[(F + 24) >> 2] = l;
      +_b[c[((c[D >> 2] | 0) + 12) >> 2] & 15](D, F, 1);
      I = 1;
      i = F;
      return I | 0;
    }
    function Rd(b, d, e) {
      b = b | 0;
      d = d | 0;
      e = e | 0;
      var f = 0,
        h = 0,
        j = 0,
        k = 0,
        l = 0,
        m = 0,
        n = 0.0,
        o = 0.0;
      m = i;
      i = (i + 400) | 0;
      f = c[(d + 36) >> 2] | 0;
      d = c[(e + 36) >> 2] | 0;
      e = c[(b + 24) >> 2] | 0;
      if (
        ((e | 0) == (c[(b + 28) >> 2] | 0)
        ? c[(e + 1132) >> 2] | 0
        : 0)
          ? ((k =
              ((_(c[(d + 380) >> 2] | 0, c[(e + 1112) >> 2] | 0) | 0) +
                (c[(f + 380) >> 2] | 0)) |
              0),
            a[((c[(e + 1140) >> 2] | 0) + k) >> 0] | 0)
          : 0
      ) {
        c[5802] = (c[5802] | 0) + 1;
        i = m;
        return;
      }
      c[(m + 344 + 4) >> 2] = 35;
      c[(m + 344 + 8) >> 2] = 0;
      c[(m + 344 + 12) >> 2] = 1065353216;
      c[(m + 344 + 16) >> 2] = 1065353216;
      c[(m + 344 + 20) >> 2] = 1065353216;
      g[(m + 344 + 24) >> 2] = 0.0;
      c[(m + 344) >> 2] = 3436;
      c[(m + 344 + 52) >> 2] = f;
      g[(m + 344 + 44) >> 2] = 0.0;
      c[(m + 288 + 4) >> 2] = 35;
      c[(m + 288 + 8) >> 2] = 0;
      c[(m + 288 + 12) >> 2] = 1065353216;
      c[(m + 288 + 16) >> 2] = 1065353216;
      c[(m + 288 + 20) >> 2] = 1065353216;
      g[(m + 288 + 24) >> 2] = 0.0;
      c[(m + 288) >> 2] = 3436;
      c[(m + 288 + 52) >> 2] = d;
      g[(m + 288 + 44) >> 2] = 0.0;
      if ((a[22456] | 0) == 0 ? Wa(22456) | 0 : 0) {
        if ((a[22464] | 0) == 0 ? Wa(22464) | 0 : 0) {
          c[5698] = 1065353216;
          c[5699] = 0;
          c[5700] = 0;
          c[5701] = 0;
          c[5702] = 0;
          c[5703] = 1065353216;
          c[5704] = 0;
          c[5705] = 0;
          c[5706] = 0;
          c[5707] = 0;
          c[5708] = 1065353216;
          g[5709] = 0.0;
          _a(22464);
        }
        c[5710] = c[5698];
        c[5711] = c[5699];
        c[5712] = c[5700];
        c[5713] = c[5701];
        c[5714] = c[5702];
        c[5715] = c[5703];
        c[5716] = c[5704];
        c[5717] = c[5705];
        c[5718] = c[5706];
        c[5719] = c[5707];
        c[5720] = c[5708];
        c[5721] = c[5709];
        c[5722] = 0;
        c[5723] = 0;
        c[5724] = 0;
        c[5725] = 0;
        _a(22456);
      }
      if ((a[22456] | 0) == 0 ? Wa(22456) | 0 : 0) {
        if ((a[22464] | 0) == 0 ? Wa(22464) | 0 : 0) {
          c[5698] = 1065353216;
          c[5699] = 0;
          c[5700] = 0;
          c[5701] = 0;
          c[5702] = 0;
          c[5703] = 1065353216;
          c[5704] = 0;
          c[5705] = 0;
          c[5706] = 0;
          c[5707] = 0;
          c[5708] = 1065353216;
          g[5709] = 0.0;
          _a(22464);
        }
        c[5710] = c[5698];
        c[5711] = c[5699];
        c[5712] = c[5700];
        c[5713] = c[5701];
        c[5714] = c[5702];
        c[5715] = c[5703];
        c[5716] = c[5704];
        c[5717] = c[5705];
        c[5718] = c[5706];
        c[5719] = c[5707];
        c[5720] = c[5708];
        c[5721] = c[5709];
        c[5722] = 0;
        c[5723] = 0;
        c[5724] = 0;
        c[5725] = 0;
        _a(22456);
      }
      o = +g[(f + 232) >> 2] - +g[(d + 232) >> 2];
      n = +g[(f + 236) >> 2] - +g[(d + 236) >> 2];
      g[m >> 2] = +g[(f + 228) >> 2] - +g[(d + 228) >> 2];
      g[(m + 4) >> 2] = o;
      g[(m + 8) >> 2] = n;
      g[(m + 12) >> 2] = 0.0;
      if (
        !(!(
          Jd((m + 344) | 0, 22840, (m + 288) | 0, 22840, m, (m + 232) | 0) | 0
        )
          ? !(
              Pc(
                (m + 344) | 0,
                22840,
                (m + 288) | 0,
                22840,
                m,
                (m + 232) | 0,
                0
              ) | 0
            )
          : 0)
      )
        h = 18;
      if (
        (h | 0) == 18
          ? ((k = (m + 16 + 4) | 0),
            (a[(m + 16 + 152) >> 0] = 0),
            (c[k >> 2] = 0),
            (c[(k + 4) >> 2] = 0),
            (c[(k + 8) >> 2] = 0),
            (c[(k + 12) >> 2] = 0),
            (c[(k + 16) >> 2] = 0),
            (c[(k + 20) >> 2] = 0),
            (c[(m + 16) >> 2] = 3256),
            jd(b, (m + 232) | 0, f, 0, 0, d, 0, 0, (m + 16) | 0) | 0)
          : 0
      ) {
        c[6435] = (c[6435] | 0) + 1;
        d = yc(235) | 0;
        if (!d) k = 0;
        else {
          c[(((d + 4 + 15) & -16) + -4) >> 2] = d;
          k = (d + 4 + 15) & -16;
        }
        d = (k + 152) | 0;
        Qn(k | 0, 0, 156) | 0;
        c[k >> 2] = 3256;
        e = (k + 4) | 0;
        f = (m + 16 + 4) | 0;
        h = (e + 100) | 0;
        do {
          c[e >> 2] = c[f >> 2];
          e = (e + 4) | 0;
          f = (f + 4) | 0;
        } while ((e | 0) < (h | 0));
        e = (k + 104) | 0;
        c[e >> 2] = c[(m + 16 + 104) >> 2];
        c[(e + 4) >> 2] = c[(m + 16 + 104 + 4) >> 2];
        c[(e + 8) >> 2] = c[(m + 16 + 104 + 8) >> 2];
        c[(e + 12) >> 2] = c[(m + 16 + 104 + 12) >> 2];
        e = (k + 120) | 0;
        c[e >> 2] = c[(m + 16 + 120) >> 2];
        c[(e + 4) >> 2] = c[(m + 16 + 120 + 4) >> 2];
        c[(e + 8) >> 2] = c[(m + 16 + 120 + 8) >> 2];
        c[(e + 12) >> 2] = c[(m + 16 + 120 + 12) >> 2];
        e = (k + 136) | 0;
        c[e >> 2] = c[(m + 16 + 136) >> 2];
        c[(e + 4) >> 2] = c[(m + 16 + 136 + 4) >> 2];
        c[(e + 8) >> 2] = c[(m + 16 + 136 + 8) >> 2];
        c[(e + 12) >> 2] = c[(m + 16 + 136 + 12) >> 2];
        a[d >> 0] = a[(m + 16 + 152) >> 0] | 0;
        e = (k + 156) | 0;
        f = (m + 16 + 156) | 0;
        h = (e + 60) | 0;
        do {
          c[e >> 2] = c[f >> 2];
          e = (e + 4) | 0;
          f = (f + 4) | 0;
        } while ((e | 0) < (h | 0));
        h = c[(b + 24) >> 2] | 0;
        j = k;
        d = c[(h + 852) >> 2] | 0;
        if (
          (d | 0) == (c[(h + 856) >> 2] | 0)
            ? ((l = d | 0 ? d << 1 : 1), (d | 0) < (l | 0))
            : 0
        ) {
          if (!l) f = 0;
          else {
            c[6435] = (c[6435] | 0) + 1;
            d = yc((((l << 2) | 3) + 16) | 0) | 0;
            if (!d) d = 0;
            else {
              c[(((d + 4 + 15) & -16) + -4) >> 2] = d;
              d = (d + 4 + 15) & -16;
            }
            f = d;
            d = c[(h + 852) >> 2] | 0;
          }
          if ((d | 0) > 0) {
            e = 0;
            do {
              c[(f + (e << 2)) >> 2] =
                c[((c[(h + 860) >> 2] | 0) + (e << 2)) >> 2];
              e = (e + 1) | 0;
            } while ((e | 0) != (d | 0));
          }
          e = c[(h + 860) >> 2] | 0;
          if (e) {
            if (a[(h + 864) >> 0] | 0) {
              c[6436] = (c[6436] | 0) + 1;
              hd(c[(e + -4) >> 2] | 0);
              d = c[(h + 852) >> 2] | 0;
            }
            c[(h + 860) >> 2] = 0;
          }
          a[(h + 864) >> 0] = 1;
          c[(h + 860) >> 2] = f;
          c[(h + 856) >> 2] = l;
        }
        c[((c[(h + 860) >> 2] | 0) + (d << 2)) >> 2] = j;
        c[(h + 852) >> 2] = d + 1;
        j = c[(b + 24) >> 2] | 0;
        l = c[(b + 28) >> 2] | 0;
        n = +g[(j + 348) >> 2];
        o = +g[(l + 348) >> 2];
        b = (k + 64) | 0;
        g[b >> 2] = +g[b >> 2] * (n > o ? n : o);
        b = (k + 68) | 0;
        g[b >> 2] =
          +g[b >> 2] * (+g[(j + 360) >> 2] + +g[(l + 360) >> 2]) * 0.5;
      }
      i = m;
      return;
    }
    function Sd(b, d, e) {
      b = b | 0;
      d = d | 0;
      e = e | 0;
      var f = 0,
        h = 0,
        i = 0,
        j = 0.0,
        k = 0.0,
        l = 0.0,
        m = 0.0,
        n = 0,
        o = 0,
        p = 0.0,
        q = 0.0,
        r = 0.0;
      if (a[(b + 165) >> 0] | 0) {
        f = c[(b + 88) >> 2] | 0;
        a: do
          if (((f | 0) > 0) & e) {
            h = c[(b + 96) >> 2] | 0;
            m = +g[d >> 2];
            j = +g[(d + 4) >> 2];
            k = +g[(d + 8) >> 2];
            l = +g[(b + 168) >> 2];
            e = 0;
            while (1) {
              r = +g[(h + (e << 4)) >> 2] - m;
              q = +g[(h + (e << 4) + 4) >> 2] - j;
              p = +g[(h + (e << 4) + 8) >> 2] - k;
              if (r * r + q * q + p * p <= l) break;
              e = (e + 1) | 0;
              if ((e | 0) >= (f | 0)) break a;
            }
            return e | 0;
          }
        while (0);
        o = ((c[(b + 32) >> 2] | 0) + 12) | 0;
        c[o >> 2] = (c[o >> 2] | 0) + 1;
        if (
          (f | 0) == (c[(b + 92) >> 2] | 0)
            ? ((i = f | 0 ? f << 1 : 1), (f | 0) < (i | 0))
            : 0
        ) {
          if (!i) e = 0;
          else {
            c[6435] = (c[6435] | 0) + 1;
            e = yc((((i << 4) | 3) + 16) | 0) | 0;
            if (!e) e = 0;
            else {
              c[(((e + 4 + 15) & -16) + -4) >> 2] = e;
              e = (e + 4 + 15) & -16;
            }
            f = c[(b + 88) >> 2] | 0;
          }
          if ((f | 0) > 0) {
            h = 0;
            do {
              o = (e + (h << 4)) | 0;
              n = ((c[(b + 96) >> 2] | 0) + (h << 4)) | 0;
              c[o >> 2] = c[n >> 2];
              c[(o + 4) >> 2] = c[(n + 4) >> 2];
              c[(o + 8) >> 2] = c[(n + 8) >> 2];
              c[(o + 12) >> 2] = c[(n + 12) >> 2];
              h = (h + 1) | 0;
            } while ((h | 0) != (f | 0));
          }
          f = c[(b + 96) >> 2] | 0;
          if (f | 0) {
            if (a[(b + 100) >> 0] | 0) {
              c[6436] = (c[6436] | 0) + 1;
              hd(c[(f + -4) >> 2] | 0);
            }
            c[(b + 96) >> 2] = 0;
          }
          a[(b + 100) >> 0] = 1;
          c[(b + 96) >> 2] = e;
          c[(b + 92) >> 2] = i;
          e = c[(b + 88) >> 2] | 0;
        } else e = f;
        o = ((c[(b + 96) >> 2] | 0) + (e << 4)) | 0;
        c[o >> 2] = c[d >> 2];
        c[(o + 4) >> 2] = c[(d + 4) >> 2];
        c[(o + 8) >> 2] = c[(d + 8) >> 2];
        c[(o + 12) >> 2] = c[(d + 12) >> 2];
        d = c[(b + 88) >> 2] | 0;
        c[(b + 88) >> 2] = d + 1;
        c[((c[(b + 32) >> 2] | 0) + 16) >> 2] = c[(b + 96) >> 2];
        return d | 0;
      }
      h = c[(b + 108) >> 2] | 0;
      b: do
        if (((h | 0) > 0) & e) {
          e = c[(b + 116) >> 2] | 0;
          j = +g[d >> 2];
          k = +g[(d + 4) >> 2];
          l = +g[(d + 8) >> 2];
          m = +g[(b + 168) >> 2];
          i = 0;
          while (1) {
            p = +g[(e + (i << 2)) >> 2] - j;
            q = +g[(e + ((i + 1) << 2)) >> 2] - k;
            r = +g[(e + ((i + 2) << 2)) >> 2] - l;
            f = (i + 3) | 0;
            if (p * p + q * q + r * r <= m) break;
            if ((f | 0) < (h | 0)) i = f;
            else break b;
          }
          d = ((i | 0) / 3) | 0;
          return d | 0;
        }
      while (0);
      e = c[(b + 112) >> 2] | 0;
      if ((h | 0) == (e | 0)) {
        n = h | 0 ? h << 1 : 1;
        if ((h | 0) < (n | 0)) {
          if (!n) e = 0;
          else {
            c[6435] = (c[6435] | 0) + 1;
            e = yc((((n << 2) | 3) + 16) | 0) | 0;
            if (!e) e = 0;
            else {
              c[(((e + 4 + 15) & -16) + -4) >> 2] = e;
              e = (e + 4 + 15) & -16;
            }
            h = c[(b + 108) >> 2] | 0;
          }
          i = c[(b + 116) >> 2] | 0;
          if ((h | 0) <= 0)
            if (!i) f = (b + 120) | 0;
            else o = 34;
          else {
            f = 0;
            do {
              c[(e + (f << 2)) >> 2] = c[(i + (f << 2)) >> 2];
              f = (f + 1) | 0;
            } while ((f | 0) != (h | 0));
            o = 34;
          }
          if ((o | 0) == 34) {
            if (a[(b + 120) >> 0] | 0) {
              c[6436] = (c[6436] | 0) + 1;
              hd(c[(i + -4) >> 2] | 0);
            }
            c[(b + 116) >> 2] = 0;
            f = (b + 120) | 0;
          }
          a[f >> 0] = 1;
          c[(b + 116) >> 2] = e;
          c[(b + 112) >> 2] = n;
          f = c[(b + 108) >> 2] | 0;
          h = n;
        } else f = h;
      } else {
        f = h;
        h = e;
      }
      c[((c[(b + 116) >> 2] | 0) + (f << 2)) >> 2] = c[d >> 2];
      e = (f + 1) | 0;
      c[(b + 108) >> 2] = e;
      if ((e | 0) == (h | 0)) {
        n = h | 0 ? h << 1 : 1;
        if ((h | 0) < (n | 0)) {
          if (!n) e = 0;
          else {
            c[6435] = (c[6435] | 0) + 1;
            e = yc((((n << 2) | 3) + 16) | 0) | 0;
            if (!e) e = 0;
            else {
              c[(((e + 4 + 15) & -16) + -4) >> 2] = e;
              e = (e + 4 + 15) & -16;
            }
            h = c[(b + 108) >> 2] | 0;
          }
          i = c[(b + 116) >> 2] | 0;
          if ((h | 0) <= 0)
            if (!i) f = (b + 120) | 0;
            else o = 48;
          else {
            f = 0;
            do {
              c[(e + (f << 2)) >> 2] = c[(i + (f << 2)) >> 2];
              f = (f + 1) | 0;
            } while ((f | 0) != (h | 0));
            o = 48;
          }
          if ((o | 0) == 48) {
            if (a[(b + 120) >> 0] | 0) {
              c[6436] = (c[6436] | 0) + 1;
              hd(c[(i + -4) >> 2] | 0);
            }
            c[(b + 116) >> 2] = 0;
            f = (b + 120) | 0;
          }
          a[f >> 0] = 1;
          c[(b + 116) >> 2] = e;
          c[(b + 112) >> 2] = n;
          e = c[(b + 108) >> 2] | 0;
          h = n;
        } else e = h;
      }
      c[((c[(b + 116) >> 2] | 0) + (e << 2)) >> 2] = c[(d + 4) >> 2];
      e = (e + 1) | 0;
      c[(b + 108) >> 2] = e;
      if ((e | 0) == (h | 0)) {
        n = h | 0 ? h << 1 : 1;
        if ((h | 0) < (n | 0)) {
          if (!n) e = 0;
          else {
            c[6435] = (c[6435] | 0) + 1;
            e = yc((((n << 2) | 3) + 16) | 0) | 0;
            if (!e) e = 0;
            else {
              c[(((e + 4 + 15) & -16) + -4) >> 2] = e;
              e = (e + 4 + 15) & -16;
            }
            h = c[(b + 108) >> 2] | 0;
          }
          i = c[(b + 116) >> 2] | 0;
          if ((h | 0) <= 0)
            if (!i) f = (b + 120) | 0;
            else o = 62;
          else {
            f = 0;
            do {
              c[(e + (f << 2)) >> 2] = c[(i + (f << 2)) >> 2];
              f = (f + 1) | 0;
            } while ((f | 0) != (h | 0));
            o = 62;
          }
          if ((o | 0) == 62) {
            if (a[(b + 120) >> 0] | 0) {
              c[6436] = (c[6436] | 0) + 1;
              hd(c[(i + -4) >> 2] | 0);
            }
            c[(b + 116) >> 2] = 0;
            f = (b + 120) | 0;
          }
          a[f >> 0] = 1;
          c[(b + 116) >> 2] = e;
          c[(b + 112) >> 2] = n;
          e = c[(b + 108) >> 2] | 0;
        } else e = h;
      }
      o = c[(b + 116) >> 2] | 0;
      c[(o + (e << 2)) >> 2] = c[(d + 8) >> 2];
      d = (e + 1) | 0;
      c[(b + 108) >> 2] = d;
      b = c[(b + 32) >> 2] | 0;
      c[(b + 12) >> 2] = (c[(b + 12) >> 2] | 0) + 1;
      c[(b + 16) >> 2] = o;
      d = ((((d | 0) / 3) | 0) + -1) | 0;
      return d | 0;
    }
    function Td(b) {
      b = b | 0;
      var d = 0,
        e = 0.0,
        f = 0.0,
        h = 0.0,
        j = 0,
        k = 0,
        l = 0,
        m = 0.0,
        n = 0.0,
        o = 0.0,
        p = 0.0,
        q = 0.0,
        r = 0.0,
        s = 0.0,
        t = 0.0,
        u = 0.0,
        v = 0.0,
        w = 0.0,
        x = 0.0,
        y = 0.0,
        z = 0.0,
        A = 0.0,
        B = 0.0,
        C = 0.0,
        D = 0.0,
        E = 0.0,
        F = 0.0,
        G = 0.0,
        H = 0.0,
        I = 0.0,
        J = 0.0,
        K = 0;
      k = i;
      i = (i + 16) | 0;
      if (!(a[(b + 1308) >> 0] | 0)) {
        i = k;
        return;
      }
      g[(b + 928) >> 2] = 0.0;
      g[(b + 992) >> 2] = 0.0;
      g[(b + 1056) >> 2] = 0.0;
      c[(b + 712) >> 2] = 0;
      c[(b + 712 + 4) >> 2] = 0;
      c[(b + 712 + 8) >> 2] = 0;
      c[(b + 712 + 12) >> 2] = 0;
      sd(b, ((c[(b + 28) >> 2] | 0) + 4) | 0, ((c[(b + 32) >> 2] | 0) + 4) | 0);
      Ab[c[((c[b >> 2] | 0) + 44) >> 2] & 255](b);
      e = +g[(b + 1284) >> 2];
      f = +g[(b + 1288) >> 2];
      h = +g[(b + 1292) >> 2];
      if (+g[(b + 696) >> 2] >= +g[(b + 680) >> 2]) {
        l = (a[(b + 1300) >> 0] | 0) == 0;
        j = c[(l ? (b + 1160) | 0 : (b + 1096) | 0) >> 2] | 0;
        d = c[(l ? (b + 1144) | 0 : (b + 1080) | 0) >> 2] | 0;
        c[k >> 2] = c[(l ? (b + 1128) | 0 : (b + 1064) | 0) >> 2];
        c[(k + 4) >> 2] = d;
        c[(k + 8) >> 2] = j;
        g[(k + 12) >> 2] = 0.0;
        Lh(
          c[(b + 28) >> 2] | 0,
          c[(b + 32) >> 2] | 0,
          (b + 176) | 0,
          k,
          e,
          f,
          h,
          e,
          f,
          h
        );
      }
      if (+g[(b + 700) >> 2] >= +g[(b + 684) >> 2]) {
        d = (a[(b + 1300) >> 0] | 0) == 0;
        l = c[(d ? (b + 1164) | 0 : (b + 1100) | 0) >> 2] | 0;
        j = c[(d ? (b + 1148) | 0 : (b + 1084) | 0) >> 2] | 0;
        c[k >> 2] = c[(d ? (b + 1132) | 0 : (b + 1068) | 0) >> 2];
        c[(k + 4) >> 2] = j;
        c[(k + 8) >> 2] = l;
        g[(k + 12) >> 2] = 0.0;
        Lh(
          c[(b + 28) >> 2] | 0,
          c[(b + 32) >> 2] | 0,
          (b + 260) | 0,
          k,
          e,
          f,
          h,
          e,
          f,
          h
        );
      }
      if (+g[(b + 704) >> 2] >= +g[(b + 688) >> 2]) {
        d = (a[(b + 1300) >> 0] | 0) == 0;
        l = c[(d ? (b + 1168) | 0 : (b + 1104) | 0) >> 2] | 0;
        j = c[(d ? (b + 1152) | 0 : (b + 1088) | 0) >> 2] | 0;
        c[k >> 2] = c[(d ? (b + 1136) | 0 : (b + 1072) | 0) >> 2];
        c[(k + 4) >> 2] = j;
        c[(k + 8) >> 2] = l;
        g[(k + 12) >> 2] = 0.0;
        Lh(
          c[(b + 28) >> 2] | 0,
          c[(b + 32) >> 2] | 0,
          (b + 344) | 0,
          k,
          e,
          f,
          h,
          e,
          f,
          h
        );
      }
      j = 0;
      do {
        e = +g[(b + 868 + (j << 6)) >> 2];
        f = +g[(b + 868 + (j << 6) + 4) >> 2];
        h = +ik(+g[(b + 1192 + (j << 2)) >> 2], e, f);
        g[(b + 868 + (j << 6) + 52) >> 2] = h;
        do
          if (!(e > f)) {
            if (e > h) {
              c[(b + 868 + (j << 6) + 56) >> 2] = 1;
              d = (b + 868 + (j << 6) + 48) | 0;
              g[d >> 2] = h - e;
              if (h - e > 3.1415927410125732) {
                g[d >> 2] = h - e + -6.2831854820251465;
                d = 19;
                break;
              }
              if (!(h - e < -3.1415927410125732)) {
                d = 19;
                break;
              }
              g[d >> 2] = h - e + 6.2831854820251465;
              d = 19;
              break;
            }
            d = (b + 868 + (j << 6) + 56) | 0;
            if (!(f < h)) {
              c[d >> 2] = 0;
              d = 18;
              break;
            }
            c[d >> 2] = 2;
            d = (b + 868 + (j << 6) + 48) | 0;
            g[d >> 2] = h - f;
            if (h - f > 3.1415927410125732) {
              g[d >> 2] = h - f + -6.2831854820251465;
              d = 19;
              break;
            }
            if (h - f < -3.1415927410125732) {
              g[d >> 2] = h - f + 6.2831854820251465;
              d = 19;
            } else d = 19;
          } else {
            c[(b + 868 + (j << 6) + 56) >> 2] = 0;
            d = 18;
          }
        while (0);
        if (
          (d | 0) == 18 ? ((d = 0), a[(b + 868 + (j << 6) + 44) >> 0] | 0) : 0
        )
          d = 19;
        if ((d | 0) == 19) {
          K = (b + 1208 + (j << 4)) | 0;
          c[k >> 2] = c[K >> 2];
          c[(k + 4) >> 2] = c[(K + 4) >> 2];
          c[(k + 8) >> 2] = c[(K + 8) >> 2];
          c[(k + 12) >> 2] = c[(K + 12) >> 2];
          K = (b + 428 + ((j * 84) | 0)) | 0;
          d = c[(b + 28) >> 2] | 0;
          J = +g[(d + 4) >> 2];
          I = +g[(d + 20) >> 2];
          H = +g[(d + 36) >> 2];
          F = +g[(d + 8) >> 2];
          E = +g[(d + 24) >> 2];
          D = +g[(d + 40) >> 2];
          B = +g[(d + 12) >> 2];
          A = +g[(d + 28) >> 2];
          z = +g[(d + 44) >> 2];
          l = c[(b + 32) >> 2] | 0;
          x = +g[(l + 4) >> 2];
          w = +g[(l + 20) >> 2];
          v = +g[(l + 36) >> 2];
          t = +g[(l + 8) >> 2];
          s = +g[(l + 24) >> 2];
          r = +g[(l + 40) >> 2];
          p = +g[(l + 12) >> 2];
          n = +g[(l + 28) >> 2];
          e = +g[(l + 44) >> 2];
          c[K >> 2] = 0;
          c[(K + 4) >> 2] = 0;
          c[(K + 8) >> 2] = 0;
          c[(K + 12) >> 2] = 0;
          o = +g[k >> 2];
          m = +g[(k + 4) >> 2];
          f = +g[(k + 8) >> 2];
          g[(b + 428 + ((j * 84) | 0) + 16) >> 2] = J * o + I * m + H * f;
          g[(b + 428 + ((j * 84) | 0) + 20) >> 2] = F * o + E * m + D * f;
          g[(b + 428 + ((j * 84) | 0) + 24) >> 2] = B * o + A * m + z * f;
          g[(b + 428 + ((j * 84) | 0) + 28) >> 2] = 0.0;
          g[(b + 428 + ((j * 84) | 0) + 32) >> 2] = x * -o + w * -m + v * -f;
          g[(b + 428 + ((j * 84) | 0) + 36) >> 2] = t * -o + s * -m + r * -f;
          g[(b + 428 + ((j * 84) | 0) + 40) >> 2] = p * -o + n * -m + e * -f;
          g[(b + 428 + ((j * 84) | 0) + 44) >> 2] = 0.0;
          G = (J * o + I * m + H * f) * +g[(d + 396) >> 2];
          C = (F * o + E * m + D * f) * +g[(d + 400) >> 2];
          y = (B * o + A * m + z * f) * +g[(d + 404) >> 2];
          g[(b + 428 + ((j * 84) | 0) + 48) >> 2] = G;
          g[(b + 428 + ((j * 84) | 0) + 52) >> 2] = C;
          g[(b + 428 + ((j * 84) | 0) + 56) >> 2] = y;
          g[(b + 428 + ((j * 84) | 0) + 60) >> 2] = 0.0;
          u = (x * -o + w * -m + v * -f) * +g[(l + 396) >> 2];
          q = (t * -o + s * -m + r * -f) * +g[(l + 400) >> 2];
          h = (p * -o + n * -m + e * -f) * +g[(l + 404) >> 2];
          g[(b + 428 + ((j * 84) | 0) + 64) >> 2] = u;
          g[(b + 428 + ((j * 84) | 0) + 68) >> 2] = q;
          g[(b + 428 + ((j * 84) | 0) + 72) >> 2] = h;
          g[(b + 428 + ((j * 84) | 0) + 76) >> 2] = 0.0;
          g[(b + 428 + ((j * 84) | 0) + 80) >> 2] =
            (J * o + I * m + H * f) * G +
            (F * o + E * m + D * f) * C +
            (B * o + A * m + z * f) * y +
            ((x * -o + w * -m + v * -f) * u +
              (t * -o + s * -m + r * -f) * q +
              (p * -o + n * -m + e * -f) * h);
        }
        j = (j + 1) | 0;
      } while ((j | 0) != 3);
      i = k;
      return;
    }
    function Ud(b, d, e) {
      b = b | 0;
      d = d | 0;
      e = e | 0;
      var f = 0.0,
        h = 0,
        j = 0,
        k = 0,
        l = 0,
        m = 0,
        n = 0,
        o = 0.0,
        p = 0,
        q = 0,
        r = 0,
        s = 0;
      p = i;
      i = (i + 128) | 0;
      c[(b + 68) >> 2] = (c[(b + 68) >> 2] | 0) + 1;
      c[p >> 2] = c[d >> 2];
      c[(p + 4) >> 2] = c[(d + 4) >> 2];
      c[(p + 8) >> 2] = c[(d + 8) >> 2];
      c[(p + 12) >> 2] = c[(d + 12) >> 2];
      c[(p + 16) >> 2] = c[(d + 16) >> 2];
      c[(p + 16 + 4) >> 2] = c[(d + 16 + 4) >> 2];
      c[(p + 16 + 8) >> 2] = c[(d + 16 + 8) >> 2];
      c[(p + 16 + 12) >> 2] = c[(d + 16 + 12) >> 2];
      c[(p + 32) >> 2] = c[(d + 32) >> 2];
      c[(p + 32 + 4) >> 2] = c[(d + 32 + 4) >> 2];
      c[(p + 32 + 8) >> 2] = c[(d + 32 + 8) >> 2];
      c[(p + 32 + 12) >> 2] = c[(d + 32 + 12) >> 2];
      c[(p + 48) >> 2] = c[(d + 48) >> 2];
      c[(p + 48 + 4) >> 2] = c[(d + 48 + 4) >> 2];
      c[(p + 48 + 8) >> 2] = c[(d + 48 + 8) >> 2];
      c[(p + 48 + 12) >> 2] = c[(d + 48 + 12) >> 2];
      n = c[(e + 4) >> 2] | 0;
      o = +Sb[c[((c[e >> 2] | 0) + 48) >> 2] & 15](e);
      mc[c[((c[e >> 2] | 0) + 8) >> 2] & 127](
        e,
        d,
        (p + 112) | 0,
        (p + 96) | 0
      );
      f = +g[(p + 112) >> 2];
      if (+g[(b + 32) >> 2] > f) g[(b + 32) >> 2] = f;
      f = +g[(p + 96) >> 2];
      if (+g[(b + 48) >> 2] < f) g[(b + 48) >> 2] = f;
      f = +g[(p + 112 + 4) >> 2];
      if (+g[(b + 36) >> 2] > f) g[(b + 36) >> 2] = f;
      f = +g[(p + 96 + 4) >> 2];
      if (+g[(b + 52) >> 2] < f) g[(b + 52) >> 2] = f;
      f = +g[(p + 112 + 8) >> 2];
      if (+g[(b + 40) >> 2] > f) g[(b + 40) >> 2] = f;
      f = +g[(p + 96 + 8) >> 2];
      if (+g[(b + 56) >> 2] < f) g[(b + 56) >> 2] = f;
      l = c[(b + 64) >> 2] | 0;
      if (!l) {
        l = (b + 16) | 0;
        k = 0;
      } else {
        c[(p + 64) >> 2] = c[(p + 112) >> 2];
        c[(p + 64 + 4) >> 2] = c[(p + 112 + 4) >> 2];
        c[(p + 64 + 8) >> 2] = c[(p + 112 + 8) >> 2];
        c[(p + 64 + 12) >> 2] = c[(p + 112 + 12) >> 2];
        c[(p + 64 + 16) >> 2] = c[(p + 96) >> 2];
        c[(p + 64 + 16 + 4) >> 2] = c[(p + 96 + 4) >> 2];
        c[(p + 64 + 16 + 8) >> 2] = c[(p + 96 + 8) >> 2];
        c[(p + 64 + 16 + 12) >> 2] = c[(p + 96 + 12) >> 2];
        k = c[(b + 16) >> 2] | 0;
        d = c[(l + 4) >> 2] | 0;
        if (!d) {
          c[6435] = (c[6435] | 0) + 1;
          d = yc(63) | 0;
          if (!d) d = 0;
          else {
            c[(((d + 4 + 15) & -16) + -4) >> 2] = d;
            d = (d + 4 + 15) & -16;
          }
          h = d;
          j = (h + 44) | 0;
          do {
            c[h >> 2] = 0;
            h = (h + 4) | 0;
          } while ((h | 0) < (j | 0));
        } else c[(l + 4) >> 2] = 0;
        c[(d + 32) >> 2] = 0;
        c[(d + 36) >> 2] = k;
        c[(d + 40) >> 2] = 0;
        c[d >> 2] = c[(p + 64) >> 2];
        c[(d + 4) >> 2] = c[(p + 64 + 4) >> 2];
        c[(d + 8) >> 2] = c[(p + 64 + 8) >> 2];
        c[(d + 12) >> 2] = c[(p + 64 + 12) >> 2];
        c[(d + 16) >> 2] = c[(p + 64 + 16) >> 2];
        c[(d + 20) >> 2] = c[(p + 64 + 20) >> 2];
        c[(d + 24) >> 2] = c[(p + 64 + 24) >> 2];
        c[(d + 28) >> 2] = c[(p + 64 + 28) >> 2];
        lf(l, c[l >> 2] | 0, d);
        c[(l + 12) >> 2] = (c[(l + 12) >> 2] | 0) + 1;
        l = (b + 16) | 0;
        k = d;
      }
      d = c[l >> 2] | 0;
      if (
        (d | 0) == (c[(b + 20) >> 2] | 0)
          ? ((m = d | 0 ? d << 1 : 1), (d | 0) < (m | 0))
          : 0
      ) {
        if (!m) j = 0;
        else {
          c[6435] = (c[6435] | 0) + 1;
          d = yc((((m * 80) | 3) + 16) | 0) | 0;
          if (!d) d = 0;
          else {
            c[(((d + 4 + 15) & -16) + -4) >> 2] = d;
            d = (d + 4 + 15) & -16;
          }
          j = d;
          d = c[l >> 2] | 0;
        }
        if ((d | 0) > 0) {
          h = 0;
          do {
            q = (j + ((h * 80) | 0)) | 0;
            r = c[(b + 24) >> 2] | 0;
            s = (r + ((h * 80) | 0)) | 0;
            c[q >> 2] = c[s >> 2];
            c[(q + 4) >> 2] = c[(s + 4) >> 2];
            c[(q + 8) >> 2] = c[(s + 8) >> 2];
            c[(q + 12) >> 2] = c[(s + 12) >> 2];
            q = (j + ((h * 80) | 0) + 16) | 0;
            s = (r + ((h * 80) | 0) + 16) | 0;
            c[q >> 2] = c[s >> 2];
            c[(q + 4) >> 2] = c[(s + 4) >> 2];
            c[(q + 8) >> 2] = c[(s + 8) >> 2];
            c[(q + 12) >> 2] = c[(s + 12) >> 2];
            q = (j + ((h * 80) | 0) + 32) | 0;
            s = (r + ((h * 80) | 0) + 32) | 0;
            c[q >> 2] = c[s >> 2];
            c[(q + 4) >> 2] = c[(s + 4) >> 2];
            c[(q + 8) >> 2] = c[(s + 8) >> 2];
            c[(q + 12) >> 2] = c[(s + 12) >> 2];
            q = (j + ((h * 80) | 0) + 48) | 0;
            s = (r + ((h * 80) | 0) + 48) | 0;
            c[q >> 2] = c[s >> 2];
            c[(q + 4) >> 2] = c[(s + 4) >> 2];
            c[(q + 8) >> 2] = c[(s + 8) >> 2];
            c[(q + 12) >> 2] = c[(s + 12) >> 2];
            q = (j + ((h * 80) | 0) + 64) | 0;
            r = (r + ((h * 80) | 0) + 64) | 0;
            c[q >> 2] = c[r >> 2];
            c[(q + 4) >> 2] = c[(r + 4) >> 2];
            c[(q + 8) >> 2] = c[(r + 8) >> 2];
            c[(q + 12) >> 2] = c[(r + 12) >> 2];
            h = (h + 1) | 0;
          } while ((h | 0) != (d | 0));
        }
        d = c[(b + 24) >> 2] | 0;
        if (d | 0) {
          if (a[(b + 28) >> 0] | 0) {
            c[6436] = (c[6436] | 0) + 1;
            hd(c[(d + -4) >> 2] | 0);
          }
          c[(b + 24) >> 2] = 0;
        }
        a[(b + 28) >> 0] = 1;
        c[(b + 24) >> 2] = j;
        c[(b + 20) >> 2] = m;
        d = c[l >> 2] | 0;
      }
      s = c[(b + 24) >> 2] | 0;
      r = (s + ((d * 80) | 0)) | 0;
      c[r >> 2] = c[p >> 2];
      c[(r + 4) >> 2] = c[(p + 4) >> 2];
      c[(r + 8) >> 2] = c[(p + 8) >> 2];
      c[(r + 12) >> 2] = c[(p + 12) >> 2];
      r = (s + ((d * 80) | 0) + 16) | 0;
      c[r >> 2] = c[(p + 16) >> 2];
      c[(r + 4) >> 2] = c[(p + 16 + 4) >> 2];
      c[(r + 8) >> 2] = c[(p + 16 + 8) >> 2];
      c[(r + 12) >> 2] = c[(p + 16 + 12) >> 2];
      r = (s + ((d * 80) | 0) + 32) | 0;
      c[r >> 2] = c[(p + 32) >> 2];
      c[(r + 4) >> 2] = c[(p + 32 + 4) >> 2];
      c[(r + 8) >> 2] = c[(p + 32 + 8) >> 2];
      c[(r + 12) >> 2] = c[(p + 32 + 12) >> 2];
      r = (s + ((d * 80) | 0) + 48) | 0;
      c[r >> 2] = c[(p + 48) >> 2];
      c[(r + 4) >> 2] = c[(p + 48 + 4) >> 2];
      c[(r + 8) >> 2] = c[(p + 48 + 8) >> 2];
      c[(r + 12) >> 2] = c[(p + 48 + 12) >> 2];
      s = (s + ((d * 80) | 0) + 64) | 0;
      c[s >> 2] = e;
      c[(s + 4) >> 2] = n;
      g[(s + 8) >> 2] = o;
      c[(s + 12) >> 2] = k;
      c[l >> 2] = (c[l >> 2] | 0) + 1;
      i = p;
      return;
    }
    function Vd(a, b, d) {
      a = a | 0;
      b = b | 0;
      d = d | 0;
      var e = 0,
        f = 0,
        g = 0,
        h = 0,
        i = 0,
        j = 0,
        k = 0,
        l = 0,
        m = 0,
        n = 0,
        o = 0,
        p = 0;
      while (1) {
        p = (((b + d) | 0) / 2) | 0;
        m = c[(a + 12) >> 2] | 0;
        n = c[(m + (p << 4)) >> 2] | 0;
        o = c[(m + (p << 4) + 4) >> 2] | 0;
        p = c[(m + (p << 4) + 8) >> 2] | 0;
        e = b;
        f = d;
        while (1) {
          a: do
            if (!n)
              while (1) {
                j = c[(m + (e << 4)) >> 2] | 0;
                if (!j) g = -1;
                else g = c[(j + 12) >> 2] | 0;
                k = c[(m + (e << 4) + 4) >> 2] | 0;
                if (!k) h = -1;
                else h = c[(k + 12) >> 2] | 0;
                if (!o) i = -1;
                else i = c[(o + 12) >> 2] | 0;
                do
                  if ((g | 0) <= -1) {
                    g = (h | 0) > (i | 0);
                    if (g | (((j | 0) == 0) ^ 1))
                      if (((j | 0) == 0) & g) break;
                      else break a;
                    if ((k | 0) != (o | 0)) break a;
                    if ((c[(m + (e << 4) + 8) >> 2] | 0) >>> 0 <= p >>> 0)
                      break a;
                  }
                while (0);
                e = (e + 1) | 0;
              }
            else {
              l = c[(n + 12) >> 2] | 0;
              if (!o)
                while (1) {
                  i = c[(m + (e << 4)) >> 2] | 0;
                  if (!i) g = -1;
                  else g = c[(i + 12) >> 2] | 0;
                  j = c[(m + (e << 4) + 4) >> 2] | 0;
                  if (!j) h = -1;
                  else h = c[(j + 12) >> 2] | 0;
                  do
                    if ((g | 0) <= (l | 0)) {
                      g = (h | 0) > -1;
                      if (g | (((i | 0) == (n | 0)) ^ 1))
                        if (((i | 0) == (n | 0)) & g) break;
                        else break a;
                      if (j | 0) break a;
                      if ((c[(m + (e << 4) + 8) >> 2] | 0) >>> 0 <= p >>> 0)
                        break a;
                    }
                  while (0);
                  e = (e + 1) | 0;
                }
              k = c[(o + 12) >> 2] | 0;
              while (1) {
                i = c[(m + (e << 4)) >> 2] | 0;
                if (!i) g = -1;
                else g = c[(i + 12) >> 2] | 0;
                j = c[(m + (e << 4) + 4) >> 2] | 0;
                if (!j) h = -1;
                else h = c[(j + 12) >> 2] | 0;
                do
                  if ((g | 0) <= (l | 0)) {
                    g = (h | 0) > (k | 0);
                    if (g | (((i | 0) == (n | 0)) ^ 1))
                      if (((i | 0) == (n | 0)) & g) break;
                      else break a;
                    if ((j | 0) != (o | 0)) break a;
                    if ((c[(m + (e << 4) + 8) >> 2] | 0) >>> 0 <= p >>> 0)
                      break a;
                  }
                while (0);
                e = (e + 1) | 0;
              }
            }
          while (0);
          b: do
            if (!n)
              while (1) {
                j = c[(m + (f << 4)) >> 2] | 0;
                if (!j) g = -1;
                else g = c[(j + 12) >> 2] | 0;
                if (!o) h = -1;
                else h = c[(o + 12) >> 2] | 0;
                k = c[(m + (f << 4) + 4) >> 2] | 0;
                if (!k) i = -1;
                else i = c[(k + 12) >> 2] | 0;
                do
                  if ((g | 0) >= -1) {
                    g = (h | 0) > (i | 0);
                    if (g | (((j | 0) == 0) ^ 1))
                      if (((j | 0) == 0) & g) break;
                      else break b;
                    if ((o | 0) != (k | 0)) break b;
                    if (p >>> 0 <= (c[(m + (f << 4) + 8) >> 2] | 0) >>> 0)
                      break b;
                  }
                while (0);
                f = (f + -1) | 0;
              }
            else {
              l = c[(n + 12) >> 2] | 0;
              if (!o)
                while (1) {
                  i = c[(m + (f << 4)) >> 2] | 0;
                  if (!i) g = -1;
                  else g = c[(i + 12) >> 2] | 0;
                  j = c[(m + (f << 4) + 4) >> 2] | 0;
                  if (!j) h = -1;
                  else h = c[(j + 12) >> 2] | 0;
                  do
                    if ((l | 0) <= (g | 0)) {
                      g = (h | 0) < -1;
                      if (g | (((n | 0) == (i | 0)) ^ 1))
                        if (((n | 0) == (i | 0)) & g) break;
                        else break b;
                      if (j | 0) break b;
                      if (p >>> 0 <= (c[(m + (f << 4) + 8) >> 2] | 0) >>> 0)
                        break b;
                    }
                  while (0);
                  f = (f + -1) | 0;
                }
              k = c[(o + 12) >> 2] | 0;
              while (1) {
                i = c[(m + (f << 4)) >> 2] | 0;
                if (!i) g = -1;
                else g = c[(i + 12) >> 2] | 0;
                j = c[(m + (f << 4) + 4) >> 2] | 0;
                if (!j) h = -1;
                else h = c[(j + 12) >> 2] | 0;
                do
                  if ((l | 0) <= (g | 0)) {
                    g = (k | 0) > (h | 0);
                    if (g | (((n | 0) == (i | 0)) ^ 1))
                      if (((n | 0) == (i | 0)) & g) break;
                      else break b;
                    if ((o | 0) != (j | 0)) break b;
                    if (p >>> 0 <= (c[(m + (f << 4) + 8) >> 2] | 0) >>> 0)
                      break b;
                  }
                while (0);
                f = (f + -1) | 0;
              }
            }
          while (0);
          if ((e | 0) <= (f | 0)) {
            h = (m + (e << 4)) | 0;
            i = c[h >> 2] | 0;
            j = c[(m + (e << 4) + 4) >> 2] | 0;
            k = c[(m + (e << 4) + 8) >> 2] | 0;
            l = c[(m + (e << 4) + 12) >> 2] | 0;
            m = (m + (f << 4)) | 0;
            c[h >> 2] = c[m >> 2];
            c[(h + 4) >> 2] = c[(m + 4) >> 2];
            c[(h + 8) >> 2] = c[(m + 8) >> 2];
            c[(h + 12) >> 2] = c[(m + 12) >> 2];
            m = c[(a + 12) >> 2] | 0;
            c[(m + (f << 4)) >> 2] = i;
            c[(m + (f << 4) + 4) >> 2] = j;
            c[(m + (f << 4) + 8) >> 2] = k;
            c[(m + (f << 4) + 12) >> 2] = l;
            e = (e + 1) | 0;
            f = (f + -1) | 0;
          }
          if ((e | 0) > (f | 0)) break;
          m = c[(a + 12) >> 2] | 0;
        }
        if ((f | 0) > (b | 0)) Vd(a, b, f);
        if ((e | 0) < (d | 0)) b = e;
        else break;
      }
      return;
    }
    function Wd(a, b) {
      a = a | 0;
      b = b | 0;
      var d = 0,
        e = 0.0,
        f = 0,
        h = 0,
        j = 0,
        k = 0,
        l = 0,
        m = 0.0,
        n = 0.0,
        o = 0.0,
        p = 0.0,
        q = 0.0,
        r = 0,
        s = 0,
        t = 0.0,
        u = 0.0,
        v = 0.0,
        w = 0.0,
        x = 0.0,
        y = 0.0,
        z = 0,
        A = 0,
        B = 0,
        C = 0,
        D = 0,
        E = 0;
      D = i;
      i = (i + 16) | 0;
      li(11054);
      C = c[(a + 712) >> 2] | 0;
      if ((C | 0) > 0) {
        c[6435] = (c[6435] | 0) + 1;
        d = yc((((C << 4) | 3) + 16) | 0) | 0;
        if (!d) h = 0;
        else {
          c[(((d + 4 + 15) & -16) + -4) >> 2] = d;
          h = (d + 4 + 15) & -16;
        }
        d = 0;
        do {
          B = (h + (d << 4)) | 0;
          d = (d + 1) | 0;
          c[B >> 2] = 0;
          c[(B + 4) >> 2] = 0;
          c[(B + 8) >> 2] = 0;
          c[(B + 12) >> 2] = 0;
        } while ((d | 0) != (C | 0));
        f = c[(a + 712) >> 2] | 0;
        if ((f | 0) > 0) {
          c[6435] = (c[6435] | 0) + 1;
          d = yc((((f << 2) | 3) + 16) | 0) | 0;
          if (!d) d = 0;
          else {
            c[(((d + 4 + 15) & -16) + -4) >> 2] = d;
            d = (d + 4 + 15) & -16;
          }
          Qn(d | 0, 0, (f << 2) | 0) | 0;
          B = h;
          A = d;
        } else {
          B = h;
          A = 0;
        }
      } else {
        B = 0;
        A = 0;
      }
      s = c[(a + 1112) >> 2] | 0;
      if (b) {
        if ((s | 0) > 0) {
          h = c[(a + 1120) >> 2] | 0;
          j = 0;
          do {
            d = c[(h + (j << 2)) >> 2] | 0;
            f = c[(d + 312) >> 2] | 0;
            if (f | 0) {
              g[(d + 276) >> 2] = (1.0 / +(f | 0)) * +g[(d + 276) >> 2];
              g[(d + 280) >> 2] = (1.0 / +(f | 0)) * +g[(d + 280) >> 2];
              g[(d + 284) >> 2] = (1.0 / +(f | 0)) * +g[(d + 284) >> 2];
              g[(d + 292) >> 2] = +g[(d + 292) >> 2] * (1.0 / +(f | 0));
              g[(d + 296) >> 2] = (1.0 / +(f | 0)) * +g[(d + 296) >> 2];
              g[(d + 300) >> 2] = (1.0 / +(f | 0)) * +g[(d + 300) >> 2];
            }
            j = (j + 1) | 0;
          } while ((j | 0) != (s | 0));
          j = 13;
        }
      } else j = 13;
      if ((j | 0) == 13 ? (s | 0) > 0 : 0) {
        l = c[(a + 1120) >> 2] | 0;
        if (b) {
          b = 0;
          do {
            d = c[(l + (b << 2)) >> 2] | 0;
            if (
              (c[(d + 312) >> 2] | 0) > 0
                ? ((y = +g[(a + 452) >> 2]),
                  (t = +g[(d + 276) >> 2] * y),
                  (u = y * +g[(d + 280) >> 2]),
                  (v = y * +g[(d + 284) >> 2]),
                  (w = y * +g[(d + 292) >> 2]),
                  (x = y * +g[(d + 296) >> 2]),
                  (y = y * +g[(d + 300) >> 2]),
                  (z = c[(d + 24) >> 2] | 0),
                  (z | 0) > 0)
                : 0
            ) {
              f = c[(d + 32) >> 2] | 0;
              h = c[(a + 720) >> 2] | 0;
              j = c[(d + 12) >> 2] | 0;
              k = 0;
              do {
                r = c[(f + (k << 2)) >> 2] | 0;
                q = +g[(j + (k << 2)) >> 2];
                p = +g[(r + 8) >> 2] - +g[(d + 228) >> 2];
                o = +g[(r + 12) >> 2] - +g[(d + 232) >> 2];
                n = +g[(r + 16) >> 2] - +g[(d + 236) >> 2];
                E = (B + (((((r - h) | 0) / 104) | 0) << 4)) | 0;
                g[E >> 2] = +g[E >> 2] + q * (t + (x * n - y * o));
                E = (B + (((((r - h) | 0) / 104) | 0) << 4) + 4) | 0;
                g[E >> 2] = +g[E >> 2] + q * (u + (y * p - w * n));
                E = (B + (((((r - h) | 0) / 104) | 0) << 4) + 8) | 0;
                g[E >> 2] = q * (v + (w * o - x * p)) + +g[E >> 2];
                r = (A + (((((r - h) | 0) / 104) | 0) << 2)) | 0;
                g[r >> 2] = q + +g[r >> 2];
                k = (k + 1) | 0;
              } while ((k | 0) != (z | 0));
            }
            b = (b + 1) | 0;
          } while ((b | 0) != (s | 0));
        } else {
          b = 0;
          do {
            d = c[(l + (b << 2)) >> 2] | 0;
            if (
              (c[(d + 308) >> 2] | 0) > 0
                ? ((q = +g[(a + 452) >> 2]),
                  (e = +g[(d + 244) >> 2] * q),
                  (m = q * +g[(d + 248) >> 2]),
                  (n = q * +g[(d + 252) >> 2]),
                  (o = q * +g[(d + 260) >> 2]),
                  (p = q * +g[(d + 264) >> 2]),
                  (q = q * +g[(d + 268) >> 2]),
                  (r = c[(d + 24) >> 2] | 0),
                  (r | 0) > 0)
                : 0
            ) {
              f = c[(d + 32) >> 2] | 0;
              h = c[(a + 720) >> 2] | 0;
              j = c[(d + 12) >> 2] | 0;
              k = 0;
              do {
                E = c[(f + (k << 2)) >> 2] | 0;
                y = +g[(j + (k << 2)) >> 2];
                x = +g[(E + 8) >> 2] - +g[(d + 228) >> 2];
                w = +g[(E + 12) >> 2] - +g[(d + 232) >> 2];
                v = +g[(E + 16) >> 2] - +g[(d + 236) >> 2];
                z = (B + (((((E - h) | 0) / 104) | 0) << 4)) | 0;
                g[z >> 2] = +g[z >> 2] + y * (e + (p * v - q * w));
                z = (B + (((((E - h) | 0) / 104) | 0) << 4) + 4) | 0;
                g[z >> 2] = +g[z >> 2] + y * (m + (q * x - o * v));
                z = (B + (((((E - h) | 0) / 104) | 0) << 4) + 8) | 0;
                g[z >> 2] = y * (n + (o * w - p * x)) + +g[z >> 2];
                E = (A + (((((E - h) | 0) / 104) | 0) << 2)) | 0;
                g[E >> 2] = y + +g[E >> 2];
                k = (k + 1) | 0;
              } while ((k | 0) != (r | 0));
            }
            b = (b + 1) | 0;
          } while ((b | 0) != (s | 0));
        }
      }
      if ((C | 0) > 0) {
        d = 0;
        do {
          e = +g[(A + (d << 2)) >> 2];
          if (e > 0.0) {
            E = c[(a + 720) >> 2] | 0;
            x = (1.0 / e) * +g[(B + (d << 4) + 4) >> 2];
            y = (1.0 / e) * +g[(B + (d << 4) + 8) >> 2];
            z = (E + ((d * 104) | 0) + 8) | 0;
            g[z >> 2] = (1.0 / e) * +g[(B + (d << 4)) >> 2] + +g[z >> 2];
            z = (E + ((d * 104) | 0) + 12) | 0;
            g[z >> 2] = x + +g[z >> 2];
            E = (E + ((d * 104) | 0) + 16) | 0;
            g[E >> 2] = y + +g[E >> 2];
          }
          d = (d + 1) | 0;
        } while ((d | 0) != (C | 0));
      }
      if (A | 0) {
        c[6436] = (c[6436] | 0) + 1;
        hd(c[(A + -4) >> 2] | 0);
      }
      if (B | 0) {
        c[6436] = (c[6436] | 0) + 1;
        hd(c[(B + -4) >> 2] | 0);
      }
      d = c[2357] | 0;
      E = ((c[(d + 16) >> 2] | 0) + -1) | 0;
      c[(d + 16) >> 2] = E;
      if (E | 0) {
        i = D;
        return;
      }
      do
        if (c[(d + 4) >> 2] | 0) {
          tb(D | 0, 0) | 0;
          E = c[6434] | 0;
          g[(d + 8) >> 2] =
            +g[(d + 8) >> 2] +
            +(
              (((c[(D + 4) >> 2] | 0) -
                (c[(E + 4) >> 2] | 0) +
                (((((c[D >> 2] | 0) - (c[E >> 2] | 0)) | 0) * 1e6) | 0) -
                (c[(d + 12) >> 2] | 0)) |
                0) >>>
              0
            ) /
              1.0e3;
          if (!(c[(d + 16) >> 2] | 0)) {
            d = c[2357] | 0;
            break;
          } else {
            i = D;
            return;
          }
        }
      while (0);
      c[2357] = c[(d + 20) >> 2];
      i = D;
      return;
    }
    function Xd(b, d, e, f, h, j) {
      b = b | 0;
      d = d | 0;
      e = e | 0;
      f = f | 0;
      h = h | 0;
      j = j | 0;
      var l = 0,
        m = 0.0,
        n = 0,
        o = 0,
        p = 0.0,
        q = 0.0,
        r = 0.0,
        s = 0.0,
        t = 0.0,
        u = 0.0,
        v = 0.0,
        w = 0.0,
        x = 0.0,
        y = 0.0,
        z = 0.0,
        A = 0.0,
        B = 0.0,
        C = 0,
        D = 0;
      C = i;
      i = (i + 304) | 0;
      B = +g[(e + 48) >> 2] - +g[(d + 48) >> 2];
      z = +g[(e + 52) >> 2] - +g[(d + 52) >> 2];
      A = +g[(e + 56) >> 2] - +g[(d + 56) >> 2];
      Gf(d, e, (C + 288) | 0, (C + 240) | 0);
      v = +g[(C + 240) >> 2];
      t = +g[(C + 288) >> 2] * v;
      u = v * +g[(C + 288 + 4) >> 2];
      v = v * +g[(C + 288 + 8) >> 2];
      g[(C + 208) >> 2] = t;
      g[(C + 208 + 4) >> 2] = u;
      g[(C + 208 + 8) >> 2] = v;
      g[(C + 208 + 12) >> 2] = 0.0;
      w = +g[(h + 48) >> 2] - +g[(f + 48) >> 2];
      x = +g[(h + 52) >> 2] - +g[(f + 52) >> 2];
      y = +g[(h + 56) >> 2] - +g[(f + 56) >> 2];
      Gf(f, h, (C + 288) | 0, (C + 240) | 0);
      r = +g[(C + 240) >> 2];
      p = +g[(C + 288) >> 2] * r;
      q = r * +g[(C + 288 + 4) >> 2];
      r = r * +g[(C + 288 + 8) >> 2];
      g[(C + 192) >> 2] = p;
      g[(C + 192 + 4) >> 2] = q;
      g[(C + 192 + 8) >> 2] = r;
      g[(C + 192 + 12) >> 2] = 0.0;
      e = c[(b + 12) >> 2] | 0;
      s = +Sb[c[((c[e >> 2] | 0) + 16) >> 2] & 15](e);
      e = c[(b + 16) >> 2] | 0;
      if (!e) m = 0.0;
      else m = +Sb[c[((c[e >> 2] | 0) + 16) >> 2] & 15](e);
      s = s * +O(+(t * t + u * u + v * v)) + m * +O(+(p * p + q * q + r * r));
      if (
        s + +O(+((w - B) * (w - B) + (x - z) * (x - z) + (y - A) * (y - A))) ==
        0.0
      ) {
        j = 0;
        i = C;
        return j | 0;
      }
      c[(C + 240) >> 2] = 9160;
      g[(C + 240 + 36) >> 2] = 999999984306749440.0;
      a[(C + 240 + 40) >> 0] = 0;
      Ld(b, d, f, (C + 240) | 0);
      h = (a[(C + 240 + 40) >> 0] | 0) == 0;
      c[(C + 288) >> 2] = c[(C + 240 + 20) >> 2];
      c[(C + 288 + 4) >> 2] = c[(C + 240 + 20 + 4) >> 2];
      c[(C + 288 + 8) >> 2] = c[(C + 240 + 20 + 8) >> 2];
      c[(C + 288 + 12) >> 2] = c[(C + 240 + 20 + 12) >> 2];
      a: do
        if (
          !h
            ? ((o = c[(C + 240 + 4) >> 2] | 0),
              (l = c[(C + 240 + 8) >> 2] | 0),
              (n = c[(C + 240 + 12) >> 2] | 0),
              (v = (w - B) * ((c[k >> 2] = o), +g[k >> 2])),
              (v = v + (x - z) * ((c[k >> 2] = l), +g[k >> 2])),
              !(
                s + (v + (y - A) * ((c[k >> 2] = n), +g[k >> 2])) <=
                1.1920928955078125e-7
              ))
            : 0
        ) {
          m = +g[(C + 240 + 16) >> 2];
          p = +g[(C + 240 + 36) >> 2] + +g[(j + 172) >> 2];
          b: do
            if (p > 1.0000000474974513e-3) {
              q = p;
              r = 0.0;
              h = 0;
              while (1) {
                e = c[(j + 168) >> 2] | 0;
                if (e | 0) {
                  D = c[((c[e >> 2] | 0) + 20) >> 2] | 0;
                  c[(C + 224) >> 2] = 1065353216;
                  c[(C + 224 + 4) >> 2] = 1065353216;
                  c[(C + 224 + 8) >> 2] = 1065353216;
                  g[(C + 224 + 12) >> 2] = 0.0;
                  Fb[D & 7](
                    e,
                    (C + 288) | 0,
                    0.20000000298023224,
                    (C + 224) | 0
                  );
                }
                m = (w - B) * ((c[k >> 2] = o), +g[k >> 2]);
                m = m + (x - z) * ((c[k >> 2] = l), +g[k >> 2]);
                m = s + (m + (y - A) * ((c[k >> 2] = n), +g[k >> 2]));
                if (m <= 1.1920928955078125e-7) {
                  l = 0;
                  break a;
                }
                p = r + q / m;
                if (!(!(p <= r) & (!(p < 0.0) & !(p > 1.0)))) {
                  l = 0;
                  break a;
                }
                Zg(d, B, z, A, (C + 208) | 0, p, (C + 112) | 0);
                Zg(f, w, x, y, (C + 192) | 0, p, (C + 48) | 0);
                l = c[(j + 168) >> 2] | 0;
                if (l | 0) {
                  D = c[((c[l >> 2] | 0) + 20) >> 2] | 0;
                  c[(C + 176) >> 2] = 1065353216;
                  c[(C + 176 + 4) >> 2] = 0;
                  c[(C + 176 + 8) >> 2] = 0;
                  g[(C + 176 + 12) >> 2] = 0.0;
                  Fb[D & 7](
                    l,
                    (C + 112 + 48) | 0,
                    0.20000000298023224,
                    (C + 176) | 0
                  );
                }
                zb[c[c[j >> 2] >> 2] & 31](j, p);
                c[C >> 2] = 9160;
                g[(C + 36) >> 2] = 999999984306749440.0;
                a[(C + 40) >> 0] = 0;
                Ld(b, (C + 112) | 0, (C + 48) | 0, C);
                if (!(a[(C + 40) >> 0] | 0)) {
                  l = 15;
                  break;
                }
                m = +g[(C + 36) >> 2];
                q = +g[(j + 172) >> 2];
                c[(C + 288) >> 2] = c[(C + 20) >> 2];
                c[(C + 288 + 4) >> 2] = c[(C + 20 + 4) >> 2];
                c[(C + 288 + 8) >> 2] = c[(C + 20 + 8) >> 2];
                c[(C + 288 + 12) >> 2] = c[(C + 20 + 12) >> 2];
                e = (h + 1) | 0;
                if ((h | 0) > 63) {
                  l = 16;
                  break;
                }
                n = c[(C + 12) >> 2] | 0;
                l = c[(C + 8) >> 2] | 0;
                o = c[(C + 4) >> 2] | 0;
                q = m + q;
                if (!(q > 1.0000000474974513e-3)) {
                  m = +g[(C + 16) >> 2];
                  break b;
                } else {
                  r = p;
                  h = e;
                }
              }
              if ((l | 0) == 15)
                ic[c[((c[j >> 2] | 0) + 8) >> 2] & 127](j, -1, h);
              else if ((l | 0) == 16)
                ic[c[((c[j >> 2] | 0) + 8) >> 2] & 127](j, -2, e);
              l = 0;
              break a;
            } else p = 0.0;
          while (0);
          g[(j + 164) >> 2] = p;
          c[(j + 132) >> 2] = o;
          c[(j + 136) >> 2] = l;
          c[(j + 140) >> 2] = n;
          g[(j + 144) >> 2] = m;
          c[(j + 148) >> 2] = c[(C + 288) >> 2];
          c[(j + 148 + 4) >> 2] = c[(C + 288 + 4) >> 2];
          c[(j + 148 + 8) >> 2] = c[(C + 288 + 8) >> 2];
          c[(j + 148 + 12) >> 2] = c[(C + 288 + 12) >> 2];
          l = 1;
        } else l = 0;
      while (0);
      D = l;
      i = C;
      return D | 0;
    }
    function Yd(a, b) {
      a = a | 0;
      b = b | 0;
      var d = 0.0,
        e = 0.0,
        f = 0.0,
        h = 0,
        i = 0,
        j = 0.0,
        l = 0.0,
        m = 0,
        n = 0,
        o = 0,
        p = 0.0,
        q = 0.0,
        r = 0.0,
        s = 0.0,
        t = 0.0,
        u = 0,
        v = 0,
        w = 0.0,
        x = 0.0,
        y = 0,
        z = 0.0,
        A = 0.0,
        B = 0.0;
      c[(a + 556) >> 2] = c[b >> 2];
      c[(a + 556 + 4) >> 2] = c[(b + 4) >> 2];
      c[(a + 556 + 8) >> 2] = c[(b + 8) >> 2];
      c[(a + 556 + 12) >> 2] = c[(b + 12) >> 2];
      q = +g[(a + 568) >> 2];
      r = +g[(a + 560) >> 2];
      s = +g[(a + 564) >> 2];
      p = +g[(a + 556) >> 2];
      d = -p - r * 0.0 - s * 0.0;
      e =
        (s + q * 0.0 - p * 0.0) * -s +
        (q * (q + r * 0.0 - s * 0.0) + d * -p) -
        (q * 0.0 + p * 0.0 - r) * -r;
      f =
        (q * 0.0 + p * 0.0 - r) * -p +
        (q * (s + q * 0.0 - p * 0.0) + d * -r) -
        (q + r * 0.0 - s * 0.0) * -s;
      d =
        (q + r * 0.0 - s * 0.0) * -r +
        (d * -s + q * (q * 0.0 + p * 0.0 - r)) -
        (s + q * 0.0 - p * 0.0) * -p;
      if (d * 0.0 + (f * 0.0 + e) < -0.9999998807907104) {
        j = -0.0;
        l = 1.0;
        d = 0.0;
        e = 0.0;
      } else {
        B = +O(+((d * 0.0 + (f * 0.0 + e) + 1.0) * 2.0));
        j = (d * 0.0 - f * 0.0) * (1.0 / B);
        l = (e * 0.0 - d) * (1.0 / B);
        d = (f - e * 0.0) * (1.0 / B);
        e = B * 0.5;
      }
      z = 1.0 / +O(+(e * e + (j * j + l * l + d * d)));
      j = j * z;
      n = ((g[k >> 2] = j), c[k >> 2] | 0);
      w = l * z;
      t = d * z;
      v = ((g[k >> 2] = t), c[k >> 2] | 0);
      d = e * z;
      u = ((g[k >> 2] = d), c[k >> 2] | 0);
      e =
        1.0 /
        +O(
          +(
            (d * q - p * -j - r * -w - s * -t) *
              (d * q - p * -j - r * -w - s * -t) +
            ((q * -t + d * s + r * -j - p * -w) *
              (q * -t + d * s + r * -j - p * -w) +
              ((p * d + q * -j + s * -w - r * -t) *
                (p * d + q * -j + s * -w - r * -t) +
                (p * -t + (q * -w + d * r) - s * -j) *
                  (p * -t + (q * -w + d * r) - s * -j)))
          )
        );
      z = (p * d + q * -j + s * -w - r * -t) * e;
      i = ((g[k >> 2] = z), c[k >> 2] | 0);
      A = e * (p * -t + (q * -w + d * r) - s * -j);
      b = ((g[k >> 2] = A), c[k >> 2] | 0);
      B = e * (q * -t + d * s + r * -j - p * -w);
      h = ((g[k >> 2] = B), c[k >> 2] | 0);
      p = e * (d * q - p * -j - r * -w - s * -t);
      e = +g[(a + 444) >> 2];
      m = ((g[k >> 2] = e), c[k >> 2] | 0);
      if (
        e >= 0.05000000074505806
          ? ((x = +g[(a + 448) >> 2]), x >= 0.05000000074505806)
          : 0
      ) {
        d = d < -1.0 ? -1.0 : d;
        d = +T(+(d > 1.0 ? 1.0 : d)) * 2.0;
        if (d > 1.1920928955078125e-7) {
          f = 1.0 / +O(+(t * t + (j * j + w * w)));
          if (+N(+(w * f)) > 1.1920928955078125e-7) {
            x = +O(
              +(
                ((t * f * t * f) / (w * f * w * f) + 1.0) /
                (1.0 / (x * x) + (t * f * t * f) / (w * f * w * f) / (e * e))
              )
            );
            j = j * f;
            l = w * f;
            f = t * f;
            m = ((g[k >> 2] = x), c[k >> 2] | 0);
          } else {
            j = j * f;
            l = w * f;
            f = t * f;
          }
        } else {
          j = 0.0;
          l = 0.0;
          f = 0.0;
          m = 0;
        }
        if (+N(+d) > 1.1920928955078125e-7) {
          e = ((c[k >> 2] = m), +g[k >> 2]);
          if (!(d > e)) {
            if (d < -e) d = -e;
          } else d = e;
          x = d * 0.5;
          w = +R(+x) / +O(+(j * j + l * l + f * f));
          x = +Q(+x);
          y = ((g[k >> 2] = j * w), c[k >> 2] | 0);
          v = ((g[k >> 2] = f * w), c[k >> 2] | 0);
          w = l * w;
          u = ((g[k >> 2] = x), c[k >> 2] | 0);
        } else y = n;
      } else y = n;
      d = +g[(a + 452) >> 2];
      if (d >= 0.05000000074505806) {
        e = p < -1.0 ? -1.0 : p;
        e = +T(+(e > 1.0 ? 1.0 : e)) * 2.0;
        if (e > 3.1415927410125732) {
          o = ((g[k >> 2] = -z), c[k >> 2] | 0);
          n = ((g[k >> 2] = -A), c[k >> 2] | 0);
          e = -p < -1.0 ? -1.0 : -p;
          m = ((g[k >> 2] = -B), c[k >> 2] | 0);
          e = +T(+(e > 1.0 ? 1.0 : e)) * 2.0;
        } else {
          o = i;
          n = b;
          m = h;
        }
        f = ((c[k >> 2] = o), +g[k >> 2]);
        j = ((c[k >> 2] = n), +g[k >> 2]);
        l = ((c[k >> 2] = m), +g[k >> 2]);
        if (e > 1.1920928955078125e-7) {
          B = 1.0 / +O(+(f * f + j * j + l * l));
          o = ((g[k >> 2] = f * B), c[k >> 2] | 0);
          n = ((g[k >> 2] = j * B), c[k >> 2] | 0);
          m = ((g[k >> 2] = l * B), c[k >> 2] | 0);
        }
        if (+N(+e) > 1.1920928955078125e-7) {
          if (!(e > d))
            if (e < -d) d = -d;
            else d = e;
          x = ((c[k >> 2] = o), +g[k >> 2]);
          z = ((c[k >> 2] = n), +g[k >> 2]);
          A = ((c[k >> 2] = m), +g[k >> 2]);
          d = d * 0.5;
          B = +R(+d) / +O(+(A * A + (z * z + x * x)));
          d = +Q(+d);
          i = ((g[k >> 2] = x * B), c[k >> 2] | 0);
          b = ((g[k >> 2] = z * B), c[k >> 2] | 0);
          h = ((g[k >> 2] = A * B), c[k >> 2] | 0);
        } else d = p;
      } else d = p;
      s = ((c[k >> 2] = u), +g[k >> 2]);
      x = ((c[k >> 2] = i), +g[k >> 2]);
      t = ((c[k >> 2] = y), +g[k >> 2]);
      B = ((c[k >> 2] = h), +g[k >> 2]);
      A = ((c[k >> 2] = v), +g[k >> 2]);
      z = ((c[k >> 2] = b), +g[k >> 2]);
      g[(a + 556) >> 2] = w * B + (s * x + t * d) - A * z;
      g[(a + 560) >> 2] = A * x + (s * z + w * d) - t * B;
      g[(a + 564) >> 2] = t * z + (s * B + A * d) - w * x;
      g[(a + 568) >> 2] = s * d - t * x - w * z - A * B;
      return;
    }
    function Zd(b, d) {
      b = b | 0;
      d = d | 0;
      var e = 0,
        f = 0,
        h = 0,
        i = 0,
        j = 0,
        k = 0,
        l = 0,
        m = 0;
      c[b >> 2] = 5224;
      c[6435] = (c[6435] | 0) + 1;
      e = yc(379) | 0;
      if (!e) e = 0;
      else {
        c[(((e + 4 + 15) & -16) + -4) >> 2] = e;
        e = (e + 4 + 15) & -16;
      }
      g[(e + 308) >> 2] = 9.999999747378752e-5;
      f = (e + 332) | 0;
      a[f >> 0] = a[f >> 0] & -16;
      c[(b + 24) >> 2] = e;
      f = (c[(d + 20) >> 2] | 0) == 0;
      c[6435] = (c[6435] | 0) + 1;
      e = yc(23) | 0;
      if (!e) e = 0;
      else {
        c[(((e + 4 + 15) & -16) + -4) >> 2] = e;
        e = (e + 4 + 15) & -16;
      }
      if (f) {
        c[e >> 2] = 9072;
        c[(b + 28) >> 2] = e;
        f = (b + 28) | 0;
      } else {
        c[e >> 2] = 9120;
        c[(b + 28) >> 2] = e;
        f = (b + 28) | 0;
      }
      c[6435] = (c[6435] | 0) + 1;
      e = yc(43) | 0;
      if (!e) e = 0;
      else {
        c[(((e + 4 + 15) & -16) + -4) >> 2] = e;
        e = (e + 4 + 15) & -16;
      }
      k = c[(b + 24) >> 2] | 0;
      l = c[f >> 2] | 0;
      a[(e + 4) >> 0] = 0;
      c[e >> 2] = 6032;
      c[(e + 16) >> 2] = 0;
      c[(e + 20) >> 2] = 3;
      c[(e + 12) >> 2] = k;
      c[(e + 8) >> 2] = l;
      c[(b + 32) >> 2] = e;
      c[6435] = (c[6435] | 0) + 1;
      e = yc(27) | 0;
      if (!e) e = 0;
      else {
        c[(((e + 4 + 15) & -16) + -4) >> 2] = e;
        e = (e + 4 + 15) & -16;
      }
      a[(e + 4) >> 0] = 0;
      c[e >> 2] = 5256;
      c[(b + 36) >> 2] = e;
      c[6435] = (c[6435] | 0) + 1;
      e = yc(27) | 0;
      if (!e) e = 0;
      else {
        c[(((e + 4 + 15) & -16) + -4) >> 2] = e;
        e = (e + 4 + 15) & -16;
      }
      a[(e + 4) >> 0] = 0;
      c[e >> 2] = 5276;
      c[(b + 40) >> 2] = e;
      c[6435] = (c[6435] | 0) + 1;
      e = yc(27) | 0;
      if (!e) e = 0;
      else {
        c[(((e + 4 + 15) & -16) + -4) >> 2] = e;
        e = (e + 4 + 15) & -16;
      }
      a[(e + 4) >> 0] = 0;
      c[e >> 2] = 5296;
      c[(b + 44) >> 2] = e;
      c[6435] = (c[6435] | 0) + 1;
      e = yc(27) | 0;
      if (!e) e = 0;
      else {
        c[(((e + 4 + 15) & -16) + -4) >> 2] = e;
        e = (e + 4 + 15) & -16;
      }
      a[(e + 4) >> 0] = 0;
      c[e >> 2] = 5316;
      c[(b + 48) >> 2] = e;
      c[6435] = (c[6435] | 0) + 1;
      e = yc(27) | 0;
      if (!e) e = 0;
      else {
        c[(((e + 4 + 15) & -16) + -4) >> 2] = e;
        e = (e + 4 + 15) & -16;
      }
      a[(e + 4) >> 0] = 0;
      c[e >> 2] = 5336;
      c[(b + 52) >> 2] = e;
      c[6435] = (c[6435] | 0) + 1;
      e = yc(27) | 0;
      if (!e) e = 0;
      else {
        c[(((e + 4 + 15) & -16) + -4) >> 2] = e;
        e = (e + 4 + 15) & -16;
      }
      a[(e + 4) >> 0] = 0;
      c[e >> 2] = 5356;
      c[(b + 56) >> 2] = e;
      c[6435] = (c[6435] | 0) + 1;
      e = yc(27) | 0;
      if (!e) e = 0;
      else {
        c[(((e + 4 + 15) & -16) + -4) >> 2] = e;
        e = (e + 4 + 15) & -16;
      }
      a[(e + 4) >> 0] = 0;
      c[e >> 2] = 5376;
      c[(b + 60) >> 2] = e;
      c[6435] = (c[6435] | 0) + 1;
      e = yc(27) | 0;
      if (!e) e = 0;
      else {
        c[(((e + 4 + 15) & -16) + -4) >> 2] = e;
        e = (e + 4 + 15) & -16;
      }
      a[(e + 4) >> 0] = 0;
      c[e >> 2] = 5396;
      c[(b + 76) >> 2] = e;
      c[6435] = (c[6435] | 0) + 1;
      e = yc(27) | 0;
      if (!e) e = 0;
      else {
        c[(((e + 4 + 15) & -16) + -4) >> 2] = e;
        e = (e + 4 + 15) & -16;
      }
      c[e >> 2] = 5396;
      c[(b + 80) >> 2] = e;
      a[(e + 4) >> 0] = 1;
      c[6435] = (c[6435] | 0) + 1;
      e = yc(27) | 0;
      if (!e) e = 0;
      else {
        c[(((e + 4 + 15) & -16) + -4) >> 2] = e;
        e = (e + 4 + 15) & -16;
      }
      a[(e + 4) >> 0] = 0;
      c[e >> 2] = 5416;
      c[(b + 72) >> 2] = e;
      c[6435] = (c[6435] | 0) + 1;
      e = yc(35) | 0;
      if (!e) e = 0;
      else {
        c[(((e + 4 + 15) & -16) + -4) >> 2] = e;
        e = (e + 4 + 15) & -16;
      }
      a[(e + 4) >> 0] = 0;
      c[e >> 2] = 5436;
      c[(e + 8) >> 2] = 1;
      c[(e + 12) >> 2] = 0;
      c[(b + 88) >> 2] = e;
      c[6435] = (c[6435] | 0) + 1;
      e = yc(35) | 0;
      if (!e) e = 0;
      else {
        c[(((e + 4 + 15) & -16) + -4) >> 2] = e;
        e = (e + 4 + 15) & -16;
      }
      c[e >> 2] = 5436;
      c[(e + 8) >> 2] = 1;
      c[(e + 12) >> 2] = 0;
      c[(b + 84) >> 2] = e;
      a[(e + 4) >> 0] = 1;
      l = c[(d + 16) >> 2] | 0;
      l = (l | 0) > 80 ? l : 80;
      e = c[d >> 2] | 0;
      if (!e) {
        a[(b + 12) >> 0] = 1;
        c[6435] = (c[6435] | 0) + 1;
        e = yc(39) | 0;
        if (!e) k = 0;
        else {
          c[(((e + 4 + 15) & -16) + -4) >> 2] = e;
          k = (e + 4 + 15) & -16;
        }
        e = c[(d + 8) >> 2] | 0;
        c[k >> 2] = 772;
        f = (k + 4) | 0;
        c[f >> 2] = e;
        c[6435] = (c[6435] | 0) + 1;
        e = yc((((e * 772) | 3) + 16) | 0) | 0;
        if (!e) e = 0;
        else {
          c[(((e + 4 + 15) & -16) + -4) >> 2] = e;
          e = (e + 4 + 15) & -16;
        }
        c[(k + 16) >> 2] = e;
        c[(k + 12) >> 2] = e;
        f = c[f >> 2] | 0;
        c[(k + 8) >> 2] = f;
        if ((f + -1) | 0) {
          h = c[k >> 2] | 0;
          i = (f + -1) | 0;
          j = e;
          do {
            m = j;
            j = (j + h) | 0;
            c[m >> 2] = j;
            i = (i + -1) | 0;
          } while ((i | 0) != 0);
          e = (e + (_(h, (f + -1) | 0) | 0)) | 0;
        }
        c[e >> 2] = 0;
        c[(b + 8) >> 2] = k;
      } else {
        a[(b + 12) >> 0] = 0;
        c[(b + 8) >> 2] = e;
      }
      e = c[(d + 4) >> 2] | 0;
      if (e | 0) {
        a[(b + 20) >> 0] = 0;
        c[(b + 16) >> 2] = e;
        return;
      }
      a[(b + 20) >> 0] = 1;
      c[6435] = (c[6435] | 0) + 1;
      e = yc(39) | 0;
      if (!e) k = 0;
      else {
        c[(((e + 4 + 15) & -16) + -4) >> 2] = e;
        k = (e + 4 + 15) & -16;
      }
      e = c[(d + 12) >> 2] | 0;
      c[k >> 2] = l;
      f = (k + 4) | 0;
      c[f >> 2] = e;
      e = _(e, l) | 0;
      c[6435] = (c[6435] | 0) + 1;
      e = yc((e + 19) | 0) | 0;
      if (!e) e = 0;
      else {
        c[(((e + 4 + 15) & -16) + -4) >> 2] = e;
        e = (e + 4 + 15) & -16;
      }
      c[(k + 16) >> 2] = e;
      c[(k + 12) >> 2] = e;
      f = c[f >> 2] | 0;
      c[(k + 8) >> 2] = f;
      if ((f + -1) | 0) {
        h = c[k >> 2] | 0;
        i = (f + -1) | 0;
        j = e;
        do {
          m = j;
          j = (j + h) | 0;
          c[m >> 2] = j;
          i = (i + -1) | 0;
        } while ((i | 0) != 0);
        e = (e + (_(h, (f + -1) | 0) | 0)) | 0;
      }
      c[e >> 2] = 0;
      c[(b + 16) >> 2] = k;
      return;
    }
    function _d(b, d, e, f, h) {
      b = b | 0;
      d = d | 0;
      e = e | 0;
      f = f | 0;
      h = +h;
      var j = 0,
        k = 0,
        l = 0,
        m = 0,
        n = 0,
        o = 0.0,
        p = 0.0,
        q = 0.0,
        r = 0.0,
        s = 0.0,
        t = 0.0,
        u = 0.0,
        v = 0.0,
        w = 0.0,
        x = 0.0,
        y = 0.0,
        z = 0.0,
        A = 0.0,
        B = 0.0,
        C = 0.0,
        D = 0,
        E = 0;
      D = i;
      i = (i + 80) | 0;
      B = +g[(e + 4) >> 2];
      C = +g[(e + 20) >> 2];
      o = +g[(e + 36) >> 2];
      p = +g[(e + 8) >> 2];
      q = +g[(e + 24) >> 2];
      r = +g[(e + 40) >> 2];
      s = +g[(e + 12) >> 2];
      t = +g[(e + 28) >> 2];
      u = +g[(e + 44) >> 2];
      v = -+g[(e + 52) >> 2];
      w = -+g[(e + 56) >> 2];
      x = -+g[(e + 60) >> 2];
      l = c[(b + 720) >> 2] | 0;
      y = +g[(l + ((d * 104) | 0) + 8) >> 2];
      z = +g[(l + ((d * 104) | 0) + 12) >> 2];
      A = +g[(l + ((d * 104) | 0) + 16) >> 2];
      a: do
        if (f) {
          f = c[(b + 268) >> 2] | 0;
          b: do
            if ((f | 0) > 0) {
              k = c[(b + 276) >> 2] | 0;
              j = 0;
              while (1) {
                if ((c[(k + (j << 2)) >> 2] | 0) == (e | 0)) break;
                j = (j + 1) | 0;
                if ((j | 0) >= (f | 0)) break b;
              }
              if ((j | 0) != (f | 0)) {
                f = l;
                break a;
              }
            }
          while (0);
          if (
            (f | 0) == (c[(b + 272) >> 2] | 0)
              ? ((m = f | 0 ? f << 1 : 1), (f | 0) < (m | 0))
              : 0
          ) {
            if (!m) k = 0;
            else {
              c[6435] = (c[6435] | 0) + 1;
              f = yc((((m << 2) | 3) + 16) | 0) | 0;
              if (!f) f = 0;
              else {
                c[(((f + 4 + 15) & -16) + -4) >> 2] = f;
                f = (f + 4 + 15) & -16;
              }
              k = f;
              f = c[(b + 268) >> 2] | 0;
            }
            if ((f | 0) > 0) {
              j = 0;
              do {
                c[(k + (j << 2)) >> 2] =
                  c[((c[(b + 276) >> 2] | 0) + (j << 2)) >> 2];
                j = (j + 1) | 0;
              } while ((j | 0) != (f | 0));
            }
            j = c[(b + 276) >> 2] | 0;
            if (j) {
              if (a[(b + 280) >> 0] | 0) {
                c[6436] = (c[6436] | 0) + 1;
                hd(c[(j + -4) >> 2] | 0);
                f = c[(b + 268) >> 2] | 0;
              }
              c[(b + 276) >> 2] = 0;
            }
            a[(b + 280) >> 0] = 1;
            c[(b + 276) >> 2] = k;
            c[(b + 272) >> 2] = m;
          }
          c[((c[(b + 276) >> 2] | 0) + (f << 2)) >> 2] = e;
          c[(b + 268) >> 2] = f + 1;
          f = c[(b + 720) >> 2] | 0;
        } else f = l;
      while (0);
      l = (f + ((d * 104) | 0)) | 0;
      f = (f + ((d * 104) | 0) + 100) | 0;
      a[f >> 0] = a[f >> 0] | 1;
      f = c[(b + 792) >> 2] | 0;
      if (
        (f | 0) == (c[(b + 796) >> 2] | 0)
          ? ((n = f | 0 ? f << 1 : 1), (f | 0) < (n | 0))
          : 0
      ) {
        if (!n) k = 0;
        else {
          c[6435] = (c[6435] | 0) + 1;
          f = yc((n * 96) | 19) | 0;
          if (!f) f = 0;
          else {
            c[(((f + 4 + 15) & -16) + -4) >> 2] = f;
            f = (f + 4 + 15) & -16;
          }
          k = f;
          f = c[(b + 792) >> 2] | 0;
        }
        if ((f | 0) > 0) {
          j = 0;
          do {
            d = (k + ((j * 96) | 0)) | 0;
            m = c[(b + 800) >> 2] | 0;
            E = (m + ((j * 96) | 0)) | 0;
            c[d >> 2] = c[E >> 2];
            c[(d + 4) >> 2] = c[(E + 4) >> 2];
            c[(d + 8) >> 2] = c[(E + 8) >> 2];
            c[(d + 12) >> 2] = c[(E + 12) >> 2];
            c[(d + 16) >> 2] = c[(E + 16) >> 2];
            c[(d + 20) >> 2] = c[(E + 20) >> 2];
            c[(d + 24) >> 2] = c[(E + 24) >> 2];
            d = (k + ((j * 96) | 0) + 28) | 0;
            E = (m + ((j * 96) | 0) + 28) | 0;
            c[d >> 2] = c[E >> 2];
            c[(d + 4) >> 2] = c[(E + 4) >> 2];
            c[(d + 8) >> 2] = c[(E + 8) >> 2];
            c[(d + 12) >> 2] = c[(E + 12) >> 2];
            d = (k + ((j * 96) | 0) + 44) | 0;
            E = (m + ((j * 96) | 0) + 44) | 0;
            c[d >> 2] = c[E >> 2];
            c[(d + 4) >> 2] = c[(E + 4) >> 2];
            c[(d + 8) >> 2] = c[(E + 8) >> 2];
            c[(d + 12) >> 2] = c[(E + 12) >> 2];
            d = (k + ((j * 96) | 0) + 60) | 0;
            E = (m + ((j * 96) | 0) + 60) | 0;
            c[d >> 2] = c[E >> 2];
            c[(d + 4) >> 2] = c[(E + 4) >> 2];
            c[(d + 8) >> 2] = c[(E + 8) >> 2];
            c[(d + 12) >> 2] = c[(E + 12) >> 2];
            d = (k + ((j * 96) | 0) + 76) | 0;
            m = (m + ((j * 96) | 0) + 76) | 0;
            c[d >> 2] = c[m >> 2];
            c[(d + 4) >> 2] = c[(m + 4) >> 2];
            c[(d + 8) >> 2] = c[(m + 8) >> 2];
            c[(d + 12) >> 2] = c[(m + 12) >> 2];
            c[(d + 16) >> 2] = c[(m + 16) >> 2];
            j = (j + 1) | 0;
          } while ((j | 0) != (f | 0));
        }
        f = c[(b + 800) >> 2] | 0;
        if (f | 0) {
          if (a[(b + 804) >> 0] | 0) {
            c[6436] = (c[6436] | 0) + 1;
            hd(c[(f + -4) >> 2] | 0);
          }
          c[(b + 800) >> 2] = 0;
        }
        a[(b + 804) >> 0] = 1;
        c[(b + 800) >> 2] = k;
        c[(b + 796) >> 2] = n;
        f = c[(b + 792) >> 2] | 0;
      }
      E = c[(b + 800) >> 2] | 0;
      c[(E + ((f * 96) | 0)) >> 2] = l;
      g[(E + ((f * 96) | 0) + 4) >> 2] =
        B * v + C * w + o * x + (B * y + C * z + o * A);
      g[(E + ((f * 96) | 0) + 8) >> 2] =
        p * v + q * w + r * x + (p * y + q * z + r * A);
      g[(E + ((f * 96) | 0) + 12) >> 2] =
        s * v + t * w + u * x + (s * y + t * z + u * A);
      g[(E + ((f * 96) | 0) + 16) >> 2] = 0.0;
      c[(E + ((f * 96) | 0) + 20) >> 2] = e;
      g[(E + ((f * 96) | 0) + 24) >> 2] = h;
      e = (E + ((f * 96) | 0) + 28) | 0;
      c[e >> 2] = c[(D + 56) >> 2];
      c[(e + 4) >> 2] = c[(D + 56 + 4) >> 2];
      c[(e + 8) >> 2] = c[(D + 56 + 8) >> 2];
      c[(e + 12) >> 2] = c[(D + 56 + 12) >> 2];
      e = (E + ((f * 96) | 0) + 44) | 0;
      c[e >> 2] = c[(D + 40) >> 2];
      c[(e + 4) >> 2] = c[(D + 40 + 4) >> 2];
      c[(e + 8) >> 2] = c[(D + 40 + 8) >> 2];
      c[(e + 12) >> 2] = c[(D + 40 + 12) >> 2];
      e = (E + ((f * 96) | 0) + 60) | 0;
      c[e >> 2] = c[(D + 24) >> 2];
      c[(e + 4) >> 2] = c[(D + 24 + 4) >> 2];
      c[(e + 8) >> 2] = c[(D + 24 + 8) >> 2];
      c[(e + 12) >> 2] = c[(D + 24 + 12) >> 2];
      E = (E + ((f * 96) | 0) + 76) | 0;
      c[E >> 2] = c[D >> 2];
      c[(E + 4) >> 2] = c[(D + 4) >> 2];
      c[(E + 8) >> 2] = c[(D + 8) >> 2];
      c[(E + 12) >> 2] = c[(D + 12) >> 2];
      c[(E + 16) >> 2] = c[(D + 16) >> 2];
      c[(b + 792) >> 2] = (c[(b + 792) >> 2] | 0) + 1;
      i = D;
      return;
    }
    function $d(a, b, d, e, f) {
      a = a | 0;
      b = b | 0;
      d = d | 0;
      e = e | 0;
      f = f | 0;
      var h = 0.0,
        j = 0.0,
        k = 0.0,
        l = 0.0,
        m = 0.0,
        n = 0.0,
        o = 0.0,
        p = 0.0,
        q = 0.0,
        r = 0.0,
        s = 0.0,
        t = 0.0,
        u = 0.0,
        v = 0.0,
        w = 0.0,
        x = 0.0,
        y = 0.0,
        z = 0,
        A = 0.0,
        B = 0.0,
        C = 0.0,
        D = 0.0,
        E = 0,
        F = 0;
      E = i;
      i = (i + 64) | 0;
      A = +g[(b + 48) >> 2] - +g[(b + 112) >> 2];
      h = +g[(b + 52) >> 2] - +g[(b + 116) >> 2];
      D = +g[(b + 56) >> 2] - +g[(b + 120) >> 2];
      B = A * +g[(b + 64) >> 2] + h * +g[(b + 80) >> 2] + D * +g[(b + 96) >> 2];
      C =
        A * +g[(b + 68) >> 2] + h * +g[(b + 84) >> 2] + D * +g[(b + 100) >> 2];
      D =
        A * +g[(b + 72) >> 2] + h * +g[(b + 88) >> 2] + D * +g[(b + 104) >> 2];
      e = c[(a + 8) >> 2] | 0;
      z = c[(a + 4) >> 2] | 0;
      h = +g[(z + 28) >> 2] * +g[(z + 12) >> 2];
      A = h + +g[(a + 12) >> 2];
      p = +g[(e + 72) >> 2];
      q = +g[(e + 56) >> 2];
      r = +g[(e + 76) >> 2];
      s = +g[(e + 60) >> 2];
      t = +g[(e + 80) >> 2];
      u = +g[(e + 64) >> 2];
      v = +g[(e + 88) >> 2];
      w = +g[(e + 92) >> 2];
      x = +g[(e + 96) >> 2];
      k = (r - s) * (x - u) - (t - u) * (w - s);
      m = (t - u) * (v - q) - (p - q) * (x - u);
      o = (p - q) * (w - s) - (r - s) * (v - q);
      n = 1.0 / +O(+(o * o + (k * k + m * m)));
      j = (B - q) * n * k + (C - s) * n * m + n * o * (D - u);
      if (j < 0.0) {
        y = -j;
        l = -(n * k);
        j = -(n * m);
        k = -(n * o);
      } else {
        y = j;
        l = n * k;
        j = n * m;
        k = n * o;
      }
      if (!(y < A)) {
        i = E;
        return;
      }
      o =
        (D - u) * ((p - q) * j - (r - s) * l) +
        ((B - q) * ((r - s) * k - (t - u) * j) +
          (C - s) * ((t - u) * l - (p - q) * k));
      t =
        (D - t) * ((v - p) * j - (w - r) * l) +
        ((B - p) * ((w - r) * k - (x - t) * j) +
          (C - r) * ((x - t) * l - (v - p) * k));
      x =
        (D - x) * ((q - v) * j - (s - w) * l) +
        ((B - v) * ((s - w) * k - (u - x) * j) +
          (C - w) * ((u - x) * l - (q - v) * k));
      if (
        !((x > 0.0) & ((o > 0.0) & (t > 0.0)))
          ? !((x <= 0.0) & ((o <= 0.0) & (t <= 0.0)))
          : 0
      ) {
        if ((Eb[c[((c[e >> 2] | 0) + 100) >> 2] & 127](e) | 0) <= 0) {
          i = E;
          return;
        }
        s = 0.0;
        r = 0.0;
        q = 0.0;
        e = 0;
        z = 0;
        do {
          F = c[(a + 8) >> 2] | 0;
          mc[c[((c[F >> 2] | 0) + 104) >> 2] & 127](
            F,
            z,
            (E + 48) | 0,
            (E + 32) | 0
          );
          m = +g[(E + 48) >> 2];
          w = +g[(E + 48 + 4) >> 2];
          u = +g[(E + 48 + 8) >> 2];
          n = +g[(E + 32) >> 2] - m;
          x = +g[(E + 32 + 4) >> 2] - w;
          v = +g[(E + 32 + 8) >> 2] - u;
          do
            if ((B - m) * n + (C - w) * x + (D - u) * v > 0.0)
              if (
                (B - m) * n + (C - w) * x + (D - u) * v <
                n * n + x * x + v * v
              ) {
                y =
                  ((B - m) * n + (C - w) * x + (D - u) * v) /
                  (n * n + x * x + v * v);
                o = B - m - n * y;
                p = C - w - x * y;
                t = D - u - v * y;
                break;
              } else {
                o = B - m - n;
                p = C - w - x;
                t = D - u - v;
                y = 1.0;
                break;
              }
            else {
              o = B - m;
              p = C - w;
              t = D - u;
              y = 0.0;
            }
          while (0);
          if (o * o + p * p + t * t < A * A) {
            s = m + n * y;
            r = u + v * y;
            q = w + x * y;
            e = 1;
          }
          z = (z + 1) | 0;
          F = c[(a + 8) >> 2] | 0;
        } while ((z | 0) < (Eb[c[((c[F >> 2] | 0) + 100) >> 2] & 127](F) | 0));
        if (!(e & 1)) {
          i = E;
          return;
        } else p = A * A;
      } else {
        p = A * A;
        s = B - y * l;
        r = D - y * k;
        q = C - y * j;
      }
      n = B - s;
      o = C - q;
      m = D - r;
      if (!(n * n + o * o + m * m < p)) {
        i = E;
        return;
      }
      if (n * n + o * o + m * m > 1.1920928955078125e-7) {
        j = +O(+(n * n + o * o + m * m));
        h = h - j;
        l = n * (1.0 / j);
        k = m * (1.0 / j);
        j = o * (1.0 / j);
      }
      h = -h;
      if (f) {
        x = +g[(b + 64) >> 2];
        y = +g[(b + 68) >> 2];
        A = +g[(b + 72) >> 2];
        B = x * l + y * j + A * k;
        o = +g[(b + 80) >> 2];
        p = +g[(b + 84) >> 2];
        t = +g[(b + 88) >> 2];
        C = l * o + j * p + k * t;
        u = +g[(b + 96) >> 2];
        v = +g[(b + 100) >> 2];
        w = +g[(b + 104) >> 2];
        D = l * u + j * v + k * w;
        g[(E + 48) >> 2] = -B;
        g[(E + 48 + 4) >> 2] = -C;
        g[(E + 48 + 8) >> 2] = -D;
        g[(E + 48 + 12) >> 2] = 0.0;
        C = s * o + q * p + r * t + +g[(b + 116) >> 2] + C * h;
        D = s * u + q * v + r * w + +g[(b + 120) >> 2] + D * h;
        g[(E + 32) >> 2] = s * x + q * y + r * A + +g[(b + 112) >> 2] + B * h;
        g[(E + 32 + 4) >> 2] = C;
        g[(E + 32 + 8) >> 2] = D;
        g[(E + 32 + 12) >> 2] = 0.0;
        hc[c[((c[d >> 2] | 0) + 16) >> 2] & 15](
          d,
          (E + 48) | 0,
          (E + 32) | 0,
          h
        );
        i = E;
        return;
      } else {
        F = c[((c[d >> 2] | 0) + 16) >> 2] | 0;
        y = +g[(b + 64) >> 2];
        A = +g[(b + 68) >> 2];
        B = +g[(b + 72) >> 2];
        u = +g[(b + 80) >> 2];
        v = +g[(b + 84) >> 2];
        C = +g[(b + 88) >> 2];
        w = +g[(b + 96) >> 2];
        x = +g[(b + 100) >> 2];
        D = +g[(b + 104) >> 2];
        g[(E + 16) >> 2] = y * l + A * j + B * k;
        g[(E + 16 + 4) >> 2] = l * u + j * v + k * C;
        g[(E + 16 + 8) >> 2] = l * w + j * x + k * D;
        g[(E + 16 + 12) >> 2] = 0.0;
        C = s * u + q * v + r * C + +g[(b + 116) >> 2];
        D = s * w + q * x + r * D + +g[(b + 120) >> 2];
        g[E >> 2] = s * y + q * A + r * B + +g[(b + 112) >> 2];
        g[(E + 4) >> 2] = C;
        g[(E + 8) >> 2] = D;
        g[(E + 12) >> 2] = 0.0;
        hc[F & 15](d, (E + 16) | 0, E, h);
        i = E;
        return;
      }
    }
    function ae(b) {
      b = b | 0;
      var d = 0.0,
        e = 0,
        f = 0,
        h = 0,
        j = 0,
        k = 0,
        l = 0.0,
        m = 0.0,
        n = 0.0,
        o = 0.0,
        p = 0.0,
        q = 0,
        r = 0;
      r = i;
      i = (i + 80) | 0;
      if (
        (Eb[c[((c[b >> 2] | 0) + 20) >> 2] & 127](b) | 0
        ? ((q = Eb[c[((c[b >> 2] | 0) + 20) >> 2] & 127](b) | 0),
          ((Eb[c[((c[q >> 2] | 0) + 48) >> 2] & 127](q) | 0) & 8) | 0)
        : 0)
          ? ((e = c[(b + 24) >> 2] | 0),
            (e = Eb[c[((c[e >> 2] | 0) + 36) >> 2] & 127](e) | 0),
            (c[(r + 64) >> 2] = 1065353216),
            (c[(r + 64 + 4) >> 2] = 1065353216),
            (c[(r + 64 + 8) >> 2] = 0),
            (g[(r + 64 + 12) >> 2] = 0.0),
            (e | 0) > 0)
          : 0
      ) {
        j = 0;
        do {
          f = c[(b + 24) >> 2] | 0;
          f = Zb[c[((c[f >> 2] | 0) + 40) >> 2] & 31](f, j) | 0;
          h = c[(f + 748) >> 2] | 0;
          if ((h | 0) > 0) {
            k = 0;
            do {
              q = Eb[c[((c[b >> 2] | 0) + 20) >> 2] & 127](b) | 0;
              Bb[c[((c[q >> 2] | 0) + 32) >> 2] & 0](
                q,
                (f + 4 + ((k * 184) | 0) + 32) | 0,
                (f + 4 + ((k * 184) | 0) + 64) | 0,
                +g[(f + 4 + ((k * 184) | 0) + 80) >> 2],
                c[(f + 4 + ((k * 184) | 0) + 148) >> 2] | 0,
                (r + 64) | 0
              );
              k = (k + 1) | 0;
            } while ((k | 0) != (h | 0));
          }
          j = (j + 1) | 0;
        } while ((j | 0) != (e | 0));
      }
      if (!(Eb[c[((c[b >> 2] | 0) + 20) >> 2] & 127](b) | 0)) {
        i = r;
        return;
      }
      q = Eb[c[((c[b >> 2] | 0) + 20) >> 2] & 127](b) | 0;
      if (!((Eb[c[((c[q >> 2] | 0) + 48) >> 2] & 127](q) | 0) & 3)) {
        i = r;
        return;
      }
      if ((c[(b + 8) >> 2] | 0) <= 0) {
        i = r;
        return;
      }
      h = (r + 64 + 4) | 0;
      j = (r + 64 + 8) | 0;
      k = (r + 64 + 12) | 0;
      q = 0;
      do {
        f = c[((c[(b + 16) >> 2] | 0) + (q << 2)) >> 2] | 0;
        if (!(c[(f + 204) >> 2] & 32)) {
          if (
            Eb[c[((c[b >> 2] | 0) + 20) >> 2] & 127](b) | 0
              ? ((e = Eb[c[((c[b >> 2] | 0) + 20) >> 2] & 127](b) | 0),
                ((Eb[c[((c[e >> 2] | 0) + 48) >> 2] & 127](e) | 0) & 1) | 0)
              : 0
          ) {
            c[(r + 64) >> 2] = 1065353216;
            c[h >> 2] = 1065353216;
            c[j >> 2] = 1065353216;
            g[k >> 2] = 0.0;
            switch (c[(f + 216) >> 2] | 0) {
              case 1: {
                c[(r + 64) >> 2] = 1065353216;
                c[h >> 2] = 1065353216;
                c[j >> 2] = 1065353216;
                g[k >> 2] = 0.0;
                break;
              }
              case 2: {
                c[(r + 64) >> 2] = 0;
                c[h >> 2] = 1065353216;
                c[j >> 2] = 0;
                g[k >> 2] = 0.0;
                break;
              }
              case 3: {
                c[(r + 64) >> 2] = 0;
                c[h >> 2] = 1065353216;
                c[j >> 2] = 1065353216;
                g[k >> 2] = 0.0;
                break;
              }
              case 4: {
                c[(r + 64) >> 2] = 1065353216;
                c[h >> 2] = 0;
                c[j >> 2] = 0;
                g[k >> 2] = 0.0;
                break;
              }
              case 5: {
                c[(r + 64) >> 2] = 1065353216;
                c[h >> 2] = 1065353216;
                c[j >> 2] = 0;
                g[k >> 2] = 0.0;
                break;
              }
              default: {
                c[(r + 64) >> 2] = 1065353216;
                c[h >> 2] = 0;
                c[j >> 2] = 0;
                g[k >> 2] = 0.0;
              }
            }
            mc[c[((c[b >> 2] | 0) + 28) >> 2] & 127](
              b,
              (f + 4) | 0,
              c[(f + 192) >> 2] | 0,
              (r + 64) | 0
            );
          }
          e = c[(b + 72) >> 2] | 0;
          if (
            e | 0
              ? ((Eb[c[((c[e >> 2] | 0) + 48) >> 2] & 127](e) | 0) & 2) | 0
              : 0
          ) {
            c[(r + 32) >> 2] = 1065353216;
            c[(r + 32 + 4) >> 2] = 0;
            c[(r + 32 + 8) >> 2] = 0;
            g[(r + 32 + 12) >> 2] = 0.0;
            e = c[(f + 192) >> 2] | 0;
            mc[c[((c[e >> 2] | 0) + 8) >> 2] & 127](
              e,
              (f + 4) | 0,
              (r + 64) | 0,
              (r + 48) | 0
            );
            g[(r + 64) >> 2] = +g[(r + 64) >> 2] + -0.019999999552965164;
            g[(r + 64 + 4) >> 2] =
              +g[(r + 64 + 4) >> 2] + -0.019999999552965164;
            g[(r + 64 + 8) >> 2] =
              +g[(r + 64 + 8) >> 2] + -0.019999999552965164;
            g[(r + 48) >> 2] = +g[(r + 48) >> 2] + 0.019999999552965164;
            g[(r + 48 + 4) >> 2] = +g[(r + 48 + 4) >> 2] + 0.019999999552965164;
            g[(r + 48 + 8) >> 2] = +g[(r + 48 + 8) >> 2] + 0.019999999552965164;
            do
              if (
                (a[(b + 44) >> 0] | 0
                ? (c[(f + 236) >> 2] | 0) == 2
                : 0)
                  ? ((c[(f + 204) >> 2] & 3) | 0) == 0
                  : 0
              ) {
                e = c[(f + 192) >> 2] | 0;
                mc[c[((c[e >> 2] | 0) + 8) >> 2] & 127](
                  e,
                  (f + 68) | 0,
                  (r + 16) | 0,
                  r
                );
                d = +g[(r + 16) >> 2] + -0.019999999552965164;
                g[(r + 16) >> 2] = d;
                l = +g[(r + 16 + 4) >> 2] + -0.019999999552965164;
                g[(r + 16 + 4) >> 2] = l;
                m = +g[(r + 16 + 8) >> 2] + -0.019999999552965164;
                g[(r + 16 + 8) >> 2] = m;
                n = +g[r >> 2] + 0.019999999552965164;
                g[r >> 2] = n;
                o = +g[(r + 4) >> 2] + 0.019999999552965164;
                g[(r + 4) >> 2] = o;
                p = +g[(r + 8) >> 2] + 0.019999999552965164;
                g[(r + 8) >> 2] = p;
                if (d < +g[(r + 64) >> 2]) g[(r + 64) >> 2] = d;
                if (l < +g[(r + 64 + 4) >> 2]) g[(r + 64 + 4) >> 2] = l;
                if (m < +g[(r + 64 + 8) >> 2]) g[(r + 64 + 8) >> 2] = m;
                d = +g[(r + 16 + 12) >> 2];
                if (d < +g[(r + 64 + 12) >> 2]) g[(r + 64 + 12) >> 2] = d;
                if (+g[(r + 48) >> 2] < n) g[(r + 48) >> 2] = n;
                if (+g[(r + 48 + 4) >> 2] < o) g[(r + 48 + 4) >> 2] = o;
                if (+g[(r + 48 + 8) >> 2] < p) g[(r + 48 + 8) >> 2] = p;
                d = +g[(r + 12) >> 2];
                if (!(+g[(r + 48 + 12) >> 2] < d)) break;
                g[(r + 48 + 12) >> 2] = d;
              }
            while (0);
            f = c[(b + 72) >> 2] | 0;
            mc[c[((c[f >> 2] | 0) + 52) >> 2] & 127](
              f,
              (r + 64) | 0,
              (r + 48) | 0,
              (r + 32) | 0
            );
          }
        }
        q = (q + 1) | 0;
      } while ((q | 0) < (c[(b + 8) >> 2] | 0));
      i = r;
      return;
    }
    function be(b, d, e, f, h, i, j, k, l, m, n) {
      b = b | 0;
      d = d | 0;
      e = e | 0;
      f = f | 0;
      h = h | 0;
      i = i | 0;
      j = j | 0;
      k = k | 0;
      l = l | 0;
      m = m | 0;
      n = n | 0;
      var o = 0,
        p = 0,
        q = 0,
        r = 0.0,
        s = 0.0,
        t = 0,
        u = 0.0,
        v = 0.0,
        w = 0.0,
        x = 0.0,
        y = 0,
        z = 0.0,
        A = 0;
      if (((j | 0) < 2) | ((k | 0) < 2)) {
        n = 0;
        return n | 0;
      }
      y = _(k, j) | 0;
      c[6435] = (c[6435] | 0) + 1;
      b = yc(y >>> 0 > 268435455 ? 18 : (((y << 4) | 3) + 16) | 0) | 0;
      if (!b) t = 0;
      else {
        c[(((b + 4 + 15) & -16) + -4) >> 2] = b;
        t = (b + 4 + 15) & -16;
      }
      o = y >>> 0 > 1073741823 ? -1 : y << 2;
      o = (o | 0) == 0 ? 1 : o;
      while (1) {
        q = yc(o) | 0;
        if (q | 0) break;
        b = c[6564] | 0;
        c[6564] = b + 0;
        if (!b) {
          p = 8;
          break;
        }
        jc[b & 3]();
      }
      if ((p | 0) == 8) {
        n = Ya(4) | 0;
        c[n >> 2] = 9640;
        pb(n | 0, 2800, 251);
      }
      if ((k | 0) > 0 ? (j | 0) > 0 : 0) {
        p = 0;
        do {
          z = +(p | 0) / +((k + -1) | 0);
          r = +g[e >> 2];
          r = r + z * (+g[h >> 2] - r);
          s = +g[(e + 4) >> 2];
          s = s + z * (+g[(h + 4) >> 2] - s);
          u = +g[(e + 8) >> 2];
          u = u + z * (+g[(h + 8) >> 2] - u);
          v = +g[f >> 2];
          w = +g[(f + 4) >> 2];
          x = +g[(f + 8) >> 2];
          b = _(p, j) | 0;
          v = v + z * (+g[i >> 2] - v) - r;
          w = w + z * (+g[(i + 4) >> 2] - w) - s;
          x = x + z * (+g[(i + 8) >> 2] - x) - u;
          o = 0;
          do {
            z = +(o | 0) / +((j + -1) | 0);
            A = (o + b) | 0;
            g[(t + (A << 4)) >> 2] = r + v * z;
            g[(t + (A << 4) + 4) >> 2] = s + w * z;
            g[(t + (A << 4) + 8) >> 2] = u + x * z;
            g[(t + (A << 4) + 12) >> 2] = 0.0;
            g[(q + (A << 2)) >> 2] = 1.0;
            o = (o + 1) | 0;
          } while ((o | 0) != (j | 0));
          p = (p + 1) | 0;
        } while ((p | 0) != (k | 0));
      }
      c[6435] = (c[6435] | 0) + 1;
      b = yc(1271) | 0;
      if (!b) b = 0;
      else {
        c[(((b + 4 + 15) & -16) + -4) >> 2] = b;
        b = (b + 4 + 15) & -16;
      }
      Kc(b, d, y, t, q);
      if ((l & 1) | 0) {
        g[((c[(b + 720) >> 2] | 0) + 88) >> 2] = 0.0;
        a[(b + 924) >> 0] = 1;
      }
      if ((l & 2) | 0) {
        g[
          ((c[(b + 720) >> 2] | 0) + ((((j + -1) | 0) * 104) | 0) + 88) >> 2
        ] = 0.0;
        a[(b + 924) >> 0] = 1;
      }
      if ((l & 4) | 0) {
        A = _((k + -1) | 0, j) | 0;
        g[((c[(b + 720) >> 2] | 0) + ((A * 104) | 0) + 88) >> 2] = 0.0;
        a[(b + 924) >> 0] = 1;
      }
      if ((l & 8) | 0) {
        A = (j + -1 + (_((k + -1) | 0, j) | 0)) | 0;
        g[((c[(b + 720) >> 2] | 0) + ((A * 104) | 0) + 88) >> 2] = 0.0;
        a[(b + 924) >> 0] = 1;
      }
      if ((l & 16) | 0) {
        g[
          ((c[(b + 720) >> 2] | 0) +
            ((((((j + -1) | 0) / 2) | 0) * 104) | 0) +
            88) >>
            2
        ] = 0.0;
        a[(b + 924) >> 0] = 1;
      }
      if ((l & 32) | 0) {
        A = _((((k + -1) | 0) / 2) | 0, j) | 0;
        g[((c[(b + 720) >> 2] | 0) + ((A * 104) | 0) + 88) >> 2] = 0.0;
        a[(b + 924) >> 0] = 1;
      }
      if ((l & 64) | 0) {
        A = (j + -1 + (_((((k + -1) | 0) / 2) | 0, j) | 0)) | 0;
        g[((c[(b + 720) >> 2] | 0) + ((A * 104) | 0) + 88) >> 2] = 0.0;
        a[(b + 924) >> 0] = 1;
      }
      if ((l & 128) | 0) {
        A = ((_((k + -1) | 0, j) | 0) + ((((j + -1) | 0) / 2) | 0)) | 0;
        g[((c[(b + 720) >> 2] | 0) + ((A * 104) | 0) + 88) >> 2] = 0.0;
        a[(b + 924) >> 0] = 1;
      }
      if ((l & 256) | 0) {
        A =
          ((_((((k + -1) | 0) / 2) | 0, j) | 0) + ((((j + -1) | 0) / 2) | 0)) |
          0;
        g[((c[(b + 720) >> 2] | 0) + ((A * 104) | 0) + 88) >> 2] = 0.0;
        a[(b + 924) >> 0] = 1;
      }
      if (t | 0) {
        c[6436] = (c[6436] | 0) + 1;
        hd(c[(t + -4) >> 2] | 0);
      }
      hd(q);
      if ((k | 0) <= 0) {
        A = b;
        return A | 0;
      }
      y = (j + -1) | 0;
      d = 0;
      o = 0;
      while (1) {
        p = d;
        d = (d + 1) | 0;
        a: do
          if ((j | 0) > 0) {
            t = _(p, j) | 0;
            i = _(d, j) | 0;
            s = (1.0 / +((k + -1) | 0)) * +((k + -1 - p) | 0);
            r = (1.0 / +((k + -1) | 0)) * +((k + -2 - p) | 0);
            if ((d | 0) < (k | 0)) {
              f = 0;
              h = o;
            } else {
              if ((j | 0) > 1) {
                q = 1;
                p = 0;
              } else break;
              while (1) {
                Rf(b, (p + t) | 0, (q + t) | 0, 0, 0);
                p = (q + 1) | 0;
                if ((p | 0) == (j | 0)) break a;
                else {
                  A = q;
                  q = p;
                  p = A;
                }
              }
            }
            while (1) {
              p = (f + 1) | 0;
              q = (f + t) | 0;
              e = (f + i) | 0;
              if ((f | 0) == ((j + -1) | 0)) break;
              Rf(b, q, (p + t) | 0, 0, 0);
              Rf(b, q, e, 0, 0);
              Zf(b, q, e, (p + i) | 0, 0);
              if (!n) Zf(b, (p + i) | 0, (p + t) | 0, q, 0);
              else {
                z = (1.0 / +((j + -1) | 0)) * +(f | 0);
                g[(n + (h << 2)) >> 2] = z;
                g[(n + ((h + 1) << 2)) >> 2] = s;
                g[(n + ((h + 2) << 2)) >> 2] = z;
                g[(n + ((h + 3) << 2)) >> 2] = r;
                x = (1.0 / +((j + -1) | 0)) * +(p | 0);
                g[(n + ((h + 4) << 2)) >> 2] = x;
                g[(n + ((h + 5) << 2)) >> 2] = r;
                Zf(b, (p + i) | 0, (p + t) | 0, q, 0);
                g[(n + ((h + 6) << 2)) >> 2] = x;
                g[(n + ((h + 7) << 2)) >> 2] = r;
                g[(n + ((h + 8) << 2)) >> 2] = x;
                g[(n + ((h + 9) << 2)) >> 2] = s;
                g[(n + ((h + 10) << 2)) >> 2] = z;
                g[(n + ((h + 11) << 2)) >> 2] = s;
              }
              if (m) Rf(b, q, (p + i) | 0, 0, 0);
              f = p;
              h = (h + 12) | 0;
            }
            Rf(b, y, e, 0, 0);
            o = (((j * 12) | 0) + -12 + o) | 0;
          }
        while (0);
        if ((d | 0) == (k | 0)) break;
        else y = (y + j) | 0;
      }
      return b | 0;
    }
    function ce(b, d, e, f, h, j, k, l) {
      b = b | 0;
      d = d | 0;
      e = e | 0;
      f = f | 0;
      h = +h;
      j = +j;
      k = k | 0;
      l = l | 0;
      var m = 0,
        n = 0,
        o = 0,
        p = 0,
        q = 0,
        r = 0,
        s = 0,
        t = 0,
        u = 0,
        v = 0,
        w = 0;
      w = i;
      i = (i + 288) | 0;
      c[(w + 208) >> 2] = c[d >> 2];
      c[(w + 208 + 4) >> 2] = c[(d + 4) >> 2];
      c[(w + 208 + 8) >> 2] = c[(d + 8) >> 2];
      c[(w + 208 + 12) >> 2] = c[(d + 12) >> 2];
      o = (w + 208 + 16) | 0;
      c[o >> 2] = c[e >> 2];
      c[(o + 4) >> 2] = c[(e + 4) >> 2];
      c[(o + 8) >> 2] = c[(e + 8) >> 2];
      c[(o + 12) >> 2] = c[(e + 12) >> 2];
      e = (w + 208 + 32) | 0;
      c[e >> 2] = c[f >> 2];
      c[(e + 4) >> 2] = c[(f + 4) >> 2];
      c[(e + 8) >> 2] = c[(f + 8) >> 2];
      c[(e + 12) >> 2] = c[(f + 12) >> 2];
      r = c[k >> 2] | 0;
      t = c[(k + 4) >> 2] | 0;
      u = c[(k + 8) >> 2] | 0;
      v = c[(k + 16) >> 2] | 0;
      q = c[(k + 12) >> 2] | 0;
      p = c[(k + 20) >> 2] | 0;
      c[w >> 2] = c[(w + 208) >> 2];
      c[(w + 4) >> 2] = c[(w + 208 + 4) >> 2];
      c[(w + 8) >> 2] = c[(w + 208 + 8) >> 2];
      c[(w + 12) >> 2] = c[(w + 208 + 12) >> 2];
      c[(w + 16) >> 2] = c[o >> 2];
      c[(w + 16 + 4) >> 2] = c[(o + 4) >> 2];
      c[(w + 16 + 8) >> 2] = c[(o + 8) >> 2];
      c[(w + 16 + 12) >> 2] = c[(o + 12) >> 2];
      c[(w + 32) >> 2] = c[e >> 2];
      c[(w + 32 + 4) >> 2] = c[(e + 4) >> 2];
      c[(w + 32 + 8) >> 2] = c[(e + 8) >> 2];
      c[(w + 32 + 12) >> 2] = c[(e + 12) >> 2];
      e = c[(b + 136) >> 2] | 0;
      if (
        (e | 0) == (c[(b + 140) >> 2] | 0)
          ? ((s = e | 0 ? e << 1 : 1), (e | 0) < (s | 0))
          : 0
      ) {
        if (!s) d = 0;
        else {
          c[6435] = (c[6435] | 0) + 1;
          d = yc((((s * 284) | 3) + 16) | 0) | 0;
          if (!d) d = 0;
          else {
            c[(((d + 4 + 15) & -16) + -4) >> 2] = d;
            d = (d + 4 + 15) & -16;
          }
          e = c[(b + 136) >> 2] | 0;
        }
        if ((e | 0) > 0) {
          k = 0;
          do {
            f = c[(b + 144) >> 2] | 0;
            m = (d + ((k * 284) | 0)) | 0;
            n = (f + ((k * 284) | 0)) | 0;
            o = (m + 92) | 0;
            do {
              c[m >> 2] = c[n >> 2];
              m = (m + 4) | 0;
              n = (n + 4) | 0;
            } while ((m | 0) < (o | 0));
            m = (d + ((k * 284) | 0) + 92) | 0;
            n = (f + ((k * 284) | 0) + 92) | 0;
            c[m >> 2] = c[n >> 2];
            c[(m + 4) >> 2] = c[(n + 4) >> 2];
            c[(m + 8) >> 2] = c[(n + 8) >> 2];
            c[(m + 12) >> 2] = c[(n + 12) >> 2];
            m = (d + ((k * 284) | 0) + 108) | 0;
            n = (f + ((k * 284) | 0) + 108) | 0;
            c[m >> 2] = c[n >> 2];
            c[(m + 4) >> 2] = c[(n + 4) >> 2];
            c[(m + 8) >> 2] = c[(n + 8) >> 2];
            c[(m + 12) >> 2] = c[(n + 12) >> 2];
            m = (d + ((k * 284) | 0) + 124) | 0;
            n = (f + ((k * 284) | 0) + 124) | 0;
            c[m >> 2] = c[n >> 2];
            c[(m + 4) >> 2] = c[(n + 4) >> 2];
            c[(m + 8) >> 2] = c[(n + 8) >> 2];
            c[(m + 12) >> 2] = c[(n + 12) >> 2];
            m = (d + ((k * 284) | 0) + 140) | 0;
            n = (f + ((k * 284) | 0) + 140) | 0;
            c[m >> 2] = c[n >> 2];
            c[(m + 4) >> 2] = c[(n + 4) >> 2];
            c[(m + 8) >> 2] = c[(n + 8) >> 2];
            c[(m + 12) >> 2] = c[(n + 12) >> 2];
            m = (d + ((k * 284) | 0) + 156) | 0;
            n = (f + ((k * 284) | 0) + 156) | 0;
            o = (m + 128) | 0;
            do {
              c[m >> 2] = c[n >> 2];
              m = (m + 4) | 0;
              n = (n + 4) | 0;
            } while ((m | 0) < (o | 0));
            k = (k + 1) | 0;
          } while ((k | 0) != (e | 0));
        }
        e = c[(b + 144) >> 2] | 0;
        if (e | 0) {
          if (a[(b + 148) >> 0] | 0) {
            c[6436] = (c[6436] | 0) + 1;
            hd(c[(e + -4) >> 2] | 0);
          }
          c[(b + 144) >> 2] = 0;
        }
        a[(b + 148) >> 0] = 1;
        c[(b + 144) >> 2] = d;
        c[(b + 140) >> 2] = s;
        e = c[(b + 136) >> 2] | 0;
      }
      d = c[(b + 144) >> 2] | 0;
      m = (d + ((e * 284) | 0)) | 0;
      n = (w + 48) | 0;
      o = (m + 92) | 0;
      do {
        c[m >> 2] = c[n >> 2];
        m = (m + 4) | 0;
        n = (n + 4) | 0;
      } while ((m | 0) < (o | 0));
      m = (d + ((e * 284) | 0) + 92) | 0;
      c[m >> 2] = c[(w + 192) >> 2];
      c[(m + 4) >> 2] = c[(w + 192 + 4) >> 2];
      c[(m + 8) >> 2] = c[(w + 192 + 8) >> 2];
      c[(m + 12) >> 2] = c[(w + 192 + 12) >> 2];
      m = (d + ((e * 284) | 0) + 108) | 0;
      c[m >> 2] = c[(w + 176) >> 2];
      c[(m + 4) >> 2] = c[(w + 176 + 4) >> 2];
      c[(m + 8) >> 2] = c[(w + 176 + 8) >> 2];
      c[(m + 12) >> 2] = c[(w + 176 + 12) >> 2];
      m = (d + ((e * 284) | 0) + 124) | 0;
      c[m >> 2] = c[(w + 160) >> 2];
      c[(m + 4) >> 2] = c[(w + 160 + 4) >> 2];
      c[(m + 8) >> 2] = c[(w + 160 + 8) >> 2];
      c[(m + 12) >> 2] = c[(w + 160 + 12) >> 2];
      m = (d + ((e * 284) | 0) + 140) | 0;
      c[m >> 2] = c[(w + 144) >> 2];
      c[(m + 4) >> 2] = c[(w + 144 + 4) >> 2];
      c[(m + 8) >> 2] = c[(w + 144 + 8) >> 2];
      c[(m + 12) >> 2] = c[(w + 144 + 12) >> 2];
      d = (d + ((e * 284) | 0) + 156) | 0;
      m = d;
      n = w;
      o = (m + 48) | 0;
      do {
        c[m >> 2] = c[n >> 2];
        m = (m + 4) | 0;
        n = (n + 4) | 0;
      } while ((m | 0) < (o | 0));
      g[(d + 48) >> 2] = h;
      c[(d + 52) >> 2] = q;
      g[(d + 56) >> 2] = j;
      c[(d + 60) >> 2] = r;
      c[(d + 64) >> 2] = t;
      c[(d + 68) >> 2] = u;
      c[(d + 72) >> 2] = v;
      g[(d + 76) >> 2] = 0.0;
      g[(d + 80) >> 2] = 0.0;
      g[(d + 84) >> 2] = 0.0;
      g[(d + 88) >> 2] = 0.10000000149011612;
      c[(d + 92) >> 2] = p;
      g[(d + 96) >> 2] = 0.0;
      g[(d + 100) >> 2] = 0.0;
      a[(d + 104) >> 0] = l & 1;
      m = (d + 105) | 0;
      n = (w + 256) | 0;
      o = (m + 23) | 0;
      do {
        a[m >> 0] = a[n >> 0] | 0;
        m = (m + 1) | 0;
        n = (n + 1) | 0;
      } while ((m | 0) < (o | 0));
      l = c[(b + 136) >> 2] | 0;
      c[(b + 136) >> 2] = l + 1;
      l = ((c[(b + 144) >> 2] | 0) + ((l * 284) | 0)) | 0;
      Tg(c[(b + 116) >> 2] | 0, l, 0);
      Ae(
        c[(b + 116) >> 2] | 0,
        c[(b + 144) >> 2] | 0,
        ((c[(b + 136) >> 2] | 0) + -1) | 0,
        0
      );
      i = w;
      return l | 0;
    }
    function de(a, d, f, h, j) {
      a = a | 0;
      d = d | 0;
      f = f | 0;
      h = h | 0;
      j = j | 0;
      var k = 0,
        l = 0,
        m = 0,
        n = 0,
        o = 0,
        p = 0,
        q = 0,
        r = 0,
        s = 0,
        t = 0,
        u = 0,
        v = 0,
        w = 0,
        x = 0,
        y = 0,
        z = 0,
        A = 0,
        B = 0,
        C = 0,
        D = 0,
        E = 0,
        F = 0,
        G = 0,
        H = 0,
        I = 0;
      I = i;
      i = (i + 16) | 0;
      c[(d + 16) >> 2] = c[f >> 2];
      c[(d + 16 + 4) >> 2] = c[(f + 4) >> 2];
      c[(d + 16 + 8) >> 2] = c[(f + 8) >> 2];
      c[(d + 16 + 12) >> 2] = c[(f + 12) >> 2];
      c[(d + 32) >> 2] = c[h >> 2];
      c[(d + 32 + 4) >> 2] = c[(h + 4) >> 2];
      c[(d + 32 + 8) >> 2] = c[(h + 8) >> 2];
      c[(d + 32 + 12) >> 2] = c[(h + 12) >> 2];
      D = c[(a + 60) >> 2] | 0;
      E = c[(d + 12) >> 2] & 65535;
      Bj(a, (I + 6) | 0, +g[f >> 2], +g[(f + 4) >> 2], +g[(f + 8) >> 2], 0);
      Bj(a, I, +g[h >> 2], +g[(h + 4) >> 2], +g[(h + 8) >> 2], 1);
      H = 0;
      do {
        t = b[(D + (E << 6) + 48 + (H << 1)) >> 1] | 0;
        w = b[(D + (E << 6) + 54 + (H << 1)) >> 1] | 0;
        q = b[(I + 6 + (H << 1)) >> 1] | 0;
        l = (a + 68 + (H << 2)) | 0;
        s = c[l >> 2] | 0;
        m = ((q & 65535) - (e[(s + ((t & 65535) << 2)) >> 1] | 0)) | 0;
        r = b[(I + (H << 1)) >> 1] | 0;
        y = ((r & 65535) - (e[(s + ((w & 65535) << 2)) >> 1] | 0)) | 0;
        b[(s + ((t & 65535) << 2)) >> 1] = q;
        b[(s + ((w & 65535) << 2)) >> 1] = r;
        if ((m | 0) < 0) wh(a, H, t);
        a: do
          if (
            (y | 0) > 0
              ? ((z = c[l >> 2] | 0),
                (A = c[(a + 60) >> 2] | 0),
                (B = e[(z + ((w & 65535) << 2) + 2) >> 1] | 0),
                (C = b[(z + ((w & 65535) << 2) + 6) >> 1] | 0),
                (C << 16) >> 16)
              : 0
          ) {
            n = (1 << H) & 3;
            o = (A + (B << 6) + 54 + (H << 1)) | 0;
            k = C;
            r = (z + ((w & 65535) << 2)) | 0;
            do {
              s = r;
              r = (r + 4) | 0;
              p = b[r >> 1] | 0;
              if ((e[s >> 1] | 0) < (p & 65535)) break a;
              q = c[(a + 60) >> 2] | 0;
              k = k & 65535;
              if (!(p & 1)) {
                if (
                  ((((e[(A + (B << 6) + 54 + (n << 1)) >> 1] | 0) >=
                  (e[(q + (k << 6) + 48 + (n << 1)) >> 1] | 0)
                  ? (e[(q + (k << 6) + 54 + (n << 1)) >> 1] | 0) >=
                    (e[(A + (B << 6) + 48 + (n << 1)) >> 1] | 0)
                  : 0)
                  ? (e[(A + (B << 6) + 54 + (((1 << n) & 3) << 1)) >> 1] | 0) >=
                    (e[(q + (k << 6) + 48 + (((1 << n) & 3) << 1)) >> 1] | 0)
                  : 0)
                  ? (e[(q + (k << 6) + 54 + (((1 << n) & 3) << 1)) >> 1] | 0) >=
                    (e[(A + (B << 6) + 48 + (((1 << n) & 3) << 1)) >> 1] | 0)
                  : 0)
                    ? ((G = c[(a + 92) >> 2] | 0),
                      (F = (q + ((e[(s + 2) >> 1] | 0) << 6)) | 0),
                      Ob[c[((c[G >> 2] | 0) + 8) >> 2] & 63](
                        G,
                        F,
                        (q + (k << 6)) | 0
                      ) | 0,
                      (G = c[(a + 96) >> 2] | 0),
                      G | 0)
                    : 0
                )
                  Ob[c[((c[G >> 2] | 0) + 8) >> 2] & 63](
                    G,
                    F,
                    (q + (k << 6)) | 0
                  ) | 0;
                q = (q + (k << 6) + 48 + (H << 1)) | 0;
                b[q >> 1] = (((b[q >> 1] | 0) + -1) << 16) >> 16;
              } else {
                q = (q + (k << 6) + 54 + (H << 1)) | 0;
                b[q >> 1] = (((b[q >> 1] | 0) + -1) << 16) >> 16;
              }
              b[o >> 1] = (((b[o >> 1] | 0) + 1) << 16) >> 16;
              k = e[s >> 1] | (e[(s + 2) >> 1] << 16);
              q = e[r >> 1] | (e[(r + 2) >> 1] << 16);
              b[s >> 1] = q;
              b[(s + 2) >> 1] = q >>> 16;
              b[r >> 1] = k;
              b[(r + 2) >> 1] = k >>> 16;
              k = b[(s + 10) >> 1] | 0;
            } while ((k << 16) >> 16 != 0);
          }
        while (0);
        b: do
          if (
            (m | 0) > 0
              ? ((u = c[l >> 2] | 0),
                (v = b[(u + ((t & 65535) << 2) + 6) >> 1] | 0),
                (v << 16) >> 16)
              : 0
          ) {
            p =
              ((c[(a + 60) >> 2] | 0) +
                ((e[(u + ((t & 65535) << 2) + 2) >> 1] | 0) << 6) +
                48 +
                (H << 1)) |
              0;
            q = (1 << H) & 3;
            l = v;
            n = (u + ((t & 65535) << 2)) | 0;
            do {
              o = n;
              n = (n + 4) | 0;
              k = b[n >> 1] | 0;
              if ((e[o >> 1] | 0) < (k & 65535)) break b;
              m = c[(a + 60) >> 2] | 0;
              l = l & 65535;
              if (!(k & 1)) {
                t = (m + (l << 6) + 48 + (H << 1)) | 0;
                b[t >> 1] = (((b[t >> 1] | 0) + -1) << 16) >> 16;
              } else {
                k = e[(o + 2) >> 1] | 0;
                if (
                  ((((e[(m + (k << 6) + 54 + (q << 1)) >> 1] | 0) >=
                  (e[(m + (l << 6) + 48 + (q << 1)) >> 1] | 0)
                  ? (e[(m + (l << 6) + 54 + (q << 1)) >> 1] | 0) >=
                    (e[(m + (k << 6) + 48 + (q << 1)) >> 1] | 0)
                  : 0)
                  ? (e[(m + (k << 6) + 54 + (((1 << q) & 3) << 1)) >> 1] | 0) >=
                    (e[(m + (l << 6) + 48 + (((1 << q) & 3) << 1)) >> 1] | 0)
                  : 0)
                  ? (e[(m + (l << 6) + 54 + (((1 << q) & 3) << 1)) >> 1] | 0) >=
                    (e[(m + (k << 6) + 48 + (((1 << q) & 3) << 1)) >> 1] | 0)
                  : 0)
                    ? ((x = c[(a + 92) >> 2] | 0),
                      Ib[c[((c[x >> 2] | 0) + 12) >> 2] & 31](
                        x,
                        (m + (k << 6)) | 0,
                        (m + (l << 6)) | 0,
                        j
                      ) | 0,
                      (x = c[(a + 96) >> 2] | 0),
                      x | 0)
                    : 0
                )
                  Ib[c[((c[x >> 2] | 0) + 12) >> 2] & 31](
                    x,
                    (m + (k << 6)) | 0,
                    (m + (l << 6)) | 0,
                    j
                  ) | 0;
                t = (m + (l << 6) + 54 + (H << 1)) | 0;
                b[t >> 1] = (((b[t >> 1] | 0) + -1) << 16) >> 16;
              }
              b[p >> 1] = (((b[p >> 1] | 0) + 1) << 16) >> 16;
              l = e[o >> 1] | (e[(o + 2) >> 1] << 16);
              t = e[n >> 1] | (e[(n + 2) >> 1] << 16);
              b[o >> 1] = t;
              b[(o + 2) >> 1] = t >>> 16;
              b[n >> 1] = l;
              b[(n + 2) >> 1] = l >>> 16;
              l = b[(o + 10) >> 1] | 0;
            } while ((l << 16) >> 16 != 0);
          }
        while (0);
        if ((y | 0) < 0) uh(a, H, w, j);
        H = (H + 1) | 0;
      } while ((H | 0) != 3);
      k = c[(a + 108) >> 2] | 0;
      if (!k) {
        i = I;
        return;
      }
      yb[c[((c[k >> 2] | 0) + 16) >> 2] & 31](k, c[(d + 60) >> 2] | 0, f, h, j);
      i = I;
      return;
    }
    function ee(b, d, e) {
      b = b | 0;
      d = +d;
      e = +e;
      var f = 0,
        h = 0,
        j = 0,
        k = 0.0,
        l = 0.0,
        m = 0.0,
        n = 0.0,
        o = 0.0,
        p = 0.0,
        q = 0.0,
        r = 0.0,
        s = 0,
        t = 0.0,
        u = 0.0,
        v = 0.0;
      s = i;
      i = (i + 144) | 0;
      f = c[(b + 8) >> 2] | 0;
      if (!f) {
        f = c[(b + 4) >> 2] | 0;
        if (!f) {
          d = 0.0;
          k = 0.0;
          n = 0.0;
          o = 0.0;
          l = 0.0;
          m = 0.0;
        } else {
          r = +g[(f + 336) >> 2];
          n = +g[(b + 172) >> 2];
          o = +g[(f + 340) >> 2];
          p = +g[(b + 168) >> 2];
          m = +g[(b + 164) >> 2];
          q = +g[(f + 332) >> 2];
          d = r * n - o * p;
          k = +g[(f + 316) >> 2];
          n = o * m - n * q;
          o = +g[(f + 320) >> 2];
          l = +g[(f + 324) >> 2];
          m = p * q - r * m;
        }
      } else {
        r = +g[(f + 332) >> 2];
        n = +g[(b + 172) >> 2];
        o = +g[(f + 336) >> 2];
        p = +g[(b + 168) >> 2];
        m = +g[(b + 164) >> 2];
        q = +g[(f + 328) >> 2];
        d = r * n - o * p;
        k = +g[(f + 312) >> 2];
        n = o * m - n * q;
        o = +g[(f + 316) >> 2];
        l = +g[(f + 320) >> 2];
        m = p * q - r * m;
      }
      p = k + d;
      r = o + n;
      q = l + m;
      f = c[(b + 20) >> 2] | 0;
      if (!f) {
        f = c[(b + 16) >> 2] | 0;
        if (!f) {
          d = 0.0;
          k = 0.0;
          n = 0.0;
          o = 0.0;
          l = 0.0;
          m = 0.0;
        } else {
          t = +g[(f + 336) >> 2];
          n = +g[(b + 188) >> 2];
          o = +g[(f + 340) >> 2];
          v = +g[(b + 184) >> 2];
          m = +g[(b + 180) >> 2];
          u = +g[(f + 332) >> 2];
          d = t * n - o * v;
          k = +g[(f + 316) >> 2];
          n = o * m - n * u;
          o = +g[(f + 320) >> 2];
          l = +g[(f + 324) >> 2];
          m = v * u - t * m;
        }
      } else {
        v = +g[(f + 332) >> 2];
        n = +g[(b + 188) >> 2];
        o = +g[(f + 336) >> 2];
        t = +g[(b + 184) >> 2];
        m = +g[(b + 180) >> 2];
        u = +g[(f + 328) >> 2];
        d = v * n - o * t;
        k = +g[(f + 312) >> 2];
        n = o * m - n * u;
        o = +g[(f + 316) >> 2];
        l = +g[(f + 320) >> 2];
        m = t * u - v * m;
      }
      p = p - (k + d);
      n = r - (o + n);
      d = q - (l + m);
      k = +g[(b + 196) >> 2];
      l = +g[(b + 200) >> 2];
      m = +g[(b + 204) >> 2];
      a[(s + 108 + 32) >> 0] = 1;
      c[(s + 108 + 16) >> 2] = 0;
      c[(s + 108 + 16 + 4) >> 2] = 0;
      c[(s + 108 + 16 + 8) >> 2] = 0;
      c[(s + 108 + 16 + 12) >> 2] = 0;
      c[(s + 108) >> 2] = c[(b + 72) >> 2];
      c[(s + 108 + 4) >> 2] = c[(b + 72 + 4) >> 2];
      c[(s + 108 + 8) >> 2] = c[(b + 72 + 8) >> 2];
      c[(s + 108 + 12) >> 2] = c[(b + 72 + 12) >> 2];
      if (k * p + n * l + d * m < 0.0) {
        t = +g[(b + 212) >> 2];
        u =
          +g[(s + 108) >> 2] +
          ((k * p + n * l + d * m) * k + (p - (k * p + n * l + d * m) * k) * t);
        g[(s + 108) >> 2] = u;
        v =
          (k * p + n * l + d * m) * l +
          t * (n - (k * p + n * l + d * m) * l) +
          +g[(s + 108 + 4) >> 2];
        g[(s + 108 + 4) >> 2] = v;
        l =
          (k * p + n * l + d * m) * m +
          t * (d - (k * p + n * l + d * m) * m) +
          +g[(s + 108 + 8) >> 2];
        g[(s + 108 + 8) >> 2] = l;
        f = (s + 108 + 4) | 0;
        h = (s + 108 + 8) | 0;
        j = (s + 108) | 0;
        d = u;
        k = v;
      } else {
        f = (s + 108 + 4) | 0;
        h = (s + 108 + 8) | 0;
        j = (s + 108) | 0;
        d = +g[(s + 108) >> 2];
        k = +g[(s + 108 + 4) >> 2];
        l = +g[(s + 108 + 8) >> 2];
      }
      m =
        (+g[(b + 104) >> 2] * d +
          +g[(b + 108) >> 2] * k +
          +g[(b + 112) >> 2] * l) *
        e;
      n =
        (d * +g[(b + 120) >> 2] +
          k * +g[(b + 124) >> 2] +
          l * +g[(b + 128) >> 2]) *
        e;
      d =
        (d * +g[(b + 136) >> 2] +
          k * +g[(b + 140) >> 2] +
          l * +g[(b + 144) >> 2]) *
        e;
      g[j >> 2] = m;
      g[f >> 2] = n;
      g[h >> 2] = d;
      g[(s + 108 + 12) >> 2] = 0.0;
      f = c[(b + 4) >> 2] | 0;
      if ((f | 0) != (c[(b + 16) >> 2] | 0)) {
        f = s;
        h = (s + 108) | 0;
        j = (f + 36) | 0;
        do {
          c[f >> 2] = c[h >> 2];
          f = (f + 4) | 0;
          h = (h + 4) | 0;
        } while ((f | 0) < (j | 0));
        v = -+g[(s + 4) >> 2];
        u = -+g[(s + 8) >> 2];
        g[s >> 2] = -+g[s >> 2];
        g[(s + 4) >> 2] = v;
        g[(s + 8) >> 2] = u;
        g[(s + 12) >> 2] = 0.0;
        u = -+g[(s + 20) >> 2];
        v = -+g[(s + 24) >> 2];
        g[(s + 16) >> 2] = -+g[(s + 16) >> 2];
        g[(s + 20) >> 2] = u;
        g[(s + 24) >> 2] = v;
        g[(s + 28) >> 2] = 0.0;
        Xh((b + 4) | 0, s, (b + 164) | 0);
        Xh((b + 16) | 0, (s + 108) | 0, (b + 180) | 0);
        i = s;
        return;
      }
      if (!((m == m) & (n == n) & ((d == d) & (0.0 == 0.0)))) {
        i = s;
        return;
      }
      v = +O(+(m * m + n * n + d * d));
      if (v < +g[(f + 368) >> 2]) {
        i = s;
        return;
      }
      h = c[(s + 108 + 32) >> 2] | 0;
      v = +g[(f + 372) >> 2];
      g[(s + 72 + 12) >> 2] = 0.0;
      g[(s + 72 + 28) >> 2] = 0.0;
      c[(s + 72 + 32) >> 2] = h;
      g[(s + 72) >> 2] = -(m * v);
      g[(s + 72 + 4) >> 2] = -(n * v);
      g[(s + 72 + 8) >> 2] = -(d * v);
      g[(s + 72 + 16) >> 2] = v * -0.0;
      g[(s + 72 + 20) >> 2] = v * -0.0;
      g[(s + 72 + 24) >> 2] = v * -0.0;
      Xh((b + 4) | 0, (s + 72) | 0, (b + 164) | 0);
      d = +g[((c[(b + 4) >> 2] | 0) + 372) >> 2];
      f = (s + 36) | 0;
      h = (s + 108) | 0;
      j = (f + 36) | 0;
      do {
        c[f >> 2] = c[h >> 2];
        f = (f + 4) | 0;
        h = (h + 4) | 0;
      } while ((f | 0) < (j | 0));
      g[(s + 36) >> 2] = d * +g[(s + 36) >> 2];
      g[(s + 36 + 4) >> 2] = d * +g[(s + 36 + 4) >> 2];
      g[(s + 36 + 8) >> 2] = d * +g[(s + 36 + 8) >> 2];
      g[(s + 36 + 16) >> 2] = d * +g[(s + 36 + 16) >> 2];
      g[(s + 36 + 20) >> 2] = d * +g[(s + 36 + 20) >> 2];
      g[(s + 36 + 24) >> 2] = d * +g[(s + 36 + 24) >> 2];
      Xh((b + 16) | 0, (s + 36) | 0, (b + 180) | 0);
      i = s;
      return;
    }
    function fe(b, d, e, f) {
      b = b | 0;
      d = d | 0;
      e = e | 0;
      f = +f;
      var h = 0.0,
        j = 0.0,
        k = 0.0,
        l = 0.0,
        m = 0.0,
        n = 0.0,
        o = 0.0,
        p = 0,
        q = 0,
        r = 0.0,
        s = 0.0,
        t = 0.0,
        u = 0.0,
        v = 0,
        w = 0,
        x = 0,
        y = 0,
        z = 0,
        A = 0,
        B = 0.0,
        C = 0.0,
        D = 0,
        E = 0;
      A = i;
      i = (i + 192) | 0;
      x = c[(b + 4) >> 2] | 0;
      if (+g[(x + 752) >> 2] < f) {
        i = A;
        return;
      }
      z = c[(x + 740) >> 2] | 0;
      w = ((c[(b + 8) >> 2] | 0) + 8) | 0;
      y = c[w >> 2] | 0;
      l = +g[e >> 2];
      n = +g[d >> 2] * f + l;
      h = +g[(e + 4) >> 2];
      o = +g[(d + 4) >> 2] * f + h;
      j = +g[(e + 8) >> 2];
      r = +g[(d + 8) >> 2] * f + j;
      v = ((c[(b + 12) >> 2] | 0) + 8) | 0;
      p = c[v >> 2] | 0;
      m = +g[(p + 52) >> 2];
      if ((z | 0) != (y | 0)) {
        k = o - +g[(p + 56) >> 2];
        u = r - +g[(p + 60) >> 2];
        B = l - +g[(y + 52) >> 2];
        l = h - +g[(y + 56) >> 2];
        h = j - +g[(y + 60) >> 2];
        s =
          (n - m) * +g[(p + 4) >> 2] +
          k * +g[(p + 20) >> 2] +
          u * +g[(p + 36) >> 2];
        t =
          (n - m) * +g[(p + 8) >> 2] +
          k * +g[(p + 24) >> 2] +
          u * +g[(p + 40) >> 2];
        u =
          (n - m) * +g[(p + 12) >> 2] +
          k * +g[(p + 28) >> 2] +
          u * +g[(p + 44) >> 2];
        j =
          B * +g[(y + 4) >> 2] + l * +g[(y + 20) >> 2] + h * +g[(y + 36) >> 2];
        k =
          B * +g[(y + 8) >> 2] + l * +g[(y + 24) >> 2] + h * +g[(y + 40) >> 2];
        h =
          B * +g[(y + 12) >> 2] + l * +g[(y + 28) >> 2] + h * +g[(y + 44) >> 2];
      } else {
        C = n - +g[(z + 52) >> 2];
        k = o - +g[(z + 56) >> 2];
        u = r - +g[(z + 60) >> 2];
        B = h - +g[(p + 56) >> 2];
        h = j - +g[(p + 60) >> 2];
        s =
          C * +g[(z + 4) >> 2] + k * +g[(z + 20) >> 2] + u * +g[(z + 36) >> 2];
        t =
          C * +g[(z + 8) >> 2] + k * +g[(z + 24) >> 2] + u * +g[(z + 40) >> 2];
        u =
          C * +g[(z + 12) >> 2] + k * +g[(z + 28) >> 2] + u * +g[(z + 44) >> 2];
        j =
          (l - m) * +g[(p + 4) >> 2] +
          B * +g[(p + 20) >> 2] +
          h * +g[(p + 36) >> 2];
        k =
          (l - m) * +g[(p + 8) >> 2] +
          B * +g[(p + 24) >> 2] +
          h * +g[(p + 40) >> 2];
        h =
          (l - m) * +g[(p + 12) >> 2] +
          B * +g[(p + 28) >> 2] +
          h * +g[(p + 44) >> 2];
      }
      g[A >> 2] = s;
      g[(A + 4) >> 2] = t;
      g[(A + 8) >> 2] = u;
      g[(A + 12) >> 2] = 0.0;
      g[(A + 16) >> 2] = j;
      g[(A + 20) >> 2] = k;
      g[(A + 24) >> 2] = h;
      g[(A + 28) >> 2] = 0.0;
      c[(A + 64) >> 2] = c[d >> 2];
      c[(A + 64 + 4) >> 2] = c[(d + 4) >> 2];
      c[(A + 64 + 8) >> 2] = c[(d + 8) >> 2];
      c[(A + 64 + 12) >> 2] = c[(d + 12) >> 2];
      g[(A + 80) >> 2] = f;
      g[(A + 84) >> 2] = 0.0;
      g[(A + 88) >> 2] = 0.0;
      g[(A + 92) >> 2] = 0.0;
      c[(A + 112) >> 2] = 0;
      a[(A + 116) >> 0] = 0;
      c[(A + 120) >> 2] = 0;
      c[(A + 120 + 4) >> 2] = 0;
      c[(A + 120 + 8) >> 2] = 0;
      c[(A + 120 + 12) >> 2] = 0;
      c[(A + 120 + 16) >> 2] = 0;
      c[(A + 120 + 20) >> 2] = 0;
      c[(A + 120 + 24) >> 2] = 0;
      c[(A + 120 + 28) >> 2] = 0;
      g[(A + 48) >> 2] = n;
      g[(A + 52) >> 2] = o;
      g[(A + 56) >> 2] = r;
      g[(A + 60) >> 2] = 0.0;
      c[(A + 32) >> 2] = c[e >> 2];
      c[(A + 32 + 4) >> 2] = c[(e + 4) >> 2];
      c[(A + 32 + 8) >> 2] = c[(e + 8) >> 2];
      c[(A + 32 + 12) >> 2] = c[(e + 12) >> 2];
      h = +g[(x + 752) >> 2];
      e = c[(x + 748) >> 2] | 0;
      if ((e | 0) > 0) {
        q = 0;
        p = -1;
        l = h * h;
        while (1) {
          h = +g[(x + 4 + ((q * 184) | 0)) >> 2] - s;
          j = +g[(x + 4 + ((q * 184) | 0) + 4) >> 2] - t;
          k = +g[(x + 4 + ((q * 184) | 0) + 8) >> 2] - u;
          d = h * h + j * j + k * k < l;
          p = d ? q : p;
          q = (q + 1) | 0;
          if ((q | 0) == (e | 0)) break;
          else l = d ? h * h + j * j + k * k : l;
        }
      } else p = -1;
      q = c[w >> 2] | 0;
      w = c[v >> 2] | 0;
      h = +g[(q + 224) >> 2] * +g[(w + 224) >> 2];
      h = h < -10.0 ? -10.0 : h;
      g[(A + 84) >> 2] = h > 10.0 ? 10.0 : h;
      g[(A + 92) >> 2] = +g[(q + 228) >> 2] * +g[(w + 228) >> 2];
      h = +g[(q + 232) >> 2] * +g[(w + 232) >> 2];
      h = h < -10.0 ? -10.0 : h;
      g[(A + 88) >> 2] = h > 10.0 ? 10.0 : h;
      h = +g[(A + 72) >> 2];
      w = +N(+h) > 0.7071067690849304;
      l = +g[(A + 68) >> 2];
      if (w) {
        C = 1.0 / +O(+(h * h + l * l));
        n = +g[(A + 64) >> 2];
        m = -(C * l * n);
        n = n * -(C * h);
        o = -(C * h);
        j = (h * h + l * l) * C;
        k = 0.0;
        h = C * l;
      } else {
        j = +g[(A + 64) >> 2];
        k = 1.0 / +O(+(j * j + l * l));
        m = h * -(l * k);
        n = (j * j + l * l) * k;
        o = k * j;
        j = -(k * j * h);
        k = -(l * k);
        h = 0.0;
      }
      g[(A + 152) >> 2] = k;
      g[(A + 156) >> 2] = o;
      g[(A + 160) >> 2] = h;
      g[(A + 168) >> 2] = j;
      g[(A + 172) >> 2] = m;
      g[(A + 176) >> 2] = n;
      v = c[(b + 20) >> 2] | 0;
      q = c[(b + 16) >> 2] | 0;
      w = c[(b + 28) >> 2] | 0;
      b = c[(b + 24) >> 2] | 0;
      c[(A + 96) >> 2] = (z | 0) != (y | 0) ? v : q;
      c[(A + 100) >> 2] = (z | 0) != (y | 0) ? q : v;
      c[(A + 104) >> 2] = (z | 0) != (y | 0) ? w : b;
      c[(A + 108) >> 2] = (z | 0) != (y | 0) ? b : w;
      if ((p | 0) > -1) {
        b = (x + 4 + ((p * 184) | 0) + 148) | 0;
        z = c[b >> 2] | 0;
        e = (x + 4 + ((p * 184) | 0) + 120) | 0;
        d = c[e >> 2] | 0;
        v = (x + 4 + ((p * 184) | 0) + 124) | 0;
        q = c[v >> 2] | 0;
        y = (x + 4 + ((p * 184) | 0) + 128) | 0;
        w = c[y >> 2] | 0;
        D = (x + 4 + ((p * 184) | 0) + 112) | 0;
        E = c[D >> 2] | 0;
        _m((x + 4 + ((p * 184) | 0)) | 0, A | 0, 184) | 0;
        c[D >> 2] = E;
        c[e >> 2] = d;
        c[v >> 2] = q;
        c[y >> 2] = w;
        c[b >> 2] = z;
      } else _e(x, A) | 0;
      i = A;
      return;
    }
    function ge(b, d, e, f, g, h) {
      b = b | 0;
      d = d | 0;
      e = e | 0;
      f = f | 0;
      g = g | 0;
      h = h | 0;
      var i = 0,
        j = 0,
        k = 0,
        l = 0,
        m = 0,
        n = 0,
        o = 0;
      if ((h | 0) < 0) {
        o = c[(b + 8) >> 2] | 0;
        +$b[c[((c[o >> 2] | 0) + 12) >> 2] & 3](
          o,
          d,
          e,
          f,
          g,
          c[(b + 12) >> 2] | 0,
          c[(b + 16) >> 2] | 0,
          c[(b + 4) >> 2] | 0,
          c[(b + 20) >> 2] | 0,
          c[(b + 24) >> 2] | 0
        );
        return;
      }
      n = c[(b + 16) >> 2] | 0;
      a: do
        if ((n | 0) > 0) {
          m = c[(b + 12) >> 2] | 0;
          i = 0;
          while (1) {
            l = (m + (i << 2)) | 0;
            k = c[l >> 2] | 0;
            j = c[((c[(k + 28) >> 2] | 0) + 208) >> 2] | 0;
            if ((j | 0) <= -1) j = c[((c[(k + 32) >> 2] | 0) + 208) >> 2] | 0;
            if ((j | 0) == (h | 0)) {
              o = l;
              break a;
            }
            i = (i + 1) | 0;
            if ((i | 0) >= (n | 0)) {
              o = 0;
              break;
            }
          }
        } else {
          i = 0;
          o = 0;
        }
      while (0);
      if ((i | 0) < (n | 0)) {
        m = c[(b + 12) >> 2] | 0;
        j = 0;
        do {
          l = c[(m + (i << 2)) >> 2] | 0;
          k = c[((c[(l + 28) >> 2] | 0) + 208) >> 2] | 0;
          if ((k | 0) <= -1) k = c[((c[(l + 32) >> 2] | 0) + 208) >> 2] | 0;
          j = ((((k | 0) == (h | 0)) & 1) + j) | 0;
          i = (i + 1) | 0;
        } while ((i | 0) != (n | 0));
        h = j;
      } else h = 0;
      i = c[(b + 4) >> 2] | 0;
      if ((c[(i + 72) >> 2] | 0) < 2) {
        n = c[(b + 8) >> 2] | 0;
        +$b[c[((c[n >> 2] | 0) + 12) >> 2] & 3](
          n,
          d,
          e,
          f,
          g,
          o,
          h,
          i,
          c[(b + 20) >> 2] | 0,
          c[(b + 24) >> 2] | 0
        );
        return;
      }
      if ((e | 0) > 0) {
        i = c[(b + 32) >> 2] | 0;
        j = c[(b + 36) >> 2] | 0;
        n = 0;
        do {
          m = (d + (n << 2)) | 0;
          if ((i | 0) == (j | 0)) {
            l = j | 0 ? j << 1 : 1;
            if ((j | 0) < (l | 0)) {
              if (!l) i = 0;
              else {
                c[6435] = (c[6435] | 0) + 1;
                i = yc((((l << 2) | 3) + 16) | 0) | 0;
                if (!i) i = 0;
                else {
                  c[(((i + 4 + 15) & -16) + -4) >> 2] = i;
                  i = (i + 4 + 15) & -16;
                }
                j = c[(b + 32) >> 2] | 0;
              }
              if ((j | 0) > 0) {
                k = 0;
                do {
                  c[(i + (k << 2)) >> 2] =
                    c[((c[(b + 40) >> 2] | 0) + (k << 2)) >> 2];
                  k = (k + 1) | 0;
                } while ((k | 0) != (j | 0));
              }
              k = c[(b + 40) >> 2] | 0;
              if (k) {
                if (a[(b + 44) >> 0] | 0) {
                  c[6436] = (c[6436] | 0) + 1;
                  hd(c[(k + -4) >> 2] | 0);
                  j = c[(b + 32) >> 2] | 0;
                }
                c[(b + 40) >> 2] = 0;
              }
              a[(b + 44) >> 0] = 1;
              c[(b + 40) >> 2] = i;
              c[(b + 36) >> 2] = l;
              i = j;
              j = l;
            } else i = j;
          }
          c[((c[(b + 40) >> 2] | 0) + (i << 2)) >> 2] = c[m >> 2];
          i = (i + 1) | 0;
          c[(b + 32) >> 2] = i;
          n = (n + 1) | 0;
        } while ((n | 0) != (e | 0));
      }
      if ((g | 0) > 0) {
        i = c[(b + 52) >> 2] | 0;
        j = c[(b + 56) >> 2] | 0;
        n = 0;
        do {
          m = (f + (n << 2)) | 0;
          if ((i | 0) == (j | 0)) {
            l = j | 0 ? j << 1 : 1;
            if ((j | 0) < (l | 0)) {
              if (!l) i = 0;
              else {
                c[6435] = (c[6435] | 0) + 1;
                i = yc((((l << 2) | 3) + 16) | 0) | 0;
                if (!i) i = 0;
                else {
                  c[(((i + 4 + 15) & -16) + -4) >> 2] = i;
                  i = (i + 4 + 15) & -16;
                }
                j = c[(b + 52) >> 2] | 0;
              }
              if ((j | 0) > 0) {
                k = 0;
                do {
                  c[(i + (k << 2)) >> 2] =
                    c[((c[(b + 60) >> 2] | 0) + (k << 2)) >> 2];
                  k = (k + 1) | 0;
                } while ((k | 0) != (j | 0));
              }
              k = c[(b + 60) >> 2] | 0;
              if (k) {
                if (a[(b + 64) >> 0] | 0) {
                  c[6436] = (c[6436] | 0) + 1;
                  hd(c[(k + -4) >> 2] | 0);
                  j = c[(b + 52) >> 2] | 0;
                }
                c[(b + 60) >> 2] = 0;
              }
              a[(b + 64) >> 0] = 1;
              c[(b + 60) >> 2] = i;
              c[(b + 56) >> 2] = l;
              i = j;
              j = l;
            } else i = j;
          }
          c[((c[(b + 60) >> 2] | 0) + (i << 2)) >> 2] = c[m >> 2];
          i = (i + 1) | 0;
          c[(b + 52) >> 2] = i;
          n = (n + 1) | 0;
        } while ((n | 0) != (g | 0));
      }
      if ((h | 0) > 0) {
        i = c[(b + 72) >> 2] | 0;
        j = c[(b + 76) >> 2] | 0;
        n = 0;
        do {
          m = (o + (n << 2)) | 0;
          if ((i | 0) == (j | 0)) {
            l = j | 0 ? j << 1 : 1;
            if ((j | 0) < (l | 0)) {
              if (!l) {
                k = 0;
                i = j;
              } else {
                c[6435] = (c[6435] | 0) + 1;
                i = yc((((l << 2) | 3) + 16) | 0) | 0;
                if (!i) i = 0;
                else {
                  c[(((i + 4 + 15) & -16) + -4) >> 2] = i;
                  i = (i + 4 + 15) & -16;
                }
                k = i;
                i = c[(b + 72) >> 2] | 0;
              }
              if ((i | 0) > 0) {
                j = 0;
                do {
                  c[(k + (j << 2)) >> 2] =
                    c[((c[(b + 80) >> 2] | 0) + (j << 2)) >> 2];
                  j = (j + 1) | 0;
                } while ((j | 0) != (i | 0));
              }
              j = c[(b + 80) >> 2] | 0;
              if (j) {
                if (a[(b + 84) >> 0] | 0) {
                  c[6436] = (c[6436] | 0) + 1;
                  hd(c[(j + -4) >> 2] | 0);
                  i = c[(b + 72) >> 2] | 0;
                }
                c[(b + 80) >> 2] = 0;
              }
              a[(b + 84) >> 0] = 1;
              c[(b + 80) >> 2] = k;
              c[(b + 76) >> 2] = l;
              j = l;
            } else i = j;
          }
          c[((c[(b + 80) >> 2] | 0) + (i << 2)) >> 2] = c[m >> 2];
          i = (i + 1) | 0;
          c[(b + 72) >> 2] = i;
          n = (n + 1) | 0;
        } while ((n | 0) != (h | 0));
      } else i = c[(b + 72) >> 2] | 0;
      if (
        (((c[(b + 52) >> 2] | 0) + i) | 0) <=
        (c[((c[(b + 4) >> 2] | 0) + 72) >> 2] | 0)
      )
        return;
      nh(b);
      return;
    }
    function he(d, e, f, h, j) {
      d = d | 0;
      e = e | 0;
      f = +f;
      h = +h;
      j = +j;
      var k = 0,
        l = 0.0,
        m = 0.0,
        n = 0.0,
        o = 0.0,
        p = 0.0,
        q = 0,
        r = 0,
        s = 0.0,
        t = 0.0,
        u = 0.0,
        v = 0.0,
        w = 0.0,
        x = 0.0;
      q = i;
      i = (i + 240) | 0;
      o = +g[(d + 96) >> 2] + h;
      p = +g[(d + 100) >> 2] + j;
      g[(d + 112) >> 2] = +g[(d + 92) >> 2] + f;
      g[(d + 116) >> 2] = o;
      g[(d + 120) >> 2] = p;
      g[(d + 124) >> 2] = 0.0;
      c[(q + 168) >> 2] = 1065353216;
      c[(q + 168 + 4) >> 2] = 0;
      c[(q + 168 + 4 + 4) >> 2] = 0;
      c[(q + 168 + 4 + 8) >> 2] = 0;
      c[(q + 168 + 4 + 12) >> 2] = 0;
      c[(q + 168 + 20) >> 2] = 1065353216;
      c[(q + 168 + 24) >> 2] = 0;
      c[(q + 168 + 24 + 4) >> 2] = 0;
      c[(q + 168 + 24 + 8) >> 2] = 0;
      c[(q + 168 + 24 + 12) >> 2] = 0;
      c[(q + 168 + 40) >> 2] = 1065353216;
      k = (q + 168 + 44) | 0;
      c[k >> 2] = 0;
      c[(k + 4) >> 2] = 0;
      c[(k + 8) >> 2] = 0;
      c[(k + 12) >> 2] = 0;
      c[(k + 16) >> 2] = 0;
      c[(q + 104) >> 2] = 1065353216;
      c[(q + 104 + 4) >> 2] = 0;
      c[(q + 104 + 4 + 4) >> 2] = 0;
      c[(q + 104 + 4 + 8) >> 2] = 0;
      c[(q + 104 + 4 + 12) >> 2] = 0;
      c[(q + 104 + 20) >> 2] = 1065353216;
      c[(q + 104 + 24) >> 2] = 0;
      c[(q + 104 + 24 + 4) >> 2] = 0;
      c[(q + 104 + 24 + 8) >> 2] = 0;
      c[(q + 104 + 24 + 12) >> 2] = 0;
      c[(q + 104 + 40) >> 2] = 1065353216;
      k = (q + 104 + 44) | 0;
      c[k >> 2] = 0;
      c[(k + 4) >> 2] = 0;
      c[(k + 8) >> 2] = 0;
      c[(k + 12) >> 2] = 0;
      c[(k + 16) >> 2] = 0;
      p = 1.0;
      k = 10;
      while (1) {
        if ((k | 0) <= 0) {
          k = 14;
          break;
        }
        k = (k + -1) | 0;
        c[(q + 168 + 48) >> 2] = c[(d + 92) >> 2];
        c[(q + 168 + 48 + 4) >> 2] = c[(d + 92 + 4) >> 2];
        c[(q + 168 + 48 + 8) >> 2] = c[(d + 92 + 8) >> 2];
        c[(q + 168 + 48 + 12) >> 2] = c[(d + 92 + 12) >> 2];
        c[(q + 104 + 48) >> 2] = c[(d + 112) >> 2];
        c[(q + 104 + 48 + 4) >> 2] = c[(d + 112 + 4) >> 2];
        c[(q + 104 + 48 + 8) >> 2] = c[(d + 112 + 8) >> 2];
        c[(q + 104 + 48 + 12) >> 2] = c[(d + 112 + 12) >> 2];
        n = +g[(d + 92) >> 2] - +g[(d + 112) >> 2];
        o = +g[(d + 96) >> 2] - +g[(d + 116) >> 2];
        f = +g[(d + 100) >> 2] - +g[(d + 120) >> 2];
        r = c[(d + 8) >> 2] | 0;
        g[(q + 4) >> 2] = 1.0;
        b[(q + 8) >> 1] = 1;
        b[(q + 10) >> 1] = -1;
        c[(q + 76) >> 2] = 0;
        c[(q + 12) >> 2] = 0;
        c[(q + 12 + 4) >> 2] = 0;
        c[(q + 12 + 8) >> 2] = 0;
        c[(q + 12 + 12) >> 2] = 0;
        c[(q + 12 + 16) >> 2] = 0;
        c[(q + 12 + 20) >> 2] = 0;
        c[(q + 12 + 24) >> 2] = 0;
        c[(q + 12 + 28) >> 2] = 0;
        c[q >> 2] = 4936;
        c[(q + 80) >> 2] = r;
        g[(q + 84) >> 2] = n;
        g[(q + 88) >> 2] = o;
        g[(q + 92) >> 2] = f;
        g[(q + 96) >> 2] = 0.0;
        g[(q + 100) >> 2] = 0.0;
        r = c[((c[(r + 188) >> 2] | 0) + 4) >> 2] | 0;
        b[(q + 8) >> 1] = r;
        b[(q + 10) >> 1] = r >>> 16;
        r = c[(d + 12) >> 2] | 0;
        f = +Sb[c[((c[r >> 2] | 0) + 48) >> 2] & 15](r);
        r = c[(d + 12) >> 2] | 0;
        zb[c[((c[r >> 2] | 0) + 44) >> 2] & 31](r, f + +g[(d + 56) >> 2]);
        if (!(a[(d + 170) >> 0] | 0))
          Kd(
            e,
            c[(d + 12) >> 2] | 0,
            (q + 168) | 0,
            (q + 104) | 0,
            q,
            +g[(e + 56) >> 2]
          );
        else
          wd(
            c[(d + 8) >> 2] | 0,
            c[(d + 12) >> 2] | 0,
            (q + 168) | 0,
            (q + 104) | 0,
            q,
            +g[(e + 56) >> 2]
          );
        r = c[(d + 12) >> 2] | 0;
        zb[c[((c[r >> 2] | 0) + 44) >> 2] & 31](r, f);
        o = +g[(q + 4) >> 2];
        p = p - o;
        if (o < 1.0) {
          h = +g[(d + 112) >> 2];
          m = +g[(d + 92) >> 2];
          j = +g[(d + 116) >> 2];
          n = +g[(d + 96) >> 2];
          l = +g[(d + 120) >> 2];
          o = +g[(d + 100) >> 2];
          f = +O(+((h - m) * (h - m) + (j - n) * (j - n) + (l - o) * (l - o)));
          if (f > 1.1920928955078125e-7) {
            v = +g[(q + 44) >> 2];
            t = +g[(q + 48) >> 2];
            x = +g[(q + 52) >> 2];
            w =
              ((h - m) * (1.0 / f) * v +
                (j - n) * (1.0 / f) * t +
                (l - o) * (1.0 / f) * x) *
              2.0;
            u = (h - m) * (1.0 / f) - v * w;
            s = (j - n) * (1.0 / f) - t * w;
            w = (l - o) * (1.0 / f) - x * w;
            l = 1.0 / +O(+(w * w + (u * u + s * s)));
            c[(d + 112) >> 2] = c[(d + 92) >> 2];
            c[(d + 112 + 4) >> 2] = c[(d + 92 + 4) >> 2];
            c[(d + 112 + 8) >> 2] = c[(d + 92 + 8) >> 2];
            c[(d + 112 + 12) >> 2] = c[(d + 92 + 12) >> 2];
            h =
              f * (l * u - v * (x * l * w + (v * l * u + t * l * s))) +
              +g[(d + 112) >> 2];
            g[(d + 112) >> 2] = h;
            j =
              f * (l * s - t * (x * l * w + (v * l * u + t * l * s))) +
              +g[(d + 116) >> 2];
            g[(d + 116) >> 2] = j;
            l =
              f * (l * w - x * (x * l * w + (v * l * u + t * l * s))) +
              +g[(d + 120) >> 2];
            g[(d + 120) >> 2] = l;
            f = j;
          } else f = j;
          j = h - m;
          h = f - n;
          f = l - o;
          if (!(j * j + h * h + f * f > 1.1920928955078125e-7)) {
            k = 11;
            break;
          }
          x = 1.0 / +O(+(j * j + h * h + f * f));
          if (
            +g[(d + 76) >> 2] * j * x +
              h * x * +g[(d + 80) >> 2] +
              f * x * +g[(d + 84) >> 2] <=
            0.0
          ) {
            k = 11;
            break;
          }
        } else {
          c[(d + 92) >> 2] = c[(d + 112) >> 2];
          c[(d + 92 + 4) >> 2] = c[(d + 112 + 4) >> 2];
          c[(d + 92 + 8) >> 2] = c[(d + 112 + 8) >> 2];
          c[(d + 92 + 12) >> 2] = c[(d + 112 + 12) >> 2];
        }
        if (!(p > 0.009999999776482582)) {
          k = 14;
          break;
        }
      }
      if ((k | 0) == 11) {
        i = q;
        return;
      } else if ((k | 0) == 14) {
        i = q;
        return;
      }
    }
    function ie(d, f, h, j) {
      d = d | 0;
      f = f | 0;
      h = h | 0;
      j = j | 0;
      var k = 0,
        l = 0,
        m = 0,
        n = 0,
        o = 0,
        p = 0,
        q = 0,
        r = 0,
        s = 0,
        t = 0,
        u = 0,
        v = 0,
        w = 0,
        x = 0.0,
        y = 0.0,
        z = 0.0,
        A = 0.0,
        B = 0.0,
        C = 0.0,
        D = 0.0,
        E = 0.0,
        F = 0.0,
        G = 0.0,
        H = 0.0,
        I = 0.0;
      w = i;
      i = (i + 80) | 0;
      v = c[(d + 48) >> 2] | 0;
      c[w >> 2] = 6864;
      c[(w + 4) >> 2] = v;
      c[(w + 8) >> 2] = f;
      v = c[(d + 52) >> 2] | 0;
      if (!(a[(v + 60) >> 0] | 0)) {
        f = c[(v + 56) >> 2] | 0;
        if ((f | 0) > 0) {
          d = f;
          m = 0;
          p = c[(v + 96) >> 2] | 0;
          f = 0;
          while (1) {
            f = (f + 1) | 0;
            if (
              !(+g[h >> 2] > +g[(p + 16) >> 2]) ? !(+g[j >> 2] < +g[p >> 2]) : 0
            )
              k = 1;
            else k = 0;
            if (
              !(!(+g[(h + 8) >> 2] > +g[(p + 24) >> 2])
                ? !(+g[(j + 8) >> 2] < +g[(p + 8) >> 2])
                : 0)
            )
              k = 0;
            if (
              !(+g[(h + 4) >> 2] > +g[(p + 20) >> 2])
                ? !(+g[(j + 4) >> 2] < +g[(p + 4) >> 2])
                : 0
            ) {
              l = c[(p + 32) >> 2] | 0;
              if (k & ((l | 0) == -1)) {
                ic[c[((c[w >> 2] | 0) + 8) >> 2] & 127](
                  w,
                  c[(p + 36) >> 2] | 0,
                  c[(p + 40) >> 2] | 0
                );
                d = c[(v + 56) >> 2] | 0;
                o = 43;
              } else {
                n = (l | 0) == -1;
                o = 42;
              }
            } else {
              l = c[(p + 32) >> 2] | 0;
              k = 0;
              n = (l | 0) == -1;
              o = 42;
            }
            if ((o | 0) == 42) {
              o = 0;
              if (n | k) o = 43;
              else {
                m = (l + m) | 0;
                k = (p + (l << 6)) | 0;
              }
            }
            if ((o | 0) == 43) {
              m = (m + 1) | 0;
              k = (p + 64) | 0;
            }
            if ((m | 0) < (d | 0)) p = k;
            else break;
          }
        } else f = 0;
        if ((c[6167] | 0) >= (f | 0)) {
          i = w;
          return;
        }
        c[6167] = f;
        i = w;
        return;
      }
      D = +g[h >> 2];
      H = +g[(h + 4) >> 2];
      z = +g[(h + 8) >> 2];
      G = +g[(v + 4) >> 2];
      D = D < G ? G : D;
      y = +g[(v + 8) >> 2];
      H = H < y ? y : H;
      C = +g[(v + 12) >> 2];
      z = z < C ? C : z;
      I = +g[(v + 20) >> 2];
      A = +g[(v + 24) >> 2];
      E = +g[(v + 28) >> 2];
      F = +g[(v + 36) >> 2];
      x = +g[(v + 40) >> 2];
      B = +g[(v + 44) >> 2];
      u = ~~(((I < D ? I : D) - G) * F) & 65534;
      b[(w + 66) >> 1] = u;
      s = ~~(((E < z ? E : z) - C) * B) & 65534;
      t = ~~(((A < H ? A : H) - y) * x) & 65534;
      b[(w + 66 + 2) >> 1] = t;
      b[(w + 66 + 4) >> 1] = s;
      H = +g[j >> 2];
      z = +g[(j + 4) >> 2];
      D = +g[(j + 8) >> 2];
      H = H < G ? G : H;
      z = z < y ? y : z;
      D = D < C ? C : D;
      r = ((~~(((I < H ? I : H) - G) * F + 1.0) & 65535) | 1) & 65535;
      b[(w + 60) >> 1] = r;
      j = ((~~(((E < D ? E : D) - C) * B + 1.0) & 65535) | 1) & 65535;
      q = ((~~(((A < z ? A : z) - y) * x + 1.0) & 65535) | 1) & 65535;
      b[(w + 60 + 2) >> 1] = q;
      b[(w + 60 + 4) >> 1] = j;
      switch (c[(v + 144) >> 2] | 0) {
        case 0: {
          o = c[(v + 56) >> 2] | 0;
          if ((o | 0) > 0) {
            d = 0;
            k = c[(v + 136) >> 2] | 0;
            f = 0;
            do {
              f = (f + 1) | 0;
              l =
                ((r & 65535) >= (e[k >> 1] | 0)
                  ? (u & 65535) <= (e[(k + 6) >> 1] | 0)
                  : 0) &
                ((s & 65535) <= (e[(k + 10) >> 1] | 0)) &
                ((j & 65535) >= (e[(k + 4) >> 1] | 0)) &
                ((t & 65535) <= (e[(k + 8) >> 1] | 0)) &
                ((q & 65535) >= (e[(k + 2) >> 1] | 0));
              m = (k + 12) | 0;
              n = c[m >> 2] | 0;
              if (((n | 0) > -1) & l)
                ic[c[((c[w >> 2] | 0) + 8) >> 2] & 127](
                  w,
                  n >> 21,
                  n & 2097151
                );
              if (l | ((n | 0) > -1)) {
                d = (d + 1) | 0;
                k = (k + 16) | 0;
              } else {
                v = c[m >> 2] | 0;
                d = (d - v) | 0;
                k = (k + ((0 - v) << 4)) | 0;
              }