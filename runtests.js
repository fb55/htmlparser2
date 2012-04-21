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

var testUtils = require('./tests/testutils');
var htmlTests = require('./tests/html');
var rssTests = require('./tests/rss');
var parserTests = require('./tests/parser');

var testResults = {};

testUtils.runBuilderTests(
      htmlTests
    , htmlparser.Parser
    , htmlparser.HtmlBuilder
    , null
    , function (testName, testResult, actual, expected) {
        console.log("[" + testName + "]: " + (testResult ? "passed" : "FAILED"));
    }, function (elapsed, passed, failed) {
        testResults['HTML builder'] = {
              elapsed: elapsed
            , passed: passed
            , failed: failed
            };
    });
testUtils.runBuilderTests(
      htmlTests
    , htmlparser.Parser
    , htmlparser.HtmlBuilder
    , function (test) {
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
    }
    , function (testName, testResult, actual, expected) {
        console.log("[" + testName + "]: " + (testResult ? "passed" : "FAILED"));
    }, function (elapsed, passed, failed) {
        testResults['HTML builder (streamed)'] = {
              elapsed: elapsed
            , passed: passed
            , failed: failed
            };
    });

testUtils.runBuilderTests(
      rssTests
    , htmlparser.Parser
    , htmlparser.RssBuilder
    , null
    , function (testName, testResult, actual, expected) {
        console.log("[" + testName + "]: " + (testResult ? "passed" : "FAILED"));
    }, function (elapsed, passed, failed) {
        testResults['RSS builder'] = {
              elapsed: elapsed
            , passed: passed
            , failed: failed
            };
    });
testUtils.runBuilderTests(
      rssTests
    , htmlparser.Parser
    , htmlparser.RssBuilder
    , function (test) {
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
    }
    , function (testName, testResult, actual, expected) {
        console.log("[" + testName + "]: " + (testResult ? "passed" : "FAILED"));
    }, function (elapsed, passed, failed) {
        testResults['RSS builder (streamed)'] = {
              elapsed: elapsed
            , passed: passed
            , failed: failed
            };
    });

testUtils.runParserTests(
      parserTests
    , htmlparser.Parser
    , null
    , function (testName, testResult, actual, expected) {
        console.log("[" + testName + "]: " + (testResult ? "passed" : "FAILED"));
    }, function (elapsed, passed, failed) {
        testResults['Parser'] = {
              elapsed: elapsed
            , passed: passed
            , failed: failed
            };
    });
testUtils.runParserTests(
      parserTests
    , htmlparser.Parser
    , function (test) {
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
    }
    , function (testName, testResult, actual, expected) {
        console.log("[" + testName + "]: " + (testResult ? "passed" : "FAILED"));
    }, function (elapsed, passed, failed) {
        testResults['Parser (streamed)'] = {
              elapsed: elapsed
            , passed: passed
            , failed: failed
            };
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
