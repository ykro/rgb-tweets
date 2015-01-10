//heavily based on https://github.com/gelicia/tweetSkirt/tree/master/sparktweet-twitter-bot

//twitter
var Twit = require('twit');
//rest calls
var rest = require('restler');
//storage
var levelup = require('level');
//promises
var q = require('q');

//include config files
var T = new Twit(require('./twitterConfig.js'));
var sparkConfig = require('./sparkConfig.js');


levelup.destroy('./grabbedTweets');
var displayed_db = levelup('./grabbedTweets');

var tweetQueue = [];

function queueTweets() {
  console.log("looking for tweets...");
  var now = new Date(); 
  //get the 5 latest mentions
  T.get('statuses/mentions_timeline', {count:5}, function (error, data) {
	for (var i = 0; i < data.length; i++) {
	  var dataOfInterest = data[i];
	  //only look for tweets less than 24 hours old
	  var tweetDate = new Date(dataOfInterest.created_at);
	  if(now - tweetDate < (1000*60*60*24)){
		//check that the tweet has not yet been used
		//we send all the data to it because the loop will keep running and we want to keep the data attached to the promise
		var isUsedPromise = isAlreadyUsed(dataOfInterest);
		  isUsedPromise.done(function(result){
			if(result.toQueue){//tweet not found! queue it up!
			  var queueTweet = {
				"id" : result.data.id,
				created_at: new Date(result.data.created_at),
				message : "@" + result.data.user.screen_name + " - " + (result.data.text).substring(result.data.in_reply_to_screen_name.length+2)
			  };
			  tweetQueue.push(queueTweet);
			  console.log("queueing ", queueTweet.message, "queue at ", tweetQueue.length);
			}
		  });
		}
	  };
	});
}

function isAlreadyUsed(tweetData){
  var deferred = q.defer();
  displayed_db.get(tweetData.id, function (err, value) {
    if (err) {
	  if (err.notFound){
	  	//keeping all the data for future uses
		deferred.resolve({toQueue: true, data:tweetData});
	  } else {
		//count it as displayed (will not queue up) if there's an error, it should get queued next time around
		deferred.resolve({toQueue: false, data:tweetData});
	  }
	} else {
	  deferred.resolve({toQueue: false, data:tweetData});
	}
  });
  return deferred.promise;
}

function displayTweet(){
	console.log("looking to display tweets, queue length is ", tweetQueue.length);
	//TODO sort tweets to pop oldest

	if (tweetQueue.length > 0){
		var tweet = tweetQueue.pop();
		sendMessage(1,"BEGIN").done(function(){
			//can only send 61 characters at a time to the spark
			var messagePromises = [];

			var msgsNeeded = Math.ceil(tweet.message.length/61);
			for (var i = 0; i < msgsNeeded; i++) {
				var thisMessageText = "";
				if (i == (msgsNeeded - 1)){
					thisMessageText = tweet.message.substring(61*i);
				}
				else {
					thisMessageText = tweet.message.substring(61*i, 61 * (i+1));
				}

				messagePromises.push(sendMessage(0,thisMessageText));
			}

			q.all(messagePromises).done(function(){
				sendMessage(1,"END");
				displayed_db.put(tweet.id, tweet.created_at);
				console.log("display done, length is ", tweetQueue.length);
			});

		});
	}
}

function sendMessageToSpark(r,g,b){
  var deferred = q.defer();
  rest.post('https://api.spark.io/v1/devices/' + sparkConfig.deviceID + '/buildString', {
		data: { 'access_token': sparkConfig.accessToken,
		'args': r + ',' + g + ',' + b}
  }).on('complete', function(data, response) {
	//TODO error handling here when the program is running but the spark is offline
    console.log("msg sent : ", adminFlag, message);
	deferred.resolve();
  });
  return deferred.promise;
}

queueTweets(); 
//find tweets every three minutes
//setInterval(queueTweets, 3 * 1000 * 60);

//display a tweet every minute
//setInterval(displayTweet, 1000 * 60);