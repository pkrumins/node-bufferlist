#!/usr/bin/env node
// Test .into and hierarchical addressing assignment
var assert = require('assert');
var sys = require('sys');

var Buffer = require('buffer').Buffer;
var BufferList = require('bufferlist').BufferList;
var Binary = require('bufferlist/binary').Binary;

var tapped = 0;
var bList = new BufferList;

Binary(bList)
    .getWord16be('foo','bar','baz')
    .tap(function (vars) {
        assert.equal(
            vars.foo.bar.baz, 24930,
            'vars.foo.bar.baz != 24930, '
            + 'vars.foo.bar.baz == ' + sys.inspect(vars.foo.bar.baz)
        );
        tapped ++;
    })
    .getWord32le(['one','two','three'])
    .tap(function (vars) {
        assert.equal(
            vars.one.two.three, 1717920867,
            'vars.one.two.three != 1717920867, '
            + 'vars.one.two.three == ' + sys.inspect(vars.one.two.three)
        );
        tapped ++;
    })
    .end()
;

var buf = new Buffer(7);
buf.write('abcdefg');
bList.push(buf);
assert.equal(tapped, 2, 'tapped != 2, tapped == ' + tapped);
