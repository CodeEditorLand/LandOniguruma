var Onig = (() => {
	var _scriptDir =
		typeof document !== "undefined" && document.currentScript
			? document.currentScript.src
			: undefined;

	return function (Onig) {
		Onig = Onig || {};

		var Module = typeof Onig != "undefined" ? Onig : {};
		var readyPromiseResolve, readyPromiseReject;
		Module["ready"] = new Promise(function (resolve, reject) {
			readyPromiseResolve = resolve;
			readyPromiseReject = reject;
		});
		var moduleOverrides = Object.assign({}, Module);
		var arguments_ = [];
		var thisProgram = "./this.program";
		var quit_ = (status, toThrow) => {
			throw toThrow;
		};
		var ENVIRONMENT_IS_WEB = false;
		var ENVIRONMENT_IS_WORKER = false;
		var ENVIRONMENT_IS_SHELL = true;
		var scriptDirectory = "";
		function locateFile(path) {
			if (Module["locateFile"]) {
				return Module["locateFile"](path, scriptDirectory);
			}
			return scriptDirectory + path;
		}
		var read_, readAsync, readBinary;
		function logExceptionOnExit(e) {
			if (e instanceof ExitStatus) return;
			let toLog = e;
			err("exiting due to exception: " + toLog);
		}
		if (ENVIRONMENT_IS_SHELL) {
			if (typeof read != "undefined") {
				read_ = function shell_read(f) {
					return read(f);
				};
			}
			readBinary = function readBinary(f) {
				let data;
				if (typeof readbuffer == "function") {
					return new Uint8Array(readbuffer(f));
				}
				data = read(f, "binary");
				assert(typeof data == "object");
				return data;
			};
			readAsync = function readAsync(f, onload, onerror) {
				setTimeout(() => onload(readBinary(f)), 0);
			};
			if (typeof scriptArgs != "undefined") {
				arguments_ = scriptArgs;
			} else if (typeof arguments != "undefined") {
				arguments_ = arguments;
			}
			if (typeof quit == "function") {
				quit_ = (status, toThrow) => {
					logExceptionOnExit(toThrow);
					quit(status);
				};
			}
			if (typeof onig_print != "undefined") {
				if (typeof console == "undefined") console = {};
				console.log = onig_print;
				console.warn = console.error =
					typeof printErr != "undefined" ? printErr : onig_print;
			}
		} else {
		}
		var out = Module["print"] || console.log.bind(console);
		var err = Module["printErr"] || console.warn.bind(console);
		Object.assign(Module, moduleOverrides);
		moduleOverrides = null;
		if (Module["arguments"]) arguments_ = Module["arguments"];
		if (Module["thisProgram"]) thisProgram = Module["thisProgram"];
		if (Module["quit"]) quit_ = Module["quit"];
		var POINTER_SIZE = 4;
		var wasmBinary;
		if (Module["wasmBinary"]) wasmBinary = Module["wasmBinary"];
		var noExitRuntime = Module["noExitRuntime"] || true;
		if (typeof WebAssembly != "object") {
			abort("no native wasm support detected");
		}
		var wasmMemory;
		var ABORT = false;
		var EXITSTATUS;
		function assert(condition, text) {
			if (!condition) {
				abort(text);
			}
		}
		var UTF8Decoder =
			typeof TextDecoder != "undefined"
				? new TextDecoder("utf8")
				: undefined;
		function UTF8ArrayToString(heapOrArray, idx, maxBytesToRead) {
			var endIdx = idx + maxBytesToRead;
			var endPtr = idx;
			while (heapOrArray[endPtr] && !(endPtr >= endIdx)) ++endPtr;
			if (endPtr - idx > 16 && heapOrArray.buffer && UTF8Decoder) {
				return UTF8Decoder.decode(heapOrArray.subarray(idx, endPtr));
			}
			var str = "";
			while (idx < endPtr) {
				var u0 = heapOrArray[idx++];
				if (!(u0 & 128)) {
					str += String.fromCharCode(u0);
					continue;
				}
				var u1 = heapOrArray[idx++] & 63;
				if ((u0 & 224) == 192) {
					str += String.fromCharCode(((u0 & 31) << 6) | u1);
					continue;
				}
				var u2 = heapOrArray[idx++] & 63;
				if ((u0 & 240) == 224) {
					u0 = ((u0 & 15) << 12) | (u1 << 6) | u2;
				} else {
					u0 =
						((u0 & 7) << 18) |
						(u1 << 12) |
						(u2 << 6) |
						(heapOrArray[idx++] & 63);
				}
				if (u0 < 65536) {
					str += String.fromCharCode(u0);
				} else {
					var ch = u0 - 65536;
					str += String.fromCharCode(
						55296 | (ch >> 10),
						56320 | (ch & 1023),
					);
				}
			}
			return str;
		}
		function UTF8ToString(ptr, maxBytesToRead) {
			return ptr ? UTF8ArrayToString(HEAPU8, ptr, maxBytesToRead) : "";
		}
		function stringToUTF8Array(str, heap, outIdx, maxBytesToWrite) {
			if (!(maxBytesToWrite > 0)) return 0;
			var startIdx = outIdx;
			var endIdx = outIdx + maxBytesToWrite - 1;
			for (var i = 0; i < str.length; ++i) {
				var u = str.charCodeAt(i);
				if (u >= 55296 && u <= 57343) {
					var u1 = str.charCodeAt(++i);
					u = (65536 + ((u & 1023) << 10)) | (u1 & 1023);
				}
				if (u <= 127) {
					if (outIdx >= endIdx) break;
					heap[outIdx++] = u;
				} else if (u <= 2047) {
					if (outIdx + 1 >= endIdx) break;
					heap[outIdx++] = 192 | (u >> 6);
					heap[outIdx++] = 128 | (u & 63);
				} else if (u <= 65535) {
					if (outIdx + 2 >= endIdx) break;
					heap[outIdx++] = 224 | (u >> 12);
					heap[outIdx++] = 128 | ((u >> 6) & 63);
					heap[outIdx++] = 128 | (u & 63);
				} else {
					if (outIdx + 3 >= endIdx) break;
					heap[outIdx++] = 240 | (u >> 18);
					heap[outIdx++] = 128 | ((u >> 12) & 63);
					heap[outIdx++] = 128 | ((u >> 6) & 63);
					heap[outIdx++] = 128 | (u & 63);
				}
			}
			heap[outIdx] = 0;
			return outIdx - startIdx;
		}
		var buffer,
			HEAP8,
			HEAPU8,
			HEAP16,
			HEAPU16,
			HEAP32,
			HEAPU32,
			HEAPF32,
			HEAPF64;
		function updateGlobalBufferAndViews(buf) {
			buffer = buf;
			Module["HEAP8"] = HEAP8 = new Int8Array(buf);
			Module["HEAP16"] = HEAP16 = new Int16Array(buf);
			Module["HEAP32"] = HEAP32 = new Int32Array(buf);
			Module["HEAPU8"] = HEAPU8 = new Uint8Array(buf);
			Module["HEAPU16"] = HEAPU16 = new Uint16Array(buf);
			Module["HEAPU32"] = HEAPU32 = new Uint32Array(buf);
			Module["HEAPF32"] = HEAPF32 = new Float32Array(buf);
			Module["HEAPF64"] = HEAPF64 = new Float64Array(buf);
		}
		var INITIAL_MEMORY = Module["INITIAL_MEMORY"] || 16777216;
		var wasmTable;
		var __ATPRERUN__ = [];
		var __ATINIT__ = [];
		var __ATPOSTRUN__ = [];
		var runtimeInitialized = false;
		function preRun() {
			if (Module["preRun"]) {
				if (typeof Module["preRun"] == "function")
					Module["preRun"] = [Module["preRun"]];
				while (Module["preRun"].length) {
					addOnPreRun(Module["preRun"].shift());
				}
			}
			callRuntimeCallbacks(__ATPRERUN__);
		}
		function initRuntime() {
			runtimeInitialized = true;
			callRuntimeCallbacks(__ATINIT__);
		}
		function postRun() {
			if (Module["postRun"]) {
				if (typeof Module["postRun"] == "function")
					Module["postRun"] = [Module["postRun"]];
				while (Module["postRun"].length) {
					addOnPostRun(Module["postRun"].shift());
				}
			}
			callRuntimeCallbacks(__ATPOSTRUN__);
		}
		function addOnPreRun(cb) {
			__ATPRERUN__.unshift(cb);
		}
		function addOnInit(cb) {
			__ATINIT__.unshift(cb);
		}
		function addOnPostRun(cb) {
			__ATPOSTRUN__.unshift(cb);
		}
		var runDependencies = 0;
		var runDependencyWatcher = null;
		var dependenciesFulfilled = null;
		function addRunDependency(id) {
			runDependencies++;
			if (Module["monitorRunDependencies"]) {
				Module["monitorRunDependencies"](runDependencies);
			}
		}
		function removeRunDependency(id) {
			runDependencies--;
			if (Module["monitorRunDependencies"]) {
				Module["monitorRunDependencies"](runDependencies);
			}
			if (runDependencies == 0) {
				if (runDependencyWatcher !== null) {
					clearInterval(runDependencyWatcher);
					runDependencyWatcher = null;
				}
				if (dependenciesFulfilled) {
					var callback = dependenciesFulfilled;
					dependenciesFulfilled = null;
					callback();
				}
			}
		}
		function abort(what) {
			{
				if (Module["onAbort"]) {
					Module["onAbort"](what);
				}
			}
			what = "Aborted(" + what + ")";
			err(what);
			ABORT = true;
			EXITSTATUS = 1;
			what += ". Build with -sASSERTIONS for more info.";
			var e = new WebAssembly.RuntimeError(what);
			readyPromiseReject(e);
			throw e;
		}
		var dataURIPrefix = "data:application/octet-stream;base64,";
		function isDataURI(filename) {
			return filename.startsWith(dataURIPrefix);
		}
		var wasmBinaryFile;
		wasmBinaryFile = "onig.wasm";
		if (!isDataURI(wasmBinaryFile)) {
			wasmBinaryFile = locateFile(wasmBinaryFile);
		}
		function getBinary(file) {
			try {
				if (file == wasmBinaryFile && wasmBinary) {
					return new Uint8Array(wasmBinary);
				}
				if (readBinary) {
					return readBinary(file);
				}
				throw "both async and sync fetching of the wasm failed";
			} catch (err) {
				abort(err);
			}
		}
		function getBinaryPromise() {
			if (!wasmBinary && (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER)) {
				if (typeof fetch == "function") {
					return fetch(wasmBinaryFile, { credentials: "same-origin" })
						.then(function (response) {
							if (!response["ok"]) {
								throw (
									"failed to load wasm binary file at '" +
									wasmBinaryFile +
									"'"
								);
							}
							return response["arrayBuffer"]();
						})
						.catch(function () {
							return getBinary(wasmBinaryFile);
						});
				}
			}
			return Promise.resolve().then(function () {
				return getBinary(wasmBinaryFile);
			});
		}
		function createWasm() {
			var info = {
				"env": asmLibraryArg,
				"wasi_snapshot_preview1": asmLibraryArg,
			};
			function receiveInstance(instance, module) {
				var exports = instance.exports;
				Module["asm"] = exports;
				wasmMemory = Module["asm"]["memory"];
				updateGlobalBufferAndViews(wasmMemory.buffer);
				wasmTable = Module["asm"]["__indirect_function_table"];
				addOnInit(Module["asm"]["__wasm_call_ctors"]);
				removeRunDependency("wasm-instantiate");
			}
			addRunDependency("wasm-instantiate");
			function receiveInstantiationResult(result) {
				receiveInstance(result["instance"]);
			}
			function instantiateArrayBuffer(receiver) {
				return getBinaryPromise()
					.then(function (binary) {
						return WebAssembly.instantiate(binary, info);
					})
					.then(function (instance) {
						return instance;
					})
					.then(receiver, function (reason) {
						err("failed to asynchronously prepare wasm: " + reason);
						abort(reason);
					});
			}
			function instantiateAsync() {
				if (
					!wasmBinary &&
					typeof WebAssembly.instantiateStreaming == "function" &&
					!isDataURI(wasmBinaryFile) &&
					typeof fetch == "function"
				) {
					return fetch(wasmBinaryFile, {
						credentials: "same-origin",
					}).then(function (response) {
						var result = WebAssembly.instantiateStreaming(
							response,
							info,
						);
						return result.then(
							receiveInstantiationResult,
							function (reason) {
								err("wasm streaming compile failed: " + reason);
								err(
									"falling back to ArrayBuffer instantiation",
								);
								return instantiateArrayBuffer(
									receiveInstantiationResult,
								);
							},
						);
					});
				} else {
					return instantiateArrayBuffer(receiveInstantiationResult);
				}
			}
			if (Module["instantiateWasm"]) {
				try {
					var exports = Module["instantiateWasm"](
						info,
						receiveInstance,
					);
					return exports;
				} catch (e) {
					err(
						"Module.instantiateWasm callback failed with error: " +
							e,
					);
					readyPromiseReject(e);
				}
			}
			instantiateAsync().catch(readyPromiseReject);
			return {};
		}
		var tempDouble;
		var tempI64;
		function ExitStatus(status) {
			this.name = "ExitStatus";
			this.message = "Program terminated with exit(" + status + ")";
			this.status = status;
		}
		function callRuntimeCallbacks(callbacks) {
			while (callbacks.length > 0) {
				callbacks.shift()(Module);
			}
		}
		function demangle(func) {
			return func;
		}
		function demangleAll(text) {
			var regex = /\b_Z[\w\d_]+/g;
			return text.replace(regex, function (x) {
				var y = demangle(x);
				return x === y ? x : y + " [" + x + "]";
			});
		}
		function jsStackTrace() {
			var error = new Error();
			if (!error.stack) {
				try {
					throw new Error();
				} catch (e) {
					error = e;
				}
				if (!error.stack) {
					return "(no stack trace available)";
				}
			}
			return error.stack.toString();
		}
		var _emscripten_get_now;
		if (typeof dateNow != "undefined") {
			_emscripten_get_now = dateNow;
		} else _emscripten_get_now = () => performance.now();
		function _emscripten_memcpy_big(dest, src, num) {
			HEAPU8.copyWithin(dest, src, src + num);
		}
		function getHeapMax() {
			return 2147483648;
		}
		function emscripten_realloc_buffer(size) {
			try {
				wasmMemory.grow((size - buffer.byteLength + 65535) >>> 16);
				updateGlobalBufferAndViews(wasmMemory.buffer);
				return 1;
			} catch (e) {}
		}
		function _emscripten_resize_heap(requestedSize) {
			var oldSize = HEAPU8.length;
			requestedSize = requestedSize >>> 0;
			var maxHeapSize = getHeapMax();
			if (requestedSize > maxHeapSize) {
				return false;
			}
			let alignUp = (x, multiple) =>
				x + ((multiple - (x % multiple)) % multiple);
			for (var cutDown = 1; cutDown <= 4; cutDown *= 2) {
				var overGrownHeapSize = oldSize * (1 + 0.2 / cutDown);
				overGrownHeapSize = Math.min(
					overGrownHeapSize,
					requestedSize + 100663296,
				);
				var newSize = Math.min(
					maxHeapSize,
					alignUp(Math.max(requestedSize, overGrownHeapSize), 65536),
				);
				var replacement = emscripten_realloc_buffer(newSize);
				if (replacement) {
					return true;
				}
			}
			return false;
		}
		var printCharBuffers = [null, [], []];
		function printChar(stream, curr) {
			var buffer = printCharBuffers[stream];
			if (curr === 0 || curr === 10) {
				(stream === 1 ? out : err)(UTF8ArrayToString(buffer, 0));
				buffer.length = 0;
			} else {
				buffer.push(curr);
			}
		}
		var SYSCALLS = {
			varargs: undefined,
			get: function () {
				SYSCALLS.varargs += 4;
				var ret = HEAP32[(SYSCALLS.varargs - 4) >> 2];
				return ret;
			},
			getStr: function (ptr) {
				var ret = UTF8ToString(ptr);
				return ret;
			},
		};
		function _fd_write(fd, iov, iovcnt, pnum) {
			var num = 0;
			for (var i = 0; i < iovcnt; i++) {
				var ptr = HEAPU32[iov >> 2];
				var len = HEAPU32[(iov + 4) >> 2];
				iov += 8;
				for (var j = 0; j < len; j++) {
					printChar(fd, HEAPU8[ptr + j]);
				}
				num += len;
			}
			HEAPU32[pnum >> 2] = num;
			return 0;
		}
		var asmLibraryArg = {
			"emscripten_get_now": _emscripten_get_now,
			"emscripten_memcpy_big": _emscripten_memcpy_big,
			"emscripten_resize_heap": _emscripten_resize_heap,
			"fd_write": _fd_write,
		};
		var asm = createWasm();
		var ___wasm_call_ctors = (Module["___wasm_call_ctors"] = function () {
			return (___wasm_call_ctors = Module["___wasm_call_ctors"] =
				Module["asm"]["__wasm_call_ctors"]).apply(null, arguments);
		});
		var ___errno_location = (Module["___errno_location"] = function () {
			return (___errno_location = Module["___errno_location"] =
				Module["asm"]["__errno_location"]).apply(null, arguments);
		});
		var _omalloc = (Module["_omalloc"] = function () {
			return (_omalloc = Module["_omalloc"] =
				Module["asm"]["omalloc"]).apply(null, arguments);
		});
		var _ofree = (Module["_ofree"] = function () {
			return (_ofree = Module["_ofree"] = Module["asm"]["ofree"]).apply(
				null,
				arguments,
			);
		});
		var _getLastOnigError = (Module["_getLastOnigError"] = function () {
			return (_getLastOnigError = Module["_getLastOnigError"] =
				Module["asm"]["getLastOnigError"]).apply(null, arguments);
		});
		var _createOnigScanner = (Module["_createOnigScanner"] = function () {
			return (_createOnigScanner = Module["_createOnigScanner"] =
				Module["asm"]["createOnigScanner"]).apply(null, arguments);
		});
		var _freeOnigScanner = (Module["_freeOnigScanner"] = function () {
			return (_freeOnigScanner = Module["_freeOnigScanner"] =
				Module["asm"]["freeOnigScanner"]).apply(null, arguments);
		});
		var _findNextOnigScannerMatch = (Module["_findNextOnigScannerMatch"] =
			function () {
				return (_findNextOnigScannerMatch = Module[
					"_findNextOnigScannerMatch"
				] =
					Module["asm"]["findNextOnigScannerMatch"]).apply(
					null,
					arguments,
				);
			});
		var _findNextOnigScannerMatchDbg = (Module[
			"_findNextOnigScannerMatchDbg"
		] = function () {
			return (_findNextOnigScannerMatchDbg = Module[
				"_findNextOnigScannerMatchDbg"
			] =
				Module["asm"]["findNextOnigScannerMatchDbg"]).apply(
				null,
				arguments,
			);
		});
		var stackSave = (Module["stackSave"] = function () {
			return (stackSave = Module["stackSave"] =
				Module["asm"]["stackSave"]).apply(null, arguments);
		});
		var stackRestore = (Module["stackRestore"] = function () {
			return (stackRestore = Module["stackRestore"] =
				Module["asm"]["stackRestore"]).apply(null, arguments);
		});
		var stackAlloc = (Module["stackAlloc"] = function () {
			return (stackAlloc = Module["stackAlloc"] =
				Module["asm"]["stackAlloc"]).apply(null, arguments);
		});
		var dynCall_jiji = (Module["dynCall_jiji"] = function () {
			return (dynCall_jiji = Module["dynCall_jiji"] =
				Module["asm"]["dynCall_jiji"]).apply(null, arguments);
		});
		Module["UTF8ToString"] = UTF8ToString;
		var calledRun;
		dependenciesFulfilled = function runCaller() {
			if (!calledRun) run();
			if (!calledRun) dependenciesFulfilled = runCaller;
		};
		function run(args) {
			args = args || arguments_;
			if (runDependencies > 0) {
				return;
			}
			preRun();
			if (runDependencies > 0) {
				return;
			}
			function doRun() {
				if (calledRun) return;
				calledRun = true;
				Module["calledRun"] = true;
				if (ABORT) return;
				initRuntime();
				readyPromiseResolve(Module);
				if (Module["onRuntimeInitialized"])
					Module["onRuntimeInitialized"]();
				postRun();
			}
			if (Module["setStatus"]) {
				Module["setStatus"]("Running...");
				setTimeout(function () {
					setTimeout(function () {
						Module["setStatus"]("");
					}, 1);
					doRun();
				}, 1);
			} else {
				doRun();
			}
		}
		if (Module["preInit"]) {
			if (typeof Module["preInit"] == "function")
				Module["preInit"] = [Module["preInit"]];
			while (Module["preInit"].length > 0) {
				Module["preInit"].pop()();
			}
		}
		run();

		return Onig.ready;
	};
})();
if (typeof exports === "object" && typeof module === "object")
	module.exports = Onig;
else if (typeof define === "function" && define["amd"])
	define([], function () {
		return Onig;
	});
else if (typeof exports === "object") exports["Onig"] = Onig;
