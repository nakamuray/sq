#!/usr/bin/node
(function () {
    'use strict';

    const usage = `Usage: sq [option]... <coffee expression> [URL or file]...
        Options:
            -h, --help              display this message
            -n, --quiet             surpress automatic result printing
            -b, --cookie=key=value  mannualy set cookie value
            -r, --referrer=URL      set referrer to URL
            -A, --user-agent=AGENT  set User-Agent to AGENT`

    function sq(script, urlOrFilenameOrHtml, options) {
        var config = {
            features: {
                FetchExternalResources: false,
                ProcessExternalResources: false
            }
        };
        Object.assign(config, {
            referrer: options.referrer,
            cookie: options.cookie,
            userAgent: options.userAgent
        });

        if (config.referrer) {
            config.headers = {
                Referer: config.referrer
            };
        }

        var coffeeScript = require('coffee-script');
        var jsdom = require('jsdom');

        var promise = new Promise(function(resolve, reject) {
            jsdom.env(
                urlOrFilenameOrHtml,
                [],
                config,
                function(error, window) {
                    if (error) {
                        console.error(error);
                        reject(error);
                        return;
                    }

                    var jquery = require('jquery')(window);

                    global.$ = jquery;
                    global.document = window.document;
                    global.window = window;

                    //var result = eval(script);
                    var result = coffeeScript.eval(script);

                    if (!(Array.isArray(result) || result instanceof jquery)) {
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
    var parserOpts = {
        string: ['cookie', 'referrer', 'user-agent'],
        boolean: ['help', 'quiet'],
        alias: {
            b: 'cookie',
            r: 'referrer',
            h: 'help',
            n: 'quiet',
            A: 'userAgent',
            'user-agent': 'userAgent'
        }
    };
    var opts = parserArgs(process.argv.slice(2), parserOpts);

    Object.keys(opts).forEach((key) => {
        if (key == '_') {
            return;
        }
        if (parserOpts.string.indexOf(key) == -1 &&
                parserOpts.boolean.indexOf(key) == -1 &&
                !parserOpts.alias[key]) {
            console.error('unknown option: ' + key);
            console.error(usage);
            process.exit(1);
        }
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
