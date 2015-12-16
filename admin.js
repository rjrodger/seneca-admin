/* Copyright (c) 2013-2015 Richard Rodger, MIT License */
"use strict";


var buffer  = require('buffer')
var fs      = require('fs')

var _            = require('lodash')
var async        = require('async')
var connect      = require('connect')
var serve_static = require('serve-static')
var sockjs       = require('sockjs')
var nid          = require('nid')


var makepass = require('nid')({length:10})



module.exports = function( options ) {
  var seneca = this
  var plugin = 'admin'


  var defaultoptions = {
    web:true,
    prefix:'/admin',
    user:{nick:'admin'},
    units:['admin-summary','admin-plugins','admin-logging','admin-action'],
    unitspecs:{
      'admin-summary': {title:'Status Summary',  ng:{module:'senecaAdminSummaryModule', directive:'seneca-admin-summary'}},
      'admin-plugins': {title:'Action Patterns', ng:{module:'senecaAdminPluginsModule', directive:'seneca-admin-plugins'}},
      'admin-logging': {title:'Streaming Log',   ng:{module:'senecaAdminLoggingModule', directive:'seneca-admin-logging'}},
      'admin-action':  {title:'Action Executor', ng:{module:'senecaAdminActionModule',  directive:'seneca-admin-action'}},
    },
    unitcontent:{
      'admin-summary': [{type:'js',file:__dirname+'/web/admin-summary.js'}],
      'admin-plugins': [{type:'js',file:__dirname+'/web/admin-plugins.js'}],
      'admin-logging': [{type:'js',file:__dirname+'/web/admin-logging.js'}],
      'admin-action':  [{type:'js',file:__dirname+'/web/admin-action.js'}],
    },
    mimetype:{
      js:'text/javascript',
      css:'text/css'
    },
    local:false
  }

  // TODO: is this needed?
  seneca.depends(plugin,[
    'data-editor'
  ])

  // TODO: hack! deepextend needs to be fixed 
  var http_server = options.server
  delete options.server

  options = seneca.util.deepextend(defaultoptions,options)

  options.server = http_server


  if( !options.local ) {
    seneca.depends(plugin,[
      'user'
    ])
  }


 

  var content = {}


  seneca.add({role:plugin,cmd:'stats'},cmd_stats)
  seneca.add({role:plugin,cmd:'webstats'},cmd_webstats)


  function cmd_stats(args,done) {
    seneca.act('role:seneca,stats:true',{summary:args.summary},done)
  }

  function cmd_webstats(args,done) {
    seneca.act('role:web,stats:true',done)
  }



  seneca.add({init:plugin}, function( args, done ){
    var seneca = this

    if( seneca.hasplugin('user') ) setup_users();
    else return loadcontent();

    function setup_users() {
      var userent = seneca.make$( 'sys/user' )
      var useract = seneca.pin( { role:'user', cmd:'*' } )

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
        return loadcontent();
      })
    }

    function loadcontent() {

      seneca.act({role:'basic',note:true,cmd:'list',key:'admin/units',default$:{}}, function(err,out){
        if(err) return done(err);

        if( out ) {
          _.each( out, function(unitdef) {
            if( unitdef.unit && unitdef.spec && unitdef.content ) {
              options.units.push(unitdef.unit)
              options.unitspecs[unitdef.unit] = unitdef.spec
              options.unitcontent[unitdef.unit] = unitdef.content
            }
          })

          seneca.act({
            role:'web',
            plugin:plugin,
            config:{
              prefix:options.prefix,
              units:options.units,
              unitspecs:options.unitspecs
            }})
        }


        async.mapSeries(options.units,function(name,next){
          var items = options.unitcontent[name]
          async.mapSeries(items||[],function(item,next){
            var text = content[item.type] || ''
            fs.readFile(item.file,function(err,data){
              if(err) return next(err);
              text += '\n;\n' + data
              content[item.type] = text
              return next()
            })
          }, next)
        }, done)
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
    app.use(serve_static(__dirname+'/web'))

    seneca.act({
      role:'web',
      plugin:plugin,
      config:{
        prefix:options.prefix,
        units:options.units,
        unitspecs:options.unitspecs
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
          else if( 0 == req.url.indexOf(options.prefix+'/content/') ) {
            var type = req.url.substring( (options.prefix+'/content/').length )
            var text = content[type] || ''

            res.writeHead(200,{
              'Content-Type':   (options.mimetype[type]||'text/plain'),
              'Cache-Control':  'private, max-age=0, no-cache, no-store',
              'Content-Length': buffer.Buffer.byteLength(text) 
            })
            res.end( text )
          }
          else return next();
        },
        pin:{role:plugin,cmd:'*'},
        prefix:'/admin',
        map:{
          stats:true,
          webstats:true
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
