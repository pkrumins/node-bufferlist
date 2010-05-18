var BufferList = require('bufferlist').BufferList;
var sys = require('sys');
var EventEmitter = require('events').EventEmitter;

exports.Binary = Binary;
function Binary(buffer) {
    if (!(this instanceof Binary)) return new Binary(buffer);
    var binary = this;
    
    function hasBytes (n) {
        return n >= buffer.length - offset;
    }
    
    this.vars = {};
    
    this.tap = function (f) {
        var binary = this;
        actions.unshift({
            type : 'tap',
            action : function (data) {
                f.call(binary, binary.vars);
            },
        });
        
        return this;
    };
    
    // Perform some action when v == value
    this.when = function (v, value, f) {
        return this.tap(function (vars) {
            if (this.vars[v] == value) {
                f.apply(this);
            }
        });
    };
    
    // Perform some action when v != value
    this.unless = function (v, value, f) {
        return this.tap(function (vars) {
            if (this.vars[v] != value) {
                f.apply(this);
            }
        });
    };
    
    this.end = function (value) {
        this.produce(value);
        buffer.advance(offset);
    };
    
    this.produce = function (value) {
        // ...
        return this;
    };
    
    this.get = function (opts) {
        var into_t = typeof(opts.into);
        if (into_t == 'function') {
            actions.unshift({
                type : 'get',
                bytes : opts.bytes,
                action : function (data) {
                    opts.into.call(binary,data);
                },
            });
        }
        else if (into_t == 'string') {
            actions.unshift({
                type : 'get',
                bytes : opts.bytes,
                action : function (data) {
                    binary.vars[opts.into] = data;
                },
            });
        }
        else {
            sys.p(opts);
            throw TypeError('Unsupported into type: ' + into_t);
        };
        return this;
    };
    
    this.getWord8 = function (into) {
        return this.get({ into : into, bytes : 1 });
    };
    
    this.gets = function (opts) {
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
        var action = actions[ actions.length - 1 ];
        if (!action) {
            buffer.removeListener('push', pusher);
        }
        else if (action.type == 'tap') {
            actions.pop();
            action.action(binary.vars);
        }
        else if (action.type == 'get' && buffer.length >= action.bytes) {
            actions.pop();
            action.action(buffer.take(action.bytes));
        }
    });
}

