;(function(){
  "use strict";

  var root = this
  var seneca = root.seneca || {}
  var config = (seneca.config && seneca.config.admin) || {}
  var prefix = (config.prefix || '/admin')

  function noop(){for(var i=0;i<arguments.length;i++)if('function'==typeof(arguments[i]))arguments[i]()}
  function empty(val) { return null == val || 0 == ''+val }


  initModule({
    units:config.units
  })


  function initModule( config ) {

    var submods = _.map( config.units, function(unit){ return unit.ng.module })
    console.log(''+submods)

    var home_module = angular.module('home',submods)

    home_module.controller('Main', function($scope,$location) {
      var path = window.location.pathname
    })



    var msgmap = {
      'unknown': 'Unable to perform your request at this time - please try again later.',
      'missing-fields': 'Please enter the missing fields.',
      'user-not-found': 'That username is not recognized.',
      'invalid-password': 'That password is incorrect',
    }


    home_module.service('auth', function($http,$window) {
      return {
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


    var tabview = Object.create({
      show: function(name){
        console.log('show:'+name)
        _.each(this.onViews,function(v){
          v(name)
        })
        this.cur = name
      },
      onViews:[]
    })


    home_module.controller('TabView', function($scope,$rootScope) {
      var views = []

      _.each( config.units, function(unit){
        var v = {title:unit.title,name:unit.name.replace(/-/g,'_')}
        views.push( v )
      })

      $scope.views = views
      $scope.curtab = 'admin_summary'

      $scope.tabview = function( name ){
        tabview.show( name )
        $scope.curtab = name


        var eventname = 'seneca-admin/unit/'+name.replace(/_/g,'-')+'/view'
        $rootScope.$emit(eventname,[])
        if( 'data-editor' == name ) {
          $rootScope.$emit('seneca-data-editor/show-ents')
        }
      }
    })



    home_module.controller('MainPanel', function($scope, $compile, $element) {
      
      var directives = _.map( config.units, function(unit){ 
        $scope['hide_view_'+unit.name.replace(/-/g,'_')] = true

        return {name:unit.name.replace(/-/g,'_'),ref:unit.ng.directive,title:unit.title} 
      })

      _.each(directives, function(dir){
        $element.append( $compile('<div ng-class="{panel:true, \'panel-default\':true, admin_panel_hide:hide_view_'+dir.name+'}"><div class="panel-heading"><h3 class="panel-title">'+dir.title+'</h3></div><div class="panel-body" style="padding-bottom:0px"><div '+dir.ref+'></div></div>')($scope) )

        tabview.onViews.push(function(v){
          $scope['hide_view_'+dir.name] = v!=dir.name
        })
      })

      tabview.show('admin_summary')
    })



  }

}).call(this);


