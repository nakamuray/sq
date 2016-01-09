#!/usr/bin/node
(function () {
    'use strict';

    function sq(script, urlOrFilenameOrHtml) {
        var util = require('util');

        var coffeeScript = require('coffee-script');
        var jsdom = require('jsdom');

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
                    process.exit(1);
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
            }
        );
    }

    if (process.argv.length < 3) {
        console.error('Usage: ' + process.argv[1] + ' <coffee expression> [URL or filename]');
        process.exit(1);
    }

    var script = process.argv[2];

    if (process.argv.length >= 4) {
        var urlOrFilename = process.argv[3];
        sq(script, urlOrFilename);

        process.stdout.once('drain', function() {
            process.exit();
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

            process.stdout.once('drain', function() {
                process.exit();
            });
        });
    }
}());
