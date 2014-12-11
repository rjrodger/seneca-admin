# seneca-admin

## An administration plugin for the [Seneca](http://senecajs.org) toolkit.

For a working example, see the <a href="https://github.com/rjrodger/seneca-mvp">Seneca Minimum Viable Product example</a>.


## Support

If you're using this module, feel free to contact me on Twitter if you
have any questions! :) [@rjrodger](http://twitter.com/rjrodger)

Current Version: 0.1.4

Tested on: Node 0.10.29, Seneca 0.5.18

[![Build Status](https://travis-ci.org/rjrodger/seneca-admin.png?branch=master)](https://travis-ci.org/rjrodger/seneca-admin)

## Streaming Log

When using the /admin endpoint to watch live streaming logs there are 4 filters available:

* level - this can be one of all, debug, info, warn, error, fatal.
  * all - show all logs
  * fatal - show only fatal etc. (same applies for each of error, info, debug)
  * error,fatal - show only error or fatal logs
* See [Logging Examples](http://senecajs.org/logging-example.html) for further usage.
