/***********************************************
Copyright 2010 - 2012, Chris Winberry <chris@winberry.net>. All rights reserved.
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

(function () {

var exports;
if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') {
    exports = module.exports;
} else {
    exports = {};
    if (!this.Tautologistics) {
        this.Tautologistics = {};
    }
    if (!this.Tautologistics.NodeHtmlParser) {
        this.Tautologistics.NodeHtmlParser = {};
    }
    if (!this.Tautologistics.NodeHtmlParser.Tests) {
        this.Tautologistics.NodeHtmlParser.Tests = [];
    }
    this.Tautologistics.NodeHtmlParser.Tests.Utils = exports;
}

exports.compareObjects = function (a, b) {
    //http://stackoverflow.com/questions/1068834/object-comparison-in-javascript
    var p;

    for (p in a) {
        if (typeof(b[p]) == 'undefined') {
            // console.log('Missing property: ', p);
            return false;
        }
    }

    for (p in b) {
        if (typeof(a[p]) == 'undefined') {
            // console.log('Extra property: ', p);
            return false;
        }
    }

    for (p in a) {
        if (a[p]) {
            switch(typeof(a[p])) {
                case 'object':
                    if (!exports.compareObjects(a[p], b[p])) {
                        // console.log('Mismatched property: ', p);
                        return false;
                    }
                    break;
                case 'function':
                    if (typeof(b[p])=='undefined' || (p != 'equals' && a[p].toString() != b[p].toString())) {
                        // console.log('Mismatched property: ', p);
                        return false;
                    }
                    break;
                default:
                    if (a[p] != b[p]) {
                        // console.log('Mismatched property: ', p);
                        return false;
                    }
            }
        } else {
            if (b[p]) {
                // console.log('Poop: ', p);
                return false;
            }
        }
    }

    return true;
}

exports.runBuilderTests = function (tests, parserCtor, builderCtor, permutator, testHandler, resultsHandler) {
    var passed = 0;
    var failed = 0;

    var builderCallback = function builderCallback (error) {
        if (error) {
            // util.puts("Builder error: " + error);
        }
    };

    // console.log(tests);

    var startTime = Date.now();
    for (var testName in tests) {
        if (!tests.hasOwnProperty(testName)) {
            continue;
        }
        var test = permutator ? permutator(tests[testName]) : tests[testName];

        var builder = new builderCtor(builderCallback, test.options.builder);
        var parser = new parserCtor(builder, test.options.parser);

        parser.reset();
        if (test.data.length === 1) {
            parser.parseComplete(test.data[0]);
        } else {
            for (var i = 0, len = test.data.length; i < len; i++) {
                parser.parseChunk(test.data[i]);
            }
            parser.done();
        }
        var testResult = exports.compareObjects(builder.dom, test.expected);

        testHandler(testName, testResult, builder.dom, test.expected);
        if (!testResult) {
            failed++;
        } else {
            passed++;
        }
    }
    var endTime = Date.now();

    resultsHandler(endTime - startTime, passed, failed);
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

exports.runParserTests = function (tests, parserCtor, permutator, testHandler, resultsHandler) {
    var callback = function builderCallback (err) {
        if (err) {
            console.log('Builder error', err);
        }
    };
    var builder = new TestBuilder(callback);
    var parser = new parserCtor(builder);

    var passed = 0;
    var failed = 0;

    var startTime = Date.now();
    for (var testName in tests) {
        if (!tests.hasOwnProperty(testName)) {
            continue;
        }
        var test = permutator ? permutator(tests[testName]) : tests[testName];
        parser.reset();
        if (test.data.length === 1) {
            parser.parseComplete(test.data[0]);
        } else {
            for (var i = 0, len = test.data.length; i < len; i++) {
                parser.parseChunk(test.data[i]);
            }
            parser.done();
        }

        var testResult = exports.compareObjects(builder.output, test.expected);
        testHandler(testName, testResult, builder.dom, test.expected);

        if (!testResult) {
            failed++;
        } else {
            passed++;
        }
    }
    var endTime = Date.now();

    resultsHandler(endTime - startTime, passed, failed);
}

})();
