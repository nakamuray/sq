#!/usr/bin/node
(function () {
    'use strict';

    function sq(script, urlOrFilenameOrHtml) {
        var util = require('util');

        var coffeeScript = require('coffee-script');
        var jsdom = require('jsdom');

        var promise = new Promise(function(resolve, reject) {
            jsdom.env(
                urlOrFilenameOrHtml,
                [],
                {features: {
                    FetchExternalResources: false,
                    ProcessExternalResources: false
                }},
                function(error, window) {
                    if (error) {
                        console.error(error);
                        reject(error);
                    }

                    var jquery = require('jquery')(window);

                    global.$ = jquery;
                    global.document = window.document;
                    global.window = window;

                    //var result = eval(script);
                    var result = coffeeScript.eval(script);

                    if (!(util.isArray(result) || result instanceof jquery)) {
                        result = [result];
                    }

                    Array.prototype.forEach.call(result, function(elem) {
                        if (elem instanceof window.HTMLElement) {
                            elem = elem.outerHTML;
                        }
                        console.log(elem);
                    });
                    resolve();
                }
            );
        });

        return promise;
    }

    if (process.argv.length < 3) {
        console.error('Usage: ' + process.argv[1] + ' <coffee expression> [URL or filename...]');
        process.exit(1);
    }

    var script = process.argv[2];
    var args = process.argv.slice(3);

    if (args.length) {
        var promise = Promise.resolve();
        args.forEach((urlOrFilename) => {
            promise = promise.then(() => {
                return sq(script, urlOrFilename);
            });
        });
    } else {
        var html = '';
        process.stdin.on('readable', function() {
            var chunk = process.stdin.read();
            if (chunk !== null) {
                html += chunk;
            }
        });
        process.stdin.on('end', function() {
            sq(script, html);
        });
    }
}());
