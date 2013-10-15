;(function(){
  var root = this
  var seneca = root.seneca
  var prefix = (seneca.config.admin ? seneca.config.admin.prefix : null ) || '/admin'
  console.log(prefix)

  function noop(){for(var i=0;i<arguments.length;i++)if('function'==typeof(arguments[i]))arguments[i]()}
  function empty(val) { return null == val || 0 == ''+val }

  var home_module = angular.module('home',['cookiesModule'])

  home_module.controller('Main', function($scope,$location) {
    var path = window.location.pathname
    var page_login   = true

    $scope.show_login   = page_login
  })



  var msgmap = {
    'unknown': 'Unable to perform your request at this time - please try again later.',
    'missing-fields': 'Please enter the missing fields.',
    'user-not-found': 'That username is not recognized.',
    'invalid-password': 'That password is incorrect',
  }


  home_module.service('auth', function($http,$window) {
    return {
      login: function(creds,win,fail){
        $http({method:'POST', url: '/auth/login', data:creds, cache:false}).
          success(function(data, status) {
            if( win ) return win(data);
            return $window.location.href=prefix
          }).
          error(function(data, status) {
            if( fail ) return fail(data);
          })
      },

      instance: function(win,fail){
        $http({method:'GET', url: '/auth/instance', cache:false}).
          success(function(data, status) {
            if( win ) return win(data);
          }).
          error(function(data, status) {
            if( fail ) return fail(data);
          })
      },

    }
  })



  home_module.controller('Login', function($scope, $rootScope, auth) {

    function read() {
      return {
        nick:     !empty($scope.input_nick),
        password: !empty($scope.input_password)
      }
    }
    

    function markinput(state,exclude) {
      _.each( state, function( full, field ){
        if( exclude && exclude[field] ) return;
        $scope['seek_'+field] = !full
      })

      $scope.seek_signin = !state.nick || !state.password
    }



    function perform_signin() {
      auth.login({
        nick:$scope.input_nick,
        password:$scope.input_password
      }, null, function( out ){
        $scope.msg = msgmap[out.why] || msgmap.unknown
        $scope.showmsg = true
        if( 'user-not-found' == out.why ) $scope.seek_nick = true;
        if( 'invalid-password' == out.why ) $scope.seek_password = true;
      })
    }

    var visible = {
      nick:true,
      password:true,
      signin:true,
    }


    function show(fademap) {
      _.each( fademap, function(active,name){
        $scope['hide_'+name]=!active

        if( active && !visible[name] ) {
          visible[name]           = true
          $scope['fadeout_'+name] = false
          $scope['fadein_'+name]  = true
        }

        if( !active && visible[name] ) {
          visible[name]           = false
          $scope['fadein_'+name]  = false
          $scope['fadeout_'+name] = true
        }
      })      
    }


    $scope.signin = function() {
      $scope.showmsg = false

      var state = read()

      if( $scope.signin_hit ) {
        markinput(state,{nick:1})
      }

      if( state.nick && state.password ) {
        perform_signin()
      }
      else {
        $scope.msg = msgmap['missing-fields']
        $scope.showmsg = true
      }

      $scope.signin_hit = true
      $scope.mode = 'signin'
    }




    $scope.change = function( field ) {
      if( $scope.signin_hit ) return markinput(read());
    }


    $scope.goaccount = function() {
      window.location.href=prefix
    }


    $scope.mode = 'none'
    $scope.user = null

    $scope.showmsg = false

    $scope.signin_hit = false

    $scope.input_nick = ''
    $scope.input_password = ''

    $scope.seek_nick = false
    $scope.seek_password = false

    $scope.hasuser = !!$scope.user

    auth.instance(function(out){
      $scope.user = out.user
      $scope.hasuser = !!$scope.user
      $rootScope.$emit('instance',{user:out.user})
    })
  })


  home_module.controller('MainPanel', function($scope, $compile, $element) {

    $scope.dirs = ['foo','bar']
    $scope.x = '1'
    $scope.y = '1'

    _.each($scope.dirs, function(dir){
      $element.append( $compile('<div '+dir+'></div>')($scope) )
    })
  })



  home_module.directive('foo', [function() {
    var def = {
      scope:{},
      link: function( scope ){
        scope.msg = 'foo'
        scope.x = '2'
      },
      template: "<b>F:{{msg}}, {{x}}{{y}}</b>"
    }
    return def
  }])

  home_module.directive('bar', [function() {
    var def = {
      scope:{},
      link: function( scope ){
        scope.x = '3'
        scope.msg = 'bar'
      },
      template: "<b>B:{{msg}}, {{x}}{{y}}</b>"
    }
    return def
  }])



}).call(this);


