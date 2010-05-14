// bufferlist.js
// Treat a linked list of buffers as a single variable-size buffer.
var Buffer = require('buffer').Buffer;

function BufferList(opts) {
    if (typeof(opts) == 'undefined') opts = {}
    
    // default encoding to use for take()
    this.encoding = opts.encoding;
    if (!this.encoding) this.encoding = 'binary';
    
    // constructor to use for Buffer-esque operations
    this.construct = opts.construct || Buffer;
    
    var head = { next : null, buffer : null };
    var last = { next : null, buffer : null };
    
    // length can get negative when advanced past the end
    // and this is the desired behavior
    var length = 0;
    this.__defineGetter__('length', function () {
        return length;
    });
    
    // keep an offset of the head to decide when to head = head.next
    var offset = 0;
    
    // Push buffers to the end of the linked list.
    // Return this (self).
    this.push = function () {
        Array.prototype.slice.call(arguments).forEach(function (buf) {
            if (!head.buffer) {
                head.buffer = buf;
                last = head;
            }
            else {
                last.next = { next : null, buffer : buf };
                last = last.next;
            }
            length += buf.length;
        });
        return this;
    };
    
    // For each buffer, perform some action.
    // If fn's result is a true value, cut out early.
    // Returns this (self).
    this.forEach = function (fn) {
        if (!head.buffer) return new this.construct(0);
        
        if (head.buffer.length - offset <= 0) return this;
        var firstBuf = new this.construct(head.buffer.length - offset);
        head.buffer.copy(firstBuf, 0, offset, head.buffer.length);
        
        var b = { buffer : firstBuf, next : head.next };
        
        while (b && b.buffer) {
            var r = fn(b.buffer);
            if (r) break;
            b = b.next;
        }
        
        return this;
    };
    
    // Create a single Buffer out of all the chunks.
    this.join = function () {
        if (!head.buffer) return new this.construct(0);
        
        var big = new this.construct(this.length);
        var ix = 0;
        this.forEach(function (buffer) {
            buffer.copy(big, ix, 0, buffer.length);
            ix += buffer.length;
        });
        
        return big;
    };
    
    // Advance the buffer stream by n bytes.
    // If n the aggregate advance offset passes the end of the buffer list,
    // operations such as .take() will return empty strings until enough data is
    // pushed.
    // Returns this (self).
    this.advance = function (n) {
        offset += n;
        length -= n;
        while (head.buffer && offset >= head.buffer.length) {
            offset -= head.buffer.length;
            head = head.next
                ? head.next
                : { buffer : null, next : null }
            ;
        }
        return this;
    };
    
    // Take n bytes from the start of the buffers.
    // Returns a string.
    // If there are less than n bytes in all the buffers, returns the entire
    // concatenated buffer string.
    this.take = function (n) {
        var b = head;
        var acc = '';
        var encoding = this.encoding;
        this.forEach(function (buffer) {
            if (n <= 0) return true;
            acc += buffer.toString(
                encoding, 0, Math.min(n,buffer.length)
            );
            n -= buffer.length;
        });
        return acc;
    };
};

exports.BufferList = BufferList;
