/***********************************************
Copyright 2010, Chris Winberry <chris@winberry.net>. All rights reserved.
Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to
deal in the Software without restriction, including without limitation the
rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
sell copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
IN THE SOFTWARE.
***********************************************/

Object.prototype.equals = function (x) {
    //http://stackoverflow.com/questions/1068834/object-comparison-in-javascript
    var p;

    for (p in this) {
        if (typeof(x[p]) == 'undefined') {
            // console.log('Missing property: ', p);
            return false;
        }
    }

    for (p in x) {
        if (typeof(this[p]) == 'undefined') {
            // console.log('Extra property: ', p);
            return false;
        }
    }

    for (p in this) {
        if (this[p]) {
            switch(typeof(this[p])) {
                case 'object':
                    if (!this[p].equals(x[p])) {
                        // console.log('Mismatched property: ', p);
                        return false;
                    }
                    break;
                case 'function':
                    if (typeof(x[p])=='undefined' || (p != 'equals' && this[p].toString() != x[p].toString())) {
                        // console.log('Mismatched property: ', p);
                        return false;
                    }
                    break;
                default:
                    if (this[p] != x[p]) {
                        // console.log('Mismatched property: ', p);
                        return false;
                    }
            }
        } else {
            if (x[p]) {
                // console.log('Poop: ', p);
                return false;
            }
        }
    }

    return true;
}

var util = require("util");
var fs = require("fs");
var htmlparser = require("./lib/htmlparser");

var htmlTests = require('./tests/html');
var rssTests = require('./tests/rss');
var parserTests = require('./tests/parser');
var testResults = {};

function runBuilderTests (tests, builderCtor, permutator) {
    var passed = 0;
    var failed = 0;

    var builderCallback = function builderCallback (error) {
        if (error) {
            util.puts("Builder error: " + error);
        }
    };

    var startTime = Date.now();
    for (var testName in tests) {
        if (!tests.hasOwnProperty(testName)) {
            continue;
        }
        var test = permutator ? permutator(tests[testName]) : tests[testName];

        var builder = new builderCtor(builderCallback, test.options.builder);
        var parser = new htmlparser.Parser(builder, test.options.parser);

        parser.reset();
        if (test.data.length === 1) {
            parser.parseComplete(test.data[0]);
        } else {
            for (var i = 0, len = test.data.length; i < len; i++) {
                parser.parseChunk(test.data[i]);
            }
            parser.done();
        }
        var testResult = builder.dom.equals(test.expected);

        util.puts("[" + testName + "]: " + (testResult ? "passed" : "FAILED"));
        if (!testResult) {
            failed++;
            // util.puts(util.inspect(builder._raw, false, null));
            util.puts("== Result ==");
            util.puts(util.inspect(builder.dom, false, null));
            util.puts("== Expected ==");
            util.puts(util.inspect(test.expected, false, null));
        } else {
            passed++;
        }
    }
    var endTime = Date.now();

    return {
              elapsed: endTime - startTime
            , passed: passed
            , failed: failed
        };
}

function TestBuilder (callback) {
    this.cb = callback;
    this.reset();
}
TestBuilder.prototype.reset = function () {
    this.output = [];
}
TestBuilder.prototype.write = function (element) {
    this.output.push(element);
}
TestBuilder.prototype.done = function () {
    this.cb(null, this.output);
}
TestBuilder.prototype.error = function (error) {
    this.cb(error);
}

function runParserTests (tests, permutator) {
    var callback = function builderCallback (err) {
        if (err) {
            console.log('Builder error', err);
        }
    };
    var builder = new TestBuilder(callback);
    var parser = new htmlparser.Parser(builder);

    var passed = 0;
    var failed = 0;

    var startTime = Date.now();
    for (var testName in tests) {
        if (!tests.hasOwnProperty(testName)) {
            continue;
        }
        var test = permutator ? permutator(tests[testName]) : tests[testName];
        process.stdout.write('[TEST] ' + testName + ' : ');
        parser.reset();
        if (test.data.length === 1) {
            parser.parseComplete(test.data[0]);
        } else {
            for (var i = 0, len = test.data.length; i < len; i++) {
                parser.parseChunk(test.data[i]);
            }
            parser.done();
        }

        var testResult = builder.output.equals(test.expected);

        if (!testResult) {
            failed++;
            process.stdout.write("FAILED\n");
            util.puts("== Result ==");
            util.puts(util.inspect(builder.output, false, null));
            util.puts("== Expected ==");
            util.puts(util.inspect(test.expected, false, null));
        } else {
            passed++;
            process.stdout.write("Ok\n");
        }
    }
    var endTime = Date.now();

    return {
              elapsed: endTime - startTime
            , passed: passed
            , failed: failed
        };
}

var testResults = {};

testResults['HTML builder, single chunk'] = runBuilderTests(htmlTests, htmlparser.HtmlBuilder);
testResults['HTML builder, streamed'] = runBuilderTests(htmlTests, htmlparser.HtmlBuilder, function (test) {
    var newTest = {};
    for (var key in test) {
        if (!test.hasOwnProperty(key)) {
            continue;
        }
        newTest[key] = (key === 'data') ?
            test.data.join('').split('')
            :
            test[key]
            ;
    }
    return newTest;
});
testResults['RSS builder, single chunk'] = runBuilderTests(rssTests, htmlparser.RssBuilder);
testResults['RSS builder, streamed'] = runBuilderTests(rssTests, htmlparser.RssBuilder, function (test) {
    var newTest = {};
    for (var key in test) {
        if (!test.hasOwnProperty(key)) {
            continue;
        }
        newTest[key] = (key === 'data') ?
            test.data.join('').split('')
            :
            test[key]
            ;
    }
    return newTest;
});
testResults['Parser, single chunk'] = runParserTests(parserTests);
testResults['Parser, streamed'] = runParserTests(parserTests, function (test) {
    var newTest = {};
    for (var key in test) {
        if (!test.hasOwnProperty(key)) {
            continue;
        }
        newTest[key] = (key === 'data') ?
            test.data.join('').split('')
            :
            test[key]
            ;
    }
    return newTest;
});

console.log('');
console.log('Test Results');
console.log('------------------');
var passedTotal = 0;
var failedTotal = 0;
var elapsedTotal = 0;
for (var testName in testResults) {
    if (!testResults.hasOwnProperty(testName)) {
        continue;
    }
    var test = testResults[testName];
    passedTotal += test.passed;
    failedTotal += test.failed;
    elapsedTotal += test.elapsed;
    console.log(testName + ': ' + test.passed + '/' + (test.passed + test.failed) + ' (' + Math.round(test.passed / (test.passed + test.failed) * 100) + '%) [' + test.elapsed + 'ms]');
}
console.log('------------------');
console.log('Total: ' + passedTotal + '/' + (passedTotal + failedTotal) + ' (' + Math.round(passedTotal / (passedTotal + failedTotal) * 100) + '%) [' + elapsedTotal + 'ms]');
