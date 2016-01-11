#!/usr/bin/node
(function () {
    'use strict';

    const usage = `Usage: sq [option]... <coffee expression> [URL or file]...
        Options:
            -h, --help    display this message
            -n, --quiet   surpress automatic result printing`

    function sq(script, urlOrFilenameOrHtml, options) {
        options = options || {};

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

                    if (!options.quiet) {
                        Array.prototype.forEach.call(result, function(elem) {
                            if (elem instanceof window.HTMLElement) {
                                elem = elem.outerHTML;
                            }
                            console.log(elem);
                        });
                    }
                    resolve();
                }
            );
        });

        return promise;
    }

    var parserArgs = require('minimist');
    var opts = parserArgs(process.argv.slice(2), {
        boolean: ['help', 'quiet'],
        alias: {h: 'help', n: 'quiet'}
    });

    if (opts.help) {
        console.log(usage);
        process.exit(0);
    } else if (!opts._.length) {
        console.error(usage);
        process.exit(1);
    }

    var script = opts._[0];
    var args = opts._.slice(1);

    if (args.length) {
        var promise = Promise.resolve();
        args.forEach((urlOrFilename) => {
            promise = promise.then(() => {
                return sq(script, urlOrFilename, opts);
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
            sq(script, html, opts);
        });
    }
}());
