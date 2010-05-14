// buffer_list.js
// Treat a linked list of buffers as a single variable-size buffer.

function BufferList() {
    this.encoding = 'binary';
    
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
    this.push = function () {
        Array.prototype.slice.call(arguments).forEach(function (buf) {
            if (head.buffer == null) {
                head.buffer = buf;
                last = head;
            }
            else {
                last.next = { next : null, buffer : buf };
                last = last.next;
            }
            length += buf.length;
            return this;
        });
    };
    
    // Advance the buffer stream by n bytes.
    // If n the aggregate advance offset passes the end of the buffer list,
    // operations such as .take() will return empty strings until enough data is
    // pushed.
    this.advance = function (n) {
        offset += n;
        length -= n;
        while (head.buffer && head.next && offset >= head.buffer.length) {
            offset -= head.buffer.length;
            head = head.next;
        }
    };
    
    // Take n bytes from the start of the buffers.
    // Returns a string.
    // If there are less than n bytes in all the buffers, returns the entire
    // concatenated buffer string.
    this.take = function (n) {
        var b = head;
        var acc = '';
        n -= offset;
        while (b && b.buffer && n > 0) {
            acc += b.buffer.toString(
                this.encoding, 0, Math.min(n,b.buffer.length)
            );
            n -= b.buffer.length;
            b = b.next;
        }
        return acc;
    };
};

exports.BufferList = BufferList;
