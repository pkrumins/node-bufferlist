var BufferList = require('bufferlist').BufferList;
var EventEmitter = require('events').EventEmitter;
var sys = require('sys');

Binary.prototype = new EventEmitter;
exports.Binary = Binary;
function Binary(buffer) {
    if (!(this instanceof Binary)) return new Binary(buffer);

    var binary = this;
    
    this.vars = {};
    this.offset = 0;
    this.actions = [];
    
    // an explicit end loads all the actions before any evaluation happens
    this.end = function () {
        buffer.addListener('push', update);
        update();
        return this;
    };
    
    // signify to the parent that processing should stop
    this.exit = function () {
        this.pushAction({
            ready : true,
            action : function () {
                buffer.listeners('push').splice(0);
                this.actions = [];
                this.parent
                    ? this.parent.emit('exit')
                    : this.emit('exit')
                ;
            },
        });
        return this.end();
    };
    
    function update () {
        var action = binary.actions[0];
        if (!action) {
            buffer.removeListener('push', update);
            binary.emit('end');
        }
        else if (action.ready.call(binary, binary.vars)) {
            binary.actions.shift();
            
            if (action.context == false) {
                action.action.call(binary, binary.vars);
                update();
            }
            else {
                var child = new Binary(buffer);
                child.vars = binary.vars;
                child.parent = binary;
                child.offset = binary.offset;
                
                child.addListener('end', function () {
                    buffer.addListener('push', update);
                    update();
                });
                buffer.removeListener('push', update);
                
                action.action.call(child, child.vars);
                child.end();
            }
        }
    }
    
    this.pushAction = function (action) {
        if (!action) throw "Action not specified";
        var ready = {
            'function' : action.ready,
            'boolean' : function () { return action.ready },
        }[typeof(action.ready)];
        if (!ready) throw "Unknown action.ready type";
        this.actions.push({
            'action' : action.action,
            'ready' : ready,
            'context' : action.context || false,
        });
    };
    
    this.flush = function () {
        this.pushAction({
            ready : true,
            action : function () {
                buffer.advance(this.offset);
                this.offset = 0;
            },
        });
        return this;
    };
    
    this.skip = function (bytes) {
        this.pushAction({
            ready : true,
            action : function () {
                this.offset += bytes;
            },
        });
        return this;
    };
    
    this.tap = function (f) {
        this.pushAction({
            ready : true,
            context : true,
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
    
    this.repeat = function (n, f) {
        this.pushAction({
            ready : true,
            context : true,
            action : function () {
                this.actions = [{ ready : function () { return false } }];
                for (var i = 0; i < n; i++) {
                    f.call(this, this.vars, i);
                }
                this.actions.shift();
                this.end();
            },
        });
        return this;
    };
    
    this.forever = function (f) {
        return this;
    };
    
    this.get = function (opts) {
        var into_t = typeof(opts.into);
        var into_types = 'function string'.split(' ');
        if (into_types.indexOf(into_t) < 0) {
            throw TypeError('Unsupported into type: ' + into_t);
        }
        
        this.pushAction({
            ready : function () {
                return buffer.length - this.offset >= opts.bytes;
            },
            action : function () {
                var data = buffer.join(this.offset, this.offset + opts.bytes);
                var decoded = opts.endian && opts.endian == 'little'
                    ? decodeLE(data)
                    : decodeBE(data)
                ;
                
                this.offset += opts.bytes;
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
                return s && buffer.length - this.offset >= s;
            },
            action : function () {
                var s = size();
                var data = buffer.join(this.offset, this.offset + s);
                this.offset += s;
                
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

