;(function(angular,moment) {
  "use strict";

  var root = this
  var seneca = root.seneca
  var prefix = (seneca.config.admin ? seneca.config.admin.prefix : null ) || '/admin'


  var senecaAdminPluginsModule = angular.module('senecaAdminPluginsModule',[])



  senecaAdminPluginsModule.directive('senecaAdminPlugins', ['$http',function($http) {
    var def = {
      restrict:'A',
      scope:{
      },

      link: function( scope, elem, attrs ){
        scope.pluginrows = []

        scope.load = function() {
          console.log('load',scope)
          $http({method: 'GET', url: prefix+'/stats?summary=false', cache: false}).
            success(function(data, status) {
              scope.pluginrows = []
              var pluginrows = []

              var actmap = data.actmap

              var pluginmap = {}

              _.each(actmap,function(meta,pattern){
                var plugin = meta.plugin.full || 'system'
                meta.pattern = pattern;
                var entry = pluginmap[plugin] = (pluginmap[plugin]||{})
                ;(entry.actions = (entry.actions||[])).push(meta)

                entry.meta = entry.meta||{agg:{count:0,sum_mean_time:0},calls:0,done:0,fails:0,time:{mean:0}}

                entry.meta.calls += meta.calls
                entry.meta.done  += meta.done
                entry.meta.fails += meta.fails

                entry.meta.agg.count++
                entry.meta.agg.sum_mean_time += meta.time.mean
              })

              var index = 1
              _.each(pluginmap, function(entry,plugin){
                pluginrows.push(
                  { type:'plugin',more:false,order:(10000*(index++)),
                    plugin:plugin, 
                    //pattern:'('+(((index++))/10000).toPrecision(4).substring(2,6)+')', 
                    pattern:'-',
                    calls:entry.meta.calls, done:entry.meta.done, fails:entry.meta.fails, 
                    mean:0<entry.meta.agg.count?(entry.meta.agg.sum_mean_time/entry.meta.agg.count).toPrecision(2):0 }
                )
              })

              scope.pluginmap = pluginmap
              console.log(pluginmap)

              scope.pluginrows = pluginrows
            })
        }

        scope.showMore = function(row){
          return 'plugin' == row.entity.type
        }

        scope.moreText = function(row){
          return row.entity.more ? 'less' : 'more'
        }

        scope.toggleMore = function(row){
          if( 'plugin' == row.entity.type ) {
            var entry = scope.pluginmap[row.entity.plugin]
            
            if( row.entity.more ) {
              //console.log(scope.pluginrows)
              scope.pluginrows = _.filter(scope.pluginrows,function(entry){
                return !('action'==entry.type&&row.entity.plugin==entry.plugin)
              })
              //console.log(scope.pluginrows)
              row.entity.more = false
            }
            else {
              var actions = []
              var index = row.entity.order
              _.each(entry.actions,function(action){
                action.type='action'
                action.pattern=action.pattern
                action.plugin=row.entity.plugin
                action.mean = action.time.mean.toPrecision(2)
                action.order = ++index
                actions.push(action)
              })

              index = 0
              _.find( scope.pluginrows, function(prow){
                if( prow.plugin == row.entity.plugin ) return true;
                index++
              })

              var before = scope.pluginrows.slice(0,index+1)
              var after  = scope.pluginrows.slice(index+1)

              var pluginrows = []
                    .concat(before)
                    .concat(actions)
                    .concat(after)

              scope.pluginrows = pluginrows

              row.entity.more = true
            }
          }
        }
      },

      controller: function( $scope, $rootScope ) {
        console.log('ctrl',$scope)
        $scope.gridOptions = {
          data: 'pluginrows',
          enableColumnResize:true,
          columnDefs: [
            {field:'order',displayName:'Order',width:100,maxWidth:100,
             cellTemplate: '<button ng-show="showMore(row)" ng-click="toggleMore(row)" class="btn btn-primary btn-small data-editor-cell-button" style="width:50px">{{moreText(row)}}</button>'
            },
            
            { field: "plugin",  displayName:'Plugin' },
            { field: "pattern", displayName:'Pattern' },
            { field: "calls",   displayName:'# Call' },
            { field: "done",    displayName:'# Done' },
            { field: "fails",   displayName:'# Fail' },
            { field: "mean",    displayName:'Mean (ms)' },
          ]
        }

        $rootScope.$on('seneca-admin/unit/admin-plugins/view',function(){
          if( $scope.loaded ) return;
          $scope.load()
          $scope.loaded = true
        })
      },
      
      templateUrl: prefix+"/_admin_plugins_template.html"
    }

    return def
  }])


}.call(window,angular,moment));

