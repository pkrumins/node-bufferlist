#!/usr/bin/env node
// Test the binary interface to bufferlists
var assert = require('assert');

var Buffer = require('buffer').Buffer;
var BufferList = require('bufferlist').BufferList;
var Binary = require('bufferlist/binary').Binary;
var sys = require('sys');

var bList = new BufferList;

function runTest(bufs, check) {
    var tapped = 0;
    
    var binary = Binary(bList)
        .getWord8('xLen')
        .when('xLen', 0, function (vars) {
            assert.ok(vars.xLen == 0, 'xLen != 0');
            this
                .getWord8('msgLen')
                .getWord8s('msg', function (vars) {
                    return vars.msgLen
                })
                .tap(function () {
                    tapped = 1;
                })
                .end()
            ;
        })
        .getWord8s('xs', 'xLen')
        .tap(function (vars) {
            tapped = 1;
        })
    ;
    
    var iv = setInterval(function () {
        var buf = bufs.shift();
        if (!buf) {
            clearInterval(iv);
            assert.equal(tapped, 1, 'not tapped');
            check(binary.vars);
        }
        else {
            var t = tapped;
            bList.push(buf);
        }
    }, 50);
}

runTest(
    ['\x04','meow'].map(function (s) {
        var b = new Buffer(s.length);
        b.write(s, 'ascii');
        return b;
    }),
    function (vars) {
        assert.equal(
            vars.xLen, 4,
            'xLen == 4 failed (xLen == "' + vars.xLen + '")'
        );
        
        assert.equal(
            vars.xs,
            'meow',
            'xs != "meow", xs = "' + sys.inspect(vars.xs) + '"'
        );
    }
);

runTest(
    ['\x00','\x12hap','py pur','ring c','ats'].map(function (s) {
        var b = new Buffer(s.length);
        b.write(s, 'ascii');
        return b;
    }),
    function (vars) {
        assert.equal(vars.xLen, 0, 'xLen == 0 in "\\x00\\x12happy purring cats"');
        assert.equal(vars.msgLen, 12, 'msgLen == 12 in "\\x00\\x12happy purring cats"');
        assert.equal(
            vars.msg,
            'happy purring cats',
            'msg == "happy purring cats in "\\x00\\x12happy purring cats"'
        );
    }
);
