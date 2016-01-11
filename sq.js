#!/usr/bin/node
(function () {
    'use strict';

    var fs = require('fs');
    var path = require('path');
    var url = require('url');

    var iconv = require('iconv-lite');

    const userAgent = "Node.js (" + process.platform + "; U; rv:" + process.version + ")";

    const usage = `Usage: sq [option]... <coffee expression> [URL or file]...
        Options:
            -h, --help              display this message
            -n, --quiet             surpress automatic result printing
            -b, --cookie=COOKIE     use Cookie
            -e, --encoding=ENCODING use ENCODING (default: utf-8)
            -r, --referrer=URL      set referrer to URL
            -u, --url=URL           set/override document URL
            -A, --user-agent=AGENT  set User-Agent to AGENT`

    function download(url, headers) {
        var request = require('request');

        headers = Object.assign({
            'User-Agent': userAgent
        }, headers);
        var options = {
            headers: headers
        };
        var promise = new Promise((resolve, reject) => {
            request(url, options, (error, response, data) => {
                if (error) {
                    return reject({error: error, response: response, data: data});
                } else {
                    return resolve({response: response, data: data});
                }
            });
        });

        return promise;
    }

    function streamToPromise(stream) {
        var promise = new Promise((resolve, reject) => {
            var chunks = [];
            stream.on('data', (chunk) => {
                chunks.push(chunk);
            });
            stream.on('end', () => {
                resolve(Buffer.concat(chunks));
            });
            stream.on('error', (error) => {
                reject(error);
            });
        });

        return promise;
    }

    function isURL(mayURL) {
        var u = url.parse(mayURL);
        return Boolean(u.protocol && u.hostname);
    }

    function toFileUrl(fileName) {
        // just copied from jsdom/utils.js

        // Beyond just the `path.resolve`, this is mostly for the benefit of Windows,
        // where we need to convert "\" to "/" and add an extra "/" prefix before the
        // drive letter.
        let pathname = path.resolve(process.cwd(), fileName).replace(/\\/g, "/");
        if (pathname[0] !== "/") {
          pathname = "/" + pathname;
        }

        // path might contain spaces, so convert those to %20
        return "file://" + encodeURI(pathname);
    }

    function sq(script, html, options) {
        var config = {
            features: {
                FetchExternalResources: false,
                ProcessExternalResources: false
            }
        };
        Object.assign(config, options);

        var coffeeScript = require('coffee-script');
        var jsdom = require('jsdom');

        var document = jsdom.jsdom(html, config);
        var window = document.defaultView;

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

        return Promise.resolve();
    }

    var parserArgs = require('minimist');
    var parserOpts = {
        string: ['cookie', 'encoding', 'referrer', 'url', 'userAgent'],
        boolean: ['help', 'quiet'],
        alias: {
            b: 'cookie',
            e: 'encoding',
            h: 'help',
            n: 'quiet',
            r: 'referrer',
            u: 'url',
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
        var headers = {
            'Cookie': opts.cookie,
            'Referer': opts.referrer,
            'User-Agent': opts.userAgent
        }
        Object.keys(headers).forEach((key) => {
            if (headers[key] === undefined) {
                delete(headers[key]);
            }
        });

        var promise = Promise.resolve();
        args.forEach((urlOrFilename) => {
            promise = promise.then(() => {
                if (isURL(urlOrFilename)) {
                    return download(urlOrFilename, headers).then((args) => {
                        var myOpts = {
                            url: args.response.request.uri.href
                        };
                        return {html: args.data, opts: myOpts};
                    });
                } else {
                    return streamToPromise(fs.createReadStream(urlOrFilename)).then((data) => {
                        var myOpts = {
                            url: toFileUrl(urlOrFilename)
                        };
                        return {html: data, opts: myOpts};
                    });
                }
            }).then((args) => {
                Object.assign(args.opts, opts);
                if (opts.encoding) {
                    args.html = iconv.decode(args.html, opts.encoding);
                }
                return sq(script, args.html, args.opts);
            });
        });
    } else {
        streamToPromise(process.stdin).then((html) => {
            if (opts.encoding) {
                html = iconv.decode(html, opts.encoding);
            }
            sq(script, html, opts);
        });
    }
}());
