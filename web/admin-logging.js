;(function(angular,moment) {
  "use strict";

  var root = this
  var seneca = root.seneca
  var config = _.extend({maxlines:9999},(seneca.config ? seneca.config.admin ? seneca.config.admin.logging : {} : {}))
  var prefix = (seneca.config.admin ? seneca.config.admin.prefix : null ) || '/admin'


  var senecaAdminLoggingModule = angular.module('senecaAdminLoggingModule',[])



  senecaAdminLoggingModule.directive('senecaAdminLogging', ['$http',function($http) {
    var def = {
      restrict:'A',
      scope:{
      },
      link: function( scope, elem, attrs ){


      },
      controller: function( $scope, auth ){
        $scope.spec_level  = 'all'
        $scope.spec_type   = ''
        $scope.spec_plugin = ''
        $scope.spec_tag    = ''
        
        $scope.loglist = $('#loglist')

        
        $scope.itemcount=0

        $scope.sock = new SockJS(prefix+'/socket');

        auth.instance( function( instance ){
          $scope.token = instance.login ? instance.login.id : ''

          $scope.sock.onopen = function() {
            $scope.sock.send( JSON.stringify({hello:true,token:$scope.token}) )
          }

          $scope.sock.onmessage = function(e) {
            var msg = JSON.parse(e.data)
            if( msg.hello ) {
              $scope.updateSpec()
            }
            else {
              var itemdiv = $('<div>').addClass('item').addClass(++$scope.itemcount%2?'rowA':'rowB')
              
              var logstr = []
              _.each(msg,function(val){
                var valstr = _.isObject(val)?JSON.stringify(val):val
                logstr.push(valstr)
              })
              itemdiv.text(logstr.join('\t'))
              
              $scope.loglist.prepend(itemdiv)
              var numitems = $scope.loglist.children().length
              if( config.maxlines < numitems ) {
                $scope.loglist.remove($scope.loglist.children()[numitems-1])
              }
            }
          }
        })
        

        $scope.updateSpec = function() {

          var newroute = {
            level:  $scope.spec_level,
            type:   $scope.spec_type,
            plugin: $scope.spec_plugin,
            tag:    $scope.spec_tag,
          }

          _.each(newroute,function(val,key){
            if( ''==val ) newroute[key]=undefined;
          })


          var msg = {token:$scope.token,update:true,oldroute:$scope.logroute,newroute:newroute}
          $scope.sock.send( JSON.stringify(msg) )
          $scope.logroute = newroute
        }
      },
      templateUrl: prefix+"/_admin_logging_template.html"
    }
    return def
  }])


}.call(window,angular,moment));

