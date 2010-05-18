#!/usr/bin/env node
// Test the binary interface to bufferlists
var assert = require('assert');

var Buffer = require('buffer').Buffer;
var BufferList = require('bufferlist').BufferList;
var Binary = require('bufferlist/binary').Binary;
var sys = require('sys');

function runTest(bufs, check) {
    var bList = new BufferList;
    
    var binary = Binary(bList)
        .getWord8('xLen')
        .when('xLen', 0, function (vars) {
            assert.ok(vars.xLen == 0, 'xLen != 0');
            this
                .getWord8('msgLen')
                .getWord8s('msg', function (vars) {
                    return vars.msgLen
                })
                .tap(function (vars) {
                    vars.moo = 42;
                })
                .end()
            ;
        })
        .getWord8s('xs', 'xLen')
        .tap(function (vars) {
            vars.moo = 100;
        })
    ;
    
    var iv = setInterval(function () {
        var buf = bufs.shift();
        if (!buf) {
            clearInterval(iv);
            check(binary.vars);
        }
        else {
            bList.push(buf);
        }
    }, 50);
}

runTest(
    ['\x04','meow'].map(function (s) {
        var b = new Buffer(Buffer.byteLength(s,'binary'));
        b.write(s,'binary');
        return b;
    }),
    function (vars) {
        assert.equal(
            vars.xLen,
            4,
            'xLen == 4 failed (xLen == ' + sys.inspect(vars.xLen) + ')'
        );
        
        var xs = vars.xs.toString();
        assert.equal(
            xs, 'meow', 'xs != "meow", xs = ' + sys.inspect(xs)
        );
        assert.equal(vars.moo, 100, 'moo != 100');
    }
);

runTest(
    ['\x00','\x12hap','py pur','ring c','ats'].map(function (s) {
        var b = new Buffer(Buffer.byteLength(s,'binary'));
        b.write(s,'binary');
        return b;
    }),
    function (vars) {
        assert.equal(vars.xLen, 0, 'xLen == 0 in "\\x00\\x12happy purring cats"');
        assert.equal(
            vars.msgLen, 12,
            'msgLen != 12, msgLen = ' + sys.inspect(vars.msgLen)
        );
        assert.equal(
            vars.msg,
            'happy purring cats',
            'msg == "happy purring cats in "\\x00\\x12happy purring cats"'
        );
        assert.equal(vars.moo, 42, 'moo != 42');
    }
);
