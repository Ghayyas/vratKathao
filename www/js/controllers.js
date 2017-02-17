var app = angular.module('vrat.controllers', [])

/**
 *
 * Main Controller
 */

  .controller('AppCtrl', function ($scope, $cordovaSocialSharing, $cordovaInAppBrowser, $cordovaGoogleAnalytics, $timeout,$window,fbLikeService) {


    //Share AnyWhere Function
    var shareTitle = sharingTitle;
    $scope.shareAnywhere = function () {

      $timeout(function () {
        $cordovaSocialSharing.share(shareTitle, null, null, short_sharing_link);
      }, 300);

    };

    // Rate us Function

    $scope.RateUs = function () {
      if(ionicPlatform == 'android'){
         window.open('market://details?id='+play_id, '_system', 'location=yes');
      }
      else{
        window.open(apple_id, '_system', 'location=yes');
      }
        
        //$cordovaInAppBrowser.open('https://play.google.com/store/apps/details?id=com.deucen.netyatraa', '_blank', options);
    }

//       AppRate.preferences = {
//       openStoreInApp: true,
//       useCustomRateDialog: false,
//       displayAppName: 'Net Yatra',
//       // usesUntilPrompt: 5,
//       promptAgainForEachNewVersion: false,
//       storeAppURL: {
//       ios: '<my_app_id>',
//       android: 'market://details?id=com.deucen.netyatraa',
//       windows: 'ms-windows-store://pdp/?ProductId=<the apps Store ID>',
//       blackberry: 'appworld://content/[App Id]/',
//       windows8: 'ms-windows-store:Review?name=<the Package Family Name of the application>'
//     },
//     customLocale: {
//       title: "Rate us",
//       message: "Would you like to Rate us ?",
//       cancelButtonLabel: "No, Thanks",
//       laterButtonLabel: "Remind Me Later",
//       rateButtonLabel: "Rate It Now"
//     }
// };

//     AppRate.promptForRating(true);


    

//  Like us on Facebook

    $scope.likeUsOnFb = function () {
        fbLikeService.openWindow().then(function(d){
        },function(e){
          $window.open(fb_page, '_system', 'location=yes');
        })

    };


    //Our More Apps

    $scope.ourMoreApps = function () {
       if(ionicPlatform == 'android'){
           $window.open(more_apps_links, '_system', 'location=yes');
       }
       else{
         $window.open(more_apps_links_ios,'_system','location=yes');
       }
    }


  })



  /**
   *
   * Home Controller
   *
   */

  .controller('homeCtrl', function (showLoading, $localStorage,$cordovaSQLite ,httpRequest, alertService, stopLoading, $http, $state, $timeout, $scope, bannerAd) {

    var _self = this;
    $scope.$on("$ionicView.beforeEnter", function (event, data) {
      if(typeof(AdMob) !== 'undefined'){
         bannerAd.hideBanner()
      }
});
    // handle event
    _self.desibleLoadBtn = false;
    var c;
    var totalCounts;

    _self.load = function () {
      showLoading.show();
      c = 10;
      httpRequest.httpFunc().then(function (d) {
        stopLoading.hide();
        // $localStorage.allPost = d.data.posts;
        _self.data = d.data.posts;
        totalCounts = d.data.count_total;

      }, function (e) {
        stopLoading.hide();
        alertService.showAlert('Error', "Make Sure you have working Internet Connections");

      //  _self.data =  $localStorage.allPost;
      var arr = [];
        var query = "SELECT * FROM allPosts";
          $cordovaSQLite.execute(db, query).then(function(res) {
              if(res.rows.length > 0) {
           
                for(var i = 0; i < res.rows.length; i++){
                var post = JSON.parse(res.rows.item(i).post);
                arr.push(post);
                _self.data = arr;
              } 
                
            } else {
                
            }
          },function(e) {
          }) 


      })
    };
    _self.load();

    _self.loadMore = function () {
     c = c + 10;
      if(_self.data.length == totalCounts){
         alertService.showAlert('Sorry', "Sorry No More Stories Found");
      }
      else{
     showLoading.show();
     $http.get(WordPress_url +'/?json=get_recent_posts&count=' + c).then(function (r) {
        stopLoading.hide();
       _self.data = r.data.posts;
      }, function (e) {
        stopLoading.hide();
        alertService.showAlert('Error', "Make Sure you have working Internet Connections");
      });
    }};
   
   _self.gotopostDetail = function (data) {

      var jsonString = JSON.stringify(data);

      $state.go('menu.postDetail', {postID: jsonString});
    }
    
    _self.gotoSearch = function(){
      $state.go('menu.search');
    }
  })


  /**
   *
   * categoryCtrl
   *
   */
  
  .controller('categoryCtrl', function ($localStorage,$timeout,$ionicPlatform ,$http, $cordovaSQLite ,$stateParams, $cordovaLocalNotification, showLoading, httpRequest, alertService, stopLoading, $state, $scope, $rootScope) {

    var _self = this;

    var totalPost;
    showLoading.show();
    $http.get(WordPress_url +'/?json=get_category_index').then(function (d) {
      _self.data = d.data.categories;
      var data = d.data.categories;
           stopLoading.hide();
      $ionicPlatform.ready(function(){
      var query = "SELECT * FROM allCategories";
          $cordovaSQLite.execute(db, query).then(function(res) {
              if(res.rows.length > 0) {

            } else {
              var query2 = "INSERT INTO allCategories (categories) VALUES (?)";
                $cordovaSQLite.execute(db, query2, [JSON.stringify(data)]).then(function(res) {
                    }, function (err) {
                    });     
                
            }
          },function(e) {
          })  
      })
       
      
      
      
      
      
      
      stopLoading.hide();
    }, function (e) {
      stopLoading.hide();
       alertService.showAlert('Error', 'Make sure you have working internet connection');     
     
      // _self.data = $localStorage.categoryData;
     
     $ionicPlatform.ready(function(){

            var query = "SELECT * FROM allCategories";
            // var arr = [];
          $cordovaSQLite.execute(db, query).then(function(res) {
              if(res.rows.length > 0) {
                for(var i = 0; i < res.rows.length; i++){
                var post = JSON.parse(res.rows.item(i).categories);
             
                _self.data = post;
              }
                
                
            } else {
            }
          },function(e) {
          }) 
       
       
     });

     
    });
    
    _self.showCategoryDetail = function (id,title) {
   
      var jsonString = JSON.stringify(title);
     $state.go('menu.categoryDetail',{category:id,title:title});		    
		
      };		     
  })  

    //   //Ye code UNIQUE kar raha hai
    //   for(var i=0;i<_self.data.length;i++){
    //     var arr = _self.data[i].categories;
    //     for(var j=0;j<arr.length;j++){
    //       var arr2 = arr[j].id;
    //       if(_self.myArray.indexOf(arr2)==-1){
    //         _self.myArray.push(arr2);
    //         arr[j].status = true;
    //       }else {
    //         arr[j].status = false;
    //       }
    //     }
    //   }
    //   stopLoading.hide();
    //   },function(e){
    //     stopLoading.hide();
    //   alertService.showAlert('Error!', "Make sure you are connected to internet")
    //   })

    // }, function (e) {
    //   stopLoading.hide();
    //   alertService.showAlert('Error!', "Make sure you are connected to internet");
    // });
    
    
    
    
  /**
   *
   *  Category Detail Ctrl
   *
   */

  .controller('categoryDetailCtrl', function ($localStorage, $stateParams, $scope, $state, $http, showLoading, alertService, stopLoading, $timeout, bannerAd) {

    var _self = this;
    var count;
    $scope.$on("$ionicView.beforeEnter", function (event, data) {
     if(typeof(AdMob) !== 'undefined'){
        bannerAd.hideBanner();
     }

    });


    _self.data = JSON.parse($stateParams.category);
    _self.title = $stateParams.title;
    showLoading.show();
    $http.get(WordPress_url +'/?json=get_category_posts&id=' + _self.data).then(function (d) {
      //  console.log('_self.data',d);
      // $localStorage.categoryDetailTitle = d.data.data.varta_lists;
      $localStorage.categoryDetailArray = d.data.posts;
      // $localStorage.categoryDetailCount = d.data.count;

      // _self.title = $localStorage.categoryDetailTitle;
      // _self.categoryArray = $localStorage.categoryDetailArray;
      // count = $localStorage.categoryDetailCount;

      // _self.title = d.data.data.varta_lists;
      _self.categoryArray = $localStorage.categoryDetailArray;
     
       stopLoading.hide();




     
      count = d.data.count;
      $timeout(function () {
        stopLoading.hide();
      }, 4000)

    }, function (err) {
      stopLoading.hide();
      alertService.showAlert('Error', "Make sure you have working internet connection");
      // _self.title = $localStorage.categoryDetailTitle;
      _self.categoryArray = $localStorage.categoryDetailArray;
    });

    _self.loadMore = function () {

      showLoading.show();
      count = count + 10;

      $http.get(WordPress_url +'/?json=get_category_posts&id=' + _self.data + '&count=' + count).then(function (r) {
        // $localStorage.categoryDetailArray = r.data.posts;
        _self.categoryArray = r.data.posts;

        $timeout(function () {
          stopLoading.hide();
        }, 4000)


      }, function (e) {
        stopLoading.hide();
        alertService.showAlert('Error', "Make Sure you have working Internet Connections");
        // _ self.categoryArray = $localStorage.categoryDetailArray;
      });

    };


    _self.gotoCategoryDetail = function (d) {

      var jsonString = JSON.stringify(d);


      $state.go('menu.postDetail', {postID: jsonString});


    }


  })











  /**
   *
   * Post Detail Controller
   *
   */

  .controller('postDetailCtrl', function ($scope, $localStorage,$cordovaSQLite ,$stateParams, $rootScope, StorageService, alertService, $cordovaSocialSharing, showLoading, $timeout, stopLoading, bannerAd, $ionicPlatform, $ionicHistory, $http) {

    var _self = this;
    var params = $stateParams.postID;
    var jsonParse = JSON.parse(params);
    $ionicPlatform.onHardwareBackButton(function () {
     if(typeof(AdMob)!=='undefined'){
      bannerAd.showInter();
      bannerAd.hideBanner();
      $ionicHistory.goBack(); 
     }
    });
   _self.back = function () {
    if(typeof(AdMob)!=='undefined'){
      bannerAd.showInter();
      bannerAd.hideBanner();
      $ionicHistory.goBack(); 
     }
    };
    _self.postTitle = jsonParse.title;
    $scope.$on("$ionicView.beforeEnter", function (event, data) {
      showLoading.show();
      if(typeof(AdMob)!=='undefined'){
            bannerAd.banner();
        }
      // 
    //  console.log('post works')
    //   _self.postDetailArray = StorageService.getAll();
    //   var getSpecific = _self.postDetailArray;
    //   console.log('getting ',getSpecific)
    //   for (var i = 0; i < getSpecific.length; i++) {
    //     var jsonID = jsonParse.id;
    //     var speci = getSpecific[i].id;
    // console.log('jsonID',jsonID,'speci',speci);
    //     if (jsonID == speci) {
    //       _self.bookmarked = true;

    //     }
    //     else {
    //       _self.bookmarked = false;
    //     }
    //   }
     var bookmarkArray = [];
      var query = "SELECT * FROM bookmark";
        $cordovaSQLite.execute(db,query).then(function(res){

            
            if(res.rows.length > 0) {
                for(var i = 0; i < res.rows.length; i++){
                var post = JSON.parse(res.rows.item(i).bookmark);
                _self.id = JSON.parse(res.rows.item(i).id);
                bookmarkArray.push(post);
                
                for(var i = 0; i < bookmarkArray.length; i++){
                  var jsonID = jsonParse.id;
                  var speci = bookmarkArray[i].id;
                  if(jsonID == speci){
                    _self.bookmarked = true;
                  }
                  else{
                    _self.bookmarked = false;
                  }
                  
                }
                
              }
                
            } else {
                
            }
            
          },function(e){
            
          })
  });

    $timeout(function () {
      stopLoading.hide();
    }, 2000);


    /**
     * Facebook Share Function
     *
     */


    _self.shareFb = function () {
      $timeout(function(){
      $cordovaSocialSharing.shareViaFacebook(jsonParse.title +" - " + sharingTitle, null, short_sharing_link)
      .then(function(){

      },function(e){
        window.alert('Make Sure Facebook app is installed Or Enabled.');
      })
    },300)
     
    };

    _self.shareAnyWhere = function () {
      setTimeout(function () {
        $cordovaSocialSharing.share(jsonParse.title + "-" + sharingTitle, null, null, short_sharing_link);
      }, 300);
    };
    _self.shareWhatsApp = function(){
      setTimeout(function(){
      $cordovaSocialSharing.shareViaWhatsApp(jsonParse.title + "- " + sharingTitle, null, short_sharing_link)
      .then(function(s){
      },function(e){
        window.alert('Make Sure Whatsapp is installed Or Enabled.');
      })
      },300);
      
    }


    var ps = JSON.stringify(jsonParse.content);

    _self.content = jsonParse.content;

    _self.fullDetail = jsonParse;


    _self.bookmark = function (d) {
             
              var query = "INSERT INTO bookmark (bookmark) VALUES (?)";
                $cordovaSQLite.execute(db, query, [JSON.stringify(d)]).then(function(res) {
                     _self.bookmarked = true;
                  alertService.showAlert('Success !', 'successfully Bookmarked');
                    }, function (err) {
                   alertService.showAlert('Error !', 'Error getting Bookmarked')

              });    


      // StorageService.add(d).then(function (s) {

      //   _self.bookmarked = true;
      //   alertService.showAlert('Success !', 'successfully Bookmarked');
      // }, function (e) {
      //   alertService.showAlert('Error !', 'Error getting Bookmarked')
      // });

      // var getting = StorageService.getAll();


    };

    _self.remove = function (d) {
      _self.bookmarked = false;
      
      
      var query = "DELETE FROM bookmark WHERE id = ?;"
                  $cordovaSQLite.execute(db,query,[d]).then(function(s){
                 alertService.showAlert('Success !', 'SuccessFully Remove Bookmarked')          
                  },function(e){
                    alertService.showAlert('Error !', 'Error in removing');
                  })
      
      
      // StorageService.remove(d).then(function (s) {
      //   alertService.showAlert('Success !', 'SuccessFully Remove Bookmarked')
      // }, function (e) {
      //   alertService.showAlert('Error !', 'Error in removing');
      // });
    }
  })


  /**
   *
   * bookmarkCtrl
   *
   */

  .controller('bookmarkCtrl', function ($localStorage, $scope ,$cordovaSQLite ,$stateParams, StorageService, $state) {
    var _self = this;
    // _self.data = [];
    // $localStorage.bookmarkArray = StorageService.getAll();
    // _self.data = StorageService.getAll();
        $scope.$on("$ionicView.beforeEnter", function (event, data) {
           var bookmarkArray = [];
         _self.noBookmarked = false;

             var query = "SELECT * FROM bookmark";
             $cordovaSQLite.execute(db,query).then(function(res){
            
            if(res.rows.length > 0) {
                for(var i = 0; i < res.rows.length; i++){
                var post = JSON.parse(res.rows.item(i).bookmark);
                bookmarkArray.push(post);
                _self.data = bookmarkArray;
                
              }
                
                
            } else {
                 _self.data = [];
                 _self.noBookmarked = true;

                
            }
            
          },function(e){
            
          })
    });
   
    _self.gotopostDetail = function (data) {
      var jsonString = JSON.stringify(data);
      $state.go('menu.postDetail', {postID: jsonString});
    }

  })




  /**
   *
   * About Controller
   *
   */


  .controller('aboutCtrl', function () {


    var _self = this;
    _self.content = about_Content
 })
  
  
 /**
  * Search Controller 
  *
  **/ 

.controller('searchCtrl',function($http,$scope,$ionicLoading,$timeout,alertService,$state){
 
   var _self = this;
   var count = 10;
   var query;
   $scope.search = {};
   _self.showLoadBtn = false;
   
   $scope.$watch('search.keyword',function(old,newVal) {
   if($scope.search.keyword !== ''){
  
   _self.spinner = true;
   query = old;
     fetch(old);
   }
   else{
     _self.data  = [];
     _self.showLoadBtn = false;
   }
   },true);
   
   
   function fetch(query) {
     
     $http.get(WordPress_url+ '?json=get_search_results&search='+query).then(function(s){
    
       _self.data = s.data.posts;
       _self.showLoadBtn = true;
    _self.spinner = false;
     },function(e){
      _self.spinner = false;
      alertService.showAlert('Error !', 'Make Sure you have working Internet Connection');

     })
   }
   
   _self.loadMore = function(){
      
     var countMore = count+ count;
     $http.get(WordPress_url+ '?json=get_search_results&search='+query+"&count="+countMore).then(function(s){
       _self.data = s.data.posts;
       _self.showLoadBtn = true;
     $ionicLoading.hide();
     },function(e){
       $ionicLoading.hide();
      alertService.showAlert('Error !', 'Make Sure you have working Internet Connection');
    });
   }
   _self.gotopostDetail = function(d){
     var jsonString = JSON.stringify(d);
     $state.go('menu.postDetail', {postID: jsonString});
    }
});