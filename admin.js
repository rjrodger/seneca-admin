/* Copyright (c) 2013 Richard Rodger, MIT License */
"use strict";


var buffer  = require('buffer')

var _       = require('underscore')
var async   = require('async')
var connect = require('connect')
var sockjs  = require('sockjs')
var nid     = require('nid')


var makepass = require('nid')({length:10})



module.exports = function( options ) {
  var seneca = this
  var plugin = 'admin'


  var defaultoptions = {
    web:true,
    prefix:'/admin',
    user:{nick:'admin'},
    units:[
      {name:'admin-summary', title:'Status Summary',  ng:{module:'senecaAdminSummaryModule', directive:'seneca-admin-summary'}},
      {name:'admin-plugins', title:'Action Patterns', ng:{module:'senecaAdminPluginsModule', directive:'seneca-admin-plugins'}},
      {name:'admin-logging', title:'Streaming Log',   ng:{module:'senecaAdminLoggingModule', directive:'seneca-admin-logging'}},
      {name:'admin-action',  title:'Action Executor', ng:{module:'senecaAdminActionModule',  directive:'seneca-admin-action'}},
    ],
    local:false
  }

  // needed for now until this is made optional in client code
  seneca.depends(plugin,[
    'data-editor'
  ])

  if( seneca.hasplugin('data-editor') ) {
    defaultoptions.units.push( 
      {name:'data-editor', title:'Data Editor',ng:{module:'senecaDataEditorModule',directive:'seneca-data-editor'}} )
  }

  options = seneca.util.deepextend(defaultoptions,options)


  if( !options.local ) {
    seneca.depends(plugin,[
      'user'
    ])
  }


 
  var userent    = seneca.make$( 'sys/user' )

  var useract    = seneca.pin( { role:'user', cmd:'*' } )



  seneca.add({role:plugin,cmd:'stats'},cmd_stats)


  function cmd_stats(args,done) {
    seneca.act('role:seneca,stats:true',{summary:args.summary},done)
  }



  seneca.add({init:plugin}, function( args, done ){
    if( seneca.hasplugin('user') ) setup_users();
    else return done();

    function setup_users() {
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
    }
  })


  // FIX: serious hack here to disable old loghandlers

  var activelogs = {}
  var loghandlers = {}
  function loghandler(client) {
    var code = activelogs['admin-log-'+client.id] = nid()    

    var logh = function(){
      if( code == activelogs['admin-log-'+client.id] ) {
        var msg = JSON.stringify(Array.prototype.slice.call(arguments))
        client.write(msg)
      }
    }
    logh.code = 'admin-log-'+client.id+'-'+code

    return logh
  }




  if( options.web ) {

    if( options.server ) {
      var clients = {}

      var socket = sockjs.createServer();
      socket.on('connection', function(client) {
        clients[client.id] = client

        client.on('close', function(){
          delete clients[client.id]
        })

        client.on('data', function(data){
          var msg = JSON.parse(data)

          function hello() {
            client.token = msg.token
            client.write(JSON.stringify({hello:true}))
          }

          if( msg.hello ) {
            if( !options.local ) {
              seneca.make$('sys/login').load$(msg.token,function(err,out){
                if( out ) return hello()
                client.write(JSON.stringify({goodbye:true}))
              })
            }
            else return hello();
          }
          else if(msg.update && (options.local || client.token==msg.token) ) {
            if( msg.oldroute ) {
              seneca.logroute(msg.oldroute)
            }
            if( msg.newroute ) {
              var logh = loghandler(client)
              seneca.logroute(msg.newroute,logh)
            }
          }
          else {
            client.write(JSON.stringify({ok:true}))
          }
        })
      })

      socket.installHandlers(
        options.server, 
        {
          prefix:options.prefix+'/socket',
          log:function(severity,line){
            seneca.log.debug(severity,line)
          }
        }
      )
    }


    var app = connect()
    app.use(connect.static(__dirname+'/web'))

    seneca.act({
      role:'web',
      plugin:plugin,
      config:{
        prefix:options.prefix,
        units:options.units
      },
      use:{
        startware:function(req,res,next){
          if( 0 != req.url.indexOf(options.prefix) ) return next();

          if( options.prefix === req.url && '/' !== req.url[req.url.length-1] ) {
            res.writeHead(301,{Location:req.url+'/'})
            return res.end();
          }

          var isadminuser = req.seneca && req.seneca.user && req.seneca.user.admin
          if( !isadminuser ) {

            isadminuser = options.local && (
              '127.0.0.1' === req.connection.remoteAddress ||
                '::1' === req.connection.remoteAddress )

            if( !isadminuser ) {
              res.writeHead(401)
              return res.end();
            }
          }


          if( 0 == req.url.indexOf(options.prefix+'/act') ) {
            req.seneca.act( req.body, function( err, out ){
              if( err ) return next(err);
        
              var outjson = _.isUndefined(out) ? '{}' : JSON.stringify(out)

              res.writeHead(200,{
                'Content-Type':   'application/json',
                'Cache-Control':  'private, max-age=0, no-cache, no-store',
                'Content-Length': buffer.Buffer.byteLength(outjson) 
              })
              res.end( outjson )
            })

          }
          else return next();
        },
        pin:{role:plugin,cmd:'*'},
        prefix:'/admin',
        map:{
          stats:true
        },
        endware:function(req,res,next){
          if( 0 != req.url.indexOf(options.prefix) ) return next();

          if( 0 == req.url.indexOf(options.prefix+'/socket') ) return next();

          req.url = req.url.replace(/^\/admin/,"")
          return app( req, res );
        }
      }
    })
  }
 

  return plugin;
}
