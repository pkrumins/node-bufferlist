var BufferList = require('bufferlist').BufferList;

/*
// will act something like this:

new Binary(buffer)
    .getWord8('secLen')
    .tap(function (vars) {
        if (vars.secLen == 0) {
            if (vars.)
            this.end();
        }
    })
    .getWord8('msgLen')
    .getWord8s('msg', function () {
        return this.msgLen + 5
    })
    .getWord8(function (size) {
        this.size = size;
    })
    .getWords
;
*/

exports.Binary = Binary;
function Binary(buffer) {
    var binary = this;
    var offset = 0;
    var actions = []; // actions to perform once the bytes are available
    
    function hasBytes (n) {
        return n >= buffer.length - offset;
    }
    
    this.vars = {};
    
    this.tap = function (f) {
        f.call(this, vars);
        return this;
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
        var info_t = typeof(opts.info);
        if (info_t == 'function') {
            actions.push({
                type : 'get',
                bytes : opts.bytes,
                action : function (data) {
                    opts.into.call(binary,data);
                },
            });
        }
        else if (info_t == 'string') {
            actions.push({
                type : 'get',
                bytes : opts.bytes,
                action : function (data) {
                    this.vars[opts.into] = data;
                },
            });
        }
        else {
            throw TypeError('Unsupported into type: ' + info_t);
        };
        return this;
    };
    
    this.getWord8 = function (into) {
        return this.get({ into : into, bytes : 8 });
    };
    
    this.gets = function () {
        return this;
    };
    
    this.getWord8s = function (into, length) {
        return this.gets({ into : into, bytes : 8, length : length });
    };
    
    this.rewind = function (n) {
        offset -= n;
        return this;
    };
    
    this.jump = function (n) {
        offset = n;
        return this;
    };
}

