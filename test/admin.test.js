/* Copyright (c) 2010-2013 Richard Rodger */
"use strict";

// mocha admin.test.js


var seneca  = require('seneca')

var assert  = require('chai').assert

var gex     = require('gex')
var async   = require('async')
var _       = require('underscore')




function cberr(win){
  return function(err){
    if(err) {
      assert.fail(err, 'callback error')
    }
    else {
      win.apply(this,Array.prototype.slice.call(arguments,1))
    }
  }
}




var si = seneca()
si.use( 'user' )
si.use( '..' )

var userent = si.make$('sys/user')




describe('admin', function() {
  
  it('happy', function( fin ) {
    si.ready( function() {    

      userent.list$({admin:true},cberr(function(list){
        assert( 0 < list.length )
        fin()
      }))
    })
  })
})


