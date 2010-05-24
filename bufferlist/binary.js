var BufferList = require('bufferlist').BufferList;
var EventEmitter = require('events').EventEmitter;
var sys = require('sys');

Binary.prototype = new EventEmitter;
exports.Binary = Binary;
function Binary(buffer) {
    if (!(this instanceof Binary)) return new Binary(buffer);

    var binary = this;
    
    this.vars = {};
    var offset = 0;
    
    // empty action at the start is triggered by .end() so that all actions can
    // load before running the chain
    var actions = [ {
        ready : function () { return false },
        action : function () {} }
    ];
    
    this.end = function () {
        actions[0].ready = function () { return true };
        update();
    };
    
    function update () {
        var action = actions[0];
        if (!action) {
            buffer.removeListener('push', update);
            binary.emit('end');
            return;
        }
        
        if (action.ready.call(binary, binary.vars)) {
            actions.shift();
            
            var child = new Binary(buffer);
            child.vars = binary.vars;
            action.action.call(child, child.vars);
            
            binary.emit('update');
            setTimeout(update, 0);
        }
    }
    
    this.addListener('end', update);
    buffer.addListener('push', update);
    
    this.pushAction = function (action) {
        if (!action) throw "Action not specified";
        var ready = {
            'function' : action.ready,
            'boolean' : function () { return action.ready },
        }[typeof(action.ready)];
        if (!ready) throw "Unknown action.ready type";
        actions.push({ 'action' : action, 'ready' : ready });
    };
    
    this.tap = function (f) {
        this.pushAction({
            ready : true,
            action : function () {
                f.call(this, this.vars);
            },
        });
        return this;
    };
    
    this.when = function (v1, v2, f) {
        var f1 = typeof(v1) == 'string'
            ? function (vars) { return vars[v1] }
            : function (vars) { return v1 }
        ;
        var f2 = typeof(v2) == 'string'
            ? function (vars) { return vars[v2] }
            : function (vars) { return v2 }
        ;
        return this.tap(function () {
            if (f1(this.vars) == f2(this.vars)) {
                f.call(this, this.vars);
            }
        });
    };
    
    this.unless = function (v1, v2, f) {
        var f1 = typeof(v1) == 'string'
            ? function (vars) { return vars[v1] }
            : function (vars) { return v1 }
        ;
        var f2 = typeof(v2) == 'string'
            ? function (vars) { return vars[v2] }
            : function (vars) { return v2 }
        ;
        return this.tap(function () {
            if (f1(this.vars) != f2(this.vars)) {
                f.call(this, this.vars);
            }
        });
    };
    
    this.get = function (opts) {
        var into_t = typeof(opts.into);
        var into_types = 'function string'.split(' ');
        if (into_types.indexOf(into_t) < 0) {
            throw TypeError('Unsupported into type: ' + into_t);
        }
        
        this.pushAction({
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
                    opts.into.call(this, decoded);
                }
                else {
                    this.vars[opts.into] = decoded;
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
    
    this.getBuffer = function (into, length) {
        return this.gets({ into : into, bytes : 1, length : length });
    };
    
    this.gets = function (opts) {
        if (typeof(opts.length) == 'string') {
            var s = opts.length;
            opts.length = function (vars) { return vars[s] };
        }
        else if (typeof(opts.length) == 'number') {
            var s = opts.length;
            opts.length = function (vars) { return s };
        }
        
        function size () {
            return opts.length.call(binary,binary.vars) * opts.bytes;
        }
        
        var into_t = typeof(opts.into);
        var into_types = 'function string'.split(' ');
        if (into_types.indexOf(into_t) < 0) {
            throw TypeError('Unsupported into type: ' + into_t);
        }
        
        this.pushAction({
            ready : function () {
                var s = size();
                return s && buffer.length - offset >= s;
            },
            action : function () {
                var s = size();
                var data = buffer.join(offset, offset + s);
                offset += s;
                
                if (into_t == 'function') {
                    opts.into.call(this,data);
                }
                else if (into_t == 'string') {
                    this.vars[opts.into] = data;
                }
            },
        });
        return this;
    };
}

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

