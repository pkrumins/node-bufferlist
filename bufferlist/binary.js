var BufferList = require('bufferlist').BufferList;
var EventEmitter = require('events').EventEmitter;
var sys = require('sys');

exports.Binary = Binary;
function Binary(buffer) {
    if (!(this instanceof Binary)) return new Binary(buffer);
    var binary = this;
    
    this.vars = {};
    
    this.tap = function (f) {
        actions.push({
            ready : function () { return true },
            action : function () {
                f.call(binary, binary.vars);
            },
        });
        
        return this;
    };
    
    // Perform some action when v == value
    this.when = function (v, value, f) {
        return this.tap(function (vars) {
            if (this.vars[v] == value) {
                f.call(this, vars);
            }
        });
    };
    
    // Perform some action when v != value
    this.unless = function (v, value, f) {
        return this.tap(function (vars) {
            if (this.vars[v] != value) {
                f.call(this, vars);
            }
        });
    };
    
    this.clear = function (value) {
        actions = [];
        return this;
    };
    
    this.flush = function () {
        buffer.advance(offset);
        offset = 0;
    };
    
    // convert byte strings to little endian numbers
    function decodeLE (bytes) {
        var acc = 0;
        for (var i = 0; i < bytes.length; i++) {
            acc += Math.pow(256,i) * bytes[i];
        }
        return acc;
    }
    
    // convert byte strings to big endian numbers
    function decodeBE (bytes) {
        var acc = 0;
        for (var i = 0; i < bytes.length; i++) {
            acc += Math.pow(256, bytes.length - i - 1) * bytes[i];
        }
        return acc;
    }
    
    this.get = function (opts) {
        var into_t = typeof(opts.into);
        var into_types = 'function string'.split(' ');
        if (into_types.indexOf(into_t) < 0) {
            throw TypeError('Unsupported into type: ' + into_t);
        }
        
        actions.push({
            ready : function () {
                return buffer.length - offset >= opts.bytes;
            },
            action : function () {
                var data = buffer.join(offset, offset + opts.bytes);
                var decoded = opts.endian && opts.endian == 'little'
                    ? decodeLE(data)
                    : decodeBE(data)
                ;
                
                offset += opts.bytes;
                if (into_t == 'function') {
                    opts.into.call(binary, decoded);
                }
                else {
                    binary.vars[opts.into] = decoded;
                }
            },
        });
        return this;
    };
    
    this.getWord8 = function (into) {
        return this.get({ into : into, bytes : 1 });
    };
    
    this.getWord16be = function (into) {
        return this.get({ into : into, bytes : 2, endian : 'big' });
    };
    
    this.getWord16le = function (into) {
        return this.get({ into : into, bytes : 2, endian : 'little' });
    };
    
    this.getWord32be = function (into) {
        return this.get({ into : into, bytes : 4, endian : 'big' });
    };
    
    this.getWord32le = function (into) {
        return this.get({ into : into, bytes : 4, endian : 'little' });
    };
    
    this.getWord64be = function (into) {
        return this.get({ into : into, bytes : 8, endian : 'big' });
    };
    
    this.getWord64le = function (into) {
        return this.get({ into : into, bytes : 8, endian : 'little' });
    };
    
    this.gets = function (opts) {
        // todo: combine actions, return buffer object for gets
        
        if (typeof(opts.length) == 'string') {
            var s = opts.length;
            opts.length = function (vars) { return vars[s] };
        }
        else if (typeof(opts.length) == 'number') {
            var s = opts.length;
            opts.length = function (vars) { return s };
        }
        
        function size () {
            return opts.length(binary.vars) * opts.bytes;
        }
        
        var into_t = typeof(opts.into);
        var into_types = 'function string'.split(' ');
        if (into_types.indexOf(into_t) < 0) {
            throw TypeError('Unsupported into type: ' + into_t);
        }
        
        actions.push({
            ready : function () {
                var s = size();
                return s && buffer.length - offset >= s;
            },
            action : function () {
                var s = size();
                var data = buffer.join(offset, offset + s);
                offset += s;
                
                if (into_t == 'function') {
                    opts.into.call(binary,data);
                }
                else if (into_t == 'string') {
                    binary.vars[opts.into] = data;
                }
            },
        });
        return this;
    };
    
    this.getWord8s = function (into, length) {
        return this.gets({ into : into, bytes : 1, length : length });
    };
    
    this.rewind = function (n) {
        offset -= n;
        return this;
    };
    
    this.jump = function (n) {
        offset = n;
        return this;
    };
    
    var offset = 0;
    var actions = []; // actions to perform once the bytes are available
    
    buffer.addListener('push', function pusher (args) {
        if (actions.length == 0) {
            buffer.removeListener('push', pusher);
            return;
        }
        
        var action = actions[0];
        
        if (action.ready()) {
            actions.shift();
            action.action.call(this, action.action);
            pusher();
        }
    });
}

