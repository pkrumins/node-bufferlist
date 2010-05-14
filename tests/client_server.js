#!/usr/bin/env node
// Test a client/server interaction

var sys = require('sys')
function assert (name, eq) {
    sys.print(name + ' ... ');
    sys.puts(eq ? 'ok' : 'fail');
}

var net = require('net');
var client = new net.Stream;

var BufferList = require('bufferlist').BufferList;
var bufs = new BufferList;
var elems = [];

client.addListener('data', function (data) {
    bufs.push(data);
    elems.push(data);
    
    assert('take first 3 bytes', bufs.take(3) == elems[0]);
    assert('take past length of buffer', bufs.take(100) == elems.join(''));
});

client.addListener('end', function (data) {
    assert('verify length', bufs.length == elems.join('').length);
    assert('take to the end', bufs.take(bufs.length) == elems.join(''));
    client.end();
});

var port = 1e4 + Math.random() * ((1 << 16) - 1 - 1e4);
var server = net.createServer(function (stream) {
    stream.addListener('connect', function () {
        stream.write('foo');
        setTimeout(function () {
            stream.write('bar');
            setTimeout(function () {
                stream.write('baz');
                stream.end();
                server.close();
            }, 500);
        }, 500);
    });
});
server.listen(port);

client.connect(port);
