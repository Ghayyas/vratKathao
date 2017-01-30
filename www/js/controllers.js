var app = angular.module('vrat.controllers', [])

/**
 *
 * Main Controller
 */

  .controller('AppCtrl', function ($scope, $cordovaSocialSharing, $cordovaInAppBrowser, $cordovaGoogleAnalytics, $timeout,$window,fbLikeService) {


    //Share AnyWhere Function
    var shareTitle = 'વ્રત કથાઓ નો વિશાળ ઓનલાઈન ખજાનો ધરાવતી એક માત્ર એપ્લીકેશન ડાઉનલોડ ફ્રી માં કરવા ક્લિક કરો';
    $scope.shareAnywhere = function () {

      $timeout(function () {
        $cordovaSocialSharing.share(shareTitle, null, null, "http://bit.ly/2i1i0Ha");
      }, 300);

    };

    // Rate us Function

    $scope.RateUs = function () {
      
        window.open('market://details?id=com.deucen.gujarativratkathao', '_system', 'location=yes');
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
          $window.open('https://www.facebook.com/1519563958349711', '_system', 'location=yes');
        })

    };


    //Our More Apps

    $scope.ourMoreApps = function () {
     
        $window.open('market://search?q=pub%3ADeuceN%20Tech&c=apps', '_system', 'location=yes');

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


    _self.shareFb = function (msg) {
      var output = msg.replace(/(<([^>]+)>)/ig, "");

      $cordovaSocialSharing.shareViaFacebook(jsonParse.title +" - " + "વ્રત કથાઓ નો વિશાળ ઓનલાઈન ખજાનો ધરાવતી એક માત્ર એપ્લીકેશન ડાઉનલોડ ફ્રી માં કરવા ક્લિક કરોો", null, "http://bit.ly/2i1i0Ha")
        .then(function (s) {
        }, function (e) {
        });
    };

    _self.shareAnyWhere = function (d) {
      setTimeout(function () {
        $cordovaSocialSharing.share(jsonParse.title + "-" + " વ્રત કથાઓ નો વિશાળ ઓનલાઈન ખજાનો ધરાવતી એક માત્ર એપ્લીકેશન ડાઉનલોડ ફ્રી માં કરવા ક્લિક કરો", null, null, "http://bit.ly/2i1i0Ha");
      }, 300);
    };


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
    _self.content = "ગુજરાતી સ્ત્રી મિત્રોને આજના ડીજીટલ યુગમાં વ્રત કથા માટે ચોપડી હાથવગી ના હોય અને કથા સાંભળવા/વાંચવા માટે આડોશ પાડોશ કે નેટ પર હેરાન ના થવું પડે તે હેતુ થી “ગુજરાતી વ્રત કથાઓ” ની આ એપ્લીકેશન બનાવવામાં આવેલ છે. એપ્લીકેશન માં રહેલી કથાઓ અમારી ટીમ ના સ્ત્રી સભ્યોએ ગુજરાતી પુસ્તકો કે કોઈ ઉપલબ્ધ ઈન્ટરનેટ ના સ્ત્રોત નો ઉપયોગ કરીને લખેલ છે. અને એટલે જ કન્ટેન્ટ પર અમારો તમામ અધિકાર છે. કોઈ મિત્રો ને તેમના પરિવાર ના સભ્યો કે બીજા મિત્રો સાથે કોઈ પણ કથા શેર કરવી હોય તો કથા ની નીચે આપેલ શેરીંગ ઓપ્શન નો ઉપયોગ કરીને કરી શકે છે. All Stories ના ઓપ્શન થી તમે કથા સર્ચ પણ કરી શકશો. અને જો કોઈ કથા અહી ઉપલબ્ધ ના હોય તો તમે અમને ઈમેઈલ કરી શકો છો અને તમારા સૂચનો પણ આપી શકો છો. અમારો સંપર્ક ઇમેઇલથી કરવા ઈમેઈલ કરો ideabox.innovations@gmail.com  ગુજરાતી મિત્રો ના લાભાર્થે ઘણી એપ્લીકેશન અમે બનાવેલ છે. તમામ એપ્લીકેશન ની યાદી જોવા મેનુ માંથી ઓપ્શન ક્લિક કરશો. અને હા મિત્રો, અમારી આ એપ્લીકેશન દરેક ગુજરાતી મિત્રો સાથે શેર કરવા વિનંતી. આભાર. વાંચે ગુજરાત, વંચાવે ગુજરાત જય શ્રી કૃષ્ણ ";
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

     })
   }
   
   _self.gotopostDetail = function(d){
     var jsonString = JSON.stringify(d);


      $state.go('menu.postDetail', {postID: jsonString});

   }
});