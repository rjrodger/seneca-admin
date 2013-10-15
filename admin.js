/* Copyright (c) 2013 Richard Rodger, MIT License */
"use strict";


var _       = require('underscore')
var async   = require('async')
var connect = require('connect')


var makepass = require('nid')({length:10})



module.exports = function( options ) {
  var seneca = this
  var name   = 'admin'

  seneca.depends(name,[
    'user'
  ])


  options = seneca.util.deepextend({
    web:true,
    prefix:'/admin',
    user:{nick:'admin'}
  },options)
  

  var userent    = seneca.make$( 'sys/user' )

  var useract    = seneca.pin( { role:'user', cmd:'*' } )





  seneca.add({init:name}, function( args, done ){
    var users = _.isArray(options.user) ? options.user : [options.user]
    async.mapSeries(users, function(userdata,next) {
      userdata.admin = true

      userent.load$({nick:userdata.nick}, function(err,user){
        if( err ) return done(err);

        if( user ) {
          if( user.admin ) return next();

          user.admin = true
          return user.save$(next)
        }

        userdata.password = _.isString(options.user.password) ? options.user.password : makepass()

        useract.register( userdata, function(err,out){
          if( err ) return done(err);

          seneca.log.info('admin','user',out.user.nick,userdata.password)
          return next();
        })
      })

    }, function(err){
      if( err ) return done(err);
      return done();
    })
  })



  if( options.web ) {

    var app = connect()
    app.use(connect.static(__dirname+'/web'))

    seneca.act({
      role:'web',
      plugin:name,
      config:{prefix:options.prefix},
      use:function(req,res,next){
        if( 0 != req.url.indexOf(options.prefix) ) return next();

        if( options.prefix === req.url && '/' !== req.url[req.url.length-1] ) {
          res.writeHead(301,{Location:req.url+'/'})
          res.end()
          return
        }

        req.url = req.url.replace(/^\/admin/,"")
        var adminuser = req.seneca && req.seneca.user && req.seneca.user.admin
        if( !adminuser ) {
        
          if( '/'==req.url || 0 == req.url.indexOf('/index') ) {
            req.url = '/login.html'
          }
        }

        return app( req, res );
      }
    })
  }


  return name;
}
