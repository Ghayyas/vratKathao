/**
 * 
 * Loading service
 * 
 */

  //show loading
var vratService = angular.module('vrat.Service',[]);
vratService.service('showLoading',function($ionicLoading) {
  this.show = function() {
    $ionicLoading.show({
      template: 'Please wait...'
    }).then(function(){
    });
  }; 
  
});

//hide loading
vratService.service('stopLoading',function($ionicLoading){
     this.hide = function(){
    $ionicLoading.hide().then(function(){
    });
  };
});


/**
 * 
 * Http Request to get Data From Server
 * 
 */
  vratService.service('httpRequest',function($http,$q){
 
   var deffered = $q.defer();
  //  var q = 1;
  
   this.httpFunc = function() { 
     $http.get(WordPress_url+'/?json=get_recent_posts&count=').then(function(resolved){
      // console.log('resolved'); 
       deffered.resolve(resolved);
  },function(rejected){
    
    deffered.reject(rejected);
  })
  
   return deffered.promise;
 }
   
});




/**
 * 
 * Alert Service
 * 
 */

vratService.service('alertService',function($ionicPopup) {
   this.showAlert = function(title,template) {
   var alertPopup = $ionicPopup.alert({
     title: title,
     template: template
   });

   alertPopup.then(function(res) {
     return true;
   });
 };
});


/**
 * 
 * Local storage Service
 * 
 */
 
vratService.factory ('StorageService', function ($localStorage,$q) {
 var deffered = $q.defer();
 $localStorage = $localStorage.$default({
    item: []
  });
  

var _getAll = function () {
  
  return $localStorage.item;
 
};

var _add = function (d) {
 
  var success = $localStorage.item.push(d);
  if(success){
    deffered.resolve(true)
    
  }
  else{
    deffered.reject(true);
  }
  return deffered.promise;
}
var _remove = function (d) {
 
  var success = $localStorage.item.splice($localStorage.item.indexOf(d), 1);
  if(success){
    deffered.resolve(true);
  }
  else{
    deffered.reject(true)
  }
  return deffered.promise;
}
return {
    getAll: _getAll,
    add: _add,
    remove: _remove
  };
})

/**
 * 
 * Ad Banner
 * 
 */

vratService.service('bannerAd',function($q){
     var admobid = {};
  if( /(android)/i.test(navigator.userAgent) ) { // for android & amazon-fireos
    admobid = {
      banner: banner, // or DFP format "/6253334/dfp_example_ad"
      interstitial: interstitial
    };
  } else if(/(ipod|iphone|ipad)/i.test(navigator.userAgent)) { // for ios
    admobid = {
      banner: banner, // or DFP format "/6253334/dfp_example_ad"
      interstitial: interstitial
    };
  } else { // for windows phone
    admobid = {
      banner: banner, // or DFP format "/6253334/dfp_example_ad"
      interstitial: interstitial
    };
  }
this.prepareInitial = function(){
  // preppare and load ad resource in background, e.g. at begining of game level
  //  if(typeof(AdMob) !== 'undefined') AdMob.prepareInterstitial( {adId:admobid.interstitial, autoShow:true},function(s){
  //     console.log('initial success',s);
  //  },function(fail){
  //    console.log('inital failed',fail);
  //  });
}
  
  this.banner = function(){
  
    if(AdMob) AdMob.createBanner({
    adId: admobid.banner,
    position: AdMob.AD_POSITION.BOTTOM_CENTER,
    autoShow: true });

}

this.hideBanner = function(){
  if(AdMob) AdMob.removeBanner();
}
  
   this.showInter = function(){
  if(AdMob) AdMob.prepareInterstitial( {adId:admobid.interstitial, autoShow:true},function(s){
    AdMob.showInterstitial();
  },function(e){
  });
      // check and show it at end of a game level
      AdMob.isInterstitialReady(function(ready){
        if(ready) AdMob.showInterstitial();
      });
  }
})


vratService.service('fbLikeService',function($q,$window){
      var deffer = $q.defer();
       this.openWindow = function(){ 
        var d = $window.open(fb_page, '_system');
        if(d){
          deffer.resolve(true);
        }
        else{
          deffer.reject(true);
        }
      return deffer.promise;
   }
})

vratService.service('askedForUpate',function($q,$ionicPopup,$window){
  var deffer = $q.defer();
  this.asked = function(){
    var confirmPopup = $ionicPopup.confirm({
      title: 'Update!',
      template: updateText,
      cancelText: 'No Thanks',
      okText:'Yes Please'
  });
  confirmPopup.then(function(res) {
        if(res) {
        if(ionicPlatform == 'android'){
         $window.open('market://details?id='+play_id, '_system', 'location=yes');
        }
        else{
          $window.open(apple_id,'_system','location=yes');
        }
       } else {
          //Do nothing
        }
        deffer.resolve(true);
      });
 return deffer.promise 
 }
})

vratService.service('askedForRating',function($q,$cordovaAppRate,$window){
  var deffer = $q.defer();
  this.askedForRate = function(){
    AppRate.preferences = {
      openStoreInApp: true,
      useCustomRateDialog: false,
      displayAppName: app_name,
      // usesUntilPrompt: 5,
      promptAgainForEachNewVersion: false,
      storeAppURL: {
      ios: apple_id, //'id512939461',
      android: 'market://details?id='+play_id,
      windows: 'ms-windows-store://pdp/?ProductId=<the apps Store ID>',
      blackberry: 'appworld://content/[App Id]/',
      windows8: 'ms-windows-store:Review?name=<the Package Family Name of the application>'
    },
    customLocale: {
      title: "Rate us",
      message: rateNowText,
      cancelButtonLabel: "No, Thanks",
      laterButtonLabel: "Remind Me Later",
      rateButtonLabel: "Yes, Sure"
    },
    callbacks: {
    onRateDialogShow: function(callback){
      callback(0) // do nothing
   },
    onButtonClicked: function(buttonIndex){
    //do noting
         if(buttonIndex == 1){
            deffer.resolve(true);
          if(ionicPlatform == 'android'){
             //do nothing
           }
           else{
             $window.open(apple_id,'_system','location=true');
           }
         }
    }
  }
 };
  AppRate.promptForRating(true);
  return deffer.promise;
  }
})