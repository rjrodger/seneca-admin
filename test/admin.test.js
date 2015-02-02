/* Copyright (c) 2010-2013 Richard Rodger */
"use strict";

// mocha admin.test.js


var seneca  = require('seneca')

var assert  = require('chai').assert

var gex     = require('gex')
var async   = require('async')
var _       = require('lodash')




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




var si = seneca({trace:{act_OFF:function(){
  var args = Array.prototype.slice.call(arguments,0)
  args.unshift(Date.now())
  var e = new Error()
  args.push(e.stack)
  console.log(args.join(' '))
}}})
si.use( 'user' )
si.use( 'data-editor' )
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


